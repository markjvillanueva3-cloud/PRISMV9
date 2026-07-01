"""Tests for Surface Finish Prediction Refinement — CC-EXT-MS4-P0-U03."""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.quality.surface_finish_model import (
    CorrectionFactors,
    SurfaceFinishPrediction,
    SurfaceFinishModel,
    TrainingDataPoint,
    theoretical_ra,
    _bue_correction,
    _chatter_mark_correction,
    _thermal_damage_correction,
)


# ---------------------------------------------------------------------------
# Theoretical Ra
# ---------------------------------------------------------------------------

class TestTheoreticalRa:
    def test_basic_calculation(self):
        # f=0.2 mm/rev, r=0.8 mm -> Ra = (0.2^2)/(32*0.8) = 0.04/25.6 = 0.0015625 mm = 1.5625 µm
        ra = theoretical_ra(0.2, 0.8)
        assert abs(ra - 1.5625) < 0.01

    def test_finer_feed_lower_ra(self):
        ra_coarse = theoretical_ra(0.3, 0.8)
        ra_fine = theoretical_ra(0.1, 0.8)
        assert ra_fine < ra_coarse

    def test_larger_radius_lower_ra(self):
        ra_small = theoretical_ra(0.2, 0.4)
        ra_large = theoretical_ra(0.2, 1.2)
        assert ra_large < ra_small

    def test_zero_feed(self):
        assert theoretical_ra(0.0, 0.8) == 0.0

    def test_zero_radius(self):
        assert theoretical_ra(0.2, 0.0) == 0.0

    def test_negative_values(self):
        assert theoretical_ra(-0.2, 0.8) == 0.0
        assert theoretical_ra(0.2, -0.8) == 0.0

    def test_realistic_finishing(self):
        # Finishing: f=0.08, r=0.8 -> Ra ≈ 0.3125 µm (good finish)
        ra = theoretical_ra(0.08, 0.8)
        assert 0.2 < ra < 0.5

    def test_realistic_roughing(self):
        # Roughing: f=0.4, r=0.8 -> Ra ≈ 6.25 µm
        ra = theoretical_ra(0.4, 0.8)
        assert 5 < ra < 8


# ---------------------------------------------------------------------------
# Non-linear Corrections
# ---------------------------------------------------------------------------

class TestBUECorrection:
    def test_no_bue_high_speed(self):
        assert _bue_correction(200.0, 20.0) == 1.0

    def test_no_bue_hard_material(self):
        assert _bue_correction(50.0, 45.0) == 1.0

    def test_bue_soft_slow(self):
        correction = _bue_correction(30.0, 15.0)
        assert correction > 1.0  # BUE worsens finish

    def test_bue_increases_at_lower_speed(self):
        c1 = _bue_correction(60.0, 15.0)
        c2 = _bue_correction(20.0, 15.0)
        assert c2 > c1

    def test_bue_zero_inputs(self):
        assert _bue_correction(0.0, 20.0) == 1.0
        assert _bue_correction(100.0, 0.0) == 1.0


class TestChatterCorrection:
    def test_no_chatter_low_vibration(self):
        assert _chatter_mark_correction(0.3) == 1.0

    def test_chatter_high_vibration(self):
        c = _chatter_mark_correction(1.5)
        assert c > 1.0

    def test_chatter_increases_with_vibration(self):
        c1 = _chatter_mark_correction(0.8)
        c2 = _chatter_mark_correction(2.0)
        assert c2 > c1

    def test_chatter_capped(self):
        c = _chatter_mark_correction(100.0)
        assert c <= 4.0  # 1 + max 3.0


class TestThermalDamageCorrection:
    def test_no_damage_soft_material(self):
        assert _thermal_damage_correction(300.0, 30.0) == 1.0

    def test_no_damage_low_speed(self):
        assert _thermal_damage_correction(150.0, 60.0) == 1.0

    def test_damage_hard_fast(self):
        c = _thermal_damage_correction(350.0, 62.0)
        assert c > 1.0

    def test_damage_increases_with_speed(self):
        c1 = _thermal_damage_correction(250.0, 60.0)
        c2 = _thermal_damage_correction(400.0, 60.0)
        assert c2 > c1


# ---------------------------------------------------------------------------
# CorrectionFactors
# ---------------------------------------------------------------------------

class TestCorrectionFactors:
    def test_defaults_neutral(self):
        cf = CorrectionFactors()
        assert cf.combined == 1.0

    def test_combined_product(self):
        cf = CorrectionFactors(material_hardness=1.2, tool_wear=1.1, vibration=1.0, coolant=0.9)
        expected = 1.2 * 1.1 * 1.0 * 0.9 * 1.0
        assert abs(cf.combined - expected) < 1e-6

    def test_to_dict(self):
        d = CorrectionFactors().to_dict()
        assert "combined" in d
        assert d["combined"] == 1.0


# ---------------------------------------------------------------------------
# SurfaceFinishModel — Prediction
# ---------------------------------------------------------------------------

class TestSurfaceFinishModelPredict:
    def test_basic_prediction(self):
        model = SurfaceFinishModel()
        pred = model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8)
        assert pred.theoretical_ra_um > 0
        assert pred.corrected_ra_um > 0
        assert pred.predicted_rz_um > 0

    def test_wear_increases_ra(self):
        model = SurfaceFinishModel()
        pred_fresh = model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8, wear_index=0.0)
        pred_worn = model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8, wear_index=0.8)
        assert pred_worn.corrected_ra_um > pred_fresh.corrected_ra_um

    def test_flood_coolant_helps(self):
        model = SurfaceFinishModel()
        pred_flood = model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8, coolant_type="flood")
        pred_dry = model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8, coolant_type="dry")
        assert pred_dry.corrected_ra_um > pred_flood.corrected_ra_um

    def test_rz_default_ratio(self):
        model = SurfaceFinishModel()
        pred = model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8)
        assert abs(pred.predicted_rz_um / pred.corrected_ra_um - 4.0) < 0.01

    def test_prediction_to_dict(self):
        model = SurfaceFinishModel()
        pred = model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8)
        d = pred.to_dict()
        assert "theoretical_ra_um" in d
        assert "corrected_ra_um" in d
        assert "corrections" in d

    def test_bue_effect_on_prediction(self):
        model = SurfaceFinishModel()
        pred = model.predict(
            feed_mm_rev=0.2, nose_radius_mm=0.8,
            cutting_speed_mpm=30.0, material_hardness_hrc=15.0,
        )
        # BUE should increase corrected Ra above theoretical
        assert pred.corrected_ra_um > pred.theoretical_ra_um


# ---------------------------------------------------------------------------
# SurfaceFinishModel — Training
# ---------------------------------------------------------------------------

class TestSurfaceFinishModelTraining:
    def _make_data(self, n: int = 20) -> list[TrainingDataPoint]:
        np.random.seed(42)
        points = []
        for _ in range(n):
            feed = np.random.uniform(0.05, 0.4)
            radius = 0.8
            wear = np.random.uniform(0, 1)
            theo = theoretical_ra(feed, radius)
            # Measured = theoretical * (1 + 0.3*wear) + noise
            measured_ra = theo * (1 + 0.3 * wear) + np.random.uniform(-0.1, 0.1)
            measured_rz = measured_ra * (4.0 + np.random.uniform(-0.5, 0.5))
            points.append(TrainingDataPoint(
                feed_mm_rev=feed,
                nose_radius_mm=radius,
                wear_index=wear,
                measured_ra_um=max(0.1, measured_ra),
                measured_rz_um=max(0.5, measured_rz),
                material="steel",
                operation="turning",
                tool_id="T01",
            ))
        return points

    def test_train_insufficient(self):
        model = SurfaceFinishModel()
        model.add_measurement(TrainingDataPoint(feed_mm_rev=0.2, nose_radius_mm=0.8, measured_ra_um=1.5))
        result = model.train()
        assert result["status"] == "insufficient_data"

    def test_train_with_data(self):
        model = SurfaceFinishModel()
        for dp in self._make_data(20):
            model.add_measurement(dp)
        result = model.train()
        assert result["status"] == "trained"
        assert result["count"] == 20
        assert result["keys_learned"] >= 1

    def test_trained_model_uses_learned(self):
        model = SurfaceFinishModel()
        for dp in self._make_data(20):
            model.add_measurement(dp)
        model.train()

        pred = model.predict(
            feed_mm_rev=0.2, nose_radius_mm=0.8,
            material="steel", operation="turning", tool_id="T01",
        )
        # Trained model should have higher confidence
        assert pred.confidence >= 0.75

    def test_rz_ratio_learned(self):
        model = SurfaceFinishModel()
        for dp in self._make_data(20):
            model.add_measurement(dp)
        model.train()
        # Global Rz ratio should be near 4.0 (our synthetic data target)
        assert 3.0 < model._global_rz_ratio < 5.0

    def test_training_count(self):
        model = SurfaceFinishModel()
        for dp in self._make_data(10):
            model.add_measurement(dp)
        assert model.training_count == 10
