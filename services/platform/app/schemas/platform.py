"""Platform Service — Pydantic schemas for projects, orgs, profiles."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator
from slugify import slugify


# --- Organizations ---

class CreateOrganizationRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)

class UpdateOrganizationRequest(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    settings: dict | None = None

class OrganizationResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    logo_url: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}

class OrgMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    model_config = {"from_attributes": True}

class AddMemberRequest(BaseModel):
    user_id: uuid.UUID
    role: str = "member"


# --- Projects ---

class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    organization_id: uuid.UUID | None = None

class UpdateProjectRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    settings: dict | None = None

class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    status: str
    owner_id: uuid.UUID
    organization_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

class ProjectDetailResponse(ProjectResponse):
    settings: dict = {}
    ide_metadata: dict = {}
    profile: StartupProfileResponse | None = None


# --- Startup Profiles ---

class CreateStartupProfileRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    industry: str = Field(..., min_length=2, max_length=100)
    stage: str = "idea"
    country: str = Field(..., min_length=2, max_length=100)
    region: str | None = None
    team_size: int = Field(default=1, ge=1)
    problem_statement: str = Field(..., min_length=10)
    solution_description: str = Field(..., min_length=10)
    technologies: list[str] = []
    impact_statement: str | None = None
    target_markets: list[str] = []

class UpdateStartupProfileRequest(BaseModel):
    company_name: str | None = None
    industry: str | None = None
    stage: str | None = None
    country: str | None = None
    region: str | None = None
    team_size: int | None = None
    annual_revenue: Decimal | None = None
    problem_statement: str | None = None
    solution_description: str | None = None
    technologies: list[str] | None = None
    impact_statement: str | None = None
    target_markets: list[str] | None = None
    sdg_goals: list[str] | None = None
    revenue_model: str | None = None
    customer_count: int | None = None
    jobs_created: int | None = None
    website: str | None = None
    founded_year: int | None = None

class StartupProfileResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    company_name: str
    industry: str
    stage: str
    country: str
    region: str | None = None
    team_size: int
    annual_revenue: Decimal = Decimal("0")
    problem_statement: str
    solution_description: str
    technologies: list = []
    impact_statement: str | None = None
    target_markets: list = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
