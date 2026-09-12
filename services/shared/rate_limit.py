"""Lightweight in-process rate limiting middleware.

A per-instance sliding-window limiter keyed by client identity (the authenticated
user when a bearer token is present, else the client IP from X-Forwarded-For). It is
deliberately simple and dependency-free:

- Fail-open: any internal error in the limiter lets the request through. A limiter
  must never be the reason a legitimate request fails.
- Per-instance: under horizontal scaling each instance keeps its own window, so the
  effective global limit is (limit x instances). That is acceptable as an abuse
  brake; a precise global limit would use Redis, which can be layered in later.
- Generous defaults so normal interactive use (and live demos) are never throttled.

Wire it in an app with:  app.add_middleware(RateLimitMiddleware, limit=120, window=60)
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window request limiter (per client, per instance)."""

    def __init__(self, app, limit: int = 120, window: int = 60, exempt_paths: tuple[str, ...] = ("/health",)) -> None:
        super().__init__(app)
        self._limit = limit
        self._window = window
        self._exempt = exempt_paths
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _client_key(self, request: Request) -> str:
        # Prefer the authenticated subject (bearer token), else the forwarded client IP.
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer ") and len(auth) > 12:
            return "tok:" + auth[-24:]  # token tail — stable per user, not the secret
        xff = request.headers.get("x-forwarded-for", "")
        ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")
        return "ip:" + ip

    async def dispatch(self, request: Request, call_next):
        try:
            path = request.url.path
            if path in self._exempt or path.endswith("/_run"):
                return await call_next(request)
            key = self._client_key(request)
            now = time.monotonic()
            dq = self._hits[key]
            cutoff = now - self._window
            while dq and dq[0] < cutoff:
                dq.popleft()
            if len(dq) >= self._limit:
                retry = max(1, int(self._window - (now - dq[0])))
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Please slow down."},
                    headers={"Retry-After": str(retry)},
                )
            dq.append(now)
        except Exception:  # noqa: BLE001 — fail open: never block on limiter errors
            return await call_next(request)
        return await call_next(request)
