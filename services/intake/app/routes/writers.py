"""Intake Service — writer/builder profile routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.intake.app.auth import get_current_user
from services.intake.app.models.intake import WriterProfile
from services.intake.app.schemas.intake import WriterRegisterRequest, WriterResponse
from services.shared.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/writers", tags=["writers"])


def _session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.post("", response_model=WriterResponse, status_code=201)
async def register_writer(
    request: Request,
    body: WriterRegisterRequest,
    user_id: uuid.UUID = Depends(get_current_user),
) -> WriterResponse:
    """Register (or conflict) the authenticated user's writer profile."""
    session = _session(request)
    existing = await session.execute(select(WriterProfile).where(WriterProfile.user_id == user_id))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(detail="Writer profile already exists for this user.")
    profile = WriterProfile(
        user_id=user_id,
        display_name=body.display_name,
        email=body.email,
        title=body.title,
        bio=body.bio,
        skills=body.skills,
        status="pending",
    )
    session.add(profile)
    await session.flush()
    await session.refresh(profile)
    return WriterResponse.model_validate(profile)


@router.get("", response_model=list[WriterResponse])
async def list_writers(request: Request) -> list[WriterResponse]:
    """List all writer profiles."""
    session = _session(request)
    result = await session.execute(select(WriterProfile).order_by(WriterProfile.created_at.asc()))
    return [WriterResponse.model_validate(w) for w in result.scalars().all()]


@router.get("/me", response_model=WriterResponse)
async def get_my_profile(
    request: Request,
    user_id: uuid.UUID = Depends(get_current_user),
) -> WriterResponse:
    """Return the authenticated user's own writer profile."""
    session = _session(request)
    result = await session.execute(select(WriterProfile).where(WriterProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise NotFoundError(resource="WriterProfile", resource_id=str(user_id))
    return WriterResponse.model_validate(profile)


@router.get("/{writer_id}", response_model=WriterResponse)
async def get_writer(request: Request, writer_id: uuid.UUID) -> WriterResponse:
    """Return a writer profile by id."""
    session = _session(request)
    profile = await session.get(WriterProfile, writer_id)
    if profile is None:
        raise NotFoundError(resource="WriterProfile", resource_id=str(writer_id))
    return WriterResponse.model_validate(profile)
