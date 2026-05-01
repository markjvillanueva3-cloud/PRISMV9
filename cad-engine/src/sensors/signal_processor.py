"""Signal Processing Pipeline — CC-EXT-MS3-P0-U02.

Time-domain, frequency-domain, and time-frequency feature extraction
from sensor data channels. Windowed processing with configurable
window size and overlap.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from .sensor_schema import SensorChannel, SensorStream, SensorType


# ---------------------------------------------------------------------------
# Feature result dataclasses
# ---------------------------------------------------------------------------

@dataclass
class TimeDomainFeatures:
    """Time-domain statistical features per window."""
    rms: float = 0.0
    peak: float = 0.0
    crest_factor: float = 0.0
    kurtosis: float = 0.0
    skewness: float = 0.0
    zero_crossing_rate: float = 0.0
    mean: float = 0.0
    std: float = 0.0
    timestamp: float = 0.0

    def to_dict(self) -> dict:
        return {
            "rms": round(self.rms, 6),
            "peak": round(self.peak, 6),
            "crest_factor": round(self.crest_factor, 4),
            "kurtosis": round(self.kurtosis, 4),
            "skewness": round(self.skewness, 4),
            "zero_crossing_rate": round(self.zero_crossing_rate, 4),
            "mean": round(self.mean, 6),
            "std": round(self.std, 6),
            "timestamp": round(self.timestamp, 6),
        }


@dataclass
class FrequencyDomainFeatures:
    """Frequency-domain features per window."""
    dominant_frequency_hz: float = 0.0
    dominant_magnitude: float = 0.0
    spectral_centroid_hz: float = 0.0
    spectral_bandwidth_hz: float = 0.0
    total_power: float = 0.0
    harmonic_ratio: float = 0.0
    psd_peak_hz: float = 0.0
    timestamp: float = 0.0

    def to_dict(self) -> dict:
        return {
            "dominant_frequency_hz": round(self.dominant_frequency_hz, 2),
            "dominant_magnitude": round(self.dominant_magnitude, 6),
            "spectral_centroid_hz": round(self.spectral_centroid_hz, 2),
            "total_power": round(self.total_power, 6),
            "harmonic_ratio": round(self.harmonic_ratio, 4),
            "timestamp": round(self.timestamp, 6),
        }


@dataclass
class SignalFeatureSet:
    """Complete feature set for a channel."""
    channel_name: str = ""
    sensor_type: str = ""
    sample_rate_hz: float = 0.0
    time_features: list[TimeDomainFeatures] = field(default_factory=list)
    freq_features: list[FrequencyDomainFeatures] = field(default_factory=list)
    num_windows: int = 0

    def to_dict(self) -> dict:
        return {
            "channel_name": self.channel_name,
            "sensor_type": self.sensor_type,
            "num_windows": self.num_windows,
            "time_features_count": len(self.time_features),
            "freq_features_count": len(self.freq_features),
        }


# ---------------------------------------------------------------------------
# Time-domain feature extraction
# ---------------------------------------------------------------------------

def compute_rms(data: np.ndarray) -> float:
    """Root mean square of signal."""
    if len(data) == 0:
        return 0.0
    return float(np.sqrt(np.mean(data ** 2)))


def compute_peak(data: np.ndarray) -> float:
    """Peak absolute amplitude."""
    if len(data) == 0:
        return 0.0
    return float(np.max(np.abs(data)))


def compute_crest_factor(data: np.ndarray) -> float:
    """Crest factor = peak / RMS."""
    rms = compute_rms(data)
    if rms == 0:
        return 0.0
    return compute_peak(data) / rms


def compute_kurtosis(data: np.ndarray) -> float:
    """Excess kurtosis (normal distribution = 0)."""
    if len(data) < 4:
        return 0.0
    mean = np.mean(data)
    std = np.std(data, ddof=0)
    if std == 0:
        return 0.0
    n = len(data)
    m4 = np.mean((data - mean) ** 4)
    return float(m4 / (std ** 4) - 3.0)


def compute_skewness(data: np.ndarray) -> float:
    """Skewness of signal."""
    if len(data) < 3:
        return 0.0
    mean = np.mean(data)
    std = np.std(data, ddof=0)
    if std == 0:
        return 0.0
    m3 = np.mean((data - mean) ** 3)
    return float(m3 / (std ** 3))


def compute_zero_crossing_rate(data: np.ndarray) -> float:
    """Fraction of adjacent samples that cross zero."""
    if len(data) < 2:
        return 0.0
    crossings = np.sum(np.diff(np.sign(data)) != 0)
    return float(crossings / (len(data) - 1))


def extract_time_features(data: np.ndarray, timestamp: float = 0.0) -> TimeDomainFeatures:
    """Extract all time-domain features from a window."""
    return TimeDomainFeatures(
        rms=compute_rms(data),
        peak=compute_peak(data),
        crest_factor=compute_crest_factor(data),
        kurtosis=compute_kurtosis(data),
        skewness=compute_skewness(data),
        zero_crossing_rate=compute_zero_crossing_rate(data),
        mean=float(np.mean(data)) if len(data) > 0 else 0.0,
        std=float(np.std(data)) if len(data) > 0 else 0.0,
        timestamp=timestamp,
    )


# ---------------------------------------------------------------------------
# Frequency-domain feature extraction
# ---------------------------------------------------------------------------

def compute_fft(data: np.ndarray, sample_rate_hz: float) -> tuple[np.ndarray, np.ndarray]:
    """Compute single-sided FFT magnitude spectrum.

    Returns (frequencies, magnitudes).
    """
    n = len(data)
    if n < 2:
        return np.array([]), np.array([])

    # Apply Hanning window
    windowed = data * np.hanning(n)
    fft_vals = np.fft.rfft(windowed)
    magnitudes = 2.0 / n * np.abs(fft_vals)
    frequencies = np.fft.rfftfreq(n, d=1.0 / sample_rate_hz)

    return frequencies, magnitudes


def compute_psd_welch(
    data: np.ndarray,
    sample_rate_hz: float,
    nperseg: int = 256,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute Power Spectral Density using Welch's method (simplified).

    Returns (frequencies, psd).
    """
    n = len(data)
    if n < nperseg:
        nperseg = n
    if nperseg < 2:
        return np.array([]), np.array([])

    # Simple Welch: average periodograms of overlapping segments
    step = nperseg // 2
    segments = []
    for start in range(0, n - nperseg + 1, step):
        segment = data[start:start + nperseg]
        windowed = segment * np.hanning(nperseg)
        fft_vals = np.fft.rfft(windowed)
        psd_seg = (1.0 / (sample_rate_hz * nperseg)) * np.abs(fft_vals) ** 2
        psd_seg[1:-1] *= 2  # single-sided
        segments.append(psd_seg)

    if not segments:
        return np.array([]), np.array([])

    psd = np.mean(segments, axis=0)
    freqs = np.fft.rfftfreq(nperseg, d=1.0 / sample_rate_hz)

    return freqs, psd


def extract_freq_features(
    data: np.ndarray,
    sample_rate_hz: float,
    timestamp: float = 0.0,
) -> FrequencyDomainFeatures:
    """Extract frequency-domain features from a window."""
    freqs, mags = compute_fft(data, sample_rate_hz)
    if len(freqs) < 2:
        return FrequencyDomainFeatures(timestamp=timestamp)

    # Skip DC component
    freqs_ac = freqs[1:]
    mags_ac = mags[1:]

    if len(mags_ac) == 0 or np.sum(mags_ac) == 0:
        return FrequencyDomainFeatures(timestamp=timestamp)

    # Dominant frequency
    peak_idx = np.argmax(mags_ac)
    dom_freq = float(freqs_ac[peak_idx])
    dom_mag = float(mags_ac[peak_idx])

    # Spectral centroid
    total_mag = np.sum(mags_ac)
    centroid = float(np.sum(freqs_ac * mags_ac) / total_mag) if total_mag > 0 else 0.0

    # Total power
    total_power = float(np.sum(mags_ac ** 2))

    # Harmonic ratio: power at fundamental + harmonics vs total
    harmonic_power = 0.0
    if dom_freq > 0:
        for h in range(1, 4):
            target = dom_freq * h
            idx = np.argmin(np.abs(freqs_ac - target))
            if abs(freqs_ac[idx] - target) < sample_rate_hz / len(data):
                harmonic_power += float(mags_ac[idx] ** 2)
    harmonic_ratio = harmonic_power / total_power if total_power > 0 else 0.0

    # PSD peak
    psd_freqs, psd_vals = compute_psd_welch(data, sample_rate_hz, min(256, len(data)))
    psd_peak_hz = 0.0
    if len(psd_freqs) > 1 and len(psd_vals) > 1:
        psd_peak_idx = np.argmax(psd_vals[1:]) + 1
        psd_peak_hz = float(psd_freqs[psd_peak_idx])

    return FrequencyDomainFeatures(
        dominant_frequency_hz=dom_freq,
        dominant_magnitude=dom_mag,
        spectral_centroid_hz=centroid,
        total_power=total_power,
        harmonic_ratio=harmonic_ratio,
        psd_peak_hz=psd_peak_hz,
        timestamp=timestamp,
    )


# ---------------------------------------------------------------------------
# Signal Processor
# ---------------------------------------------------------------------------

class SignalProcessor:
    """Windowed signal feature extraction pipeline.

    Processes sensor channels into time-domain and frequency-domain
    feature arrays with configurable window size and overlap.
    """

    def __init__(
        self,
        window_size: int = 1024,
        overlap: float = 0.5,
    ):
        self._window_size = window_size
        self._overlap = max(0.0, min(overlap, 0.99))
        self._step = max(1, int(window_size * (1 - self._overlap)))

    @property
    def window_size(self) -> int:
        return self._window_size

    @property
    def overlap(self) -> float:
        return self._overlap

    def process_channel(
        self,
        channel: SensorChannel,
        channel_name: str = "",
    ) -> SignalFeatureSet:
        """Extract features from a single sensor channel."""
        result = SignalFeatureSet(
            channel_name=channel_name,
            sensor_type=channel.sensor_type.value,
            sample_rate_hz=channel.sample_rate_hz,
        )

        data = channel.data
        n = len(data)
        if n < self._window_size:
            # Process entire signal as one window
            if n > 0:
                ts = float(channel.timestamps[0]) if len(channel.timestamps) > 0 else 0.0
                result.time_features.append(extract_time_features(data, ts))
                result.freq_features.append(extract_freq_features(data, channel.sample_rate_hz, ts))
                result.num_windows = 1
            return result

        # Windowed processing
        window_count = 0
        for start in range(0, n - self._window_size + 1, self._step):
            window = data[start:start + self._window_size]
            ts = float(channel.timestamps[start]) if start < len(channel.timestamps) else 0.0

            result.time_features.append(extract_time_features(window, ts))
            result.freq_features.append(extract_freq_features(window, channel.sample_rate_hz, ts))
            window_count += 1

        result.num_windows = window_count
        return result

    def process_stream(self, stream: SensorStream) -> dict[str, SignalFeatureSet]:
        """Extract features from all channels in a stream."""
        results: dict[str, SignalFeatureSet] = {}
        for name, channel in stream.channels.items():
            results[name] = self.process_channel(channel, name)
        return results
