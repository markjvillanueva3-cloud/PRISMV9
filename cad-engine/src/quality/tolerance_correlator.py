"""Tolerance-to-Parameter Correlation — CC-EXT-MS4 P0-U02.

Links CMM inspection outcomes to cutting parameters used during
machining.  Maps parameter combinations to ISO tolerance grades,
identifies parameter sensitivities, and builds a tolerance prediction
model.

Key capabilities:
- Join InspectionResults with cutting parameter records
- Map deviations to ISO tolerance grades (IT6-IT12)
- Sensitivity analysis: which parameters most affect each dimension
- Tolerance prediction: given parameters → predicted IT class
- Material stratification: separate models per material family
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


from .inspection_schema import (
    InspectionFeature,
    InspectionResult,
    ToleranceStatus,
)


# ---------------------------------------------------------------------------
# ISO Tolerance Grades (IT)
# ---------------------------------------------------------------------------

# IT grade tolerances in µm for nominal dimension 18-30mm (representative)
# Based on ISO 286-1 table for 18-30mm range
_IT_TABLE_18_30: dict[str, float] = {
    "IT01": 0.3,
    "IT0": 0.5,
    "IT1": 0.8,
    "IT2": 1.2,
    "IT3": 2.0,
    "IT4": 3.0,
    "IT5": 5.0,
    "IT6": 8.0,
    "IT7": 13.0,
    "IT8": 21.0,
    "IT9": 33.0,
    "IT10": 52.0,
    "IT11": 84.0,
    "IT12": 130.0,
    "IT13": 210.0,
    "IT14": 330.0,
    "IT15": 520.0,
    "IT16": 840.0,
}

# Dimension groups: (min_mm, max_mm) → scale factor relative to 18-30mm
_DIM_SCALE: list[tuple[float, float, float]] = [
    (0, 3, 0.56),
    (3, 6, 0.63),
    (6, 10, 0.73),
    (10, 18, 0.87),
    (18, 30, 1.00),
    (30, 50, 1.15),
    (50, 80, 1.30),
    (80, 120, 1.48),
    (120, 180, 1.70),
    (180, 250, 1.96),
    (250, 315, 2.17),
    (315, 400, 2.40),
]


def _dim_scale(nominal_mm: float) -> float:
    """Get dimension scale factor for IT grade lookup."""
    for lo, hi, scale in _DIM_SCALE:
        if lo <= abs(nominal_mm) < hi:
            return scale
    return 2.40  # Beyond 400mm, use largest


def deviation_to_it_grade(deviation_mm: float, nominal_mm: float = 25.0) -> str:
    """Map a measured deviation to the closest ISO tolerance grade.

    Args:
        deviation_mm: Absolute deviation in mm
        nominal_mm: Nominal dimension in mm (for scaling IT table)

    Returns:
        IT grade string (e.g. "IT7", "IT8")
    """
    dev_um = abs(deviation_mm) * 1000.0  # Convert mm to µm
    scale = _dim_scale(nominal_mm)

    best_grade = "IT16"
    for grade, base_tol in _IT_TABLE_18_30.items():
        scaled_tol = base_tol * scale
        if dev_um <= scaled_tol:
            best_grade = grade
            break

    return best_grade


def it_grade_to_numeric(grade: str) -> int:
    """Convert IT grade string to numeric value for comparison."""
    grade = grade.upper().replace("IT", "")
    try:
        return int(grade)
    except ValueError:
        return 16  # Unknown → worst


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class CuttingParameterRecord:
    """Record of cutting parameters used for a specific operation."""
    part_id: str = ""
    operation_id: str = ""
    machine_id: str = ""
    material: str = ""
    operation_type: str = ""  # "milling", "turning", "drilling"
    # Parameters
    cutting_speed_mpm: float = 0.0   # m/min
    feed_per_tooth_mm: float = 0.0   # mm/tooth (milling)
    feed_per_rev_mm: float = 0.0     # mm/rev (turning/drilling)
    depth_of_cut_mm: float = 0.0     # mm
    width_of_cut_mm: float = 0.0     # mm (milling)
    spindle_rpm: float = 0.0
    tool_diameter_mm: float = 0.0
    tool_nose_radius_mm: float = 0.0
    tool_wear_vb_mm: float = 0.0     # Flank wear VB
    coolant_type: str = ""           # "flood", "mql", "dry"

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v}

    @property
    def param_vector(self) -> dict[str, float]:
        """Return numeric parameters as a dict for regression."""
        return {
            "cutting_speed": self.cutting_speed_mpm,
            "feed_per_tooth": self.feed_per_tooth_mm,
            "feed_per_rev": self.feed_per_rev_mm,
            "depth_of_cut": self.depth_of_cut_mm,
            "width_of_cut": self.width_of_cut_mm,
            "tool_diameter": self.tool_diameter_mm,
            "tool_nose_radius": self.tool_nose_radius_mm,
            "tool_wear_vb": self.tool_wear_vb_mm,
        }


@dataclass
class ToleranceCorrelationEntry:
    """A single correlation data point: feature outcome + parameters used."""
    feature: InspectionFeature
    parameters: CuttingParameterRecord
    it_grade: str = ""
    it_numeric: int = 0
    material: str = ""

    def __post_init__(self):
        if not self.it_grade and self.feature.deviation != 0.0:
            self.it_grade = deviation_to_it_grade(
                self.feature.deviation, self.feature.nominal_value or 25.0
            )
            self.it_numeric = it_grade_to_numeric(self.it_grade)
        if not self.material:
            self.material = self.parameters.material


@dataclass
class SensitivityResult:
    """Parameter sensitivity analysis result for a feature dimension."""
    parameter_name: str
    correlation: float  # Pearson correlation with deviation
    importance: float   # Normalized importance (0-1)
    direction: str      # "positive" or "negative" (deviation increases/decreases with param)

    def to_dict(self) -> dict:
        return {
            "parameter_name": self.parameter_name,
            "correlation": round(self.correlation, 4),
            "importance": round(self.importance, 4),
            "direction": self.direction,
        }


@dataclass
class TolerancePrediction:
    """Predicted tolerance capability for given parameters."""
    predicted_it_grade: str
    predicted_it_numeric: int
    predicted_deviation_mm: float
    confidence: float
    contributing_factors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "predicted_it_grade": self.predicted_it_grade,
            "predicted_it_numeric": self.predicted_it_numeric,
            "predicted_deviation_mm": round(self.predicted_deviation_mm, 6),
            "confidence": round(self.confidence, 4),
            "contributing_factors": self.contributing_factors,
        }


# ---------------------------------------------------------------------------
# Tolerance Correlator
# ---------------------------------------------------------------------------

class ToleranceCorrelator:
    """Links inspection outcomes to cutting parameters.

    Builds correlation models to predict achievable tolerance grades
    from cutting parameter combinations.
    """

    def __init__(self):
        self._entries: list[ToleranceCorrelationEntry] = []
        self._model_trained = False
        # Learned coefficients per parameter (simple linear model)
        self._coefficients: dict[str, float] = {}
        self._intercept: float = 0.0
        self._material_offsets: dict[str, float] = {}

    @property
    def entry_count(self) -> int:
        return len(self._entries)

    def add_correlation(
        self,
        inspection: InspectionResult,
        parameters: CuttingParameterRecord,
    ) -> list[ToleranceCorrelationEntry]:
        """Join an inspection result with its cutting parameters.

        Creates one ToleranceCorrelationEntry per evaluated feature.
        """
        entries = []
        for feat in inspection.features:
            if feat.status == ToleranceStatus.NOT_EVALUATED:
                continue

            entry = ToleranceCorrelationEntry(
                feature=feat,
                parameters=parameters,
                material=parameters.material or inspection.material,
            )
            self._entries.append(entry)
            entries.append(entry)

        self._model_trained = False
        return entries

    def get_it_grade_distribution(self) -> dict[str, int]:
        """Get distribution of IT grades across all entries."""
        dist: dict[str, int] = {}
        for e in self._entries:
            grade = e.it_grade
            dist[grade] = dist.get(grade, 0) + 1
        return dist

    def sensitivity_analysis(
        self,
        material: Optional[str] = None,
    ) -> list[SensitivityResult]:
        """Identify which parameters most affect dimensional deviation.

        Uses Pearson correlation between each parameter and absolute deviation.
        """
        entries = self._filter_by_material(material)
        if len(entries) < 3:
            return []

        # Collect parameter-deviation pairs
        param_names = [
            "cutting_speed", "feed_per_tooth", "feed_per_rev",
            "depth_of_cut", "tool_wear_vb",
        ]

        results = []
        for pname in param_names:
            x_vals = [e.parameters.param_vector.get(pname, 0.0) for e in entries]
            y_vals = [abs(e.feature.deviation) for e in entries]

            # Skip if all x values are the same
            if len(set(x_vals)) <= 1:
                continue

            corr = self._pearson_correlation(x_vals, y_vals)
            if corr is not None:
                results.append(SensitivityResult(
                    parameter_name=pname,
                    correlation=corr,
                    importance=abs(corr),
                    direction="positive" if corr > 0 else "negative",
                ))

        # Sort by importance (descending)
        results.sort(key=lambda r: r.importance, reverse=True)

        # Normalize importance to 0-1 range
        if results:
            max_imp = results[0].importance
            if max_imp > 0:
                for r in results:
                    r.importance = r.importance / max_imp

        return results

    def train_model(self, material: Optional[str] = None) -> dict[str, float]:
        """Train a simple prediction model from accumulated data.

        Uses multivariate linear regression (closed-form OLS) to learn
        coefficients mapping parameter values to deviation magnitude.

        Returns learned coefficients.
        """
        entries = self._filter_by_material(material)
        if len(entries) < 2:
            return {}

        # Build feature matrix and target
        param_keys = ["cutting_speed", "feed_per_tooth", "feed_per_rev",
                      "depth_of_cut", "tool_wear_vb"]

        X: list[list[float]] = []
        y: list[float] = []
        for e in entries:
            row = [e.parameters.param_vector.get(k, 0.0) for k in param_keys]
            X.append(row)
            y.append(abs(e.feature.deviation))

        # Normalize features
        means = [0.0] * len(param_keys)
        stds = [1.0] * len(param_keys)
        for j in range(len(param_keys)):
            col = [X[i][j] for i in range(len(X))]
            m = sum(col) / len(col)
            means[j] = m
            s = math.sqrt(sum((v - m) ** 2 for v in col) / max(len(col) - 1, 1))
            stds[j] = s if s > 1e-10 else 1.0

        X_norm = [[(X[i][j] - means[j]) / stds[j] for j in range(len(param_keys))]
                  for i in range(len(X))]

        y_mean = sum(y) / len(y)
        y_norm = [v - y_mean for v in y]

        # OLS: coefficients = (X^T X)^-1 X^T y (simplified for small data)
        n_features = len(param_keys)
        coeffs = [0.0] * n_features

        for j in range(n_features):
            xj = [X_norm[i][j] for i in range(len(X_norm))]
            dot_xy = sum(xj[i] * y_norm[i] for i in range(len(xj)))
            dot_xx = sum(xj[i] * xj[i] for i in range(len(xj)))
            if dot_xx > 1e-10:
                coeffs[j] = dot_xy / dot_xx

        # Store model
        self._coefficients = {}
        for j, k in enumerate(param_keys):
            self._coefficients[k] = coeffs[j] / stds[j] if stds[j] > 1e-10 else 0.0
        self._intercept = y_mean - sum(
            self._coefficients[k] * means[j]
            for j, k in enumerate(param_keys)
        )

        # Learn material offsets
        if material is None:
            materials = set(e.material for e in entries if e.material)
            for mat in materials:
                mat_entries = [e for e in entries if e.material == mat]
                if mat_entries:
                    mat_mean_dev = sum(abs(e.feature.deviation) for e in mat_entries) / len(mat_entries)
                    global_mean_dev = sum(y) / len(y)
                    self._material_offsets[mat] = mat_mean_dev - global_mean_dev

        self._model_trained = True
        return dict(self._coefficients)

    def predict(
        self,
        parameters: CuttingParameterRecord,
        nominal_mm: float = 25.0,
    ) -> TolerancePrediction:
        """Predict achievable tolerance for given cutting parameters.

        Falls back to heuristic model if not enough training data.
        """
        if self._model_trained and self._coefficients:
            return self._predict_trained(parameters, nominal_mm)
        return self._predict_heuristic(parameters, nominal_mm)

    def get_entries_by_material(self, material: str) -> list[ToleranceCorrelationEntry]:
        """Get all correlation entries for a specific material."""
        return [e for e in self._entries if e.material.lower() == material.lower()]

    # -------------------------------------------------------------------
    # Internal
    # -------------------------------------------------------------------

    def _filter_by_material(
        self, material: Optional[str]
    ) -> list[ToleranceCorrelationEntry]:
        if material is None:
            return list(self._entries)
        return [e for e in self._entries
                if e.material.lower() == material.lower()]

    def _predict_trained(
        self, params: CuttingParameterRecord, nominal_mm: float
    ) -> TolerancePrediction:
        """Predict using trained linear model."""
        pv = params.param_vector
        deviation = self._intercept
        factors = []

        for k, coeff in self._coefficients.items():
            val = pv.get(k, 0.0)
            contribution = coeff * val
            deviation += contribution
            if abs(coeff) > 1e-8 and val != 0.0:
                factors.append(k)

        # Apply material offset
        if params.material in self._material_offsets:
            deviation += self._material_offsets[params.material]

        deviation = max(deviation, 0.0)
        grade = deviation_to_it_grade(deviation, nominal_mm)

        # Confidence based on training data size
        n = len(self._entries)
        confidence = min(0.5 + 0.05 * n, 0.95)

        return TolerancePrediction(
            predicted_it_grade=grade,
            predicted_it_numeric=it_grade_to_numeric(grade),
            predicted_deviation_mm=deviation,
            confidence=confidence,
            contributing_factors=factors,
        )

    def _predict_heuristic(
        self, params: CuttingParameterRecord, nominal_mm: float
    ) -> TolerancePrediction:
        """Heuristic prediction when model not trained.

        Uses empirical relationships between feed/speed and typical
        achievable tolerances.
        """
        # Base deviation estimate from feed rate (dominant factor)
        feed = max(params.feed_per_tooth_mm, params.feed_per_rev_mm, 0.05)
        # Typical: deviation ≈ 10-30% of feed rate in mm
        base_deviation = feed * 0.15

        # Wear correction: higher wear → larger deviation
        if params.tool_wear_vb_mm > 0:
            wear_factor = 1.0 + (params.tool_wear_vb_mm / 0.3)  # VB=0.3 doubles deviation
            base_deviation *= wear_factor

        # Speed correction: very high or very low speed increases deviation
        if params.cutting_speed_mpm > 0:
            optimal_speed = 200.0  # Rough middle ground
            speed_ratio = params.cutting_speed_mpm / optimal_speed
            if speed_ratio > 2.0 or speed_ratio < 0.3:
                base_deviation *= 1.3

        # DOC correction: deeper cut → more force → more deviation
        if params.depth_of_cut_mm > 3.0:
            base_deviation *= 1.0 + (params.depth_of_cut_mm - 3.0) * 0.05

        grade = deviation_to_it_grade(base_deviation, nominal_mm)

        return TolerancePrediction(
            predicted_it_grade=grade,
            predicted_it_numeric=it_grade_to_numeric(grade),
            predicted_deviation_mm=max(base_deviation, 0.0),
            confidence=0.3,  # Low confidence for heuristic
            contributing_factors=["feed_rate", "tool_wear", "cutting_speed"],
        )

    @staticmethod
    def _pearson_correlation(x: list[float], y: list[float]) -> Optional[float]:
        """Compute Pearson correlation coefficient."""
        n = len(x)
        if n < 2:
            return None

        x_mean = sum(x) / n
        y_mean = sum(y) / n

        num = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        den_x = math.sqrt(sum((v - x_mean) ** 2 for v in x))
        den_y = math.sqrt(sum((v - y_mean) ** 2 for v in y))

        if den_x < 1e-10 or den_y < 1e-10:
            return None

        return num / (den_x * den_y)
