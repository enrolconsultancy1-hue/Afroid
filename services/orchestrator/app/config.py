"""Orchestrator Service configuration."""

from services.shared.config import BaseAppSettings


class OrchestratorSettings(BaseAppSettings):
    vertex_ai_project: str = "afroid-dev"
    vertex_ai_location: str = "us-central1"
    gemini_model: str = "gemini-3.6-flash"
    max_generation_time_seconds: int = 600
    max_files_per_generation: int = 100


settings = OrchestratorSettings()
