"""Afroid Shared Library — Common utilities, models, and middleware."""

from services.shared.event_bus import EventBusClient, event_bus

__version__ = "1.0.0"
__all__ = ["EventBusClient", "event_bus"]
