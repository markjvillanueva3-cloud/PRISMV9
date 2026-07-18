"""CAM Parameter Safety Overlay — CC-MS9 Validation Bridge.

SAFETY-CRITICAL: Cross-references ALL stored CAM parameters against
physics-based Kienzle force model limits. Flags any parameter
combination that exceeds tool, spindle, or fixture limits.

Computes safety margin per parameter set. S(x) >= 0.70 hard block.

References:
  - Kienzle (1952) — Specific cutting force model
  - Altintas (2012) — Manufacturing Automation, Ch. 2
  - Sandvik Coromant — Machining formulas and definitions
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Physics constants — Kienzle model
# ---------------------------------------------------------------------------

# Specific cutting force kc1.1 by material (N/mm²)
_KC11: dict[str, float] = {
    "aluminum":       800,
    "brass":          700,
    "copper":         900,
    "mild_steel":     1500,
    "steel":          1800,
    "stainless_steel": 2200,
    "cast_iron":      1200,
    "titanium":       1600,
    "inconel":        2800,
    "hardened_steel":  3000,
    "plastic":        400,
}

# Kienzle exponent mc by material
_MC: dict[str, float] = {
    "aluminum": 0.23, "brass": 0.18, "copper": 0.22,
    "mild_steel": 0.26, "steel": 0.25, "stainless_steel": 0.25,
    "cast_iron": 0.24, "titanium": 0.23, "inconel": 0.28,
    "hardened_steel": 0.30, "plastic": 0.15,
}

# Surface speed ranges (m/min) for carbide tooling
_SPEED_RANGES: dict[str, tuple[float, float]] = {
    "aluminum": (200, 1200), "brass": (150, 600), "copper": (100, 400),
    "mild_steel": (80, 300), "steel": (60, 250),
    "stainless_steel": (40, 180), "cast_iron": (60, 200),
    "titanium": (20, 80), "inconel": (15, 50),
    "hardened_steel": (30, 120), "plastic": (200, 1500),
}

# Feed per tooth ranges (mm/tooth) by operation
_FZ_RANGES: dict[str, tuple[float, float]] = {
    "face_mill": (0.05, 0.5), "pocket_2d": (0.02, 0.3),
    "adaptive": (0.03, 0.4), "trochoidal": (0.03, 0.4),
    "contour": (0.02, 0.25), "slot": (0.01, 0.15),
    "roughing_3d": (0.03, 0.3), "finishing_3d": (0.005, 0.1),
    "drilling": (0.02, 0.4),
}

SAFETY_THRESHOLD = 0.70


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class ParameterCheck:
    """A single parameter validation check."""
    parameter: str
    status: str  # "pass", "warn", "fail"
    message: str
    value: Optional[float] = None
    limit: Optional[float] = None
    safety_margin: float = 1.0  # >1 = within limits

    def to_dict(self) -> dict:
        return {
            "parameter": self.parameter,
            "status": self.status,
            "message": self.message,
            "value": self.value,
            "limit": self.limit,
            "safety_margin": round(self.safety_margin, 4),
        }


@dataclass
class StrategyValidation:
    """Validation of a single CAM strategy's parameters."""
    strategy_id: str
    operation_type: str
    material: str
    tool_diameter: float
    checks: list[ParameterCheck] = field(default_factory=list)
    cutting_force_N: float = 0.0
    cutting_power_kW: float = 0.0
    safety_score: float = 1.0
    is_safe: bool = True
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "strategy_id": self.strategy_id,
            "operation_type": self.operation_type,
            "material": self.material,
            "tool_diameter": self.tool_diameter,
            "checks": [c.to_dict() for c in self.checks],
            "cutting_force_N": round(self.cutting_force_N, 1),
            "cutting_power_kW": round(self.cutting_power_kW, 3),
            "safety_score": round(self.safety_score, 4),
            "is_safe": self.is_safe,
            "warnings": self.warnings,
        }


@dataclass
class CAMSafetyReport:
    """Full safety overlay report for all stored CAM parameters."""
    total_strategies: int = 0
    validated: int = 0
    passed: int = 0
    failed: int = 0
    blocked: bool = False
    block_reason: str = ""
    overall_safety_score: float = 1.0
    strategy_validations: list[StrategyValidation] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "total_strategies": self.total_strategies,
            "validated": self.validated,
            "passed": self.passed,
            "failed": self.failed,
            "blocked": self.blocked,
            "block_reason": self.block_reason,
            "overall_safety_score": round(self.overall_safety_score, 4),
            "strategy_validations": [sv.to_dict() for sv in self.strategy_validations],
            "warnings": self.warnings,
        }


# ---------------------------------------------------------------------------
# CAMSafetyOverlay
# ---------------------------------------------------------------------------

class CAMSafetyOverlay:
    """Cross-reference CAM parameters against Kienzle force model.

    SAFETY-CRITICAL: Flags any parameter combination that exceeds
    tool/spindle/fixture limits. S(x) >= 0.70 hard block.
    """

    def __init__(
        self,
        max_spindle_power_kw: float = 15.0,
        max_spindle_rpm: int = 12000,
        max_cutting_force_N: float = 5000.0,
        fixture_rigidity: float = 1.0,  # 1.0=rigid, 0.5=light fixture
    ):
        self._max_power = max_spindle_power_kw
        self._max_rpm = max_spindle_rpm
        self._max_force = max_cutting_force_N
        self._fixture_factor = fixture_rigidity

    def validate_strategy(
        self,
        strategy_id: str,
        material: str,
        operation_type: str,
        tool_diameter: float,
        num_flutes: int = 4,
        cutting_speed: float = 0.0,  # m/min
        feed_per_tooth: float = 0.0,  # mm/tooth
        axial_depth: float = 0.0,  # mm
        radial_depth: float = 0.0,  # mm
        spindle_rpm: int = 0,
    ) -> StrategyValidation:
        """Validate a single CAM strategy against physics limits."""
        mat = material.lower()
        sv = StrategyValidation(
            strategy_id=strategy_id,
            operation_type=operation_type,
            material=mat,
            tool_diameter=tool_diameter,
        )

        # 1. Surface speed check
        if cutting_speed > 0:
            sv.checks.append(self._check_surface_speed(mat, cutting_speed))

        # 2. Feed per tooth check
        if feed_per_tooth > 0:
            sv.checks.append(self._check_feed_per_tooth(operation_type, feed_per_tooth))

        # 3. RPM check
        if spindle_rpm > 0:
            sv.checks.append(self._check_rpm(spindle_rpm))
        elif cutting_speed > 0 and tool_diameter > 0:
            spindle_rpm = int((cutting_speed * 1000) / (math.pi * tool_diameter))
            sv.checks.append(self._check_rpm(spindle_rpm))

        # 4. Kienzle cutting force
        if feed_per_tooth > 0 and axial_depth > 0:
            h = feed_per_tooth  # chip thickness ≈ fz for face milling
            b = axial_depth  # width of cut
            kc11 = _KC11.get(mat, 1800)
            mc = _MC.get(mat, 0.25)

            # Kienzle: Fc = kc1.1 * b * h^(1-mc)
            if h > 0:
                kc = kc11 * (h ** (-mc))
                force = kc * b * h  # N
            else:
                force = 0.0

            sv.cutting_force_N = force
            sv.checks.append(self._check_cutting_force(force))

            # 5. Cutting power
            if spindle_rpm > 0 and tool_diameter > 0:
                vc = (math.pi * tool_diameter * spindle_rpm) / 1000  # m/min
                power = (force * vc) / (60 * 1000)  # kW
                sv.cutting_power_kW = power
                sv.checks.append(self._check_power(power))

        # 6. DOC limits
        if axial_depth > 0 and tool_diameter > 0:
            doc_ratio = axial_depth / tool_diameter
            sv.checks.append(self._check_doc_ratio(operation_type, doc_ratio, axial_depth))

        # Compute safety score
        if sv.checks:
            scores = [c.safety_margin for c in sv.checks]
            # Worst-case determines score, capped at 1.0
            min_margin = min(scores)
            sv.safety_score = min(max(min_margin, 0.0), 1.0)
        sv.is_safe = sv.safety_score >= SAFETY_THRESHOLD

        for c in sv.checks:
            if c.status == "warn":
                sv.warnings.append(c.message)
            elif c.status == "fail":
                sv.warnings.append(f"FAIL: {c.message}")

        return sv

    def validate_all(
        self, strategies: list[dict],
    ) -> CAMSafetyReport:
        """Validate all stored strategies. Returns CAMSafetyReport."""
        report = CAMSafetyReport(total_strategies=len(strategies))
        min_score = 1.0

        for strat in strategies:
            params = strat.get("parameters", strat.get("cutting_parameters", {}))
            sv = self.validate_strategy(
                strategy_id=strat.get("strategy_id", strat.get("id", "unknown")),
                material=strat.get("material", "steel"),
                operation_type=strat.get("operation_type", strat.get("strategy_type", "pocket_2d")),
                tool_diameter=float(params.get("tool_diameter", params.get("diameter", 10.0))),
                num_flutes=int(params.get("num_flutes", params.get("flutes", 4))),
                cutting_speed=float(params.get("cutting_speed", params.get("vc", 0))),
                feed_per_tooth=float(params.get("feed_per_tooth", params.get("fz", 0))),
                axial_depth=float(params.get("axial_depth", params.get("ap", 0))),
                radial_depth=float(params.get("radial_depth", params.get("ae", 0))),
                spindle_rpm=int(params.get("spindle_rpm", params.get("rpm", 0))),
            )
            report.strategy_validations.append(sv)
            report.validated += 1
            if sv.is_safe:
                report.passed += 1
            else:
                report.failed += 1
            min_score = min(min_score, sv.safety_score)
            report.warnings.extend(sv.warnings)

        report.overall_safety_score = min_score
        if min_score < SAFETY_THRESHOLD:
            report.blocked = True
            report.block_reason = (
                f"S(x) = {min_score:.2f} < {SAFETY_THRESHOLD} — "
                f"BLOCKED: CAM parameters violate safety limits"
            )

        return report

    # -- Individual parameter checks --

    def _check_surface_speed(self, material: str, vc: float) -> ParameterCheck:
        speed_range = _SPEED_RANGES.get(material, (50, 300))
        if speed_range[0] <= vc <= speed_range[1]:
            margin = (speed_range[1] - vc) / (speed_range[1] - speed_range[0])
            return ParameterCheck("surface_speed", "pass",
                                  f"Vc={vc:.0f} m/min within range {speed_range}",
                                  vc, speed_range[1], max(margin, 0.5))
        elif vc < speed_range[0]:
            return ParameterCheck("surface_speed", "warn",
                                  f"Vc={vc:.0f} below minimum {speed_range[0]} — inefficient",
                                  vc, speed_range[0], 0.6)
        else:
            overshoot = vc / speed_range[1]
            margin = max(1.0 / overshoot, 0.1)
            status = "warn" if overshoot < 1.3 else "fail"
            return ParameterCheck("surface_speed", status,
                                  f"Vc={vc:.0f} exceeds max {speed_range[1]} for {material}",
                                  vc, speed_range[1], margin)

    def _check_feed_per_tooth(self, op_type: str, fz: float) -> ParameterCheck:
        fz_range = _FZ_RANGES.get(op_type, (0.02, 0.3))
        if fz_range[0] <= fz <= fz_range[1]:
            margin = (fz_range[1] - fz) / (fz_range[1] - fz_range[0])
            return ParameterCheck("feed_per_tooth", "pass",
                                  f"fz={fz:.3f} within range for {op_type}",
                                  fz, fz_range[1], max(margin, 0.5))
        elif fz > fz_range[1]:
            return ParameterCheck("feed_per_tooth", "fail",
                                  f"fz={fz:.3f} exceeds max {fz_range[1]} for {op_type}",
                                  fz, fz_range[1], fz_range[1] / max(fz, 0.001))
        return ParameterCheck("feed_per_tooth", "warn",
                              f"fz={fz:.3f} below min {fz_range[0]} — inefficient",
                              fz, fz_range[0], 0.7)

    def _check_rpm(self, rpm: int) -> ParameterCheck:
        if rpm <= self._max_rpm:
            margin = (self._max_rpm - rpm) / self._max_rpm
            return ParameterCheck("spindle_rpm", "pass",
                                  f"RPM={rpm} within spindle limit {self._max_rpm}",
                                  rpm, self._max_rpm, max(margin + 0.5, 0.5))
        return ParameterCheck("spindle_rpm", "fail",
                              f"RPM={rpm} exceeds spindle max {self._max_rpm}",
                              rpm, self._max_rpm, self._max_rpm / max(rpm, 1))

    def _check_cutting_force(self, force: float) -> ParameterCheck:
        limit = self._max_force * self._fixture_factor
        if force <= limit:
            margin = (limit - force) / max(limit, 1)
            return ParameterCheck("cutting_force", "pass",
                                  f"Fc={force:.0f}N within limit {limit:.0f}N",
                                  force, limit, max(margin + 0.5, 0.5))
        status = "warn" if force < limit * 1.2 else "fail"
        return ParameterCheck("cutting_force", status,
                              f"Fc={force:.0f}N exceeds limit {limit:.0f}N",
                              force, limit, limit / max(force, 1))

    def _check_power(self, power: float) -> ParameterCheck:
        if power <= self._max_power:
            margin = (self._max_power - power) / max(self._max_power, 0.1)
            return ParameterCheck("cutting_power", "pass",
                                  f"Pc={power:.2f}kW within {self._max_power}kW",
                                  power, self._max_power, max(margin + 0.5, 0.5))
        status = "warn" if power < self._max_power * 1.1 else "fail"
        return ParameterCheck("cutting_power", status,
                              f"Pc={power:.2f}kW exceeds {self._max_power}kW spindle",
                              power, self._max_power, self._max_power / max(power, 0.01))

    def _check_doc_ratio(self, op_type: str, ratio: float, ap: float) -> ParameterCheck:
        limits = {
            "adaptive": (0.5, 3.0), "trochoidal": (0.5, 3.0),
            "face_mill": (0.02, 0.5), "pocket_2d": (0.05, 1.0),
            "contour": (0.05, 1.5), "slot": (0.05, 1.0),
        }
        doc_range = limits.get(op_type, (0.05, 1.5))
        if doc_range[0] <= ratio <= doc_range[1]:
            return ParameterCheck("doc_ratio", "pass",
                                  f"ap/D={ratio:.2f} within {doc_range} for {op_type}",
                                  ratio, doc_range[1], 0.9)
        if ratio > doc_range[1]:
            return ParameterCheck("doc_ratio", "warn" if ratio < doc_range[1] * 1.5 else "fail",
                                  f"ap/D={ratio:.2f} exceeds {doc_range[1]} for {op_type}",
                                  ratio, doc_range[1], doc_range[1] / max(ratio, 0.01))
        return ParameterCheck("doc_ratio", "warn",
                              f"ap/D={ratio:.2f} below {doc_range[0]} — inefficient",
                              ratio, doc_range[0], 0.7)
