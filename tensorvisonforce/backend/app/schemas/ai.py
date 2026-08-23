"""
Pydantic schemas for AI pipeline request/response objects.
"""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.complaints import ComplaintCategory, GeoPoint, Priority


# ---------------------------------------------------------------------------
# Text classification
# ---------------------------------------------------------------------------

class ClassificationRequest(BaseModel):
    text: str = Field(min_length=3, max_length=3000)


class ClassificationResult(BaseModel):
    category:   ComplaintCategory
    confidence: float = Field(ge=0.0, le=1.0)
    scores:     dict[str, float] = Field(default_factory=dict)
    verification_required: bool = False  # True when confidence < threshold


# ---------------------------------------------------------------------------
# Priority scoring
# ---------------------------------------------------------------------------

class PriorityRequest(BaseModel):
    category:            ComplaintCategory
    description:         str
    location:            GeoPoint | None = None
    duplicate_count:     int             = 0
    image_quality_score: float | None    = None


class PriorityResult(BaseModel):
    priority:        Priority
    score:           float
    priority_score:  float = 0.0      # alias exposed to callers
    priority_reasons: list[str] = Field(default_factory=list)
    reasons:         list[str]  = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Image quality
# ---------------------------------------------------------------------------

class ImageQualityResult(BaseModel):
    is_blurry:       bool
    sharpness_score: float
    resolution_ok:   bool
    width:           int
    height:          int
    quality_score:   float = Field(ge=0.0, le=1.0)
    quality_status:  str   = "acceptable"    # good | acceptable | poor
    recommendation:  str   = ""
    brightness:      float = 0.0
    blur_score:      float = 0.0             # alias for sharpness_score
    issues:          list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------

class DuplicateCandidate(BaseModel):
    complaint_id:    UUID
    similarity:      float = Field(ge=0.0, le=1.0)
    distance_meters: float
    hash_distance:   int


class DuplicateCheckRequest(BaseModel):
    description:  str
    location:     GeoPoint
    image_phash:  str | None          = None
    category:     ComplaintCategory | None = None


class DuplicateCheckResult(BaseModel):
    is_duplicate:          bool
    duplicate_score:       float                = 0.0
    potential_duplicate:   bool                 = False
    matched_complaint_ids: list[str]            = Field(default_factory=list)
    candidates:            list[DuplicateCandidate] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Suspicious / verification analysis
# ---------------------------------------------------------------------------

class VerificationResult(BaseModel):
    is_plausible:          bool
    confidence:            float
    suspicion_level:       str       = "LOW"   # LOW | MEDIUM | HIGH
    verification_required: bool      = False
    reasons:               list[str] = Field(default_factory=list)
    notes:                 list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Enhanced image
# ---------------------------------------------------------------------------

class EnhancedImageResult(BaseModel):
    original_url:      str | None = None
    enhanced_url:      str | None = None
    enhancement_applied: bool     = False
    note:              str        = ""
