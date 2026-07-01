"""Sensor Data Schema — CC-EXT-MS3-P0-U01.

Defines SensorStream, SensorChannel, SensorMetadata dataclasses
for unified representation of CNC sensor data.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import numpy as np


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SensorType(str, Enum):
    """Type of sensor signal."""
    VIBRATION_X = "vibration_x"
    VIBRATION_Y = "vibration_y"
    VIBRATION_Z = "vibration_z"
    SPINDLE_POWER = "spindle_power"
    FEED_FORCE = "feed_force"
    CUTTING_FORCE = "cutting_force"
    TOOL_TEMP = "tool_temperature"
    WORKPIECE_TEMP = "workpiece_temperature"
    COOLANT_TEMP = "coolant_temperature"
    ACOUSTIC_EMISSION = "acoustic_emission"
    SPINDLE_SPEED = "spindle_speed"
    FEED_RATE = "feed_rate"


class DataFormat(str, Enum):
    """Source data format."""
    MTCONNECT = "mtconnect"
    OPCUA = "opcua"
    CSV = "csv"
    HDF5 = "hdf5"
    TDMS = "tdms"
    SIMULATED = "simulated"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class SensorMetadata:
    """Metadata associated with a sensor recording session."""
    machine_id: str = ""
    operation_type: str = ""
    tool_id: str = ""
    material: str = ""
    start_time: str = ""
    end_time: str = ""
    sample_rate_hz: float = 1000.0
    data_format: DataFormat = DataFormat.SIMULATED
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            "machine_id": self.machine_id,
            "operation_type": self.operation_type,
            "tool_id": self.tool_id,
            "material": self.material,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "sample_rate_hz": self.sample_rate_hz,
            "data_format": self.data_format.value,
        }


@dataclass
class SensorChannel:
    """A single channel of sensor data (time-series)."""
    sensor_type: SensorType
    unit: str = ""
    sample_rate_hz: float = 1000.0
    data: np.ndarray = field(default_factory=lambda: np.array([], dtype=np.float64))
    timestamps: np.ndarray = field(default_factory=lambda: np.array([], dtype=np.float64))

    @property
    def duration_s(self) -> float:
        if len(self.timestamps) < 2:
            return 0.0
        return float(self.timestamps[-1] - self.timestamps[0])

    @property
    def num_samples(self) -> int:
        return len(self.data)

    def to_dict(self) -> dict:
        return {
            "sensor_type": self.sensor_type.value,
            "unit": self.unit,
            "sample_rate_hz": self.sample_rate_hz,
            "num_samples": self.num_samples,
            "duration_s": round(self.duration_s, 4),
        }


@dataclass
class SensorStream:
    """A collection of synchronized sensor channels from a recording session."""
    stream_id: str = ""
    metadata: SensorMetadata = field(default_factory=SensorMetadata)
    channels: dict[str, SensorChannel] = field(default_factory=dict)

    def add_channel(self, name: str, channel: SensorChannel) -> None:
        self.channels[name] = channel

    def get_channel(self, name: str) -> Optional[SensorChannel]:
        return self.channels.get(name)

    @property
    def channel_names(self) -> list[str]:
        return list(self.channels.keys())

    @property
    def num_channels(self) -> int:
        return len(self.channels)

    def to_dict(self) -> dict:
        return {
            "stream_id": self.stream_id,
            "metadata": self.metadata.to_dict(),
            "num_channels": self.num_channels,
            "channels": {name: ch.to_dict() for name, ch in self.channels.items()},
        }


# ---------------------------------------------------------------------------
# Normalization / Resampling
# ---------------------------------------------------------------------------

def resample_channel(
    channel: SensorChannel,
    target_rate_hz: float,
) -> SensorChannel:
    """Resample a channel to a target sample rate using linear interpolation."""
    if channel.num_samples < 2:
        return channel

    duration = channel.duration_s
    if duration <= 0:
        return channel

    num_new_samples = int(duration * target_rate_hz)
    if num_new_samples < 2:
        return channel

    new_timestamps = np.linspace(
        channel.timestamps[0], channel.timestamps[-1], num_new_samples,
    )
    new_data = np.interp(new_timestamps, channel.timestamps, channel.data)

    return SensorChannel(
        sensor_type=channel.sensor_type,
        unit=channel.unit,
        sample_rate_hz=target_rate_hz,
        data=new_data,
        timestamps=new_timestamps,
    )


def normalize_stream(
    stream: SensorStream,
    target_rate_hz: float = 1000.0,
) -> SensorStream:
    """Resample all channels to a common time base."""
    normalized = SensorStream(
        stream_id=stream.stream_id,
        metadata=stream.metadata,
    )
    normalized.metadata.sample_rate_hz = target_rate_hz

    for name, channel in stream.channels.items():
        normalized.add_channel(name, resample_channel(channel, target_rate_hz))

    return normalized
