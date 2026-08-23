"""
Centralised application settings.

All values are loaded from environment variables / a `.env` file via
pydantic-settings.  Import `get_settings()` (cached singleton) everywhere
rather than instantiating `Settings()` directly.
"""
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_name: str = "CivicPulse Backend"
    env:      str = "development"
    debug:    bool = True
    api_v1_prefix: str = "/api/v1"

    # --- Security / JWT ---
    jwt_secret_key:              str = "insecure-dev-secret-change-me"
    jwt_algorithm:               str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days:   int = 7

    # --- Supabase ---
    supabase_url:              str = ""
    supabase_anon_key:         str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket:   str = "complaint-images"

    # --- CORS ---
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )

    # --- AI / Classification ---
    classification_model_path:         str   = "ai/data/complaint_training.csv"
    classification_confidence_threshold: float = 0.35

    # --- Image processing ---
    max_upload_size_mb:    int   = 10
    min_image_resolution:  int   = 480
    blur_threshold:        float = 100.0

    # --- Duplicate detection ---
    duplicate_hash_distance_threshold: int = 8
    duplicate_location_radius_meters:  int = 500   # 500 m search radius
    duplicate_time_window_hours:       int = 72

    # --- SLA hours by priority (HIGH / MEDIUM / LOW) ---
    sla_hours_high:   int = 24
    sla_hours_medium: int = 48
    sla_hours_low:    int = 72


@lru_cache
def get_settings() -> Settings:
    return Settings()
