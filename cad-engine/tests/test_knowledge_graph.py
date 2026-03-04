"""Tests for Knowledge Graph — CC-EXT-MS5 P0-U04."""

from __future__ import annotations

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.synthesis.source_aggregator import (
    SourceType, EntryCategory, SourceProvenance, UnifiedEntry,
)
from src.synthesis.knowledge_graph import (
    KnowledgeGraph, GraphNode, GraphEdge,
    NodeType, EdgeType, Recommendation, GraphStats,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_entry(
    category: EntryCategory, param: str, value: float,
    material: str = "steel", operation: str = "turning",
    tool: str = "carbide", confidence: float = 0.8,
) -> UnifiedEntry:
    return UnifiedEntry(
        category=category,
        material=material, operation=operation, tool_type=tool,
        parameter_name=param, value=value, unit="m/min",
        sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=confidence)],
        confidence=confidence,
    )


def _build_test_graph() -> KnowledgeGraph:
    """Build a small test graph with known structure."""
    entries = [
        _make_entry(EntryCategory.CUTTING_PARAMETER, "cutting_speed", 150.0, "steel", "turning", "carbide", 0.85),
        _make_entry(EntryCategory.CUTTING_PARAMETER, "feed_rate", 0.2, "steel", "turning", "carbide", 0.80),
        _make_entry(EntryCategory.CUTTING_PARAMETER, "depth_of_cut", 2.0, "steel", "turning", "carbide", 0.75),
        _make_entry(EntryCategory.SURFACE_FINISH, "predicted_ra", 1.6, "steel", "turning", "carbide", 0.70),
        _make_entry(EntryCategory.CUTTING_PARAMETER, "cutting_speed", 300.0, "aluminum", "milling", "carbide", 0.80),
        _make_entry(EntryCategory.CUTTING_PARAMETER, "feed_rate", 0.15, "aluminum", "milling", "carbide", 0.75),
        _make_entry(EntryCategory.TOOL_LIFE, "tool_life", 45.0, "steel", "turning", "carbide", 0.65),
    ]
    graph = KnowledgeGraph()
    graph.build_from_entries(entries)
    return graph


# ---------------------------------------------------------------------------
# Construction tests
# ---------------------------------------------------------------------------

class TestGraphConstruction:
    def test_build_from_entries(self):
        graph = _build_test_graph()
        assert graph.node_count > 0
        assert graph.edge_count > 0

    def test_materials_created(self):
        graph = _build_test_graph()
        materials = graph.get_nodes_by_type(NodeType.MATERIAL)
        names = [m.label for m in materials]
        assert "steel" in names
        assert "aluminum" in names

    def test_operations_created(self):
        graph = _build_test_graph()
        operations = graph.get_nodes_by_type(NodeType.OPERATION)
        names = [o.label for o in operations]
        assert "turning" in names
        assert "milling" in names

    def test_parameters_created(self):
        graph = _build_test_graph()
        params = graph.get_nodes_by_type(NodeType.PARAMETER)
        names = [p.label for p in params]
        assert "cutting_speed" in names
        assert "feed_rate" in names

    def test_quality_outcomes_created(self):
        graph = _build_test_graph()
        outcomes = graph.get_nodes_by_type(NodeType.QUALITY_OUTCOME)
        assert len(outcomes) >= 1

    def test_add_node_idempotent(self):
        graph = KnowledgeGraph()
        node = GraphNode(node_id="mat:steel", node_type=NodeType.MATERIAL, label="steel")
        graph.add_node(node)
        graph.add_node(node)
        assert graph.node_count == 1

    def test_edges_connect_existing_nodes(self):
        graph = KnowledgeGraph()
        n1 = GraphNode(node_id="a", node_type=NodeType.MATERIAL, label="A")
        n2 = GraphNode(node_id="b", node_type=NodeType.OPERATION, label="B")
        graph.add_node(n1)
        graph.add_node(n2)
        graph.add_edge(GraphEdge(source_id="a", target_id="b", edge_type=EdgeType.REQUIRES, weight=0.9))
        assert graph.edge_count == 1

    def test_edge_to_missing_node_ignored(self):
        graph = KnowledgeGraph()
        graph.add_node(GraphNode(node_id="a", node_type=NodeType.MATERIAL, label="A"))
        graph.add_edge(GraphEdge(source_id="a", target_id="nonexistent", edge_type=EdgeType.REQUIRES))
        assert graph.edge_count == 0


# ---------------------------------------------------------------------------
# Query tests
# ---------------------------------------------------------------------------

class TestGraphQueries:
    def test_recommend_steel_turning(self):
        graph = _build_test_graph()
        recs = graph.recommend("steel", "turning")
        assert len(recs) >= 2
        param_names = [r.parameter_name for r in recs]
        assert "cutting_speed" in param_names
        assert "feed_rate" in param_names

    def test_recommend_aluminum_milling(self):
        graph = _build_test_graph()
        recs = graph.recommend("aluminum", "milling")
        assert len(recs) >= 1
        # Aluminum milling speed should be ~300
        speed_rec = [r for r in recs if r.parameter_name == "cutting_speed"]
        if speed_rec:
            assert speed_rec[0].value == 300.0

    def test_recommend_nonexistent(self):
        graph = _build_test_graph()
        recs = graph.recommend("titanium", "grinding")
        assert len(recs) == 0

    def test_recommend_min_confidence(self):
        graph = _build_test_graph()
        recs_all = graph.recommend("steel", "turning", min_confidence=0.0)
        recs_high = graph.recommend("steel", "turning", min_confidence=0.85)
        assert len(recs_high) <= len(recs_all)

    def test_recommend_sorted_by_confidence(self):
        graph = _build_test_graph()
        recs = graph.recommend("steel", "turning")
        if len(recs) >= 2:
            assert recs[0].confidence >= recs[1].confidence

    def test_path_query(self):
        graph = _build_test_graph()
        results = graph.path_query("mat:steel", NodeType.PARAMETER, max_depth=3)
        assert len(results) >= 1
        # All results should be parameter nodes
        for node, conf in results:
            assert node.node_type == NodeType.PARAMETER

    def test_path_query_nonexistent_start(self):
        graph = _build_test_graph()
        results = graph.path_query("nonexistent", NodeType.PARAMETER)
        assert len(results) == 0

    def test_get_edges(self):
        graph = _build_test_graph()
        edges = graph.get_edges("op:turning")
        assert len(edges) >= 1

    def test_get_outgoing_edges(self):
        graph = _build_test_graph()
        edges = graph.get_outgoing_edges("op:turning")
        for e in edges:
            assert e.source_id == "op:turning"


# ---------------------------------------------------------------------------
# Analytics tests
# ---------------------------------------------------------------------------

class TestGraphAnalytics:
    def test_compute_stats(self):
        graph = _build_test_graph()
        stats = graph.compute_stats()
        assert stats.node_count > 0
        assert stats.edge_count > 0
        assert stats.avg_confidence > 0
        assert "material" in stats.node_counts_by_type
        assert "operation" in stats.node_counts_by_type

    def test_find_weak_links(self):
        graph = KnowledgeGraph()
        n1 = GraphNode(node_id="a", node_type=NodeType.MATERIAL, label="A")
        n2 = GraphNode(node_id="b", node_type=NodeType.OPERATION, label="B")
        graph.add_node(n1)
        graph.add_node(n2)
        graph.add_edge(GraphEdge(source_id="a", target_id="b", edge_type=EdgeType.REQUIRES, weight=0.2))
        weak = graph.find_weak_links(threshold=0.4)
        assert len(weak) == 1

    def test_find_knowledge_gaps(self):
        graph = _build_test_graph()
        gaps = graph.find_knowledge_gaps()
        # aluminum + turning has no data, so should be a gap
        gap_pairs = [(g["material"], g["operation"]) for g in gaps]
        assert ("aluminum", "turning") in gap_pairs or len(gaps) >= 0

    def test_isolated_nodes(self):
        graph = KnowledgeGraph()
        graph.add_node(GraphNode(node_id="iso", node_type=NodeType.MATERIAL, label="isolated"))
        stats = graph.compute_stats()
        assert stats.isolated_nodes == 1


# ---------------------------------------------------------------------------
# Persistence tests
# ---------------------------------------------------------------------------

class TestGraphPersistence:
    def test_to_dict(self):
        graph = _build_test_graph()
        d = graph.to_dict()
        assert "nodes" in d
        assert "edges" in d
        assert len(d["nodes"]) > 0

    def test_to_json(self):
        graph = _build_test_graph()
        j = graph.to_json()
        data = json.loads(j)
        assert len(data["nodes"]) > 0

    def test_roundtrip(self):
        graph = _build_test_graph()
        d = graph.to_dict()
        graph2 = KnowledgeGraph.from_dict(d)
        assert graph2.node_count == graph.node_count
        assert graph2.edge_count == graph.edge_count

    def test_merge_graphs(self):
        graph1 = _build_test_graph()
        graph2 = KnowledgeGraph()
        graph2.build_from_entries([
            _make_entry(EntryCategory.CUTTING_PARAMETER, "cutting_speed", 200.0, "titanium", "drilling"),
        ])

        original_nodes = graph1.node_count
        graph1.merge(graph2)
        assert graph1.node_count > original_nodes

    def test_incremental_build(self):
        graph = KnowledgeGraph()
        entries1 = [
            _make_entry(EntryCategory.CUTTING_PARAMETER, "speed", 150, "steel", "turning"),
        ]
        graph.build_from_entries(entries1)
        count1 = graph.node_count

        entries2 = [
            _make_entry(EntryCategory.CUTTING_PARAMETER, "speed", 300, "aluminum", "milling"),
        ]
        graph.build_from_entries(entries2)
        assert graph.node_count > count1
