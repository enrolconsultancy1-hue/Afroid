"""Auth Service configuration."""

from services.shared.config import BaseAppSettings


class AuthSettings(BaseAppSettings):
    """Auth-specific settings."""

    # JWT
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30

    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:3000/api/auth/callback/google"

    # Rate Limiting
    auth_rate_limit_per_minute: int = 10


settings = AuthSettings()
