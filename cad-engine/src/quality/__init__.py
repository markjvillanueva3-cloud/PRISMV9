"""Quality Feedback Learning — CC-EXT-MS4.

Learns from CMM/quality inspection results to improve parameter predictions.
Covers DMIS/QIF import, tolerance correlation, surface finish refinement,
and dimensional accuracy modeling.
"""

from .inspection_schema import (
    FeatureType,
    ToleranceStatus,
    InspectionFeature,
    SurfaceFinishResult,
    InspectionResult,
    InspectionSession,
)
from .cmm_importer import (
    CMMImporter,
    DMISParser,
    QIFParser,
    VendorFormat,
)
from .tolerance_correlator import (
    ToleranceCorrelator,
    CuttingParameterRecord,
    ToleranceCorrelationEntry,
    TolerancePrediction,
    SensitivityResult,
    deviation_to_it_grade,
)

__all__ = [
    "FeatureType",
    "ToleranceStatus",
    "InspectionFeature",
    "SurfaceFinishResult",
    "InspectionResult",
    "InspectionSession",
    "CMMImporter",
    "DMISParser",
    "QIFParser",
    "VendorFormat",
    "ToleranceCorrelator",
    "CuttingParameterRecord",
    "ToleranceCorrelationEntry",
    "TolerancePrediction",
    "SensitivityResult",
    "deviation_to_it_grade",
]
