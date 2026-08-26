"""Intake Service Configuration."""

from services.shared.config import BaseAppSettings


class IntakeSettings(BaseAppSettings):
    """Intake microservice configuration.

    No service-specific fields yet — inherits database, CORS, and JWT settings
    from :class:`BaseAppSettings`.
    """


settings = IntakeSettings()
