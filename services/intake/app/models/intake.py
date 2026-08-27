"""Intake Service SQLAlchemy models — idea queue, writers, and phase-2 evaluator stubs."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from services.shared.database import Base

# --- Idea submission lifecycle statuses ---
IDEA_STATUS_PENDING = "pending"
IDEA_STATUS_CLAIMED = "claimed"
IDEA_STATUS_EVALUATING = "evaluating"
IDEA_STATUS_BLUEPRINT_READY = "blueprint_ready"
IDEA_STATUS_COMPLETED = "completed"
IDEA_STATUS_REJECTED = "rejected"


class IdeaSubmission(Base):
    """A founder-submitted startup idea awaiting sequential evaluation."""

    __tablename__ = "idea_submissions"
    __table_args__ = (Index("ix_idea_submissions_status_created", "status", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_name: Mapped[str] = mapped_column(String(255), nullable=False)
    one_liner: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    problem: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target_users: Mapped[str] = mapped_column(Text, nullable=False, default="")
    core_features: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    free_text: Mapped[str] = mapped_column(Text, nullable=False, default="")

    founder_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    founder_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    status: Mapped[str] = mapped_column(String(32), nullable=False, default=IDEA_STATUS_PENDING)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evaluated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    draft_blueprint: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    user_journeys: Mapped[str] = mapped_column(Text, nullable=False, default="")
    functional_requirements: Mapped[str] = mapped_column(Text, nullable=False, default="")
    data_entities: Mapped[str] = mapped_column(Text, nullable=False, default="")
    extended: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<IdeaSubmission id={self.id} status={self.status}>"


class WriterProfile(Base):
    """A registered technical builder who evaluates and builds submitted ideas."""

    __tablename__ = "writer_profiles"
    __table_args__ = (UniqueConstraint("user_id", name="uq_writer_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<WriterProfile id={self.id} user_id={self.user_id}>"


class EvaluatorProfile(Base):
    """PHASE 2 (stub): vetted pitch-deck evaluator (gov body / chamber / judge)."""

    __tablename__ = "evaluator_profiles"
    __table_args__ = (UniqueConstraint("user_id", name="uq_evaluator_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    org_name: Mapped[str] = mapped_column(String(255), nullable=False)
    org_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # government|chamber|judge|entity
    credential_ref: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<EvaluatorProfile id={self.id} org_type={self.org_type}>"


class PitchEvaluation(Base):
    """PHASE 2 (stub): a scored evaluation of a startup pitch deck."""

    __tablename__ = "pitch_evaluations"
    __table_args__ = (UniqueConstraint("submission_id", "evaluator_id", name="uq_pitch_eval"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("idea_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evaluator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evaluator_profiles.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)  # 0.00-100.00
    criteria: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # rubric breakdown
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<PitchEvaluation id={self.id} score={self.score}>"
