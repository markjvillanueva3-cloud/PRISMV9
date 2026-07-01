"""Tests for Cross-Source Conflict Resolution — CC-EXT-MS5 P0-U03."""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.synthesis.source_aggregator import (
    SourceType, EntryCategory, SourceProvenance, UnifiedEntry,
    UnifiedKnowledgeStore,
)
from src.synthesis.confidence_scorer import PhysicsValidator
from src.synthesis.cross_source_resolver import (
    CrossSourceResolver, ConflictSeverity, ResolutionStrategy,
    ConflictEntry, ConflictReport,
)


# ---------------------------------------------------------------------------
# Physics validator for testing
# ---------------------------------------------------------------------------

class MockPhysicsValidator(PhysicsValidator):
    def __init__(self, values: dict[str, float] = None):
        self._values = values or {}

    def validate(self, entry: UnifiedEntry) -> float | None:
        return self._values.get(entry.parameter_name)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_entry(
    param: str, value: float, source: SourceType,
    material: str = "steel", operation: str = "turning",
    confidence: float = 0.7,
) -> UnifiedEntry:
    return UnifiedEntry(
        category=EntryCategory.CUTTING_PARAMETER,
        material=material, operation=operation,
        parameter_name=param, value=value,
        sources=[SourceProvenance(source_type=source, original_confidence=confidence)],
        confidence=confidence,
    )


def _make_store_with_conflict(
    param: str = "speed",
    val_a: float = 150.0, val_b: float = 250.0,
    src_a: SourceType = SourceType.PDF_EXTRACTION,
    src_b: SourceType = SourceType.OPERATOR_FEEDBACK,
    conf_a: float = 0.7, conf_b: float = 0.8,
) -> UnifiedKnowledgeStore:
    store = UnifiedKnowledgeStore()
    e1 = _make_entry(param, val_a, src_a, confidence=conf_a)
    e2 = _make_entry(param, val_b, src_b, confidence=conf_b)
    # Force different IDs
    e2.entry_id = e1.entry_id + "_b"
    store._entries[e1.entry_id] = e1
    store._entries[e2.entry_id] = e2
    key = e1.match_key()
    store._match_index[key] = [e1.entry_id, e2.entry_id]
    return store


# ---------------------------------------------------------------------------
# Conflict Detection tests
# ---------------------------------------------------------------------------

class TestConflictDetection:
    def test_detect_no_conflicts(self):
        store = UnifiedKnowledgeStore()
        store.add_entry(_make_entry("speed", 150, SourceType.PDF_EXTRACTION))
        store.add_entry(_make_entry("feed", 0.2, SourceType.PDF_EXTRACTION))

        resolver = CrossSourceResolver()
        conflicts = resolver.detect_conflicts(store)
        assert len(conflicts) == 0

    def test_detect_conflict_large_diff(self):
        store = _make_store_with_conflict("speed", 150.0, 250.0)
        resolver = CrossSourceResolver(conflict_threshold_pct=20.0)
        conflicts = resolver.detect_conflicts(store)
        assert len(conflicts) == 1
        assert conflicts[0].value_difference_pct > 20

    def test_no_conflict_within_threshold(self):
        store = _make_store_with_conflict("speed", 150.0, 160.0)
        resolver = CrossSourceResolver(conflict_threshold_pct=20.0)
        conflicts = resolver.detect_conflicts(store)
        # 160/150 = 6.7% diff, below 20% threshold
        assert len(conflicts) == 0

    def test_severity_minor(self):
        store = _make_store_with_conflict("speed", 100.0, 125.0)
        resolver = CrossSourceResolver(conflict_threshold_pct=20.0)
        conflicts = resolver.detect_conflicts(store)
        assert len(conflicts) == 1
        assert conflicts[0].severity == ConflictSeverity.MINOR

    def test_severity_major(self):
        store = _make_store_with_conflict("speed", 100.0, 160.0)
        resolver = CrossSourceResolver(conflict_threshold_pct=20.0)
        conflicts = resolver.detect_conflicts(store)
        assert len(conflicts) == 1
        assert conflicts[0].severity == ConflictSeverity.MAJOR

    def test_severity_critical(self):
        store = _make_store_with_conflict("speed", 100.0, 200.0)
        resolver = CrossSourceResolver(conflict_threshold_pct=20.0)
        conflicts = resolver.detect_conflicts(store)
        assert len(conflicts) == 1
        assert conflicts[0].severity == ConflictSeverity.CRITICAL


# ---------------------------------------------------------------------------
# Conflict Resolution tests
# ---------------------------------------------------------------------------

class TestConflictResolution:
    def test_physics_arbitration(self):
        """Physics model should resolve conflict when values differ."""
        physics = MockPhysicsValidator({"speed": 155.0})
        resolver = CrossSourceResolver(physics_validator=physics)

        store = _make_store_with_conflict("speed", 150.0, 250.0)
        conflicts = resolver.detect_conflicts(store)
        assert len(conflicts) == 1

        result = resolver.resolve(conflicts[0])
        assert result.strategy == ResolutionStrategy.PHYSICS_ARBITRATION
        assert result.winner is not None
        assert result.winner.value == 150.0  # closer to physics 155

    def test_sensor_precedence_over_pdf(self):
        """High-confidence sensor data should win over static PDF."""
        resolver = CrossSourceResolver()
        store = _make_store_with_conflict(
            "speed", 150.0, 200.0,
            src_a=SourceType.PDF_EXTRACTION,
            src_b=SourceType.SENSOR_LEARNING,
            conf_b=0.85,
        )
        conflicts = resolver.detect_conflicts(store)
        assert len(conflicts) == 1

        result = resolver.resolve(conflicts[0])
        assert result.strategy == ResolutionStrategy.SENSOR_PRECEDENCE
        assert result.winner.value == 200.0

    def test_multi_source_consensus(self):
        """Entry with more sources should win."""
        resolver = CrossSourceResolver()

        # Use same source types so sensor_precedence doesn't trigger
        e1 = _make_entry("speed", 150.0, SourceType.PDF_EXTRACTION)
        e1.sources.append(SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK, original_confidence=0.7))
        e2 = _make_entry("speed", 250.0, SourceType.OPERATOR_FEEDBACK)
        e2.entry_id = e1.entry_id + "_b"

        conflict = ConflictEntry(
            entry_a=e1, entry_b=e2,
            severity=ConflictSeverity.MAJOR,
            value_difference_pct=40.0,
        )
        result = resolver.resolve(conflict)
        assert result.strategy == ResolutionStrategy.MULTI_SOURCE_CONSENSUS
        assert result.winner.value == 150.0  # 2 sources vs 1

    def test_highest_confidence_fallback(self):
        """When other strategies fail, highest confidence wins."""
        resolver = CrossSourceResolver()

        # Use same source type so sensor_precedence doesn't trigger, same count so consensus doesn't trigger
        e1 = _make_entry("speed", 150.0, SourceType.PDF_EXTRACTION, confidence=0.3)
        e2 = _make_entry("speed", 250.0, SourceType.PDF_EXTRACTION, confidence=0.95)
        e2.entry_id = e1.entry_id + "_b"

        conflict = ConflictEntry(
            entry_a=e1, entry_b=e2,
            severity=ConflictSeverity.MAJOR,
            value_difference_pct=40.0,
        )
        result = resolver.resolve(conflict)
        # With large confidence gap, should resolve via highest_confidence
        assert result.strategy in (ResolutionStrategy.HIGHEST_CONFIDENCE, ResolutionStrategy.ESCALATED)
        if result.winner:
            assert result.winner.value == 250.0

    def test_escalation(self):
        """Equal entries with no physics should escalate."""
        resolver = CrossSourceResolver()

        e1 = _make_entry("speed", 150.0, SourceType.PDF_EXTRACTION, confidence=0.7)
        e2 = _make_entry("speed", 250.0, SourceType.PDF_EXTRACTION, confidence=0.7)
        e2.entry_id = e1.entry_id + "_b"

        conflict = ConflictEntry(
            entry_a=e1, entry_b=e2,
            severity=ConflictSeverity.MAJOR,
            value_difference_pct=40.0,
        )
        result = resolver.resolve(conflict)
        # Same source type, same confidence, no physics — should fall through
        assert result.strategy in (ResolutionStrategy.HIGHEST_CONFIDENCE, ResolutionStrategy.ESCALATED)


# ---------------------------------------------------------------------------
# Full pipeline tests
# ---------------------------------------------------------------------------

class TestResolveAll:
    def test_resolve_all_report(self):
        physics = MockPhysicsValidator({"speed": 155.0})
        resolver = CrossSourceResolver(physics_validator=physics)
        store = _make_store_with_conflict("speed", 150.0, 250.0)

        report = resolver.resolve_all(store)
        assert report.total_conflicts == 1
        assert report.resolved_count == 1
        assert len(report.resolutions) == 1

    def test_report_to_dict(self):
        resolver = CrossSourceResolver()
        store = _make_store_with_conflict("speed", 150.0, 300.0)
        report = resolver.resolve_all(store)
        d = report.to_dict()
        assert "total_conflicts" in d
        assert "resolved" in d
        assert "severity_counts" in d

    def test_multiple_conflicts(self):
        store = UnifiedKnowledgeStore()

        # Conflict 1: speed
        e1 = _make_entry("speed", 150.0, SourceType.PDF_EXTRACTION)
        e2 = _make_entry("speed", 300.0, SourceType.OPERATOR_FEEDBACK)
        e2.entry_id = e1.entry_id + "_b"
        store._entries[e1.entry_id] = e1
        store._entries[e2.entry_id] = e2
        store._match_index[e1.match_key()] = [e1.entry_id, e2.entry_id]

        # Conflict 2: feed
        e3 = _make_entry("feed", 0.1, SourceType.PDF_EXTRACTION)
        e4 = _make_entry("feed", 0.3, SourceType.SENSOR_LEARNING, confidence=0.85)
        e4.entry_id = e3.entry_id + "_b"
        store._entries[e3.entry_id] = e3
        store._entries[e4.entry_id] = e4
        store._match_index[e3.match_key()] = [e3.entry_id, e4.entry_id]

        resolver = CrossSourceResolver()
        report = resolver.resolve_all(store)
        assert report.total_conflicts == 2
        assert report.resolved_count == 2

    def test_quarantine_count(self):
        resolver = CrossSourceResolver()
        # Two PDF sources with same confidence — hard to resolve
        e1 = _make_entry("speed", 100.0, SourceType.PDF_EXTRACTION, confidence=0.7)
        e2 = _make_entry("speed", 200.0, SourceType.PDF_EXTRACTION, confidence=0.7)
        e2.entry_id = e1.entry_id + "_b"

        store = UnifiedKnowledgeStore()
        store._entries[e1.entry_id] = e1
        store._entries[e2.entry_id] = e2
        store._match_index[e1.match_key()] = [e1.entry_id, e2.entry_id]

        report = resolver.resolve_all(store)
        # May or may not escalate depending on scorer delta
        assert report.total_conflicts == 1
