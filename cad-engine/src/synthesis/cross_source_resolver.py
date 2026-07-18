"""Cross-Source Conflict Detection and Resolution — CC-EXT-MS5 P0-U03.

Detects conflicts between different CC-EXT sources and resolves them
using a hierarchy: physics arbitration > multi-source consensus >
highest confidence > escalate to human review.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .source_aggregator import (
    UnifiedEntry, UnifiedKnowledgeStore, SourceType, EntryCategory,
)
from .confidence_scorer import ConfidenceScorer, ConfidenceScore, PhysicsValidator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ConflictSeverity(Enum):
    MINOR = "minor"        # 20-30% difference
    MAJOR = "major"        # 30-50% difference
    CRITICAL = "critical"  # >50% difference


class ResolutionStrategy(Enum):
    PHYSICS_ARBITRATION = "physics_arbitration"
    MULTI_SOURCE_CONSENSUS = "multi_source_consensus"
    HIGHEST_CONFIDENCE = "highest_confidence"
    SENSOR_PRECEDENCE = "sensor_precedence"
    ESCALATED = "escalated"


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class ConflictEntry:
    """A pair of entries that conflict."""
    entry_a: UnifiedEntry
    entry_b: UnifiedEntry
    severity: ConflictSeverity = ConflictSeverity.MINOR
    value_difference_pct: float = 0.0

    @property
    def source_pair(self) -> tuple[set[SourceType], set[SourceType]]:
        return (self.entry_a.source_types, self.entry_b.source_types)


@dataclass
class ResolutionResult:
    """Outcome of resolving a conflict."""
    conflict: ConflictEntry
    strategy: ResolutionStrategy
    winner: Optional[UnifiedEntry] = None
    resolved_value: float = 0.0
    reason: str = ""
    physics_value: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "strategy": self.strategy.value,
            "winner_id": self.winner.entry_id if self.winner else None,
            "resolved_value": round(self.resolved_value, 4),
            "reason": self.reason,
            "severity": self.conflict.severity.value,
            "difference_pct": round(self.conflict.value_difference_pct, 1),
        }


@dataclass
class ConflictReport:
    """Summary of all detected conflicts and their resolutions."""
    conflicts: list[ConflictEntry] = field(default_factory=list)
    resolutions: list[ResolutionResult] = field(default_factory=list)
    quarantine: list[ConflictEntry] = field(default_factory=list)

    @property
    def total_conflicts(self) -> int:
        return len(self.conflicts)

    @property
    def resolved_count(self) -> int:
        return len(self.resolutions)

    @property
    def escalated_count(self) -> int:
        return len(self.quarantine)

    def severity_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for c in self.conflicts:
            counts[c.severity.value] = counts.get(c.severity.value, 0) + 1
        return counts

    def to_dict(self) -> dict:
        return {
            "total_conflicts": self.total_conflicts,
            "resolved": self.resolved_count,
            "escalated": self.escalated_count,
            "severity_counts": self.severity_counts(),
            "resolutions": [r.to_dict() for r in self.resolutions],
        }


# ---------------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------------

class CrossSourceResolver:
    """Detects and resolves cross-source conflicts.

    Resolution hierarchy:
    1. Physics model arbitration (if physics validator available)
    2. Sensor precedence (sensor data with high confidence > static PDF)
    3. Multi-source consensus (majority of sources agree)
    4. Highest confidence source wins
    5. Escalate to human review (quarantine)
    """

    def __init__(
        self,
        conflict_threshold_pct: float = 20.0,
        physics_validator: Optional[PhysicsValidator] = None,
        scorer: Optional[ConfidenceScorer] = None,
    ):
        self._threshold = conflict_threshold_pct
        self._physics = physics_validator or PhysicsValidator()
        self._scorer = scorer or ConfidenceScorer(physics_validator=self._physics)

    def detect_conflicts(
        self,
        store: UnifiedKnowledgeStore,
    ) -> list[ConflictEntry]:
        """Scan unified store for conflicting entries."""
        conflicts = []
        entries = store.get_entries(include_duplicates=False)

        # Group by match key
        groups: dict[str, list[UnifiedEntry]] = {}
        for entry in entries:
            key = entry.match_key()
            groups.setdefault(key, []).append(entry)

        for key, group in groups.items():
            if len(group) < 2:
                continue

            # Compare all pairs in group
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    a, b = group[i], group[j]
                    diff_pct = self._value_difference_pct(a.value, b.value)
                    if diff_pct >= self._threshold:
                        severity = self._classify_severity(diff_pct)
                        conflicts.append(ConflictEntry(
                            entry_a=a, entry_b=b,
                            severity=severity,
                            value_difference_pct=diff_pct,
                        ))

        return conflicts

    def resolve_all(
        self,
        store: UnifiedKnowledgeStore,
    ) -> ConflictReport:
        """Detect all conflicts and resolve them."""
        report = ConflictReport()
        report.conflicts = self.detect_conflicts(store)

        for conflict in report.conflicts:
            result = self.resolve(conflict)
            if result.strategy == ResolutionStrategy.ESCALATED:
                report.quarantine.append(conflict)
            report.resolutions.append(result)

        return report

    def resolve(self, conflict: ConflictEntry) -> ResolutionResult:
        """Resolve a single conflict using the hierarchy."""
        a, b = conflict.entry_a, conflict.entry_b

        # 1. Physics arbitration
        result = self._try_physics(conflict)
        if result:
            return result

        # 2. Sensor precedence (high-confidence sensor > static PDF)
        result = self._try_sensor_precedence(conflict)
        if result:
            return result

        # 3. Multi-source consensus
        result = self._try_consensus(conflict)
        if result:
            return result

        # 4. Highest confidence wins
        result = self._try_highest_confidence(conflict)
        if result:
            return result

        # 5. Escalate
        return ResolutionResult(
            conflict=conflict,
            strategy=ResolutionStrategy.ESCALATED,
            reason="Could not resolve automatically; escalated for human review",
        )

    def _try_physics(self, conflict: ConflictEntry) -> Optional[ResolutionResult]:
        """Use physics model to arbitrate."""
        a, b = conflict.entry_a, conflict.entry_b

        physics_val = self._physics.validate(a)
        if physics_val is None:
            return None

        diff_a = abs(a.value - physics_val) / max(abs(physics_val), 1e-10)
        diff_b = abs(b.value - physics_val) / max(abs(physics_val), 1e-10)

        if abs(diff_a - diff_b) < 0.05:
            return None  # Too close to call

        winner = a if diff_a < diff_b else b
        return ResolutionResult(
            conflict=conflict,
            strategy=ResolutionStrategy.PHYSICS_ARBITRATION,
            winner=winner,
            resolved_value=winner.value,
            physics_value=physics_val,
            reason=f"Physics model agrees more with {winner.entry_id} (deviation {min(diff_a, diff_b):.1%} vs {max(diff_a, diff_b):.1%})",
        )

    def _try_sensor_precedence(self, conflict: ConflictEntry) -> Optional[ResolutionResult]:
        """Sensor data with high confidence wins over static PDF."""
        a, b = conflict.entry_a, conflict.entry_b

        a_has_sensor = SourceType.SENSOR_LEARNING in a.source_types
        b_has_sensor = SourceType.SENSOR_LEARNING in b.source_types
        a_has_pdf = SourceType.PDF_EXTRACTION in a.source_types
        b_has_pdf = SourceType.PDF_EXTRACTION in b.source_types

        sensor_entry = None
        static_entry = None

        if a_has_sensor and not b_has_sensor and b_has_pdf:
            sensor_entry, static_entry = a, b
        elif b_has_sensor and not a_has_sensor and a_has_pdf:
            sensor_entry, static_entry = b, a
        else:
            return None

        if sensor_entry.confidence >= 0.7:
            return ResolutionResult(
                conflict=conflict,
                strategy=ResolutionStrategy.SENSOR_PRECEDENCE,
                winner=sensor_entry,
                resolved_value=sensor_entry.value,
                reason=f"Sensor data (confidence {sensor_entry.confidence:.2f}) takes precedence over static PDF",
            )

        return None

    def _try_consensus(self, conflict: ConflictEntry) -> Optional[ResolutionResult]:
        """Majority of sources agree on one value."""
        a, b = conflict.entry_a, conflict.entry_b

        if a.source_count == b.source_count:
            return None

        winner = a if a.source_count > b.source_count else b
        if winner.source_count >= 2:
            return ResolutionResult(
                conflict=conflict,
                strategy=ResolutionStrategy.MULTI_SOURCE_CONSENSUS,
                winner=winner,
                resolved_value=winner.value,
                reason=f"Multi-source consensus: {winner.source_count} sources vs {min(a.source_count, b.source_count)}",
            )

        return None

    def _try_highest_confidence(self, conflict: ConflictEntry) -> Optional[ResolutionResult]:
        """Highest confidence source wins."""
        a, b = conflict.entry_a, conflict.entry_b

        score_a = self._scorer.score(a)
        score_b = self._scorer.score(b)

        if abs(score_a.total - score_b.total) < 0.05:
            return None  # Too close

        winner = a if score_a.total > score_b.total else b
        winning_score = max(score_a.total, score_b.total)

        return ResolutionResult(
            conflict=conflict,
            strategy=ResolutionStrategy.HIGHEST_CONFIDENCE,
            winner=winner,
            resolved_value=winner.value,
            reason=f"Highest confidence: {winning_score:.3f} vs {min(score_a.total, score_b.total):.3f}",
        )

    @staticmethod
    def _value_difference_pct(a: float, b: float) -> float:
        """Compute percentage difference between two values."""
        if a == 0 and b == 0:
            return 0.0
        denominator = max(abs(a), abs(b))
        if denominator < 1e-10:
            return 0.0
        return abs(a - b) / denominator * 100.0

    @staticmethod
    def _classify_severity(diff_pct: float) -> ConflictSeverity:
        if diff_pct >= 50:
            return ConflictSeverity.CRITICAL
        elif diff_pct > 30:
            return ConflictSeverity.MAJOR
        else:
            return ConflictSeverity.MINOR
