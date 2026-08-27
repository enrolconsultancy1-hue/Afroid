"""Intake Service — current-user role probe."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.intake.app.auth import get_current_user
from services.intake.app.models.intake import EvaluatorProfile, WriterProfile
from services.intake.app.schemas.intake import MeResponse

router = APIRouter(prefix="/me", tags=["me"])


def _session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.get("", response_model=MeResponse)
async def get_me(
    request: Request,
    user_id: uuid.UUID = Depends(get_current_user),
) -> MeResponse:
    """Return the authenticated user's roles within the intake platform.

    Used by the extension popup to show role-appropriate tabs only.
    """
    session = _session(request)
    writer = (
        await session.execute(select(WriterProfile).where(WriterProfile.user_id == user_id))
    ).scalar_one_or_none()
    evaluator = (
        await session.execute(select(EvaluatorProfile).where(EvaluatorProfile.user_id == user_id))
    ).scalar_one_or_none()

    roles: list[str] = []
    if writer is not None:
        roles.append("writer")
    if evaluator is not None:
        roles.append("evaluator")

    return MeResponse(
        user_id=user_id,
        writer_status=writer.status if writer else None,
        evaluator_status=evaluator.status if evaluator else None,
        roles=roles,
    )
