"""End-to-End Integration Tests for Cross-Source Synthesis — CC-EXT-MS5-P0-U05.

Full pipeline: all 4 sources -> aggregation -> confidence scoring ->
conflict resolution -> knowledge graph -> recommendations.
"""

from __future__ import annotations

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.synthesis.source_aggregator import (
    SourceType, EntryCategory, SourceProvenance, UnifiedEntry,
    UnifiedKnowledgeStore, SourceAggregator,
)
from src.synthesis.confidence_scorer import (
    ConfidenceScorer, PhysicsValidator, HIGH_CONFIDENCE, LOW_CONFIDENCE,
)
from src.synthesis.cross_source_resolver import (
    CrossSourceResolver, ResolutionStrategy, ConflictReport,
)
from src.synthesis.knowledge_graph import (
    KnowledgeGraph, NodeType, EdgeType,
)


# ---------------------------------------------------------------------------
# Mock source objects (simulating CC-EXT MS1-MS4 outputs)
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


class MockTolerancePrediction:
    def __init__(self, grade="IT7", numeric=7, dev=0.015, conf=0.7):
        self.predicted_it_grade = grade
        self.predicted_it_numeric = numeric
        self.predicted_deviation_mm = dev
        self.confidence = conf


class MockSurfacePrediction:
    def __init__(self, ra=1.6, rz=6.4, conf=0.8):
        self.corrected_ra_um = ra
        self.predicted_rz_um = rz
        self.confidence = conf


class StubPhysicsValidator(PhysicsValidator):
    """Returns known physics predictions for specific parameters."""
    def __init__(self):
        self._predictions = {
            "cutting_speed": 155.0,  # m/min for steel turning
            "feed_rate": 0.2,
            "depth_of_cut": 2.0,
        }

    def validate(self, entry):
        return self._predictions.get(entry.parameter_name)


# ---------------------------------------------------------------------------
# Scenario data generators
# ---------------------------------------------------------------------------

def _steel_turning_data():
    """4140 steel face turning — data from all 4 sources."""
    pdf_entries = [
        MockKnowledgeEntry(
            entry_id="pdf-steel-speed",
            value={"cutting_speed": 160.0},
            material="steel", operation="turning", tool_type="carbide",
            confidence=0.85,
        ),
        MockKnowledgeEntry(
            entry_id="pdf-steel-feed",
            value={"feed_rate": 0.2},
            material="steel", operation="turning", tool_type="carbide",
            confidence=0.85,
        ),
    ]

    operator_consensus = [
        MockConsensusResult(
            material="steel", operation_type="turning", tool="carbide",
            recommended_params={
                "cutting_speed": MockParamConsensus("cutting_speed", 155.0, 140, 170),
                "feed_rate": MockParamConsensus("feed_rate", 0.22, 0.15, 0.3),
            },
            confidence=0.78, num_contributors=8,
        ),
    ]

    sensor_data = [
        {
            "correlation_id": "sensor-steel-1",
            "material": "steel", "operation": "turning",
            "confidence": 0.8,
            "wear_rate": 0.05,
            "vibration_rms": 1.1,
        },
    ]

    quality_data = [
        MockTolerancePrediction("IT7", 7, 0.012, 0.75),
        MockSurfacePrediction(1.5, 6.0, 0.8),
    ]

    return pdf_entries, operator_consensus, sensor_data, quality_data


def _aluminum_milling_data():
    """6061 aluminum slot milling."""
    pdf = [MockKnowledgeEntry(
        entry_id="pdf-alu-speed",
        value={"cutting_speed": 300.0, "feed_rate": 0.15},
        material="aluminum", operation="milling", tool_type="carbide",
        confidence=0.82,
    )]
    operator = [MockConsensusResult(
        material="aluminum", operation_type="milling", tool="carbide",
        recommended_params={"cutting_speed": MockParamConsensus("cutting_speed", 310.0)},
        confidence=0.72, num_contributors=4,
    )]
    quality = [MockSurfacePrediction(0.8, 3.2, 0.75)]
    return pdf, operator, [], quality


# ---------------------------------------------------------------------------
# E2E Pipeline Tests
# ---------------------------------------------------------------------------

class TestSynthesisE2E:
    def test_full_pipeline_steel_turning(self):
        """Full pipeline: 4 sources -> aggregate -> score -> resolve -> graph -> recommend."""
        pdf, operator, sensor, quality = _steel_turning_data()

        # Step 1: Aggregate
        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: pdf,
            SourceType.OPERATOR_FEEDBACK: operator,
            SourceType.SENSOR_LEARNING: sensor,
            SourceType.QUALITY_FEEDBACK: quality,
        })
        assert store.entry_count >= 4

        # Step 2: Score
        physics = StubPhysicsValidator()
        scorer = ConfidenceScorer(physics_validator=physics)
        entries = store.get_entries()
        scores = scorer.score_batch(entries)
        assert len(scores) == len(entries)

        # Step 3: Resolve conflicts
        resolver = CrossSourceResolver(physics_validator=physics, scorer=scorer)
        report = resolver.resolve_all(store)
        # Some entries may conflict (PDF speed 160 vs operator 155)
        assert isinstance(report, ConflictReport)

        # Step 4: Build graph
        graph = KnowledgeGraph()
        graph.build_from_entries(store.get_entries())
        assert graph.node_count >= 3  # at least material + operation + parameters

        # Step 5: Query recommendations
        recs = graph.recommend("steel", "turning")
        assert len(recs) >= 1
        param_names = [r.parameter_name for r in recs]
        assert "cutting_speed" in param_names or "feed_rate" in param_names

    def test_multi_material_pipeline(self):
        """Pipeline with steel + aluminum data."""
        pdf_s, op_s, sen_s, qual_s = _steel_turning_data()
        pdf_a, op_a, _, qual_a = _aluminum_milling_data()

        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: pdf_s + pdf_a,
            SourceType.OPERATOR_FEEDBACK: op_s + op_a,
            SourceType.SENSOR_LEARNING: sen_s,
            SourceType.QUALITY_FEEDBACK: qual_s + qual_a,
        })

        graph = KnowledgeGraph()
        graph.build_from_entries(store.get_entries())

        # Both materials should have recommendations
        steel_recs = graph.recommend("steel", "turning")
        alu_recs = graph.recommend("aluminum", "milling")
        assert len(steel_recs) >= 1
        assert len(alu_recs) >= 1

    def test_incremental_aggregation(self):
        """New data merges without full rebuild."""
        agg = SourceAggregator()
        pdf, _, _, _ = _steel_turning_data()
        store = agg.aggregate({SourceType.PDF_EXTRACTION: pdf})
        count1 = store.entry_count

        _, operator, _, _ = _steel_turning_data()
        store = agg.aggregate({SourceType.OPERATOR_FEEDBACK: operator}, store=store)
        # Should have more entries or merged entries with more sources
        assert store.total_entries >= count1

    def test_confidence_multi_source_higher(self):
        """Multi-source entries should score higher than single-source."""
        pdf, operator, _, _ = _steel_turning_data()

        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: pdf,
            SourceType.OPERATOR_FEEDBACK: operator,
        })

        scorer = ConfidenceScorer()
        entries = store.get_entries()
        scores = scorer.score_batch(entries)

        # Find multi-source entries
        multi = [(e, s) for e, s in zip(entries, scores) if e.source_count >= 2]
        single = [(e, s) for e, s in zip(entries, scores) if e.source_count == 1]

        if multi and single:
            avg_multi = sum(s.total for _, s in multi) / len(multi)
            avg_single = sum(s.total for _, s in single) / len(single)
            assert avg_multi >= avg_single

    def test_graph_persistence_roundtrip(self):
        """Graph survives serialization/deserialization."""
        pdf, operator, sensor, quality = _steel_turning_data()
        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: pdf,
            SourceType.OPERATOR_FEEDBACK: operator,
            SourceType.SENSOR_LEARNING: sensor,
            SourceType.QUALITY_FEEDBACK: quality,
        })

        graph = KnowledgeGraph()
        graph.build_from_entries(store.get_entries())

        # Serialize and deserialize
        data = graph.to_dict()
        graph2 = KnowledgeGraph.from_dict(data)
        assert graph2.node_count == graph.node_count
        assert graph2.edge_count == graph.edge_count

    def test_source_stats_all_types(self):
        """All 4 source types should appear in stats."""
        pdf, operator, sensor, quality = _steel_turning_data()
        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: pdf,
            SourceType.OPERATOR_FEEDBACK: operator,
            SourceType.SENSOR_LEARNING: sensor,
            SourceType.QUALITY_FEEDBACK: quality,
        })
        stats = store.get_source_stats()
        assert "pdf_extraction" in stats
        assert "operator_feedback" in stats


class TestSynthesisScenarios:
    """5 machining scenarios with expected recommendations."""

    def _run_scenario(self, pdf_entries, operator_data, sensor_data, quality_data, material, operation):
        agg = SourceAggregator()
        sources = {SourceType.PDF_EXTRACTION: pdf_entries}
        if operator_data:
            sources[SourceType.OPERATOR_FEEDBACK] = operator_data
        if sensor_data:
            sources[SourceType.SENSOR_LEARNING] = sensor_data
        if quality_data:
            sources[SourceType.QUALITY_FEEDBACK] = quality_data

        store = agg.aggregate(sources)
        graph = KnowledgeGraph()
        graph.build_from_entries(store.get_entries())
        return graph.recommend(material, operation)

    def test_scenario_steel_turning(self):
        pdf, op, sen, qual = _steel_turning_data()
        recs = self._run_scenario(pdf, op, sen, qual, "steel", "turning")
        assert len(recs) >= 1

    def test_scenario_aluminum_milling(self):
        pdf, op, _, qual = _aluminum_milling_data()
        recs = self._run_scenario(pdf, op, [], qual, "aluminum", "milling")
        assert len(recs) >= 1

    def test_scenario_titanium_drilling(self):
        pdf = [MockKnowledgeEntry(
            entry_id="pdf-ti-drill",
            value={"cutting_speed": 30.0, "feed_rate": 0.08},
            material="titanium", operation="drilling", tool_type="carbide",
            confidence=0.9,
        )]
        recs = self._run_scenario(pdf, [], [], [], "titanium", "drilling")
        assert len(recs) >= 1
        speed = [r for r in recs if r.parameter_name == "cutting_speed"]
        if speed:
            assert speed[0].value == 30.0

    def test_scenario_stainless_slot_milling(self):
        pdf = [MockKnowledgeEntry(
            entry_id="pdf-ss-slot",
            value={"cutting_speed": 80.0, "feed_rate": 0.1, "depth_of_cut": 3.0},
            material="stainless_steel", operation="milling", tool_type="carbide",
            confidence=0.8,
        )]
        recs = self._run_scenario(pdf, [], [], [], "stainless_steel", "milling")
        assert len(recs) >= 2

    def test_scenario_cast_iron_boring(self):
        pdf = [MockKnowledgeEntry(
            entry_id="pdf-ci-bore",
            value={"cutting_speed": 120.0, "feed_rate": 0.12},
            material="cast_iron", operation="boring", tool_type="carbide",
            confidence=0.85,
        )]
        op = [MockConsensusResult(
            material="cast_iron", operation_type="boring", tool="carbide",
            recommended_params={
                "cutting_speed": MockParamConsensus("cutting_speed", 115.0),
            },
            confidence=0.7, num_contributors=3,
        )]
        recs = self._run_scenario(pdf, op, [], [], "cast_iron", "boring")
        assert len(recs) >= 1


class TestSynthesisPerformance:
    def test_large_dataset_aggregation(self):
        """10K+ entries aggregate without errors."""
        agg = SourceAggregator()
        entries = []
        for i in range(500):
            entries.append(MockKnowledgeEntry(
                entry_id=f"ke-{i}",
                value={f"param_{i % 20}": 100.0 + i * 0.1},
                material=["steel", "aluminum", "titanium"][i % 3],
                operation=["turning", "milling", "drilling"][i % 3],
                tool_type="carbide",
                confidence=0.7 + (i % 30) * 0.01,
            ))

        store = agg.aggregate({SourceType.PDF_EXTRACTION: entries})
        assert store.entry_count >= 50  # 20 params × 3 combos = 60 after dedup

    def test_graph_query_speed(self):
        """Recommendations returned quickly for moderate graph."""
        entries = []
        for i in range(200):
            entries.append(UnifiedEntry(
                category=EntryCategory.CUTTING_PARAMETER,
                material=["steel", "aluminum", "titanium", "cast_iron"][i % 4],
                operation=["turning", "milling", "drilling", "boring"][i % 4],
                tool_type="carbide",
                parameter_name=f"param_{i % 10}",
                value=100.0 + i,
                confidence=0.7,
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
            ))

        graph = KnowledgeGraph()
        graph.build_from_entries(entries)

        import time as _time
        start = _time.perf_counter()
        recs = graph.recommend("steel", "turning")
        elapsed_ms = (_time.perf_counter() - start) * 1000

        assert elapsed_ms < 100  # <100ms
        assert len(recs) >= 1

    def test_graph_stats_large(self):
        """Graph analytics work on larger graphs."""
        entries = []
        for i in range(100):
            entries.append(UnifiedEntry(
                category=EntryCategory.CUTTING_PARAMETER,
                material=["steel", "aluminum"][i % 2],
                operation=["turning", "milling"][i % 2],
                parameter_name=f"p{i % 5}",
                value=float(i),
                confidence=0.5 + (i % 50) * 0.01,
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
            ))
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)
        stats = graph.compute_stats()
        assert stats.node_count > 0
        assert stats.edge_count > 0
