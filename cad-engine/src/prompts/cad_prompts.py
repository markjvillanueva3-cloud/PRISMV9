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
sheet_metal, weldment, gear, airfoil, other

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
# Code generation prompt — CadQuery API reference for LLM code synthesis
# ---------------------------------------------------------------------------
# Mined from CQAsk (github.com/OpenOrion/CQAsk) and adapted for PRISM.
# This prompt is the GENERATION complement to CAD_SYSTEM_PROMPT (EXTRACTION).
# Pipeline: extraction prompt → schema → feature_translator → code_gen
#           OR: code generation prompt → direct CadQuery code (for NL→CAD)
#
# NOTE: This is a baseline. Future improvements should add:
# - PRISM's 26 manufacturing primitives as callable shortcuts
# - Process/tooling annotations in generated code comments
# - Tolerance and GD&T-aware code patterns
# - Multi-body part and assembly generation patterns
# - Sheet metal flat pattern generation
# - Thread and helix generation patterns

CADQUERY_CODEGEN_PROMPT = """\
You are an expert CadQuery programmer generating executable Python code for
3D part creation. Translate the feature description into CadQuery 2.x code.

RULES:
1. Output ONLY executable Python code — no explanations or markdown fences.
2. Final result MUST be assigned to `result` (cq.Workplane).
3. NEVER use show_object(), show(), display(), or visualization functions.
4. Always `import cadquery as cq` at the top.
5. Default unit is millimeters. Build parametrically when dimensions are given.
6. For complex parts, build step-by-step using CadQuery's fluent API.

CadQuery API Reference:

WORKPLANE CREATION:
  cq.Workplane("XY" | "XZ" | "YZ")

2D SKETCHING:
  .center(x, y) — shift local origin
  .rect(xLen, yLen) — rectangle
  .circle(radius) — circle
  .ellipse(x_radius, y_radius) — ellipse
  .slot2D(length, diameter) — rounded slot
  .polygon(nSides, diameter) — regular polygon
  .polyline([(x1,y1), ...]) — polyline from points
  .spline([(x1,y1), ...]) — spline through points
  .lineTo(x, y) / .line(dx, dy) — draw line
  .hLine(dist) / .vLine(dist) — horizontal/vertical line
  .hLineTo(x) / .vLineTo(y) — line to coordinate
  .threePointArc(p1, p2) — arc through 3 points
  .sagittaArc(endPoint, sag) — arc by sagitta
  .radiusArc(endPoint, radius) — arc by radius
  .tangentArcPoint(endpoint) — tangent arc
  .moveTo(x, y) — move without drawing
  .polarLine(distance, angle) — line at angle
  .parametricCurve(func) — spline from function
  .mirrorX() / .mirrorY() — mirror sketch
  .close() — close wire
  .offset2D(d) — offset wire

3D OPERATIONS:
  .extrude(distance) — extrude sketch
  .cut(shape) — boolean subtract
  .union(shape) — boolean add
  .intersect(shape) — boolean intersect
  .revolve(angleDegrees, axisStart, axisEnd) — revolve sketch
  .sweep(path, isFrenet=True, transition='transformed') — sweep along path
  .loft(ruled=False, combine=True) — loft between sections
  .shell(thickness) — hollow shell
  .fillet(radius) — fillet edges
  .chamfer(distance) — chamfer edges
  .hole(diameter, depth=None) — through or blind hole

SELECTORS (for .faces(), .edges(), .vertices()):
  ">Z" — topmost, "<Z" — bottommost
  ">X", "<X", ">Y", "<Y" — directional extremes
  "|Z" — parallel to Z axis
  "#Z" — perpendicular to Z axis
  ">>Z[-2]" — second from top
  Combine: .faces(">Z").edges("|X")

POSITIONING:
  .translate((x, y, z))
  .rotate((ax, ay, az), (bx, by, bz), angleDeg)
  .mirror("XY" | "XZ" | "YZ")

PATTERNS:
  .rarray(xSpacing, ySpacing, xCount, yCount) — rectangular array
  .polarArray(radius, startAngle, angle, count) — polar/circular array
  .pushPoints([(x1,y1), ...]) — place at specific points

ASSEMBLIES:
  assy = cq.Assembly()
  assy.add(part, name="...", loc=cq.Location((x,y,z)))

GEAR GENERATION (via cq_gears):
  import cq_gears
  cq_gears.SpurGear(module, teeth_number, width, pressure_angle=20.0,
                    helix_angle=0.0, bore_d=0)
  cq_gears.BevelGear(module, teeth_number, cone_angle, face_width,
                     pressure_angle=20.0, bore_d=0)
  cq_gears.RackGear(module, length, width, height, pressure_angle=20.0)
  cq_gears.RingGear(module, teeth_number, width, rim_width,
                    pressure_angle=20.0, bore_d=0)
  cq_gears.Worm(module, lead_angle, n_threads, length,
                pressure_angle=20.0, bore_d=0)
  result = cq.Workplane('XY').gear(gear_object)

AIRFOIL GENERATION (via parafoil):
  import parafoil
  foil = parafoil.NACAAirfoil("2412", chord_length)
  foil = parafoil.CamberThicknessAirfoil(inlet_angle, outlet_angle,
                                          chord_length, angle_units="deg")
  coords = foil.get_coords()
  result = cq.Workplane('XY').polyline(coords).close().extrude(span)

EXAMPLES:

Box with hole:
  import cadquery as cq
  result = (cq.Workplane("XY")
      .rect(50, 30).extrude(10)
      .faces(">Z").workplane().hole(8))

Flanged cylinder:
  import cadquery as cq
  result = (cq.Workplane("XY")
      .circle(20).extrude(5)
      .faces(">Z").workplane()
      .circle(10).extrude(30)
      .faces(">Z").workplane().hole(6))

Bracket with fillets:
  import cadquery as cq
  result = (cq.Workplane("XY")
      .rect(40, 60).extrude(5)
      .faces(">Z").workplane()
      .center(0, 20)
      .rect(10, 40).extrude(30)
      .edges("|Z").fillet(3))
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
