"""Incubate Service — Opportunity Discovery & Search Routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.incubate.app.schemas.incubate import OpportunityResponse
from services.platform.app.models.platform import Opportunity
from services.shared.exceptions import NotFoundError

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.get("", response_model=list[OpportunityResponse])
async def list_opportunities(
    request: Request,
    funding_type: str | None = None,
    country: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
) -> list[OpportunityResponse]:
    """List and filter active funding opportunities."""
    session = _get_session(request)
    query = (
        select(Opportunity)
        .where(Opportunity.status == "active")
        .order_by(Opportunity.created_at.desc())
    )

    if funding_type:
        query = query.where(Opportunity.funding_type == funding_type)

    query = query.limit(limit).offset(offset)
    result = await session.execute(query)
    opps = result.scalars().all()
    return [OpportunityResponse.model_validate(o) for o in opps]


@router.get("/{opp_id}", response_model=OpportunityResponse)
async def get_opportunity(
    request: Request,
    opp_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> OpportunityResponse:
    """Get single opportunity details."""
    session = _get_session(request)
    result = await session.execute(select(Opportunity).where(Opportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if opp is None:
        raise NotFoundError(resource="Opportunity", resource_id=str(opp_id))
    return OpportunityResponse.model_validate(opp)
