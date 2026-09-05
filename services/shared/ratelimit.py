"""Shared rate-limiting helpers (slowapi)."""

from __future__ import annotations

from fastapi import Request


def get_client_ip(request: Request) -> str:
    """Resolve the real client IP from X-Forwarded-For.

    Cloud Run (and any reverse proxy in front of the service) *appends* the
    true client IP as the rightmost entry in X-Forwarded-For.  The leftmost
    entry is user-supplied and trivially spoofable — always use the rightmost
    trusted hop.  When no XFF header is present, fall back to the direct
    socket peer address.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # Rightmost entry is the one appended by the trusted proxy
        last = xff.rsplit(",", 1)[-1].strip()
        if last:
            return last
    return request.client.host if request.client else "127.0.0.1"
