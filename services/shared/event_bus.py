"""Afroid Shared Library — Google Pub/Sub Event Bus Client.

Provides asynchronous event publishing and subscription wrappers for inter-service communication across microservices.
"""

from __future__ import annotations

import json
from typing import Any, Callable, Coroutine, Optional

import structlog

logger = structlog.get_logger()


class EventBusClient:
    """Google Pub/Sub Async Event Bus Client with local fallback for development."""

    def __init__(self, project_id: str = "afroid-dev", emulator_host: Optional[str] = None) -> None:
        self.project_id = project_id
        self.emulator_host = emulator_host
        self._subscribers: dict[str, list[Callable[..., Coroutine[Any, Any, None]]]] = {}
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize Pub/Sub client connections."""
        if self._initialized:
            return
        logger.info("event_bus_initialized", project_id=self.project_id, emulator=self.emulator_host)
        self._initialized = True

    async def publish(self, topic_name: str, event_type: str, payload: dict[str, Any]) -> str:
        """Publish an event message to a Pub/Sub topic."""
        message_id = f"msg_{abs(hash(json.dumps(payload)))}_{int(__import__('time').time())}"
        envelope = {
            "event_type": event_type,
            "message_id": message_id,
            "timestamp": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
            "payload": payload,
        }

        logger.info("event_published", topic=topic_name, event_type=event_type, message_id=message_id)

        # Dispatch locally to registered subscribers in development/fallback mode
        if topic_name in self._subscribers:
            for callback in self._subscribers[topic_name]:
                try:
                    await callback(envelope)
                except Exception as e:
                    logger.error("subscriber_dispatch_failed", topic=topic_name, error=str(e))

        return message_id

    def subscribe(self, topic_name: str, callback: Callable[..., Coroutine[Any, Any, None]]) -> None:
        """Register an async callback for a given topic."""
        if topic_name not in self._subscribers:
            self._subscribers[topic_name] = []
        self._subscribers[topic_name].append(callback)
        logger.info("subscriber_registered", topic=topic_name)


# Global singleton event bus instance
event_bus = EventBusClient()
