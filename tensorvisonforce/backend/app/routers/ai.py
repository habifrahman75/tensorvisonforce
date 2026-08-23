"""
Stand-alone AI endpoints. These let the client preview classification,
priority, and duplicate/quality signals *before* final submission (e.g.
show "this looks like a duplicate of #CMP-..." while the citizen is still
typing), and handle image upload + analysis as a separate step from
`POST /complaints` so large file uploads don't block the complaint
creation transaction.
"""
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from PIL import Image
from supabase import Client

from app.config import Settings, get_settings
from app.dependencies import get_current_active_user, get_supabase
from app.schemas.ai import (
    ClassificationRequest,
    ClassificationResult,
    DuplicateCheckRequest,
    DuplicateCheckResult,
    ImageQualityResult,
    PriorityRequest,
    PriorityResult,
)
from app.schemas.auth import TokenPayload
from app.services import classification, duplicate_detection, image_enhancement, image_quality
from app.services import priority as priority_service
from app.services.duplicate_detection import ExistingComplaint
from app.utils.file_utils import InvalidFileError, build_storage_path, validate_image_upload
from app.utils.image_hash import compute_dhash

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/classify", response_model=ClassificationResult)
def classify(
    payload: ClassificationRequest,
    settings: Settings = Depends(get_settings),
):
    try:
        return classification.classify_text(payload.text, settings)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/priority", response_model=PriorityResult)
def score_priority(payload: PriorityRequest):
    return priority_service.compute_priority(payload)


@router.post("/duplicate-check", response_model=DuplicateCheckResult)
def duplicate_check(
    payload: DuplicateCheckRequest,
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
):
    nearby = (
        supabase.table("complaints")
        .select("id, description, latitude, longitude, image_phash")
        .execute()
    )
    existing = [
        ExistingComplaint(
            id=row["id"],
            description=row["description"],
            location=payload.location.__class__(latitude=row["latitude"], longitude=row["longitude"]),
            image_phash=row.get("image_phash"),
        )
        for row in (nearby.data or [])
    ]
    return duplicate_detection.find_duplicates(
        new_description=payload.description,
        new_location=payload.location,
        new_phash=payload.image_phash,
        existing_complaints=existing,
        settings=settings,
    )


@router.post("/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
):
    """
    Uploads a complaint photo, runs quality assessment + perceptual
    hashing, enhances it, and stores it in Supabase Storage. Returns an
    `image_id` to reference from `POST /complaints`.
    """
    raw_bytes = await file.read()
    try:
        validate_image_upload(
            filename=file.filename or "upload.jpg",
            content_type=file.content_type or "",
            size_bytes=len(raw_bytes),
            max_size_mb=settings.max_upload_size_mb,
        )
    except InvalidFileError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        image = Image.open(io.BytesIO(raw_bytes))
        image.load()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File is not a valid image"
        ) from exc

    quality: ImageQualityResult = image_quality.assess_image_quality(image, settings)
    phash = compute_dhash(image)
    enhanced = image_enhancement.enhance_complaint_image(image)

    buffer = io.BytesIO()
    enhanced.convert("RGB").save(buffer, format="JPEG", quality=88, optimize=True)
    buffer.seek(0)

    storage_path = build_storage_path(user_id=current_user.sub, original_filename=file.filename or "upload.jpg")
    supabase.storage.from_(settings.supabase_storage_bucket).upload(
        storage_path, buffer.read(), {"content-type": "image/jpeg"}
    )
    public_url = supabase.storage.from_(settings.supabase_storage_bucket).get_public_url(storage_path)

    image_id = str(uuid.uuid4())
    supabase.table("complaint_images").insert(
        {
            "id": image_id,
            "url": public_url,
            "storage_path": storage_path,
            "uploaded_by": current_user.sub,
            "is_blurry": quality.is_blurry,
            "quality_score": quality.quality_score,
            "phash": phash,
            "complaint_id": None,  # linked when the complaint is created
        }
    ).execute()

    return {
        "image_id": image_id,
        "url": public_url,
        "quality": quality,
        "phash": phash,
    }
