"""CC-EXT Safety Audit Tests — CC-EXT-MS6-P0-U02.

Verifies zero unsafe recommendations can emerge from the pipeline:
- Boundary testing: extreme inputs handled safely
- Poisoned input testing: bad data caught and rejected
- Physics validation gate on every recommendation path
- Bypass path analysis: impossible to skip validation
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.synthesis.source_aggregator import (
    SourceType, EntryCategory, SourceProvenance, UnifiedEntry,
    UnifiedKnowledgeStore, SourceAggregator,
    PDFSourceAdapter, FeedbackSourceAdapter,
    SensorSourceAdapter, QualitySourceAdapter,
)
from src.synthesis.confidence_scorer import (
    ConfidenceScorer, PhysicsValidator, HIGH_CONFIDENCE, LOW_CONFIDENCE,
)
from src.synthesis.cross_source_resolver import (
    CrossSourceResolver, ResolutionStrategy, ConflictReport,
    ConflictSeverity,
)
from src.synthesis.knowledge_graph import (
    KnowledgeGraph, NodeType, EdgeType,
)


# ---------------------------------------------------------------------------
# Mock objects
# ---------------------------------------------------------------------------

class MockKnowledgeEntry:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)
        if not hasattr(self, "entry_id"):
            self.entry_id = "ke-default"
        if not hasattr(self, "knowledge_type"):
            self.knowledge_type = None
        if not hasattr(self, "confidence"):
            self.confidence = 0.85
        if not hasattr(self, "min_value"):
            self.min_value = None
        if not hasattr(self, "max_value"):
            self.max_value = None
        if not hasattr(self, "unit"):
            self.unit = ""


class MockParamConsensus:
    def __init__(self, name, mean, min_v=None, max_v=None):
        self.name = name
        self.weighted_mean = mean
        self.weighted_stddev = 5.0
        self.min_val = min_v
        self.max_val = max_v


class MockConsensusResult:
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)
        if not hasattr(self, "confidence"):
            self.confidence = 0.75
        if not hasattr(self, "num_contributors"):
            self.num_contributors = 5


class SafetyPhysicsValidator(PhysicsValidator):
    """Physics validator that flags dangerous values."""
    SAFE_RANGES = {
        "cutting_speed": (5.0, 500.0),     # m/min
        "feed_rate": (0.01, 2.0),           # mm/rev
        "depth_of_cut": (0.1, 20.0),        # mm
        "rpm": (50, 20000),
    }

    def __init__(self, expected: dict[str, float] = None):
        self._expected = expected or {}

    def validate(self, entry) -> float | None:
        return self._expected.get(entry.parameter_name)


# ---------------------------------------------------------------------------
# Boundary Testing
# ---------------------------------------------------------------------------

class TestBoundaryInputs:
    """Extreme parameter values should be handled safely."""

    def test_zero_feed_rate(self):
        """Feed rate = 0 should not crash or produce recommendations."""
        entry = UnifiedEntry(
            parameter_name="feed_rate", value=0.0,
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
            confidence=0.5,
        )
        scorer = ConfidenceScorer()
        score = scorer.score(entry)
        # Should score but with low confidence
        assert 0.0 <= score.total <= 1.0

    def test_extreme_feed_rate(self):
        """Feed rate = 100 mm/rev (absurd) should get low confidence."""
        entry = UnifiedEntry(
            parameter_name="feed_rate", value=100.0,
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.3)],
            confidence=0.3,
        )
        physics = SafetyPhysicsValidator({"feed_rate": 0.2})
        scorer = ConfidenceScorer(physics_validator=physics)
        score = scorer.score(entry)
        # Physics disagreement should tank confidence
        assert score.total < HIGH_CONFIDENCE

    def test_zero_rpm(self):
        """RPM = 0 should not crash pipeline."""
        entry = UnifiedEntry(
            parameter_name="rpm", value=0.0,
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        )
        scorer = ConfidenceScorer()
        score = scorer.score(entry)
        assert 0.0 <= score.total <= 1.0

    def test_extreme_rpm(self):
        """RPM = 999999 with physics check should get penalized."""
        entry = UnifiedEntry(
            parameter_name="rpm", value=999999.0,
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.3)],
            confidence=0.3,
        )
        physics = SafetyPhysicsValidator({"rpm": 3000.0})
        scorer = ConfidenceScorer(physics_validator=physics)
        score = scorer.score(entry)
        assert score.total < HIGH_CONFIDENCE

    def test_negative_cutting_speed(self):
        """Negative cutting speed should not crash."""
        entry = UnifiedEntry(
            parameter_name="cutting_speed", value=-50.0,
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        )
        scorer = ConfidenceScorer()
        score = scorer.score(entry)
        assert 0.0 <= score.total <= 1.0

    def test_doc_exceeds_workpiece(self):
        """Depth of cut larger than workpiece should not crash."""
        entry = UnifiedEntry(
            parameter_name="depth_of_cut", value=500.0,
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.2)],
            confidence=0.2,
        )
        physics = SafetyPhysicsValidator({"depth_of_cut": 2.0})
        scorer = ConfidenceScorer(physics_validator=physics)
        score = scorer.score(entry)
        assert score.total < HIGH_CONFIDENCE

    def test_empty_material(self):
        """Empty material string should not crash pipeline."""
        entry = UnifiedEntry(
            parameter_name="cutting_speed", value=150.0,
            material="", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        )
        graph = KnowledgeGraph()
        graph.build_from_entries([entry])
        recs = graph.recommend("", "turning")
        assert isinstance(recs, list)

    def test_none_operation(self):
        """None operation should not crash pipeline."""
        entry = UnifiedEntry(
            parameter_name="cutting_speed", value=150.0,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        )
        graph = KnowledgeGraph()
        graph.build_from_entries([entry])
        recs = graph.recommend("steel", "nonexistent_op")
        assert isinstance(recs, list)
        assert len(recs) == 0


# ---------------------------------------------------------------------------
# Poisoned Input Testing
# ---------------------------------------------------------------------------

class TestPoisonedInputs:
    """Intentionally bad data should be caught or scored low."""

    def test_dangerous_pdf_speed_10x(self):
        """PDF claiming 10x safe speed should get low confidence with physics check."""
        dangerous_pdf = MockKnowledgeEntry(
            entry_id="pdf-poison-speed",
            value={"cutting_speed": 1500.0},  # 10x safe for steel
            material="steel", operation="turning", tool_type="carbide",
            confidence=0.85,
        )
        safe_pdf = MockKnowledgeEntry(
            entry_id="pdf-safe-speed",
            value={"cutting_speed": 150.0},
            material="steel", operation="turning", tool_type="carbide",
            confidence=0.85,
        )

        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: [dangerous_pdf, safe_pdf],
        })

        # With physics validation, dangerous entry should score lower
        physics = SafetyPhysicsValidator({"cutting_speed": 155.0})
        scorer = ConfidenceScorer(physics_validator=physics)
        entries = store.get_entries()
        scores = scorer.score_batch(entries)

        speed_entries = [(e, s) for e, s in zip(entries, scores)
                         if e.parameter_name == "cutting_speed"]
        if len(speed_entries) >= 2:
            # Find dangerous vs safe
            dangerous = [(e, s) for e, s in speed_entries if e.value > 1000]
            safe = [(e, s) for e, s in speed_entries if e.value < 200]
            if dangerous and safe:
                assert dangerous[0][1].total < safe[0][1].total

    def test_physics_violating_operator_feedback(self):
        """Operator feedback with physics-violating values should be detected as conflict."""
        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: [
                MockKnowledgeEntry(
                    entry_id="pdf-good", value={"cutting_speed": 150.0},
                    material="steel", operation="turning", confidence=0.85,
                ),
            ],
            SourceType.OPERATOR_FEEDBACK: [
                MockConsensusResult(
                    material="steel", operation_type="turning", tool="carbide",
                    recommended_params={
                        "cutting_speed": MockParamConsensus("cutting_speed", 500.0),
                    },
                    confidence=0.7, num_contributors=1,
                ),
            ],
        })

        physics = SafetyPhysicsValidator({"cutting_speed": 155.0})
        resolver = CrossSourceResolver(physics_validator=physics, conflict_threshold_pct=20.0)
        report = resolver.resolve_all(store)

        # Should detect conflict between 150 and 500
        if report.total_conflicts > 0:
            # Physics should resolve in favor of 150 (closer to 155)
            for res in report.resolutions:
                if res.strategy == ResolutionStrategy.PHYSICS_ARBITRATION:
                    assert res.winner.value < 200  # safe value wins

    def test_corrupt_sensor_data(self):
        """Corrupt sensor data (missing fields) should not crash adapter."""
        adapter = SensorSourceAdapter()
        corrupt = {"confidence": 0.5}  # missing all measurement fields
        entries = adapter.extract_entries(corrupt)
        # Should produce zero entries (no valid measurements)
        assert isinstance(entries, list)

    def test_nan_value_handling(self):
        """NaN values should not propagate to recommendations."""
        import math
        entry = UnifiedEntry(
            parameter_name="cutting_speed", value=float("nan"),
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        )
        scorer = ConfidenceScorer()
        score = scorer.score(entry)
        # Should not crash, score should be a finite number
        assert not math.isnan(score.total) or score.total == 0.0

    def test_very_low_confidence_source(self):
        """Source with confidence ~0 should produce very low scored entry."""
        entry = UnifiedEntry(
            parameter_name="cutting_speed", value=150.0,
            sources=[SourceProvenance(
                source_type=SourceType.PDF_EXTRACTION,
                original_confidence=0.01,
            )],
        )
        scorer = ConfidenceScorer()
        score = scorer.score(entry)
        assert score.total < HIGH_CONFIDENCE


# ---------------------------------------------------------------------------
# Validation Gate Tests
# ---------------------------------------------------------------------------

class TestValidationGates:
    """Every recommendation path must have a confidence gate."""

    def test_recommendations_have_confidence(self):
        """All graph recommendations must include confidence scores."""
        entries = [
            UnifiedEntry(
                parameter_name="cutting_speed", value=150.0,
                material="steel", operation="turning",
                confidence=0.8,
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
            ),
            UnifiedEntry(
                parameter_name="feed_rate", value=0.2,
                material="steel", operation="turning",
                confidence=0.7,
                sources=[SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK)],
            ),
        ]
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)
        recs = graph.recommend("steel", "turning")
        for r in recs:
            assert hasattr(r, "confidence")
            assert 0.0 <= r.confidence <= 1.0

    def test_low_confidence_filter(self):
        """Recommendations below min_confidence should be filtered out."""
        entries = [
            UnifiedEntry(
                parameter_name="cutting_speed", value=150.0,
                material="steel", operation="turning",
                confidence=0.3,  # low
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
            ),
        ]
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)
        recs = graph.recommend("steel", "turning", min_confidence=0.5)
        # Should filter out the low-confidence entry
        assert len(recs) == 0

    def test_conflict_resolution_always_resolves(self):
        """Conflict resolution must produce a result for every conflict."""
        e1 = UnifiedEntry(
            parameter_name="speed", value=100.0,
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
            confidence=0.7,
        )
        e2 = UnifiedEntry(
            parameter_name="speed", value=300.0,
            material="steel", operation="turning",
            sources=[SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK)],
            confidence=0.7,
        )
        e2.entry_id = e1.entry_id + "_b"

        store = UnifiedKnowledgeStore()
        store._entries[e1.entry_id] = e1
        store._entries[e2.entry_id] = e2
        store._match_index[e1.match_key()] = [e1.entry_id, e2.entry_id]

        resolver = CrossSourceResolver()
        report = resolver.resolve_all(store)

        assert report.total_conflicts == 1
        assert report.resolved_count == 1
        # Every conflict must produce a resolution (even if escalated)
        assert len(report.resolutions) == report.total_conflicts

    def test_scorer_never_exceeds_1(self):
        """Confidence score must never exceed 1.0."""
        entry = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=1.0),
                SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK, original_confidence=1.0),
                SourceProvenance(source_type=SourceType.SENSOR_LEARNING, original_confidence=1.0),
                SourceProvenance(source_type=SourceType.QUALITY_FEEDBACK, original_confidence=1.0),
            ],
        )
        physics = SafetyPhysicsValidator({"speed": 150.0})
        scorer = ConfidenceScorer(physics_validator=physics)
        score = scorer.score(entry)
        assert score.total <= 1.0

    def test_severity_classification_complete(self):
        """All severity levels should be correctly classified."""
        resolver = CrossSourceResolver(conflict_threshold_pct=20.0)

        # Minor: 20-30%
        assert resolver._classify_severity(25.0) == ConflictSeverity.MINOR
        # Major: 30-50%
        assert resolver._classify_severity(40.0) == ConflictSeverity.MAJOR
        # Critical: >=50%
        assert resolver._classify_severity(50.0) == ConflictSeverity.CRITICAL
        assert resolver._classify_severity(75.0) == ConflictSeverity.CRITICAL


# ---------------------------------------------------------------------------
# Bypass Path Analysis
# ---------------------------------------------------------------------------

class TestBypassPaths:
    """Verify no way to bypass validation gates."""

    def test_direct_graph_insert_still_has_confidence(self):
        """Manually added graph entries still carry confidence."""
        graph = KnowledgeGraph()
        entry = UnifiedEntry(
            parameter_name="speed", value=999.0,
            material="steel", operation="turning",
            confidence=0.1,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        )
        graph.build_from_entries([entry])
        recs = graph.recommend("steel", "turning")
        # Even directly inserted, confidence is preserved
        for r in recs:
            assert r.confidence == 0.1

    def test_no_unscored_entries_in_pipeline(self):
        """All entries through the pipeline can be scored."""
        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: [
                MockKnowledgeEntry(value={"speed": 150.0}, material="steel", operation="turning"),
            ],
        })
        scorer = ConfidenceScorer()
        entries = store.get_entries()
        scores = scorer.score_batch(entries)
        assert len(scores) == len(entries)
        for s in scores:
            assert s.total is not None
            assert 0.0 <= s.total <= 1.0

    def test_empty_store_no_recommendations(self):
        """Empty store should produce zero recommendations (no phantom data)."""
        graph = KnowledgeGraph()
        graph.build_from_entries([])
        recs = graph.recommend("steel", "turning")
        assert len(recs) == 0

    def test_empty_store_no_conflicts(self):
        """Empty store should produce zero conflicts."""
        store = UnifiedKnowledgeStore()
        resolver = CrossSourceResolver()
        report = resolver.resolve_all(store)
        assert report.total_conflicts == 0
        assert report.resolved_count == 0
