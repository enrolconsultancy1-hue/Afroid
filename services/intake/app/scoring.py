"""Intake scoring helpers — per-dimension median aggregation."""

from __future__ import annotations

import statistics

from services.intake.app.models.intake import PitchEvaluation
from services.shared.pitch_rubric import RUBRIC_DIMENSIONS


def rubric_breakdown(evaluations: list[PitchEvaluation]) -> dict[str, float]:
    """Compute per-dimension median scores across evaluators.

    Medians are robust against outlier evaluators and feed the certify
    designation engine.
    """
    dimension_values: dict[str, list[float]] = {dim: [] for dim in RUBRIC_DIMENSIONS}
    for ev in evaluations:
        criteria = ev.criteria or {}
        for dim in RUBRIC_DIMENSIONS:
            raw = criteria.get(dim)
            if isinstance(raw, (int, float)) and not isinstance(raw, bool):
                dimension_values[dim].append(float(raw))
    return {
        dim: round(statistics.median(values), 2)
        for dim, values in dimension_values.items()
        if values
    }
