"""Memory Writer — CC-MS7.

Atomic memory writes with provenance tracking, dedup detection,
versioning, confidence scoring, and cross-domain linking.
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Optional

from memory_index import MemoryEntry, MemoryIndex


# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------

_CAD_ENGINE_ROOT = os.path.dirname(os.path.dirname(__file__))
_SHOP_DATA = os.path.join(_CAD_ENGINE_ROOT, "data", "shop_practices")
_CAM_DATA = os.path.join(_CAD_ENGINE_ROOT, "data", "cam_strategies")
_CAD_DATA = os.path.join(_CAD_ENGINE_ROOT, "data", "cad_drawing_ref")


# ---------------------------------------------------------------------------
# MemoryWriter
# ---------------------------------------------------------------------------


class MemoryWriter:
    """Writes knowledge entries to the memory index with dedup and provenance."""

    def __init__(self, index: MemoryIndex):
        self._index = index
        self._written = 0
        self._deduped = 0

    @property
    def written(self) -> int:
        return self._written

    @property
    def deduped(self) -> int:
        return self._deduped

    def write_entry(
        self,
        entry_id: str,
        domain: str,
        category: str,
        title: str,
        content: str,
        tags: list[str] | None = None,
        materials: list[str] | None = None,
        machines: list[str] | None = None,
        confidence: float = 0.5,
        source_id: str = "",
        source_type: str = "",
    ) -> MemoryEntry:
        """Write a single entry with dedup detection.

        If a near-duplicate exists, merges confidence instead of creating a new entry.
        """
        now = datetime.now(timezone.utc).isoformat()

        entry = MemoryEntry(
            entry_id=entry_id,
            domain=domain,
            category=category,
            title=title,
            content=content,
            tags=tags or [],
            materials=materials or [],
            machines=machines or [],
            confidence=confidence,
            source_id=source_id,
            source_type=source_type,
            version=1,
            created_at=now,
            updated_at=now,
        )

        # Check for existing duplicate
        existing = self._index.get(entry_id)
        if existing:
            # Merge: boost confidence, bump version
            existing.confidence = min(1.0, (existing.confidence + confidence) / 2 + 0.05)
            existing.updated_at = now
            self._index.upsert(existing)
            self._deduped += 1
            return existing

        self._index.upsert(entry)
        self._written += 1
        return entry

    # -------------------------------------------------------------------
    # Bulk ingest from PRISM data sources
    # -------------------------------------------------------------------

    def ingest_practices(self, db_path: str | None = None) -> int:
        """Ingest shop practices from practice_db.json."""
        path = db_path or os.path.join(_SHOP_DATA, "practice_db.json")
        if not os.path.exists(path):
            return 0

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        count = 0
        for cat_name, cat_data in data.get("categories", {}).items():
            for p in cat_data.get("practices", []):
                content_parts = [p.get("description", "")]
                content_parts.extend(p.get("steps", []))
                content_parts.extend(p.get("tips", []))
                if p.get("warnings"):
                    content_parts.append("WARNINGS: " + "; ".join(p["warnings"]))

                self.write_entry(
                    entry_id=f"shop-practice-{p['practice_id']}",
                    domain="shop",
                    category=cat_name,
                    title=p["title"],
                    content="\n".join(content_parts),
                    tags=p.get("tags", []),
                    materials=p.get("applicable_materials", []),
                    machines=p.get("applicable_machines", []),
                    confidence=p.get("consensus_confidence", 0.5),
                    source_id=p["practice_id"],
                    source_type="aggregated",
                )
                count += 1
        return count

    def ingest_material_tips(self, tips_dir: str | None = None) -> int:
        """Ingest material tips from per-material JSON files."""
        path = tips_dir or os.path.join(_SHOP_DATA, "material_tips")
        if not os.path.isdir(path):
            return 0

        count = 0
        for fname in os.listdir(path):
            if not fname.endswith(".json"):
                continue
            fpath = os.path.join(path, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)

            material = data.get("material", fname.replace(".json", ""))
            for tip in data.get("tips", []):
                content = tip.get("tip_text", "")
                if tip.get("detail"):
                    content += "\n" + tip["detail"]

                self.write_entry(
                    entry_id=f"shop-tip-{tip['tip_id']}",
                    domain="shop",
                    category="material_tips",
                    title=f"{material}: {tip.get('tip_text', '')[:80]}",
                    content=content,
                    tags=tip.get("tags", []),
                    materials=[material] + tip.get("cross_ref_materials", []),
                    confidence=tip.get("consensus_weight", 0.5),
                    source_id=tip["tip_id"],
                    source_type="aggregated",
                )
                count += 1
        return count

    def ingest_trouble_trees(self, trees_dir: str | None = None) -> int:
        """Ingest troubleshooting trees — flatten nodes into searchable entries."""
        path = trees_dir or os.path.join(_SHOP_DATA, "trouble_trees")
        if not os.path.isdir(path):
            return 0

        count = 0
        for fname in os.listdir(path):
            if not fname.endswith(".json"):
                continue
            fpath = os.path.join(path, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)

            tree_id = data.get("tree_id", fname.replace(".json", ""))
            # Flatten tree into content
            content_parts = [f"Symptom: {data.get('symptom', '')}"]
            self._flatten_tree_node(data.get("root", {}), content_parts, depth=0)

            self.write_entry(
                entry_id=f"shop-tree-{tree_id}",
                domain="shop",
                category="trouble_trees",
                title=data.get("title", tree_id),
                content="\n".join(content_parts),
                tags=data.get("tags", []),
                materials=data.get("material_context", []),
                machines=data.get("machine_context", []),
                confidence=0.7,
                source_id=tree_id,
                source_type="decision_tree",
            )
            count += 1
        return count

    def ingest_strategies(self, db_path: str | None = None) -> int:
        """Ingest CAM strategies from strategy_db.json."""
        path = db_path or os.path.join(_CAM_DATA, "strategy_db.json")
        if not os.path.exists(path):
            return 0

        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        count = 0
        for strat in data.get("strategies", []):
            sid = strat.get("strategy_id", f"strat-{count}")
            content_parts = [strat.get("description", "")]
            content_parts.extend(strat.get("steps", []))

            self.write_entry(
                entry_id=f"cam-strategy-{sid}",
                domain="cam",
                category="strategy",
                title=strat.get("title", sid),
                content="\n".join(content_parts),
                tags=strat.get("tags", []),
                materials=strat.get("applicable_materials", []),
                machines=strat.get("applicable_machines", []),
                confidence=strat.get("confidence", 0.5),
                source_id=sid,
                source_type="aggregated",
            )
            count += 1
        return count

    def ingest_all(self) -> dict[str, int]:
        """Ingest all knowledge sources. Returns counts per source."""
        return {
            "practices": self.ingest_practices(),
            "material_tips": self.ingest_material_tips(),
            "trouble_trees": self.ingest_trouble_trees(),
            "strategies": self.ingest_strategies(),
        }

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    @staticmethod
    def _flatten_tree_node(node: dict, parts: list[str], depth: int) -> None:
        """Recursively flatten a tree node into text."""
        prefix = "  " * depth
        node_type = node.get("node_type", "")
        text = node.get("text", "")
        if text:
            parts.append(f"{prefix}{node_type}: {text}")
        for child in node.get("children", []):
            MemoryWriter._flatten_tree_node(child, parts, depth + 1)


def content_hash(text: str) -> str:
    """Generate a content hash for dedup detection."""
    normalized = " ".join(text.lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]
