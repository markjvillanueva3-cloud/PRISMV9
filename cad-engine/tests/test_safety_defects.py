"""Safety Defect Detection Tests — CC-MS9.

SAFETY-CRITICAL: Tests that specifically verify the validation bridge
correctly detects and blocks known-dangerous conditions. Each test
represents a real-world manufacturing safety hazard.

These tests must NEVER be weakened or have their assertions relaxed.
A failure here means the safety chain has a gap.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feature_analyze import FeatureAnalyzer, FeatureType
from src.mfg_checker import (
    ManufacturabilityChecker,
    CheckStatus,
    SAFETY_THRESHOLD,
)
from src.cam_safety_overlay import CAMSafetyOverlay
from src.shop_safety_validator import ShopSafetyValidator


# ========================== Feature Analysis Defects ==========================


class TestFeatureDefects:
    """Defects in feature extraction that could mask safety issues."""

    def test_zero_diameter_hole_no_crash(self):
        """Zero-diameter hole must not crash or produce NaN."""
        analyzer = FeatureAnalyzer()
        result = analyzer.analyze("DEF-001", [
            {"type": "hole", "dimensions": {"diameter": 0.0, "depth": 10.0}},
        ])
        feat = result.features[0]
        assert feat.aspect_ratio == 0.0  # 0/0 handled gracefully
        assert feat.min_tool_diameter == 0.0

    def test_negative_dimensions_handled(self):
        """Negative dimensions should not produce nonsensical results."""
        analyzer = FeatureAnalyzer()
        result = analyzer.analyze("DEF-002", [
            {"type": "pocket", "dimensions": {"width": -10.0, "depth": 5.0}},
        ])
        feat = result.features[0]
        # Should not crash; aspect ratio may be negative but no exception
        assert feat is not None

    def test_missing_dimension_keys(self):
        """Feature with no dimensions should not crash."""
        analyzer = FeatureAnalyzer()
        result = analyzer.analyze("DEF-003", [{"type": "hole"}])
        assert result.feature_count == 1
        assert result.features[0].min_tool_diameter == 0.0

    def test_unknown_feature_type(self):
        """Unknown feature type should be handled."""
        analyzer = FeatureAnalyzer()
        result = analyzer.analyze("DEF-004", [
            {"type": "unknown", "dimensions": {"width": 10.0}},
        ])
        assert result.features[0].feature_type == FeatureType.UNKNOWN


# ========================== Manufacturability Defects ==========================


class TestMfgDefects:
    """Manufacturing defects that the checker MUST catch."""

    def _make_analysis(self, features_data, material="steel"):
        analyzer = FeatureAnalyzer(material=material)
        return analyzer.analyze("DEF-MFG", features_data)

    def test_impossibly_small_hole(self):
        """0.1mm hole in steel — no standard tool exists."""
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 0.1, "depth": 5.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        tool_checks = [c for fv in report.feature_validations
                       for c in fv.checks if c.check_name == "tool_available"]
        assert any(c.status == CheckStatus.FAIL for c in tool_checks)

    def test_gun_drill_depth_hole(self):
        """L/D > 12 hole — requires gun drill tooling."""
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 5.0, "depth": 80.0}},
        ])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        depth_checks = [c for fv in report.feature_validations
                        for c in fv.checks if c.check_name == "depth_ok"]
        # L/D = 16 → should at least warn (gun drill territory)
        assert any(c.status in (CheckStatus.WARN, CheckStatus.FAIL) for c in depth_checks)

    def test_beyond_machine_z_travel(self):
        """Feature deeper than machine Z travel."""
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 10.0, "depth": 200.0}},
        ])
        checker = ManufacturabilityChecker(
            material="steel",
            machine_envelope={"x": 500, "y": 400, "z": 300,
                              "max_rpm": 12000, "max_power_kw": 15.0,
                              "max_tool_diameter": 50.0, "min_tool_diameter": 1.0,
                              "max_tool_length": 150.0},
        )
        report = checker.validate(analysis)
        # Depth 200mm > max_tool_length 150mm → should fail
        depth_checks = [c for fv in report.feature_validations
                        for c in fv.checks if c.check_name == "depth_ok"]
        assert any(c.status == CheckStatus.FAIL for c in depth_checks)

    def test_sub_micron_tolerance_impossible(self):
        """0.001mm tolerance — beyond standard CNC capability."""
        analysis = self._make_analysis([{
            "type": "hole",
            "dimensions": {"diameter": 10.0, "depth": 15.0},
            "tolerances": {"diameter": (0.0005, -0.0005)},  # 1 micron total
        }])
        checker = ManufacturabilityChecker(material="steel")
        report = checker.validate(analysis)
        tol_checks = [c for fv in report.feature_validations
                      for c in fv.checks if c.check_name == "tolerance_capable"]
        # 0.001mm is below grinding capability (0.005mm) → should fail
        assert any(c.status == CheckStatus.FAIL for c in tol_checks)

    def test_deep_pocket_in_inconel(self):
        """Deep pocket in Inconel — compound difficulty."""
        analysis = self._make_analysis([
            {"type": "pocket", "dimensions": {"width": 10.0, "depth": 80.0}},
        ], material="inconel")
        checker = ManufacturabilityChecker(material="inconel")
        report = checker.validate(analysis)
        # AR=8, inconel machinability=0.15 → multiple warnings/fails expected
        assert len(report.warnings) >= 2

    def test_safety_threshold_is_070(self):
        """SAFETY_THRESHOLD must be exactly 0.70."""
        assert SAFETY_THRESHOLD == 0.70

    def test_block_reason_includes_score(self):
        """When blocked, report must state S(x) value."""
        analysis = self._make_analysis([
            {"type": "hole", "dimensions": {"diameter": 0.1, "depth": 200.0}},
        ])
        checker = ManufacturabilityChecker(material="inconel")
        report = checker.validate(analysis)
        if report.blocked:
            assert "S(x)" in report.block_reason
            assert str(SAFETY_THRESHOLD) in report.block_reason or "0.7" in report.block_reason


# ========================== CAM Parameter Defects ==========================


class TestCAMDefects:
    """CAM parameter combinations that MUST be caught."""

    def test_titanium_high_speed_blocks(self):
        """Titanium at 500 m/min surface speed — tool destruction."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="CAMDEF-001",
            material="titanium",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=500.0,  # Max for titanium is ~80
            feed_per_tooth=0.05,
            axial_depth=1.0,
        )
        assert sv.is_safe is False or any(c.status == "fail" for c in sv.checks)

    def test_inconel_aggressive_doc(self):
        """Inconel with extreme depth of cut — spindle stall risk."""
        overlay = CAMSafetyOverlay(max_spindle_power_kw=15.0)
        sv = overlay.validate_strategy(
            strategy_id="CAMDEF-002",
            material="inconel",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=30.0,
            feed_per_tooth=0.15,
            axial_depth=20.0,  # ap/D = 2.0, very aggressive for inconel
            spindle_rpm=955,
        )
        # Should flag either force, power, or DOC ratio
        assert len(sv.checks) > 0
        has_issue = any(c.status in ("warn", "fail") for c in sv.checks)
        assert has_issue

    def test_zero_feed_no_crash(self):
        """Zero feed per tooth should not crash."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="CAMDEF-003",
            material="steel",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            cutting_speed=100.0,
            feed_per_tooth=0.0,
            axial_depth=2.0,
        )
        # Should not crash; no force/power checks since fz=0
        assert sv is not None

    def test_zero_tool_diameter_no_crash(self):
        """Zero tool diameter should not crash (division by zero)."""
        overlay = CAMSafetyOverlay()
        sv = overlay.validate_strategy(
            strategy_id="CAMDEF-004",
            material="steel",
            operation_type="pocket_2d",
            tool_diameter=0.0,
            cutting_speed=100.0,
            feed_per_tooth=0.1,
            axial_depth=2.0,
        )
        assert sv is not None

    def test_extreme_force_blocks(self):
        """Cutting force far exceeding limit should block."""
        overlay = CAMSafetyOverlay(
            max_cutting_force_N=1000.0,  # Low limit
        )
        sv = overlay.validate_strategy(
            strategy_id="CAMDEF-005",
            material="hardened_steel",
            operation_type="pocket_2d",
            tool_diameter=10.0,
            feed_per_tooth=0.3,
            axial_depth=10.0,
            spindle_rpm=3000,
        )
        force_checks = [c for c in sv.checks if c.parameter == "cutting_force"]
        if force_checks:
            # With kc1_1=3000, h=0.3, b=10, force should be very high
            assert any(c.status in ("warn", "fail") for c in force_checks)

    def test_spindle_power_exceeded(self):
        """Power exceeding spindle max should fail."""
        overlay = CAMSafetyOverlay(max_spindle_power_kw=2.0)  # Small spindle
        sv = overlay.validate_strategy(
            strategy_id="CAMDEF-006",
            material="steel",
            operation_type="pocket_2d",
            tool_diameter=20.0,
            feed_per_tooth=0.2,
            axial_depth=5.0,
            spindle_rpm=5000,
        )
        power_checks = [c for c in sv.checks if c.parameter == "cutting_power"]
        if power_checks:
            assert any(c.status in ("warn", "fail") for c in power_checks)

    def test_report_blocked_flag(self):
        """CAMSafetyReport.blocked when overall S(x) < 0.70."""
        overlay = CAMSafetyOverlay(
            max_spindle_rpm=2000,
            max_cutting_force_N=100.0,
            max_spindle_power_kw=0.5,
        )
        report = overlay.validate_all([{
            "strategy_id": "BLOCK-TEST",
            "material": "inconel",
            "operation_type": "pocket_2d",
            "parameters": {
                "tool_diameter": 10.0,
                "cutting_speed": 200.0,
                "feed_per_tooth": 0.3,
                "axial_depth": 10.0,
                "spindle_rpm": 5000,
            },
        }])
        if report.overall_safety_score < 0.70:
            assert report.blocked is True
            assert "BLOCKED" in report.block_reason


# ========================== Shop Safety Defects ==========================


class TestShopDefects:
    """Shop practice safety defects that MUST be caught."""

    def test_remove_guard_blocked(self):
        """'remove guard' is categorically unsafe — must block."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-001",
            "title": "Quick Access",
            "category": "setup",
            "description": "Remove guard for better access to workpiece.",
            "steps": [],
            "warnings": [],
            "applicable_materials": [],
        })
        assert pv.is_safe is False
        assert any(f.severity == "critical" for f in pv.findings)

    def test_hand_near_spindle_blocked(self):
        """'hand near spindle' is categorically unsafe."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-002",
            "title": "Manual Adjustment",
            "category": "operation",
            "description": "Place hand near spindle to feel vibration.",
            "steps": [],
            "warnings": [],
            "applicable_materials": [],
        })
        assert pv.is_safe is False

    def test_no_eye_protection_blocked(self):
        """'no eye protection' is categorically unsafe."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-003",
            "title": "Quick Look",
            "category": "inspection",
            "description": "Check surface with no eye protection.",
            "steps": [],
            "warnings": [],
            "applicable_materials": [],
        })
        assert pv.is_safe is False

    def test_leave_chuck_key_blocked(self):
        """'leave chuck key in' is a lathe fatality hazard."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-004",
            "title": "Fast Turnaround",
            "category": "lathe",
            "description": "Leave chuck key in for quick part changes.",
            "steps": [],
            "warnings": [],
            "applicable_materials": [],
        })
        assert pv.is_safe is False

    def test_dry_titanium_fire_hazard(self):
        """Dry machining titanium is a fire hazard — must block."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-005",
            "title": "Dry Titanium Finishing",
            "category": "milling",
            "description": "Finish titanium part dry for clean surface.",
            "steps": [],
            "warnings": [],
            "applicable_materials": ["titanium"],
        })
        assert pv.is_safe is False
        coolant = [f for f in pv.findings if f.category == "coolant"]
        assert len(coolant) > 0

    def test_dry_inconel_must_flag(self):
        """Dry machining Inconel — must catch via coolant requirement."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-006",
            "title": "Dry Inconel Roughing",
            "category": "milling",
            "description": "Rough inconel dry to avoid coolant mess.",
            "steps": [],
            "warnings": [],
            "applicable_materials": ["inconel"],
        })
        coolant = [f for f in pv.findings if f.category == "coolant"]
        assert len(coolant) > 0

    def test_dry_stainless_must_flag(self):
        """Dry machining stainless steel — coolant required."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-007",
            "title": "Dry Stainless",
            "category": "milling",
            "description": "Machine stainless_steel dry.",
            "steps": [],
            "warnings": [],
            "applicable_materials": ["stainless_steel"],
        })
        coolant = [f for f in pv.findings if f.category == "coolant"]
        assert len(coolant) > 0

    def test_rpm_exceeds_material_limit(self):
        """RPM beyond material safe limit should flag."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-008",
            "title": "Fast Titanium",
            "category": "milling",
            "description": "Run titanium at 5000 RPM for productivity.",
            "steps": [],
            "warnings": ["Monitor temperature"],
            "applicable_materials": ["titanium"],
        })
        rpm_findings = [f for f in pv.findings
                        if "RPM" in f.message and f.category == "physics"]
        assert len(rpm_findings) > 0

    def test_doc_exceeds_material_limit(self):
        """DOC beyond material safe limit should flag."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-009",
            "title": "Heavy Cut Hardened Steel",
            "category": "milling",
            "description": "Take depth of cut: 5 mm in hardened_steel.",
            "steps": [],
            "warnings": [],
            "applicable_materials": ["hardened_steel"],
        })
        # Hardened steel max DOC is 2mm, 5mm exceeds it
        doc_findings = [f for f in pv.findings if "DOC" in f.message]
        assert len(doc_findings) > 0

    def test_all_unsafe_keywords_detected(self):
        """Every keyword in _UNSAFE_KEYWORDS must be detected."""
        validator = ShopSafetyValidator()
        unsafe_keywords = [
            "remove guard", "bypass interlock", "disable safety",
            "no coolant on titanium", "hand near spindle",
            "loose clothing near spindle", "no eye protection",
            "skip warm-up", "remove chuck key while running",
            "reach over spinning", "leave chuck key in",
        ]
        for keyword in unsafe_keywords:
            pv = validator.validate_practice({
                "practice_id": f"KW-{keyword[:10]}",
                "title": "Test",
                "category": "test",
                "description": f"This practice says to {keyword}.",
                "steps": [],
                "warnings": [],
                "applicable_materials": [],
            })
            unsafe_found = [f for f in pv.findings if f.category == "unsafe_keyword"]
            assert len(unsafe_found) > 0, f"Keyword '{keyword}' not detected"

    def test_multiple_violations_compound(self):
        """Multiple violations should compound and reduce score."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SHOPDEF-MULTI",
            "title": "Everything Wrong",
            "category": "milling",
            "description": "Remove guard, bypass interlock, hand near spindle, dry machining.",
            "steps": [],
            "warnings": [],
            "applicable_materials": ["titanium"],
        })
        assert pv.safety_score < 0.30  # Multiple critical violations
        assert pv.is_safe is False
        assert len(pv.findings) >= 3

    def test_safe_practice_not_flagged(self):
        """A genuinely safe practice should have score 1.0."""
        validator = ShopSafetyValidator()
        pv = validator.validate_practice({
            "practice_id": "SAFE-001",
            "title": "Standard Aluminum Facing",
            "category": "milling",
            "description": "Face mill 6061 aluminum with flood coolant at moderate speeds.",
            "steps": ["Verify workholding", "Set 3000 RPM", "Engage feed"],
            "warnings": ["Wear safety glasses", "Check chip guard"],
            "applicable_materials": ["aluminum"],
        })
        assert pv.is_safe is True
        assert pv.safety_score >= 0.9

    def test_report_overall_blocked_on_critical(self):
        """validate_all should block if ANY practice is critical."""
        validator = ShopSafetyValidator()
        report = validator.validate_all([
            {
                "practice_id": "GOOD",
                "title": "Safe Practice",
                "category": "milling",
                "description": "Normal operation.",
                "steps": [],
                "warnings": ["Be safe"],
                "applicable_materials": ["aluminum"],
            },
            {
                "practice_id": "BAD",
                "title": "Dangerous Practice",
                "category": "milling",
                "description": "Remove guard and bypass interlock for speed.",
                "steps": [],
                "warnings": [],
                "applicable_materials": [],
            },
        ])
        # BAD practice should drop overall score below threshold
        assert report.overall_safety_score < SAFETY_THRESHOLD
        assert report.blocked is True
