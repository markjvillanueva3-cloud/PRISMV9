"""Tests for Physics Validation — CC-EXT-MS1-P0-U07."""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.extraction.knowledge_schema import (
    KnowledgeEntry,
    KnowledgeType,
    ValidationStatus,
)
from src.extraction.physics_validator import (
    PhysicsValidator,
    ValidationResult,
    ValidationReport,
    _normalize_material,
)


# ---------------------------------------------------------------------------
# Material Normalization
# ---------------------------------------------------------------------------

class TestMaterialNormalization:
    def test_aluminum(self):
        assert _normalize_material("aluminum") == "aluminum"

    def test_aluminium_spelling(self):
        assert _normalize_material("aluminium") == "aluminum"

    def test_grade_6061(self):
        assert _normalize_material("6061") == "aluminum"

    def test_steel(self):
        assert _normalize_material("steel") == "steel"

    def test_grade_4140(self):
        assert _normalize_material("4140") == "steel"

    def test_stainless(self):
        assert _normalize_material("stainless") == "stainless_steel"

    def test_stainless_304(self):
        assert _normalize_material("304") == "stainless_steel"

    def test_titanium(self):
        assert _normalize_material("titanium") == "titanium"

    def test_inconel(self):
        assert _normalize_material("inconel") == "nickel_alloy"

    def test_718(self):
        assert _normalize_material("718") == "nickel_alloy"

    def test_unknown(self):
        assert _normalize_material("unobtanium") == ""

    def test_case_insensitive(self):
        assert _normalize_material("ALUMINUM") == "aluminum"

    def test_partial_match(self):
        assert _normalize_material("aluminum 6061-T6") == "aluminum"


# ---------------------------------------------------------------------------
# Speed Validation
# ---------------------------------------------------------------------------

class TestSpeedValidation:
    def test_valid_aluminum_speed(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="aluminum",
            si_value=300.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID

    def test_valid_steel_speed(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="steel",
            si_value=150.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID

    def test_suspect_speed_too_high(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="steel",
            si_value=450.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.SUSPECT

    def test_invalid_speed_way_too_high(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="titanium",
            si_value=500.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID

    def test_invalid_negative_speed(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="aluminum",
            si_value=-10.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID

    def test_no_material_uses_absolute_bounds(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            si_value=100.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID

    def test_no_value_skipped(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="steel",
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.SKIPPED

    def test_uses_max_value_if_no_si(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="aluminum",
            max_value=400.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID


# ---------------------------------------------------------------------------
# Feed Validation
# ---------------------------------------------------------------------------

class TestFeedValidation:
    def test_valid_feed(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="feed",
            material="steel",
            si_value=0.15,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID

    def test_invalid_zero_feed(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="feed",
            material="steel",
            si_value=0.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID

    def test_suspect_high_feed(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="feed",
            material="titanium",
            si_value=0.35,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status in (ValidationStatus.SUSPECT, ValidationStatus.INVALID)


# ---------------------------------------------------------------------------
# DOC Validation
# ---------------------------------------------------------------------------

class TestDOCValidation:
    def test_valid_doc(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="doc",
            material="aluminum",
            si_value=3.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID

    def test_invalid_negative_doc(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="doc",
            material="steel",
            si_value=-1.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID

    def test_suspect_deep_cut_titanium(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="doc",
            material="titanium",
            si_value=6.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status in (ValidationStatus.SUSPECT, ValidationStatus.INVALID)


# ---------------------------------------------------------------------------
# RPM Validation
# ---------------------------------------------------------------------------

class TestRPMValidation:
    def test_valid_rpm(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="rpm",
            si_value=5000.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID

    def test_invalid_negative_rpm(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="rpm",
            si_value=-100.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID

    def test_invalid_extreme_rpm(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="rpm",
            si_value=500000.0,
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID


# ---------------------------------------------------------------------------
# Cutting Data Validation
# ---------------------------------------------------------------------------

class TestCuttingDataValidation:
    def test_valid_cutting_data(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.CUTTING_DATA,
            material="steel",
            value={"speed": {"min": 100.0, "max": 200.0, "unit": "m/min"}},
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID

    def test_invalid_cutting_data_speed(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.CUTTING_DATA,
            material="titanium",
            value={"speed": {"min": 500.0, "max": 800.0, "unit": "m/min"}},
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID

    def test_skipped_no_speed_data(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.CUTTING_DATA,
            material="steel",
            value={"tool_grade": "GC4325"},
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.SKIPPED


# ---------------------------------------------------------------------------
# Tool Validation
# ---------------------------------------------------------------------------

class TestToolValidation:
    def test_valid_tool(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.TOOL,
            value={"geometry": {"nose_radius_mm": 0.8, "rake_angle_deg": 5.0}},
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID

    def test_invalid_nose_radius(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.TOOL,
            value={"geometry": {"nose_radius_mm": -1.0}},
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID

    def test_invalid_rake_angle(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.TOOL,
            value={"geometry": {"rake_angle_deg": 45.0}},
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.INVALID

    def test_tool_no_geometry(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.TOOL,
            value={"grade": "carbide"},
        )
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID


# ---------------------------------------------------------------------------
# Non-parameter types skipped
# ---------------------------------------------------------------------------

class TestSkippedTypes:
    def test_practice_skipped(self):
        entry = KnowledgeEntry(knowledge_type=KnowledgeType.PRACTICE)
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.SKIPPED

    def test_tolerance_skipped(self):
        entry = KnowledgeEntry(knowledge_type=KnowledgeType.TOLERANCE)
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.SKIPPED

    def test_material_skipped(self):
        entry = KnowledgeEntry(knowledge_type=KnowledgeType.MATERIAL)
        validator = PhysicsValidator()
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.SKIPPED


# ---------------------------------------------------------------------------
# Batch Validation & Report
# ---------------------------------------------------------------------------

class TestBatchValidation:
    def test_batch_report_counts(self):
        entries = [
            KnowledgeEntry(
                knowledge_type=KnowledgeType.PARAMETER,
                category="cutting_speed",
                material="aluminum",
                si_value=300.0,
            ),
            KnowledgeEntry(
                knowledge_type=KnowledgeType.PARAMETER,
                category="cutting_speed",
                material="titanium",
                si_value=500.0,
            ),
            KnowledgeEntry(
                knowledge_type=KnowledgeType.PRACTICE,
            ),
        ]
        validator = PhysicsValidator()
        report = validator.validate_batch(entries)
        assert report.total == 3
        assert report.valid_count == 1
        assert report.invalid_count == 1
        assert report.skipped_count == 1

    def test_quarantined_entries(self):
        entries = [
            KnowledgeEntry(
                knowledge_type=KnowledgeType.PARAMETER,
                category="cutting_speed",
                material="titanium",
                si_value=1000.0,
            ),
        ]
        validator = PhysicsValidator()
        report = validator.validate_batch(entries)
        assert len(report.quarantined) == 1

    def test_entries_updated_after_validation(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="aluminum",
            si_value=300.0,
        )
        validator = PhysicsValidator()
        validator.validate_batch([entry])
        assert entry.validation_status == ValidationStatus.VALID
        assert "status" in entry.validation_details

    def test_report_to_dict(self):
        report = ValidationReport(
            total=10,
            valid_count=7,
            suspect_count=2,
            invalid_count=1,
            quarantined=[KnowledgeEntry()],
        )
        d = report.to_dict()
        assert d["total"] == 10
        assert d["valid"] == 7
        assert d["quarantined_count"] == 1

    def test_worst_deviations_sorted(self):
        entries = [
            KnowledgeEntry(
                entry_id="A",
                knowledge_type=KnowledgeType.PARAMETER,
                category="cutting_speed",
                material="steel",
                si_value=450.0,
            ),
            KnowledgeEntry(
                entry_id="B",
                knowledge_type=KnowledgeType.PARAMETER,
                category="cutting_speed",
                material="titanium",
                si_value=500.0,
            ),
        ]
        validator = PhysicsValidator()
        report = validator.validate_batch(entries)
        if len(report.worst_deviations) >= 2:
            assert abs(report.worst_deviations[0]["deviation_pct"]) >= abs(
                report.worst_deviations[1]["deviation_pct"]
            )


# ---------------------------------------------------------------------------
# ValidationResult dataclass
# ---------------------------------------------------------------------------

class TestValidationResult:
    def test_to_dict(self):
        r = ValidationResult(
            status=ValidationStatus.SUSPECT,
            deviation_pct=35.0,
            message="Speed too high",
            reference_range=(50.0, 350.0),
        )
        d = r.to_dict()
        assert d["status"] == "suspect"
        assert d["deviation_pct"] == 35.0
        assert d["reference_range"] == [50.0, 350.0]

    def test_minimal_to_dict(self):
        r = ValidationResult(status=ValidationStatus.SKIPPED)
        d = r.to_dict()
        assert d["status"] == "skipped"
        assert "deviation_pct" not in d


# ---------------------------------------------------------------------------
# Custom ranges
# ---------------------------------------------------------------------------

class TestCustomRanges:
    def test_custom_speed_range(self):
        entry = KnowledgeEntry(
            knowledge_type=KnowledgeType.PARAMETER,
            category="cutting_speed",
            material="steel",
            si_value=500.0,
        )
        custom = {"steel": (100.0, 600.0)}
        validator = PhysicsValidator(speed_ranges=custom)
        result = validator.validate_entry(entry)
        assert result.status == ValidationStatus.VALID
