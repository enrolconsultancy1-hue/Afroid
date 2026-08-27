"""Intake Service Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from services.shared.pitch_rubric import RUBRIC_DIMENSIONS

# Additional Phase-A (business & governance) keys — non-technical, optional.
# Stored in ``extended``. The required Phase-1 fields and the Phase-B technical
# fields are explicit top-level fields on IdeaSubmitRequest.
PHASE_A_KEYS: frozenset[str] = frozenset(
    {
        "current_workflow",
        "desired_workflow",
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
    }
)


class IdeaSubmitRequest(BaseModel):
    """Two-phase Architect Intake (Master Project Specification).

    Phase 1 — required (``*``): non-technical business & vision (Phase A).
    Phase 2 — optional: technical Software Definition (Phase B); when skipped,
    the orchestrator engine fills built-in proven templates under the hood.
    """

    # --- Phase 1 · Required (*) — non-technical business & vision ---
    project_name: str = Field(..., min_length=2, max_length=255, description="Project working name")
    product_summary: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="What is built, who it is for, what it helps them accomplish",
    )
    business_problem: str = Field(
        ...,
        min_length=20,
        max_length=5000,
        description="Pain, inefficiency, cost, or risk solved today",
    )
    target_users: str = Field(
        ..., min_length=3, max_length=2000, description="Primary users, stakeholders, and roles"
    )
    success_criteria: str = Field(
        ..., min_length=10, max_length=2000, description="Measurable outcomes that define success"
    )
    mvp_definition: str = Field(
        ..., min_length=10, max_length=2000, description="Smallest useful version to build first"
    )

    # --- Phase 2 · Optional — technical Software Definition (Phase B) ---
    core_features: list[str] = Field(
        default_factory=list, max_length=20, description="Core features / modules (one per item)"
    )
    user_journeys: str = Field(
        default="", max_length=20000, description="Key user journeys / use cases"
    )
    functional_requirements: str = Field(
        default="", max_length=30000, description="Observable behaviors, specific enough to test"
    )
    data_entities: str = Field(default="", max_length=20000, description="Core data / entities")
    feature_acceptance_criteria: str = Field(
        default="",
        max_length=20000,
        description="Feature acceptance criteria (Given → When → Then)",
    )
    business_rules: str = Field(
        default="", max_length=20000, description="Business rules and logic"
    )
    quality_performance_requirements: str = Field(
        default="", max_length=20000, description="Quality & performance expectations"
    )
    existing_system: str = Field(
        default="", max_length=2000, description="New / rebuild / migration / extension ..."
    )
    protected_requirements: str = Field(
        default="", max_length=20000, description="Protected requirements / do not change"
    )
    known_assumptions: str = Field(default="", max_length=20000, description="Known assumptions")
    out_of_scope: str = Field(default="", max_length=20000, description="Explicitly out of scope")

    # --- Other ---
    free_text: str = Field(default="", max_length=20000, description="Anything else (optional)")
    founder_name: str = Field(..., min_length=2, max_length=255, description="Founder full name")
    founder_email: str = Field(..., min_length=5, max_length=255, description="Founder email")

    # --- Additional Phase-A business fields (optional, validated keys) ---
    extended: dict | None = Field(default=None, description="Any additional PHASE_A_KEYS field")

    @field_validator("extended")
    @classmethod
    def _validate_extended(cls, value: dict | None) -> dict | None:
        """Reject unknown Phase-A keys (typo protection)."""
        if value is None:
            return value
        unknown = set(value) - PHASE_A_KEYS
        if unknown:
            raise ValueError(f"Unknown phase-A fields: {sorted(unknown)}")
        return value

    @field_validator("founder_email")
    @classmethod
    def _validate_founder_email(cls, value: str) -> str:
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("A valid founder email is required.")
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
