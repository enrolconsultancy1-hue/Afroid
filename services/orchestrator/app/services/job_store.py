"""Orchestrator Service — In-Memory Job State Store.

Tracks OrchestrationState per job_id for real-time status queries,
WebSocket streaming, and artifact retrieval. In production, replace
with Redis or Cloud Firestore for multi-instance persistence.
"""
from __future__ import annotations

import asyncio
from typing import Any

import structlog

from services.orchestrator.app.schemas.state import OrchestrationState

logger = structlog.get_logger()


class JobStore:
    """Thread-safe in-memory store for active orchestration jobs."""

    def __init__(self) -> None:
        self._jobs: dict[str, OrchestrationState] = {}
        self._lock = asyncio.Lock()

    async def put(self, state: OrchestrationState) -> None:
        """Store or update a job state."""
        async with self._lock:
            self._jobs[state.job_id] = state

    async def get(self, job_id: str) -> OrchestrationState | None:
        """Retrieve job state by job_id."""
        async with self._lock:
            return self._jobs.get(job_id)

    async def get_by_session(self, session_id: str) -> OrchestrationState | None:
        """Retrieve job state by session_id."""
        async with self._lock:
            for state in self._jobs.values():
                if state.session_id == session_id:
                    return state
            return None

    async def list_jobs(self, user_id: str | None = None) -> list[dict[str, Any]]:
        """List job summaries, optionally filtered by user."""
        async with self._lock:
            results = []
            for state in self._jobs.values():
                if user_id and state.user_id != user_id:
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
        async with self._lock:
            self._jobs.pop(job_id, None)


# Global singleton
job_store = JobStore()
