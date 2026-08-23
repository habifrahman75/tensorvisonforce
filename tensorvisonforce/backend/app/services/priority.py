"""
Rule-based priority scoring.

Transparent, auditable scoring — every signal is listed in `reasons[]` so
admins, workers, and citizens can understand why a complaint got its priority.

Score thresholds (0–100):
  score >= 70  => HIGH
  score >= 40  => MEDIUM
  score <  40  => LOW

Signals:
  1. Base severity per category
  2. Urgency / danger keywords in description
  3. Number of nearby duplicate reports (social proof of impact)
  4. Image quality penalty (low-confidence evidence lowers trust)
"""
import re

from app.schemas.ai import PriorityRequest, PriorityResult
from app.schemas.complaints import ComplaintCategory, Priority

# ---------------------------------------------------------------------------
# Category base severity (0–100)
# ---------------------------------------------------------------------------
_BASE_SEVERITY: dict[ComplaintCategory, int] = {
    ComplaintCategory.WATER_LEAKAGE: 60,
    ComplaintCategory.DRAINAGE:      55,
    ComplaintCategory.POTHOLE:       45,
    ComplaintCategory.GARBAGE:       35,
    ComplaintCategory.STREETLIGHT:   30,
    ComplaintCategory.OTHER:         20,
}

# ---------------------------------------------------------------------------
# Urgency keyword bumps (matched case-insensitively as whole words)
# ---------------------------------------------------------------------------
_URGENCY_KEYWORDS: dict[str, int] = {
    "accident":  25,
    "injur":     25,   # injury / injured
    "danger":    20,
    "hazard":    18,
    "fire":      25,
    "collapse":  20,
    "flood":     15,
    "sewage":    15,
    "electric":  15,
    "hospital":  15,
    "school":    15,
    "children":  15,
    "elderly":   10,
    "disabled":  10,
    "night":      8,
    "overflow":  12,
    "blind":     10,
}

_DUPLICATE_BUMP_PER_REPORT = 4
_DUPLICATE_BUMP_CAP        = 20
_LOW_IMAGE_QUALITY_PENALTY = 5
_LOW_IMAGE_QUALITY_THRESHOLD = 0.3


def _keyword_bump(description: str) -> tuple[int, list[str]]:
    text = description.lower()
    bump = 0
    matched: list[str] = []
    for keyword, weight in _URGENCY_KEYWORDS.items():
        if re.search(rf"\b{re.escape(keyword)}", text):
            bump    += weight
            matched.append(keyword)
    return bump, matched


def score_to_priority(score: float) -> Priority:
    if score >= 70:
        return Priority.HIGH
    if score >= 40:
        return Priority.MEDIUM
    return Priority.LOW


def compute_priority(request: PriorityRequest) -> PriorityResult:
    reasons: list[str] = []

    # Signal 1: category base severity
    base = _BASE_SEVERITY.get(request.category, _BASE_SEVERITY[ComplaintCategory.OTHER])
    reasons.append(f"Base severity for '{request.category.value}': {base}")
    score = float(base)

    # Signal 2: urgency keywords
    keyword_bump, matched = _keyword_bump(request.description)
    if keyword_bump:
        score += keyword_bump
        reasons.append(f"Urgency keywords {matched} added +{keyword_bump}")

    # Signal 3: duplicate / co-report count (social proof)
    if request.duplicate_count > 0:
        dup_bump = min(
            request.duplicate_count * _DUPLICATE_BUMP_PER_REPORT,
            _DUPLICATE_BUMP_CAP,
        )
        score += dup_bump
        reasons.append(
            f"{request.duplicate_count} similar nearby report(s) added "
            f"+{dup_bump} (cap={_DUPLICATE_BUMP_CAP})"
        )

    # Signal 4: image quality penalty
    if (
        request.image_quality_score is not None
        and request.image_quality_score < _LOW_IMAGE_QUALITY_THRESHOLD
    ):
        score -= _LOW_IMAGE_QUALITY_PENALTY
        reasons.append(
            f"Low image quality score ({request.image_quality_score:.2f}) "
            f"reduced confidence: -{_LOW_IMAGE_QUALITY_PENALTY}"
        )

    score    = max(0.0, min(score, 100.0))
    priority = score_to_priority(score)
    reasons.append(f"Final score {score:.1f} → priority '{priority.value}'")

    return PriorityResult(priority=priority, score=round(score, 1), reasons=reasons)
