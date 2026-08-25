"""Auth service rate limiter (slowapi)."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded

from services.shared.ratelimit import get_client_ip

limiter = Limiter(key_func=get_client_ip)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a consistent 429 envelope for rate-limited requests."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please slow down and try again later."},
    )
