"""JWT token creation and validation service (shared across Afroid services)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from jwt.exceptions import PyJWTError as JWTError

from services.shared.settings_util import get_shared_settings


class JWTService:
    """Handles JWT token creation and validation."""

    @staticmethod
    def create_access_token(
        user_id: uuid.UUID,
        email: str,
        role: str,
        extra_claims: dict[str, Any] | None = None,
    ) -> str:
        """Create a signed JWT access token."""
        settings = get_shared_settings()
        now = datetime.now(UTC)
        payload = {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "iat": now,
            "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
            "jti": str(uuid.uuid4()),
        }
        if extra_claims:
            payload.update(extra_claims)

        return jwt.encode(
            payload,
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )

    @staticmethod
    def create_refresh_token() -> str:
        """Create an opaque refresh token (random UUID-based)."""
        return str(uuid.uuid4()) + str(uuid.uuid4()).replace("-", "")

    @staticmethod
    def decode_access_token(token: str) -> dict[str, Any]:
        """Decode and validate a JWT access token.

        Raises:
            JWTError: If the token is invalid or expired.
        """
        try:
            settings = get_shared_settings()
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            return payload
        except JWTError:
            raise

    @staticmethod
    def get_token_expiry_seconds() -> int:
        """Return access token expiry in seconds."""
        return get_shared_settings().jwt_access_token_expire_minutes * 60
