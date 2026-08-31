"""Shared JWT settings helpers.

Exposes a module-level shared settings instance (loaded from env / .env files)
with the fields every service needs for JWT validation, plus the access-token
expiry that the auth service previously owned.
"""

from __future__ import annotations

from services.shared.config import BaseAppSettings


class SharedSettings(BaseAppSettings):
    """Shared settings including JWT access-token expiry."""

    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30


_settings: SharedSettings | None = None


def get_shared_settings() -> SharedSettings:
    """Return a lazily-initialized shared settings instance."""
    global _settings
    if _settings is None:
        _settings = SharedSettings()
    return _settings
