"""Lightweight JWT auth for the Intake service.

Decodes the shared access token with ``python-jose`` directly (no
``services.auth`` import) so the intake service stays self-contained. The
token's ``sub`` claim is the user UUID, matching the auth service contract.
"""

from __future__ import annotations

import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt.exceptions import PyJWTError as JWTError

from services.intake.app.config import settings
from services.shared.exceptions import UnauthorizedError

_bearer_scheme = HTTPBearer(auto_error=False)


def _decode_user_id(token: str) -> uuid.UUID | None:
    """Decode a JWT and return the subject user id, or None when invalid."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        return uuid.UUID(sub)
    except (ValueError, TypeError):
        return None


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> uuid.UUID | None:
    """Return the authenticated user id, or None when no/invalid token.

    Used for founder idea submission where authentication is optional.
    """
    if credentials is None:
        return None
    return _decode_user_id(credentials.credentials)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> uuid.UUID:
    """Require a valid token; raise :class:`UnauthorizedError` otherwise."""
    user_id = _decode_user_id(credentials.credentials) if credentials else None
    if user_id is None:
        raise UnauthorizedError(detail="Authentication required.")
    return user_id
