"""Tool Selection Knowledge Base — CC-MS5.

Captures learned rationale for tool choices per material/operation from
video tutorials.  Stores WHY certain tools are preferred (not just WHAT
was selected) so the system can explain recommendations.

Examples of captured rationale:
- "3-flute for aluminum: better chip evacuation, prevents re-cutting"
- "TiAlN coating for hardened steel: heat resistance at high Vc"
- "Variable-helix end mill for thin walls: reduces chatter harmonics"
"""

from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional


_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "cam_strategies"
)
_KB_PATH = os.path.join(_DATA_DIR, "tool_rationale_kb.json")


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class ToolRationale:
    """A single learned rationale for a tool choice."""

    rationale_id: str
    material_class: str  # e.g. "aluminum", "steel", "titanium"
    operation_type: str  # e.g. "adaptive", "pocket_2d", "finishing_3d"
    tool_type: str       # e.g. "end_mill", "ball_mill", "face_mill"
    tool_attribute: str  # what attribute is being explained (flutes, coating, material, geometry)
    attribute_value: str  # the specific choice (e.g. "3", "TiAlN", "carbide", "variable_helix")
    rationale: str       # WHY this choice is preferred
    counter_rationale: str = ""  # when NOT to use this (optional)
    confidence: float = 0.5
    source_count: int = 0
    sources: list[dict] = field(default_factory=list)  # [{video_id, channel, timestamp}]
    tags: list[str] = field(default_factory=list)
    last_updated: str = ""

    @property
    def lookup_key(self) -> str:
        """Key for dedup: material + operation + tool_type + attribute + value."""
        return f"{self.material_class}|{self.operation_type}|{self.tool_type}|{self.tool_attribute}|{self.attribute_value}"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ToolRecommendation:
    """A tool recommendation with rationale."""

    tool_type: str
    attributes: dict[str, str]  # attribute -> value
    rationale_items: list[ToolRationale]
    combined_confidence: float

    def to_dict(self) -> dict:
        return {
            "tool_type": self.tool_type,
            "attributes": self.attributes,
            "rationale": [
                {
                    "attribute": r.tool_attribute,
                    "value": r.attribute_value,
                    "why": r.rationale,
                    "when_not": r.counter_rationale,
                    "confidence": r.confidence,
                    "sources": r.source_count,
                }
                for r in self.rationale_items
            ],
            "combined_confidence": round(self.combined_confidence, 3),
        }


# ---------------------------------------------------------------------------
# Knowledge Base
# ---------------------------------------------------------------------------


class ToolSelectionKB:
    """Stores and retrieves tool selection rationale."""

    def __init__(self, kb_path: str = _KB_PATH):
        self.kb_path = kb_path
        self.entries: dict[str, ToolRationale] = {}
        self._next_id = 1
        self._load()

    def _load(self) -> None:
        """Load from disk."""
        if not os.path.exists(self.kb_path):
            return
        try:
            with open(self.kb_path, encoding="utf-8") as f:
                data = json.load(f)
            for entry in data.get("rationale", []):
                r = ToolRationale(**{
                    k: v for k, v in entry.items()
                    if k in ToolRationale.__dataclass_fields__
                })
                self.entries[r.lookup_key] = r
                rid_num = r.rationale_id.replace("tr-", "")
                if rid_num.isdigit():
                    self._next_id = max(self._next_id, int(rid_num) + 1)
        except (OSError, json.JSONDecodeError, TypeError, KeyError):
            pass

    def save(self) -> None:
        """Persist to disk."""
        os.makedirs(os.path.dirname(self.kb_path), exist_ok=True)
        data = {
            "schema_version": "1.0.0",
            "description": "Tool selection rationale knowledge base — learned from video tutorials",
            "rationale": [r.to_dict() for r in self.entries.values()],
            "metadata": {
                "total_entries": len(self.entries),
                "materials": sorted({r.material_class for r in self.entries.values() if r.material_class}),
                "operations": sorted({r.operation_type for r in self.entries.values() if r.operation_type}),
                "last_updated": datetime.now(timezone.utc).isoformat(),
            },
        }
        with open(self.kb_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def add_rationale(
        self,
        material_class: str,
        operation_type: str,
        tool_type: str,
        tool_attribute: str,
        attribute_value: str,
        rationale: str,
        counter_rationale: str = "",
        confidence: float = 0.5,
        video_id: str = "",
        channel: str = "",
        timestamp: Optional[float] = None,
    ) -> str:
        """Add or update a tool selection rationale.

        If a matching entry exists (same material/operation/tool/attribute/value),
        merges the sources and updates confidence.

        Returns the rationale_id.
        """
        key = f"{material_class}|{operation_type}|{tool_type}|{tool_attribute}|{attribute_value}"

        source_entry = {}
        if video_id:
            source_entry = {"video_id": video_id, "channel": channel, "timestamp": timestamp}

        if key in self.entries:
            existing = self.entries[key]
            if source_entry and not any(s.get("video_id") == video_id for s in existing.sources):
                existing.sources.append(source_entry)
                existing.source_count = len(existing.sources)
            # Update confidence as weighted average
            if confidence > existing.confidence:
                existing.confidence = (existing.confidence + confidence) / 2
            if rationale and len(rationale) > len(existing.rationale):
                existing.rationale = rationale
            if counter_rationale and not existing.counter_rationale:
                existing.counter_rationale = counter_rationale
            existing.last_updated = datetime.now(timezone.utc).isoformat()
            return existing.rationale_id

        rid = f"tr-{self._next_id:04d}"
        self._next_id += 1

        entry = ToolRationale(
            rationale_id=rid,
            material_class=material_class,
            operation_type=operation_type,
            tool_type=tool_type,
            tool_attribute=tool_attribute,
            attribute_value=attribute_value,
            rationale=rationale,
            counter_rationale=counter_rationale,
            confidence=confidence,
            source_count=1 if source_entry else 0,
            sources=[source_entry] if source_entry else [],
            last_updated=datetime.now(timezone.utc).isoformat(),
        )
        self.entries[key] = entry
        return rid

    def ingest_from_strategy(
        self,
        strategy: dict,
        material_class: str,
        video_id: str = "",
        channel: str = "",
    ) -> list[str]:
        """Extract tool rationale from a CAM extraction strategy object.

        Looks at the tool definition and strategy_rationale to capture
        WHY specific tool attributes were chosen.

        Returns list of rationale_ids created/updated.
        """
        tool = strategy.get("tool", {})
        if not tool:
            return []

        op_type = strategy.get("operation_type", "other")
        tool_type = tool.get("type", "")
        rationale_text = strategy.get("strategy_rationale", "")
        prov = strategy.get("provenance", {})
        confidence = prov.get("confidence", 0.5)
        timestamp = prov.get("timestamp_seconds")

        ids: list[str] = []

        # Extract rationale for flute count
        flutes = tool.get("flutes")
        if flutes is not None:
            rid = self.add_rationale(
                material_class=material_class,
                operation_type=op_type,
                tool_type=tool_type,
                tool_attribute="flutes",
                attribute_value=str(flutes),
                rationale=rationale_text if "flute" in rationale_text.lower() else f"{flutes}-flute {tool_type} used for {op_type} on {material_class}",
                confidence=confidence,
                video_id=video_id,
                channel=channel,
                timestamp=timestamp,
            )
            ids.append(rid)

        # Extract rationale for coating
        coating = tool.get("coating")
        if coating and coating != "uncoated":
            rid = self.add_rationale(
                material_class=material_class,
                operation_type=op_type,
                tool_type=tool_type,
                tool_attribute="coating",
                attribute_value=coating,
                rationale=rationale_text if "coat" in rationale_text.lower() else f"{coating} coating used for {op_type} on {material_class}",
                confidence=confidence,
                video_id=video_id,
                channel=channel,
                timestamp=timestamp,
            )
            ids.append(rid)

        # Extract rationale for tool material
        tool_mat = tool.get("material")
        if tool_mat:
            rid = self.add_rationale(
                material_class=material_class,
                operation_type=op_type,
                tool_type=tool_type,
                tool_attribute="material",
                attribute_value=tool_mat,
                rationale=rationale_text if tool_mat.lower() in rationale_text.lower() else f"{tool_mat} tool used for {op_type} on {material_class}",
                confidence=confidence,
                video_id=video_id,
                channel=channel,
                timestamp=timestamp,
            )
            ids.append(rid)

        return ids

    def query(
        self,
        material_class: str = "",
        operation_type: str = "",
        tool_type: str = "",
        tool_attribute: str = "",
        min_confidence: float = 0.0,
    ) -> list[ToolRationale]:
        """Query rationale entries matching filters."""
        results = []
        for entry in self.entries.values():
            if material_class and entry.material_class != material_class:
                continue
            if operation_type and entry.operation_type != operation_type:
                continue
            if tool_type and entry.tool_type != tool_type:
                continue
            if tool_attribute and entry.tool_attribute != tool_attribute:
                continue
            if entry.confidence < min_confidence:
                continue
            results.append(entry)

        results.sort(key=lambda r: (-r.confidence, -r.source_count))
        return results

    def recommend_tool(
        self,
        material_class: str,
        operation_type: str,
    ) -> list[ToolRecommendation]:
        """Get tool recommendations with rationale for a material/operation combo.

        Groups rationale by tool_type and returns ranked recommendations.
        """
        entries = self.query(material_class=material_class, operation_type=operation_type)

        # Group by tool_type
        by_tool: dict[str, list[ToolRationale]] = {}
        for entry in entries:
            by_tool.setdefault(entry.tool_type, []).append(entry)

        recommendations = []
        for tool_type, rationale_list in by_tool.items():
            attributes = {}
            for r in rationale_list:
                attributes[r.tool_attribute] = r.attribute_value

            combined_conf = sum(r.confidence for r in rationale_list) / len(rationale_list)

            recommendations.append(ToolRecommendation(
                tool_type=tool_type,
                attributes=attributes,
                rationale_items=rationale_list,
                combined_confidence=combined_conf,
            ))

        recommendations.sort(key=lambda r: (-r.combined_confidence, -len(r.rationale_items)))
        return recommendations

    def summary(self) -> dict:
        """Return a summary of the KB contents."""
        return {
            "total_entries": len(self.entries),
            "materials": sorted({r.material_class for r in self.entries.values() if r.material_class}),
            "operations": sorted({r.operation_type for r in self.entries.values() if r.operation_type}),
            "attributes": sorted({r.tool_attribute for r in self.entries.values()}),
        }
