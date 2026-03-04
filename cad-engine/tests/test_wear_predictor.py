"""Tests for Tool Wear Prediction Model — CC-EXT-MS3-P0-U05."""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.sensors.wear_predictor import (
    ToolAction,
    WearPrediction,
    WearCurvePoint,
    WearCurve,
    WearPredictor,
    SensorTrends,
    taylor_tool_life,
    compute_sensor_trends,
)
from src.sensors.condition_correlator import WearState


# ---------------------------------------------------------------------------
# Taylor Tool Life
# ---------------------------------------------------------------------------

class TestTaylorToolLife:
    def test_basic_calculation(self):
        # V=200, C=200, n=0.25 -> T = (200/200)^(1/0.25) = 1^4 = 1 min
        life = taylor_tool_life(200.0, 200.0, 0.25)
        assert abs(life - 1.0) < 1e-6

    def test_lower_speed_longer_life(self):
        # V=100, C=200, n=0.25 -> T = (200/100)^4 = 16 min
        life = taylor_tool_life(100.0, 200.0, 0.25)
        assert abs(life - 16.0) < 1e-6

    def test_higher_speed_shorter_life(self):
        life_slow = taylor_tool_life(100.0, 200.0, 0.25)
        life_fast = taylor_tool_life(300.0, 200.0, 0.25)
        assert life_slow > life_fast

    def test_zero_speed(self):
        assert taylor_tool_life(0.0, 200.0, 0.25) == 0.0

    def test_zero_constant(self):
        assert taylor_tool_life(100.0, 0.0, 0.25) == 0.0

    def test_zero_exponent(self):
        assert taylor_tool_life(100.0, 200.0, 0.0) == 0.0

    def test_negative_speed(self):
        assert taylor_tool_life(-100.0, 200.0, 0.25) == 0.0

    def test_realistic_carbide(self):
        # Carbide turning steel: C~300, n~0.25, V=150 m/min
        life = taylor_tool_life(150.0, 300.0, 0.25)
        assert life > 0
        assert life < 1000  # reasonable range


# ---------------------------------------------------------------------------
# Sensor Trends
# ---------------------------------------------------------------------------

class TestSensorTrends:
    def test_all_channels(self):
        trends = compute_sensor_trends(
            vibration_rms=[1.0, 1.1, 1.2, 1.3],
            power_values=[500, 510, 520, 530],
            temp_values=[50, 52, 54, 56],
            ae_rms_values=[0.1, 0.12, 0.14, 0.16],
        )
        assert trends.data_quality == 1.0
        assert trends.vibration_rms_slope > 0
        assert trends.power_slope > 0
        assert trends.temperature_slope > 0
        assert trends.ae_energy_slope > 0

    def test_no_channels(self):
        trends = compute_sensor_trends()
        assert trends.data_quality == 0.0
        assert trends.current_wear_index == 0.0

    def test_single_channel(self):
        trends = compute_sensor_trends(vibration_rms=[1.0, 2.0, 3.0])
        assert trends.data_quality == 0.25
        assert trends.vibration_rms_slope > 0

    def test_flat_trends(self):
        trends = compute_sensor_trends(
            vibration_rms=[1.0, 1.0, 1.0],
            power_values=[500, 500, 500],
            temp_values=[50, 50, 50],
            ae_rms_values=[0.1, 0.1, 0.1],
        )
        assert trends.data_quality == 1.0
        assert trends.current_wear_index < 0.01

    def test_decreasing_trends(self):
        trends = compute_sensor_trends(
            vibration_rms=[3.0, 2.0, 1.0],
        )
        assert trends.vibration_rms_slope < 0
        # Negative slopes should not contribute to wear
        assert trends.current_wear_index == 0.0

    def test_short_data(self):
        trends = compute_sensor_trends(vibration_rms=[1.0])
        assert trends.vibration_rms_slope == 0.0
        assert trends.data_quality == 0.0

    def test_wear_index_bounded(self):
        # Extremely rising trends
        trends = compute_sensor_trends(
            vibration_rms=[0, 10, 20, 30],
            power_values=[0, 500, 1000, 1500],
            temp_values=[0, 50, 100, 150],
            ae_rms_values=[0, 5, 10, 15],
        )
        assert 0 <= trends.current_wear_index <= 1.0


# ---------------------------------------------------------------------------
# WearPrediction Dataclass
# ---------------------------------------------------------------------------

class TestWearPrediction:
    def test_defaults(self):
        p = WearPrediction()
        assert p.remaining_life_min == 0.0
        assert p.action == ToolAction.CONTINUE

    def test_to_dict(self):
        p = WearPrediction(
            remaining_life_min=15.5,
            remaining_life_pct=60.0,
            confidence=0.75,
            confidence_interval_min=(12.0, 19.0),
            action=ToolAction.MONITOR,
            wear_index=0.4,
        )
        d = p.to_dict()
        assert d["remaining_life_min"] == 15.5
        assert d["action"] == "monitor"
        assert d["confidence_interval_min"] == (12.0, 19.0)


class TestToolAction:
    def test_values(self):
        assert ToolAction.CONTINUE.value == "continue"
        assert ToolAction.MONITOR.value == "monitor"
        assert ToolAction.CHANGE.value == "change"


# ---------------------------------------------------------------------------
# WearCurve
# ---------------------------------------------------------------------------

class TestWearCurve:
    def test_defaults(self):
        c = WearCurve()
        assert c.tool_id == ""
        assert len(c.points) == 0

    def test_to_dict(self):
        c = WearCurve(tool_id="T01", material="steel", operation="turning")
        c.points.append(WearCurvePoint(elapsed_min=5.0, wear_index=0.1))
        d = c.to_dict()
        assert d["tool_id"] == "T01"
        assert d["num_points"] == 1


# ---------------------------------------------------------------------------
# WearPredictor — Taylor-only
# ---------------------------------------------------------------------------

class TestWearPredictorTaylorOnly:
    def test_fresh_tool(self):
        wp = WearPredictor()
        pred = wp.predict(
            elapsed_min=0.0,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
        )
        assert pred.taylor_life_min > 0
        assert pred.remaining_life_pct == 100.0
        assert pred.action == ToolAction.CONTINUE

    def test_half_life(self):
        wp = WearPredictor()
        taylor_life = taylor_tool_life(150.0, 300.0, 0.25)
        pred = wp.predict(
            elapsed_min=taylor_life * 0.5,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
        )
        assert abs(pred.remaining_life_pct - 50.0) < 1.0
        assert pred.action in (ToolAction.CONTINUE, ToolAction.MONITOR)

    def test_near_end(self):
        wp = WearPredictor()
        taylor_life = taylor_tool_life(150.0, 300.0, 0.25)
        pred = wp.predict(
            elapsed_min=taylor_life * 0.9,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
        )
        assert pred.remaining_life_pct < 15
        assert pred.action == ToolAction.CHANGE

    def test_past_life(self):
        wp = WearPredictor()
        taylor_life = taylor_tool_life(150.0, 300.0, 0.25)
        pred = wp.predict(
            elapsed_min=taylor_life * 2,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
        )
        assert pred.remaining_life_min == 0
        assert pred.action == ToolAction.CHANGE

    def test_zero_speed(self):
        wp = WearPredictor()
        pred = wp.predict(elapsed_min=0, cutting_speed_mpm=0)
        assert pred.action == ToolAction.CHANGE


# ---------------------------------------------------------------------------
# WearPredictor — With Sensor Trends
# ---------------------------------------------------------------------------

class TestWearPredictorWithSensors:
    def test_sensor_correction_faster_wear(self):
        wp = WearPredictor()
        taylor_life = taylor_tool_life(150.0, 300.0, 0.25)
        # Sensor shows high wear index early in tool life
        trends = SensorTrends(
            vibration_rms_slope=2.0,
            current_wear_index=0.7,
            data_quality=1.0,
        )
        pred = wp.predict(
            elapsed_min=taylor_life * 0.3,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            sensor_trends=trends,
        )
        # Should predict shorter remaining life than Taylor alone
        pred_taylor = wp.predict(
            elapsed_min=taylor_life * 0.3,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
        )
        assert pred.remaining_life_min < pred_taylor.remaining_life_min

    def test_sensor_end_of_life_override(self):
        wp = WearPredictor()
        trends = SensorTrends(current_wear_index=0.9, data_quality=1.0)
        pred = wp.predict(
            elapsed_min=5.0,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            sensor_trends=trends,
        )
        assert pred.action == ToolAction.CHANGE

    def test_sensor_correction_bounded(self):
        wp = WearPredictor()
        trends = SensorTrends(current_wear_index=0.5, data_quality=1.0)
        pred = wp.predict(
            elapsed_min=10.0,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            sensor_trends=trends,
        )
        assert 0.5 <= pred.sensor_correction <= 1.5

    def test_low_data_quality_less_correction(self):
        wp = WearPredictor()
        taylor_life = taylor_tool_life(150.0, 300.0, 0.25)
        trends_high = SensorTrends(current_wear_index=0.5, data_quality=1.0)
        trends_low = SensorTrends(current_wear_index=0.5, data_quality=0.25)
        pred_high = wp.predict(
            elapsed_min=taylor_life * 0.3,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            sensor_trends=trends_high,
        )
        pred_low = wp.predict(
            elapsed_min=taylor_life * 0.3,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            sensor_trends=trends_low,
        )
        # Higher data quality = larger correction away from 1.0
        assert abs(pred_high.sensor_correction - 1.0) >= abs(pred_low.sensor_correction - 1.0)


# ---------------------------------------------------------------------------
# Wear Curve Learning
# ---------------------------------------------------------------------------

class TestWearCurveLearning:
    def test_update_creates_curve(self):
        wp = WearPredictor()
        curve = wp.update_wear_curve("T01-steel-turn", 5.0, 0.1, "T01", "steel", "turning")
        assert curve.tool_id == "T01"
        assert len(curve.points) == 1

    def test_update_appends_points(self):
        wp = WearPredictor()
        wp.update_wear_curve("T01-steel", 5.0, 0.1)
        wp.update_wear_curve("T01-steel", 10.0, 0.25)
        wp.update_wear_curve("T01-steel", 15.0, 0.45)
        curves = wp.learned_curves
        assert len(curves["T01-steel"].points) == 3

    def test_finalize_records_actual_life(self):
        wp = WearPredictor()
        wp.update_wear_curve("T01-steel", 5.0, 0.1)
        wp.update_wear_curve("T01-steel", 10.0, 0.3)
        curve = wp.finalize_wear_curve("T01-steel", actual_life_min=18.0)
        assert curve is not None
        assert curve.actual_life_min == 18.0

    def test_finalize_nonexistent(self):
        wp = WearPredictor()
        result = wp.finalize_wear_curve("nonexistent", 10.0)
        assert result is None

    def test_learned_curve_adjusts_prediction(self):
        wp = WearPredictor()
        wp.update_wear_curve("T01-steel", 5.0, 0.1)
        wp.finalize_wear_curve("T01-steel", actual_life_min=20.0)

        pred_with_curve = wp.predict(
            elapsed_min=10.0,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            curve_key="T01-steel",
        )
        pred_without = wp.predict(
            elapsed_min=10.0,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
        )
        # Predictions should differ when learned curve is available
        assert pred_with_curve.remaining_life_min != pred_without.remaining_life_min
        assert pred_with_curve.confidence > pred_without.confidence


# ---------------------------------------------------------------------------
# Estimate from WearState
# ---------------------------------------------------------------------------

class TestEstimateFromWearState:
    def test_fresh_tool(self):
        wp = WearPredictor()
        ws = WearState(state="fresh", wear_index=0.1, estimated_remaining_life_pct=90.0)
        pred = wp.estimate_from_wear_state(ws, taylor_life_min=30.0)
        assert pred.remaining_life_min == 27.0  # 30 * 0.9
        assert pred.action == ToolAction.CONTINUE

    def test_worn_tool(self):
        wp = WearPredictor()
        ws = WearState(state="worn", wear_index=0.65, estimated_remaining_life_pct=35.0)
        pred = wp.estimate_from_wear_state(ws, taylor_life_min=30.0)
        assert pred.remaining_life_min == 10.5  # 30 * 0.35
        assert pred.action == ToolAction.MONITOR

    def test_end_of_life(self):
        wp = WearPredictor()
        ws = WearState(state="end_of_life", wear_index=0.9, estimated_remaining_life_pct=10.0)
        pred = wp.estimate_from_wear_state(ws, taylor_life_min=30.0)
        assert pred.remaining_life_min == 3.0
        assert pred.action == ToolAction.CHANGE

    def test_confidence_from_wear_state(self):
        wp = WearPredictor()
        ws = WearState(confidence=0.8)
        pred = wp.estimate_from_wear_state(ws, taylor_life_min=30.0)
        assert pred.confidence == 0.8


# ---------------------------------------------------------------------------
# Simulated Wear Progression (End-to-End)
# ---------------------------------------------------------------------------

class TestWearProgression:
    def test_fresh_to_end_of_life(self):
        """Simulate a tool going from fresh to end-of-life."""
        wp = WearPredictor()
        taylor_life = taylor_tool_life(150.0, 300.0, 0.25)
        actions_seen = set()

        for pct in [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]:
            elapsed = taylor_life * pct / 100
            pred = wp.predict(
                elapsed_min=elapsed,
                cutting_speed_mpm=150.0,
                taylor_c=300.0,
                taylor_n=0.25,
            )
            actions_seen.add(pred.action)

        # Should see transition through actions
        assert ToolAction.CONTINUE in actions_seen
        assert ToolAction.CHANGE in actions_seen

    def test_sudden_breakage(self):
        """Sensor detects sudden tool breakage mid-life."""
        wp = WearPredictor()
        taylor_life = taylor_tool_life(150.0, 300.0, 0.25)

        # Normal at 30% life
        pred_normal = wp.predict(
            elapsed_min=taylor_life * 0.3,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
        )
        assert pred_normal.action in (ToolAction.CONTINUE, ToolAction.MONITOR)

        # Sudden breakage detected via sensor
        trends_breakage = SensorTrends(current_wear_index=0.95, data_quality=1.0)
        pred_break = wp.predict(
            elapsed_min=taylor_life * 0.3,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            sensor_trends=trends_breakage,
        )
        assert pred_break.action == ToolAction.CHANGE

    def test_confidence_interval_narrowing(self):
        """Confidence interval should narrow with more data."""
        wp = WearPredictor()
        # No sensor data, no curve
        pred_low = wp.predict(
            elapsed_min=0,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
        )
        # With sensor data + learned curve
        wp.update_wear_curve("k1", 5.0, 0.1)
        wp.finalize_wear_curve("k1", 20.0)
        trends = SensorTrends(data_quality=1.0, current_wear_index=0.3)
        pred_high = wp.predict(
            elapsed_min=5.0,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            sensor_trends=trends,
            curve_key="k1",
        )
        assert pred_high.confidence > pred_low.confidence
