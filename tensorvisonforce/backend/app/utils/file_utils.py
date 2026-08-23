"""
Helpers for validating and naming uploaded files (complaint photos, proof
of resolution images).
"""
import os
import uuid

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class InvalidFileError(ValueError):
    pass


def validate_image_upload(
    *, filename: str, content_type: str, size_bytes: int, max_size_mb: int
) -> None:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise InvalidFileError(
            f"Unsupported file extension '{ext}'. Allowed: {sorted(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    if content_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise InvalidFileError(
            f"Unsupported content type '{content_type}'. Allowed: {sorted(ALLOWED_IMAGE_MIME_TYPES)}"
        )
    max_bytes = max_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise InvalidFileError(f"File exceeds max size of {max_size_mb}MB")


def build_storage_path(*, user_id: str, original_filename: str) -> str:
    """Generates a collision-free storage path/key for Supabase storage."""
    ext = os.path.splitext(original_filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return f"complaints/{user_id}/{unique_name}"
