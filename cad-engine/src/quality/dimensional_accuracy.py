"""Dimensional Accuracy Model — CC-EXT-MS4-P0-U04.

Predicts achievable dimensional accuracy by combining systematic error
sources: thermal expansion, tool deflection, and machine positioning.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np


# ---------------------------------------------------------------------------
# Error source models
# ---------------------------------------------------------------------------

@dataclass
class ThermalExpansionError:
    """Dimensional error from thermal expansion."""
    cte_um_per_m_per_c: float = 11.7  # default steel CTE (µm/m/°C)
    delta_temp_c: float = 0.0
    nominal_dimension_mm: float = 0.0
    dimensional_error_um: float = 0.0

    def compute(self) -> float:
        """Compute thermal expansion error in micrometers."""
        # CTE is in µm/m/°C → for mm dimensions: divide nominal by 1000 to get meters
        self.dimensional_error_um = (
            self.cte_um_per_m_per_c * self.delta_temp_c * self.nominal_dimension_mm / 1000.0
        )
        return self.dimensional_error_um

    def to_dict(self) -> dict:
        return {
            "cte_um_per_m_per_c": self.cte_um_per_m_per_c,
            "delta_temp_c": round(self.delta_temp_c, 2),
            "nominal_dimension_mm": round(self.nominal_dimension_mm, 3),
            "dimensional_error_um": round(self.dimensional_error_um, 3),
        }


@dataclass
class ToolDeflectionError:
    """Dimensional error from tool deflection under cutting forces."""
    cutting_force_n: float = 0.0
    tool_overhang_mm: float = 50.0
    tool_diameter_mm: float = 20.0
    elastic_modulus_gpa: float = 600.0  # carbide default
    deflection_um: float = 0.0

    def compute(self) -> float:
        """Compute tool deflection in micrometers using cantilever beam model.

        δ = F * L^3 / (3 * E * I)
        I = π * d^4 / 64 for circular cross-section.
        """
        if self.cutting_force_n <= 0 or self.tool_diameter_mm <= 0:
            self.deflection_um = 0.0
            return 0.0

        d_m = self.tool_diameter_mm / 1000.0  # to meters
        l_m = self.tool_overhang_mm / 1000.0
        e_pa = self.elastic_modulus_gpa * 1e9

        inertia = np.pi * d_m ** 4 / 64.0
        if inertia == 0 or e_pa == 0:
            self.deflection_um = 0.0
            return 0.0

        deflection_m = self.cutting_force_n * l_m ** 3 / (3.0 * e_pa * inertia)
        self.deflection_um = deflection_m * 1e6  # to micrometers
        return self.deflection_um

    def to_dict(self) -> dict:
        return {
            "cutting_force_n": round(self.cutting_force_n, 1),
            "tool_overhang_mm": round(self.tool_overhang_mm, 1),
            "tool_diameter_mm": round(self.tool_diameter_mm, 1),
            "deflection_um": round(self.deflection_um, 3),
        }


@dataclass
class MachinePositioningError:
    """Dimensional error from machine positioning (backlash, geometric errors)."""
    backlash_um: float = 5.0  # typical for maintained machine
    geometric_error_um: float = 3.0  # linear accuracy per 300mm
    positioning_error_um: float = 0.0
    machine_class: str = "standard"  # "precision", "standard", "workshop"

    _CLASS_DEFAULTS: dict = field(default_factory=lambda: {
        "precision": {"backlash": 2.0, "geometric": 1.0},
        "standard": {"backlash": 5.0, "geometric": 3.0},
        "workshop": {"backlash": 10.0, "geometric": 8.0},
    }, repr=False)

    def compute(self) -> float:
        """Compute positioning error (RSS of backlash + geometric)."""
        if self.machine_class in self._CLASS_DEFAULTS and self.backlash_um == 5.0 and self.geometric_error_um == 3.0:
            defaults = self._CLASS_DEFAULTS[self.machine_class]
            self.backlash_um = defaults["backlash"]
            self.geometric_error_um = defaults["geometric"]

        self.positioning_error_um = np.sqrt(
            self.backlash_um ** 2 + self.geometric_error_um ** 2
        )
        return self.positioning_error_um

    def to_dict(self) -> dict:
        return {
            "backlash_um": round(self.backlash_um, 2),
            "geometric_error_um": round(self.geometric_error_um, 2),
            "positioning_error_um": round(self.positioning_error_um, 3),
            "machine_class": self.machine_class,
        }


# ---------------------------------------------------------------------------
# Combined prediction
# ---------------------------------------------------------------------------

@dataclass
class DimensionalPrediction:
    """Combined dimensional accuracy prediction."""
    thermal_error: ThermalExpansionError = field(default_factory=ThermalExpansionError)
    deflection_error: ToolDeflectionError = field(default_factory=ToolDeflectionError)
    positioning_error: MachinePositioningError = field(default_factory=MachinePositioningError)
    total_error_um: float = 0.0
    uncertainty_um: float = 0.0
    predicted_deviation_um: float = 0.0
    achievable_it_grade: int = 0
    confidence: float = 0.5

    def to_dict(self) -> dict:
        return {
            "thermal_error_um": round(self.thermal_error.dimensional_error_um, 3),
            "deflection_error_um": round(self.deflection_error.deflection_um, 3),
            "positioning_error_um": round(self.positioning_error.positioning_error_um, 3),
            "total_error_um": round(self.total_error_um, 3),
            "uncertainty_um": round(self.uncertainty_um, 3),
            "predicted_deviation_um": round(self.predicted_deviation_um, 3),
            "achievable_it_grade": self.achievable_it_grade,
            "confidence": round(self.confidence, 4),
        }


# IT grade tolerance table (ISO 286-1) for nominal 50mm dimension
# Maps IT grade -> tolerance in µm
_IT_TOLERANCE_50MM = {
    5: 11,
    6: 16,
    7: 25,
    8: 39,
    9: 62,
    10: 100,
    11: 160,
    12: 250,
}


def deviation_to_it_grade(deviation_um: float, nominal_mm: float = 50.0) -> int:
    """Map total deviation to best achievable IT grade.

    Uses ISO 286-1 tolerance table scaled for nominal dimension.
    """
    if deviation_um <= 0:
        return 5  # best we track

    # Scale tolerance for nominal size (simplified)
    # IT tolerance scales roughly as cube root of nominal dimension
    if nominal_mm > 0:
        scale = (nominal_mm / 50.0) ** (1.0 / 3.0)
    else:
        scale = 1.0

    for grade in sorted(_IT_TOLERANCE_50MM.keys()):
        tolerance = _IT_TOLERANCE_50MM[grade] * scale
        if deviation_um * 2 <= tolerance:  # deviation is half the tolerance zone
            return grade

    return 12  # worst we track


class DimensionalAccuracyModel:
    """Multi-factor dimensional accuracy prediction.

    Combines thermal expansion, tool deflection, and machine positioning
    errors using root-sum-square (RSS) method with uncertainty propagation.
    """

    # Material CTE values (µm/m/°C)
    MATERIAL_CTE = {
        "steel": 11.7,
        "stainless_steel": 17.3,
        "aluminum": 23.1,
        "titanium": 8.6,
        "cast_iron": 10.5,
        "copper": 16.5,
        "brass": 19.0,
        "inconel": 13.0,
    }

    def predict(
        self,
        nominal_dimension_mm: float = 50.0,
        delta_temp_c: float = 5.0,
        material: str = "steel",
        cutting_force_n: float = 500.0,
        tool_overhang_mm: float = 50.0,
        tool_diameter_mm: float = 20.0,
        tool_material: str = "carbide",
        machine_class: str = "standard",
        backlash_um: Optional[float] = None,
        geometric_error_um: Optional[float] = None,
    ) -> DimensionalPrediction:
        """Predict dimensional accuracy for given conditions."""
        pred = DimensionalPrediction()

        # 1. Thermal expansion
        cte = self.MATERIAL_CTE.get(material.lower(), 11.7)
        pred.thermal_error = ThermalExpansionError(
            cte_um_per_m_per_c=cte,
            delta_temp_c=delta_temp_c,
            nominal_dimension_mm=nominal_dimension_mm,
        )
        pred.thermal_error.compute()

        # 2. Tool deflection
        tool_e = {"carbide": 600.0, "hss": 200.0, "ceramic": 350.0, "diamond": 1000.0}
        e_mod = tool_e.get(tool_material.lower(), 600.0)
        pred.deflection_error = ToolDeflectionError(
            cutting_force_n=cutting_force_n,
            tool_overhang_mm=tool_overhang_mm,
            tool_diameter_mm=tool_diameter_mm,
            elastic_modulus_gpa=e_mod,
        )
        pred.deflection_error.compute()

        # 3. Machine positioning
        pred.positioning_error = MachinePositioningError(machine_class=machine_class)
        if backlash_um is not None:
            pred.positioning_error.backlash_um = backlash_um
        if geometric_error_um is not None:
            pred.positioning_error.geometric_error_um = geometric_error_um
        pred.positioning_error.compute()

        # 4. RSS combination
        errors = [
            abs(pred.thermal_error.dimensional_error_um),
            pred.deflection_error.deflection_um,
            pred.positioning_error.positioning_error_um,
        ]
        pred.total_error_um = float(np.sqrt(sum(e ** 2 for e in errors)))

        # 5. Uncertainty (assume 20% of each source as uncertainty)
        uncertainties = [e * 0.2 for e in errors]
        pred.uncertainty_um = float(np.sqrt(sum(u ** 2 for u in uncertainties)))

        # 6. Predicted deviation = total error
        pred.predicted_deviation_um = pred.total_error_um

        # 7. IT grade
        pred.achievable_it_grade = deviation_to_it_grade(
            pred.total_error_um, nominal_dimension_mm)

        # 8. Confidence
        pred.confidence = 0.6
        if backlash_um is not None:
            pred.confidence += 0.1  # known machine data
        if delta_temp_c > 0:
            pred.confidence += 0.05  # thermal model active

        return pred
