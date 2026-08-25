"""Unit tests for Platform service schemas and models."""

from __future__ import annotations

from slugify import slugify

from services.platform.app.schemas.platform import (
    CreateOrganizationRequest,
    CreateProjectRequest,
    CreateStartupProfileRequest,
)


class TestPlatformSchemas:
    """Test validation of platform request and response schemas."""

    def test_create_project_validation(self) -> None:
        req = CreateProjectRequest(
            name="Fintech Solution",
            description="Mobile payment gateway",
        )
        assert req.name == "Fintech Solution"
        assert req.description == "Mobile payment gateway"
        assert slugify(req.name) == "fintech-solution"

    def test_startup_profile_validation(self) -> None:
        profile_req = CreateStartupProfileRequest(
            company_name="AfroPay",
            industry="fintech",
            country="nigeria",
            team_size=5,
            problem_statement="High cross-border transaction fees.",
            solution_description="Decentralized liquidity routing mechanism.",
            technologies=["Python", "FastAPI", "React"],
        )
        assert profile_req.company_name == "AfroPay"
        assert profile_req.team_size == 5
        assert len(profile_req.technologies) == 3

    def test_organization_schema_validation(self) -> None:
        org_req = CreateOrganizationRequest(name="Lagos Tech Ventures")
        assert org_req.name == "Lagos Tech Ventures"
