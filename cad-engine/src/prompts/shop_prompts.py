"""SHOP domain extraction prompts for shop floor practices and procedures.

Each prompt instructs the LLM to extract structured knowledge from a combined
transcript + OCR + vision context. Output must conform to knowledge_schema_v2
SHOP domain structure.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# System prompt shared by all SHOP extraction calls
# ---------------------------------------------------------------------------

SHOP_SYSTEM_PROMPT = """\
You are a CNC machining shop floor knowledge extraction specialist. You
analyze manufacturing tutorial content (transcripts, screenshots, OCR text)
and extract practical shop practices, procedures, and tips.

You MUST return valid JSON matching this structure:
{
  "practices": [...],
  "setup_summary": "...",
  "key_takeaways": ["...", "..."]
}

Each practice in the practices array MUST have:
{
  "id": "shop-NNN",
  "title": "concise practice title",
  "practice_type": "<one of the allowed types>",
  "description": "full description of the practice",
  "steps": ["step 1", "step 2", ...],
  "applicable_materials": ["aluminum", "steel", ...],
  "applicable_machines": ["VMC", "lathe", ...],
  "applicable_controllers": ["Fanuc", "Haas", ...],
  "warnings": ["safety warnings or common mistakes"],
  "provenance": {
    "source_type": "transcript|vision|ocr|inferred",
    "confidence": 0.0-1.0,
    "timestamp_seconds": null or number,
    "transcript_span": "relevant quote"
  },
  "cross_links": []
}

Allowed practice_type values:
setup_procedure, workholding_technique, tool_management,
measurement_technique, cutting_practice, troubleshooting,
material_handling, machine_operation, safety_procedure,
quality_control, maintenance, optimization_tip, other

Rules:
- Extract ALL practices, tips, and procedures mentioned
- Assign sequential IDs: shop-001, shop-002, etc.
- Break procedures into ordered steps when possible
- Include material-specific advice (e.g., "for aluminum, use...")
- Include machine-specific advice (e.g., "on a Haas VF-2...")
- Capture safety warnings and common mistakes
- Note controller-specific G-codes or procedures (G54, M19, etc.)
- Record troubleshooting cause-and-fix pairs
- Return ONLY the JSON object, no markdown fences or commentary
"""

# ---------------------------------------------------------------------------
# Context-specific extraction prompts
# ---------------------------------------------------------------------------

SETUP_PROMPT = """\
Analyze this CNC setup tutorial. Pay special attention to:
- Machine type and model (VMC, HMC, lathe, etc.)
- Work coordinate system setup (G54/G55, touch-off procedures)
- Tool length offset procedures (H codes, tool setter use)
- Work offset probing (edge finder, probe cycles, indicator)
- Workholding setup (vise jaw alignment, soft jaws, fixturing)
- Part zero / datum establishment
- Stock preparation and facing
- First article inspection procedures

Extract each procedure as a separate shop practice with ordered steps.
"""

CUTTING_PROMPT = """\
Analyze this machining/cutting tutorial. Pay special attention to:
- Feeds and speeds rationale (why these values for this material)
- Tool engagement strategies (ramping, helical entry, arc lead-in)
- Chip evacuation techniques (peck drilling, trochoidal, air blast)
- Surface finish techniques (spring passes, climb vs conventional)
- Material-specific cutting advice (aluminum vs steel vs titanium)
- Coolant strategy (flood vs mist vs air vs MQL)
- Tool wear indicators and when to change tools
- Vibration/chatter diagnosis and mitigation

Separate cutting practices from troubleshooting tips.
"""

TROUBLESHOOTING_PROMPT = """\
Analyze this troubleshooting tutorial. Pay special attention to:
- Problem symptoms described (chatter, poor finish, tool breakage, etc.)
- Root cause identification steps
- Diagnostic procedures (sound, visual, measurement)
- Fix procedures with specific parameter changes
- Machine-specific troubleshooting (alarms, error codes)
- Controller-specific diagnostic screens or commands
- Before/after comparisons showing the fix

For each problem, create a practice with type 'troubleshooting'.
Include the symptom in the title and the fix in the steps.
"""

TOOL_MANAGEMENT_PROMPT = """\
Analyze this tool management tutorial. Pay special attention to:
- Tool selection criteria (material, geometry, coating)
- Tool holder types (ER collet, shrink fit, hydraulic, etc.)
- Tool measurement procedures (presetter, on-machine probe)
- Tool life management and replacement schedules
- Insert selection (grade, geometry, chip breaker)
- Tool organization and documentation practices

Extract each tool management procedure as a separate practice.
"""

GENERIC_SHOP_PROMPT = """\
Analyze this shop floor / CNC machining tutorial content. Extract all
practical knowledge including setup procedures, cutting practices,
troubleshooting tips, and machine operation procedures. Map each
piece of knowledge to the closest matching practice_type.
"""

# ---------------------------------------------------------------------------
# Prompt selection
# ---------------------------------------------------------------------------

_CONTEXT_PROMPTS: dict[str, str] = {
    "setup": SETUP_PROMPT,
    "cutting": CUTTING_PROMPT,
    "troubleshooting": TROUBLESHOOTING_PROMPT,
    "tool_management": TOOL_MANAGEMENT_PROMPT,
}


def get_shop_prompt(context: str | None = None) -> str:
    """Return the context-specific SHOP extraction prompt.

    Args:
        context: Optional context hint (setup, cutting, troubleshooting,
                 tool_management). Auto-detected if None.
    """
    if context:
        key = context.lower().strip()
        if key in _CONTEXT_PROMPTS:
            return _CONTEXT_PROMPTS[key]
    return GENERIC_SHOP_PROMPT


def detect_shop_context(transcript: str) -> str | None:
    """Auto-detect the shop context from transcript keywords."""
    text = transcript.lower()
    scores: dict[str, int] = {
        "setup": 0,
        "cutting": 0,
        "troubleshooting": 0,
        "tool_management": 0,
    }

    setup_kw = [
        "work offset", "g54", "touch off", "edge finder", "probe",
        "indicate", "dial indicator", "vise", "fixture", "part zero",
        "datum", "work coordinate",
    ]
    cutting_kw = [
        "feeds and speeds", "feed rate", "depth of cut", "stepover",
        "surface finish", "chip", "coolant", "climb", "conventional",
        "ramping", "trochoidal", "peck",
    ]
    trouble_kw = [
        "chatter", "vibration", "tool break", "poor finish", "alarm",
        "error", "diagnos", "troubleshoot", "problem", "fix",
    ]
    tool_kw = [
        "tool holder", "collet", "shrink fit", "presetter", "insert",
        "tool life", "coating", "end mill selection", "tool change",
    ]

    for kw in setup_kw:
        if kw in text:
            scores["setup"] += 1
    for kw in cutting_kw:
        if kw in text:
            scores["cutting"] += 1
    for kw in trouble_kw:
        if kw in text:
            scores["troubleshooting"] += 1
    for kw in tool_kw:
        if kw in text:
            scores["tool_management"] += 1

    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] >= 2 else None


def build_shop_user_message(
    transcript: str,
    ocr_text: str | None = None,
    vision_summary: str | None = None,
    context: str | None = None,
) -> str:
    """Build the complete user message for SHOP knowledge extraction."""
    if not context:
        context = detect_shop_context(transcript)

    parts: list[str] = [get_shop_prompt(context)]

    parts.append("\n--- TRANSCRIPT ---")
    parts.append(transcript[:12000] if len(transcript) > 12000 else transcript)

    if ocr_text and ocr_text.strip():
        parts.append("\n--- OCR TEXT (from UI screenshots) ---")
        parts.append(ocr_text[:4000] if len(ocr_text) > 4000 else ocr_text)

    if vision_summary and vision_summary.strip():
        parts.append("\n--- VISION ANALYSIS (frame descriptions) ---")
        parts.append(
            vision_summary[:6000] if len(vision_summary) > 6000 else vision_summary
        )

    return "\n".join(parts)
