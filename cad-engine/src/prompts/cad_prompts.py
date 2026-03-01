"""CAD domain extraction prompts for SolidWorks, Fusion 360, AutoCAD, and generic.

Each prompt instructs the LLM to extract structured knowledge from a combined
transcript + OCR + vision context. Output must conform to knowledge_schema_v2
CAD domain structure.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# System prompt shared by all CAD extraction calls
# ---------------------------------------------------------------------------

CAD_SYSTEM_PROMPT = """\
You are a CAD knowledge extraction specialist. You analyze manufacturing
tutorial content (transcripts, screenshots, OCR text) and extract structured
CAD modeling knowledge.

You MUST return valid JSON matching this structure:
{
  "features": [...],
  "design_intent_summary": "...",
  "modeling_approach": "..."
}

Each feature in the features array MUST have:
{
  "id": "cad-NNN",
  "name": "descriptive name",
  "feature_type": "<one of the allowed types>",
  "parameters": [{"name": "...", "value": ..., "unit": "mm"}],
  "parent_feature_id": null or "cad-NNN",
  "design_intent": "why this feature exists",
  "constraints": ["list of constraints"],
  "provenance": {
    "source_type": "transcript|vision|ocr|inferred",
    "confidence": 0.0-1.0,
    "timestamp_seconds": null or number,
    "transcript_span": "relevant quote"
  },
  "cross_links": []
}

Allowed feature_type values:
sketch, extrude, revolve, loft, sweep, fillet, chamfer, hole, pattern,
mirror, shell, boolean_union, boolean_subtract, boolean_intersect,
draft, rib, assembly_constraint, reference_geometry, surface,
sheet_metal, weldment, other

Rules:
- Extract ALL features mentioned, even briefly
- Assign sequential IDs: cad-001, cad-002, etc.
- Set parent_feature_id to build the feature tree hierarchy
- Include numeric parameters with units when stated
- Set confidence based on how explicitly the feature was described
- Capture design intent when the presenter explains WHY
- Return ONLY the JSON object, no markdown fences or commentary
"""

# ---------------------------------------------------------------------------
# Platform-specific extraction prompts (appended to user message)
# ---------------------------------------------------------------------------

SOLIDWORKS_PROMPT = """\
Analyze this SolidWorks tutorial content. Pay special attention to:
- Feature Manager Design Tree entries (extrude, cut-extrude, fillet, etc.)
- Sketch entities and constraints (fully defined, under/over-constrained)
- Smart Dimensions and equations
- Reference planes and axes
- Assembly mates (coincident, concentric, distance, etc.)
- Configuration and design table parameters
- Sheet metal features (base flange, edge flange, fold/unfold)

Extract the complete feature tree hierarchy when visible.
"""

FUSION360_PROMPT = """\
Analyze this Fusion 360 tutorial content. Pay special attention to:
- Timeline entries (each operation in the parametric history)
- Sketch profiles and constraints
- Component structure and joints
- T-spline / form editing operations
- Sheet metal features (flange, bend, unfold)
- Simulation setup parameters if shown
- Manufacturing workspace operations if shown
- Parameters dialog values

Extract the timeline sequence as the feature tree.
"""

AUTOCAD_PROMPT = """\
Analyze this AutoCAD tutorial content. Pay special attention to:
- 2D drafting entities (lines, arcs, circles, polylines)
- Layer organization and properties
- Dimensioning (linear, angular, radial)
- Block definitions and references
- Hatching patterns and regions
- 3D modeling commands (extrude, revolve, loft, sweep)
- UCS and viewport configuration
- Annotation and text styles

Map 2D drafting operations to feature_type 'sketch' and 3D operations
to their corresponding types.
"""

GENERIC_CAD_PROMPT = """\
Analyze this CAD tutorial content. Extract all modeling features,
dimensions, constraints, and design intent mentioned. Map operations
to the closest matching feature_type from the allowed values.
If the specific CAD software is not identified, focus on the
geometric operations being performed.
"""

# ---------------------------------------------------------------------------
# Prompt selection
# ---------------------------------------------------------------------------

_PLATFORM_PROMPTS: dict[str, str] = {
    "solidworks": SOLIDWORKS_PROMPT,
    "fusion 360": FUSION360_PROMPT,
    "fusion360": FUSION360_PROMPT,
    "autocad": AUTOCAD_PROMPT,
}


def get_cad_prompt(platform: str | None = None) -> str:
    """Return the platform-specific CAD extraction prompt.

    Args:
        platform: Detected software name (case-insensitive), or None for generic.

    Returns:
        The extraction prompt string to append to the user message.
    """
    if platform:
        key = platform.lower().strip()
        for name, prompt in _PLATFORM_PROMPTS.items():
            if name in key:
                return prompt
    return GENERIC_CAD_PROMPT


def build_cad_user_message(
    transcript: str,
    ocr_text: str | None = None,
    vision_summary: str | None = None,
    platform: str | None = None,
) -> str:
    """Build the complete user message for CAD knowledge extraction.

    Combines the platform prompt with all available evidence sources.
    """
    parts: list[str] = [get_cad_prompt(platform)]

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
