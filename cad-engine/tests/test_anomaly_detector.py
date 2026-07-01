"""Tests for Anomaly Detection — CC-EXT-MS3-P0-U03."""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.sensors.sensor_schema import SensorChannel, SensorType
from src.sensors.signal_processor import (
    SignalProcessor,
    SignalFeatureSet,
    TimeDomainFeatures,
    FrequencyDomainFeatures,
    extract_time_features,
    extract_freq_features,
)
from src.sensors.anomaly_detector import (
    AnomalyType,
    AnomalySeverity,
    AnomalyEvent,
    AnomalyReport,
    OperatingBaseline,
    AnomalyDetector,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_sine(freq_hz: float, duration_s: float, sr: float, amp: float = 1.0):
    t = np.arange(0, duration_s, 1.0 / sr)
    return amp * np.sin(2 * np.pi * freq_hz * t), t


def _make_normal_features(n: int = 10, rms: float = 1.0, kurtosis: float = 3.0) -> list[TimeDomainFeatures]:
    return [
        TimeDomainFeatures(rms=rms + np.random.uniform(-0.05, 0.05),
                           kurtosis=kurtosis + np.random.uniform(-0.5, 0.5),
                           timestamp=float(i))
        for i in range(n)
    ]


def _make_normal_freq_features(n: int = 10) -> list[FrequencyDomainFeatures]:
    return [
        FrequencyDomainFeatures(
            dominant_frequency_hz=100.0,
            dominant_magnitude=0.5,
            harmonic_ratio=0.1,
            timestamp=float(i),
        )
        for i in range(n)
    ]


def _make_feature_set(
    time_feats: list[TimeDomainFeatures] | None = None,
    freq_feats: list[FrequencyDomainFeatures] | None = None,
    channel: str = "test",
) -> SignalFeatureSet:
    tf = time_feats or _make_normal_features()
    ff = freq_feats or _make_normal_freq_features(len(tf))
    return SignalFeatureSet(
        channel_name=channel,
        sensor_type="vibration_x",
        sample_rate_hz=1000.0,
        time_features=tf,
        freq_features=ff,
        num_windows=len(tf),
    )


# ---------------------------------------------------------------------------
# AnomalyEvent / AnomalyReport
# ---------------------------------------------------------------------------

class TestAnomalyEvent:
    def test_to_dict(self):
        e = AnomalyEvent(
            anomaly_type=AnomalyType.CHATTER,
            severity=AnomalySeverity.WARNING,
            timestamp=1.5,
            channel="vib",
            message="chatter",
            value=3.0,
            threshold=2.0,
            confidence=0.85,
        )
        d = e.to_dict()
        assert d["type"] == "chatter"
        assert d["severity"] == "warning"
        assert d["timestamp"] == 1.5
        assert d["confidence"] == 0.85

    def test_enum_values(self):
        assert AnomalyType.CHATTER.value == "chatter"
        assert AnomalyType.TOOL_BREAKAGE.value == "tool_breakage"
        assert AnomalyType.THERMAL.value == "thermal"
        assert AnomalyType.POWER.value == "power"
        assert AnomalyType.DRIFT.value == "drift"
        assert AnomalySeverity.INFO.value == "info"
        assert AnomalySeverity.WARNING.value == "warning"
        assert AnomalySeverity.CRITICAL.value == "critical"


class TestAnomalyReport:
    def test_empty_report(self):
        r = AnomalyReport()
        assert r.false_positive_rate == 0.0
        d = r.to_dict()
        assert d["total_events"] == 0

    def test_report_with_events(self):
        events = [
            AnomalyEvent(AnomalyType.CHATTER, AnomalySeverity.WARNING),
            AnomalyEvent(AnomalyType.CHATTER, AnomalySeverity.CRITICAL),
            AnomalyEvent(AnomalyType.POWER, AnomalySeverity.WARNING),
        ]
        r = AnomalyReport(events=events, total_windows=10, anomaly_windows=3)
        assert r.false_positive_rate == 0.3
        d = r.to_dict()
        assert d["total_events"] == 3
        assert d["by_type"]["chatter"] == 2
        assert d["by_type"]["power"] == 1
        assert d["by_severity"]["warning"] == 2
        assert d["by_severity"]["critical"] == 1


# ---------------------------------------------------------------------------
# OperatingBaseline
# ---------------------------------------------------------------------------

class TestOperatingBaseline:
    def test_defaults(self):
        b = OperatingBaseline()
        assert b.rms_mean == 0.0
        assert b.rms_std == 1.0
        assert b.sample_count == 0

    def test_from_features_empty(self):
        b = OperatingBaseline.from_features([])
        assert b.sample_count == 0

    def test_from_features(self):
        feats = _make_normal_features(20, rms=2.0, kurtosis=3.5)
        b = OperatingBaseline.from_features(feats)
        assert abs(b.rms_mean - 2.0) < 0.1
        assert b.sample_count == 20
        assert b.rms_std > 0

    def test_from_single_feature(self):
        feats = [TimeDomainFeatures(rms=1.0, kurtosis=3.0)]
        b = OperatingBaseline.from_features(feats)
        assert b.rms_mean == 1.0
        assert b.rms_std == 1.0  # default for single sample
        assert b.sample_count == 1


# ---------------------------------------------------------------------------
# Chatter Detection
# ---------------------------------------------------------------------------

class TestChatterDetection:
    def test_no_chatter_low_magnitude(self):
        det = AnomalyDetector()
        ff = FrequencyDomainFeatures(
            dominant_magnitude=1.0,  # below threshold=2.0
            harmonic_ratio=0.6,
        )
        baseline = OperatingBaseline()
        result = det._detect_chatter(ff, baseline, "vib")
        assert result is None

    def test_no_chatter_low_harmonic_ratio(self):
        det = AnomalyDetector()
        ff = FrequencyDomainFeatures(
            dominant_magnitude=5.0,
            harmonic_ratio=0.3,  # below 0.5
        )
        baseline = OperatingBaseline()
        result = det._detect_chatter(ff, baseline, "vib")
        assert result is None

    def test_chatter_detected(self):
        det = AnomalyDetector()
        ff = FrequencyDomainFeatures(
            dominant_frequency_hz=500.0,
            dominant_magnitude=5.0,
            harmonic_ratio=0.7,
            timestamp=1.0,
        )
        baseline = OperatingBaseline()
        result = det._detect_chatter(ff, baseline, "vib")
        assert result is not None
        assert result.anomaly_type == AnomalyType.CHATTER
        assert result.severity == AnomalySeverity.WARNING
        assert "500.0" in result.message

    def test_chatter_zero_magnitude(self):
        det = AnomalyDetector()
        ff = FrequencyDomainFeatures(dominant_magnitude=0.0, harmonic_ratio=0.9)
        result = det._detect_chatter(ff, OperatingBaseline(), "vib")
        assert result is None

    def test_chatter_custom_threshold(self):
        det = AnomalyDetector(chatter_freq_threshold=10.0)
        ff = FrequencyDomainFeatures(dominant_magnitude=5.0, harmonic_ratio=0.8)
        result = det._detect_chatter(ff, OperatingBaseline(), "vib")
        assert result is None  # 5.0 < 10.0


# ---------------------------------------------------------------------------
# Tool Breakage Detection
# ---------------------------------------------------------------------------

class TestBreakageDetection:
    def test_no_breakage_normal(self):
        det = AnomalyDetector()
        tf = TimeDomainFeatures(rms=1.0, kurtosis=3.0)
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        result = det._detect_breakage(tf, baseline, "vib")
        assert result is None

    def test_breakage_high_rms_high_kurtosis(self):
        det = AnomalyDetector()
        tf = TimeDomainFeatures(rms=10.0, kurtosis=25.0, timestamp=2.0)
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        result = det._detect_breakage(tf, baseline, "vib")
        assert result is not None
        assert result.anomaly_type == AnomalyType.TOOL_BREAKAGE
        assert result.severity == AnomalySeverity.CRITICAL

    def test_breakage_high_rms_low_kurtosis(self):
        det = AnomalyDetector()
        tf = TimeDomainFeatures(rms=10.0, kurtosis=5.0)  # kurtosis < 20
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        result = det._detect_breakage(tf, baseline, "vib")
        assert result is None

    def test_breakage_low_rms_high_kurtosis(self):
        det = AnomalyDetector()
        tf = TimeDomainFeatures(rms=1.0, kurtosis=30.0)  # rms within baseline
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        result = det._detect_breakage(tf, baseline, "vib")
        assert result is None

    def test_breakage_zero_baseline_std(self):
        det = AnomalyDetector()
        tf = TimeDomainFeatures(rms=5.0, kurtosis=25.0)
        baseline = OperatingBaseline(rms_mean=0.5, rms_std=0.0)
        result = det._detect_breakage(tf, baseline, "vib")
        assert result is not None  # uses max(rms_std, 0.001)


# ---------------------------------------------------------------------------
# Power Anomaly Detection
# ---------------------------------------------------------------------------

class TestPowerAnomaly:
    def test_no_power_anomaly(self):
        det = AnomalyDetector()
        tf = TimeDomainFeatures(rms=1.05)
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        result = det._detect_power_anomaly(tf, baseline, "power")
        assert result is None  # 0.5 sigma

    def test_power_anomaly_warning(self):
        det = AnomalyDetector(power_sigma_threshold=2.0)
        tf = TimeDomainFeatures(rms=1.5, timestamp=3.0)
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        # deviation = 5.0 sigma -> warning (< 4.0 = 2x threshold)
        result = det._detect_power_anomaly(tf, baseline, "power")
        assert result is not None
        assert result.anomaly_type == AnomalyType.POWER

    def test_power_anomaly_critical(self):
        det = AnomalyDetector(power_sigma_threshold=2.0)
        tf = TimeDomainFeatures(rms=2.0)
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        # deviation = 10.0 sigma -> critical (> 4.0 = 2x threshold)
        result = det._detect_power_anomaly(tf, baseline, "power")
        assert result is not None
        assert result.severity == AnomalySeverity.CRITICAL

    def test_power_anomaly_zero_std(self):
        det = AnomalyDetector()
        tf = TimeDomainFeatures(rms=1.5)
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.0)
        result = det._detect_power_anomaly(tf, baseline, "power")
        assert result is None  # early return when rms_std == 0


# ---------------------------------------------------------------------------
# Thermal Anomaly Detection
# ---------------------------------------------------------------------------

class TestThermalAnomaly:
    def test_no_thermal_anomaly(self):
        det = AnomalyDetector(temp_max=300.0)
        events = det.detect_thermal([100.0, 150.0, 200.0], [0.0, 1.0, 2.0])
        assert len(events) == 0

    def test_thermal_warning(self):
        det = AnomalyDetector(temp_max=300.0)
        events = det.detect_thermal([100.0, 320.0, 200.0], [0.0, 1.0, 2.0])
        assert len(events) == 1
        assert events[0].severity == AnomalySeverity.WARNING
        assert events[0].anomaly_type == AnomalyType.THERMAL

    def test_thermal_critical(self):
        det = AnomalyDetector(temp_max=300.0)
        # > 300 * 1.2 = 360 → critical
        events = det.detect_thermal([400.0], [0.0])
        assert len(events) == 1
        assert events[0].severity == AnomalySeverity.CRITICAL

    def test_thermal_custom_limit(self):
        det = AnomalyDetector()
        events = det.detect_thermal([250.0], [0.0], material_temp_limit=200.0)
        assert len(events) == 1
        assert events[0].value == 250.0
        assert events[0].threshold == 200.0

    def test_thermal_empty(self):
        det = AnomalyDetector()
        events = det.detect_thermal([], [])
        assert len(events) == 0


# ---------------------------------------------------------------------------
# CUSUM Drift Detection
# ---------------------------------------------------------------------------

class TestDriftDetection:
    def test_no_drift_stable(self):
        det = AnomalyDetector(cusum_threshold=5.0)
        values = [1.0] * 20
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        timestamps = [float(i) for i in range(20)]
        events = det._detect_drift_cusum(values, baseline, "vib", timestamps)
        assert len(events) == 0

    def test_drift_positive_shift(self):
        det = AnomalyDetector(cusum_threshold=3.0)
        # Sudden upward shift
        values = [1.0] * 10 + [3.0] * 10
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        timestamps = [float(i) for i in range(20)]
        events = det._detect_drift_cusum(values, baseline, "vib", timestamps)
        assert len(events) > 0
        assert events[0].anomaly_type == AnomalyType.DRIFT
        assert "positive" in events[0].message

    def test_drift_negative_shift(self):
        det = AnomalyDetector(cusum_threshold=3.0)
        # Sudden downward shift
        values = [5.0] * 10 + [1.0] * 10
        baseline = OperatingBaseline(rms_mean=5.0, rms_std=0.1)
        timestamps = [float(i) for i in range(20)]
        events = det._detect_drift_cusum(values, baseline, "vib", timestamps)
        assert len(events) > 0
        assert "negative" in events[0].message

    def test_drift_too_few_values(self):
        det = AnomalyDetector()
        events = det._detect_drift_cusum([1.0, 2.0], OperatingBaseline(), "v", [0, 1])
        assert len(events) == 0

    def test_drift_resets_after_detection(self):
        det = AnomalyDetector(cusum_threshold=2.0)
        # Two distinct shifts
        values = [1.0] * 5 + [5.0] * 5 + [1.0] * 5 + [5.0] * 5
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.1)
        timestamps = [float(i) for i in range(20)]
        events = det._detect_drift_cusum(values, baseline, "vib", timestamps)
        assert len(events) >= 2  # should detect at least 2 drift events


# ---------------------------------------------------------------------------
# Full detect() Pipeline
# ---------------------------------------------------------------------------

class TestDetectPipeline:
    def test_detect_normal_signal(self):
        np.random.seed(42)
        fs = _make_feature_set()
        det = AnomalyDetector()
        report = det.detect(fs)
        assert report.total_windows == fs.num_windows

    def test_detect_with_chatter(self):
        freq_feats = _make_normal_freq_features(10)
        freq_feats[5] = FrequencyDomainFeatures(
            dominant_frequency_hz=500.0,
            dominant_magnitude=5.0,
            harmonic_ratio=0.8,
            timestamp=5.0,
        )
        fs = _make_feature_set(freq_feats=freq_feats)
        det = AnomalyDetector()
        report = det.detect(fs)
        chatter_events = [e for e in report.events if e.anomaly_type == AnomalyType.CHATTER]
        assert len(chatter_events) >= 1

    def test_detect_with_breakage(self):
        np.random.seed(42)
        time_feats = _make_normal_features(10, rms=1.0, kurtosis=3.0)
        # Inject breakage signal
        time_feats[7] = TimeDomainFeatures(rms=50.0, kurtosis=25.0, timestamp=7.0)
        fs = _make_feature_set(time_feats=time_feats)
        det = AnomalyDetector()
        # Provide explicit baseline so auto-learn doesn't inflate mean/std
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.05)
        report = det.detect(fs, baseline=baseline)
        breakage_events = [e for e in report.events if e.anomaly_type == AnomalyType.TOOL_BREAKAGE]
        assert len(breakage_events) >= 1

    def test_detect_auto_baseline(self):
        """When no baseline provided, auto-learns from features."""
        np.random.seed(42)
        fs = _make_feature_set()
        det = AnomalyDetector()
        report = det.detect(fs, baseline=None)
        assert report.total_windows > 0

    def test_detect_provided_baseline(self):
        np.random.seed(42)
        fs = _make_feature_set()
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.05)
        det = AnomalyDetector()
        report = det.detect(fs, baseline=baseline)
        assert report.total_windows == fs.num_windows

    def test_anomaly_windows_count(self):
        np.random.seed(42)
        time_feats = _make_normal_features(10, rms=1.0)
        # Inject anomaly in windows 3 and 7
        time_feats[3] = TimeDomainFeatures(rms=50.0, kurtosis=25.0, timestamp=3.0)
        time_feats[7] = TimeDomainFeatures(rms=50.0, kurtosis=25.0, timestamp=7.0)
        fs = _make_feature_set(time_feats=time_feats)
        det = AnomalyDetector()
        # Provide explicit baseline so auto-learn doesn't absorb anomalous points
        baseline = OperatingBaseline(rms_mean=1.0, rms_std=0.05)
        report = det.detect(fs, baseline=baseline)
        # At least the breakage windows should be counted
        assert report.anomaly_windows >= 2


# ---------------------------------------------------------------------------
# Integration with SignalProcessor
# ---------------------------------------------------------------------------

class TestAnomalyWithProcessor:
    def test_process_and_detect_clean_signal(self):
        data, t = _make_sine(100.0, 2.0, 1000.0, 1.0)
        ch = SensorChannel(SensorType.VIBRATION_X, "g", 1000.0, data, t)
        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_channel(ch, "vib_x")
        det = AnomalyDetector()
        report = det.detect(features)
        # Clean sine should have few or no anomalies
        critical = [e for e in report.events if e.severity == AnomalySeverity.CRITICAL]
        assert len(critical) == 0

    def test_process_and_detect_impulsive_signal(self):
        data = np.zeros(4096)
        data[2048] = 100.0  # large spike
        t = np.linspace(0, 4.096, 4096)
        ch = SensorChannel(SensorType.VIBRATION_X, "g", 1000.0, data, t)
        proc = SignalProcessor(window_size=1024, overlap=0.5)
        features = proc.process_channel(ch, "vib_x")
        det = AnomalyDetector()
        # Provide baseline from clean signal so spike window stands out
        clean_baseline = OperatingBaseline(rms_mean=0.0, rms_std=0.001)
        report = det.detect(features, baseline=clean_baseline)
        # Spike should trigger anomaly (power deviation or drift)
        assert len(report.events) > 0
