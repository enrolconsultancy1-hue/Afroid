"""Base configuration for all Afroid services using Pydantic Settings."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load repo-root .env (gitignored) into os.environ so secrets like GOOGLE_API_KEY
# are available to every service without being committed to the repo.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

_DEV_JWT_SECRET = "dev-secret-key-change-in-production-afroid-jwt-token-signing"


class BaseAppSettings(BaseSettings):
    """Base settings shared by all services. Override in service-specific configs."""

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_env: str = "development"
    app_debug: bool = False
    app_secret_key: str = ""

    # --- Auth (JWT) ---
    jwt_secret_key: str = _DEV_JWT_SECRET
    jwt_algorithm: str = "HS256"

    # --- Observability ---
    sentry_dsn: str = ""

    # --- CORS ---
    cors_origins: str = "http://localhost:3000,https://app.afroid.io"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://afroid:afroid_dev@localhost:5432/afroid"
    database_pool_size: int = 20
    database_max_overflow: int = 10

    # --- MongoDB ---
    mongodb_url: str = "mongodb://afroid:afroid_dev@localhost:27017/afroid?authSource=admin"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- GCP ---
    gcp_project_id: str = "afroid-dev"
    gcp_region: str = "us-central1"

    @model_validator(mode="after")
    def _enforce_production_secrets(self) -> BaseAppSettings:
        """Block startup if production still has the dev JWT secret."""
        if self.is_production and self.jwt_secret_key == _DEV_JWT_SECRET:
            raise ValueError(
                "FATAL: JWT_SECRET_KEY must be set to a secure random value "
                "in production. The default dev key is not allowed."
            )
        return self

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.app_env == "development"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse the comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
