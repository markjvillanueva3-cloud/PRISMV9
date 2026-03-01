"""Material Tips Consolidator — CC-MS6.

Consolidates per-material machining tips from multiple video/document sources.
Handles conflict resolution for contradictory tips and ranks by source authority.

Covers P0 materials: aluminum, steel, stainless_steel, titanium, cast_iron.
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
    os.path.dirname(os.path.dirname(__file__)), "data", "shop_practices", "material_tips"
)

# P0 materials
P0_MATERIALS = ["aluminum", "steel", "stainless_steel", "titanium", "cast_iron"]


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class TipSource:
    """Source provenance for a material tip."""

    video_id: str
    channel: str = ""
    channel_subscribers: int = 0
    views: int = 0
    likes: int = 0
    confidence: float = 0.5
    timestamp_seconds: Optional[float] = None

    def authority_weight(self) -> float:
        sub_score = min(self.channel_subscribers / 500_000, 1.0) if self.channel_subscribers > 0 else 0.2
        view_score = min(self.views / 100_000, 1.0) if self.views > 0 else 0.2
        like_ratio = (self.likes / max(self.views, 1)) if self.views > 0 else 0.0
        like_score = min(like_ratio / 0.05, 1.0)
        return 0.25 * sub_score + 0.20 * view_score + 0.15 * like_score + 0.40 * self.confidence

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class MaterialTip:
    """A single consolidated tip for a material."""

    tip_id: str
    material: str
    category: str  # "speeds_feeds", "tooling", "coolant", "workholding", "general"
    tip_text: str
    detail: str = ""
    sources: list[TipSource] = field(default_factory=list)
    consensus_weight: float = 0.0
    source_count: int = 0
    conflicts: list[str] = field(default_factory=list)
    cross_ref_materials: list[str] = field(default_factory=list)
    alloy_specific: str = ""  # e.g. "6061-T6" if alloy-specific
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "tip_id": self.tip_id,
            "material": self.material,
            "category": self.category,
            "tip_text": self.tip_text,
            "detail": self.detail,
            "sources": [s.to_dict() for s in self.sources],
            "consensus_weight": round(self.consensus_weight, 4),
            "source_count": self.source_count,
            "conflicts": self.conflicts,
            "cross_ref_materials": self.cross_ref_materials,
            "alloy_specific": self.alloy_specific,
            "tags": self.tags,
        }

    @classmethod
    def from_dict(cls, d: dict) -> MaterialTip:
        sources = [TipSource(**s) for s in d.get("sources", [])]
        return cls(
            tip_id=d["tip_id"],
            material=d["material"],
            category=d["category"],
            tip_text=d["tip_text"],
            detail=d.get("detail", ""),
            sources=sources,
            consensus_weight=d.get("consensus_weight", 0.0),
            source_count=d.get("source_count", 0),
            conflicts=d.get("conflicts", []),
            cross_ref_materials=d.get("cross_ref_materials", []),
            alloy_specific=d.get("alloy_specific", ""),
            tags=d.get("tags", []),
        )


@dataclass
class MaterialTipFile:
    """All tips for a single material."""

    material: str
    tips: list[MaterialTip] = field(default_factory=list)
    updated_at: str = ""

    def to_dict(self) -> dict:
        return {
            "material": self.material,
            "tip_count": len(self.tips),
            "updated_at": self.updated_at,
            "tips": [t.to_dict() for t in self.tips],
        }

    @classmethod
    def from_dict(cls, d: dict) -> MaterialTipFile:
        tips = [MaterialTip.from_dict(t) for t in d.get("tips", [])]
        return cls(
            material=d["material"],
            tips=tips,
            updated_at=d.get("updated_at", ""),
        )


# ---------------------------------------------------------------------------
# Tip categories
# ---------------------------------------------------------------------------

TIP_CATEGORIES = [
    "speeds_feeds",
    "tooling",
    "coolant",
    "workholding",
    "general",
]

# Contradiction pairs — tips that conflict if both present for same material
_CONTRADICTION_PAIRS = [
    ("use flood coolant", "use mist coolant"),
    ("climb milling preferred", "conventional milling preferred"),
    ("high helix end mill", "low helix end mill"),
    ("use sharp tools", "use honed edge"),
]


# ---------------------------------------------------------------------------
# MaterialTipsConsolidator
# ---------------------------------------------------------------------------


class MaterialTipsConsolidator:
    """Consolidates and manages per-material machining tips."""

    def __init__(self, data_dir: str = _DATA_DIR):
        self._data_dir = data_dir
        self._tips: dict[str, MaterialTipFile] = {}
        self._next_id: dict[str, int] = {}

    def load_all(self) -> int:
        """Load all material tip files. Returns total tip count."""
        if not os.path.isdir(self._data_dir):
            return 0

        self._tips.clear()
        total = 0
        for fname in os.listdir(self._data_dir):
            if fname.endswith(".json"):
                path = os.path.join(self._data_dir, fname)
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                mtf = MaterialTipFile.from_dict(data)
                self._tips[mtf.material] = mtf
                total += len(mtf.tips)

        # Track next IDs
        for mat, mtf in self._tips.items():
            max_n = 0
            for tip in mtf.tips:
                parts = tip.tip_id.split("-")
                if len(parts) >= 2:
                    try:
                        max_n = max(max_n, int(parts[-1]))
                    except ValueError:
                        pass
            self._next_id[mat] = max_n + 1

        return total

    def save_all(self) -> int:
        """Save all material tip files. Returns count saved."""
        os.makedirs(self._data_dir, exist_ok=True)
        for mat, mtf in self._tips.items():
            mtf.updated_at = datetime.now(timezone.utc).isoformat()
            path = os.path.join(self._data_dir, f"{mat}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(mtf.to_dict(), f, indent=2, ensure_ascii=False)
        return len(self._tips)

    def add_tip(
        self,
        material: str,
        category: str,
        tip_text: str,
        detail: str = "",
        source: TipSource | None = None,
        alloy_specific: str = "",
        cross_ref_materials: list[str] | None = None,
        tags: list[str] | None = None,
    ) -> MaterialTip:
        """Add a tip for a material. Merges if similar exists."""
        if material not in self._tips:
            self._tips[material] = MaterialTipFile(material=material)
            self._next_id[material] = 1

        mtf = self._tips[material]

        # Check for existing similar tip
        existing = self._find_similar(mtf, tip_text)
        if existing:
            return self._merge_source(existing, source)

        n = self._next_id.get(material, 1)
        prefix = material[:3].upper()
        tip_id = f"{prefix}-{n:04d}"
        self._next_id[material] = n + 1

        sources = [source] if source else []
        weight = source.authority_weight() if source else 0.5

        tip = MaterialTip(
            tip_id=tip_id,
            material=material,
            category=category,
            tip_text=tip_text,
            detail=detail,
            sources=sources,
            consensus_weight=weight,
            source_count=len(sources),
            cross_ref_materials=cross_ref_materials or [],
            alloy_specific=alloy_specific,
            tags=tags or [],
        )

        mtf.tips.append(tip)
        return tip

    def get_tips(self, material: str) -> list[MaterialTip]:
        """Get all tips for a material, ranked by consensus weight."""
        mtf = self._tips.get(material)
        if not mtf:
            return []
        return sorted(mtf.tips, key=lambda t: t.consensus_weight, reverse=True)

    def get_tips_by_category(self, material: str, category: str) -> list[MaterialTip]:
        """Get tips for a material filtered by category."""
        return [t for t in self.get_tips(material) if t.category == category]

    def get_all_materials(self) -> list[str]:
        """List all materials with tips."""
        return list(self._tips.keys())

    def tip_counts(self) -> dict[str, int]:
        """Return tip count per material."""
        return {mat: len(mtf.tips) for mat, mtf in self._tips.items()}

    def resolve_conflicts(self, material: str) -> list[tuple[str, str]]:
        """Find contradictory tips for a material.

        Returns list of (tip_id_1, tip_id_2) pairs that conflict.
        """
        mtf = self._tips.get(material)
        if not mtf:
            return []

        conflicts: list[tuple[str, str]] = []

        for i, tip_a in enumerate(mtf.tips):
            for tip_b in mtf.tips[i + 1:]:
                a_text = tip_a.tip_text.lower()
                b_text = tip_b.tip_text.lower()

                for pair_a, pair_b in _CONTRADICTION_PAIRS:
                    if (pair_a in a_text and pair_b in b_text) or \
                       (pair_b in a_text and pair_a in b_text):
                        conflicts.append((tip_a.tip_id, tip_b.tip_id))
                        tip_a.conflicts.append(tip_b.tip_id)
                        tip_b.conflicts.append(tip_a.tip_id)

        return conflicts

    def search(self, query: str, material: str | None = None) -> list[MaterialTip]:
        """Search tips by text, optionally filtered by material."""
        q = query.lower()
        results: list[MaterialTip] = []
        materials = [material] if material else list(self._tips.keys())

        for mat in materials:
            mtf = self._tips.get(mat)
            if not mtf:
                continue
            for tip in mtf.tips:
                if q in tip.tip_text.lower() or q in tip.detail.lower():
                    results.append(tip)

        return sorted(results, key=lambda t: t.consensus_weight, reverse=True)

    # -----------------------------------------------------------------------
    # Internal
    # -----------------------------------------------------------------------

    def _find_similar(self, mtf: MaterialTipFile, tip_text: str) -> MaterialTip | None:
        t = tip_text.lower().strip()
        for tip in mtf.tips:
            if tip.tip_text.lower().strip() == t:
                return tip
            # Jaccard similarity
            words_a = set(t.split())
            words_b = set(tip.tip_text.lower().split())
            if words_a and words_b:
                jaccard = len(words_a & words_b) / len(words_a | words_b)
                if jaccard > 0.8:
                    return tip
        return None

    def _merge_source(self, existing: MaterialTip, source: TipSource | None) -> MaterialTip:
        if source is None:
            return existing
        existing.sources.append(source)
        existing.source_count = len(existing.sources)
        weights = [s.authority_weight() for s in existing.sources]
        existing.consensus_weight = sum(weights) / len(weights)
        return existing
