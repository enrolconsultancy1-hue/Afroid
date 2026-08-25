"""Unit tests for the auth service routes."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestRegister:
    """Tests for POST /v1/auth/register."""

    async def test_register_success(self, client: AsyncClient, sample_user_data: dict) -> None:
        """Successful registration returns 201 with user + tokens."""
        response = await client.post("/v1/auth/register", json=sample_user_data)
        assert response.status_code == 201

        data = response.json()
        assert "user" in data
        assert "tokens" in data
        assert data["user"]["email"] == sample_user_data["email"]
        assert data["user"]["full_name"] == sample_user_data["full_name"]
        assert data["user"]["role"] == "user"
        assert data["user"]["is_verified"] is False
        assert data["tokens"]["token_type"] == "Bearer"  # noqa: S105
        assert data["tokens"]["access_token"]
        assert data["tokens"]["refresh_token"]
        assert data["tokens"]["expires_in"] > 0

    async def test_register_duplicate_email(
        self, client: AsyncClient, sample_user_data: dict
    ) -> None:
        """Duplicate email returns 409 Conflict."""
        # Register first time
        await client.post("/v1/auth/register", json=sample_user_data)
        # Try again with same email
        response = await client.post("/v1/auth/register", json=sample_user_data)
        assert response.status_code == 409

    async def test_register_weak_password(self, client: AsyncClient) -> None:
        """Password without uppercase or digit returns 422."""
        response = await client.post(
            "/v1/auth/register",
            json={
                "email": "weak@example.com",
                "password": "nouppercase",
                "full_name": "Test User",
            },
        )
        assert response.status_code == 422

    async def test_register_short_password(self, client: AsyncClient) -> None:
        """Password shorter than 8 chars returns 422."""
        response = await client.post(
            "/v1/auth/register",
            json={
                "email": "short@example.com",
                "password": "Ab1",
                "full_name": "Test User",
            },
        )
        assert response.status_code == 422

    async def test_register_invalid_email(self, client: AsyncClient) -> None:
        """Invalid email format returns 422."""
        response = await client.post(
            "/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "SecurePass123",
                "full_name": "Test User",
            },
        )
        assert response.status_code == 422

    async def test_register_missing_fields(self, client: AsyncClient) -> None:
        """Missing required fields returns 422."""
        response = await client.post("/v1/auth/register", json={})
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    """Tests for POST /v1/auth/login."""

    async def test_login_success(self, client: AsyncClient, sample_user_data: dict) -> None:
        """Successful login returns 200 with user + tokens."""
        # Register first
        await client.post("/v1/auth/register", json=sample_user_data)

        # Login
        response = await client.post(
            "/v1/auth/login",
            json={
                "email": sample_user_data["email"],
                "password": sample_user_data["password"],
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["user"]["email"] == sample_user_data["email"]
        assert data["tokens"]["access_token"]

    async def test_login_wrong_password(self, client: AsyncClient, sample_user_data: dict) -> None:
        """Wrong password returns 401."""
        await client.post("/v1/auth/register", json=sample_user_data)

        response = await client.post(
            "/v1/auth/login",
            json={
                "email": sample_user_data["email"],
                "password": "WrongPassword123",
            },
        )
        assert response.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient) -> None:
        """Login with unknown email returns 401."""
        response = await client.post(
            "/v1/auth/login",
            json={
                "email": "nobody@example.com",
                "password": "SecurePass123",
            },
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestRefresh:
    """Tests for POST /v1/auth/refresh."""

    async def test_refresh_success(self, client: AsyncClient, sample_user_data: dict) -> None:
        """Valid refresh token returns new token pair."""
        reg = await client.post("/v1/auth/register", json=sample_user_data)
        refresh_token = reg.json()["tokens"]["refresh_token"]

        response = await client.post(
            "/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["access_token"]
        assert data["refresh_token"]
        # Token rotation: new refresh token should be different
        assert data["refresh_token"] != refresh_token

    async def test_refresh_invalid_token(self, client: AsyncClient) -> None:
        """Invalid refresh token returns 401."""
        response = await client.post(
            "/v1/auth/refresh",
            json={"refresh_token": "invalid-token-value"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetMe:
    """Tests for GET /v1/auth/me."""

    async def test_get_me_authenticated(self, client: AsyncClient, sample_user_data: dict) -> None:
        """Authenticated request returns user profile."""
        reg = await client.post("/v1/auth/register", json=sample_user_data)
        access_token = reg.json()["tokens"]["access_token"]

        response = await client.get(
            "/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["email"] == sample_user_data["email"]

    async def test_get_me_no_token(self, client: AsyncClient) -> None:
        """Request without token returns 401."""
        response = await client.get("/v1/auth/me")
        assert response.status_code == 401

    async def test_get_me_invalid_token(self, client: AsyncClient) -> None:
        """Request with invalid token returns 401."""
        response = await client.get(
            "/v1/auth/me",
            headers={"Authorization": "Bearer invalid.jwt.token"},
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestHealthCheck:
    """Tests for GET /health."""

    async def test_health_check(self, client: AsyncClient) -> None:
        """Health check returns 200 with service name."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "auth-service"
