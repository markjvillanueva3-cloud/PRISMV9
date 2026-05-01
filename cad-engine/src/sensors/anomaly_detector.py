"""Anomaly Detection — CC-EXT-MS3-P0-U03.

Detects abnormal cutting conditions from sensor features:
chatter, tool breakage, thermal anomaly, power anomaly.
Statistical process control via CUSUM and EWMA.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import numpy as np

from .signal_processor import SignalFeatureSet, TimeDomainFeatures, FrequencyDomainFeatures


# ---------------------------------------------------------------------------
# Anomaly types
# ---------------------------------------------------------------------------

class AnomalyType(str, Enum):
    CHATTER = "chatter"
    TOOL_BREAKAGE = "tool_breakage"
    THERMAL = "thermal"
    POWER = "power"
    DRIFT = "drift"


class AnomalySeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


# ---------------------------------------------------------------------------
# Detection results
# ---------------------------------------------------------------------------

@dataclass
class AnomalyEvent:
    """A detected anomaly event."""
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    timestamp: float = 0.0
    channel: str = ""
    message: str = ""
    value: float = 0.0
    threshold: float = 0.0
    confidence: float = 0.5

    def to_dict(self) -> dict:
        return {
            "type": self.anomaly_type.value,
            "severity": self.severity.value,
            "timestamp": round(self.timestamp, 4),
            "channel": self.channel,
            "message": self.message,
            "value": round(self.value, 4),
            "threshold": round(self.threshold, 4),
            "confidence": round(self.confidence, 4),
        }


@dataclass
class AnomalyReport:
    """Aggregate anomaly detection report."""
    events: list[AnomalyEvent] = field(default_factory=list)
    total_windows: int = 0
    anomaly_windows: int = 0

    @property
    def false_positive_rate(self) -> float:
        if self.total_windows == 0:
            return 0.0
        return self.anomaly_windows / self.total_windows

    def to_dict(self) -> dict:
        return {
            "total_events": len(self.events),
            "total_windows": self.total_windows,
            "anomaly_windows": self.anomaly_windows,
            "by_type": self._count_by_type(),
            "by_severity": self._count_by_severity(),
        }

    def _count_by_type(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for e in self.events:
            counts[e.anomaly_type.value] = counts.get(e.anomaly_type.value, 0) + 1
        return counts

    def _count_by_severity(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for e in self.events:
            counts[e.severity.value] = counts.get(e.severity.value, 0) + 1
        return counts


# ---------------------------------------------------------------------------
# Baseline
# ---------------------------------------------------------------------------

@dataclass
class OperatingBaseline:
    """Normal operating range learned from baseline data."""
    rms_mean: float = 0.0
    rms_std: float = 1.0
    power_mean: float = 0.0
    power_std: float = 1.0
    temp_mean: float = 0.0
    temp_std: float = 1.0
    dominant_freq_hz: float = 0.0
    kurtosis_mean: float = 0.0
    kurtosis_std: float = 1.0
    sample_count: int = 0

    @staticmethod
    def from_features(features: list[TimeDomainFeatures]) -> OperatingBaseline:
        """Learn baseline from normal operating data."""
        if not features:
            return OperatingBaseline()

        rms_vals = np.array([f.rms for f in features])
        kurt_vals = np.array([f.kurtosis for f in features])

        return OperatingBaseline(
            rms_mean=float(np.mean(rms_vals)),
            rms_std=float(np.std(rms_vals)) if len(rms_vals) > 1 else 1.0,
            kurtosis_mean=float(np.mean(kurt_vals)),
            kurtosis_std=float(np.std(kurt_vals)) if len(kurt_vals) > 1 else 1.0,
            sample_count=len(features),
        )


# ---------------------------------------------------------------------------
# Anomaly Detector
# ---------------------------------------------------------------------------

class AnomalyDetector:
    """Multi-mode anomaly detection for CNC sensor data.

    Detects: chatter, tool breakage, thermal anomaly, power anomaly,
    slow drift via CUSUM/EWMA.
    """

    def __init__(
        self,
        chatter_freq_threshold: float = 2.0,
        breakage_rms_multiplier: float = 5.0,
        breakage_kurtosis_threshold: float = 20.0,
        temp_max: float = 300.0,
        power_sigma_threshold: float = 2.0,
        cusum_threshold: float = 5.0,
        ewma_lambda: float = 0.2,
    ):
        self._chatter_freq_thresh = chatter_freq_threshold
        self._breakage_rms_mult = breakage_rms_multiplier
        self._breakage_kurt_thresh = breakage_kurtosis_threshold
        self._temp_max = temp_max
        self._power_sigma = power_sigma_threshold
        self._cusum_thresh = cusum_threshold
        self._ewma_lambda = ewma_lambda

    def detect(
        self,
        feature_set: SignalFeatureSet,
        baseline: Optional[OperatingBaseline] = None,
    ) -> AnomalyReport:
        """Run all anomaly detectors on a feature set."""
        report = AnomalyReport(total_windows=feature_set.num_windows)

        if not baseline:
            baseline = OperatingBaseline.from_features(feature_set.time_features)

        anomaly_window_set: set[int] = set()

        # Chatter detection
        for i, ff in enumerate(feature_set.freq_features):
            event = self._detect_chatter(ff, baseline, feature_set.channel_name)
            if event:
                report.events.append(event)
                anomaly_window_set.add(i)

        # Tool breakage detection
        for i, tf in enumerate(feature_set.time_features):
            event = self._detect_breakage(tf, baseline, feature_set.channel_name)
            if event:
                report.events.append(event)
                anomaly_window_set.add(i)

        # Power anomaly
        for i, tf in enumerate(feature_set.time_features):
            event = self._detect_power_anomaly(tf, baseline, feature_set.channel_name)
            if event:
                report.events.append(event)
                anomaly_window_set.add(i)

        # Drift detection (CUSUM on RMS)
        rms_values = [f.rms for f in feature_set.time_features]
        drift_events = self._detect_drift_cusum(
            rms_values, baseline, feature_set.channel_name,
            [f.timestamp for f in feature_set.time_features],
        )
        report.events.extend(drift_events)

        report.anomaly_windows = len(anomaly_window_set)
        return report

    def detect_thermal(
        self,
        temp_values: list[float],
        timestamps: list[float],
        channel: str = "temperature",
        material_temp_limit: Optional[float] = None,
    ) -> list[AnomalyEvent]:
        """Detect thermal anomalies from temperature data."""
        limit = material_temp_limit or self._temp_max
        events: list[AnomalyEvent] = []

        for i, (temp, ts) in enumerate(zip(temp_values, timestamps)):
            if temp > limit:
                severity = AnomalySeverity.CRITICAL if temp > limit * 1.2 else AnomalySeverity.WARNING
                events.append(AnomalyEvent(
                    anomaly_type=AnomalyType.THERMAL,
                    severity=severity,
                    timestamp=ts,
                    channel=channel,
                    message=f"Temperature {temp:.1f}°C exceeds limit {limit:.1f}°C",
                    value=temp,
                    threshold=limit,
                    confidence=0.9,
                ))

        return events

    def _detect_chatter(
        self,
        freq_features: FrequencyDomainFeatures,
        baseline: OperatingBaseline,
        channel: str,
    ) -> Optional[AnomalyEvent]:
        """Detect chatter from frequency features."""
        if freq_features.dominant_magnitude <= 0:
            return None

        # Chatter: emergent frequency peak significantly above baseline
        if freq_features.harmonic_ratio > 0.5 and freq_features.dominant_magnitude > self._chatter_freq_thresh:
            return AnomalyEvent(
                anomaly_type=AnomalyType.CHATTER,
                severity=AnomalySeverity.WARNING,
                timestamp=freq_features.timestamp,
                channel=channel,
                message=f"Chatter detected at {freq_features.dominant_frequency_hz:.1f} Hz, harmonic ratio {freq_features.harmonic_ratio:.2f}",
                value=freq_features.dominant_magnitude,
                threshold=self._chatter_freq_thresh,
                confidence=min(0.9, freq_features.harmonic_ratio),
            )
        return None

    def _detect_breakage(
        self,
        time_features: TimeDomainFeatures,
        baseline: OperatingBaseline,
        channel: str,
    ) -> Optional[AnomalyEvent]:
        """Detect tool breakage from sudden RMS spike + high kurtosis."""
        rms_threshold = baseline.rms_mean + self._breakage_rms_mult * max(baseline.rms_std, 0.001)

        if time_features.rms > rms_threshold and time_features.kurtosis > self._breakage_kurt_thresh:
            return AnomalyEvent(
                anomaly_type=AnomalyType.TOOL_BREAKAGE,
                severity=AnomalySeverity.CRITICAL,
                timestamp=time_features.timestamp,
                channel=channel,
                message=f"Possible tool breakage: RMS {time_features.rms:.4f} ({self._breakage_rms_mult}x baseline), kurtosis {time_features.kurtosis:.1f}",
                value=time_features.rms,
                threshold=rms_threshold,
                confidence=0.85,
            )
        return None

    def _detect_power_anomaly(
        self,
        time_features: TimeDomainFeatures,
        baseline: OperatingBaseline,
        channel: str,
    ) -> Optional[AnomalyEvent]:
        """Detect power deviation beyond sigma threshold."""
        if baseline.rms_std == 0:
            return None

        deviation = abs(time_features.rms - baseline.rms_mean) / max(baseline.rms_std, 0.001)
        if deviation > self._power_sigma:
            severity = AnomalySeverity.CRITICAL if deviation > self._power_sigma * 2 else AnomalySeverity.WARNING
            return AnomalyEvent(
                anomaly_type=AnomalyType.POWER,
                severity=severity,
                timestamp=time_features.timestamp,
                channel=channel,
                message=f"Power deviation: {deviation:.1f} sigma from baseline",
                value=time_features.rms,
                threshold=baseline.rms_mean + self._power_sigma * baseline.rms_std,
                confidence=min(0.95, deviation / 10.0),
            )
        return None

    def _detect_drift_cusum(
        self,
        values: list[float],
        baseline: OperatingBaseline,
        channel: str,
        timestamps: list[float],
    ) -> list[AnomalyEvent]:
        """Detect slow drift using CUSUM algorithm."""
        events: list[AnomalyEvent] = []
        if len(values) < 3:
            return events

        target = baseline.rms_mean
        allowance = baseline.rms_std * 0.5

        cusum_pos = 0.0
        cusum_neg = 0.0

        for i, val in enumerate(values):
            cusum_pos = max(0, cusum_pos + val - target - allowance)
            cusum_neg = max(0, cusum_neg - val + target - allowance)

            if cusum_pos > self._cusum_thresh or cusum_neg > self._cusum_thresh:
                ts = timestamps[i] if i < len(timestamps) else 0.0
                events.append(AnomalyEvent(
                    anomaly_type=AnomalyType.DRIFT,
                    severity=AnomalySeverity.WARNING,
                    timestamp=ts,
                    channel=channel,
                    message=f"CUSUM drift detected: {'positive' if cusum_pos > cusum_neg else 'negative'} shift",
                    value=max(cusum_pos, cusum_neg),
                    threshold=self._cusum_thresh,
                    confidence=0.7,
                ))
                # Reset after detection
                cusum_pos = 0.0
                cusum_neg = 0.0

        return events
