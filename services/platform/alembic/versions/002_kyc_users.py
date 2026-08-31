"""Add KYC columns to users table.

The User model (services/auth/app/models/user.py) defines KYC fields that were
added after the initial schema was written, but no migration was created. This
migration closes the drift so the auth service's register/select statements work.

Revision ID: 002_kyc_users
Revises: 001_initial
Create Date: 2026-08-31
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision: str = "002_kyc_users"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("kyc_status", sa.String(20), nullable=False, server_default="unverified"))
    op.add_column("users", sa.Column("kyc_id_type", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("kyc_id_masked", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("kyc_verified_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "kyc_verified_at")
    op.drop_column("users", "kyc_id_masked")
    op.drop_column("users", "kyc_id_type")
    op.drop_column("users", "kyc_status")
