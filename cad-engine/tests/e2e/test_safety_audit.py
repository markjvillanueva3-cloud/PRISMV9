"""E2E Test: Safety Audit — CC-MS11.

Verifies ALL validation checks are active, confirms zero bypass paths
(no way to get output without passing validation), and verifies
S(x) >= 0.70 hard block is enforced and cannot be circumvented.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.feature_analyze import FeatureAnalyzer, FeatureType
from src.mfg_checker import (
    ManufacturabilityChecker,
    SAFETY_THRESHOLD as MFG_THRESH,
    CheckStatus,
)
from src.cam_safety_overlay import CAMSafetyOverlay, SAFETY_THRESHOLD as CAM_THRESH
from src.shop_safety_validator import ShopSafetyValidator, SAFETY_THRESHOLD as SHOP_THRESH


class TestSafetyThresholdEnforcement:
    """S(x) >= 0.70 hard block is consistently enforced."""

    def test_threshold_value_is_070(self):
        """All three modules share the same 0.70 threshold."""
        assert MFG_THRESH == 0.70
        assert CAM_THRESH == 0.70
        assert SHOP_THRESH == 0.70

    def test_mfg_blocks_below_threshold(self):
        """ManufacturabilityChecker blocks when S(x) < 0.70."""
        analyzer = FeatureAnalyzer(material="inconel")
        features = [
            # Deep, tight-tolerance pocket in inconel -> difficult
            {"type": "pocket", "dimensions": {"width": 3.0, "depth": 50.0},
             "tolerances": {"width": (0.002, -0.002)}},
        ]
        analysis = analyzer.analyze("SAFETY-BLOCK-001", features)
        checker = ManufacturabilityChecker(material="inconel")
        report = checker.validate(analysis)
        assert report.blocked is True
        assert report.overall_safety_score < MFG_THRESH
        assert "BLOCKED" in report.block_reason

    def test_mfg_allows_above_threshold(self):
        """ManufacturabilityChecker allows when S(x) >= 0.70."""
        analyzer = FeatureAnalyzer(material="aluminum")
        features = [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ]
        analysis = analyzer.analyze("SAFETY-PASS-001", features)
        checker = ManufacturabilityChecker(material="aluminum")
        report = checker.validate(analysis)
        assert report.blocked is False
        assert report.overall_safety_score >= MFG_THRESH

    def test_cam_blocks_below_threshold(self):
        """CAMSafetyOverlay blocks when S(x) < 0.70."""
        overlay = CAMSafetyOverlay(max_spindle_rpm=12000)
        sv = overlay.validate_strategy(
            strategy_id="UNSAFE-CAM",
            material="inconel",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=200.0,  # Way above inconel max 50
            feed_per_tooth=0.3,
            axial_depth=10.0,
            spindle_rpm=15000,  # Above machine max
        )
        assert sv.is_safe is False
        assert sv.safety_score < CAM_THRESH

    def test_cam_allows_above_threshold(self):
        """CAMSafetyOverlay allows when S(x) >= 0.70."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="SAFE-CAM",
            material="aluminum",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=300.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
            spindle_rpm=9549,
        )
        assert sv.is_safe is True
        assert sv.safety_score >= CAM_THRESH

    def test_shop_blocks_below_threshold(self):
        """ShopSafetyValidator blocks when S(x) < 0.70."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "UNSAFE-SHOP",
            "title": "Dangerous Setup",
            "category": "setup",
            "description": "Remove guard and bypass interlock for speed.",
            "steps": [], "warnings": [],
            "applicable_materials": [],
        })
        assert pv.is_safe is False
        assert pv.safety_score < SHOP_THRESH

    def test_shop_allows_above_threshold(self):
        """ShopSafetyValidator allows when S(x) >= 0.70."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SAFE-SHOP",
            "title": "Standard Milling",
            "category": "milling",
            "description": "Face mill aluminum at 3000 RPM with flood coolant.",
            "steps": ["Clamp part", "Set tool length"],
            "warnings": ["Wear safety glasses"],
            "applicable_materials": ["aluminum"],
        })
        assert pv.is_safe is True
        assert pv.safety_score >= SHOP_THRESH


class TestZeroBypassPaths:
    """Confirm no way to bypass safety validation."""

    def test_mfg_always_returns_report(self):
        """validate() always returns a report with safety_score set."""
        analyzer = FeatureAnalyzer(material="steel")
        analysis = analyzer.analyze("BYPASS-001", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        assert hasattr(report, "overall_safety_score")
        assert hasattr(report, "blocked")
        assert isinstance(report.overall_safety_score, float)

    def test_mfg_empty_features_still_validates(self):
        """Empty feature list still returns a valid report."""
        analyzer = FeatureAnalyzer(material="steel")
        analysis = analyzer.analyze("BYPASS-002", [])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        assert report.blocked is False
        assert report.overall_safety_score == 1.0

    def test_cam_empty_strategies_still_validates(self):
        """Empty strategy list still returns a valid report."""
        overlay = CAMSafetyOverlay()
        report = overlay.validate_all([])
        assert report.blocked is False
        assert report.total_strategies == 0

    def test_shop_empty_practices_still_validates(self):
        """Empty practice list still returns a valid report."""
        validator = ShopSafetyValidator()
        report = validator.validate_all([])
        assert report.blocked is False
        assert report.total_practices == 0

    def test_cam_batch_blocked_by_single_unsafe(self):
        """One unsafe strategy in a batch blocks the whole report."""
        overlay = CAMSafetyOverlay(max_spindle_rpm=12000)
        strategies = [
            {
                "strategy_id": "SAFE",
                "material": "aluminum",
                "operation_type": "face_mill",
                "parameters": {
                    "tool_diameter": 50.0, "cutting_speed": 400.0,
                    "feed_per_tooth": 0.15, "axial_depth": 2.0,
                },
            },
            {
                "strategy_id": "DANGEROUS",
                "material": "inconel",
                "operation_type": "pocket_2d",
                "parameters": {
                    "tool_diameter": 10.0, "cutting_speed": 200.0,
                    "feed_per_tooth": 0.3, "axial_depth": 10.0,
                    "spindle_rpm": 15000,
                },
            },
        ]
        report = overlay.validate_all(strategies)
        assert report.blocked is True
        assert "BLOCKED" in report.block_reason

    def test_shop_batch_blocked_by_single_unsafe(self):
        """One unsafe practice in a batch blocks the whole report."""
        validator = ShopSafetyValidator()
        practices = [
            {
                "practice_id": "SAFE", "title": "OK",
                "category": "milling",
                "description": "Standard safe milling at 3000 RPM.",
                "steps": [], "warnings": ["Be careful"],
                "applicable_materials": ["aluminum"],
            },
            {
                "practice_id": "UNSAFE", "title": "Bad",
                "category": "setup",
                "description": "Remove guard for visibility.",
                "steps": [], "warnings": [],
                "applicable_materials": [],
            },
        ]
        report = validator.validate_all(practices)
        assert report.blocked is True


class TestAllValidationChecksActive:
    """Verify that all individual checks run — none silently skipped."""

    def test_mfg_runs_all_five_checks(self):
        """Each feature gets exactly 5 checks."""
        analyzer = FeatureAnalyzer(material="steel")
        features = [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ]
        analysis = analyzer.analyze("CHECK-001", features)
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        fv = report.feature_validations[0]
        assert len(fv.checks) == 5
        check_names = {c.check_name for c in fv.checks}
        assert check_names == {
            "tool_available", "depth_ok", "tolerance_capable",
            "material_ok", "aspect_ratio_ok",
        }

    def test_cam_runs_speed_feed_rpm_force_power_doc(self):
        """Strategy with full params gets 6 checks."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="FULL-CHECK",
            material="steel",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=150.0,
            feed_per_tooth=0.1,
            axial_depth=3.0,
            spindle_rpm=4775,
        )
        check_params = {c.parameter for c in sv.checks}
        assert "surface_speed" in check_params
        assert "feed_per_tooth" in check_params
        assert "spindle_rpm" in check_params
        assert "cutting_force" in check_params
        assert "cutting_power" in check_params
        assert "doc_ratio" in check_params

    def test_shop_checks_unsafe_keywords(self):
        """Unsafe keywords are always detected."""
        validator = ShopSafetyValidator()
        for keyword in ["remove guard", "bypass interlock", "disable safety"]:
            pv = validator.validate_practice({
                "practice_id": f"KW-{keyword[:5]}",
                "title": "Test",
                "category": "setup",
                "description": f"Operator should {keyword}.",
                "steps": [], "warnings": [],
                "applicable_materials": [],
            })
            assert pv.is_safe is False, f"Should block keyword: '{keyword}'"

    def test_shop_checks_coolant_for_titanium(self):
        """Dry machining titanium is always flagged."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "TI-DRY",
            "title": "Titanium Roughing",
            "category": "milling",
            "description": "Rough titanium dry with no coolant.",
            "steps": [], "warnings": [],
            "applicable_materials": ["titanium"],
        })
        coolant_findings = [f for f in pv.findings if f.category == "coolant"]
        assert len(coolant_findings) > 0

    def test_shop_checks_rpm_against_material_limit(self):
        """RPM exceeding material limit is flagged."""
        validator = ShopSafetyValidator(machine_max_rpm=24000)
        pv = validator.validate_practice({
            "practice_id": "RPM-LIMIT",
            "title": "High RPM Steel",
            "category": "milling",
            "description": "Run at 12000 RPM for steel.",
            "steps": [], "warnings": ["Use coolant"],
            "applicable_materials": ["steel"],
        })
        rpm_findings = [f for f in pv.findings if "RPM" in f.message]
        assert len(rpm_findings) > 0


class TestSerializationSafety:
    """All safety results serialize cleanly for audit trail."""

    def test_mfg_report_serializes(self):
        """ManufacturabilityReport.to_dict() is complete."""
        analyzer = FeatureAnalyzer(material="steel")
        analysis = analyzer.analyze("SERIAL-001", [
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 20.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        d = report.to_dict()
        assert "overall_safety_score" in d
        assert "blocked" in d
        assert "feature_validations" in d
        assert isinstance(d["overall_safety_score"], float)

    def test_cam_report_serializes(self):
        """CAMSafetyReport.to_dict() is complete."""
        overlay = CAMSafetyOverlay()
        report = overlay.validate_all([{
            "strategy_id": "S1", "material": "aluminum",
            "operation_type": "pocket_2d",
            "parameters": {"tool_diameter": 10.0, "cutting_speed": 300.0,
                          "feed_per_tooth": 0.1, "axial_depth": 2.0},
        }])
        d = report.to_dict()
        assert "overall_safety_score" in d
        assert "blocked" in d
        assert "strategy_validations" in d

    def test_shop_report_serializes(self):
        """ShopSafetyReport.to_dict() is complete."""
        validator = ShopSafetyValidator()
        report = validator.validate_all([{
            "practice_id": "S1", "title": "OK",
            "category": "milling",
            "description": "Standard milling.",
            "steps": [], "warnings": ["Be careful"],
            "applicable_materials": ["aluminum"],
        }])
        d = report.to_dict()
        assert "overall_safety_score" in d
        assert "blocked" in d
        assert "practice_validations" in d
        assert "critical_findings" in d
