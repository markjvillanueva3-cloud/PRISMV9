"""Confidence Scoring Model — CC-EXT-MS5 P0-U02.

Computes unified confidence scores (0.0-1.0) for every knowledge entry
based on: source count, source authority, physics agreement, recency,
and cross-source consistency.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from .source_aggregator import UnifiedEntry, SourceType, EntryCategory


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Source authority scores (higher = more trustworthy)
_SOURCE_AUTHORITY: dict[SourceType, float] = {
    SourceType.PDF_EXTRACTION: 0.85,       # Manufacturer manuals, handbooks
    SourceType.OPERATOR_FEEDBACK: 0.70,     # Experienced operators
    SourceType.SENSOR_LEARNING: 0.80,       # Direct measurement
    SourceType.QUALITY_FEEDBACK: 0.90,      # CMM direct measurement
}

# High/low confidence thresholds
HIGH_CONFIDENCE = 0.8
LOW_CONFIDENCE = 0.4


# ---------------------------------------------------------------------------
# Scoring result
# ---------------------------------------------------------------------------

@dataclass
class ConfidenceBreakdown:
    """Per-factor confidence scores for explainability."""
    source_count_score: float = 0.0
    source_authority_score: float = 0.0
    source_diversity_score: float = 0.0
    recency_score: float = 0.0
    consistency_score: float = 0.0
    physics_score: float = 0.0

    def to_dict(self) -> dict:
        return {
            "source_count": round(self.source_count_score, 4),
            "source_authority": round(self.source_authority_score, 4),
            "source_diversity": round(self.source_diversity_score, 4),
            "recency": round(self.recency_score, 4),
            "consistency": round(self.consistency_score, 4),
            "physics": round(self.physics_score, 4),
        }


@dataclass
class ConfidenceScore:
    """Unified confidence score with breakdown."""
    total: float = 0.0
    breakdown: ConfidenceBreakdown = field(default_factory=ConfidenceBreakdown)
    tier: str = "low"  # "high", "medium", "low"

    def __post_init__(self):
        if self.total >= HIGH_CONFIDENCE:
            self.tier = "high"
        elif self.total >= LOW_CONFIDENCE:
            self.tier = "medium"
        else:
            self.tier = "low"

    def to_dict(self) -> dict:
        return {
            "total": round(self.total, 4),
            "tier": self.tier,
            "breakdown": self.breakdown.to_dict(),
        }


# ---------------------------------------------------------------------------
# Physics validator interface
# ---------------------------------------------------------------------------

class PhysicsValidator:
    """Interface for validating entries against physics models.

    Override validate() to plug in actual prism_calc checks.
    """

    def validate(self, entry: UnifiedEntry) -> Optional[float]:
        """Return physics-validated value, or None if not applicable.

        The returned value is what physics predicts for this parameter.
        """
        return None


# ---------------------------------------------------------------------------
# Confidence Scorer
# ---------------------------------------------------------------------------

class ConfidenceScorer:
    """Computes unified confidence scores for knowledge entries.

    Factor weights (sum to 1.0):
    - source_count:    0.20  (more sources = higher confidence)
    - source_authority: 0.25  (trustworthy sources = higher)
    - source_diversity: 0.15  (different source types = higher)
    - recency:          0.10  (newer data = higher)
    - consistency:      0.15  (low variance = higher)
    - physics:          0.15  (physics agreement = higher)
    """

    WEIGHTS = {
        "source_count": 0.20,
        "source_authority": 0.25,
        "source_diversity": 0.15,
        "recency": 0.10,
        "consistency": 0.15,
        "physics": 0.15,
    }

    def __init__(
        self,
        physics_validator: Optional[PhysicsValidator] = None,
        max_age_days: float = 365.0,
    ):
        self._physics = physics_validator or PhysicsValidator()
        self._max_age_days = max_age_days

    def score(self, entry: UnifiedEntry) -> ConfidenceScore:
        """Compute unified confidence score for an entry."""
        breakdown = ConfidenceBreakdown()

        # 1. Source count factor
        n = entry.source_count
        if n >= 3:
            breakdown.source_count_score = 0.9
        elif n == 2:
            breakdown.source_count_score = 0.6
        elif n == 1:
            breakdown.source_count_score = 0.3
        else:
            breakdown.source_count_score = 0.1

        # 2. Source authority factor (max authority among sources)
        if entry.sources:
            authorities = [
                _SOURCE_AUTHORITY.get(s.source_type, 0.5) for s in entry.sources
            ]
            breakdown.source_authority_score = max(authorities)
        else:
            breakdown.source_authority_score = 0.3

        # 3. Source diversity factor (different source types count more)
        source_types = entry.source_types
        n_types = len(source_types)
        if n_types >= 3:
            breakdown.source_diversity_score = 1.0
        elif n_types == 2:
            breakdown.source_diversity_score = 0.7
        elif n_types == 1:
            breakdown.source_diversity_score = 0.4
        else:
            breakdown.source_diversity_score = 0.1

        # 4. Recency factor
        breakdown.recency_score = self._compute_recency(entry)

        # 5. Consistency factor
        breakdown.consistency_score = self._compute_consistency(entry)

        # 6. Physics agreement factor
        breakdown.physics_score = self._compute_physics(entry)

        # Weighted combination
        total = (
            self.WEIGHTS["source_count"] * breakdown.source_count_score
            + self.WEIGHTS["source_authority"] * breakdown.source_authority_score
            + self.WEIGHTS["source_diversity"] * breakdown.source_diversity_score
            + self.WEIGHTS["recency"] * breakdown.recency_score
            + self.WEIGHTS["consistency"] * breakdown.consistency_score
            + self.WEIGHTS["physics"] * breakdown.physics_score
        )

        total = max(0.0, min(1.0, total))

        return ConfidenceScore(total=total, breakdown=breakdown)

    def score_batch(self, entries: list[UnifiedEntry]) -> list[ConfidenceScore]:
        """Score multiple entries."""
        return [self.score(e) for e in entries]

    def _compute_recency(self, entry: UnifiedEntry) -> float:
        """Newer data scores higher."""
        if not entry.sources:
            return 0.5

        now = time.time()
        newest = max(s.extraction_date for s in entry.sources)
        age_days = (now - newest) / 86400.0

        if age_days <= 0:
            return 1.0
        if age_days >= self._max_age_days:
            return 0.3

        # Linear decay from 1.0 to 0.3
        return 1.0 - 0.7 * (age_days / self._max_age_days)

    def _compute_consistency(self, entry: UnifiedEntry) -> float:
        """Low variance across source confidences = high consistency."""
        if len(entry.sources) < 2:
            return 0.5  # neutral for single-source

        confidences = [s.original_confidence for s in entry.sources]
        mean_conf = sum(confidences) / len(confidences)
        variance = sum((c - mean_conf) ** 2 for c in confidences) / len(confidences)
        std = math.sqrt(variance)

        # Low std = high consistency
        if std < 0.05:
            return 1.0
        elif std < 0.15:
            return 0.8
        elif std < 0.3:
            return 0.5
        else:
            return 0.3

    def _compute_physics(self, entry: UnifiedEntry) -> float:
        """Check agreement with physics models."""
        physics_value = self._physics.validate(entry)
        if physics_value is None:
            return 0.6  # neutral when not applicable

        if entry.value == 0:
            return 0.6

        # Compare entry value to physics prediction
        deviation = abs(entry.value - physics_value) / max(abs(entry.value), 1e-10)

        if deviation < 0.05:
            return 1.0
        elif deviation < 0.10:
            return 0.9
        elif deviation < 0.20:
            return 0.7
        elif deviation < 0.50:
            return 0.4
        else:
            return 0.1
