"""SHOP domain extraction validator.

Checks:
- Practice consistency (no contradictions within a practice)
- Required fields present on all practices
- Practice type values are from the allowed set
- Steps are non-empty strings
- ID uniqueness
- Warning/safety content is present for safety-relevant practices
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .common import ValidationFinding

_ALLOWED_PRACTICE_TYPES = {
    "setup_procedure", "workholding_technique", "tool_management",
    "measurement_technique", "cutting_practice", "troubleshooting",
    "material_handling", "machine_operation", "safety_procedure",
    "quality_control", "maintenance", "optimization_tip", "other",
}

# Practice types that should have safety warnings
_SAFETY_RELEVANT_TYPES = {
    "setup_procedure", "machine_operation", "safety_procedure",
    "material_handling", "cutting_practice",
}


@dataclass
class ShopValidationResult:
    """Result of SHOP domain validation."""
    is_valid: bool
    findings: list[ValidationFinding] = field(default_factory=list)
    practice_count: int = 0
    safety_warnings_count: int = 0

    def to_dict(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "practice_count": self.practice_count,
            "safety_warnings_count": self.safety_warnings_count,
            "findings": [
                {"severity": f.severity, "item_id": f.item_id, "message": f.message}
                for f in self.findings
            ],
        }


def validate_shop_extraction(shop_data: dict) -> dict:
    """Validate SHOP extraction results.

    Args:
        shop_data: The "shop" domain object from the knowledge document.

    Returns:
        Validation result as a dict.
    """
    findings: list[ValidationFinding] = []
    practices = shop_data.get("practices", [])

    seen_ids: set[str] = set()
    safety_warnings_count = 0

    for practice in practices:
        pid = practice.get("id", "unknown")

        # Check required fields
        if not practice.get("id"):
            findings.append(ValidationFinding("error", pid, "Missing practice ID"))
        if not practice.get("title"):
            findings.append(ValidationFinding("error", pid, "Missing practice title"))
        if not practice.get("practice_type"):
            findings.append(ValidationFinding("error", pid, "Missing practice_type"))
        if not practice.get("description"):
            findings.append(ValidationFinding("error", pid, "Missing description"))

        # Check ID uniqueness
        if pid in seen_ids:
            findings.append(ValidationFinding("error", pid, f"Duplicate practice ID: {pid}"))
        seen_ids.add(pid)

        # Check practice_type
        ptype = practice.get("practice_type", "")
        if ptype and ptype not in _ALLOWED_PRACTICE_TYPES:
            findings.append(ValidationFinding(
                "warning", pid,
                f"Unknown practice_type '{ptype}'",
            ))

        # Check steps are non-empty
        steps = practice.get("steps", [])
        for i, step in enumerate(steps):
            if not step or not step.strip():
                findings.append(ValidationFinding(
                    "warning", pid,
                    f"Step {i + 1} is empty",
                ))

        # Check safety warnings for safety-relevant types
        warnings = practice.get("warnings", [])
        safety_warnings_count += len(warnings)

        if ptype in _SAFETY_RELEVANT_TYPES and not warnings:
            findings.append(ValidationFinding(
                "info", pid,
                f"Safety-relevant practice type '{ptype}' has no warnings",
            ))

        # Check provenance
        prov = practice.get("provenance")
        if not prov:
            findings.append(ValidationFinding("info", pid, "Missing provenance"))
        elif prov.get("confidence") is not None:
            conf = prov["confidence"]
            if not (0 <= conf <= 1):
                findings.append(ValidationFinding(
                    "warning", pid,
                    f"Confidence {conf} outside [0, 1] range",
                ))

        # Check for contradictions in steps (basic)
        if len(steps) >= 2:
            step_text = " ".join(s.lower() for s in steps if s)
            # Detect "do X" followed by "do not X" patterns
            if "do not" in step_text and "do " in step_text:
                # This is a weak heuristic; just flag for review
                findings.append(ValidationFinding(
                    "info", pid,
                    "Steps contain both 'do' and 'do not' instructions — verify consistency",
                ))

    has_errors = any(f.severity == "error" for f in findings)

    result = ShopValidationResult(
        is_valid=not has_errors,
        findings=findings,
        practice_count=len(practices),
        safety_warnings_count=safety_warnings_count,
    )
    return result.to_dict()
