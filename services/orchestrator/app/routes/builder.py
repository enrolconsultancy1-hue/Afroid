"""Orchestrator Service — Architect Intake & Parallel Builder API Routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request
from sqlalchemy.ext.asyncio import AsyncSession

from services.orchestrator.app.agents.parallel_builder import (
    ZeroQuestionIntakeEngine,
    parallel_builder_core,
)
from services.orchestrator.app.schemas.state import ArchitectureBlueprint, BusinessIdea

router = APIRouter(prefix="/builder", tags=["builder"])

intake_engine = ZeroQuestionIntakeEngine()


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.post("/intake", response_model=dict[str, Any])
async def zero_question_intake(
    body: dict[str, Any],
) -> dict[str, Any]:
    """Zero-Question Architect Intake Framework.

    Generates a high-level Architectural Blueprint Preview with NO QUESTIONS TO ASK.
    Supports either plain concept string or complete structured BusinessIdea object.
    """
    concept = body.get("concept") or body.get("prompt")
    idea_dict = body.get("idea")
    model_id = body.get("model_id", "gemini-3.6-flash")

    if idea_dict:
        idea = BusinessIdea(**idea_dict)
        blueprint = await intake_engine.generate_blueprint(
            concept_input=idea,
            model_id=model_id,
        )
    elif concept:
        blueprint = await intake_engine.generate_blueprint(
            concept_input=concept,
            model_id=model_id,
        )
    else:
        blueprint = intake_engine.offline_blueprint("Sovereign Enterprise App")

    return {
        "data": {
            "blueprint": blueprint.model_dump(),
            "status": "preview_ready",
            "message": "Architectural Blueprint generated with zero questions. Review, edit, or click Approve & Build.",
        }
    }


@router.post("/blueprint/validate", response_model=dict[str, Any])
async def validate_blueprint_json(
    body: dict[str, Any],
) -> dict[str, Any]:
    """Validate, heal, and compute completeness for edited Blueprint JSON."""
    blueprint_data = body.get("blueprint", {})
    try:
        blueprint = ArchitectureBlueprint(**blueprint_data)
        return {
            "data": {
                "valid": True,
                "blueprint": blueprint.model_dump(),
                "completeness": blueprint.completeness,
            }
        }
    except Exception as e:
        return {
            "data": {
                "valid": False,
                "error": str(e),
            }
        }


@router.post("/start", response_model=dict[str, Any])
async def start_parallel_build(
    body: dict[str, Any],
) -> dict[str, Any]:
    """Approve Blueprint and trigger the parallel sub-agent builder."""
    session_id = body.get("session_id", f"build-{int(body.get('timestamp', 0)) or 'sess'}")
    blueprint_data = body.get("blueprint", {})
    blueprint = ArchitectureBlueprint(**blueprint_data)
    autopilot = body.get("autopilot", True)

    session = await parallel_builder_core.execute_parallel_build(
        session_id=session_id,
        blueprint=blueprint,
        autopilot=autopilot,
    )

    return {
        "data": {
            "session_id": session.session_id,
            "project_name": session.project_name,
            "project_path": session.project_path,
            "autopilot": session.autopilot,
            "sub_agents": [sa.model_dump() for sa in session.sub_agents],
            "generated_files": [gf.model_dump() for gf in session.generated_files],
            "test_results": session.test_results,
            "status": "complete",
        }
    }


@router.post("/approve-file", response_model=dict[str, Any])
async def approve_file_diff(
    body: dict[str, Any],
) -> dict[str, Any]:
    """Approve, reject, or request edit on an individual generated file."""
    file_path = body.get("file_path", "")
    approved = body.get("approved", True)
    custom_edits = body.get("custom_edits")

    return {
        "data": {
            "file_path": file_path,
            "approved": approved,
            "custom_edits_applied": custom_edits is not None,
            "status": "accepted" if approved else "rejected",
        }
    }
