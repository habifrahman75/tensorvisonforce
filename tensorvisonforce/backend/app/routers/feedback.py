from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import get_current_active_user, get_supabase, require_admin
from app.schemas.auth import TokenPayload
from app.schemas.complaints import ComplaintStatus
from app.schemas.feedback import FeedbackCreate, FeedbackRead, FeedbackSummary
from app.utils.status_machine import InvalidTransitionError, validate_transition

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
):
    complaint = (
        supabase.table("complaints").select("*").eq("id", str(payload.complaint_id)).execute()
    )
    if not complaint.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    row = complaint.data[0]
    if row["citizen_id"] != current_user.sub:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your complaint")
    if row["status"] != ComplaintStatus.RESOLVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback can only be left on a resolved complaint",
        )

    now = datetime.now(timezone.utc)
    feedback_row = {
        "complaint_id": str(payload.complaint_id),
        "citizen_id": current_user.sub,
        "rating": payload.rating,
        "comment": payload.comment,
        "reopened": payload.reopened,
        "created_at": now.isoformat(),
    }
    result = supabase.table("feedback").insert(feedback_row).execute()

    if payload.reopened:
        current_status = ComplaintStatus(row["status"])
        try:
            validate_transition(current_status, ComplaintStatus.IN_PROGRESS)
        except InvalidTransitionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        supabase.table("complaints").update(
            {"status": ComplaintStatus.IN_PROGRESS.value, "updated_at": now.isoformat()}
        ).eq("id", str(payload.complaint_id)).execute()

    return result.data[0]


@router.get("/summary/{department_id}", response_model=FeedbackSummary)
def department_feedback_summary(
    department_id: UUID,
    _admin: TokenPayload = Depends(require_admin),
    supabase: Client = Depends(get_supabase),
):
    complaints = (
        supabase.table("complaints").select("id").eq("department_id", str(department_id)).execute()
    )
    complaint_ids = [c["id"] for c in (complaints.data or [])]
    if not complaint_ids:
        return FeedbackSummary(
            department_id=department_id, average_rating=0.0, total_feedback=0, reopened_count=0
        )

    feedback = supabase.table("feedback").select("*").in_("complaint_id", complaint_ids).execute()
    rows = feedback.data or []
    total = len(rows)
    avg = sum(r["rating"] for r in rows) / total if total else 0.0
    reopened = sum(1 for r in rows if r.get("reopened"))

    return FeedbackSummary(
        department_id=department_id,
        average_rating=round(avg, 2),
        total_feedback=total,
        reopened_count=reopened,
    )
