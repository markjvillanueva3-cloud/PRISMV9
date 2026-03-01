"""Feature-to-CadQuery Translator — CC-MS3.

Maps each operation type from knowledge_schema_v2 feature trees
to CadQuery API calls. Handles:
  - sketch, extrude, revolve, loft, sweep
  - fillet, chamfer, hole, pattern, mirror
  - shell, boolean_union/subtract/intersect
  - draft, rib, reference_geometry

Each translator function returns a CadQuery code snippet (string)
that can be assembled into a complete script by code_gen.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TranslatedOp:
    """A translated CadQuery operation."""
    code: str
    imports: set[str] = field(default_factory=set)
    comment: str = ""
    provenance_note: str = ""


class FeatureTranslator:
    """Translates knowledge schema features into CadQuery code snippets."""

    # Map from schema feature_type to translator method
    _DISPATCH = {
        "sketch": "_translate_sketch",
        "extrude": "_translate_extrude",
        "revolve": "_translate_revolve",
        "loft": "_translate_loft",
        "sweep": "_translate_sweep",
        "fillet": "_translate_fillet",
        "chamfer": "_translate_chamfer",
        "hole": "_translate_hole",
        "pattern": "_translate_pattern",
        "mirror": "_translate_mirror",
        "shell": "_translate_shell",
        "boolean_union": "_translate_boolean",
        "boolean_subtract": "_translate_boolean",
        "boolean_intersect": "_translate_boolean",
        "draft": "_translate_draft",
        "rib": "_translate_rib",
        "reference_geometry": "_translate_reference",
        "surface": "_translate_surface",
        "sheet_metal": "_translate_sheet_metal",
        "other": "_translate_other",
    }

    def translate(self, feature: dict) -> TranslatedOp:
        """Translate a single feature dict to CadQuery code."""
        ftype = feature.get("feature_type", "other")
        method_name = self._DISPATCH.get(ftype, "_translate_other")
        method = getattr(self, method_name)

        params = _extract_params(feature)
        provenance = _format_provenance(feature)
        name = feature.get("name", ftype)

        result = method(feature, params, name)
        result.provenance_note = provenance
        return result

    def translate_tree(self, features: list[dict]) -> list[TranslatedOp]:
        """Translate an ordered list of features (the feature tree)."""
        return [self.translate(f) for f in features]

    # ------------------------------------------------------------------
    # Individual translators
    # ------------------------------------------------------------------

    def _translate_sketch(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        """Translate sketch to CadQuery Workplane initialization."""
        plane = params.get("plane", "XY")
        origin = params.get("origin", "(0, 0)")
        return TranslatedOp(
            code=f'result = cq.Workplane("{plane}")',
            comment=f"Sketch: {name} on {plane} plane",
        )

    def _translate_extrude(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        depth = params.get("depth", 10.0)
        width = params.get("width")
        height = params.get("height")
        taper = params.get("taper_angle")
        symmetric = params.get("symmetric", False)

        lines: list[str] = []

        # If width/height given, create a rect sketch first
        if width and height:
            lines.append(f"result = result.rect({_fmt(width)}, {_fmt(height)})")

        # Build extrude call
        extrude_args = [_fmt(depth)]
        if taper:
            extrude_args.append(f"taper={_fmt(taper)}")
        if symmetric:
            extrude_args.append("both=True")

        lines.append(f"result = result.extrude({', '.join(extrude_args)})")

        return TranslatedOp(
            code="\n".join(lines),
            comment=f"Extrude: {name} depth={depth}mm",
        )

    def _translate_revolve(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        angle = params.get("angle", 360.0)
        axis_start = params.get("axis_start", "(0, 0)")
        axis_end = params.get("axis_end", "(0, 1)")

        return TranslatedOp(
            code=(
                f"result = result.revolve({_fmt(angle)}, "
                f"axisStart={axis_start}, axisEnd={axis_end})"
            ),
            comment=f"Revolve: {name} angle={angle}deg",
        )

    def _translate_loft(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        ruled = params.get("ruled", False)
        return TranslatedOp(
            code=f"result = result.loft(ruled={'True' if ruled else 'False'})",
            comment=f"Loft: {name}",
        )

    def _translate_sweep(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        return TranslatedOp(
            code="result = result.sweep(path_wire)",
            comment=f"Sweep: {name} along path",
        )

    def _translate_fillet(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        radius = params.get("radius", 1.0)
        edges = params.get("edges")

        if edges:
            return TranslatedOp(
                code=f'result = result.edges("{edges}").fillet({_fmt(radius)})',
                comment=f"Fillet: {name} R={radius}mm on {edges}",
            )
        return TranslatedOp(
            code=f"result = result.fillet({_fmt(radius)})",
            comment=f"Fillet: {name} R={radius}mm (all edges)",
        )

    def _translate_chamfer(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        distance = params.get("distance", 1.0)
        edges = params.get("edges")

        if edges:
            return TranslatedOp(
                code=f'result = result.edges("{edges}").chamfer({_fmt(distance)})',
                comment=f"Chamfer: {name} D={distance}mm on {edges}",
            )
        return TranslatedOp(
            code=f"result = result.chamfer({_fmt(distance)})",
            comment=f"Chamfer: {name} D={distance}mm (all edges)",
        )

    def _translate_hole(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        diameter = params.get("diameter", 10.0)
        depth = params.get("depth")
        cbore_diameter = params.get("counterbore_diameter")
        cbore_depth = params.get("counterbore_depth")
        csink_angle = params.get("countersink_angle")
        position = params.get("position")

        lines: list[str] = []

        if position:
            lines.append(f"result = result.pushPoints([{position}])")

        args = [_fmt(diameter)]
        if depth:
            args.append(f"depth={_fmt(depth)}")
        if cbore_diameter and cbore_depth:
            method = "cboreHole"
            args = [
                _fmt(diameter),
                _fmt(cbore_diameter),
                _fmt(cbore_depth),
            ]
            if depth:
                args.append(f"depth={_fmt(depth)}")
        elif csink_angle:
            method = "cskHole"
            args = [_fmt(diameter), _fmt(diameter * 1.5), _fmt(csink_angle)]
        else:
            method = "hole"

        lines.append(f"result = result.{method}({', '.join(args)})")

        return TranslatedOp(
            code="\n".join(lines),
            comment=f"Hole: {name} D={diameter}mm",
        )

    def _translate_pattern(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        pattern_type = params.get("pattern_type", "linear")
        count_x = params.get("count_x", 2)
        count_y = params.get("count_y", 1)
        spacing_x = params.get("spacing_x", 20.0)
        spacing_y = params.get("spacing_y", 20.0)
        count = params.get("count", 4)
        radius = params.get("radius", 30.0)

        if pattern_type == "circular":
            return TranslatedOp(
                code=(
                    f"result = result.polarArray("
                    f"{_fmt(radius)}, 0, 360, {count})"
                ),
                comment=f"Circular pattern: {name} x{count}",
            )
        return TranslatedOp(
            code=(
                f"result = result.rarray("
                f"{_fmt(spacing_x)}, {_fmt(spacing_y)}, "
                f"{count_x}, {count_y})"
            ),
            comment=f"Linear pattern: {name} {count_x}x{count_y}",
        )

    def _translate_mirror(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        plane = params.get("mirror_plane", "YZ")
        return TranslatedOp(
            code=f'result = result.mirror("{plane}")',
            comment=f"Mirror: {name} across {plane}",
        )

    def _translate_shell(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        thickness = params.get("thickness", 2.0)
        return TranslatedOp(
            code=f"result = result.shell({_fmt(thickness)})",
            comment=f"Shell: {name} T={thickness}mm",
        )

    def _translate_boolean(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        ftype = feature.get("feature_type", "boolean_union")
        op_map = {
            "boolean_union": "union",
            "boolean_subtract": "cut",
            "boolean_intersect": "intersect",
        }
        op = op_map.get(ftype, "union")
        return TranslatedOp(
            code=f"result = result.{op}(tool_body)",
            comment=f"Boolean {op}: {name}",
        )

    def _translate_draft(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        angle = params.get("draft_angle", 3.0)
        return TranslatedOp(
            code=f"# Draft angle: {angle}deg — applied via shell/taper",
            comment=f"Draft: {name} angle={angle}deg",
        )

    def _translate_rib(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        thickness = params.get("thickness", 3.0)
        height = params.get("height", 15.0)
        return TranslatedOp(
            code=(
                f"result = result.rect({_fmt(thickness)}, {_fmt(height)})"
                f".extrude({_fmt(height)})"
            ),
            comment=f"Rib: {name} T={thickness}mm H={height}mm",
        )

    def _translate_reference(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        ref_type = params.get("reference_type", "plane")
        return TranslatedOp(
            code=f"# Reference geometry: {ref_type} — {name}",
            comment=f"Reference: {name} ({ref_type})",
        )

    def _translate_surface(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        return TranslatedOp(
            code="# Surface feature — requires manual review",
            comment=f"Surface: {name}",
        )

    def _translate_sheet_metal(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        thickness = params.get("thickness", 1.5)
        bend_radius = params.get("bend_radius", 2.0)
        return TranslatedOp(
            code=f"# Sheet metal: T={thickness}mm, bend R={bend_radius}mm",
            comment=f"Sheet metal: {name}",
        )

    def _translate_other(
        self, feature: dict, params: dict, name: str
    ) -> TranslatedOp:
        return TranslatedOp(
            code=f"# Unknown feature type: {feature.get('feature_type', '?')}",
            comment=f"Other: {name}",
        )


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _extract_params(feature: dict) -> dict:
    """Extract parameters from feature dict into {name: value} map."""
    params: dict = {}
    for p in feature.get("parameters", []):
        name = p.get("name", "")
        value = p.get("value")
        if name and value is not None:
            params[name] = value
    return params


def _format_provenance(feature: dict) -> str:
    """Format provenance info as a comment string."""
    prov = feature.get("provenance")
    if not prov:
        return ""
    parts: list[str] = []
    if prov.get("source_type"):
        parts.append(f"source={prov['source_type']}")
    if prov.get("confidence") is not None:
        parts.append(f"conf={prov['confidence']:.0%}")
    if prov.get("timestamp_seconds") is not None:
        parts.append(f"t={prov['timestamp_seconds']:.1f}s")
    if prov.get("transcript_span"):
        span = prov["transcript_span"][:60]
        parts.append(f'"{span}"')
    return ", ".join(parts)


def _fmt(value) -> str:
    """Format a numeric value for code output."""
    if isinstance(value, float):
        if value == int(value):
            return str(int(value))
        return f"{value:.4g}"
    return str(value)
