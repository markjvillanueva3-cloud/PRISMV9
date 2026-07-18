"""Performance & Concurrency Tests — CC-EXT-MS2 P0-U08.

Validates:
- Full pipeline processes 100 entries in <30 seconds
- Concurrent submissions cause no data corruption
- Metrics pipeline handles volume correctly
- KB update performance under load
"""

from __future__ import annotations

import os
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.feedback.feedback_schema import OperatorFeedback
from src.feedback.feedback_api import FeedbackAPI
from src.feedback.feedback_validator import FeedbackValidator
from src.feedback.experience_scorer import ExperienceScorer
from src.feedback.consensus_builder import ConsensusBuilder
from src.feedback.kb_updater import KBUpdater
from src.feedback.feedback_metrics import FeedbackMetrics


def _fb(op_id, speed=180.0, feed=0.12, depth=3.0, years=10.0,
        material="steel"):
    return OperatorFeedback(
        operator_id=op_id, operation_type="milling", material=material,
        tool="10mm carbide endmill", tool_diameter_mm=10.0,
        parameters_used={"cutting_speed": speed, "feed_per_tooth": feed, "axial_depth": depth},
        outcome="success", experience_years=years,
        specializations=["milling", material],
    )


class TestPipelineThroughput:

    def test_100_entries_full_pipeline_under_30s(self):
        """100 entries through full pipeline in under 30 seconds."""
        start = time.perf_counter()

        validator = FeedbackValidator()
        scorer = ExperienceScorer()
        builder = ConsensusBuilder(scorer=scorer)
        updater = KBUpdater()
        metrics = FeedbackMetrics()

        entries = []
        for i in range(100):
            fb = _fb(
                f"OP-{i % 10}",
                speed=150.0 + (i % 20) * 5,
                feed=0.08 + (i % 10) * 0.01,
                years=5.0 + (i % 15),
            )
            entries.append(fb)

            # Validate
            vr = validator.validate(fb)
            score = scorer.compute_weight(fb.operator_id, fb)
            scorer.record_outcome(fb.operator_id, fb, vr.overall_tier.value)
            metrics.record_feedback(
                fb.operator_id, vr.overall_tier.value,
                weight=score.total,
                parameter_values=fb.parameters_used,
            )

        # Build consensus
        consensus_results = builder.build_consensus(entries)
        for cr in consensus_results:
            updater.apply_consensus(cr)
            metrics.record_consensus(converged=cr.confidence > 0.3)

        # Generate metrics
        dashboard = metrics.generate_dashboard()

        elapsed = time.perf_counter() - start
        assert elapsed < 30.0, f"Pipeline took {elapsed:.2f}s, exceeds 30s limit"
        assert dashboard.system_metrics.total_feedback_count == 100

    def test_500_entries_throughput(self):
        """500 entries should still process within reasonable time."""
        start = time.perf_counter()

        validator = FeedbackValidator()
        scorer = ExperienceScorer()
        metrics = FeedbackMetrics()

        for i in range(500):
            fb = _fb(f"OP-{i % 20}", speed=150.0 + i % 100)
            vr = validator.validate(fb)
            score = scorer.compute_weight(fb.operator_id, fb)
            metrics.record_feedback(
                fb.operator_id, vr.overall_tier.value,
                weight=score.total,
            )

        dashboard = metrics.generate_dashboard()
        elapsed = time.perf_counter() - start
        assert elapsed < 30.0
        assert dashboard.system_metrics.total_feedback_count == 500

    def test_kb_update_performance(self):
        """50 consensus rounds should update KB quickly."""
        scorer = ExperienceScorer()
        builder = ConsensusBuilder(scorer=scorer)
        updater = KBUpdater()

        start = time.perf_counter()
        for round_num in range(50):
            entries = [
                _fb(f"OP-{j}", speed=180.0 + round_num + j)
                for j in range(5)
            ]
            results = builder.build_consensus(entries)
            for cr in results:
                updater.apply_consensus(cr)

        elapsed = time.perf_counter() - start
        assert elapsed < 10.0

        # Verify KB has entries
        all_entries = updater.get_all_entries()
        assert len(all_entries) >= 1
        # Should have high version number from repeated updates
        speed_entry = updater.get_entry("milling", "steel", "cutting_speed")
        assert speed_entry is not None
        assert speed_entry.current_version >= 2


class TestConcurrentSubmissions:

    def test_concurrent_api_submissions(self):
        """10 concurrent submissions to SQLite-backed API, no corruption."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "concurrent.db")

            results = []

            def submit_one(idx):
                api = FeedbackAPI(db_path=db_path)
                api.open()
                try:
                    fb = _fb(f"OP-{idx}", speed=180.0 + idx)
                    result = api.collect_feedback(fb)
                    return result.success
                finally:
                    api.close()

            with ThreadPoolExecutor(max_workers=5) as pool:
                futures = [pool.submit(submit_one, i) for i in range(10)]
                results = [f.result() for f in futures]

            # All should succeed (or some may fail due to concurrent DB lock — acceptable)
            success_count = sum(1 for r in results if r)
            assert success_count >= 5  # At least half succeed under contention

            # Verify total count
            api = FeedbackAPI(db_path=db_path)
            api.open()
            try:
                assert api.count() == success_count
            finally:
                api.close()

    def test_concurrent_metrics_no_crash(self):
        """Concurrent metrics recording doesn't crash."""
        metrics = FeedbackMetrics()

        def record_batch(batch_id):
            for i in range(20):
                metrics.record_feedback(
                    f"OP-{batch_id}-{i}", "confirmed",
                    weight=0.5 + batch_id * 0.1,
                )
            return True

        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(record_batch, b) for b in range(4)]
            results = [f.result() for f in futures]

        assert all(results)
        dashboard = metrics.generate_dashboard()
        assert dashboard.system_metrics.total_feedback_count == 80  # 4 batches × 20

    def test_concurrent_validator_stateless(self):
        """Validator is stateless — concurrent use is safe."""
        validator = FeedbackValidator()

        def validate_one(idx):
            fb = _fb(f"OP-{idx}", speed=150.0 + idx * 10)
            return validator.validate(fb)

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(validate_one, i) for i in range(50)]
            results = [f.result() for f in futures]

        assert len(results) == 50
        assert all(r.feedback_id for r in results)


class TestDataIntegrity:

    def test_batch_import_preserves_all_data(self):
        """Batch import via API preserves all parameter data."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "integrity.db")
            with FeedbackAPI(db_path=db_path) as api:
                entries = [
                    _fb(f"OP-{i}", speed=100.0 + i * 10, feed=0.05 + i * 0.01)
                    for i in range(20)
                ]
                result = api.batch_import(entries)
                assert result.accepted == 20

                # Verify all data retrievable
                all_fb = api.get_all(limit=100)
                assert len(all_fb) == 20
                for fb in all_fb:
                    assert "cutting_speed" in fb.parameters_used
                    assert "feed_per_tooth" in fb.parameters_used

    def test_metrics_count_consistency(self):
        """Metrics counts should exactly match recorded events."""
        metrics = FeedbackMetrics()

        confirmed = 0
        novel = 0
        implausible = 0

        for i in range(30):
            if i % 5 == 0:
                tier = "implausible"
                implausible += 1
            elif i % 3 == 0:
                tier = "novel"
                novel += 1
            else:
                tier = "confirmed"
                confirmed += 1
            metrics.record_feedback(f"OP-{i % 5}", tier, weight=0.5)

        sys_metrics = metrics.compute_system_metrics()
        assert sys_metrics.total_feedback_count == 30
        expected_pass_rate = confirmed / 30
        assert abs(sys_metrics.validation_pass_rate - expected_pass_rate) < 0.01
