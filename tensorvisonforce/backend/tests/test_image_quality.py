import numpy as np
import pytest
from PIL import Image, ImageFilter

from app.services.image_quality import assess_image_quality, compute_sharpness_score


def _make_sharp_image(size=(600, 600)) -> Image.Image:
    """A checkerboard pattern has lots of high-frequency edge content."""
    arr = np.zeros(size, dtype=np.uint8)
    block = 20
    for i in range(0, size[0], block):
        for j in range(0, size[1], block):
            if ((i // block) + (j // block)) % 2 == 0:
                arr[i : i + block, j : j + block] = 255
    return Image.fromarray(arr, mode="L").convert("RGB")


def _make_blurry_image(size=(600, 600)) -> Image.Image:
    sharp = _make_sharp_image(size)
    return sharp.filter(ImageFilter.GaussianBlur(radius=8))


def _make_flat_image(size=(600, 600)) -> Image.Image:
    """A single solid color has ~zero edge content -- maximally 'blurry'."""
    return Image.new("RGB", size, color=(128, 128, 128))


class TestSharpnessScore:
    def test_sharp_image_scores_higher_than_blurry(self):
        sharp = _make_sharp_image()
        blurry = _make_blurry_image()
        assert compute_sharpness_score(sharp) > compute_sharpness_score(blurry)

    def test_flat_image_has_near_zero_sharpness(self):
        flat = _make_flat_image()
        assert compute_sharpness_score(flat) < 1.0


class TestAssessImageQuality:
    def test_sharp_high_res_image_passes(self, settings):
        image = _make_sharp_image((800, 800))
        result = assess_image_quality(image, settings)
        assert result.is_blurry is False
        assert result.resolution_ok is True
        assert result.width == 800
        assert result.height == 800
        assert 0.0 <= result.quality_score <= 1.0

    def test_blurry_image_flagged(self, settings):
        image = _make_blurry_image((800, 800))
        result = assess_image_quality(image, settings)
        assert result.is_blurry is True
        assert any("blurry" in issue.lower() for issue in result.issues)

    def test_low_resolution_image_flagged(self, settings):
        image = _make_sharp_image((100, 100))
        result = assess_image_quality(image, settings)
        assert result.resolution_ok is False
        assert any("resolution" in issue.lower() for issue in result.issues)

    def test_quality_score_bounded(self, settings):
        for image in (_make_sharp_image(), _make_blurry_image(), _make_flat_image()):
            result = assess_image_quality(image, settings)
            assert 0.0 <= result.quality_score <= 1.0
