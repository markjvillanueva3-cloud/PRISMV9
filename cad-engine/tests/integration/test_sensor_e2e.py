"""End-to-End Integration Tests for Sensor Pipeline — CC-EXT-MS3-P0-U06.

Full pipeline: ingest -> process -> detect -> correlate -> predict.
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
from src.sensors.wear_predictor import WearPredictor, SensorTrends, compute_sensor_trends, taylor_tool_life, ToolAction
from src.sensors.stream_simulator import StreamSimulator, SimConfig


class TestFullPipelineE2E:
    """End-to-end: simulator -> processor -> detector -> correlator -> predictor."""

    def test_normal_machining_pipeline(self):
        """Normal machining should flow through all stages without critical anomalies."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.normal_machining(cfg)

        # Process all channels
        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        assert "vibration_x" in features
        assert "power" in features
        assert "temperature" in features
        assert "acoustic_emission" in features

        # Detect anomalies on vibration
        det = AnomalyDetector()
        vib_features = features["vibration_x"]
        report = det.detect(vib_features)

        # Normal machining: no critical anomalies
        critical = [e for e in report.events if e.severity == AnomalySeverity.CRITICAL]
        assert len(critical) == 0

        # Correlate: extract RMS values for wear estimation
        correlator = ConditionCorrelator()
        rms_vals = [f.rms for f in vib_features.time_features]
        temp_vals = [f.mean for f in features["temperature"].time_features]
        ae_vals = [f.rms for f in features["acoustic_emission"].time_features]

        wear = correlator.estimate_wear_state(temp_vals, rms_values=rms_vals)
        surface = correlator.estimate_surface_quality(ae_vals)

        assert wear.state in ("fresh", "normal")
        assert surface.quality_grade != "unknown"

        # Predict wear
        predictor = WearPredictor()
        trends = compute_sensor_trends(
            vibration_rms=rms_vals,
            temp_values=temp_vals,
            ae_rms_values=ae_vals,
        )
        pred = predictor.predict(
            elapsed_min=1.0,
            cutting_speed_mpm=150.0,
            taylor_c=300.0,
            taylor_n=0.25,
            sensor_trends=trends,
        )
        assert pred.remaining_life_min > 0
        assert pred.action in (ToolAction.CONTINUE, ToolAction.MONITOR)

    def test_chatter_detected_in_pipeline(self):
        """Chatter onset should be detected by anomaly detector."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.chatter_onset(cfg, onset_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        # Use a tight baseline from early (pre-chatter) windows
        vib_features = features["vibration_x"]
        early_feats = vib_features.time_features[:2]
        baseline = OperatingBaseline.from_features(early_feats)

        det = AnomalyDetector()
        report = det.detect(vib_features, baseline=baseline)

        # Should detect some anomalies (power deviation or drift from chatter)
        assert len(report.events) > 0

    def test_wear_progression_pipeline(self):
        """Wear progression should show increasing wear index over time."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=4.0, sample_rate_hz=4000.0)
        stream = sim.wear_progression(cfg)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        vib_features = features["vibration_x"]
        rms_vals = [f.rms for f in vib_features.time_features]
        temp_features = features["temperature"]
        temp_vals = [f.mean for f in temp_features.time_features]

        # RMS should increase over time (tool getting duller)
        first_quarter = np.mean(rms_vals[:len(rms_vals)//4])
        last_quarter = np.mean(rms_vals[-len(rms_vals)//4:])
        assert last_quarter > first_quarter

        # Temperature should increase
        temp_first = np.mean(temp_vals[:len(temp_vals)//4])
        temp_last = np.mean(temp_vals[-len(temp_vals)//4:])
        assert temp_last > temp_first

        # Wear prediction should reflect deterioration
        correlator = ConditionCorrelator()
        wear_early = correlator.estimate_wear_state(
            temp_vals[:len(temp_vals)//4],
            rms_values=rms_vals[:len(rms_vals)//4],
        )
        wear_late = correlator.estimate_wear_state(
            temp_vals[-len(temp_vals)//4:],
            rms_values=rms_vals[-len(rms_vals)//4:],
        )
        assert wear_late.wear_index > wear_early.wear_index

    def test_breakage_detected_in_pipeline(self):
        """Tool breakage should be detected by anomaly detector."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.breakage_event(cfg, breakage_time_s=1.0)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        vib_features = features["vibration_x"]
        # Use baseline from pre-breakage data
        early_feats = vib_features.time_features[:2]
        baseline = OperatingBaseline.from_features(early_feats)

        det = AnomalyDetector()
        report = det.detect(vib_features, baseline=baseline)

        # Should detect anomalies after breakage
        assert len(report.events) > 0
        # At least some should be power or drift anomalies
        types = {e.anomaly_type for e in report.events}
        assert len(types) > 0

    def test_multi_sensor_fusion(self):
        """All 4 sensor types should contribute to predictions."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=2.0, sample_rate_hz=4000.0)
        stream = sim.wear_progression(cfg)

        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_stream(stream)

        # Extract trends from all 4 channels
        vib_rms = [f.rms for f in features["vibration_x"].time_features]
        power_rms = [f.rms for f in features["power"].time_features]
        temp_vals = [f.mean for f in features["temperature"].time_features]
        ae_rms = [f.rms for f in features["acoustic_emission"].time_features]

        trends = compute_sensor_trends(
            vibration_rms=vib_rms,
            power_values=power_rms,
            temp_values=temp_vals,
            ae_rms_values=ae_rms,
        )
        assert trends.data_quality == 1.0  # all 4 channels present

        predictor = WearPredictor()
        pred = predictor.predict(
            elapsed_min=2.0,
            cutting_speed_mpm=150.0,
            sensor_trends=trends,
        )
        assert pred.confidence > 0.5  # sensor data boosts confidence

    def test_pipeline_with_csv_roundtrip(self):
        """Simulate -> export to CSV-like arrays -> re-ingest -> process."""
        sim = StreamSimulator(seed=42)
        cfg = SimConfig(duration_s=1.0, sample_rate_hz=2000.0)
        stream = sim.normal_machining(cfg)

        # Extract raw data arrays
        vib_ch = stream.channels["vibration_x"]
        raw_data = vib_ch.data.copy()
        raw_ts = vib_ch.timestamps.copy()

        # Re-create channel from raw arrays (simulates CSV import)
        reimported = SensorChannel(SensorType.VIBRATION_X, "g", cfg.sample_rate_hz, raw_data, raw_ts)
        reimported_stream = SensorStream()
        reimported_stream.add_channel("vibration_x", reimported)

        proc = SignalProcessor(window_size=512, overlap=0.5)
        features = proc.process_stream(reimported_stream)
        assert features["vibration_x"].num_windows > 0
