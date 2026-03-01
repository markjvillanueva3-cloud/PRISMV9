"""Parametric Template Generator — CC-MS3.

Converts extracted dimensions from knowledge schema features into
named parameters with:
  - Python type (float/int/str)
  - Valid ranges (min/max)
  - Units (mm/inch/deg)
  - Default values (from extraction)
  - Provenance links
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Union


@dataclass
class ParamDef:
    """A named parameter definition for generated CadQuery code."""
    name: str
    value: Union[float, int, str]
    python_type: str = "float"
    unit: Optional[str] = None
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    description: str = ""
    source_feature_id: str = ""
    provenance_note: str = ""

    def to_code(self) -> str:
        """Generate the parameter declaration line."""
        if self.python_type == "float":
            val = f"{float(self.value):.4g}" if isinstance(self.value, (int, float)) else str(self.value)
        elif self.python_type == "int":
            val = str(int(self.value)) if isinstance(self.value, (int, float)) else str(self.value)
        else:
            val = repr(self.value)

        comment_parts: list[str] = []
        if self.unit:
            comment_parts.append(self.unit)
        if self.min_val is not None and self.max_val is not None:
            comment_parts.append(f"range: [{self.min_val}, {self.max_val}]")
        elif self.min_val is not None:
            comment_parts.append(f"min: {self.min_val}")
        elif self.max_val is not None:
            comment_parts.append(f"max: {self.max_val}")
        if self.description:
            comment_parts.append(self.description)

        comment = f"  # {', '.join(comment_parts)}" if comment_parts else ""
        return f"{self.name}: {self.python_type} = {val}{comment}"

    def to_dict(self) -> dict:
        """Serialize for JSON output."""
        d: dict = {
            "name": self.name,
            "value": self.value,
            "type": self.python_type,
        }
        if self.unit:
            d["unit"] = self.unit
        if self.min_val is not None:
            d["min"] = self.min_val
        if self.max_val is not None:
            d["max"] = self.max_val
        if self.description:
            d["description"] = self.description
        return d


class ParamTemplateGenerator:
    """Extracts and deduplicates parameters from a feature tree."""

    # Map common parameter names to units
    _UNIT_HINTS: dict[str, str] = {
        "depth": "mm",
        "width": "mm",
        "height": "mm",
        "length": "mm",
        "radius": "mm",
        "diameter": "mm",
        "thickness": "mm",
        "spacing": "mm",
        "distance": "mm",
        "chamfer": "mm",
        "fillet": "mm",
        "angle": "deg",
        "taper_angle": "deg",
        "draft_angle": "deg",
        "revolve_angle": "deg",
        "pitch": "mm",
        "bore_diameter": "mm",
        "counterbore_diameter": "mm",
        "counterbore_depth": "mm",
        "countersink_angle": "deg",
        "bend_radius": "mm",
    }

    # Map common parameter names to types
    _TYPE_HINTS: dict[str, str] = {
        "count": "int",
        "count_x": "int",
        "count_y": "int",
        "flutes": "int",
        "pattern_type": "str",
        "mirror_plane": "str",
        "plane": "str",
        "reference_type": "str",
        "symmetric": "bool",
        "ruled": "bool",
    }

    def extract_params(self, features: list[dict]) -> list[ParamDef]:
        """Extract all unique parameters from a feature tree."""
        seen: dict[str, ParamDef] = {}

        for feature in features:
            fid = feature.get("id", "")
            fname = feature.get("name", "")
            ftype = feature.get("feature_type", "")

            for param in feature.get("parameters", []):
                pname = param.get("name", "")
                pvalue = param.get("value")
                if not pname or pvalue is None:
                    continue

                # Build unique param name: feature_name + param_name
                safe_fname = _sanitize(fname or ftype)
                safe_pname = _sanitize(pname)
                unique_name = f"{safe_fname}_{safe_pname}"

                # Deduplicate: keep first occurrence
                if unique_name in seen:
                    continue

                # Determine type
                ptype = self._TYPE_HINTS.get(pname, "float")
                if isinstance(pvalue, bool):
                    ptype = "bool"
                elif isinstance(pvalue, int) and pname not in self._TYPE_HINTS:
                    ptype = "int" if abs(pvalue) < 1000 else "float"
                elif isinstance(pvalue, str):
                    ptype = "str"

                # Determine unit
                unit = param.get("unit") or self._UNIT_HINTS.get(pname)

                # Provenance
                prov = param.get("source", {})
                prov_note = ""
                if prov:
                    parts = []
                    if prov.get("source_type"):
                        parts.append(prov["source_type"])
                    if prov.get("confidence") is not None:
                        parts.append(f"{prov['confidence']:.0%}")
                    prov_note = ", ".join(parts)

                seen[unique_name] = ParamDef(
                    name=unique_name,
                    value=pvalue,
                    python_type=ptype,
                    unit=unit,
                    min_val=param.get("min"),
                    max_val=param.get("max"),
                    description=f"{fname} {pname}" if fname else pname,
                    source_feature_id=fid,
                    provenance_note=prov_note,
                )

        return list(seen.values())

    def generate_param_block(self, params: list[ParamDef]) -> str:
        """Generate the parameter declaration block for a CadQuery script."""
        if not params:
            return "# No parameters extracted\n"

        lines = [
            "# " + "=" * 68,
            "# Parameters — all dimensions fully parameterized",
            "# " + "=" * 68,
            "",
        ]
        for p in params:
            lines.append(p.to_code())

        return "\n".join(lines) + "\n"


def _sanitize(name: str) -> str:
    """Sanitize a name for use as a Python identifier."""
    result = ""
    for ch in name.lower().strip():
        if ch.isalnum() or ch == "_":
            result += ch
        elif ch in (" ", "-", "."):
            result += "_"
    # Remove leading digits
    while result and result[0].isdigit():
        result = result[1:]
    return result or "param"
