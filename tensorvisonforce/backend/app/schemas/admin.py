from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.complaints import ComplaintCategory, ComplaintStatus, Priority


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    categories: list[ComplaintCategory]
    contact_email: EmailStr | None = None


class DepartmentRead(BaseModel):
    id: UUID
    name: str
    categories: list[ComplaintCategory]
    contact_email: EmailStr | None = None
    created_at: datetime


class WorkerCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    department_id: UUID
    phone: str | None = None


class WorkerRead(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    department_id: UUID
    active_complaint_count: int = 0
    created_at: datetime


class DashboardStats(BaseModel):
    total_complaints: int
    by_status: dict[ComplaintStatus, int]
    by_category: dict[ComplaintCategory, int]
    by_priority: dict[Priority, int]
    sla_breached: int
    avg_resolution_hours: float | None = None


class DashboardFilters(BaseModel):
    department_id: UUID | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
