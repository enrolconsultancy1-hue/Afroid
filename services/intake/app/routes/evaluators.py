"""Intake Service — pitch-deck evaluator profile routes (phase 2)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.intake.app.auth import get_current_user
from services.intake.app.models.intake import EvaluatorProfile
from services.intake.app.schemas.intake import EvaluatorRegisterRequest, EvaluatorResponse
from services.shared.exceptions import BadRequestError, ConflictError, NotFoundError

router = APIRouter(prefix="/evaluators", tags=["evaluators"])

_VALID_ORG_TYPES = {"government", "chamber", "judge", "entity"}


def _session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.post("", response_model=EvaluatorResponse, status_code=201)
async def register_evaluator(
    request: Request,
    body: EvaluatorRegisterRequest,
    user_id: uuid.UUID = Depends(get_current_user),
) -> EvaluatorResponse:
    """Register (or conflict) the authenticated user as a pitch-deck evaluator."""
    if body.org_type not in _VALID_ORG_TYPES:
        raise BadRequestError(detail=f"org_type must be one of {sorted(_VALID_ORG_TYPES)}.")
    session = _session(request)
    existing = await session.execute(
        select(EvaluatorProfile).where(EvaluatorProfile.user_id == user_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(detail="Evaluator profile already exists for this user.")
    profile = EvaluatorProfile(
        user_id=user_id,
        display_name=body.display_name,
        org_name=body.org_name,
        org_type=body.org_type,
        credential_ref=body.credential_ref,
        status="pending",
    )
    session.add(profile)
    await session.flush()
    await session.refresh(profile)
    return EvaluatorResponse.model_validate(profile)


@router.get("/me", response_model=EvaluatorResponse)
async def get_my_evaluator(
    request: Request,
    user_id: uuid.UUID = Depends(get_current_user),
) -> EvaluatorResponse:
    """Return the authenticated user's own evaluator profile."""
    session = _session(request)
    result = await session.execute(
        select(EvaluatorProfile).where(EvaluatorProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise NotFoundError(resource="EvaluatorProfile", resource_id=str(user_id))
    return EvaluatorResponse.model_validate(profile)


@router.get("", response_model=list[EvaluatorResponse])
async def list_evaluators(request: Request, status: str | None = None) -> list[EvaluatorResponse]:
    """List evaluator profiles, optionally filtered by status."""
    session = _session(request)
    query = select(EvaluatorProfile).order_by(EvaluatorProfile.created_at.asc())
    if status:
        query = query.where(EvaluatorProfile.status == status)
    result = await session.execute(query)
    return [EvaluatorResponse.model_validate(e) for e in result.scalars().all()]


@router.post("/{evaluator_id}/approve", response_model=EvaluatorResponse)
async def approve_evaluator(
    request: Request,
    evaluator_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user),
) -> EvaluatorResponse:
    """Approve an evaluator. TODO: restrict to geezcodE team/admins in production."""
    session = _session(request)
    profile = await session.get(EvaluatorProfile, evaluator_id)
    if profile is None:
        raise NotFoundError(resource="EvaluatorProfile", resource_id=str(evaluator_id))
    profile.status = "approved"
    await session.flush()
    await session.refresh(profile)
    return EvaluatorResponse.model_validate(profile)


@router.get("/{evaluator_id}", response_model=EvaluatorResponse)
async def get_evaluator(request: Request, evaluator_id: uuid.UUID) -> EvaluatorResponse:
    """Return an evaluator profile by id."""
    session = _session(request)
    profile = await session.get(EvaluatorProfile, evaluator_id)
    if profile is None:
        raise NotFoundError(resource="EvaluatorProfile", resource_id=str(evaluator_id))
    return EvaluatorResponse.model_validate(profile)
