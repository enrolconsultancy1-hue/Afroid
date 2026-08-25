"""Incubate Service Pydantic Schemas."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

# --- Opportunity Schemas ---


class OpportunityFilterParams(BaseModel):
    """Query parameters for filtering opportunities."""

    funding_type: str | None = None
    country: str | None = None
    sector: str | None = None
    stage: str | None = None
    min_amount: Decimal | None = None
    max_amount: Decimal | None = None
    search: str | None = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class OpportunityResponse(BaseModel):
    id: uuid.UUID
    title: str
    funder: str
    funder_type: str | None = None
    funding_type: str
    amount_min: Decimal | None = None
    amount_max: Decimal | None = None
    currency: str = "USD"
    eligible_regions: list[str] = []
    eligible_sectors: list[str] = []
    eligible_stages: list[str] = []
    deadline: date | None = None
    is_rolling: bool = False
    description: str
    application_url: str | None = None
    source_url: str
    status: str = "active"
    model_config = {"from_attributes": True}


# --- Match Schemas ---


class MatchRequest(BaseModel):
    project_id: uuid.UUID
    top_k: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0.65, ge=0.0, le=1.0)


class OpportunityMatchItem(BaseModel):
    opportunity: OpportunityResponse
    similarity_score: float
    eligibility_passed: bool
    reasons: list[str] = []
    strengths: list[str] = []
    gaps: list[str] = []


class MatchResponse(BaseModel):
    project_id: uuid.UUID
    total_matches: int
    matches: list[OpportunityMatchItem]


# --- Autofill & Application Schemas ---


class AutofillField(BaseModel):
    field_name: str
    field_type: str = "text"
    description: str | None = None
    required: bool = True


class AutofillRequest(BaseModel):
    project_id: uuid.UUID
    opportunity_id: uuid.UUID
    target_fields: list[AutofillField]


class AutofillResultItem(BaseModel):
    field_name: str
    value: Any
    confidence: float
    source_field: str
    needs_review: bool


class AutofillResponse(BaseModel):
    project_id: uuid.UUID
    opportunity_id: uuid.UUID
    filled_fields: list[AutofillResultItem]
    overall_confidence: float
    missing_fields: list[str]


# --- Grant Writing Schemas ---


class GrantSectionPrompt(BaseModel):
    project_id: uuid.UUID
    opportunity_id: uuid.UUID
    section_name: str
    max_words: int = Field(default=500, ge=50, le=2000)
    additional_context: str | None = None
    tone: str = "persuasive, data-driven, impactful"


class GrantSectionResponse(BaseModel):
    section_name: str
    content: str
    word_count: int
    readability_score: float
    key_points_covered: list[str]
    suggested_improvements: list[str]
