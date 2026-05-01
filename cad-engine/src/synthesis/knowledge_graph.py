"""Unified Knowledge Graph Builder — CC-EXT-MS5 P0-U04.

Builds a queryable knowledge graph from aggregated, scored, and
conflict-resolved knowledge entries.

Graph structure:
- Nodes: materials, tools, operations, parameters, quality outcomes
- Edges: relationships with confidence-weighted connections
- Queries: path traversal, recommendations, gap detection
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

from .source_aggregator import UnifiedEntry, EntryCategory


# ---------------------------------------------------------------------------
# Node/Edge types
# ---------------------------------------------------------------------------

class NodeType(Enum):
    MATERIAL = "material"
    TOOL = "tool"
    OPERATION = "operation"
    PARAMETER = "parameter"
    QUALITY_OUTCOME = "quality_outcome"
    MACHINE = "machine"


class EdgeType(Enum):
    REQUIRES = "requires"           # material -> tool
    PRODUCES = "produces"           # operation -> quality_outcome
    AFFECTS = "affects"             # parameter -> quality_outcome
    CORRELATES = "correlates"       # parameter <-> parameter
    RECOMMENDS = "recommends"       # operation -> parameter (with value)
    USED_IN = "used_in"             # tool -> operation
    MEASURED_AT = "measured_at"     # quality_outcome -> parameter (value)


# ---------------------------------------------------------------------------
# Graph data types
# ---------------------------------------------------------------------------

@dataclass
class GraphNode:
    """A node in the knowledge graph."""
    node_id: str
    node_type: NodeType
    label: str
    properties: dict = field(default_factory=dict)
    source_entries: list[str] = field(default_factory=list)  # entry_ids

    def to_dict(self) -> dict:
        return {
            "id": self.node_id,
            "type": self.node_type.value,
            "label": self.label,
            "properties": self.properties,
        }


@dataclass
class GraphEdge:
    """A weighted edge in the knowledge graph."""
    source_id: str
    target_id: str
    edge_type: EdgeType
    weight: float = 0.0       # confidence weight
    value: float = 0.0        # parameter value if applicable
    unit: str = ""
    properties: dict = field(default_factory=dict)
    entry_id: str = ""        # originating UnifiedEntry

    @property
    def edge_key(self) -> str:
        return f"{self.source_id}->{self.target_id}:{self.edge_type.value}"

    def to_dict(self) -> dict:
        return {
            "source": self.source_id,
            "target": self.target_id,
            "type": self.edge_type.value,
            "weight": round(self.weight, 4),
            "value": self.value,
            "unit": self.unit,
        }


@dataclass
class Recommendation:
    """A recommendation from graph traversal."""
    parameter_name: str
    value: float
    unit: str = ""
    confidence: float = 0.0
    path_length: int = 0
    sources: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "parameter": self.parameter_name,
            "value": self.value,
            "unit": self.unit,
            "confidence": round(self.confidence, 4),
        }


@dataclass
class GraphStats:
    """Knowledge graph statistics."""
    node_count: int = 0
    edge_count: int = 0
    node_counts_by_type: dict[str, int] = field(default_factory=dict)
    avg_confidence: float = 0.0
    weak_edges: int = 0  # edges with confidence < 0.4
    isolated_nodes: int = 0  # nodes with no edges


# ---------------------------------------------------------------------------
# Knowledge Graph
# ---------------------------------------------------------------------------

class KnowledgeGraph:
    """Unified knowledge graph with query engine and analytics."""

    def __init__(self):
        self._nodes: dict[str, GraphNode] = {}
        self._edges: dict[str, GraphEdge] = {}  # unused, kept for compat
        self._adjacency: dict[str, list[int]] = {}  # node_id -> [edge indices]
        self._edge_list: list[GraphEdge] = []

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    @property
    def edge_count(self) -> int:
        return len(self._edge_list)

    # -------------------------------------------------------------------
    # Construction
    # -------------------------------------------------------------------

    def add_node(self, node: GraphNode) -> str:
        """Add or update a node. Returns node_id."""
        if node.node_id in self._nodes:
            existing = self._nodes[node.node_id]
            existing.properties.update(node.properties)
            existing.source_entries.extend(node.source_entries)
        else:
            self._nodes[node.node_id] = node
        return node.node_id

    def add_edge(self, edge: GraphEdge) -> None:
        """Add an edge between two nodes."""
        # Ensure nodes exist
        if edge.source_id not in self._nodes:
            return
        if edge.target_id not in self._nodes:
            return

        idx = len(self._edge_list)
        self._edge_list.append(edge)
        self._adjacency.setdefault(edge.source_id, []).append(idx)
        self._adjacency.setdefault(edge.target_id, []).append(idx)

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self._nodes.get(node_id)

    def get_edges(self, node_id: str) -> list[GraphEdge]:
        """Get all edges connected to a node."""
        indices = self._adjacency.get(node_id, [])
        return [self._edge_list[i] for i in indices]

    def get_outgoing_edges(self, node_id: str) -> list[GraphEdge]:
        """Get edges originating from a node."""
        return [e for e in self.get_edges(node_id) if e.source_id == node_id]

    def get_nodes_by_type(self, node_type: NodeType) -> list[GraphNode]:
        return [n for n in self._nodes.values() if n.node_type == node_type]

    # -------------------------------------------------------------------
    # Build from entries
    # -------------------------------------------------------------------

    def build_from_entries(self, entries: list[UnifiedEntry]) -> None:
        """Construct graph from a list of unified knowledge entries."""
        for entry in entries:
            if entry.is_duplicate:
                continue
            self._add_entry_to_graph(entry)

    def _add_entry_to_graph(self, entry: UnifiedEntry) -> None:
        """Convert a unified entry into graph nodes and edges."""
        # Create material node if specified
        mat_id = None
        if entry.material:
            mat_id = f"mat:{entry.material.lower()}"
            self.add_node(GraphNode(
                node_id=mat_id,
                node_type=NodeType.MATERIAL,
                label=entry.material,
                source_entries=[entry.entry_id],
            ))

        # Create operation node if specified
        op_id = None
        if entry.operation:
            op_id = f"op:{entry.operation.lower()}"
            self.add_node(GraphNode(
                node_id=op_id,
                node_type=NodeType.OPERATION,
                label=entry.operation,
                source_entries=[entry.entry_id],
            ))

        # Create tool node if specified
        tool_id = None
        if entry.tool_type:
            tool_id = f"tool:{entry.tool_type.lower()}"
            self.add_node(GraphNode(
                node_id=tool_id,
                node_type=NodeType.TOOL,
                label=entry.tool_type,
                source_entries=[entry.entry_id],
            ))

        # Create parameter or outcome node
        if entry.category in (EntryCategory.CUTTING_PARAMETER, EntryCategory.PRACTICE):
            param_id = f"param:{entry.parameter_name.lower()}"
            self.add_node(GraphNode(
                node_id=param_id,
                node_type=NodeType.PARAMETER,
                label=entry.parameter_name,
                properties={"value": entry.value, "unit": entry.unit},
                source_entries=[entry.entry_id],
            ))

            # Link: operation -> recommends -> parameter
            if op_id:
                self.add_edge(GraphEdge(
                    source_id=op_id, target_id=param_id,
                    edge_type=EdgeType.RECOMMENDS,
                    weight=entry.confidence,
                    value=entry.value, unit=entry.unit,
                    entry_id=entry.entry_id,
                ))

            # Link: parameter -> affects -> material context
            if mat_id:
                self.add_edge(GraphEdge(
                    source_id=param_id, target_id=mat_id,
                    edge_type=EdgeType.AFFECTS,
                    weight=entry.confidence,
                    entry_id=entry.entry_id,
                ))

        elif entry.category in (EntryCategory.SURFACE_FINISH, EntryCategory.TOLERANCE):
            outcome_id = f"quality:{entry.parameter_name.lower()}"
            self.add_node(GraphNode(
                node_id=outcome_id,
                node_type=NodeType.QUALITY_OUTCOME,
                label=entry.parameter_name,
                properties={"value": entry.value, "unit": entry.unit},
                source_entries=[entry.entry_id],
            ))

            if op_id:
                self.add_edge(GraphEdge(
                    source_id=op_id, target_id=outcome_id,
                    edge_type=EdgeType.PRODUCES,
                    weight=entry.confidence,
                    value=entry.value, unit=entry.unit,
                    entry_id=entry.entry_id,
                ))

        elif entry.category == EntryCategory.TOOL_LIFE:
            if tool_id and op_id:
                self.add_edge(GraphEdge(
                    source_id=tool_id, target_id=op_id,
                    edge_type=EdgeType.USED_IN,
                    weight=entry.confidence,
                    entry_id=entry.entry_id,
                ))

        # Link material -> requires -> tool
        if mat_id and tool_id:
            self.add_edge(GraphEdge(
                source_id=mat_id, target_id=tool_id,
                edge_type=EdgeType.REQUIRES,
                weight=entry.confidence,
                entry_id=entry.entry_id,
            ))

    # -------------------------------------------------------------------
    # Queries
    # -------------------------------------------------------------------

    def recommend(
        self,
        material: str,
        operation: str,
        min_confidence: float = 0.0,
    ) -> list[Recommendation]:
        """Get parameter recommendations for a material+operation pair.

        Traverses: material -> operation -> parameters with confidence scores.
        """
        results = []
        op_id = f"op:{operation.lower()}"
        mat_id = f"mat:{material.lower()}"

        if op_id not in self._nodes:
            return results

        # Get all parameter edges from this operation
        for edge in self.get_outgoing_edges(op_id):
            if edge.edge_type != EdgeType.RECOMMENDS:
                continue
            if edge.weight < min_confidence:
                continue

            target = self.get_node(edge.target_id)
            if target is None or target.node_type != NodeType.PARAMETER:
                continue

            # Check if parameter is relevant to this material
            material_relevant = True
            if mat_id in self._nodes:
                # Check for material-specific edges from this parameter
                param_edges = self.get_edges(edge.target_id)
                mat_edges = [e for e in param_edges
                             if e.target_id == mat_id or e.source_id == mat_id]
                if mat_edges:
                    material_relevant = True

            if material_relevant:
                results.append(Recommendation(
                    parameter_name=target.label,
                    value=edge.value,
                    unit=edge.unit,
                    confidence=edge.weight,
                    path_length=1,
                    sources=target.source_entries[:5],
                ))

        # Sort by confidence descending
        results.sort(key=lambda r: r.confidence, reverse=True)
        return results

    def path_query(
        self,
        start_id: str,
        target_type: NodeType,
        max_depth: int = 3,
    ) -> list[tuple[GraphNode, float]]:
        """Find all reachable nodes of target_type with cumulative confidence."""
        if start_id not in self._nodes:
            return []

        visited: set[str] = set()
        results: list[tuple[GraphNode, float]] = []
        queue: list[tuple[str, float, int]] = [(start_id, 1.0, 0)]

        while queue:
            current_id, cum_conf, depth = queue.pop(0)
            if current_id in visited:
                continue
            visited.add(current_id)

            node = self.get_node(current_id)
            if node and node.node_type == target_type and current_id != start_id:
                results.append((node, cum_conf))

            if depth >= max_depth:
                continue

            for edge in self.get_edges(current_id):
                next_id = edge.target_id if edge.source_id == current_id else edge.source_id
                if next_id not in visited:
                    queue.append((next_id, cum_conf * edge.weight, depth + 1))

        results.sort(key=lambda r: r[1], reverse=True)
        return results

    # -------------------------------------------------------------------
    # Analytics
    # -------------------------------------------------------------------

    def compute_stats(self) -> GraphStats:
        """Compute graph statistics."""
        stats = GraphStats()
        stats.node_count = self.node_count
        stats.edge_count = self.edge_count

        # Count by type
        for node in self._nodes.values():
            key = node.node_type.value
            stats.node_counts_by_type[key] = stats.node_counts_by_type.get(key, 0) + 1

        # Average confidence
        if self._edge_list:
            stats.avg_confidence = sum(e.weight for e in self._edge_list) / len(self._edge_list)

        # Weak edges
        stats.weak_edges = sum(1 for e in self._edge_list if e.weight < 0.4)

        # Isolated nodes
        connected = set()
        for edge in self._edge_list:
            connected.add(edge.source_id)
            connected.add(edge.target_id)
        stats.isolated_nodes = sum(
            1 for nid in self._nodes if nid not in connected
        )

        return stats

    def find_knowledge_gaps(self) -> list[dict]:
        """Identify missing expected relationships (knowledge gaps)."""
        gaps = []
        materials = self.get_nodes_by_type(NodeType.MATERIAL)
        operations = self.get_nodes_by_type(NodeType.OPERATION)

        for mat in materials:
            for op in operations:
                # Check if this material+operation has parameter recommendations
                recommendations = self.recommend(mat.label, op.label)
                if not recommendations:
                    gaps.append({
                        "type": "missing_recommendation",
                        "material": mat.label,
                        "operation": op.label,
                        "description": f"No parameter recommendations for {mat.label} + {op.label}",
                    })

        return gaps

    def find_weak_links(self, threshold: float = 0.4) -> list[GraphEdge]:
        """Find edges with confidence below threshold."""
        return [e for e in self._edge_list if e.weight < threshold]

    # -------------------------------------------------------------------
    # Persistence
    # -------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Serialize graph to dict (JSON-compatible)."""
        return {
            "nodes": [n.to_dict() for n in self._nodes.values()],
            "edges": [e.to_dict() for e in self._edge_list],
            "stats": {
                "node_count": self.node_count,
                "edge_count": self.edge_count,
            },
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, data: dict) -> KnowledgeGraph:
        """Deserialize graph from dict."""
        graph = cls()

        for nd in data.get("nodes", []):
            node = GraphNode(
                node_id=nd["id"],
                node_type=NodeType(nd["type"]),
                label=nd["label"],
                properties=nd.get("properties", {}),
            )
            graph.add_node(node)

        for ed in data.get("edges", []):
            edge = GraphEdge(
                source_id=ed["source"],
                target_id=ed["target"],
                edge_type=EdgeType(ed["type"]),
                weight=ed.get("weight", 0.0),
                value=ed.get("value", 0.0),
                unit=ed.get("unit", ""),
            )
            graph.add_edge(edge)

        return graph

    def merge(self, other: KnowledgeGraph) -> None:
        """Merge another graph into this one (incremental update)."""
        for node in other._nodes.values():
            self.add_node(node)
        for edge in other._edge_list:
            self.add_edge(edge)
