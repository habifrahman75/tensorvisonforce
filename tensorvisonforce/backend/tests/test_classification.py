import pytest

from app.schemas.complaints import ComplaintCategory
from app.services.classification import classify_text


class TestClassification:
    @pytest.mark.parametrize(
        "text,expected_category",
        [
            ("There is a huge pothole on the main road damaging cars", ComplaintCategory.POTHOLE),
            ("Garbage has not been collected from our street for a week", ComplaintCategory.GARBAGE),
            ("The streetlight outside my house has stopped working", ComplaintCategory.STREETLIGHT),
            ("A water pipe burst and is flooding the street", ComplaintCategory.WATER_LEAKAGE),
            ("The drain outside is blocked and overflowing with sewage", ComplaintCategory.DRAINAGE),
        ],
    )
    def test_classifies_clear_examples_correctly(self, text, expected_category, settings):
        result = classify_text(text, settings)
        assert result.category == expected_category
        assert 0.0 <= result.confidence <= 1.0

    def test_scores_sum_to_roughly_one(self, settings):
        result = classify_text("The pothole on the highway is very dangerous", settings)
        total = sum(result.scores.values())
        assert abs(total - 1.0) < 0.01

    def test_empty_text_raises(self, settings):
        with pytest.raises(ValueError):
            classify_text("", settings)

    def test_whitespace_only_text_raises(self, settings):
        with pytest.raises(ValueError):
            classify_text("   ", settings)

    def test_low_confidence_falls_back_to_other(self, settings, monkeypatch):
        monkeypatch.setattr(settings, "classification_confidence_threshold", 0.99)
        result = classify_text("Something vague happened somewhere", settings)
        assert result.category == ComplaintCategory.OTHER

    def test_predicted_category_is_among_trained_classes(self, settings):
        result = classify_text("There is trash piled up near my house", settings)
        trained_classes = set(result.scores.keys())
        assert result.category.value in trained_classes or result.category == ComplaintCategory.OTHER
