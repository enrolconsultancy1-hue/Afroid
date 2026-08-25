"""Shared rate-limiting helpers (slowapi)."""

from __future__ import annotations

from fastapi import Request


def get_client_ip(request: Request) -> str:
    """Resolve the real client IP, honoring X-Forwarded-For.

    The API gateway (and Kong / Cloud Endpoints in production) prepend the
    original client IP to X-Forwarded-For. Return that first hop when present,
    otherwise fall back to the direct socket peer address.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "127.0.0.1"
