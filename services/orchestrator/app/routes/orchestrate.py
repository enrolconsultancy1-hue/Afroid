"""Orchestrator Service — API routes for code generation jobs."""
from __future__ import annotations

import asyncio
import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from services.orchestrator.app.agents.graph import build_orchestration_graph
from services.orchestrator.app.routes.ws import manager
from services.orchestrator.app.schemas.state import (
    AgentPhase,
    ConceptInput,
    OrchestrationState,
)
from services.orchestrator.app.services.job_store import job_store
from services.orchestrator.app.services.model_registry import (
    CustomModelRegistration,
    model_registry,
)
from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User

logger = structlog.get_logger()

router = APIRouter(prefix="/orchestrate", tags=["orchestration"])


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


# --- Background Pipeline Executor ---


async def _run_pipeline(state: OrchestrationState) -> None:
    """Execute the LangGraph pipeline in the background, streaming events via WebSocket."""
    session_id = state.session_id

    try:
        # Broadcast: pipeline starting
        await manager.broadcast_to_session(session_id, {
            "type": "phase_change",
            "payload": {
                "phase": "analyzing",
                "message": "Pipeline started. Analyzing your business concept...",
                "progress": {"current": 1, "total": 4},
            },
        })

        graph = build_orchestration_graph()

        if graph is None:
            state.phase = AgentPhase.ERROR
            state.error_message = "LangGraph not available. Install langgraph to enable the AI pipeline."
            await job_store.put(state)
            await manager.broadcast_to_session(session_id, {
                "type": "error",
                "payload": {"message": state.error_message},
            })
            return

        # Execute the full graph — it mutates state through each node
        # Each node (analyze → architect → codegen → review) updates state.phase
        result_state = await graph.ainvoke(state)

        # Merge result back (ainvoke returns the final state)
        if isinstance(result_state, dict):
            # LangGraph may return a dict; update our state from it
            for key, value in result_state.items():
                if hasattr(state, key):
                    setattr(state, key, value)
        elif isinstance(result_state, OrchestrationState):
            state = result_state

        await job_store.put(state)

        # Broadcast generated files as code_chunk events
        for gf in state.generated_files:
            await manager.broadcast_to_session(session_id, {
                "type": "code_chunk",
                "payload": {
                    "filePath": gf.path,
                    "language": gf.language,
                    "content": gf.content,
                    "sizeBytes": gf.size_bytes,
                },
            })
            # Small delay to let frontend render each file
            await asyncio.sleep(0.05)

        # Broadcast review results
        for rr in state.review_results:
            await manager.broadcast_to_session(session_id, {
                "type": "review_result",
                "payload": {
                    "filePath": rr.file_path,
                    "passed": rr.passed,
                    "qualityScore": rr.quality_score,
                    "issues": rr.issues,
                    "suggestions": rr.suggestions,
                },
            })

        # Broadcast: pipeline complete
        await manager.broadcast_to_session(session_id, {
            "type": "phase_change",
            "payload": {
                "phase": "complete",
                "message": f"Pipeline complete. Generated {len(state.generated_files)} files.",
                "progress": {"current": 4, "total": 4},
            },
        })

        await manager.broadcast_to_session(session_id, {
            "type": "generation_complete",
            "payload": {
                "job_id": state.job_id,
                "totalFiles": len(state.generated_files),
                "totalReviews": len(state.review_results),
                "status": "complete",
            },
        })

        logger.info(
            "pipeline_completed",
            job_id=state.job_id,
            files=len(state.generated_files),
            reviews=len(state.review_results),
        )

    except Exception as e:
        logger.error("pipeline_failed", job_id=state.job_id, error=str(e))
        state.phase = AgentPhase.ERROR
        state.error_message = str(e)
        await job_store.put(state)
        await manager.broadcast_to_session(session_id, {
            "type": "error",
            "payload": {
                "message": f"Pipeline error: {e}",
                "job_id": state.job_id,
            },
        })


# --- Model Management & Discovery Routes ---


@router.get("/models", response_model=dict[str, Any])
async def list_models(
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """List all available and registered AI models (Gemini Pro/Flash, custom models)."""
    models = model_registry.list_models()
    return {
        "data": {
            "models": [m.model_dump() for m in models],
            "total": len(models),
        }
    }


@router.post("/models/sync", response_model=dict[str, Any])
async def sync_gemini_models(
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Scan and sync the latest available Google Gemini models dynamically from the Gemini API."""
    synced_models = await model_registry.scan_and_sync_available_models()
    return {
        "data": {
            "message": "Gemini models synchronized successfully",
            "total_models": len(synced_models),
            "models": [m.model_dump() for m in synced_models],
        }
    }


@router.post("/models/custom", response_model=dict[str, Any], status_code=201)
async def register_custom_model(
    body: CustomModelRegistration,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Register a custom or fine-tuned model endpoint."""
    descriptor = model_registry.register_custom_model(body)
    return {
        "data": {
            "message": f"Custom model '{body.id}' registered successfully",
            "model": descriptor.model_dump(),
        }
    }


@router.post("/models/default", response_model=dict[str, Any])
async def set_default_model(
    body: dict[str, str],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Set the system or agent default model."""
    model_id = body.get("model_id")
    agent_name = body.get("agent_name")
    if not model_id:
        return {"error": "model_id is required"}
    if agent_name:
        model_registry.set_agent_model(agent_name, model_id)
        msg = f"Default model for agent '{agent_name}' set to '{model_id}'"
    else:
        model_registry.set_default_model(model_id)
        msg = f"Global default model set to '{model_id}'"
    return {"data": {"message": msg, "model_id": model_id}}


# --- Pipeline Execution Routes ---


@router.post("", status_code=202)
async def start_generation(
    request: Request,
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Start a new code generation job.

    This creates an OrchestrationState, stores it in the job store,
    and dispatches the LangGraph pipeline as a background task.
    Results are streamed to the client via WebSocket.
    """
    project_id = body.get("project_id", str(uuid.uuid4()))
    concept_data = body.get("concept", {})
    models_config = body.get("models_config", {})

    concept = ConceptInput(**concept_data)

    state = OrchestrationState(
        project_id=project_id,
        user_id=str(current_user.id),
        concept=concept,
        models_config=models_config,
    )

    # Store the job state
    await job_store.put(state)

    # Dispatch the pipeline as a background task
    asyncio.create_task(_run_pipeline(state))

    logger.info(
        "generation_dispatched",
        job_id=state.job_id,
        session_id=state.session_id,
        project_id=project_id,
    )

    return {
        "data": {
            "job_id": state.job_id,
            "session_id": state.session_id,
            "status": "running",
            "websocket_url": f"/ws/{state.session_id}",
        }
    }


@router.get("/jobs")
async def list_jobs(
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """List all generation jobs for the current user."""
    jobs = await job_store.list_jobs(user_id=str(current_user.id))
    return {"data": {"jobs": jobs, "total": len(jobs)}}


@router.get("/{job_id}/status")
async def get_job_status(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Get the real-time status of a generation job."""
    state = await job_store.get(job_id)
    if state is None:
        return {
            "data": {
                "job_id": job_id,
                "status": "not_found",
                "message": "Job not found. It may have expired or never existed.",
            }
        }

    phase_str = state.phase.value if hasattr(state.phase, "value") else str(state.phase)

    return {
        "data": {
            "job_id": state.job_id,
            "session_id": state.session_id,
            "status": phase_str,
            "current_agent": state.current_agent,
            "progress": {
                "current": state.progress,
                "total": 4,
                "phase": phase_str,
            },
            "file_count": len(state.generated_files),
            "review_count": len(state.review_results),
            "error": state.error_message,
            "completed_at": state.completed_at,
        }
    }


@router.post("/{job_id}/approve")
async def approve_architecture(
    request: Request,
    job_id: str,
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Approve or reject the generated architecture."""
    approved = body.get("approved", False)

    state = await job_store.get(job_id)
    if state:
        state.architecture_approved = approved
        await job_store.put(state)

    return {
        "data": {
            "job_id": job_id,
            "status": "running" if approved else "waiting_approval",
            "approved": approved,
        }
    }


@router.get("/{job_id}/artifacts")
async def get_artifacts(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Download generated code artifacts for a completed job."""
    state = await job_store.get(job_id)
    if state is None:
        return {
            "data": {
                "files": [],
                "total_files": 0,
                "total_lines": 0,
                "message": "Job not found.",
            }
        }

    files = []
    total_lines = 0
    for gf in state.generated_files:
        lines = gf.content.count("\n") + 1
        total_lines += lines
        files.append({
            "path": gf.path,
            "language": gf.language,
            "content": gf.content,
            "size_bytes": gf.size_bytes,
            "lines": lines,
        })

    return {
        "data": {
            "job_id": job_id,
            "files": files,
            "total_files": len(files),
            "total_lines": total_lines,
            "reviews": [r.model_dump() for r in state.review_results],
        }
    }
