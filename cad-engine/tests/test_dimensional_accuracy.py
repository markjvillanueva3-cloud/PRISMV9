"""Tests for Dimensional Accuracy Model — CC-EXT-MS4-P0-U04."""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.quality.dimensional_accuracy import (
    ThermalExpansionError,
    ToolDeflectionError,
    MachinePositioningError,
    DimensionalPrediction,
    DimensionalAccuracyModel,
    deviation_to_it_grade,
)


# ---------------------------------------------------------------------------
# Thermal Expansion
# ---------------------------------------------------------------------------

class TestThermalExpansion:
    def test_steel_expansion(self):
        """Steel (CTE=11.7), 50mm, +10°C → 11.7*10*50/1000 = 5.85 µm."""
        te = ThermalExpansionError(
            cte_um_per_m_per_c=11.7,
            delta_temp_c=10.0,
            nominal_dimension_mm=50.0,
        )
        error = te.compute()
        assert abs(error - 5.85) < 0.01

    def test_aluminum_expansion(self):
        """Aluminum (CTE=23.1), 100mm, +5°C → 23.1*5*100/1000 = 11.55 µm."""
        te = ThermalExpansionError(
            cte_um_per_m_per_c=23.1,
            delta_temp_c=5.0,
            nominal_dimension_mm=100.0,
        )
        error = te.compute()
        assert abs(error - 11.55) < 0.01

    def test_no_temp_change(self):
        te = ThermalExpansionError(delta_temp_c=0.0, nominal_dimension_mm=50.0)
        assert te.compute() == 0.0

    def test_negative_temp(self):
        """Cooling contracts the part."""
        te = ThermalExpansionError(cte_um_per_m_per_c=11.7, delta_temp_c=-5.0, nominal_dimension_mm=50.0)
        error = te.compute()
        assert error < 0

    def test_to_dict(self):
        te = ThermalExpansionError(delta_temp_c=10.0, nominal_dimension_mm=50.0)
        te.compute()
        d = te.to_dict()
        assert "dimensional_error_um" in d


# ---------------------------------------------------------------------------
# Tool Deflection
# ---------------------------------------------------------------------------

class TestToolDeflection:
    def test_basic_deflection(self):
        """Known case: F=500N, L=50mm, d=20mm, E=600GPa."""
        td = ToolDeflectionError(
            cutting_force_n=500.0,
            tool_overhang_mm=50.0,
            tool_diameter_mm=20.0,
            elastic_modulus_gpa=600.0,
        )
        defl = td.compute()
        # δ = 500 * 0.05^3 / (3 * 600e9 * π * 0.02^4 / 64)
        # = 500 * 1.25e-4 / (3 * 600e9 * 7.854e-9)
        # = 0.0625 / 14137.17 = 4.42e-6 m = 4.42 µm
        assert 3 < defl < 6  # reasonable range

    def test_longer_overhang_more_deflection(self):
        td1 = ToolDeflectionError(cutting_force_n=500, tool_overhang_mm=30, tool_diameter_mm=20)
        td2 = ToolDeflectionError(cutting_force_n=500, tool_overhang_mm=80, tool_diameter_mm=20)
        assert td2.compute() > td1.compute()

    def test_larger_diameter_less_deflection(self):
        td1 = ToolDeflectionError(cutting_force_n=500, tool_overhang_mm=50, tool_diameter_mm=12)
        td2 = ToolDeflectionError(cutting_force_n=500, tool_overhang_mm=50, tool_diameter_mm=25)
        assert td2.compute() < td1.compute()

    def test_zero_force(self):
        td = ToolDeflectionError(cutting_force_n=0.0, tool_overhang_mm=50, tool_diameter_mm=20)
        assert td.compute() == 0.0

    def test_zero_diameter(self):
        td = ToolDeflectionError(cutting_force_n=500, tool_overhang_mm=50, tool_diameter_mm=0)
        assert td.compute() == 0.0

    def test_hss_more_deflection(self):
        """HSS (E=200 GPa) deflects more than carbide (E=600 GPa)."""
        td_carbide = ToolDeflectionError(cutting_force_n=500, tool_overhang_mm=50, tool_diameter_mm=20, elastic_modulus_gpa=600)
        td_hss = ToolDeflectionError(cutting_force_n=500, tool_overhang_mm=50, tool_diameter_mm=20, elastic_modulus_gpa=200)
        assert td_hss.compute() > td_carbide.compute()

    def test_to_dict(self):
        td = ToolDeflectionError(cutting_force_n=500, tool_overhang_mm=50, tool_diameter_mm=20)
        td.compute()
        d = td.to_dict()
        assert "deflection_um" in d


# ---------------------------------------------------------------------------
# Machine Positioning
# ---------------------------------------------------------------------------

class TestMachinePositioning:
    def test_standard_class(self):
        mp = MachinePositioningError(machine_class="standard")
        error = mp.compute()
        assert error > 0
        # RSS of 5.0 and 3.0 = sqrt(25+9) = sqrt(34) ≈ 5.83
        assert abs(error - 5.83) < 0.1

    def test_precision_class(self):
        mp = MachinePositioningError(machine_class="precision")
        error = mp.compute()
        # RSS of 2.0 and 1.0 = sqrt(5) ≈ 2.24
        assert abs(error - 2.24) < 0.1

    def test_workshop_class(self):
        mp = MachinePositioningError(machine_class="workshop")
        error = mp.compute()
        # RSS of 10.0 and 8.0 = sqrt(164) ≈ 12.81
        assert abs(error - 12.81) < 0.1

    def test_custom_values(self):
        mp = MachinePositioningError(backlash_um=8.0, geometric_error_um=6.0, machine_class="custom")
        error = mp.compute()
        assert abs(error - 10.0) < 0.01  # RSS(8,6) = 10

    def test_to_dict(self):
        mp = MachinePositioningError(machine_class="standard")
        mp.compute()
        d = mp.to_dict()
        assert "machine_class" in d


# ---------------------------------------------------------------------------
# IT Grade Mapping
# ---------------------------------------------------------------------------

class TestITGradeMapping:
    def test_tight_tolerance(self):
        grade = deviation_to_it_grade(3.0, 50.0)
        assert grade <= 6

    def test_medium_tolerance(self):
        grade = deviation_to_it_grade(15.0, 50.0)
        assert 7 <= grade <= 9

    def test_coarse_tolerance(self):
        grade = deviation_to_it_grade(80.0, 50.0)
        assert grade >= 10

    def test_zero_deviation(self):
        assert deviation_to_it_grade(0.0) == 5

    def test_very_large_deviation(self):
        assert deviation_to_it_grade(500.0) == 12

    def test_larger_nominal_coarser_grade(self):
        """Larger parts have more absolute tolerance for same IT grade."""
        g_small = deviation_to_it_grade(20.0, 20.0)
        g_large = deviation_to_it_grade(20.0, 200.0)
        assert g_large <= g_small  # same deviation, larger part → tighter relative → same or better grade


# ---------------------------------------------------------------------------
# DimensionalAccuracyModel
# ---------------------------------------------------------------------------

class TestDimensionalAccuracyModel:
    def test_basic_prediction(self):
        model = DimensionalAccuracyModel()
        pred = model.predict(
            nominal_dimension_mm=50.0,
            delta_temp_c=5.0,
            material="steel",
            cutting_force_n=500.0,
        )
        assert pred.total_error_um > 0
        assert pred.uncertainty_um > 0
        assert pred.achievable_it_grade >= 5

    def test_aluminum_vs_steel(self):
        """Aluminum has higher CTE → more thermal error."""
        model = DimensionalAccuracyModel()
        pred_steel = model.predict(material="steel", delta_temp_c=10.0)
        pred_alu = model.predict(material="aluminum", delta_temp_c=10.0)
        assert pred_alu.thermal_error.dimensional_error_um > pred_steel.thermal_error.dimensional_error_um

    def test_precision_vs_workshop(self):
        """Precision machine should achieve better accuracy."""
        model = DimensionalAccuracyModel()
        pred_prec = model.predict(machine_class="precision")
        pred_work = model.predict(machine_class="workshop")
        assert pred_prec.total_error_um < pred_work.total_error_um

    def test_high_force_more_deflection(self):
        model = DimensionalAccuracyModel()
        pred_low = model.predict(cutting_force_n=200.0)
        pred_high = model.predict(cutting_force_n=1000.0)
        assert pred_high.deflection_error.deflection_um > pred_low.deflection_error.deflection_um

    def test_no_thermal_change(self):
        model = DimensionalAccuracyModel()
        pred = model.predict(delta_temp_c=0.0)
        assert pred.thermal_error.dimensional_error_um == 0.0

    def test_custom_backlash(self):
        model = DimensionalAccuracyModel()
        pred = model.predict(backlash_um=15.0, geometric_error_um=10.0)
        assert pred.positioning_error.backlash_um == 15.0
        assert pred.confidence > 0.6  # known machine data boost

    def test_to_dict(self):
        model = DimensionalAccuracyModel()
        pred = model.predict()
        d = pred.to_dict()
        assert "total_error_um" in d
        assert "achievable_it_grade" in d

    def test_rss_combination(self):
        """Total error should be RSS of individual errors."""
        model = DimensionalAccuracyModel()
        pred = model.predict(
            delta_temp_c=10.0,
            cutting_force_n=500.0,
            machine_class="standard",
        )
        expected_rss = np.sqrt(
            pred.thermal_error.dimensional_error_um ** 2
            + pred.deflection_error.deflection_um ** 2
            + pred.positioning_error.positioning_error_um ** 2
        )
        assert abs(pred.total_error_um - expected_rss) < 0.01

    def test_tool_material_affects_deflection(self):
        model = DimensionalAccuracyModel()
        pred_carbide = model.predict(tool_material="carbide")
        pred_hss = model.predict(tool_material="hss")
        assert pred_hss.deflection_error.deflection_um > pred_carbide.deflection_error.deflection_um

    def test_uncertainty_proportional_to_error(self):
        model = DimensionalAccuracyModel()
        pred = model.predict()
        # Uncertainty should be ~20% of total error (RSS of 20% of each source)
        assert pred.uncertainty_um < pred.total_error_um
        assert pred.uncertainty_um > 0
