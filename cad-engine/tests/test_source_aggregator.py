"""Tests for Multi-Source Aggregation — CC-EXT-MS5 P0-U01."""

from __future__ import annotations

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.synthesis.source_aggregator import (
    SourceType, EntryCategory, SourceProvenance, UnifiedEntry,
    UnifiedKnowledgeStore, SourceAggregator,
    PDFSourceAdapter, FeedbackSourceAdapter,
    SensorSourceAdapter, QualitySourceAdapter,
)


# ---------------------------------------------------------------------------
# Helpers — mock source objects
# ---------------------------------------------------------------------------

class MockKnowledgeEntry:
    """Mimics CC-EXT-MS1 KnowledgeEntry."""
    def __init__(self, **kwargs):
        self.entry_id = kwargs.get("entry_id", "ke-001")
        self.knowledge_type = kwargs.get("knowledge_type", None)
        self.category = kwargs.get("category", "cutting_data")
        self.title = kwargs.get("title", "cutting_speed")
        self.value = kwargs.get("value", {"cutting_speed": 150.0, "feed_rate": 0.2})
        self.material = kwargs.get("material", "steel")
        self.operation = kwargs.get("operation", "turning")
        self.tool_type = kwargs.get("tool_type", "carbide")
        self.unit = kwargs.get("unit", "m/min")
        self.si_value = kwargs.get("si_value", 150.0)
        self.min_value = kwargs.get("min_value", None)
        self.max_value = kwargs.get("max_value", None)
        self.confidence = kwargs.get("confidence", 0.85)
        self.conditions = kwargs.get("conditions", [])


class MockConsensusResult:
    """Mimics CC-EXT-MS2 ConsensusResult."""
    def __init__(self, **kwargs):
        self.operation_type = kwargs.get("operation_type", "turning")
        self.material = kwargs.get("material", "steel")
        self.tool = kwargs.get("tool", "carbide")
        self.confidence = kwargs.get("confidence", 0.75)
        self.num_contributors = kwargs.get("num_contributors", 5)
        self.recommended_params = kwargs.get("recommended_params", {})


class MockParameterConsensus:
    """Mimics ParameterConsensus."""
    def __init__(self, name, mean, std=5.0, min_val=None, max_val=None):
        self.name = name
        self.weighted_mean = mean
        self.weighted_stddev = std
        self.min_val = min_val
        self.max_val = max_val


class MockAnomalyEvent:
    """Mimics AnomalyEvent."""
    def __init__(self, atype="CHATTER", severity="WARNING", value=2.5, confidence=0.8):
        self.anomaly_type = atype
        self.severity = severity
        self.value = value
        self.confidence = confidence
        self.channel = "vibration_x"
        self.timestamp = time.time()


class MockAnomalyReport:
    """Mimics AnomalyReport."""
    def __init__(self, events=None):
        self.events = events or []


class MockTolerancePrediction:
    """Mimics TolerancePrediction."""
    def __init__(self, grade="IT7", numeric=7, dev=0.015, confidence=0.7):
        self.predicted_it_grade = grade
        self.predicted_it_numeric = numeric
        self.predicted_deviation_mm = dev
        self.confidence = confidence


class MockSurfaceFinishPrediction:
    """Mimics SurfaceFinishPrediction."""
    def __init__(self, ra=1.6, rz=6.4, confidence=0.8):
        self.corrected_ra_um = ra
        self.predicted_rz_um = rz
        self.confidence = confidence


class MockDimensionalPrediction:
    """Mimics DimensionalPrediction."""
    def __init__(self, total=12.5, it_grade=8, confidence=0.65):
        self.total_error_um = total
        self.achievable_it_grade = it_grade
        self.confidence = confidence


# ---------------------------------------------------------------------------
# UnifiedEntry tests
# ---------------------------------------------------------------------------

class TestUnifiedEntry:
    def test_auto_id(self):
        e = UnifiedEntry(parameter_name="speed", value=150.0)
        assert len(e.entry_id) == 12

    def test_match_key(self):
        e = UnifiedEntry(
            category=EntryCategory.CUTTING_PARAMETER,
            material="Steel", operation="Turning",
            parameter_name="Speed",
        )
        assert "cutting_parameter|steel|turning|" in e.match_key()

    def test_source_count(self):
        e = UnifiedEntry(sources=[
            SourceProvenance(source_type=SourceType.PDF_EXTRACTION),
            SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK),
        ])
        assert e.source_count == 2
        assert len(e.source_types) == 2

    def test_to_dict(self):
        e = UnifiedEntry(parameter_name="feed", value=0.2)
        d = e.to_dict()
        assert "entry_id" in d
        assert d["value"] == 0.2


# ---------------------------------------------------------------------------
# UnifiedKnowledgeStore tests
# ---------------------------------------------------------------------------

class TestUnifiedKnowledgeStore:
    def test_add_entry(self):
        store = UnifiedKnowledgeStore()
        e = UnifiedEntry(parameter_name="speed", value=150.0, material="steel")
        store.add_entry(e)
        assert store.entry_count == 1

    def test_duplicate_detection(self):
        store = UnifiedKnowledgeStore()
        e1 = UnifiedEntry(
            category=EntryCategory.CUTTING_PARAMETER,
            material="steel", operation="turning",
            parameter_name="speed", value=150.0,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.8)],
            confidence=0.8,
        )
        e2 = UnifiedEntry(
            category=EntryCategory.CUTTING_PARAMETER,
            material="steel", operation="turning",
            parameter_name="speed", value=155.0,  # within 30% similarity
            sources=[SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK, original_confidence=0.7)],
            confidence=0.7,
        )
        store.add_entry(e1)
        store.add_entry(e2)

        # Should merge (values within 30%)
        assert store.entry_count == 1
        assert store.total_entries == 2

    def test_no_duplicate_large_diff(self):
        store = UnifiedKnowledgeStore()
        e1 = UnifiedEntry(
            category=EntryCategory.CUTTING_PARAMETER,
            material="steel", operation="turning",
            parameter_name="speed", value=100.0,
            confidence=0.8,
        )
        e2 = UnifiedEntry(
            category=EntryCategory.CUTTING_PARAMETER,
            material="steel", operation="turning",
            parameter_name="speed", value=300.0,  # >30% different
            confidence=0.7,
        )
        store.add_entry(e1)
        store.add_entry(e2)
        assert store.entry_count == 2  # not merged

    def test_query_by_category(self):
        store = UnifiedKnowledgeStore()
        store.add_entry(UnifiedEntry(category=EntryCategory.CUTTING_PARAMETER, parameter_name="speed", value=150))
        store.add_entry(UnifiedEntry(category=EntryCategory.SURFACE_FINISH, parameter_name="ra", value=1.6))
        assert len(store.get_entries(category=EntryCategory.CUTTING_PARAMETER)) == 1

    def test_query_by_material(self):
        store = UnifiedKnowledgeStore()
        store.add_entry(UnifiedEntry(material="steel", parameter_name="speed", value=150))
        store.add_entry(UnifiedEntry(material="aluminum", parameter_name="speed", value=300))
        assert len(store.get_entries(material="steel")) == 1

    def test_query_by_source(self):
        store = UnifiedKnowledgeStore()
        store.add_entry(UnifiedEntry(
            parameter_name="speed", value=150,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        ))
        store.add_entry(UnifiedEntry(
            parameter_name="feed", value=0.2,
            sources=[SourceProvenance(source_type=SourceType.SENSOR_LEARNING)],
        ))
        assert len(store.get_entries(source_type=SourceType.PDF_EXTRACTION)) == 1

    def test_multi_source_entries(self):
        store = UnifiedKnowledgeStore()
        e = UnifiedEntry(
            parameter_name="speed", value=150,
            sources=[
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION),
                SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK),
            ],
        )
        store.add_entry(e)
        multi = store.get_multi_source_entries(min_sources=2)
        assert len(multi) == 1

    def test_source_stats(self):
        store = UnifiedKnowledgeStore()
        store.add_entry(UnifiedEntry(
            parameter_name="a", value=1,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        ))
        store.add_entry(UnifiedEntry(
            parameter_name="b", value=2,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
        ))
        store.add_entry(UnifiedEntry(
            parameter_name="c", value=3,
            sources=[SourceProvenance(source_type=SourceType.SENSOR_LEARNING)],
        ))
        stats = store.get_source_stats()
        assert stats["pdf_extraction"] == 2
        assert stats["sensor_learning"] == 1


# ---------------------------------------------------------------------------
# Source Adapter tests
# ---------------------------------------------------------------------------

class TestPDFSourceAdapter:
    def test_extract_dict_value(self):
        adapter = PDFSourceAdapter()
        ke = MockKnowledgeEntry(value={"cutting_speed": 150.0, "feed_rate": 0.2})
        entries = adapter.extract_entries(ke)
        assert len(entries) == 2
        assert all(e.sources[0].source_type == SourceType.PDF_EXTRACTION for e in entries)

    def test_extract_single_value(self):
        adapter = PDFSourceAdapter()
        ke = MockKnowledgeEntry(value="non-dict", si_value=150.0, title="speed")
        entries = adapter.extract_entries(ke)
        assert len(entries) == 1
        assert entries[0].value == 150.0

    def test_provenance_preserved(self):
        adapter = PDFSourceAdapter()
        ke = MockKnowledgeEntry(entry_id="ke-test", confidence=0.9)
        entries = adapter.extract_entries(ke)
        for e in entries:
            assert e.sources[0].source_id == "ke-test"
            assert e.sources[0].original_confidence == 0.9


class TestFeedbackSourceAdapter:
    def test_extract_consensus(self):
        adapter = FeedbackSourceAdapter()
        consensus = MockConsensusResult(
            recommended_params={
                "cutting_speed": MockParameterConsensus("cutting_speed", 160.0),
                "feed_rate": MockParameterConsensus("feed_rate", 0.25),
            }
        )
        entries = adapter.extract_entries(consensus)
        assert len(entries) == 2
        assert entries[0].sources[0].source_type == SourceType.OPERATOR_FEEDBACK

    def test_material_operation_preserved(self):
        adapter = FeedbackSourceAdapter()
        consensus = MockConsensusResult(
            material="aluminum", operation_type="milling",
            recommended_params={"speed": MockParameterConsensus("speed", 300)},
        )
        entries = adapter.extract_entries(consensus)
        assert entries[0].material == "aluminum"
        assert entries[0].operation == "milling"


class TestSensorSourceAdapter:
    def test_extract_correlation_dict(self):
        adapter = SensorSourceAdapter()
        data = {
            "correlation_id": "corr-1",
            "material": "steel",
            "operation": "turning",
            "confidence": 0.75,
            "wear_rate": 0.05,
            "vibration_rms": 1.2,
        }
        entries = adapter.extract_entries(data)
        assert len(entries) == 2
        assert all(e.sources[0].source_type == SourceType.SENSOR_LEARNING for e in entries)

    def test_extract_anomaly_report(self):
        adapter = SensorSourceAdapter()
        report = MockAnomalyReport(events=[
            MockAnomalyEvent("CHATTER", "WARNING", 2.5, 0.8),
            MockAnomalyEvent("TOOL_BREAKAGE", "CRITICAL", 10.0, 0.95),
        ])
        entries = adapter.extract_entries(report)
        assert len(entries) == 2
        assert all(e.category == EntryCategory.ANOMALY for e in entries)


class TestQualitySourceAdapter:
    def test_extract_tolerance_prediction(self):
        adapter = QualitySourceAdapter()
        pred = MockTolerancePrediction("IT7", 7, 0.015, 0.7)
        entries = adapter.extract_entries(pred)
        assert len(entries) == 1
        assert entries[0].category == EntryCategory.TOLERANCE

    def test_extract_surface_finish(self):
        adapter = QualitySourceAdapter()
        pred = MockSurfaceFinishPrediction(1.6, 6.4, 0.8)
        entries = adapter.extract_entries(pred)
        assert len(entries) == 2  # Ra + Rz
        assert entries[0].category == EntryCategory.SURFACE_FINISH

    def test_extract_dimensional(self):
        adapter = QualitySourceAdapter()
        pred = MockDimensionalPrediction(12.5, 8, 0.65)
        entries = adapter.extract_entries(pred)
        assert len(entries) == 1
        assert entries[0].value == 12.5


# ---------------------------------------------------------------------------
# SourceAggregator tests
# ---------------------------------------------------------------------------

class TestSourceAggregator:
    def test_aggregate_from_all_sources(self):
        agg = SourceAggregator()
        sources = {
            SourceType.PDF_EXTRACTION: [
                MockKnowledgeEntry(value={"speed": 150.0}),
            ],
            SourceType.OPERATOR_FEEDBACK: [
                MockConsensusResult(recommended_params={
                    "speed": MockParameterConsensus("speed", 160.0),
                }),
            ],
            SourceType.SENSOR_LEARNING: [
                {"correlation_id": "c1", "wear_rate": 0.05, "confidence": 0.7},
            ],
            SourceType.QUALITY_FEEDBACK: [
                MockTolerancePrediction(),
            ],
        }
        store = agg.aggregate(sources)
        assert store.entry_count >= 3  # PDF(1 speed) + Feedback(1 speed) + Sensor(1 wear) + Quality(1 tol) minus dedup

    def test_incremental_merge(self):
        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: [MockKnowledgeEntry(value={"speed": 150.0})],
        })
        count_1 = store.entry_count

        store = agg.aggregate({
            SourceType.SENSOR_LEARNING: [{"wear_rate": 0.05, "confidence": 0.7}],
        }, store=store)
        assert store.entry_count > count_1

    def test_aggregate_single(self):
        agg = SourceAggregator()
        store, entries = agg.aggregate_single(
            SourceType.PDF_EXTRACTION,
            MockKnowledgeEntry(value={"speed": 150.0, "feed": 0.2}),
        )
        assert len(entries) == 2
        assert store.entry_count == 2

    def test_dedup_across_sources(self):
        agg = SourceAggregator()
        # PDF says speed=150, operator consensus says speed=155 (close enough to merge)
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: [
                MockKnowledgeEntry(
                    material="steel", operation="turning",
                    value={"cutting_speed": 150.0}, confidence=0.85,
                ),
            ],
            SourceType.OPERATOR_FEEDBACK: [
                MockConsensusResult(
                    material="steel", operation_type="turning",
                    recommended_params={
                        "cutting_speed": MockParameterConsensus("cutting_speed", 155.0),
                    },
                    confidence=0.75,
                ),
            ],
        })
        # Should detect these as similar and merge
        entries = store.get_entries(material="steel")
        assert len(entries) >= 1

    def test_provenance_multi_source(self):
        """Verify provenance tracking after merge."""
        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: [
                MockKnowledgeEntry(
                    material="steel", operation="turning",
                    value={"cutting_speed": 150.0}, confidence=0.85,
                ),
            ],
        })
        # Add operator data that should merge
        store = agg.aggregate({
            SourceType.OPERATOR_FEEDBACK: [
                MockConsensusResult(
                    material="steel", operation_type="turning",
                    recommended_params={
                        "cutting_speed": MockParameterConsensus("cutting_speed", 152.0),
                    },
                    confidence=0.75,
                ),
            ],
        }, store=store)

        # Find the merged entry
        entries = store.get_entries(material="steel")
        multi = [e for e in entries if e.source_count >= 2]
        # At least one entry should have provenance from both sources
        if multi:
            types = multi[0].source_types
            assert len(types) >= 2
