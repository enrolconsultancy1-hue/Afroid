"""Platform Service configuration."""

from pydantic import model_validator

from services.shared.config import BaseAppSettings


class PlatformSettings(BaseAppSettings):
    """Platform-specific settings."""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_starter: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_enterprise: str = ""

    # Frontend
    frontend_url: str = "http://localhost:3000"


    @model_validator(mode="after")
    def _enforce_stripe_config(self) -> "PlatformSettings":
        if self.is_production and (not self.stripe_secret_key or not self.stripe_webhook_secret):
            raise ValueError("STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set in production.")
        return self


settings = PlatformSettings()
