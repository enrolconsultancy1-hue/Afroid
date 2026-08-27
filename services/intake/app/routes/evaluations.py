"""Intake Service — pitch evaluation routes (phase 2)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.intake.app.auth import get_current_user
from services.intake.app.models.intake import EvaluatorProfile, IdeaSubmission, PitchEvaluation
from services.intake.app.schemas.intake import (
    PitchEvaluationRequest,
    PitchEvaluationResponse,
    ScoreResponse,
)
from services.shared.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
)

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


def _session(request: Request) -> AsyncSession:
    return request.state.db_session


async def _approved_evaluator(session: AsyncSession, user_id: uuid.UUID) -> EvaluatorProfile:
    """Resolve and validate the authenticated user's approved evaluator profile."""
    result = await session.execute(
        select(EvaluatorProfile).where(EvaluatorProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise ForbiddenError(detail="You must register as an evaluator first.")
    if profile.status != "approved":
        raise ForbiddenError(detail="Your evaluator profile is not approved yet.")
    return profile


@router.post("", response_model=PitchEvaluationResponse, status_code=201)
async def submit_evaluation(
    request: Request,
    body: PitchEvaluationRequest,
    user_id: uuid.UUID = Depends(get_current_user),
) -> PitchEvaluationResponse:
    """Submit a scored evaluation of a pitch deck."""
    session = _session(request)
    evaluator = await _approved_evaluator(session, user_id)

    submission = await session.get(IdeaSubmission, body.submission_id)
    if submission is None:
        raise NotFoundError(resource="IdeaSubmission", resource_id=str(body.submission_id))

    # No self-evaluation: an evaluator cannot score their own submitted idea.
    if submission.submitted_by is not None and submission.submitted_by == user_id:
        raise ForbiddenError(detail="You cannot evaluate your own submission.")

    # Prevent duplicate evaluation (also enforced by a unique constraint).
    dup = await session.execute(
        select(PitchEvaluation).where(
            PitchEvaluation.submission_id == body.submission_id,
            PitchEvaluation.evaluator_id == evaluator.id,
        )
    )
    if dup.scalar_one_or_none() is not None:
        raise ConflictError(detail="You have already evaluated this submission.")

    evaluation = PitchEvaluation(
        submission_id=body.submission_id,
        evaluator_id=evaluator.id,
        score=body.score,
        criteria=body.criteria,
        comments=body.comments,
    )
    session.add(evaluation)
    await session.flush()
    await session.refresh(evaluation)
    return PitchEvaluationResponse.model_validate(evaluation)


@router.get("", response_model=list[PitchEvaluationResponse])
async def list_evaluations(
    request: Request,
    submission_id: uuid.UUID | None = None,
    limit: int = Query(default=100, ge=1, le=500),
) -> list[PitchEvaluationResponse]:
    """List evaluations, optionally filtered by submission."""
    session = _session(request)
    query = select(PitchEvaluation).order_by(PitchEvaluation.created_at.asc())
    if submission_id:
        query = query.where(PitchEvaluation.submission_id == submission_id)
    query = query.limit(limit)
    result = await session.execute(query)
    return [PitchEvaluationResponse.model_validate(e) for e in result.scalars().all()]


@router.get("/score/{submission_id}", response_model=ScoreResponse)
async def get_score(request: Request, submission_id: uuid.UUID) -> ScoreResponse:
    """Aggregate score for a submission (input to the certify designation certificate)."""
    session = _session(request)
    submission = await session.get(IdeaSubmission, submission_id)
    if submission is None:
        raise NotFoundError(resource="IdeaSubmission", resource_id=str(submission_id))
    result = await session.execute(
        select(PitchEvaluation)
        .where(PitchEvaluation.submission_id == submission_id)
        .order_by(PitchEvaluation.created_at.asc())
    )
    evaluations = result.scalars().all()
    scores = [float(e.score) for e in evaluations if e.score is not None]
    average = round(sum(scores) / len(scores), 2) if scores else None
    return ScoreResponse(
        submission_id=submission_id,
        score_count=len(evaluations),
        average_score=average,
        evaluations=[PitchEvaluationResponse.model_validate(e) for e in evaluations],
    )
