"""Base configuration for all Afroid services using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


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
    app_debug: bool = True
    app_secret_key: str = "CHANGE_ME_IN_PRODUCTION"

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

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.app_env == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.app_env == "development"
