"""CC-EXT Performance Benchmarks — CC-EXT-MS6-P0-U04.

Benchmarks for all CC-EXT engines:
- Source aggregation throughput
- Confidence scoring speed
- Conflict resolution performance
- Knowledge graph query latency
- Memory efficiency
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
from src.synthesis.confidence_scorer import ConfidenceScorer, PhysicsValidator
from src.synthesis.cross_source_resolver import CrossSourceResolver, ConflictReport
from src.synthesis.knowledge_graph import KnowledgeGraph


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_entries(n: int, materials=4, operations=4, params=20) -> list[UnifiedEntry]:
    """Generate n synthetic entries with varied attributes."""
    mat_names = ["steel", "aluminum", "titanium", "cast_iron"][:materials]
    op_names = ["turning", "milling", "drilling", "boring"][:operations]
    entries = []
    for i in range(n):
        entries.append(UnifiedEntry(
            category=EntryCategory.CUTTING_PARAMETER,
            material=mat_names[i % materials],
            operation=op_names[i % operations],
            tool_type="carbide",
            parameter_name=f"param_{i % params}",
            value=100.0 + i * 0.1,
            confidence=0.5 + (i % 50) * 0.01,
            sources=[SourceProvenance(
                source_type=[SourceType.PDF_EXTRACTION, SourceType.OPERATOR_FEEDBACK,
                             SourceType.SENSOR_LEARNING, SourceType.QUALITY_FEEDBACK][i % 4],
                original_confidence=0.7,
            )],
        ))
    return entries


class BenchPhysicsValidator(PhysicsValidator):
    def validate(self, entry) -> float | None:
        return 100.0 + hash(entry.parameter_name) % 50


# ---------------------------------------------------------------------------
# Aggregation Benchmarks
# ---------------------------------------------------------------------------

class TestAggregationPerformance:
    def test_1k_entries_under_1s(self):
        """1000 entries aggregate in <1 second."""
        entries = _generate_entries(1000)
        store = UnifiedKnowledgeStore()

        start = time.perf_counter()
        for e in entries:
            store.add_entry(e)
        elapsed = time.perf_counter() - start

        assert elapsed < 1.0
        assert store.entry_count >= 20  # dedup reduces count

    def test_5k_entries_under_5s(self):
        """5000 entries aggregate in <5 seconds."""
        entries = _generate_entries(5000, params=50)
        store = UnifiedKnowledgeStore()

        start = time.perf_counter()
        for e in entries:
            store.add_entry(e)
        elapsed = time.perf_counter() - start

        assert elapsed < 5.0

    def test_10k_entries_under_30s(self):
        """10K entries aggregate in <30 seconds."""
        entries = _generate_entries(10000, params=100)
        store = UnifiedKnowledgeStore()

        start = time.perf_counter()
        for e in entries:
            store.add_entry(e)
        elapsed = time.perf_counter() - start

        assert elapsed < 30.0


# ---------------------------------------------------------------------------
# Scoring Benchmarks
# ---------------------------------------------------------------------------

class TestScoringPerformance:
    def test_score_1k_under_500ms(self):
        """Score 1000 entries in <500ms."""
        entries = _generate_entries(1000)
        scorer = ConfidenceScorer()

        start = time.perf_counter()
        scores = scorer.score_batch(entries)
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 500
        assert len(scores) == len(entries)

    def test_score_with_physics_1k_under_1s(self):
        """Score 1000 entries with physics validation in <1 second."""
        entries = _generate_entries(1000)
        physics = BenchPhysicsValidator()
        scorer = ConfidenceScorer(physics_validator=physics)

        start = time.perf_counter()
        scores = scorer.score_batch(entries)
        elapsed = time.perf_counter() - start

        assert elapsed < 1.0
        assert len(scores) == len(entries)


# ---------------------------------------------------------------------------
# Conflict Resolution Benchmarks
# ---------------------------------------------------------------------------

class TestResolutionPerformance:
    def test_resolve_50_conflicts_under_1s(self):
        """Resolve 50 conflicts in <1 second."""
        store = UnifiedKnowledgeStore()
        for i in range(50):
            e1 = UnifiedEntry(
                parameter_name=f"param_{i}", value=100.0,
                material="steel", operation="turning",
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
                confidence=0.7,
            )
            e2 = UnifiedEntry(
                parameter_name=f"param_{i}", value=300.0,
                material="steel", operation="turning",
                sources=[SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK)],
                confidence=0.7,
            )
            e2.entry_id = e1.entry_id + "_b"
            store._entries[e1.entry_id] = e1
            store._entries[e2.entry_id] = e2
            store._match_index[e1.match_key()] = [e1.entry_id, e2.entry_id]

        resolver = CrossSourceResolver()
        start = time.perf_counter()
        report = resolver.resolve_all(store)
        elapsed = time.perf_counter() - start

        assert elapsed < 1.0
        assert report.total_conflicts == 50


# ---------------------------------------------------------------------------
# Knowledge Graph Benchmarks
# ---------------------------------------------------------------------------

class TestGraphPerformance:
    def test_build_graph_1k_entries_under_500ms(self):
        """Build graph from 1000 entries in <500ms."""
        entries = _generate_entries(1000)

        start = time.perf_counter()
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 500
        assert graph.node_count >= 10

    def test_recommend_query_under_10ms(self):
        """Recommendation query in <10ms on moderate graph."""
        entries = _generate_entries(500)
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)

        start = time.perf_counter()
        recs = graph.recommend("steel", "turning")
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 10
        assert len(recs) >= 1

    def test_graph_serialization_roundtrip_under_500ms(self):
        """Graph serialize + deserialize in <500ms."""
        entries = _generate_entries(1000)
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)

        start = time.perf_counter()
        data = graph.to_dict()
        restored = KnowledgeGraph.from_dict(data)
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 500
        assert restored.node_count == graph.node_count

    def test_gap_detection_under_100ms(self):
        """Knowledge gap detection in <100ms."""
        entries = _generate_entries(500)
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)

        start = time.perf_counter()
        gaps = graph.find_knowledge_gaps()
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 100

    def test_stats_computation_under_100ms(self):
        """Graph stats computation in <100ms."""
        entries = _generate_entries(500)
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)

        start = time.perf_counter()
        stats = graph.compute_stats()
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert elapsed_ms < 100
        assert stats.node_count > 0


# ---------------------------------------------------------------------------
# Full Pipeline Benchmark
# ---------------------------------------------------------------------------

class TestFullPipelinePerformance:
    def test_full_pipeline_1k_under_5s(self):
        """Full pipeline (aggregate+score+resolve+graph+recommend) for 1K entries in <5s."""
        entries = _generate_entries(1000)

        start = time.perf_counter()

        store = UnifiedKnowledgeStore()
        for e in entries:
            store.add_entry(e)

        scorer = ConfidenceScorer()
        all_entries = store.get_entries()
        scores = scorer.score_batch(all_entries)

        resolver = CrossSourceResolver(scorer=scorer)
        report = resolver.resolve_all(store)

        graph = KnowledgeGraph()
        graph.build_from_entries(all_entries)

        recs = graph.recommend("steel", "turning")

        elapsed = time.perf_counter() - start

        assert elapsed < 5.0
        assert len(recs) >= 1
        assert isinstance(report, ConflictReport)
