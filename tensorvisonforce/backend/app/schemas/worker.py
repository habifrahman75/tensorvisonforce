from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.complaints import ComplaintStatus, GeoPoint, Priority


class WorkerTask(BaseModel):
    complaint_id: UUID
    complaint_number: str
    title: str
    priority: Priority
    status: ComplaintStatus
    location: GeoPoint
    address: str | None = None
    sla_due_at: datetime | None = None


class WorkerTaskListResponse(BaseModel):
    items: list[WorkerTask]
    total: int


class TaskProgressUpdate(BaseModel):
    status: ComplaintStatus
    note: str | None = Field(default=None, max_length=1000)
    proof_image_ids: list[UUID] = Field(default_factory=list, max_length=5)


class WorkerLoad(BaseModel):
    worker_id: UUID
    active_tasks: int
    completed_this_week: int
