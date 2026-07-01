"""Tests for Feedback Quality Metrics — CC-EXT-MS2 P0-U07.

Covers: per-operator metrics, system-wide metrics, knowledge improvement,
anomaly detection, dashboard JSON output.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.feedback.feedback_metrics import (
    FeedbackMetrics,
    OperatorMetrics,
    SystemMetrics,
    KnowledgeImprovementMetrics,
    Anomaly,
    DashboardOutput,
)


@pytest.fixture
def metrics():
    return FeedbackMetrics()


# ===========================================================================
# Per-operator metrics
# ===========================================================================

class TestOperatorMetrics:

    def test_basic_operator_metrics(self, metrics):
        for _ in range(7):
            metrics.record_feedback("OP-A", "confirmed", weight=0.8)
        for _ in range(3):
            metrics.record_feedback("OP-A", "implausible", weight=0.8)

        m = metrics.compute_operator_metrics("OP-A")
        assert m is not None
        assert m.operator_id == "OP-A"
        assert abs(m.accuracy_rate - 0.7) < 0.01
        assert m.contribution_count == 10
        assert m.confirmed_count == 7
        assert m.implausible_count == 3

    def test_unknown_operator(self, metrics):
        assert metrics.compute_operator_metrics("OP-NOBODY") is None

    def test_consistency_score(self, metrics):
        # Consistent operator: same values
        for i in range(5):
            metrics.record_feedback(
                "OP-STEADY", "confirmed",
                parameter_values={"speed": 300.0 + i},
            )
        m = metrics.compute_operator_metrics("OP-STEADY")
        assert m.consistency_score > 0.8

    def test_inconsistent_operator(self, metrics):
        speeds = [100, 500, 200, 800, 50]
        for spd in speeds:
            metrics.record_feedback(
                "OP-WILD", "confirmed",
                parameter_values={"speed": float(spd)},
            )
        m = metrics.compute_operator_metrics("OP-WILD")
        assert m.consistency_score < 0.5

    def test_specialization_coverage(self, metrics):
        metrics.record_feedback("OP-A", "confirmed", specializations=["milling", "aluminum"])
        metrics.record_feedback("OP-B", "confirmed", specializations=["turning", "steel"])
        metrics.record_feedback("OP-A", "confirmed", specializations=["milling"])

        m_a = metrics.compute_operator_metrics("OP-A")
        m_b = metrics.compute_operator_metrics("OP-B")
        assert m_a.specialization_coverage > 0
        assert m_b.specialization_coverage > 0

    def test_avg_weight(self, metrics):
        metrics.record_feedback("OP-A", "confirmed", weight=0.9)
        metrics.record_feedback("OP-A", "confirmed", weight=0.7)
        m = metrics.compute_operator_metrics("OP-A")
        assert abs(m.avg_weight - 0.8) < 0.01

    def test_operator_to_dict(self, metrics):
        metrics.record_feedback("OP-A", "confirmed")
        m = metrics.compute_operator_metrics("OP-A")
        d = m.to_dict()
        required = {"operator_id", "accuracy_rate", "consistency_score",
                     "contribution_count", "specialization_coverage"}
        assert required.issubset(set(d.keys()))


# ===========================================================================
# System-wide metrics
# ===========================================================================

class TestSystemMetrics:

    def test_basic_system_metrics(self, metrics):
        for _ in range(8):
            metrics.record_feedback("OP-A", "confirmed")
        for _ in range(2):
            metrics.record_feedback("OP-A", "implausible")

        sm = metrics.compute_system_metrics()
        assert sm.total_feedback_count == 10
        assert abs(sm.validation_pass_rate - 0.8) < 0.01
        assert sm.active_operators == 1

    def test_consensus_convergence_rate(self, metrics):
        metrics.record_consensus(converged=True)
        metrics.record_consensus(converged=True)
        metrics.record_consensus(converged=False)

        sm = metrics.compute_system_metrics()
        assert abs(sm.consensus_convergence_rate - 2 / 3) < 0.01

    def test_conflict_and_escalation_rate(self, metrics):
        metrics.record_feedback("OP-A", "confirmed")
        metrics.record_feedback("OP-B", "confirmed")
        metrics.record_conflict(escalated=False)
        metrics.record_conflict(escalated=True)

        sm = metrics.compute_system_metrics()
        assert sm.conflict_rate == 1.0  # 2 conflicts / 2 feedback
        assert sm.escalation_rate == 0.5  # 1 escalation / 2 conflicts

    def test_multiple_operators(self, metrics):
        for _ in range(5):
            metrics.record_feedback("OP-A", "confirmed")
        for _ in range(5):
            metrics.record_feedback("OP-B", "novel")

        sm = metrics.compute_system_metrics()
        assert sm.active_operators == 2
        assert sm.total_feedback_count == 10

    def test_system_metrics_to_dict(self, metrics):
        metrics.record_feedback("OP-A", "confirmed")
        sm = metrics.compute_system_metrics()
        d = sm.to_dict()
        assert "total_feedback_count" in d
        assert "validation_pass_rate" in d
        assert "consensus_convergence_rate" in d

    def test_empty_system_metrics(self, metrics):
        sm = metrics.compute_system_metrics()
        assert sm.total_feedback_count == 0
        assert sm.validation_pass_rate == 0.0


# ===========================================================================
# Knowledge improvement metrics
# ===========================================================================

class TestKnowledgeMetrics:

    def test_kb_update_counts(self, metrics):
        metrics.record_kb_update("new")
        metrics.record_kb_update("new")
        metrics.record_kb_update("refine", range_tightening=0.3)
        metrics.record_kb_update("override")
        metrics.record_kb_update("deprecate")

        km = metrics.compute_knowledge_metrics()
        assert km.new_entries_count == 2
        assert km.refined_entries_count == 1
        assert km.overridden_entries_count == 1
        assert km.deprecated_entries_count == 1

    def test_range_tightening_tracking(self, metrics):
        metrics.record_kb_update("refine", range_tightening=0.2)
        metrics.record_kb_update("refine", range_tightening=0.4)

        km = metrics.compute_knowledge_metrics()
        assert abs(km.avg_range_tightening - 0.3) < 0.01

    def test_confidence_gain_tracking(self, metrics):
        metrics.record_kb_update("refine", confidence_gain=0.1)
        metrics.record_kb_update("refine", confidence_gain=0.3)

        km = metrics.compute_knowledge_metrics()
        assert abs(km.avg_confidence_gain - 0.2) < 0.01

    def test_knowledge_metrics_to_dict(self, metrics):
        metrics.record_kb_update("new")
        km = metrics.compute_knowledge_metrics()
        d = km.to_dict()
        assert "new_entries_count" in d
        assert "avg_range_tightening" in d


# ===========================================================================
# Anomaly detection
# ===========================================================================

class TestAnomalyDetection:

    def test_accuracy_drop_detected(self, metrics):
        # Build history with good accuracy
        for _ in range(5):
            metrics.record_feedback("OP-A", "confirmed")
        metrics.compute_operator_metrics("OP-A")  # Record baseline

        # Now add many implausible
        for _ in range(10):
            metrics.record_feedback("OP-A", "implausible")
        metrics.compute_operator_metrics("OP-A")  # Record drop

        anomalies = metrics.detect_anomalies()
        accuracy_drops = [a for a in anomalies if a.anomaly_type == "accuracy_drop"]
        assert len(accuracy_drops) >= 1
        assert accuracy_drops[0].operator_id == "OP-A"

    def test_no_anomaly_for_stable_operator(self, metrics):
        for _ in range(5):
            metrics.record_feedback("OP-A", "confirmed")
            metrics.compute_operator_metrics("OP-A")

        anomalies = metrics.detect_anomalies()
        accuracy_drops = [a for a in anomalies if a.anomaly_type == "accuracy_drop"]
        assert len(accuracy_drops) == 0

    def test_conflict_spike_detected(self, metrics):
        # Normal conflict history
        metrics.record_batch(10, 1)
        metrics.record_batch(10, 2)
        metrics.record_batch(10, 1)
        # Spike
        metrics.record_batch(10, 10)

        anomalies = metrics.detect_anomalies()
        spikes = [a for a in anomalies if a.anomaly_type == "conflict_spike"]
        assert len(spikes) >= 1

    def test_volume_anomaly_detected(self, metrics):
        # Normal volume (tight cluster)
        for _ in range(10):
            metrics.record_batch(10, 1)
        # Extreme spike
        metrics.record_batch(500, 1)

        anomalies = metrics.detect_anomalies()
        vol_anomalies = [a for a in anomalies if a.anomaly_type == "volume_anomaly"]
        assert len(vol_anomalies) >= 1

    def test_anomaly_to_dict(self):
        a = Anomaly(
            anomaly_type="accuracy_drop",
            severity="high",
            description="Test anomaly",
            operator_id="OP-A",
        )
        d = a.to_dict()
        assert d["anomaly_type"] == "accuracy_drop"
        assert d["severity"] == "high"


# ===========================================================================
# Dashboard output
# ===========================================================================

class TestDashboard:

    def test_dashboard_json_output(self, metrics):
        metrics.record_feedback("OP-A", "confirmed", weight=0.8,
                               specializations=["milling"],
                               parameter_values={"speed": 300.0})
        metrics.record_feedback("OP-B", "novel", weight=0.5)
        metrics.record_consensus(converged=True)
        metrics.record_conflict(escalated=False)
        metrics.record_kb_update("new")

        dashboard = metrics.generate_dashboard()
        assert isinstance(dashboard, DashboardOutput)
        assert len(dashboard.operator_metrics) == 2
        assert dashboard.system_metrics is not None
        assert dashboard.knowledge_metrics is not None

    def test_dashboard_to_dict(self, metrics):
        metrics.record_feedback("OP-A", "confirmed")
        dashboard = metrics.generate_dashboard()
        d = dashboard.to_dict()
        assert "operator_metrics" in d
        assert "system_metrics" in d
        assert "knowledge_metrics" in d
        assert "anomalies" in d
        assert "generated_at" in d

    def test_dashboard_empty_system(self, metrics):
        dashboard = metrics.generate_dashboard()
        d = dashboard.to_dict()
        assert d["system_metrics"]["total_feedback_count"] == 0
        assert d["operator_metrics"] == []
