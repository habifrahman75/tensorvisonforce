"""
Suspicious complaint analysis.

This is NOT a fraud detector — it is a lightweight filter that catches
obviously low-effort, spammy, or suspicious submissions so human reviewers
focus their time on real cases.

IMPORTANT: 'suspicious' does NOT mean 'fake'.  All flagged complaints must
go through human verification before any action is taken.

Suspicion levels:
  LOW    — no issues detected, proceed normally
  MEDIUM — one or more soft flags, route for review
  HIGH   — multiple strong signals, flag prominently for admin review
"""
import re

from app.schemas.ai import ClassificationResult, ImageQualityResult, VerificationResult

_MIN_WORD_COUNT      = 4
_REPEATED_CHAR       = re.compile(r"(.)\1{5,}")      # e.g. "aaaaaaa"
_URL_PATTERN         = re.compile(r"https?://|www\.", re.IGNORECASE)
_GIBBERISH_PATTERN   = re.compile(r"^[^a-z0-9]{10,}$", re.IGNORECASE)


def _text_issues(text: str) -> list[str]:
    issues: list[str] = []
    if _REPEATED_CHAR.search(text):
        issues.append("Description contains suspicious repeated characters")
    if _URL_PATTERN.search(text):
        issues.append("Description contains a URL (unusual for a complaint)")
    word_count = len(text.split())
    if word_count < _MIN_WORD_COUNT:
        issues.append(f"Description is very short ({word_count} words)")
    if _GIBBERISH_PATTERN.search(text):
        issues.append("Description appears to be gibberish or random characters")
    return issues


def _compute_suspicion_level(confidence: float, reasons: list[str]) -> str:
    if len(reasons) >= 3 or confidence < 0.30:
        return "HIGH"
    if reasons or confidence < 0.60:
        return "MEDIUM"
    return "LOW"


def verify_complaint(
    *,
    description:     str,
    has_image:       bool,
    classification:  ClassificationResult | None = None,
    image_quality:   ImageQualityResult   | None = None,
    gps_provided:    bool                 = True,
) -> VerificationResult:
    reasons:   list[str] = []
    confidence = 1.0

    # ---- text checks ----
    text_issues = _text_issues(description)
    if text_issues:
        reasons.extend(text_issues)
        confidence -= 0.25 * len(text_issues)

    # ---- image presence ----
    if not has_image:
        reasons.append("No supporting photo was attached")
        confidence -= 0.15

    # ---- GPS / location ----
    if not gps_provided:
        reasons.append("No GPS coordinates provided — location could not be verified")
        confidence -= 0.10

    # ---- AI classification confidence ----
    if classification is not None and classification.confidence < 0.35:
        reasons.append(
            f"Low AI classification confidence ({classification.confidence:.2f}); "
            "description may not clearly describe a civic issue"
        )
        confidence -= 0.20

    # ---- image quality ----
    if image_quality is not None:
        if image_quality.is_blurry:
            reasons.append("Attached image is blurry")
            confidence -= 0.10
        if not image_quality.resolution_ok:
            reasons.append("Attached image resolution is below the minimum requirement")
            confidence -= 0.10
        if image_quality.quality_status == "poor":
            reasons.append("Overall image quality is poor")
            confidence -= 0.05

    confidence = max(0.0, min(confidence, 1.0))
    is_plausible         = confidence >= 0.50
    suspicion_level      = _compute_suspicion_level(confidence, reasons)
    verification_required = not is_plausible or suspicion_level in ("MEDIUM", "HIGH")

    if not reasons:
        reasons.append("No issues detected — complaint appears genuine")

    return VerificationResult(
        is_plausible          = is_plausible,
        confidence            = round(confidence, 2),
        suspicion_level       = suspicion_level,
        verification_required = verification_required,
        reasons               = reasons,
        notes                 = reasons,   # backward-compat alias
    )
