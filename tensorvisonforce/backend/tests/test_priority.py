from app.schemas.ai import PriorityRequest
from app.schemas.complaints import ComplaintCategory, Priority
from app.services.priority import compute_priority, score_to_priority


class TestScoreToPriority:
    def test_boundaries(self):
        assert score_to_priority(0) == Priority.LOW
        assert score_to_priority(34) == Priority.LOW
        assert score_to_priority(35) == Priority.MEDIUM
        assert score_to_priority(54) == Priority.MEDIUM
        assert score_to_priority(55) == Priority.HIGH
        assert score_to_priority(74) == Priority.HIGH
        assert score_to_priority(75) == Priority.CRITICAL
        assert score_to_priority(100) == Priority.CRITICAL


class TestComputePriority:
    def test_base_case_uses_category_severity(self):
        request = PriorityRequest(
            category=ComplaintCategory.STREETLIGHT,
            description="The streetlight is off",
        )
        result = compute_priority(request)
        assert result.priority in (Priority.LOW, Priority.MEDIUM)
        assert result.score > 0
        assert len(result.reasons) >= 1

    def test_danger_keywords_increase_score(self):
        low_urgency = compute_priority(
            PriorityRequest(category=ComplaintCategory.POTHOLE, description="There is a pothole on the road")
        )
        high_urgency = compute_priority(
            PriorityRequest(
                category=ComplaintCategory.POTHOLE,
                description="There is a dangerous pothole that caused an accident near the school",
            )
        )
        assert high_urgency.score > low_urgency.score

    def test_duplicate_count_increases_score_but_is_capped(self):
        base = compute_priority(
            PriorityRequest(category=ComplaintCategory.GARBAGE, description="Garbage is piling up", duplicate_count=0)
        )
        many_dupes = compute_priority(
            PriorityRequest(
                category=ComplaintCategory.GARBAGE, description="Garbage is piling up", duplicate_count=50
            )
        )
        capped_dupes = compute_priority(
            PriorityRequest(
                category=ComplaintCategory.GARBAGE, description="Garbage is piling up", duplicate_count=5
            )
        )
        assert many_dupes.score > base.score
        # Duplicate bump caps at 20, so 50 reports shouldn't outscore what
        # 5 reports already achieves once the cap kicks in.
        assert many_dupes.score == capped_dupes.score

    def test_low_image_quality_reduces_score(self):
        good_image = compute_priority(
            PriorityRequest(
                category=ComplaintCategory.WATER_LEAKAGE,
                description="Water is leaking from a pipe",
                image_quality_score=0.9,
            )
        )
        bad_image = compute_priority(
            PriorityRequest(
                category=ComplaintCategory.WATER_LEAKAGE,
                description="Water is leaking from a pipe",
                image_quality_score=0.1,
            )
        )
        assert bad_image.score < good_image.score

    def test_score_never_exceeds_bounds(self):
        result = compute_priority(
            PriorityRequest(
                category=ComplaintCategory.WATER_LEAKAGE,
                description="fire danger accident injury hazard collapse flood sewage electric",
                duplicate_count=100,
            )
        )
        assert 0.0 <= result.score <= 100.0

    def test_water_leakage_outranks_streetlight_all_else_equal(self):
        water = compute_priority(
            PriorityRequest(category=ComplaintCategory.WATER_LEAKAGE, description="Water leaking from pipe")
        )
        streetlight = compute_priority(
            PriorityRequest(category=ComplaintCategory.STREETLIGHT, description="Streetlight is off")
        )
        assert water.score > streetlight.score
