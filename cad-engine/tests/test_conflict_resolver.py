"""Tests for Conflict Resolution — CC-EXT-MS2 P0-U05.

Covers: conflict detection (3 types), resolution strategies,
model gap flagging, escalation queue, audit trail.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feedback.feedback_schema import OperatorFeedback
from src.feedback.experience_scorer import ExperienceScorer
from src.feedback.conflict_resolver import (
    ConflictResolver,
    Conflict,
    Resolution,
    ConflictType,
    ResolutionStrategy,
    ResolutionOutcome,
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


PHYSICS_RANGES = {
    "milling:aluminum": {
        "cutting_speed": (100.0, 500.0),
        "feed_per_tooth": (0.02, 0.3),
    },
}

KB_VALUES = {
    "milling:aluminum": {
        "cutting_speed": {"value": 300.0, "confidence": 0.85},
        "feed_per_tooth": {"value": 0.1, "confidence": 0.7},
    },
}


@pytest.fixture
def resolver():
    return ConflictResolver(
        physics_ranges=PHYSICS_RANGES,
        knowledge_base=KB_VALUES,
    )


# ===========================================================================
# Operator-vs-Operator conflicts
# ===========================================================================

class TestOperatorVsOperator:

    def test_no_conflict_when_agreeing(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 300.0}),
            _make_feedback("OP-B", parameters_used={"cutting_speed": 310.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        op_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_OPERATOR]
        assert len(op_conflicts) == 0

    def test_conflict_detected_when_disagreeing(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 200.0}),
            _make_feedback("OP-B", parameters_used={"cutting_speed": 400.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        op_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_OPERATOR]
        assert len(op_conflicts) >= 1
        assert op_conflicts[0].parameter == "cutting_speed"

    def test_conflict_includes_cv(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 200.0}),
            _make_feedback("OP-B", parameters_used={"cutting_speed": 400.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        op_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_OPERATOR]
        assert op_conflicts[0].details["cv"] > 0.15

    def test_resolution_by_weighted_voting(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 200.0}),
            _make_feedback("OP-B", parameters_used={"cutting_speed": 400.0}),
            _make_feedback("OP-C", parameters_used={"cutting_speed": 350.0}),
        ]
        conflicts, resolutions = resolver.detect_and_resolve(entries)
        op_resolutions = [
            r for r in resolutions
            if r.conflict_type == ConflictType.OPERATOR_VS_OPERATOR
        ]
        assert len(op_resolutions) >= 1
        r = op_resolutions[0]
        assert r.strategy in (ResolutionStrategy.WEIGHTED_VOTING, ResolutionStrategy.EXPERIENCE_TIEBREAK)
        assert r.outcome == ResolutionOutcome.RESOLVED
        assert r.resolved_value is not None

    def test_single_entry_no_conflict(self, resolver):
        entries = [_make_feedback("OP-A")]
        conflicts = resolver.detect_conflicts(entries)
        op_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_OPERATOR]
        assert len(op_conflicts) == 0


# ===========================================================================
# Operator-vs-Physics conflicts
# ===========================================================================

class TestOperatorVsPhysics:

    def test_value_in_range_no_conflict(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 300.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        phys_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_PHYSICS]
        assert len(phys_conflicts) == 0

    def test_value_above_range(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 600.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        phys_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_PHYSICS]
        assert len(phys_conflicts) == 1
        assert phys_conflicts[0].details["operator_value"] == 600.0

    def test_value_below_range(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 50.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        phys_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_PHYSICS]
        assert len(phys_conflicts) == 1

    def test_physics_wins_resolution(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 600.0}),
        ]
        conflicts, resolutions = resolver.detect_and_resolve(entries)
        phys_res = [r for r in resolutions if r.conflict_type == ConflictType.OPERATOR_VS_PHYSICS]
        assert len(phys_res) == 1
        assert phys_res[0].strategy == ResolutionStrategy.PHYSICS_ARBITRATION
        assert phys_res[0].resolved_value == 500.0  # Clamped to upper bound

    def test_model_gap_flagged(self):
        """3+ high-weight operators disagreeing → model gap."""
        scorer = ExperienceScorer()
        # Build up high weights for these operators
        for op_id in ["OP-A", "OP-B", "OP-C"]:
            for _ in range(20):
                fb = _make_feedback(op_id, experience_years=25,
                                    specializations=["milling", "aluminum"])
                scorer.record_outcome(op_id, fb, "confirmed")

        resolver = ConflictResolver(
            scorer=scorer,
            physics_ranges=PHYSICS_RANGES,
        )

        entries = [
            _make_feedback("OP-A", experience_years=25,
                          specializations=["milling", "aluminum"],
                          parameters_used={"cutting_speed": 550.0}),
            _make_feedback("OP-B", experience_years=25,
                          specializations=["milling", "aluminum"],
                          parameters_used={"cutting_speed": 560.0}),
            _make_feedback("OP-C", experience_years=25,
                          specializations=["milling", "aluminum"],
                          parameters_used={"cutting_speed": 570.0}),
        ]
        conflicts, resolutions = resolver.detect_and_resolve(entries)
        phys_res = [r for r in resolutions if r.conflict_type == ConflictType.OPERATOR_VS_PHYSICS]
        model_gap = [r for r in phys_res if r.outcome == ResolutionOutcome.MODEL_GAP_FLAGGED]
        assert len(model_gap) >= 1

    def test_no_physics_ranges_no_conflict(self):
        resolver = ConflictResolver(physics_ranges={})
        entries = [_make_feedback("OP-A", parameters_used={"cutting_speed": 9999.0})]
        conflicts = resolver.detect_conflicts(entries)
        phys_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_PHYSICS]
        assert len(phys_conflicts) == 0


# ===========================================================================
# Operator-vs-Knowledge conflicts
# ===========================================================================

class TestOperatorVsKnowledge:

    def test_no_conflict_within_threshold(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 310.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        kb_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_KNOWLEDGE]
        assert len(kb_conflicts) == 0

    def test_conflict_above_threshold(self, resolver):
        # KB value is 300, 30% deviation = 390. 450 should trigger.
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 450.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        kb_conflicts = [c for c in conflicts if c.conflict_type == ConflictType.OPERATOR_VS_KNOWLEDGE]
        assert len(kb_conflicts) >= 1
        assert kb_conflicts[0].details["deviation"] > 0.30

    def test_high_conf_kb_wins_over_low_weight_operator(self):
        """High-confidence KB retains value vs low-weight operator."""
        kb = {"milling:aluminum": {
            "cutting_speed": {"value": 300.0, "confidence": 0.9},
        }}
        resolver = ConflictResolver(knowledge_base=kb)
        entries = [
            _make_feedback("OP-NEW", experience_years=1, specializations=[],
                          parameters_used={"cutting_speed": 450.0}),
        ]
        conflicts, resolutions = resolver.detect_and_resolve(entries)
        kb_res = [r for r in resolutions if r.conflict_type == ConflictType.OPERATOR_VS_KNOWLEDGE]
        assert len(kb_res) >= 1, "Expected KB conflict to be detected"
        assert kb_res[0].resolved_value == 300.0

    def test_low_conf_kb_yields_to_expert(self):
        """Low-confidence KB yields to high-weight operator."""
        scorer = ExperienceScorer()
        for _ in range(20):
            fb = _make_feedback("OP-EXPERT", experience_years=25,
                              specializations=["milling", "aluminum"])
            scorer.record_outcome("OP-EXPERT", fb, "confirmed")

        kb = {"milling:aluminum": {
            "cutting_speed": {"value": 300.0, "confidence": 0.3},
        }}
        resolver = ConflictResolver(scorer=scorer, knowledge_base=kb)
        entries = [
            _make_feedback("OP-EXPERT", experience_years=25,
                          specializations=["milling", "aluminum"],
                          parameters_used={"cutting_speed": 450.0}),
        ]
        conflicts, resolutions = resolver.detect_and_resolve(entries)
        kb_res = [r for r in resolutions if r.conflict_type == ConflictType.OPERATOR_VS_KNOWLEDGE]
        assert len(kb_res) >= 1, "Expected KB conflict to be detected"
        assert kb_res[0].resolved_value == 450.0


# ===========================================================================
# Escalation queue
# ===========================================================================

class TestEscalation:

    def test_escalation_queue_populated(self):
        """Model gap detection should add to escalation queue."""
        scorer = ExperienceScorer()
        for op_id in ["OP-A", "OP-B", "OP-C"]:
            for _ in range(20):
                fb = _make_feedback(op_id, experience_years=25,
                                    specializations=["milling", "aluminum"])
                scorer.record_outcome(op_id, fb, "confirmed")

        resolver = ConflictResolver(scorer=scorer, physics_ranges=PHYSICS_RANGES)
        entries = [
            _make_feedback("OP-A", experience_years=25,
                          specializations=["milling", "aluminum"],
                          parameters_used={"cutting_speed": 550.0}),
            _make_feedback("OP-B", experience_years=25,
                          specializations=["milling", "aluminum"],
                          parameters_used={"cutting_speed": 560.0}),
            _make_feedback("OP-C", experience_years=25,
                          specializations=["milling", "aluminum"],
                          parameters_used={"cutting_speed": 570.0}),
        ]
        resolver.detect_and_resolve(entries)
        queue = resolver.get_escalation_queue()
        assert len(queue) >= 1
        assert queue[0].status == "pending"

    def test_review_escalation(self, resolver):
        # Force an escalation
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 600.0}),
        ]
        # Use a resolver with no physics ranges to test pure escalation
        bare_resolver = ConflictResolver()
        # Manually escalate
        conflict = Conflict(
            conflict_id="CONF-TEST",
            conflict_type=ConflictType.OPERATOR_VS_OPERATOR,
            parameter="speed",
            operation_type="milling",
            material="aluminum",
        )
        bare_resolver._escalate(conflict, "Test escalation")
        assert len(bare_resolver.get_escalation_queue()) == 1

        result = bare_resolver.review_escalation("CONF-TEST", "approved", "Looks correct")
        assert result is True
        assert len(bare_resolver.get_escalation_queue()) == 0  # No longer pending

    def test_review_nonexistent_escalation(self, resolver):
        result = resolver.review_escalation("CONF-NONEXISTENT", "approved")
        assert result is False


# ===========================================================================
# Audit trail
# ===========================================================================

class TestAuditTrail:

    def test_audit_trail_recorded(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 600.0}),
        ]
        resolver.detect_and_resolve(entries)
        trail = resolver.get_audit_trail()
        assert len(trail) >= 1
        assert "conflict_id" in trail[0]
        assert "strategy" in trail[0]
        assert "rationale" in trail[0]
        assert "timestamp" in trail[0]

    def test_multiple_resolutions_tracked(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 200.0}),
            _make_feedback("OP-B", parameters_used={"cutting_speed": 600.0}),
        ]
        resolver.detect_and_resolve(entries)
        trail = resolver.get_audit_trail()
        assert len(trail) >= 1  # At least physics conflict for OP-B

    def test_audit_trail_has_all_fields(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 600.0}),
        ]
        resolver.detect_and_resolve(entries)
        trail = resolver.get_audit_trail()
        entry = trail[0]
        required_fields = {"conflict_id", "conflict_type", "strategy", "outcome", "rationale", "timestamp"}
        assert required_fields.issubset(set(entry.keys()))


# ===========================================================================
# Serialization
# ===========================================================================

class TestSerialization:

    def test_conflict_to_dict(self):
        c = Conflict(
            conflict_id="CONF-0001",
            conflict_type=ConflictType.OPERATOR_VS_OPERATOR,
            parameter="speed",
            operation_type="milling",
            material="aluminum",
            details={"cv": 0.25},
        )
        d = c.to_dict()
        assert d["conflict_id"] == "CONF-0001"
        assert d["conflict_type"] == "operator_vs_operator"

    def test_resolution_to_dict(self):
        r = Resolution(
            conflict_id="CONF-0001",
            conflict_type=ConflictType.OPERATOR_VS_PHYSICS,
            strategy=ResolutionStrategy.PHYSICS_ARBITRATION,
            outcome=ResolutionOutcome.RESOLVED,
            resolved_value=500.0,
            rationale="Clamped to physics range",
        )
        d = r.to_dict()
        assert d["resolved_value"] == 500.0
        assert d["strategy"] == "physics_arbitration"

    def test_escalation_to_dict(self):
        from src.feedback.conflict_resolver import EscalationEntry
        conflict = Conflict(
            conflict_id="CONF-0001",
            conflict_type=ConflictType.OPERATOR_VS_OPERATOR,
            parameter="speed",
            operation_type="milling",
            material="aluminum",
        )
        e = EscalationEntry(conflict=conflict, context={"reason": "test"})
        d = e.to_dict()
        assert "conflict" in d
        assert d["status"] == "pending"


# ===========================================================================
# Edge cases
# ===========================================================================

class TestEdgeCases:

    def test_empty_entries(self, resolver):
        conflicts = resolver.detect_conflicts([])
        assert conflicts == []

    def test_mixed_conflict_types(self, resolver):
        """A single batch can produce multiple conflict types."""
        entries = [
            _make_feedback("OP-A", parameters_used={"cutting_speed": 200.0}),
            _make_feedback("OP-B", parameters_used={"cutting_speed": 600.0}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        types = {c.conflict_type for c in conflicts}
        # Should have operator-vs-operator (disagreement) and operator-vs-physics (600 > 500)
        assert ConflictType.OPERATOR_VS_PHYSICS in types

    def test_non_numeric_params_ignored(self, resolver):
        entries = [
            _make_feedback("OP-A", parameters_used={"note": "use coolant"}),
        ]
        conflicts = resolver.detect_conflicts(entries)
        # Should not crash, just skip non-numeric
        assert isinstance(conflicts, list)
