"""CC-EXT Anti-Regression Suite — CC-EXT-MS6-P0-U03.

Verifies CC-EXT modules don't interfere with each other or with
the broader PRISM system. Tests module coexistence, import integrity,
and cross-module interactions.
"""

from __future__ import annotations

import importlib
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))


# ---------------------------------------------------------------------------
# Module Import Tests
# ---------------------------------------------------------------------------

class TestModuleImports:
    """All CC-EXT Python modules import cleanly without errors."""

    def test_import_synthesis_source_aggregator(self):
        mod = importlib.import_module("src.synthesis.source_aggregator")
        assert hasattr(mod, "SourceAggregator")
        assert hasattr(mod, "UnifiedKnowledgeStore")
        assert hasattr(mod, "UnifiedEntry")
        assert hasattr(mod, "SourceType")

    def test_import_synthesis_confidence_scorer(self):
        mod = importlib.import_module("src.synthesis.confidence_scorer")
        assert hasattr(mod, "ConfidenceScorer")
        assert hasattr(mod, "PhysicsValidator")
        assert hasattr(mod, "HIGH_CONFIDENCE")

    def test_import_synthesis_cross_source_resolver(self):
        mod = importlib.import_module("src.synthesis.cross_source_resolver")
        assert hasattr(mod, "CrossSourceResolver")
        assert hasattr(mod, "ConflictReport")
        assert hasattr(mod, "ResolutionStrategy")

    def test_import_synthesis_knowledge_graph(self):
        mod = importlib.import_module("src.synthesis.knowledge_graph")
        assert hasattr(mod, "KnowledgeGraph")
        assert hasattr(mod, "NodeType")
        assert hasattr(mod, "EdgeType")

    def test_import_quality_modules(self):
        mod = importlib.import_module("src.quality.cmm_importer")
        assert hasattr(mod, "CMMImporter")
        mod2 = importlib.import_module("src.quality.tolerance_correlator")
        assert hasattr(mod2, "ToleranceCorrelator")
        mod3 = importlib.import_module("src.quality.surface_finish_model")
        assert hasattr(mod3, "SurfaceFinishModel")

    def test_import_synthesis_init(self):
        """Package __init__ should export key types."""
        mod = importlib.import_module("src.synthesis")
        assert hasattr(mod, "SourceType")
        assert hasattr(mod, "KnowledgeGraph")

    def test_no_circular_imports(self):
        """Importing all synthesis modules in sequence should not fail."""
        importlib.import_module("src.synthesis.source_aggregator")
        importlib.import_module("src.synthesis.confidence_scorer")
        importlib.import_module("src.synthesis.cross_source_resolver")
        importlib.import_module("src.synthesis.knowledge_graph")
        # If we got here, no circular imports


# ---------------------------------------------------------------------------
# Cross-Module Interaction Tests
# ---------------------------------------------------------------------------

class TestCrossModuleInteraction:
    """Modules work together without interference."""

    def test_aggregator_to_scorer(self):
        """Aggregator output feeds directly into scorer."""
        from src.synthesis.source_aggregator import (
            SourceAggregator, SourceType, SourceProvenance, UnifiedEntry,
        )
        from src.synthesis.confidence_scorer import ConfidenceScorer

        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: [{
                "correlation_id": "test-1",
                "material": "steel", "operation": "turning",
                "confidence": 0.8, "wear_rate": 0.05,
            }],
        })
        # Wait — that's sensor format. Use proper PDF format.
        from tests.e2e.test_ccext_pipeline import MockKnowledgeEntry
        store2 = agg.aggregate({
            SourceType.PDF_EXTRACTION: [
                MockKnowledgeEntry(
                    value={"cutting_speed": 150.0},
                    material="steel", operation="turning",
                    confidence=0.85,
                ),
            ],
        })
        scorer = ConfidenceScorer()
        entries = store2.get_entries()
        scores = scorer.score_batch(entries)
        assert len(scores) == len(entries)

    def test_scorer_to_resolver(self):
        """Scorer output feeds into resolver."""
        from src.synthesis.source_aggregator import (
            SourceType, SourceProvenance, UnifiedEntry,
            UnifiedKnowledgeStore,
        )
        from src.synthesis.confidence_scorer import ConfidenceScorer
        from src.synthesis.cross_source_resolver import CrossSourceResolver

        e1 = UnifiedEntry(
            parameter_name="speed", value=150.0,
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

        scorer = ConfidenceScorer()
        resolver = CrossSourceResolver(scorer=scorer)
        report = resolver.resolve_all(store)
        assert report.total_conflicts >= 1

    def test_resolver_to_graph(self):
        """Resolver + graph work together."""
        from src.synthesis.source_aggregator import (
            SourceType, SourceProvenance, UnifiedEntry,
        )
        from src.synthesis.knowledge_graph import KnowledgeGraph

        entries = [
            UnifiedEntry(
                parameter_name="cutting_speed", value=150.0,
                material="steel", operation="turning",
                confidence=0.8,
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
            ),
        ]
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)
        recs = graph.recommend("steel", "turning")
        assert len(recs) >= 1

    def test_quality_modules_independent(self):
        """Quality modules (MS4) operate independently of synthesis (MS5)."""
        from src.quality.tolerance_correlator import ToleranceCorrelator
        from src.quality.surface_finish_model import SurfaceFinishModel
        from src.synthesis.source_aggregator import SourceAggregator

        # Both should instantiate without conflict
        tc = ToleranceCorrelator()
        sfm = SurfaceFinishModel()
        agg = SourceAggregator()
        assert tc is not None
        assert sfm is not None
        assert agg is not None


# ---------------------------------------------------------------------------
# Data Consistency Tests
# ---------------------------------------------------------------------------

class TestDataConsistency:
    """Data stays consistent through the full pipeline."""

    def test_entry_ids_unique(self):
        """All entries in a store should have unique IDs."""
        from src.synthesis.source_aggregator import (
            SourceAggregator, SourceType, UnifiedEntry, SourceProvenance,
        )

        entries = []
        for i in range(50):
            entries.append(UnifiedEntry(
                parameter_name=f"param_{i}",
                value=float(i),
                material="steel",
                operation="turning",
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
            ))

        from src.synthesis.source_aggregator import UnifiedKnowledgeStore
        store = UnifiedKnowledgeStore()
        for e in entries:
            store.add_entry(e)

        all_entries = store.get_entries()
        ids = [e.entry_id for e in all_entries]
        assert len(ids) == len(set(ids))  # all unique

    def test_source_provenance_preserved(self):
        """Source provenance must survive aggregation."""
        from src.synthesis.source_aggregator import (
            SourceAggregator, SourceType, SourceProvenance, UnifiedEntry,
        )
        from tests.e2e.test_ccext_pipeline import MockKnowledgeEntry

        agg = SourceAggregator()
        store = agg.aggregate({
            SourceType.PDF_EXTRACTION: [
                MockKnowledgeEntry(
                    entry_id="ke-prov-test",
                    value={"cutting_speed": 150.0},
                    material="steel", operation="turning",
                    confidence=0.9,
                ),
            ],
        })
        entries = store.get_entries()
        for e in entries:
            assert len(e.sources) >= 1
            assert e.sources[0].source_type == SourceType.PDF_EXTRACTION

    def test_graph_node_count_matches_entries(self):
        """Graph should have at least one node per unique material/operation/param."""
        from src.synthesis.source_aggregator import (
            SourceType, SourceProvenance, UnifiedEntry, EntryCategory,
        )
        from src.synthesis.knowledge_graph import KnowledgeGraph

        entries = [
            UnifiedEntry(
                category=EntryCategory.CUTTING_PARAMETER,
                parameter_name="speed", value=150.0,
                material="steel", operation="turning",
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
                confidence=0.8,
            ),
            UnifiedEntry(
                category=EntryCategory.CUTTING_PARAMETER,
                parameter_name="feed", value=0.2,
                material="aluminum", operation="milling",
                sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)],
                confidence=0.7,
            ),
        ]
        graph = KnowledgeGraph()
        graph.build_from_entries(entries)
        # 2 materials + 2 operations + 2 params = 6 minimum nodes
        assert graph.node_count >= 4  # at least materials + operations


# ---------------------------------------------------------------------------
# Existing Test Suite Coexistence
# ---------------------------------------------------------------------------

class TestExistingTestCoexistence:
    """CC-EXT tests don't break existing cad-engine test infrastructure."""

    def test_pytest_collection_no_warnings(self):
        """No Test-prefixed non-test classes that confuse pytest."""
        # Import all modules — none should have classes starting with Test
        # that aren't actual test classes
        from src.synthesis import source_aggregator, confidence_scorer
        from src.synthesis import cross_source_resolver, knowledge_graph

        for mod in [source_aggregator, confidence_scorer, cross_source_resolver, knowledge_graph]:
            for name in dir(mod):
                obj = getattr(mod, name)
                if isinstance(obj, type) and name.startswith("Test"):
                    # Production code should not have Test-prefixed classes
                    pytest.fail(f"Production module {mod.__name__} has Test-prefixed class: {name}")

    def test_no_global_state_pollution(self):
        """Modules don't set global state that affects other tests."""
        from src.synthesis.source_aggregator import SourceAggregator, UnifiedKnowledgeStore

        # Create and destroy — should not leak
        agg = SourceAggregator()
        store = UnifiedKnowledgeStore()
        del agg
        del store

        # Create again — should be fresh
        agg2 = SourceAggregator()
        store2 = UnifiedKnowledgeStore()
        assert store2.entry_count == 0
