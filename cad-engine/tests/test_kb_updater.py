"""Tests for Knowledge Base Update Pipeline — CC-EXT-MS2 P0-U06.

Covers: NEW/REFINE/OVERRIDE/DEPRECATE modes, version tracking,
rollback, change log, atomic updates.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feedback.feedback_schema import OperatorFeedback
from src.feedback.consensus_builder import ConsensusBuilder, ConsensusResult
from src.feedback.kb_updater import (
    KBUpdater,
    KBEntry,
    KBVersion,
    UpdateMode,
    ChangeLogEntry,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_feedback(operator_id="OP-001", **overrides) -> OperatorFeedback:
    defaults = {
        "operator_id": operator_id,
        "experience_years": 10.0,
        "specializations": ["milling"],
        "operation_type": "milling",
        "material": "aluminum",
        "tool": "10mm carbide endmill",
        "tool_diameter_mm": 10.0,
        "parameters_used": {"cutting_speed": 300.0, "feed_per_tooth": 0.1},
        "outcome": "success",
    }
    defaults.update(overrides)
    return OperatorFeedback(**defaults)


def _build_consensus(entries):
    builder = ConsensusBuilder()
    return builder.build_consensus(entries)


@pytest.fixture
def updater():
    return KBUpdater()


# ===========================================================================
# NEW mode
# ===========================================================================

class TestNewMode:

    def test_new_entry_created(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"cutting_speed": 310.0}),
        ]
        results = _build_consensus(entries)
        changes = updater.apply_consensus(results[0])
        assert len(changes) >= 1
        assert changes[0].mode == UpdateMode.NEW

    def test_new_entry_stored(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 300.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        entry = updater.get_entry("milling", "aluminum", "cutting_speed")
        assert entry is not None
        assert entry.current.version == 1
        assert 295 < entry.current.value < 305

    def test_new_entry_has_contributors(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"speed": 310.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        entry = updater.get_entry("milling", "aluminum", "speed")
        assert "OP-A" in entry.current.contributors
        assert "OP-B" in entry.current.contributors

    def test_multiple_params_created(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0, "feed": 0.1}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        assert updater.get_entry("milling", "aluminum", "speed") is not None
        assert updater.get_entry("milling", "aluminum", "feed") is not None


# ===========================================================================
# REFINE mode
# ===========================================================================

class TestRefineMode:

    def test_refine_narrows_range(self, updater):
        # First: create entry with wide range
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 250.0}),
            _make_feedback("OP-B", parameters_used={"speed": 350.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        entry = updater.get_entry("milling", "aluminum", "speed")
        old_range = entry.current.range_high - entry.current.range_low

        # Second: refine with tighter agreement
        entries2 = [
            _make_feedback("OP-C", parameters_used={"speed": 295.0}),
            _make_feedback("OP-D", parameters_used={"speed": 305.0}),
        ]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.REFINE)
        entry = updater.get_entry("milling", "aluminum", "speed")
        new_range = entry.current.range_high - entry.current.range_low
        assert new_range <= old_range

    def test_refine_preserves_history(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        entries2 = [
            _make_feedback("OP-B", parameters_used={"speed": 310.0}),
        ]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.REFINE)

        entry = updater.get_entry("milling", "aluminum", "speed")
        assert entry.current.version == 2
        assert len(entry.history) == 1
        assert entry.history[0].version == 1

    def test_refine_blends_values(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        entries2 = [
            _make_feedback("OP-B", parameters_used={"speed": 350.0}),
        ]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.REFINE)

        entry = updater.get_entry("milling", "aluminum", "speed")
        # Should be somewhere between 300 and 350
        assert 295 < entry.current.value < 355


# ===========================================================================
# OVERRIDE mode
# ===========================================================================

class TestOverrideMode:

    def test_override_replaces_value(self, updater):
        # Create initial entry
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        # Override with new consensus
        entries2 = [
            _make_feedback("OP-B", parameters_used={"speed": 400.0}),
        ]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.OVERRIDE)

        entry = updater.get_entry("milling", "aluminum", "speed")
        assert abs(entry.current.value - 400.0) < 1.0

    def test_override_keeps_history(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        entries2 = [
            _make_feedback("OP-B", parameters_used={"speed": 400.0}),
        ]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.OVERRIDE)

        entry = updater.get_entry("milling", "aluminum", "speed")
        assert len(entry.history) == 1
        assert abs(entry.history[0].value - 300.0) < 1.0


# ===========================================================================
# DEPRECATE mode
# ===========================================================================

class TestDeprecateMode:

    def test_deprecate_marks_entry(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        entry = updater.get_entry("milling", "aluminum", "speed")
        updater.deprecate_entry(entry.entry_id, "Outdated tooling data")
        entry = updater.get_entry("milling", "aluminum", "speed")
        assert entry.deprecated is True
        assert "Outdated" in entry.deprecated_reason

    def test_deprecate_nonexistent(self, updater):
        result = updater.deprecate_entry("KB-9999", "test")
        assert result is None

    def test_deprecate_via_apply(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        entries2 = [
            _make_feedback("OP-B", parameters_used={"speed": 310.0}),
        ]
        results2 = _build_consensus(entries2)
        changes = updater.apply_consensus(results2[0], mode=UpdateMode.DEPRECATE)
        assert any(c.mode == UpdateMode.DEPRECATE for c in changes)


# ===========================================================================
# Version tracking
# ===========================================================================

class TestVersionTracking:

    def test_version_increments(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        assert updater.get_entry("milling", "aluminum", "speed").current.version == 1

        entries2 = [_make_feedback("OP-B", parameters_used={"speed": 310.0})]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.REFINE)
        assert updater.get_entry("milling", "aluminum", "speed").current.version == 2

        entries3 = [_make_feedback("OP-C", parameters_used={"speed": 320.0})]
        results3 = _build_consensus(entries3)
        updater.apply_consensus(results3[0], mode=UpdateMode.OVERRIDE)
        assert updater.get_entry("milling", "aluminum", "speed").current.version == 3

    def test_history_preserved_across_updates(self, updater):
        for i in range(4):
            entries = [_make_feedback(f"OP-{i}", parameters_used={"speed": 300.0 + i * 10})]
            results = _build_consensus(entries)
            mode = UpdateMode.NEW if i == 0 else UpdateMode.REFINE
            updater.apply_consensus(results[0], mode=mode)

        entry = updater.get_entry("milling", "aluminum", "speed")
        assert entry.current.version == 4
        assert len(entry.history) == 3


# ===========================================================================
# Rollback
# ===========================================================================

class TestRollback:

    def test_rollback_to_previous(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        entries2 = [_make_feedback("OP-B", parameters_used={"speed": 400.0})]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.OVERRIDE)

        entry = updater.get_entry("milling", "aluminum", "speed")
        assert abs(entry.current.value - 400.0) < 1.0

        success = updater.rollback(entry.entry_id)
        assert success is True
        entry = updater.get_entry("milling", "aluminum", "speed")
        assert abs(entry.current.value - 300.0) < 1.0

    def test_rollback_to_specific_version(self, updater):
        for i in range(3):
            entries = [_make_feedback(f"OP-{i}", parameters_used={"speed": 300.0 + i * 50})]
            results = _build_consensus(entries)
            mode = UpdateMode.NEW if i == 0 else UpdateMode.OVERRIDE
            updater.apply_consensus(results[0], mode=mode)

        entry = updater.get_entry("milling", "aluminum", "speed")
        # Currently at version 3, value ~400
        # Roll back to version 1, value ~300
        success = updater.rollback(entry.entry_id, target_version=1)
        assert success is True
        entry = updater.get_entry("milling", "aluminum", "speed")
        assert abs(entry.current.value - 300.0) < 1.0

    def test_rollback_no_history(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        entry = updater.get_entry("milling", "aluminum", "speed")
        success = updater.rollback(entry.entry_id)
        assert success is False

    def test_rollback_nonexistent(self, updater):
        assert updater.rollback("KB-9999") is False

    def test_rollback_invalid_version(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        entries2 = [_make_feedback("OP-B", parameters_used={"speed": 400.0})]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.OVERRIDE)

        entry = updater.get_entry("milling", "aluminum", "speed")
        assert updater.rollback(entry.entry_id, target_version=99) is False

    def test_rollback_clears_deprecation(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        entries2 = [_make_feedback("OP-B", parameters_used={"speed": 400.0})]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.OVERRIDE)

        entry = updater.get_entry("milling", "aluminum", "speed")
        updater.deprecate_entry(entry.entry_id, "test")
        assert entry.deprecated is True

        updater.rollback(entry.entry_id)
        entry = updater.get_entry("milling", "aluminum", "speed")
        assert entry.deprecated is False


# ===========================================================================
# Change log
# ===========================================================================

class TestChangeLog:

    def test_change_log_recorded(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        log = updater.get_change_log()
        assert len(log) >= 1
        assert "entry_id" in log[0]
        assert "mode" in log[0]

    def test_change_summaries_readable(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        summaries = updater.get_change_summaries()
        assert len(summaries) >= 1
        assert "[NEW]" in summaries[0]

    def test_change_log_tracks_all_operations(self, updater):
        # NEW
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])

        # REFINE
        entries2 = [_make_feedback("OP-B", parameters_used={"speed": 310.0})]
        results2 = _build_consensus(entries2)
        updater.apply_consensus(results2[0], mode=UpdateMode.REFINE)

        log = updater.get_change_log()
        modes = [e["mode"] for e in log]
        assert "new" in modes
        assert "refine" in modes


# ===========================================================================
# Serialization
# ===========================================================================

class TestSerialization:

    def test_kb_entry_to_dict(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        entry = updater.get_entry("milling", "aluminum", "speed")
        d = entry.to_dict()
        assert "entry_id" in d
        assert "current" in d
        assert "history" in d
        assert d["current"]["version"] == 1

    def test_change_log_entry_to_dict(self, updater):
        entries = [_make_feedback("OP-A", parameters_used={"speed": 300.0})]
        results = _build_consensus(entries)
        changes = updater.apply_consensus(results[0])
        d = changes[0].to_dict()
        assert "mode" in d
        assert "parameter" in d
        assert "rationale" in d

    def test_get_all_entries(self, updater):
        entries = [
            _make_feedback("OP-A", parameters_used={"speed": 300.0, "feed": 0.1}),
        ]
        results = _build_consensus(entries)
        updater.apply_consensus(results[0])
        all_entries = updater.get_all_entries()
        assert len(all_entries) == 2  # speed + feed
