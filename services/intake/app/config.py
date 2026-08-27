"""Intake Service Configuration."""

from services.shared.config import BaseAppSettings


class IntakeSettings(BaseAppSettings):
    """Intake microservice configuration.

    Extends the shared base settings with the orchestrator URL (draft blueprint
    generation on claim) and the certify URL (startup designation certificates).
    """

    orchestrator_url: str = "http://127.0.0.1:8014"
    certify_url: str = "http://127.0.0.1:8012"


settings = IntakeSettings()
