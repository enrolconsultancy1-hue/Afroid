"""Orchestrator Service — Durable Job State Store.

Tracks OrchestrationState per job_id for real-time status queries and artifact
retrieval. Backed by Postgres (the shared durable KV store, namespace "job") so
that state written by one instance is readable by every instance — which is what
allows the orchestrator to run more than a single pinned instance.

The public API (put / get / get_by_session / list_jobs / remove) is unchanged, so
callers in routes/orchestrate.py need no modification. Serialization uses pydantic
model_dump(mode="json") / model_validate() for a lossless round-trip.
"""
from __future__ import annotations

from typing import Any

import structlog

from services.orchestrator.app.schemas.state import OrchestrationState
from services.orchestrator.app.services.durable_store import durable_store

logger = structlog.get_logger()

_JOB_NS = "job"


class JobStore:
    """Postgres-backed store for orchestration jobs (durable, cross-instance)."""

    async def put(self, state: OrchestrationState) -> None:
        """Store or update a job state."""
        phase = state.phase.value if hasattr(state.phase, "value") else str(state.phase)
        await durable_store.put(
            _JOB_NS,
            state.job_id,
            state.model_dump(mode="json"),
            status=phase,
            owner_id=state.user_id,
            session_id=state.session_id,
        )

    async def get(self, job_id: str) -> OrchestrationState | None:
        """Retrieve job state by job_id."""
        blob = await durable_store.get(_JOB_NS, job_id)
        return OrchestrationState.model_validate(blob) if blob is not None else None

    async def get_by_session(self, session_id: str) -> OrchestrationState | None:
        """Retrieve job state by session_id."""
        blob = await durable_store.get_by_session(_JOB_NS, session_id)
        return OrchestrationState.model_validate(blob) if blob is not None else None

    async def list_jobs(self, user_id: str | None = None) -> list[dict[str, Any]]:
        """List job summaries, optionally filtered by user."""
        blobs = await durable_store.list(_JOB_NS, owner_id=user_id)
        results: list[dict[str, Any]] = []
        for blob in blobs:
            try:
                state = OrchestrationState.model_validate(blob)
            except Exception as exc:  # noqa: BLE001 — skip a corrupt/old row, don't fail the list
                logger.warning("job_list_decode_skip", error=str(exc))
                continue
            results.append({
                "job_id": state.job_id,
                "session_id": state.session_id,
                "project_id": state.project_id,
                "phase": state.phase.value if hasattr(state.phase, "value") else str(state.phase),
                "current_agent": state.current_agent,
                "progress": state.progress,
                "file_count": len(state.generated_files),
                "error": state.error_message,
            })
        return results

    async def remove(self, job_id: str) -> None:
        """Remove a completed/failed job from the store."""
        await durable_store.delete(_JOB_NS, job_id)


# Global singleton
job_store = JobStore()
