"""Tests for Signal Processing Pipeline — CC-EXT-MS3-P0-U02."""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.sensors.sensor_schema import SensorChannel, SensorStream, SensorType
from src.sensors.signal_processor import (
    SignalProcessor,
    compute_rms,
    compute_peak,
    compute_crest_factor,
    compute_kurtosis,
    compute_skewness,
    compute_zero_crossing_rate,
    extract_time_features,
    compute_fft,
    compute_psd_welch,
    extract_freq_features,
)


def _make_sine(freq_hz: float, duration_s: float, sample_rate: float, amplitude: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """Generate a sine wave."""
    t = np.arange(0, duration_s, 1.0 / sample_rate)
    data = amplitude * np.sin(2 * np.pi * freq_hz * t)
    return data, t


def _make_channel(freq_hz: float = 100.0, duration_s: float = 1.0,
                  sample_rate: float = 1000.0, amplitude: float = 1.0) -> SensorChannel:
    data, t = _make_sine(freq_hz, duration_s, sample_rate, amplitude)
    return SensorChannel(SensorType.VIBRATION_X, "g", sample_rate, data, t)


# ---------------------------------------------------------------------------
# Time-Domain Features
# ---------------------------------------------------------------------------

class TestTimeDomainFeatures:
    def test_rms_sine(self):
        data, _ = _make_sine(100.0, 1.0, 1000.0, 1.0)
        rms = compute_rms(data)
        assert abs(rms - 1.0 / np.sqrt(2)) < 0.01

    def test_peak_sine(self):
        data, _ = _make_sine(100.0, 1.0, 1000.0, 2.0)
        assert abs(compute_peak(data) - 2.0) < 0.15

    def test_crest_factor_sine(self):
        data, _ = _make_sine(100.0, 1.0, 1000.0)
        cf = compute_crest_factor(data)
        assert abs(cf - np.sqrt(2)) < 0.1

    def test_kurtosis_gaussian(self):
        np.random.seed(42)
        data = np.random.randn(10000)
        kurt = compute_kurtosis(data)
        assert abs(kurt) < 0.2  # excess kurtosis ~0 for normal

    def test_kurtosis_impulsive(self):
        data = np.zeros(1000)
        data[500] = 100.0  # spike
        kurt = compute_kurtosis(data)
        assert kurt > 50  # highly leptokurtic

    def test_skewness_symmetric(self):
        data, _ = _make_sine(100.0, 1.0, 1000.0)
        skew = compute_skewness(data)
        assert abs(skew) < 0.1

    def test_zero_crossing_rate_sine(self):
        data, _ = _make_sine(100.0, 1.0, 1000.0)
        zcr = compute_zero_crossing_rate(data)
        # 100 Hz sine has ~200 zero crossings per second, rate ~ 0.2
        assert 0.15 < zcr < 0.25

    def test_rms_empty(self):
        assert compute_rms(np.array([])) == 0.0

    def test_extract_time_features(self):
        data, _ = _make_sine(100.0, 0.1, 1000.0)
        features = extract_time_features(data, timestamp=0.5)
        assert features.rms > 0
        assert features.peak > 0
        assert features.timestamp == 0.5
        d = features.to_dict()
        assert "rms" in d


# ---------------------------------------------------------------------------
# Frequency-Domain Features
# ---------------------------------------------------------------------------

class TestFrequencyDomainFeatures:
    def test_fft_detects_frequency(self):
        data, _ = _make_sine(250.0, 1.0, 1000.0)
        freqs, mags = compute_fft(data, 1000.0)
        peak_idx = np.argmax(mags[1:]) + 1
        detected_freq = freqs[peak_idx]
        assert abs(detected_freq - 250.0) < 5.0

    def test_fft_dual_frequency(self):
        data1, t = _make_sine(100.0, 1.0, 1000.0, 1.0)
        data2, _ = _make_sine(300.0, 1.0, 1000.0, 0.5)
        data = data1 + data2
        freqs, mags = compute_fft(data, 1000.0)
        # Should have peaks near both 100 and 300 Hz
        peak_idx = np.argmax(mags[1:]) + 1
        dominant = freqs[peak_idx]
        assert abs(dominant - 100.0) < 5.0 or abs(dominant - 300.0) < 5.0

    def test_psd_welch(self):
        data, _ = _make_sine(200.0, 1.0, 1000.0)
        freqs, psd = compute_psd_welch(data, 1000.0)
        assert len(freqs) > 0
        assert len(psd) > 0

    def test_extract_freq_features(self):
        data, _ = _make_sine(150.0, 1.0, 1000.0)
        features = extract_freq_features(data, 1000.0, timestamp=0.0)
        assert abs(features.dominant_frequency_hz - 150.0) < 5.0
        assert features.total_power > 0
        d = features.to_dict()
        assert "dominant_frequency_hz" in d

    def test_fft_empty(self):
        freqs, mags = compute_fft(np.array([]), 1000.0)
        assert len(freqs) == 0

    def test_freq_features_empty(self):
        features = extract_freq_features(np.array([]), 1000.0)
        assert features.dominant_frequency_hz == 0.0


# ---------------------------------------------------------------------------
# SignalProcessor
# ---------------------------------------------------------------------------

class TestSignalProcessor:
    def test_default_window(self):
        proc = SignalProcessor()
        assert proc.window_size == 1024
        assert proc.overlap == 0.5

    def test_custom_window(self):
        proc = SignalProcessor(window_size=512, overlap=0.75)
        assert proc.window_size == 512
        assert proc.overlap == 0.75

    def test_process_channel(self):
        ch = _make_channel(100.0, 2.0, 1000.0)
        proc = SignalProcessor(window_size=1024, overlap=0.5)
        result = proc.process_channel(ch, "test_vib")
        assert result.channel_name == "test_vib"
        assert result.num_windows > 0
        assert len(result.time_features) == result.num_windows
        assert len(result.freq_features) == result.num_windows

    def test_process_short_channel(self):
        data = np.array([1.0, 2.0, 3.0])
        ts = np.array([0.0, 0.001, 0.002])
        ch = SensorChannel(SensorType.VIBRATION_X, "g", 1000.0, data, ts)
        proc = SignalProcessor(window_size=1024)
        result = proc.process_channel(ch, "short")
        assert result.num_windows == 1

    def test_process_empty_channel(self):
        ch = SensorChannel(SensorType.VIBRATION_X)
        proc = SignalProcessor()
        result = proc.process_channel(ch, "empty")
        assert result.num_windows == 0

    def test_process_stream(self):
        stream = SensorStream()
        stream.add_channel("vib", _make_channel(100.0, 2.0, 1000.0))
        stream.add_channel("power", _make_channel(50.0, 2.0, 1000.0))
        proc = SignalProcessor(window_size=512)
        results = proc.process_stream(stream)
        assert "vib" in results
        assert "power" in results
        assert results["vib"].num_windows > 0

    def test_frequency_detection_accuracy(self):
        ch = _make_channel(200.0, 2.0, 2000.0)
        proc = SignalProcessor(window_size=1024)
        result = proc.process_channel(ch)
        if result.freq_features:
            detected = result.freq_features[0].dominant_frequency_hz
            assert abs(detected - 200.0) < 10.0

    def test_impulsive_signal_kurtosis(self):
        data = np.zeros(2048)
        data[1024] = 50.0  # spike
        ts = np.linspace(0, 2.048, 2048)
        ch = SensorChannel(SensorType.VIBRATION_X, "g", 1000.0, data, ts)
        proc = SignalProcessor(window_size=1024)
        result = proc.process_channel(ch)
        # Window containing spike should have high kurtosis
        kurtosis_values = [f.kurtosis for f in result.time_features]
        assert max(kurtosis_values) > 10

    def test_feature_set_to_dict(self):
        ch = _make_channel(100.0, 1.0, 1000.0)
        proc = SignalProcessor(window_size=512)
        result = proc.process_channel(ch, "test")
        d = result.to_dict()
        assert d["channel_name"] == "test"
        assert d["num_windows"] > 0

    def test_overlap_affects_windows(self):
        ch = _make_channel(100.0, 2.0, 1000.0)
        proc_50 = SignalProcessor(window_size=1024, overlap=0.5)
        proc_75 = SignalProcessor(window_size=1024, overlap=0.75)
        r50 = proc_50.process_channel(ch)
        r75 = proc_75.process_channel(ch)
        assert r75.num_windows > r50.num_windows
