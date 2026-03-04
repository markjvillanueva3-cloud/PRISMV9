"""Conflict Resolution — CC-EXT-MS2 P0-U05.

Detects and resolves conflicting feedback:
- Operator-vs-operator: different values for same conditions
- Operator-vs-physics: feedback contradicts physics models
- Operator-vs-knowledge: feedback contradicts stored knowledge base

Resolution strategies: weighted voting, physics arbitration,
experience-based tiebreak, and escalation to human review.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from .feedback_schema import OperatorFeedback
from .experience_scorer import ExperienceScorer, ExperienceScore
from .consensus_builder import ConsensusBuilder, ConsensusResult


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ConflictType(str, Enum):
    OPERATOR_VS_OPERATOR = "operator_vs_operator"
    OPERATOR_VS_PHYSICS = "operator_vs_physics"
    OPERATOR_VS_KNOWLEDGE = "operator_vs_knowledge"


class ResolutionStrategy(str, Enum):
    WEIGHTED_VOTING = "weighted_voting"
    PHYSICS_ARBITRATION = "physics_arbitration"
    EXPERIENCE_TIEBREAK = "experience_tiebreak"
    ESCALATED = "escalated"


class ResolutionOutcome(str, Enum):
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    MODEL_GAP_FLAGGED = "model_gap_flagged"


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class Conflict:
    """A detected conflict."""
    conflict_id: str
    conflict_type: ConflictType
    parameter: str
    operation_type: str
    material: str
    details: dict[str, Any] = field(default_factory=dict)
    # For operator-vs-operator: {operators: [{id, value, weight}]}
    # For operator-vs-physics: {operator_id, operator_value, physics_range}
    # For operator-vs-knowledge: {operator_id, operator_value, kb_value, kb_confidence}

    def to_dict(self) -> dict:
        return {
            "conflict_id": self.conflict_id,
            "conflict_type": self.conflict_type.value,
            "parameter": self.parameter,
            "operation_type": self.operation_type,
            "material": self.material,
            "details": self.details,
        }


@dataclass
class Resolution:
    """Result of resolving a conflict."""
    conflict_id: str
    conflict_type: ConflictType
    strategy: ResolutionStrategy
    outcome: ResolutionOutcome
    resolved_value: Optional[float] = None
    rationale: str = ""
    timestamp: float = 0.0

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> dict:
        return {
            "conflict_id": self.conflict_id,
            "conflict_type": self.conflict_type.value,
            "strategy": self.strategy.value,
            "outcome": self.outcome.value,
            "resolved_value": round(self.resolved_value, 4) if self.resolved_value is not None else None,
            "rationale": self.rationale,
            "timestamp": self.timestamp,
        }


@dataclass
class EscalationEntry:
    """A conflict escalated to human review."""
    conflict: Conflict
    resolution_attempts: list[Resolution] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending, approved, rejected
    reviewer_decision: Optional[str] = None
    reviewed_at: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "conflict": self.conflict.to_dict(),
            "resolution_attempts": [r.to_dict() for r in self.resolution_attempts],
            "context": self.context,
            "status": self.status,
            "reviewer_decision": self.reviewer_decision,
            "reviewed_at": self.reviewed_at,
        }


# ---------------------------------------------------------------------------
# ConflictResolver
# ---------------------------------------------------------------------------

class ConflictResolver:
    """Detects and resolves conflicting feedback.

    Conflict types:
    - operator_vs_operator: Operators report significantly different values
    - operator_vs_physics: Feedback contradicts physics model ranges
    - operator_vs_knowledge: Feedback contradicts stored KB values

    Resolution priority:
    1. Physics arbitration (physics wins unless model gap detected)
    2. Weighted voting (experience-weighted consensus)
    3. Experience tiebreak (highest-weight operator wins)
    4. Escalation (unresolvable → human review queue)
    """

    # Threshold for operator disagreement (CV > this = conflict)
    OPERATOR_DISAGREEMENT_CV = 0.15
    # Min high-weight operators to flag model gap
    MODEL_GAP_MIN_OPERATORS = 3
    MODEL_GAP_MIN_WEIGHT = 0.7
    # Knowledge base deviation threshold
    KB_DEVIATION_THRESHOLD = 0.30  # 30% deviation from KB value

    def __init__(
        self,
        scorer: Optional[ExperienceScorer] = None,
        physics_ranges: Optional[dict] = None,
        knowledge_base: Optional[dict] = None,
    ):
        self._scorer = scorer or ExperienceScorer()
        self._physics_ranges = physics_ranges or {}
        self._knowledge_base = knowledge_base or {}
        self._conflict_counter = 0
        self._audit_trail: list[Resolution] = []
        self._escalation_queue: list[EscalationEntry] = []

    def _next_conflict_id(self) -> str:
        self._conflict_counter += 1
        return f"CONF-{self._conflict_counter:04d}"

    # -------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------

    def detect_conflicts(
        self,
        entries: list[OperatorFeedback],
    ) -> list[Conflict]:
        """Detect all conflicts in a set of feedback entries."""
        conflicts: list[Conflict] = []

        # Group by operation+material
        groups: dict[tuple[str, str], list[OperatorFeedback]] = {}
        for fb in entries:
            key = (fb.operation_type.lower().strip(), fb.material.lower().strip())
            groups.setdefault(key, []).append(fb)

        for (op, mat), group in groups.items():
            # 1. Operator-vs-operator conflicts
            conflicts.extend(self._detect_operator_conflicts(op, mat, group))

            # 2. Operator-vs-physics conflicts
            conflicts.extend(self._detect_physics_conflicts(op, mat, group))

            # 3. Operator-vs-knowledge conflicts
            conflicts.extend(self._detect_knowledge_conflicts(op, mat, group))

        return conflicts

    def resolve_conflicts(
        self,
        conflicts: list[Conflict],
        entries: list[OperatorFeedback],
    ) -> list[Resolution]:
        """Resolve a list of detected conflicts."""
        resolutions = []
        for conflict in conflicts:
            resolution = self._resolve_single(conflict, entries)
            self._audit_trail.append(resolution)
            resolutions.append(resolution)
        return resolutions

    def detect_and_resolve(
        self,
        entries: list[OperatorFeedback],
    ) -> tuple[list[Conflict], list[Resolution]]:
        """Detect and resolve all conflicts in one call."""
        conflicts = self.detect_conflicts(entries)
        resolutions = self.resolve_conflicts(conflicts, entries)
        return conflicts, resolutions

    def get_escalation_queue(self) -> list[EscalationEntry]:
        """Get all pending escalations."""
        return [e for e in self._escalation_queue if e.status == "pending"]

    def review_escalation(
        self,
        conflict_id: str,
        decision: str,
        reviewer_notes: str = "",
    ) -> bool:
        """Approve or reject an escalated conflict."""
        for entry in self._escalation_queue:
            if entry.conflict.conflict_id == conflict_id:
                entry.status = decision  # "approved" or "rejected"
                entry.reviewer_decision = reviewer_notes
                entry.reviewed_at = time.time()
                return True
        return False

    def get_audit_trail(self) -> list[dict]:
        """Get full audit trail of all resolutions."""
        return [r.to_dict() for r in self._audit_trail]

    # -------------------------------------------------------------------
    # Conflict detection
    # -------------------------------------------------------------------

    def _detect_operator_conflicts(
        self,
        operation: str,
        material: str,
        entries: list[OperatorFeedback],
    ) -> list[Conflict]:
        """Detect operator-vs-operator conflicts (high disagreement)."""
        if len(entries) < 2:
            return []

        conflicts = []
        # Collect all parameter names
        all_params: set[str] = set()
        for fb in entries:
            all_params.update(fb.parameters_used.keys())

        for param in all_params:
            values = []
            for fb in entries:
                val = fb.parameters_used.get(param)
                if val is not None and isinstance(val, (int, float)):
                    score = self._scorer.compute_weight(fb.operator_id, fb)
                    values.append({
                        "operator_id": fb.operator_id,
                        "value": float(val),
                        "weight": score.total,
                    })

            if len(values) < 2:
                continue

            # Check coefficient of variation
            vals = [v["value"] for v in values]
            mean = sum(vals) / len(vals)
            if mean == 0:
                continue
            variance = sum((v - mean) ** 2 for v in vals) / len(vals)
            cv = math.sqrt(variance) / abs(mean)

            if cv > self.OPERATOR_DISAGREEMENT_CV:
                conflicts.append(Conflict(
                    conflict_id=self._next_conflict_id(),
                    conflict_type=ConflictType.OPERATOR_VS_OPERATOR,
                    parameter=param,
                    operation_type=operation,
                    material=material,
                    details={"operators": values, "cv": round(cv, 4)},
                ))

        return conflicts

    def _detect_physics_conflicts(
        self,
        operation: str,
        material: str,
        entries: list[OperatorFeedback],
    ) -> list[Conflict]:
        """Detect operator-vs-physics conflicts."""
        key = f"{operation}:{material}"
        ranges = self._physics_ranges.get(key, {})
        if not ranges:
            return []

        conflicts = []
        for fb in entries:
            for param, val in fb.parameters_used.items():
                if not isinstance(val, (int, float)):
                    continue
                param_range = ranges.get(param)
                if param_range is None:
                    continue
                low, high = param_range
                if val < low or val > high:
                    conflicts.append(Conflict(
                        conflict_id=self._next_conflict_id(),
                        conflict_type=ConflictType.OPERATOR_VS_PHYSICS,
                        parameter=param,
                        operation_type=operation,
                        material=material,
                        details={
                            "operator_id": fb.operator_id,
                            "operator_value": float(val),
                            "physics_range": [low, high],
                        },
                    ))

        return conflicts

    def _detect_knowledge_conflicts(
        self,
        operation: str,
        material: str,
        entries: list[OperatorFeedback],
    ) -> list[Conflict]:
        """Detect operator-vs-knowledge conflicts."""
        key = f"{operation}:{material}"
        kb_values = self._knowledge_base.get(key, {})
        if not kb_values:
            return []

        conflicts = []
        for fb in entries:
            for param, val in fb.parameters_used.items():
                if not isinstance(val, (int, float)):
                    continue
                kb_entry = kb_values.get(param)
                if kb_entry is None:
                    continue
                kb_val = kb_entry.get("value", 0)
                kb_conf = kb_entry.get("confidence", 0.5)
                if kb_val == 0:
                    continue
                deviation = abs(float(val) - kb_val) / abs(kb_val)
                if deviation > self.KB_DEVIATION_THRESHOLD:
                    conflicts.append(Conflict(
                        conflict_id=self._next_conflict_id(),
                        conflict_type=ConflictType.OPERATOR_VS_KNOWLEDGE,
                        parameter=param,
                        operation_type=operation,
                        material=material,
                        details={
                            "operator_id": fb.operator_id,
                            "operator_value": float(val),
                            "kb_value": kb_val,
                            "kb_confidence": kb_conf,
                            "deviation": round(deviation, 4),
                        },
                    ))

        return conflicts

    # -------------------------------------------------------------------
    # Conflict resolution
    # -------------------------------------------------------------------

    def _resolve_single(
        self,
        conflict: Conflict,
        entries: list[OperatorFeedback],
    ) -> Resolution:
        """Resolve a single conflict using the appropriate strategy."""
        if conflict.conflict_type == ConflictType.OPERATOR_VS_PHYSICS:
            return self._resolve_physics_conflict(conflict, entries)
        elif conflict.conflict_type == ConflictType.OPERATOR_VS_OPERATOR:
            return self._resolve_operator_conflict(conflict, entries)
        elif conflict.conflict_type == ConflictType.OPERATOR_VS_KNOWLEDGE:
            return self._resolve_knowledge_conflict(conflict, entries)
        else:
            return self._escalate(conflict, "Unknown conflict type")

    def _resolve_physics_conflict(
        self,
        conflict: Conflict,
        entries: list[OperatorFeedback],
    ) -> Resolution:
        """Resolve operator-vs-physics: physics wins unless model gap detected."""
        details = conflict.details
        physics_range = details.get("physics_range", [0, 0])
        operator_value = details.get("operator_value", 0)
        operator_id = details.get("operator_id", "")

        # Check if multiple high-weight operators disagree with physics
        high_weight_dissenters = []
        for fb in entries:
            val = fb.parameters_used.get(conflict.parameter)
            if val is None or not isinstance(val, (int, float)):
                continue
            if val < physics_range[0] or val > physics_range[1]:
                score = self._scorer.compute_weight(fb.operator_id, fb)
                if score.total >= self.MODEL_GAP_MIN_WEIGHT:
                    high_weight_dissenters.append({
                        "operator_id": fb.operator_id,
                        "value": float(val),
                        "weight": score.total,
                    })

        if len(high_weight_dissenters) >= self.MODEL_GAP_MIN_OPERATORS:
            # Flag as potential model gap
            self._escalation_queue.append(EscalationEntry(
                conflict=conflict,
                context={
                    "high_weight_dissenters": high_weight_dissenters,
                    "reason": "Multiple high-weight operators consistently disagree with physics model",
                },
            ))
            return Resolution(
                conflict_id=conflict.conflict_id,
                conflict_type=conflict.conflict_type,
                strategy=ResolutionStrategy.PHYSICS_ARBITRATION,
                outcome=ResolutionOutcome.MODEL_GAP_FLAGGED,
                resolved_value=None,
                rationale=(
                    f"{len(high_weight_dissenters)} high-weight operators "
                    f"(weight >= {self.MODEL_GAP_MIN_WEIGHT}) disagree with "
                    f"physics range {physics_range}. Flagged as potential model gap."
                ),
            )

        # Physics wins
        # Clamp to nearest boundary
        if operator_value < physics_range[0]:
            clamped = physics_range[0]
        else:
            clamped = physics_range[1]

        return Resolution(
            conflict_id=conflict.conflict_id,
            conflict_type=conflict.conflict_type,
            strategy=ResolutionStrategy.PHYSICS_ARBITRATION,
            outcome=ResolutionOutcome.RESOLVED,
            resolved_value=clamped,
            rationale=(
                f"Operator {operator_id} value {operator_value} outside "
                f"physics range {physics_range}. Clamped to {clamped}."
            ),
        )

    def _resolve_operator_conflict(
        self,
        conflict: Conflict,
        entries: list[OperatorFeedback],
    ) -> Resolution:
        """Resolve operator-vs-operator: weighted voting, then experience tiebreak."""
        operators = conflict.details.get("operators", [])
        if not operators:
            return self._escalate(conflict, "No operator data for resolution")

        # Weighted voting
        total_weight = sum(op["weight"] for op in operators)
        if total_weight == 0:
            return self._escalate(conflict, "All operators have zero weight")

        weighted_value = sum(
            op["value"] * op["weight"] for op in operators
        ) / total_weight

        # Check if a single operator dominates (>60% weight)
        max_weight_op = max(operators, key=lambda o: o["weight"])
        weight_ratio = max_weight_op["weight"] / total_weight

        if weight_ratio > 0.6 and len(operators) == 2:
            # Experience tiebreak
            return Resolution(
                conflict_id=conflict.conflict_id,
                conflict_type=conflict.conflict_type,
                strategy=ResolutionStrategy.EXPERIENCE_TIEBREAK,
                outcome=ResolutionOutcome.RESOLVED,
                resolved_value=max_weight_op["value"],
                rationale=(
                    f"Operator {max_weight_op['operator_id']} has dominant weight "
                    f"({max_weight_op['weight']:.2f}/{total_weight:.2f} = "
                    f"{weight_ratio:.0%}). Using their value {max_weight_op['value']}."
                ),
            )

        return Resolution(
            conflict_id=conflict.conflict_id,
            conflict_type=conflict.conflict_type,
            strategy=ResolutionStrategy.WEIGHTED_VOTING,
            outcome=ResolutionOutcome.RESOLVED,
            resolved_value=weighted_value,
            rationale=(
                f"Weighted voting across {len(operators)} operators. "
                f"Weighted mean: {weighted_value:.2f}."
            ),
        )

    def _resolve_knowledge_conflict(
        self,
        conflict: Conflict,
        entries: list[OperatorFeedback],
    ) -> Resolution:
        """Resolve operator-vs-knowledge: depends on KB confidence and operator weight."""
        details = conflict.details
        kb_val = details.get("kb_value", 0)
        kb_conf = details.get("kb_confidence", 0.5)
        op_val = details.get("operator_value", 0)
        operator_id = details.get("operator_id", "")

        # Get operator weight
        op_weight = 0.5
        for fb in entries:
            if fb.operator_id == operator_id:
                score = self._scorer.compute_weight(fb.operator_id, fb)
                op_weight = score.total
                break

        # High-confidence KB + low-weight operator → KB wins
        if kb_conf > 0.8 and op_weight < 0.5:
            return Resolution(
                conflict_id=conflict.conflict_id,
                conflict_type=conflict.conflict_type,
                strategy=ResolutionStrategy.WEIGHTED_VOTING,
                outcome=ResolutionOutcome.RESOLVED,
                resolved_value=kb_val,
                rationale=(
                    f"KB value {kb_val} (confidence {kb_conf:.2f}) retained. "
                    f"Operator {operator_id} weight {op_weight:.2f} too low to override."
                ),
            )

        # Low-confidence KB + high-weight operator → operator wins
        if kb_conf < 0.5 and op_weight > 0.7:
            return Resolution(
                conflict_id=conflict.conflict_id,
                conflict_type=conflict.conflict_type,
                strategy=ResolutionStrategy.EXPERIENCE_TIEBREAK,
                outcome=ResolutionOutcome.RESOLVED,
                resolved_value=op_val,
                rationale=(
                    f"Operator {operator_id} (weight {op_weight:.2f}) overrides "
                    f"low-confidence KB value {kb_val} (confidence {kb_conf:.2f})."
                ),
            )

        # Ambiguous → weighted blend
        blend = kb_val * kb_conf + op_val * op_weight
        total = kb_conf + op_weight
        if total > 0:
            blended = blend / total
        else:
            return self._escalate(conflict, "Zero total weight for KB blend")

        return Resolution(
            conflict_id=conflict.conflict_id,
            conflict_type=conflict.conflict_type,
            strategy=ResolutionStrategy.WEIGHTED_VOTING,
            outcome=ResolutionOutcome.RESOLVED,
            resolved_value=blended,
            rationale=(
                f"Blended KB value {kb_val} (conf {kb_conf:.2f}) with operator "
                f"{operator_id} value {op_val} (weight {op_weight:.2f}). "
                f"Result: {blended:.2f}."
            ),
        )

    def _escalate(self, conflict: Conflict, reason: str) -> Resolution:
        """Escalate an unresolvable conflict to human review."""
        self._escalation_queue.append(EscalationEntry(
            conflict=conflict,
            context={"reason": reason},
        ))
        return Resolution(
            conflict_id=conflict.conflict_id,
            conflict_type=conflict.conflict_type,
            strategy=ResolutionStrategy.ESCALATED,
            outcome=ResolutionOutcome.ESCALATED,
            rationale=f"Escalated to human review: {reason}",
        )
