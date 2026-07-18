"""Experience Weight Scoring — CC-EXT-MS2 P0-U03.

Computes credibility weight for each operator's feedback based on:
- Years of experience (0-0.25)
- Specialization match (0-0.25)
- Historical accuracy (0-0.30)
- Feedback consistency (0-0.20)

New operators start at 0.5 neutral weight, adjusted over time.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

from .feedback_schema import OperatorFeedback


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class ScoreBreakdown:
    """Transparent breakdown of experience score factors."""
    years_factor: float = 0.0       # 0-0.25
    specialization_factor: float = 0.0  # 0-0.25
    accuracy_factor: float = 0.0    # 0-0.30
    consistency_factor: float = 0.0  # 0-0.20

    @property
    def total(self) -> float:
        return (
            self.years_factor
            + self.specialization_factor
            + self.accuracy_factor
            + self.consistency_factor
        )

    def to_dict(self) -> dict:
        return {
            "years_factor": round(self.years_factor, 4),
            "specialization_factor": round(self.specialization_factor, 4),
            "accuracy_factor": round(self.accuracy_factor, 4),
            "consistency_factor": round(self.consistency_factor, 4),
            "total": round(self.total, 4),
        }


@dataclass
class ExperienceScore:
    """Final credibility score for an operator's feedback."""
    operator_id: str
    total: float
    breakdown: ScoreBreakdown
    feedback_count: int = 0

    def to_dict(self) -> dict:
        return {
            "operator_id": self.operator_id,
            "total": round(self.total, 4),
            "breakdown": self.breakdown.to_dict(),
            "feedback_count": self.feedback_count,
        }


# ---------------------------------------------------------------------------
# Operator history tracker
# ---------------------------------------------------------------------------

@dataclass
class _OperatorHistory:
    """Internal record of an operator's feedback history."""
    operator_id: str
    total_feedback: int = 0
    confirmed_count: int = 0  # Validated as CONFIRMED
    novel_count: int = 0      # Validated as NOVEL
    implausible_count: int = 0  # Validated as IMPLAUSIBLE
    feedback_values: dict[str, list[float]] = field(default_factory=dict)
    # Maps parameter name -> list of reported values for consistency checking

    @property
    def accuracy_rate(self) -> float:
        """Fraction of feedback validated as CONFIRMED."""
        if self.total_feedback == 0:
            return 0.5  # Neutral for new operators
        return self.confirmed_count / self.total_feedback

    @property
    def consistency_score(self) -> float:
        """Measure of self-consistency (low stddev = high consistency)."""
        if not self.feedback_values:
            return 1.0  # Neutral if no history

        consistencies = []
        for param, values in self.feedback_values.items():
            if len(values) < 2:
                continue
            mean = sum(values) / len(values)
            if mean == 0:
                continue
            variance = sum((v - mean) ** 2 for v in values) / len(values)
            cv = math.sqrt(variance) / abs(mean)  # Coefficient of variation
            # CV < 0.1 = very consistent, CV > 0.5 = inconsistent
            param_consistency = max(0.0, 1.0 - cv * 2.0)
            consistencies.append(param_consistency)

        if not consistencies:
            return 1.0
        return sum(consistencies) / len(consistencies)


# ---------------------------------------------------------------------------
# ExperienceScorer
# ---------------------------------------------------------------------------

class ExperienceScorer:
    """Scores operator credibility based on experience and track record.

    Factor weights:
    - years_of_experience: 0-0.25 (saturates at 20 years)
    - specialization_match: 0-0.25
    - historical_accuracy: 0-0.30
    - consistency: 0-0.20

    New operators start at neutral 0.5 score.
    """

    # Factor weight caps
    MAX_YEARS = 0.25
    MAX_SPECIALIZATION = 0.25
    MAX_ACCURACY = 0.30
    MAX_CONSISTENCY = 0.20

    def __init__(self):
        self._histories: dict[str, _OperatorHistory] = {}

    def compute_weight(
        self,
        operator_id: str,
        feedback: OperatorFeedback,
    ) -> ExperienceScore:
        """Compute credibility weight for an operator's feedback.

        Args:
            operator_id: Operator identifier.
            feedback: The feedback entry to score.

        Returns:
            ExperienceScore with total score (0-1) and factor breakdown.
        """
        history = self._histories.get(operator_id)

        breakdown = ScoreBreakdown(
            years_factor=self._score_years(feedback.experience_years),
            specialization_factor=self._score_specialization(
                feedback.specializations,
                feedback.operation_type,
                feedback.material,
            ),
            accuracy_factor=self._score_accuracy(history),
            consistency_factor=self._score_consistency(history),
        )

        return ExperienceScore(
            operator_id=operator_id,
            total=breakdown.total,
            breakdown=breakdown,
            feedback_count=history.total_feedback if history else 0,
        )

    def record_outcome(
        self,
        operator_id: str,
        feedback: OperatorFeedback,
        validation_tier: str,
    ) -> None:
        """Record the outcome of a validation for tracking accuracy.

        Args:
            operator_id: Operator identifier.
            feedback: The feedback entry.
            validation_tier: "confirmed", "novel", or "implausible".
        """
        if operator_id not in self._histories:
            self._histories[operator_id] = _OperatorHistory(
                operator_id=operator_id,
            )

        history = self._histories[operator_id]
        history.total_feedback += 1

        if validation_tier == "confirmed":
            history.confirmed_count += 1
        elif validation_tier == "novel":
            history.novel_count += 1
        elif validation_tier == "implausible":
            history.implausible_count += 1

        # Track parameter values for consistency
        for param, value in feedback.parameters_used.items():
            if isinstance(value, (int, float)):
                history.feedback_values.setdefault(param, []).append(float(value))

    def get_operator_stats(self, operator_id: str) -> Optional[dict]:
        """Get statistics for an operator."""
        history = self._histories.get(operator_id)
        if not history:
            return None
        return {
            "operator_id": operator_id,
            "total_feedback": history.total_feedback,
            "confirmed_count": history.confirmed_count,
            "novel_count": history.novel_count,
            "implausible_count": history.implausible_count,
            "accuracy_rate": round(history.accuracy_rate, 4),
            "consistency_score": round(history.consistency_score, 4),
        }

    # -------------------------------------------------------------------
    # Factor scoring
    # -------------------------------------------------------------------

    def _score_years(self, years: float) -> float:
        """Score years of experience (0-0.25, saturates at 20 years)."""
        if years <= 0:
            return 0.0
        # Logarithmic scaling: fast growth early, saturates
        # At 2 years: ~0.075, at 5: ~0.13, at 10: ~0.18, at 20: ~0.24
        normalized = min(1.0, math.log1p(years) / math.log1p(20.0))
        return normalized * self.MAX_YEARS

    def _score_specialization(
        self,
        specializations: list[str],
        operation_type: str,
        material: str,
    ) -> float:
        """Score specialization match (0-0.25).

        Higher when feedback matches operator's declared expertise.
        """
        if not specializations:
            return 0.125  # Neutral if not declared

        specs_lower = [s.lower().strip() for s in specializations]
        op_lower = operation_type.lower().strip()
        mat_lower = material.lower().strip()

        operation_match = any(
            op_lower in spec or spec in op_lower
            for spec in specs_lower
        )
        material_match = any(
            mat_lower in spec or spec in mat_lower
            for spec in specs_lower
        )

        if operation_match and material_match:
            return self.MAX_SPECIALIZATION
        elif operation_match or material_match:
            return self.MAX_SPECIALIZATION * 0.6
        else:
            return self.MAX_SPECIALIZATION * 0.2

    def _score_accuracy(self, history: Optional[_OperatorHistory]) -> float:
        """Score historical accuracy (0-0.30).

        New operators get neutral 0.15 (50% of max).
        """
        if history is None or history.total_feedback == 0:
            return self.MAX_ACCURACY * 0.5  # 0.15 neutral

        return history.accuracy_rate * self.MAX_ACCURACY

    def _score_consistency(self, history: Optional[_OperatorHistory]) -> float:
        """Score feedback consistency (0-0.20).

        New operators get neutral 0.10 (50% of max).
        """
        if history is None or history.total_feedback < 2:
            return self.MAX_CONSISTENCY * 0.5  # 0.10 neutral

        return history.consistency_score * self.MAX_CONSISTENCY
