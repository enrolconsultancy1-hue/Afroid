"""Unit tests for the Incubate matching engine and autofill engine."""

from __future__ import annotations

import pytest

from services.incubate.app.engine.autofill import AutofillEngine
from services.incubate.app.engine.matching import MatchingEngine


class TestMatchingEngine:
    """Tests for opportunity matching and eligibility scoring."""

    @pytest.fixture
    def engine(self) -> MatchingEngine:
        return MatchingEngine(min_similarity_threshold=0.65)

    @pytest.fixture
    def sample_profile(self) -> dict:
        return {
            "company_name": "AgroPulse AI",
            "industry": "agritech",
            "stage": "mvp",
            "country": "kenya",
            "region": "east africa",
            "problem_statement": "Smallholder farmers lack predictive pest outbreak analytics.",
            "solution_description": "Satellite imagery and local soil sensor telemetry alerting farmers via SMS.",
            "technologies": ["Computer Vision", "FastAPI", "PostgreSQL"],
            "annual_revenue": 15000,
            "jobs_created": 6,
        }

    @pytest.fixture
    def sample_opportunity(self) -> dict:
        return {
            "title": "East Africa Agricultural Resilience Fund",
            "funder": "Alliance for a Green Revolution in Africa",
            "funding_type": "Grant",
            "eligible_regions": ["Kenya", "Uganda", "Tanzania", "Rwanda"],
            "eligible_sectors": ["Agriculture", "Agritech", "Climate"],
            "eligible_stages": ["MVP", "Seed", "Early"],
            "description": "Catalytic grant funding for innovative agricultural technologies in East Africa.",
        }

    def test_eligibility_evaluation_pass(
        self, engine: MatchingEngine, sample_profile: dict, sample_opportunity: dict
    ) -> None:
        eligible, _, strengths, gaps = engine.evaluate_eligibility(
            sample_profile, sample_opportunity
        )
        assert eligible is True
        assert len(strengths) >= 2
        assert len(gaps) == 0

    def test_location_mismatch_fails_eligibility(
        self, engine: MatchingEngine, sample_profile: dict, sample_opportunity: dict
    ) -> None:
        sample_profile["country"] = "nigeria"
        sample_profile["region"] = "west africa"
        eligible, _, _, gaps = engine.evaluate_eligibility(sample_profile, sample_opportunity)
        assert eligible is False
        assert len(gaps) >= 1
        assert any("Location constraint" in g for g in gaps)

    def test_cosine_similarity_computation(self, engine: MatchingEngine) -> None:
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [1.0, 0.0, 0.0]
        assert engine.cosine_similarity(vec1, vec2) == 1.0

        vec3 = [0.0, 1.0, 0.0]
        assert engine.cosine_similarity(vec1, vec3) == 0.0


class TestAutofillEngine:
    """Tests for grant form autofill mapping."""

    @pytest.fixture
    def engine(self) -> AutofillEngine:
        return AutofillEngine()

    def test_autofill_exact_and_alias_matching(self, engine: AutofillEngine) -> None:
        profile = {
            "company_name": "AfroHealth",
            "legal_name": "AfroHealth Technologies Ltd",
            "industry": "Healthtech",
            "country": "Nigeria",
            "team_size": 12,
            "problem_statement": "High maternal mortality in rural clinics.",
            "solution_description": "Telemedicine diagnostics and ambulance dispatch system.",
            "website": "https://afrohealth.io",
        }

        target_fields = [
            {"field_name": "Applicant Organization Name"},
            {"field_name": "Corporate Legal Name"},
            {"field_name": "Sector / Vertical"},
            {"field_name": "Country of Incorporation"},
            {"field_name": "Problem Addressed"},
            {"field_name": "Proposed Solution"},
            {"field_name": "Custom Unmatched Field"},
        ]

        result = engine.autofill(profile, target_fields)
        assert len(result["filled_fields"]) == 6
        assert len(result["missing_fields"]) == 1
        assert result["missing_fields"][0] == "Custom Unmatched Field"
        assert result["overall_confidence"] >= 0.90
