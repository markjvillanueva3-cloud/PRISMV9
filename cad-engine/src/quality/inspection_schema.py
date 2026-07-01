"""Inspection Schema — CC-EXT-MS4 P0-U01.

Core data model for CMM/quality inspection data.
Supports DMIS and QIF formats with unified representation
of measured features, deviations, tolerances, and surface finish.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class FeatureType(str, Enum):
    """Measured geometric feature types from CMM inspection."""
    POINT = "point"
    LINE = "line"
    PLANE = "plane"
    CIRCLE = "circle"
    CYLINDER = "cylinder"
    CONE = "cone"
    SPHERE = "sphere"
    SLOT = "slot"
    BOSS = "boss"
    DISTANCE = "distance"
    ANGLE = "angle"
    PROFILE = "profile"
    POSITION = "position"
    RUNOUT = "runout"
    CONCENTRICITY = "concentricity"
    FLATNESS = "flatness"
    ROUNDNESS = "roundness"
    PERPENDICULARITY = "perpendicularity"
    PARALLELISM = "parallelism"
    SYMMETRY = "symmetry"


class ToleranceStatus(str, Enum):
    """Whether a measured feature is within tolerance."""
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"  # Within tolerance but close to limit (>80% of zone)
    NOT_EVALUATED = "not_evaluated"


class VendorFormat(str, Enum):
    """CMM software vendor output formats."""
    DMIS_STANDARD = "dmis_standard"
    PC_DMIS = "pc_dmis"
    CALYPSO = "calypso"
    MCOSMOS = "mcosmos"
    QIF_STANDARD = "qif_standard"
    GENERIC_CSV = "generic_csv"


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------

@dataclass
class SurfaceFinishResult:
    """Surface roughness measurement result."""
    ra: Optional[float] = None       # Arithmetic mean roughness (µm)
    rz: Optional[float] = None       # Average maximum height (µm)
    rmax: Optional[float] = None     # Maximum roughness depth (µm)
    rq: Optional[float] = None       # Root mean square roughness (µm)
    measurement_length_mm: float = 4.0
    cutoff_mm: float = 0.8
    location: str = ""               # Where on the part
    instrument: str = ""             # Profilometer model

    def to_dict(self) -> dict:
        return {
            "ra": round(self.ra, 4) if self.ra is not None else None,
            "rz": round(self.rz, 4) if self.rz is not None else None,
            "rmax": round(self.rmax, 4) if self.rmax is not None else None,
            "rq": round(self.rq, 4) if self.rq is not None else None,
            "measurement_length_mm": self.measurement_length_mm,
            "cutoff_mm": self.cutoff_mm,
            "location": self.location,
            "instrument": self.instrument,
        }


@dataclass
class InspectionFeature:
    """A single measured feature from CMM inspection.

    Contains nominal geometry, actual measurement, deviation,
    and tolerance evaluation.
    """
    feature_id: str = ""
    feature_name: str = ""
    feature_type: FeatureType = FeatureType.POINT
    # Nominal (design) values
    nominal_value: float = 0.0
    nominal_x: float = 0.0
    nominal_y: float = 0.0
    nominal_z: float = 0.0
    # Actual (measured) values
    actual_value: float = 0.0
    actual_x: float = 0.0
    actual_y: float = 0.0
    actual_z: float = 0.0
    # Deviation
    deviation: float = 0.0
    # Tolerance
    upper_tolerance: float = 0.0
    lower_tolerance: float = 0.0
    tolerance_zone: float = 0.0  # upper - lower
    status: ToleranceStatus = ToleranceStatus.NOT_EVALUATED
    # Surface finish at this feature (if measured)
    surface_finish: Optional[SurfaceFinishResult] = None
    # Traceability
    datum_references: list[str] = field(default_factory=list)
    unit: str = "mm"

    def __post_init__(self):
        if not self.feature_id:
            self.feature_id = f"F-{uuid.uuid4().hex[:6]}"
        if self.tolerance_zone == 0.0 and (self.upper_tolerance != 0.0 or self.lower_tolerance != 0.0):
            self.tolerance_zone = self.upper_tolerance - self.lower_tolerance
        if self.deviation == 0.0 and self.actual_value != 0.0:
            self.deviation = self.actual_value - self.nominal_value

    def evaluate_tolerance(self) -> ToleranceStatus:
        """Evaluate whether the feature is within tolerance."""
        if self.tolerance_zone == 0.0:
            return ToleranceStatus.NOT_EVALUATED

        if self.lower_tolerance <= self.deviation <= self.upper_tolerance:
            # Check if close to limit (warning zone = within 20% of zone from a limit)
            zone = self.tolerance_zone
            if zone > 0:
                dist_to_nearest_limit = min(
                    abs(self.upper_tolerance - self.deviation),
                    abs(self.deviation - self.lower_tolerance),
                )
                if dist_to_nearest_limit < 0.1 * zone:
                    self.status = ToleranceStatus.WARNING
                    return ToleranceStatus.WARNING
            self.status = ToleranceStatus.PASS
            return ToleranceStatus.PASS
        else:
            self.status = ToleranceStatus.FAIL
            return ToleranceStatus.FAIL

    def to_dict(self) -> dict:
        d = {
            "feature_id": self.feature_id,
            "feature_name": self.feature_name,
            "feature_type": self.feature_type.value,
            "nominal_value": round(self.nominal_value, 4),
            "actual_value": round(self.actual_value, 4),
            "deviation": round(self.deviation, 6),
            "upper_tolerance": round(self.upper_tolerance, 4),
            "lower_tolerance": round(self.lower_tolerance, 4),
            "tolerance_zone": round(self.tolerance_zone, 4),
            "status": self.status.value,
            "unit": self.unit,
        }
        if self.surface_finish:
            d["surface_finish"] = self.surface_finish.to_dict()
        return d


@dataclass
class InspectionResult:
    """Complete inspection result for one part.

    Links measured features to part/operation/machine for traceability.
    """
    result_id: str = ""
    part_id: str = ""
    operation_id: str = ""
    machine_id: str = ""
    program_name: str = ""
    operator_id: str = ""
    # Part info
    part_number: str = ""
    revision: str = ""
    material: str = ""
    # Features
    features: list[InspectionFeature] = field(default_factory=list)
    surface_finishes: list[SurfaceFinishResult] = field(default_factory=list)
    # Metadata
    inspection_date: float = 0.0
    cmm_model: str = ""
    vendor_format: VendorFormat = VendorFormat.DMIS_STANDARD
    source_file: str = ""
    notes: str = ""

    def __post_init__(self):
        if not self.result_id:
            self.result_id = f"IR-{uuid.uuid4().hex[:8]}"
        if self.inspection_date == 0.0:
            self.inspection_date = time.time()

    @property
    def total_features(self) -> int:
        return len(self.features)

    @property
    def pass_count(self) -> int:
        return sum(1 for f in self.features if f.status == ToleranceStatus.PASS)

    @property
    def fail_count(self) -> int:
        return sum(1 for f in self.features if f.status == ToleranceStatus.FAIL)

    @property
    def warning_count(self) -> int:
        return sum(1 for f in self.features if f.status == ToleranceStatus.WARNING)

    @property
    def pass_rate(self) -> float:
        evaluated = sum(1 for f in self.features if f.status != ToleranceStatus.NOT_EVALUATED)
        if evaluated == 0:
            return 0.0
        return self.pass_count / evaluated

    def evaluate_all(self) -> None:
        """Evaluate tolerance status for all features."""
        for feat in self.features:
            feat.evaluate_tolerance()

    def get_features_by_type(self, feature_type: FeatureType) -> list[InspectionFeature]:
        return [f for f in self.features if f.feature_type == feature_type]

    def get_failed_features(self) -> list[InspectionFeature]:
        return [f for f in self.features if f.status == ToleranceStatus.FAIL]

    def to_dict(self) -> dict:
        return {
            "result_id": self.result_id,
            "part_id": self.part_id,
            "operation_id": self.operation_id,
            "machine_id": self.machine_id,
            "part_number": self.part_number,
            "material": self.material,
            "total_features": self.total_features,
            "pass_count": self.pass_count,
            "fail_count": self.fail_count,
            "warning_count": self.warning_count,
            "pass_rate": round(self.pass_rate, 4),
            "features": [f.to_dict() for f in self.features],
            "surface_finishes": [sf.to_dict() for sf in self.surface_finishes],
            "vendor_format": self.vendor_format.value,
            "source_file": self.source_file,
        }


@dataclass
class InspectionSession:
    """A collection of inspection results from one session/batch."""
    session_id: str = ""
    results: list[InspectionResult] = field(default_factory=list)
    total_parts_inspected: int = 0
    timestamp: float = 0.0

    def __post_init__(self):
        if not self.session_id:
            self.session_id = f"IS-{uuid.uuid4().hex[:8]}"
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def add_result(self, result: InspectionResult) -> None:
        self.results.append(result)
        self.total_parts_inspected = len(self.results)

    @property
    def overall_pass_rate(self) -> float:
        if not self.results:
            return 0.0
        total_evaluated = 0
        total_pass = 0
        for r in self.results:
            for f in r.features:
                if f.status != ToleranceStatus.NOT_EVALUATED:
                    total_evaluated += 1
                    if f.status == ToleranceStatus.PASS:
                        total_pass += 1
        return total_pass / total_evaluated if total_evaluated > 0 else 0.0

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "total_parts_inspected": self.total_parts_inspected,
            "overall_pass_rate": round(self.overall_pass_rate, 4),
            "results": [r.to_dict() for r in self.results],
        }
