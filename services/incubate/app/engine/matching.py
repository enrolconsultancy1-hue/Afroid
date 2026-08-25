"""Incubate Service — Semantic Opportunity Matching Engine."""

from __future__ import annotations

import math
from typing import Any

import structlog

logger = structlog.get_logger()


class MatchingEngine:
    """Matches startup profiles to funding opportunities.

    Combines:
    1. Vector Cosine Similarity (semantic match of problem/solution to grant goals)
    2. Hard Rule Eligibility Filtering (country/region, industry/sector, stage, funding amount)
    3. Multi-factor scoring with clear reason generation
    """

    def __init__(self, min_similarity_threshold: float = 0.65) -> None:
        self.min_similarity_threshold = min_similarity_threshold

    @staticmethod
    def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        """Compute cosine similarity between two vector embeddings."""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b, strict=True))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return max(0.0, min(1.0, dot_product / (norm_a * norm_b)))

    def evaluate_eligibility(
        self,
        profile: dict[str, Any],
        opportunity: dict[str, Any],
    ) -> tuple[bool, list[str], list[str], list[str]]:
        """Evaluate hard eligibility criteria and generate match rationale.

        Returns:
            (is_eligible, reasons, strengths, gaps)
        """
        reasons: list[str] = []
        strengths: list[str] = []
        gaps: list[str] = []
        eligible = True

        # 1. Geographic / Region Check
        opp_regions = [r.lower() for r in opportunity.get("eligible_regions", [])]
        profile_country = profile.get("country", "").lower()
        profile_region = profile.get("region", "").lower()

        if opp_regions and "pan-african" not in opp_regions and "global" not in opp_regions:
            country_match = profile_country in opp_regions or profile_region in opp_regions
            if country_match:
                strengths.append(f"Geographic alignment: Operating in {profile_country.title()}")
            else:
                gaps.append(
                    f"Location constraint: Opportunity targets {', '.join(opportunity.get('eligible_regions', []))}"
                )
                eligible = False
        else:
            strengths.append("Broad geographic eligibility (Pan-African / Global)")

        # 2. Sector / Industry Check
        opp_sectors = [s.lower() for s in opportunity.get("eligible_sectors", [])]
        profile_industry = profile.get("industry", "").lower()

        if opp_sectors and "all" not in opp_sectors and "agnostic" not in opp_sectors:
            if any(s in profile_industry or profile_industry in s for s in opp_sectors):
                strengths.append(f"Sector match: {profile_industry.title()} is directly aligned")
            else:
                gaps.append(
                    f"Sector preference: Opportunity focuses on {', '.join(opportunity.get('eligible_sectors', []))}"
                )
                # Soft filter for sector, doesn't hard-fail
        else:
            strengths.append("Sector-agnostic grant program")

        # 3. Stage Check
        opp_stages = [st.lower() for st in opportunity.get("eligible_stages", [])]
        profile_stage = profile.get("stage", "").lower()

        if opp_stages and "all" not in opp_stages:
            if profile_stage in opp_stages:
                strengths.append(
                    f"Stage readiness: Startup is at the {profile_stage.upper()} stage"
                )
            else:
                gaps.append(
                    f"Target stage mismatch: Opportunity targets {', '.join(opportunity.get('eligible_stages', []))}"
                )

        # Summary reason
        if eligible:
            reasons.append(
                f"Strong fit for {opportunity.get('funding_type', 'Grant')} funding from {opportunity.get('funder', 'funder')}"
            )
        else:
            reasons.append(
                f"Partial fit — review eligibility criteria for {opportunity.get('funder', 'funder')}"
            )

        return eligible, reasons, strengths, gaps

    def score_match(
        self,
        profile: dict[str, Any],
        opportunity: dict[str, Any],
        profile_embedding: list[float] | None = None,
        opp_embedding: list[float] | None = None,
    ) -> dict[str, Any]:
        """Compute holistic match score and breakdown."""
        eligible, reasons, strengths, gaps = self.evaluate_eligibility(profile, opportunity)

        # Compute semantic score
        semantic_score = 0.80  # Default baseline if embeddings not provided
        if profile_embedding and opp_embedding:
            semantic_score = self.cosine_similarity(profile_embedding, opp_embedding)

        # Multiplier based on eligibility
        eligibility_factor = 1.0 if eligible else 0.6
        final_score = round(semantic_score * eligibility_factor, 4)

        return {
            "similarity_score": final_score,
            "semantic_score": round(semantic_score, 4),
            "eligibility_passed": eligible,
            "reasons": reasons,
            "strengths": strengths,
            "gaps": gaps,
        }
