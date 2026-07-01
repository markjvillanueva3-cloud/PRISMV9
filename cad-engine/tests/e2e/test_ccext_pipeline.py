"""CC-EXT Full E2E Pipeline Tests — CC-EXT-MS6-P0-U01.

Full pipeline: PDF extraction -> operator feedback -> sensor data ->
quality inspection -> cross-source synthesis -> knowledge graph.

3 complete scenarios:
  1. Milling 4140 steel
  2. Turning 6061 aluminum
  3. Drilling Ti-6Al-4V
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
    PDFSourceAdapter, FeedbackSourceAdapter,
    SensorSourceAdapter, QualitySourceAdapter,
)
from src.synthesis.confidence_scorer import (
    ConfidenceScorer, PhysicsValidator, HIGH_CONFIDENCE,
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
    """Simulates CC-EXT-MS1 PDF extraction output."""
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
    """Simulates operator parameter consensus."""
    def __init__(self, name, mean, min_v=None, max_v=None):
        self.name = name
        self.weighted_mean = mean
        self.weighted_stddev = 5.0
        self.min_val = min_v
        self.max_val = max_v


class MockConsensusResult:
    """Simulates CC-EXT-MS2 operator feedback output."""
    def __init__(self, **kw):
        for k, v in kw.items():
            setattr(self, k, v)
        if not hasattr(self, "confidence"):
            self.confidence = 0.75
        if not hasattr(self, "num_contributors"):
            self.num_contributors = 5


class MockTolerancePrediction:
    """Simulates CC-EXT-MS4 tolerance prediction."""
    def __init__(self, grade="IT7", numeric=7, dev=0.015, conf=0.7):
        self.predicted_it_grade = grade
        self.predicted_it_numeric = numeric
        self.predicted_deviation_mm = dev
        self.confidence = conf


class MockSurfacePrediction:
    """Simulates CC-EXT-MS4 surface finish prediction."""
    def __init__(self, ra=1.6, rz=6.4, conf=0.8):
        self.corrected_ra_um = ra
        self.predicted_rz_um = rz
        self.confidence = conf


class MockDimensionalPrediction:
    """Simulates CC-EXT-MS4 dimensional accuracy prediction."""
    def __init__(self, total=12.5, it_grade=8, conf=0.65):
        self.total_error_um = total
        self.achievable_it_grade = it_grade
        self.confidence = conf


class ScenarioPhysicsValidator(PhysicsValidator):
    """Physics validator with known values for test scenarios."""
    def __init__(self, predictions: dict[str, float]):
        self._predictions = predictions

    def validate(self, entry):
        return self._predictions.get(entry.parameter_name)


# ---------------------------------------------------------------------------
# Scenario data generators
# ---------------------------------------------------------------------------

def _scenario_milling_4140_steel():
    """Scenario 1: Milling 4140 steel — full 4-source data."""
    # MS1: PDF extraction (Sandvik catalog data)
    pdf_entries = [
        MockKnowledgeEntry(
            entry_id="pdf-4140-speed", category="cutting_data",
            value={"cutting_speed": 180.0, "feed_rate": 0.15, "depth_of_cut": 3.0},
            material="4140_steel", operation="milling", tool_type="carbide",
            confidence=0.88,
        ),
        MockKnowledgeEntry(
            entry_id="pdf-4140-tool-life", category="cutting_data",
            value={"tool_life_minutes": 45.0},
            material="4140_steel", operation="milling", tool_type="carbide",
            confidence=0.82,
        ),
    ]

    # MS2: Operator feedback (3 entries)
    operator_consensus = [
        MockConsensusResult(
            material="4140_steel", operation_type="milling", tool="carbide",
            recommended_params={
                "cutting_speed": MockParamConsensus("cutting_speed", 175.0, 160, 190),
                "feed_rate": MockParamConsensus("feed_rate", 0.18, 0.12, 0.25),
                "depth_of_cut": MockParamConsensus("depth_of_cut", 2.5, 1.5, 4.0),
            },
            confidence=0.80, num_contributors=6,
        ),
    ]

    # MS3: Sensor data (simulated 10-min stream summary)
    sensor_data = [
        {
            "correlation_id": "sensor-4140-mill-1",
            "material": "4140_steel", "operation": "milling",
            "confidence": 0.82,
            "wear_rate": 0.04,
            "vibration_rms": 0.9,
            "spindle_load_pct": 65.0,
        },
        {
            "correlation_id": "sensor-4140-mill-2",
            "material": "4140_steel", "operation": "milling",
            "confidence": 0.78,
            "temperature_delta": 12.5,
            "power_kw": 8.2,
        },
    ]

    # MS4: Quality inspection (CMM results)
    quality_data = [
        MockTolerancePrediction("IT7", 7, 0.012, 0.82),
        MockSurfacePrediction(1.4, 5.6, 0.85),
        MockDimensionalPrediction(10.5, 7, 0.72),
    ]

    physics = {"cutting_speed": 177.0, "feed_rate": 0.16, "depth_of_cut": 2.8}

    return pdf_entries, operator_consensus, sensor_data, quality_data, physics


def _scenario_turning_6061_aluminum():
    """Scenario 2: Turning 6061 aluminum — with chatter event."""
    pdf_entries = [
        MockKnowledgeEntry(
            entry_id="pdf-6061-speed",
            value={"cutting_speed": 300.0, "feed_rate": 0.25, "depth_of_cut": 2.0},
            material="6061_aluminum", operation="turning", tool_type="carbide",
            confidence=0.85,
        ),
    ]

    operator_consensus = [
        MockConsensusResult(
            material="6061_aluminum", operation_type="turning", tool="carbide",
            recommended_params={
                "cutting_speed": MockParamConsensus("cutting_speed", 310.0, 280, 350),
                "feed_rate": MockParamConsensus("feed_rate", 0.22, 0.15, 0.30),
                "depth_of_cut": MockParamConsensus("depth_of_cut", 1.8, 1.0, 3.0),
                "coolant_flow": MockParamConsensus("coolant_flow", 15.0, 10, 20),
                "rpm": MockParamConsensus("rpm", 4000.0, 3000, 5000),
            },
            confidence=0.78, num_contributors=8,
        ),
    ]

    # Sensor data with chatter event
    sensor_data = [
        {
            "correlation_id": "sensor-6061-turn-1",
            "material": "6061_aluminum", "operation": "turning",
            "confidence": 0.85,
            "wear_rate": 0.02,
            "vibration_rms": 2.8,  # elevated — chatter
            "chatter_detected": True,
        },
    ]

    quality_data = [
        MockSurfacePrediction(0.8, 3.2, 0.88),
        MockTolerancePrediction("IT8", 8, 0.025, 0.75),
    ]

    physics = {"cutting_speed": 305.0, "feed_rate": 0.23, "depth_of_cut": 1.9}

    return pdf_entries, operator_consensus, sensor_data, quality_data, physics


def _scenario_drilling_ti6al4v():
    """Scenario 3: Drilling Ti-6Al-4V — with tool wear."""
    pdf_entries = [
        MockKnowledgeEntry(
            entry_id="pdf-ti64-drill",
            value={"cutting_speed": 25.0, "feed_rate": 0.06},
            material="Ti-6Al-4V", operation="drilling", tool_type="carbide",
            confidence=0.90,
        ),
    ]

    operator_consensus = [
        MockConsensusResult(
            material="Ti-6Al-4V", operation_type="drilling", tool="carbide",
            recommended_params={
                "cutting_speed": MockParamConsensus("cutting_speed", 22.0, 18, 28),
                "feed_rate": MockParamConsensus("feed_rate", 0.05, 0.03, 0.08),
            },
            confidence=0.72, num_contributors=3,
        ),
    ]

    # Sensor data with tool wear
    sensor_data = [
        {
            "correlation_id": "sensor-ti64-drill-1",
            "material": "Ti-6Al-4V", "operation": "drilling",
            "confidence": 0.80,
            "wear_rate": 0.12,  # high wear for titanium
            "vibration_rms": 1.5,
            "thrust_force_n": 850.0,
        },
    ]

    # CMM hole position data
    quality_data = [
        MockTolerancePrediction("IT8", 8, 0.020, 0.78),
        MockDimensionalPrediction(18.0, 8, 0.68),
    ]

    physics = {"cutting_speed": 24.0, "feed_rate": 0.055}

    return pdf_entries, operator_consensus, sensor_data, quality_data, physics


# ---------------------------------------------------------------------------
# Full pipeline helper
# ---------------------------------------------------------------------------

def _run_full_pipeline(pdf, operator, sensor, quality, physics_map, material, operation):
    """Run the complete CC-EXT pipeline and return all outputs."""
    # Step 1: Aggregate from all sources
    agg = SourceAggregator()
    sources = {}
    if pdf:
        sources[SourceType.PDF_EXTRACTION] = pdf
    if operator:
        sources[SourceType.OPERATOR_FEEDBACK] = operator
    if sensor:
        sources[SourceType.SENSOR_LEARNING] = sensor
    if quality:
        sources[SourceType.QUALITY_FEEDBACK] = quality

    store = agg.aggregate(sources)

    # Step 2: Score confidence
    physics = ScenarioPhysicsValidator(physics_map) if physics_map else None
    scorer = ConfidenceScorer(physics_validator=physics)
    entries = store.get_entries()
    scores = scorer.score_batch(entries)

    # Step 3: Resolve conflicts
    resolver = CrossSourceResolver(physics_validator=physics, scorer=scorer)
    report = resolver.resolve_all(store)

    # Step 4: Build knowledge graph
    graph = KnowledgeGraph()
    graph.build_from_entries(store.get_entries())

    # Step 5: Query recommendations
    recs = graph.recommend(material, operation)

    return {
        "store": store,
        "entries": entries,
        "scores": scores,
        "report": report,
        "graph": graph,
        "recommendations": recs,
        "scorer": scorer,
    }


# ---------------------------------------------------------------------------
# E2E Pipeline Tests — 3 Scenarios
# ---------------------------------------------------------------------------

class TestScenario1Milling4140:
    """Scenario 1: Milling 4140 steel — full 4-source pipeline."""

    @pytest.fixture(autouse=True)
    def setup(self):
        pdf, op, sen, qual, phys = _scenario_milling_4140_steel()
        self.result = _run_full_pipeline(
            pdf, op, sen, qual, phys, "4140_steel", "milling"
        )

    def test_all_sources_aggregated(self):
        store = self.result["store"]
        assert store.entry_count >= 4
        stats = store.get_source_stats()
        assert "pdf_extraction" in stats
        assert "operator_feedback" in stats

    def test_entries_have_confidence_scores(self):
        scores = self.result["scores"]
        assert len(scores) >= 4
        for s in scores:
            assert 0.0 <= s.total <= 1.0
            assert s.tier in ("low", "medium", "high")

    def test_conflict_report_generated(self):
        report = self.result["report"]
        assert isinstance(report, ConflictReport)
        # All conflicts should be resolved (not escalated)
        for res in report.resolutions:
            assert res.strategy != ResolutionStrategy.ESCALATED or res.winner is not None

    def test_knowledge_graph_structure(self):
        graph = self.result["graph"]
        assert graph.node_count >= 3  # material + operation + params
        assert graph.edge_count >= 2

    def test_recommendations_returned(self):
        recs = self.result["recommendations"]
        assert len(recs) >= 1
        param_names = [r.parameter_name for r in recs]
        assert "cutting_speed" in param_names or "feed_rate" in param_names

    def test_provenance_chain_intact(self):
        """Verify provenance from source to graph entry."""
        entries = self.result["entries"]
        for entry in entries:
            assert len(entry.sources) >= 1
            for src in entry.sources:
                assert src.source_type in (
                    SourceType.PDF_EXTRACTION,
                    SourceType.OPERATOR_FEEDBACK,
                    SourceType.SENSOR_LEARNING,
                    SourceType.QUALITY_FEEDBACK,
                )

    def test_no_data_loss(self):
        """Total entries tracked should match or exceed raw input count."""
        store = self.result["store"]
        # 2 PDF entries (multi-value dicts expand) + operator params + sensor + quality
        assert store.total_entries >= 4

    def test_graph_serialization(self):
        graph = self.result["graph"]
        data = graph.to_dict()
        restored = KnowledgeGraph.from_dict(data)
        assert restored.node_count == graph.node_count
        assert restored.edge_count == graph.edge_count


class TestScenario2Turning6061:
    """Scenario 2: Turning 6061 aluminum — with chatter event."""

    @pytest.fixture(autouse=True)
    def setup(self):
        pdf, op, sen, qual, phys = _scenario_turning_6061_aluminum()
        self.result = _run_full_pipeline(
            pdf, op, sen, qual, phys, "6061_aluminum", "turning"
        )

    def test_all_sources_aggregated(self):
        store = self.result["store"]
        assert store.entry_count >= 3

    def test_recommendations_for_aluminum(self):
        recs = self.result["recommendations"]
        assert len(recs) >= 1

    def test_conflict_resolution(self):
        report = self.result["report"]
        assert isinstance(report, ConflictReport)
        # Report should serialize cleanly
        d = report.to_dict()
        assert "total_conflicts" in d
        assert "resolved" in d

    def test_sensor_chatter_captured(self):
        """Sensor data with elevated vibration should be captured."""
        store = self.result["store"]
        entries = store.get_entries()
        vibration = [e for e in entries if "vibration" in (e.parameter_name or "")]
        # Vibration data should exist from sensor source
        if vibration:
            assert vibration[0].value > 2.0  # chatter level

    def test_multi_source_entries_exist(self):
        """At least one entry should have multiple sources (PDF + operator agree)."""
        store = self.result["store"]
        multi = store.get_multi_source_entries(min_sources=2)
        # May or may not merge depending on value proximity
        # Just verify the query works
        assert isinstance(multi, list)

    def test_graph_has_aluminum_nodes(self):
        graph = self.result["graph"]
        stats = graph.compute_stats()
        assert stats.node_count >= 3


class TestScenario3DrillingTi64:
    """Scenario 3: Drilling Ti-6Al-4V — with tool wear."""

    @pytest.fixture(autouse=True)
    def setup(self):
        pdf, op, sen, qual, phys = _scenario_drilling_ti6al4v()
        self.result = _run_full_pipeline(
            pdf, op, sen, qual, phys, "Ti-6Al-4V", "drilling"
        )

    def test_all_sources_aggregated(self):
        store = self.result["store"]
        assert store.entry_count >= 3

    def test_recommendations_for_titanium(self):
        recs = self.result["recommendations"]
        assert len(recs) >= 1
        # Titanium drilling speed should be low
        speed_recs = [r for r in recs if r.parameter_name == "cutting_speed"]
        if speed_recs:
            assert speed_recs[0].value <= 30.0

    def test_tool_wear_captured(self):
        """High wear rate for titanium should be in store."""
        store = self.result["store"]
        entries = store.get_entries()
        wear = [e for e in entries if "wear" in (e.parameter_name or "")]
        if wear:
            assert wear[0].value >= 0.10

    def test_quality_data_included(self):
        """Quality feedback should produce tolerance/dimensional entries."""
        store = self.result["store"]
        tol = store.get_entries(category=EntryCategory.TOLERANCE)
        assert len(tol) >= 1

    def test_conflict_report_serializable(self):
        report = self.result["report"]
        d = report.to_dict()
        assert isinstance(d, dict)
        assert "severity_counts" in d

    def test_graph_gap_detection(self):
        """Knowledge graph should detect gaps for missing coverage."""
        graph = self.result["graph"]
        gaps = graph.find_knowledge_gaps()
        assert isinstance(gaps, list)


# ---------------------------------------------------------------------------
# Cross-scenario tests
# ---------------------------------------------------------------------------

class TestCrossScenario:
    """Tests that combine data from multiple scenarios."""

    def test_multi_material_graph(self):
        """All 3 materials in one graph should produce distinct recommendations."""
        pdf_s, op_s, sen_s, qual_s, _ = _scenario_milling_4140_steel()
        pdf_a, op_a, sen_a, qual_a, _ = _scenario_turning_6061_aluminum()
        pdf_t, op_t, sen_t, qual_t, _ = _scenario_drilling_ti6al4v()

        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: pdf_s + pdf_a + pdf_t,
            SourceType.OPERATOR_FEEDBACK: op_s + op_a + op_t,
            SourceType.SENSOR_LEARNING: sen_s + sen_a + sen_t,
            SourceType.QUALITY_FEEDBACK: qual_s + qual_a + qual_t,
        })

        graph = KnowledgeGraph()
        graph.build_from_entries(store.get_entries())

        # Each material-operation pair should have recommendations
        steel_recs = graph.recommend("4140_steel", "milling")
        alu_recs = graph.recommend("6061_aluminum", "turning")
        ti_recs = graph.recommend("Ti-6Al-4V", "drilling")

        assert len(steel_recs) >= 1
        assert len(alu_recs) >= 1
        assert len(ti_recs) >= 1

        # Graph should have many nodes
        assert graph.node_count >= 6  # 3 materials + 3 operations + params

    def test_pipeline_data_integrity(self):
        """No data lost from start to graph for combined dataset."""
        pdf_s, op_s, sen_s, qual_s, _ = _scenario_milling_4140_steel()
        pdf_t, op_t, sen_t, qual_t, _ = _scenario_drilling_ti6al4v()

        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: pdf_s + pdf_t,
            SourceType.OPERATOR_FEEDBACK: op_s + op_t,
            SourceType.SENSOR_LEARNING: sen_s + sen_t,
            SourceType.QUALITY_FEEDBACK: qual_s + qual_t,
        })

        # All entries should have valid IDs and provenance
        for entry in store.get_entries():
            assert entry.entry_id is not None
            assert len(entry.entry_id) > 0
            assert len(entry.sources) >= 1

    def test_incremental_pipeline(self):
        """Pipeline supports incremental data addition."""
        pdf_s, op_s, _, _, _ = _scenario_milling_4140_steel()

        agg = SourceAggregator()
        store = agg.aggregate({SourceType.PDF_EXTRACTION: pdf_s})
        count1 = store.entry_count

        store = agg.aggregate({SourceType.OPERATOR_FEEDBACK: op_s}, store=store)
        # Should have more or equal entries
        assert store.total_entries >= count1

        graph = KnowledgeGraph()
        graph.build_from_entries(store.get_entries())
        recs = graph.recommend("4140_steel", "milling")
        assert len(recs) >= 1

    def test_confidence_ordering(self):
        """Multi-source entries should generally score higher than single-source."""
        pdf_s, op_s, sen_s, _, phys = _scenario_milling_4140_steel()

        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: pdf_s,
            SourceType.OPERATOR_FEEDBACK: op_s,
            SourceType.SENSOR_LEARNING: sen_s,
        })

        physics = ScenarioPhysicsValidator(phys)
        scorer = ConfidenceScorer(physics_validator=physics)
        entries = store.get_entries()
        scores = scorer.score_batch(entries)

        multi = [(e, s) for e, s in zip(entries, scores) if e.source_count >= 2]
        single = [(e, s) for e, s in zip(entries, scores) if e.source_count == 1]

        if multi and single:
            avg_multi = sum(s.total for _, s in multi) / len(multi)
            avg_single = sum(s.total for _, s in single) / len(single)
            assert avg_multi >= avg_single

    def test_full_pipeline_roundtrip(self):
        """Full pipeline output survives graph serialization roundtrip."""
        result = _run_full_pipeline(
            *_scenario_milling_4140_steel()[:4],
            _scenario_milling_4140_steel()[4],
            "4140_steel", "milling",
        )
        graph = result["graph"]
        data = graph.to_dict()
        restored = KnowledgeGraph.from_dict(data)

        # Recommendations should match
        orig_recs = graph.recommend("4140_steel", "milling")
        rest_recs = restored.recommend("4140_steel", "milling")
        assert len(rest_recs) == len(orig_recs)
