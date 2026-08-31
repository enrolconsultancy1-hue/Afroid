"""Shared SQLAlchemy models for users, refresh tokens, and KYC verification.

Moved from services.auth so that all services can authenticate users (JWT +
DB lookup) without importing across service boundaries. The auth service
re-exports these for backwards compatibility.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.shared.database import Base


class User(Base):
    """User account model."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # KYC Fields
    kyc_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unverified"
    )  # unverified, pending, verified, rejected
    kyc_id_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # NIN, BVN, Kenyan_ID, Fayda_ID, Passport
    kyc_id_masked: Mapped[str | None] = mapped_column(String(50), nullable=True)
    kyc_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    kyc_records: Mapped[list[KycVerification]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} kyc={self.kyc_status}>"


class RefreshToken(Base):
    """Refresh token for JWT rotation."""

    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    device_info: Mapped[str | None] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class KycVerification(Base):
    """KYC verification session & audit record."""

    __tablename__ = "kyc_verifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    session_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending_scan"
    )  # pending_scan, scanned, doc_captured, liveness_passed, verified, rejected
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="Nigeria")
    id_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    id_number_masked: Mapped[str | None] = mapped_column(String(50), nullable=True)

    face_match_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    liveness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    audit_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )  # SHA-256 cryptographic audit chain proof

    device_info: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User | None] = relationship(back_populates="kyc_records")

    def __repr__(self) -> str:
        return f"<KycVerification session={self.session_id} status={self.status}>"
