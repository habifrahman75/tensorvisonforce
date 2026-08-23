"""
Password hashing and JWT token creation.

Decoding is handled in `app.dependencies` (that's where FastAPI needs it
as part of the request lifecycle); this module only *creates* tokens and
hashes/verifies passwords.
"""
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.config import Settings
from app.schemas.auth import UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(
    *,
    subject: str,
    email: str,
    role: UserRole,
    department_id: str | None,
    token_type: str,
    expires_delta: timedelta,
    settings: Settings,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "email": email,
        "role": role.value if isinstance(role, UserRole) else role,
        "department_id": department_id,
        "disabled": False,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(
    *, user_id: str, email: str, role: UserRole, department_id: str | None, settings: Settings
) -> str:
    return _create_token(
        subject=user_id,
        email=email,
        role=role,
        department_id=department_id,
        token_type="access",
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        settings=settings,
    )


def create_refresh_token(
    *, user_id: str, email: str, role: UserRole, department_id: str | None, settings: Settings
) -> str:
    return _create_token(
        subject=user_id,
        email=email,
        role=role,
        department_id=department_id,
        token_type="refresh",
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
        settings=settings,
    )
