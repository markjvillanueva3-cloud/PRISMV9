"""CAD domain extraction validator.

Checks:
- Feature tree logic consistency (parent refs valid)
- Dimension sanity (no negative lengths, realistic ranges)
- Required fields present on all features
- Feature type values are from the allowed set
- ID uniqueness
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .common import ValidationFinding

_ALLOWED_FEATURE_TYPES = {
    "sketch", "extrude", "revolve", "loft", "sweep",
    "fillet", "chamfer", "hole", "pattern", "mirror",
    "shell", "boolean_union", "boolean_subtract", "boolean_intersect",
    "draft", "rib", "assembly_constraint", "reference_geometry",
    "surface", "sheet_metal", "weldment", "other",
}

# Reasonable ranges for common CAD parameters (mm-based)
_PARAM_RANGES: dict[str, tuple[float, float]] = {
    "depth": (0.01, 10000),
    "height": (0.01, 10000),
    "width": (0.01, 10000),
    "length": (0.01, 10000),
    "radius": (0.001, 5000),
    "diameter": (0.002, 10000),
    "fillet_radius": (0.01, 500),
    "chamfer_distance": (0.01, 500),
    "angle": (-360, 360),
    "taper_angle": (-45, 45),
    "draft_angle": (0, 30),
    "wall_thickness": (0.1, 500),
    "hole_diameter": (0.1, 500),
    "hole_depth": (0.1, 1000),
    "pattern_count": (1, 1000),
    "pattern_spacing": (0.1, 10000),
}


@dataclass
class CadValidationResult:
    """Result of CAD domain validation."""
    is_valid: bool
    findings: list[ValidationFinding] = field(default_factory=list)
    feature_count: int = 0
    orphan_count: int = 0

    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "feature_count": self.feature_count,
            "orphan_count": self.orphan_count,
            "findings": [
                {"severity": f.severity, "item_id": f.item_id, "message": f.message}
                for f in self.findings
            ],
        }


def validate_cad_extraction(cad_data: dict) -> dict:
    """Validate CAD extraction results.

    Args:
        cad_data: The "cad" domain object from the knowledge document.

    Returns:
        Validation result as a dict.
    """
    findings: list[ValidationFinding] = []
    features = cad_data.get("features", [])

    # Track IDs for uniqueness and parent references
    seen_ids: set[str] = set()

    for feat in features:
        fid = feat.get("id", "unknown")

        # Check required fields
        if not feat.get("id"):
            findings.append(ValidationFinding("error", fid, "Missing feature ID"))
        if not feat.get("name"):
            findings.append(ValidationFinding("error", fid, "Missing feature name"))
        if not feat.get("feature_type"):
            findings.append(ValidationFinding("error", fid, "Missing feature_type"))

        # Check ID uniqueness
        if fid in seen_ids:
            findings.append(ValidationFinding("error", fid, f"Duplicate feature ID: {fid}"))
        seen_ids.add(fid)

        # Check feature_type is valid
        ftype = feat.get("feature_type", "")
        if ftype and ftype not in _ALLOWED_FEATURE_TYPES:
            findings.append(ValidationFinding(
                "warning", fid,
                f"Unknown feature_type '{ftype}'. Allowed: {', '.join(sorted(_ALLOWED_FEATURE_TYPES))}",
            ))

        # Check parameter sanity
        for param in feat.get("parameters", []):
            pname = param.get("name", "").lower()
            pvalue = param.get("value")

            if pvalue is None:
                continue

            # Check numeric values are in sane ranges
            if isinstance(pvalue, (int, float)):
                for range_key, (lo, hi) in _PARAM_RANGES.items():
                    if range_key in pname:
                        if pvalue < lo or pvalue > hi:
                            findings.append(ValidationFinding(
                                "warning", fid,
                                f"Parameter '{param.get('name')}' value {pvalue} "
                                f"outside expected range [{lo}, {hi}]",
                            ))
                        break

        # Check provenance
        prov = feat.get("provenance")
        if not prov:
            findings.append(ValidationFinding("info", fid, "Missing provenance"))
        elif prov.get("confidence") is not None:
            conf = prov["confidence"]
            if not (0 <= conf <= 1):
                findings.append(ValidationFinding(
                    "warning", fid,
                    f"Confidence {conf} outside [0, 1] range",
                ))

    # Check parent references are valid
    orphan_count = 0
    for feat in features:
        parent_id = feat.get("parent_feature_id")
        if parent_id and parent_id not in seen_ids:
            orphan_count += 1
            findings.append(ValidationFinding(
                "warning", feat.get("id", "unknown"),
                f"parent_feature_id '{parent_id}' references non-existent feature",
            ))

    has_errors = any(f.severity == "error" for f in findings)

    result = CadValidationResult(
        is_valid=not has_errors,
        findings=findings,
        feature_count=len(features),
        orphan_count=orphan_count,
    )
    return result.to_dict()
