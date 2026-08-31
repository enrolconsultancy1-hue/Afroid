"""Re-export of shared get_current_user (moved to services.shared)."""

from services.shared.auth_middleware import get_current_user

__all__ = ["get_current_user"]
