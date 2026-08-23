from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import get_supabase, require_worker
from app.schemas.auth import TokenPayload
from app.schemas.complaints import ComplaintStatus
from app.schemas.worker import TaskProgressUpdate, WorkerTask, WorkerTaskListResponse
from app.utils.status_machine import InvalidTransitionError, validate_transition

router = APIRouter(prefix="/worker", tags=["worker"])


@router.get("/tasks", response_model=WorkerTaskListResponse)
def list_my_tasks(
    current_user: TokenPayload = Depends(require_worker),
    supabase: Client = Depends(get_supabase),
):
    result = (
        supabase.table("complaints")
        .select("*", count="exact")
        .eq("assigned_worker_id", current_user.sub)
        .in_("status", [ComplaintStatus.ASSIGNED.value, ComplaintStatus.IN_PROGRESS.value])
        .order("priority", desc=True)
        .execute()
    )
    items = [
        WorkerTask(
            complaint_id=row["id"],
            complaint_number=row["complaint_number"],
            title=row["title"],
            priority=row["priority"],
            status=row["status"],
            location={"latitude": row["latitude"], "longitude": row["longitude"]},
            address=row.get("address"),
            sla_due_at=row.get("sla_due_at"),
        )
        for row in (result.data or [])
    ]
    return WorkerTaskListResponse(items=items, total=result.count or len(items))


@router.patch("/tasks/{complaint_id}", response_model=dict)
def update_task_progress(
    complaint_id: str,
    payload: TaskProgressUpdate,
    current_user: TokenPayload = Depends(require_worker),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("complaints").select("*").eq("id", complaint_id).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    row = result.data[0]
    if row.get("assigned_worker_id") != current_user.sub:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not assigned to you")

    current_status = ComplaintStatus(row["status"])
    try:
        validate_transition(current_status, payload.status)
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    update = {
        "status": payload.status.value,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.note:
        update["resolution_notes"] = payload.note

    supabase.table("complaints").update(update).eq("id", complaint_id).execute()

    if payload.proof_image_ids:
        supabase.table("complaint_images").update({"complaint_id": complaint_id}).in_(
            "id", [str(i) for i in payload.proof_image_ids]
        ).execute()

    return {"status": "ok"}
