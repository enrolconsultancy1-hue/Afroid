"""Intake Service — idea submission queue routes."""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.intake.app.auth import get_current_user, get_optional_user
from services.intake.app.config import settings
from services.shared.event_bus import event_bus
from services.intake.app.models.intake import (
    IDEA_STATUS_BLUEPRINT_READY,
    IDEA_STATUS_CLAIMED,
    IDEA_STATUS_COMPLETED,
    IDEA_STATUS_EVALUATING,
    IDEA_STATUS_PENDING,
    IDEA_STATUS_REJECTED,
    IDEA_STATUS_SYNCED,
    IdeaSubmission,
    PitchEvaluation,
    WriterProfile,
)
from services.intake.app.schemas.intake import IdeaResponse, IdeaStatusUpdate, IdeaSubmitRequest
from services.intake.app.scoring import rubric_breakdown
from services.shared.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    ServiceUnavailableError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ideas", tags=["ideas"])

_ALLOWED_STATUSES = {
    IDEA_STATUS_PENDING,
    IDEA_STATUS_CLAIMED,
    IDEA_STATUS_EVALUATING,
    IDEA_STATUS_BLUEPRINT_READY,
    IDEA_STATUS_SYNCED,
    IDEA_STATUS_COMPLETED,
    IDEA_STATUS_REJECTED,
}


def _session(request: Request) -> AsyncSession:
    return request.state.db_session


async def _require_builder(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Require the user to be a registered builder (writer profile exists)."""
    result = await session.execute(select(WriterProfile).where(WriterProfile.user_id == user_id))
    if result.scalar_one_or_none() is None:
        raise ForbiddenError(detail="Only registered builders can access the evaluation queue.")


async def _generate_draft_blueprint(idea: IdeaSubmission) -> dict | None:
    """Best-effort zero-question blueprint generation via the orchestrator.

    Fails silently (returns None) if the orchestrator is unreachable or errors,
    so claiming an idea never blocks on an external dependency.
    """
    idea_dict = {
        "projectName": idea.project_name,
        "oneLiner": idea.one_liner,
        "problem": idea.problem,
        "targetUsers": idea.target_users,
        "coreFeatures": idea.core_features,
        "userJourneys": idea.user_journeys,
        "functionalRequirements": idea.functional_requirements,
        "dataEntities": idea.data_entities,
        "additionalContext": idea.extended or {},
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=5.0)) as client:
            response = await client.post(
                f"{settings.orchestrator_url}/v1/builder/intake",
                json={"idea": idea_dict},
            )
            response.raise_for_status()
            return response.json().get("data", {}).get("blueprint")
    except (httpx.HTTPError, httpx.TimeoutException, OSError) as error:
        logger.warning("draft_blueprint_generation_failed: %s", error)
        return None


async def _request_certification(payload: dict[str, Any], token: str) -> dict[str, Any] | None:
    """Call the certify service's designation endpoint (best-effort)."""
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=2.0)) as client:
            response = await client.post(
                f"{settings.certify_url}/v1/certify/designate",
                json=payload,
                headers={"Authorization": f"Bearer {token}"} if token else {},
            )
            if response.status_code >= 400:
                logger.warning("certify_error: %s %s", response.status_code, response.text[:300])
                return None
            return response.json().get("data")
    except (httpx.HTTPError, httpx.TimeoutException, OSError) as error:
        logger.warning("certify_request_failed: %s", error)
        return None


@router.post("", response_model=IdeaResponse, status_code=201)
async def submit_idea(
    request: Request,
    body: IdeaSubmitRequest,
    user_id: uuid.UUID | None = Depends(get_optional_user),
) -> IdeaResponse:
    """Submit a new startup idea (auth optional — founders may submit anonymously)."""
    session = _session(request)
    phase_a = body.extended or {}
    extended = dict(phase_a)
    extended["success_criteria"] = body.success_criteria
    extended["mvp_definition"] = body.mvp_definition
    for key in (
        "feature_acceptance_criteria",
        "business_rules",
        "quality_performance_requirements",
        "existing_system",
        "protected_requirements",
        "known_assumptions",
        "out_of_scope",
    ):
        value = getattr(body, key)
        if value:
            extended[key] = value
    idea = IdeaSubmission(
        project_name=body.project_name,
        one_liner=body.product_summary,
        problem=body.business_problem,
        target_users=body.target_users,
        core_features=body.core_features,
        user_journeys=body.user_journeys,
        functional_requirements=body.functional_requirements,
        data_entities=body.data_entities,
        free_text=body.free_text,
        founder_name=body.founder_name,
        founder_email=body.founder_email,
        submitted_by=user_id,
        status=IDEA_STATUS_PENDING,
        extended=extended or None,
    )
    session.add(idea)
    await session.flush()
    await session.refresh(idea)

    # Notify builder queue: new idea submitted
    await event_bus.publish(
        topic_name="intake.ideas",
        event_type="idea.submitted",
        payload={
            "idea_id": str(idea.id),
            "project_name": idea.project_name,
            "founder_name": idea.founder_name,
            "founder_email": idea.founder_email,
            "status": idea.status,
        },
    )

    return IdeaResponse.model_validate(idea)


@router.get("", response_model=list[IdeaResponse])
async def list_ideas(
    request: Request,
    status: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user_id: uuid.UUID | None = Depends(get_optional_user),
) -> list[IdeaResponse]:
    """List submissions in FIFO order (oldest first by timestamp)."""
    session = _session(request)
    query = select(IdeaSubmission).order_by(
        IdeaSubmission.created_at.asc(), IdeaSubmission.id.asc()
    )
    if status:
        query = query.where(IdeaSubmission.status == status)
    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    return [IdeaResponse.model_validate(i) for i in result.scalars().all()]


@router.get("/stats")
async def idea_stats(
    request: Request,
    user_id: uuid.UUID | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """Return authoritative FIFO idea-stock counts by status (for the IDE badge).

    ``pending`` is the ready-to-claim FIFO queue; ``synced`` is the number of
    projects already synced into a workspace. Counts come straight from the
    idea stock (the single source of truth), not the filesystem.
    """
    from sqlalchemy import func

    session = _session(request)
    result = await session.execute(
        select(IdeaSubmission.status, func.count(IdeaSubmission.id)).group_by(
            IdeaSubmission.status
        )
    )
    counts: dict[str, int] = {status: count for status, count in result.all()}
    return {
        "data": {
            "pending": counts.get(IDEA_STATUS_PENDING, 0),
            "claimed": counts.get(IDEA_STATUS_CLAIMED, 0),
            "blueprint_ready": counts.get(IDEA_STATUS_BLUEPRINT_READY, 0),
            "synced": counts.get(IDEA_STATUS_SYNCED, 0),
            "completed": counts.get(IDEA_STATUS_COMPLETED, 0),
            "rejected": counts.get(IDEA_STATUS_REJECTED, 0),
            "total": sum(counts.values()),
        }
    }


@router.get("/next", response_model=IdeaResponse)
async def next_pending(
    request: Request,
    user_id: uuid.UUID = Depends(get_current_user),
) -> IdeaResponse:
    """Dequeue the next pending idea (FIFO by timestamp). Builders only."""
    session = _session(request)
    await _require_builder(session, user_id)
    result = await session.execute(
        select(IdeaSubmission)
        .where(IdeaSubmission.status == IDEA_STATUS_PENDING)
        .order_by(IdeaSubmission.created_at.asc(), IdeaSubmission.id.asc())
        .limit(1)
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise NotFoundError(resource="IdeaSubmission", resource_id="next-pending")
    return IdeaResponse.model_validate(idea)


@router.post("/{idea_id}/claim", response_model=IdeaResponse)
async def claim_idea(
    request: Request,
    idea_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user),
) -> IdeaResponse:
    """Claim a pending idea for evaluation and auto-generate a draft blueprint."""
    session = _session(request)
    await _require_builder(session, user_id)
    idea = await session.get(IdeaSubmission, idea_id)
    if idea is None:
        raise NotFoundError(resource="IdeaSubmission", resource_id=str(idea_id))
    if idea.status != IDEA_STATUS_PENDING:
        raise BadRequestError(detail=f"Idea is already '{idea.status}', not pending.")
    idea.status = IDEA_STATUS_CLAIMED
    idea.assigned_to = user_id
    idea.claimed_at = datetime.now(UTC)
    await session.flush()
    await session.refresh(idea)

    # Zero-question blueprint intake (best-effort; never blocks the claim).
    blueprint = await _generate_draft_blueprint(idea)
    if blueprint is not None:
        idea.draft_blueprint = blueprint
        await session.flush()
        await session.refresh(idea)

    # Notify founder & IDE: idea claimed, blueprint ready
    await event_bus.publish(
        topic_name="intake.ideas",
        event_type="idea.claimed",
        payload={
            "idea_id": str(idea.id),
            "project_name": idea.project_name,
            "claimed_by": str(user_id),
            "blueprint_ready": blueprint is not None,
            "status": idea.status,
        },
    )

    return IdeaResponse.model_validate(idea)


@router.post("/{idea_id}/certify", response_model=dict[str, Any])
async def certify_idea(
    request: Request,
    idea_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict[str, Any]:
    """Aggregate evaluations and request a Startup Designation Certificate."""
    session = _session(request)
    idea = await session.get(IdeaSubmission, idea_id)
    if idea is None:
        raise NotFoundError(resource="IdeaSubmission", resource_id=str(idea_id))

    result = await session.execute(
        select(PitchEvaluation)
        .where(PitchEvaluation.submission_id == idea_id)
        .order_by(PitchEvaluation.created_at.asc())
    )
    evaluations = result.scalars().all()
    if not evaluations:
        raise BadRequestError(detail="No evaluations yet — the idea cannot be certified.")

    auth_header = request.headers.get("authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() if auth_header else ""

    payload = {
        "submission_id": str(idea.id),
        "project_name": idea.project_name,
        "criteria": rubric_breakdown(evaluations),
        "jurisdictions": [],
        "profile": {},
        "texts": {},
    }
    designation = await _request_certification(payload, token)
    if designation is None:
        raise ServiceUnavailableError(detail="Certify service unavailable.")
    return designation


async def _request_start_project(payload: dict[str, Any], token: str) -> dict[str, Any] | None:
    """Call the workspace service to sync a project folder (best-effort).

    Sends the compiled applicant record (founder id + email + project name +
    Architect Blueprint preview) so the workspace writes it into the synced
    NEW_PROJECT_SYNCED/ folder.
    """
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=2.0)) as client:
            response = await client.post(
                f"{settings.workspace_url}/v1/workspace/projects",
                json=payload,
                headers={"Authorization": f"Bearer {token}"} if token else {},
            )
            if response.status_code >= 400:
                logger.warning(
                    "start_project_error: %s %s", response.status_code, response.text[:300]
                )
                return None
            return response.json()
    except (httpx.HTTPError, httpx.TimeoutException, OSError) as error:
        logger.warning("start_project_failed: %s", error)
        return None


@router.post("/{idea_id}/start-project", response_model=dict[str, Any])
async def start_project(
    request: Request,
    idea_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict[str, Any]:
    """Create a workspace project folder named after this intake idea.

    Bridges the extension/web Architect Intake into the IDE: the workspace
    service creates an empty folder named after the idea inside the user's
    isolated workspace, and the IDE opens it as the new project root.
    """
    session = _session(request)
    idea = await session.get(IdeaSubmission, idea_id)
    if idea is None:
        raise NotFoundError(resource="IdeaSubmission", resource_id=str(idea_id))

    auth_header = request.headers.get("authorization", "")
    token = auth_header.removeprefix("Bearer ").strip() if auth_header else ""
    project_payload: dict[str, Any] = {
        "name": idea.project_name,
        "idea_id": str(idea.id),
        "founder_id": str(idea.submitted_by) if idea.submitted_by else None,
        "founder_email": idea.founder_email,
        "one_liner": idea.one_liner,
        "problem": idea.problem,
        "blueprint": idea.draft_blueprint,
    }
    result = await _request_start_project(project_payload, token)
    if result is None:
        raise ServiceUnavailableError(detail="Workspace service unavailable.")

    # Stamp the idea 'synced' so it leaves the FIFO pending queue and is counted
    # as synced from the single source of truth (the idea stock).
    idea.status = IDEA_STATUS_SYNCED
    await session.flush()
    await session.refresh(idea)

    # Notify IDE: workspace project synced, ready to open
    await event_bus.publish(
        topic_name="intake.projects",
        event_type="project.started",
        payload={
            "idea_id": str(idea.id),
            "project_name": idea.project_name,
            "started_by": str(user_id),
            "synced_count": result.get("synced_count"),
            "workspace": result,
        },
    )

    return result


@router.patch("/{idea_id}/status", response_model=IdeaResponse)
async def update_status(
    request: Request,
    idea_id: uuid.UUID,
    body: IdeaStatusUpdate,
    user_id: uuid.UUID = Depends(get_current_user),
) -> IdeaResponse:
    """Advance an idea through the evaluation lifecycle."""
    session = _session(request)
    idea = await session.get(IdeaSubmission, idea_id)
    if idea is None:
        raise NotFoundError(resource="IdeaSubmission", resource_id=str(idea_id))
    if body.status not in _ALLOWED_STATUSES:
        raise BadRequestError(detail=f"Invalid status '{body.status}'.")
    if idea.assigned_to is not None and idea.assigned_to != user_id:
        raise ForbiddenError(detail="Only the assigned writer can update this idea.")
    idea.status = body.status
    if body.draft_blueprint is not None:
        idea.draft_blueprint = body.draft_blueprint
    if body.status in {IDEA_STATUS_COMPLETED, IDEA_STATUS_REJECTED}:
        idea.evaluated_at = datetime.now(UTC)
    await session.flush()
    await session.refresh(idea)

    # Notify all listeners: idea status changed
    await event_bus.publish(
        topic_name="intake.ideas",
        event_type="idea.status_changed",
        payload={
            "idea_id": str(idea.id),
            "project_name": idea.project_name,
            "new_status": body.status,
            "updated_by": str(user_id),
            "blueprint_attached": body.draft_blueprint is not None,
        },
    )

    return IdeaResponse.model_validate(idea)
