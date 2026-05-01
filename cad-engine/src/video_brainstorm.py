"""Video Brainstorm + RGS — Generate follow-up work from video knowledge.

After /video-learn extracts knowledge and generates components, this module
brainstorms what else could be built and generates RGS milestone envelopes
for follow-up work.

Part of CC-MS2: Brainstorm + RGS integration for /video-learn pipeline.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Optional


@dataclass
class BrainstormIdea:
    """A single brainstormed idea from video knowledge."""
    title: str
    description: str
    category: str  # engine, algorithm, hook, skill, integration, enhancement
    domain: str
    effort: str  # small, medium, large
    value: str  # high, medium, low
    depends_on: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class BrainstormResult:
    """Result of brainstorming from video knowledge."""
    video_id: str
    ideas: list[BrainstormIdea] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> dict:
        return {
            "video_id": self.video_id,
            "idea_count": len(self.ideas),
            "ideas": [i.to_dict() for i in self.ideas],
            "summary": self.summary,
        }


@dataclass
class RGSUnit:
    """A unit in an RGS milestone envelope."""
    id: str
    title: str
    steps: list[str]
    entry_conditions: list[str] = field(default_factory=list)
    exit_conditions: list[str] = field(default_factory=list)
    deliverables: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class RGSMilestone:
    """An RGS milestone envelope generated from brainstorm."""
    id: str
    title: str
    description: str
    units: list[RGSUnit] = field(default_factory=list)
    priority: str = "medium"
    video_source: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "video_source": self.video_source,
            "unit_count": len(self.units),
            "units": [u.to_dict() for u in self.units],
            "created_at": date.today().isoformat(),
            "status": "proposed",
        }


# ---------------------------------------------------------------------------
# Brainstorm Engine
# ---------------------------------------------------------------------------

def brainstorm_from_knowledge(
    knowledge: dict,
    bridge_specs: list[dict],
    video_id: str,
    video_title: str = "",
    domain: str = "cam",
) -> BrainstormResult:
    """Brainstorm follow-up ideas from extracted video knowledge.

    Analyzes gaps between what was extracted and what could be built.

    Args:
        knowledge: Knowledge document from extraction.
        bridge_specs: ComponentSpec dicts from the bridge.
        video_id: Video identifier.
        video_title: Video title for context.
        domain: Detected domain.

    Returns:
        BrainstormResult with ranked ideas.
    """
    result = BrainstormResult(video_id=video_id)
    items = knowledge.get("items", [])

    # Analyze what was generated vs what could be
    generated_types = set()
    for spec in bridge_specs:
        t = spec.get("type", "")
        generated_types.add(t)

    # Brainstorm ideas from gaps
    result.ideas.extend(_brainstorm_missing_types(items, generated_types, domain, video_id))
    result.ideas.extend(_brainstorm_integrations(items, domain, video_id))
    result.ideas.extend(_brainstorm_enhancements(items, bridge_specs, domain, video_id))

    # Rank by value/effort ratio
    effort_rank = {"small": 1, "medium": 2, "large": 3}
    value_rank = {"high": 3, "medium": 2, "low": 1}
    result.ideas.sort(
        key=lambda i: value_rank.get(i.value, 1) / effort_rank.get(i.effort, 2),
        reverse=True,
    )

    by_cat = {}
    for idea in result.ideas:
        by_cat[idea.category] = by_cat.get(idea.category, 0) + 1
    cat_str = ", ".join(f"{v} {k}" for k, v in sorted(by_cat.items()))
    result.summary = (
        f"Brainstormed {len(result.ideas)} ideas from video {video_id} "
        f"({domain} domain): {cat_str}"
    )

    return result


def _brainstorm_missing_types(
    items: list[dict],
    generated_types: set[str],
    domain: str,
    video_id: str,
) -> list[BrainstormIdea]:
    """Find component types that could be generated but weren't."""
    ideas = []

    # Check for parameter-rich content that could become formulas
    param_items = [i for i in items if i.get("category") == "parameter_table"]
    if param_items and "formula" not in generated_types:
        ideas.append(BrainstormIdea(
            title=f"Create formula registry entries from {domain.upper()} parameters",
            description=f"Found {len(param_items)} parameter tables — could be formalized into FormulaRegistry entries with validation",
            category="formula",
            domain=domain,
            effort="medium",
            value="high",
            tags=["formula-registry", "video-learned"],
        ))

    # Check for procedures that could become skills
    proc_items = [i for i in items if i.get("category") == "procedure"]
    if proc_items and "skill" not in generated_types:
        ideas.append(BrainstormIdea(
            title=f"Create slash command skills from {len(proc_items)} procedures",
            description="Multi-step procedures found that could become interactive slash commands",
            category="skill",
            domain=domain,
            effort="medium",
            value="medium",
            tags=["skill", "procedure"],
        ))

    # Check for safety content that could become hooks
    safety_items = [i for i in items if i.get("category") == "safety_warning"]
    if safety_items and "hook" not in generated_types:
        ideas.append(BrainstormIdea(
            title=f"Create safety hooks from {len(safety_items)} warnings",
            description="Safety warnings could be formalized into hook chain validators",
            category="hook",
            domain=domain,
            effort="medium",
            value="high",
            tags=["safety", "hooks"],
        ))

    # Check for decision rules that could become engines
    rule_items = [i for i in items if i.get("category") == "decision_rule"]
    if len(rule_items) >= 3 and "engine" not in generated_types:
        ideas.append(BrainstormIdea(
            title=f"Create decision engine from {len(rule_items)} rules",
            description="Multiple decision rules could be combined into a lookup/decision engine",
            category="engine",
            domain=domain,
            effort="large",
            value="high",
            depends_on=["formula"],
            tags=["engine", "decision-logic"],
        ))

    return ideas


def _brainstorm_integrations(
    items: list[dict],
    domain: str,
    video_id: str,
) -> list[BrainstormIdea]:
    """Brainstorm integration opportunities with existing PRISM systems."""
    ideas = []

    # Material-specific knowledge could enhance MaterialDB
    material_mentions = set()
    for item in items:
        body = item.get("body", "").lower()
        for mat in ["aluminum", "steel", "titanium", "stainless", "inconel", "brass", "copper"]:
            if mat in body:
                material_mentions.add(mat)

    if material_mentions:
        ideas.append(BrainstormIdea(
            title=f"Enhance MaterialDB with {domain.upper()} data for {', '.join(material_mentions)}",
            description=f"Video references {len(material_mentions)} materials — extract specific parameters to enhance material database entries",
            category="integration",
            domain="material",
            effort="medium",
            value="high",
            tags=["material-db", "enhancement"],
        ))

    # Dispatcher actions could be created from knowledge
    if len(items) >= 5:
        ideas.append(BrainstormIdea(
            title=f"Add dispatcher actions for {domain.upper()} knowledge queries",
            description="Create new dispatcher actions that expose video-learned knowledge through the MCP interface",
            category="integration",
            domain=domain,
            effort="large",
            value="medium",
            tags=["dispatcher", "mcp"],
        ))

    return ideas


def _brainstorm_enhancements(
    items: list[dict],
    bridge_specs: list[dict],
    domain: str,
    video_id: str,
) -> list[BrainstormIdea]:
    """Brainstorm enhancements to generated components."""
    ideas = []

    # If tribal tips were generated, suggest validation
    tip_count = sum(1 for s in bridge_specs if s.get("type") == "tribal_tip")
    if tip_count >= 3:
        ideas.append(BrainstormIdea(
            title=f"Validate {tip_count} video-learned tips against handbook data",
            description="Cross-reference extracted tips with Machinery's Handbook or other authoritative sources",
            category="enhancement",
            domain=domain,
            effort="small",
            value="medium",
            tags=["validation", "quality"],
        ))

    # Suggest test coverage for new components
    non_tip_count = sum(1 for s in bridge_specs if s.get("type") != "tribal_tip")
    if non_tip_count >= 1:
        ideas.append(BrainstormIdea(
            title=f"Add test coverage for {non_tip_count} new video-learned components",
            description="Generate unit tests for engines, algorithms, hooks, and formulas created from video",
            category="enhancement",
            domain=domain,
            effort="small",
            value="high",
            tags=["testing", "quality"],
        ))

    return ideas


# ---------------------------------------------------------------------------
# RGS Milestone Generator
# ---------------------------------------------------------------------------

def generate_rgs_milestone(
    brainstorm: BrainstormResult,
    video_id: str,
    video_title: str = "",
    domain: str = "cam",
    *,
    max_units: int = 5,
) -> Optional[RGSMilestone]:
    """Generate an RGS milestone envelope from brainstorm ideas.

    Only generates if there are enough high-value ideas to warrant a milestone.

    Args:
        brainstorm: BrainstormResult from brainstorm_from_knowledge.
        video_id: Video identifier.
        video_title: Video title for milestone description.
        domain: Domain for milestone categorization.
        max_units: Maximum units in the milestone.

    Returns:
        RGSMilestone or None if insufficient ideas.
    """
    # Filter to high/medium value ideas
    worthy = [i for i in brainstorm.ideas if i.value in ("high", "medium")]
    if len(worthy) < 2:
        return None

    # Generate milestone ID
    domain_code = domain[:3].upper()
    ms_id = f"VL-{domain_code}-{video_id[:8]}"

    milestone = RGSMilestone(
        id=ms_id,
        title=f"Video-Learned: {video_title[:60] or video_id}",
        description=(
            f"Follow-up work from /video-learn pipeline processing video {video_id}. "
            f"Domain: {domain}. Generated from {len(brainstorm.ideas)} brainstormed ideas."
        ),
        priority="medium" if len(worthy) < 4 else "high",
        video_source=f"video:{video_id}",
    )

    # Convert top ideas to units
    for i, idea in enumerate(worthy[:max_units], 1):
        unit_id = f"{ms_id}-U{i:02d}"
        steps = _idea_to_steps(idea)
        unit = RGSUnit(
            id=unit_id,
            title=idea.title,
            steps=steps,
            entry_conditions=[f"Video {video_id} processed by /video-learn"],
            exit_conditions=[
                f"{idea.category} component created/updated",
                "npm run build passes",
                "Tests pass",
            ],
            deliverables=[f"New/updated {idea.category} from video knowledge"],
        )
        milestone.units.append(unit)

    return milestone


def _idea_to_steps(idea: BrainstormIdea) -> list[str]:
    """Convert a brainstorm idea into actionable steps."""
    steps = []

    if idea.category == "engine":
        steps = [
            f"Read existing engines in domain '{idea.domain}' from MASTER_INDEX",
            "Design engine interface (Input, Result, Stats types)",
            f"Implement engine with video-learned logic: {idea.description[:80]}",
            "Add to engine registry and wire to dispatcher",
            "Write tests and verify build",
        ]
    elif idea.category == "algorithm":
        steps = [
            "Review Algorithm<I,O> interface from src/algorithms/types.ts",
            f"Implement algorithm: {idea.description[:80]}",
            "Register in AlgorithmRegistry",
            "Write tests with edge cases",
        ]
    elif idea.category == "hook":
        steps = [
            "Review ManufacturingHooks.ts patterns",
            f"Implement safety hook: {idea.description[:80]}",
            'Set mode to "warning" (video-learned, not blocking)',
            "Register in hook chain",
            "Write tests",
        ]
    elif idea.category == "skill":
        steps = [
            "Design slash command structure with phases",
            f"Create markdown skill file: {idea.description[:80]}",
            "Test with dry-run mode",
        ]
    elif idea.category == "formula":
        steps = [
            "Review FormulaRegistry format from data/formulas/",
            f"Create formula JSON: {idea.description[:80]}",
            "Add to FormulaRegistry index",
            "Verify with /formula-browse",
        ]
    elif idea.category == "integration":
        steps = [
            f"Identify integration point: {idea.description[:80]}",
            "Read existing implementation",
            "Add video-learned data/logic",
            "Test integration end-to-end",
        ]
    elif idea.category == "enhancement":
        steps = [
            f"Review existing component: {idea.description[:80]}",
            "Apply enhancement",
            "Verify no regression",
        ]
    else:
        steps = [
            f"Implement: {idea.title}",
            "Write tests",
            "Verify build",
        ]

    return steps


# ---------------------------------------------------------------------------
# Save to disk
# ---------------------------------------------------------------------------

def save_brainstorm(
    brainstorm: BrainstormResult,
    milestone: Optional[RGSMilestone],
    output_dir: str,
) -> dict[str, str]:
    """Save brainstorm and milestone to output directory.

    Returns dict of file paths written.
    """
    paths = {}
    os.makedirs(output_dir, exist_ok=True)

    # Save brainstorm
    brainstorm_path = os.path.join(output_dir, "brainstorm.json")
    with open(brainstorm_path, "w", encoding="utf-8") as f:
        json.dump(brainstorm.to_dict(), f, indent=2)
    paths["brainstorm"] = brainstorm_path

    # Save milestone envelope
    if milestone:
        milestone_path = os.path.join(output_dir, f"{milestone.id}.json")
        with open(milestone_path, "w", encoding="utf-8") as f:
            json.dump(milestone.to_dict(), f, indent=2)
        paths["milestone"] = milestone_path

    return paths
