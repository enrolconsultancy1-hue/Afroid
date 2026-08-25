"""Platform Service — Organization routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.platform.app.models.platform import Organization, OrganizationMember
from services.platform.app.schemas.platform import (
    AddMemberRequest,
    CreateOrganizationRequest,
    OrganizationResponse,
    OrgMemberResponse,
    UpdateOrganizationRequest,
)
from services.shared.exceptions import ConflictError, ForbiddenError, NotFoundError

router = APIRouter(prefix="/organizations", tags=["organizations"])


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


async def _get_org_or_404(session: AsyncSession, org_id: uuid.UUID) -> Organization:
    result = await session.execute(
        select(Organization)
        .options(selectinload(Organization.members))
        .where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundError(resource="Organization", resource_id=str(org_id))
    return org


def _get_member_role(org: Organization, user_id: uuid.UUID) -> str | None:
    for member in org.members:
        if member.user_id == user_id:
            return member.role
    return None


def _require_admin(org: Organization, user: User) -> None:
    if user.role == "superadmin":
        return
    role = _get_member_role(org, user.id)
    if role not in ("owner", "admin"):
        raise ForbiddenError(detail="Admin access required.")


@router.post("", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    request: Request,
    body: CreateOrganizationRequest,
    current_user: User = Depends(get_current_user),
) -> OrganizationResponse:
    session = _get_session(request)
    slug = slugify(body.name)

    existing = await session.execute(select(Organization).where(Organization.slug == slug))
    if existing.scalar_one_or_none() is not None:
        raise ConflictError(detail=f"Organization slug '{slug}' already exists.")

    org = Organization(
        id=uuid.uuid4(),
        name=body.name,
        slug=slug,
    )
    session.add(org)
    await session.flush()

    member = OrganizationMember(
        id=uuid.uuid4(),
        organization_id=org.id,
        user_id=current_user.id,
        role="owner",
    )
    session.add(member)
    await session.flush()

    return OrganizationResponse.model_validate(org)


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> list[OrganizationResponse]:
    session = _get_session(request)
    result = await session.execute(
        select(Organization)
        .join(OrganizationMember)
        .where(OrganizationMember.user_id == current_user.id)
        .order_by(Organization.created_at.desc())
    )
    orgs = result.scalars().all()
    return [OrganizationResponse.model_validate(o) for o in orgs]


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    request: Request,
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> OrganizationResponse:
    session = _get_session(request)
    org = await _get_org_or_404(session, org_id)
    if _get_member_role(org, current_user.id) is None and current_user.role != "superadmin":
        raise ForbiddenError(detail="You are not a member of this organization.")
    return OrganizationResponse.model_validate(org)


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    request: Request,
    org_id: uuid.UUID,
    body: UpdateOrganizationRequest,
    current_user: User = Depends(get_current_user),
) -> OrganizationResponse:
    session = _get_session(request)
    org = await _get_org_or_404(session, org_id)
    _require_admin(org, current_user)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)
    await session.flush()
    return OrganizationResponse.model_validate(org)


@router.delete("/{org_id}", status_code=204)
async def delete_organization(
    request: Request,
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> None:
    session = _get_session(request)
    org = await _get_org_or_404(session, org_id)
    role = _get_member_role(org, current_user.id)
    if role != "owner" and current_user.role != "superadmin":
        raise ForbiddenError(detail="Only the organization owner can delete it.")
    await session.delete(org)


@router.post("/{org_id}/members", response_model=OrgMemberResponse, status_code=201)
async def add_member(
    request: Request,
    org_id: uuid.UUID,
    body: AddMemberRequest,
    current_user: User = Depends(get_current_user),
) -> OrgMemberResponse:
    session = _get_session(request)
    org = await _get_org_or_404(session, org_id)
    _require_admin(org, current_user)

    if _get_member_role(org, body.user_id) is not None:
        raise ConflictError(detail="User is already a member of this organization.")

    member = OrganizationMember(
        id=uuid.uuid4(),
        organization_id=org_id,
        user_id=body.user_id,
        role=body.role,
    )
    session.add(member)
    await session.flush()
    return OrgMemberResponse.model_validate(member)


@router.get("/{org_id}/members", response_model=list[OrgMemberResponse])
async def list_members(
    request: Request,
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> list[OrgMemberResponse]:
    session = _get_session(request)
    org = await _get_org_or_404(session, org_id)
    if _get_member_role(org, current_user.id) is None and current_user.role != "superadmin":
        raise ForbiddenError(detail="You are not a member of this organization.")
    return [OrgMemberResponse.model_validate(m) for m in org.members]


@router.delete("/{org_id}/members/{user_id}", status_code=204)
async def remove_member(
    request: Request,
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> None:
    session = _get_session(request)
    org = await _get_org_or_404(session, org_id)
    _require_admin(org, current_user)

    result = await session.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise NotFoundError(resource="Member", resource_id=str(user_id))
    if member.role == "owner":
        raise ForbiddenError(detail="Cannot remove the organization owner.")
    await session.delete(member)
