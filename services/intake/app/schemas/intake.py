"""Intake Service Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from services.shared.pitch_rubric import RUBRIC_DIMENSIONS


class IdeaSubmitRequest(BaseModel):
    """Founder idea submission — 4-5 hinted fields + one free-text box."""

    project_name: str = Field(..., min_length=2, max_length=255, description="Startup name")
    one_liner: str = Field(default="", max_length=500, description="Elevator pitch")
    problem: str = Field(default="", max_length=5000, description="Problem being solved")
    target_users: str = Field(default="", max_length=2000, description="Who it serves")
    core_features: list[str] = Field(default_factory=list, max_length=20)
    free_text: str = Field(default="", max_length=20000, description="Anything else")
    founder_name: str | None = Field(default=None, max_length=255)
    founder_email: str | None = Field(default=None, max_length=255)


class IdeaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_name: str
    one_liner: str
    problem: str
    target_users: str
    core_features: list[str]
    free_text: str
    founder_name: str | None
    founder_email: str | None
    submitted_by: uuid.UUID | None
    status: str
    assigned_to: uuid.UUID | None
    claimed_at: datetime | None
    evaluated_at: datetime | None
    draft_blueprint: dict | None
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
