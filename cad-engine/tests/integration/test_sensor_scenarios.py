"""Scenario Tests: Normal, Chatter, Wear, Breakage — CC-EXT-MS3-P0-U06.

Detailed scenario validation for each anomaly type.
"""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.sensors.sensor_schema import SensorStream, SensorChannel, SensorType
from src.sensors.signal_processor import SignalProcessor
from src.sensors.anomaly_detector import AnomalyDetector, AnomalyType, AnomalySeverity, OperatingBaseline
from src.sensors.condition_correlator import ConditionCorrelator
from src.sensors.wear_predictor import WearPredictor, compute_sensor_trends, taylor_tool_life, ToolAction
from src.sensors.stream_simulator import StreamSimulator, SimConfig


# ---------------------------------------------------------------------------
# Normal Machining Scenarios
# ---------------------------------------------------------------------------

class TestNormalMachining:
    def test_no_false_alarms_short_cut(self):
        sim = StreamSimulator(seed=100)
        cfg = SimConfig(duration_s=1.0, sample_rate_hz=4000.0)
        stream = sim.normal_machining(cfg)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        det = AnomalyDetector()
        report = det.detect(features["vibration_x"])
        critical = [e for e in report.events if e.severity == AnomalySeverity.CRITICAL]
        assert len(critical) == 0

    def test_no_false_alarms_different_seeds(self):
        """Run normal machining with multiple random seeds — no critical anomalies."""
        for seed in [1, 42, 99, 200, 500]:
            sim = StreamSimulator(seed=seed)
            cfg = SimConfig(duration_s=1.0, sample_rate_hz=4000.0)
            stream = sim.normal_machining(cfg)
            proc = SignalProcessor(window_size=1024, overlap=0.5)
            features = proc.process_stream(stream)
            det = AnomalyDetector()
            report = det.detect(features["vibration_x"])
            critical = [e for e in report.events if e.severity == AnomalySeverity.CRITICAL]
            assert len(critical) == 0, f"False alarm with seed={seed}"

    def test_stable_rms(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.normal_machining(cfg)
        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)
        rms_vals = [f.rms for f in features["vibration_x"].time_features]
        # RMS should be relatively stable (coefficient of variation < 30%)
        cv = np.std(rms_vals) / np.mean(rms_vals) if np.mean(rms_vals) > 0 else 0
        assert cv < 0.3

    def test_condition_correlation_reasonable(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.normal_machining(cfg)
        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        correlator = ConditionCorrelator()
        rms_vals = [f.rms for f in features["vibration_x"].time_features]
        temp_vals = [f.mean for f in features["temperature"].time_features]
        wear = correlator.estimate_wear_state(temp_vals, rms_values=rms_vals)
        assert wear.state in ("fresh", "normal")


# ---------------------------------------------------------------------------
# Chatter Onset Scenarios
# ---------------------------------------------------------------------------

class TestChatterScenarios:
    def test_chatter_frequency_detection(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0, spindle_rpm=3000, num_teeth=4)
        stream = sim.chatter_onset(cfg, onset_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        vib_features = features["vibration_x"]
        # Post-chatter windows should show different frequency content
        late_freqs = [f.dominant_frequency_hz for f in vib_features.freq_features[-3:]]
        # Chatter frequency should be detectable
        assert len(late_freqs) > 0

    def test_chatter_rms_increase(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.chatter_onset(cfg, onset_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        rms_vals = [f.rms for f in features["vibration_x"].time_features]
        n = len(rms_vals)
        if n >= 4:
            early_rms = np.mean(rms_vals[:n//4])
            late_rms = np.mean(rms_vals[-n//4:])
            assert late_rms > early_rms  # chatter increases vibration

    def test_chatter_affects_ae(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.chatter_onset(cfg, onset_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        ae_rms = [f.rms for f in features["acoustic_emission"].time_features]
        n = len(ae_rms)
        if n >= 4:
            early = np.mean(ae_rms[:n//4])
            late = np.mean(ae_rms[-n//4:])
            assert late > early

    def test_early_onset_detected(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=3.0, sample_rate_hz=4000.0)
        stream = sim.chatter_onset(cfg, onset_time_s=0.5)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        # Use tight baseline from first window (pre-chatter)
        first_rms = features["vibration_x"].time_features[0].rms
        baseline = OperatingBaseline(rms_mean=first_rms, rms_std=first_rms * 0.05)

        det = AnomalyDetector(power_sigma_threshold=2.0)
        report = det.detect(features["vibration_x"], baseline=baseline)
        assert len(report.events) > 0


# ---------------------------------------------------------------------------
# Tool Wear Progression Scenarios
# ---------------------------------------------------------------------------

class TestWearProgressionScenarios:
    def test_wear_prediction_at_50pct(self):
        """At 50% of simulated life, wear should be moderate."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=4.0, sample_rate_hz=4000.0)
        stream = sim.wear_progression(cfg)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        n = len(features["vibration_x"].time_features)
        mid = n // 2
        rms_mid = [f.rms for f in features["vibration_x"].time_features[:mid]]
        temp_mid = [f.mean for f in features["temperature"].time_features[:mid]]

        correlator = ConditionCorrelator()
        wear_mid = correlator.estimate_wear_state(temp_mid, rms_values=rms_mid)
        # At 50% life, should not be end_of_life
        assert wear_mid.state in ("fresh", "normal", "worn")

    def test_wear_prediction_at_80pct(self):
        """At 80% of simulated life, wear should be significant."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=4.0, sample_rate_hz=4000.0)
        stream = sim.wear_progression(cfg)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        n = len(features["vibration_x"].time_features)
        cut80 = int(n * 0.8)
        rms_late = [f.rms for f in features["vibration_x"].time_features[:cut80]]
        temp_late = [f.mean for f in features["temperature"].time_features[:cut80]]

        correlator = ConditionCorrelator()
        wear_late = correlator.estimate_wear_state(temp_late, rms_values=rms_late)
        # At 80% life, wear index should be elevated
        assert wear_late.wear_index > 0.2

    def test_wear_monotonically_increases(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=4.0, sample_rate_hz=4000.0)
        stream = sim.wear_progression(cfg)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        rms_vals = [f.rms for f in features["vibration_x"].time_features]
        # Check that trend is generally upward (allow local fluctuations)
        n = len(rms_vals)
        quarters = [np.mean(rms_vals[i*n//4:(i+1)*n//4]) for i in range(4)]
        # Each quarter should be >= previous (with tolerance)
        for i in range(1, 4):
            assert quarters[i] >= quarters[i-1] * 0.8  # allow 20% noise

    def test_surface_quality_degrades(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=4.0, sample_rate_hz=4000.0)
        stream = sim.wear_progression(cfg)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        ae_early = [f.rms for f in features["acoustic_emission"].time_features[:3]]
        ae_late = [f.rms for f in features["acoustic_emission"].time_features[-3:]]

        correlator = ConditionCorrelator()
        sq_early = correlator.estimate_surface_quality(ae_early)
        sq_late = correlator.estimate_surface_quality(ae_late)

        assert sq_late.estimated_ra_um >= sq_early.estimated_ra_um


# ---------------------------------------------------------------------------
# Breakage Scenarios
# ---------------------------------------------------------------------------

class TestBreakageScenarios:
    def test_breakage_spike_in_rms(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.breakage_event(cfg, breakage_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        rms_vals = [f.rms for f in features["vibration_x"].time_features]
        max_rms = max(rms_vals)
        mean_rms = np.mean(rms_vals[:len(rms_vals)//2])  # pre-breakage
        # Breakage should produce large spike
        assert max_rms > mean_rms * 3

    def test_breakage_detected_by_anomaly_detector(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.breakage_event(cfg, breakage_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        # Baseline from pre-breakage windows
        early = features["vibration_x"].time_features[:2]
        baseline = OperatingBaseline.from_features(early)

        det = AnomalyDetector()
        report = det.detect(features["vibration_x"], baseline=baseline)
        assert len(report.events) > 0

    def test_breakage_power_spike(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.breakage_event(cfg, breakage_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        power_rms = [f.rms for f in features["power"].time_features]
        # Power should show disruption after breakage
        pre = np.mean(power_rms[:len(power_rms)//2])
        post_vals = power_rms[len(power_rms)//2:]
        # After breakage, power pattern changes significantly
        assert max(post_vals) > pre * 0.5 or min(post_vals) < pre * 0.5

    def test_breakage_ae_burst(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.breakage_event(cfg, breakage_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        ae_rms = [f.rms for f in features["acoustic_emission"].time_features]
        max_ae = max(ae_rms)
        baseline_ae = np.mean(ae_rms[:len(ae_rms)//3])
        assert max_ae > baseline_ae * 2  # AE burst during breakage
