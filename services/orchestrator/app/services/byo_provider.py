"""Bring-Your-Own-Provider: call any OpenAI-compatible chat endpoint.

Lets the IDE route Copilot requests to a user-supplied provider (Groq, OpenRouter,
Together, DeepSeek, Fireworks, local Ollama/LM Studio, …) using the user's own API
key. The key is supplied per request by the client and is never persisted or logged
server-side — this module only forwards it to the chosen endpoint over TLS.

All these providers expose the OpenAI Chat Completions contract, so one thin client
covers them all. Uses httpx (already a dependency); no new packages.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

logger = structlog.get_logger()


def _completions_url(base_url: str) -> str:
    """Normalize a provider base URL to its chat-completions endpoint."""
    b = (base_url or "").strip().rstrip("/")
    if b.endswith("/chat/completions"):
        return b
    return f"{b}/chat/completions"


async def openai_compatible_chat(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.2,
    max_tokens: int | None = None,
    timeout: float = 90.0,
) -> str:
    """POST an OpenAI-style chat completion and return the assistant text.

    Raises on transport/HTTP errors so the caller can surface a clean failure.
    """
    url = _completions_url(base_url)
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens:
        payload["max_tokens"] = max_tokens

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

    # Standard OpenAI shape: choices[0].message.content
    try:
        choice = (data.get("choices") or [{}])[0]
        content = (choice.get("message") or {}).get("content")
        if isinstance(content, list):  # some providers return content parts
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        return content or ""
    except Exception as exc:  # noqa: BLE001 — unexpected provider shape
        logger.warning("byo_provider_parse_failed", error=str(exc))
        return ""
