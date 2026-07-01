"""CAM domain extraction prompts for Mastercam, Fusion CAM, SolidWorks CAM, and generic.

Each prompt instructs the LLM to extract structured knowledge from a combined
transcript + OCR + vision context. Output must conform to knowledge_schema_v2
CAM domain structure.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# System prompt shared by all CAM extraction calls
# ---------------------------------------------------------------------------

CAM_SYSTEM_PROMPT = """\
You are a CAM/machining knowledge extraction specialist. You analyze
manufacturing tutorial content (transcripts, screenshots, OCR text) and
extract structured machining strategy knowledge.

You MUST return valid JSON matching this structure:
{
  "strategies": [...],
  "machining_summary": "...",
  "tool_list": [{"number": 1, "type": "...", "diameter_mm": ..., "description": "..."}]
}

Each strategy in the strategies array MUST have:
{
  "id": "cam-NNN",
  "name": "descriptive name",
  "operation_type": "<one of the allowed types>",
  "sequence_order": 1,
  "tool": {
    "type": "end_mill|ball_mill|drill|tap|boring_bar|face_mill|...",
    "diameter_mm": null or number,
    "flutes": null or integer,
    "material": "carbide|hss|ceramic|...",
    "coating": "TiAlN|TiN|AlCrN|uncoated|...",
    "description": "..."
  },
  "cutting_parameters": [
    {"name": "spindle_rpm", "value": ..., "unit": "rpm"},
    {"name": "feed_rate", "value": ..., "unit": "mm/min"},
    {"name": "depth_of_cut", "value": ..., "unit": "mm"},
    {"name": "stepover", "value": ..., "unit": "mm"}
  ],
  "strategy_rationale": "why this strategy was chosen",
  "target_features": [],
  "workholding": "vise|chuck|fixture|...",
  "coolant": "flood|mist|air|none",
  "provenance": {
    "source_type": "transcript|vision|ocr|inferred",
    "confidence": 0.0-1.0,
    "timestamp_seconds": null or number,
    "transcript_span": "relevant quote"
  },
  "cross_links": []
}

Allowed operation_type values:
face_mill, pocket_2d, pocket_3d, contour, profile, adaptive, trochoidal,
slot, thread_mill, drilling, boring, reaming, tapping, roughing_3d,
finishing_3d, rest_machining, turning_rough, turning_finish, turning_groove,
turning_thread, engraving, chamfer_mill, deburr, other

Rules:
- Extract ALL machining operations in sequence order
- Assign sequential IDs: cam-001, cam-002, etc.
- Include ALL cutting parameters mentioned (RPM, feed, DOC, stepover, etc.)
- Convert units to metric (mm, mm/min, rpm) when possible
- Capture tool details: type, diameter, flutes, material, coating
- Record strategy rationale when the presenter explains WHY
- Note workholding and coolant when mentioned
- Return ONLY the JSON object, no markdown fences or commentary
"""

# ---------------------------------------------------------------------------
# Platform-specific extraction prompts
# ---------------------------------------------------------------------------

MASTERCAM_PROMPT = """\
Analyze this Mastercam tutorial content. Pay special attention to:
- Toolpath types (2D/3D, Dynamic Motion, OptiRough, Surface Finish)
- Tool page parameters (diameter, corner radius, flute count, stick-out)
- Cut parameters (depth of cut, stepover %, stepdown)
- Feed/speed settings (RPM, feed rate, plunge rate, retract rate)
- Stock setup and workholding
- Machine definition and post processor selection
- Linking parameters (clearance, retract, feed plane)
- Verification/backplot results if shown
- Tool list and tool numbers (T1, T2, etc.)

Map Dynamic Motion to 'adaptive', OptiRough to 'roughing_3d'.
"""

FUSION_CAM_PROMPT = """\
Analyze this Fusion 360 CAM / HSMWorks tutorial content. Pay special attention to:
- Manufacturing workspace setup (Setup dialog, stock definition, WCS)
- Operation types (2D Adaptive, 2D Pocket, 2D Contour, 3D Adaptive, etc.)
- Tool library selections (tool type, diameter, flutes, vendor)
- Feeds & speeds (from tool library or manual override)
- Passes tab (stepdown, stepover, tolerance, smoothing)
- Linking tab (lead-in/out, ramp type, retract height)
- Heights tab (clearance, retract, feed, bottom)
- Post process settings and NC output
- Simulation results if shown

Map '2D Adaptive' and '3D Adaptive' to 'adaptive'.
"""

SOLIDWORKS_CAM_PROMPT = """\
Analyze this SolidWorks CAM / CAMWorks tutorial content. Pay special attention to:
- Automatic Feature Recognition (AFR) results
- Technology Database (TechDB) parameters
- Operation types and machining sequences
- Tool definitions from tool crib
- Feeds and speeds settings
- Stock definition and fixture setup
- Post processor and G-code output
- Simulation results if shown

Extract both auto-recognized and manually defined operations.
"""

GENERIC_CAM_PROMPT = """\
Analyze this CAM/machining tutorial content. Extract all machining
operations, tools, cutting parameters, and strategies mentioned.
Map operations to the closest matching operation_type from the
allowed values. Include all numeric parameters with units.
"""

# ---------------------------------------------------------------------------
# Prompt selection
# ---------------------------------------------------------------------------

_PLATFORM_PROMPTS: dict[str, str] = {
    "mastercam": MASTERCAM_PROMPT,
    "fusion 360": FUSION_CAM_PROMPT,
    "fusion360": FUSION_CAM_PROMPT,
    "hsmworks": FUSION_CAM_PROMPT,
    "solidworks cam": SOLIDWORKS_CAM_PROMPT,
    "camworks": SOLIDWORKS_CAM_PROMPT,
}


def get_cam_prompt(platform: str | None = None) -> str:
    """Return the platform-specific CAM extraction prompt."""
    if platform:
        key = platform.lower().strip()
        for name, prompt in _PLATFORM_PROMPTS.items():
            if name in key:
                return prompt
    return GENERIC_CAM_PROMPT


def build_cam_user_message(
    transcript: str,
    ocr_text: str | None = None,
    vision_summary: str | None = None,
    platform: str | None = None,
) -> str:
    """Build the complete user message for CAM knowledge extraction."""
    parts: list[str] = [get_cam_prompt(platform)]

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
