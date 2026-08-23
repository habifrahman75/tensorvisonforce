import uuid

from app.schemas.complaints import GeoPoint
from app.services.duplicate_detection import (
    ExistingComplaint,
    find_duplicates,
    image_similarity,
    text_similarity,
)


class TestTextSimilarity:
    def test_identical_text_is_perfect_match(self):
        assert text_similarity("pothole on main street", "pothole on main street") == 1.0

    def test_completely_different_text_is_low(self):
        score = text_similarity("pothole on main street", "streetlight not working")
        assert score < 0.5

    def test_case_insensitive(self):
        assert text_similarity("Pothole Here", "pothole here") == 1.0


class TestImageSimilarity:
    def test_identical_hash_is_perfect_match(self):
        assert image_similarity("a" * 16, "a" * 16) == 1.0

    def test_completely_different_hash_is_low(self):
        score = image_similarity("0" * 16, "f" * 16)
        assert score < 0.5


class TestFindDuplicates:
    def _settings(self, settings, monkeypatch, radius=50):
        monkeypatch.setattr(settings, "duplicate_location_radius_meters", radius)
        return settings

    def test_nearby_similar_complaint_flagged_as_duplicate(self, settings, monkeypatch):
        settings = self._settings(settings, monkeypatch)
        existing = ExistingComplaint(
            id=str(uuid.uuid4()),
            description="There is a large pothole on Main Street near the school",
            location=GeoPoint(latitude=13.0827, longitude=80.2707),
        )
        result = find_duplicates(
            new_description="There is a large pothole on Main Street near the school",
            new_location=GeoPoint(latitude=13.0828, longitude=80.2708),
            new_phash=None,
            existing_complaints=[existing],
            settings=settings,
        )
        assert result.is_duplicate is True
        assert result.candidates[0].similarity >= 0.6

    def test_far_away_complaint_not_flagged_even_if_similar_text(self, settings, monkeypatch):
        settings = self._settings(settings, monkeypatch, radius=50)
        existing = ExistingComplaint(
            id=str(uuid.uuid4()),
            description="There is a large pothole on Main Street near the school",
            location=GeoPoint(latitude=20.0, longitude=90.0),  # far away
        )
        result = find_duplicates(
            new_description="There is a large pothole on Main Street near the school",
            new_location=GeoPoint(latitude=13.0827, longitude=80.2707),
            new_phash=None,
            existing_complaints=[existing],
            settings=settings,
        )
        assert result.is_duplicate is False
        assert result.candidates == []

    def test_nearby_but_unrelated_complaint_not_flagged(self, settings, monkeypatch):
        settings = self._settings(settings, monkeypatch)
        existing = ExistingComplaint(
            id=str(uuid.uuid4()),
            description="The streetlight near the park has stopped working",
            location=GeoPoint(latitude=13.0827, longitude=80.2707),
        )
        result = find_duplicates(
            new_description="Garbage has piled up outside the market",
            new_location=GeoPoint(latitude=13.0827, longitude=80.2707),
            new_phash=None,
            existing_complaints=[existing],
            settings=settings,
        )
        assert result.is_duplicate is False

    def test_no_existing_complaints_returns_empty(self, settings):
        result = find_duplicates(
            new_description="There is a pothole here",
            new_location=GeoPoint(latitude=13.0827, longitude=80.2707),
            new_phash=None,
            existing_complaints=[],
            settings=settings,
        )
        assert result.is_duplicate is False
        assert result.candidates == []

    def test_candidates_sorted_by_similarity_descending(self, settings, monkeypatch):
        settings = self._settings(settings, monkeypatch, radius=1000)
        loc = GeoPoint(latitude=13.0827, longitude=80.2707)
        weak_match = ExistingComplaint(id=str(uuid.uuid4()), description="Garbage near the market", location=loc)
        strong_match = ExistingComplaint(
            id=str(uuid.uuid4()), description="Pothole on Main Street near school", location=loc
        )
        result = find_duplicates(
            new_description="Pothole on Main Street near school",
            new_location=loc,
            new_phash=None,
            existing_complaints=[weak_match, strong_match],
            settings=settings,
        )
        assert str(result.candidates[0].complaint_id) == strong_match.id
