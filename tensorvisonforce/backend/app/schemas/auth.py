from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    CITIZEN = "citizen"
    WORKER = "worker"
    ADMIN = "admin"


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole = UserRole.CITIZEN


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    phone: str | None = None
    role: UserRole
    department_id: UUID | None = None
    created_at: datetime


class TokenPayload(BaseModel):
    """Decoded JWT claims."""

    sub: str  # user id
    email: EmailStr
    role: UserRole
    department_id: str | None = None
    disabled: bool = False
    exp: int | None = None
    type: str = "access"  # "access" | "refresh"


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
