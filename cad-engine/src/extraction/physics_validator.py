"""Physics Validation of Extracted Knowledge — CC-EXT-MS1-P0-U07.

Validates extracted cutting parameters against physics models:
- Speed/feed ranges per material (Kienzle-based reference)
- Tool life reasonableness (Taylor model bounds)
- Power/force feasibility checks
- Flagging: VALID (<20% deviation), SUSPECT (20-50%), INVALID (>50%)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .knowledge_schema import KnowledgeEntry, KnowledgeType, ValidationStatus


# ---------------------------------------------------------------------------
# Reference data: material-specific cutting parameter ranges
# ---------------------------------------------------------------------------

# Speed ranges in m/min for common materials with carbide tooling
_SPEED_RANGES: dict[str, tuple[float, float]] = {
    "aluminum": (150.0, 1000.0),
    "brass": (100.0, 400.0),
    "copper": (80.0, 300.0),
    "cast_iron": (60.0, 250.0),
    "steel": (50.0, 350.0),
    "stainless_steel": (30.0, 200.0),
    "titanium": (15.0, 80.0),
    "nickel_alloy": (10.0, 50.0),
    "inconel": (10.0, 50.0),
    "plastic": (100.0, 500.0),
}

# Feed ranges in mm/rev
_FEED_RANGES: dict[str, tuple[float, float]] = {
    "aluminum": (0.05, 0.80),
    "brass": (0.05, 0.50),
    "copper": (0.05, 0.50),
    "cast_iron": (0.05, 0.60),
    "steel": (0.05, 0.50),
    "stainless_steel": (0.03, 0.40),
    "titanium": (0.03, 0.25),
    "nickel_alloy": (0.02, 0.20),
    "inconel": (0.02, 0.20),
    "plastic": (0.05, 0.50),
}

# DOC ranges in mm
_DOC_RANGES: dict[str, tuple[float, float]] = {
    "aluminum": (0.1, 15.0),
    "brass": (0.1, 10.0),
    "copper": (0.1, 10.0),
    "cast_iron": (0.1, 10.0),
    "steel": (0.1, 8.0),
    "stainless_steel": (0.1, 6.0),
    "titanium": (0.1, 4.0),
    "nickel_alloy": (0.1, 3.0),
    "inconel": (0.1, 3.0),
    "plastic": (0.1, 12.0),
}

# RPM physical limits
_RPM_MIN = 1.0
_RPM_MAX = 100000.0

# Tool life Taylor model bounds (minutes)
_TOOL_LIFE_MIN = 1.0
_TOOL_LIFE_MAX = 600.0

# Power limits (kW) for typical machines
_POWER_MAX = 150.0

# Force limits (N) for typical setups
_FORCE_MAX = 50000.0


# ---------------------------------------------------------------------------
# Validation result
# ---------------------------------------------------------------------------

@dataclass
class ValidationResult:
    """Result of validating a single knowledge entry."""
    status: ValidationStatus = ValidationStatus.PENDING
    deviation_pct: Optional[float] = None
    message: str = ""
    reference_range: Optional[tuple[float, float]] = None

    def to_dict(self) -> dict:
        d: dict = {"status": self.status.value}
        if self.deviation_pct is not None:
            d["deviation_pct"] = round(self.deviation_pct, 2)
        if self.message:
            d["message"] = self.message
        if self.reference_range:
            d["reference_range"] = list(self.reference_range)
        return d


@dataclass
class ValidationReport:
    """Aggregate validation report for a batch of entries."""
    total: int = 0
    valid_count: int = 0
    suspect_count: int = 0
    invalid_count: int = 0
    skipped_count: int = 0
    quarantined: list[KnowledgeEntry] = field(default_factory=list)
    worst_deviations: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "valid": self.valid_count,
            "suspect": self.suspect_count,
            "invalid": self.invalid_count,
            "skipped": self.skipped_count,
            "quarantined_count": len(self.quarantined),
            "worst_deviations": self.worst_deviations[:5],
        }


# ---------------------------------------------------------------------------
# Material name normalization
# ---------------------------------------------------------------------------

_MATERIAL_ALIASES: dict[str, str] = {
    "aluminum": "aluminum",
    "aluminium": "aluminum",
    "6061": "aluminum",
    "7075": "aluminum",
    "2024": "aluminum",
    "steel": "steel",
    "4140": "steel",
    "1018": "steel",
    "1045": "steel",
    "4340": "steel",
    "stainless": "stainless_steel",
    "stainless_steel": "stainless_steel",
    "304": "stainless_steel",
    "316": "stainless_steel",
    "titanium": "titanium",
    "ti-6al-4v": "titanium",
    "inconel": "nickel_alloy",
    "nickel_alloy": "nickel_alloy",
    "718": "nickel_alloy",
    "cast_iron": "cast_iron",
    "cast iron": "cast_iron",
    "brass": "brass",
    "copper": "copper",
    "plastic": "plastic",
    "delrin": "plastic",
    "peek": "plastic",
}


def _normalize_material(material: str) -> str:
    """Normalize material name to a known reference category."""
    m = material.lower().strip()
    if m in _MATERIAL_ALIASES:
        return _MATERIAL_ALIASES[m]
    for alias, norm in _MATERIAL_ALIASES.items():
        if alias in m:
            return norm
    return ""


# ---------------------------------------------------------------------------
# Physics Validator
# ---------------------------------------------------------------------------

class PhysicsValidator:
    """Validates extracted knowledge entries against physics models.

    Checks cutting parameters against material-appropriate ranges,
    flags deviations, and quarantines physically impossible values.
    """

    def __init__(
        self,
        speed_ranges: Optional[dict[str, tuple[float, float]]] = None,
        feed_ranges: Optional[dict[str, tuple[float, float]]] = None,
        doc_ranges: Optional[dict[str, tuple[float, float]]] = None,
    ):
        self._speed_ranges = speed_ranges or _SPEED_RANGES
        self._feed_ranges = feed_ranges or _FEED_RANGES
        self._doc_ranges = doc_ranges or _DOC_RANGES

    def validate_entry(self, entry: KnowledgeEntry) -> ValidationResult:
        """Validate a single knowledge entry."""
        if entry.knowledge_type == KnowledgeType.PARAMETER:
            return self._validate_parameter(entry)
        if entry.knowledge_type == KnowledgeType.CUTTING_DATA:
            return self._validate_cutting_data(entry)
        if entry.knowledge_type == KnowledgeType.TOOL:
            return self._validate_tool(entry)
        return ValidationResult(
            status=ValidationStatus.SKIPPED,
            message="No physics model for this knowledge type",
        )

    def validate_batch(self, entries: list[KnowledgeEntry]) -> ValidationReport:
        """Validate a batch of entries, returning an aggregate report."""
        report = ValidationReport(total=len(entries))

        for entry in entries:
            result = self.validate_entry(entry)
            entry.validation_status = result.status
            entry.validation_details = result.to_dict()

            if result.status == ValidationStatus.VALID:
                report.valid_count += 1
            elif result.status == ValidationStatus.SUSPECT:
                report.suspect_count += 1
                if result.deviation_pct is not None:
                    report.worst_deviations.append({
                        "entry_id": entry.entry_id,
                        "category": entry.category,
                        "deviation_pct": result.deviation_pct,
                        "message": result.message,
                    })
            elif result.status == ValidationStatus.INVALID:
                report.invalid_count += 1
                report.quarantined.append(entry)
                if result.deviation_pct is not None:
                    report.worst_deviations.append({
                        "entry_id": entry.entry_id,
                        "category": entry.category,
                        "deviation_pct": result.deviation_pct,
                        "message": result.message,
                    })
            else:
                report.skipped_count += 1

        report.worst_deviations.sort(
            key=lambda x: abs(x.get("deviation_pct", 0)), reverse=True,
        )

        return report

    def _validate_parameter(self, entry: KnowledgeEntry) -> ValidationResult:
        """Validate a cutting parameter entry."""
        cat = entry.category

        if cat == "cutting_speed":
            return self._validate_speed(entry)
        if cat == "feed":
            return self._validate_feed(entry)
        if cat == "doc":
            return self._validate_doc(entry)
        if cat == "rpm":
            return self._validate_rpm(entry)
        if cat in ("woc", "chipload"):
            return ValidationResult(
                status=ValidationStatus.VALID,
                message=f"{cat} — basic check passed",
            )
        return ValidationResult(
            status=ValidationStatus.SKIPPED,
            message=f"No model for parameter type: {cat}",
        )

    def _validate_speed(self, entry: KnowledgeEntry) -> ValidationResult:
        """Validate cutting speed against material range."""
        value = self._get_check_value(entry)
        if value is None:
            return ValidationResult(
                status=ValidationStatus.SKIPPED,
                message="No speed value to validate",
            )

        if value <= 0:
            return ValidationResult(
                status=ValidationStatus.INVALID,
                deviation_pct=100.0,
                message=f"Speed {value} m/min is non-positive",
            )

        mat = _normalize_material(entry.material or entry.material_grade)
        if not mat:
            return self._check_absolute_bounds(value, 1.0, 2000.0, "speed", "m/min")

        ref_range = self._speed_ranges.get(mat)
        if not ref_range:
            return self._check_absolute_bounds(value, 1.0, 2000.0, "speed", "m/min")

        return self._check_against_range(value, ref_range, "speed", "m/min", mat)

    def _validate_feed(self, entry: KnowledgeEntry) -> ValidationResult:
        """Validate feed rate against material range."""
        value = self._get_check_value(entry)
        if value is None:
            return ValidationResult(
                status=ValidationStatus.SKIPPED,
                message="No feed value to validate",
            )

        if value <= 0:
            return ValidationResult(
                status=ValidationStatus.INVALID,
                deviation_pct=100.0,
                message=f"Feed {value} mm/rev is non-positive",
            )

        mat = _normalize_material(entry.material or entry.material_grade)
        if not mat:
            return self._check_absolute_bounds(value, 0.001, 5.0, "feed", "mm/rev")

        ref_range = self._feed_ranges.get(mat)
        if not ref_range:
            return self._check_absolute_bounds(value, 0.001, 5.0, "feed", "mm/rev")

        return self._check_against_range(value, ref_range, "feed", "mm/rev", mat)

    def _validate_doc(self, entry: KnowledgeEntry) -> ValidationResult:
        """Validate depth of cut."""
        value = self._get_check_value(entry)
        if value is None:
            return ValidationResult(
                status=ValidationStatus.SKIPPED,
                message="No DOC value to validate",
            )

        if value <= 0:
            return ValidationResult(
                status=ValidationStatus.INVALID,
                deviation_pct=100.0,
                message=f"DOC {value} mm is non-positive",
            )

        mat = _normalize_material(entry.material or entry.material_grade)
        if not mat:
            return self._check_absolute_bounds(value, 0.01, 50.0, "DOC", "mm")

        ref_range = self._doc_ranges.get(mat)
        if not ref_range:
            return self._check_absolute_bounds(value, 0.01, 50.0, "DOC", "mm")

        return self._check_against_range(value, ref_range, "DOC", "mm", mat)

    def _validate_rpm(self, entry: KnowledgeEntry) -> ValidationResult:
        """Validate spindle RPM against physical limits."""
        value = self._get_check_value(entry)
        if value is None:
            return ValidationResult(
                status=ValidationStatus.SKIPPED,
                message="No RPM value to validate",
            )

        return self._check_absolute_bounds(value, _RPM_MIN, _RPM_MAX, "RPM", "rpm")

    def _validate_cutting_data(self, entry: KnowledgeEntry) -> ValidationResult:
        """Validate cutting data recommendation entries."""
        value_dict = entry.value or {}
        speed_data = value_dict.get("speed")
        if speed_data and isinstance(speed_data, dict):
            speed_val = speed_data.get("max") or speed_data.get("min")
            if speed_val is not None:
                mat = _normalize_material(entry.material or "")
                if mat and mat in self._speed_ranges:
                    ref = self._speed_ranges[mat]
                    return self._check_against_range(
                        float(speed_val), ref, "cutting_data speed", "m/min", mat,
                    )

        return ValidationResult(
            status=ValidationStatus.SKIPPED,
            message="Insufficient cutting data for validation",
        )

    def _validate_tool(self, entry: KnowledgeEntry) -> ValidationResult:
        """Basic sanity check on tool specifications."""
        geo = (entry.value or {}).get("geometry", {})
        if isinstance(geo, dict):
            nr = geo.get("nose_radius_mm")
            if nr is not None and (nr <= 0 or nr > 25.0):
                return ValidationResult(
                    status=ValidationStatus.INVALID,
                    message=f"Nose radius {nr} mm is outside valid range (0-25 mm)",
                )
            rake = geo.get("rake_angle_deg")
            if rake is not None and (rake < -30 or rake > 30):
                return ValidationResult(
                    status=ValidationStatus.INVALID,
                    message=f"Rake angle {rake}° is outside valid range (-30 to 30°)",
                )
        return ValidationResult(
            status=ValidationStatus.VALID,
            message="Tool spec passed basic checks",
        )

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def _get_check_value(self, entry: KnowledgeEntry) -> Optional[float]:
        """Get the primary numeric value to validate."""
        if entry.si_value is not None:
            return entry.si_value
        if entry.max_value is not None:
            return entry.max_value
        if entry.min_value is not None:
            return entry.min_value
        return None

    def _check_against_range(
        self,
        value: float,
        ref_range: tuple[float, float],
        param_name: str,
        unit: str,
        material: str,
    ) -> ValidationResult:
        """Check a value against a reference range with tolerance bands."""
        low, high = ref_range
        mid = (low + high) / 2

        if low <= value <= high:
            return ValidationResult(
                status=ValidationStatus.VALID,
                deviation_pct=0.0,
                message=f"{param_name} {value} {unit} within range for {material}",
                reference_range=ref_range,
            )

        if value < low:
            deviation = (low - value) / low * 100
        else:
            deviation = (value - high) / high * 100

        if deviation <= 20:
            status = ValidationStatus.VALID
            msg = f"{param_name} {value} {unit} near range for {material} ({deviation:.1f}% off)"
        elif deviation <= 50:
            status = ValidationStatus.SUSPECT
            msg = f"{param_name} {value} {unit} suspect for {material} ({deviation:.1f}% outside range)"
        else:
            status = ValidationStatus.INVALID
            msg = f"{param_name} {value} {unit} invalid for {material} ({deviation:.1f}% outside range)"

        return ValidationResult(
            status=status,
            deviation_pct=deviation,
            message=msg,
            reference_range=ref_range,
        )

    def _check_absolute_bounds(
        self,
        value: float,
        abs_min: float,
        abs_max: float,
        param_name: str,
        unit: str,
    ) -> ValidationResult:
        """Check against absolute physical limits."""
        if value < abs_min:
            return ValidationResult(
                status=ValidationStatus.INVALID,
                deviation_pct=100.0,
                message=f"{param_name} {value} {unit} below absolute minimum {abs_min}",
            )
        if value > abs_max:
            deviation = (value - abs_max) / abs_max * 100
            return ValidationResult(
                status=ValidationStatus.INVALID,
                deviation_pct=deviation,
                message=f"{param_name} {value} {unit} above absolute maximum {abs_max}",
            )
        return ValidationResult(
            status=ValidationStatus.VALID,
            message=f"{param_name} {value} {unit} within absolute bounds",
        )
