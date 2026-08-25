"""Platform Service — Project CRUD routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.platform.app.models.platform import Project, StartupProfile
from services.platform.app.schemas.platform import (
    CreateProjectRequest,
    CreateStartupProfileRequest,
    ProjectDetailResponse,
    ProjectResponse,
    StartupProfileResponse,
    UpdateProjectRequest,
    UpdateStartupProfileRequest,
)
from services.shared.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/projects", tags=["projects"])


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


async def _get_project_or_404(session: AsyncSession, project_id: uuid.UUID) -> Project:
    result = await session.execute(
        select(Project).options(selectinload(Project.profile)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise NotFoundError(resource="Project", resource_id=str(project_id))
    return project


def _check_project_access(project: Project, user: User) -> None:
    if project.owner_id != user.id and user.role != "superadmin":
        raise ForbiddenError(detail="You do not have access to this project.")


# --- CRUD ---


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    request: Request,
    body: CreateProjectRequest,
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    session = _get_session(request)
    base_slug = slugify(body.name)
    count = await session.execute(
        select(func.count()).select_from(Project).where(Project.slug.like(f"{base_slug}%"))
    )
    slug = f"{base_slug}-{count.scalar() + 1}" if count.scalar() > 0 else base_slug

    project = Project(
        id=uuid.uuid4(),
        owner_id=current_user.id,
        organization_id=body.organization_id,
        name=body.name,
        slug=slug,
        description=body.description,
        status="draft",
    )
    session.add(project)
    await session.flush()
    return ProjectResponse.model_validate(project)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    request: Request,
    current_user: User = Depends(get_current_user),
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[ProjectResponse]:
    session = _get_session(request)
    query = (
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.created_at.desc())
    )
    if status:
        query = query.where(Project.status == status)
    query = query.limit(min(limit, 100)).offset(offset)
    result = await session.execute(query)
    projects = result.scalars().all()
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    request: Request,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> ProjectDetailResponse:
    session = _get_session(request)
    project = await _get_project_or_404(session, project_id)
    _check_project_access(project, current_user)
    return ProjectDetailResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    request: Request,
    project_id: uuid.UUID,
    body: UpdateProjectRequest,
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    session = _get_session(request)
    project = await _get_project_or_404(session, project_id)
    _check_project_access(project, current_user)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    await session.flush()
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    request: Request,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> None:
    session = _get_session(request)
    project = await _get_project_or_404(session, project_id)
    if project.owner_id != current_user.id and current_user.role != "superadmin":
        raise ForbiddenError(detail="Only the project owner can delete a project.")
    project.status = "deleted"
    await session.flush()


# --- Startup Profile ---


@router.post("/{project_id}/profile", response_model=StartupProfileResponse, status_code=201)
async def create_startup_profile(
    request: Request,
    project_id: uuid.UUID,
    body: CreateStartupProfileRequest,
    current_user: User = Depends(get_current_user),
) -> StartupProfileResponse:
    session = _get_session(request)
    project = await _get_project_or_404(session, project_id)
    _check_project_access(project, current_user)

    if project.profile is not None:
        raise ForbiddenError(detail="Project already has a startup profile. Use PUT to update.")

    profile = StartupProfile(
        id=uuid.uuid4(),
        project_id=project_id,
        **body.model_dump(),
    )
    session.add(profile)
    await session.flush()
    return StartupProfileResponse.model_validate(profile)


@router.get("/{project_id}/profile", response_model=StartupProfileResponse)
async def get_startup_profile(
    request: Request,
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> StartupProfileResponse:
    session = _get_session(request)
    project = await _get_project_or_404(session, project_id)
    _check_project_access(project, current_user)
    if project.profile is None:
        raise NotFoundError(resource="StartupProfile", resource_id=str(project_id))
    return StartupProfileResponse.model_validate(project.profile)


@router.put("/{project_id}/profile", response_model=StartupProfileResponse)
async def update_startup_profile(
    request: Request,
    project_id: uuid.UUID,
    body: UpdateStartupProfileRequest,
    current_user: User = Depends(get_current_user),
) -> StartupProfileResponse:
    session = _get_session(request)
    project = await _get_project_or_404(session, project_id)
    _check_project_access(project, current_user)
    if project.profile is None:
        raise NotFoundError(resource="StartupProfile", resource_id=str(project_id))

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project.profile, key, value)
    await session.flush()
    return StartupProfileResponse.model_validate(project.profile)
