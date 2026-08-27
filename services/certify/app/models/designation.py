"""Certify Service — persisted startup designation certificate records."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from services.shared.database import Base


class Designation(Base):
    """A persisted startup designation certificate record (one per submission)."""

    __tablename__ = "designations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    certificate_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    submission_id: Mapped[str] = mapped_column(String(64), index=True)
    project_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    grade: Mapped[str] = mapped_column(String(64), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    designation: Mapped[str] = mapped_column(String(32), nullable=False, default="withheld")
    rubric: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    compliance: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    originality: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    issuer: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    validity_days: Mapped[int] = mapped_column(nullable=False, default=365)
    audit_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Designation certificate_id={self.certificate_id} grade={self.grade}>"
