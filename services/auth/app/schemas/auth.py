"""Auth Service — Pydantic request/response schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

# --- Request Schemas ---


class RegisterRequest(BaseModel):
    """User registration request."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Ensure password meets minimum strength requirements."""
        if not any(c.isupper() for c in v):
            msg = "Password must contain at least one uppercase letter"
            raise ValueError(msg)
        if not any(c.isdigit() for c in v):
            msg = "Password must contain at least one digit"
            raise ValueError(msg)
        return v

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, v: str) -> str:
        """Strip whitespace and basic sanitization."""
        return v.strip()


class LoginRequest(BaseModel):
    """User login request."""

    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Token refresh request."""

    refresh_token: str


class LogoutRequest(BaseModel):
    """Logout request — revoke refresh token."""

    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    """Password recovery request."""

    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """Password recovery response."""

    message: str
    dispatched: bool = True


# --- Response Schemas ---


class UserResponse(BaseModel):
    """Public user profile response."""

    id: uuid.UUID
    email: str
    full_name: str
    avatar_url: str | None = None
    role: str
    is_verified: bool
    created_at: datetime
    last_login_at: datetime | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT token pair response."""

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"  # noqa: S105
    expires_in: int  # seconds


class AuthResponse(BaseModel):
    """Full auth response — user + tokens."""

    user: UserResponse
    tokens: TokenResponse


class GoogleLoginRequest(BaseModel):
    """Google OAuth ID-token exchange request."""

    id_token: str = Field(..., min_length=10)
