"""Notification Service Configuration."""

from pydantic import model_validator

from services.shared.config import BaseAppSettings


class NotificationSettings(BaseAppSettings):
    """Notification microservice configuration."""

    sendgrid_api_key: str = ""
    default_from_email: str = "notifications@afroid.io"
    webhook_signing_secret: str = ""
    africas_talking_api_key: str = ""
    africas_talking_username: str = "sandbox"

    @model_validator(mode="after")
    def _enforce_webhook_secret(self) -> "NotificationSettings":
        if self.is_production and not self.webhook_signing_secret:
            raise ValueError(
                "WEBHOOK_SIGNING_SECRET must be set to a secure random value in production."
            )
        return self


settings = NotificationSettings()
