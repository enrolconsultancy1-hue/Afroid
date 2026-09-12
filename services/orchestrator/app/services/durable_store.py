"""Orchestrator Service — Durable, cross-instance JSONB state store.

Backs both the build-session store and the orchestration job store with Postgres
(the same Cloud SQL instance already wired into the service) so that state written
by the instance that started a build/job is visible to EVERY instance answering a
status poll. This removes the single-instance pin (minScale=maxScale=1) that the
old in-process dict required.

Design notes:
- Each operation opens and commits its OWN AsyncSession from the app's session
  factory. That is deliberate: build/job progress is persisted from fire-and-forget
  background tasks (asyncio.create_task) which have no request-scoped session.
- The store is a process-global singleton, bound to the session factory once during
  the FastAPI lifespan (`durable_store.bind(app.state.session_factory)`).
- Writes are full-document upserts (PostgreSQL INSERT ... ON CONFLICT DO UPDATE),
  keeping the code simple and races-free for the single writer that owns a given key.
"""

from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from services.orchestrator.app.models.kv import OrchestratorKV

logger = structlog.get_logger()


class DurableKVStore:
    """Postgres-backed namespaced key/value store for durable job & build state."""

    def __init__(self) -> None:
        self._session_factory: async_sessionmaker[AsyncSession] | None = None

    def bind(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        """Attach the app session factory (called once at startup)."""
        self._session_factory = session_factory

    @property
    def is_bound(self) -> bool:
        return self._session_factory is not None

    def _factory(self) -> async_sessionmaker[AsyncSession]:
        if self._session_factory is None:
            raise RuntimeError(
                "DurableKVStore is not bound to a session factory. "
                "Call durable_store.bind(app.state.session_factory) during startup."
            )
        return self._session_factory

    async def put(
        self,
        namespace: str,
        key: str,
        state: dict[str, Any],
        *,
        status: str = "",
        owner_id: str | None = None,
        session_id: str | None = None,
    ) -> None:
        """Upsert the full state document for (namespace, key)."""
        stmt = (
            pg_insert(OrchestratorKV)
            .values(
                namespace=namespace,
                key=key,
                status=status,
                owner_id=owner_id,
                session_id=session_id,
                state=state,
            )
            .on_conflict_do_update(
                index_elements=[OrchestratorKV.namespace, OrchestratorKV.key],
                set_={
                    "status": status,
                    "owner_id": owner_id,
                    "session_id": session_id,
                    "state": state,
                    "updated_at": func.now(),
                },
            )
        )
        async with self._factory()() as session:
            await session.execute(stmt)
            await session.commit()

    async def get(self, namespace: str, key: str) -> dict[str, Any] | None:
        """Return the state document for (namespace, key), or None."""
        async with self._factory()() as session:
            row = await session.get(OrchestratorKV, (namespace, key))
            return dict(row.state) if row is not None else None

    async def get_by_session(self, namespace: str, session_id: str) -> dict[str, Any] | None:
        """Return the first state document in a namespace matching session_id."""
        stmt = (
            select(OrchestratorKV)
            .where(OrchestratorKV.namespace == namespace)
            .where(OrchestratorKV.session_id == session_id)
            .limit(1)
        )
        async with self._factory()() as session:
            row = (await session.execute(stmt)).scalar_one_or_none()
            return dict(row.state) if row is not None else None

    async def list(
        self, namespace: str, *, owner_id: str | None = None, limit: int = 200
    ) -> list[dict[str, Any]]:
        """List state documents in a namespace, optionally filtered by owner."""
        stmt = select(OrchestratorKV).where(OrchestratorKV.namespace == namespace)
        if owner_id is not None:
            stmt = stmt.where(OrchestratorKV.owner_id == owner_id)
        stmt = stmt.order_by(OrchestratorKV.updated_at.desc()).limit(limit)
        async with self._factory()() as session:
            rows = (await session.execute(stmt)).scalars().all()
            return [dict(r.state) for r in rows]

    async def delete(self, namespace: str, key: str) -> None:
        """Delete the row for (namespace, key)."""
        stmt = (
            sa_delete(OrchestratorKV)
            .where(OrchestratorKV.namespace == namespace)
            .where(OrchestratorKV.key == key)
        )
        async with self._factory()() as session:
            await session.execute(stmt)
            await session.commit()


# Process-global singleton, bound to the session factory during app startup.
durable_store = DurableKVStore()
