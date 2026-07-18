"""Sensor Stream Simulator — CC-EXT-MS3-P0-U06.

Generates realistic multi-channel sensor data for testing:
normal machining, chatter onset, tool wear progression, breakage events.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .sensor_schema import SensorChannel, SensorStream, SensorType


@dataclass
class SimConfig:
    """Configuration for a simulated sensor stream."""
    duration_s: float = 10.0
    sample_rate_hz: float = 10000.0
    spindle_rpm: float = 3000.0
    num_teeth: int = 4
    base_vibration_rms: float = 0.5  # g
    base_power_kw: float = 5.0
    base_temp_c: float = 80.0
    base_ae_rms: float = 0.2
    noise_level: float = 0.05


class StreamSimulator:
    """Generates realistic multi-channel CNC sensor streams."""

    def __init__(self, seed: int = 42):
        self._rng = np.random.RandomState(seed)

    def normal_machining(self, cfg: SimConfig | None = None) -> SensorStream:
        """Simulate stable normal machining — no anomalies."""
        cfg = cfg or SimConfig()
        n = int(cfg.duration_s * cfg.sample_rate_hz)
        t = np.linspace(0, cfg.duration_s, n)
        tooth_freq = cfg.spindle_rpm / 60.0 * cfg.num_teeth

        # Vibration: tooth passing + small harmonics + noise
        vib = (cfg.base_vibration_rms * np.sin(2 * np.pi * tooth_freq * t)
               + cfg.base_vibration_rms * 0.3 * np.sin(2 * np.pi * 2 * tooth_freq * t)
               + self._rng.randn(n) * cfg.noise_level)

        # Power: steady with small ripple
        power = (cfg.base_power_kw
                 + 0.1 * np.sin(2 * np.pi * tooth_freq * t)
                 + self._rng.randn(n) * cfg.noise_level * 10)

        # Temperature: slow rise then plateau
        temp = cfg.base_temp_c + 10 * (1 - np.exp(-t / 2.0)) + self._rng.randn(n) * 0.5

        # AE: steady low-level
        ae = cfg.base_ae_rms + self._rng.randn(n) * cfg.noise_level * 0.5

        return self._build_stream(t, vib, power, temp, ae, cfg.sample_rate_hz)

    def chatter_onset(self, cfg: SimConfig | None = None, onset_time_s: float = 5.0) -> SensorStream:
        """Simulate gradual chatter onset at onset_time_s."""
        cfg = cfg or SimConfig()
        n = int(cfg.duration_s * cfg.sample_rate_hz)
        t = np.linspace(0, cfg.duration_s, n)
        tooth_freq = cfg.spindle_rpm / 60.0 * cfg.num_teeth
        chatter_freq = tooth_freq * 1.3  # off-harmonic

        # Normal vibration
        vib = (cfg.base_vibration_rms * np.sin(2 * np.pi * tooth_freq * t)
               + self._rng.randn(n) * cfg.noise_level)

        # Add growing chatter after onset
        chatter_envelope = np.zeros(n)
        onset_idx = int(onset_time_s * cfg.sample_rate_hz)
        if onset_idx < n:
            ramp = np.linspace(0, 1, n - onset_idx)
            chatter_envelope[onset_idx:] = ramp ** 2  # quadratic growth

        chatter_signal = chatter_envelope * cfg.base_vibration_rms * 3.0 * np.sin(2 * np.pi * chatter_freq * t)
        vib += chatter_signal

        # Power increases with chatter
        power = (cfg.base_power_kw
                 + chatter_envelope * 2.0
                 + self._rng.randn(n) * cfg.noise_level * 10)

        # Temperature and AE also increase
        temp = cfg.base_temp_c + 10 * (1 - np.exp(-t / 2.0)) + chatter_envelope * 20 + self._rng.randn(n) * 0.5
        ae = cfg.base_ae_rms + chatter_envelope * 0.5 + self._rng.randn(n) * cfg.noise_level * 0.5

        return self._build_stream(t, vib, power, temp, ae, cfg.sample_rate_hz)

    def wear_progression(self, cfg: SimConfig | None = None) -> SensorStream:
        """Simulate full tool life: gradual increase in vibration, power, temperature."""
        cfg = cfg or SimConfig()
        n = int(cfg.duration_s * cfg.sample_rate_hz)
        t = np.linspace(0, cfg.duration_s, n)
        tooth_freq = cfg.spindle_rpm / 60.0 * cfg.num_teeth

        # Wear factor: 0 at start, 1 at end (represents tool life fraction)
        wear = t / cfg.duration_s

        # Vibration: increases with wear
        vib = ((cfg.base_vibration_rms * (1 + 2 * wear))
               * np.sin(2 * np.pi * tooth_freq * t)
               + self._rng.randn(n) * cfg.noise_level * (1 + wear))

        # Power: increases with wear (duller tool)
        power = (cfg.base_power_kw * (1 + 0.5 * wear)
                 + self._rng.randn(n) * cfg.noise_level * 10)

        # Temperature: rises with wear
        temp = (cfg.base_temp_c + 100 * wear
                + 10 * (1 - np.exp(-t / 2.0))
                + self._rng.randn(n) * 0.5)

        # AE: increases with surface degradation
        ae = cfg.base_ae_rms * (1 + 3 * wear) + self._rng.randn(n) * cfg.noise_level * 0.5

        return self._build_stream(t, vib, power, temp, ae, cfg.sample_rate_hz)

    def breakage_event(self, cfg: SimConfig | None = None, breakage_time_s: float = 5.0) -> SensorStream:
        """Simulate sudden tool breakage at breakage_time_s."""
        cfg = cfg or SimConfig()
        n = int(cfg.duration_s * cfg.sample_rate_hz)
        t = np.linspace(0, cfg.duration_s, n)
        tooth_freq = cfg.spindle_rpm / 60.0 * cfg.num_teeth

        # Normal vibration
        vib = (cfg.base_vibration_rms * np.sin(2 * np.pi * tooth_freq * t)
               + self._rng.randn(n) * cfg.noise_level)

        # Breakage: massive spike
        break_idx = int(breakage_time_s * cfg.sample_rate_hz)
        spike_duration = int(0.01 * cfg.sample_rate_hz)  # 10ms spike
        if break_idx < n:
            end_idx = min(break_idx + spike_duration, n)
            vib[break_idx:end_idx] += cfg.base_vibration_rms * 20  # 20x normal
            # After breakage, irregular vibration
            if end_idx < n:
                vib[end_idx:] *= 3.0
                vib[end_idx:] += self._rng.randn(n - end_idx) * cfg.base_vibration_rms * 2

        # Power: spike then drop (broken tool cuts less)
        power = cfg.base_power_kw + self._rng.randn(n) * cfg.noise_level * 10
        if break_idx < n:
            end_idx = min(break_idx + spike_duration, n)
            power[break_idx:end_idx] += cfg.base_power_kw * 3
            if end_idx < n:
                power[end_idx:] *= 0.3  # reduced cutting

        # Temperature: spike at breakage
        temp = cfg.base_temp_c + 10 * (1 - np.exp(-t / 2.0)) + self._rng.randn(n) * 0.5
        if break_idx < n:
            temp[break_idx:min(break_idx + spike_duration * 10, n)] += 100

        # AE: massive burst at breakage
        ae = cfg.base_ae_rms + self._rng.randn(n) * cfg.noise_level * 0.5
        if break_idx < n:
            ae[break_idx:min(break_idx + spike_duration, n)] += cfg.base_ae_rms * 50

        return self._build_stream(t, vib, power, temp, ae, cfg.sample_rate_hz)

    def _build_stream(
        self,
        t: np.ndarray,
        vib: np.ndarray,
        power: np.ndarray,
        temp: np.ndarray,
        ae: np.ndarray,
        sample_rate: float,
    ) -> SensorStream:
        stream = SensorStream()
        stream.add_channel("vibration_x", SensorChannel(
            SensorType.VIBRATION_X, "g", sample_rate, vib, t))
        stream.add_channel("power", SensorChannel(
            SensorType.SPINDLE_POWER, "kW", sample_rate, power, t))
        stream.add_channel("temperature", SensorChannel(
            SensorType.TOOL_TEMP, "°C", sample_rate, temp, t))
        stream.add_channel("acoustic_emission", SensorChannel(
            SensorType.ACOUSTIC_EMISSION, "V", sample_rate, ae, t))
        return stream
