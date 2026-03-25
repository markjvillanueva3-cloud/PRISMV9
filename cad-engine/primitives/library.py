"""Primitive Library — 20 foundational CAD primitives as CadQuery functions.

Each primitive is a PrimitiveDef with:
  - name: unique identifier
  - description: what it creates
  - tags: searchable category tags
  - params: typed parameter definitions with defaults and valid ranges
  - processes: associated manufacturing processes
  - tooling: required tooling
  - generate(): returns CadQuery code string with parameterized values
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Union


@dataclass
class ParamSpec:
    """Parameter specification for a primitive."""
    name: str
    type: str  # "float", "int", "str"
    default: Union[float, int, str]
    unit: str = ""
    min_val: float | None = None
    max_val: float | None = None
    description: str = ""

    def to_dict(self) -> dict:
        d: dict = {"name": self.name, "type": self.type, "default": self.default}
        if self.unit:
            d["unit"] = self.unit
        if self.min_val is not None:
            d["min"] = self.min_val
        if self.max_val is not None:
            d["max"] = self.max_val
        if self.description:
            d["description"] = self.description
        return d


@dataclass
class PrimitiveDef:
    """A foundational CAD primitive definition."""
    name: str
    description: str
    tags: list[str] = field(default_factory=list)
    params: dict[str, ParamSpec] = field(default_factory=dict)
    processes: list[str] = field(default_factory=list)
    tooling: list[str] = field(default_factory=list)
    _code_fn: object = None  # callable(params_dict) -> str

    def generate(self, **overrides: Union[float, int, str]) -> str:
        """Generate CadQuery code with optional parameter overrides."""
        values = {name: spec.default for name, spec in self.params.items()}
        for k, v in overrides.items():
            if k in self.params:
                spec = self.params[k]
                if spec.min_val is not None and isinstance(v, (int, float)):
                    if v < spec.min_val:
                        raise ValueError(f"{k}={v} below min {spec.min_val}")
                if spec.max_val is not None and isinstance(v, (int, float)):
                    if v > spec.max_val:
                        raise ValueError(f"{k}={v} above max {spec.max_val}")
                values[k] = v
        if self._code_fn and callable(self._code_fn):
            return self._code_fn(values)
        return f"# Primitive {self.name} — no code generator"

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "tags": self.tags,
            "params": {k: v.to_dict() for k, v in self.params.items()},
            "processes": self.processes,
            "tooling": self.tooling,
        }


# ============================================================================
# Helper: format number for code output
# ============================================================================

def _f(v: Union[float, int]) -> str:
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    if isinstance(v, float):
        return f"{v:.4g}"
    return str(v)


# ============================================================================
# 1. bolt_circle — circular pattern of holes
# ============================================================================

def _bolt_circle_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"bolt_circle_diameter = {_f(p['diameter'])}\n"
        f"bolt_hole_diameter = {_f(p['hole_diameter'])}\n"
        f"bolt_hole_depth = {_f(p['hole_depth'])}\n"
        f"bolt_count = {p['count']}\n"
        f"bolt_circle_radius = bolt_circle_diameter / 2\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .polarArray(bolt_circle_radius, 0, 360, bolt_count)\n"
        f"    .hole(bolt_hole_diameter, bolt_hole_depth)\n"
        f")"
    )


BOLT_CIRCLE = PrimitiveDef(
    name="bolt_circle",
    description="Circular pattern of equally-spaced holes for bolt mounting",
    tags=["hole", "pattern", "mounting", "fastener", "circular"],
    params={
        "diameter": ParamSpec("diameter", "float", 50.0, "mm", 10.0, 500.0, "Bolt circle diameter"),
        "hole_diameter": ParamSpec("hole_diameter", "float", 6.0, "mm", 1.0, 50.0, "Individual hole diameter"),
        "hole_depth": ParamSpec("hole_depth", "float", 20.0, "mm", 1.0, 200.0, "Hole depth (0 = through)"),
        "count": ParamSpec("count", "int", 6, "", 2, 36, "Number of holes"),
    },
    processes=["drilling", "milling"],
    tooling=["drill_bit", "end_mill"],
    _code_fn=_bolt_circle_code,
)

# ============================================================================
# 2. o_ring_groove — rectangular-section annular groove for O-ring seal
# ============================================================================

def _o_ring_groove_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"groove_diameter = {_f(p['groove_diameter'])}\n"
        f"groove_width = {_f(p['groove_width'])}\n"
        f"groove_depth = {_f(p['groove_depth'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .circle(groove_diameter / 2 + groove_width / 2)\n"
        f"    .circle(groove_diameter / 2 - groove_width / 2)\n"
        f"    .cutBlind(-groove_depth)\n"
        f")"
    )


O_RING_GROOVE = PrimitiveDef(
    name="o_ring_groove",
    description="Annular groove with rectangular cross-section for O-ring seal",
    tags=["groove", "seal", "o-ring", "annular", "fluid"],
    params={
        "groove_diameter": ParamSpec("groove_diameter", "float", 30.0, "mm", 5.0, 500.0, "Center diameter of groove"),
        "groove_width": ParamSpec("groove_width", "float", 2.5, "mm", 0.5, 20.0, "Width of groove channel"),
        "groove_depth": ParamSpec("groove_depth", "float", 1.8, "mm", 0.3, 15.0, "Depth of groove"),
    },
    processes=["turning", "milling"],
    tooling=["grooving_tool", "end_mill"],
    _code_fn=_o_ring_groove_code,
)

# ============================================================================
# 3. keyway — rectangular slot for key-shaft power transmission
# ============================================================================

def _keyway_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"keyway_width = {_f(p['width'])}\n"
        f"keyway_depth = {_f(p['depth'])}\n"
        f"keyway_length = {_f(p['length'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .rect(keyway_width, keyway_length)\n"
        f"    .cutBlind(-keyway_depth)\n"
        f")"
    )


KEYWAY = PrimitiveDef(
    name="keyway",
    description="Rectangular slot in shaft/bore for key-based power transmission",
    tags=["slot", "keyway", "shaft", "power_transmission", "coupling"],
    params={
        "width": ParamSpec("width", "float", 6.0, "mm", 2.0, 50.0, "Keyway width (per DIN 6885)"),
        "depth": ParamSpec("depth", "float", 3.5, "mm", 1.0, 30.0, "Keyway depth"),
        "length": ParamSpec("length", "float", 25.0, "mm", 5.0, 300.0, "Keyway length along shaft"),
    },
    processes=["milling", "broaching"],
    tooling=["end_mill", "broach"],
    _code_fn=_keyway_code,
)

# ============================================================================
# 4. counterbore — stepped hole with flat bottom recess
# ============================================================================

def _counterbore_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"cb_hole_diameter = {_f(p['hole_diameter'])}\n"
        f"cb_bore_diameter = {_f(p['bore_diameter'])}\n"
        f"cb_bore_depth = {_f(p['bore_depth'])}\n"
        f"cb_hole_depth = {_f(p['hole_depth'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .cboreHole(cb_hole_diameter, cb_bore_diameter, cb_bore_depth, depth=cb_hole_depth)\n"
        f")"
    )


COUNTERBORE = PrimitiveDef(
    name="counterbore",
    description="Stepped hole with flat-bottom recess for socket head cap screws",
    tags=["hole", "counterbore", "fastener", "recess"],
    params={
        "hole_diameter": ParamSpec("hole_diameter", "float", 6.0, "mm", 1.0, 50.0, "Through-hole diameter"),
        "bore_diameter": ParamSpec("bore_diameter", "float", 11.0, "mm", 2.0, 80.0, "Counterbore diameter"),
        "bore_depth": ParamSpec("bore_depth", "float", 6.0, "mm", 1.0, 50.0, "Counterbore depth"),
        "hole_depth": ParamSpec("hole_depth", "float", 25.0, "mm", 2.0, 200.0, "Total hole depth"),
    },
    processes=["drilling", "milling"],
    tooling=["drill_bit", "counterbore_cutter", "end_mill"],
    _code_fn=_counterbore_code,
)

# ============================================================================
# 5. countersink — conical recess for flush-head screws
# ============================================================================

def _countersink_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"cs_hole_diameter = {_f(p['hole_diameter'])}\n"
        f"cs_sink_diameter = {_f(p['sink_diameter'])}\n"
        f"cs_angle = {_f(p['angle'])}\n"
        f"cs_hole_depth = {_f(p['hole_depth'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .cskHole(cs_hole_diameter, cs_sink_diameter, cs_angle, depth=cs_hole_depth)\n"
        f")"
    )


COUNTERSINK = PrimitiveDef(
    name="countersink",
    description="Conical recess for flush-mounting flat-head screws",
    tags=["hole", "countersink", "fastener", "flush", "conical"],
    params={
        "hole_diameter": ParamSpec("hole_diameter", "float", 5.0, "mm", 1.0, 50.0, "Through-hole diameter"),
        "sink_diameter": ParamSpec("sink_diameter", "float", 10.0, "mm", 2.0, 80.0, "Countersink outer diameter"),
        "angle": ParamSpec("angle", "float", 82.0, "deg", 60.0, 120.0, "Countersink included angle"),
        "hole_depth": ParamSpec("hole_depth", "float", 20.0, "mm", 2.0, 200.0, "Total hole depth"),
    },
    processes=["drilling"],
    tooling=["drill_bit", "countersink_cutter"],
    _code_fn=_countersink_code,
)

# ============================================================================
# 6. tapped_hole — threaded hole for bolt/screw
# ============================================================================

def _tapped_hole_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"tap_nominal_diameter = {_f(p['nominal_diameter'])}\n"
        f"tap_pitch = {_f(p['pitch'])}\n"
        f"tap_depth = {_f(p['depth'])}\n"
        f"# Tap drill = nominal - pitch (ISO metric approximation)\n"
        f"tap_drill_diameter = tap_nominal_diameter - tap_pitch\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .hole(tap_drill_diameter, tap_depth)\n"
        f")\n"
        f"# Note: Thread geometry is cosmetic in CadQuery;\n"
        f"# actual thread specification: M{{tap_nominal_diameter}}x{{tap_pitch}}"
    )


TAPPED_HOLE = PrimitiveDef(
    name="tapped_hole",
    description="Threaded hole for bolt/screw (ISO metric)",
    tags=["hole", "thread", "tapped", "fastener", "metric"],
    params={
        "nominal_diameter": ParamSpec("nominal_diameter", "float", 8.0, "mm", 2.0, 100.0, "Nominal thread diameter (M value)"),
        "pitch": ParamSpec("pitch", "float", 1.25, "mm", 0.25, 6.0, "Thread pitch"),
        "depth": ParamSpec("depth", "float", 16.0, "mm", 3.0, 200.0, "Thread depth"),
    },
    processes=["drilling", "tapping"],
    tooling=["drill_bit", "tap"],
    _code_fn=_tapped_hole_code,
)

# ============================================================================
# 7. shoulder — stepped diameter transition on shaft
# ============================================================================

def _shoulder_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"shoulder_large_diameter = {_f(p['large_diameter'])}\n"
        f"shoulder_small_diameter = {_f(p['small_diameter'])}\n"
        f"shoulder_length = {_f(p['length'])}\n"
        f"shoulder_fillet_radius = {_f(p['fillet_radius'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .circle(shoulder_large_diameter / 2)\n"
        f"    .extrude(shoulder_length)\n"
        f"    .faces(\">Z\")\n"
        f"    .workplane()\n"
        f"    .circle(shoulder_small_diameter / 2)\n"
        f"    .extrude(shoulder_length)\n"
        f")\n"
        f"if shoulder_fillet_radius > 0:\n"
        f"    result = result.edges(\"|Z\").fillet(shoulder_fillet_radius)"
    )


SHOULDER = PrimitiveDef(
    name="shoulder",
    description="Stepped diameter transition on shaft for bearing/gear location",
    tags=["shaft", "shoulder", "step", "bearing", "location"],
    params={
        "large_diameter": ParamSpec("large_diameter", "float", 30.0, "mm", 5.0, 500.0, "Larger shaft diameter"),
        "small_diameter": ParamSpec("small_diameter", "float", 20.0, "mm", 3.0, 499.0, "Smaller shaft diameter"),
        "length": ParamSpec("length", "float", 25.0, "mm", 2.0, 500.0, "Length of each section"),
        "fillet_radius": ParamSpec("fillet_radius", "float", 1.0, "mm", 0.0, 20.0, "Transition fillet radius"),
    },
    processes=["turning"],
    tooling=["turning_insert", "facing_tool"],
    _code_fn=_shoulder_code,
)

# ============================================================================
# 8. step — rectangular step/ledge on block
# ============================================================================

def _step_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"step_width = {_f(p['width'])}\n"
        f"step_height = {_f(p['height'])}\n"
        f"step_depth = {_f(p['depth'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .rect(step_width, step_depth)\n"
        f"    .cutBlind(-step_height)\n"
        f")"
    )


STEP = PrimitiveDef(
    name="step",
    description="Rectangular step/ledge machined into block face",
    tags=["step", "ledge", "face", "machined", "rectangular"],
    params={
        "width": ParamSpec("width", "float", 20.0, "mm", 2.0, 500.0, "Step width"),
        "height": ParamSpec("height", "float", 5.0, "mm", 0.5, 200.0, "Step height (cut depth)"),
        "depth": ParamSpec("depth", "float", 30.0, "mm", 2.0, 500.0, "Step depth into part"),
    },
    processes=["milling"],
    tooling=["end_mill", "face_mill"],
    _code_fn=_step_code,
)

# ============================================================================
# 9. pocket — rectangular or circular pocket
# ============================================================================

def _pocket_code(p: dict) -> str:
    shape = p.get("shape", "rectangular")
    if shape == "circular":
        return (
            f"import cadquery as cq\n\n"
            f"pocket_diameter = {_f(p['width'])}\n"
            f"pocket_depth = {_f(p['depth'])}\n"
            f"pocket_corner_radius = {_f(p['corner_radius'])}\n\n"
            f"result = (\n"
            f"    cq.Workplane(\"XY\")\n"
            f"    .circle(pocket_diameter / 2)\n"
            f"    .cutBlind(-pocket_depth)\n"
            f")"
        )
    return (
        f"import cadquery as cq\n\n"
        f"pocket_width = {_f(p['width'])}\n"
        f"pocket_length = {_f(p['length'])}\n"
        f"pocket_depth = {_f(p['depth'])}\n"
        f"pocket_corner_radius = {_f(p['corner_radius'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .rect(pocket_width, pocket_length)\n"
        f"    .cutBlind(-pocket_depth)\n"
        f")\n"
        f"if pocket_corner_radius > 0:\n"
        f"    result = result.edges(\"|Z\").fillet(pocket_corner_radius)"
    )


POCKET = PrimitiveDef(
    name="pocket",
    description="Rectangular or circular pocket milled into face",
    tags=["pocket", "cavity", "milled", "rectangular", "circular"],
    params={
        "width": ParamSpec("width", "float", 30.0, "mm", 2.0, 500.0, "Pocket width (or diameter if circular)"),
        "length": ParamSpec("length", "float", 50.0, "mm", 2.0, 500.0, "Pocket length (rectangular only)"),
        "depth": ParamSpec("depth", "float", 10.0, "mm", 0.5, 200.0, "Pocket depth"),
        "corner_radius": ParamSpec("corner_radius", "float", 3.0, "mm", 0.0, 50.0, "Internal corner radius"),
        "shape": ParamSpec("shape", "str", "rectangular", "", description="Shape: rectangular or circular"),
    },
    processes=["milling"],
    tooling=["end_mill"],
    _code_fn=_pocket_code,
)

# ============================================================================
# 10. slot — elongated through or blind slot
# ============================================================================

def _slot_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"slot_length = {_f(p['length'])}\n"
        f"slot_width = {_f(p['width'])}\n"
        f"slot_depth = {_f(p['depth'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .slot2D(slot_length, slot_width)\n"
        f"    .cutBlind(-slot_depth)\n"
        f")"
    )


SLOT = PrimitiveDef(
    name="slot",
    description="Elongated slot with radiused ends (through or blind)",
    tags=["slot", "elongated", "milled", "adjustment"],
    params={
        "length": ParamSpec("length", "float", 40.0, "mm", 5.0, 500.0, "Slot length (center-to-center of radii)"),
        "width": ParamSpec("width", "float", 10.0, "mm", 1.0, 100.0, "Slot width"),
        "depth": ParamSpec("depth", "float", 8.0, "mm", 0.5, 200.0, "Slot depth"),
    },
    processes=["milling"],
    tooling=["end_mill", "slot_drill"],
    _code_fn=_slot_code,
)

# ============================================================================
# 11. boss — raised cylindrical pad
# ============================================================================

def _boss_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"boss_diameter = {_f(p['diameter'])}\n"
        f"boss_height = {_f(p['height'])}\n"
        f"boss_fillet = {_f(p['fillet_radius'])}\n"
        f"boss_hole_diameter = {_f(p['hole_diameter'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .circle(boss_diameter / 2)\n"
        f"    .extrude(boss_height)\n"
        f")\n"
        f"if boss_fillet > 0:\n"
        f"    result = result.edges(\"|Z\").fillet(boss_fillet)\n"
        f"if boss_hole_diameter > 0:\n"
        f"    result = result.faces(\">Z\").workplane().hole(boss_hole_diameter)"
    )


BOSS = PrimitiveDef(
    name="boss",
    description="Raised cylindrical pad, optionally with central hole for mounting",
    tags=["boss", "pad", "mounting", "cylindrical", "raised"],
    params={
        "diameter": ParamSpec("diameter", "float", 20.0, "mm", 3.0, 200.0, "Boss outer diameter"),
        "height": ParamSpec("height", "float", 8.0, "mm", 1.0, 100.0, "Boss height above surface"),
        "fillet_radius": ParamSpec("fillet_radius", "float", 1.5, "mm", 0.0, 20.0, "Base fillet radius"),
        "hole_diameter": ParamSpec("hole_diameter", "float", 0.0, "mm", 0.0, 100.0, "Central hole (0 = solid)"),
    },
    processes=["milling", "turning"],
    tooling=["end_mill"],
    _code_fn=_boss_code,
)

# ============================================================================
# 12. rib — thin structural support wall
# ============================================================================

def _rib_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"rib_thickness = {_f(p['thickness'])}\n"
        f"rib_height = {_f(p['height'])}\n"
        f"rib_length = {_f(p['length'])}\n"
        f"rib_draft_angle = {_f(p['draft_angle'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XZ\")\n"
        f"    .rect(rib_length, rib_height)\n"
        f"    .extrude(rib_thickness / 2, both=True)\n"
        f")"
    )


RIB = PrimitiveDef(
    name="rib",
    description="Thin structural reinforcement wall between surfaces",
    tags=["rib", "structural", "reinforcement", "wall", "support"],
    params={
        "thickness": ParamSpec("thickness", "float", 3.0, "mm", 0.5, 30.0, "Rib wall thickness"),
        "height": ParamSpec("height", "float", 20.0, "mm", 2.0, 200.0, "Rib height"),
        "length": ParamSpec("length", "float", 40.0, "mm", 5.0, 500.0, "Rib length"),
        "draft_angle": ParamSpec("draft_angle", "float", 1.0, "deg", 0.0, 15.0, "Draft angle for moldability"),
    },
    processes=["milling", "casting"],
    tooling=["end_mill"],
    _code_fn=_rib_code,
)

# ============================================================================
# 13. gusset — triangular reinforcement bracket
# ============================================================================

def _gusset_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"gusset_width = {_f(p['width'])}\n"
        f"gusset_height = {_f(p['height'])}\n"
        f"gusset_thickness = {_f(p['thickness'])}\n\n"
        f"# Triangular profile\n"
        f"result = (\n"
        f"    cq.Workplane(\"XZ\")\n"
        f"    .moveTo(0, 0)\n"
        f"    .lineTo(gusset_width, 0)\n"
        f"    .lineTo(0, gusset_height)\n"
        f"    .close()\n"
        f"    .extrude(gusset_thickness / 2, both=True)\n"
        f")"
    )


GUSSET = PrimitiveDef(
    name="gusset",
    description="Triangular reinforcement plate at junction of two surfaces",
    tags=["gusset", "reinforcement", "triangular", "bracket", "structural"],
    params={
        "width": ParamSpec("width", "float", 20.0, "mm", 5.0, 200.0, "Gusset base width"),
        "height": ParamSpec("height", "float", 20.0, "mm", 5.0, 200.0, "Gusset height"),
        "thickness": ParamSpec("thickness", "float", 4.0, "mm", 1.0, 30.0, "Gusset thickness"),
    },
    processes=["milling", "welding", "casting"],
    tooling=["end_mill"],
    _code_fn=_gusset_code,
)

# ============================================================================
# 14. fillet_break — edge fillet/radius break
# ============================================================================

def _fillet_break_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"fillet_radius = {_f(p['radius'])}\n\n"
        f"# Apply fillet to selected edges\n"
        f"# (requires existing solid body as 'result')\n"
        f"result = result.edges(\"{p.get('edge_selector', '>Z')}\").fillet(fillet_radius)"
    )


FILLET_BREAK = PrimitiveDef(
    name="fillet_break",
    description="Rounded edge break (fillet) for deburring and stress relief",
    tags=["fillet", "edge_break", "radius", "deburr", "finishing"],
    params={
        "radius": ParamSpec("radius", "float", 1.0, "mm", 0.1, 50.0, "Fillet radius"),
        "edge_selector": ParamSpec("edge_selector", "str", ">Z", "", description="CadQuery edge selector string"),
    },
    processes=["milling", "deburring"],
    tooling=["ball_end_mill", "deburring_tool"],
    _code_fn=_fillet_break_code,
)

# ============================================================================
# 15. chamfer_break — angled edge break
# ============================================================================

def _chamfer_break_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"chamfer_distance = {_f(p['distance'])}\n\n"
        f"# Apply chamfer to selected edges\n"
        f"result = result.edges(\"{p.get('edge_selector', '>Z')}\").chamfer(chamfer_distance)"
    )


CHAMFER_BREAK = PrimitiveDef(
    name="chamfer_break",
    description="Angled edge break (chamfer) for deburring and assembly ease",
    tags=["chamfer", "edge_break", "bevel", "deburr", "finishing"],
    params={
        "distance": ParamSpec("distance", "float", 0.5, "mm", 0.1, 20.0, "Chamfer distance"),
        "edge_selector": ParamSpec("edge_selector", "str", ">Z", "", description="CadQuery edge selector string"),
    },
    processes=["milling", "deburring"],
    tooling=["chamfer_mill", "deburring_tool"],
    _code_fn=_chamfer_break_code,
)

# ============================================================================
# 16. draft_wall — tapered wall for mold release
# ============================================================================

def _draft_wall_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"draft_width = {_f(p['width'])}\n"
        f"draft_height = {_f(p['height'])}\n"
        f"draft_depth = {_f(p['depth'])}\n"
        f"draft_angle = {_f(p['angle'])}\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .rect(draft_width, draft_depth)\n"
        f"    .extrude(draft_height, taper=draft_angle)\n"
        f")"
    )


DRAFT_WALL = PrimitiveDef(
    name="draft_wall",
    description="Tapered wall with draft angle for mold release / die casting",
    tags=["draft", "taper", "wall", "mold", "casting"],
    params={
        "width": ParamSpec("width", "float", 40.0, "mm", 5.0, 500.0, "Wall width at base"),
        "height": ParamSpec("height", "float", 30.0, "mm", 5.0, 300.0, "Wall height"),
        "depth": ParamSpec("depth", "float", 40.0, "mm", 5.0, 500.0, "Wall depth at base"),
        "angle": ParamSpec("angle", "float", 3.0, "deg", 0.5, 15.0, "Draft angle"),
    },
    processes=["casting", "injection_molding", "milling"],
    tooling=["end_mill", "mold"],
    _code_fn=_draft_wall_code,
)

# ============================================================================
# 17. shell — hollow thin-wall body
# ============================================================================

def _shell_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"shell_thickness = {_f(p['thickness'])}\n\n"
        f"# Shell operation removes material leaving thin walls\n"
        f"# (requires existing solid body as 'result')\n"
        f"# Open face on top (+Z)\n"
        f"result = result.faces(\">Z\").shell(-shell_thickness)"
    )


SHELL = PrimitiveDef(
    name="shell",
    description="Hollow out solid body leaving thin-wall shell",
    tags=["shell", "hollow", "thin_wall", "enclosure"],
    params={
        "thickness": ParamSpec("thickness", "float", 2.0, "mm", 0.3, 20.0, "Wall thickness"),
    },
    processes=["milling", "casting", "injection_molding"],
    tooling=["end_mill", "mold"],
    _code_fn=_shell_code,
)

# ============================================================================
# 18. thread_relief — groove at thread termination for full engagement
# ============================================================================

def _thread_relief_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"relief_diameter = {_f(p['diameter'])}\n"
        f"relief_width = {_f(p['width'])}\n"
        f"relief_depth = {_f(p['depth'])}\n\n"
        f"# Annular groove at thread runout\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .circle(relief_diameter / 2)\n"
        f"    .circle(relief_diameter / 2 - relief_depth)\n"
        f"    .extrude(relief_width)\n"
        f")"
    )


THREAD_RELIEF = PrimitiveDef(
    name="thread_relief",
    description="Annular groove at thread termination for complete thread engagement",
    tags=["thread", "relief", "groove", "undercut", "termination"],
    params={
        "diameter": ParamSpec("diameter", "float", 20.0, "mm", 3.0, 200.0, "Nominal thread diameter"),
        "width": ParamSpec("width", "float", 3.0, "mm", 1.0, 20.0, "Relief groove width"),
        "depth": ParamSpec("depth", "float", 1.5, "mm", 0.3, 10.0, "Relief groove depth below minor diameter"),
    },
    processes=["turning"],
    tooling=["grooving_tool", "threading_insert"],
    _code_fn=_thread_relief_code,
)

# ============================================================================
# 19. undercut — internal or external relief groove
# ============================================================================

def _undercut_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n\n"
        f"undercut_diameter = {_f(p['diameter'])}\n"
        f"undercut_width = {_f(p['width'])}\n"
        f"undercut_depth = {_f(p['depth'])}\n\n"
        f"# Ring-shaped undercut groove\n"
        f"result = (\n"
        f"    cq.Workplane(\"XY\")\n"
        f"    .circle(undercut_diameter / 2 + undercut_depth)\n"
        f"    .circle(undercut_diameter / 2)\n"
        f"    .extrude(undercut_width)\n"
        f")"
    )


UNDERCUT = PrimitiveDef(
    name="undercut",
    description="Internal or external relief groove for snap rings or assemblies",
    tags=["undercut", "groove", "relief", "snap_ring", "retaining"],
    params={
        "diameter": ParamSpec("diameter", "float", 25.0, "mm", 3.0, 300.0, "Shaft/bore diameter at undercut"),
        "width": ParamSpec("width", "float", 2.0, "mm", 0.5, 15.0, "Undercut width"),
        "depth": ParamSpec("depth", "float", 1.0, "mm", 0.2, 10.0, "Undercut depth"),
    },
    processes=["turning"],
    tooling=["grooving_tool"],
    _code_fn=_undercut_code,
)

# ============================================================================
# 20. dovetail — trapezoidal slot/rail for sliding assembly
# ============================================================================

def _dovetail_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n"
        f"import math\n\n"
        f"dt_width_top = {_f(p['width_top'])}\n"
        f"dt_width_bottom = {_f(p['width_bottom'])}\n"
        f"dt_depth = {_f(p['depth'])}\n"
        f"dt_length = {_f(p['length'])}\n\n"
        f"# Trapezoidal cross-section\n"
        f"half_top = dt_width_top / 2\n"
        f"half_bot = dt_width_bottom / 2\n\n"
        f"result = (\n"
        f"    cq.Workplane(\"XZ\")\n"
        f"    .moveTo(-half_bot, 0)\n"
        f"    .lineTo(-half_top, dt_depth)\n"
        f"    .lineTo(half_top, dt_depth)\n"
        f"    .lineTo(half_bot, 0)\n"
        f"    .close()\n"
        f"    .extrude(dt_length / 2, both=True)\n"
        f")"
    )


DOVETAIL = PrimitiveDef(
    name="dovetail",
    description="Trapezoidal slot or rail for sliding assembly (e.g. machine ways)",
    tags=["dovetail", "slide", "way", "trapezoidal", "guide", "assembly"],
    params={
        "width_top": ParamSpec("width_top", "float", 15.0, "mm", 3.0, 200.0, "Wider top width"),
        "width_bottom": ParamSpec("width_bottom", "float", 10.0, "mm", 2.0, 190.0, "Narrower bottom width"),
        "depth": ParamSpec("depth", "float", 8.0, "mm", 1.0, 100.0, "Dovetail depth"),
        "length": ParamSpec("length", "float", 60.0, "mm", 10.0, 1000.0, "Dovetail length"),
    },
    processes=["milling"],
    tooling=["dovetail_cutter", "end_mill"],
    _code_fn=_dovetail_code,
)


# ============================================================================
# 21. spur_gear — involute spur gear via cq_gears
# ============================================================================

def _spur_gear_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n"
        f"import cq_gears\n\n"
        f"gear = cq_gears.SpurGear(\n"
        f"    module={_f(p['module'])},\n"
        f"    teeth_number={p['teeth_number']},\n"
        f"    width={_f(p['width'])},\n"
        f"    pressure_angle={_f(p['pressure_angle'])},\n"
        f"    helix_angle={_f(p['helix_angle'])},\n"
        f"    bore_d={_f(p['bore_diameter'])},\n"
        f")\n"
        f"result = cq.Workplane('XY').gear(gear)"
    )

SPUR_GEAR = PrimitiveDef(
    name="spur_gear",
    description="Involute spur gear with configurable module, teeth, and bore",
    tags=["gear", "power_transmission", "involute", "spur"],
    params={
        "module": ParamSpec("module", "float", 2.0, "mm", 0.3, 20.0, "Gear module (tooth size)"),
        "teeth_number": ParamSpec("teeth_number", "int", 20, "", 6, 200, "Number of teeth"),
        "width": ParamSpec("width", "float", 10.0, "mm", 1.0, 200.0, "Face width"),
        "pressure_angle": ParamSpec("pressure_angle", "float", 20.0, "deg", 14.5, 30.0, "Pressure angle"),
        "helix_angle": ParamSpec("helix_angle", "float", 0.0, "deg", 0.0, 45.0, "Helix angle (0 = straight)"),
        "bore_diameter": ParamSpec("bore_diameter", "float", 8.0, "mm", 0.0, 100.0, "Center bore diameter"),
    },
    processes=["hobbing", "milling", "wire_edm"],
    tooling=["gear_hob", "end_mill", "wire_edm"],
    _code_fn=_spur_gear_code,
)

# ============================================================================
# 22. bevel_gear — conical gear for angled shaft power transmission
# ============================================================================

def _bevel_gear_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n"
        f"import cq_gears\n\n"
        f"gear = cq_gears.BevelGear(\n"
        f"    module={_f(p['module'])},\n"
        f"    teeth_number={p['teeth_number']},\n"
        f"    cone_angle={_f(p['cone_angle'])},\n"
        f"    face_width={_f(p['face_width'])},\n"
        f"    pressure_angle={_f(p['pressure_angle'])},\n"
        f"    bore_d={_f(p['bore_diameter'])},\n"
        f")\n"
        f"result = cq.Workplane('XY').gear(gear)"
    )

BEVEL_GEAR = PrimitiveDef(
    name="bevel_gear",
    description="Conical bevel gear for angled shaft power transmission",
    tags=["gear", "power_transmission", "bevel", "conical"],
    params={
        "module": ParamSpec("module", "float", 2.0, "mm", 0.3, 20.0, "Gear module"),
        "teeth_number": ParamSpec("teeth_number", "int", 20, "", 6, 200, "Number of teeth"),
        "cone_angle": ParamSpec("cone_angle", "float", 45.0, "deg", 5.0, 85.0, "Pitch cone half-angle"),
        "face_width": ParamSpec("face_width", "float", 10.0, "mm", 1.0, 100.0, "Face width"),
        "pressure_angle": ParamSpec("pressure_angle", "float", 20.0, "deg", 14.5, 30.0, "Pressure angle"),
        "bore_diameter": ParamSpec("bore_diameter", "float", 8.0, "mm", 0.0, 100.0, "Center bore diameter"),
    },
    processes=["hobbing", "milling", "grinding"],
    tooling=["gear_hob", "bevel_gear_cutter"],
    _code_fn=_bevel_gear_code,
)

# ============================================================================
# 23. rack_gear — linear gear for linear-to-rotary motion conversion
# ============================================================================

def _rack_gear_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n"
        f"import cq_gears\n\n"
        f"gear = cq_gears.RackGear(\n"
        f"    module={_f(p['module'])},\n"
        f"    length={_f(p['length'])},\n"
        f"    width={_f(p['width'])},\n"
        f"    height={_f(p['height'])},\n"
        f"    pressure_angle={_f(p['pressure_angle'])},\n"
        f")\n"
        f"result = cq.Workplane('XY').gear(gear)"
    )

RACK_GEAR = PrimitiveDef(
    name="rack_gear",
    description="Linear rack gear for rack-and-pinion mechanisms",
    tags=["gear", "power_transmission", "rack", "linear"],
    params={
        "module": ParamSpec("module", "float", 2.0, "mm", 0.3, 20.0, "Gear module"),
        "length": ParamSpec("length", "float", 100.0, "mm", 10.0, 2000.0, "Rack length"),
        "width": ParamSpec("width", "float", 20.0, "mm", 3.0, 200.0, "Rack width"),
        "height": ParamSpec("height", "float", 15.0, "mm", 3.0, 100.0, "Rack height"),
        "pressure_angle": ParamSpec("pressure_angle", "float", 20.0, "deg", 14.5, 30.0, "Pressure angle"),
    },
    processes=["hobbing", "milling", "broaching"],
    tooling=["gear_hob", "end_mill", "broach"],
    _code_fn=_rack_gear_code,
)

# ============================================================================
# 24. ring_gear — internal gear for planetary gear systems
# ============================================================================

def _ring_gear_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n"
        f"import cq_gears\n\n"
        f"gear = cq_gears.RingGear(\n"
        f"    module={_f(p['module'])},\n"
        f"    teeth_number={p['teeth_number']},\n"
        f"    width={_f(p['width'])},\n"
        f"    rim_width={_f(p['rim_width'])},\n"
        f"    pressure_angle={_f(p['pressure_angle'])},\n"
        f"    bore_d={_f(p['bore_diameter'])},\n"
        f")\n"
        f"result = cq.Workplane('XY').gear(gear)"
    )

RING_GEAR = PrimitiveDef(
    name="ring_gear",
    description="Internal ring gear for planetary gear systems",
    tags=["gear", "power_transmission", "ring", "internal", "planetary"],
    params={
        "module": ParamSpec("module", "float", 2.0, "mm", 0.3, 20.0, "Gear module"),
        "teeth_number": ParamSpec("teeth_number", "int", 40, "", 12, 300, "Number of teeth"),
        "width": ParamSpec("width", "float", 10.0, "mm", 1.0, 200.0, "Face width"),
        "rim_width": ParamSpec("rim_width", "float", 5.0, "mm", 1.0, 50.0, "Rim thickness beyond tooth root"),
        "pressure_angle": ParamSpec("pressure_angle", "float", 20.0, "deg", 14.5, 30.0, "Pressure angle"),
        "bore_diameter": ParamSpec("bore_diameter", "float", 0.0, "mm", 0.0, 200.0, "Center bore diameter"),
    },
    processes=["wire_edm", "broaching", "milling"],
    tooling=["wire_edm", "broach", "slotting_cutter"],
    _code_fn=_ring_gear_code,
)

# ============================================================================
# 25. worm_gear — worm screw for high-ratio speed reduction
# ============================================================================

def _worm_gear_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n"
        f"import cq_gears\n\n"
        f"gear = cq_gears.Worm(\n"
        f"    module={_f(p['module'])},\n"
        f"    lead_angle={_f(p['lead_angle'])},\n"
        f"    n_threads={p['n_threads']},\n"
        f"    length={_f(p['length'])},\n"
        f"    pressure_angle={_f(p['pressure_angle'])},\n"
        f"    bore_d={_f(p['bore_diameter'])},\n"
        f")\n"
        f"result = cq.Workplane('XY').gear(gear)"
    )

WORM_GEAR = PrimitiveDef(
    name="worm_gear",
    description="Worm screw for high-ratio speed reduction drives",
    tags=["gear", "power_transmission", "worm", "speed_reduction"],
    params={
        "module": ParamSpec("module", "float", 2.0, "mm", 0.3, 20.0, "Gear module"),
        "lead_angle": ParamSpec("lead_angle", "float", 10.0, "deg", 1.0, 45.0, "Lead angle"),
        "n_threads": ParamSpec("n_threads", "int", 1, "", 1, 6, "Number of thread starts"),
        "length": ParamSpec("length", "float", 40.0, "mm", 5.0, 500.0, "Worm length"),
        "pressure_angle": ParamSpec("pressure_angle", "float", 20.0, "deg", 14.5, 30.0, "Pressure angle"),
        "bore_diameter": ParamSpec("bore_diameter", "float", 8.0, "mm", 0.0, 100.0, "Center bore diameter"),
    },
    processes=["hobbing", "milling", "grinding", "turning"],
    tooling=["gear_hob", "thread_mill", "grinding_wheel"],
    _code_fn=_worm_gear_code,
)

# ============================================================================
# 26. naca_airfoil — NACA 4-digit airfoil profile extruded to span
# ============================================================================

def _naca_airfoil_code(p: dict) -> str:
    return (
        f"import cadquery as cq\n"
        f"import parafoil\n\n"
        f"foil = parafoil.NACAAirfoil('{p['naca_code']}', {_f(p['chord_length'])})\n"
        f"coords = foil.get_coords()\n"
        f"pts = [(c[0], c[1]) for c in coords]\n"
        f"result = (\n"
        f"    cq.Workplane('XY')\n"
        f"    .polyline(pts).close()\n"
        f"    .extrude({_f(p['span'])})\n"
        f")"
    )

NACA_AIRFOIL = PrimitiveDef(
    name="naca_airfoil",
    description="NACA 4-digit airfoil profile extruded to a given span",
    tags=["airfoil", "aerodynamic", "naca", "profile", "wing"],
    params={
        "naca_code": ParamSpec("naca_code", "str", "2412", "", None, None, "NACA 4-digit code (e.g. 2412, 0012)"),
        "chord_length": ParamSpec("chord_length", "float", 100.0, "mm", 10.0, 2000.0, "Chord length"),
        "span": ParamSpec("span", "float", 200.0, "mm", 5.0, 5000.0, "Extrusion span"),
    },
    processes=["milling", "wire_edm"],
    tooling=["ball_end_mill", "wire_edm"],
    _code_fn=_naca_airfoil_code,
)

# ============================================================================
# Registry — all 26 primitives
# ============================================================================

PRIMITIVES: dict[str, PrimitiveDef] = {
    p.name: p for p in [
        BOLT_CIRCLE,
        O_RING_GROOVE,
        KEYWAY,
        COUNTERBORE,
        COUNTERSINK,
        TAPPED_HOLE,
        SHOULDER,
        STEP,
        POCKET,
        SLOT,
        BOSS,
        RIB,
        GUSSET,
        FILLET_BREAK,
        CHAMFER_BREAK,
        DRAFT_WALL,
        SHELL,
        THREAD_RELIEF,
        UNDERCUT,
        DOVETAIL,
        SPUR_GEAR,
        BEVEL_GEAR,
        RACK_GEAR,
        RING_GEAR,
        WORM_GEAR,
        NACA_AIRFOIL,
    ]
}
