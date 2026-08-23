from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ComplaintCategory(str, Enum):
    POTHOLE = "pothole"
    GARBAGE = "garbage"
    STREETLIGHT = "streetlight"
    WATER_LEAKAGE = "water_leakage"
    DRAINAGE = "drainage"
    OTHER = "other"


class ComplaintStatus(str, Enum):
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REJECTED = "rejected"
    DUPLICATE = "duplicate"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GeoPoint(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=5, max_length=150)
    description: str = Field(min_length=10, max_length=3000)
    location: GeoPoint
    address: str | None = Field(default=None, max_length=300)
    image_ids: list[UUID] = Field(default_factory=list, max_length=5)

    @field_validator("title", "description")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class ComplaintUpdate(BaseModel):
    status: ComplaintStatus | None = None
    priority: Priority | None = None
    assigned_worker_id: UUID | None = None
    department_id: UUID | None = None
    resolution_notes: str | None = Field(default=None, max_length=2000)


class ComplaintImage(BaseModel):
    id: UUID
    url: str
    is_blurry: bool = False
    quality_score: float | None = None
    phash: str | None = None


class ComplaintRead(BaseModel):
    id: UUID
    complaint_number: str
    title: str
    description: str
    category: ComplaintCategory
    status: ComplaintStatus
    priority: Priority
    location: GeoPoint
    address: str | None = None
    citizen_id: UUID
    department_id: UUID | None = None
    assigned_worker_id: UUID | None = None
    images: list[ComplaintImage] = Field(default_factory=list)
    duplicate_of: UUID | None = None
    sla_due_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ComplaintListItem(BaseModel):
    id: UUID
    complaint_number: str
    title: str
    category: ComplaintCategory
    status: ComplaintStatus
    priority: Priority
    address: str | None = None
    created_at: datetime


class ComplaintListResponse(BaseModel):
    items: list[ComplaintListItem]
    total: int
    page: int
    page_size: int


class StatusChangeRequest(BaseModel):
    new_status: ComplaintStatus
    note: str | None = Field(default=None, max_length=1000)
