"""Practice Aggregator — CC-MS6.

Aggregates machining practices from multiple video/document sources into
6 categories with weighted consensus.  Each practice carries provenance
(source video, timestamp, confidence) and safety flags.

Categories:
  1. Setup & Workholding
  2. Cutting Practices
  3. Tool Management
  4. Troubleshooting
  5. Material Tips
  6. Machine Tips
"""

from __future__ import annotations

import json
import math
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Optional

# ---------------------------------------------------------------------------
# Data path
# ---------------------------------------------------------------------------

_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "shop_practices"
)
_DB_PATH = os.path.join(_DATA_DIR, "practice_db.json")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CATEGORIES = [
    "setup_workholding",
    "cutting_practices",
    "tool_management",
    "troubleshooting",
    "material_tips",
    "machine_tips",
]

# Safety-relevant categories require warnings
_SAFETY_RELEVANT = {
    "setup_workholding",
    "cutting_practices",
    "machine_tips",
}

# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass
class PracticeSource:
    """A single source observation for a practice."""

    video_id: str
    video_title: str = ""
    channel: str = ""
    channel_subscribers: int = 0
    views: int = 0
    likes: int = 0
    published_date: str = ""
    confidence: float = 0.5
    timestamp_seconds: Optional[float] = None

    def authority_weight(self) -> float:
        """Compute source authority (0..1).

        Weights: 25% subscribers, 20% views, 15% likes ratio, 40% confidence.
        """
        sub_score = min(self.channel_subscribers / 500_000, 1.0) if self.channel_subscribers > 0 else 0.2
        view_score = min(self.views / 100_000, 1.0) if self.views > 0 else 0.2
        like_ratio = (self.likes / max(self.views, 1)) if self.views > 0 else 0.0
        like_score = min(like_ratio / 0.05, 1.0)
        conf_score = self.confidence

        return 0.25 * sub_score + 0.20 * view_score + 0.15 * like_score + 0.40 * conf_score

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PracticeRecord:
    """A single aggregated practice."""

    practice_id: str
    title: str
    category: str  # one of CATEGORIES
    practice_type: str  # from shop_validator _ALLOWED_PRACTICE_TYPES
    description: str
    steps: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    tips: list[str] = field(default_factory=list)
    applicable_materials: list[str] = field(default_factory=list)
    applicable_machines: list[str] = field(default_factory=list)
    sources: list[PracticeSource] = field(default_factory=list)
    consensus_confidence: float = 0.0
    source_count: int = 0
    tags: list[str] = field(default_factory=list)
    last_updated: str = ""
    safety_reviewed: bool = False

    def to_dict(self) -> dict:
        return {
            "practice_id": self.practice_id,
            "title": self.title,
            "category": self.category,
            "practice_type": self.practice_type,
            "description": self.description,
            "steps": self.steps,
            "warnings": self.warnings,
            "tips": self.tips,
            "applicable_materials": self.applicable_materials,
            "applicable_machines": self.applicable_machines,
            "sources": [s.to_dict() for s in self.sources],
            "consensus_confidence": round(self.consensus_confidence, 4),
            "source_count": self.source_count,
            "tags": self.tags,
            "last_updated": self.last_updated,
            "safety_reviewed": self.safety_reviewed,
        }

    @classmethod
    def from_dict(cls, d: dict) -> PracticeRecord:
        sources = [PracticeSource(**s) for s in d.get("sources", [])]
        return cls(
            practice_id=d["practice_id"],
            title=d["title"],
            category=d["category"],
            practice_type=d["practice_type"],
            description=d["description"],
            steps=d.get("steps", []),
            warnings=d.get("warnings", []),
            tips=d.get("tips", []),
            applicable_materials=d.get("applicable_materials", []),
            applicable_machines=d.get("applicable_machines", []),
            sources=sources,
            consensus_confidence=d.get("consensus_confidence", 0.0),
            source_count=d.get("source_count", 0),
            tags=d.get("tags", []),
            last_updated=d.get("last_updated", ""),
            safety_reviewed=d.get("safety_reviewed", False),
        )


@dataclass
class SafetyFinding:
    """A finding from safety audit of a practice."""

    practice_id: str
    severity: str  # "critical", "warning", "info"
    message: str
    rule: str = ""


# ---------------------------------------------------------------------------
# Safety rules
# ---------------------------------------------------------------------------

# Maximum safe RPM for common materials (conservative)
_MAX_SAFE_RPM: dict[str, int] = {
    "aluminum": 24000,
    "steel": 8000,
    "stainless_steel": 5000,
    "titanium": 3000,
    "cast_iron": 6000,
}

# Keywords that indicate unsafe practices
_UNSAFE_KEYWORDS = [
    "remove guard",
    "bypass interlock",
    "disable safety",
    "no coolant on titanium",
    "hand near spindle",
    "loose clothing",
    "no eye protection",
    "skip warm-up",
]

# Keywords that should have warnings
_WARNING_KEYWORDS = [
    "climb mill",
    "interrupted cut",
    "deep pocket",
    "thin wall",
    "high speed",
    "minimum quantity lubrication",
    "dry machining",
]


# ---------------------------------------------------------------------------
# PracticeAggregator
# ---------------------------------------------------------------------------


class PracticeAggregator:
    """Aggregates and manages machining practice knowledge."""

    def __init__(self, db_path: str = _DB_PATH):
        self._db_path = db_path
        self._practices: dict[str, PracticeRecord] = {}
        self._next_id = 1

    def load(self) -> int:
        """Load practices from JSON database. Returns count loaded."""
        if not os.path.exists(self._db_path):
            return 0

        with open(self._db_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self._practices.clear()
        for cat_data in data.get("categories", {}).values():
            for pd in cat_data.get("practices", []):
                rec = PracticeRecord.from_dict(pd)
                self._practices[rec.practice_id] = rec

        # Track next ID
        max_id = 0
        for pid in self._practices:
            parts = pid.split("-")
            if len(parts) >= 2:
                try:
                    max_id = max(max_id, int(parts[-1]))
                except ValueError:
                    pass
        self._next_id = max_id + 1

        return len(self._practices)

    def save(self) -> str:
        """Save practices to JSON database. Returns path."""
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)

        # Group by category
        by_category: dict[str, list[dict]] = {c: [] for c in CATEGORIES}
        for rec in self._practices.values():
            cat = rec.category if rec.category in by_category else "machine_tips"
            by_category[cat].append(rec.to_dict())

        data = {
            "version": "1.0.0",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "total_practices": len(self._practices),
            "categories": {
                cat: {
                    "name": cat.replace("_", " ").title(),
                    "practice_count": len(practices),
                    "practices": practices,
                }
                for cat, practices in by_category.items()
            },
        }

        with open(self._db_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return self._db_path

    def add_practice(
        self,
        title: str,
        category: str,
        practice_type: str,
        description: str,
        steps: list[str] | None = None,
        warnings: list[str] | None = None,
        tips: list[str] | None = None,
        applicable_materials: list[str] | None = None,
        applicable_machines: list[str] | None = None,
        source: PracticeSource | None = None,
        tags: list[str] | None = None,
    ) -> PracticeRecord:
        """Add a new practice or merge with existing similar one."""
        # Check for existing similar practice
        existing = self._find_similar(title, category)
        if existing:
            return self._merge_source(existing, source)

        pid = f"SP-{self._next_id:04d}"
        self._next_id += 1

        sources = [source] if source else []
        weight = source.authority_weight() if source else 0.5

        rec = PracticeRecord(
            practice_id=pid,
            title=title,
            category=category,
            practice_type=practice_type,
            description=description,
            steps=steps or [],
            warnings=warnings or [],
            tips=tips or [],
            applicable_materials=applicable_materials or [],
            applicable_machines=applicable_machines or [],
            sources=sources,
            consensus_confidence=weight,
            source_count=len(sources),
            tags=tags or [],
            last_updated=datetime.now(timezone.utc).isoformat(),
        )

        self._practices[pid] = rec
        return rec

    def get_by_category(self, category: str) -> list[PracticeRecord]:
        """Get all practices in a category."""
        return [p for p in self._practices.values() if p.category == category]

    def get_all(self) -> list[PracticeRecord]:
        """Get all practices."""
        return list(self._practices.values())

    def get(self, practice_id: str) -> PracticeRecord | None:
        """Get a practice by ID."""
        return self._practices.get(practice_id)

    def search(self, query: str) -> list[PracticeRecord]:
        """Text search across practices."""
        q = query.lower()
        results: list[PracticeRecord] = []
        for p in self._practices.values():
            searchable = f"{p.title} {p.description} {' '.join(p.steps)} {' '.join(p.tags)}"
            if q in searchable.lower():
                results.append(p)
        return results

    def category_counts(self) -> dict[str, int]:
        """Return practice count per category."""
        counts: dict[str, int] = {c: 0 for c in CATEGORIES}
        for p in self._practices.values():
            if p.category in counts:
                counts[p.category] += 1
        return counts

    def aggregate_confidence(self) -> dict[str, float]:
        """Return weighted average confidence per category."""
        sums: dict[str, float] = {c: 0.0 for c in CATEGORIES}
        counts: dict[str, int] = {c: 0 for c in CATEGORIES}
        for p in self._practices.values():
            if p.category in sums:
                sums[p.category] += p.consensus_confidence
                counts[p.category] += 1
        return {
            c: round(sums[c] / max(counts[c], 1), 4) for c in CATEGORIES
        }

    def safety_audit(self) -> list[SafetyFinding]:
        """Audit all practices for safety issues.

        Checks:
        - Unsafe keywords in steps/description
        - Missing warnings on safety-relevant categories
        - RPM limits for material-specific practices
        """
        findings: list[SafetyFinding] = []

        for p in self._practices.values():
            text = f"{p.description} {' '.join(p.steps)}".lower()

            # Check unsafe keywords
            for keyword in _UNSAFE_KEYWORDS:
                if keyword in text:
                    findings.append(SafetyFinding(
                        practice_id=p.practice_id,
                        severity="critical",
                        message=f"Unsafe practice detected: '{keyword}'",
                        rule="unsafe_keyword",
                    ))

            # Check warning keywords
            for keyword in _WARNING_KEYWORDS:
                if keyword in text and not p.warnings:
                    findings.append(SafetyFinding(
                        practice_id=p.practice_id,
                        severity="warning",
                        message=f"Practice mentions '{keyword}' but has no warnings",
                        rule="missing_warning",
                    ))

            # Safety-relevant categories must have warnings
            if p.category in _SAFETY_RELEVANT and not p.warnings:
                findings.append(SafetyFinding(
                    practice_id=p.practice_id,
                    severity="warning",
                    message=f"Safety-relevant category '{p.category}' has no warnings",
                    rule="safety_category_no_warning",
                ))

            # Check RPM references
            for mat, max_rpm in _MAX_SAFE_RPM.items():
                if mat in text:
                    # Look for RPM numbers in text
                    rpm_matches = re.findall(r"(\d{3,6})\s*rpm", text, re.IGNORECASE)
                    for rpm_str in rpm_matches:
                        rpm_val = int(rpm_str)
                        if rpm_val > max_rpm:
                            findings.append(SafetyFinding(
                                practice_id=p.practice_id,
                                severity="critical",
                                message=f"RPM {rpm_val} exceeds safe limit {max_rpm} for {mat}",
                                rule="rpm_limit",
                            ))

        return findings

    def remove_unsafe(self, findings: list[SafetyFinding]) -> int:
        """Remove practices with critical safety findings. Returns count removed."""
        critical_ids = {f.practice_id for f in findings if f.severity == "critical"}
        removed = 0
        for pid in critical_ids:
            if pid in self._practices:
                del self._practices[pid]
                removed += 1
        return removed

    def mark_safety_reviewed(self, practice_id: str) -> bool:
        """Mark a practice as safety-reviewed."""
        if practice_id in self._practices:
            self._practices[practice_id].safety_reviewed = True
            return True
        return False

    # -----------------------------------------------------------------------
    # Internal
    # -----------------------------------------------------------------------

    def _find_similar(self, title: str, category: str) -> PracticeRecord | None:
        """Find an existing practice with similar title in same category."""
        t = title.lower().strip()
        for p in self._practices.values():
            if p.category == category:
                existing_t = p.title.lower().strip()
                if existing_t == t or _similarity(existing_t, t) > 0.8:
                    return p
        return None

    def _merge_source(
        self, existing: PracticeRecord, source: PracticeSource | None
    ) -> PracticeRecord:
        """Merge a new source into an existing practice."""
        if source is None:
            return existing

        existing.sources.append(source)
        existing.source_count = len(existing.sources)

        # Recompute weighted confidence
        weights = [s.authority_weight() for s in existing.sources]
        total = sum(weights)
        if total > 0:
            existing.consensus_confidence = total / len(weights)
        existing.last_updated = datetime.now(timezone.utc).isoformat()

        return existing


def _similarity(a: str, b: str) -> float:
    """Simple Jaccard word similarity."""
    words_a = set(a.split())
    words_b = set(b.split())
    if not words_a or not words_b:
        return 0.0
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union)
