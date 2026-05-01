"""Offline Knowledge Extraction — Rule-based extraction without API calls.

Deep pattern matching on transcripts to extract structured knowledge items
from manufacturing video content. Used when Claude API is unavailable
(fixture mode, offline, rate-limited).

Produces the same output format as knowledge_extract.py but uses regex
and NLP heuristics instead of LLM calls.

Part of CC-MS2: Enhanced Offline Extraction for /video-learn pipeline.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ExtractedItem:
    """A single knowledge item extracted from transcript."""
    id: str
    category: str  # parameter_table, formula, safety_warning, decision_rule, procedure, troubleshooting, tribal_tip
    domain: str    # cad, cam, shop, multi
    title: str
    body: str
    confidence: float
    tags: list[str] = field(default_factory=list)
    parameters: dict = field(default_factory=dict)
    steps: list[str] = field(default_factory=list)
    step_count: int = 0
    equation: str = ""
    conditions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = {
            "id": self.id,
            "category": self.category,
            "domain": self.domain,
            "title": self.title,
            "body": self.body,
            "confidence": self.confidence,
            "tags": self.tags,
        }
        if self.parameters:
            d["parameters"] = self.parameters
        if self.steps:
            d["steps"] = self.steps
            d["step_count"] = self.step_count or len(self.steps)
        if self.equation:
            d["equation"] = self.equation
        if self.conditions:
            d["conditions"] = self.conditions
        return d


def extract_offline(
    transcript: str,
    title: str = "",
    domain: str = "multi",
    platform: str = "",
    ocr_text: str = "",
) -> dict:
    """Extract knowledge items from transcript using pattern matching.

    Supports both manufacturing domains (cad/cam/shop) and non-machining
    domains (software, electronics, general engineering). Domain is
    auto-detected if set to "multi" or "auto".

    Returns a knowledge document in flat format: {"items": [...]}
    """
    items: list[ExtractedItem] = []
    text = transcript.lower()
    full_text = f"{title} {transcript} {ocr_text}".lower()
    _id_counter = [0]

    def next_id(prefix: str) -> str:
        _id_counter[0] += 1
        return f"{prefix}-{_id_counter[0]:03d}"

    # Auto-detect domain if needed
    if domain in ("multi", "auto", ""):
        domain = _auto_detect_domain(full_text)

    # --- Universal extractors (work for any domain) ---
    items.extend(_extract_safety_warnings(text, domain, next_id))
    items.extend(_extract_procedures(text, title, domain, platform, next_id))
    items.extend(_extract_troubleshooting(text, domain, next_id))
    items.extend(_extract_decision_rules(text, domain, next_id))
    items.extend(_extract_formulas(full_text, domain, next_id))

    # --- Manufacturing-specific extractors ---
    if domain in ("cad", "cam", "shop", "multi"):
        items.extend(_extract_cutting_parameters(text, domain, platform, next_id))
        items.extend(_extract_tools(text, domain, platform, next_id))
        items.extend(_extract_cam_strategies(text, domain, next_id))
        items.extend(_extract_gcode_patterns(text, domain, next_id))
        items.extend(_extract_post_processing(text, domain, platform, next_id))

    if domain in ("cad", "multi"):
        items.extend(_extract_cad_features(text, platform, next_id))

    if domain in ("shop", "multi"):
        items.extend(_extract_machine_setup(text, platform, next_id))

    # --- Non-machining extractors ---
    if domain in ("software", "programming", "auto"):
        items.extend(_extract_software_patterns(text, domain, next_id))

    if domain in ("electronics", "auto"):
        items.extend(_extract_electronics_patterns(text, domain, next_id))

    if domain in ("additive", "3d_printing", "auto"):
        items.extend(_extract_additive_patterns(text, domain, next_id))

    # --- General knowledge extractor (always runs, catches domain-agnostic tips) ---
    items.extend(_extract_general_knowledge(text, title, domain, next_id))

    # Deduplicate by title similarity
    items = _deduplicate_items(items)

    return {"items": [item.to_dict() for item in items]}


# ---------------------------------------------------------------------------
# Extractor: Cutting Parameters
# ---------------------------------------------------------------------------

def _extract_cutting_parameters(
    text: str, domain: str, platform: str, next_id,
) -> list[ExtractedItem]:
    """Extract structured speeds, feeds, depths from transcript."""
    items: list[ExtractedItem] = []

    # RPM values
    rpms = []
    for m in re.finditer(r'(\d{3,5})\s*rpm', text):
        rpms.append(int(m.group(1)))

    # Feed rates (IPM, mm/min)
    feeds_ipm = []
    for m in re.finditer(r'(\d+(?:\.\d+)?)\s*(?:inches?\s*per\s*minute|ipm)', text):
        feeds_ipm.append(float(m.group(1)))

    feeds_mmmin = []
    for m in re.finditer(r'(\d+(?:\.\d+)?)\s*(?:mm\s*per\s*minute|mm/min)', text):
        feeds_mmmin.append(float(m.group(1)))

    # Surface speed (SFM, m/min)
    sfm = []
    for m in re.finditer(r'(\d+(?:\.\d+)?)\s*(?:surface\s*feet|sfm)', text):
        sfm.append(float(m.group(1)))

    mmin = []
    for m in re.finditer(r'(\d+(?:\.\d+)?)\s*(?:meters?\s*per\s*minute|m/min)', text):
        mmin.append(float(m.group(1)))

    # Depths of cut
    doc_in = []
    for m in re.finditer(r'(?:depth\s*(?:of\s*cut)?|doc)\s*(?:is\s*|of\s*|=\s*)?(\d+(?:\.\d+)?)\s*(?:inches?|")', text):
        doc_in.append(float(m.group(1)))

    doc_mm = []
    for m in re.finditer(r'(?:depth\s*(?:of\s*cut)?|doc)\s*(?:is\s*|of\s*|=\s*)?(\d+(?:\.\d+)?)\s*(?:mm|millimeters?)', text):
        doc_mm.append(float(m.group(1)))

    # Chip load
    chip_loads = []
    for m in re.finditer(r'(?:chip\s*load|feed\s*per\s*tooth|fz|fpt)\s*(?:is\s*|of\s*|=\s*)?(\d+\.\d+)', text):
        chip_loads.append(float(m.group(1)))

    # Stepover
    stepovers = []
    for m in re.finditer(r'(?:stepover|step\s*over|woc)\s*(?:is\s*|of\s*|to\s*|=\s*)?(\d+(?:\.\d+)?)\s*(?:%|percent)', text):
        stepovers.append(float(m.group(1)))

    # Build parameter table if we found enough data
    params: dict = {}
    if rpms:
        params["spindle_speed_rpm"] = rpms
    if feeds_ipm:
        params["feed_rate_ipm"] = feeds_ipm
    if feeds_mmmin:
        params["feed_rate_mmmin"] = feeds_mmmin
    if sfm:
        params["surface_speed_sfm"] = sfm
    if mmin:
        params["surface_speed_mmin"] = mmin
    if doc_in:
        params["depth_of_cut_in"] = doc_in
    if doc_mm:
        params["depth_of_cut_mm"] = doc_mm
    if chip_loads:
        params["chip_load"] = chip_loads
    if stepovers:
        params["stepover_pct"] = stepovers

    if params:
        total_values = sum(len(v) if isinstance(v, list) else 1 for v in params.values())
        # Rich parameter tables are high-confidence
        conf = min(0.9, 0.6 + 0.05 * total_values)

        items.append(ExtractedItem(
            id=next_id(f"{domain}-params"),
            category="parameter_table",
            domain=domain,
            title=f"Cutting parameters from {platform or domain.upper()} tutorial",
            body=_format_params_body(params),
            confidence=conf,
            tags=["cutting-parameters", domain, platform.lower().replace(" ", "-")] if platform else ["cutting-parameters", domain],
            parameters=params,
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Tools
# ---------------------------------------------------------------------------

def _extract_tools(
    text: str, domain: str, platform: str, next_id,
) -> list[ExtractedItem]:
    """Extract tool information from transcript."""
    items: list[ExtractedItem] = []

    # Tool patterns with diameter
    tool_patterns = [
        (r'(\d+(?:/\d+)?(?:\.\d+)?)\s*(?:inch|")\s*(end\s*mill|face\s*mill|ball\s*(?:nose|end)|drill|reamer|tap|boring\s*bar)',
         "with diameter"),
        (r'(end\s*mill|face\s*mill|ball\s*nose|drill|reamer|tap|boring\s*bar)\s+(?:with\s+)?(\d+(?:/\d+)?)\s*(?:flute|teeth)',
         "with flutes"),
        (r'(\d+)\s*flute\s*(end\s*mill|carbide)',
         "flute count"),
    ]

    tool_mentions = []
    for pattern, ptype in tool_patterns:
        for m in re.finditer(pattern, text, re.I):
            tool_mentions.append(m.group(0).strip())

    # Also find general tool mentions
    general_tools = re.findall(
        r'(?:end mill|face mill|ball nose|drill|reamer|tap|boring bar|insert|thread mill)',
        text, re.I,
    )
    tool_mentions.extend(set(t.strip() for t in general_tools))

    if tool_mentions:
        unique_tools = list(dict.fromkeys(tool_mentions))[:10]
        items.append(ExtractedItem(
            id=next_id(f"{domain}-tools"),
            category="tribal_tip",
            domain=domain,
            title=f"Tool selection for {platform or domain.upper()} job",
            body="Recommended tools: " + "; ".join(unique_tools),
            confidence=0.7,
            tags=["tooling", "tool-selection"] + ([platform.lower().replace(" ", "-")] if platform else []),
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: CAM Strategies
# ---------------------------------------------------------------------------

def _extract_cam_strategies(text: str, domain: str, next_id) -> list[ExtractedItem]:
    """Extract CAM strategy mentions and rationale."""
    items: list[ExtractedItem] = []

    strategy_patterns = {
        "adaptive_clearing": (r'adaptive\s*(?:clearing|toolpath)', "High-efficiency roughing that maintains constant tool engagement"),
        "trochoidal": (r'trochoidal\s*(?:milling|toolpath|motion)', "Circular toolpath maintaining constant chip load, reducing tool wear"),
        "dynamic_mill": (r'dynamic\s*mill(?:ing)?', "Trochoidal roughing for efficient material removal with consistent engagement"),
        "contour": (r'contour(?:ing)?\s*(?:toolpath|pass|finishing)', "Profile following along part walls for finish quality"),
        "parallel": (r'parallel\s*(?:finishing|pass|toolpath)', "Parallel passes for smooth floor/surface finishing"),
        "peck_drilling": (r'peck(?:ing)?\s*(?:drill|cycle)', "Interrupted drilling with retract for chip evacuation"),
        "spiral": (r'spiral\s*(?:toolpath|motion|in|out)', "Spiral entry/exit for smooth engagement transitions"),
        "rest_machining": (r'rest\s*(?:machining|milling)', "Machine remaining material left by larger tools"),
        "pencil": (r'pencil\s*(?:finishing|cleanup|toolpath)', "Trace internal corners for final cleanup"),
        "facing": (r'fac(?:e|ing)\s*(?:operation|mill|toolpath)', "Surface flattening operation with face mill"),
        "slot_milling": (r'slot(?:ting)?\s*(?:mill|toolpath)', "Full-width engagement cutting for slots and grooves"),
    }

    for strat_name, (pattern, description) in strategy_patterns.items():
        matches = list(re.finditer(pattern, text, re.I))
        if matches:
            # Extract surrounding context for rationale
            context = _get_context(text, matches[0].start(), window=200)
            items.append(ExtractedItem(
                id=next_id(f"{domain}-strat"),
                category="decision_rule",
                domain=domain,
                title=f"CAM strategy: {strat_name.replace('_', ' ').title()}",
                body=f"{description}. Context: {context}",
                confidence=0.7,
                tags=["cam-strategy", "toolpath", strat_name.replace("_", "-")],
            ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Safety Warnings
# ---------------------------------------------------------------------------

def _extract_safety_warnings(text: str, domain: str, next_id) -> list[ExtractedItem]:
    """Extract safety-critical knowledge."""
    items: list[ExtractedItem] = []

    # Patterns that indicate safety-critical information
    safety_patterns = [
        (r'never\s+(.{10,80}?)(?:\.|$)', "never"),
        (r'always\s+(.{10,80}?)(?:\.|$)', "always"),
        (r'(?:must\s+not|do\s+not|don\'t)\s+(.{10,80}?)(?:\.|$)', "prohibition"),
        (r'(?:danger|warning|caution|critical)[\s:]+(.{10,80}?)(?:\.|$)', "warning"),
        (r'(?:fire|injury|damage|crash|collision)\s+(.{10,80}?)(?:\.|$)', "hazard"),
    ]

    seen_warnings = set()
    for pattern, warning_type in safety_patterns:
        for m in re.finditer(pattern, text, re.I):
            warning_text = m.group(1).strip()
            if len(warning_text) < 10:
                continue
            # Deduplicate similar warnings
            key = warning_text[:30].lower()
            if key in seen_warnings:
                continue
            seen_warnings.add(key)

            items.append(ExtractedItem(
                id=next_id(f"{domain}-safety"),
                category="safety_warning",
                domain=domain,
                title=f"Safety: {warning_text[:60]}",
                body=warning_text,
                confidence=0.8,
                tags=["safety", warning_type],
            ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Procedures
# ---------------------------------------------------------------------------

def _extract_procedures(
    text: str, title: str, domain: str, platform: str, next_id,
) -> list[ExtractedItem]:
    """Extract multi-step procedures."""
    items: list[ExtractedItem] = []

    # Find sequential instruction patterns
    step_markers = [
        r'(?:first|step\s*(?:one|1))[,:\s]+(.{15,120}?)(?:\.|$)',
        r'(?:second|next|step\s*(?:two|2))[,:\s]+(.{15,120}?)(?:\.|$)',
        r'(?:then|third|step\s*(?:three|3))[,:\s]+(.{15,120}?)(?:\.|$)',
        r'(?:now|fourth|step\s*(?:four|4))[,:\s]+(.{15,120}?)(?:\.|$)',
        r'(?:finally|fifth|last|step\s*(?:five|5))[,:\s]+(.{15,120}?)(?:\.|$)',
    ]

    steps_found = []
    for pattern in step_markers:
        for m in re.finditer(pattern, text, re.I):
            step_text = m.group(1).strip()
            if step_text and len(step_text) > 10:
                steps_found.append(step_text)

    # Also look for "let's" pattern (common in tutorials)
    lets_steps = re.findall(r"let'?s\s+(.{15,100}?)(?:\.|$)", text, re.I)
    for step in lets_steps:
        if step.strip() not in steps_found:
            steps_found.append(step.strip())

    if len(steps_found) >= 3:
        items.append(ExtractedItem(
            id=next_id(f"{domain}-proc"),
            category="procedure",
            domain=domain,
            title=f"{platform or domain.upper()} workflow: {title[:40]}",
            body="\n".join(f"{i+1}. {s}" for i, s in enumerate(steps_found)),
            confidence=0.7,
            tags=["procedure", "workflow", domain],
            steps=steps_found,
            step_count=len(steps_found),
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Troubleshooting
# ---------------------------------------------------------------------------

def _extract_troubleshooting(text: str, domain: str, next_id) -> list[ExtractedItem]:
    """Extract troubleshooting advice."""
    items: list[ExtractedItem] = []

    # "if X, then Y" patterns
    if_then = re.findall(
        r'if\s+(?:you\s+)?(?:get|have|see|hear|notice)\s+(.{10,60}?)[,;]\s*(.{10,100}?)(?:\.|$)',
        text, re.I,
    )
    for condition, remedy in if_then:
        items.append(ExtractedItem(
            id=next_id(f"{domain}-fix"),
            category="troubleshooting",
            domain=domain,
            title=f"Fix: {condition.strip()[:50]}",
            body=f"If {condition.strip()}, then {remedy.strip()}",
            confidence=0.7,
            tags=["troubleshooting", "fix"],
            conditions=[condition.strip()],
        ))

    # Chatter-specific patterns
    chatter = re.findall(
        r'chatter\s*(.{10,120}?)(?:\.|$)', text, re.I,
    )
    for advice in chatter:
        if not any(item.title.startswith("Fix: chatter") for item in items):
            items.append(ExtractedItem(
                id=next_id(f"{domain}-fix"),
                category="troubleshooting",
                domain=domain,
                title="Fix: chatter during machining",
                body=f"Chatter advice: {advice.strip()}",
                confidence=0.7,
                tags=["troubleshooting", "chatter", "vibration"],
            ))
            break

    return items


# ---------------------------------------------------------------------------
# Extractor: Formulas
# ---------------------------------------------------------------------------

def _extract_formulas(text: str, domain: str, next_id) -> list[ExtractedItem]:
    """Extract mathematical formulas and equations."""
    items: list[ExtractedItem] = []

    # Common manufacturing formulas
    formula_patterns = [
        (r'(?:cutting\s*speed|vc)\s*=\s*(?:pi|π)\s*[×*]\s*[dD]\s*[×*]\s*[nN]\s*/\s*1000',
         "Vc = π × D × N / 1000", "cutting_speed", "Cutting speed from diameter and RPM"),
        (r'(?:feed\s*rate|vf)\s*=\s*(?:fz|feed\s*per\s*tooth)\s*[×*]\s*(?:z|teeth)\s*[×*]\s*[nN]',
         "Vf = fz × z × N", "feed_rate", "Table feed rate from chip load, teeth, and RPM"),
        (r'(?:mrr|material\s*removal\s*rate)\s*=\s*(?:ae|woc)\s*[×*]\s*(?:ap|doc)\s*[×*]\s*(?:vf|feed)',
         "MRR = ae × ap × Vf", "mrr", "Material removal rate from engagement and feed"),
        (r'(?:chip\s*load|fz)\s*=\s*(?:vf|feed)\s*/\s*\(\s*(?:z|teeth)\s*[×*]\s*[nN]\s*\)',
         "fz = Vf / (z × N)", "chip_load", "Chip load from feed rate, teeth, and RPM"),
        (r'(?:rpm|n)\s*=\s*(?:vc|cutting\s*speed|sfm)\s*[×*]\s*(?:12|3\.82|1000)\s*/\s*\(\s*(?:pi|π)\s*[×*]\s*[dD]\s*\)',
         "N = Vc × K / (π × D)", "spindle_speed", "Spindle speed from cutting speed and diameter"),
    ]

    for pattern, equation, formula_id, description in formula_patterns:
        if re.search(pattern, text, re.I):
            items.append(ExtractedItem(
                id=next_id(f"{domain}-formula"),
                category="formula",
                domain=domain,
                title=f"Formula: {description}",
                body=f"{description}. Equation: {equation}",
                confidence=0.85,
                tags=["formula", formula_id],
                equation=equation,
            ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Decision Rules
# ---------------------------------------------------------------------------

def _extract_decision_rules(text: str, domain: str, next_id) -> list[ExtractedItem]:
    """Extract decision-making rules and recommendations."""
    items: list[ExtractedItem] = []

    # "use X for Y" patterns
    use_for = re.findall(
        r'use\s+(.{5,40}?)\s+(?:for|when|if)\s+(.{10,80}?)(?:\.|$)',
        text, re.I,
    )
    seen = set()
    for tool_or_method, condition in use_for:
        key = tool_or_method.strip()[:20].lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(ExtractedItem(
            id=next_id(f"{domain}-rule"),
            category="decision_rule",
            domain=domain,
            title=f"Use {tool_or_method.strip()[:40]} for {condition.strip()[:40]}",
            body=f"Decision rule: use {tool_or_method.strip()} when {condition.strip()}",
            confidence=0.65,
            tags=["decision-rule", domain],
            conditions=[condition.strip()],
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: CAD Features
# ---------------------------------------------------------------------------

def _extract_cad_features(text: str, platform: str, next_id) -> list[ExtractedItem]:
    """Extract CAD modeling features and techniques."""
    items: list[ExtractedItem] = []

    cad_features = {
        "sketch": r'sketch\s+(?:on\s+)?(?:the\s+)?(.{10,60}?)(?:\.|$)',
        "extrude": r'(?:extrude|pad)\s+(?:the\s+)?(.{10,60}?)(?:\.|$)',
        "pocket": r'(?:pocket|cut\s+extrude)\s+(?:it\s+)?(.{10,60}?)(?:\.|$)',
        "fillet": r'(?:add\s+)?(?:a\s+)?fillet\s+(.{10,60}?)(?:\.|$)',
        "chamfer": r'(?:add\s+)?(?:a\s+)?chamfer\s+(.{10,60}?)(?:\.|$)',
        "mirror": r'mirror\s+(?:the\s+)?(.{10,60}?)(?:\.|$)',
        "shell": r'shell\s+(?:the\s+)?(.{10,60}?)(?:\.|$)',
        "revolve": r'revolve\s+(?:the\s+)?(.{10,60}?)(?:\.|$)',
        "pattern": r'(?:linear|circular)\s+pattern\s+(.{10,60}?)(?:\.|$)',
    }

    found_features = []
    for feat_name, pattern in cad_features.items():
        matches = re.findall(pattern, text, re.I)
        if matches:
            found_features.append(f"{feat_name}: {matches[0].strip()}")

    if len(found_features) >= 2:
        items.append(ExtractedItem(
            id=next_id("cad-features"),
            category="procedure",
            domain="cad",
            title=f"CAD modeling features in {platform or 'tutorial'}",
            body="Features used: " + "; ".join(found_features),
            confidence=0.7,
            tags=["cad", "features", "modeling"],
            steps=found_features,
            step_count=len(found_features),
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Machine Setup
# ---------------------------------------------------------------------------

def _extract_machine_setup(text: str, platform: str, next_id) -> list[ExtractedItem]:
    """Extract machine setup knowledge."""
    items: list[ExtractedItem] = []

    # Work offset patterns
    if re.search(r'(?:g54|g55|work\s*offset|wcs|work\s*coordinate)', text, re.I):
        context = ""
        m = re.search(r'(?:g54|work\s*offset).{0,200}', text, re.I)
        if m:
            context = m.group(0).strip()[:200]
        items.append(ExtractedItem(
            id=next_id("shop-setup"),
            category="procedure",
            domain="shop",
            title=f"Work offset setup on {platform or 'CNC'}",
            body=f"Work coordinate system setup: {context}",
            confidence=0.7,
            tags=["setup", "work-offset", "g54"],
        ))

    # Tool measurement
    if re.search(r'(?:tool\s*(?:length|setter|measurement|probe)|touch\s*off)', text, re.I):
        m = re.search(r'(?:tool\s*(?:length|setter|measurement|probe)|touch\s*off).{0,200}', text, re.I)
        context = m.group(0).strip()[:200] if m else ""
        items.append(ExtractedItem(
            id=next_id("shop-setup"),
            category="tribal_tip",
            domain="shop",
            title="Tool measurement and length offset setup",
            body=f"Tool measurement procedure: {context}",
            confidence=0.7,
            tags=["setup", "tool-length", "measurement"],
        ))

    # Workholding
    if re.search(r'(?:vise|chuck|fixture|clamp|workhold)', text, re.I):
        m = re.search(r'(?:vise|chuck|fixture|clamp|workhold).{0,150}', text, re.I)
        context = m.group(0).strip()[:150] if m else ""
        items.append(ExtractedItem(
            id=next_id("shop-setup"),
            category="tribal_tip",
            domain="shop",
            title="Workholding setup guidance",
            body=f"Workholding: {context}",
            confidence=0.65,
            tags=["setup", "workholding", "fixturing"],
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: G-Code
# ---------------------------------------------------------------------------

def _extract_gcode_patterns(text: str, domain: str, next_id) -> list[ExtractedItem]:
    """Extract G-code commands and patterns."""
    items: list[ExtractedItem] = []

    # G-code mentions
    gcodes = re.findall(r'\b(g\d{1,3})\b', text, re.I)
    mcodes = re.findall(r'\b(m\d{1,3})\b', text, re.I)

    if gcodes:
        unique_g = sorted(set(g.upper() for g in gcodes))
        items.append(ExtractedItem(
            id=next_id(f"{domain}-gcode"),
            category="tribal_tip",
            domain=domain,
            title=f"G-code commands used: {', '.join(unique_g[:8])}",
            body=f"G-codes referenced in tutorial: {', '.join(unique_g)}",
            confidence=0.75,
            tags=["gcode", "cnc-programming"],
            parameters={"gcodes": unique_g, "mcodes": sorted(set(m.upper() for m in mcodes))},
        ))

    # Canned cycles
    canned = re.findall(r'\b(g7[3-9]|g8[0-9])\b', text, re.I)
    if canned:
        unique_canned = sorted(set(c.upper() for c in canned))
        items.append(ExtractedItem(
            id=next_id(f"{domain}-canned"),
            category="tribal_tip",
            domain=domain,
            title=f"Canned cycles: {', '.join(unique_canned)}",
            body=f"Canned drilling/boring cycles used: {', '.join(unique_canned)}",
            confidence=0.75,
            tags=["gcode", "canned-cycle", "drilling"],
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Post-Processing
# ---------------------------------------------------------------------------

def _extract_post_processing(
    text: str, domain: str, platform: str, next_id,
) -> list[ExtractedItem]:
    """Extract post-processing and machine controller info."""
    items: list[ExtractedItem] = []

    # Post-processor mentions
    post_patterns = [
        (r'(?:post\s*process|post-process)\w*\s*(?:for\s+)?(.{5,60}?)(?:\.|$)', "post-processor"),
        (r'(?:haas|fanuc|siemens|mazak|okuma|heidenhain)\s*(.{0,40}?)(?:\.|$)', "controller"),
    ]

    for pattern, ptype in post_patterns:
        for m in re.finditer(pattern, text, re.I):
            target = m.group(0).strip()[:80]
            items.append(ExtractedItem(
                id=next_id(f"{domain}-post"),
                category="tribal_tip",
                domain=domain,
                title=f"Post-processing: {target[:50]}",
                body=f"Post-processing/controller info: {target}",
                confidence=0.7,
                tags=["post-processor", "gcode", ptype],
            ))
            break  # Only first match per pattern

    return items


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_context(text: str, pos: int, window: int = 200) -> str:
    """Get text context around a position."""
    start = max(0, pos - window // 2)
    end = min(len(text), pos + window // 2)
    return text[start:end].strip()


def _format_params_body(params: dict) -> str:
    """Format parameters into a readable body string."""
    lines = []
    for k, v in params.items():
        label = k.replace("_", " ").title()
        if isinstance(v, list):
            lines.append(f"{label}: {', '.join(str(x) for x in v)}")
        else:
            lines.append(f"{label}: {v}")
    return "; ".join(lines)


# ---------------------------------------------------------------------------
# Auto-Domain Detection
# ---------------------------------------------------------------------------

def _auto_detect_domain(text: str) -> str:
    """Auto-detect domain from text content using keyword scoring."""
    scores: dict[str, int] = {}

    domain_keywords = {
        "cam": ["toolpath", "cnc", "g-code", "gcode", "milling", "lathe",
                "roughing", "finishing", "spindle", "feed rate", "rpm"],
        "cad": ["sketch", "extrude", "solidworks", "fusion 360", "freecad",
                "parametric", "3d model", "constraint", "fillet", "chamfer"],
        "shop": ["vise", "workholding", "machine setup", "tool setter",
                 "work offset", "g54", "edge finder", "indicate"],
        "software": ["function", "class", "api", "database", "server",
                     "deploy", "docker", "git", "code", "library", "framework",
                     "typescript", "python", "javascript", "react", "node"],
        "electronics": ["circuit", "voltage", "resistor", "capacitor",
                        "pcb", "solder", "arduino", "microcontroller", "gpio",
                        "oscilloscope", "multimeter", "amp"],
        "additive": ["3d print", "layer height", "infill", "nozzle",
                     "filament", "slicer", "bed adhesion", "support structure"],
    }

    for domain, keywords in domain_keywords.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[domain] = score

    if not scores:
        return "multi"

    return max(scores, key=scores.get)


# ---------------------------------------------------------------------------
# Extractor: Software / Programming Patterns
# ---------------------------------------------------------------------------

def _extract_software_patterns(
    text: str, domain: str, next_id,
) -> list[ExtractedItem]:
    """Extract software development patterns and best practices."""
    items: list[ExtractedItem] = []

    # API/function patterns
    api_patterns = re.findall(
        r'(?:function|method|endpoint|api)\s+(.{5,60}?)(?:\s+(?:takes|accepts|returns|does))',
        text, re.I,
    )
    for match in api_patterns[:5]:
        items.append(ExtractedItem(
            id=next_id("sw-api"),
            category="api_pattern",
            domain="software",
            title=f"API pattern: {match.strip()[:50]}",
            body=match.strip(),
            confidence=0.65,
            tags=["programming", "api"],
        ))

    # Best practices: "you should", "best practice", "recommended"
    practices = re.findall(
        r'(?:you should|best practice|recommended|always|important to)\s+(.{10,100}?)(?:\.|$)',
        text, re.I,
    )
    for practice in practices[:5]:
        items.append(ExtractedItem(
            id=next_id("sw-practice"),
            category="best_practice",
            domain="software",
            title=f"Best practice: {practice.strip()[:50]}",
            body=practice.strip(),
            confidence=0.6,
            tags=["programming", "best-practice"],
        ))

    # Configuration mentions
    configs = re.findall(
        r'(?:set|configure|config|setting)\s+(.{5,60}?)\s+to\s+(.{3,40}?)(?:\.|$)',
        text, re.I,
    )
    if configs:
        params = {k.strip(): v.strip() for k, v in configs[:10]}
        items.append(ExtractedItem(
            id=next_id("sw-config"),
            category="configuration",
            domain="software",
            title="Configuration settings",
            body="; ".join(f"{k} = {v}" for k, v in params.items()),
            confidence=0.7,
            tags=["programming", "configuration"],
            parameters=params,
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Electronics Patterns
# ---------------------------------------------------------------------------

def _extract_electronics_patterns(
    text: str, domain: str, next_id,
) -> list[ExtractedItem]:
    """Extract electronics and circuit design knowledge."""
    items: list[ExtractedItem] = []

    # Component values
    resistors = re.findall(r'(\d+(?:\.\d+)?)\s*(?:k|M)?\s*(?:ohm|Ω)', text, re.I)
    capacitors = re.findall(r'(\d+(?:\.\d+)?)\s*(?:u|n|p)?[fF]', text, re.I)
    voltages = re.findall(r'(\d+(?:\.\d+)?)\s*(?:volt|v\b)', text, re.I)

    if resistors or capacitors or voltages:
        params = {}
        if resistors:
            params["resistors"] = resistors
        if capacitors:
            params["capacitors"] = capacitors
        if voltages:
            params["voltages"] = voltages
        items.append(ExtractedItem(
            id=next_id("elec-components"),
            category="parameter_table",
            domain="electronics",
            title="Electronic component values",
            body=_format_params_body(params),
            confidence=0.7,
            tags=["electronics", "components"],
            parameters=params,
        ))

    # Pin/GPIO connections
    pins = re.findall(r'(?:connect|pin|gpio)\s+(.{5,60}?)\s+to\s+(.{5,40}?)(?:\.|$)', text, re.I)
    if pins:
        steps = [f"Connect {a.strip()} to {b.strip()}" for a, b in pins]
        items.append(ExtractedItem(
            id=next_id("elec-wiring"),
            category="procedure",
            domain="electronics",
            title="Circuit wiring procedure",
            body="\n".join(steps),
            confidence=0.65,
            tags=["electronics", "wiring"],
            steps=steps,
            step_count=len(steps),
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: Additive Manufacturing (3D Printing)
# ---------------------------------------------------------------------------

def _extract_additive_patterns(
    text: str, domain: str, next_id,
) -> list[ExtractedItem]:
    """Extract 3D printing / additive manufacturing knowledge."""
    items: list[ExtractedItem] = []

    params = {}
    # Layer height
    for m in re.finditer(r'layer\s*height\s*(?:of\s*|=\s*|is\s*)?(\d+(?:\.\d+)?)\s*(?:mm|micron)', text, re.I):
        params["layer_height_mm"] = float(m.group(1))

    # Nozzle temp
    for m in re.finditer(r'(?:nozzle|hotend)\s*(?:temp|temperature)\s*(?:of\s*|=\s*|is\s*|to\s*)?(\d+)\s*(?:°?[cC]|degrees)', text, re.I):
        params["nozzle_temp_c"] = int(m.group(1))

    # Bed temp
    for m in re.finditer(r'bed\s*(?:temp|temperature)\s*(?:of\s*|=\s*|is\s*|to\s*)?(\d+)\s*(?:°?[cC]|degrees)', text, re.I):
        params["bed_temp_c"] = int(m.group(1))

    # Infill
    for m in re.finditer(r'infill\s*(?:of\s*|=\s*|is\s*|to\s*)?(\d+)\s*%', text, re.I):
        params["infill_pct"] = int(m.group(1))

    # Print speed
    for m in re.finditer(r'(?:print|travel)\s*speed\s*(?:of\s*|=\s*|is\s*|to\s*)?(\d+)\s*(?:mm/s|mm per)', text, re.I):
        params["print_speed_mms"] = int(m.group(1))

    if params:
        items.append(ExtractedItem(
            id=next_id("add-params"),
            category="parameter_table",
            domain="additive",
            title="3D printing parameters",
            body=_format_params_body(params),
            confidence=0.75,
            tags=["additive", "3d-printing", "parameters"],
            parameters=params,
        ))

    # Material mentions
    materials = re.findall(r'\b(pla|abs|petg|tpu|nylon|resin|carbon\s*fiber)\b', text, re.I)
    if materials:
        unique_mats = list(set(m.upper() for m in materials))
        items.append(ExtractedItem(
            id=next_id("add-material"),
            category="tribal_tip",
            domain="additive",
            title=f"3D printing materials: {', '.join(unique_mats)}",
            body=f"Materials referenced: {', '.join(unique_mats)}",
            confidence=0.7,
            tags=["additive", "materials"],
        ))

    return items


# ---------------------------------------------------------------------------
# Extractor: General Knowledge (domain-agnostic)
# ---------------------------------------------------------------------------

def _extract_general_knowledge(
    text: str, title: str, domain: str, next_id,
) -> list[ExtractedItem]:
    """Extract domain-agnostic tips and advice."""
    items: list[ExtractedItem] = []

    # "The key is..." / "The trick is..." patterns
    key_insights = re.findall(
        r'(?:the key|the trick|the secret|the important thing)\s+(?:is|here)\s+(.{10,100}?)(?:\.|$)',
        text, re.I,
    )
    for insight in key_insights[:3]:
        items.append(ExtractedItem(
            id=next_id(f"{domain}-insight"),
            category="tribal_tip",
            domain=domain,
            title=f"Key insight: {insight.strip()[:50]}",
            body=insight.strip(),
            confidence=0.6,
            tags=[domain, "insight"],
        ))

    # "Make sure to..." / "Don't forget to..." patterns
    reminders = re.findall(
        r'(?:make sure|don\'t forget|remember|be sure)\s+to\s+(.{10,80}?)(?:\.|$)',
        text, re.I,
    )
    for reminder in reminders[:3]:
        items.append(ExtractedItem(
            id=next_id(f"{domain}-reminder"),
            category="tribal_tip",
            domain=domain,
            title=f"Reminder: {reminder.strip()[:50]}",
            body=reminder.strip(),
            confidence=0.6,
            tags=[domain, "reminder"],
        ))

    return items


def _deduplicate_items(items: list[ExtractedItem]) -> list[ExtractedItem]:
    """Remove items with very similar titles."""
    seen: set[str] = set()
    unique: list[ExtractedItem] = []

    for item in items:
        # Normalize title for comparison
        key = re.sub(r'[^a-z0-9]', '', item.title.lower())[:40]
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique
