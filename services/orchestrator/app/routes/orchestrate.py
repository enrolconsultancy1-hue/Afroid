"""Orchestrator Service — API routes for code generation jobs."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from services.orchestrator.app.schemas.state import ConceptInput, OrchestrationState
from services.orchestrator.app.services.model_registry import (
    CustomModelRegistration,
    model_registry,
)
from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User

router = APIRouter(prefix="/orchestrate", tags=["orchestration"])


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


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


@router.post("", status_code=202)
async def start_generation(
    request: Request,
    body: dict[str, Any],
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Start a new code generation job."""
    project_id = body.get("project_id", str(uuid.uuid4()))
    concept_data = body.get("concept", {})
    concept = ConceptInput(**concept_data)

    state = OrchestrationState(
        project_id=project_id,
        user_id=str(current_user.id),
        concept=concept,
    )

    # In production, this would dispatch to a background worker via Pub/Sub
    # For now, return the job metadata immediately
    return {
        "data": {
            "job_id": state.job_id,
            "session_id": state.session_id,
            "status": "queued",
            "websocket_url": f"wss://api.afroid.io/ws/{state.session_id}",
        }
    }


@router.get("/{job_id}/status")
async def get_job_status(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Get the status of a generation job."""
    # In production, this would query job state from Redis/DB
    return {
        "data": {
            "job_id": job_id,
            "status": "queued",
            "current_agent": None,
            "progress": {"current": 0, "total": 4, "phase": "queued"},
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

    return {
        "data": {
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
    """Download generated code artifacts."""
    # In production, this would fetch from GCS/MongoDB
    return {
        "data": {
            "files": [],
            "total_files": 0,
            "total_lines": 0,
        }
    }
