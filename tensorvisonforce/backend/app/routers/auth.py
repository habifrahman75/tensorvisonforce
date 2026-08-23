"""
Authentication endpoints backed by a `users` table in Supabase.

We manage password hashing and JWTs ourselves (rather than delegating to
Supabase Auth) so that a single access token carries the app-specific
claims (`role`, `department_id`) our `RequireRole` guards depend on
without an extra round trip to fetch profile data on every request.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.config import Settings, get_settings
from app.dependencies import get_current_active_user, get_supabase
from app.schemas.auth import (
    ChangePasswordRequest,
    RefreshRequest,
    Token,
    TokenPayload,
    UserLogin,
    UserPublic,
    UserRegister,
)
from app.utils.security import create_access_token, create_refresh_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens(*, user_row: dict, settings: Settings) -> Token:
    access = create_access_token(
        user_id=user_row["id"],
        email=user_row["email"],
        role=user_row["role"],
        department_id=user_row.get("department_id"),
        settings=settings,
    )
    refresh = create_refresh_token(
        user_id=user_row["id"],
        email=user_row["email"],
        role=user_row["role"],
        department_id=user_row.get("department_id"),
        settings=settings,
    )
    return Token(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegister,
    supabase: Client = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
):
    existing = supabase.table("users").select("id").eq("email", payload.email).execute()
    if existing.data:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    row = {
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "full_name": payload.full_name,
        "phone": payload.phone,
        "role": payload.role.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = supabase.table("users").insert(row).execute()
    created = result.data[0]
    return _issue_tokens(user_row=created, settings=settings)


@router.post("/login", response_model=Token)
def login(
    payload: UserLogin,
    supabase: Client = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
):
    result = supabase.table("users").select("*").eq("email", payload.email).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_row = result.data[0]
    if not verify_password(payload.password, user_row["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user_row.get("disabled"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    return _issue_tokens(user_row=user_row, settings=settings)


@router.post("/refresh", response_model=Token)
def refresh(
    payload: RefreshRequest,
    supabase: Client = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
):
    from jose import JWTError, jwt

    try:
        decoded = jwt.decode(
            payload.refresh_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not a refresh token")

    result = supabase.table("users").select("*").eq("id", decoded["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")

    return _issue_tokens(user_row=result.data[0], settings=settings)


@router.get("/me", response_model=UserPublic)
def get_me(
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("users").select("*").eq("id", current_user.sub).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return result.data[0]


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    current_user: TokenPayload = Depends(get_current_active_user),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("users").select("*").eq("id", current_user.sub).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_row = result.data[0]
    if not verify_password(payload.current_password, user_row["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    supabase.table("users").update(
        {"hashed_password": hash_password(payload.new_password)}
    ).eq("id", current_user.sub).execute()
