"""Platform Service configuration."""

from services.shared.config import BaseAppSettings


class PlatformSettings(BaseAppSettings):
    """Platform-specific settings."""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_starter: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_enterprise: str = ""


settings = PlatformSettings()
