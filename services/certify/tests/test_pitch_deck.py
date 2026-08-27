"""Unit tests for the pitch-deck certification engine, grading, and PDF renderer."""

from __future__ import annotations

import pytest

from services.certify.app.engine.certificate_pdf import render_certificate_pdf
from services.certify.app.engine.pitch_deck import PitchDeckCertificationEngine
from services.shared.pitch_rubric import (
    NOT_CERTIFIED_LABEL,
    PITCH_RUBRIC,
    classify_grade,
)


def _perfect() -> dict[str, float]:
    return {dim: 10.0 for dim in PITCH_RUBRIC}


def _zero() -> dict[str, float]:
    return {dim: 0.0 for dim in PITCH_RUBRIC}


class TestGrading:
    def test_weights_sum_to_100(self) -> None:
        assert sum(PITCH_RUBRIC.values()) == 100.0

    def test_perfect_scores_100(self) -> None:
        engine = PitchDeckCertificationEngine()
        assert engine.weighted_score(_perfect()) == 100.0

    def test_zero_scores_0(self) -> None:
        engine = PitchDeckCertificationEngine()
        assert engine.weighted_score(_zero()) == 0.0

    def test_empty_criteria_scores_0(self) -> None:
        engine = PitchDeckCertificationEngine()
        assert engine.weighted_score({}) == 0.0

    def test_weighted_score_math(self) -> None:
        engine = PitchDeckCertificationEngine()
        criteria = _zero()
        criteria["solution"] = 10.0  # 15% weight -> 15.0
        assert engine.weighted_score(criteria) == 15.0

    def test_clamps_out_of_range(self) -> None:
        engine = PitchDeckCertificationEngine()
        criteria = {"solution": 99.0}  # clamped to 10 -> 15.0
        assert engine.weighted_score(criteria) == 15.0


class TestGradeClassification:
    @pytest.mark.parametrize(
        ("score", "label"),
        [
            (100.0, "Very Great Distinction"),
            (90.0, "Very Great Distinction"),
            (89.9, "Great Distinction"),
            (81.0, "Great Distinction"),
            (80.9, "Distinction"),
            (71.0, "Distinction"),
            (70.9, "Certified"),
            (65.0, "Certified"),
            (64.9, NOT_CERTIFIED_LABEL),
            (0.0, NOT_CERTIFIED_LABEL),
        ],
    )
    def test_band_boundaries(self, score: float, label: str) -> None:
        assert classify_grade(score) == label


class TestDesignation:
    def test_awarded_with_clean_inputs(self) -> None:
        engine = PitchDeckCertificationEngine()
        result = engine.designate(
            "idea-1", _perfect(), "AgroPulse", [{"status": "passed"}], {"verdict": "original"}
        )
        assert result["designation"] == "awarded"
        assert result["grade"] == "Very Great Distinction"
        assert result["certificate_id"].startswith("CERT-")
        assert len(result["rubric"]) == len(PITCH_RUBRIC)

    def test_withheld_when_compliance_fails(self) -> None:
        engine = PitchDeckCertificationEngine()
        result = engine.designate(
            "idea-1", _perfect(), "X", [{"status": "failed"}], {"verdict": "original"}
        )
        assert result["designation"] == "withheld"

    def test_withheld_when_originality_flagged(self) -> None:
        engine = PitchDeckCertificationEngine()
        result = engine.designate(
            "idea-1", _perfect(), "X", [{"status": "passed"}], {"verdict": "high_similarity"}
        )
        assert result["designation"] == "withheld"

    def test_withheld_below_threshold(self) -> None:
        engine = PitchDeckCertificationEngine()
        result = engine.designate(
            "idea-1", _zero(), "X", [{"status": "passed"}], {"verdict": "original"}
        )
        assert result["designation"] == "withheld"
        assert result["grade"] == NOT_CERTIFIED_LABEL

    def test_certificate_id_deterministic(self) -> None:
        engine = PitchDeckCertificationEngine()
        a = engine.certificate_id("idea-1", 100.0, "Very Great Distinction", "2026-01-01")
        b = engine.certificate_id("idea-1", 100.0, "Very Great Distinction", "2026-01-01")
        c = engine.certificate_id("idea-2", 100.0, "Very Great Distinction", "2026-01-01")
        assert a == b
        assert a != c


class TestAggregation:
    def test_median_aggregation(self) -> None:
        engine = PitchDeckCertificationEngine()
        evaluations = [
            {"criteria": {"problem": 6.0, "solution": 8.0}},
            {"criteria": {"problem": 10.0, "solution": 6.0}},
            {"criteria": {"problem": 8.0, "solution": 7.0}},
        ]
        agg = engine.aggregate_criteria(evaluations)
        assert agg["problem"] == 8.0  # median of 6, 10, 8
        assert agg["solution"] == 7.0  # median of 8, 6, 7
        assert agg["market"] == 0.0  # absent

    def test_aggregate_empty(self) -> None:
        engine = PitchDeckCertificationEngine()
        assert engine.aggregate_criteria([]) == {}


class TestPDF:
    def test_render_returns_valid_pdf(self) -> None:
        engine = PitchDeckCertificationEngine()
        result = engine.designate(
            "idea-1", _perfect(), "AgroPulse", [{"status": "passed"}], {"verdict": "original"}
        )
        pdf = render_certificate_pdf(result)
        assert pdf[:8] == b"%PDF-1.4"
        assert pdf.endswith(b"%%EOF\n")
        assert len(pdf) > 500
