"""Gateway Service — pytest fixtures."""

from __future__ import annotations

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from services.gateway.app.main import create_app


@pytest_asyncio.fixture
async def client():
    """Async test client for the gateway (no real upstreams)."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
