"""Tests for Experience Weight Scoring — CC-EXT-MS2 P0-U03.

Covers: years factor, specialization match, historical accuracy,
consistency, new operator neutral, score breakdown transparency.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feedback.feedback_schema import OperatorFeedback
from src.feedback.experience_scorer import (
    ExperienceScorer,
    ExperienceScore,
    ScoreBreakdown,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_feedback(**overrides) -> OperatorFeedback:
    defaults = {
        "operator_id": "OP-001",
        "experience_years": 10.0,
        "specializations": ["milling", "aluminum"],
        "operation_type": "milling",
        "material": "aluminum",
        "tool": "10mm carbide endmill",
        "tool_diameter_mm": 10.0,
        "parameters_used": {"cutting_speed": 300.0, "feed_per_tooth": 0.1},
        "outcome": "success",
    }
    defaults.update(overrides)
    return OperatorFeedback(**defaults)


@pytest.fixture
def scorer():
    return ExperienceScorer()


# ===========================================================================
# New operator (neutral weight)
# ===========================================================================

class TestNewOperator:

    def test_new_operator_neutral_score(self, scorer):
        """New operator with no history should get ~0.5 neutral score."""
        fb = _make_feedback(experience_years=5.0, specializations=["milling", "aluminum"])
        score = scorer.compute_weight("OP-NEW", fb)
        assert 0.4 <= score.total <= 0.65, f"Expected ~0.5, got {score.total}"

    def test_new_operator_zero_feedback_count(self, scorer):
        fb = _make_feedback()
        score = scorer.compute_weight("OP-NEW", fb)
        assert score.feedback_count == 0

    def test_new_operator_breakdown_available(self, scorer):
        fb = _make_feedback()
        score = scorer.compute_weight("OP-NEW", fb)
        d = score.to_dict()
        assert "breakdown" in d
        assert "years_factor" in d["breakdown"]
        assert "specialization_factor" in d["breakdown"]
        assert "accuracy_factor" in d["breakdown"]
        assert "consistency_factor" in d["breakdown"]


# ===========================================================================
# Years of experience factor
# ===========================================================================

class TestYearsFactor:

    def test_zero_years(self, scorer):
        fb = _make_feedback(experience_years=0)
        score = scorer.compute_weight("OP-001", fb)
        assert score.breakdown.years_factor == 0.0

    def test_low_years(self, scorer):
        fb = _make_feedback(experience_years=2.0)
        score = scorer.compute_weight("OP-001", fb)
        assert 0.05 < score.breakdown.years_factor < 0.15

    def test_medium_years(self, scorer):
        fb = _make_feedback(experience_years=10.0)
        score = scorer.compute_weight("OP-001", fb)
        assert 0.15 < score.breakdown.years_factor < 0.22

    def test_high_years(self, scorer):
        fb = _make_feedback(experience_years=20.0)
        score = scorer.compute_weight("OP-001", fb)
        assert score.breakdown.years_factor >= 0.20

    def test_years_saturates(self, scorer):
        fb1 = _make_feedback(experience_years=20.0)
        fb2 = _make_feedback(experience_years=40.0)
        s1 = scorer.compute_weight("OP-001", fb1)
        s2 = scorer.compute_weight("OP-001", fb2)
        # Should be very close (saturated)
        assert abs(s1.breakdown.years_factor - s2.breakdown.years_factor) < 0.03

    def test_years_monotonically_increases(self, scorer):
        prev_score = 0.0
        for years in [1, 2, 5, 10, 15, 20]:
            fb = _make_feedback(experience_years=years)
            score = scorer.compute_weight("OP-001", fb)
            assert score.breakdown.years_factor >= prev_score
            prev_score = score.breakdown.years_factor


# ===========================================================================
# Specialization match factor
# ===========================================================================

class TestSpecializationFactor:

    def test_exact_operation_and_material_match(self, scorer):
        fb = _make_feedback(
            specializations=["milling", "aluminum"],
            operation_type="milling",
            material="aluminum",
        )
        score = scorer.compute_weight("OP-001", fb)
        assert score.breakdown.specialization_factor == 0.25

    def test_operation_match_only(self, scorer):
        fb = _make_feedback(
            specializations=["milling"],
            operation_type="milling",
            material="steel",
        )
        score = scorer.compute_weight("OP-001", fb)
        assert 0.10 < score.breakdown.specialization_factor < 0.20

    def test_material_match_only(self, scorer):
        fb = _make_feedback(
            specializations=["titanium"],
            operation_type="milling",
            material="titanium",
        )
        score = scorer.compute_weight("OP-001", fb)
        assert 0.10 < score.breakdown.specialization_factor < 0.20

    def test_no_match(self, scorer):
        fb = _make_feedback(
            specializations=["grinding", "ceramics"],
            operation_type="milling",
            material="aluminum",
        )
        score = scorer.compute_weight("OP-001", fb)
        assert score.breakdown.specialization_factor <= 0.10

    def test_no_specializations_neutral(self, scorer):
        fb = _make_feedback(specializations=[])
        score = scorer.compute_weight("OP-001", fb)
        assert score.breakdown.specialization_factor == 0.125

    def test_case_insensitive(self, scorer):
        fb = _make_feedback(
            specializations=["Milling", "ALUMINUM"],
            operation_type="milling",
            material="aluminum",
        )
        score = scorer.compute_weight("OP-001", fb)
        assert score.breakdown.specialization_factor == 0.25


# ===========================================================================
# Historical accuracy factor
# ===========================================================================

class TestAccuracyFactor:

    def test_new_operator_neutral_accuracy(self, scorer):
        fb = _make_feedback()
        score = scorer.compute_weight("OP-NEW", fb)
        assert abs(score.breakdown.accuracy_factor - 0.15) < 0.01  # 50% of 0.30

    def test_high_accuracy_after_confirmed(self, scorer):
        for _ in range(10):
            fb = _make_feedback()
            scorer.record_outcome("OP-ACE", fb, "confirmed")

        fb = _make_feedback()
        score = scorer.compute_weight("OP-ACE", fb)
        assert score.breakdown.accuracy_factor > 0.25

    def test_low_accuracy_after_implausible(self, scorer):
        for _ in range(10):
            fb = _make_feedback()
            scorer.record_outcome("OP-BAD", fb, "implausible")

        fb = _make_feedback()
        score = scorer.compute_weight("OP-BAD", fb)
        assert score.breakdown.accuracy_factor < 0.05

    def test_mixed_accuracy(self, scorer):
        for _ in range(7):
            scorer.record_outcome("OP-MIX", _make_feedback(), "confirmed")
        for _ in range(3):
            scorer.record_outcome("OP-MIX", _make_feedback(), "implausible")

        fb = _make_feedback()
        score = scorer.compute_weight("OP-MIX", fb)
        # 7/10 = 0.7 accuracy → 0.7 * 0.30 = 0.21
        assert 0.18 < score.breakdown.accuracy_factor < 0.24

    def test_accuracy_improves_over_time(self, scorer):
        # Start with some bad feedback
        for _ in range(3):
            scorer.record_outcome("OP-IMPROVE", _make_feedback(), "implausible")
        fb = _make_feedback()
        s1 = scorer.compute_weight("OP-IMPROVE", fb)

        # Now add confirmed feedback
        for _ in range(10):
            scorer.record_outcome("OP-IMPROVE", _make_feedback(), "confirmed")
        s2 = scorer.compute_weight("OP-IMPROVE", fb)

        assert s2.breakdown.accuracy_factor > s1.breakdown.accuracy_factor


# ===========================================================================
# Consistency factor
# ===========================================================================

class TestConsistencyFactor:

    def test_new_operator_neutral_consistency(self, scorer):
        fb = _make_feedback()
        score = scorer.compute_weight("OP-NEW", fb)
        assert abs(score.breakdown.consistency_factor - 0.10) < 0.01

    def test_consistent_operator_high_score(self, scorer):
        # Report similar values each time
        for i in range(5):
            fb = _make_feedback(
                parameters_used={"cutting_speed": 300.0 + i, "feed": 0.1}
            )
            scorer.record_outcome("OP-STEADY", fb, "confirmed")

        fb = _make_feedback()
        score = scorer.compute_weight("OP-STEADY", fb)
        assert score.breakdown.consistency_factor > 0.15

    def test_inconsistent_operator_low_score(self, scorer):
        # Report wildly varying values
        speeds = [100, 500, 200, 800, 50]
        for spd in speeds:
            fb = _make_feedback(
                parameters_used={"cutting_speed": float(spd), "feed": 0.1}
            )
            scorer.record_outcome("OP-WILD", fb, "confirmed")

        fb = _make_feedback()
        score = scorer.compute_weight("OP-WILD", fb)
        assert score.breakdown.consistency_factor <= 0.10


# ===========================================================================
# Overall score range
# ===========================================================================

class TestOverallScore:

    def test_score_bounded_0_1(self, scorer):
        """Total score should always be in [0, 1]."""
        # Best case
        for _ in range(20):
            fb = _make_feedback(
                experience_years=25, specializations=["milling", "aluminum"]
            )
            scorer.record_outcome("OP-BEST", fb, "confirmed")

        fb = _make_feedback(experience_years=25, specializations=["milling", "aluminum"])
        score = scorer.compute_weight("OP-BEST", fb)
        assert 0.0 <= score.total <= 1.0

        # Worst case
        for _ in range(20):
            scorer.record_outcome("OP-WORST", _make_feedback(experience_years=0, specializations=[]), "implausible")

        fb = _make_feedback(experience_years=0, specializations=["grinding"])
        score = scorer.compute_weight("OP-WORST", fb)
        assert 0.0 <= score.total <= 1.0

    def test_experienced_specialist_high_weight(self, scorer):
        """25-year milling specialist with 100% accuracy → high score."""
        for _ in range(20):
            fb = _make_feedback(
                parameters_used={"cutting_speed": 300.0, "feed": 0.1}
            )
            scorer.record_outcome("OP-EXPERT", fb, "confirmed")

        fb = _make_feedback(
            experience_years=25,
            specializations=["milling", "aluminum"],
        )
        score = scorer.compute_weight("OP-EXPERT", fb)
        assert score.total > 0.80

    def test_novice_generalist_low_weight(self, scorer):
        """1-year operator, no specialization, no history → low-mid score."""
        fb = _make_feedback(
            experience_years=1.0,
            specializations=[],
        )
        score = scorer.compute_weight("OP-NOVICE", fb)
        assert score.total < 0.50


# ===========================================================================
# Operator stats
# ===========================================================================

class TestOperatorStats:

    def test_stats_for_known_operator(self, scorer):
        for _ in range(3):
            scorer.record_outcome("OP-STATS", _make_feedback(), "confirmed")
        scorer.record_outcome("OP-STATS", _make_feedback(), "novel")

        stats = scorer.get_operator_stats("OP-STATS")
        assert stats is not None
        assert stats["total_feedback"] == 4
        assert stats["confirmed_count"] == 3
        assert stats["novel_count"] == 1
        assert stats["implausible_count"] == 0
        assert stats["accuracy_rate"] == 0.75

    def test_stats_for_unknown_operator(self, scorer):
        assert scorer.get_operator_stats("OP-NOBODY") is None


# ===========================================================================
# Serialization
# ===========================================================================

class TestSerialization:

    def test_score_to_dict(self, scorer):
        fb = _make_feedback()
        score = scorer.compute_weight("OP-001", fb)
        d = score.to_dict()
        assert "operator_id" in d
        assert "total" in d
        assert "breakdown" in d
        assert "feedback_count" in d

    def test_breakdown_to_dict(self, scorer):
        fb = _make_feedback()
        score = scorer.compute_weight("OP-001", fb)
        d = score.breakdown.to_dict()
        assert set(d.keys()) == {
            "years_factor", "specialization_factor",
            "accuracy_factor", "consistency_factor", "total",
        }
        assert abs(d["total"] - sum(d[k] for k in d if k != "total")) < 0.001
