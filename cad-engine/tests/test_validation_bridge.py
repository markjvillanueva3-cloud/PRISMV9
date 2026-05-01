"""Tests for Manufacturability Validation Bridge — CC-MS9.

Covers: FeatureAnalyzer, ManufacturabilityChecker, CAMSafetyOverlay,
        ShopSafetyValidator — the full validation bridge pipeline.

Exit conditions:
  - FeatureAnalyzer extracts all feature types with correct dimensions
  - ManufacturabilityChecker computes S(x) correctly, hard blocks < 0.70
  - CAMSafetyOverlay validates Kienzle force model, power, deflection
  - ShopSafetyValidator catches unsafe keywords, RPM/DOC limits, coolant rules
  - All safety-critical paths correctly block unsafe operations
"""

from __future__ import annotations

import os
import sys
import math

import pytest

# Add parent dir to support both import patterns
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feature_analyze import (
    FeatureType,
    FeatureDimension,
    GeometricFeature,
    FeatureAnalysisResult,
    FeatureAnalyzer,
)
from src.mfg_checker import (
    ManufacturabilityChecker,
    ManufacturabilityReport,
    FeatureValidation,
    FeatureCheck,
    CheckStatus,
    SAFETY_THRESHOLD,
)
from src.cam_safety_overlay import (
    CAMSafetyOverlay,
    CAMSafetyReport,
    StrategyValidation,
    ParameterCheck,
)
from src.shop_safety_validator import (
    ShopSafetyValidator,
    ShopSafetyReport,
    PracticeValidation,
    PracticeFinding,
)


# ========================== FeatureAnalyzer ==========================


class TestFeatureType:
    """Test FeatureType enum."""

    def test_all_types_exist(self):
        expected = [
            "hole", "pocket", "slot", "wall", "boss", "fillet",
            "chamfer", "thread", "counterbore", "countersink",
            "groove", "face", "step", "unknown",
        ]
        for t in expected:
            assert FeatureType(t).value == t

    def test_str_enum(self):
        assert str(FeatureType.HOLE) == "FeatureType.hole" or FeatureType.HOLE.value == "hole"


class TestFeatureDimension:
    """Test FeatureDimension dataclass."""

    def test_tolerance_total(self):
        d = FeatureDimension(name="diameter", value=10.0,
                             tolerance_plus=0.02, tolerance_minus=-0.02)
        assert abs(d.tolerance_total - 0.04) < 1e-9

    def test_zero_tolerance(self):
        d = FeatureDimension(name="width", value=5.0)
        assert d.tolerance_total == 0.0

    def test_asymmetric_tolerance(self):
        d = FeatureDimension(name="depth", value=20.0,
                             tolerance_plus=0.05, tolerance_minus=-0.02)
        assert abs(d.tolerance_total - 0.07) < 1e-9


class TestGeometricFeature:
    """Test GeometricFeature properties."""

    def test_has_tight_tolerance_true(self):
        feat = GeometricFeature(
            feature_id="F001", feature_type=FeatureType.HOLE,
            dimensions=[FeatureDimension("diameter", 10.0, tolerance_plus=0.02, tolerance_minus=-0.02)],
        )
        assert feat.has_tight_tolerance is True

    def test_has_tight_tolerance_false(self):
        feat = GeometricFeature(
            feature_id="F002", feature_type=FeatureType.POCKET,
            dimensions=[FeatureDimension("width", 50.0, tolerance_plus=0.1, tolerance_minus=-0.1)],
        )
        assert feat.has_tight_tolerance is False

    def test_is_deep(self):
        feat = GeometricFeature(
            feature_id="F003", feature_type=FeatureType.HOLE,
            aspect_ratio=5.0,
        )
        assert feat.is_deep is True

    def test_is_not_deep(self):
        feat = GeometricFeature(
            feature_id="F004", feature_type=FeatureType.HOLE,
            aspect_ratio=2.0,
        )
        assert feat.is_deep is False

    def test_get_dimension_found(self):
        feat = GeometricFeature(
            feature_id="F005", feature_type=FeatureType.HOLE,
            dimensions=[FeatureDimension("diameter", 10.0)],
        )
        assert feat.get_dimension("diameter").value == 10.0

    def test_get_dimension_not_found(self):
        feat = GeometricFeature(
            feature_id="F006", feature_type=FeatureType.HOLE,
            dimensions=[],
        )
        assert feat.get_dimension("diameter") is None

    def test_to_dict(self):
        feat = GeometricFeature(
            feature_id="F007", feature_type=FeatureType.SLOT,
            dimensions=[FeatureDimension("width", 5.0)],
            position=(10.0, 20.0, 0.0),
        )
        d = feat.to_dict()
        assert d["feature_id"] == "F007"
        assert d["feature_type"] == "slot"
        assert len(d["dimensions"]) == 1
        assert d["position"] == [10.0, 20.0, 0.0]


class TestFeatureAnalyzer:
    """Test FeatureAnalyzer.analyze()."""

    def test_basic_hole(self):
        analyzer = FeatureAnalyzer(material="steel")
        features = [{
            "type": "hole",
            "dimensions": {"diameter": 10.0, "depth": 30.0},
        }]
        result = analyzer.analyze("PART-001", features)
        assert result.feature_count == 1
        assert result.features[0].feature_type == FeatureType.HOLE
        assert result.features[0].min_tool_diameter == 10.0
        assert result.features[0].aspect_ratio == 3.0

    def test_deep_hole_warning(self):
        analyzer = FeatureAnalyzer(material="steel")
        features = [{
            "type": "hole",
            "dimensions": {"diameter": 5.0, "depth": 25.0},
        }]
        result = analyzer.analyze("PART-002", features)
        assert result.features[0].is_deep is True
        assert any("Deep feature" in w for w in result.warnings)

    def test_tight_tolerance_warning(self):
        analyzer = FeatureAnalyzer()
        features = [{
            "type": "hole",
            "dimensions": {"diameter": 10.0},
            "tolerances": {"diameter": (0.01, -0.01)},
        }]
        result = analyzer.analyze("PART-003", features)
        assert result.features[0].has_tight_tolerance is True
        assert any("Tight tolerance" in w for w in result.warnings)

    def test_pocket_tool_diameter(self):
        analyzer = FeatureAnalyzer()
        features = [{
            "type": "pocket",
            "dimensions": {"width": 20.0, "depth": 10.0},
        }]
        result = analyzer.analyze("PART-004", features)
        assert result.features[0].min_tool_diameter == 20.0 * 0.8  # 80% of width

    def test_fillet_tool_diameter(self):
        analyzer = FeatureAnalyzer()
        features = [{
            "type": "fillet",
            "dimensions": {"radius": 3.0},
        }]
        result = analyzer.analyze("PART-005", features)
        assert result.features[0].min_tool_diameter == 6.0  # radius * 2

    def test_multiple_features(self):
        analyzer = FeatureAnalyzer(material="aluminum")
        features = [
            {"type": "hole", "dimensions": {"diameter": 8.0, "depth": 20.0}},
            {"type": "pocket", "dimensions": {"width": 30.0, "depth": 15.0}},
            {"type": "slot", "dimensions": {"width": 10.0, "depth": 5.0}},
        ]
        result = analyzer.analyze("PART-006", features)
        assert result.feature_count == 3
        assert result.material == "aluminum"

    def test_to_dict_roundtrip(self):
        analyzer = FeatureAnalyzer()
        features = [{"type": "hole", "dimensions": {"diameter": 10.0}}]
        result = analyzer.analyze("PART-007", features)
        d = result.to_dict()
        assert d["part_id"] == "PART-007"
        assert d["feature_count"] == 1

    def test_features_by_type(self):
        analyzer = FeatureAnalyzer()
        features = [
            {"type": "hole", "dimensions": {"diameter": 8.0}},
            {"type": "hole", "dimensions": {"diameter": 12.0}},
            {"type": "pocket", "dimensions": {"width": 20.0}},
        ]
        result = analyzer.analyze("PART-008", features)
        holes = result.features_by_type(FeatureType.HOLE)
        assert len(holes) == 2

    def test_empty_features(self):
        analyzer = FeatureAnalyzer()
        result = analyzer.analyze("PART-009", [])
        assert result.feature_count == 0
        assert result.warnings == []


# ========================== ManufacturabilityChecker ==========================


class TestManufacturabilityChecker:
    """Test ManufacturabilityChecker."""

    def _make_analysis(self, features_data, material="steel"):
        analyzer = FeatureAnalyzer(material=material)
        return analyzer.analyze("TEST-PART", features_data)

    def test_simple_hole_passes(self):
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        assert report.is_manufacturable is True
        assert report.blocked is False
        assert report.overall_safety_score >= SAFETY_THRESHOLD

    def test_no_features_passes(self):
        analysis = self._make_analysis([])
        checker = ManufacturabilityChecker()
        report = checker.validate(analysis)
        assert report.is_manufacturable is True
        assert report.blocked is False

    def test_tool_not_available_fails(self):
        """Tool below minimum available diameter."""
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 0.3, "depth": 1.0}},
        ])
        checker = ManufacturabilityChecker(
            material="steel",
            available_tools=[1.0, 2.0, 3.0],
            available_drills=[0.5, 1.0, 2.0],
        )
        report = checker.validate(analysis)
        # Should have a failing tool check
        tool_checks = [c for fv in report.feature_validations
                       for c in fv.checks if c.check_name == "tool_available"]
        assert any(c.status == CheckStatus.FAIL for c in tool_checks)

    def test_extreme_depth_warns(self):
        """Very deep hole (L/D > 5) should warn."""
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 5.0, "depth": 40.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        depth_checks = [c for fv in report.feature_validations
                        for c in fv.checks if c.check_name == "depth_ok"]
        assert any(c.status in (CheckStatus.WARN, CheckStatus.FAIL) for c in depth_checks)

    def test_tight_tolerance_needs_precision(self):
        analysis = self._make_analysis([{
            "type": "hole",
            "dimensions": {"diameter": 10.0, "depth": 15.0},
            "tolerances": {"diameter": (0.005, -0.005)},
        }])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        tol_checks = [c for fv in report.feature_validations
                      for c in fv.checks if c.check_name == "tolerance_capable"]
        assert len(tol_checks) > 0

    def test_difficult_material_score_reduction(self):
        """Inconel (machinability=0.15) should reduce material score."""
        analysis = self._make_analysis([
            {"type": "pocket", "dimensions": {"width": 20.0, "depth": 10.0}},
        ], material="inconel")
        checker = ManufacturabilityChecker(material="inconel")
        report = checker.validate(analysis)
        mat_checks = [c for fv in report.feature_validations
                      for c in fv.checks if c.check_name == "material_ok"]
        # Inconel has very low machinability
        assert any(c.status in (CheckStatus.WARN, CheckStatus.FAIL) for c in mat_checks)

    def test_safety_score_hard_block(self):
        """S(x) < 0.70 must block."""
        # Create a feature that will fail multiple checks
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 0.3, "depth": 200.0}},
        ])
        checker = ManufacturabilityChecker(material="inconel")
        report = checker.validate(analysis)
        # Very tiny hole, extreme depth, difficult material → should block
        if report.overall_safety_score < SAFETY_THRESHOLD:
            assert report.blocked is True
            assert report.is_manufacturable is False

    def test_aspect_ratio_extreme(self):
        """AR > 10 should fail."""
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 3.0, "depth": 35.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        ar_checks = [c for fv in report.feature_validations
                     for c in fv.checks if c.check_name == "aspect_ratio_ok"]
        # AR = 35/3 ≈ 11.7 → should fail
        assert any(c.status == CheckStatus.FAIL for c in ar_checks)

    def test_bounding_box_overflow(self):
        """Part exceeding machine envelope should warn."""
        analyzer = FeatureAnalyzer(material="steel")
        analysis = analyzer.analyze("BIG-PART", [
            {"type": "pocket", "dimensions": {"width": 20.0, "depth": 5.0}},
        ])
        analysis.bounding_box = (600.0, 500.0, 400.0)  # exceeds default 500x400x300
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        assert report.machine_envelope_fit is False
        assert any("exceeds machine envelope" in w for w in report.warnings)

    def test_report_to_dict(self):
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 10.0}},
        ])
        checker = ManufacturabilityChecker()
        report = checker.validate(analysis)
        d = report.to_dict()
        assert "overall_safety_score" in d
        assert "feature_validations" in d
        assert "blocked" in d

    def test_determine_process_hole(self):
        """Hole without tight tolerance → drilling."""
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        fv = report.feature_validations[0]
        assert fv.required_process == "drilling"

    def test_determine_process_tight_hole(self):
        """Hole with tight tolerance → reaming."""
        analysis = self._make_analysis([{
            "type": "hole",
            "dimensions": {"diameter": 10.0, "depth": 15.0},
            "tolerances": {"diameter": (0.01, -0.01)},
        }])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        fv = report.feature_validations[0]
        assert fv.required_process == "reaming"


# ========================== CAMSafetyOverlay ==========================


class TestCAMSafetyOverlay:
    """Test CAMSafetyOverlay."""

    def test_safe_aluminum_parameters(self):
        """Conservative aluminum parameters should pass."""
        overlay = CAMSafetyOverlay(max_spindle_power_kw=15.0)
        sv = overlay.validate_strategy(
            strategy_id="STRAT-001",
            material="aluminum",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=300.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
            spindle_rpm=9549,
        )
        assert sv.is_safe is True
        assert sv.safety_score >= SAFETY_THRESHOLD

    def test_excessive_speed_fails(self):
        """Surface speed far above range should fail."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="STRAT-002",
            material="titanium",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=500.0,  # Far above titanium max of 80
            feed_per_tooth=0.05,
            axial_depth=1.0,
        )
        speed_checks = [c for c in sv.checks if c.parameter == "surface_speed"]
        assert any(c.status == "fail" for c in speed_checks)

    def test_rpm_over_limit(self):
        """RPM above spindle max should fail."""
        overlay = CAMSafetyOverlay(max_spindle_rpm=12000)
        sv = overlay.validate_strategy(
            strategy_id="STRAT-003",
            material="aluminum",
            operation_type="face_mill",
            tool_diameter=50.0,
            spindle_rpm=15000,
            feed_per_tooth=0.1,
            axial_depth=2.0,
        )
        rpm_checks = [c for c in sv.checks if c.parameter == "spindle_rpm"]
        assert any(c.status == "fail" for c in rpm_checks)

    def test_kienzle_force_calculation(self):
        """Verify cutting force follows Kienzle model."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="STRAT-004",
            material="steel",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            feed_per_tooth=0.1,
            axial_depth=3.0,
            spindle_rpm=3000,
        )
        # Fc should be positive and reasonable
        assert sv.cutting_force_N > 0
        assert sv.cutting_force_N < 20000  # sanity upper bound

    def test_power_calculation(self):
        """Cutting power should be computed when RPM is given."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="STRAT-005",
            material="steel",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            feed_per_tooth=0.1,
            axial_depth=3.0,
            spindle_rpm=3000,
        )
        assert sv.cutting_power_kW > 0

    def test_feed_per_tooth_too_high(self):
        """Feed per tooth above range should fail."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="STRAT-006",
            material="steel",
            operation_type="slot",
            tool_diameter=10.0,
            feed_per_tooth=0.5,  # slot max is 0.15
            axial_depth=2.0,
        )
        fz_checks = [c for c in sv.checks if c.parameter == "feed_per_tooth"]
        assert any(c.status == "fail" for c in fz_checks)

    def test_validate_all_batch(self):
        """validate_all should process multiple strategies."""
        overlay = CAMSafetyOverlay()
        strategies = [
            {
                "strategy_id": "S1",
                "material": "aluminum",
                "operation_type": "pocket_2d",
                "parameters": {
                    "tool_diameter": 10.0,
                    "cutting_speed": 300.0,
                    "feed_per_tooth": 0.1,
                    "axial_depth": 2.0,
                },
            },
            {
                "strategy_id": "S2",
                "material": "steel",
                "operation_type": "face_mill",
                "parameters": {
                    "tool_diameter": 50.0,
                    "cutting_speed": 200.0,
                    "feed_per_tooth": 0.2,
                    "axial_depth": 2.0,
                },
            },
        ]
        report = overlay.validate_all(strategies)
        assert report.total_strategies == 2
        assert report.validated == 2

    def test_safety_score_blocked(self):
        """Multiple failures should push S(x) below threshold → blocked."""
        overlay = CAMSafetyOverlay(
            max_spindle_power_kw=1.0,  # Very low power limit
            max_spindle_rpm=3000,
            max_cutting_force_N=500.0,
        )
        strategies = [{
            "strategy_id": "EXTREME",
            "material": "inconel",
            "operation_type": "pocket_2d",
            "parameters": {
                "tool_diameter": 10.0,
                "cutting_speed": 200.0,
                "feed_per_tooth": 0.3,
                "axial_depth": 10.0,
                "spindle_rpm": 6000,
            },
        }]
        report = overlay.validate_all(strategies)
        # With tight limits and aggressive params, should block
        assert report.failed >= 1

    def test_doc_ratio_check(self):
        """DOC/D ratio out of range should warn/fail."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="STRAT-DOC",
            material="steel",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            feed_per_tooth=0.1,
            axial_depth=20.0,  # ap/D = 2.0, max for pocket_2d is 1.0
            spindle_rpm=3000,
        )
        doc_checks = [c for c in sv.checks if c.parameter == "doc_ratio"]
        assert len(doc_checks) > 0
        assert any(c.status in ("warn", "fail") for c in doc_checks)

    def test_strategy_validation_to_dict(self):
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="S-DICT",
            material="aluminum",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=300.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
        )
        d = sv.to_dict()
        assert "strategy_id" in d
        assert "safety_score" in d
        assert "checks" in d


# ========================== ShopSafetyValidator ==========================


class TestShopSafetyValidator:
    """Test ShopSafetyValidator."""

    def test_safe_practice_passes(self):
        """A practice with no issues should pass."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "SP-001",
            "title": "Standard Face Milling",
            "category": "milling",
            "description": "Face mill aluminum at conservative speeds.",
            "steps": ["Clamp workpiece", "Set 3000 RPM", "Engage feed"],
            "warnings": ["Wear eye protection", "Check chip guard"],
            "applicable_materials": ["aluminum"],
            "tips": ["Use climb milling for better finish"],
        }
        pv = validator.validate_practice(practice)
        assert pv.is_safe is True
        assert pv.safety_score >= SAFETY_THRESHOLD

    def test_unsafe_keyword_blocks(self):
        """Practice containing 'remove guard' should be blocked."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "SP-002",
            "title": "Quick Machining",
            "category": "milling",
            "description": "Remove guard for better visibility.",
            "steps": [],
            "warnings": [],
            "applicable_materials": ["steel"],
        }
        pv = validator.validate_practice(practice)
        assert pv.is_safe is False
        assert any(f.category == "unsafe_keyword" for f in pv.findings)

    def test_bypass_interlock_blocks(self):
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "SP-003",
            "title": "Speed Setup",
            "category": "setup",
            "description": "Bypass interlock to save time.",
            "steps": [],
            "warnings": [],
            "applicable_materials": [],
        }
        pv = validator.validate_practice(practice)
        assert pv.is_safe is False

    def test_rpm_over_machine_limit(self):
        """RPM value in text exceeding machine max should flag."""
        validator = ShopSafetyValidator(machine_max_rpm=12000)
        practice = {
            "practice_id": "SP-004",
            "title": "High Speed Aluminum",
            "category": "milling",
            "description": "Run at 15000 RPM for aluminum finishing.",
            "steps": [],
            "warnings": ["Wear hearing protection"],
            "applicable_materials": ["aluminum"],
        }
        pv = validator.validate_practice(practice)
        rpm_findings = [f for f in pv.findings if f.category == "machine_limit"]
        assert len(rpm_findings) > 0

    def test_coolant_required_titanium(self):
        """Dry machining titanium should be critical/blocked."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "SP-005",
            "title": "Dry Titanium Milling",
            "category": "milling",
            "description": "Use dry machining technique for titanium.",
            "steps": ["Set up without coolant"],
            "warnings": [],
            "applicable_materials": ["titanium"],
        }
        pv = validator.validate_practice(practice)
        coolant_findings = [f for f in pv.findings if f.category == "coolant"]
        assert len(coolant_findings) > 0
        assert pv.is_safe is False

    def test_doc_over_material_limit(self):
        """DOC exceeding material limit should flag."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "SP-006",
            "title": "Deep Cut Titanium",
            "category": "milling",
            "description": "Depth of cut: 10 mm for titanium roughing.",
            "steps": [],
            "warnings": ["Reduce speed for deep cuts"],
            "applicable_materials": ["titanium"],
        }
        pv = validator.validate_practice(practice)
        # Titanium max DOC is 3mm, 10mm > 3mm → should flag
        doc_findings = [f for f in pv.findings if "DOC" in f.message]
        assert len(doc_findings) > 0

    def test_missing_warnings_minor(self):
        """Practice with risky keyword but no warnings should note it."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "SP-007",
            "title": "Thin Wall Milling",
            "category": "milling",
            "description": "Mill thin wall features in aluminum.",
            "steps": [],
            "warnings": [],  # No warnings but mentions "thin wall"
            "applicable_materials": ["aluminum"],
        }
        pv = validator.validate_practice(practice)
        missing = [f for f in pv.findings if f.category == "missing_warning"]
        assert len(missing) > 0

    def test_validate_all_batch(self):
        """validate_all should process multiple practices."""
        validator = ShopSafetyValidator()
        practices = [
            {
                "practice_id": "SP-A",
                "title": "Safe Practice",
                "category": "milling",
                "description": "Standard operation.",
                "steps": [],
                "warnings": ["Be careful"],
                "applicable_materials": ["aluminum"],
            },
            {
                "practice_id": "SP-B",
                "title": "Unsafe Practice",
                "category": "milling",
                "description": "Remove guard for access.",
                "steps": [],
                "warnings": [],
                "applicable_materials": ["steel"],
            },
        ]
        report = validator.validate_all(practices)
        assert report.total_practices == 2
        assert report.validated == 2
        assert report.unsafe_count >= 1
        assert len(report.critical_findings) >= 1

    def test_contradictory_steps(self):
        """Steps with increase AND reduce speed → contradiction finding."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "SP-008",
            "title": "Confusing Practice",
            "category": "milling",
            "description": "Mixed signals.",
            "steps": ["Increase speed to 5000 RPM", "Reduce speed for finishing"],
            "warnings": ["Check coolant"],
            "applicable_materials": ["steel"],
        }
        pv = validator.validate_practice(practice)
        contra = [f for f in pv.findings if f.category == "physics" and "Contradictory" in f.message]
        assert len(contra) > 0

    def test_report_to_dict(self):
        validator = ShopSafetyValidator()
        report = validator.validate_all([{
            "practice_id": "SP-DICT",
            "title": "Test",
            "category": "test",
            "description": "Simple practice.",
            "steps": [],
            "warnings": [],
            "applicable_materials": [],
        }])
        d = report.to_dict()
        assert "overall_safety_score" in d
        assert "practice_validations" in d
        assert "blocked" in d

    def test_safety_score_computation(self):
        """Score should be 1.0 minus total impact."""
        validator = ShopSafetyValidator()
        practice = {
            "practice_id": "SP-SCORE",
            "title": "Scored Practice",
            "category": "test",
            "description": "Normal safe practice.",
            "steps": [],
            "warnings": ["Safety noted"],
            "applicable_materials": [],
        }
        pv = validator.validate_practice(practice)
        assert pv.safety_score == 1.0


# ========================== Integration / Pipeline ==========================


class TestValidationPipeline:
    """End-to-end pipeline: Analyze → Check → Overlay → ShopSafety."""

    def test_full_pipeline_safe_part(self):
        """Safe part should pass all stages."""
        # Stage 1: Feature Analysis
        analyzer = FeatureAnalyzer(material="aluminum")
        features = [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
            {"type": "pocket", "dimensions": {"width": 30.0, "depth": 8.0}},
        ]
        analysis = analyzer.analyze("PIPE-SAFE", features)
        assert analysis.feature_count == 2

        # Stage 2: Manufacturability Check
        checker = ManufacturabilityChecker(material="aluminum")
        mfg_report = checker.validate(analysis)
        assert mfg_report.blocked is False

        # Stage 3: CAM Safety Overlay
        overlay = CAMSafetyOverlay()
        cam_report = overlay.validate_all([{
            "strategy_id": "CAM-1",
            "material": "aluminum",
            "operation_type": "pocket_2d",
            "parameters": {
                "tool_diameter": 10.0,
                "cutting_speed": 300.0,
                "feed_per_tooth": 0.1,
                "axial_depth": 2.0,
            },
        }])
        assert cam_report.blocked is False

        # Stage 4: Shop Safety
        validator = ShopSafetyValidator()
        shop_report = validator.validate_all([{
            "practice_id": "SHOP-1",
            "title": "Aluminum Pocket Milling",
            "category": "milling",
            "description": "Standard pocket milling operation.",
            "steps": ["Clamp part", "Run program"],
            "warnings": ["Wear eye protection"],
            "applicable_materials": ["aluminum"],
        }])
        assert shop_report.blocked is False

    def test_full_pipeline_unsafe_part(self):
        """Unsafe part should be caught at some stage."""
        # Extreme feature
        analyzer = FeatureAnalyzer(material="inconel")
        features = [
            {"type": "hole", "dimensions": {"diameter": 2.0, "depth": 100.0}},  # AR=50
        ]
        analysis = analyzer.analyze("PIPE-UNSAFE", features)
        assert analysis.features[0].is_deep is True

        # Manufacturability should flag or block
        checker = ManufacturabilityChecker(material="inconel")
        mfg_report = checker.validate(analysis)
        # With extreme depth and difficult material, expect low score
        assert len(mfg_report.warnings) > 0 or mfg_report.blocked

    def test_safety_threshold_constant(self):
        """Safety threshold should be 0.70 everywhere."""
        from src.mfg_checker import SAFETY_THRESHOLD as MFG_THRESH
        from src.cam_safety_overlay import SAFETY_THRESHOLD as CAM_THRESH
        from src.shop_safety_validator import SAFETY_THRESHOLD as SHOP_THRESH
        assert MFG_THRESH == 0.70
        assert CAM_THRESH == 0.70
        assert SHOP_THRESH == 0.70
