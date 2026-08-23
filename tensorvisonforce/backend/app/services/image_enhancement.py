"""
Best-effort automatic enhancement applied to complaint photos before
they're stored, so downstream classification/quality checks and human
reviewers see a cleaner image. This never rejects an image -- rejection
is `image_quality`'s job. This module only tries to make a usable image
a bit more usable.
"""
from PIL import Image, ImageEnhance, ImageOps


def auto_orient(image: Image.Image) -> Image.Image:
    """Respects EXIF orientation tags (common issue with phone photos)."""
    return ImageOps.exif_transpose(image) or image


def normalize_contrast(image: Image.Image, factor: float = 1.15) -> Image.Image:
    enhancer = ImageEnhance.Contrast(image)
    return enhancer.enhance(factor)


def normalize_brightness(image: Image.Image, factor: float = 1.05) -> Image.Image:
    enhancer = ImageEnhance.Brightness(image)
    return enhancer.enhance(factor)


def sharpen(image: Image.Image, factor: float = 1.2) -> Image.Image:
    enhancer = ImageEnhance.Sharpness(image)
    return enhancer.enhance(factor)


def resize_max_dimension(image: Image.Image, max_dimension: int = 1920) -> Image.Image:
    """Caps upload size for storage/bandwidth without losing detail needed for review."""
    width, height = image.size
    if max(width, height) <= max_dimension:
        return image
    ratio = max_dimension / max(width, height)
    new_size = (int(width * ratio), int(height * ratio))
    return image.resize(new_size, Image.LANCZOS)


def enhance_complaint_image(image: Image.Image) -> Image.Image:
    """Full pipeline applied to every uploaded complaint photo."""
    img = auto_orient(image)
    img = resize_max_dimension(img)
    img = normalize_contrast(img)
    img = normalize_brightness(img)
    img = sharpen(img)
    return img


def enhance_and_save(input_path: str, output_path: str) -> None:
    with Image.open(input_path) as img:
        enhanced = enhance_complaint_image(img)
        enhanced.convert("RGB").save(output_path, quality=88, optimize=True)
