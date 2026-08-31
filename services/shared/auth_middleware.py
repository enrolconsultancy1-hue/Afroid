"""Shared auth middleware — FastAPI dependency for extracting/validating the current user.

Moved from services.auth so all services can require authentication without
cross-service imports.
"""

from __future__ import annotations

import uuid

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.shared.exceptions import UnauthorizedError
from services.shared.jwt_service import JWTService
from services.shared.user_models import User

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> User:
    """Extract and validate the authenticated user from the JWT token.

    FastAPI Dependency — inject into any route that requires authentication.

    Raises:
        UnauthorizedError: If no token, invalid token, or user not found.
    """
    if credentials is None:
        raise UnauthorizedError(detail="Missing authorization header.")

    token = credentials.credentials

    try:
        payload = JWTService.decode_access_token(token)
    except JWTError:
        raise UnauthorizedError(detail="Invalid or expired access token.") from None

    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise UnauthorizedError(detail="Invalid token payload.")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedError(detail="Invalid user ID in token.") from None

    # Retrieve user from DB (session injected via request.state)
    session: AsyncSession = request.state.db_session
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedError(detail="User not found.")
    if not user.is_active:
        raise UnauthorizedError(detail="Account has been deactivated.")

    return user
