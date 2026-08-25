"""Orchestrator Service — Dynamic Model Registry, Scanner & Resolver.

Supports:
- Real-time scanning & syncing of available Google Gemini models (Gemini 2.5 Pro, Flash, Gemini 3.x, etc.)
- Dynamic per-agent model routing (Analyst, Architect, CodeGen, Reviewer)
- Registration of custom / fine-tuned / self-hosted models
- Auto-fallback to the best available model
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger()


class ModelDescriptor(BaseModel):
    """Metadata for an available AI model in the platform."""

    id: str = Field(..., description="Unique model identifier, e.g. 'gemini-2.5-pro'")
    name: str = Field(..., description="Human-readable model name")
    provider: str = Field(default="google", description="'google', 'vertex', or 'custom'")
    context_window: int = Field(default=1048576, description="Token context window size")
    max_output_tokens: int = Field(default=65536, description="Max output generation tokens")
    supports_vision: bool = True
    supports_code_execution: bool = True
    supports_json_mode: bool = True
    is_custom: bool = False
    is_default: bool = False
    endpoint_url: str | None = None
    description: str = ""
    discovered_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CustomModelRegistration(BaseModel):
    """Payload to register a custom or fine-tuned model."""

    id: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=255)
    provider: str = Field(default="custom", description="'custom', 'vertex', 'openai-compatible'")
    endpoint_url: str | None = None
    api_key: str | None = None
    context_window: int = 128000
    max_output_tokens: int = 8192
    description: str = "Custom user-registered model endpoint"


class ModelRegistry:
    """Central registry and dynamic resolver for AI models."""

    def __init__(self) -> None:
        self._models: dict[str, ModelDescriptor] = {}
        self._default_model_id = "gemini-flash-latest"
        self._agent_defaults: dict[str, str] = {
            "analyst": "gemini-flash-latest",
            "architect": "gemini-flash-latest",
            "codegen": "gemini-flash-latest",
            "reviewer": "gemini-flash-latest",
            "deployer": "gemini-flash-latest",
        }
        self._initialize_builtins()

    def _initialize_builtins(self) -> None:
        """Seed known current & latest Gemini model families."""
        builtins = [
            ModelDescriptor(
                id="gemini-flash-latest",
                name="Gemini Flash (latest stable)",
                provider="google",
                context_window=1048576,
                max_output_tokens=65536,
                is_default=True,
                description="Google current-generation fast multimodal model (stable -latest alias).",
            ),
            ModelDescriptor(
                id="gemini-pro-latest",
                name="Gemini Pro (latest stable)",
                provider="google",
                context_window=2097152,
                max_output_tokens=65536,
                description="Google current-generation flagship reasoning & code model (stable -latest alias).",
            ),
            ModelDescriptor(
                id="gemini-2.5-pro",
                name="Gemini 2.5 Pro (legacy)",
                provider="google",
                context_window=2097152,
                max_output_tokens=65536,
                description="Legacy flagship model (deprecated).",
            ),
            ModelDescriptor(
                id="gemini-2.5-flash",
                name="Gemini 2.5 Flash (Ultra Fast & Efficient)",
                provider="google",
                context_window=1048576,
                max_output_tokens=65536,
                description="High-throughput, ultra low-latency multimodal model.",
            ),
            ModelDescriptor(
                id="gemini-2.0-flash",
                name="Gemini 2.0 Flash",
                provider="google",
                context_window=1048576,
                max_output_tokens=8192,
                description="Fast generative AI model optimized for high-volume tasks.",
            ),
            ModelDescriptor(
                id="gemini-1.5-pro",
                name="Gemini 1.5 Pro",
                provider="google",
                context_window=2097152,
                max_output_tokens=8192,
                description="Long-context production model for complex document and codebase analysis.",
            ),
            ModelDescriptor(
                id="gemini-1.5-flash",
                name="Gemini 1.5 Flash",
                provider="google",
                context_window=1048576,
                max_output_tokens=8192,
                description="Lightweight and fast production model.",
            ),
        ]
        for m in builtins:
            self._models[m.id] = m

    async def scan_and_sync_available_models(self, api_key: str | None = None) -> list[ModelDescriptor]:
        """Scan available Gemini models via Google GenAI SDK and sync the registry.

        Discovers new Gemini releases (e.g. Gemini 3.x, preview models) automatically.
        """
        key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        discovered_count = 0

        try:
            from google import genai

            client = genai.Client(api_key=key)

            for m in client.models.list():
                # Filter for models that support generateContent
                methods = getattr(m, "supported_generation_methods", None) or []
                if "generateContent" in methods:
                    clean_id = m.name.replace("models/", "")
                    if clean_id not in self._models:
                        new_descriptor = ModelDescriptor(
                            id=clean_id,
                            name=getattr(m, "display_name", None) or clean_id,
                            provider="google",
                            context_window=getattr(m, "input_token_limit", None) or 1048576,
                            max_output_tokens=getattr(m, "output_token_limit", None) or 65536,
                            description=getattr(m, "description", None) or f"Discovered Google Gemini model ({clean_id})",
                        )
                        self._models[clean_id] = new_descriptor
                        discovered_count += 1
                        logger.info("gemini_model_discovered", model_id=clean_id)
        except Exception as e:
            logger.warning("model_sync_partial_failure", error=str(e), msg="Using registered catalog.")

        logger.info("model_scan_completed", total_registered=len(self._models), new_discovered=discovered_count)
        return self.list_models()

    def register_custom_model(self, custom: CustomModelRegistration) -> ModelDescriptor:
        """Register a user-defined custom or fine-tuned model endpoint."""
        descriptor = ModelDescriptor(
            id=custom.id,
            name=custom.name,
            provider=custom.provider,
            context_window=custom.context_window,
            max_output_tokens=custom.max_output_tokens,
            is_custom=True,
            endpoint_url=custom.endpoint_url,
            description=custom.description,
        )
        self._models[custom.id] = descriptor
        logger.info("custom_model_registered", model_id=custom.id, provider=custom.provider)
        return descriptor

    def list_models(self) -> list[ModelDescriptor]:
        """Return all registered models."""
        return list(self._models.values())

    def get_model(self, model_id: str) -> ModelDescriptor | None:
        """Retrieve model metadata by ID."""
        return self._models.get(model_id)

    def set_default_model(self, model_id: str) -> None:
        """Update the system-wide default model."""
        if model_id not in self._models:
            raise ValueError(f"Model '{model_id}' is not in the registry.")
        for m in self._models.values():
            m.is_default = (m.id == model_id)
        self._default_model_id = model_id

    def set_agent_model(self, agent_name: str, model_id: str) -> None:
        """Assign a specific default model to a given agent."""
        if model_id not in self._models:
            raise ValueError(f"Model '{model_id}' is not in the registry.")
        self._agent_defaults[agent_name.lower()] = model_id

    def resolve_model_id(
        self,
        agent_name: str | None = None,
        state_config: dict[str, Any] | None = None,
    ) -> str:
        """Determine which model ID to use based on per-agent, per-job, or global config."""
        cfg = state_config or {}

        # 1. Per-agent override in job state (most specific)
        if agent_name:
            agent_key = agent_name.lower()
            agent_map = cfg.get("agent_models", {})
            if agent_key in agent_map:
                return agent_map[agent_key]

        # 2. General model override in job state
        if "model" in cfg and cfg["model"] in self._models:
            return cfg["model"]

        # 3. Agent default
        if agent_name:
            agent_key = agent_name.lower()
            if agent_key in self._agent_defaults:
                return self._agent_defaults[agent_key]

        # 4. System default
        return self._default_model_id

    def create_llm(
        self,
        agent_name: str | None = None,
        model_id: str | None = None,
        temperature: float = 0.1,
        max_output_tokens: int | None = None,
        state_config: dict[str, Any] | None = None,
    ) -> Any:
        """Instantiate a LangChain chat model with dynamic resolution."""
        target_model_id = model_id or self.resolve_model_id(agent_name=agent_name, state_config=state_config)
        descriptor = self._models.get(target_model_id)

        tokens = max_output_tokens or (descriptor.max_output_tokens if descriptor else 65536)

        # Handle custom / third-party endpoints if configured
        if descriptor and descriptor.is_custom and descriptor.endpoint_url:
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    model=descriptor.id,
                    base_url=descriptor.endpoint_url,
                    temperature=temperature,
                    max_tokens=tokens,
                )
            except ImportError:
                logger.warning("langchain_openai_not_found_fallback_gemini")

        # Standard Google Generative AI / Vertex AI instantiation
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=target_model_id,
                temperature=temperature,
                max_output_tokens=tokens,
            )
        except ImportError:
            # Fallback mock for testing or offline runner
            return type("MockLLM", (), {
                "model": target_model_id,
                "temperature": temperature,
                "ainvoke": lambda *args, **kwargs: type("Res", (), {"content": "{}"})(),
            })()


# Global singleton instance
model_registry = ModelRegistry()
