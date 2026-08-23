from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    CITIZEN      = "citizen"
    FIELD_WORKER = "field_worker"   # matches DB enum FIELD_WORKER (mapped on insert)
    WORKER       = "worker"         # alias for FIELD_WORKER — used in JWT claims for brevity
    ADMIN        = "admin"

    @classmethod
    def _missing_(cls, value: object):
        # Allow "worker" and "FIELD_WORKER" to coexist
        if isinstance(value, str):
            v = value.upper()
            if v == "FIELD_WORKER":
                return cls.FIELD_WORKER
            if v == "WORKER":
                return cls.WORKER
        return None

    def to_db_role(self) -> str:
        """Convert to the Postgres user_role enum value."""
        mapping = {
            "citizen":      "CITIZEN",
            "field_worker": "FIELD_WORKER",
            "worker":       "FIELD_WORKER",
            "admin":        "ADMIN",
        }
        return mapping[self.value]


class UserRegister(BaseModel):
    email:     EmailStr
    password:  str      = Field(min_length=8, max_length=128)
    full_name: str      = Field(min_length=1, max_length=120)
    phone:     str | None = Field(default=None, max_length=20)
    role:      UserRole = UserRole.CITIZEN


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class UserPublic(BaseModel):
    id:            UUID
    email:         EmailStr
    full_name:     str
    phone:         str | None = None
    role:          UserRole
    department_id: UUID | None = None
    created_at:    datetime


class TokenPayload(BaseModel):
    """Decoded JWT claims."""
    sub:           str       # user id
    email:         EmailStr
    role:          UserRole
    department_id: str | None = None
    disabled:      bool       = False
    exp:           int | None = None
    type:          str        = "access"  # "access" | "refresh"


class Token(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    expires_in:    int


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str = Field(min_length=8, max_length=128)
