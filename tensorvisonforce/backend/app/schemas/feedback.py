from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    complaint_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)
    reopened: bool = False


class FeedbackRead(BaseModel):
    id: UUID
    complaint_id: UUID
    citizen_id: UUID
    rating: int
    comment: str | None = None
    reopened: bool
    created_at: datetime


class FeedbackSummary(BaseModel):
    department_id: UUID
    average_rating: float
    total_feedback: int
    reopened_count: int
