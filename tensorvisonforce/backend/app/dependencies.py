"""
Shared FastAPI dependencies:
  - Supabase client (singleton, cached)
  - JWT decoding -> current user
  - Role-based access guards (citizen / worker / admin)
"""
from functools import lru_cache
from typing import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from supabase import Client, create_client

from app.config import Settings, get_settings
from app.schemas.auth import TokenPayload, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


# --------------------------------------------------------------------------
# Supabase client
# --------------------------------------------------------------------------
@lru_cache
def get_supabase() -> Client:
    """
    Cached Supabase client using the service-role key.

    Using the service role here is intentional: row-level auth is enforced
    in this API layer via `get_current_user` / `require_role`, not by
    per-request Supabase auth tokens. Keep this key server-side only.
    """
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the Supabase client."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


# --------------------------------------------------------------------------
# JWT / current user
# --------------------------------------------------------------------------
def _decode_token(token: str, settings: Settings) -> TokenPayload:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    try:
        return TokenPayload(**payload)
    except Exception as exc:  # pydantic validation error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> TokenPayload:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode_token(credentials.credentials, settings)


async def get_current_active_user(
    user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    if user.disabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled")
    return user


# --------------------------------------------------------------------------
# Role guards
# --------------------------------------------------------------------------
class RequireRole:
    """
    Dependency factory for role-gated routes.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(RequireRole(UserRole.ADMIN))])
    or:
        user: TokenPayload = Depends(RequireRole(UserRole.ADMIN, UserRole.WORKER))
    """

    def __init__(self, *allowed_roles: UserRole):
        self.allowed_roles: Iterable[UserRole] = allowed_roles

    def __call__(
        self, user: TokenPayload = Depends(get_current_active_user)
    ) -> TokenPayload:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {[r.value for r in self.allowed_roles]}",
            )
        return user


require_citizen = RequireRole(UserRole.CITIZEN)
require_worker  = RequireRole(UserRole.WORKER, UserRole.FIELD_WORKER, UserRole.ADMIN)
require_admin   = RequireRole(UserRole.ADMIN)
