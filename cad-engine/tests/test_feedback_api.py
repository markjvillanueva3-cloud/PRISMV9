"""Tests for Feedback Collection API — CC-EXT-MS2 P0-U01.

Covers: feedback_schema validation, FeedbackAPI collect/batch/query/audit.
Exit conditions:
  - collect_feedback() accepts structured operator input
  - Input validation rejects incomplete/malformed submissions
  - Batch submission works for historical data
  - SQLite storage with full audit trail
  - Query interface: by operation, material, operator, conditions
  - Summary statistics computed correctly
"""

from __future__ import annotations

import json
import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feedback.feedback_schema import (
    OperatorFeedback,
    FeedbackValidationError,
    validate_feedback,
    ExperienceLevel,
    Outcome,
    OperationType,
    OperatorProfile,
)
from src.feedback.feedback_api import (
    FeedbackAPI,
    SubmitResult,
    BatchResult,
    FeedbackSummary,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db_path(tmp_path):
    return str(tmp_path / "test_feedback.db")


@pytest.fixture
def api(db_path):
    api = FeedbackAPI(db_path=db_path)
    api.open()
    yield api
    api.close()


def _make_feedback(**overrides) -> OperatorFeedback:
    defaults = {
        "operator_id": "OP-001",
        "experience_level": "experienced",
        "experience_years": 10.0,
        "specializations": ["milling", "aluminum"],
        "operation_type": "milling",
        "material": "aluminum",
        "tool": "10mm carbide endmill",
        "tool_diameter_mm": 10.0,
        "parameters_used": {"cutting_speed": 300.0, "feed_per_tooth": 0.1, "axial_depth": 2.0},
        "outcome": "success",
        "notes": "Ran well, good surface finish",
    }
    defaults.update(overrides)
    return OperatorFeedback(**defaults)


# ========================== Schema Validation ==========================


class TestFeedbackSchema:

    def test_valid_feedback_no_errors(self):
        fb = _make_feedback()
        errors = validate_feedback(fb)
        assert errors == []

    def test_missing_operator_id(self):
        fb = _make_feedback(operator_id="")
        errors = validate_feedback(fb)
        assert any("operator_id" in e for e in errors)

    def test_missing_operation_type(self):
        fb = _make_feedback(operation_type="")
        errors = validate_feedback(fb)
        assert any("operation_type" in e for e in errors)

    def test_invalid_operation_type(self):
        fb = _make_feedback(operation_type="welding")
        errors = validate_feedback(fb)
        assert any("not recognized" in e for e in errors)

    def test_missing_material(self):
        fb = _make_feedback(material="")
        errors = validate_feedback(fb)
        assert any("material" in e for e in errors)

    def test_missing_outcome(self):
        fb = _make_feedback(outcome="")
        errors = validate_feedback(fb)
        assert any("outcome" in e for e in errors)

    def test_invalid_outcome(self):
        fb = _make_feedback(outcome="maybe")
        errors = validate_feedback(fb)
        assert any("not valid" in e for e in errors)

    def test_empty_parameters(self):
        fb = _make_feedback(parameters_used={})
        errors = validate_feedback(fb)
        assert any("parameters_used" in e for e in errors)

    def test_modified_without_modifications(self):
        fb = _make_feedback(outcome="modified", modifications_made={})
        errors = validate_feedback(fb)
        assert any("modifications_made" in e for e in errors)

    def test_modified_with_modifications_valid(self):
        fb = _make_feedback(
            outcome="modified",
            modifications_made={"cutting_speed": 250.0},
        )
        errors = validate_feedback(fb)
        assert errors == []

    def test_auto_generated_id(self):
        fb = OperatorFeedback(operator_id="OP-1", operation_type="milling",
                              material="steel", outcome="success",
                              parameters_used={"speed": 100})
        assert fb.feedback_id.startswith("FB-")
        assert len(fb.feedback_id) > 5

    def test_auto_generated_timestamp(self):
        fb = _make_feedback()
        assert fb.timestamp  # Should be auto-populated

    def test_to_dict_roundtrip(self):
        fb = _make_feedback()
        d = fb.to_dict()
        fb2 = OperatorFeedback.from_dict(d)
        assert fb2.operator_id == fb.operator_id
        assert fb2.material == fb.material
        assert fb2.parameters_used == fb.parameters_used

    def test_all_operation_types_valid(self):
        for op in ["milling", "turning", "drilling", "grinding", "threading",
                    "boring", "reaming", "tapping", "edm", "other"]:
            fb = _make_feedback(operation_type=op)
            assert validate_feedback(fb) == []

    def test_all_outcomes_valid(self):
        for outcome in ["success", "failure", "modified"]:
            kwargs = {"outcome": outcome}
            if outcome == "modified":
                kwargs["modifications_made"] = {"speed": 100}
            fb = _make_feedback(**kwargs)
            assert validate_feedback(fb) == []

    def test_multiple_errors_returned(self):
        fb = OperatorFeedback()  # Everything empty
        errors = validate_feedback(fb)
        assert len(errors) >= 3  # At least operator_id, operation_type, material, outcome


# ========================== FeedbackAPI Submit ==========================


class TestFeedbackSubmit:

    def test_submit_valid(self, api):
        fb = _make_feedback()
        result = api.collect_feedback(fb)
        assert result.success is True
        assert result.feedback_id == fb.feedback_id

    def test_submit_stores_in_db(self, api):
        fb = _make_feedback()
        api.collect_feedback(fb)
        assert api.count() == 1

    def test_submit_invalid_rejected(self, api):
        fb = _make_feedback(operator_id="")
        result = api.collect_feedback(fb)
        assert result.success is False
        assert len(result.errors) > 0
        assert api.count() == 0

    def test_duplicate_id_rejected(self, api):
        fb1 = _make_feedback(feedback_id="DUP-001")
        fb2 = _make_feedback(feedback_id="DUP-001", operator_id="OP-002")
        api.collect_feedback(fb1)
        result = api.collect_feedback(fb2)
        assert result.success is False
        assert any("Duplicate" in e for e in result.errors)

    def test_audit_trail_created(self, api):
        fb = _make_feedback()
        api.collect_feedback(fb)
        trail = api.get_audit_trail(fb.feedback_id)
        assert len(trail) == 1
        assert trail[0]["action"] == "submit"

    def test_submit_result_to_dict(self, api):
        fb = _make_feedback()
        result = api.collect_feedback(fb)
        d = result.to_dict()
        assert d["success"] is True
        assert "feedback_id" in d


# ========================== Batch Import ==========================


class TestBatchImport:

    def test_batch_all_valid(self, api):
        entries = [_make_feedback(operator_id=f"OP-{i}") for i in range(5)]
        result = api.batch_import(entries)
        assert result.total == 5
        assert result.accepted == 5
        assert result.rejected == 0
        assert api.count() == 5

    def test_batch_mixed_valid_invalid(self, api):
        entries = [
            _make_feedback(operator_id="OP-GOOD"),
            _make_feedback(operator_id=""),  # Invalid
            _make_feedback(operator_id="OP-GOOD2"),
        ]
        result = api.batch_import(entries)
        assert result.total == 3
        assert result.accepted == 2
        assert result.rejected == 1

    def test_batch_empty(self, api):
        result = api.batch_import([])
        assert result.total == 0
        assert result.accepted == 0

    def test_batch_result_to_dict(self, api):
        entries = [_make_feedback()]
        result = api.batch_import(entries)
        d = result.to_dict()
        assert d["total"] == 1
        assert len(d["results"]) == 1


# ========================== Query Interface ==========================


class TestQueryInterface:

    def _seed(self, api):
        entries = [
            _make_feedback(operator_id="OP-A", operation_type="milling", material="aluminum", outcome="success"),
            _make_feedback(operator_id="OP-A", operation_type="drilling", material="steel", outcome="failure"),
            _make_feedback(operator_id="OP-B", operation_type="milling", material="aluminum", outcome="success"),
            _make_feedback(operator_id="OP-B", operation_type="milling", material="steel", outcome="modified",
                          modifications_made={"speed": 200}),
            _make_feedback(operator_id="OP-C", operation_type="turning", material="titanium", outcome="success"),
        ]
        api.batch_import(entries)

    def test_by_operation(self, api):
        self._seed(api)
        results = api.get_feedback_by_operation("milling")
        assert len(results) == 3

    def test_by_material(self, api):
        self._seed(api)
        results = api.get_feedback_by_material("aluminum")
        assert len(results) == 2

    def test_by_operator(self, api):
        self._seed(api)
        results = api.get_feedback_by_operator("OP-A")
        assert len(results) == 2

    def test_by_conditions_multi(self, api):
        self._seed(api)
        results = api.get_feedback_by_conditions(
            operation_type="milling", material="aluminum",
        )
        assert len(results) == 2

    def test_by_conditions_outcome(self, api):
        self._seed(api)
        results = api.get_feedback_by_conditions(outcome="failure")
        assert len(results) == 1

    def test_by_conditions_no_match(self, api):
        self._seed(api)
        results = api.get_feedback_by_conditions(
            operation_type="edm", material="inconel",
        )
        assert len(results) == 0

    def test_get_all(self, api):
        self._seed(api)
        results = api.get_all()
        assert len(results) == 5

    def test_query_preserves_parameters(self, api):
        fb = _make_feedback(parameters_used={"speed": 300, "feed": 0.1})
        api.collect_feedback(fb)
        results = api.get_feedback_by_operator(fb.operator_id)
        assert results[0].parameters_used["speed"] == 300
        assert results[0].parameters_used["feed"] == 0.1

    def test_query_limit(self, api):
        entries = [_make_feedback(operator_id=f"OP-{i}") for i in range(20)]
        api.batch_import(entries)
        results = api.get_all(limit=5)
        assert len(results) == 5


# ========================== Summary ==========================


class TestFeedbackSummary:

    def _seed(self, api):
        entries = [
            _make_feedback(operator_id="OP-A", operation_type="milling", material="aluminum",
                          outcome="success", parameters_used={"speed": 300, "feed": 0.1}),
            _make_feedback(operator_id="OP-B", operation_type="milling", material="aluminum",
                          outcome="success", parameters_used={"speed": 320, "feed": 0.12}),
            _make_feedback(operator_id="OP-C", operation_type="milling", material="aluminum",
                          outcome="failure", parameters_used={"speed": 500, "feed": 0.3}),
        ]
        api.batch_import(entries)

    def test_summary_counts(self, api):
        self._seed(api)
        summary = api.get_feedback_summary(operation_type="milling", material="aluminum")
        assert summary.total_count == 3
        assert summary.success_count == 2
        assert summary.failure_count == 1
        assert summary.unique_operators == 3

    def test_summary_avg_parameters(self, api):
        self._seed(api)
        summary = api.get_feedback_summary(operation_type="milling")
        assert "speed" in summary.avg_parameters
        avg_speed = summary.avg_parameters["speed"]
        assert abs(avg_speed - (300 + 320 + 500) / 3) < 0.01

    def test_summary_empty(self, api):
        summary = api.get_feedback_summary(operation_type="edm")
        assert summary.total_count == 0

    def test_summary_to_dict(self, api):
        self._seed(api)
        summary = api.get_feedback_summary()
        d = summary.to_dict()
        assert "total_count" in d
        assert "avg_parameters" in d


# ========================== Context Manager ==========================


class TestContextManager:

    def test_context_manager(self, db_path):
        fb = _make_feedback()
        with FeedbackAPI(db_path=db_path) as api:
            result = api.collect_feedback(fb)
            assert result.success is True

        # Verify data persists after close
        with FeedbackAPI(db_path=db_path) as api:
            assert api.count() == 1

    def test_data_persists_across_sessions(self, db_path):
        fb1 = _make_feedback(operator_id="OP-PERSIST-1")
        fb2 = _make_feedback(operator_id="OP-PERSIST-2")

        with FeedbackAPI(db_path=db_path) as api:
            api.collect_feedback(fb1)

        with FeedbackAPI(db_path=db_path) as api:
            api.collect_feedback(fb2)
            assert api.count() == 2


# ========================== Edge Cases ==========================


class TestEdgeCases:

    def test_special_characters_in_notes(self, api):
        fb = _make_feedback(notes="Tool broke at 50% — replaced with 'new' one & continued")
        result = api.collect_feedback(fb)
        assert result.success is True
        retrieved = api.get_feedback_by_operator(fb.operator_id)
        assert "broke" in retrieved[0].notes

    def test_unicode_in_material(self, api):
        fb = _make_feedback(material="Inconel 718")
        result = api.collect_feedback(fb)
        assert result.success is True

    def test_large_parameters_dict(self, api):
        params = {f"param_{i}": float(i) for i in range(50)}
        fb = _make_feedback(parameters_used=params)
        result = api.collect_feedback(fb)
        assert result.success is True
        retrieved = api.get_feedback_by_operator(fb.operator_id)
        assert len(retrieved[0].parameters_used) == 50

    def test_empty_specializations(self, api):
        fb = _make_feedback(specializations=[])
        result = api.collect_feedback(fb)
        assert result.success is True

    def test_operator_profile_to_dict(self):
        profile = OperatorProfile(
            operator_id="OP-PROF",
            name="John Smith",
            experience_years=15.0,
            experience_level=ExperienceLevel.MASTER,
            specializations=["milling", "titanium"],
        )
        d = profile.to_dict()
        assert d["operator_id"] == "OP-PROF"
        assert d["experience_level"] == "master"
