"""Initial schema — All core tables for Afroid platform.

Revision ID: 001_initial
Revises: None
Create Date: 2026-08-23
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers
revision: str = "001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- Enable extensions ---
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

    # --- Users ---
    op.create_table(
        "users",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.String(2000), nullable=True),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    # --- Organizations ---
    op.create_table(
        "organizations",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("plan", sa.String(20), nullable=False, server_default="free"),
        sa.Column("settings", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("logo_url", sa.String(2000), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    # --- Organization Members ---
    op.create_table(
        "organization_members",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "organization_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
    )
    op.create_index("ix_org_members_org", "organization_members", ["organization_id"])
    op.create_index("ix_org_members_user", "organization_members", ["user_id"])

    # --- Projects ---
    op.create_table(
        "projects",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "owner_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("settings", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ide_metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("organization_id", "slug", name="uq_project_org_slug"),
    )
    op.create_index("ix_projects_owner", "projects", ["owner_id"])
    op.create_index("ix_projects_org", "projects", ["organization_id"])
    op.create_index("ix_projects_status", "projects", ["status"])

    # --- Startup Profiles ---
    op.create_table(
        "startup_profiles",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "project_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("legal_name", sa.String(255), nullable=True),
        sa.Column("industry", sa.String(100), nullable=False),
        sa.Column("stage", sa.String(20), nullable=False, server_default="idea"),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("website", sa.String(2000), nullable=True),
        sa.Column("team_size", sa.Integer, server_default=sa.text("1")),
        sa.Column("annual_revenue", sa.Numeric(15, 2), server_default=sa.text("0")),
        sa.Column("annual_revenue_currency", sa.String(3), server_default="USD"),
        sa.Column("founded_year", sa.Integer, nullable=True),
        sa.Column("problem_statement", sa.Text, nullable=False),
        sa.Column("solution_description", sa.Text, nullable=False),
        sa.Column("technologies", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("impact_statement", sa.Text, nullable=True),
        sa.Column("target_markets", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("sdg_goals", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("revenue_model", sa.Text, nullable=True),
        sa.Column("customer_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("jobs_created", sa.Integer, server_default=sa.text("0")),
        sa.Column("previous_funding", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("documents", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    # pgvector embedding column added separately
    op.execute("ALTER TABLE startup_profiles ADD COLUMN embedding vector(768)")

    op.create_index("ix_profiles_project", "startup_profiles", ["project_id"])
    op.create_index("ix_profiles_country", "startup_profiles", ["country"])
    op.create_index("ix_profiles_industry", "startup_profiles", ["industry"])

    # HNSW index for vector similarity search
    op.execute("""
        CREATE INDEX ix_profiles_embedding ON startup_profiles
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # --- Opportunities ---
    op.create_table(
        "opportunities",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("funder", sa.String(300), nullable=False),
        sa.Column("funder_type", sa.String(30), nullable=True),
        sa.Column("funding_type", sa.String(30), nullable=False),
        sa.Column("amount_min", sa.Numeric(15, 2), nullable=True),
        sa.Column("amount_max", sa.Numeric(15, 2), nullable=True),
        sa.Column("currency", sa.String(3), server_default="USD"),
        sa.Column(
            "eligible_regions",
            sa.ARRAY(sa.String),
            nullable=False,
            server_default=sa.text("ARRAY[]::text[]"),
        ),
        sa.Column(
            "eligible_sectors",
            sa.ARRAY(sa.String),
            nullable=False,
            server_default=sa.text("ARRAY[]::text[]"),
        ),
        sa.Column(
            "eligible_stages",
            sa.ARRAY(sa.String),
            nullable=False,
            server_default=sa.text("ARRAY[]::text[]"),
        ),
        sa.Column(
            "eligibility_criteria", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")
        ),
        sa.Column("deadline", sa.Date, nullable=True),
        sa.Column("is_rolling", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("cycle", sa.String(50), nullable=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("requirements", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("application_url", sa.String(2000), nullable=True),
        sa.Column("source_url", sa.String(2000), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("last_verified", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.execute("ALTER TABLE opportunities ADD COLUMN embedding vector(768)")

    op.create_index("ix_opp_status", "opportunities", ["status"])
    op.create_index("ix_opp_deadline", "opportunities", ["deadline"])
    op.create_index("ix_opp_funding_type", "opportunities", ["funding_type"])
    op.execute("CREATE INDEX ix_opp_regions ON opportunities USING gin(eligible_regions)")
    op.execute("CREATE INDEX ix_opp_sectors ON opportunities USING gin(eligible_sectors)")
    op.execute("""
        CREATE INDEX ix_opp_embedding ON opportunities
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # --- Matches ---
    op.create_table(
        "matches",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "profile_id",
            UUID(as_uuid=True),
            sa.ForeignKey("startup_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "opportunity_id",
            UUID(as_uuid=True),
            sa.ForeignKey("opportunities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("similarity_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("match_reasons", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("profile_id", "opportunity_id", name="uq_match_profile_opp"),
    )
    op.create_index("ix_matches_profile", "matches", ["profile_id"])
    op.create_index("ix_matches_opportunity", "matches", ["opportunity_id"])

    # --- Applications ---
    op.create_table(
        "applications",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "project_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "opportunity_id", UUID(as_uuid=True), sa.ForeignKey("opportunities.id"), nullable=False
        ),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filled_fields", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("missing_fields", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("field_confidence", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column(
            "completion_percentage", sa.Numeric(5, 2), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "narrative_sections", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")
        ),
        sa.Column("quality_scores", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_apps_project", "applications", ["project_id"])
    op.create_index("ix_apps_opportunity", "applications", ["opportunity_id"])
    op.create_index("ix_apps_status", "applications", ["status"])

    # --- Certification Jobs ---
    op.create_table(
        "certification_jobs",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "project_id",
            UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("initiated_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("jurisdictions", sa.ARRAY(sa.String), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("compliance_report", JSONB, nullable=True),
        sa.Column("compliance_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("certificate_id", sa.String(100), nullable=True),
        sa.Column("certificate_url", sa.String(2000), nullable=True),
        sa.Column("ip_report", JSONB, nullable=True),
        sa.Column("originality_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_cert_project", "certification_jobs", ["project_id"])
    op.create_index("ix_cert_status", "certification_jobs", ["status"])

    # --- Subscriptions ---
    op.create_table(
        "subscriptions",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "organization_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stripe_customer_id", sa.String(255), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), unique=True, nullable=True),
        sa.Column("plan", sa.String(20), nullable=False, server_default="free"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    # --- Refresh Tokens ---
    op.create_table(
        "refresh_tokens",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("token_hash", sa.String(255), unique=True, nullable=False),
        sa.Column("device_info", sa.String(500), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    # --- API Keys ---
    op.create_table(
        "api_keys",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("key_hash", sa.String(255), unique=True, nullable=False),
        sa.Column("key_prefix", sa.String(8), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "scopes", sa.ARRAY(sa.String), nullable=False, server_default=sa.text("ARRAY[]::text[]")
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )


def downgrade() -> None:
    op.drop_table("api_keys")
    op.drop_table("refresh_tokens")
    op.drop_table("subscriptions")
    op.drop_table("certification_jobs")
    op.drop_table("applications")
    op.drop_table("matches")
    op.drop_table("opportunities")
    op.drop_table("startup_profiles")
    op.drop_table("projects")
    op.drop_table("organization_members")
    op.drop_table("organizations")
    op.drop_table("users")
