"""Notification Service Configuration."""

from services.shared.config import BaseAppSettings


class NotificationSettings(BaseAppSettings):
    """Notification microservice configuration."""

    sendgrid_api_key: str = ""
    default_from_email: str = "notifications@afroid.io"
    webhook_signing_secret: str = "dev-webhook-secret-key-afroid"
    africas_talking_api_key: str = ""
    africas_talking_username: str = "sandbox"


settings = NotificationSettings()
