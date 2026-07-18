"""Feedback Quality Metrics — CC-EXT-MS2 P0-U07.

Computes quality metrics for the feedback system:
- Per-operator metrics: accuracy, consistency, contribution count, specialization coverage
- System-wide metrics: total feedback, validation pass rate, consensus convergence, conflict rate
- Knowledge improvement: parameter range tightening, new entries from feedback
- Anomaly detection: sudden accuracy drops, conflict spikes, volume anomalies
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Metric types
# ---------------------------------------------------------------------------

@dataclass
class OperatorMetrics:
    """Quality metrics for a single operator."""
    operator_id: str
    accuracy_rate: float = 0.0         # 0-1
    consistency_score: float = 0.0     # 0-1
    contribution_count: int = 0
    specialization_coverage: float = 0.0  # 0-1 (how many domains covered)
    confirmed_count: int = 0
    novel_count: int = 0
    implausible_count: int = 0
    avg_weight: float = 0.0

    def to_dict(self) -> dict:
        return {
            "operator_id": self.operator_id,
            "accuracy_rate": round(self.accuracy_rate, 4),
            "consistency_score": round(self.consistency_score, 4),
            "contribution_count": self.contribution_count,
            "specialization_coverage": round(self.specialization_coverage, 4),
            "confirmed_count": self.confirmed_count,
            "novel_count": self.novel_count,
            "implausible_count": self.implausible_count,
            "avg_weight": round(self.avg_weight, 4),
        }


@dataclass
class SystemMetrics:
    """System-wide feedback quality metrics."""
    total_feedback_count: int = 0
    validation_pass_rate: float = 0.0     # confirmed / total
    consensus_convergence_rate: float = 0.0  # groups reaching consensus / total groups
    conflict_rate: float = 0.0            # conflicts / total feedback
    escalation_rate: float = 0.0          # escalations / total conflicts
    active_operators: int = 0
    avg_operator_accuracy: float = 0.0
    avg_operator_consistency: float = 0.0

    def to_dict(self) -> dict:
        return {
            "total_feedback_count": self.total_feedback_count,
            "validation_pass_rate": round(self.validation_pass_rate, 4),
            "consensus_convergence_rate": round(self.consensus_convergence_rate, 4),
            "conflict_rate": round(self.conflict_rate, 4),
            "escalation_rate": round(self.escalation_rate, 4),
            "active_operators": self.active_operators,
            "avg_operator_accuracy": round(self.avg_operator_accuracy, 4),
            "avg_operator_consistency": round(self.avg_operator_consistency, 4),
        }


@dataclass
class KnowledgeImprovementMetrics:
    """Metrics tracking knowledge base improvement over time."""
    new_entries_count: int = 0
    refined_entries_count: int = 0
    overridden_entries_count: int = 0
    deprecated_entries_count: int = 0
    avg_range_tightening: float = 0.0   # Average fraction of range reduction
    avg_confidence_gain: float = 0.0    # Average confidence improvement

    def to_dict(self) -> dict:
        return {
            "new_entries_count": self.new_entries_count,
            "refined_entries_count": self.refined_entries_count,
            "overridden_entries_count": self.overridden_entries_count,
            "deprecated_entries_count": self.deprecated_entries_count,
            "avg_range_tightening": round(self.avg_range_tightening, 4),
            "avg_confidence_gain": round(self.avg_confidence_gain, 4),
        }


@dataclass
class Anomaly:
    """A detected anomaly in feedback patterns."""
    anomaly_type: str  # "accuracy_drop", "conflict_spike", "volume_anomaly"
    severity: str      # "low", "medium", "high"
    description: str
    operator_id: Optional[str] = None  # None for system-wide anomalies
    details: dict = field(default_factory=dict)
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        return {
            "anomaly_type": self.anomaly_type,
            "severity": self.severity,
            "description": self.description,
            "operator_id": self.operator_id,
            "details": self.details,
            "timestamp": self.timestamp,
        }


@dataclass
class DashboardOutput:
    """Complete dashboard-ready metrics output."""
    operator_metrics: list[OperatorMetrics] = field(default_factory=list)
    system_metrics: Optional[SystemMetrics] = None
    knowledge_metrics: Optional[KnowledgeImprovementMetrics] = None
    anomalies: list[Anomaly] = field(default_factory=list)
    generated_at: float = 0.0

    def __post_init__(self):
        if self.generated_at == 0.0:
            self.generated_at = time.time()

    def to_dict(self) -> dict:
        return {
            "operator_metrics": [m.to_dict() for m in self.operator_metrics],
            "system_metrics": self.system_metrics.to_dict() if self.system_metrics else {},
            "knowledge_metrics": self.knowledge_metrics.to_dict() if self.knowledge_metrics else {},
            "anomalies": [a.to_dict() for a in self.anomalies],
            "generated_at": self.generated_at,
        }


# ---------------------------------------------------------------------------
# FeedbackMetrics
# ---------------------------------------------------------------------------

class FeedbackMetrics:
    """Computes quality metrics for the feedback system.

    Tracks per-operator and system-wide metrics, knowledge improvement,
    and detects anomalies in feedback patterns.
    """

    # Anomaly thresholds
    ACCURACY_DROP_THRESHOLD = 0.20  # 20% drop triggers anomaly
    CONFLICT_SPIKE_THRESHOLD = 2.0  # 2x historical average
    VOLUME_ANOMALY_THRESHOLD = 3.0  # 3x standard deviations

    def __init__(self):
        # Per-operator tracking
        self._operator_data: dict[str, dict] = {}
        # {operator_id: {confirmed, novel, implausible, weights, specializations, values}}

        # System-wide tracking
        self._total_feedback = 0
        self._total_confirmed = 0
        self._total_novel = 0
        self._total_implausible = 0
        self._total_conflicts = 0
        self._total_escalations = 0
        self._total_consensus_groups = 0
        self._converged_groups = 0

        # Knowledge improvement tracking
        self._kb_new = 0
        self._kb_refined = 0
        self._kb_overridden = 0
        self._kb_deprecated = 0
        self._range_tightenings: list[float] = []
        self._confidence_gains: list[float] = []

        # Historical data for anomaly detection
        self._accuracy_history: dict[str, list[float]] = {}
        self._conflict_history: list[int] = []  # conflicts per batch
        self._volume_history: list[int] = []     # feedback per batch

    # -------------------------------------------------------------------
    # Recording events
    # -------------------------------------------------------------------

    def record_feedback(
        self,
        operator_id: str,
        validation_result: str,  # "confirmed", "novel", "implausible"
        weight: float = 0.5,
        specializations: Optional[list[str]] = None,
        parameter_values: Optional[dict[str, float]] = None,
    ) -> None:
        """Record a feedback submission and its validation result."""
        self._total_feedback += 1

        if validation_result == "confirmed":
            self._total_confirmed += 1
        elif validation_result == "novel":
            self._total_novel += 1
        elif validation_result == "implausible":
            self._total_implausible += 1

        if operator_id not in self._operator_data:
            self._operator_data[operator_id] = {
                "confirmed": 0,
                "novel": 0,
                "implausible": 0,
                "weights": [],
                "specializations": set(),
                "values": {},
            }

        data = self._operator_data[operator_id]
        if validation_result == "confirmed":
            data["confirmed"] += 1
        elif validation_result == "novel":
            data["novel"] += 1
        elif validation_result == "implausible":
            data["implausible"] += 1

        data["weights"].append(weight)

        if specializations:
            data["specializations"].update(s.lower() for s in specializations)

        if parameter_values:
            for param, val in parameter_values.items():
                data["values"].setdefault(param, []).append(float(val))

    def record_consensus(self, converged: bool) -> None:
        """Record a consensus building attempt."""
        self._total_consensus_groups += 1
        if converged:
            self._converged_groups += 1

    def record_conflict(self, escalated: bool = False) -> None:
        """Record a conflict detection."""
        self._total_conflicts += 1
        if escalated:
            self._total_escalations += 1

    def record_batch(self, feedback_count: int, conflict_count: int) -> None:
        """Record a batch of feedback for anomaly tracking."""
        self._volume_history.append(feedback_count)
        self._conflict_history.append(conflict_count)

    def record_kb_update(
        self,
        mode: str,
        range_tightening: Optional[float] = None,
        confidence_gain: Optional[float] = None,
    ) -> None:
        """Record a knowledge base update."""
        if mode == "new":
            self._kb_new += 1
        elif mode == "refine":
            self._kb_refined += 1
        elif mode == "override":
            self._kb_overridden += 1
        elif mode == "deprecate":
            self._kb_deprecated += 1

        if range_tightening is not None:
            self._range_tightenings.append(range_tightening)
        if confidence_gain is not None:
            self._confidence_gains.append(confidence_gain)

    # -------------------------------------------------------------------
    # Metric computation
    # -------------------------------------------------------------------

    def compute_operator_metrics(self, operator_id: str) -> Optional[OperatorMetrics]:
        """Compute metrics for a single operator."""
        data = self._operator_data.get(operator_id)
        if data is None:
            return None

        total = data["confirmed"] + data["novel"] + data["implausible"]
        accuracy = data["confirmed"] / total if total > 0 else 0.0

        # Consistency from parameter value variance
        consistency = self._compute_consistency(data["values"])

        # Specialization coverage: fraction of unique specializations
        all_specs = set()
        for d in self._operator_data.values():
            all_specs.update(d["specializations"])
        spec_coverage = (
            len(data["specializations"]) / len(all_specs)
            if all_specs else 0.0
        )

        avg_weight = (
            sum(data["weights"]) / len(data["weights"])
            if data["weights"] else 0.0
        )

        # Track accuracy for anomaly detection
        self._accuracy_history.setdefault(operator_id, []).append(accuracy)

        return OperatorMetrics(
            operator_id=operator_id,
            accuracy_rate=accuracy,
            consistency_score=consistency,
            contribution_count=total,
            specialization_coverage=spec_coverage,
            confirmed_count=data["confirmed"],
            novel_count=data["novel"],
            implausible_count=data["implausible"],
            avg_weight=avg_weight,
        )

    def compute_system_metrics(self) -> SystemMetrics:
        """Compute system-wide metrics."""
        pass_rate = (
            self._total_confirmed / self._total_feedback
            if self._total_feedback > 0 else 0.0
        )
        convergence_rate = (
            self._converged_groups / self._total_consensus_groups
            if self._total_consensus_groups > 0 else 0.0
        )
        conflict_rate = (
            self._total_conflicts / self._total_feedback
            if self._total_feedback > 0 else 0.0
        )
        escalation_rate = (
            self._total_escalations / self._total_conflicts
            if self._total_conflicts > 0 else 0.0
        )

        # Average operator metrics
        all_accuracies = []
        all_consistencies = []
        for op_id in self._operator_data:
            m = self.compute_operator_metrics(op_id)
            if m:
                all_accuracies.append(m.accuracy_rate)
                all_consistencies.append(m.consistency_score)

        avg_accuracy = sum(all_accuracies) / len(all_accuracies) if all_accuracies else 0.0
        avg_consistency = sum(all_consistencies) / len(all_consistencies) if all_consistencies else 0.0

        return SystemMetrics(
            total_feedback_count=self._total_feedback,
            validation_pass_rate=pass_rate,
            consensus_convergence_rate=convergence_rate,
            conflict_rate=conflict_rate,
            escalation_rate=escalation_rate,
            active_operators=len(self._operator_data),
            avg_operator_accuracy=avg_accuracy,
            avg_operator_consistency=avg_consistency,
        )

    def compute_knowledge_metrics(self) -> KnowledgeImprovementMetrics:
        """Compute knowledge improvement metrics."""
        avg_tightening = (
            sum(self._range_tightenings) / len(self._range_tightenings)
            if self._range_tightenings else 0.0
        )
        avg_confidence = (
            sum(self._confidence_gains) / len(self._confidence_gains)
            if self._confidence_gains else 0.0
        )

        return KnowledgeImprovementMetrics(
            new_entries_count=self._kb_new,
            refined_entries_count=self._kb_refined,
            overridden_entries_count=self._kb_overridden,
            deprecated_entries_count=self._kb_deprecated,
            avg_range_tightening=avg_tightening,
            avg_confidence_gain=avg_confidence,
        )

    def detect_anomalies(self) -> list[Anomaly]:
        """Detect anomalies in feedback patterns."""
        anomalies: list[Anomaly] = []

        # 1. Per-operator accuracy drops
        for op_id, history in self._accuracy_history.items():
            if len(history) < 2:
                continue
            recent = history[-1]
            previous = sum(history[:-1]) / len(history[:-1])
            if previous > 0 and (previous - recent) / previous > self.ACCURACY_DROP_THRESHOLD:
                anomalies.append(Anomaly(
                    anomaly_type="accuracy_drop",
                    severity="high" if (previous - recent) > 0.4 else "medium",
                    description=(
                        f"Operator {op_id} accuracy dropped from "
                        f"{previous:.2f} to {recent:.2f}"
                    ),
                    operator_id=op_id,
                    details={"previous": previous, "current": recent},
                ))

        # 2. Conflict spikes
        if len(self._conflict_history) >= 3:
            historical_avg = sum(self._conflict_history[:-1]) / len(self._conflict_history[:-1])
            recent = self._conflict_history[-1]
            if historical_avg > 0 and recent > historical_avg * self.CONFLICT_SPIKE_THRESHOLD:
                anomalies.append(Anomaly(
                    anomaly_type="conflict_spike",
                    severity="high",
                    description=(
                        f"Conflict count {recent} is {recent / historical_avg:.1f}x "
                        f"the historical average of {historical_avg:.1f}"
                    ),
                    details={"recent": recent, "historical_avg": historical_avg},
                ))

        # 3. Volume anomalies
        if len(self._volume_history) >= 5:
            mean = sum(self._volume_history) / len(self._volume_history)
            variance = sum(
                (v - mean) ** 2 for v in self._volume_history
            ) / len(self._volume_history)
            stddev = math.sqrt(variance) if variance > 0 else 0
            if stddev > 0:
                recent = self._volume_history[-1]
                z_score = abs(recent - mean) / stddev
                if z_score > self.VOLUME_ANOMALY_THRESHOLD:
                    anomalies.append(Anomaly(
                        anomaly_type="volume_anomaly",
                        severity="medium",
                        description=(
                            f"Feedback volume {recent} is {z_score:.1f} "
                            f"standard deviations from mean {mean:.1f}"
                        ),
                        details={"recent": recent, "mean": mean, "z_score": z_score},
                    ))

        return anomalies

    def generate_dashboard(self) -> DashboardOutput:
        """Generate complete dashboard output."""
        operator_metrics = []
        for op_id in self._operator_data:
            m = self.compute_operator_metrics(op_id)
            if m:
                operator_metrics.append(m)

        return DashboardOutput(
            operator_metrics=operator_metrics,
            system_metrics=self.compute_system_metrics(),
            knowledge_metrics=self.compute_knowledge_metrics(),
            anomalies=self.detect_anomalies(),
        )

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    @staticmethod
    def _compute_consistency(values: dict[str, list[float]]) -> float:
        """Compute consistency score from parameter value history."""
        if not values:
            return 1.0

        consistencies = []
        for param, vals in values.items():
            if len(vals) < 2:
                continue
            mean = sum(vals) / len(vals)
            if mean == 0:
                continue
            variance = sum((v - mean) ** 2 for v in vals) / len(vals)
            cv = math.sqrt(variance) / abs(mean)
            param_consistency = max(0.0, 1.0 - cv * 2.0)
            consistencies.append(param_consistency)

        if not consistencies:
            return 1.0
        return sum(consistencies) / len(consistencies)
