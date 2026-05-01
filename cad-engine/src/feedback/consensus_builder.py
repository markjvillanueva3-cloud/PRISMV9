"""Consensus Building from Multiple Operators — CC-EXT-MS2 P0-U04.

Aggregates feedback from multiple operators for the same operation/material/tool
combination. Uses experience-weighted averaging, confidence scoring, and
outlier detection.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

from .feedback_schema import OperatorFeedback
from .experience_scorer import ExperienceScorer, ExperienceScore


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class ParameterConsensus:
    """Consensus value for a single parameter."""
    name: str
    weighted_mean: float
    weighted_stddev: float
    min_val: float
    max_val: float
    confidence_interval: tuple[float, float] = (0.0, 0.0)
    sample_count: int = 0

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "weighted_mean": round(self.weighted_mean, 4),
            "weighted_stddev": round(self.weighted_stddev, 4),
            "min": round(self.min_val, 4),
            "max": round(self.max_val, 4),
            "confidence_interval": (
                round(self.confidence_interval[0], 4),
                round(self.confidence_interval[1], 4),
            ),
            "sample_count": self.sample_count,
        }


@dataclass
class OutlierEntry:
    """An outlier detected in consensus building."""
    operator_id: str
    parameter: str
    value: float
    consensus_mean: float
    deviation_stddevs: float
    feedback_id: str = ""

    def to_dict(self) -> dict:
        return {
            "operator_id": self.operator_id,
            "parameter": self.parameter,
            "value": round(self.value, 4),
            "consensus_mean": round(self.consensus_mean, 4),
            "deviation_stddevs": round(self.deviation_stddevs, 2),
            "feedback_id": self.feedback_id,
        }


@dataclass
class ConsensusResult:
    """Full consensus result for one operation/material/tool group."""
    operation_type: str
    material: str
    tool: str
    recommended_params: dict[str, ParameterConsensus] = field(default_factory=dict)
    confidence: float = 0.0  # 0-1
    num_contributors: int = 0
    outlier_count: int = 0
    outliers: list[OutlierEntry] = field(default_factory=list)
    contributing_operators: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "operation_type": self.operation_type,
            "material": self.material,
            "tool": self.tool,
            "recommended_params": {
                k: v.to_dict() for k, v in self.recommended_params.items()
            },
            "confidence": round(self.confidence, 4),
            "num_contributors": self.num_contributors,
            "outlier_count": self.outlier_count,
            "outliers": [o.to_dict() for o in self.outliers],
            "contributing_operators": self.contributing_operators,
        }


# ---------------------------------------------------------------------------
# ConsensusBuilder
# ---------------------------------------------------------------------------

class ConsensusBuilder:
    """Builds consensus from multiple operator feedback entries.

    Groups feedback by operation+material+tool, computes weighted
    parameter averages using experience scores, detects outliers,
    and produces confidence-scored consensus.
    """

    # Minimum operators for high confidence
    MIN_HIGH_CONFIDENCE_OPERATORS = 3
    # Outlier threshold in weighted standard deviations
    OUTLIER_THRESHOLD_STDDEVS = 2.0

    def __init__(self, scorer: Optional[ExperienceScorer] = None):
        self._scorer = scorer or ExperienceScorer()

    def build_consensus(
        self,
        entries: list[OperatorFeedback],
        group_by_tool: bool = False,
    ) -> list[ConsensusResult]:
        """Build consensus from a list of feedback entries.

        Args:
            entries: Feedback entries to aggregate.
            group_by_tool: If True, group by operation+material+tool.
                           If False, group by operation+material only.

        Returns:
            List of ConsensusResult, one per group.
        """
        groups = self._group_entries(entries, group_by_tool)
        results = []
        for key, group_entries in groups.items():
            result = self._build_group_consensus(key, group_entries)
            results.append(result)
        return results

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    def _group_entries(
        self,
        entries: list[OperatorFeedback],
        group_by_tool: bool,
    ) -> dict[tuple[str, str, str], list[OperatorFeedback]]:
        """Group feedback by operation+material(+tool)."""
        groups: dict[tuple[str, str, str], list[OperatorFeedback]] = {}
        for fb in entries:
            op = fb.operation_type.lower().strip()
            mat = fb.material.lower().strip()
            tool = fb.tool.lower().strip() if group_by_tool else ""
            key = (op, mat, tool)
            groups.setdefault(key, []).append(fb)
        return groups

    def _build_group_consensus(
        self,
        key: tuple[str, str, str],
        entries: list[OperatorFeedback],
    ) -> ConsensusResult:
        """Build consensus for one group of feedback entries."""
        operation_type, material, tool = key
        result = ConsensusResult(
            operation_type=operation_type,
            material=material,
            tool=tool,
        )

        # Compute experience weights for each entry
        weights: list[float] = []
        operators: set[str] = set()
        for fb in entries:
            score = self._scorer.compute_weight(fb.operator_id, fb)
            weights.append(max(score.total, 0.01))  # Floor at 0.01
            operators.add(fb.operator_id)

        result.num_contributors = len(operators)
        result.contributing_operators = sorted(operators)

        # Collect all parameter names across entries
        all_params: set[str] = set()
        for fb in entries:
            all_params.update(fb.parameters_used.keys())

        # Build consensus for each parameter
        for param in sorted(all_params):
            values: list[float] = []
            param_weights: list[float] = []
            operator_ids: list[str] = []
            feedback_ids: list[str] = []

            for i, fb in enumerate(entries):
                val = fb.parameters_used.get(param)
                if val is not None and isinstance(val, (int, float)):
                    values.append(float(val))
                    param_weights.append(weights[i])
                    operator_ids.append(fb.operator_id)
                    feedback_ids.append(fb.feedback_id)

            if not values:
                continue

            # Weighted mean
            total_weight = sum(param_weights)
            if total_weight == 0:
                continue

            w_mean = sum(v * w for v, w in zip(values, param_weights)) / total_weight

            # Weighted standard deviation
            if len(values) >= 2:
                w_var = sum(
                    w * (v - w_mean) ** 2 for v, w in zip(values, param_weights)
                ) / total_weight
                w_stddev = math.sqrt(w_var)
            else:
                w_stddev = 0.0

            # Confidence interval (mean +/- 1 stddev)
            ci = (w_mean - w_stddev, w_mean + w_stddev)

            pc = ParameterConsensus(
                name=param,
                weighted_mean=w_mean,
                weighted_stddev=w_stddev,
                min_val=min(values),
                max_val=max(values),
                confidence_interval=ci,
                sample_count=len(values),
            )
            result.recommended_params[param] = pc

            # Outlier detection
            if w_stddev > 0 and len(values) >= 3:
                for j, val in enumerate(values):
                    deviation = abs(val - w_mean) / w_stddev
                    if deviation > self.OUTLIER_THRESHOLD_STDDEVS:
                        result.outliers.append(OutlierEntry(
                            operator_id=operator_ids[j],
                            parameter=param,
                            value=val,
                            consensus_mean=w_mean,
                            deviation_stddevs=deviation,
                            feedback_id=feedback_ids[j],
                        ))

        result.outlier_count = len(result.outliers)

        # Overall confidence scoring
        result.confidence = self._compute_confidence(
            num_contributors=result.num_contributors,
            weights=weights,
            params=result.recommended_params,
        )

        return result

    def _compute_confidence(
        self,
        num_contributors: int,
        weights: list[float],
        params: dict[str, ParameterConsensus],
    ) -> float:
        """Compute overall confidence (0-1).

        Higher when:
        - More contributors
        - Higher-weight contributors
        - Lower parameter variance (tighter agreement)
        """
        # Factor 1: Contributor count (0-0.4)
        count_factor = min(
            num_contributors / self.MIN_HIGH_CONFIDENCE_OPERATORS, 1.0
        ) * 0.4

        # Factor 2: Average weight of contributors (0-0.3)
        avg_weight = sum(weights) / len(weights) if weights else 0
        weight_factor = avg_weight * 0.3

        # Factor 3: Agreement tightness — low CV across params (0-0.3)
        if params:
            cvs = []
            for pc in params.values():
                if pc.weighted_mean != 0 and pc.weighted_stddev >= 0:
                    cv = pc.weighted_stddev / abs(pc.weighted_mean)
                    cvs.append(cv)
            if cvs:
                avg_cv = sum(cvs) / len(cvs)
                # CV < 0.05 = perfect agreement, CV > 0.5 = poor
                agreement_factor = max(0.0, 1.0 - avg_cv * 2.0) * 0.3
            else:
                agreement_factor = 0.15
        else:
            agreement_factor = 0.0

        return min(count_factor + weight_factor + agreement_factor, 1.0)
