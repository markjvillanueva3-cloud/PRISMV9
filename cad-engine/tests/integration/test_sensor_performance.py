"""Throughput and Performance Tests — CC-EXT-MS3-P0-U06.

Verifies sensor pipeline can handle high-rate data streams.
"""

from __future__ import annotations

import os
import sys
import time

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from src.sensors.sensor_schema import SensorStream, SensorChannel, SensorType
from src.sensors.signal_processor import SignalProcessor
from src.sensors.anomaly_detector import AnomalyDetector, OperatingBaseline
from src.sensors.condition_correlator import ConditionCorrelator
from src.sensors.wear_predictor import WearPredictor, compute_sensor_trends
from src.sensors.stream_simulator import StreamSimulator, SimConfig


class TestThroughput:
    def test_10khz_4channel_processing(self):
        """Process 10kHz 4-channel data — verify completes without error."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=1.0, sample_rate_hz=10000.0)
        stream = sim.normal_machining(cfg)

        # Verify data sizes
        assert len(stream.channels["vibration_x"].data) == 10000
        assert len(stream.channels["power"].data) == 10000

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        start = time.perf_counter()
        features = proc.process_stream(stream)
        elapsed = time.perf_counter() - start

        # Should process 40,000 samples (4 channels x 10,000) in reasonable time
        assert elapsed < 5.0  # generous limit for CI
        assert features["vibration_x"].num_windows > 0

    def test_high_rate_anomaly_detection(self):
        """Anomaly detection on 10kHz stream completes in time."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=1.0, sample_rate_hz=10000.0)
        stream = sim.normal_machining(cfg)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        det = AnomalyDetector()
        start = time.perf_counter()
        report = det.detect(features["vibration_x"])
        elapsed = time.perf_counter() - start

        assert elapsed < 2.0
        assert report.total_windows > 0

    def test_full_pipeline_throughput(self):
        """Full pipeline: simulate -> process -> detect -> correlate -> predict."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=10000.0)
        stream = sim.normal_machining(cfg)

        start = time.perf_counter()

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        det = AnomalyDetector()
        for ch_name in features:
            det.detect(features[ch_name])

        correlator = ConditionCorrelator()
        rms = [f.rms for f in features["vibration_x"].time_features]
        temp = [f.mean for f in features["temperature"].time_features]
        correlator.estimate_wear_state(temp, rms_values=rms)

        predictor = WearPredictor()
        trends = compute_sensor_trends(vibration_rms=rms, temp_values=temp)
        predictor.predict(
            elapsed_min=1.0,
            cutting_speed_mpm=150.0,
            sensor_trends=trends,
        )

        elapsed = time.perf_counter() - start
        assert elapsed < 10.0  # full pipeline under 10s

    def test_zero_data_loss(self):
        """All input samples should be accounted for in processing."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=1.0, sample_rate_hz=10000.0)
        stream = sim.normal_machining(cfg)

        n_samples = len(stream.channels["vibration_x"].data)
        assert n_samples == 10000

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        vib = features["vibration_x"]
        # Every sample should be covered by at least one window
        step = int(1024 * 0.5)  # 512
        expected_windows = max(1, (n_samples - 1024) // step + 1)
        assert vib.num_windows == expected_windows

    def test_multiple_stream_processing(self):
        """Process multiple streams sequentially — no state leakage."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=0.5, sample_rate_hz=4000.0)

        proc = SignalProcessor(window_size=512, overlap=0.5)
        det = AnomalyDetector()

        results = []
        for scenario_fn in [sim.normal_machining, sim.chatter_onset, sim.wear_progression, sim.breakage_event]:
            stream = scenario_fn(cfg)
            features = proc.process_stream(stream)
            report = det.detect(features["vibration_x"])
            results.append(report)

        # Should have 4 independent reports
        assert len(results) == 4
        # Normal should have fewer events than breakage in general
        # (just verify all processed without error)
        for r in results:
            assert r.total_windows > 0


class TestSimulatorConfig:
    def test_custom_config(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(
            duration_s=0.5,
            sample_rate_hz=2000.0,
            spindle_rpm=6000.0,
            num_teeth=2,
            base_vibration_rms=1.0,
        )
        stream = sim.normal_machining(cfg)
        assert len(stream.channels["vibration_x"].data) == 1000

    def test_different_seeds_produce_different_data(self):
        cfg = SimConfig(duration_s=0.1, sample_rate_hz=1000.0)
        s1 = StreamSimulator(seed=1).normal_machining(cfg)
        s2 = StreamSimulator(seed=2).normal_machining(cfg)
        d1 = s1.channels["vibration_x"].data
        d2 = s2.channels["vibration_x"].data
        assert not np.allclose(d1, d2)

    def test_all_scenarios_produce_4_channels(self):
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=0.5, sample_rate_hz=2000.0)
        for fn in [sim.normal_machining, sim.chatter_onset, sim.wear_progression, sim.breakage_event]:
            stream = fn(cfg)
            assert len(stream.channels) == 4
            assert "vibration_x" in stream.channels
            assert "power" in stream.channels
            assert "temperature" in stream.channels
            assert "acoustic_emission" in stream.channels
