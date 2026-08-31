"""Incubate Service — Matching and Grant Writing Routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.incubate.app.engine.autofill import AutofillEngine
from services.incubate.app.engine.matching import MatchingEngine
from services.incubate.app.engine.writer import GrantWriterEngine
from services.incubate.app.schemas.incubate import (
    AutofillRequest,
    AutofillResponse,
    GrantSectionPrompt,
    GrantSectionResponse,
    MatchRequest,
    MatchResponse,
    OpportunityMatchItem,
    OpportunityResponse,
)
from services.platform.app.models.platform import Opportunity, StartupProfile
from services.shared.auth_middleware import get_current_user
from services.shared.exceptions import NotFoundError
from services.shared.user_models import User

router = APIRouter(tags=["matching_and_writing"])

matching_engine = MatchingEngine()
autofill_engine = AutofillEngine()
grant_writer_engine = GrantWriterEngine()


def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


@router.post("/match", response_model=MatchResponse)
async def match_opportunities(
    request: Request,
    body: MatchRequest,
    current_user: User = Depends(get_current_user),
) -> MatchResponse:
    """Run AI matching between project profile and available opportunities."""
    session = _get_session(request)

    # 1. Fetch startup profile
    result = await session.execute(
        select(StartupProfile).where(StartupProfile.project_id == body.project_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise NotFoundError(resource="StartupProfile", resource_id=str(body.project_id))

    profile_dict = {
        "company_name": profile.company_name,
        "industry": profile.industry,
        "stage": profile.stage,
        "country": profile.country,
        "region": profile.region,
        "problem_statement": profile.problem_statement,
        "solution_description": profile.solution_description,
        "technologies": profile.technologies,
        "annual_revenue": float(profile.annual_revenue),
        "jobs_created": profile.jobs_created,
    }

    # 2. Fetch active opportunities
    opp_result = await session.execute(
        select(Opportunity).where(Opportunity.status == "active").limit(50)
    )
    opportunities = opp_result.scalars().all()

    matches: list[OpportunityMatchItem] = []
    for opp in opportunities:
        opp_dict = {
            "title": opp.title,
            "funder": opp.funder,
            "funding_type": opp.funding_type,
            "eligible_regions": opp.eligible_regions,
            "eligible_sectors": opp.eligible_sectors,
            "eligible_stages": opp.eligible_stages,
            "description": opp.description,
        }
        score_data = matching_engine.score_match(profile_dict, opp_dict)
        if score_data["similarity_score"] >= body.min_score:
            matches.append(
                OpportunityMatchItem(
                    opportunity=OpportunityResponse.model_validate(opp),
                    similarity_score=score_data["similarity_score"],
                    eligibility_passed=score_data["eligibility_passed"],
                    reasons=score_data["reasons"],
                    strengths=score_data["strengths"],
                    gaps=score_data["gaps"],
                )
            )

    matches.sort(key=lambda m: m.similarity_score, reverse=True)
    top_matches = matches[: body.top_k]

    return MatchResponse(
        project_id=body.project_id,
        total_matches=len(top_matches),
        matches=top_matches,
    )


@router.post("/autofill", response_model=AutofillResponse)
async def autofill_application(
    request: Request,
    body: AutofillRequest,
    current_user: User = Depends(get_current_user),
) -> AutofillResponse:
    """Autofill grant application fields from startup profile."""
    session = _get_session(request)
    result = await session.execute(
        select(StartupProfile).where(StartupProfile.project_id == body.project_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise NotFoundError(resource="StartupProfile", resource_id=str(body.project_id))

    profile_dict = {
        "company_name": profile.company_name,
        "legal_name": profile.legal_name,
        "industry": profile.industry,
        "stage": profile.stage,
        "country": profile.country,
        "team_size": profile.team_size,
        "problem_statement": profile.problem_statement,
        "solution_description": profile.solution_description,
        "annual_revenue": str(profile.annual_revenue),
        "jobs_created": profile.jobs_created,
        "website": profile.website,
        "impact_statement": profile.impact_statement,
        "technologies": profile.technologies,
    }

    target_fields_dicts = [f.model_dump() for f in body.target_fields]
    autofill_result = autofill_engine.autofill(profile_dict, target_fields_dicts)

    return AutofillResponse(
        project_id=body.project_id,
        opportunity_id=body.opportunity_id,
        filled_fields=autofill_result["filled_fields"],
        overall_confidence=autofill_result["overall_confidence"],
        missing_fields=autofill_result["missing_fields"],
    )


@router.post("/write-section", response_model=GrantSectionResponse)
async def write_grant_section(
    request: Request,
    body: GrantSectionPrompt,
    current_user: User = Depends(get_current_user),
) -> GrantSectionResponse:
    """Generate high-converting grant narrative section using Gemini AI."""
    session = _get_session(request)

    profile_res = await session.execute(
        select(StartupProfile).where(StartupProfile.project_id == body.project_id)
    )
    profile = profile_res.scalar_one_or_none()
    if profile is None:
        raise NotFoundError(resource="StartupProfile", resource_id=str(body.project_id))

    opp_res = await session.execute(
        select(Opportunity).where(Opportunity.id == body.opportunity_id)
    )
    opp = opp_res.scalar_one_or_none()
    if opp is None:
        raise NotFoundError(resource="Opportunity", resource_id=str(body.opportunity_id))

    profile_dict = {
        "company_name": profile.company_name,
        "industry": profile.industry,
        "stage": profile.stage,
        "country": profile.country,
        "problem_statement": profile.problem_statement,
        "solution_description": profile.solution_description,
        "technologies": profile.technologies,
        "impact_statement": profile.impact_statement,
        "target_markets": profile.target_markets,
        "team_size": profile.team_size,
        "annual_revenue": str(profile.annual_revenue),
        "jobs_created": profile.jobs_created,
    }

    opp_dict = {
        "title": opp.title,
        "funder": opp.funder,
        "funding_type": opp.funding_type,
        "description": opp.description,
    }

    section_output = await grant_writer_engine.generate_section(
        section_name=body.section_name,
        profile=profile_dict,
        opportunity=opp_dict,
        max_words=body.max_words,
        additional_context=body.additional_context,
        tone=body.tone,
    )

    return GrantSectionResponse(
        section_name=body.section_name,
        content=section_output.get("content", ""),
        word_count=section_output.get("word_count", 0),
        readability_score=section_output.get("readability_score", 0.90),
        key_points_covered=section_output.get("key_points_covered", []),
        suggested_improvements=section_output.get("suggested_improvements", []),
    )
