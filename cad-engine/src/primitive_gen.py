"""Primitive Generator — CC-MS4.

Takes a cluster of similar feature sequences (from PatternDetector)
and generates a parameterized CadQuery function with:
  - Docstring with parameter documentation
  - Parameter types, ranges, units, and defaults
  - Provenance linking back to source patterns
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Union

from pattern_detect import DetectedPattern


@dataclass
class GeneratedParam:
    """A parameter for a generated primitive function."""
    name: str
    python_type: str  # "float", "int", "str"
    default: Union[float, int, str]
    unit: str = ""
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    description: str = ""


@dataclass
class GeneratedPrimitive:
    """A generated primitive function from pattern analysis."""
    name: str
    description: str
    params: list[GeneratedParam]
    code: str
    tags: list[str] = field(default_factory=list)
    processes: list[str] = field(default_factory=list)
    tooling: list[str] = field(default_factory=list)
    source_pattern: Optional[str] = None
    frequency: int = 0
    source_count: int = 0

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "params": [
                {
                    "name": p.name,
                    "type": p.python_type,
                    "default": p.default,
                    "unit": p.unit,
                    "min": p.min_val,
                    "max": p.max_val,
                    "description": p.description,
                }
                for p in self.params
            ],
            "tags": self.tags,
            "processes": self.processes,
            "tooling": self.tooling,
            "source_pattern": self.source_pattern,
            "frequency": self.frequency,
            "source_count": self.source_count,
        }


# Feature type -> manufacturing process mapping
_PROCESS_MAP: dict[str, list[str]] = {
    "hole": ["drilling"],
    "extrude": ["milling"],
    "revolve": ["turning"],
    "fillet": ["milling", "deburring"],
    "chamfer": ["milling", "deburring"],
    "pocket": ["milling"],
    "slot": ["milling"],
    "pattern": ["drilling", "milling"],
    "shell": ["milling", "casting"],
    "draft": ["casting", "injection_molding"],
    "boolean_subtract": ["milling"],
    "boolean_union": ["welding"],
    "rib": ["milling", "casting"],
    "loft": ["milling"],
    "sweep": ["milling"],
}

# Feature type -> tooling mapping
_TOOLING_MAP: dict[str, list[str]] = {
    "hole": ["drill_bit"],
    "extrude": ["end_mill"],
    "revolve": ["turning_insert"],
    "fillet": ["ball_end_mill"],
    "chamfer": ["chamfer_mill"],
    "pocket": ["end_mill"],
    "slot": ["end_mill", "slot_drill"],
    "pattern": ["drill_bit"],
    "shell": ["end_mill"],
    "rib": ["end_mill"],
}


class PrimitiveGenerator:
    """Generates parameterized CadQuery primitives from detected patterns."""

    # Unit hints
    _UNIT_MAP: dict[str, str] = {
        "depth": "mm", "width": "mm", "height": "mm",
        "length": "mm", "radius": "mm", "diameter": "mm",
        "thickness": "mm", "spacing": "mm", "distance": "mm",
        "angle": "deg", "taper_angle": "deg", "draft_angle": "deg",
        "pitch": "mm", "bore_diameter": "mm",
    }

    def generate_from_pattern(
        self,
        pattern: DetectedPattern,
        name: Optional[str] = None,
    ) -> GeneratedPrimitive:
        """Generate a primitive from a detected pattern.

        Args:
            pattern: A DetectedPattern from PatternDetector.
            name: Optional override name (defaults to pattern key as snake_case).

        Returns:
            GeneratedPrimitive with code and metadata.
        """
        prim_name = name or self._pattern_to_name(pattern)

        # Build parameters from variance data
        params = self._extract_params(pattern)

        # Build code
        code = self._generate_code(prim_name, pattern.feature_types, params)

        # Determine processes and tooling
        processes: set[str] = set()
        tooling_set: set[str] = set()
        for ft in pattern.feature_types:
            processes.update(_PROCESS_MAP.get(ft, []))
            tooling_set.update(_TOOLING_MAP.get(ft, []))

        # Build tags from feature types
        tags = list(set(pattern.feature_types))

        return GeneratedPrimitive(
            name=prim_name,
            description=f"Auto-generated primitive from pattern: {pattern.pattern_key}",
            params=params,
            code=code,
            tags=tags,
            processes=sorted(processes),
            tooling=sorted(tooling_set),
            source_pattern=pattern.pattern_key,
            frequency=pattern.frequency,
            source_count=len(pattern.sources),
        )

    def generate_batch(
        self,
        patterns: list[DetectedPattern],
        max_count: int = 20,
    ) -> list[GeneratedPrimitive]:
        """Generate primitives from the top N patterns."""
        results: list[GeneratedPrimitive] = []
        seen_names: set[str] = set()

        for pattern in patterns[:max_count]:
            name = self._pattern_to_name(pattern)
            if name in seen_names:
                name = f"{name}_{len(seen_names)}"
            seen_names.add(name)

            prim = self.generate_from_pattern(pattern, name=name)
            results.append(prim)

        return results

    def _pattern_to_name(self, pattern: DetectedPattern) -> str:
        """Convert a pattern key to a Python function name."""
        types = pattern.feature_types
        if len(types) == 1:
            return types[0].lower().replace("-", "_")
        return "_".join(t.lower().replace("-", "_") for t in types[:3])

    def _extract_params(self, pattern: DetectedPattern) -> list[GeneratedParam]:
        """Extract parameter definitions from pattern variance data."""
        params: list[GeneratedParam] = []

        for pname in pattern.param_names:
            variance = pattern.param_variance.get(pname, {})
            min_val = variance.get("min")
            max_val = variance.get("max")
            mean_val = variance.get("mean")

            # Determine type
            if pname in ("count", "count_x", "count_y", "flutes"):
                ptype = "int"
                default = int(round(mean_val)) if mean_val is not None else 1
            elif pname in ("plane", "pattern_type", "mirror_plane"):
                ptype = "str"
                default = ""
            else:
                ptype = "float"
                default = round(mean_val, 2) if mean_val is not None else 0.0

            unit = self._UNIT_MAP.get(pname, "")

            params.append(GeneratedParam(
                name=pname,
                python_type=ptype,
                default=default,
                unit=unit,
                min_val=min_val,
                max_val=max_val,
                description=f"From {variance.get('count', 0)} samples",
            ))

        return params

    def _generate_code(
        self,
        name: str,
        feature_types: list[str],
        params: list[GeneratedParam],
    ) -> str:
        """Generate CadQuery code for the primitive."""
        lines: list[str] = []

        # Function signature
        param_sig = ", ".join(
            f"{p.name}: {p.python_type} = {_format_default(p)}"
            for p in params
        )
        lines.append(f"def {name}({param_sig}):")

        # Docstring
        lines.append(f'    """Generate {name} primitive.')
        lines.append("")
        for p in params:
            unit_str = f" ({p.unit})" if p.unit else ""
            range_str = ""
            if p.min_val is not None and p.max_val is not None:
                range_str = f" [{p.min_val} - {p.max_val}]"
            lines.append(f"    Args:")
            lines.append(f"        {p.name}: {p.description}{unit_str}{range_str}")
        lines.append("")
        lines.append("    Returns:")
        lines.append("        CadQuery code string for this primitive.")
        lines.append('    """')

        # Import
        lines.append("    import cadquery as cq")
        lines.append("")

        # Build based on feature types
        lines.append("    # Build sequence")
        for i, ft in enumerate(feature_types):
            lines.append(f"    # Step {i + 1}: {ft}")

        # Simple workplane init
        lines.append('    result = cq.Workplane("XY")')

        # Feature-specific code
        for ft in feature_types:
            if ft == "extrude":
                depth_p = next((p for p in params if "depth" in p.name), None)
                depth_val = depth_p.name if depth_p else "10"
                lines.append(f"    result = result.extrude({depth_val})")
            elif ft == "hole":
                dia_p = next((p for p in params if "diameter" in p.name), None)
                dia_val = dia_p.name if dia_p else "10"
                lines.append(f"    result = result.hole({dia_val})")
            elif ft == "fillet":
                rad_p = next((p for p in params if "radius" in p.name), None)
                rad_val = rad_p.name if rad_p else "1"
                lines.append(f"    result = result.fillet({rad_val})")
            elif ft == "chamfer":
                dist_p = next((p for p in params if "distance" in p.name), None)
                dist_val = dist_p.name if dist_p else "0.5"
                lines.append(f"    result = result.chamfer({dist_val})")

        lines.append("    return result")
        return "\n".join(lines)


def _format_default(p: GeneratedParam) -> str:
    """Format a parameter default for code output."""
    if p.python_type == "str":
        return repr(p.default)
    if p.python_type == "int":
        return str(int(p.default) if isinstance(p.default, (int, float)) else p.default)
    if isinstance(p.default, float):
        if p.default == int(p.default):
            return f"{int(p.default)}.0"
        return f"{p.default:.4g}"
    return str(p.default)
