"""Unit tests for the Dynamic Model Registry, Scanner, Custom Registration, and Resolver."""

from __future__ import annotations

from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from services.orchestrator.app.services.model_registry import (  # noqa: E402
    CustomModelRegistration,
    ModelRegistry,
)


class TestModelRegistry:
    """Tests for model discovery, custom model registration, and resolution."""

    @pytest.fixture
    def registry(self) -> ModelRegistry:
        return ModelRegistry()

    def test_builtin_models_present(self, registry: ModelRegistry) -> None:
        models = registry.list_models()
        model_ids = {m.id for m in models}

        assert "gemini-2.5-pro" in model_ids
        assert "gemini-2.5-flash" in model_ids
        assert "gemini-1.5-pro" in model_ids

    def test_custom_model_registration(self, registry: ModelRegistry) -> None:
        custom = CustomModelRegistration(
            id="my-custom-finetuned-gemini",
            name="Fine-Tuned African Fintech Model",
            provider="vertex",
            endpoint_url="https://us-central1-aiplatform.googleapis.com/v1/projects/my-project/endpoints/123",
            context_window=256000,
            max_output_tokens=16384,
            description="Fine-tuned specifically for East African regulatory codebases",
        )
        desc = registry.register_custom_model(custom)

        assert desc.id == "my-custom-finetuned-gemini"
        assert desc.is_custom is True
        assert registry.get_model("my-custom-finetuned-gemini") is not None

    def test_dynamic_per_agent_resolution(self, registry: ModelRegistry) -> None:
        # Default for analyst
        assert registry.resolve_model_id(agent_name="analyst") == "gemini-3.6-flash"

        # Per-agent override in job state
        job_config = {
            "agent_models": {
                "analyst": "gemini-1.5-pro",
                "codegen": "gemini-2.5-pro",
                "reviewer": "gemini-2.5-flash",
            }
        }
        assert (
            registry.resolve_model_id(agent_name="analyst", state_config=job_config)
            == "gemini-1.5-pro"
        )
        assert (
            registry.resolve_model_id(agent_name="codegen", state_config=job_config)
            == "gemini-2.5-pro"
        )
        assert (
            registry.resolve_model_id(agent_name="reviewer", state_config=job_config)
            == "gemini-2.5-flash"
        )

    def test_custom_model_resolution(self, registry: ModelRegistry) -> None:
        registry.register_custom_model(
            CustomModelRegistration(
                id="gemini-3.7-flash-preview",
                name="Gemini 3.7 Flash Preview",
                provider="google",
            )
        )
        job_config = {"model": "gemini-3.7-flash-preview"}
        assert (
            registry.resolve_model_id(agent_name="architect", state_config=job_config)
            == "gemini-3.7-flash-preview"
        )

    def test_llm_factory_instantiation(self, registry: ModelRegistry) -> None:
        llm = registry.create_llm(agent_name="analyst", temperature=0.2)
        assert llm is not None
        assert llm.model == "gemini-3.6-flash"
        assert llm.temperature == 0.2
