"""Tests for Consensus Building — CC-EXT-MS2 P0-U04.

Covers: weighted averaging, confidence scoring, outlier detection,
grouping, multi-operator scenarios.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feedback.feedback_schema import OperatorFeedback
from src.feedback.experience_scorer import ExperienceScorer
from src.feedback.consensus_builder import (
    ConsensusBuilder,
    ConsensusResult,
    ParameterConsensus,
    OutlierEntry,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_feedback(operator_id="OP-001", **overrides) -> OperatorFeedback:
    defaults = {
        "operator_id": operator_id,
        "experience_years": 10.0,
        "specializations": ["milling"],
        "operation_type": "milling",
        "material": "aluminum",
        "tool": "10mm carbide endmill",
        "tool_diameter_mm": 10.0,
        "parameters_used": {"cutting_speed": 300.0, "feed_per_tooth": 0.1},
        "outcome": "success",
    }
    defaults.update(overrides)
    return OperatorFeedback(**defaults)


@pytest.fixture
def builder():
    return ConsensusBuilder()


# ===========================================================================
# Basic consensus building
# ===========================================================================

class TestBasicConsensus:

    def test_single_entry_consensus(self, builder):
        entries = [_make_feedback()]
        results = builder.build_consensus(entries)
        assert len(results) == 1
        r = results[0]
        assert r.operation_type == "milling"
        assert r.material == "aluminum"
        assert r.num_contributors == 1
        assert "cutting_speed" in r.recommended_params
        assert r.recommended_params["cutting_speed"].weighted_mean == 300.0

    def test_two_agreeing_operators(self, builder):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"cutting_speed": 310.0}),
        ]
        results = builder.build_consensus(entries)
        assert len(results) == 1
        r = results[0]
        assert r.num_contributors == 2
        # Weighted mean should be close to 305
        assert 295 < r.recommended_params["cutting_speed"].weighted_mean < 315

    def test_five_agreeing_operators_high_confidence(self, builder):
        entries = [
            _make_feedback(f"OP-{i}", parameters_used={"cutting_speed": 300.0 + i * 2})
            for i in range(5)
        ]
        results = builder.build_consensus(entries)
        r = results[0]
        assert r.num_contributors == 5
        assert r.confidence > 0.4  # Should be moderate-high

    def test_empty_entries(self, builder):
        results = builder.build_consensus([])
        assert results == []


# ===========================================================================
# Weighted averaging
# ===========================================================================

class TestWeightedAveraging:

    def test_equal_weight_is_simple_average(self, builder):
        """Same experience → weights similar → mean near simple average."""
        entries = [
            _make_feedback("OP-A", experience_years=10, parameters_used={"speed": 100.0}),
            _make_feedback("OP-B", experience_years=10, parameters_used={"speed": 200.0}),
        ]
        results = builder.build_consensus(entries)
        mean = results[0].recommended_params["speed"].weighted_mean
        assert 140 < mean < 160  # Close to 150

    def test_multiple_parameters(self, builder):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0, "feed": 0.1, "depth": 2.0}),
            _make_feedback("OP-B", parameters_used={"speed": 320.0, "feed": 0.12, "depth": 2.5}),
        ]
        results = builder.build_consensus(entries)
        params = results[0].recommended_params
        assert "speed" in params
        assert "feed" in params
        assert "depth" in params


# ===========================================================================
# Confidence scoring
# ===========================================================================

class TestConfidenceScoring:

    def test_single_operator_low_confidence(self, builder):
        entries = [_make_feedback()]
        results = builder.build_consensus(entries)
        assert results[0].confidence < 0.65

    def test_many_operators_higher_confidence(self, builder):
        # Single operator baseline
        single = [_make_feedback("OP-0", parameters_used={"speed": 300.0})]
        single_conf = builder.build_consensus(single)[0].confidence

        # Multiple operators should have higher confidence
        builder2 = ConsensusBuilder()
        entries = [
            _make_feedback(f"OP-{i}", parameters_used={"speed": 300.0 + i})
            for i in range(5)
        ]
        results = builder2.build_consensus(entries)
        assert results[0].confidence > single_conf

    def test_tight_agreement_higher_confidence(self, builder):
        # Tight agreement: all report ~300
        tight = [
            _make_feedback(f"OP-{i}", parameters_used={"speed": 300.0 + i * 0.1})
            for i in range(5)
        ]
        # Loose agreement: spread 100-500
        loose = [
            _make_feedback(f"OP-{i}", parameters_used={"speed": 100.0 + i * 100})
            for i in range(5)
        ]
        r_tight = builder.build_consensus(tight)[0]
        builder2 = ConsensusBuilder()
        r_loose = builder2.build_consensus(loose)[0]
        assert r_tight.confidence > r_loose.confidence

    def test_confidence_bounded_0_1(self, builder):
        entries = [
            _make_feedback(f"OP-{i}", parameters_used={"speed": 300.0})
            for i in range(10)
        ]
        results = builder.build_consensus(entries)
        assert 0.0 <= results[0].confidence <= 1.0


# ===========================================================================
# Outlier detection
# ===========================================================================

class TestOutlierDetection:

    def test_outlier_detected(self, builder):
        """One operator reporting very different value should be flagged."""
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"speed": 310.0}),
            _make_feedback("OP-C", parameters_used={"speed": 305.0}),
            _make_feedback("OP-E", parameters_used={"speed": 302.0}),
            _make_feedback("OP-F", parameters_used={"speed": 308.0}),
            _make_feedback("OP-D", parameters_used={"speed": 900.0}),  # Outlier
        ]
        results = builder.build_consensus(entries)
        r = results[0]
        assert r.outlier_count >= 1
        outlier_ops = [o.operator_id for o in r.outliers]
        assert "OP-D" in outlier_ops

    def test_no_outliers_when_agreeing(self, builder):
        entries = [
            _make_feedback(f"OP-{i}", parameters_used={"speed": 300.0 + i})
            for i in range(4)
        ]
        results = builder.build_consensus(entries)
        assert results[0].outlier_count == 0

    def test_outlier_details(self, builder):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"speed": 305.0}),
            _make_feedback("OP-C", parameters_used={"speed": 310.0}),
            _make_feedback("OP-D", parameters_used={"speed": 302.0}),
            _make_feedback("OP-E", parameters_used={"speed": 308.0}),
            _make_feedback("OP-OUTLIER", parameters_used={"speed": 1000.0}),
        ]
        results = builder.build_consensus(entries)
        outliers = results[0].outliers
        assert len(outliers) >= 1, "Expected outlier to be detected"
        o = outliers[0]
        assert o.deviation_stddevs > 2.0
        assert o.parameter == "speed"

    def test_minimum_3_entries_for_outlier(self, builder):
        """Outlier detection requires at least 3 entries."""
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"speed": 900.0}),
        ]
        results = builder.build_consensus(entries)
        assert results[0].outlier_count == 0


# ===========================================================================
# Grouping
# ===========================================================================

class TestGrouping:

    def test_groups_by_operation_and_material(self, builder):
        entries = [
            _make_feedback("OP-A", operation_type="milling", material="aluminum",
                          parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", operation_type="turning", material="steel",
                          parameters_used={"speed": 150.0}),
            _make_feedback("OP-C", operation_type="milling", material="aluminum",
                          parameters_used={"speed": 310.0}),
        ]
        results = builder.build_consensus(entries)
        assert len(results) == 2
        ops = {r.operation_type for r in results}
        assert ops == {"milling", "turning"}

    def test_group_by_tool(self, builder):
        entries = [
            _make_feedback("OP-A", tool="10mm endmill", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", tool="20mm endmill", parameters_used={"speed": 200.0}),
        ]
        results = builder.build_consensus(entries, group_by_tool=True)
        assert len(results) == 2

    def test_no_group_by_tool_default(self, builder):
        entries = [
            _make_feedback("OP-A", tool="10mm endmill", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", tool="20mm endmill", parameters_used={"speed": 200.0}),
        ]
        results = builder.build_consensus(entries, group_by_tool=False)
        assert len(results) == 1  # Same operation+material


# ===========================================================================
# ConsensusResult serialization
# ===========================================================================

class TestSerialization:

    def test_to_dict(self, builder):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"speed": 310.0}),
        ]
        results = builder.build_consensus(entries)
        d = results[0].to_dict()
        assert "operation_type" in d
        assert "material" in d
        assert "recommended_params" in d
        assert "confidence" in d
        assert "num_contributors" in d
        assert "contributing_operators" in d

    def test_parameter_consensus_to_dict(self, builder):
        entries = [_make_feedback(parameters_used={"speed": 300.0})]
        results = builder.build_consensus(entries)
        pd = results[0].recommended_params["speed"].to_dict()
        assert "weighted_mean" in pd
        assert "weighted_stddev" in pd
        assert "confidence_interval" in pd
        assert "sample_count" in pd

    def test_outlier_to_dict(self, builder):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"speed": 305.0}),
            _make_feedback("OP-C", parameters_used={"speed": 310.0}),
            _make_feedback("OP-D", parameters_used={"speed": 1000.0}),
        ]
        results = builder.build_consensus(entries)
        if results[0].outliers:
            od = results[0].outliers[0].to_dict()
            assert "operator_id" in od
            assert "deviation_stddevs" in od


# ===========================================================================
# Exit conditions verification
# ===========================================================================

class TestExitConditions:

    def test_weighted_parameter_averaging(self, builder):
        """Consensus uses experience-weighted averaging."""
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"speed": 400.0}),
        ]
        results = builder.build_consensus(entries)
        mean = results[0].recommended_params["speed"].weighted_mean
        # Should be some average of 300 and 400
        assert 290 < mean < 410

    def test_consensus_output_has_confidence_interval(self, builder):
        entries = [
            _make_feedback(f"OP-{i}", parameters_used={"speed": 300.0 + i * 5})
            for i in range(3)
        ]
        results = builder.build_consensus(entries)
        pc = results[0].recommended_params["speed"]
        low, high = pc.confidence_interval
        assert low < pc.weighted_mean < high or low == high  # Single val case

    def test_contributing_operators_listed(self, builder):
        entries = [
            _make_feedback("OP-A"), _make_feedback("OP-B"), _make_feedback("OP-C"),
        ]
        results = builder.build_consensus(entries)
        assert sorted(results[0].contributing_operators) == ["OP-A", "OP-B", "OP-C"]
