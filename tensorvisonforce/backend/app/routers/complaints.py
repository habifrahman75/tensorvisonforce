"""
Core complaint CRUD + the pipeline that runs at creation time:

    classify text -> check duplicates -> score priority -> resolve
    department -> compute SLA due date -> persist

Citizens can create and view their own complaints. Workers/admins can
list, view, and update any complaint (status transitions are enforced
via `status_machine`).
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
from app.services import classification, duplicate_detection, priority as priority_service, sla
from app.services.duplicate_detection import ExistingComplaint
from app.utils.id_generator import generate_complaint_number
from app.utils.status_machine import InvalidTransitionError, validate_transition

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
):
    # 1. Classify the free-text description into a category.
    classification_result = classification.classify_text(payload.description, settings)

    # 2. Look up nearby open complaints and check for duplicates.
    nearby = (
        supabase.table("complaints")
        .select("id, description, latitude, longitude, image_phash")
        .neq("status", ComplaintStatus.CLOSED.value)
        .neq("status", ComplaintStatus.REJECTED.value)
        .execute()
    )
    existing = [
        ExistingComplaint(
            id=row["id"],
            description=row["description"],
            location=payload.location.__class__(latitude=row["latitude"], longitude=row["longitude"]),
            image_phash=row.get("image_phash"),
        )
        for row in (nearby.data or [])
    ]
    dup_result = duplicate_detection.find_duplicates(
        new_description=payload.description,
        new_location=payload.location,
        new_phash=None,  # populated once the /ai/image-quality step tags an uploaded image
        existing_complaints=existing,
        settings=settings,
    )

    # 3. Score priority.
    priority_result = priority_service.compute_priority(
        priority_service.PriorityRequest(
            category=classification_result.category,
            description=payload.description,
            location=payload.location,
            duplicate_count=len(dup_result.candidates),
        )
    )

    now = datetime.now(timezone.utc)
    sla_due_at = sla.compute_sla_due_at(priority=priority_result.priority, created_at=now, settings=settings)

    row = {
        "complaint_number": generate_complaint_number(now),
        "title": payload.title,
        "description": payload.description,
        "category": classification_result.category.value,
        "status": ComplaintStatus.DUPLICATE.value if dup_result.is_duplicate else ComplaintStatus.SUBMITTED.value,
        "priority": priority_result.priority.value,
        "latitude": payload.location.latitude,
        "longitude": payload.location.longitude,
        "address": payload.address,
        "citizen_id": current_user.sub,
        "duplicate_of": str(dup_result.candidates[0].complaint_id) if dup_result.is_duplicate else None,
        "sla_due_at": sla_due_at.isoformat(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    result = supabase.table("complaints").insert(row).execute()
    created = result.data[0]

    if payload.image_ids:
        supabase.table("complaint_images").update({"complaint_id": created["id"]}).in_(
            "id", [str(i) for i in payload.image_ids]
        ).execute()

    return _to_complaint_read(supabase, created)


@router.get("", response_model=ComplaintListResponse)
def list_complaints(
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
    status_filter: ComplaintStatus | None = Query(default=None, alias="status"),
    category: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    query = supabase.table("complaints").select("*", count="exact")

    # Citizens only see their own complaints; workers/admins see everything
    # (worker-specific "my tasks" view lives in the worker router).
    if current_user.role == UserRole.CITIZEN:
        query = query.eq("citizen_id", current_user.sub)

    if status_filter is not None:
        query = query.eq("status", status_filter.value)
    if category is not None:
        query = query.eq("category", category)

    start = (page - 1) * page_size
    end = start + page_size - 1
    result = query.order("created_at", desc=True).range(start, end).execute()

    return ComplaintListResponse(
        items=result.data or [],
        total=result.count or 0,
        page=page,
        page_size=page_size,
    )


@router.get("/{complaint_id}", response_model=ComplaintRead)
def get_complaint(
    complaint_id: UUID,
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("complaints").select("*").eq("id", str(complaint_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    row = result.data[0]
    if current_user.role == UserRole.CITIZEN and row["citizen_id"] != current_user.sub:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your complaint")

    return _to_complaint_read(supabase, row)


@router.patch("/{complaint_id}/status", response_model=ComplaintRead)
def change_status(
    complaint_id: UUID,
    payload: StatusChangeRequest,
    current_user: TokenPayload = Depends(require_worker),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("complaints").select("*").eq("id", str(complaint_id)).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    row = result.data[0]
    current_status = ComplaintStatus(row["status"])

    try:
        validate_transition(current_status, payload.new_status)
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    update = {
        "status": payload.new_status.value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.note:
        update["resolution_notes"] = payload.note

    updated = (
        supabase.table("complaints").update(update).eq("id", str(complaint_id)).execute()
    )
    return _to_complaint_read(supabase, updated.data[0])


def _to_complaint_read(supabase: Client, row: dict) -> ComplaintRead:
    images_result = (
        supabase.table("complaint_images").select("*").eq("complaint_id", row["id"]).execute()
    )
    return ComplaintRead(
        id=row["id"],
        complaint_number=row["complaint_number"],
        title=row["title"],
        description=row["description"],
        category=row["category"],
        status=row["status"],
        priority=row["priority"],
        location={"latitude": row["latitude"], "longitude": row["longitude"]},
        address=row.get("address"),
        citizen_id=row["citizen_id"],
        department_id=row.get("department_id"),
        assigned_worker_id=row.get("assigned_worker_id"),
        images=images_result.data or [],
        duplicate_of=row.get("duplicate_of"),
        sla_due_at=row.get("sla_due_at"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
