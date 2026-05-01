"""CAM domain extraction validator.

Checks:
- Cutting parameter ranges vs material/tool (sanity bounds)
- Required fields present on all strategies
- Operation type values are from the allowed set
- Tool definitions are reasonable
- Sequence ordering is consistent
- ID uniqueness
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .common import ValidationFinding

_ALLOWED_OPERATION_TYPES = {
    "face_mill", "pocket_2d", "pocket_3d", "contour", "profile",
    "adaptive", "trochoidal", "slot", "thread_mill",
    "drilling", "boring", "reaming", "tapping",
    "roughing_3d", "finishing_3d", "rest_machining",
    "turning_rough", "turning_finish", "turning_groove", "turning_thread",
    "engraving", "chamfer_mill", "deburr", "other",
}

# Sane ranges for cutting parameters
_CUTTING_PARAM_RANGES: dict[str, tuple[float, float]] = {
    "spindle_rpm": (1, 100000),
    "rpm": (1, 100000),
    "feed_rate": (0.1, 50000),  # mm/min
    "feed": (0.1, 50000),
    "depth_of_cut": (0.001, 100),  # mm
    "doc": (0.001, 100),
    "stepover": (0.01, 500),  # mm
    "stepdown": (0.001, 100),
    "plunge_rate": (0.1, 10000),
    "retract_rate": (0.1, 50000),
    "surface_speed": (1, 1500),  # m/min
}

# Sane tool diameter ranges
_TOOL_DIAMETER_RANGE = (0.1, 200)  # mm


@dataclass
class CamValidationResult:
    """Result of CAM domain validation."""
    is_valid: bool
    findings: list[ValidationFinding] = field(default_factory=list)
    strategy_count: int = 0
    tools_found: int = 0

    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "strategy_count": self.strategy_count,
            "tools_found": self.tools_found,
            "findings": [
                {"severity": f.severity, "item_id": f.item_id, "message": f.message}
                for f in self.findings
            ],
        }


def validate_cam_extraction(cam_data: dict) -> dict:
    """Validate CAM extraction results.

    Args:
        cam_data: The "cam" domain object from the knowledge document.

    Returns:
        Validation result as a dict.
    """
    findings: list[ValidationFinding] = []
    strategies = cam_data.get("strategies", [])

    seen_ids: set[str] = set()
    seen_sequences: set[int] = set()
    tools_found = 0

    for strat in strategies:
        sid = strat.get("id", "unknown")

        # Check required fields
        if not strat.get("id"):
            findings.append(ValidationFinding("error", sid, "Missing strategy ID"))
        if not strat.get("name"):
            findings.append(ValidationFinding("error", sid, "Missing strategy name"))
        if not strat.get("operation_type"):
            findings.append(ValidationFinding("error", sid, "Missing operation_type"))

        # Check ID uniqueness
        if sid in seen_ids:
            findings.append(ValidationFinding("error", sid, f"Duplicate strategy ID: {sid}"))
        seen_ids.add(sid)

        # Check operation_type
        op_type = strat.get("operation_type", "")
        if op_type and op_type not in _ALLOWED_OPERATION_TYPES:
            findings.append(ValidationFinding(
                "warning", sid,
                f"Unknown operation_type '{op_type}'",
            ))

        # Check sequence ordering
        seq = strat.get("sequence_order")
        if seq is not None:
            if seq in seen_sequences:
                findings.append(ValidationFinding(
                    "warning", sid,
                    f"Duplicate sequence_order: {seq}",
                ))
            seen_sequences.add(seq)

        # Validate tool
        tool = strat.get("tool")
        if tool:
            tools_found += 1
            dia = tool.get("diameter_mm")
            if dia is not None:
                lo, hi = _TOOL_DIAMETER_RANGE
                if dia < lo or dia > hi:
                    findings.append(ValidationFinding(
                        "warning", sid,
                        f"Tool diameter {dia}mm outside expected range [{lo}, {hi}]",
                    ))
            flutes = tool.get("flutes")
            if flutes is not None and (flutes < 1 or flutes > 20):
                findings.append(ValidationFinding(
                    "warning", sid,
                    f"Flute count {flutes} outside expected range [1, 20]",
                ))

        # Validate cutting parameters
        for param in strat.get("cutting_parameters", []):
            pname = param.get("name", "").lower()
            pvalue = param.get("value")

            if pvalue is None or not isinstance(pvalue, (int, float)):
                continue

            for range_key, (lo, hi) in _CUTTING_PARAM_RANGES.items():
                if range_key in pname:
                    if pvalue < lo or pvalue > hi:
                        findings.append(ValidationFinding(
                            "warning", sid,
                            f"Parameter '{param.get('name')}' value {pvalue} "
                            f"outside expected range [{lo}, {hi}]",
                        ))
                    break

        # Check provenance
        prov = strat.get("provenance")
        if not prov:
            findings.append(ValidationFinding("info", sid, "Missing provenance"))
        elif prov.get("confidence") is not None:
            conf = prov["confidence"]
            if not (0 <= conf <= 1):
                findings.append(ValidationFinding(
                    "warning", sid,
                    f"Confidence {conf} outside [0, 1] range",
                ))

    has_errors = any(f.severity == "error" for f in findings)

    result = CamValidationResult(
        is_valid=not has_errors,
        findings=findings,
        strategy_count=len(strategies),
        tools_found=tools_found,
    )
    return result.to_dict()
