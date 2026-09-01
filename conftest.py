"""Root conftest.py — monorepo-wide pytest configuration.

Provides automatic skipping of database-dependent tests when PostgreSQL is
not reachable locally. Tests that depend on the ``engine`` session fixture
(defined in per-service conftest.py files) will be skipped cleanly instead
of erroring with ConnectionRefusedError.
"""

from __future__ import annotations

import os
import socket

import pytest

# Ensure deterministic test secret key across all test modules
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-production")

# ---------------------------------------------------------------------------
# Detect whether the test Postgres instance is reachable
# ---------------------------------------------------------------------------

_TEST_DB_HOST = os.environ.get("TEST_DB_HOST", "localhost")
_TEST_DB_PORT = int(os.environ.get("TEST_DB_PORT", "5432"))


def _postgres_is_up() -> bool:
    """Return True if the test Postgres port is open and accepting connections."""
    try:
        with socket.create_connection((_TEST_DB_HOST, _TEST_DB_PORT), timeout=1):
            return True
    except OSError:
        return False


# Evaluate once at collection time
_DB_AVAILABLE: bool = _postgres_is_up()

# ---------------------------------------------------------------------------
# Skip marker for CI / local gating
# ---------------------------------------------------------------------------

_SKIP_REASON = (
    f"PostgreSQL not reachable at {_TEST_DB_HOST}:{_TEST_DB_PORT} — "
    "skipping DB-dependent test. Start Postgres or set TEST_DATABASE_URL."
)

# Marker that individual tests / classes can use explicitly
requires_db = pytest.mark.skipif(not _DB_AVAILABLE, reason=_SKIP_REASON)


# ---------------------------------------------------------------------------
# Auto-skip: hook into pytest collection to mark tests that use the
# ``engine`` or ``session`` fixtures so they are skipped without error
# ---------------------------------------------------------------------------


def pytest_collection_modifyitems(
    config: pytest.Config,  # noqa: ARG001
    items: list[pytest.Item],
) -> None:
    """Add skip marker to any test that directly or indirectly requests an
    ``engine`` or ``db_session`` fixture when the database is unavailable."""
    if _DB_AVAILABLE:
        return  # nothing to do

    skip_mark = pytest.mark.skip(reason=_SKIP_REASON)
    db_fixtures = {"engine", "session", "db_session", "async_session"}

    for item in items:
        # item.fixturenames includes transitively resolved fixtures
        if db_fixtures.intersection(getattr(item, "fixturenames", [])):
            item.add_marker(skip_mark, append=False)
