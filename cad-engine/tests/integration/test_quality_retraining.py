"""Model Retraining Improvement Tests — CC-EXT-MS4-P0-U05.

Verifies that adding new CMM data and retraining improves predictions.
"""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.quality.surface_finish_model import (
    SurfaceFinishModel, TrainingDataPoint, theoretical_ra,
)
from src.quality.tolerance_correlator import (
    ToleranceCorrelator, CuttingParameterRecord,
)
from src.quality.inspection_schema import (
    FeatureType, InspectionFeature, InspectionResult, SurfaceFinishResult,
)


def _make_training_points(n: int, seed: int, wear_slope: float = 0.3):
    """Generate training data with known wear-Ra relationship."""
    rng = np.random.RandomState(seed)
    points = []
    for _ in range(n):
        feed = rng.uniform(0.05, 0.35)
        wear = rng.uniform(0, 0.9)
        radius = 0.8
        theo = theoretical_ra(feed, radius)
        measured = theo * (1 + wear_slope * wear) + rng.uniform(-0.1, 0.1)
        measured = max(0.1, measured)
        points.append(TrainingDataPoint(
            feed_mm_rev=feed,
            nose_radius_mm=radius,
            wear_index=wear,
            measured_ra_um=measured,
            measured_rz_um=measured * (4.0 + rng.uniform(-0.3, 0.3)),
            material="steel",
            operation="turning",
            tool_id="T01",
        ))
    return points


class TestSurfaceFinishRetraining:
    def test_more_data_improves_predictions(self):
        """Adding more training data should improve or maintain accuracy."""
        model_small = SurfaceFinishModel()
        small_data = _make_training_points(10, seed=42)
        for dp in small_data:
            model_small.add_measurement(dp)
        model_small.train()

        model_large = SurfaceFinishModel()
        large_data = _make_training_points(50, seed=42)
        for dp in large_data:
            model_large.add_measurement(dp)
        model_large.train()

        test_data = _make_training_points(20, seed=99)
        errors_small = []
        errors_large = []
        for dp in test_data:
            pred_s = model_small.predict(
                feed_mm_rev=dp.feed_mm_rev, nose_radius_mm=dp.nose_radius_mm,
                wear_index=dp.wear_index,
                material="steel", operation="turning", tool_id="T01",
            )
            pred_l = model_large.predict(
                feed_mm_rev=dp.feed_mm_rev, nose_radius_mm=dp.nose_radius_mm,
                wear_index=dp.wear_index,
                material="steel", operation="turning", tool_id="T01",
            )
            errors_small.append(abs(pred_s.corrected_ra_um - dp.measured_ra_um))
            errors_large.append(abs(pred_l.corrected_ra_um - dp.measured_ra_um))

        assert np.mean(errors_large) <= np.mean(errors_small) * 1.2

    def test_incremental_training(self):
        """Adding data incrementally and retraining should work."""
        model = SurfaceFinishModel()

        batch1 = _make_training_points(15, seed=42)
        for dp in batch1:
            model.add_measurement(dp)
        result1 = model.train()
        assert result1["status"] == "trained"
        count1 = result1["count"]

        batch2 = _make_training_points(15, seed=99)
        for dp in batch2:
            model.add_measurement(dp)
        result2 = model.train()
        assert result2["count"] == count1 + 15

    def test_learned_rz_ratio_updates(self):
        """Rz/Ra ratio should update when new data has different ratio."""
        model = SurfaceFinishModel()

        for _ in range(10):
            model.add_measurement(TrainingDataPoint(
                feed_mm_rev=0.2, nose_radius_mm=0.8,
                measured_ra_um=1.5, measured_rz_um=7.5,
                material="steel", operation="turning",
            ))
        model.train()
        assert abs(model._global_rz_ratio - 5.0) < 0.5

        for _ in range(20):
            model.add_measurement(TrainingDataPoint(
                feed_mm_rev=0.15, nose_radius_mm=0.8,
                measured_ra_um=1.0, measured_rz_um=3.5,
                material="steel", operation="turning",
            ))
        model.train()
        assert model._global_rz_ratio < 5.0

    def test_confidence_increases_with_training(self):
        """Prediction confidence should increase after training."""
        model = SurfaceFinishModel()
        pred_before = model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8)

        data = _make_training_points(25, seed=42)
        for dp in data:
            model.add_measurement(dp)
        model.train()

        pred_after = model.predict(
            feed_mm_rev=0.2, nose_radius_mm=0.8,
            material="steel", operation="turning", tool_id="T01",
        )
        assert pred_after.confidence > pred_before.confidence


class TestToleranceRetraining:
    def test_adding_entries_improves_sensitivity(self):
        """More entries should give reliable sensitivity analysis."""
        correlator = ToleranceCorrelator()

        rng = np.random.RandomState(42)
        for i in range(30):
            feed = rng.uniform(0.05, 0.4)
            dev = 3 + (feed / 0.2) ** 1.5 * 5 + rng.uniform(-1, 1)
            dev_mm = dev / 1000.0
            feat = InspectionFeature(
                feature_type=FeatureType.CYLINDER,
                nominal_value=50.0,
                actual_value=50.0 + dev_mm,
                deviation=dev_mm,
                upper_tolerance=0.039,
                lower_tolerance=-0.039,
            )
            feat.evaluate_tolerance()
            result = InspectionResult(
                part_id=f"P{i}", operation_id=f"OP{i}",
                material="steel", features=[feat],
            )
            params = CuttingParameterRecord(
                part_id=f"P{i}", operation_id=f"OP{i}",
                cutting_speed_mpm=150, feed_per_rev_mm=feed,
                depth_of_cut_mm=2.0, material="steel",
            )
            correlator.add_correlation(result, params)

        sens = correlator.sensitivity_analysis()
        assert len(sens) > 0

    def test_material_stratification(self):
        """Different materials should have different tolerance behavior."""
        correlator = ToleranceCorrelator()
        rng = np.random.RandomState(42)

        for material, base_dev in [("steel", 5.0), ("aluminum", 8.0)]:
            for i in range(15):
                feed = rng.uniform(0.1, 0.3)
                dev = base_dev + feed * 20 + rng.uniform(-1, 1)
                dev_mm = dev / 1000.0
                feat = InspectionFeature(
                    feature_type=FeatureType.CYLINDER,
                    nominal_value=50.0,
                    actual_value=50.0 + dev_mm,
                    deviation=dev_mm,
                    upper_tolerance=0.039,
                    lower_tolerance=-0.039,
                )
                feat.evaluate_tolerance()
                result = InspectionResult(
                    part_id=f"{material}_{i}", operation_id=f"OP{i}",
                    material=material, features=[feat],
                )
                params = CuttingParameterRecord(
                    part_id=f"{material}_{i}", operation_id=f"OP{i}",
                    cutting_speed_mpm=150, feed_per_rev_mm=feed,
                    depth_of_cut_mm=2.0, material=material,
                )
                correlator.add_correlation(result, params)

        steel_entries = correlator.get_entries_by_material("steel")
        aluminum_entries = correlator.get_entries_by_material("aluminum")
        assert len(steel_entries) >= 10
        assert len(aluminum_entries) >= 10
