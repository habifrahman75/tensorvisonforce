"""
Lightweight plausibility checks run on a newly submitted complaint before
it's auto-advanced from SUBMITTED to VERIFIED. This is not a fraud
detector -- it's a cheap filter that catches obviously low-effort or
spammy submissions (empty/garbage text, no supporting image, category
mismatch) so human reviewers spend time on real cases.
"""
import re

from app.schemas.ai import ClassificationResult, ImageQualityResult, VerificationResult

_MIN_WORD_COUNT = 4
_REPEATED_CHAR_PATTERN = re.compile(r"(.)\1{5,}")  # e.g. "aaaaaaa" or "!!!!!!!"
_URL_PATTERN = re.compile(r"https?://|www\.", re.IGNORECASE)


def _looks_like_spam(text: str) -> list[str]:
    issues = []
    if _REPEATED_CHAR_PATTERN.search(text):
        issues.append("Description contains suspicious repeated characters")
    if _URL_PATTERN.search(text):
        issues.append("Description contains a URL, which is unusual for a complaint")
    word_count = len(text.split())
    if word_count < _MIN_WORD_COUNT:
        issues.append(f"Description is very short ({word_count} words)")
    return issues


def verify_complaint(
    *,
    description: str,
    has_image: bool,
    classification: ClassificationResult | None = None,
    image_quality: ImageQualityResult | None = None,
) -> VerificationResult:
    notes: list[str] = []
    confidence = 1.0

    spam_issues = _looks_like_spam(description)
    if spam_issues:
        notes.extend(spam_issues)
        confidence -= 0.3 * len(spam_issues)

    if not has_image:
        notes.append("No supporting image was attached")
        confidence -= 0.15

    if classification is not None and classification.confidence < 0.35:
        notes.append(
            f"Low classification confidence ({classification.confidence:.2f}); "
            "description may not clearly describe a civic issue"
        )
        confidence -= 0.2

    if image_quality is not None:
        if image_quality.is_blurry:
            notes.append("Attached image is blurry")
            confidence -= 0.1
        if not image_quality.resolution_ok:
            notes.append("Attached image resolution is below the minimum")
            confidence -= 0.1

    confidence = max(0.0, min(confidence, 1.0))
    is_plausible = confidence >= 0.5

    if not notes:
        notes.append("No issues detected")

    return VerificationResult(is_plausible=is_plausible, confidence=round(confidence, 2), notes=notes)
