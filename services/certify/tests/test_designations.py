"""Tests for designation persistence (store layer)."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from services.certify.app.models.designation import (
    Designation,  # noqa: F401 — registers on metadata
)
from services.certify.app.store import (
    designation_to_dict,
    get_designation_by_certificate_id,
    list_designations,
    upsert_designation,
)
from services.shared.database import Base

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://afroid:afroid_dev@localhost:5432/afroid_test"
)


@pytest_asyncio.fixture(scope="module")
async def engine():
    """Create a test database engine with the designations table."""
    eng = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture(autouse=True)
async def _clean_designations(engine) -> AsyncGenerator[None, None]:
    """Truncate designations before each test for isolation."""
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE designations CASCADE"))
    yield


@pytest_asyncio.fixture
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield an async session bound to the test engine."""
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with maker() as s:
        yield s


def _sample() -> dict:
    return {
        "certificate_id": "CERT-SAMPLE123",
        "submission_id": "idea-1",
        "project_name": "AgroPulse",
        "grade": "Distinction",
        "score": 75.0,
        "designation": "awarded",
        "rubric": [{"dimension": "solution", "label": "Solution", "weight": 15.0, "score": 8.0}],
        "compliance": {"status": "passed", "results": []},
        "originality": {"verdict": "original"},
        "issuer": "Afroid Sovereign Certification Authority",
        "validity_days": 365,
        "issued_at": "2026-08-27T00:00:00+00:00",
    }


class TestDesignationStore:
    async def test_upsert_creates(self, session: AsyncSession) -> None:
        record = await upsert_designation(session, _sample())
        assert record.id is not None
        assert record.grade == "Distinction"
        assert record.certificate_id == "CERT-SAMPLE123"

    async def test_upsert_is_idempotent_per_submission(self, session: AsyncSession) -> None:
        first = await upsert_designation(session, _sample())
        data = _sample()
        data["grade"] = "Great Distinction"
        data["score"] = 85.0
        second = await upsert_designation(session, data)
        assert second.id == first.id  # same row updated, not duplicated
        assert second.grade == "Great Distinction"
        rows = await list_designations(session, submission_id="idea-1")
        assert len(rows) == 1

    async def test_get_by_certificate_id(self, session: AsyncSession) -> None:
        await upsert_designation(session, _sample())
        found = await get_designation_by_certificate_id(session, "CERT-SAMPLE123")
        assert found is not None
        assert found.submission_id == "idea-1"

    async def test_missing_returns_none(self, session: AsyncSession) -> None:
        assert await get_designation_by_certificate_id(session, "CERT-NOPE") is None

    async def test_list_empty(self, session: AsyncSession) -> None:
        assert await list_designations(session) == []

    async def test_to_dict_roundtrip(self, session: AsyncSession) -> None:
        record = await upsert_designation(session, _sample())
        d = designation_to_dict(record)
        assert d["grade"] == "Distinction"
        assert d["score"] == 75.0
        assert d["issued_at"] is not None
        assert d["certificate_id"] == "CERT-SAMPLE123"
