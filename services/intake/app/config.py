"""Intake Service Configuration."""

from services.shared.config import BaseAppSettings


class IntakeSettings(BaseAppSettings):
    """Intake microservice configuration.

    Extends the shared base settings with the orchestrator URL used to
    auto-generate a zero-question draft blueprint when a builder claims an idea.
    """

    orchestrator_url: str = "http://127.0.0.1:8014"


settings = IntakeSettings()
