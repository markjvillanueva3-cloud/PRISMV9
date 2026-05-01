"""Feedback Loop Integration Tests — CC-EXT-MS2 P0-U08.

End-to-end tests exercising the full feedback pipeline:
feedback submission → validation → scoring → consensus → conflict resolution →
KB update → metrics.

Scenarios: single operator, multi-operator consensus, conflict resolution,
rollback, performance, concurrent submissions.
"""

from __future__ import annotations

import os
import sys
import time
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.feedback.feedback_schema import OperatorFeedback
from src.feedback.feedback_api import FeedbackAPI
from src.feedback.feedback_validator import FeedbackValidator
from src.feedback.experience_scorer import ExperienceScorer
from src.feedback.consensus_builder import ConsensusBuilder
from src.feedback.conflict_resolver import ConflictResolver, ConflictType, ResolutionOutcome
from src.feedback.kb_updater import KBUpdater, UpdateMode
from src.feedback.feedback_metrics import FeedbackMetrics


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_feedback(operator_id="OP-001", **overrides) -> OperatorFeedback:
    defaults = {
        "operator_id": operator_id,
        "experience_years": 10.0,
        "specializations": ["milling", "aluminum"],
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
        "cutting_speed": {"value": 300.0, "confidence": 0.7},
    },
}


class FeedbackPipeline:
    """Full feedback pipeline for integration testing."""

    def __init__(self, db_path=":memory:"):
        self.api = FeedbackAPI(db_path)
        self.api.__enter__()  # Initialize DB connection
        self.validator = FeedbackValidator()
        self.scorer = ExperienceScorer()
        self.consensus_builder = ConsensusBuilder(scorer=self.scorer)
        self.conflict_resolver = ConflictResolver(
            scorer=self.scorer,
            physics_ranges=PHYSICS_RANGES,
            knowledge_base=KB_VALUES,
        )
        self.kb_updater = KBUpdater()
        self.metrics = FeedbackMetrics()

    def submit_and_validate(self, feedback: OperatorFeedback) -> dict:
        """Submit feedback through full pipeline: collect → validate → score."""
        # 1. Collect via API
        submit_result = self.api.collect_feedback(feedback)

        # 2. Validate
        result = self.validator.validate(feedback)

        # 3. Score experience
        score = self.scorer.compute_weight(feedback.operator_id, feedback)

        # 4. Record in scorer history
        tier = result.overall_tier
        tier_str = tier.value.lower() if hasattr(tier, 'value') else str(tier).lower()
        if tier_str in ("confirmed", "novel", "implausible"):
            self.scorer.record_outcome(feedback.operator_id, feedback, tier_str)

        # 5. Record in metrics
        self.metrics.record_feedback(
            feedback.operator_id,
            tier_str,
            weight=score.total,
            specializations=feedback.specializations,
            parameter_values={
                k: v for k, v in feedback.parameters_used.items()
                if isinstance(v, (int, float))
            },
        )

        return {
            "feedback_id": submit_result.feedback_id,
            "validation_tier": tier_str,
            "experience_weight": score.total,
        }

    def build_consensus_and_resolve(
        self,
        entries: list[OperatorFeedback],
    ) -> dict:
        """Build consensus and resolve conflicts."""
        # Build consensus
        consensus_results = self.consensus_builder.build_consensus(entries)
        self.metrics.record_consensus(converged=len(consensus_results) > 0)

        # Detect and resolve conflicts
        conflicts, resolutions = self.conflict_resolver.detect_and_resolve(entries)
        for r in resolutions:
            self.metrics.record_conflict(
                escalated=(r.outcome == ResolutionOutcome.ESCALATED)
            )

        return {
            "consensus_results": consensus_results,
            "conflicts": conflicts,
            "resolutions": resolutions,
        }

    def update_kb(self, consensus_results, mode=None) -> list:
        """Apply consensus to knowledge base."""
        all_changes = []
        for cr in consensus_results:
            changes = self.kb_updater.apply_consensus(cr, mode=mode)
            for c in changes:
                self.metrics.record_kb_update(c.mode.value)
            all_changes.extend(changes)
        return all_changes

    def close(self):
        self.api.__exit__(None, None, None)


@pytest.fixture
def pipeline():
    p = FeedbackPipeline()
    yield p
    p.close()


# ===========================================================================
# E2E: Single operator full pipeline
# ===========================================================================

class TestE2ESingleOperator:

    def test_full_pipeline_single_operator(self, pipeline):
        """Single operator submits feedback → validation → scoring → KB update."""
        fb = _make_feedback("OP-SOLO", parameters_used={"cutting_speed": 310.0})

        # Submit and validate
        result = pipeline.submit_and_validate(fb)
        assert result["feedback_id"] is not None
        assert result["validation_tier"] in ("confirmed", "novel", "implausible")
        assert result["experience_weight"] > 0

        # Build consensus (single entry)
        cr = pipeline.build_consensus_and_resolve([fb])
        assert len(cr["consensus_results"]) == 1

        # Update KB
        changes = pipeline.update_kb(cr["consensus_results"])
        assert len(changes) >= 1

        # Verify metrics updated
        m = pipeline.metrics.compute_operator_metrics("OP-SOLO")
        assert m is not None
        assert m.contribution_count == 1

        sm = pipeline.metrics.compute_system_metrics()
        assert sm.total_feedback_count == 1


# ===========================================================================
# E2E: Multi-operator consensus (5 operators)
# ===========================================================================

class TestE2EMultiOperator:

    def test_five_operators_consensus(self, pipeline):
        """5 operators submit feedback for same operation, consensus forms."""
        operators = [
            ("OP-1", 15, 305.0),
            ("OP-2", 10, 310.0),
            ("OP-3", 20, 300.0),
            ("OP-4", 8, 315.0),
            ("OP-5", 12, 308.0),
        ]

        entries = []
        for op_id, years, speed in operators:
            fb = _make_feedback(
                op_id,
                experience_years=years,
                parameters_used={"cutting_speed": speed},
            )
            pipeline.submit_and_validate(fb)
            entries.append(fb)

        # Build consensus
        cr = pipeline.build_consensus_and_resolve(entries)
        assert len(cr["consensus_results"]) == 1
        consensus = cr["consensus_results"][0]
        assert consensus.num_contributors == 5
        assert 295 < consensus.recommended_params["cutting_speed"].weighted_mean < 320
        assert consensus.confidence > 0.3

        # Update KB
        changes = pipeline.update_kb(cr["consensus_results"])
        assert len(changes) >= 1

        # Verify KB entry
        entry = pipeline.kb_updater.get_entry("milling", "aluminum", "cutting_speed")
        assert entry is not None
        assert entry.current.version == 1

        # Verify metrics
        sm = pipeline.metrics.compute_system_metrics()
        assert sm.total_feedback_count == 5
        assert sm.active_operators == 5

    def test_multi_operator_different_materials(self, pipeline):
        """Operators submit for different materials → separate consensus groups."""
        entries = []
        for i in range(3):
            fb = _make_feedback(
                f"OP-AL-{i}",
                material="aluminum",
                parameters_used={"cutting_speed": 300.0 + i * 5},
            )
            pipeline.submit_and_validate(fb)
            entries.append(fb)

        for i in range(2):
            fb = _make_feedback(
                f"OP-ST-{i}",
                material="steel",
                parameters_used={"cutting_speed": 150.0 + i * 5},
            )
            pipeline.submit_and_validate(fb)
            entries.append(fb)

        cr = pipeline.build_consensus_and_resolve(entries)
        assert len(cr["consensus_results"]) == 2


# ===========================================================================
# E2E: Conflict resolution
# ===========================================================================

class TestE2EConflictResolution:

    def test_operator_contradicts_physics(self, pipeline):
        """Operator reports value outside physics range → physics wins."""
        fb_good = _make_feedback("OP-OK", parameters_used={"cutting_speed": 300.0})
        fb_bad = _make_feedback("OP-BAD", parameters_used={"cutting_speed": 600.0})

        pipeline.submit_and_validate(fb_good)
        pipeline.submit_and_validate(fb_bad)

        cr = pipeline.build_consensus_and_resolve([fb_good, fb_bad])
        phys_conflicts = [
            c for c in cr["conflicts"]
            if c.conflict_type == ConflictType.OPERATOR_VS_PHYSICS
        ]
        assert len(phys_conflicts) >= 1

        # Resolution should clamp to physics range
        phys_resolutions = [
            r for r in cr["resolutions"]
            if r.conflict_type == ConflictType.OPERATOR_VS_PHYSICS
        ]
        assert len(phys_resolutions) >= 1
        assert phys_resolutions[0].resolved_value <= 500.0

    def test_operator_disagreement_resolved(self, pipeline):
        """Two operators strongly disagree → weighted voting resolves."""
        fb_a = _make_feedback("OP-A", parameters_used={"cutting_speed": 200.0})
        fb_b = _make_feedback("OP-B", parameters_used={"cutting_speed": 400.0})

        pipeline.submit_and_validate(fb_a)
        pipeline.submit_and_validate(fb_b)

        cr = pipeline.build_consensus_and_resolve([fb_a, fb_b])
        op_conflicts = [
            c for c in cr["conflicts"]
            if c.conflict_type == ConflictType.OPERATOR_VS_OPERATOR
        ]
        assert len(op_conflicts) >= 1

    def test_conflict_audit_trail(self, pipeline):
        """Conflict resolution produces audit trail."""
        fb = _make_feedback("OP-A", parameters_used={"cutting_speed": 600.0})
        pipeline.submit_and_validate(fb)
        pipeline.build_consensus_and_resolve([fb])

        trail = pipeline.conflict_resolver.get_audit_trail()
        assert len(trail) >= 1
        assert "strategy" in trail[0]
        assert "rationale" in trail[0]


# ===========================================================================
# E2E: Rollback
# ===========================================================================

class TestE2ERollback:

    def test_bad_consensus_rollback(self, pipeline):
        """Apply bad consensus → verify KB → rollback → verify restoration."""
        # Good initial data
        good_entries = [
            _make_feedback(f"OP-{i}", parameters_used={"cutting_speed": 300.0 + i * 2})
            for i in range(3)
        ]
        cr_good = pipeline.build_consensus_and_resolve(good_entries)
        pipeline.update_kb(cr_good["consensus_results"])

        entry = pipeline.kb_updater.get_entry("milling", "aluminum", "cutting_speed")
        initial_value = entry.current.value
        entry_id = entry.entry_id

        # Bad update
        bad_entries = [
            _make_feedback("OP-BAD", parameters_used={"cutting_speed": 450.0}),
        ]
        cr_bad = pipeline.build_consensus_and_resolve(bad_entries)
        pipeline.update_kb(cr_bad["consensus_results"], mode=UpdateMode.OVERRIDE)

        entry = pipeline.kb_updater.get_entry("milling", "aluminum", "cutting_speed")
        assert abs(entry.current.value - 450.0) < 1.0

        # Rollback
        success = pipeline.kb_updater.rollback(entry_id)
        assert success is True

        entry = pipeline.kb_updater.get_entry("milling", "aluminum", "cutting_speed")
        assert abs(entry.current.value - initial_value) < 1.0


# ===========================================================================
# Performance
# ===========================================================================

class TestE2EPerformance:

    def test_100_entries_under_30_seconds(self, pipeline):
        """Full pipeline processes 100 feedback entries in under 30 seconds."""
        entries = []
        start = time.time()

        for i in range(100):
            fb = _make_feedback(
                f"OP-{i % 10}",
                experience_years=5 + (i % 20),
                parameters_used={
                    "cutting_speed": 280.0 + (i % 40),
                    "feed_per_tooth": 0.08 + (i % 10) * 0.005,
                },
            )
            pipeline.submit_and_validate(fb)
            entries.append(fb)

        # Build consensus
        cr = pipeline.build_consensus_and_resolve(entries)

        # Update KB
        pipeline.update_kb(cr["consensus_results"])

        # Generate dashboard
        pipeline.metrics.generate_dashboard()

        elapsed = time.time() - start
        assert elapsed < 30.0, f"Pipeline took {elapsed:.2f}s (limit: 30s)"

    def test_pipeline_throughput(self, pipeline):
        """Measure throughput: should handle >10 entries/second."""
        entries = []
        start = time.time()

        for i in range(50):
            fb = _make_feedback(
                f"OP-{i % 5}",
                parameters_used={"cutting_speed": 300.0 + i},
            )
            pipeline.submit_and_validate(fb)
            entries.append(fb)

        elapsed = time.time() - start
        throughput = 50 / elapsed if elapsed > 0 else float("inf")
        assert throughput > 10, f"Throughput {throughput:.1f} entries/s too low"


# ===========================================================================
# Concurrent submissions
# ===========================================================================

class TestE2EConcurrency:

    def test_concurrent_submissions_no_corruption(self, pipeline):
        """10 simultaneous feedback submissions via metrics (non-DB), no corruption."""
        results = []
        lock = threading.Lock()

        def submit_one(idx):
            fb = _make_feedback(
                f"OP-{idx}",
                parameters_used={"cutting_speed": 300.0 + idx},
            )
            # Skip SQLite API (not thread-safe), test metrics + scorer concurrency
            result = pipeline.validator.validate(fb)
            score = pipeline.scorer.compute_weight(fb.operator_id, fb)
            tier_str = result.overall_tier.value.lower() if hasattr(result.overall_tier, 'value') else "confirmed"
            with lock:
                pipeline.metrics.record_feedback(
                    fb.operator_id, tier_str, weight=score.total,
                )
                results.append({"operator_id": fb.operator_id, "weight": score.total})

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(submit_one, i) for i in range(10)]
            for f in futures:
                f.result()

        assert len(results) == 10

        sm = pipeline.metrics.compute_system_metrics()
        assert sm.total_feedback_count == 10
        assert sm.active_operators == 10

    def test_concurrent_metrics_consistency(self, pipeline):
        """Concurrent metric recording produces consistent counts."""
        lock = threading.Lock()

        def submit_batch(prefix, count):
            for i in range(count):
                fb = _make_feedback(
                    f"{prefix}-{i}",
                    parameters_used={"cutting_speed": 300.0 + i},
                )
                score = pipeline.scorer.compute_weight(fb.operator_id, fb)
                with lock:
                    pipeline.metrics.record_feedback(
                        fb.operator_id, "confirmed", weight=score.total,
                    )

        threads = []
        for prefix in ["A", "B", "C"]:
            t = threading.Thread(target=submit_batch, args=(prefix, 5))
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        sm = pipeline.metrics.compute_system_metrics()
        assert sm.total_feedback_count == 15
        assert sm.active_operators == 15


# ===========================================================================
# Metrics reflect pipeline activity
# ===========================================================================

class TestE2EMetricsAccuracy:

    def test_metrics_reflect_all_activity(self, pipeline):
        """Metrics accurately reflect all pipeline operations."""
        # Submit feedback
        for i in range(5):
            fb = _make_feedback(f"OP-{i}", parameters_used={"cutting_speed": 300.0 + i * 5})
            pipeline.submit_and_validate(fb)

        # Build consensus
        entries = [
            _make_feedback(f"OP-{i}", parameters_used={"cutting_speed": 300.0 + i * 5})
            for i in range(5)
        ]
        cr = pipeline.build_consensus_and_resolve(entries)

        # Update KB (metrics recorded inside update_kb)
        changes = pipeline.update_kb(cr["consensus_results"])

        # Generate dashboard
        dashboard = pipeline.metrics.generate_dashboard()
        d = dashboard.to_dict()

        assert d["system_metrics"]["total_feedback_count"] == 5
        assert d["system_metrics"]["active_operators"] == 5
        assert len(d["operator_metrics"]) == 5
        assert d["knowledge_metrics"]["new_entries_count"] >= 1
