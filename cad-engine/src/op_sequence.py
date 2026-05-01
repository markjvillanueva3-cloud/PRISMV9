"""Operation Sequencing Learner — CC-MS5.

Extracts multi-operation sequencing patterns from video tutorials:
- rough -> semi-finish -> finish ordering
- Tool change points and rationale
- Operation grouping by setup/fixturing
- Sequence frequency across multiple sources

Learns WHEN and WHY operations are ordered the way they are,
not just WHAT the order is.
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
_SEQ_PATH = os.path.join(_DATA_DIR, "operation_sequences.json")


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class OperationStep:
    """A single step in an operation sequence."""

    position: int
    operation_type: str
    tool_type: str = ""
    tool_change: bool = False  # True if tool changes from previous step
    rationale: str = ""        # why this step is in this position
    constraints: list[str] = field(default_factory=list)  # e.g. "must be before finishing"

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SequenceSource:
    """Provenance for a learned sequence."""

    video_id: str
    channel: str = ""
    confidence: float = 0.5
    timestamp_seconds: Optional[float] = None
    material_class: str = ""
    machine_type: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SequencePattern:
    """A learned multi-operation sequence pattern."""

    pattern_id: str
    name: str               # e.g. "Standard pocket roughing-to-finish"
    description: str
    category: str            # "roughing_sequence", "pocket_sequence", "hole_sequence", "turning_sequence"
    steps: list[OperationStep] = field(default_factory=list)
    applicable_materials: list[str] = field(default_factory=list)
    applicable_features: list[str] = field(default_factory=list)
    tool_change_count: int = 0
    sources: list[SequenceSource] = field(default_factory=list)
    frequency: int = 0      # how many times this pattern was observed
    confidence: float = 0.5
    last_updated: str = ""
    tags: list[str] = field(default_factory=list)

    @property
    def op_signature(self) -> str:
        """Canonical signature for pattern matching (ordered op types)."""
        return "->".join(s.operation_type for s in self.steps)

    def to_dict(self) -> dict:
        return {
            "pattern_id": self.pattern_id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "steps": [s.to_dict() for s in self.steps],
            "applicable_materials": self.applicable_materials,
            "applicable_features": self.applicable_features,
            "tool_change_count": self.tool_change_count,
            "sources": [s.to_dict() for s in self.sources],
            "frequency": self.frequency,
            "confidence": round(self.confidence, 3),
            "last_updated": self.last_updated,
            "tags": self.tags,
        }


# ---------------------------------------------------------------------------
# Sequence categories
# ---------------------------------------------------------------------------

SEQUENCE_CATEGORIES = {
    "roughing_sequence": ["adaptive", "trochoidal", "roughing_3d", "face_mill"],
    "finishing_sequence": ["contour", "profile", "finishing_3d", "rest_machining"],
    "pocket_sequence": ["pocket_2d", "pocket_3d", "adaptive", "contour"],
    "hole_sequence": ["drilling", "boring", "reaming", "tapping", "thread_mill"],
    "turning_sequence": ["turning_rough", "turning_finish", "turning_groove", "turning_thread"],
    "surface_sequence": ["roughing_3d", "rest_machining", "finishing_3d"],
}


def _categorize_sequence(op_types: list[str]) -> str:
    """Determine the category of a sequence based on its operations."""
    op_set = set(op_types)
    best_category = "general"
    best_overlap = 0

    for category, category_ops in SEQUENCE_CATEGORIES.items():
        overlap = len(op_set & set(category_ops))
        if overlap > best_overlap:
            best_overlap = overlap
            best_category = category

    return best_category


# ---------------------------------------------------------------------------
# Sequence Database
# ---------------------------------------------------------------------------


class SequenceDB:
    """Stores and retrieves operation sequence patterns."""

    def __init__(self, db_path: str = _SEQ_PATH):
        self.db_path = db_path
        self.patterns: dict[str, SequencePattern] = {}  # keyed by op_signature
        self._next_id = 1
        self._load()

    def _load(self) -> None:
        """Load from disk."""
        if not os.path.exists(self.db_path):
            return
        try:
            with open(self.db_path, encoding="utf-8") as f:
                data = json.load(f)
            for p in data.get("patterns", []):
                pattern = self._dict_to_pattern(p)
                self.patterns[pattern.op_signature] = pattern
                pid_num = pattern.pattern_id.replace("seq-", "")
                if pid_num.isdigit():
                    self._next_id = max(self._next_id, int(pid_num) + 1)
        except (OSError, json.JSONDecodeError, TypeError, KeyError):
            pass

    def _dict_to_pattern(self, d: dict) -> SequencePattern:
        """Convert dict to SequencePattern."""
        steps = [
            OperationStep(**{
                k: v for k, v in sd.items()
                if k in OperationStep.__dataclass_fields__
            })
            for sd in d.get("steps", [])
        ]
        sources = [
            SequenceSource(**{
                k: v for k, v in sd.items()
                if k in SequenceSource.__dataclass_fields__
            })
            for sd in d.get("sources", [])
        ]
        return SequencePattern(
            pattern_id=d.get("pattern_id", f"seq-{self._next_id:04d}"),
            name=d.get("name", ""),
            description=d.get("description", ""),
            category=d.get("category", "general"),
            steps=steps,
            applicable_materials=d.get("applicable_materials", []),
            applicable_features=d.get("applicable_features", []),
            tool_change_count=d.get("tool_change_count", 0),
            sources=sources,
            frequency=d.get("frequency", 0),
            confidence=d.get("confidence", 0.5),
            last_updated=d.get("last_updated", ""),
            tags=d.get("tags", []),
        )

    def save(self) -> None:
        """Persist to disk."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        data = {
            "schema_version": "1.0.0",
            "description": "Operation sequence patterns learned from video tutorials",
            "patterns": [p.to_dict() for p in self.patterns.values()],
            "metadata": {
                "total_patterns": len(self.patterns),
                "categories": sorted({p.category for p in self.patterns.values()}),
                "last_updated": datetime.now(timezone.utc).isoformat(),
            },
        }
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def ingest_extraction(
        self,
        cam_data: dict,
        video_id: str,
        channel: str = "",
        confidence: float = 0.5,
        material_class: str = "",
        machine_type: str = "",
    ) -> list[str]:
        """Extract operation sequences from CAM extraction results.

        Analyzes strategy ordering to identify multi-operation patterns.

        Returns list of pattern_ids created or updated.
        """
        strategies = cam_data.get("strategies", [])
        if len(strategies) < 2:
            return []  # need at least 2 operations for a sequence

        # Sort by sequence_order
        sorted_strats = sorted(strategies, key=lambda s: s.get("sequence_order", 0))

        # Build steps
        steps: list[OperationStep] = []
        prev_tool_type = ""
        for i, strat in enumerate(sorted_strats):
            op_type = strat.get("operation_type", "other")
            tool = strat.get("tool", {})
            tool_type = tool.get("type", "")
            tool_change = i > 0 and tool_type != prev_tool_type and tool_type != ""

            steps.append(OperationStep(
                position=i + 1,
                operation_type=op_type,
                tool_type=tool_type,
                tool_change=tool_change,
                rationale=strat.get("strategy_rationale", ""),
            ))
            if tool_type:
                prev_tool_type = tool_type

        # Build pattern
        op_types = [s.operation_type for s in steps]
        signature = "->".join(op_types)
        category = _categorize_sequence(op_types)

        source = SequenceSource(
            video_id=video_id,
            channel=channel,
            confidence=confidence,
            material_class=material_class,
            machine_type=machine_type,
        )

        updated_ids: list[str] = []

        if signature in self.patterns:
            existing = self.patterns[signature]
            if not any(s.video_id == video_id for s in existing.sources):
                existing.sources.append(source)
            existing.frequency += 1
            existing.confidence = min(1.0, existing.confidence + 0.05)
            if material_class and material_class not in existing.applicable_materials:
                existing.applicable_materials.append(material_class)
            existing.last_updated = datetime.now(timezone.utc).isoformat()
            updated_ids.append(existing.pattern_id)
        else:
            pid = f"seq-{self._next_id:04d}"
            self._next_id += 1

            tool_changes = sum(1 for s in steps if s.tool_change)
            name = f"{category.replace('_', ' ').title()}: {' -> '.join(op_types[:4])}"
            if len(op_types) > 4:
                name += f" (+{len(op_types) - 4} more)"

            pattern = SequencePattern(
                pattern_id=pid,
                name=name,
                description=f"Sequence of {len(steps)} operations observed in machining tutorial",
                category=category,
                steps=steps,
                applicable_materials=[material_class] if material_class else [],
                tool_change_count=tool_changes,
                sources=[source],
                frequency=1,
                confidence=confidence,
                last_updated=datetime.now(timezone.utc).isoformat(),
            )
            self.patterns[signature] = pattern
            updated_ids.append(pid)

        # Also extract sub-sequences (windows of 2-3 operations)
        for window_size in (2, 3):
            if len(steps) < window_size:
                continue
            for start in range(len(steps) - window_size + 1):
                sub_steps = []
                for j, s in enumerate(steps[start:start + window_size]):
                    sub_steps.append(OperationStep(
                        position=j + 1,
                        operation_type=s.operation_type,
                        tool_type=s.tool_type,
                        tool_change=s.tool_change if j > 0 else False,
                        rationale=s.rationale,
                    ))

                sub_ops = [s.operation_type for s in sub_steps]
                sub_sig = "->".join(sub_ops)
                sub_cat = _categorize_sequence(sub_ops)

                if sub_sig in self.patterns:
                    existing = self.patterns[sub_sig]
                    existing.frequency += 1
                    existing.confidence = min(1.0, existing.confidence + 0.02)
                    if material_class and material_class not in existing.applicable_materials:
                        existing.applicable_materials.append(material_class)
                    existing.last_updated = datetime.now(timezone.utc).isoformat()
                else:
                    pid = f"seq-{self._next_id:04d}"
                    self._next_id += 1
                    sub_name = f"{sub_cat.replace('_', ' ').title()}: {' -> '.join(sub_ops)}"

                    pattern = SequencePattern(
                        pattern_id=pid,
                        name=sub_name,
                        description=f"Sub-sequence of {window_size} operations",
                        category=sub_cat,
                        steps=sub_steps,
                        applicable_materials=[material_class] if material_class else [],
                        tool_change_count=sum(1 for s in sub_steps if s.tool_change),
                        sources=[source],
                        frequency=1,
                        confidence=confidence * 0.8,
                        last_updated=datetime.now(timezone.utc).isoformat(),
                    )
                    self.patterns[sub_sig] = pattern

        return updated_ids

    def query(
        self,
        category: str = "",
        material_class: str = "",
        min_frequency: int = 0,
        min_steps: int = 0,
        max_steps: int = 100,
    ) -> list[SequencePattern]:
        """Query sequence patterns matching filters."""
        results = []
        for pattern in self.patterns.values():
            if category and pattern.category != category:
                continue
            if material_class and material_class not in pattern.applicable_materials:
                continue
            if pattern.frequency < min_frequency:
                continue
            step_count = len(pattern.steps)
            if step_count < min_steps or step_count > max_steps:
                continue
            results.append(pattern)

        results.sort(key=lambda p: (-p.frequency, -p.confidence))
        return results

    def suggest_next_operation(
        self,
        current_ops: list[str],
        material_class: str = "",
    ) -> list[tuple[str, float]]:
        """Given current operation sequence, suggest what should come next.

        Returns list of (operation_type, confidence) tuples.
        """
        if not current_ops:
            return []

        suggestions: dict[str, float] = {}

        for pattern in self.patterns.values():
            if material_class and pattern.applicable_materials and material_class not in pattern.applicable_materials:
                continue

            pattern_ops = [s.operation_type for s in pattern.steps]

            # Check if current_ops is a prefix of pattern_ops
            if len(current_ops) >= len(pattern_ops):
                continue

            match = True
            for i, op in enumerate(current_ops):
                if i >= len(pattern_ops) or pattern_ops[i] != op:
                    match = False
                    break

            if match:
                next_op = pattern_ops[len(current_ops)]
                score = pattern.confidence * (pattern.frequency / max(pattern.frequency, 1))
                if next_op in suggestions:
                    suggestions[next_op] = max(suggestions[next_op], score)
                else:
                    suggestions[next_op] = score

        result = sorted(suggestions.items(), key=lambda x: -x[1])
        return result

    def summary(self) -> dict:
        """Return a summary of the sequence DB."""
        return {
            "total_patterns": len(self.patterns),
            "categories": sorted({p.category for p in self.patterns.values()}),
            "avg_steps": (
                sum(len(p.steps) for p in self.patterns.values()) / len(self.patterns)
                if self.patterns else 0
            ),
            "most_frequent": sorted(
                [(p.name, p.frequency) for p in self.patterns.values()],
                key=lambda x: -x[1],
            )[:5],
        }
