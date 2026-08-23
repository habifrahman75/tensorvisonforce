"""
Duplicate detection: flags a newly submitted complaint as a likely duplicate
of an existing open complaint using three signals:

  1. Text similarity   — SequenceMatcher ratio (description vs description)
  2. Geo proximity     — haversine distance gate (hard filter)
  3. Image hash dist   — dHash Hamming distance, when both sides have a photo

Geo proximity is a hard gate: two similar-sounding complaints across town
are not the same issue.  Text ± image similarity are then blended into a
score used to rank candidates.

IMPORTANT: duplicates are flagged, not automatically rejected.
Human verification is always required before acting on a duplicate flag.
"""
from dataclasses import dataclass
from difflib import SequenceMatcher

from app.config import Settings
from app.schemas.ai import DuplicateCandidate, DuplicateCheckResult
from app.schemas.complaints import GeoPoint
from app.services.location import haversine_distance_meters
from app.utils.image_hash import hamming_distance

TEXT_WEIGHT  = 0.6
IMAGE_WEIGHT = 0.4
DUPLICATE_SCORE_THRESHOLD = 0.60  # configurable; above this → potential duplicate


@dataclass
class ExistingComplaint:
    id:          str
    description: str
    location:    GeoPoint
    image_phash: str | None = None
    category:    str | None = None


def text_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def image_similarity(hash_a: str, hash_b: str, hash_bits: int = 64) -> float:
    distance = hamming_distance(hash_a, hash_b)
    return max(0.0, 1.0 - (distance / hash_bits))


def evaluate_candidate(
    *,
    new_description: str,
    new_location:    GeoPoint,
    new_phash:       str | None,
    candidate:       ExistingComplaint,
    settings:        Settings,
) -> DuplicateCandidate | None:
    distance_m = haversine_distance_meters(new_location, candidate.location)
    if distance_m > settings.duplicate_location_radius_meters:
        return None  # hard geo gate — too far apart

    text_score = text_similarity(new_description, candidate.description)

    hash_dist  = -1
    if new_phash and candidate.image_phash:
        hash_dist  = hamming_distance(new_phash, candidate.image_phash)
        img_score  = image_similarity(new_phash, candidate.image_phash)
        blended    = TEXT_WEIGHT * text_score + IMAGE_WEIGHT * img_score
    else:
        blended = text_score

    return DuplicateCandidate(
        complaint_id    = candidate.id,
        similarity      = round(blended, 4),
        distance_meters = round(distance_m, 1),
        hash_distance   = hash_dist,
    )


def find_duplicates(
    *,
    new_description:      str,
    new_location:         GeoPoint,
    new_phash:            str | None,
    existing_complaints:  list[ExistingComplaint],
    settings:             Settings,
) -> DuplicateCheckResult:
    candidates: list[DuplicateCandidate] = []

    for existing in existing_complaints:
        result = evaluate_candidate(
            new_description = new_description,
            new_location    = new_location,
            new_phash       = new_phash,
            candidate       = existing,
            settings        = settings,
        )
        if result is not None:
            candidates.append(result)

    candidates.sort(key=lambda c: c.similarity, reverse=True)

    top_score         = candidates[0].similarity if candidates else 0.0
    is_duplicate      = bool(candidates) and top_score >= DUPLICATE_SCORE_THRESHOLD
    potential_dup     = bool(candidates) and top_score >= 0.40  # softer flag

    matched_ids = [str(c.complaint_id) for c in candidates if c.similarity >= 0.40]

    return DuplicateCheckResult(
        is_duplicate          = is_duplicate,
        duplicate_score       = round(top_score, 4),
        potential_duplicate   = potential_dup,
        matched_complaint_ids = matched_ids,
        candidates            = candidates,
    )
