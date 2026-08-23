"""
Image quality checks for complaint photo uploads.

Sharpness is estimated with a Laplacian-variance heuristic (implemented
by hand with numpy so we don't need an OpenCV dependency): sharp images
have high-frequency edge content, which shows up as high variance after
a Laplacian (edge-detection) kernel is applied. Blurry images look
"smoothed" and produce low variance.
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
    """Higher = sharper. Laplacian variance of the grayscale image."""
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    # Downscale very large images for speed; sharpness signal is preserved.
    if gray.shape[0] > 800 or gray.shape[1] > 800:
        img_small = image.convert("L")
        img_small.thumbnail((800, 800))
        gray = np.asarray(img_small, dtype=np.float32)
    laplacian = _convolve2d(gray, _LAPLACIAN_KERNEL)
    return float(laplacian.var())


def assess_image_quality(image: Image.Image, settings: Settings) -> ImageQualityResult:
    width, height = image.size
    issues: list[str] = []

    resolution_ok = min(width, height) >= settings.min_image_resolution
    if not resolution_ok:
        issues.append(
            f"Resolution too low ({width}x{height}); minimum side is "
            f"{settings.min_image_resolution}px"
        )

    sharpness = compute_sharpness_score(image)
    is_blurry = sharpness < settings.blur_threshold
    if is_blurry:
        issues.append(f"Image appears blurry (sharpness={sharpness:.1f})")

    # Combine into a single 0-1 quality score.
    sharpness_component = min(sharpness / (settings.blur_threshold * 3), 1.0)
    resolution_component = 1.0 if resolution_ok else 0.4
    quality_score = round(0.7 * sharpness_component + 0.3 * resolution_component, 3)

    return ImageQualityResult(
        is_blurry=is_blurry,
        sharpness_score=round(sharpness, 2),
        resolution_ok=resolution_ok,
        width=width,
        height=height,
        quality_score=max(0.0, min(quality_score, 1.0)),
        issues=issues,
    )


def assess_image_quality_from_path(path: str, settings: Settings) -> ImageQualityResult:
    with Image.open(path) as img:
        return assess_image_quality(img, settings)
