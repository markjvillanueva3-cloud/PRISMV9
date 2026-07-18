"""Cutting Condition Correlation — CC-EXT-MS3-P0-U04.

Links sensor signatures to cutting conditions:
vibration->DOC/feed, power->MRR, temperature->wear, AE->surface finish.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from .signal_processor import SignalFeatureSet, TimeDomainFeatures, FrequencyDomainFeatures


# ---------------------------------------------------------------------------
# Correlation models
# ---------------------------------------------------------------------------

@dataclass
class CorrelationResult:
    """Result of correlating sensor data with cutting conditions."""
    model_name: str = ""
    r_squared: float = 0.0
    coefficients: list[float] = field(default_factory=list)
    predicted_value: float = 0.0
    actual_value: float = 0.0
    residual: float = 0.0
    confidence: float = 0.5

    def to_dict(self) -> dict:
        return {
            "model_name": self.model_name,
            "r_squared": round(self.r_squared, 4),
            "predicted_value": round(self.predicted_value, 4),
            "confidence": round(self.confidence, 4),
        }


@dataclass
class WearState:
    """Tool wear state estimate from sensor data."""
    state: str = "fresh"  # "fresh", "normal", "worn", "end_of_life"
    wear_index: float = 0.0  # 0.0 = fresh, 1.0 = end of life
    estimated_remaining_life_pct: float = 100.0
    confidence: float = 0.5

    def to_dict(self) -> dict:
        return {
            "state": self.state,
            "wear_index": round(self.wear_index, 4),
            "remaining_life_pct": round(self.estimated_remaining_life_pct, 1),
            "confidence": round(self.confidence, 4),
        }


@dataclass
class SurfaceQualityEstimate:
    """Surface quality estimate from acoustic emission data."""
    estimated_ra_um: float = 0.0  # estimated Ra in micrometers
    quality_grade: str = "unknown"  # "excellent", "good", "acceptable", "poor"
    confidence: float = 0.5

    def to_dict(self) -> dict:
        return {
            "estimated_ra_um": round(self.estimated_ra_um, 3),
            "quality_grade": self.quality_grade,
            "confidence": round(self.confidence, 4),
        }


# ---------------------------------------------------------------------------
# Linear regression helper
# ---------------------------------------------------------------------------

def _linear_fit(x: np.ndarray, y: np.ndarray) -> tuple[float, float, float]:
    """Simple linear regression. Returns (slope, intercept, r_squared)."""
    n = len(x)
    if n < 2:
        return 0.0, 0.0, 0.0

    x_mean = np.mean(x)
    y_mean = np.mean(y)
    ss_xy = np.sum((x - x_mean) * (y - y_mean))
    ss_xx = np.sum((x - x_mean) ** 2)
    ss_yy = np.sum((y - y_mean) ** 2)

    if ss_xx == 0:
        return 0.0, float(y_mean), 0.0

    slope = float(ss_xy / ss_xx)
    intercept = float(y_mean - slope * x_mean)

    if ss_yy == 0:
        r_squared = 1.0 if ss_xy == 0 else 0.0
    else:
        r_squared = float((ss_xy ** 2) / (ss_xx * ss_yy))

    return slope, intercept, r_squared


# ---------------------------------------------------------------------------
# Condition Correlator
# ---------------------------------------------------------------------------

class ConditionCorrelator:
    """Links sensor signatures to cutting conditions.

    Models:
    - Vibration RMS/kurtosis -> DOC and feed rate
    - Power consumption -> material removal rate
    - Temperature trend -> tool wear state
    - Acoustic emission RMS -> surface finish (Ra)
    """

    def correlate_vibration_to_doc(
        self,
        rms_values: list[float],
        doc_values: list[float],
    ) -> CorrelationResult:
        """Correlate vibration RMS to depth of cut."""
        if len(rms_values) < 2 or len(doc_values) < 2:
            return CorrelationResult(model_name="vibration_to_doc")

        x = np.array(rms_values[:len(doc_values)])
        y = np.array(doc_values[:len(rms_values)])
        n = min(len(x), len(y))
        x, y = x[:n], y[:n]

        slope, intercept, r2 = _linear_fit(x, y)

        return CorrelationResult(
            model_name="vibration_to_doc",
            r_squared=r2,
            coefficients=[slope, intercept],
            predicted_value=slope * x[-1] + intercept if len(x) > 0 else 0.0,
            actual_value=float(y[-1]) if len(y) > 0 else 0.0,
            confidence=min(0.95, r2),
        )

    def correlate_vibration_to_feed(
        self,
        kurtosis_values: list[float],
        feed_values: list[float],
    ) -> CorrelationResult:
        """Correlate vibration kurtosis to feed rate."""
        if len(kurtosis_values) < 2 or len(feed_values) < 2:
            return CorrelationResult(model_name="vibration_to_feed")

        x = np.array(kurtosis_values)
        y = np.array(feed_values)
        n = min(len(x), len(y))
        x, y = x[:n], y[:n]

        slope, intercept, r2 = _linear_fit(x, y)

        return CorrelationResult(
            model_name="vibration_to_feed",
            r_squared=r2,
            coefficients=[slope, intercept],
            confidence=min(0.9, r2),
        )

    def correlate_power_to_mrr(
        self,
        power_values: list[float],
        mrr_values: list[float],
    ) -> CorrelationResult:
        """Correlate spindle power to material removal rate."""
        if len(power_values) < 2 or len(mrr_values) < 2:
            return CorrelationResult(model_name="power_to_mrr")

        x = np.array(power_values)
        y = np.array(mrr_values)
        n = min(len(x), len(y))
        x, y = x[:n], y[:n]

        slope, intercept, r2 = _linear_fit(x, y)

        return CorrelationResult(
            model_name="power_to_mrr",
            r_squared=r2,
            coefficients=[slope, intercept],
            predicted_value=slope * x[-1] + intercept if len(x) > 0 else 0.0,
            actual_value=float(y[-1]) if len(y) > 0 else 0.0,
            confidence=min(0.95, r2),
        )

    def estimate_wear_state(
        self,
        temp_values: list[float],
        rms_values: Optional[list[float]] = None,
    ) -> WearState:
        """Estimate tool wear state from temperature and vibration trends."""
        if not temp_values:
            return WearState()

        temp_arr = np.array(temp_values)
        mean_temp = float(np.mean(temp_arr))
        temp_trend = 0.0

        if len(temp_arr) > 1:
            x = np.arange(len(temp_arr), dtype=np.float64)
            slope, _, _ = _linear_fit(x, temp_arr)
            temp_trend = slope

        # Combine temperature level and trend into wear index
        # Higher temperature + rising trend = more wear
        wear_index = 0.0

        # Temperature contribution (normalize: 20°C=0, 400°C=1)
        temp_contrib = max(0, min(1, (mean_temp - 20) / 380))
        wear_index += temp_contrib * 0.6

        # Trend contribution (rising = wearing)
        trend_contrib = max(0, min(1, temp_trend / 5.0))
        wear_index += trend_contrib * 0.2

        # Vibration RMS contribution
        if rms_values and len(rms_values) > 1:
            rms_arr = np.array(rms_values)
            rms_slope, _, _ = _linear_fit(np.arange(len(rms_arr), dtype=np.float64), rms_arr)
            rms_contrib = max(0, min(1, rms_slope / 2.0))
            wear_index += rms_contrib * 0.2

        wear_index = max(0, min(1, wear_index))

        if wear_index < 0.2:
            state = "fresh"
        elif wear_index < 0.5:
            state = "normal"
        elif wear_index < 0.8:
            state = "worn"
        else:
            state = "end_of_life"

        return WearState(
            state=state,
            wear_index=wear_index,
            estimated_remaining_life_pct=max(0, (1 - wear_index) * 100),
            confidence=0.6 + 0.2 * min(1, len(temp_values) / 10),
        )

    def estimate_surface_quality(
        self,
        ae_rms_values: list[float],
    ) -> SurfaceQualityEstimate:
        """Estimate surface finish quality from acoustic emission RMS.

        Higher AE RMS generally correlates with rougher surface finish.
        Empirical mapping: Ra ~ k * AE_RMS (material-dependent).
        """
        if not ae_rms_values:
            return SurfaceQualityEstimate()

        mean_ae = float(np.mean(ae_rms_values))

        # Simplified empirical mapping (k factor varies by material)
        # AE RMS 0.1 -> Ra ~0.2 µm, AE RMS 1.0 -> Ra ~2.0 µm
        estimated_ra = mean_ae * 2.0

        if estimated_ra < 0.4:
            grade = "excellent"
        elif estimated_ra < 0.8:
            grade = "good"
        elif estimated_ra < 1.6:
            grade = "acceptable"
        else:
            grade = "poor"

        return SurfaceQualityEstimate(
            estimated_ra_um=estimated_ra,
            quality_grade=grade,
            confidence=0.6,
        )

    def predict_from_model(
        self,
        model: CorrelationResult,
        input_value: float,
    ) -> float:
        """Use a fitted model to predict output from input."""
        if len(model.coefficients) < 2:
            return 0.0
        return model.coefficients[0] * input_value + model.coefficients[1]
