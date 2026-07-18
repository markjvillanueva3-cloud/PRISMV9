"""Tests for Physics Model Validation — CC-EXT-MS2 P0-U02.

Covers: Kienzle speed/feed validation, Taylor tool life, force/power checks,
three-tier classification (CONFIRMED/NOVEL/IMPLAUSIBLE), conservation law
checks, human review queue, batch validation.
"""

from __future__ import annotations

import os
import sys
import time

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feedback.feedback_schema import OperatorFeedback
from src.feedback.feedback_validator import (
    FeedbackValidator,
    ValidationResult,
    ValidationTier,
    ReviewStatus,
    ParameterCheck,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_feedback(**overrides) -> OperatorFeedback:
    defaults = {
        "operator_id": "OP-001",
        "operation_type": "milling",
        "material": "aluminum",
        "tool": "10mm carbide endmill",
        "tool_diameter_mm": 10.0,
        "parameters_used": {"cutting_speed": 300.0, "feed_per_tooth": 0.1, "axial_depth": 2.0},
        "outcome": "success",
    }
    defaults.update(overrides)
    return OperatorFeedback(**defaults)


@pytest.fixture
def validator():
    return FeedbackValidator(max_power_kw=15.0)


# ========================== Three-Tier Classification ==========================


class TestThreeTierClassification:

    def test_confirmed_within_range(self, validator):
        """Good aluminum milling params → CONFIRMED."""
        fb = _make_feedback(parameters_used={
            "cutting_speed": 350.0,  # Within 200-600 range
            "feed_per_tooth": 0.1,   # Within 0.03-0.30 range
            "axial_depth": 2.0,
        })
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.CONFIRMED
        assert not result.needs_review

    def test_novel_outside_range_but_plausible(self, validator):
        """Speed slightly outside normal range → NOVEL."""
        fb = _make_feedback(parameters_used={
            "cutting_speed": 650.0,  # Above 600 max but <1200 (2x)
            "feed_per_tooth": 0.1,
            "axial_depth": 2.0,
        })
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.NOVEL
        assert result.needs_review

    def test_implausible_extreme_speed(self, validator):
        """Wildly excessive speed → IMPLAUSIBLE."""
        fb = _make_feedback(parameters_used={
            "cutting_speed": 1500.0,  # >2x upper bound (600)
            "feed_per_tooth": 0.1,
            "axial_depth": 2.0,
        })
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.IMPLAUSIBLE

    def test_confirmed_steel_params(self, validator):
        """Standard steel milling → CONFIRMED."""
        fb = _make_feedback(
            material="steel",
            parameters_used={"cutting_speed": 150.0, "feed_per_tooth": 0.12, "axial_depth": 3.0},
        )
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.CONFIRMED

    def test_novel_titanium_aggressive(self, validator):
        """Aggressive titanium params → NOVEL."""
        fb = _make_feedback(
            material="titanium",
            parameters_used={"cutting_speed": 90.0, "feed_per_tooth": 0.15, "axial_depth": 2.0},
        )
        result = validator.validate(fb)
        # 90 > 80 max for titanium → NOVEL
        assert result.overall_tier in (ValidationTier.NOVEL, ValidationTier.IMPLAUSIBLE)


# ========================== Kienzle Speed/Feed ==========================


class TestKienzleValidation:

    def test_speed_within_range(self, validator):
        fb = _make_feedback(parameters_used={"cutting_speed": 400.0, "feed_per_tooth": 0.1})
        result = validator.validate(fb)
        speed_checks = [c for c in result.checks if c.parameter == "cutting_speed"]
        assert len(speed_checks) == 1
        assert speed_checks[0].tier == ValidationTier.CONFIRMED
        assert speed_checks[0].model_used == "kienzle_speed_range"

    def test_feed_within_range(self, validator):
        fb = _make_feedback(parameters_used={"cutting_speed": 300.0, "feed_per_tooth": 0.15})
        result = validator.validate(fb)
        feed_checks = [c for c in result.checks if c.parameter == "feed_per_tooth"]
        assert len(feed_checks) == 1
        assert feed_checks[0].tier == ValidationTier.CONFIRMED

    def test_speed_slightly_out_of_range(self, validator):
        """Speed just above range → NOVEL."""
        fb = _make_feedback(parameters_used={"cutting_speed": 700.0})
        result = validator.validate(fb)
        speed_checks = [c for c in result.checks if c.parameter == "cutting_speed"]
        assert len(speed_checks) == 1
        assert speed_checks[0].tier == ValidationTier.NOVEL

    def test_speed_way_out_of_range(self, validator):
        """Speed >2x range → IMPLAUSIBLE."""
        fb = _make_feedback(
            material="inconel",
            parameters_used={"cutting_speed": 100.0},  # Max for inconel is 40
        )
        result = validator.validate(fb)
        speed_checks = [c for c in result.checks if c.parameter == "cutting_speed"]
        assert len(speed_checks) == 1
        assert speed_checks[0].tier == ValidationTier.IMPLAUSIBLE

    def test_unknown_material_no_speed_check(self, validator):
        """Unknown material → no speed range check (no crash)."""
        fb = _make_feedback(
            material="unobtanium",
            parameters_used={"cutting_speed": 300.0},
        )
        result = validator.validate(fb)
        speed_checks = [c for c in result.checks if c.parameter == "cutting_speed"]
        assert len(speed_checks) == 0

    def test_zero_speed_skipped(self, validator):
        """Zero speed → no validation (operator didn't report)."""
        fb = _make_feedback(parameters_used={"cutting_speed": 0})
        result = validator.validate(fb)
        speed_checks = [c for c in result.checks if c.parameter == "cutting_speed"]
        assert len(speed_checks) == 0

    def test_feed_grinding_range(self, validator):
        """Grinding has very small feed range."""
        fb = _make_feedback(
            operation_type="grinding",
            parameters_used={"cutting_speed": 300.0, "feed_per_tooth": 0.01},
        )
        result = validator.validate(fb)
        feed_checks = [c for c in result.checks if c.parameter == "feed_per_tooth"]
        assert len(feed_checks) == 1
        assert feed_checks[0].tier == ValidationTier.CONFIRMED


# ========================== Taylor Tool Life ==========================


class TestTaylorToolLife:

    def test_tool_life_confirmed(self, validator):
        """Tool life matching Taylor prediction → CONFIRMED."""
        # Aluminum: C=600, n=0.45. At V=300: T = (600/300)^(1/0.45) = 2^2.22 ≈ 4.66 min
        predicted = (600.0 / 300.0) ** (1.0 / 0.45)
        fb = _make_feedback(parameters_used={
            "cutting_speed": 300.0,
            "tool_life_minutes": predicted * 0.9,  # Within 20%
        })
        result = validator.validate(fb)
        life_checks = [c for c in result.checks if c.parameter == "tool_life"]
        assert len(life_checks) == 1
        assert life_checks[0].tier == ValidationTier.CONFIRMED
        assert life_checks[0].model_used == "taylor_tool_life"

    def test_tool_life_novel(self, validator):
        """Tool life 50% off Taylor → NOVEL."""
        predicted = (600.0 / 300.0) ** (1.0 / 0.45)
        fb = _make_feedback(parameters_used={
            "cutting_speed": 300.0,
            "tool_life_minutes": predicted * 1.5,  # 50% over → NOVEL
        })
        result = validator.validate(fb)
        life_checks = [c for c in result.checks if c.parameter == "tool_life"]
        assert len(life_checks) == 1
        assert life_checks[0].tier == ValidationTier.NOVEL

    def test_tool_life_implausible(self, validator):
        """Tool life 10x Taylor → IMPLAUSIBLE."""
        predicted = (600.0 / 300.0) ** (1.0 / 0.45)
        fb = _make_feedback(parameters_used={
            "cutting_speed": 300.0,
            "tool_life_minutes": predicted * 10.0,  # 10x over → IMPLAUSIBLE
        })
        result = validator.validate(fb)
        life_checks = [c for c in result.checks if c.parameter == "tool_life"]
        assert len(life_checks) == 1
        assert life_checks[0].tier == ValidationTier.IMPLAUSIBLE

    def test_tool_life_steel(self, validator):
        """Steel tool life check."""
        # Steel: C=200, n=0.25. At V=150: T = (200/150)^(1/0.25) = (1.33)^4 ≈ 3.16 min
        predicted = (200.0 / 150.0) ** (1.0 / 0.25)
        fb = _make_feedback(
            material="steel",
            parameters_used={"cutting_speed": 150.0, "tool_life_minutes": predicted},
        )
        result = validator.validate(fb)
        life_checks = [c for c in result.checks if c.parameter == "tool_life"]
        assert len(life_checks) == 1
        assert life_checks[0].tier == ValidationTier.CONFIRMED

    def test_no_tool_life_no_check(self, validator):
        """If tool life not reported, skip check."""
        fb = _make_feedback(parameters_used={"cutting_speed": 300.0})
        result = validator.validate(fb)
        life_checks = [c for c in result.checks if c.parameter == "tool_life"]
        assert len(life_checks) == 0

    def test_no_speed_no_tool_life_check(self, validator):
        """No speed reported → can't compute Taylor."""
        fb = _make_feedback(parameters_used={"tool_life_minutes": 10.0})
        result = validator.validate(fb)
        life_checks = [c for c in result.checks if c.parameter == "tool_life"]
        assert len(life_checks) == 0


# ========================== Force/Power ==========================


class TestForcePowerValidation:

    def test_force_confirmed(self, validator):
        """Reported force matches Kienzle → CONFIRMED."""
        # Aluminum: kc1_1=800, mc=0.23. h=0.1, b=2.0
        # Fc = 800 * 0.1^(1-0.23) * 2.0 = 800 * 0.1^0.77 * 2
        import math
        predicted = 800.0 * (0.1 ** 0.77) * 2.0
        fb = _make_feedback(parameters_used={
            "cutting_speed": 300.0,
            "feed_per_tooth": 0.1,
            "axial_depth": 2.0,
            "cutting_force": predicted * 0.95,  # 5% off → CONFIRMED
        })
        result = validator.validate(fb)
        force_checks = [c for c in result.checks if c.parameter == "cutting_force"]
        assert len(force_checks) == 1
        assert force_checks[0].tier == ValidationTier.CONFIRMED

    def test_force_implausible(self, validator):
        """Reported force way off Kienzle → IMPLAUSIBLE."""
        fb = _make_feedback(parameters_used={
            "cutting_speed": 300.0,
            "feed_per_tooth": 0.1,
            "axial_depth": 2.0,
            "cutting_force": 50000.0,  # Way too high
        })
        result = validator.validate(fb)
        force_checks = [c for c in result.checks if c.parameter == "cutting_force"]
        assert len(force_checks) == 1
        assert force_checks[0].tier == ValidationTier.IMPLAUSIBLE

    def test_power_confirmed(self, validator):
        """Power = Fc*Vc/60000 matches → CONFIRMED."""
        predicted_force = 800.0 * (0.1 ** 0.77) * 2.0
        predicted_power = predicted_force * 300.0 / 60000.0
        fb = _make_feedback(parameters_used={
            "cutting_speed": 300.0,
            "feed_per_tooth": 0.1,
            "axial_depth": 2.0,
            "cutting_power": predicted_power * 1.05,
        })
        result = validator.validate(fb)
        power_checks = [c for c in result.checks if c.parameter == "cutting_power"]
        assert len(power_checks) == 1
        assert power_checks[0].tier == ValidationTier.CONFIRMED

    def test_power_exceeds_machine_limit(self, validator):
        """Predicted power exceeds machine → IMPLAUSIBLE check added."""
        # Large depth to push power over 15 kW
        fb = _make_feedback(
            material="steel",
            parameters_used={
                "cutting_speed": 200.0,
                "feed_per_tooth": 0.3,
                "axial_depth": 20.0,
            },
        )
        result = validator.validate(fb)
        power_limit_checks = [c for c in result.checks if c.parameter == "machine_power_limit"]
        # Only appears if predicted power > max_power_kw
        # kc1_1=2100, mc=0.26, h=0.3, b=20 → Fc = 2100 * 0.3^0.74 * 20
        predicted_force = 2100.0 * (0.3 ** 0.74) * 20.0
        predicted_power = predicted_force * 200.0 / 60000.0
        if predicted_power > 15.0:
            assert len(power_limit_checks) == 1
            assert power_limit_checks[0].tier == ValidationTier.IMPLAUSIBLE

    def test_no_force_no_check(self, validator):
        """No reported force → no force check."""
        fb = _make_feedback(parameters_used={"cutting_speed": 300.0})
        result = validator.validate(fb)
        force_checks = [c for c in result.checks if c.parameter == "cutting_force"]
        assert len(force_checks) == 0


# ========================== Conservation Laws ==========================


class TestConservationLaws:

    def test_negative_speed(self, validator):
        fb = _make_feedback(parameters_used={"cutting_speed": -50.0})
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.IMPLAUSIBLE
        assert any("Negative" in c.details for c in result.checks)

    def test_extreme_speed(self, validator):
        fb = _make_feedback(parameters_used={"cutting_speed": 3000.0})
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.IMPLAUSIBLE
        assert any("exceeds physical limit" in c.details for c in result.checks)

    def test_negative_feed(self, validator):
        fb = _make_feedback(parameters_used={"feed_per_tooth": -0.1})
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.IMPLAUSIBLE

    def test_negative_depth(self, validator):
        fb = _make_feedback(parameters_used={"axial_depth": -5.0})
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.IMPLAUSIBLE

    def test_extreme_tool_life(self, validator):
        fb = _make_feedback(parameters_used={
            "cutting_speed": 300.0,
            "tool_life_minutes": 50000.0,  # > 500 hours
        })
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.IMPLAUSIBLE
        assert any("unreasonably long" in c.details for c in result.checks)

    def test_multiple_violations(self, validator):
        fb = _make_feedback(parameters_used={
            "cutting_speed": -10.0,
            "feed_per_tooth": -0.1,
            "axial_depth": -5.0,
        })
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.IMPLAUSIBLE
        violations = [c for c in result.checks if c.tier == ValidationTier.IMPLAUSIBLE]
        assert len(violations) >= 3


# ========================== Human Review Queue ==========================


class TestReviewQueue:

    def test_novel_added_to_queue(self, validator):
        fb = _make_feedback(parameters_used={
            "cutting_speed": 650.0,  # NOVEL for aluminum
        })
        result = validator.validate(fb)
        assert result.needs_review
        pending = validator.get_pending_reviews()
        assert len(pending) == 1
        assert pending[0].feedback_id == fb.feedback_id

    def test_confirmed_not_in_queue(self, validator):
        fb = _make_feedback(parameters_used={"cutting_speed": 350.0})
        validator.validate(fb)
        assert len(validator.get_pending_reviews()) == 0

    def test_implausible_not_in_queue(self, validator):
        fb = _make_feedback(parameters_used={"cutting_speed": -100.0})
        validator.validate(fb)
        assert len(validator.get_pending_reviews()) == 0

    def test_approve_review(self, validator):
        fb = _make_feedback(parameters_used={"cutting_speed": 650.0})
        result = validator.validate(fb)
        assert validator.approve_review(fb.feedback_id) is True
        pending = validator.get_pending_reviews()
        assert len(pending) == 0

    def test_reject_review(self, validator):
        fb = _make_feedback(parameters_used={"cutting_speed": 650.0})
        result = validator.validate(fb)
        assert validator.reject_review(fb.feedback_id) is True
        pending = validator.get_pending_reviews()
        assert len(pending) == 0

    def test_approve_nonexistent(self, validator):
        assert validator.approve_review("NOPE-123") is False

    def test_reject_nonexistent(self, validator):
        assert validator.reject_review("NOPE-123") is False

    def test_multiple_novel_in_queue(self, validator):
        for i in range(3):
            fb = _make_feedback(
                operator_id=f"OP-{i}",
                parameters_used={"cutting_speed": 650.0},
            )
            validator.validate(fb)
        assert len(validator.get_pending_reviews()) == 3


# ========================== Batch Validation ==========================


class TestBatchValidation:

    def test_batch_validate(self, validator):
        entries = [
            _make_feedback(operator_id="OP-A", parameters_used={"cutting_speed": 350.0}),
            _make_feedback(operator_id="OP-B", parameters_used={"cutting_speed": 650.0}),
            _make_feedback(operator_id="OP-C", parameters_used={"cutting_speed": -50.0}),
        ]
        results = validator.validate_batch(entries)
        assert len(results) == 3
        assert results[0].overall_tier == ValidationTier.CONFIRMED
        assert results[1].overall_tier == ValidationTier.NOVEL
        assert results[2].overall_tier == ValidationTier.IMPLAUSIBLE

    def test_batch_empty(self, validator):
        results = validator.validate_batch([])
        assert results == []


# ========================== ValidationResult ==========================


class TestValidationResult:

    def test_to_dict(self, validator):
        fb = _make_feedback(parameters_used={
            "cutting_speed": 350.0,
            "feed_per_tooth": 0.1,
            "axial_depth": 2.0,
        })
        result = validator.validate(fb)
        d = result.to_dict()
        assert d["feedback_id"] == fb.feedback_id
        assert d["overall_tier"] in ("confirmed", "novel", "implausible")
        assert isinstance(d["checks"], list)
        assert d["needs_review"] in (True, False)
        assert "validated_at" in d

    def test_auto_timestamp(self):
        r = ValidationResult(feedback_id="TEST-001")
        assert r.validated_at  # Auto-populated

    def test_no_checks_is_confirmed(self, validator):
        """No parameters to check → CONFIRMED by default."""
        fb = _make_feedback(
            material="unobtanium",
            operation_type="other",
            parameters_used={"custom_param": 42.0},
        )
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.CONFIRMED


# ========================== Performance ==========================


class TestPerformance:

    def test_validation_under_2_seconds(self, validator):
        """Single validation must complete in <2 seconds."""
        fb = _make_feedback(parameters_used={
            "cutting_speed": 300.0,
            "feed_per_tooth": 0.1,
            "axial_depth": 2.0,
            "cutting_force": 250.0,
            "cutting_power": 1.5,
            "tool_life_minutes": 5.0,
        })
        start = time.perf_counter()
        result = validator.validate(fb)
        elapsed = time.perf_counter() - start
        assert elapsed < 2.0, f"Validation took {elapsed:.3f}s, exceeds 2s limit"

    def test_batch_100_under_2_seconds(self, validator):
        """100 validations should still be fast."""
        entries = [
            _make_feedback(
                operator_id=f"OP-{i}",
                parameters_used={"cutting_speed": 300.0 + i, "feed_per_tooth": 0.1},
            )
            for i in range(100)
        ]
        start = time.perf_counter()
        results = validator.validate_batch(entries)
        elapsed = time.perf_counter() - start
        assert len(results) == 100
        assert elapsed < 2.0, f"Batch of 100 took {elapsed:.3f}s"


# ========================== Material Variants ==========================


class TestMaterialVariants:

    def test_stainless_steel_underscore(self, validator):
        fb = _make_feedback(
            material="stainless_steel",
            parameters_used={"cutting_speed": 100.0},
        )
        result = validator.validate(fb)
        speed_checks = [c for c in result.checks if c.parameter == "cutting_speed"]
        assert len(speed_checks) == 1

    def test_stainless_steel_space(self, validator):
        fb = _make_feedback(
            material="stainless steel",
            parameters_used={"cutting_speed": 100.0},
        )
        result = validator.validate(fb)
        speed_checks = [c for c in result.checks if c.parameter == "cutting_speed"]
        assert len(speed_checks) == 1

    def test_cast_iron(self, validator):
        fb = _make_feedback(
            material="cast_iron",
            parameters_used={"cutting_speed": 150.0},
        )
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.CONFIRMED

    def test_inconel_low_speed_confirmed(self, validator):
        fb = _make_feedback(
            material="inconel",
            parameters_used={"cutting_speed": 25.0},
        )
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.CONFIRMED

    def test_brass_high_speed_ok(self, validator):
        fb = _make_feedback(
            material="brass",
            parameters_used={"cutting_speed": 300.0},
        )
        result = validator.validate(fb)
        assert result.overall_tier == ValidationTier.CONFIRMED
