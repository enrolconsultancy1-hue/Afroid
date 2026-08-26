"""Intake Service Pydantic schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
