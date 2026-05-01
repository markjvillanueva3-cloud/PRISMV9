"""Knowledge Bridge — Map extracted knowledge to PRISM component specs.

Takes ExtractionResult from knowledge_extract.py and produces
ComponentSpec[] that describe what PRISM components should be generated
(engines, algorithms, hooks, tribal tips, skills, schemas, formulas).

Includes deduplication against existing PRISM inventory and
confidence-gated ranking.

Part of CC-MS2: Knowledge Bridge for /video-learn pipeline.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


class ComponentType(Enum):
    """Types of PRISM components that can be generated."""
    ENGINE = "engine"
    ALGORITHM = "algorithm"
    HOOK = "hook"
    SCHEMA = "schema"
    SCRIPT = "script"
    SKILL = "skill"
    TRIBAL_TIP = "tribal_tip"
    FORMULA = "formula"


class Confidence(Enum):
    """Confidence levels with numeric thresholds."""
    HIGH = 0.8
    MEDIUM_HIGH = 0.7
    MEDIUM = 0.6
    LOW = 0.5


# Minimum confidence required per component type
_CONFIDENCE_GATES: dict[ComponentType, float] = {
    ComponentType.ENGINE: 0.8,
    ComponentType.ALGORITHM: 0.8,
    ComponentType.HOOK: 0.7,
    ComponentType.SCHEMA: 0.7,
    ComponentType.SCRIPT: 0.6,
    ComponentType.SKILL: 0.6,
    ComponentType.TRIBAL_TIP: 0.5,
    ComponentType.FORMULA: 0.8,
}

# Knowledge category -> component type mapping
# Covers manufacturing AND non-machining domains
_CATEGORY_MAP: dict[str, ComponentType] = {
    # Manufacturing knowledge
    "formula": ComponentType.ALGORITHM,
    "equation": ComponentType.ALGORITHM,
    "parameter_table": ComponentType.SCHEMA,
    "safety_warning": ComponentType.HOOK,
    "decision_rule": ComponentType.TRIBAL_TIP,
    "procedure": ComponentType.SKILL,
    "troubleshooting": ComponentType.TRIBAL_TIP,
    "tribal_tip": ComponentType.TRIBAL_TIP,
    "design_pattern": ComponentType.TRIBAL_TIP,
    "automation": ComponentType.SCRIPT,
    "workflow_script": ComponentType.SCRIPT,
    # Non-machining knowledge (auto-created categories)
    "code_snippet": ComponentType.SCRIPT,
    "api_pattern": ComponentType.SCHEMA,
    "configuration": ComponentType.SCHEMA,
    "architecture": ComponentType.TRIBAL_TIP,
    "best_practice": ComponentType.TRIBAL_TIP,
    "debugging": ComponentType.TRIBAL_TIP,
    "testing": ComponentType.TRIBAL_TIP,
    "deployment": ComponentType.SCRIPT,
    "circuit_design": ComponentType.SCHEMA,
    "measurement": ComponentType.ALGORITHM,
    "inspection_procedure": ComponentType.SKILL,
    "process_control": ComponentType.HOOK,
}


@dataclass
class ComponentSpec:
    """Specification for a PRISM component to generate."""
    type: ComponentType
    name: str
    description: str
    domain: str  # cutting, thermal, safety, material, tool, surface, machine, quality
    source_video_id: str
    source_item_id: str
    source_timestamp: Optional[float] = None
    confidence: float = 0.5
    novelty: float = 1.0  # 1.0=new, 0.6=extends, 0.0=duplicate
    priority_score: float = 0.0
    generation_strategy: str = "new_file"  # new_file, extend_existing, add_data, add_tip
    target_file: str = ""  # suggested file path
    content_data: dict = field(default_factory=dict)  # payload for generation
    tags: list[str] = field(default_factory=list)
    existing_overlap: Optional[str] = None  # name of overlapping component

    def to_dict(self) -> dict:
        return {
            "type": self.type.value,
            "name": self.name,
            "description": self.description,
            "domain": self.domain,
            "source_video_id": self.source_video_id,
            "source_item_id": self.source_item_id,
            "source_timestamp": self.source_timestamp,
            "confidence": round(self.confidence, 3),
            "novelty": round(self.novelty, 3),
            "priority_score": round(self.priority_score, 3),
            "generation_strategy": self.generation_strategy,
            "target_file": self.target_file,
            "content_data": self.content_data,
            "tags": self.tags,
            "existing_overlap": self.existing_overlap,
        }


@dataclass
class BridgeResult:
    """Result of the knowledge bridge transformation."""
    video_id: str
    total_items: int
    specs: list[ComponentSpec] = field(default_factory=list)
    skipped_low_confidence: int = 0
    skipped_duplicate: int = 0
    summary: str = ""

    def to_dict(self) -> dict:
        by_type: dict[str, int] = {}
        for s in self.specs:
            key = s.type.value
            by_type[key] = by_type.get(key, 0) + 1
        return {
            "video_id": self.video_id,
            "total_items": self.total_items,
            "specs_count": len(self.specs),
            "by_type": by_type,
            "skipped_low_confidence": self.skipped_low_confidence,
            "skipped_duplicate": self.skipped_duplicate,
            "specs": [s.to_dict() for s in self.specs],
            "summary": self.summary,
        }


# ---------------------------------------------------------------------------
# Deduplication against existing PRISM inventory
# ---------------------------------------------------------------------------

def _load_existing_tribal_tips(
    tribal_engine_path: str = "",
) -> set[str]:
    """Load existing tribal knowledge tip titles for dedup.

    Scans TribalKnowledgeEngine.ts for tip titles in KNOWLEDGE_BASE.
    """
    if not tribal_engine_path:
        tribal_engine_path = os.path.join(
            "C:", os.sep, "PRISM", "mcp-server", "src", "engines",
            "TribalKnowledgeEngine.ts",
        )
    tips: set[str] = set()
    if not os.path.exists(tribal_engine_path):
        return tips
    try:
        with open(tribal_engine_path, encoding="utf-8") as f:
            content = f.read()
        # Extract tip titles from TypeScript KNOWLEDGE_BASE
        for m in re.finditer(r'title:\s*["\']([^"\']+)["\']', content):
            tips.add(m.group(1).lower().strip())
    except OSError:
        pass
    return tips


def _load_existing_engines(
    master_index_path: str = "",
) -> set[str]:
    """Load existing engine names from MASTER_INDEX.md."""
    if not master_index_path:
        master_index_path = os.path.join(
            "C:", os.sep, "PRISM", "mcp-server", "data", "docs",
            "MASTER_INDEX.md",
        )
    engines: set[str] = set()
    if not os.path.exists(master_index_path):
        return engines
    try:
        with open(master_index_path, encoding="utf-8") as f:
            for line in f:
                # Look for engine names in markdown headers or lists
                m = re.match(r"[-*]\s+\*\*(\w+Engine)\*\*", line)
                if m:
                    engines.add(m.group(1).lower())
                m2 = re.match(r"###\s+(\w+Engine)", line)
                if m2:
                    engines.add(m2.group(1).lower())
    except OSError:
        pass
    return engines


def _load_existing_formulas(
    formulas_dir: str = "",
) -> set[str]:
    """Load existing formula IDs from formula JSON files."""
    if not formulas_dir:
        formulas_dir = os.path.join(
            "C:", os.sep, "PRISM", "mcp-server", "data", "formulas",
        )
    formula_ids: set[str] = set()
    if not os.path.isdir(formulas_dir):
        return formula_ids
    try:
        for fname in os.listdir(formulas_dir):
            if fname.endswith(".json"):
                fpath = os.path.join(formulas_dir, fname)
                with open(fpath, encoding="utf-8") as f:
                    data = json.load(f)
                fid = data.get("id", "")
                if fid:
                    formula_ids.add(fid.lower())
    except (OSError, json.JSONDecodeError):
        pass
    return formula_ids


class PRISMInventory:
    """Cached view of existing PRISM components for dedup."""

    def __init__(
        self,
        tribal_tips: Optional[set[str]] = None,
        engines: Optional[set[str]] = None,
        formulas: Optional[set[str]] = None,
    ):
        self.tribal_tips = tribal_tips if tribal_tips is not None else _load_existing_tribal_tips()
        self.engines = engines if engines is not None else _load_existing_engines()
        self.formulas = formulas if formulas is not None else _load_existing_formulas()

    def check_novelty(self, spec: ComponentSpec) -> float:
        """Return novelty score: 1.0=new, 0.6=extends, 0.0=duplicate."""
        name_lower = spec.name.lower().strip()

        if spec.type == ComponentType.TRIBAL_TIP:
            # Check against existing tips
            for tip in self.tribal_tips:
                if _fuzzy_match(name_lower, tip):
                    spec.existing_overlap = tip
                    return 0.0
            # Partial overlap check
            for tip in self.tribal_tips:
                if _partial_overlap(name_lower, tip):
                    spec.existing_overlap = tip
                    return 0.6
            return 1.0

        if spec.type == ComponentType.ENGINE:
            for eng in self.engines:
                if _fuzzy_match(name_lower, eng):
                    spec.existing_overlap = eng
                    return 0.0
            return 1.0

        if spec.type == ComponentType.FORMULA:
            for fid in self.formulas:
                if _fuzzy_match(name_lower, fid):
                    spec.existing_overlap = fid
                    return 0.0
            return 1.0

        # For other types, assume novel
        return 1.0


def _fuzzy_match(a: str, b: str) -> bool:
    """Check if two strings are substantially the same."""
    a = re.sub(r"[^a-z0-9]", "", a)
    b = re.sub(r"[^a-z0-9]", "", b)
    if not a or not b:
        return False
    return a == b or a in b or b in a


def _partial_overlap(a: str, b: str) -> bool:
    """Check if two strings share significant word overlap."""
    words_a = set(re.findall(r"[a-z]+", a))
    words_b = set(re.findall(r"[a-z]+", b))
    if not words_a or not words_b:
        return False
    overlap = words_a & words_b
    # Remove common filler words
    filler = {"the", "a", "an", "in", "on", "for", "to", "of", "and", "with", "is"}
    overlap -= filler
    min_len = min(len(words_a - filler), len(words_b - filler))
    if min_len == 0:
        return False
    return len(overlap) / min_len > 0.6


# ---------------------------------------------------------------------------
# Knowledge item classifiers
# ---------------------------------------------------------------------------

def _classify_item(item: dict) -> ComponentType:
    """Determine the best PRISM component type for a knowledge item."""
    category = item.get("category", "tribal_tip")

    # Use the static map as default
    comp_type = _CATEGORY_MAP.get(category, ComponentType.TRIBAL_TIP)

    # Upgrade certain items based on content richness
    params = item.get("parameters", {})
    steps = item.get("steps", [])
    body = item.get("body", "")

    # Formula/equation detection — check for equation text
    if category in ("formula", "equation"):
        equation = item.get("equation", "")
        has_equation = bool(equation) or any(
            c in body for c in ("=", "×", "*", "/", "^", "√")
        )
        if has_equation and params:
            # Rich formula with equation + parameters → Algorithm
            comp_type = ComponentType.ALGORITHM
        elif params:
            # Parameters but no clear equation → Formula JSON data
            comp_type = ComponentType.FORMULA
        else:
            # Just equation text, no structured data → tribal tip
            comp_type = ComponentType.TRIBAL_TIP

    # Parameter table with 3+ values -> Schema; with equation -> Formula
    if category == "parameter_table":
        total_vals = sum(
            len(v) if isinstance(v, list) else 1
            for v in params.values()
        )
        has_equation = bool(item.get("equation", ""))
        if has_equation and total_vals >= 2:
            comp_type = ComponentType.FORMULA
        elif total_vals >= 3:
            comp_type = ComponentType.SCHEMA
        else:
            comp_type = ComponentType.TRIBAL_TIP

    # Safety warnings with specific conditions -> Hook
    if category == "safety_warning":
        # If it's specific and actionable, make it a hook
        if any(kw in body.lower() for kw in ["never", "must not", "always", "critical"]):
            comp_type = ComponentType.HOOK
        else:
            comp_type = ComponentType.TRIBAL_TIP

    # Procedure with 5+ steps -> Skill; with automation keywords -> Script
    if category == "procedure":
        step_count = item.get("step_count", len(steps))
        automation_kw = ["automate", "script", "batch", "loop", "repeat", "schedule"]
        is_automatable = any(kw in body.lower() for kw in automation_kw)
        if is_automatable and step_count >= 3:
            comp_type = ComponentType.SCRIPT
        elif step_count >= 5:
            comp_type = ComponentType.SKILL
        else:
            comp_type = ComponentType.TRIBAL_TIP

    # Decision rules with enough structure -> can become engines
    if category == "decision_rule":
        conditions = item.get("conditions", [])
        if len(conditions) >= 3 or (params and len(params) >= 3):
            comp_type = ComponentType.ENGINE
        # Otherwise stays as TRIBAL_TIP

    return comp_type


def _map_domain(item_domain: str) -> str:
    """Map knowledge domain to PRISM engine domain.

    Supports manufacturing domains (cad/cam/shop) and non-machining
    domains that /video-learn can dynamically discover.
    """
    mapping = {
        # Manufacturing domains
        "cad": "machine",
        "cam": "cutting",
        "shop": "safety",
        "multi": "cutting",
        # Non-machining domains (auto-detected by /video-learn)
        "software": "automation",
        "electronics": "electronics",
        "programming": "programming",
        "robotics": "automation",
        "3d_printing": "additive",
        "additive": "additive",
        "metrology": "metrology",
        "quality": "quality",
        "lean": "process_engineering",
        "design": "design",
        "materials": "materials_science",
        "welding": "joining",
        "inspection": "inspection",
    }
    return mapping.get(item_domain, item_domain or "general")


def _compute_priority(spec: ComponentSpec) -> float:
    """Compute priority score for ranking specs."""
    # (confidence * 2 + novelty * 3 + domain_value * 2) / complexity
    domain_value = {
        # Manufacturing domains
        "cutting": 1.0, "safety": 0.9, "thermal": 0.8,
        "tool": 0.8, "material": 0.7, "surface": 0.7,
        "machine": 0.6, "quality": 0.6,
        # Non-machining domains
        "automation": 0.8, "programming": 0.7, "electronics": 0.7,
        "additive": 0.7, "metrology": 0.7, "design": 0.6,
        "materials_science": 0.7, "process_engineering": 0.7,
        "inspection": 0.6, "joining": 0.6, "general": 0.5,
    }.get(spec.domain, 0.5)

    complexity = {
        ComponentType.TRIBAL_TIP: 0.3,
        ComponentType.HOOK: 0.5,
        ComponentType.SKILL: 0.6,
        ComponentType.SCHEMA: 0.5,
        ComponentType.SCRIPT: 0.7,
        ComponentType.ENGINE: 1.0,
        ComponentType.ALGORITHM: 1.0,
        ComponentType.FORMULA: 0.8,
    }.get(spec.type, 0.5)

    numerator = spec.confidence * 2 + spec.novelty * 3 + domain_value * 2
    denominator = max(complexity, 0.1)
    return round(numerator / denominator, 3)


# ---------------------------------------------------------------------------
# Spec builders per component type
# ---------------------------------------------------------------------------

def _build_tribal_tip_spec(
    item: dict, video_id: str,
) -> ComponentSpec:
    """Build a ComponentSpec for a TribalKnowledgeEngine tip."""
    title = item.get("title", "Unnamed tip")
    body = item.get("body", item.get("description", ""))
    domain = _map_domain(item.get("domain", "cam"))
    tags = item.get("tags", [])

    # Determine tip category
    category = "general"
    if item.get("category") == "safety_warning":
        category = "safety"
    elif item.get("category") == "troubleshooting":
        category = "troubleshooting"
    elif "tool" in " ".join(tags).lower():
        category = "tooling"
    elif "setup" in " ".join(tags).lower():
        category = "setup"
    elif "cutting" in " ".join(tags).lower() or "speed" in " ".join(tags).lower():
        category = "cutting"

    return ComponentSpec(
        type=ComponentType.TRIBAL_TIP,
        name=title,
        description=body,
        domain=domain,
        source_video_id=video_id,
        source_item_id=item.get("id", ""),
        source_timestamp=item.get("source_timestamp"),
        confidence=item.get("confidence", 0.5),
        generation_strategy="add_tip",
        target_file="mcp-server/src/engines/TribalKnowledgeEngine.ts",
        content_data={
            "title": title,
            "body": body,
            "category": category,
            "tags": tags,
            "parameters": item.get("parameters", {}),
        },
        tags=tags,
    )


def _build_hook_spec(
    item: dict, video_id: str,
) -> ComponentSpec:
    """Build a ComponentSpec for a safety hook."""
    title = item.get("title", "Safety check")
    body = item.get("body", "")

    return ComponentSpec(
        type=ComponentType.HOOK,
        name=f"VideoLearn_{_sanitize_name(title)}",
        description=f"Safety hook from video learning: {body}",
        domain="safety",
        source_video_id=video_id,
        source_item_id=item.get("id", ""),
        confidence=item.get("confidence", 0.7),
        generation_strategy="new_file",
        target_file="mcp-server/src/hooks/VideoLearnedHooks.ts",
        content_data={
            "title": title,
            "body": body,
            "timing": "before",
            "priority": "normal",
            "mode": "warning",  # never blocking from video knowledge
            "category": "safety",
        },
        tags=["video-learned", "safety"],
    )


def _build_engine_spec(
    item: dict, video_id: str,
) -> ComponentSpec:
    """Build a ComponentSpec for a new engine."""
    title = item.get("title", "Calculation engine")
    params = item.get("parameters", {})
    engine_name = _sanitize_name(title) + "Engine"

    return ComponentSpec(
        type=ComponentType.ENGINE,
        name=engine_name,
        description=f"Engine from video learning: {title}",
        domain=_map_domain(item.get("domain", "cam")),
        source_video_id=video_id,
        source_item_id=item.get("id", ""),
        confidence=item.get("confidence", 0.8),
        generation_strategy="new_file",
        target_file=f"mcp-server/src/engines/{engine_name}.ts",
        content_data={
            "title": title,
            "parameters": params,
            "body": item.get("body", ""),
        },
        tags=["video-learned"] + item.get("tags", []),
    )


def _build_schema_spec(
    item: dict, video_id: str,
) -> ComponentSpec:
    """Build a ComponentSpec for a schema/data file."""
    title = item.get("title", "Parameter data")
    params = item.get("parameters", {})

    return ComponentSpec(
        type=ComponentType.SCHEMA,
        name=_sanitize_name(title),
        description=f"Parameter data from video: {title}",
        domain=_map_domain(item.get("domain", "cam")),
        source_video_id=video_id,
        source_item_id=item.get("id", ""),
        confidence=item.get("confidence", 0.7),
        generation_strategy="add_data",
        target_file=f"mcp-server/data/video-learned/{_sanitize_name(title)}.json",
        content_data={
            "title": title,
            "parameters": params,
        },
        tags=["video-learned", "parameter-data"],
    )


def _build_skill_spec(
    item: dict, video_id: str,
) -> ComponentSpec:
    """Build a ComponentSpec for a slash command / skill."""
    title = item.get("title", "Procedure")
    body = item.get("body", "")
    skill_name = _sanitize_name(title).lower().replace("_", "-")

    return ComponentSpec(
        type=ComponentType.SKILL,
        name=skill_name,
        description=f"Skill from video learning: {title}",
        domain=_map_domain(item.get("domain", "shop")),
        source_video_id=video_id,
        source_item_id=item.get("id", ""),
        confidence=item.get("confidence", 0.6),
        generation_strategy="new_file",
        target_file=f"~/.claude/commands/{skill_name}.md",
        content_data={
            "title": title,
            "body": body,
            "steps": item.get("steps", []),
        },
        tags=["video-learned", "procedure"],
    )


def _build_algorithm_spec(
    item: dict, video_id: str,
) -> ComponentSpec:
    """Build a ComponentSpec for an Algorithm<I,O> implementation."""
    title = item.get("title", "Calculation algorithm")
    params = item.get("parameters", {})
    equation = item.get("equation", "")
    body = item.get("body", "")
    algo_name = _sanitize_name(title)

    # Extract input/output field names from parameters
    inputs = {}
    outputs = {}
    for k, v in params.items():
        if isinstance(v, (int, float)):
            inputs[k] = v
        elif isinstance(v, dict):
            # Nested dicts might be output definitions
            outputs[k] = v
        else:
            inputs[k] = v

    return ComponentSpec(
        type=ComponentType.ALGORITHM,
        name=algo_name,
        description=f"Algorithm from video learning: {title}",
        domain=_map_domain(item.get("domain", "cam")),
        source_video_id=video_id,
        source_item_id=item.get("id", ""),
        source_timestamp=item.get("source_timestamp"),
        confidence=item.get("confidence", 0.8),
        generation_strategy="new_file",
        target_file=f"mcp-server/src/algorithms/{algo_name}.ts",
        content_data={
            "title": title,
            "equation": equation,
            "body": body,
            "inputs": inputs,
            "outputs": outputs,
            "parameters": params,
            "reference": item.get("reference", f"Video tutorial: {video_id}"),
        },
        tags=["video-learned"] + item.get("tags", []),
    )


def _build_formula_spec(
    item: dict, video_id: str,
) -> ComponentSpec:
    """Build a ComponentSpec for a formula JSON data file."""
    title = item.get("title", "Formula")
    params = item.get("parameters", {})
    equation = item.get("equation", item.get("body", ""))
    domain_raw = item.get("domain", "cam")
    formula_name = _sanitize_name(title)
    formula_domain = _map_domain(domain_raw).upper()

    # Build input/output specs from parameters
    input_specs = []
    output_specs = []
    for k, v in params.items():
        spec_entry = {"name": k, "symbol": k, "unit": ""}
        if isinstance(v, (int, float)):
            spec_entry["default"] = v
        input_specs.append(spec_entry)

    return ComponentSpec(
        type=ComponentType.FORMULA,
        name=f"F-{formula_domain}-{formula_name}",
        description=f"Formula from video learning: {title}",
        domain=_map_domain(domain_raw),
        source_video_id=video_id,
        source_item_id=item.get("id", ""),
        source_timestamp=item.get("source_timestamp"),
        confidence=item.get("confidence", 0.8),
        generation_strategy="add_data",
        target_file=f"mcp-server/data/formulas/{_sanitize_name(title).lower()}.json",
        content_data={
            "title": title,
            "equation": equation,
            "inputs": input_specs,
            "outputs": output_specs,
            "parameters": params,
            "domain": formula_domain,
        },
        tags=["video-learned", "formula"] + item.get("tags", []),
    )


def _build_script_spec(
    item: dict, video_id: str,
) -> ComponentSpec:
    """Build a ComponentSpec for a Python automation script."""
    title = item.get("title", "Automation script")
    body = item.get("body", "")
    steps = item.get("steps", [])
    script_name = _sanitize_name(title).lower()

    return ComponentSpec(
        type=ComponentType.SCRIPT,
        name=script_name,
        description=f"Script from video learning: {title}",
        domain=_map_domain(item.get("domain", "shop")),
        source_video_id=video_id,
        source_item_id=item.get("id", ""),
        source_timestamp=item.get("source_timestamp"),
        confidence=item.get("confidence", 0.6),
        generation_strategy="new_file",
        target_file=f"scripts/{script_name}.py",
        content_data={
            "title": title,
            "body": body,
            "steps": steps,
            "parameters": item.get("parameters", {}),
        },
        tags=["video-learned", "automation"] + item.get("tags", []),
    )


def _sanitize_name(text: str) -> str:
    """Convert text to a valid identifier name."""
    # Remove non-alphanumeric, replace spaces with underscores
    name = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    name = re.sub(r"\s+", "_", name.strip())
    # CamelCase
    parts = name.split("_")
    return "".join(p.capitalize() for p in parts if p)


# ---------------------------------------------------------------------------
# Main bridge function
# ---------------------------------------------------------------------------

def bridge_knowledge(
    knowledge: dict,
    video_id: str,
    *,
    max_components: int = 50,
    tips_only: bool = False,
    inventory: Optional[PRISMInventory] = None,
) -> BridgeResult:
    """Transform extracted knowledge into PRISM component specifications.

    Args:
        knowledge: Knowledge document from knowledge_extract.py
            (the .knowledge dict from ExtractionResult).
        video_id: Video identifier for provenance.
        max_components: Maximum number of component specs to return (default 50 = effectively all).
        tips_only: If True, only generate tribal tip specs.
        inventory: Pre-loaded PRISM inventory for dedup. If None, loads from disk.

    Returns:
        BridgeResult with ranked ComponentSpec list.
    """
    if inventory is None:
        inventory = PRISMInventory()

    # Flatten all knowledge items from all domains
    items = _flatten_knowledge_items(knowledge)
    total_items = len(items)

    # Classify each item and build specs
    specs: list[ComponentSpec] = []
    skipped_confidence = 0
    skipped_duplicate = 0

    for item in items:
        comp_type = _classify_item(item)

        # Tips-only mode: skip non-tip types
        if tips_only and comp_type != ComponentType.TRIBAL_TIP:
            comp_type = ComponentType.TRIBAL_TIP

        # Confidence gate
        min_conf = _CONFIDENCE_GATES.get(comp_type, 0.5)
        item_conf = item.get("confidence", 0.5)
        if item_conf < min_conf:
            # Downgrade to tribal tip if confidence too low for target type
            if comp_type != ComponentType.TRIBAL_TIP and item_conf >= 0.5:
                comp_type = ComponentType.TRIBAL_TIP
            else:
                skipped_confidence += 1
                continue

        # Build the spec
        spec = _build_spec(comp_type, item, video_id)
        if spec is None:
            continue

        # Dedup check
        novelty = inventory.check_novelty(spec)
        spec.novelty = novelty
        if novelty == 0.0:
            skipped_duplicate += 1
            continue

        # Compute priority
        spec.priority_score = _compute_priority(spec)
        specs.append(spec)

    # Sort by priority (descending) and take top N
    specs.sort(key=lambda s: s.priority_score, reverse=True)
    selected = specs[:max_components]

    # Build summary
    by_type: dict[str, int] = {}
    for s in selected:
        key = s.type.value
        by_type[key] = by_type.get(key, 0) + 1
    type_str = ", ".join(f"{v} {k}" for k, v in sorted(by_type.items()))

    return BridgeResult(
        video_id=video_id,
        total_items=total_items,
        specs=selected,
        skipped_low_confidence=skipped_confidence,
        skipped_duplicate=skipped_duplicate,
        summary=(
            f"Bridge produced {len(selected)} specs from {total_items} items "
            f"({skipped_confidence} low-conf, {skipped_duplicate} dupes): {type_str}"
        ),
    )


def _build_spec(
    comp_type: ComponentType, item: dict, video_id: str,
) -> Optional[ComponentSpec]:
    """Build a ComponentSpec based on type."""
    builders = {
        ComponentType.TRIBAL_TIP: _build_tribal_tip_spec,
        ComponentType.HOOK: _build_hook_spec,
        ComponentType.ENGINE: _build_engine_spec,
        ComponentType.SCHEMA: _build_schema_spec,
        ComponentType.SKILL: _build_skill_spec,
        ComponentType.ALGORITHM: _build_algorithm_spec,
        ComponentType.FORMULA: _build_formula_spec,
        ComponentType.SCRIPT: _build_script_spec,
    }
    builder = builders.get(comp_type)
    if builder:
        return builder(item, video_id)
    # Fallback: create a tribal tip
    return _build_tribal_tip_spec(item, video_id)


def _flatten_knowledge_items(knowledge: dict) -> list[dict]:
    """Flatten the nested knowledge document into a flat list of items.

    Handles both CC-MS2 format (domains.cad.features, domains.cam.strategies,
    domains.shop.practices) and the simpler flat format (items[]).
    """
    items: list[dict] = []

    # Check for flat format first (from rule-based extraction)
    if "items" in knowledge:
        return knowledge["items"]

    domains = knowledge.get("domains", {})

    # CAD features
    for feat in domains.get("cad", {}).get("features", []):
        item = _normalize_item(feat, "cad", "design_pattern")
        items.append(item)

    # CAM strategies
    for strat in domains.get("cam", {}).get("strategies", []):
        item = _normalize_item(strat, "cam", _infer_cam_category(strat))
        items.append(item)

    # CAM tools
    for tool in domains.get("cam", {}).get("tool_list", []):
        item = _normalize_item(tool, "cam", "tribal_tip")
        items.append(item)

    # SHOP practices
    for practice in domains.get("shop", {}).get("practices", []):
        item = _normalize_item(practice, "shop", _infer_shop_category(practice))
        items.append(item)

    # SHOP key takeaways
    for takeaway in domains.get("shop", {}).get("key_takeaways", []):
        if isinstance(takeaway, str):
            items.append({
                "id": f"shop-takeaway-{len(items)}",
                "category": "tribal_tip",
                "domain": "shop",
                "title": takeaway[:60],
                "body": takeaway,
                "confidence": 0.6,
                "tags": ["shop-takeaway"],
                "parameters": {},
            })
        elif isinstance(takeaway, dict):
            item = _normalize_item(takeaway, "shop", "tribal_tip")
            items.append(item)

    return items


def _normalize_item(raw: dict, domain: str, default_category: str) -> dict:
    """Normalize a raw knowledge item from any domain format."""
    # Extract provenance confidence if available
    prov = raw.get("provenance", {})
    confidence = prov.get("confidence", raw.get("confidence", 0.6))

    # Try various name/title fields
    title = (
        raw.get("title")
        or raw.get("name")
        or raw.get("type", "")
        or "Unnamed"
    )

    body = (
        raw.get("body")
        or raw.get("description")
        or raw.get("summary")
        or raw.get("strategy_rationale", "")
        or ""
    )

    # Extract parameters from cutting_parameters or params
    parameters = raw.get("parameters", {})
    if not parameters:
        cp = raw.get("cutting_parameters", {})
        if cp:
            parameters = cp

    return {
        "id": raw.get("id", f"{domain}-{len(title)}"),
        "category": raw.get("category", default_category),
        "domain": domain,
        "title": title,
        "body": body,
        "confidence": confidence,
        "source_timestamp": prov.get("timestamp_seconds"),
        "tags": raw.get("tags", []),
        "parameters": parameters,
        "steps": raw.get("steps", []),
        "step_count": raw.get("step_count", len(raw.get("steps", []))),
    }


def _infer_cam_category(strat: dict) -> str:
    """Infer knowledge category from CAM strategy data."""
    cp = strat.get("cutting_parameters", {})
    if cp and len(cp) >= 2:
        return "parameter_table"

    rationale = strat.get("strategy_rationale", "")
    if rationale and len(rationale) > 20:
        return "decision_rule"

    return "tribal_tip"


def _infer_shop_category(practice: dict) -> str:
    """Infer knowledge category from SHOP practice data."""
    ptype = practice.get("practice_type", practice.get("type", ""))
    if "safety" in ptype.lower():
        return "safety_warning"
    if "troubleshoot" in ptype.lower():
        return "troubleshooting"

    steps = practice.get("steps", [])
    if len(steps) >= 3:
        return "procedure"

    title = (practice.get("title") or practice.get("name") or "").lower()
    if any(kw in title for kw in ["warning", "caution", "danger", "never", "safety"]):
        return "safety_warning"

    return "tribal_tip"


# ---------------------------------------------------------------------------
# Convenience: bridge from ExtractionResult directly
# ---------------------------------------------------------------------------

def bridge_from_extraction_result(
    extraction_result,  # ExtractionResult from knowledge_extract
    *,
    max_components: int = 5,
    tips_only: bool = False,
    inventory: Optional[PRISMInventory] = None,
) -> BridgeResult:
    """Bridge directly from an ExtractionResult object.

    Args:
        extraction_result: ExtractionResult from knowledge_extract.extract_knowledge()
        max_components: Max component specs to produce.
        tips_only: Only produce tribal tip specs.
        inventory: PRISM inventory for dedup (loads from disk if None).
    """
    return bridge_knowledge(
        knowledge=extraction_result.knowledge,
        video_id=extraction_result.video_id,
        max_components=max_components,
        tips_only=tips_only,
        inventory=inventory,
    )
