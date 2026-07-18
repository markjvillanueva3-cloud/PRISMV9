"""Tool Wear Prediction Model — CC-EXT-MS3-P0-U05.

Hybrid model combining Taylor tool life baseline (analytical) with
sensor-derived correction factors (data-driven). Predicts remaining
useful life, outputs confidence intervals, and recommends actions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import numpy as np

from .condition_correlator import WearState, ConditionCorrelator, _linear_fit


# ---------------------------------------------------------------------------
# Enums and dataclasses
# ---------------------------------------------------------------------------

class ToolAction(str, Enum):
    CONTINUE = "continue"
    MONITOR = "monitor"
    CHANGE = "change"


@dataclass
class WearPrediction:
    """Prediction of remaining tool life."""
    remaining_life_min: float = 0.0
    remaining_life_pct: float = 100.0
    confidence: float = 0.5
    confidence_interval_min: tuple[float, float] = (0.0, 0.0)
    action: ToolAction = ToolAction.CONTINUE
    wear_index: float = 0.0
    wear_rate: float = 0.0  # wear units per minute
    taylor_life_min: float = 0.0
    sensor_correction: float = 1.0

    def to_dict(self) -> dict:
        return {
            "remaining_life_min": round(self.remaining_life_min, 1),
            "remaining_life_pct": round(self.remaining_life_pct, 1),
            "confidence": round(self.confidence, 4),
            "confidence_interval_min": (
                round(self.confidence_interval_min[0], 1),
                round(self.confidence_interval_min[1], 1),
            ),
            "action": self.action.value,
            "wear_index": round(self.wear_index, 4),
            "wear_rate": round(self.wear_rate, 6),
            "taylor_life_min": round(self.taylor_life_min, 1),
            "sensor_correction": round(self.sensor_correction, 4),
        }


@dataclass
class WearCurvePoint:
    """Single data point on a wear curve."""
    elapsed_min: float = 0.0
    wear_index: float = 0.0
    sensor_features: dict = field(default_factory=dict)


@dataclass
class WearCurve:
    """Learned wear curve for a tool-material-operation combination."""
    tool_id: str = ""
    material: str = ""
    operation: str = ""
    points: list[WearCurvePoint] = field(default_factory=list)
    taylor_n: float = 0.25  # Taylor exponent
    taylor_c: float = 200.0  # Taylor constant (m/min)
    actual_life_min: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "tool_id": self.tool_id,
            "material": self.material,
            "operation": self.operation,
            "num_points": len(self.points),
            "taylor_n": round(self.taylor_n, 4),
            "taylor_c": round(self.taylor_c, 2),
            "actual_life_min": round(self.actual_life_min, 1) if self.actual_life_min else None,
        }


# ---------------------------------------------------------------------------
# Taylor Tool Life Model
# ---------------------------------------------------------------------------

def taylor_tool_life(cutting_speed_mpm: float, taylor_c: float, taylor_n: float) -> float:
    """Calculate tool life in minutes using Taylor equation: V * T^n = C.

    T = (C / V) ^ (1/n)
    """
    if cutting_speed_mpm <= 0 or taylor_c <= 0 or taylor_n <= 0:
        return 0.0
    ratio = taylor_c / cutting_speed_mpm
    if ratio <= 0:
        return 0.0
    return float(ratio ** (1.0 / taylor_n))


# ---------------------------------------------------------------------------
# Feature Fusion
# ---------------------------------------------------------------------------

@dataclass
class SensorTrends:
    """Fused sensor trend features for wear prediction."""
    vibration_rms_slope: float = 0.0
    power_slope: float = 0.0
    temperature_slope: float = 0.0
    ae_energy_slope: float = 0.0
    current_wear_index: float = 0.0
    data_quality: float = 0.5  # 0-1, how much sensor data available


def compute_sensor_trends(
    vibration_rms: list[float] | None = None,
    power_values: list[float] | None = None,
    temp_values: list[float] | None = None,
    ae_rms_values: list[float] | None = None,
    timestamps_min: list[float] | None = None,
) -> SensorTrends:
    """Compute trend slopes from sensor time series."""
    trends = SensorTrends()
    channels_available = 0
    total_channels = 4

    def _slope(values: list[float]) -> float:
        if len(values) < 2:
            return 0.0
        x = np.arange(len(values), dtype=np.float64)
        slope, _, _ = _linear_fit(x, np.array(values))
        return slope

    if vibration_rms and len(vibration_rms) >= 2:
        trends.vibration_rms_slope = _slope(vibration_rms)
        channels_available += 1

    if power_values and len(power_values) >= 2:
        trends.power_slope = _slope(power_values)
        channels_available += 1

    if temp_values and len(temp_values) >= 2:
        trends.temperature_slope = _slope(temp_values)
        channels_available += 1

    if ae_rms_values and len(ae_rms_values) >= 2:
        trends.ae_energy_slope = _slope(ae_rms_values)
        channels_available += 1

    trends.data_quality = channels_available / total_channels

    # Compute fused wear index from trends
    # Normalize each slope contribution and combine
    wear_contributions = []

    if vibration_rms and len(vibration_rms) >= 2:
        # Rising vibration RMS indicates wear
        vib_contrib = max(0, min(1, trends.vibration_rms_slope / 2.0))
        wear_contributions.append(vib_contrib * 0.3)

    if power_values and len(power_values) >= 2:
        # Rising power indicates duller tool
        pwr_contrib = max(0, min(1, trends.power_slope / 50.0))
        wear_contributions.append(pwr_contrib * 0.25)

    if temp_values and len(temp_values) >= 2:
        # Rising temperature indicates wear
        temp_contrib = max(0, min(1, trends.temperature_slope / 5.0))
        wear_contributions.append(temp_contrib * 0.25)

    if ae_rms_values and len(ae_rms_values) >= 2:
        # Rising AE energy indicates surface degradation
        ae_contrib = max(0, min(1, trends.ae_energy_slope / 1.0))
        wear_contributions.append(ae_contrib * 0.2)

    if wear_contributions:
        # Scale to account for missing channels
        scale = 1.0 / (sum(w for w in [0.3, 0.25, 0.25, 0.2][:len(wear_contributions)]))
        trends.current_wear_index = min(1.0, sum(wear_contributions) * scale)

    return trends


# ---------------------------------------------------------------------------
# Wear Predictor
# ---------------------------------------------------------------------------

class WearPredictor:
    """Hybrid tool wear prediction combining Taylor model with sensor learning.

    The Taylor model provides a baseline life estimate. Sensor-derived
    trends (vibration, power, temperature, AE) produce a correction
    factor that adjusts the baseline up or down.
    """

    def __init__(self):
        self._correlator = ConditionCorrelator()
        self._learned_curves: dict[str, WearCurve] = {}

    @property
    def learned_curves(self) -> dict[str, WearCurve]:
        return dict(self._learned_curves)

    def predict(
        self,
        elapsed_min: float,
        cutting_speed_mpm: float,
        taylor_c: float = 200.0,
        taylor_n: float = 0.25,
        sensor_trends: Optional[SensorTrends] = None,
        curve_key: Optional[str] = None,
    ) -> WearPrediction:
        """Predict remaining tool life.

        Args:
            elapsed_min: Time already cut in minutes.
            cutting_speed_mpm: Current cutting speed in m/min.
            taylor_c: Taylor constant C.
            taylor_n: Taylor exponent n.
            sensor_trends: Fused sensor trend data (optional).
            curve_key: Key to look up learned wear curve (optional).
        """
        # 1. Taylor baseline
        taylor_life = taylor_tool_life(cutting_speed_mpm, taylor_c, taylor_n)
        if taylor_life <= 0:
            return WearPrediction(action=ToolAction.CHANGE)

        # 2. Sensor correction factor
        sensor_correction = 1.0
        sensor_wear_index = 0.0
        data_quality = 0.0

        if sensor_trends:
            data_quality = sensor_trends.data_quality
            sensor_wear_index = sensor_trends.current_wear_index

            # If sensors show faster wear than Taylor predicts, reduce life
            # If sensors show slower wear, increase life (up to 20% bonus)
            if elapsed_min > 0:
                taylor_wear_rate = elapsed_min / taylor_life
                if taylor_wear_rate > 0:
                    actual_vs_expected = sensor_wear_index / max(taylor_wear_rate, 0.01)
                    # Blend correction: 1.0 = no change, >1 = wearing faster, <1 = wearing slower
                    sensor_correction = max(0.5, min(1.5, actual_vs_expected))
                    # Weight by data quality
                    sensor_correction = 1.0 + (sensor_correction - 1.0) * data_quality

        # 3. Corrected life
        corrected_life = taylor_life / max(sensor_correction, 0.01)
        remaining = max(0, corrected_life - elapsed_min)
        remaining_pct = max(0, (remaining / corrected_life) * 100) if corrected_life > 0 else 0

        # 4. Learned curve adjustment
        if curve_key and curve_key in self._learned_curves:
            curve = self._learned_curves[curve_key]
            if curve.actual_life_min and curve.actual_life_min > 0:
                learned_remaining = max(0, curve.actual_life_min - elapsed_min)
                # Blend learned with predicted (learned gets 60% weight if available)
                remaining = 0.4 * remaining + 0.6 * learned_remaining

        # 5. Wear rate
        wear_rate = sensor_wear_index / max(elapsed_min, 0.01) if elapsed_min > 0 else 0.0

        # 6. Confidence
        confidence = 0.4  # base
        if elapsed_min > 0:
            confidence += 0.1  # some runtime data
        if data_quality > 0:
            confidence += 0.2 * data_quality
        if curve_key and curve_key in self._learned_curves:
            confidence += 0.15
        confidence = min(0.95, confidence)

        # 7. Confidence interval (±20% at low confidence, ±10% at high)
        interval_pct = 0.2 - 0.1 * confidence
        ci_low = max(0, remaining * (1 - interval_pct))
        ci_high = remaining * (1 + interval_pct)

        # 8. Action recommendation
        if remaining_pct > 50:
            action = ToolAction.CONTINUE
        elif remaining_pct > 20:
            action = ToolAction.MONITOR
        else:
            action = ToolAction.CHANGE

        # Override: if sensor shows end-of-life wear, force CHANGE
        if sensor_wear_index > 0.8:
            action = ToolAction.CHANGE

        return WearPrediction(
            remaining_life_min=remaining,
            remaining_life_pct=remaining_pct,
            confidence=confidence,
            confidence_interval_min=(ci_low, ci_high),
            action=action,
            wear_index=sensor_wear_index,
            wear_rate=wear_rate,
            taylor_life_min=taylor_life,
            sensor_correction=sensor_correction,
        )

    def update_wear_curve(
        self,
        curve_key: str,
        elapsed_min: float,
        wear_index: float,
        tool_id: str = "",
        material: str = "",
        operation: str = "",
        sensor_features: Optional[dict] = None,
    ) -> WearCurve:
        """Add a data point to a wear curve, creating it if needed."""
        if curve_key not in self._learned_curves:
            self._learned_curves[curve_key] = WearCurve(
                tool_id=tool_id,
                material=material,
                operation=operation,
            )

        curve = self._learned_curves[curve_key]
        curve.points.append(WearCurvePoint(
            elapsed_min=elapsed_min,
            wear_index=wear_index,
            sensor_features=sensor_features or {},
        ))
        return curve

    def finalize_wear_curve(
        self,
        curve_key: str,
        actual_life_min: float,
    ) -> Optional[WearCurve]:
        """Record actual tool life when tool is changed, completing the curve."""
        if curve_key not in self._learned_curves:
            return None
        curve = self._learned_curves[curve_key]
        curve.actual_life_min = actual_life_min
        return curve

    def estimate_from_wear_state(
        self,
        wear_state: WearState,
        taylor_life_min: float,
        elapsed_min: float = 0.0,
    ) -> WearPrediction:
        """Quick prediction from a WearState (from ConditionCorrelator)."""
        remaining_pct = wear_state.estimated_remaining_life_pct
        remaining_min = taylor_life_min * (remaining_pct / 100.0)

        if remaining_pct > 50:
            action = ToolAction.CONTINUE
        elif remaining_pct > 20:
            action = ToolAction.MONITOR
        else:
            action = ToolAction.CHANGE

        confidence = wear_state.confidence

        interval_pct = 0.2 - 0.1 * confidence
        ci_low = max(0, remaining_min * (1 - interval_pct))
        ci_high = remaining_min * (1 + interval_pct)

        return WearPrediction(
            remaining_life_min=remaining_min,
            remaining_life_pct=remaining_pct,
            confidence=confidence,
            confidence_interval_min=(ci_low, ci_high),
            action=action,
            wear_index=wear_state.wear_index,
            taylor_life_min=taylor_life_min,
        )
