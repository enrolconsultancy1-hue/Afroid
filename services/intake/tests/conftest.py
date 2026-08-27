"""Intake Service — pytest fixtures."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from services.intake.app.config import settings
from services.intake.app.main import create_app
from services.shared.database import Base

# Deterministic JWT secret for tests (CI has no .env / JWT_SECRET_KEY)
settings.jwt_secret_key = "test-secret-key-not-for-production"  # noqa: S105

# Same test DB as the auth service (pre-created in CI and locally).
TEST_DATABASE_URL = "postgresql+asyncpg://afroid:afroid_dev@localhost:5432/afroid_test"


@pytest_asyncio.fixture(scope="session")
async def engine():
    """Create a test database engine with the intake tables."""
    eng = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest.fixture(autouse=True)
def _disable_blueprint_generation(monkeypatch) -> None:
    """Stub out the orchestrator call so claim tests stay fast and deterministic.

    The real blueprint generation path is covered separately in
    ``test_claim_auto_generates_draft_blueprint`` which re-patches this helper.
    """

    async def _noop(_idea: object) -> None:
        return None

    monkeypatch.setattr("services.intake.app.routes.ideas._generate_draft_blueprint", _noop)


@pytest_asyncio.fixture(autouse=True)
async def _clean_tables(engine) -> AsyncGenerator[None, None]:
    """Truncate intake tables before each test for isolation."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "TRUNCATE pitch_evaluations, idea_submissions, "
                "evaluator_profiles, writer_profiles CASCADE"
            )
        )
    yield


@pytest_asyncio.fixture
async def client(engine) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client wired to the intake app over ASGI."""
    app = create_app()
    app.state.engine = engine
    app.state.session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
