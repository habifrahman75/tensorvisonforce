"""
Image quality analysis for complaint photo uploads.

Sharpness is estimated via Laplacian-variance (no OpenCV needed — pure numpy).
Sharp images have high-frequency edge content → high variance after the
Laplacian kernel; blurry images are smoothed → low variance.

Brightness is estimated as the mean pixel intensity on the grayscale image.
"""
import numpy as np
from PIL import Image

from app.config import Settings
from app.schemas.ai import ImageQualityResult

_LAPLACIAN_KERNEL = np.array(
    [[0, 1, 0], [1, -4, 1], [0, 1, 0]],
    dtype=np.float32,
)


def _convolve2d(gray: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    kh, kw = kernel.shape
    pad_h, pad_w = kh // 2, kw // 2
    padded = np.pad(gray, ((pad_h, pad_h), (pad_w, pad_w)), mode="edge")
    out = np.zeros_like(gray, dtype=np.float32)
    for i in range(kh):
        for j in range(kw):
            out += kernel[i, j] * padded[i : i + gray.shape[0], j : j + gray.shape[1]]
    return out


def compute_sharpness_score(image: Image.Image) -> float:
    """Higher = sharper.  Laplacian variance of the grayscale image."""
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    if gray.shape[0] > 800 or gray.shape[1] > 800:
        img_small = image.convert("L")
        img_small.thumbnail((800, 800))
        gray = np.asarray(img_small, dtype=np.float32)
    return float(_convolve2d(gray, _LAPLACIAN_KERNEL).var())


def compute_brightness(image: Image.Image) -> float:
    """Mean pixel intensity on [0, 255] scale."""
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    return float(gray.mean())


def _quality_status(quality_score: float, issues: list[str]) -> tuple[str, str]:
    """Returns (quality_status, recommendation)."""
    if not issues:
        return "good", "Image quality is acceptable for processing."
    if quality_score >= 0.4:
        return "acceptable", (
            "Image quality is marginal. "
            "Consider retaking for better AI analysis accuracy."
        )
    return "poor", (
        "Image quality is poor. "
        "Please retake the photo in better lighting and hold the camera steady. "
        "The enhanced version will be used for processing."
    )


def assess_image_quality(image: Image.Image, settings: Settings) -> ImageQualityResult:
    width, height = image.size
    issues: list[str] = []

    resolution_ok = min(width, height) >= settings.min_image_resolution
    if not resolution_ok:
        issues.append(
            f"Resolution too low ({width}×{height}); "
            f"minimum short side is {settings.min_image_resolution}px"
        )

    sharpness = compute_sharpness_score(image)
    brightness = compute_brightness(image)
    is_blurry  = sharpness < settings.blur_threshold
    if is_blurry:
        issues.append(f"Image appears blurry (sharpness={sharpness:.1f})")

    if brightness < 40:
        issues.append(f"Image is too dark (brightness={brightness:.1f})")
    elif brightness > 220:
        issues.append(f"Image is overexposed (brightness={brightness:.1f})")

    # Composite quality score (0-1)
    sharpness_component  = min(sharpness / (settings.blur_threshold * 3), 1.0)
    resolution_component = 1.0 if resolution_ok else 0.4
    quality_score = round(
        0.7 * sharpness_component + 0.3 * resolution_component,
        3,
    )
    quality_score = max(0.0, min(quality_score, 1.0))

    status, recommendation = _quality_status(quality_score, issues)

    return ImageQualityResult(
        is_blurry        = is_blurry,
        sharpness_score  = round(sharpness, 2),
        resolution_ok    = resolution_ok,
        width            = width,
        height           = height,
        quality_score    = quality_score,
        quality_status   = status,
        recommendation   = recommendation,
        brightness       = round(brightness, 2),
        blur_score       = round(sharpness, 2),
        issues           = issues,
    )


def assess_image_quality_from_path(path: str, settings: Settings) -> ImageQualityResult:
    with Image.open(path) as img:
        return assess_image_quality(img, settings)
