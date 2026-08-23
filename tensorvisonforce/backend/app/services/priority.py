"""
Rule-based priority scoring.

Rather than a black-box model (hard to justify to a citizen or auditor
why their pothole report got marked "low"), priority is a transparent
weighted score built from:

  - base severity per category (a water leak is inherently more urgent
    than, say, a faded street sign)
  - danger/urgency keywords found in the free-text description
  - how many other citizens have reported the same issue (duplicate_count)
  - image evidence quality (a clear photo raises confidence in severity)

The `reasons` list in the result is intentionally human-readable so it
can be shown to a reviewer or citizen.
"""
import re

from app.schemas.ai import PriorityRequest, PriorityResult
from app.schemas.complaints import ComplaintCategory, Priority

# Base severity score (0-100) per category, before adjustments.
_BASE_SEVERITY: dict[ComplaintCategory, int] = {
    ComplaintCategory.WATER_LEAKAGE: 55,
    ComplaintCategory.DRAINAGE: 50,
    ComplaintCategory.POTHOLE: 45,
    ComplaintCategory.STREETLIGHT: 30,
    ComplaintCategory.GARBAGE: 35,
    ComplaintCategory.OTHER: 25,
}

# Keyword -> score bump. Matched case-insensitively as whole words.
_URGENCY_KEYWORDS: dict[str, int] = {
    "accident": 25,
    "injur": 25,  # matches injury / injured
    "danger": 20,
    "hazard": 18,
    "children": 15,
    "school": 15,
    "hospital": 15,
    "electric": 15,
    "sewage": 15,
    "flood": 15,
    "collapse": 20,
    "fire": 25,
    "blind": 10,
    "elderly": 10,
    "disabled": 10,
    "night": 8,
    "overflow": 12,
}

_DUPLICATE_BUMP_PER_REPORT = 4
_DUPLICATE_BUMP_CAP = 20

_LOW_IMAGE_QUALITY_PENALTY = 5
_LOW_IMAGE_QUALITY_THRESHOLD = 0.3


def _keyword_bump(description: str) -> tuple[int, list[str]]:
    text = description.lower()
    bump = 0
    matched: list[str] = []
    for keyword, weight in _URGENCY_KEYWORDS.items():
        if re.search(rf"\b{re.escape(keyword)}", text):
            bump += weight
            matched.append(keyword)
    return bump, matched


def score_to_priority(score: float) -> Priority:
    if score >= 75:
        return Priority.CRITICAL
    if score >= 55:
        return Priority.HIGH
    if score >= 35:
        return Priority.MEDIUM
    return Priority.LOW


def compute_priority(request: PriorityRequest) -> PriorityResult:
    reasons: list[str] = []

    base = _BASE_SEVERITY.get(request.category, _BASE_SEVERITY[ComplaintCategory.OTHER])
    reasons.append(f"Base severity for '{request.category.value}': {base}")
    score = float(base)

    keyword_bump, matched_keywords = _keyword_bump(request.description)
    if keyword_bump:
        score += keyword_bump
        reasons.append(f"Urgency keywords {matched_keywords} added {keyword_bump}")

    if request.duplicate_count > 0:
        dup_bump = min(request.duplicate_count * _DUPLICATE_BUMP_PER_REPORT, _DUPLICATE_BUMP_CAP)
        score += dup_bump
        reasons.append(
            f"{request.duplicate_count} similar report(s) nearby added {dup_bump} (capped at {_DUPLICATE_BUMP_CAP})"
        )

    if (
        request.image_quality_score is not None
        and request.image_quality_score < _LOW_IMAGE_QUALITY_THRESHOLD
    ):
        score -= _LOW_IMAGE_QUALITY_PENALTY
        reasons.append(
            f"Low image quality ({request.image_quality_score:.2f}) reduced confidence, -{_LOW_IMAGE_QUALITY_PENALTY}"
        )

    score = max(0.0, min(score, 100.0))
    priority = score_to_priority(score)
    reasons.append(f"Final score {score:.1f} -> priority '{priority.value}'")

    return PriorityResult(priority=priority, score=round(score, 1), reasons=reasons)
