"""Auth Service — pytest fixtures."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from services.auth.app.config import settings
from services.auth.app.main import create_app
from services.shared.database import Base

# Deterministic JWT secret for tests (CI has no .env / JWT_SECRET_KEY)
settings.jwt_secret_key = "test-secret-key-not-for-production"  # noqa: S105

# Use a test database URL (override in CI via env var)
TEST_DATABASE_URL = "postgresql+asyncpg://afroid:afroid_dev@localhost:5432/afroid_test"


@pytest_asyncio.fixture(scope="session")
async def engine():
    """Create a test database engine."""
    eng = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session per test with rollback."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as sess:
        yield sess
        await sess.rollback()


@pytest_asyncio.fixture
async def client(engine) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing the auth service."""
    app = create_app()
    app.state.engine = engine
    app.state.session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
def sample_user_data() -> dict[str, Any]:
    """Sample user registration data."""
    return {
        "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
        "password": "SecurePass123",
        "full_name": "Test User",
    }
