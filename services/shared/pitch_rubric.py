"""Shared pitch-deck evaluation rubric — single source of truth for grading.

The intake service validates evaluator ``criteria`` against these dimensions,
and the certify service computes the weighted grade from the same table, so the
designation is reproducible end-to-end.
"""

from __future__ import annotations

# Dimension -> weight (percent). Weights MUST sum to 100.
PITCH_RUBRIC: dict[str, float] = {
    "problem": 10.0,  # Problem & urgency
    "solution": 15.0,  # Solution & value proposition
    "market": 10.0,  # Market size & opportunity
    "product": 10.0,  # Product / technology / moat
    "business_model": 10.0,  # Business model & unit economics
    "traction": 10.0,  # Traction & validation
    "team": 10.0,  # Team & founder-market fit
    "competition": 10.0,  # Competition & go-to-market
    "financials": 10.0,  # Financials & the ask
    "clarity": 5.0,  # Clarity, storytelling & design
}

RUBRIC_DIMENSIONS: tuple[str, ...] = tuple(PITCH_RUBRIC)

# Dimension -> human label (for certificate display).
RUBRIC_LABELS: dict[str, str] = {
    "problem": "Problem & Urgency",
    "solution": "Solution & Value Proposition",
    "market": "Market Size & Opportunity",
    "product": "Product & Technology / Moat",
    "business_model": "Business Model & Unit Economics",
    "traction": "Traction & Validation",
    "team": "Team & Founder-Market Fit",
    "competition": "Competition & Go-to-Market",
    "financials": "Financials & The Ask",
    "clarity": "Clarity, Storytelling & Design",
}

# Grade bands: (minimum_score, label), descending order.
GRADE_BANDS: tuple[tuple[float, str], ...] = (
    (90.0, "Very Great Distinction"),
    (81.0, "Great Distinction"),
    (71.0, "Distinction"),
    (65.0, "Certified"),
)

NOT_CERTIFIED_LABEL: str = "Not Certified"


def classify_grade(score: float) -> str:
    """Map a 0-100 weighted score to its printed grade label."""
    for minimum, label in GRADE_BANDS:
        if score >= minimum:
            return label
    return NOT_CERTIFIED_LABEL
