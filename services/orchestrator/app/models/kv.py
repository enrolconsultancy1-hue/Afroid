"""Orchestrator Service — Durable cross-instance state table.

A single namespaced key/value table (JSONB payload) that backs the build-session
and orchestration-job stores. Persisting job/build state to Postgres — instead of
a per-process in-memory dict — lets ANY orchestrator instance answer a status poll,
which is what allows the service to scale beyond a single pinned instance.

The table is created idempotently on startup via Base.metadata.create_all
(same convention as the intake/certify services).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from services.shared.database import Base


class OrchestratorKV(Base):
    """Namespaced durable state row.

    Composite primary key (namespace, key):
      - namespace "build" → key = build session_id, state = build-session dict
      - namespace "job"   → key = job_id,          state = OrchestrationState dump
    """

    __tablename__ = "orchestrator_kv"
    __table_args__ = (
        Index("ix_orchestrator_kv_ns_status", "namespace", "status"),
        Index("ix_orchestrator_kv_ns_owner", "namespace", "owner_id"),
        Index("ix_orchestrator_kv_ns_session", "namespace", "session_id"),
    )

    namespace: Mapped[str] = mapped_column(String(32), primary_key=True)
    key: Mapped[str] = mapped_column(String(128), primary_key=True)

    # Denormalized lookup columns (kept in sync with `state` on every write).
    status: Mapped[str] = mapped_column(String(48), nullable=False, default="")
    owner_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Full serialized payload (the build-session dict or the OrchestrationState dump).
    state: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:  # pragma: no cover - debug aid
        return f"<OrchestratorKV {self.namespace}/{self.key} status={self.status}>"
