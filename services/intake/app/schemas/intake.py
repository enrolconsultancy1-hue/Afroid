"""Intake Service Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from services.shared.pitch_rubric import RUBRIC_DIMENSIONS

# Phase 2 optional field keys — the authoritative set from the Master
# Project Specification (PHASE A business/governance + PHASE B delivery).
PHASE2_KEYS: frozenset[str] = frozenset(
    {
        "product_summary",
        "business_problem",
        "target_users",
        "current_workflow",
        "desired_workflow",
        "success_criteria",
        "mvp_definition",
        "tools_integrations",
        "technical_constraints",
        "project_budget",
        "timeline_milestones",
        "compliance_standards",
        "legal_documents",
        "brand_colors",
        "typography_ui_rules",
        "git_remote_url",
        "verified_skills_urls",
        "known_risks",
        "open_questions",
        "organization",
        "country",
        "industry",
        "funding_type",
        "vision",
        "mission",
        "market_size",
        "competitors",
        "competitive_advantage",
        "value_proposition",
        "revenue_model",
        "expected_roi",
        "esg_statement",
        "expansion_strategy",
        "exit_strategy",
        "scalability_plan",
        "sustainability_plan",
        "decision_making",
        "communication_plan",
        "inclusion_strategy",
        "environmental_sustainability",
        "business_rules",
        "feature_acceptance_criteria",
        "quality_performance_requirements",
        "existing_system",
        "existing_system_details",
        "protected_requirements",
        "known_assumptions",
        "out_of_scope",
    }
)


class IdeaSubmitRequest(BaseModel):
    """Two-phase Architect Intake (Master Project Specification).

    Phase 1 — required (``*``): the blueprint backbone.
    Phase 2 — optional: any field from :data:`PHASE2_KEYS`; when omitted the
    orchestrator engine fills built-in proven templates under the hood.
    """

    # --- Phase 1 · Required (*) ---
    project_name: str = Field(..., min_length=2, max_length=255, description="Project working name")
    core_features: list[str] = Field(
        ..., min_length=1, max_length=20, description="Core features / modules (one per item)"
    )
    user_journeys: str = Field(
        ..., min_length=10, max_length=20000, description="Key user journeys / use cases"
    )
    functional_requirements: str = Field(
        ..., min_length=10, max_length=30000, description="Functional requirements"
    )
    data_entities: str = Field(
        ..., min_length=10, max_length=20000, description="Core data / entities"
    )

    # --- Legacy optional columns (back-compat) ---
    one_liner: str = Field(default="", max_length=500)
    problem: str = Field(default="", max_length=5000)
    target_users: str = Field(default="", max_length=2000)
    free_text: str = Field(default="", max_length=20000)
    founder_name: str | None = Field(default=None, max_length=255)
    founder_email: str | None = Field(default=None, max_length=255)

    # --- Phase 2 · Optional (persisted as a structured dict) ---
    extended: dict | None = Field(default=None, description="Any PHASE2_KEYS field")

    @field_validator("extended")
    @classmethod
    def _validate_extended(cls, value: dict | None) -> dict | None:
        """Reject unknown phase-2 keys (typo protection)."""
        if value is None:
            return value
        unknown = set(value) - PHASE2_KEYS
        if unknown:
            raise ValueError(f"Unknown phase-2 fields: {sorted(unknown)}")
        return value


class IdeaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_name: str
    one_liner: str
    problem: str
    target_users: str
    core_features: list[str]
    user_journeys: str
    functional_requirements: str
    data_entities: str
    free_text: str
    founder_name: str | None
    founder_email: str | None
    submitted_by: uuid.UUID | None
    status: str
    assigned_to: uuid.UUID | None
    claimed_at: datetime | None
    evaluated_at: datetime | None
    draft_blueprint: dict | None
    extended: dict | None
    created_at: datetime
    updated_at: datetime


class IdeaStatusUpdate(BaseModel):
    """Advance an idea through the evaluation lifecycle."""

    status: str
    draft_blueprint: dict | None = None
    note: str | None = None


class WriterRegisterRequest(BaseModel):
    """Register as a technical builder/writer."""

    display_name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    title: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=5000)
    skills: list[str] = Field(default_factory=list, max_length=30)


class WriterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    email: str
    title: str | None
    bio: str | None
    skills: list[str]
    status: str
    created_at: datetime
    updated_at: datetime


# --- Pitch Deck Evaluator (phase 2) ---


class EvaluatorRegisterRequest(BaseModel):
    """Register as a vetted pitch-deck evaluator (gov body / chamber / judge)."""

    display_name: str = Field(..., min_length=2, max_length=255)
    org_name: str = Field(..., min_length=2, max_length=255)
    org_type: str = Field(..., max_length=32)  # government|chamber|judge|entity
    credential_ref: str | None = Field(default=None, max_length=2000)


class EvaluatorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    org_name: str
    org_type: str
    credential_ref: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class PitchEvaluationRequest(BaseModel):
    """A scored evaluation of a startup pitch deck.

    ``criteria`` maps shared-rubric dimensions to 0-10 scores; ``score`` remains
    the evaluator's holistic 0-100 summary (kept for backward compatibility).
    """

    submission_id: uuid.UUID
    score: float = Field(..., ge=0, le=100)
    criteria: dict | None = None
    comments: str | None = Field(default=None, max_length=5000)

    @field_validator("criteria")
    @classmethod
    def _validate_criteria(cls, value: dict | None) -> dict | None:
        """Validate structured per-dimension criteria against the shared rubric."""
        if value is None:
            return value
        unknown = set(value) - set(RUBRIC_DIMENSIONS)
        if unknown:
            raise ValueError(f"Unknown rubric dimensions: {sorted(unknown)}")
        for dimension, raw in value.items():
            if isinstance(raw, bool) or not isinstance(raw, (int, float)):
                raise ValueError(f"Criteria '{dimension}' must be a number 0-10.")
            if not 0 <= float(raw) <= 10:
                raise ValueError(f"Criteria '{dimension}' must be between 0 and 10.")
        return value


class PitchEvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    submission_id: uuid.UUID
    evaluator_id: uuid.UUID
    score: float | None
    criteria: dict | None
    comments: str | None
    created_at: datetime


class ScoreResponse(BaseModel):
    """Aggregate score for a submission — input to the certify designation certificate."""

    submission_id: uuid.UUID
    score_count: int
    average_score: float | None
    rubric_breakdown: dict[str, float] = Field(default_factory=dict)
    evaluations: list[PitchEvaluationResponse]


class MeResponse(BaseModel):
    """Current user's roles within the intake platform."""

    user_id: uuid.UUID
    writer_status: str | None
    evaluator_status: str | None
    roles: list[str]
