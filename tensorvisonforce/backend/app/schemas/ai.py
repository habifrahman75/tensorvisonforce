from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.complaints import ComplaintCategory, GeoPoint, Priority


class ClassificationRequest(BaseModel):
    text: str = Field(min_length=3, max_length=3000)


class ClassificationResult(BaseModel):
    category: ComplaintCategory
    confidence: float = Field(ge=0.0, le=1.0)
    scores: dict[str, float] = Field(default_factory=dict)


class PriorityRequest(BaseModel):
    category: ComplaintCategory
    description: str
    location: GeoPoint | None = None
    duplicate_count: int = 0
    image_quality_score: float | None = None


class PriorityResult(BaseModel):
    priority: Priority
    score: float
    reasons: list[str] = Field(default_factory=list)


class ImageQualityRequest(BaseModel):
    image_id: UUID


class ImageQualityResult(BaseModel):
    is_blurry: bool
    sharpness_score: float
    resolution_ok: bool
    width: int
    height: int
    quality_score: float = Field(ge=0.0, le=1.0)
    issues: list[str] = Field(default_factory=list)


class DuplicateCandidate(BaseModel):
    complaint_id: UUID
    similarity: float = Field(ge=0.0, le=1.0)
    distance_meters: float
    hash_distance: int


class DuplicateCheckRequest(BaseModel):
    description: str
    location: GeoPoint
    image_phash: str | None = None
    category: ComplaintCategory | None = None


class DuplicateCheckResult(BaseModel):
    is_duplicate: bool
    candidates: list[DuplicateCandidate] = Field(default_factory=list)


class VerificationResult(BaseModel):
    is_plausible: bool
    confidence: float
    notes: list[str] = Field(default_factory=list)
