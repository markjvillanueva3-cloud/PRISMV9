"""Surface Finish Prediction Refinement — CC-EXT-MS4-P0-U03.

Refines Ra/Rz predictions using actual CMM measurements.
Baseline: theoretical Ra = f^2 / (32 * r), augmented with learned
empirical correction factors for material, wear, vibration, coolant.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from .inspection_schema import SurfaceFinishResult


# ---------------------------------------------------------------------------
# Correction factors
# ---------------------------------------------------------------------------

@dataclass
class CorrectionFactors:
    """Multiplicative correction factors for surface finish prediction."""
    material_hardness: float = 1.0   # <1 harder is better, >1 softer is worse (BUE)
    tool_wear: float = 1.0           # increases with wear
    vibration: float = 1.0           # increases with vibration
    coolant: float = 1.0             # <1 good coolant helps, >1 dry/poor coolant
    thermal_damage: float = 1.0      # >1 when thermal effects degrade surface

    @property
    def combined(self) -> float:
        return (self.material_hardness * self.tool_wear * self.vibration
                * self.coolant * self.thermal_damage)

    def to_dict(self) -> dict:
        return {
            "material_hardness": round(self.material_hardness, 4),
            "tool_wear": round(self.tool_wear, 4),
            "vibration": round(self.vibration, 4),
            "coolant": round(self.coolant, 4),
            "thermal_damage": round(self.thermal_damage, 4),
            "combined": round(self.combined, 4),
        }


@dataclass
class SurfaceFinishPrediction:
    """Predicted surface finish with correction factors."""
    theoretical_ra_um: float = 0.0
    corrected_ra_um: float = 0.0
    predicted_rz_um: float = 0.0
    corrections: CorrectionFactors = field(default_factory=CorrectionFactors)
    confidence: float = 0.5
    ra_rz_ratio: float = 4.0  # default ISO approximation Rz ≈ 4*Ra

    def to_dict(self) -> dict:
        return {
            "theoretical_ra_um": round(self.theoretical_ra_um, 3),
            "corrected_ra_um": round(self.corrected_ra_um, 3),
            "predicted_rz_um": round(self.predicted_rz_um, 3),
            "corrections": self.corrections.to_dict(),
            "confidence": round(self.confidence, 4),
            "ra_rz_ratio": round(self.ra_rz_ratio, 3),
        }


@dataclass
class TrainingDataPoint:
    """One measurement for model training."""
    feed_mm_rev: float = 0.0
    nose_radius_mm: float = 0.0
    cutting_speed_mpm: float = 0.0
    material_hardness_hrc: float = 0.0  # 0 = unknown
    wear_index: float = 0.0  # 0-1
    vibration_rms: float = 0.0
    coolant_type: str = "flood"  # "flood", "mql", "dry"
    measured_ra_um: float = 0.0
    measured_rz_um: float = 0.0
    material: str = ""
    operation: str = ""
    tool_id: str = ""


# ---------------------------------------------------------------------------
# Non-linear effect models
# ---------------------------------------------------------------------------

def _bue_correction(cutting_speed_mpm: float, material_hardness_hrc: float) -> float:
    """Built-up edge correction for soft materials at low speeds.

    BUE forms at low cutting speeds with soft/ductile materials,
    degrading surface finish significantly.
    """
    if material_hardness_hrc <= 0 or cutting_speed_mpm <= 0:
        return 1.0

    # BUE risk: soft material (<25 HRC) + low speed (<80 m/min)
    if material_hardness_hrc < 25 and cutting_speed_mpm < 80:
        # BUE factor: worse at lower speeds, peaks around 20-40 m/min
        speed_factor = max(0, 1.0 - cutting_speed_mpm / 80.0)
        softness = max(0, 1.0 - material_hardness_hrc / 25.0)
        return 1.0 + 1.5 * speed_factor * softness
    return 1.0


def _chatter_mark_correction(vibration_rms: float, threshold: float = 0.5) -> float:
    """Chatter mark correction for unstable cuts.

    High vibration RMS indicates chatter, which leaves visible marks.
    """
    if vibration_rms <= threshold:
        return 1.0
    excess = (vibration_rms - threshold) / threshold
    return 1.0 + min(3.0, excess * 1.5)


def _thermal_damage_correction(
    cutting_speed_mpm: float,
    material_hardness_hrc: float,
) -> float:
    """Thermal damage correction for hard materials at high speeds.

    Hard materials (>55 HRC) at high speeds risk white layer /
    rehardening, degrading the sub-surface and surface finish.
    """
    if material_hardness_hrc < 55 or cutting_speed_mpm <= 0:
        return 1.0
    # Risk increases with speed for hard materials
    if cutting_speed_mpm > 200:
        speed_excess = (cutting_speed_mpm - 200) / 200
        hardness_factor = (material_hardness_hrc - 55) / 15  # normalized 55-70 HRC
        return 1.0 + min(2.0, speed_excess * hardness_factor * 0.5)
    return 1.0


# ---------------------------------------------------------------------------
# Surface Finish Model
# ---------------------------------------------------------------------------

def theoretical_ra(feed_mm_rev: float, nose_radius_mm: float) -> float:
    """Theoretical surface roughness Ra = f^2 / (32 * r).

    Args:
        feed_mm_rev: Feed rate in mm/rev.
        nose_radius_mm: Tool nose radius in mm.

    Returns:
        Theoretical Ra in micrometers.
    """
    if feed_mm_rev <= 0 or nose_radius_mm <= 0:
        return 0.0
    # Formula gives Ra in mm, convert to µm (*1000)
    ra_mm = (feed_mm_rev ** 2) / (32 * nose_radius_mm)
    return ra_mm * 1000.0


class SurfaceFinishModel:
    """Empirically-refined surface finish prediction model.

    Starts with theoretical Ra = f^2/(32*r), then applies learned
    correction factors from actual CMM measurements.
    """

    def __init__(self):
        self._training_data: list[TrainingDataPoint] = []
        # Learned correction factors per key (material-operation-tool)
        self._learned_corrections: dict[str, CorrectionFactors] = {}
        # Learned Ra/Rz ratios per key
        self._learned_rz_ratios: dict[str, float] = {}
        # Global learned corrections from all data
        self._global_wear_slope: float = 0.5  # default: Ra increases 50% per wear unit
        self._global_rz_ratio: float = 4.0

    @property
    def training_count(self) -> int:
        return len(self._training_data)

    def predict(
        self,
        feed_mm_rev: float,
        nose_radius_mm: float,
        cutting_speed_mpm: float = 150.0,
        material_hardness_hrc: float = 0.0,
        wear_index: float = 0.0,
        vibration_rms: float = 0.0,
        coolant_type: str = "flood",
        material: str = "",
        operation: str = "",
        tool_id: str = "",
    ) -> SurfaceFinishPrediction:
        """Predict surface finish with corrections."""
        theo_ra = theoretical_ra(feed_mm_rev, nose_radius_mm)

        # Build correction factors
        corrections = CorrectionFactors()

        # Material hardness effect
        corrections.material_hardness = _bue_correction(cutting_speed_mpm, material_hardness_hrc)

        # Tool wear effect
        corrections.tool_wear = 1.0 + self._global_wear_slope * wear_index

        # Vibration / chatter effect
        corrections.vibration = _chatter_mark_correction(vibration_rms)

        # Coolant effect
        coolant_factors = {"flood": 0.9, "mql": 1.0, "dry": 1.15}
        corrections.coolant = coolant_factors.get(coolant_type, 1.0)

        # Thermal damage
        corrections.thermal_damage = _thermal_damage_correction(
            cutting_speed_mpm, material_hardness_hrc)

        # Apply learned corrections if available
        key = self._make_key(material, operation, tool_id)
        if key and key in self._learned_corrections:
            learned = self._learned_corrections[key]
            # Blend learned with physics-based (60% learned, 40% physics)
            corrections.material_hardness = 0.4 * corrections.material_hardness + 0.6 * learned.material_hardness
            corrections.tool_wear = 0.4 * corrections.tool_wear + 0.6 * learned.tool_wear
            corrections.vibration = 0.4 * corrections.vibration + 0.6 * learned.vibration
            corrections.coolant = 0.4 * corrections.coolant + 0.6 * learned.coolant

        corrected_ra = theo_ra * corrections.combined

        # Rz prediction
        rz_ratio = self._learned_rz_ratios.get(key, self._global_rz_ratio) if key else self._global_rz_ratio
        predicted_rz = corrected_ra * rz_ratio

        # Confidence
        confidence = 0.5
        if key and key in self._learned_corrections:
            confidence = 0.75
        if len(self._training_data) > 20:
            confidence = min(0.9, confidence + 0.1)

        return SurfaceFinishPrediction(
            theoretical_ra_um=theo_ra,
            corrected_ra_um=corrected_ra,
            predicted_rz_um=predicted_rz,
            corrections=corrections,
            confidence=confidence,
            ra_rz_ratio=rz_ratio,
        )

    def add_measurement(self, data: TrainingDataPoint) -> None:
        """Add a training data point (actual measurement)."""
        self._training_data.append(data)

    def train(self) -> dict:
        """Learn correction factors from accumulated measurements."""
        if len(self._training_data) < 3:
            return {"status": "insufficient_data", "count": len(self._training_data)}

        # Learn global wear slope
        wear_points = [(d.wear_index, d.measured_ra_um, d.feed_mm_rev, d.nose_radius_mm)
                       for d in self._training_data
                       if d.feed_mm_rev > 0 and d.nose_radius_mm > 0]
        if len(wear_points) >= 3:
            self._learn_wear_slope(wear_points)

        # Learn Ra/Rz ratio
        rz_points = [(d.measured_ra_um, d.measured_rz_um)
                     for d in self._training_data
                     if d.measured_ra_um > 0 and d.measured_rz_um > 0]
        if len(rz_points) >= 3:
            ratios = [rz / ra for ra, rz in rz_points]
            self._global_rz_ratio = float(np.mean(ratios))

        # Learn per-key corrections
        by_key: dict[str, list[TrainingDataPoint]] = {}
        for dp in self._training_data:
            key = self._make_key(dp.material, dp.operation, dp.tool_id)
            if key:
                by_key.setdefault(key, []).append(dp)

        for key, points in by_key.items():
            if len(points) >= 3:
                self._learn_key_corrections(key, points)
            # Learn per-key Rz ratio
            rz_pts = [(p.measured_ra_um, p.measured_rz_um) for p in points
                      if p.measured_ra_um > 0 and p.measured_rz_um > 0]
            if len(rz_pts) >= 2:
                self._learned_rz_ratios[key] = float(np.mean([rz / ra for ra, rz in rz_pts]))

        return {
            "status": "trained",
            "count": len(self._training_data),
            "keys_learned": len(self._learned_corrections),
            "global_wear_slope": round(self._global_wear_slope, 4),
            "global_rz_ratio": round(self._global_rz_ratio, 3),
        }

    def _learn_wear_slope(self, wear_points: list[tuple]) -> None:
        """Learn how wear affects Ra relative to theoretical."""
        ratios = []
        wear_vals = []
        for wear, measured_ra, feed, radius in wear_points:
            theo = theoretical_ra(feed, radius)
            if theo > 0:
                ratios.append(measured_ra / theo)
                wear_vals.append(wear)

        if len(ratios) < 3:
            return

        x = np.array(wear_vals)
        y = np.array(ratios)
        # Fit: ratio = 1 + slope * wear
        if np.std(x) > 0:
            x_mean = np.mean(x)
            y_mean = np.mean(y)
            ss_xy = np.sum((x - x_mean) * (y - y_mean))
            ss_xx = np.sum((x - x_mean) ** 2)
            if ss_xx > 0:
                slope = float(ss_xy / ss_xx)
                self._global_wear_slope = max(0, min(3.0, slope))

    def _learn_key_corrections(self, key: str, points: list[TrainingDataPoint]) -> None:
        """Learn averaged correction factor for a specific key."""
        ratios = []
        for dp in points:
            theo = theoretical_ra(dp.feed_mm_rev, dp.nose_radius_mm)
            if theo > 0 and dp.measured_ra_um > 0:
                ratios.append(dp.measured_ra_um / theo)

        if not ratios:
            return

        avg_ratio = float(np.mean(ratios))
        # Store as an overall multiplicative correction
        # Decomposition is approximate — assign most to material_hardness as catch-all
        self._learned_corrections[key] = CorrectionFactors(
            material_hardness=avg_ratio,
            tool_wear=1.0,
            vibration=1.0,
            coolant=1.0,
        )

    @staticmethod
    def _make_key(material: str, operation: str, tool_id: str) -> str:
        parts = [p for p in [material, operation, tool_id] if p]
        return "-".join(parts) if parts else ""
