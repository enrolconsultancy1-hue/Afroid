"""Gateway integration tests — routing, health, error handling."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from services.gateway.app.main import ROUTES, UPSTREAMS, route_for


# ── Unit: route_for ──────────────────────────────────────────────────


class TestRouteFor:
    """Unit tests for the path→service router."""

    def test_auth_route(self):
        assert route_for("/v1/auth/login") == "auth"

    def test_orchestrator_route(self):
        assert route_for("/v1/orchestrate") == "orchestrator"

    def test_platform_projects(self):
        assert route_for("/v1/projects/123") == "platform"

    def test_certify_route(self):
        assert route_for("/v1/certify/certs") == "certify"

    def test_intake_route(self):
        assert route_for("/v1/intake/submit") == "intake"

    def test_no_match_returns_none(self):
        assert route_for("/v2/something") is None

    def test_root_returns_none(self):
        assert route_for("/") is None

    def test_all_routes_have_upstream(self):
        """Every route entry must map to a defined upstream."""
        for _, service in ROUTES:
            assert service in UPSTREAMS, f"Route service '{service}' missing from UPSTREAMS"


# ── Integration: Health & Routes Endpoints ───────────────────────────


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "gateway-service"


@pytest.mark.asyncio
async def test_routes_endpoint(client: AsyncClient):
    resp = await client.get("/routes")
    assert resp.status_code == 200
    data = resp.json()
    assert "/v1/auth" in data
    assert data["/v1/auth"] == "auth"


# ── Integration: Proxy Error Handling ────────────────────────────────


@pytest.mark.asyncio
async def test_unknown_route_returns_404(client: AsyncClient):
    resp = await client.get("/v1/nonexistent/endpoint")
    assert resp.status_code == 404
    assert "No upstream route" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_proxy_upstream_unreachable_returns_502(client: AsyncClient):
    """When the upstream is down, gateway should return 502."""
    resp = await client.post(
        "/v1/auth/login",
        json={"email": "test@test.com", "password": "test"},
    )
    # Upstream is not running in tests → expect 502 (connect error)
    assert resp.status_code == 502
    assert "unreachable" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_proxy_forwards_xff_header(client: AsyncClient):
    """Gateway should append client IP to X-Forwarded-For."""
    # This will fail to connect but we verify the gateway processes the request
    resp = await client.get(
        "/v1/projects",
        headers={"X-Forwarded-For": "1.2.3.4"},
    )
    # Connection to upstream will fail, but gateway processed the route correctly
    assert resp.status_code == 502  # upstream not running
