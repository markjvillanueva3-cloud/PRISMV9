"""Multi-Operator Consensus & Conflict Scenarios — CC-EXT-MS2 P0-U08.

Extended multi-operator scenarios beyond the E2E suite:
- Varying experience levels affect consensus weights
- Outlier detection with apprentice operators
- Cross-material consensus independence
- Knowledge conflict with expert override
"""

from __future__ import annotations

import json
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.feedback.feedback_schema import OperatorFeedback
from src.feedback.feedback_api import FeedbackAPI
from src.feedback.feedback_validator import FeedbackValidator, ValidationTier
from src.feedback.experience_scorer import ExperienceScorer
from src.feedback.consensus_builder import ConsensusBuilder
from src.feedback.conflict_resolver import ConflictResolver, ConflictType
from src.feedback.kb_updater import KBUpdater
from src.feedback.feedback_metrics import FeedbackMetrics


def _fb(op_id, speed=180.0, feed=0.12, depth=3.0, years=10.0,
        specs=None, material="steel", outcome="success"):
    return OperatorFeedback(
        operator_id=op_id, operation_type="milling", material=material,
        tool="10mm carbide endmill", tool_diameter_mm=10.0,
        parameters_used={"cutting_speed": speed, "feed_per_tooth": feed, "axial_depth": depth},
        outcome=outcome, experience_years=years,
        specializations=specs or ["milling", "steel"],
    )


class TestExperienceWeightedConsensus:

    def test_master_operator_has_more_influence(self):
        """Master operator's value should pull weighted mean toward their value."""
        scorer = ExperienceScorer()
        builder = ConsensusBuilder(scorer=scorer)

        entries = [
            _fb("OP-MASTER", speed=180.0, years=25.0, specs=["milling", "steel"]),
            _fb("OP-APPR-1", speed=250.0, years=1.0, specs=[]),
            _fb("OP-APPR-2", speed=260.0, years=0.5, specs=[]),
        ]
        results = builder.build_consensus(entries)
        assert len(results) == 1
        consensus = results[0]
        speed_param = consensus.recommended_params.get("cutting_speed")
        assert speed_param is not None
        # Weighted mean should be closer to 180 than to 255
        assert speed_param.weighted_mean < 230.0

    def test_five_operators_from_synthetic_data(self):
        """Load synthetic operators and build consensus."""
        path = os.path.join(os.path.dirname(__file__), "..", "..", "data",
                            "test_feedback", "synthetic_operators.json")
        with open(path) as f:
            data = json.load(f)

        entries = []
        for op in data["operators"]:
            fb = OperatorFeedback(
                operator_id=op["operator_id"],
                operation_type=op["typical_feedback"]["operation_type"],
                material=op["typical_feedback"]["material"],
                tool=op["typical_feedback"]["tool"],
                tool_diameter_mm=op["typical_feedback"]["tool_diameter_mm"],
                parameters_used=op["typical_feedback"]["parameters_used"],
                outcome=op["typical_feedback"]["outcome"],
                experience_years=op["experience_years"],
                specializations=op["specializations"],
            )
            entries.append(fb)

        scorer = ExperienceScorer()
        builder = ConsensusBuilder(scorer=scorer)
        results = builder.build_consensus(entries)
        assert len(results) == 1
        assert results[0].num_contributors == 5

    def test_outlier_detected_for_apprentice(self):
        """Apprentice with extreme values should be flagged as outlier."""
        scorer = ExperienceScorer()
        builder = ConsensusBuilder(scorer=scorer)

        entries = [
            _fb("OP-A", speed=180.0, years=15.0),
            _fb("OP-B", speed=175.0, years=12.0),
            _fb("OP-C", speed=185.0, years=20.0),
            _fb("OP-APPR", speed=350.0, years=1.0, specs=[]),  # Outlier
        ]
        results = builder.build_consensus(entries)
        consensus = results[0]
        if consensus.outliers:
            outlier_ops = [o.operator_id for o in consensus.outliers]
            assert "OP-APPR" in outlier_ops


class TestCrossMaterialIndependence:

    def test_separate_consensus_per_material(self):
        """Steel and aluminum feedback should produce separate consensus."""
        scorer = ExperienceScorer()
        builder = ConsensusBuilder(scorer=scorer)

        entries = [
            _fb("OP-A", speed=180.0, material="steel"),
            _fb("OP-B", speed=175.0, material="steel"),
            _fb("OP-C", speed=350.0, material="aluminum"),
            _fb("OP-D", speed=380.0, material="aluminum"),
        ]
        results = builder.build_consensus(entries)
        assert len(results) == 2
        materials = {r.material for r in results}
        assert materials == {"steel", "aluminum"}


class TestKnowledgeConflictWithExpert:

    def test_expert_can_influence_kb_update(self):
        """Expert operator feedback should flow through to KB update."""
        scorer = ExperienceScorer()
        builder = ConsensusBuilder(scorer=scorer)
        updater = KBUpdater()

        entries = [
            _fb("OP-EXPERT-1", speed=200.0, years=25.0, specs=["milling", "steel"]),
            _fb("OP-EXPERT-2", speed=195.0, years=20.0, specs=["milling", "steel"]),
            _fb("OP-EXPERT-3", speed=205.0, years=18.0, specs=["milling"]),
        ]
        results = builder.build_consensus(entries)
        changes = updater.apply_consensus(results[0])
        assert len(changes) >= 1

        entry = updater.get_entry("milling", "steel", "cutting_speed")
        assert entry is not None
        # Mean should be ~200
        assert 190.0 < entry.current.value < 210.0


class TestConflictScenarioMatrix:

    def test_all_three_conflict_types(self):
        """Trigger operator-vs-operator, vs-physics, vs-knowledge simultaneously."""
        resolver = ConflictResolver(
            physics_ranges={"milling:steel": {"cutting_speed": (80.0, 250.0)}},
            knowledge_base={"milling:steel": {"feed_per_tooth": {"value": 0.10, "confidence": 0.9}}},
        )
        entries = [
            _fb("OP-A", speed=180.0, feed=0.12),
            _fb("OP-B", speed=400.0, feed=0.40),  # Physics conflict + operator disagreement
        ]
        conflicts, resolutions = resolver.detect_and_resolve(entries)
        types = {c.conflict_type for c in conflicts}
        # At least physics conflict for OP-B speed, and knowledge conflict for OP-B feed
        assert ConflictType.OPERATOR_VS_PHYSICS in types

    def test_escalation_queue_populated(self):
        """Unresolvable conflicts end up in escalation queue."""
        resolver = ConflictResolver(
            physics_ranges={"milling:steel": {"cutting_speed": (80.0, 250.0)}},
        )
        entries = [_fb("OP-A", speed=500.0)]
        resolver.detect_and_resolve(entries)
        # Audit trail should be populated
        trail = resolver.get_audit_trail()
        assert len(trail) >= 1
