"""Pitch Deck Certification Engine — deterministic weighted grading + designation.

The designation grade is pure arithmetic over structured evaluator inputs; it
never calls an LLM, so the printed certificate is reproducible and auditable.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from statistics import median
from typing import Any

from services.certify.app.config import settings
from services.shared.pitch_rubric import (
    GRADE_BANDS,
    PITCH_RUBRIC,
    RUBRIC_DIMENSIONS,
    RUBRIC_LABELS,
    classify_grade,
)


class PitchDeckCertificationEngine:
    """Grades pitch decks and issues designation certificates."""

    # --- Grading ---

    def weighted_score(self, criteria: dict[str, float]) -> float:
        """Compute the 0-100 weighted score from per-dimension 0-10 scores."""
        if not criteria:
            return 0.0
        total = 0.0
        for dimension, weight in PITCH_RUBRIC.items():
            raw = self._clamp(criteria.get(dimension, 0.0))
            total += (raw / 10.0) * weight
        return round(total, 2)

    def evaluate(self, criteria: dict[str, float]) -> dict[str, Any]:
        """Return the grade and a per-dimension breakdown."""
        score = self.weighted_score(criteria)
        return {
            "score": score,
            "grade": classify_grade(score),
            "rubric": [
                {
                    "dimension": dim,
                    "label": RUBRIC_LABELS[dim],
                    "weight": PITCH_RUBRIC[dim],
                    "score": self._clamp(criteria.get(dim, 0.0)),
                }
                for dim in RUBRIC_DIMENSIONS
            ],
        }

    # --- Aggregation helpers ---

    @staticmethod
    def aggregate_criteria(evaluations: list[dict[str, Any]]) -> dict[str, float]:
        """Aggregate per-evaluator criteria into per-dimension medians.

        ``evaluations`` is a list of dicts, each optionally carrying a
        ``criteria`` mapping (dimension -> 0-10). Medians are used to be robust
        against outlier evaluators.
        """
        if not evaluations:
            return {}
        dimension_values: dict[str, list[float]] = {dim: [] for dim in RUBRIC_DIMENSIONS}
        for ev in evaluations:
            criteria = ev.get("criteria") or {}
            for dim in RUBRIC_DIMENSIONS:
                if dim in criteria:
                    dimension_values[dim].append(float(criteria[dim]))
        return {
            dim: round(median(values), 2) if values else 0.0
            for dim, values in dimension_values.items()
        }

    # --- Certificate ---

    @staticmethod
    def certificate_id(submission_id: str, score: float, grade: str, issued_at: str) -> str:
        """Deterministic certificate id bound to the designation inputs."""
        payload = f"{submission_id}|{score}|{grade}|{issued_at}"
        return "CERT-" + hashlib.sha256(payload.encode()).hexdigest()[:24].upper()

    def designate(
        self,
        submission_id: str,
        criteria: dict[str, float],
        project_name: str = "",
        compliance: list[dict[str, Any]] | None = None,
        originality: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Produce a full designation result (grade + summary + certificate metadata)."""
        evaluation = self.evaluate(criteria)
        score = evaluation["score"]
        grade = evaluation["grade"]
        issued_at = datetime.now(UTC).isoformat()

        compliance_status = self._compliance_verdict(compliance or [])
        originality_verdict = (originality or {}).get("verdict", "unknown")
        originality_ok = originality_verdict not in {
            "high_similarity",
            "flagged",
            "needs_review",
        }

        cert_floor = GRADE_BANDS[-1][0]  # lowest awardable band ("Certified")
        awarded = compliance_status == "passed" and originality_ok and score >= cert_floor

        return {
            "certificate_id": self.certificate_id(submission_id, score, grade, issued_at),
            "submission_id": submission_id,
            "project_name": project_name,
            "issued_at": issued_at,
            "grade": grade,
            "score": score,
            "designation": "awarded" if awarded else "withheld",
            "rubric": evaluation["rubric"],
            "compliance": {"status": compliance_status, "results": compliance or []},
            "originality": originality or {},
            "issuer": settings.certificate_issuer_name,
            "validity_days": settings.certificate_validity_days,
        }

    # --- Internal helpers ---

    @staticmethod
    def _clamp(value: Any) -> float:
        """Clamp a raw score into the 0-10 range."""
        try:
            return max(0.0, min(10.0, float(value)))
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _compliance_verdict(results: list[dict[str, Any]]) -> str:
        """Aggregate per-jurisdiction compliance statuses into one verdict."""
        if not results:
            return "not_run"
        statuses = {r.get("status") for r in results}
        if "failed" in statuses:
            return "failed"
        if "conditional" in statuses:
            return "conditional"
        if statuses == {"passed"}:
            return "passed"
        return "not_run"
