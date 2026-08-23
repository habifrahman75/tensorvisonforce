from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import get_supabase, require_admin
from app.schemas.admin import DashboardStats, DepartmentCreate, DepartmentRead, WorkerCreate, WorkerRead
from app.schemas.auth import TokenPayload, UserRole
from app.schemas.complaints import ComplaintCategory, ComplaintStatus, Priority
from app.utils.security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.post("/departments", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, supabase: Client = Depends(get_supabase)):
    row = {
        "name": payload.name,
        "categories": [c.value for c in payload.categories],
        "contact_email": payload.contact_email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = supabase.table("departments").insert(row).execute()
    return result.data[0]


@router.get("/departments", response_model=list[DepartmentRead])
def list_departments(supabase: Client = Depends(get_supabase)):
    result = supabase.table("departments").select("*").order("name").execute()
    return result.data or []


@router.post("/workers", response_model=WorkerRead, status_code=status.HTTP_201_CREATED)
def create_worker(payload: WorkerCreate, supabase: Client = Depends(get_supabase)):
    dept = supabase.table("departments").select("id").eq("id", str(payload.department_id)).execute()
    if not dept.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    import secrets

    temp_password = secrets.token_urlsafe(12)
    row = {
        "email": payload.email,
        "hashed_password": hash_password(temp_password),
        "full_name": payload.full_name,
        "phone": payload.phone,
        "role": UserRole.WORKER.value,
        "department_id": str(payload.department_id),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = supabase.table("users").insert(row).execute()
    created = result.data[0]
    created["active_complaint_count"] = 0
    # In production this temp password would be emailed, not returned.
    created["_temp_password"] = temp_password
    return created


@router.get("/workers", response_model=list[WorkerRead])
def list_workers(department_id: UUID | None = None, supabase: Client = Depends(get_supabase)):
    query = supabase.table("users").select("*").eq("role", UserRole.WORKER.value)
    if department_id is not None:
        query = query.eq("department_id", str(department_id))
    result = query.execute()

    workers = []
    for row in result.data or []:
        active = (
            supabase.table("complaints")
            .select("id", count="exact")
            .eq("assigned_worker_id", row["id"])
            .in_("status", [ComplaintStatus.ASSIGNED.value, ComplaintStatus.IN_PROGRESS.value])
            .execute()
        )
        row["active_complaint_count"] = active.count or 0
        workers.append(row)
    return workers


@router.post("/complaints/{complaint_id}/assign", response_model=dict)
def assign_worker(
    complaint_id: UUID,
    worker_id: UUID,
    supabase: Client = Depends(get_supabase),
):
    worker = supabase.table("users").select("*").eq("id", str(worker_id)).execute()
    if not worker.data or worker.data[0]["role"] != UserRole.WORKER.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    result = (
        supabase.table("complaints")
        .update(
            {
                "assigned_worker_id": str(worker_id),
                "status": ComplaintStatus.ASSIGNED.value,
                "department_id": worker.data[0].get("department_id"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(complaint_id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    return {"status": "assigned", "complaint_id": str(complaint_id), "worker_id": str(worker_id)}


@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(
    department_id: UUID | None = None,
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("complaints").select("*")
    if department_id is not None:
        query = query.eq("department_id", str(department_id))
    result = query.execute()
    rows = result.data or []

    by_status = {s: 0 for s in ComplaintStatus}
    by_category = {c: 0 for c in ComplaintCategory}
    by_priority = {p: 0 for p in Priority}
    sla_breached = 0
    resolution_hours: list[float] = []

    now = datetime.now(timezone.utc)
    for row in rows:
        by_status[ComplaintStatus(row["status"])] += 1
        by_category[ComplaintCategory(row["category"])] += 1
        by_priority[Priority(row["priority"])] += 1

        sla_due_at = row.get("sla_due_at")
        if sla_due_at and row["status"] not in (
            ComplaintStatus.RESOLVED.value,
            ComplaintStatus.CLOSED.value,
        ):
            due = datetime.fromisoformat(sla_due_at)
            if now > due:
                sla_breached += 1

        if row["status"] in (ComplaintStatus.RESOLVED.value, ComplaintStatus.CLOSED.value):
            created = datetime.fromisoformat(row["created_at"])
            updated = datetime.fromisoformat(row["updated_at"])
            resolution_hours.append((updated - created).total_seconds() / 3600)

    avg_resolution = round(sum(resolution_hours) / len(resolution_hours), 1) if resolution_hours else None

    return DashboardStats(
        total_complaints=len(rows),
        by_status=by_status,
        by_category=by_category,
        by_priority=by_priority,
        sla_breached=sla_breached,
        avg_resolution_hours=avg_resolution,
    )
