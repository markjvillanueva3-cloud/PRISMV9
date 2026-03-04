"""Tests for Confidence Scoring — CC-EXT-MS5 P0-U02."""

from __future__ import annotations

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.synthesis.source_aggregator import (
    SourceType, EntryCategory, SourceProvenance, UnifiedEntry,
)
from src.synthesis.confidence_scorer import (
    ConfidenceScorer, ConfidenceScore, ConfidenceBreakdown,
    PhysicsValidator, HIGH_CONFIDENCE, LOW_CONFIDENCE,
)


# ---------------------------------------------------------------------------
# Custom physics validator for testing
# ---------------------------------------------------------------------------

class MockPhysicsValidator(PhysicsValidator):
    """Returns known physics values for testing."""
    def __init__(self, expected_values: dict[str, float] = None):
        self._values = expected_values or {}

    def validate(self, entry: UnifiedEntry) -> float | None:
        return self._values.get(entry.parameter_name)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestConfidenceScoring:
    def test_single_source_low_confidence(self):
        """Single-source entry should score below HIGH_CONFIDENCE."""
        scorer = ConfidenceScorer()
        entry = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.5)],
            confidence=0.5,
        )
        score = scorer.score(entry)
        assert score.total < HIGH_CONFIDENCE
        assert score.tier in ("low", "medium")

    def test_multi_source_higher(self):
        """Multi-source entry should score higher than single-source."""
        scorer = ConfidenceScorer()
        single = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.7)],
        )
        multi = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.8),
                SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK, original_confidence=0.7),
                SourceProvenance(source_type=SourceType.SENSOR_LEARNING, original_confidence=0.75),
            ],
        )
        s1 = scorer.score(single)
        s2 = scorer.score(multi)
        assert s2.total > s1.total

    def test_high_confidence_threshold(self):
        """Multi-source, physics-validated entry should hit HIGH_CONFIDENCE."""
        physics = MockPhysicsValidator({"speed": 152.0})
        scorer = ConfidenceScorer(physics_validator=physics)
        entry = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.9),
                SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK, original_confidence=0.85),
                SourceProvenance(source_type=SourceType.QUALITY_FEEDBACK, original_confidence=0.9),
            ],
        )
        score = scorer.score(entry)
        assert score.total >= HIGH_CONFIDENCE
        assert score.tier == "high"

    def test_low_confidence_threshold(self):
        """Unvalidated, old, single-source entry should score below medium."""
        scorer = ConfidenceScorer()
        entry = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[SourceProvenance(
                source_type=SourceType.PDF_EXTRACTION,
                original_confidence=0.2,
                extraction_date=time.time() - 400 * 86400,  # 400 days ago
            )],
        )
        score = scorer.score(entry)
        # Single old source with low original confidence should be below HIGH
        assert score.total < HIGH_CONFIDENCE
        assert score.tier in ("low", "medium")

    def test_physics_agreement_boosts(self):
        """Physics-agreeing entry should score higher than disagreeing."""
        physics = MockPhysicsValidator({"speed": 150.0})
        scorer = ConfidenceScorer(physics_validator=physics)

        agreeing = UnifiedEntry(parameter_name="speed", value=150.0,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.7)])
        disagreeing = UnifiedEntry(parameter_name="speed", value=300.0,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.7)])

        s_agree = scorer.score(agreeing)
        s_disagree = scorer.score(disagreeing)
        assert s_agree.total > s_disagree.total

    def test_source_diversity_bonus(self):
        """Different source types should score higher than same type."""
        scorer = ConfidenceScorer()
        diverse = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.7),
                SourceProvenance(source_type=SourceType.SENSOR_LEARNING, original_confidence=0.7),
            ],
        )
        same_type = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.7),
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.7),
            ],
        )
        s_diverse = scorer.score(diverse)
        s_same = scorer.score(same_type)
        assert s_diverse.breakdown.source_diversity_score > s_same.breakdown.source_diversity_score

    def test_recency_boost(self):
        """Recent data should score higher than old data."""
        scorer = ConfidenceScorer()
        recent = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[SourceProvenance(
                source_type=SourceType.PDF_EXTRACTION,
                extraction_date=time.time(),
                original_confidence=0.7,
            )],
        )
        old = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[SourceProvenance(
                source_type=SourceType.PDF_EXTRACTION,
                extraction_date=time.time() - 300 * 86400,
                original_confidence=0.7,
            )],
        )
        s_recent = scorer.score(recent)
        s_old = scorer.score(old)
        assert s_recent.breakdown.recency_score > s_old.breakdown.recency_score

    def test_consistency_high(self):
        """Low variance across source confidences = high consistency."""
        scorer = ConfidenceScorer()
        consistent = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.80),
                SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK, original_confidence=0.82),
            ],
        )
        inconsistent = UnifiedEntry(
            parameter_name="speed", value=150.0,
            sources=[
                SourceProvenance(source_type=SourceType.PDF_EXTRACTION, original_confidence=0.95),
                SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK, original_confidence=0.3),
            ],
        )
        s_con = scorer.score(consistent)
        s_inc = scorer.score(inconsistent)
        assert s_con.breakdown.consistency_score > s_inc.breakdown.consistency_score

    def test_breakdown_to_dict(self):
        scorer = ConfidenceScorer()
        entry = UnifiedEntry(parameter_name="speed", value=150.0,
            sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)])
        score = scorer.score(entry)
        d = score.to_dict()
        assert "total" in d
        assert "tier" in d
        assert "breakdown" in d

    def test_score_batch(self):
        scorer = ConfidenceScorer()
        entries = [
            UnifiedEntry(parameter_name="a", value=1, sources=[SourceProvenance(source_type=SourceType.PDF_EXTRACTION)]),
            UnifiedEntry(parameter_name="b", value=2, sources=[SourceProvenance(source_type=SourceType.SENSOR_LEARNING)]),
        ]
        scores = scorer.score_batch(entries)
        assert len(scores) == 2

    def test_quality_source_authority(self):
        """Quality feedback (CMM) should have highest authority."""
        scorer = ConfidenceScorer()
        quality = UnifiedEntry(
            parameter_name="dev", value=5.0,
            sources=[SourceProvenance(source_type=SourceType.QUALITY_FEEDBACK, original_confidence=0.8)],
        )
        feedback = UnifiedEntry(
            parameter_name="dev", value=5.0,
            sources=[SourceProvenance(source_type=SourceType.OPERATOR_FEEDBACK, original_confidence=0.8)],
        )
        s_q = scorer.score(quality)
        s_f = scorer.score(feedback)
        assert s_q.breakdown.source_authority_score > s_f.breakdown.source_authority_score

    def test_no_sources_low_score(self):
        scorer = ConfidenceScorer()
        entry = UnifiedEntry(parameter_name="speed", value=150.0)
        score = scorer.score(entry)
        assert score.total < 0.5
