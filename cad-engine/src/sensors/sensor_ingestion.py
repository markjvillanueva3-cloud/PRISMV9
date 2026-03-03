"""Sensor Data Ingestion — CC-EXT-MS3-P0-U01.

Ingests CNC sensor data from MTConnect agents, OPC-UA servers,
and batch file formats (CSV, HDF5, TDMS). Normalizes to unified
SensorStream objects with metadata capture.
"""

from __future__ import annotations

import csv
import io
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np

from .sensor_schema import (
    DataFormat,
    SensorChannel,
    SensorMetadata,
    SensorStream,
    SensorType,
    normalize_stream,
)


# ---------------------------------------------------------------------------
# MTConnect XML Parsing
# ---------------------------------------------------------------------------

# MTConnect namespace
_MT_NS = {"mt": "urn:mtconnect.org:MTConnectStreams:1.3"}

# Map MTConnect data item names to SensorType
_MTCONNECT_TYPE_MAP: dict[str, SensorType] = {
    "Xload": SensorType.VIBRATION_X,
    "Yload": SensorType.VIBRATION_Y,
    "Zload": SensorType.VIBRATION_Z,
    "SpindleSpeed": SensorType.SPINDLE_SPEED,
    "SpindlePower": SensorType.SPINDLE_POWER,
    "PathFeedrate": SensorType.FEED_RATE,
    "Temperature": SensorType.TOOL_TEMP,
    "AcousticEmission": SensorType.ACOUSTIC_EMISSION,
    "CuttingForce": SensorType.CUTTING_FORCE,
    "FeedForce": SensorType.FEED_FORCE,
}


def parse_mtconnect_xml(xml_text: str, sample_rate_hz: float = 1000.0) -> SensorStream:
    """Parse MTConnect XML response into a SensorStream.

    Handles both MTConnectStreams (real-time) and stored XML data.
    """
    stream = SensorStream(
        metadata=SensorMetadata(
            data_format=DataFormat.MTCONNECT,
            sample_rate_hz=sample_rate_hz,
        ),
    )

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return stream

    # Extract device info from Header
    header = root.find(".//mt:Header", _MT_NS)
    if header is None:
        # Try without namespace
        header = root.find(".//Header")
    if header is not None:
        stream.metadata.machine_id = header.get("sender", "")

    # Extract samples — try namespaced then plain
    samples = root.findall(".//mt:Samples/*", _MT_NS)
    if not samples:
        samples = root.findall(".//Samples/*")
    if not samples:
        # Try flat structure: all elements with timestamp and value
        samples = [elem for elem in root.iter() if elem.get("timestamp") and elem.text]

    # Group by data item name
    channel_data: dict[str, list[tuple[float, float]]] = {}
    for sample in samples:
        tag = sample.tag.split("}")[-1] if "}" in sample.tag else sample.tag
        name = sample.get("name", tag)

        try:
            value = float(sample.text.strip()) if sample.text else 0.0
        except (ValueError, AttributeError):
            continue

        timestamp_str = sample.get("timestamp", "0")
        try:
            ts = float(timestamp_str)
        except ValueError:
            # ISO timestamp — extract seconds from epoch or use sequence
            ts = float(sample.get("sequence", len(channel_data.get(name, []))))

        if name not in channel_data:
            channel_data[name] = []
        channel_data[name].append((ts, value))

    # Convert to SensorChannels
    for name, points in channel_data.items():
        if not points:
            continue
        points.sort(key=lambda p: p[0])
        timestamps = np.array([p[0] for p in points], dtype=np.float64)
        values = np.array([p[1] for p in points], dtype=np.float64)

        sensor_type = _MTCONNECT_TYPE_MAP.get(name, SensorType.VIBRATION_X)
        channel = SensorChannel(
            sensor_type=sensor_type,
            sample_rate_hz=sample_rate_hz,
            data=values,
            timestamps=timestamps,
        )
        stream.add_channel(name, channel)

    return stream


# ---------------------------------------------------------------------------
# OPC-UA Data Parsing (simulated — real client requires opcua library)
# ---------------------------------------------------------------------------

@dataclass
class OPCUADataPoint:
    """A single OPC-UA data point."""
    node_id: str
    value: float
    timestamp: float
    status: str = "Good"


def parse_opcua_data(
    data_points: list[OPCUADataPoint],
    node_type_map: Optional[dict[str, SensorType]] = None,
    sample_rate_hz: float = 1000.0,
) -> SensorStream:
    """Parse OPC-UA data points into a SensorStream."""
    stream = SensorStream(
        metadata=SensorMetadata(
            data_format=DataFormat.OPCUA,
            sample_rate_hz=sample_rate_hz,
        ),
    )

    type_map = node_type_map or {}

    # Group by node_id
    grouped: dict[str, list[OPCUADataPoint]] = {}
    for dp in data_points:
        if dp.status != "Good":
            continue
        if dp.node_id not in grouped:
            grouped[dp.node_id] = []
        grouped[dp.node_id].append(dp)

    for node_id, points in grouped.items():
        points.sort(key=lambda p: p.timestamp)
        timestamps = np.array([p.timestamp for p in points], dtype=np.float64)
        values = np.array([p.value for p in points], dtype=np.float64)

        sensor_type = type_map.get(node_id, SensorType.VIBRATION_X)
        channel = SensorChannel(
            sensor_type=sensor_type,
            sample_rate_hz=sample_rate_hz,
            data=values,
            timestamps=timestamps,
        )
        stream.add_channel(node_id, channel)

    return stream


# ---------------------------------------------------------------------------
# CSV Batch Import
# ---------------------------------------------------------------------------

def import_csv(
    csv_text: str,
    sample_rate_hz: float = 1000.0,
    time_column: str = "time",
) -> SensorStream:
    """Import sensor data from CSV format.

    Expected format: time,channel1,channel2,...
    Or: time,channel,value (long format)
    """
    stream = SensorStream(
        metadata=SensorMetadata(
            data_format=DataFormat.CSV,
            sample_rate_hz=sample_rate_hz,
        ),
    )

    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        return stream

    fields = list(reader.fieldnames)

    # Detect format: wide (time,ch1,ch2) vs long (time,channel,value)
    is_long = "channel" in fields and "value" in fields

    if is_long:
        return _import_csv_long(csv_text, sample_rate_hz, time_column)

    # Wide format
    data_columns = [f for f in fields if f != time_column]
    channel_data: dict[str, list[tuple[float, float]]] = {col: [] for col in data_columns}

    reader = csv.DictReader(io.StringIO(csv_text))
    for row in reader:
        try:
            t = float(row.get(time_column, "0"))
        except ValueError:
            continue
        for col in data_columns:
            try:
                val = float(row.get(col, "0"))
                channel_data[col].append((t, val))
            except ValueError:
                continue

    for name, points in channel_data.items():
        if not points:
            continue
        timestamps = np.array([p[0] for p in points], dtype=np.float64)
        values = np.array([p[1] for p in points], dtype=np.float64)

        sensor_type = _guess_sensor_type(name)
        channel = SensorChannel(
            sensor_type=sensor_type,
            sample_rate_hz=sample_rate_hz,
            data=values,
            timestamps=timestamps,
        )
        stream.add_channel(name, channel)

    return stream


def _import_csv_long(
    csv_text: str,
    sample_rate_hz: float,
    time_column: str,
) -> SensorStream:
    """Import long-format CSV: time, channel, value."""
    stream = SensorStream(
        metadata=SensorMetadata(
            data_format=DataFormat.CSV,
            sample_rate_hz=sample_rate_hz,
        ),
    )

    channel_data: dict[str, list[tuple[float, float]]] = {}
    reader = csv.DictReader(io.StringIO(csv_text))
    for row in reader:
        try:
            t = float(row.get(time_column, "0"))
            ch = row.get("channel", "unknown")
            val = float(row.get("value", "0"))
        except ValueError:
            continue

        if ch not in channel_data:
            channel_data[ch] = []
        channel_data[ch].append((t, val))

    for name, points in channel_data.items():
        if not points:
            continue
        points.sort(key=lambda p: p[0])
        timestamps = np.array([p[0] for p in points], dtype=np.float64)
        values = np.array([p[1] for p in points], dtype=np.float64)

        sensor_type = _guess_sensor_type(name)
        channel = SensorChannel(
            sensor_type=sensor_type,
            sample_rate_hz=sample_rate_hz,
            data=values,
            timestamps=timestamps,
        )
        stream.add_channel(name, channel)

    return stream


# ---------------------------------------------------------------------------
# Sensor type guessing from channel name
# ---------------------------------------------------------------------------

_TYPE_KEYWORDS: dict[str, SensorType] = {
    "vib_x": SensorType.VIBRATION_X,
    "vibration_x": SensorType.VIBRATION_X,
    "accel_x": SensorType.VIBRATION_X,
    "vib_y": SensorType.VIBRATION_Y,
    "vibration_y": SensorType.VIBRATION_Y,
    "accel_y": SensorType.VIBRATION_Y,
    "vib_z": SensorType.VIBRATION_Z,
    "vibration_z": SensorType.VIBRATION_Z,
    "accel_z": SensorType.VIBRATION_Z,
    "power": SensorType.SPINDLE_POWER,
    "spindle_power": SensorType.SPINDLE_POWER,
    "force": SensorType.CUTTING_FORCE,
    "cutting_force": SensorType.CUTTING_FORCE,
    "feed_force": SensorType.FEED_FORCE,
    "temp": SensorType.TOOL_TEMP,
    "temperature": SensorType.TOOL_TEMP,
    "tool_temp": SensorType.TOOL_TEMP,
    "coolant_temp": SensorType.COOLANT_TEMP,
    "ae": SensorType.ACOUSTIC_EMISSION,
    "acoustic": SensorType.ACOUSTIC_EMISSION,
    "rpm": SensorType.SPINDLE_SPEED,
    "spindle_speed": SensorType.SPINDLE_SPEED,
    "feed_rate": SensorType.FEED_RATE,
    "feedrate": SensorType.FEED_RATE,
}


def _guess_sensor_type(name: str) -> SensorType:
    """Guess sensor type from channel name."""
    n = name.lower().strip()
    if n in _TYPE_KEYWORDS:
        return _TYPE_KEYWORDS[n]
    for keyword, stype in _TYPE_KEYWORDS.items():
        if keyword in n:
            return stype
    return SensorType.VIBRATION_X


# ---------------------------------------------------------------------------
# Unified ingestion interface
# ---------------------------------------------------------------------------

class SensorIngestion:
    """Unified sensor data ingestion from multiple sources.

    Supports MTConnect XML, OPC-UA data points, CSV batch import.
    All data normalized to SensorStream with common time base.
    """

    def __init__(self, default_sample_rate_hz: float = 1000.0):
        self._default_rate = default_sample_rate_hz

    def ingest_mtconnect(self, xml_text: str) -> SensorStream:
        """Ingest from MTConnect XML response."""
        return parse_mtconnect_xml(xml_text, self._default_rate)

    def ingest_opcua(
        self,
        data_points: list[OPCUADataPoint],
        node_type_map: Optional[dict[str, SensorType]] = None,
    ) -> SensorStream:
        """Ingest from OPC-UA data points."""
        return parse_opcua_data(data_points, node_type_map, self._default_rate)

    def ingest_csv(self, csv_text: str, time_column: str = "time") -> SensorStream:
        """Ingest from CSV text."""
        return import_csv(csv_text, self._default_rate, time_column)

    def ingest_csv_file(self, path: str, time_column: str = "time") -> SensorStream:
        """Ingest from CSV file path."""
        text = Path(path).read_text(encoding="utf-8")
        stream = self.ingest_csv(text, time_column)
        stream.metadata.notes = f"Imported from {path}"
        return stream

    def normalize(self, stream: SensorStream, target_rate_hz: Optional[float] = None) -> SensorStream:
        """Normalize a stream to common sample rate."""
        rate = target_rate_hz or self._default_rate
        return normalize_stream(stream, rate)
