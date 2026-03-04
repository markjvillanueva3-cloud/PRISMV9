"""End-to-End Integration Tests for Quality Feedback Pipeline — CC-EXT-MS4-P0-U05.

Full pipeline: CMM import -> tolerance correlation -> surface finish -> dimensional accuracy.
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
from src.quality.dimensional_accuracy import (
    DimensionalAccuracyModel, deviation_to_it_grade as dim_it_grade,
)


# ---------------------------------------------------------------------------
# Synthetic CMM data generators
# ---------------------------------------------------------------------------

def _make_turning_result(
    diameter_mm: float = 50.0,
    deviation_um: float = 5.0,
    ra_um: float = 1.6,
    rz_um: float = 6.4,
    material: str = "steel",
    part_id: str = "T001",
    op_id: str = "OP10",
) -> InspectionResult:
    """Turning operation: diameter + surface finish."""
    dev_mm = deviation_um / 1000.0
    feat = InspectionFeature(
        feature_name=f"OD_{diameter_mm}",
        feature_type=FeatureType.CYLINDER,
        nominal_value=diameter_mm,
        actual_value=diameter_mm + dev_mm,
        deviation=dev_mm,
        upper_tolerance=0.025,  # IT7 for 50mm
        lower_tolerance=-0.025,
        unit="mm",
    )
    feat.evaluate_tolerance()

    sf = SurfaceFinishResult(ra=ra_um, rz=rz_um, location=f"OD_{diameter_mm}")

    return InspectionResult(
        part_id=part_id,
        operation_id=op_id,
        material=material,
        features=[feat],
        surface_finishes=[sf],
    )


def _make_milling_result(
    width_mm: float = 30.0,
    depth_mm: float = 10.0,
    deviation_um: float = 8.0,
    ra_um: float = 0.8,
    part_id: str = "M001",
    op_id: str = "OP20",
) -> InspectionResult:
    """Milling operation: pocket dimension + surface finish."""
    dev_mm = deviation_um / 1000.0
    feat_width = InspectionFeature(
        feature_name=f"Pocket_W{width_mm}",
        feature_type=FeatureType.SLOT,
        nominal_value=width_mm,
        actual_value=width_mm + dev_mm,
        deviation=dev_mm,
        upper_tolerance=0.039,
        lower_tolerance=-0.039,
    )
    feat_width.evaluate_tolerance()

    feat_depth = InspectionFeature(
        feature_name=f"Pocket_D{depth_mm}",
        feature_type=FeatureType.PLANE,
        nominal_value=depth_mm,
        actual_value=depth_mm + dev_mm * 0.5,
        deviation=dev_mm * 0.5,
        upper_tolerance=0.062,
        lower_tolerance=-0.062,
    )
    feat_depth.evaluate_tolerance()

    sf = SurfaceFinishResult(ra=ra_um, rz=ra_um * 4.2, location="pocket_floor")

    return InspectionResult(
        part_id=part_id,
        operation_id=op_id,
        material="aluminum",
        features=[feat_width, feat_depth],
        surface_finishes=[sf],
    )


def _make_drilling_result(
    hole_dia_mm: float = 10.0,
    deviation_um: float = 12.0,
    part_id: str = "D001",
    op_id: str = "OP30",
) -> InspectionResult:
    """Drilling operation: hole diameter + position."""
    dev_mm = deviation_um / 1000.0
    feat_dia = InspectionFeature(
        feature_name=f"Hole_{hole_dia_mm}",
        feature_type=FeatureType.CIRCLE,
        nominal_value=hole_dia_mm,
        actual_value=hole_dia_mm + dev_mm,
        deviation=dev_mm,
        upper_tolerance=0.058,
        lower_tolerance=0.0,
    )
    feat_dia.evaluate_tolerance()

    feat_pos = InspectionFeature(
        feature_name=f"Hole_pos_{hole_dia_mm}",
        feature_type=FeatureType.POINT,
        nominal_value=0.0,
        actual_value=dev_mm * 0.3,
        deviation=dev_mm * 0.3,
        upper_tolerance=0.1,
        lower_tolerance=-0.1,
    )
    feat_pos.evaluate_tolerance()

    return InspectionResult(
        part_id=part_id,
        operation_id=op_id,
        material="steel",
        features=[feat_dia, feat_pos],
    )


def _make_param_record(
    part_id: str, op_id: str,
    speed: float = 150.0, feed: float = 0.2,
    doc: float = 2.0, wear: float = 0.1,
) -> CuttingParameterRecord:
    return CuttingParameterRecord(
        part_id=part_id,
        operation_id=op_id,
        cutting_speed_mpm=speed,
        feed_per_rev_mm=feed,
        depth_of_cut_mm=doc,
        tool_wear_vb_mm=wear,
        material="steel",
    )


# ---------------------------------------------------------------------------
# E2E Pipeline Tests
# ---------------------------------------------------------------------------

class TestQualityPipelineE2E:
    def test_turning_pipeline(self):
        """Turning: CMM → tolerance → surface finish → dimensional accuracy."""
        result = _make_turning_result(50.0, 5.0, 1.6, 6.4)
        params = _make_param_record("T001", "OP10", speed=150, feed=0.2)

        # Tolerance correlation
        correlator = ToleranceCorrelator()
        correlator.add_correlation(result, params)
        assert len(correlator._entries) == 1

        # Surface finish model
        sf_model = SurfaceFinishModel()
        pred = sf_model.predict(feed_mm_rev=0.2, nose_radius_mm=0.8)
        assert pred.corrected_ra_um > 0

        # Dimensional accuracy
        dim_model = DimensionalAccuracyModel()
        dim_pred = dim_model.predict(
            nominal_dimension_mm=50.0,
            delta_temp_c=5.0,
            material="steel",
            cutting_force_n=500.0,
        )
        assert dim_pred.total_error_um > 0
        assert dim_pred.achievable_it_grade >= 5

    def test_milling_pipeline(self):
        """Milling: CMM → tolerance → surface finish → dimensional accuracy."""
        result = _make_milling_result(30.0, 10.0, 8.0, 0.8)
        params = CuttingParameterRecord(
            part_id="M001", operation_id="OP20",
            cutting_speed_mpm=200, feed_per_rev_mm=0.1,
            depth_of_cut_mm=3.0, material="aluminum",
        )

        correlator = ToleranceCorrelator()
        correlator.add_correlation(result, params)

        sf_model = SurfaceFinishModel()
        pred = sf_model.predict(feed_mm_rev=0.1, nose_radius_mm=0.8)
        assert pred.corrected_ra_um > 0

        dim_model = DimensionalAccuracyModel()
        dim_pred = dim_model.predict(
            nominal_dimension_mm=30.0,
            delta_temp_c=3.0,
            material="aluminum",
        )
        assert dim_pred.total_error_um > 0

    def test_drilling_pipeline(self):
        """Drilling: CMM → tolerance → dimensional accuracy."""
        result = _make_drilling_result(10.0, 12.0)
        params = _make_param_record("D001", "OP30", speed=80, feed=0.15, doc=5.0)

        correlator = ToleranceCorrelator()
        correlator.add_correlation(result, params)
        assert len(correlator._entries) == 2  # hole diameter + position

    def test_10_inspection_sets(self):
        """10+ inspection results across turning/milling/drilling."""
        np.random.seed(42)
        correlator = ToleranceCorrelator()

        # 4 turning
        for i in range(4):
            dia = 20 + i * 15
            dev = 3 + np.random.uniform(0, 10)
            result = _make_turning_result(dia, dev, part_id=f"T{i:03d}", op_id=f"OP{10+i}")
            params = _make_param_record(f"T{i:03d}", f"OP{10+i}",
                                        speed=100+i*30, feed=0.1+i*0.05)
            correlator.add_correlation(result, params)

        # 4 milling
        for i in range(4):
            result = _make_milling_result(20+i*10, 5+i*3, 5+np.random.uniform(0,8),
                                          part_id=f"M{i:03d}", op_id=f"OP{20+i}")
            params = CuttingParameterRecord(
                part_id=f"M{i:03d}", operation_id=f"OP{20+i}",
                cutting_speed_mpm=150+i*25, feed_per_rev_mm=0.08+i*0.03,
                depth_of_cut_mm=2+i, material="aluminum",
            )
            correlator.add_correlation(result, params)

        # 2 drilling
        for i in range(2):
            result = _make_drilling_result(8+i*4, 8+np.random.uniform(0,10),
                                           part_id=f"D{i:03d}", op_id=f"OP{30+i}")
            params = _make_param_record(f"D{i:03d}", f"OP{30+i}",
                                        speed=60+i*20, feed=0.12+i*0.05)
            correlator.add_correlation(result, params)

        assert len(correlator._entries) >= 10

    def test_multi_sensor_data_flow(self):
        """Data flows correctly from CMM through all models."""
        result = _make_turning_result(50.0, 7.0, 2.0, 8.5)
        params = _make_param_record("T001", "OP10", speed=120, feed=0.25, wear=0.3)

        # Tolerance
        correlator = ToleranceCorrelator()
        correlator.add_correlation(result, params)

        # Train surface finish with the CMM data
        sf_model = SurfaceFinishModel()
        sf_model.add_measurement(TrainingDataPoint(
            feed_mm_rev=0.25,
            nose_radius_mm=0.8,
            wear_index=0.3,
            measured_ra_um=2.0,
            measured_rz_um=8.5,
            material="steel",
            operation="turning",
        ))

        # Verify data integrity through pipeline
        pred = sf_model.predict(feed_mm_rev=0.25, nose_radius_mm=0.8, wear_index=0.3)
        assert pred.theoretical_ra_um > 0
        assert pred.corrected_ra_um > 0


class TestEdgeCases:
    def test_zero_deviation(self):
        """Feature with zero deviation should pass tolerance."""
        feat = InspectionFeature(
            feature_type=FeatureType.CYLINDER,
            nominal_value=50.0,
            actual_value=50.0,
            deviation=0.0,
            upper_tolerance=0.025,
            lower_tolerance=-0.025,
        )
        assert feat.evaluate_tolerance() == ToleranceStatus.PASS

    def test_maximum_deviation_fails(self):
        """Feature way out of tolerance."""
        feat = InspectionFeature(
            feature_type=FeatureType.CYLINDER,
            nominal_value=50.0,
            actual_value=50.5,
            deviation=0.5,
            upper_tolerance=0.025,
            lower_tolerance=-0.025,
        )
        assert feat.evaluate_tolerance() == ToleranceStatus.FAIL

    def test_missing_surface_finish(self):
        """Inspection without surface finish data."""
        result = InspectionResult(
            part_id="E001",
            features=[InspectionFeature(feature_type=FeatureType.POINT)],
        )
        assert len(result.surface_finishes) == 0
        assert result.total_features == 1

    def test_empty_inspection(self):
        """Empty inspection result."""
        result = InspectionResult(part_id="E002")
        assert result.total_features == 0

    def test_dimensional_model_zero_force(self):
        model = DimensionalAccuracyModel()
        pred = model.predict(cutting_force_n=0.0, delta_temp_c=0.0)
        # Only positioning error remains
        assert pred.deflection_error.deflection_um == 0.0
        assert pred.thermal_error.dimensional_error_um == 0.0
        assert pred.total_error_um > 0  # positioning still contributes

    def test_surface_finish_zero_feed(self):
        model = SurfaceFinishModel()
        pred = model.predict(feed_mm_rev=0.0, nose_radius_mm=0.8)
        assert pred.theoretical_ra_um == 0.0
