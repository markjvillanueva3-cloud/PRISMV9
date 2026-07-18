"""Tests for Tolerance-to-Parameter Correlation — CC-EXT-MS4 P0-U02.

Covers: IT grade mapping, correlation entry creation, sensitivity analysis,
model training, tolerance prediction, material stratification.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.quality.inspection_schema import (
    FeatureType,
    InspectionFeature,
    InspectionResult,
    ToleranceStatus,
)
from src.quality.tolerance_correlator import (
    CuttingParameterRecord,
    SensitivityResult,
    ToleranceCorrelationEntry,
    ToleranceCorrelator,
    TolerancePrediction,
    deviation_to_it_grade,
    it_grade_to_numeric,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_inspection(
    deviations: list[float],
    material: str = "aluminum",
    part_id: str = "P1",
) -> InspectionResult:
    """Create an InspectionResult with features at given deviations."""
    result = InspectionResult(part_id=part_id, material=material)
    for i, dev in enumerate(deviations):
        feat = InspectionFeature(
            feature_name=f"F{i}",
            feature_type=FeatureType.CIRCLE,
            nominal_value=25.0,
            actual_value=25.0 + dev,
            deviation=dev,
            upper_tolerance=0.05,
            lower_tolerance=-0.05,
            status=ToleranceStatus.PASS if abs(dev) <= 0.05 else ToleranceStatus.FAIL,
        )
        result.features.append(feat)
    return result


def _make_params(
    speed: float = 200.0,
    feed: float = 0.1,
    doc: float = 2.0,
    wear: float = 0.0,
    material: str = "aluminum",
    operation: str = "milling",
) -> CuttingParameterRecord:
    return CuttingParameterRecord(
        cutting_speed_mpm=speed,
        feed_per_tooth_mm=feed,
        depth_of_cut_mm=doc,
        tool_wear_vb_mm=wear,
        material=material,
        operation_type=operation,
    )


# ===========================================================================
# IT Grade Mapping
# ===========================================================================

class TestITGradeMapping:

    def test_small_deviation_high_grade(self):
        """Very small deviation → high IT grade (IT5-IT7)."""
        grade = deviation_to_it_grade(0.005, 25.0)  # 5µm
        num = it_grade_to_numeric(grade)
        assert num <= 7

    def test_medium_deviation_mid_grade(self):
        """Medium deviation → IT8-IT10."""
        grade = deviation_to_it_grade(0.025, 25.0)  # 25µm
        num = it_grade_to_numeric(grade)
        assert 7 <= num <= 10

    def test_large_deviation_low_grade(self):
        """Large deviation → IT11+."""
        grade = deviation_to_it_grade(0.100, 25.0)  # 100µm
        num = it_grade_to_numeric(grade)
        assert num >= 10

    def test_zero_deviation_best_grade(self):
        grade = deviation_to_it_grade(0.0, 25.0)
        num = it_grade_to_numeric(grade)
        assert num <= 1  # IT01 or IT0

    def test_dimension_scaling(self):
        """Larger nominal dimension → higher tolerance for same IT grade."""
        grade_small = deviation_to_it_grade(0.010, 5.0)
        grade_large = deviation_to_it_grade(0.010, 100.0)
        # Same deviation on smaller part = coarser grade
        assert it_grade_to_numeric(grade_small) >= it_grade_to_numeric(grade_large)

    def test_grade_format(self):
        grade = deviation_to_it_grade(0.020, 25.0)
        assert grade.startswith("IT")

    def test_it_grade_to_numeric(self):
        assert it_grade_to_numeric("IT6") == 6
        assert it_grade_to_numeric("IT12") == 12
        assert it_grade_to_numeric("IT01") == 1


# ===========================================================================
# Correlation Entry Creation
# ===========================================================================

class TestCorrelationEntries:

    def test_add_correlation(self):
        corr = ToleranceCorrelator()
        insp = _make_inspection([0.010, 0.020, -0.015])
        params = _make_params()
        entries = corr.add_correlation(insp, params)
        assert len(entries) == 3
        assert corr.entry_count == 3

    def test_entries_have_it_grades(self):
        corr = ToleranceCorrelator()
        insp = _make_inspection([0.010])
        params = _make_params()
        entries = corr.add_correlation(insp, params)
        assert entries[0].it_grade.startswith("IT")
        assert entries[0].it_numeric > 0

    def test_skip_not_evaluated(self):
        """Features with NOT_EVALUATED status are skipped."""
        corr = ToleranceCorrelator()
        result = InspectionResult()
        result.features = [
            InspectionFeature(deviation=0.01, status=ToleranceStatus.PASS),
            InspectionFeature(deviation=0.0, status=ToleranceStatus.NOT_EVALUATED),
        ]
        params = _make_params()
        entries = corr.add_correlation(result, params)
        assert len(entries) == 1

    def test_material_from_params(self):
        corr = ToleranceCorrelator()
        insp = _make_inspection([0.01])
        params = _make_params(material="steel")
        entries = corr.add_correlation(insp, params)
        assert entries[0].material == "steel"

    def test_it_grade_distribution(self):
        corr = ToleranceCorrelator()
        insp = _make_inspection([0.005, 0.005, 0.020, 0.100])
        params = _make_params()
        corr.add_correlation(insp, params)
        dist = corr.get_it_grade_distribution()
        assert len(dist) >= 1
        assert sum(dist.values()) == 4


# ===========================================================================
# Sensitivity Analysis
# ===========================================================================

class TestSensitivityAnalysis:

    def _build_correlated_data(self, correlator: ToleranceCorrelator):
        """Build synthetic data where feed rate correlates with deviation."""
        for feed in [0.05, 0.10, 0.15, 0.20, 0.25]:
            # Higher feed → higher deviation (linear-ish)
            dev = feed * 0.15 + 0.002
            insp = _make_inspection([dev])
            params = _make_params(feed=feed, speed=200.0)
            correlator.add_correlation(insp, params)

    def test_sensitivity_detects_feed_correlation(self):
        corr = ToleranceCorrelator()
        self._build_correlated_data(corr)
        results = corr.sensitivity_analysis()
        assert len(results) >= 1
        # Feed per tooth should be the most important
        feed_result = next((r for r in results if r.parameter_name == "feed_per_tooth"), None)
        assert feed_result is not None
        assert feed_result.correlation > 0.5

    def test_sensitivity_returns_sorted(self):
        corr = ToleranceCorrelator()
        self._build_correlated_data(corr)
        results = corr.sensitivity_analysis()
        importances = [r.importance for r in results]
        assert importances == sorted(importances, reverse=True)

    def test_sensitivity_normalized(self):
        corr = ToleranceCorrelator()
        self._build_correlated_data(corr)
        results = corr.sensitivity_analysis()
        if results:
            assert results[0].importance == 1.0  # Top is normalized to 1.0

    def test_sensitivity_insufficient_data(self):
        corr = ToleranceCorrelator()
        insp = _make_inspection([0.01])
        corr.add_correlation(insp, _make_params())
        results = corr.sensitivity_analysis()
        assert results == []

    def test_sensitivity_to_dict(self):
        corr = ToleranceCorrelator()
        self._build_correlated_data(corr)
        results = corr.sensitivity_analysis()
        if results:
            d = results[0].to_dict()
            assert "parameter_name" in d
            assert "correlation" in d
            assert "importance" in d
            assert "direction" in d


# ===========================================================================
# Model Training
# ===========================================================================

class TestModelTraining:

    def _build_training_data(self, correlator: ToleranceCorrelator, material: str = "aluminum"):
        """Build training data with known feed→deviation relationship."""
        for i in range(10):
            feed = 0.05 + i * 0.02
            wear = 0.05 * (i / 10)
            # Deviation correlates with feed and wear
            dev = feed * 0.12 + wear * 0.5 + 0.003
            insp = _make_inspection([dev], material=material)
            params = _make_params(feed=feed, wear=wear, material=material)
            correlator.add_correlation(insp, params)

    def test_train_returns_coefficients(self):
        corr = ToleranceCorrelator()
        self._build_training_data(corr)
        coeffs = corr.train_model()
        assert len(coeffs) >= 1
        assert "feed_per_tooth" in coeffs

    def test_feed_coefficient_positive(self):
        """Higher feed → higher deviation → positive coefficient."""
        corr = ToleranceCorrelator()
        self._build_training_data(corr)
        coeffs = corr.train_model()
        assert coeffs.get("feed_per_tooth", 0) > 0

    def test_train_insufficient_data(self):
        corr = ToleranceCorrelator()
        coeffs = corr.train_model()
        assert coeffs == {}


# ===========================================================================
# Tolerance Prediction
# ===========================================================================

class TestTolerancePrediction:

    def _trained_correlator(self) -> ToleranceCorrelator:
        corr = ToleranceCorrelator()
        for i in range(15):
            feed = 0.05 + i * 0.015
            dev = feed * 0.13 + 0.002
            insp = _make_inspection([dev])
            params = _make_params(feed=feed)
            corr.add_correlation(insp, params)
        corr.train_model()
        return corr

    def test_predict_with_trained_model(self):
        corr = self._trained_correlator()
        params = _make_params(feed=0.10)
        pred = corr.predict(params)
        assert pred.predicted_it_grade.startswith("IT")
        assert pred.confidence > 0.4
        assert pred.predicted_deviation_mm >= 0

    def test_higher_feed_predicts_coarser_grade(self):
        corr = self._trained_correlator()
        pred_low = corr.predict(_make_params(feed=0.05))
        pred_high = corr.predict(_make_params(feed=0.25))
        # Higher feed should predict coarser tolerance (higher IT number or same)
        assert pred_high.predicted_it_numeric >= pred_low.predicted_it_numeric

    def test_heuristic_prediction(self):
        """Untrained model falls back to heuristic."""
        corr = ToleranceCorrelator()
        params = _make_params(feed=0.10)
        pred = corr.predict(params)
        assert pred.confidence == 0.3  # Heuristic confidence
        assert pred.predicted_it_grade.startswith("IT")

    def test_heuristic_wear_increases_deviation(self):
        corr = ToleranceCorrelator()
        pred_new = corr.predict(_make_params(feed=0.10, wear=0.0))
        pred_worn = corr.predict(_make_params(feed=0.10, wear=0.3))
        assert pred_worn.predicted_deviation_mm > pred_new.predicted_deviation_mm

    def test_prediction_to_dict(self):
        corr = ToleranceCorrelator()
        pred = corr.predict(_make_params())
        d = pred.to_dict()
        assert "predicted_it_grade" in d
        assert "predicted_deviation_mm" in d
        assert "confidence" in d
        assert "contributing_factors" in d


# ===========================================================================
# Material Stratification
# ===========================================================================

class TestMaterialStratification:

    def test_entries_by_material(self):
        corr = ToleranceCorrelator()
        corr.add_correlation(
            _make_inspection([0.01], material="aluminum"),
            _make_params(material="aluminum"),
        )
        corr.add_correlation(
            _make_inspection([0.02], material="steel"),
            _make_params(material="steel"),
        )
        al = corr.get_entries_by_material("aluminum")
        st = corr.get_entries_by_material("steel")
        assert len(al) == 1
        assert len(st) == 1

    def test_sensitivity_per_material(self):
        corr = ToleranceCorrelator()
        # Aluminum: feed strongly affects deviation
        for feed in [0.05, 0.10, 0.15, 0.20]:
            dev = feed * 0.20
            corr.add_correlation(
                _make_inspection([dev], material="aluminum"),
                _make_params(feed=feed, material="aluminum"),
            )
        # Steel: different relationship
        for feed in [0.05, 0.10, 0.15, 0.20]:
            dev = feed * 0.10 + 0.005
            corr.add_correlation(
                _make_inspection([dev], material="steel"),
                _make_params(feed=feed, material="steel"),
            )

        al_sens = corr.sensitivity_analysis(material="aluminum")
        st_sens = corr.sensitivity_analysis(material="steel")
        assert len(al_sens) >= 1
        assert len(st_sens) >= 1

    def test_material_offsets_learned(self):
        corr = ToleranceCorrelator()
        # Aluminum: smaller deviations
        for i in range(5):
            corr.add_correlation(
                _make_inspection([0.005 + i * 0.001], material="aluminum"),
                _make_params(feed=0.10, material="aluminum"),
            )
        # Steel: larger deviations
        for i in range(5):
            corr.add_correlation(
                _make_inspection([0.015 + i * 0.001], material="steel"),
                _make_params(feed=0.10, material="steel"),
            )
        corr.train_model()  # Global model with material offsets
        assert len(corr._material_offsets) >= 1


# ===========================================================================
# CuttingParameterRecord
# ===========================================================================

class TestCuttingParameterRecord:

    def test_param_vector(self):
        params = _make_params(speed=250, feed=0.12, doc=3.0, wear=0.1)
        pv = params.param_vector
        assert pv["cutting_speed"] == 250.0
        assert pv["feed_per_tooth"] == 0.12
        assert pv["depth_of_cut"] == 3.0
        assert pv["tool_wear_vb"] == 0.1

    def test_to_dict(self):
        params = _make_params(speed=200, feed=0.10, material="aluminum")
        d = params.to_dict()
        assert d["cutting_speed_mpm"] == 200.0
        assert d["material"] == "aluminum"

    def test_empty_param_vector(self):
        params = CuttingParameterRecord()
        pv = params.param_vector
        assert all(v == 0.0 for v in pv.values())
