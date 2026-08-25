"""Auth Service configuration."""

from pydantic import model_validator

from services.shared.config import BaseAppSettings


class AuthSettings(BaseAppSettings):
    """Auth-specific settings."""

    # JWT
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30

    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3000/api/auth/callback/google"

    # Rate Limiting
    auth_rate_limit_per_minute: int = 10


    @model_validator(mode="after")
    def _enforce_jwt_secret(self) -> "AuthSettings":
        if self.is_production and (not self.jwt_secret_key or self.jwt_secret_key == "CHANGE_ME_IN_PRODUCTION"):
            raise ValueError("JWT_SECRET_KEY must be set to a secure random value in production.")
        if self.is_production and self.google_redirect_uri.startswith("http://localhost"):
            raise ValueError("GOOGLE_REDIRECT_URI must not point to localhost in production.")
        return self


settings = AuthSettings()
