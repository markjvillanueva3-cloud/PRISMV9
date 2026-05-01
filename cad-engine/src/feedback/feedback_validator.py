"""Physics Model Validation of Feedback — CC-EXT-MS2 P0-U02.

Validates operator-submitted feedback parameters against physics models:
- Kienzle cutting force model for speed/feed validation
- Taylor tool life model for tool life claims
- Force/power validation against machine capability

Three-tier classification:
  CONFIRMED  — <20% deviation from physics prediction
  NOVEL      — 20-100% deviation but physically plausible
  IMPLAUSIBLE — >100% deviation or violates conservation laws
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from .feedback_schema import OperatorFeedback


# ---------------------------------------------------------------------------
# Enums & result types
# ---------------------------------------------------------------------------

class ValidationTier(str, Enum):
    CONFIRMED = "confirmed"       # <20% deviation
    NOVEL = "novel"               # 20-100% deviation, plausible
    IMPLAUSIBLE = "implausible"   # >100% deviation or physics violation


class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass
class ParameterCheck:
    """Result of validating a single parameter against physics."""
    parameter: str
    reported_value: float
    predicted_value: float
    deviation_pct: float
    tier: ValidationTier
    model_used: str
    details: str = ""


@dataclass
class ValidationResult:
    """Full validation result for one feedback entry."""
    feedback_id: str
    overall_tier: ValidationTier = ValidationTier.CONFIRMED
    checks: list[ParameterCheck] = field(default_factory=list)
    needs_review: bool = False
    review_status: ReviewStatus = ReviewStatus.PENDING
    validated_at: str = ""
    errors: list[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.validated_at:
            self.validated_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "feedback_id": self.feedback_id,
            "overall_tier": self.overall_tier.value,
            "checks": [
                {
                    "parameter": c.parameter,
                    "reported_value": c.reported_value,
                    "predicted_value": c.predicted_value,
                    "deviation_pct": round(c.deviation_pct, 2),
                    "tier": c.tier.value,
                    "model_used": c.model_used,
                    "details": c.details,
                }
                for c in self.checks
            ],
            "needs_review": self.needs_review,
            "review_status": self.review_status.value,
            "validated_at": self.validated_at,
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# Physics constants — Kienzle specific cutting force (kc1_1) and exponent (mc)
# ---------------------------------------------------------------------------

_KIENZLE_PARAMS: dict[str, tuple[float, float]] = {
    # material: (kc1_1 [N/mm²], mc)
    "aluminum":         (800.0, 0.23),
    "aluminium":        (800.0, 0.23),
    "steel":            (2100.0, 0.26),
    "stainless_steel":  (2800.0, 0.21),
    "stainless steel":  (2800.0, 0.21),
    "cast_iron":        (1400.0, 0.24),
    "cast iron":        (1400.0, 0.24),
    "titanium":         (1900.0, 0.23),
    "inconel":          (3200.0, 0.25),
    "brass":            (780.0, 0.18),
    "copper":           (1500.0, 0.25),
    "carbon_steel":     (2000.0, 0.26),
    "carbon steel":     (2000.0, 0.26),
    "tool_steel":       (2500.0, 0.27),
    "tool steel":       (2500.0, 0.27),
}

# Recommended surface speed ranges [m/min] by material for carbide tooling
_SPEED_RANGES: dict[str, tuple[float, float]] = {
    "aluminum":         (200.0, 600.0),
    "aluminium":        (200.0, 600.0),
    "steel":            (80.0, 250.0),
    "stainless_steel":  (60.0, 180.0),
    "stainless steel":  (60.0, 180.0),
    "cast_iron":        (80.0, 200.0),
    "cast iron":        (80.0, 200.0),
    "titanium":         (30.0, 80.0),
    "inconel":          (15.0, 40.0),
    "brass":            (150.0, 400.0),
    "copper":           (100.0, 300.0),
    "carbon_steel":     (100.0, 280.0),
    "carbon steel":     (100.0, 280.0),
    "tool_steel":       (50.0, 150.0),
    "tool steel":       (50.0, 150.0),
}

# Feed per tooth ranges [mm/tooth] by operation type
_FEED_RANGES: dict[str, tuple[float, float]] = {
    "milling":    (0.03, 0.30),
    "turning":    (0.05, 0.50),
    "drilling":   (0.05, 0.40),
    "grinding":   (0.001, 0.05),
    "threading":  (0.05, 0.25),
    "boring":     (0.03, 0.20),
    "reaming":    (0.05, 0.30),
    "tapping":    (0.05, 0.25),
    "edm":        (0.0, 0.0),     # Not applicable
    "other":      (0.01, 0.50),
}

# ---------------------------------------------------------------------------
# Taylor tool life constants: V * T^n = C
# ---------------------------------------------------------------------------

_TAYLOR_PARAMS: dict[str, tuple[float, float]] = {
    # material: (C [m/min reference], n [exponent])
    "aluminum":         (600.0, 0.45),
    "aluminium":        (600.0, 0.45),
    "steel":            (200.0, 0.25),
    "stainless_steel":  (150.0, 0.20),
    "stainless steel":  (150.0, 0.20),
    "cast_iron":        (180.0, 0.25),
    "cast iron":        (180.0, 0.25),
    "titanium":         (80.0, 0.15),
    "inconel":          (50.0, 0.12),
    "brass":            (400.0, 0.40),
    "copper":           (300.0, 0.35),
    "carbon_steel":     (220.0, 0.25),
    "carbon steel":     (220.0, 0.25),
    "tool_steel":       (120.0, 0.18),
    "tool steel":       (120.0, 0.18),
}

# Typical max spindle power [kW] for mid-range CNC
_DEFAULT_MAX_POWER_KW = 15.0

# ---------------------------------------------------------------------------
# Physics limits (conservation law checks)
# ---------------------------------------------------------------------------

_MAX_CUTTING_SPEED = 2000.0    # m/min — beyond any practical machining
_MAX_FEED_PER_TOOTH = 5.0      # mm/tooth — physically unreasonable
_MAX_AXIAL_DEPTH = 200.0       # mm — beyond normal machine envelope
_MAX_TOOL_LIFE_HOURS = 500.0   # hours — unreasonably long for any tool


# ---------------------------------------------------------------------------
# FeedbackValidator
# ---------------------------------------------------------------------------

class FeedbackValidator:
    """Validates operator feedback parameters against physics models.

    Uses Kienzle cutting force model and Taylor tool life equation
    to classify feedback as CONFIRMED, NOVEL, or IMPLAUSIBLE.
    """

    def __init__(self, max_power_kw: float = _DEFAULT_MAX_POWER_KW):
        self._max_power_kw = max_power_kw
        self._review_queue: list[ValidationResult] = []

    def validate(self, fb: OperatorFeedback) -> ValidationResult:
        """Validate a single feedback entry against physics models.

        Args:
            fb: OperatorFeedback to validate.

        Returns:
            ValidationResult with per-parameter checks and overall tier.
        """
        result = ValidationResult(feedback_id=fb.feedback_id)
        material = fb.material.lower().strip()
        operation = fb.operation_type.lower().strip()
        params = fb.parameters_used

        # Check conservation laws first (immediate IMPLAUSIBLE)
        conservation_errors = self._check_conservation_laws(params)
        if conservation_errors:
            for err in conservation_errors:
                result.checks.append(ParameterCheck(
                    parameter=err[0],
                    reported_value=err[1],
                    predicted_value=0.0,
                    deviation_pct=999.0,
                    tier=ValidationTier.IMPLAUSIBLE,
                    model_used="conservation_laws",
                    details=err[2],
                ))

        # Speed/feed validation via Kienzle
        self._validate_speed_feed(result, params, material, operation)

        # Tool life validation via Taylor
        self._validate_tool_life(result, params, material)

        # Force/power validation
        self._validate_force_power(result, params, material, fb.tool_diameter_mm)

        # Determine overall tier (worst tier wins)
        result.overall_tier = self._compute_overall_tier(result.checks)

        # Flag NOVEL for human review
        if result.overall_tier == ValidationTier.NOVEL:
            result.needs_review = True
            self._review_queue.append(result)

        return result

    def validate_batch(
        self, entries: list[OperatorFeedback],
    ) -> list[ValidationResult]:
        """Validate multiple feedback entries."""
        return [self.validate(fb) for fb in entries]

    def get_pending_reviews(self) -> list[ValidationResult]:
        """Get all NOVEL feedback entries pending human review."""
        return [
            r for r in self._review_queue
            if r.review_status == ReviewStatus.PENDING
        ]

    def approve_review(self, feedback_id: str) -> bool:
        """Approve a NOVEL feedback entry after human review."""
        for r in self._review_queue:
            if r.feedback_id == feedback_id:
                r.review_status = ReviewStatus.APPROVED
                return True
        return False

    def reject_review(self, feedback_id: str) -> bool:
        """Reject a NOVEL feedback entry after human review."""
        for r in self._review_queue:
            if r.feedback_id == feedback_id:
                r.review_status = ReviewStatus.REJECTED
                return True
        return False

    # -------------------------------------------------------------------
    # Conservation law checks
    # -------------------------------------------------------------------

    @staticmethod
    def _check_conservation_laws(
        params: dict[str, float],
    ) -> list[tuple[str, float, str]]:
        """Check for physically impossible values."""
        errors: list[tuple[str, float, str]] = []

        cs = params.get("cutting_speed", params.get("speed", 0))
        if cs < 0:
            errors.append(("cutting_speed", cs, "Negative cutting speed violates physics"))
        elif cs > _MAX_CUTTING_SPEED:
            errors.append(("cutting_speed", cs, f"Cutting speed {cs} m/min exceeds physical limit {_MAX_CUTTING_SPEED}"))

        fz = params.get("feed_per_tooth", params.get("feed", 0))
        if fz < 0:
            errors.append(("feed_per_tooth", fz, "Negative feed rate violates physics"))
        elif fz > _MAX_FEED_PER_TOOTH:
            errors.append(("feed_per_tooth", fz, f"Feed {fz} mm/tooth exceeds physical limit"))

        ap = params.get("axial_depth", params.get("depth_of_cut", 0))
        if ap < 0:
            errors.append(("axial_depth", ap, "Negative depth of cut violates physics"))
        elif ap > _MAX_AXIAL_DEPTH:
            errors.append(("axial_depth", ap, f"Axial depth {ap} mm exceeds machine envelope"))

        tool_life = params.get("tool_life_minutes", params.get("tool_life", 0))
        if tool_life < 0:
            errors.append(("tool_life", tool_life, "Negative tool life violates physics"))
        elif tool_life > _MAX_TOOL_LIFE_HOURS * 60:
            errors.append(("tool_life", tool_life, f"Tool life {tool_life} min ({tool_life/60:.0f} hrs) unreasonably long"))

        return errors

    # -------------------------------------------------------------------
    # Speed/feed validation (Kienzle model)
    # -------------------------------------------------------------------

    def _validate_speed_feed(
        self,
        result: ValidationResult,
        params: dict[str, float],
        material: str,
        operation: str,
    ) -> None:
        """Validate cutting speed and feed against known ranges and Kienzle model."""
        cutting_speed = params.get("cutting_speed", params.get("speed", 0))
        if cutting_speed <= 0:
            return  # No speed reported

        speed_range = _SPEED_RANGES.get(material)
        if speed_range:
            mid_speed = (speed_range[0] + speed_range[1]) / 2
            deviation = abs(cutting_speed - mid_speed) / mid_speed * 100

            # Within range = low deviation; outside = higher
            if speed_range[0] <= cutting_speed <= speed_range[1]:
                tier = ValidationTier.CONFIRMED
                deviation = min(deviation, 19.0)  # Within range is confirmed
            elif cutting_speed < speed_range[0] * 0.5 or cutting_speed > speed_range[1] * 2.0:
                tier = ValidationTier.IMPLAUSIBLE
            else:
                tier = ValidationTier.NOVEL

            result.checks.append(ParameterCheck(
                parameter="cutting_speed",
                reported_value=cutting_speed,
                predicted_value=mid_speed,
                deviation_pct=deviation,
                tier=tier,
                model_used="kienzle_speed_range",
                details=f"Range for {material}: {speed_range[0]}-{speed_range[1]} m/min",
            ))

        # Feed validation
        feed = params.get("feed_per_tooth", params.get("feed", 0))
        if feed <= 0:
            return

        feed_range = _FEED_RANGES.get(operation)
        if feed_range and feed_range[1] > 0:
            mid_feed = (feed_range[0] + feed_range[1]) / 2
            deviation = abs(feed - mid_feed) / mid_feed * 100

            if feed_range[0] <= feed <= feed_range[1]:
                tier = ValidationTier.CONFIRMED
                deviation = min(deviation, 19.0)
            elif feed < feed_range[0] * 0.3 or feed > feed_range[1] * 3.0:
                tier = ValidationTier.IMPLAUSIBLE
            else:
                tier = ValidationTier.NOVEL

            result.checks.append(ParameterCheck(
                parameter="feed_per_tooth",
                reported_value=feed,
                predicted_value=mid_feed,
                deviation_pct=deviation,
                tier=tier,
                model_used="kienzle_feed_range",
                details=f"Range for {operation}: {feed_range[0]}-{feed_range[1]} mm/tooth",
            ))

    # -------------------------------------------------------------------
    # Tool life validation (Taylor model)
    # -------------------------------------------------------------------

    def _validate_tool_life(
        self,
        result: ValidationResult,
        params: dict[str, float],
        material: str,
    ) -> None:
        """Validate tool life claims against Taylor equation V*T^n = C."""
        tool_life = params.get("tool_life_minutes", params.get("tool_life", 0))
        if tool_life <= 0:
            return

        cutting_speed = params.get("cutting_speed", params.get("speed", 0))
        if cutting_speed <= 0:
            return

        taylor = _TAYLOR_PARAMS.get(material)
        if not taylor:
            return

        C, n = taylor

        # Taylor: V * T^n = C → T = (C/V)^(1/n)
        if cutting_speed > 0 and n > 0:
            predicted_life = (C / cutting_speed) ** (1.0 / n)
            deviation = abs(tool_life - predicted_life) / predicted_life * 100

            tier = self._classify_deviation(deviation)

            result.checks.append(ParameterCheck(
                parameter="tool_life",
                reported_value=tool_life,
                predicted_value=round(predicted_life, 1),
                deviation_pct=deviation,
                tier=tier,
                model_used="taylor_tool_life",
                details=f"Taylor: V*T^{n}={C}, V={cutting_speed} m/min → T={predicted_life:.1f} min",
            ))

    # -------------------------------------------------------------------
    # Force/power validation
    # -------------------------------------------------------------------

    def _validate_force_power(
        self,
        result: ValidationResult,
        params: dict[str, float],
        material: str,
        tool_diameter_mm: float,
    ) -> None:
        """Validate cutting force and power against Kienzle model and machine limits."""
        kienzle = _KIENZLE_PARAMS.get(material)
        if not kienzle:
            return

        kc1_1, mc = kienzle

        # Need feed and depth to compute force
        feed = params.get("feed_per_tooth", params.get("feed", 0))
        depth = params.get("axial_depth", params.get("depth_of_cut", 0))
        cutting_speed = params.get("cutting_speed", params.get("speed", 0))

        if feed <= 0 or depth <= 0:
            return

        # Kienzle: Fc = kc1_1 * h^(1-mc) * b
        # h = feed (chip thickness ≈ feed per tooth), b = depth (width of cut ≈ axial depth)
        h = feed  # mm
        b = depth  # mm
        predicted_force = kc1_1 * (h ** (1 - mc)) * b  # N

        reported_force = params.get("cutting_force", 0)
        if reported_force > 0:
            deviation = abs(reported_force - predicted_force) / predicted_force * 100
            tier = self._classify_deviation(deviation)

            result.checks.append(ParameterCheck(
                parameter="cutting_force",
                reported_value=reported_force,
                predicted_value=round(predicted_force, 1),
                deviation_pct=deviation,
                tier=tier,
                model_used="kienzle_force",
                details=f"Kienzle: kc1_1={kc1_1}, mc={mc}, h={h}, b={b} → Fc={predicted_force:.1f} N",
            ))

        # Power check: P = Fc * Vc / 60000 [kW]
        if cutting_speed > 0 and predicted_force > 0:
            predicted_power = predicted_force * cutting_speed / 60000.0  # kW

            reported_power = params.get("cutting_power", params.get("power", 0))
            if reported_power > 0:
                deviation = abs(reported_power - predicted_power) / predicted_power * 100
                tier = self._classify_deviation(deviation)

                result.checks.append(ParameterCheck(
                    parameter="cutting_power",
                    reported_value=reported_power,
                    predicted_value=round(predicted_power, 2),
                    deviation_pct=deviation,
                    tier=tier,
                    model_used="kienzle_power",
                    details=f"P = Fc*Vc/60000 = {predicted_force:.0f}*{cutting_speed}/{60000} = {predicted_power:.2f} kW",
                ))

            # Machine power limit check
            if predicted_power > self._max_power_kw:
                result.checks.append(ParameterCheck(
                    parameter="machine_power_limit",
                    reported_value=predicted_power,
                    predicted_value=self._max_power_kw,
                    deviation_pct=(predicted_power / self._max_power_kw - 1) * 100,
                    tier=ValidationTier.IMPLAUSIBLE,
                    model_used="machine_capability",
                    details=f"Predicted power {predicted_power:.2f} kW exceeds machine limit {self._max_power_kw} kW",
                ))

    # -------------------------------------------------------------------
    # Classification helpers
    # -------------------------------------------------------------------

    @staticmethod
    def _classify_deviation(deviation_pct: float) -> ValidationTier:
        """Classify deviation into three tiers."""
        if deviation_pct < 20.0:
            return ValidationTier.CONFIRMED
        elif deviation_pct <= 100.0:
            return ValidationTier.NOVEL
        else:
            return ValidationTier.IMPLAUSIBLE

    @staticmethod
    def _compute_overall_tier(checks: list[ParameterCheck]) -> ValidationTier:
        """Compute overall tier from individual checks (worst wins)."""
        if not checks:
            return ValidationTier.CONFIRMED

        if any(c.tier == ValidationTier.IMPLAUSIBLE for c in checks):
            return ValidationTier.IMPLAUSIBLE
        if any(c.tier == ValidationTier.NOVEL for c in checks):
            return ValidationTier.NOVEL
        return ValidationTier.CONFIRMED
