"""Manufacturability Checker — CC-MS9 Validation Bridge.

SAFETY-CRITICAL: Per-feature validation against machine envelope,
tool library, material properties, and tolerance capability.
Every feature must pass manufacturability checks before geometry
output is allowed. S(x) >= 0.70 hard block enforced.

References:
  - Machinery's Handbook (31st ed) — tolerance capability tables
  - ISO 2768-1 — general tolerances for linear dimensions
  - Altintas (2012) — Manufacturing Automation, tool deflection limits
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from .feature_analyze import (
    FeatureAnalysisResult,
    FeatureType,
    GeometricFeature,
)


# ---------------------------------------------------------------------------
# Constants — Machine & Tooling Limits
# ---------------------------------------------------------------------------

_PROCESS_TOLERANCE: dict[str, float] = {
    "drilling":       0.10,
    "reaming":        0.025,
    "boring":         0.013,
    "milling_rough":  0.08,
    "milling_finish": 0.025,
    "grinding":       0.005,
    "turning_rough":  0.05,
    "turning_finish": 0.013,
    "edm":            0.005,
}

_STANDARD_TOOL_DIAMETERS = [
    0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0,
    10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 25.0, 32.0, 40.0, 50.0,
]

_STANDARD_DRILL_DIAMETERS = [
    0.5, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 3.2, 3.5, 4.0, 4.2,
    4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0,
    10.5, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 18.0, 20.0, 22.0,
    24.0, 25.0, 26.0, 28.0, 30.0, 32.0, 35.0, 40.0, 45.0, 50.0,
]

_MAX_LD_RATIO: dict[str, float] = {
    "standard_drill": 5.0,
    "deep_drill":     12.0,
    "gun_drill":      40.0,
    "boring":         6.0,
}

_DEFAULT_ENVELOPE = {
    "x": 500.0, "y": 400.0, "z": 300.0,
    "max_rpm": 12000, "max_power_kw": 15.0,
    "max_tool_diameter": 50.0, "min_tool_diameter": 1.0,
    "max_tool_length": 150.0,
}

_MACHINABILITY: dict[str, float] = {
    "aluminum": 3.0, "brass": 2.0, "mild_steel": 0.7,
    "steel": 0.6, "stainless_steel": 0.4, "titanium": 0.2,
    "cast_iron": 0.5, "inconel": 0.15, "hardened_steel": 0.25,
    "copper": 1.5, "plastic": 4.0,
}

_SAFETY_WEIGHTS = {
    "tool_available": 0.20, "depth_ok": 0.20,
    "tolerance_capable": 0.20, "material_ok": 0.20,
    "aspect_ratio_ok": 0.20,
}

SAFETY_THRESHOLD = 0.70


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

class CheckStatus(str, Enum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"
    BLOCK = "block"


@dataclass
class FeatureCheck:
    """A single manufacturability check on a feature."""
    check_name: str
    status: CheckStatus
    message: str
    score: float = 1.0

    def to_dict(self) -> dict:
        return {
            "check_name": self.check_name,
            "status": self.status.value,
            "message": self.message,
            "score": round(self.score, 4),
        }


@dataclass
class FeatureValidation:
    """Validation result for a single feature."""
    feature_id: str
    feature_type: str
    checks: list[FeatureCheck] = field(default_factory=list)
    safety_score: float = 1.0
    is_manufacturable: bool = True
    required_process: str = ""
    suggested_tool_diameter: float = 0.0
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "feature_id": self.feature_id,
            "feature_type": self.feature_type,
            "checks": [c.to_dict() for c in self.checks],
            "safety_score": round(self.safety_score, 4),
            "is_manufacturable": self.is_manufacturable,
            "required_process": self.required_process,
            "suggested_tool_diameter": round(self.suggested_tool_diameter, 2),
            "warnings": self.warnings,
        }


@dataclass
class ManufacturabilityReport:
    """Full manufacturability check report for a part."""
    part_id: str
    overall_safety_score: float = 1.0
    is_manufacturable: bool = True
    blocked: bool = False
    block_reason: str = ""
    feature_validations: list[FeatureValidation] = field(default_factory=list)
    machine_envelope_fit: bool = True
    material: str = ""
    total_checks: int = 0
    passed_checks: int = 0
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "part_id": self.part_id,
            "overall_safety_score": round(self.overall_safety_score, 4),
            "is_manufacturable": self.is_manufacturable,
            "blocked": self.blocked,
            "block_reason": self.block_reason,
            "feature_validations": [fv.to_dict() for fv in self.feature_validations],
            "machine_envelope_fit": self.machine_envelope_fit,
            "material": self.material,
            "total_checks": self.total_checks,
            "passed_checks": self.passed_checks,
            "warnings": self.warnings,
        }


# ---------------------------------------------------------------------------
# ManufacturabilityChecker
# ---------------------------------------------------------------------------

class ManufacturabilityChecker:
    """Validates features against machine, tooling, and material constraints.

    SAFETY-CRITICAL: Enforces S(x) >= 0.70 hard block.
    """

    def __init__(
        self,
        material: str = "steel",
        machine_envelope: dict | None = None,
        available_tools: list[float] | None = None,
        available_drills: list[float] | None = None,
    ):
        self._material = material.lower()
        self._envelope = machine_envelope or dict(_DEFAULT_ENVELOPE)
        self._tools = available_tools or list(_STANDARD_TOOL_DIAMETERS)
        self._drills = available_drills or list(_STANDARD_DRILL_DIAMETERS)

    def validate(self, analysis: FeatureAnalysisResult) -> ManufacturabilityReport:
        """Validate all features. Returns ManufacturabilityReport with S(x)."""
        report = ManufacturabilityReport(
            part_id=analysis.part_id, material=self._material,
        )

        bb = analysis.bounding_box
        if bb != (0.0, 0.0, 0.0):
            env_fit = (
                bb[0] <= self._envelope["x"]
                and bb[1] <= self._envelope["y"]
                and bb[2] <= self._envelope["z"]
            )
            report.machine_envelope_fit = env_fit
            if not env_fit:
                report.warnings.append(
                    f"Part exceeds machine envelope: "
                    f"{bb[0]:.1f}x{bb[1]:.1f}x{bb[2]:.1f} vs "
                    f"{self._envelope['x']}x{self._envelope['y']}x{self._envelope['z']}"
                )

        total_checks = 0
        passed_checks = 0
        min_safety = 1.0

        for feat in analysis.features:
            fv = self._validate_feature(feat)
            report.feature_validations.append(fv)
            total_checks += len(fv.checks)
            passed_checks += sum(1 for c in fv.checks if c.status == CheckStatus.PASS)
            min_safety = min(min_safety, fv.safety_score)
            report.warnings.extend(fv.warnings)

        report.total_checks = total_checks
        report.passed_checks = passed_checks

        if not report.machine_envelope_fit:
            min_safety *= 0.5
        report.overall_safety_score = min_safety

        if min_safety < SAFETY_THRESHOLD:
            report.blocked = True
            report.is_manufacturable = False
            report.block_reason = (
                f"S(x) = {min_safety:.2f} < {SAFETY_THRESHOLD} — "
                f"BLOCKED: Part fails manufacturability validation"
            )
        else:
            report.is_manufacturable = all(
                fv.is_manufacturable for fv in report.feature_validations
            )

        return report

    def _validate_feature(self, feat: GeometricFeature) -> FeatureValidation:
        fv = FeatureValidation(
            feature_id=feat.feature_id,
            feature_type=feat.feature_type.value,
        )
        fv.checks.append(self._check_tool_available(feat))
        fv.checks.append(self._check_depth(feat))
        fv.checks.append(self._check_tolerance(feat))
        fv.checks.append(self._check_material(feat))
        fv.checks.append(self._check_aspect_ratio(feat))
        fv.suggested_tool_diameter = feat.min_tool_diameter

        scores = {c.check_name: c.score for c in fv.checks}
        fv.safety_score = min(
            sum(scores.get(k, 1.0) * w for k, w in _SAFETY_WEIGHTS.items()),
            1.0,
        )
        fv.required_process = self._determine_process(feat)
        fv.is_manufacturable = all(
            c.status in (CheckStatus.PASS, CheckStatus.WARN) for c in fv.checks
        )
        for c in fv.checks:
            if c.status == CheckStatus.WARN:
                fv.warnings.append(f"{feat.feature_id}: {c.message}")
            elif c.status in (CheckStatus.FAIL, CheckStatus.BLOCK):
                fv.warnings.append(f"{feat.feature_id}: FAIL — {c.message}")
        return fv

    def _check_tool_available(self, feat: GeometricFeature) -> FeatureCheck:
        min_dia = feat.min_tool_diameter
        if min_dia <= 0:
            return FeatureCheck("tool_available", CheckStatus.PASS, "No tool constraint", 1.0)
        tools = self._drills if feat.feature_type == FeatureType.HOLE else self._tools
        fitting = [t for t in tools if t <= min_dia]
        if fitting:
            closest = max(fitting)
            return FeatureCheck("tool_available", CheckStatus.PASS,
                                f"Tool {closest}mm available for {min_dia:.2f}mm feature", 1.0)
        return FeatureCheck("tool_available", CheckStatus.FAIL,
                            f"No tool <= {min_dia:.2f}mm available (min: {min(tools)}mm)", 0.2)

    def _check_depth(self, feat: GeometricFeature) -> FeatureCheck:
        depth = feat.max_depth
        if depth <= 0:
            return FeatureCheck("depth_ok", CheckStatus.PASS, "No depth constraint", 1.0)
        max_len = self._envelope.get("max_tool_length", 150.0)
        if depth > max_len:
            return FeatureCheck("depth_ok", CheckStatus.FAIL,
                                f"Depth {depth:.1f}mm > max tool length {max_len}mm", 0.1)
        if feat.feature_type == FeatureType.HOLE and feat.min_tool_diameter > 0:
            ld = depth / feat.min_tool_diameter
            if ld <= _MAX_LD_RATIO["standard_drill"]:
                return FeatureCheck("depth_ok", CheckStatus.PASS, f"L/D={ld:.1f} OK", 1.0)
            elif ld <= _MAX_LD_RATIO["deep_drill"]:
                return FeatureCheck("depth_ok", CheckStatus.WARN,
                                    f"L/D={ld:.1f} — peck drilling needed", 0.7)
            elif ld <= _MAX_LD_RATIO["gun_drill"]:
                return FeatureCheck("depth_ok", CheckStatus.WARN,
                                    f"L/D={ld:.1f} — gun drill required", 0.5)
            return FeatureCheck("depth_ok", CheckStatus.FAIL,
                                f"L/D={ld:.1f} — exceeds capability", 0.1)
        return FeatureCheck("depth_ok", CheckStatus.PASS, f"Depth {depth:.1f}mm OK", 1.0)

    def _check_tolerance(self, feat: GeometricFeature) -> FeatureCheck:
        tightest = float("inf")
        tightest_name = ""
        for dim in feat.dimensions:
            t = dim.tolerance_total
            if t > 0 and t < tightest:
                tightest = t
                tightest_name = dim.name
        if tightest == float("inf"):
            return FeatureCheck("tolerance_capable", CheckStatus.PASS, "General tolerance", 1.0)
        if tightest >= _PROCESS_TOLERANCE["milling_rough"]:
            return FeatureCheck("tolerance_capable", CheckStatus.PASS,
                                f"{tightest_name}: +/-{tightest/2:.3f}mm — standard", 1.0)
        if tightest >= _PROCESS_TOLERANCE["milling_finish"]:
            return FeatureCheck("tolerance_capable", CheckStatus.PASS,
                                f"{tightest_name}: +/-{tightest/2:.3f}mm — finish pass", 0.9)
        if tightest >= _PROCESS_TOLERANCE["boring"]:
            return FeatureCheck("tolerance_capable", CheckStatus.WARN,
                                f"{tightest_name}: +/-{tightest/2:.3f}mm — precision needed", 0.7)
        if tightest >= _PROCESS_TOLERANCE["grinding"]:
            return FeatureCheck("tolerance_capable", CheckStatus.WARN,
                                f"{tightest_name}: +/-{tightest/2:.3f}mm — grinding/EDM", 0.5)
        return FeatureCheck("tolerance_capable", CheckStatus.FAIL,
                            f"{tightest_name}: +/-{tightest/2:.3f}mm — beyond CNC", 0.2)

    def _check_material(self, feat: GeometricFeature) -> FeatureCheck:
        m = _MACHINABILITY.get(self._material, 0.5)
        is_complex = feat.feature_type in (FeatureType.POCKET, FeatureType.SLOT) and feat.is_deep
        if m >= 0.5:
            return FeatureCheck("material_ok", CheckStatus.PASS,
                                f"'{self._material}' machinability {m:.1f} — OK", 1.0)
        if m >= 0.25:
            return FeatureCheck("material_ok", CheckStatus.WARN,
                                f"'{self._material}' machinability {m:.1f} — reduced speeds",
                                0.7 if not is_complex else 0.5)
        status = CheckStatus.WARN if not is_complex else CheckStatus.FAIL
        return FeatureCheck("material_ok", status,
                            f"'{self._material}' machinability {m:.2f} — difficult",
                            0.4 if not is_complex else 0.2)

    def _check_aspect_ratio(self, feat: GeometricFeature) -> FeatureCheck:
        ar = feat.aspect_ratio
        if ar <= 0:
            return FeatureCheck("aspect_ratio_ok", CheckStatus.PASS, "No AR concern", 1.0)
        if ar <= 3.0:
            return FeatureCheck("aspect_ratio_ok", CheckStatus.PASS, f"AR {ar:.1f}:1 — standard", 1.0)
        if ar <= 6.0:
            return FeatureCheck("aspect_ratio_ok", CheckStatus.WARN, f"AR {ar:.1f}:1 — step-down", 0.7)
        if ar <= 10.0:
            return FeatureCheck("aspect_ratio_ok", CheckStatus.WARN, f"AR {ar:.1f}:1 — long-reach", 0.5)
        return FeatureCheck("aspect_ratio_ok", CheckStatus.FAIL, f"AR {ar:.1f}:1 — beyond capability", 0.2)

    def _determine_process(self, feat: GeometricFeature) -> str:
        if feat.feature_type == FeatureType.HOLE:
            return "reaming" if feat.has_tight_tolerance else "drilling"
        if feat.feature_type in (FeatureType.POCKET, FeatureType.SLOT):
            return "milling_finish" if feat.has_tight_tolerance else "milling_rough"
        if feat.feature_type == FeatureType.FILLET:
            return "milling_finish"
        if feat.feature_type == FeatureType.THREAD:
            return "tapping"
        if feat.feature_type == FeatureType.GROOVE:
            return "grooving"
        return "milling_rough"
