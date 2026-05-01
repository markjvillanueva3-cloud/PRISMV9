"""Shop Practice Auto-Ingest — CC-MS6 Integration.

Bridges the extraction pipeline (CC-MS2) to the practice KB (CC-MS6).
When video-learn or doc-learn produces SHOP domain results, this module
auto-feeds them into:
  1. PracticeAggregator (categorized practices with safety audit)
  2. TroubleTreeGenerator (troubleshooting trees from troubleshooting practices)
  3. MaterialTipsConsolidator (material-specific tips)

Called by the shopPracticeDispatcher's practice_ingest action and can also
be invoked directly from the Python extraction pipeline.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone

from practice_aggregate import PracticeAggregator, PracticeSource
from trouble_tree import TroubleTreeGenerator
from material_tips import MaterialTipsConsolidator, TipSource


# Category mapping from extraction practice_type to aggregator category
_CATEGORY_MAP = {
    "setup_procedure": "setup_workholding",
    "workholding_technique": "setup_workholding",
    "cutting_practice": "cutting_practices",
    "tool_management": "tool_management",
    "troubleshooting": "troubleshooting",
    "material_handling": "material_tips",
    "machine_operation": "machine_tips",
    "safety_procedure": "setup_workholding",
    "quality_control": "tool_management",
    "maintenance": "machine_tips",
    "optimization_tip": "cutting_practices",
    "measurement_technique": "setup_workholding",
    "other": "machine_tips",
}


@dataclass
class IngestResult:
    """Result of auto-ingesting SHOP extraction results."""

    practices_added: int = 0
    practices_merged: int = 0
    trees_built: int = 0
    tips_added: int = 0
    safety_criticals: int = 0
    safety_removed: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "practices_added": self.practices_added,
            "practices_merged": self.practices_merged,
            "trees_built": self.trees_built,
            "tips_added": self.tips_added,
            "safety_criticals": self.safety_criticals,
            "safety_removed": self.safety_removed,
            "errors": self.errors,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


def ingest_shop_extraction(
    shop_data: dict,
    video_id: str = "unknown",
    channel: str = "",
    channel_subscribers: int = 0,
    views: int = 0,
    likes: int = 0,
    confidence: float = 0.5,
    practice_db_path: str | None = None,
    tree_data_dir: str | None = None,
    tips_data_dir: str | None = None,
) -> IngestResult:
    """Auto-ingest SHOP domain extraction results into the practice KB.

    Args:
        shop_data: The SHOP domain extraction dict with "practices" key.
        video_id: Source video/document ID for provenance.
        channel: Source channel name.
        channel_subscribers: Channel subscriber count.
        views: Video/document view count.
        likes: Like count.
        confidence: Extraction confidence (0..1).

    Returns:
        IngestResult with counts and any errors.
    """
    result = IngestResult()
    practices = shop_data.get("practices", [])

    if not practices:
        return result

    # Build source provenance
    source = PracticeSource(
        video_id=video_id,
        channel=channel,
        channel_subscribers=channel_subscribers,
        views=views,
        likes=likes,
        confidence=confidence,
    )

    tip_source = TipSource(
        video_id=video_id,
        channel=channel,
        channel_subscribers=channel_subscribers,
        views=views,
        likes=likes,
        confidence=confidence,
    )

    # Load existing DBs (accept optional override paths for testing)
    agg_kwargs = {"db_path": practice_db_path} if practice_db_path else {}
    agg = PracticeAggregator(**agg_kwargs)
    agg.load()
    existing_count = len(agg.get_all())

    tree_kwargs = {"data_dir": tree_data_dir} if tree_data_dir else {}
    tree_gen = TroubleTreeGenerator(**tree_kwargs)
    tree_gen.load_all()

    tips_kwargs = {"data_dir": tips_data_dir} if tips_data_dir else {}
    tips_cons = MaterialTipsConsolidator(**tips_kwargs)
    tips_cons.load_all()

    # Process each practice
    troubleshooting_practices = []

    for p in practices:
        try:
            ptype = p.get("practice_type", "other")
            category = _CATEGORY_MAP.get(ptype, "machine_tips")
            title = p.get("title", "Untitled Practice")

            # 1. Add to practice aggregator
            rec = agg.add_practice(
                title=title,
                category=category,
                practice_type=ptype,
                description=p.get("description", ""),
                steps=p.get("steps", []),
                warnings=p.get("warnings", []),
                tips=p.get("tips", []),
                applicable_materials=p.get("applicable_materials", []),
                applicable_machines=p.get("applicable_machines", []),
                source=source,
                tags=p.get("tags", []),
            )

            # 2. Track troubleshooting practices for tree building
            if ptype == "troubleshooting" or category == "troubleshooting":
                troubleshooting_practices.append(p)

            # 3. Extract material tips from material-specific practices
            materials = p.get("applicable_materials", [])
            if materials and p.get("tips"):
                for mat in materials:
                    for tip_text in p["tips"]:
                        tips_cons.add_tip(
                            material=mat,
                            category=_tip_category_from_practice(ptype),
                            tip_text=tip_text,
                            detail=p.get("description", "")[:200],
                            source=tip_source,
                            tags=p.get("tags", []),
                        )
                        result.tips_added += 1

        except Exception as e:
            result.errors.append(f"Practice '{p.get('title', '?')}': {str(e)[:200]}")

    # Count new vs merged
    new_count = len(agg.get_all())
    result.practices_added = new_count - existing_count
    result.practices_merged = len(practices) - result.practices_added

    # 4. Build trouble trees from troubleshooting practices
    for tp in troubleshooting_practices:
        try:
            tree_id = _safe_tree_id(tp.get("title", "unknown"))
            if tree_gen.get(tree_id) is not None:
                continue  # Already exists

            causes = _extract_causes_from_practice(tp)
            if not causes:
                continue

            tree_gen.build_tree(
                tree_id=tree_id,
                title=tp.get("title", "Troubleshooting"),
                symptom=tp.get("description", "")[:200],
                causes=causes,
                material_context=tp.get("applicable_materials", []),
                machine_context=tp.get("applicable_machines", []),
                tags=tp.get("tags", []),
            )
            result.trees_built += 1
        except Exception as e:
            result.errors.append(f"Tree '{tp.get('title', '?')}': {str(e)[:200]}")

    # 5. Safety audit
    findings = agg.safety_audit()
    criticals = [f for f in findings if f.severity == "critical"]
    result.safety_criticals = len(criticals)
    if criticals:
        result.safety_removed = [f.practice_id for f in criticals]
        agg.remove_unsafe(findings)

    # 6. Save all
    agg.save()
    tree_gen.save_all()
    tips_cons.save_all()

    return result


def _tip_category_from_practice(practice_type: str) -> str:
    """Map practice type to tip category."""
    mapping = {
        "cutting_practice": "speeds_feeds",
        "tool_management": "tooling",
        "material_handling": "general",
        "machine_operation": "general",
        "setup_procedure": "workholding",
        "workholding_technique": "workholding",
    }
    return mapping.get(practice_type, "general")


def _safe_tree_id(title: str) -> str:
    """Generate a safe tree ID from a title."""
    safe = title.lower().strip()
    safe = "".join(c if c.isalnum() or c == " " else "" for c in safe)
    safe = "_".join(safe.split()[:5])
    return safe or "tree_unknown"


def _extract_causes_from_practice(practice: dict) -> list[dict]:
    """Extract cause/diagnostic/solution structure from a troubleshooting practice.

    Maps practice steps into a cause→diagnostic→solution tree structure.
    """
    steps = practice.get("steps", [])
    description = practice.get("description", "")
    tips = practice.get("tips", [])

    if not steps:
        return []

    # Heuristic: first step is usually the diagnostic, remaining are solutions
    causes = []
    if len(steps) >= 2:
        cause_text = description[:200] if description else steps[0]
        diagnostic_text = steps[0]
        solutions = steps[1:] + tips

        causes.append({
            "text": cause_text,
            "confidence": 0.6,
            "diagnostics": [{
                "text": diagnostic_text,
                "solutions": solutions[:5],
            }],
        })
    elif len(steps) == 1:
        causes.append({
            "text": description[:200] if description else "See diagnostic",
            "confidence": 0.5,
            "diagnostics": [{
                "text": steps[0],
                "solutions": tips[:5] if tips else ["Refer to manual"],
            }],
        })

    return causes
