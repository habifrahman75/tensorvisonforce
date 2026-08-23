"""
Complaint CRUD  +  full AI pipeline on creation.

Pipeline at POST /complaints:
  1. classify text  →  category
  2. duplicate check against open complaints
  3. priority scoring
  4. SLA deadline computation
  5. persist row
  6. optionally link pre-uploaded images
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from app.config import Settings, get_settings
from app.dependencies import get_current_active_user, get_supabase, require_worker
from app.schemas.auth import TokenPayload, UserRole
from app.schemas.complaints import (
    ComplaintCreate,
    ComplaintListResponse,
    ComplaintRead,
    ComplaintStatus,
    Priority,
    StatusChangeRequest,
)
from app.services import classification, duplicate_detection, sla
from app.services import priority as priority_service
from app.services.duplicate_detection import ExistingComplaint
from app.utils.status_machine import InvalidTransitionError, validate_transition

router = APIRouter(prefix="/complaints", tags=["complaints"])


# ---------------------------------------------------------------------------
# POST /complaints
# ---------------------------------------------------------------------------
@router.post("", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload:      ComplaintCreate,
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase:     Client       = Depends(get_supabase),
    settings:     Settings     = Depends(get_settings),
):
    # 1. Classify
    try:
        cls_result = classification.classify_text(payload.description, settings)
    except (ValueError, FileNotFoundError):
        from app.schemas.complaints import ComplaintCategory
        from app.schemas.ai import ClassificationResult
        cls_result = ClassificationResult(
            category=ComplaintCategory.OTHER, confidence=0.0,
            verification_required=True
        )

    # 2. Duplicate check
    nearby = (
        supabase.table("complaints")
        .select("id, description, latitude, longitude")
        .execute()
    )
    existing = [
        ExistingComplaint(
            id=row["id"],
            description=row["description"],
            location=payload.location.__class__(
                latitude=row["latitude"], longitude=row["longitude"]
            ),
        )
        for row in (nearby.data or [])
    ]
    dup_result = duplicate_detection.find_duplicates(
        new_description=payload.description,
        new_location=payload.location,
        new_phash=None,
        existing_complaints=existing,
        settings=settings,
    )

    # 3. Priority
    from app.schemas.ai import PriorityRequest
    pri_result = priority_service.compute_priority(
        PriorityRequest(
            category=cls_result.category,
            description=payload.description,
            location=payload.location,
            duplicate_count=len(dup_result.candidates),
        )
    )

    # 4. SLA
    now       = datetime.now(timezone.utc)
    sla_due   = sla.compute_sla_due_at(
        priority=pri_result.priority, created_at=now, settings=settings
    )

    # 5. Persist
    row = {
        "title":           payload.title,
        "description":     payload.description,
        "category":        cls_result.category.value,
        "status":          ComplaintStatus.SUBMITTED.value,
        "priority":        pri_result.priority.value,
        "latitude":        payload.location.latitude,
        "longitude":       payload.location.longitude,
        "address":         payload.address,
        "citizen_id":      current_user.sub,
        "deadline":        sla_due.isoformat(),
        "created_at":      now.isoformat(),
        "updated_at":      now.isoformat(),
    }
    result  = supabase.table("complaints").insert(row).execute()
    created = result.data[0]

    # 6. Link pre-uploaded images
    if payload.image_ids:
        supabase.table("complaint_images").update(
            {"complaint_id": created["id"]}
        ).in_("id", [str(i) for i in payload.image_ids]).execute()

    return _to_complaint_read(supabase, created)


# ---------------------------------------------------------------------------
# GET /complaints
# ---------------------------------------------------------------------------
@router.get("", response_model=ComplaintListResponse)
def list_complaints(
    current_user:  TokenPayload        = Depends(get_current_active_user),
    supabase:      Client              = Depends(get_supabase),
    status_filter: ComplaintStatus | None = Query(default=None, alias="status"),
    category:      str | None            = Query(default=None),
    priority:      Priority | None       = Query(default=None),
    page:          int                   = Query(default=1, ge=1),
    page_size:     int                   = Query(default=20, ge=1, le=100),
):
    query = supabase.table("complaints").select("*", count="exact")

    if current_user.role == UserRole.CITIZEN:
        query = query.eq("citizen_id", current_user.sub)

    if status_filter is not None:
        query = query.eq("status", status_filter.value)
    if category is not None:
        query = query.eq("category", category)
    if priority is not None:
        query = query.eq("priority", priority.value)

    start  = (page - 1) * page_size
    end    = start + page_size - 1
    result = query.order("created_at", desc=True).range(start, end).execute()

    # Normalise rows: complaint_code (DB) → complaint_number (schema)
    rows = []
    for row in (result.data or []):
        row = dict(row)
        if "complaint_number" not in row:
            row["complaint_number"] = row.get("complaint_code", "")
        rows.append(row)

    return ComplaintListResponse(
        items     = rows,
        total     = result.count or 0,
        page      = page,
        page_size = page_size,
    )


# ---------------------------------------------------------------------------
# GET /complaints/{complaint_id}
# ---------------------------------------------------------------------------
@router.get("/{complaint_id}", response_model=ComplaintRead)
def get_complaint(
    complaint_id: UUID,
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase:     Client       = Depends(get_supabase),
):
    result = (
        supabase.table("complaints").select("*").eq("id", str(complaint_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    row = result.data[0]
    if current_user.role == UserRole.CITIZEN and row["citizen_id"] != current_user.sub:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your complaint")

    return _to_complaint_read(supabase, row)


# ---------------------------------------------------------------------------
# PUT /complaints/{complaint_id}  (update metadata — admin/worker only)
# ---------------------------------------------------------------------------
@router.put("/{complaint_id}", response_model=ComplaintRead)
def update_complaint(
    complaint_id: UUID,
    payload:      StatusChangeRequest,
    current_user: TokenPayload = Depends(require_worker),
    supabase:     Client       = Depends(get_supabase),
):
    result = (
        supabase.table("complaints").select("*").eq("id", str(complaint_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    row            = result.data[0]
    current_status = ComplaintStatus(row["status"])

    try:
        validate_transition(current_status, payload.new_status)
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    update: dict = {
        "status":     payload.new_status.value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.note:
        update["resolution_notes"] = payload.note

    updated = (
        supabase.table("complaints")
        .update(update)
        .eq("id", str(complaint_id))
        .execute()
    )
    return _to_complaint_read(supabase, updated.data[0])


# ---------------------------------------------------------------------------
# DELETE /complaints/{complaint_id}  (citizen deletes own SUBMITTED complaint)
# ---------------------------------------------------------------------------
@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(
    complaint_id: UUID,
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase:     Client       = Depends(get_supabase),
):
    result = (
        supabase.table("complaints").select("*").eq("id", str(complaint_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    row = result.data[0]

    # Citizens may only delete their own SUBMITTED complaints
    if current_user.role == UserRole.CITIZEN:
        if row["citizen_id"] != current_user.sub:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not your complaint"
            )
        if row["status"] != ComplaintStatus.SUBMITTED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only SUBMITTED complaints can be deleted",
            )

    supabase.table("complaints").delete().eq("id", str(complaint_id)).execute()


# ---------------------------------------------------------------------------
# PATCH /complaints/{complaint_id}/status  (explicit status change endpoint)
# ---------------------------------------------------------------------------
@router.patch("/{complaint_id}/status", response_model=ComplaintRead)
def change_status(
    complaint_id: UUID,
    payload:      StatusChangeRequest,
    current_user: TokenPayload = Depends(require_worker),
    supabase:     Client       = Depends(get_supabase),
):
    result = (
        supabase.table("complaints").select("*").eq("id", str(complaint_id)).execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    row            = result.data[0]
    current_status = ComplaintStatus(row["status"])

    try:
        validate_transition(current_status, payload.new_status)
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    update: dict = {
        "status":     payload.new_status.value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.note:
        update["resolution_notes"] = payload.note

    updated = (
        supabase.table("complaints")
        .update(update)
        .eq("id", str(complaint_id))
        .execute()
    )
    return _to_complaint_read(supabase, updated.data[0])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _to_complaint_read(supabase: Client, row: dict) -> ComplaintRead:
    images_result = (
        supabase.table("complaint_images")
        .select("*")
        .eq("complaint_id", row["id"])
        .execute()
    )
    return ComplaintRead(
        id                 = row["id"],
        complaint_number   = row.get("complaint_code") or row.get("complaint_number", ""),
        title              = row["title"],
        description        = row["description"],
        category           = row["category"],
        status             = row["status"],
        priority           = row["priority"],
        location           = {"latitude": row["latitude"], "longitude": row["longitude"]},
        address            = row.get("address"),
        citizen_id         = row["citizen_id"],
        department_id      = row.get("department_id"),
        assigned_worker_id = row.get("assigned_worker_id"),
        images             = images_result.data or [],
        duplicate_of       = row.get("duplicate_of"),
        sla_due_at         = row.get("deadline") or row.get("sla_due_at"),
        created_at         = row["created_at"],
        updated_at         = row["updated_at"],
    )
