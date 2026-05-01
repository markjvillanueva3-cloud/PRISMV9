"""Troubleshooting Decision Tree Generator — CC-MS6.

Builds navigable decision trees from troubleshooting practices:
  symptom -> probable causes -> diagnostic steps -> solutions

Trees are serialized to JSON for persistence and can be walked
interactively or programmatically.
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional


# ---------------------------------------------------------------------------
# Data path
# ---------------------------------------------------------------------------

_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "shop_practices", "trouble_trees"
)


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class TreeNode:
    """A node in a troubleshooting decision tree."""

    node_id: str
    node_type: str  # "symptom", "cause", "diagnostic", "solution"
    text: str
    confidence: float = 0.5
    children: list[TreeNode] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "node_id": self.node_id,
            "node_type": self.node_type,
            "text": self.text,
            "confidence": round(self.confidence, 4),
            "children": [c.to_dict() for c in self.children],
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, d: dict) -> TreeNode:
        children = [cls.from_dict(c) for c in d.get("children", [])]
        return cls(
            node_id=d["node_id"],
            node_type=d["node_type"],
            text=d["text"],
            confidence=d.get("confidence", 0.5),
            children=children,
            metadata=d.get("metadata", {}),
        )

    def leaf_count(self) -> int:
        """Count leaf nodes (solutions) in subtree."""
        if not self.children:
            return 1
        return sum(c.leaf_count() for c in self.children)

    def depth(self) -> int:
        """Max depth of subtree."""
        if not self.children:
            return 1
        return 1 + max(c.depth() for c in self.children)


@dataclass
class TroubleTree:
    """A complete troubleshooting decision tree."""

    tree_id: str
    title: str
    symptom: str
    root: TreeNode
    material_context: list[str] = field(default_factory=list)
    machine_context: list[str] = field(default_factory=list)
    source_practice_ids: list[str] = field(default_factory=list)
    created_at: str = ""
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "tree_id": self.tree_id,
            "title": self.title,
            "symptom": self.symptom,
            "root": self.root.to_dict(),
            "material_context": self.material_context,
            "machine_context": self.machine_context,
            "source_practice_ids": self.source_practice_ids,
            "created_at": self.created_at,
            "tags": self.tags,
        }

    @classmethod
    def from_dict(cls, d: dict) -> TroubleTree:
        return cls(
            tree_id=d["tree_id"],
            title=d["title"],
            symptom=d["symptom"],
            root=TreeNode.from_dict(d["root"]),
            material_context=d.get("material_context", []),
            machine_context=d.get("machine_context", []),
            source_practice_ids=d.get("source_practice_ids", []),
            created_at=d.get("created_at", ""),
            tags=d.get("tags", []),
        )

    def solution_count(self) -> int:
        """Count total solutions in tree."""
        return self._count_type(self.root, "solution")

    def cause_count(self) -> int:
        """Count total causes in tree."""
        return self._count_type(self.root, "cause")

    def _count_type(self, node: TreeNode, node_type: str) -> int:
        count = 1 if node.node_type == node_type else 0
        for child in node.children:
            count += self._count_type(child, node_type)
        return count


# ---------------------------------------------------------------------------
# TroubleTreeGenerator
# ---------------------------------------------------------------------------


class TroubleTreeGenerator:
    """Generates and manages troubleshooting decision trees."""

    def __init__(self, data_dir: str = _DATA_DIR):
        self._data_dir = data_dir
        self._trees: dict[str, TroubleTree] = {}

    def load_all(self) -> int:
        """Load all trouble trees from data directory. Returns count."""
        if not os.path.isdir(self._data_dir):
            return 0

        self._trees.clear()
        for fname in os.listdir(self._data_dir):
            if fname.endswith(".json"):
                path = os.path.join(self._data_dir, fname)
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                tree = TroubleTree.from_dict(data)
                self._trees[tree.tree_id] = tree

        return len(self._trees)

    def save_all(self) -> int:
        """Save all trees to individual JSON files. Returns count."""
        os.makedirs(self._data_dir, exist_ok=True)
        for tree in self._trees.values():
            path = os.path.join(self._data_dir, f"{tree.tree_id}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(tree.to_dict(), f, indent=2, ensure_ascii=False)
        return len(self._trees)

    def save_tree(self, tree: TroubleTree) -> str:
        """Save a single tree. Returns file path."""
        os.makedirs(self._data_dir, exist_ok=True)
        path = os.path.join(self._data_dir, f"{tree.tree_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(tree.to_dict(), f, indent=2, ensure_ascii=False)
        return path

    def add_tree(self, tree: TroubleTree) -> None:
        """Register a tree."""
        self._trees[tree.tree_id] = tree

    def get(self, tree_id: str) -> TroubleTree | None:
        """Get a tree by ID."""
        return self._trees.get(tree_id)

    def list_trees(self) -> list[TroubleTree]:
        """List all loaded trees."""
        return list(self._trees.values())

    def search(self, query: str) -> list[TroubleTree]:
        """Search trees by symptom or title."""
        q = query.lower()
        return [
            t for t in self._trees.values()
            if q in t.symptom.lower() or q in t.title.lower()
        ]

    def navigate(self, tree_id: str, path: list[int] | None = None) -> TreeNode | None:
        """Walk a tree following child indices. Returns the node at path end.

        Args:
            tree_id: ID of the tree to navigate.
            path: List of child indices to follow from root.
                  Empty or None returns root.
        """
        tree = self._trees.get(tree_id)
        if tree is None:
            return None

        node = tree.root
        for idx in (path or []):
            if idx < 0 or idx >= len(node.children):
                return None
            node = node.children[idx]

        return node

    def build_tree(
        self,
        tree_id: str,
        title: str,
        symptom: str,
        causes: list[dict],
        material_context: list[str] | None = None,
        machine_context: list[str] | None = None,
        tags: list[str] | None = None,
    ) -> TroubleTree:
        """Build a tree from structured cause data.

        Args:
            tree_id: Unique tree ID.
            title: Human-readable title.
            symptom: The symptom description.
            causes: List of dicts with keys:
                - text: cause description
                - confidence: float 0..1
                - diagnostics: list of dicts with text, solutions
            material_context: Applicable materials.
            machine_context: Applicable machines.
            tags: Search tags.

        Returns:
            The constructed TroubleTree.
        """
        node_counter = [0]

        def next_id(prefix: str) -> str:
            node_counter[0] += 1
            return f"{tree_id}-{prefix}-{node_counter[0]:03d}"

        # Build root symptom node
        cause_nodes: list[TreeNode] = []

        for cause in causes:
            diag_nodes: list[TreeNode] = []

            for diag in cause.get("diagnostics", []):
                sol_nodes = [
                    TreeNode(
                        node_id=next_id("SOL"),
                        node_type="solution",
                        text=sol,
                        confidence=cause.get("confidence", 0.5),
                    )
                    for sol in diag.get("solutions", [])
                ]

                diag_nodes.append(TreeNode(
                    node_id=next_id("DIAG"),
                    node_type="diagnostic",
                    text=diag["text"],
                    confidence=cause.get("confidence", 0.5),
                    children=sol_nodes,
                ))

            cause_nodes.append(TreeNode(
                node_id=next_id("CAUSE"),
                node_type="cause",
                text=cause["text"],
                confidence=cause.get("confidence", 0.5),
                children=diag_nodes,
            ))

        root = TreeNode(
            node_id=f"{tree_id}-ROOT",
            node_type="symptom",
            text=symptom,
            confidence=1.0,
            children=cause_nodes,
        )

        tree = TroubleTree(
            tree_id=tree_id,
            title=title,
            symptom=symptom,
            root=root,
            material_context=material_context or [],
            machine_context=machine_context or [],
            created_at=datetime.now(timezone.utc).isoformat(),
            tags=tags or [],
        )

        self._trees[tree_id] = tree
        return tree
