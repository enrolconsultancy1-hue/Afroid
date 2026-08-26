"""Intake Service — idea submission queue routes."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.intake.app.auth import get_current_user, get_optional_user
from services.intake.app.models.intake import (
    IDEA_STATUS_BLUEPRINT_READY,
    IDEA_STATUS_CLAIMED,
    IDEA_STATUS_COMPLETED,
    IDEA_STATUS_EVALUATING,
    IDEA_STATUS_PENDING,
    IDEA_STATUS_REJECTED,
    IdeaSubmission,
)
from services.intake.app.schemas.intake import IdeaResponse, IdeaStatusUpdate, IdeaSubmitRequest
from services.shared.exceptions import BadRequestError, ForbiddenError, NotFoundError

router = APIRouter(prefix="/ideas", tags=["ideas"])

_ALLOWED_STATUSES = {
    IDEA_STATUS_PENDING,
    IDEA_STATUS_CLAIMED,
    IDEA_STATUS_EVALUATING,
    IDEA_STATUS_BLUEPRINT_READY,
    IDEA_STATUS_COMPLETED,
    IDEA_STATUS_REJECTED,
}


def _session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.post("", response_model=IdeaResponse, status_code=201)
async def submit_idea(
    request: Request,
    body: IdeaSubmitRequest,
    user_id: uuid.UUID | None = Depends(get_optional_user),
) -> IdeaResponse:
    """Submit a new startup idea (auth optional — founders may submit anonymously)."""
    session = _session(request)
    idea = IdeaSubmission(
        project_name=body.project_name,
        one_liner=body.one_liner,
        problem=body.problem,
        target_users=body.target_users,
        core_features=body.core_features,
        free_text=body.free_text,
        founder_name=body.founder_name,
        founder_email=body.founder_email,
        submitted_by=user_id,
        status=IDEA_STATUS_PENDING,
    )
    session.add(idea)
    await session.flush()
    await session.refresh(idea)
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


@router.get("/next", response_model=IdeaResponse)
async def next_pending(
    request: Request,
    user_id: uuid.UUID = Depends(get_current_user),
) -> IdeaResponse:
    """Dequeue the next pending idea (FIFO by timestamp). Requires auth."""
    session = _session(request)
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
    """Claim a pending idea for evaluation (human-in-the-loop)."""
    session = _session(request)
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
    return IdeaResponse.model_validate(idea)


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
    return IdeaResponse.model_validate(idea)
