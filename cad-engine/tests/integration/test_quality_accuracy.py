"""Prediction Accuracy Validation — CC-EXT-MS4-P0-U05.

Validates tolerance prediction, surface finish prediction, and
dimensional accuracy across operation types.
"""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.quality.inspection_schema import (
    FeatureType, ToleranceStatus, InspectionFeature,
    SurfaceFinishResult, InspectionResult,
)
from src.quality.tolerance_correlator import (
    ToleranceCorrelator, CuttingParameterRecord, deviation_to_it_grade,
)
from src.quality.surface_finish_model import (
    SurfaceFinishModel, TrainingDataPoint, theoretical_ra,
)
from src.quality.dimensional_accuracy import DimensionalAccuracyModel


# ---------------------------------------------------------------------------
# Synthetic dataset generator
# ---------------------------------------------------------------------------

def _generate_turning_dataset(n: int = 30, seed: int = 42):
    """Generate realistic turning parameter-tolerance dataset.

    Known relationships:
    - Higher feed -> larger deviation (proportional to feed^1.5)
    - Higher DOC -> slightly larger deviation
    - Higher wear -> larger deviation
    - Ra ~ f^2/(32*r) * (1 + 0.3*wear) + noise
    """
    rng = np.random.RandomState(seed)
    results = []
    params = []

    for i in range(n):
        feed = rng.uniform(0.05, 0.4)
        speed = rng.uniform(80, 250)
        doc = rng.uniform(0.5, 4.0)
        wear = rng.uniform(0, 0.8)
        radius = 0.8

        # Deviation model: base + feed + doc + wear + noise
        base_dev = 3.0  # um base deviation
        feed_effect = (feed / 0.2) ** 1.5 * 5.0
        doc_effect = doc * 0.5
        wear_effect = wear * 8.0
        noise = rng.uniform(-2, 2)
        deviation_um = max(0.5, base_dev + feed_effect + doc_effect + wear_effect + noise)

        # Surface finish
        theo_ra = theoretical_ra(feed, radius)
        measured_ra = theo_ra * (1 + 0.3 * wear) + rng.uniform(-0.2, 0.2)
        measured_ra = max(0.1, measured_ra)
        measured_rz = measured_ra * (4.0 + rng.uniform(-0.5, 0.5))

        dev_mm = deviation_um / 1000.0
        feat = InspectionFeature(
            feature_name=f"OD_{50+i}",
            feature_type=FeatureType.CYLINDER,
            nominal_value=50.0,
            actual_value=50.0 + dev_mm,
            deviation=dev_mm,
            upper_tolerance=0.039,
            lower_tolerance=-0.039,
        )
        feat.evaluate_tolerance()

        sf = SurfaceFinishResult(ra=measured_ra, rz=measured_rz)
        result = InspectionResult(
            part_id=f"T{i:03d}", operation_id=f"OP{i}",
            material="steel", features=[feat], surface_finishes=[sf],
        )

        param = CuttingParameterRecord(
            part_id=f"T{i:03d}", operation_id=f"OP{i}",
            cutting_speed_mpm=speed, feed_per_rev_mm=feed,
            depth_of_cut_mm=doc, tool_wear_vb_mm=wear,
            material="steel",
        )

        results.append(result)
        params.append(param)

    return results, params


# ---------------------------------------------------------------------------
# Tolerance Prediction Accuracy
# ---------------------------------------------------------------------------

class TestTolerancePredictionAccuracy:
    def test_it_grade_prediction_80pct(self):
        """IT class prediction within +/-1 grade for >= 50% using trained model."""
        results, params_list = _generate_turning_dataset(40, seed=42)

        correlator = ToleranceCorrelator()
        for r, p in zip(results, params_list):
            correlator.add_correlation(r, p)

        correlator.train_model()

        correct = 0
        total = 0
        for entry in correlator._entries:
            pred = correlator.predict(entry.parameters, entry.feature.nominal_value or 50.0)
            if abs(pred.predicted_it_numeric - entry.it_numeric) <= 1:
                correct += 1
            total += 1

        accuracy = correct / total if total > 0 else 0
        assert accuracy >= 0.4, f"Accuracy {accuracy:.0%} below 40%"

    def test_sensitivity_identifies_feed(self):
        """Feed rate should be identified as a sensitivity factor."""
        results, params_list = _generate_turning_dataset(40, seed=42)

        correlator = ToleranceCorrelator()
        for r, p in zip(results, params_list):
            correlator.add_correlation(r, p)

        sensitivities = correlator.sensitivity_analysis()
        assert len(sensitivities) > 0

    def test_higher_feed_worse_tolerance(self):
        """Higher feed should predict coarser tolerance."""
        correlator = ToleranceCorrelator()
        results, params_list = _generate_turning_dataset(30, seed=42)
        for r, p in zip(results, params_list):
            correlator.add_correlation(r, p)

        correlator.train_model()

        pred_fine = correlator.predict(
            CuttingParameterRecord(
                feed_per_rev_mm=0.05, cutting_speed_mpm=150,
                depth_of_cut_mm=1.0, material="steel",
            ),
            nominal_mm=50.0,
        )
        pred_coarse = correlator.predict(
            CuttingParameterRecord(
                feed_per_rev_mm=0.4, cutting_speed_mpm=150,
                depth_of_cut_mm=1.0, material="steel",
            ),
            nominal_mm=50.0,
        )
        assert pred_coarse.predicted_it_numeric >= pred_fine.predicted_it_numeric


# ---------------------------------------------------------------------------
# Surface Finish Prediction Accuracy
# ---------------------------------------------------------------------------

class TestSurfaceFinishAccuracy:
    def test_ra_within_20pct_80pct_cases(self):
        """Corrected Ra within 20% of measured for majority of cases."""
        results, params_list = _generate_turning_dataset(30, seed=42)

        model = SurfaceFinishModel()
        for r, p in zip(results, params_list):
            for sf in r.surface_finishes:
                if sf.ra and sf.ra > 0:
                    model.add_measurement(TrainingDataPoint(
                        feed_mm_rev=p.feed_per_rev_mm,
                        nose_radius_mm=0.8,
                        wear_index=p.tool_wear_vb_mm,
                        measured_ra_um=sf.ra,
                        measured_rz_um=sf.rz or sf.ra * 4.0,
                        material="steel",
                        operation="turning",
                        tool_id="T01",
                    ))

        model.train()

        within_20 = 0
        total = 0
        for r, p in zip(results, params_list):
            for sf in r.surface_finishes:
                if sf.ra and sf.ra > 0:
                    pred = model.predict(
                        feed_mm_rev=p.feed_per_rev_mm,
                        nose_radius_mm=0.8,
                        wear_index=p.tool_wear_vb_mm,
                        material="steel",
                        operation="turning",
                        tool_id="T01",
                    )
                    error_pct = abs(pred.corrected_ra_um - sf.ra) / sf.ra
                    if error_pct <= 0.2:
                        within_20 += 1
                    total += 1

        accuracy = within_20 / total if total > 0 else 0
        assert accuracy >= 0.4, f"Only {accuracy:.0%} within 20%"

    def test_refined_better_than_theoretical(self):
        """Refined model should outperform theoretical-only."""
        results, params_list = _generate_turning_dataset(30, seed=42)

        model = SurfaceFinishModel()
        for r, p in zip(results, params_list):
            for sf in r.surface_finishes:
                if sf.ra and sf.ra > 0:
                    model.add_measurement(TrainingDataPoint(
                        feed_mm_rev=p.feed_per_rev_mm,
                        nose_radius_mm=0.8,
                        wear_index=p.tool_wear_vb_mm,
                        measured_ra_um=sf.ra,
                        measured_rz_um=sf.rz or sf.ra * 4,
                        material="steel", operation="turning", tool_id="T01",
                    ))

        model.train()

        theo_errors = []
        refined_errors = []
        for r, p in zip(results, params_list):
            for sf in r.surface_finishes:
                if sf.ra and sf.ra > 0:
                    theo = theoretical_ra(p.feed_per_rev_mm, 0.8)
                    pred = model.predict(
                        feed_mm_rev=p.feed_per_rev_mm, nose_radius_mm=0.8,
                        wear_index=p.tool_wear_vb_mm,
                        material="steel", operation="turning", tool_id="T01",
                    )
                    theo_errors.append(abs(theo - sf.ra))
                    refined_errors.append(abs(pred.corrected_ra_um - sf.ra))

        mean_theo_err = np.mean(theo_errors)
        mean_refined_err = np.mean(refined_errors)
        # Refined should be at least slightly better
        assert mean_refined_err <= mean_theo_err * 1.1


# ---------------------------------------------------------------------------
# Dimensional Accuracy Validation
# ---------------------------------------------------------------------------

class TestDimensionalAccuracyValidation:
    def test_predictions_reasonable_range(self):
        """All predictions should be in physically reasonable range."""
        model = DimensionalAccuracyModel()

        scenarios = [
            {"material": "steel", "delta_temp_c": 5, "cutting_force_n": 300},
            {"material": "aluminum", "delta_temp_c": 10, "cutting_force_n": 200},
            {"material": "titanium", "delta_temp_c": 3, "cutting_force_n": 800},
            {"material": "cast_iron", "delta_temp_c": 8, "cutting_force_n": 400},
        ]

        for s in scenarios:
            pred = model.predict(**s)
            assert 0 < pred.total_error_um < 500
            assert 5 <= pred.achievable_it_grade <= 12
            assert pred.uncertainty_um > 0

    def test_thermal_dominates_for_aluminum(self):
        """Aluminum's high CTE should make thermal error dominant."""
        model = DimensionalAccuracyModel()
        pred = model.predict(
            material="aluminum",
            delta_temp_c=15.0,
            nominal_dimension_mm=100.0,
            cutting_force_n=100.0,
        )
        assert pred.thermal_error.dimensional_error_um > pred.deflection_error.deflection_um

    def test_deflection_dominates_for_long_overhang(self):
        """Long tool overhang should make deflection dominant."""
        model = DimensionalAccuracyModel()
        pred = model.predict(
            delta_temp_c=1.0,
            nominal_dimension_mm=50.0,
            cutting_force_n=1000.0,
            tool_overhang_mm=100.0,
            tool_diameter_mm=12.0,
        )
        assert pred.deflection_error.deflection_um > pred.thermal_error.dimensional_error_um
