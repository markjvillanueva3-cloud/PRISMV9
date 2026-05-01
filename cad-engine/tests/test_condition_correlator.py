"""Tests for Cutting Condition Correlation — CC-EXT-MS3-P0-U04."""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.sensors.condition_correlator import (
    CorrelationResult,
    WearState,
    SurfaceQualityEstimate,
    ConditionCorrelator,
    _linear_fit,
)


# ---------------------------------------------------------------------------
# Dataclass Tests
# ---------------------------------------------------------------------------

class TestCorrelationResult:
    def test_defaults(self):
        r = CorrelationResult()
        assert r.model_name == ""
        assert r.r_squared == 0.0
        assert r.confidence == 0.5

    def test_to_dict(self):
        r = CorrelationResult(
            model_name="test_model",
            r_squared=0.95,
            predicted_value=1.234,
            confidence=0.85,
        )
        d = r.to_dict()
        assert d["model_name"] == "test_model"
        assert d["r_squared"] == 0.95
        assert d["predicted_value"] == 1.234
        assert d["confidence"] == 0.85


class TestWearState:
    def test_defaults(self):
        w = WearState()
        assert w.state == "fresh"
        assert w.wear_index == 0.0
        assert w.estimated_remaining_life_pct == 100.0

    def test_to_dict(self):
        w = WearState(state="worn", wear_index=0.65, estimated_remaining_life_pct=35.0)
        d = w.to_dict()
        assert d["state"] == "worn"
        assert d["wear_index"] == 0.65
        assert d["remaining_life_pct"] == 35.0


class TestSurfaceQualityEstimate:
    def test_defaults(self):
        s = SurfaceQualityEstimate()
        assert s.estimated_ra_um == 0.0
        assert s.quality_grade == "unknown"

    def test_to_dict(self):
        s = SurfaceQualityEstimate(estimated_ra_um=0.8, quality_grade="good")
        d = s.to_dict()
        assert d["estimated_ra_um"] == 0.8
        assert d["quality_grade"] == "good"


# ---------------------------------------------------------------------------
# Linear Fit
# ---------------------------------------------------------------------------

class TestLinearFit:
    def test_perfect_linear(self):
        x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        y = np.array([2.0, 4.0, 6.0, 8.0, 10.0])  # y = 2x
        slope, intercept, r2 = _linear_fit(x, y)
        assert abs(slope - 2.0) < 1e-10
        assert abs(intercept - 0.0) < 1e-10
        assert abs(r2 - 1.0) < 1e-10

    def test_with_offset(self):
        x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        y = np.array([3.0, 5.0, 7.0, 9.0, 11.0])  # y = 2x + 1
        slope, intercept, r2 = _linear_fit(x, y)
        assert abs(slope - 2.0) < 1e-10
        assert abs(intercept - 1.0) < 1e-10
        assert abs(r2 - 1.0) < 1e-10

    def test_noisy_data(self):
        np.random.seed(42)
        x = np.linspace(0, 10, 50)
        y = 3.0 * x + 5.0 + np.random.randn(50) * 0.5
        slope, intercept, r2 = _linear_fit(x, y)
        assert abs(slope - 3.0) < 0.5
        assert abs(intercept - 5.0) < 1.0
        assert r2 > 0.95

    def test_single_point(self):
        slope, intercept, r2 = _linear_fit(np.array([1.0]), np.array([2.0]))
        assert slope == 0.0
        assert r2 == 0.0

    def test_constant_x(self):
        x = np.array([5.0, 5.0, 5.0])
        y = np.array([1.0, 2.0, 3.0])
        slope, intercept, r2 = _linear_fit(x, y)
        assert slope == 0.0
        assert abs(intercept - 2.0) < 1e-10

    def test_constant_y(self):
        x = np.array([1.0, 2.0, 3.0])
        y = np.array([5.0, 5.0, 5.0])
        slope, intercept, r2 = _linear_fit(x, y)
        assert abs(slope) < 1e-10
        assert r2 == 1.0  # ss_xy == 0 and ss_yy == 0


# ---------------------------------------------------------------------------
# Vibration → DOC Correlation
# ---------------------------------------------------------------------------

class TestVibrationToDOC:
    def test_linear_relationship(self):
        cc = ConditionCorrelator()
        rms = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
        doc = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]  # perfect linear
        result = cc.correlate_vibration_to_doc(rms, doc)
        assert result.model_name == "vibration_to_doc"
        assert result.r_squared > 0.99
        assert len(result.coefficients) == 2

    def test_insufficient_data(self):
        cc = ConditionCorrelator()
        result = cc.correlate_vibration_to_doc([1.0], [1.0])
        assert result.r_squared == 0.0

    def test_mismatched_lengths(self):
        cc = ConditionCorrelator()
        rms = [0.5, 1.0, 1.5, 2.0]
        doc = [0.5, 1.0, 1.5]
        result = cc.correlate_vibration_to_doc(rms, doc)
        assert result.model_name == "vibration_to_doc"
        # Should trim to shorter length

    def test_predicted_value(self):
        cc = ConditionCorrelator()
        rms = [1.0, 2.0, 3.0, 4.0, 5.0]
        doc = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = cc.correlate_vibration_to_doc(rms, doc)
        assert abs(result.predicted_value - 5.0) < 0.1
        assert abs(result.actual_value - 5.0) < 0.1

    def test_confidence_capped(self):
        cc = ConditionCorrelator()
        rms = [1.0, 2.0, 3.0, 4.0, 5.0]
        doc = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = cc.correlate_vibration_to_doc(rms, doc)
        assert result.confidence <= 0.95


# ---------------------------------------------------------------------------
# Vibration → Feed Correlation
# ---------------------------------------------------------------------------

class TestVibrationToFeed:
    def test_linear_relationship(self):
        cc = ConditionCorrelator()
        kurtosis = [3.0, 4.0, 5.0, 6.0, 7.0]
        feed = [100.0, 200.0, 300.0, 400.0, 500.0]
        result = cc.correlate_vibration_to_feed(kurtosis, feed)
        assert result.model_name == "vibration_to_feed"
        assert result.r_squared > 0.99

    def test_insufficient_data(self):
        cc = ConditionCorrelator()
        result = cc.correlate_vibration_to_feed([3.0], [100.0])
        assert result.r_squared == 0.0

    def test_confidence_capped_at_09(self):
        cc = ConditionCorrelator()
        kurtosis = [1.0, 2.0, 3.0, 4.0, 5.0]
        feed = [1.0, 2.0, 3.0, 4.0, 5.0]
        result = cc.correlate_vibration_to_feed(kurtosis, feed)
        assert result.confidence <= 0.9


# ---------------------------------------------------------------------------
# Power → MRR Correlation
# ---------------------------------------------------------------------------

class TestPowerToMRR:
    def test_linear_relationship(self):
        cc = ConditionCorrelator()
        power = [1.0, 2.0, 3.0, 4.0, 5.0]
        mrr = [10.0, 20.0, 30.0, 40.0, 50.0]
        result = cc.correlate_power_to_mrr(power, mrr)
        assert result.model_name == "power_to_mrr"
        assert result.r_squared > 0.99

    def test_insufficient_data(self):
        cc = ConditionCorrelator()
        result = cc.correlate_power_to_mrr([5.0], [50.0])
        assert result.r_squared == 0.0

    def test_predicted_and_actual(self):
        cc = ConditionCorrelator()
        power = [1.0, 2.0, 3.0, 4.0, 5.0]
        mrr = [10.0, 20.0, 30.0, 40.0, 50.0]
        result = cc.correlate_power_to_mrr(power, mrr)
        assert abs(result.predicted_value - 50.0) < 1.0
        assert abs(result.actual_value - 50.0) < 0.01


# ---------------------------------------------------------------------------
# Wear State Estimation
# ---------------------------------------------------------------------------

class TestWearStateEstimation:
    def test_fresh_tool_low_temp(self):
        cc = ConditionCorrelator()
        result = cc.estimate_wear_state([30.0, 31.0, 30.5, 31.5])
        assert result.state == "fresh"
        assert result.wear_index < 0.2

    def test_worn_tool_high_temp(self):
        cc = ConditionCorrelator()
        result = cc.estimate_wear_state([250.0, 260.0, 270.0, 280.0])
        assert result.state in ("worn", "end_of_life")
        assert result.wear_index > 0.5

    def test_end_of_life(self):
        cc = ConditionCorrelator()
        # Need high temp + rising trend + rising vibration to push wear_index > 0.8
        result = cc.estimate_wear_state(
            [380.0, 390.0, 395.0, 400.0],
            rms_values=[2.0, 3.0, 5.0, 8.0],
        )
        assert result.state == "end_of_life"
        assert result.wear_index > 0.8

    def test_normal_wear(self):
        cc = ConditionCorrelator()
        result = cc.estimate_wear_state([120.0, 125.0, 130.0, 135.0])
        assert result.state in ("fresh", "normal")

    def test_empty_input(self):
        cc = ConditionCorrelator()
        result = cc.estimate_wear_state([])
        assert result.state == "fresh"
        assert result.wear_index == 0.0

    def test_single_value(self):
        cc = ConditionCorrelator()
        result = cc.estimate_wear_state([100.0])
        assert result.state in ("fresh", "normal")

    def test_vibration_contribution(self):
        cc = ConditionCorrelator()
        # Same temperature, with and without rising vibration
        temp = [200.0] * 10
        result_no_vib = cc.estimate_wear_state(temp)
        rms_rising = [1.0 + 0.5 * i for i in range(10)]
        result_with_vib = cc.estimate_wear_state(temp, rms_values=rms_rising)
        # Rising vibration should increase wear index
        assert result_with_vib.wear_index >= result_no_vib.wear_index

    def test_remaining_life_consistent(self):
        cc = ConditionCorrelator()
        result = cc.estimate_wear_state([200.0, 210.0, 220.0])
        assert abs(result.estimated_remaining_life_pct - (1 - result.wear_index) * 100) < 0.1

    def test_confidence_increases_with_data(self):
        cc = ConditionCorrelator()
        r_short = cc.estimate_wear_state([100.0, 110.0])
        r_long = cc.estimate_wear_state([100.0 + i for i in range(20)])
        assert r_long.confidence >= r_short.confidence


# ---------------------------------------------------------------------------
# Surface Quality Estimation
# ---------------------------------------------------------------------------

class TestSurfaceQualityEstimation:
    def test_excellent_quality(self):
        cc = ConditionCorrelator()
        result = cc.estimate_surface_quality([0.1, 0.12, 0.08])
        assert result.quality_grade == "excellent"
        assert result.estimated_ra_um < 0.4

    def test_good_quality(self):
        cc = ConditionCorrelator()
        result = cc.estimate_surface_quality([0.25, 0.3, 0.28])
        assert result.quality_grade == "good"

    def test_acceptable_quality(self):
        cc = ConditionCorrelator()
        result = cc.estimate_surface_quality([0.5, 0.55, 0.6])
        assert result.quality_grade == "acceptable"

    def test_poor_quality(self):
        cc = ConditionCorrelator()
        result = cc.estimate_surface_quality([1.5, 2.0, 1.8])
        assert result.quality_grade == "poor"
        assert result.estimated_ra_um > 1.6

    def test_empty_input(self):
        cc = ConditionCorrelator()
        result = cc.estimate_surface_quality([])
        assert result.quality_grade == "unknown"

    def test_single_value(self):
        cc = ConditionCorrelator()
        result = cc.estimate_surface_quality([0.5])
        assert result.estimated_ra_um == 1.0  # 0.5 * 2.0
        assert result.quality_grade == "acceptable"


# ---------------------------------------------------------------------------
# Predict from Model
# ---------------------------------------------------------------------------

class TestPredictFromModel:
    def test_predict(self):
        cc = ConditionCorrelator()
        model = CorrelationResult(coefficients=[2.0, 5.0])  # y = 2x + 5
        assert abs(cc.predict_from_model(model, 3.0) - 11.0) < 1e-10

    def test_predict_no_coefficients(self):
        cc = ConditionCorrelator()
        model = CorrelationResult(coefficients=[])
        assert cc.predict_from_model(model, 5.0) == 0.0

    def test_predict_single_coefficient(self):
        cc = ConditionCorrelator()
        model = CorrelationResult(coefficients=[2.0])
        assert cc.predict_from_model(model, 5.0) == 0.0

    def test_roundtrip_fit_predict(self):
        cc = ConditionCorrelator()
        # Fit a model, then use it to predict
        rms = [1.0, 2.0, 3.0, 4.0, 5.0]
        doc = [2.0, 4.0, 6.0, 8.0, 10.0]  # y = 2x
        model = cc.correlate_vibration_to_doc(rms, doc)
        predicted = cc.predict_from_model(model, 3.0)
        assert abs(predicted - 6.0) < 0.1
