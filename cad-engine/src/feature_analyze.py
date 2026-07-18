"""Feature Analyzer — CC-MS9.

SAFETY-CRITICAL: Extracts geometric features from CadQuery models
for manufacturability validation. Identifies holes, pockets, slots,
walls, bosses, radii with dimensions and tolerance requirements.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Feature Types
# ---------------------------------------------------------------------------

class FeatureType(str, Enum):
    HOLE = "hole"
    POCKET = "pocket"
    SLOT = "slot"
    WALL = "wall"
    BOSS = "boss"
    FILLET = "fillet"
    CHAMFER = "chamfer"
    THREAD = "thread"
    COUNTERBORE = "counterbore"
    COUNTERSINK = "countersink"
    GROOVE = "groove"
    FACE = "face"
    STEP = "step"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class FeatureDimension:
    """A dimension extracted from a feature."""

    name: str  # "diameter", "depth", "width", "height", "radius", "length"
    value: float
    unit: str = "mm"
    tolerance_plus: float = 0.0
    tolerance_minus: float = 0.0
    is_critical: bool = False

    @property
    def tolerance_total(self) -> float:
        return abs(self.tolerance_plus) + abs(self.tolerance_minus)


@dataclass
class GeometricFeature:
    """A single extracted geometric feature."""

    feature_id: str
    feature_type: FeatureType
    dimensions: list[FeatureDimension] = field(default_factory=list)
    position: tuple[float, float, float] = (0.0, 0.0, 0.0)
    orientation: tuple[float, float, float] = (0.0, 0.0, 1.0)  # normal vector
    material: str = ""
    requires_finishing: bool = False
    min_tool_diameter: float = 0.0  # computed from geometry
    max_depth: float = 0.0
    aspect_ratio: float = 0.0  # depth/diameter for holes, depth/width for pockets

    def get_dimension(self, name: str) -> FeatureDimension | None:
        for d in self.dimensions:
            if d.name == name:
                return d
        return None

    @property
    def has_tight_tolerance(self) -> bool:
        """Feature has tolerance tighter than +/- 0.05mm."""
        for d in self.dimensions:
            if d.tolerance_total > 0 and d.tolerance_total < 0.10:
                return True
        return False

    @property
    def is_deep(self) -> bool:
        """Feature has aspect ratio > 4:1 (deep pocket/hole)."""
        return self.aspect_ratio > 4.0

    def to_dict(self) -> dict:
        return {
            "feature_id": self.feature_id,
            "feature_type": self.feature_type.value,
            "dimensions": [
                {
                    "name": d.name, "value": d.value, "unit": d.unit,
                    "tolerance_plus": d.tolerance_plus,
                    "tolerance_minus": d.tolerance_minus,
                    "is_critical": d.is_critical,
                }
                for d in self.dimensions
            ],
            "position": list(self.position),
            "orientation": list(self.orientation),
            "material": self.material,
            "requires_finishing": self.requires_finishing,
            "min_tool_diameter": self.min_tool_diameter,
            "max_depth": self.max_depth,
            "aspect_ratio": round(self.aspect_ratio, 2),
            "has_tight_tolerance": self.has_tight_tolerance,
            "is_deep": self.is_deep,
        }


@dataclass
class FeatureAnalysisResult:
    """Result of analyzing a part for geometric features."""

    part_id: str
    feature_count: int = 0
    features: list[GeometricFeature] = field(default_factory=list)
    bounding_box: tuple[float, float, float] = (0.0, 0.0, 0.0)
    material: str = ""
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "part_id": self.part_id,
            "feature_count": self.feature_count,
            "features": [f.to_dict() for f in self.features],
            "bounding_box": list(self.bounding_box),
            "material": self.material,
            "warnings": self.warnings,
        }

    def features_by_type(self, ftype: FeatureType) -> list[GeometricFeature]:
        return [f for f in self.features if f.feature_type == ftype]

    @property
    def critical_features(self) -> list[GeometricFeature]:
        return [f for f in self.features if f.has_tight_tolerance]

    @property
    def deep_features(self) -> list[GeometricFeature]:
        return [f for f in self.features if f.is_deep]


# ---------------------------------------------------------------------------
# FeatureAnalyzer
# ---------------------------------------------------------------------------

class FeatureAnalyzer:
    """Extracts geometric features from part descriptions or CadQuery models.

    Works with structured feature descriptions (dict-based) for testability.
    CadQuery integration is optional.
    """

    def __init__(self, material: str = ""):
        self._material = material

    def analyze(self, part_id: str, features: list[dict]) -> FeatureAnalysisResult:
        """Analyze a list of feature descriptions.

        Args:
            part_id: Unique part identifier.
            features: List of feature dicts with keys:
                - type: FeatureType string
                - dimensions: dict of name -> value
                - tolerances: dict of name -> (plus, minus) (optional)
                - position: [x, y, z] (optional)

        Returns:
            FeatureAnalysisResult with extracted features.
        """
        result = FeatureAnalysisResult(
            part_id=part_id,
            material=self._material,
        )

        for i, feat_dict in enumerate(features):
            feat = self._extract_feature(f"{part_id}-F{i:03d}", feat_dict)
            self._compute_derived(feat)
            result.features.append(feat)

        result.feature_count = len(result.features)

        # Generate warnings
        for feat in result.features:
            if feat.is_deep:
                result.warnings.append(
                    f"{feat.feature_id}: Deep feature (aspect ratio {feat.aspect_ratio:.1f}:1)"
                )
            if feat.has_tight_tolerance:
                result.warnings.append(
                    f"{feat.feature_id}: Tight tolerance detected"
                )

        return result

    def _extract_feature(self, feat_id: str, d: dict) -> GeometricFeature:
        """Extract a single feature from a dict description."""
        ftype = FeatureType(d.get("type", "unknown"))

        dims = []
        for name, value in d.get("dimensions", {}).items():
            tol = d.get("tolerances", {}).get(name, (0.0, 0.0))
            is_critical = abs(tol[0]) + abs(tol[1]) > 0 and abs(tol[0]) + abs(tol[1]) < 0.10
            dims.append(FeatureDimension(
                name=name,
                value=float(value),
                tolerance_plus=float(tol[0]),
                tolerance_minus=float(tol[1]),
                is_critical=is_critical,
            ))

        pos = d.get("position", [0, 0, 0])
        orientation = d.get("orientation", [0, 0, 1])

        return GeometricFeature(
            feature_id=feat_id,
            feature_type=ftype,
            dimensions=dims,
            position=tuple(pos[:3]),
            orientation=tuple(orientation[:3]),
            material=self._material,
        )

    def _compute_derived(self, feat: GeometricFeature) -> None:
        """Compute derived properties (min_tool_diameter, aspect_ratio, etc.)."""
        depth_dim = feat.get_dimension("depth")
        depth = depth_dim.value if depth_dim else 0.0
        feat.max_depth = depth

        if feat.feature_type == FeatureType.HOLE:
            dia = feat.get_dimension("diameter")
            if dia:
                feat.min_tool_diameter = dia.value
                feat.aspect_ratio = depth / dia.value if dia.value > 0 else 0.0

        elif feat.feature_type in (FeatureType.POCKET, FeatureType.SLOT):
            width = feat.get_dimension("width")
            if width:
                feat.min_tool_diameter = width.value * 0.8  # 80% of pocket width
                feat.aspect_ratio = depth / width.value if width.value > 0 else 0.0

        elif feat.feature_type == FeatureType.FILLET:
            radius = feat.get_dimension("radius")
            if radius:
                feat.min_tool_diameter = radius.value * 2

        feat.requires_finishing = feat.has_tight_tolerance
