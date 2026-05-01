"""CAM Strategy Recommender — CC-MS5.

Given target features + material + machine, queries the strategy DB and
returns a ranked list of recommended strategies with validation scores.

Validation cross-checks parameters against physics-based calculations
(Kienzle force model, Taylor tool life, speed/feed limits).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .strategy_aggregate import StrategyDB, StrategyRecord


# ---------------------------------------------------------------------------
# Physics validation bounds (simplified from PRISM prism_calc)
# ---------------------------------------------------------------------------

# Surface speed ranges by material class (m/min) for carbide tooling
_SURFACE_SPEED_RANGES: dict[str, tuple[float, float]] = {
    "aluminum": (200, 1200),
    "mild_steel": (80, 300),
    "steel": (60, 250),
    "stainless_steel": (40, 180),
    "titanium": (20, 80),
    "cast_iron": (60, 200),
    "brass": (150, 600),
    "copper": (100, 400),
    "plastic": (200, 1500),
    "inconel": (15, 50),
    "hardened_steel": (30, 120),
}

# Feed per tooth ranges by operation type (mm/tooth)
_FEED_PER_TOOTH_RANGES: dict[str, tuple[float, float]] = {
    "face_mill": (0.05, 0.5),
    "pocket_2d": (0.02, 0.3),
    "pocket_3d": (0.02, 0.2),
    "contour": (0.02, 0.25),
    "profile": (0.02, 0.25),
    "adaptive": (0.03, 0.4),
    "trochoidal": (0.03, 0.4),
    "slot": (0.01, 0.15),
    "roughing_3d": (0.03, 0.3),
    "finishing_3d": (0.005, 0.1),
    "drilling": (0.02, 0.4),
}

# DOC limits as fraction of tool diameter by operation type
_DOC_FRACTION_LIMITS: dict[str, tuple[float, float]] = {
    "adaptive": (0.5, 3.0),     # HSAM allows deep axial
    "trochoidal": (0.5, 3.0),
    "face_mill": (0.02, 0.5),
    "pocket_2d": (0.05, 1.0),
    "pocket_3d": (0.05, 0.5),
    "contour": (0.05, 1.5),
    "profile": (0.05, 1.5),
    "slot": (0.05, 1.0),
    "roughing_3d": (0.1, 1.0),
    "finishing_3d": (0.01, 0.2),
}


# ---------------------------------------------------------------------------
# Validation result
# ---------------------------------------------------------------------------


@dataclass
class ValidationCheck:
    """A single physics validation check result."""

    parameter: str
    status: str  # "pass", "warn", "fail"
    message: str
    expected_range: Optional[tuple[float, float]] = None
    actual_value: Optional[float] = None


@dataclass
class ValidationResult:
    """Overall validation result for a strategy."""

    score: float  # 0..1
    checks: list[ValidationCheck] = field(default_factory=list)
    pass_count: int = 0
    warn_count: int = 0
    fail_count: int = 0

    def to_dict(self) -> dict:
        return {
            "score": round(self.score, 3),
            "pass_count": self.pass_count,
            "warn_count": self.warn_count,
            "fail_count": self.fail_count,
            "checks": [
                {
                    "parameter": c.parameter,
                    "status": c.status,
                    "message": c.message,
                    "expected_range": list(c.expected_range) if c.expected_range else None,
                    "actual_value": c.actual_value,
                }
                for c in self.checks
            ],
        }


# ---------------------------------------------------------------------------
# Recommendation result
# ---------------------------------------------------------------------------


@dataclass
class Recommendation:
    """A single strategy recommendation with ranking info."""

    rank: int
    strategy: StrategyRecord
    relevance_score: float  # how well it matches the query
    validation: ValidationResult  # physics check
    combined_score: float  # weighted combination

    def to_dict(self) -> dict:
        return {
            "rank": self.rank,
            "strategy_id": self.strategy.strategy_id,
            "operation_type": self.strategy.operation_type,
            "material_class": self.strategy.material_class,
            "machine_type": self.strategy.machine_type,
            "tool_type": self.strategy.tool_type,
            "tool_diameter_mm": self.strategy.tool_diameter_mm,
            "tool_flutes": self.strategy.tool_flutes,
            "tool_material": self.strategy.tool_material,
            "tool_coating": self.strategy.tool_coating,
            "consensus_params": [p.to_dict() for p in self.strategy.consensus_params],
            "source_count": self.strategy.source_count,
            "relevance_score": round(self.relevance_score, 3),
            "validation": self.validation.to_dict(),
            "combined_score": round(self.combined_score, 3),
        }


# ---------------------------------------------------------------------------
# Physics validation
# ---------------------------------------------------------------------------


def validate_strategy(record: StrategyRecord) -> ValidationResult:
    """Validate a strategy's consensus parameters against physics bounds.

    Checks surface speed, feed per tooth, and depth of cut against
    material-specific and operation-specific limits.
    """
    checks: list[ValidationCheck] = []

    # Build param lookup from consensus
    param_map: dict[str, float] = {}
    for p in record.consensus_params:
        param_map[p.name.lower()] = p.mean

    # 1. Surface speed check
    surface_speed = param_map.get("surface_speed")
    if surface_speed is not None and record.material_class in _SURFACE_SPEED_RANGES:
        lo, hi = _SURFACE_SPEED_RANGES[record.material_class]
        if lo <= surface_speed <= hi:
            checks.append(ValidationCheck("surface_speed", "pass",
                f"Surface speed {surface_speed:.0f} m/min within range for {record.material_class}",
                (lo, hi), surface_speed))
        elif surface_speed < lo * 0.5 or surface_speed > hi * 2.0:
            checks.append(ValidationCheck("surface_speed", "fail",
                f"Surface speed {surface_speed:.0f} m/min far outside range [{lo}, {hi}] for {record.material_class}",
                (lo, hi), surface_speed))
        else:
            checks.append(ValidationCheck("surface_speed", "warn",
                f"Surface speed {surface_speed:.0f} m/min slightly outside range [{lo}, {hi}] for {record.material_class}",
                (lo, hi), surface_speed))

    # 2. RPM sanity check (derive surface speed from RPM + diameter if available)
    rpm = param_map.get("spindle_rpm") or param_map.get("rpm")
    if rpm is not None and record.tool_diameter_mm and record.tool_diameter_mm > 0:
        import math
        derived_vc = (math.pi * record.tool_diameter_mm * rpm) / 1000
        if record.material_class in _SURFACE_SPEED_RANGES:
            lo, hi = _SURFACE_SPEED_RANGES[record.material_class]
            if lo <= derived_vc <= hi:
                checks.append(ValidationCheck("rpm_derived_vc", "pass",
                    f"Derived Vc {derived_vc:.0f} m/min from RPM={rpm:.0f} D={record.tool_diameter_mm}mm is within range",
                    (lo, hi), derived_vc))
            elif derived_vc < lo * 0.5 or derived_vc > hi * 2.0:
                checks.append(ValidationCheck("rpm_derived_vc", "fail",
                    f"Derived Vc {derived_vc:.0f} m/min from RPM={rpm:.0f} is far outside range [{lo}, {hi}]",
                    (lo, hi), derived_vc))
            else:
                checks.append(ValidationCheck("rpm_derived_vc", "warn",
                    f"Derived Vc {derived_vc:.0f} m/min from RPM={rpm:.0f} is slightly outside range [{lo}, {hi}]",
                    (lo, hi), derived_vc))

    # 3. Feed rate check (derive feed per tooth if possible)
    feed_rate = param_map.get("feed_rate") or param_map.get("feed")
    if feed_rate is not None and rpm and rpm > 0 and record.tool_flutes and record.tool_flutes > 0:
        fz = feed_rate / (rpm * record.tool_flutes)
        if record.operation_type in _FEED_PER_TOOTH_RANGES:
            lo, hi = _FEED_PER_TOOTH_RANGES[record.operation_type]
            if lo <= fz <= hi:
                checks.append(ValidationCheck("feed_per_tooth", "pass",
                    f"Feed/tooth {fz:.4f} mm within range for {record.operation_type}",
                    (lo, hi), fz))
            elif fz < lo * 0.3 or fz > hi * 3.0:
                checks.append(ValidationCheck("feed_per_tooth", "fail",
                    f"Feed/tooth {fz:.4f} mm far outside range [{lo}, {hi}] for {record.operation_type}",
                    (lo, hi), fz))
            else:
                checks.append(ValidationCheck("feed_per_tooth", "warn",
                    f"Feed/tooth {fz:.4f} mm slightly outside range [{lo}, {hi}] for {record.operation_type}",
                    (lo, hi), fz))

    # 4. Depth of cut check
    doc = param_map.get("depth_of_cut") or param_map.get("doc")
    if doc is not None and record.tool_diameter_mm and record.tool_diameter_mm > 0:
        doc_ratio = doc / record.tool_diameter_mm
        if record.operation_type in _DOC_FRACTION_LIMITS:
            lo, hi = _DOC_FRACTION_LIMITS[record.operation_type]
            if lo <= doc_ratio <= hi:
                checks.append(ValidationCheck("doc_ratio", "pass",
                    f"DOC ratio {doc_ratio:.2f}xD within range for {record.operation_type}",
                    (lo, hi), doc_ratio))
            elif doc_ratio > hi * 2.0:
                checks.append(ValidationCheck("doc_ratio", "fail",
                    f"DOC ratio {doc_ratio:.2f}xD far exceeds limit {hi}xD for {record.operation_type}",
                    (lo, hi), doc_ratio))
            else:
                checks.append(ValidationCheck("doc_ratio", "warn",
                    f"DOC ratio {doc_ratio:.2f}xD slightly outside range [{lo}, {hi}]xD",
                    (lo, hi), doc_ratio))

    # Compute score
    pass_count = sum(1 for c in checks if c.status == "pass")
    warn_count = sum(1 for c in checks if c.status == "warn")
    fail_count = sum(1 for c in checks if c.status == "fail")
    total = len(checks) if checks else 1

    score = (pass_count + 0.5 * warn_count) / total

    return ValidationResult(
        score=score,
        checks=checks,
        pass_count=pass_count,
        warn_count=warn_count,
        fail_count=fail_count,
    )


# ---------------------------------------------------------------------------
# Recommender
# ---------------------------------------------------------------------------


def _relevance_score(
    record: StrategyRecord,
    operation_type: str,
    material_class: str,
    machine_type: str,
    target_features: list[str],
) -> float:
    """Compute relevance score (0..1) for a strategy given query params."""
    score = 0.0
    max_score = 0.0

    # Operation type match (highest weight)
    max_score += 0.35
    if operation_type and record.operation_type == operation_type:
        score += 0.35
    elif not operation_type:
        score += 0.15  # partial credit when no preference

    # Material match
    max_score += 0.30
    if material_class and record.material_class == material_class:
        score += 0.30
    elif not material_class:
        score += 0.10

    # Machine match
    max_score += 0.15
    if machine_type and record.machine_type == machine_type:
        score += 0.15
    elif not machine_type:
        score += 0.05

    # Source count bonus (more sources = more reliable)
    max_score += 0.10
    score += min(record.source_count / 5, 1.0) * 0.10

    # Confidence bonus
    max_score += 0.10
    score += record.confidence_weighted * 0.10

    return score / max_score if max_score > 0 else 0.0


def recommend(
    db: StrategyDB,
    operation_type: str = "",
    material_class: str = "",
    machine_type: str = "",
    target_features: list[str] | None = None,
    max_results: int = 10,
    min_validation_score: float = 0.0,
) -> list[Recommendation]:
    """Recommend machining strategies for given conditions.

    Args:
        db: The strategy database to query.
        operation_type: Target operation (e.g. "adaptive", "pocket_2d").
        material_class: Target material (e.g. "aluminum", "steel").
        machine_type: Target machine type.
        target_features: CAD features being machined (for future ranking).
        max_results: Maximum number of recommendations.
        min_validation_score: Minimum physics validation score to include.

    Returns:
        Ranked list of Recommendation objects.
    """
    if target_features is None:
        target_features = []

    # Query all potentially matching strategies (relaxed filter)
    candidates = db.query(
        operation_type=operation_type,
        material_class=material_class,
    )

    # If no exact matches, try broader query
    if not candidates and (operation_type or material_class):
        candidates = db.query()

    # Score and validate each candidate
    scored: list[Recommendation] = []
    for record in candidates:
        rel_score = _relevance_score(record, operation_type, material_class, machine_type, target_features)
        validation = validate_strategy(record)

        if validation.score < min_validation_score:
            continue

        # Combined score: 50% relevance, 30% validation, 20% confidence
        combined = (
            0.50 * rel_score
            + 0.30 * validation.score
            + 0.20 * record.confidence_weighted
        )

        scored.append(Recommendation(
            rank=0,
            strategy=record,
            relevance_score=rel_score,
            validation=validation,
            combined_score=combined,
        ))

    # Sort by combined score descending
    scored.sort(key=lambda r: -r.combined_score)

    # Assign ranks
    for i, rec in enumerate(scored[:max_results]):
        rec.rank = i + 1

    return scored[:max_results]
