"""Incubate Service Configuration."""

from services.shared.config import BaseAppSettings


class IncubateSettings(BaseAppSettings):
    """Incubate microservice configuration."""

    gemini_model: str = "gemini-flash-latest"
    min_match_score: float = 0.65
    embedding_dimension: int = 768
    max_opportunities_per_search: int = 50
    enable_ocr: bool = True


settings = IncubateSettings()
