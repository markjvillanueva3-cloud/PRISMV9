"""Tests for Sensor Data Ingestion — CC-EXT-MS3-P0-U01."""

from __future__ import annotations

import os
import sys

import pytest
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.sensors.sensor_schema import (
    SensorChannel,
    SensorMetadata,
    SensorStream,
    SensorType,
    DataFormat,
    resample_channel,
    normalize_stream,
)
from src.sensors.sensor_ingestion import (
    SensorIngestion,
    OPCUADataPoint,
    parse_mtconnect_xml,
    parse_opcua_data,
    import_csv,
    _guess_sensor_type,
)


# ---------------------------------------------------------------------------
# SensorSchema Tests
# ---------------------------------------------------------------------------

class TestSensorChannel:
    def test_basic_channel(self):
        data = np.array([1.0, 2.0, 3.0])
        ts = np.array([0.0, 0.001, 0.002])
        ch = SensorChannel(SensorType.VIBRATION_X, "g", 1000.0, data, ts)
        assert ch.num_samples == 3
        assert abs(ch.duration_s - 0.002) < 1e-6

    def test_empty_channel(self):
        ch = SensorChannel(SensorType.SPINDLE_POWER)
        assert ch.num_samples == 0
        assert ch.duration_s == 0.0

    def test_to_dict(self):
        data = np.array([1.0, 2.0])
        ts = np.array([0.0, 1.0])
        ch = SensorChannel(SensorType.TOOL_TEMP, "°C", 1.0, data, ts)
        d = ch.to_dict()
        assert d["sensor_type"] == "tool_temperature"
        assert d["num_samples"] == 2


class TestSensorStream:
    def test_add_get_channel(self):
        stream = SensorStream(stream_id="test-1")
        ch = SensorChannel(SensorType.VIBRATION_X, data=np.array([1.0, 2.0]),
                           timestamps=np.array([0.0, 0.001]))
        stream.add_channel("vib_x", ch)
        assert stream.num_channels == 1
        assert stream.get_channel("vib_x") is ch
        assert "vib_x" in stream.channel_names

    def test_to_dict(self):
        stream = SensorStream(stream_id="s1")
        d = stream.to_dict()
        assert d["stream_id"] == "s1"
        assert d["num_channels"] == 0


class TestSensorMetadata:
    def test_to_dict(self):
        meta = SensorMetadata(machine_id="CNC-01", operation_type="turning",
                              material="steel", sample_rate_hz=2000.0)
        d = meta.to_dict()
        assert d["machine_id"] == "CNC-01"
        assert d["sample_rate_hz"] == 2000.0


class TestResampling:
    def test_resample_upsample(self):
        data = np.array([0.0, 10.0])
        ts = np.array([0.0, 1.0])
        ch = SensorChannel(SensorType.VIBRATION_X, "g", 1.0, data, ts)
        resampled = resample_channel(ch, 10.0)
        assert resampled.num_samples == 10
        assert resampled.sample_rate_hz == 10.0
        assert abs(resampled.data[5] - 5.0) < 1.0

    def test_resample_downsample(self):
        data = np.linspace(0, 10, 1000)
        ts = np.linspace(0, 1, 1000)
        ch = SensorChannel(SensorType.SPINDLE_POWER, "kW", 1000.0, data, ts)
        resampled = resample_channel(ch, 100.0)
        assert resampled.num_samples == 100

    def test_normalize_stream(self):
        stream = SensorStream()
        ch1 = SensorChannel(SensorType.VIBRATION_X, data=np.linspace(0, 1, 100),
                            timestamps=np.linspace(0, 1, 100), sample_rate_hz=100.0)
        ch2 = SensorChannel(SensorType.SPINDLE_POWER, data=np.linspace(0, 5, 500),
                            timestamps=np.linspace(0, 1, 500), sample_rate_hz=500.0)
        stream.add_channel("vib", ch1)
        stream.add_channel("power", ch2)
        normalized = normalize_stream(stream, target_rate_hz=200.0)
        assert normalized.get_channel("vib").sample_rate_hz == 200.0
        assert normalized.get_channel("power").sample_rate_hz == 200.0

    def test_empty_channel_resample(self):
        ch = SensorChannel(SensorType.VIBRATION_X)
        resampled = resample_channel(ch, 1000.0)
        assert resampled.num_samples == 0


# ---------------------------------------------------------------------------
# MTConnect Parsing
# ---------------------------------------------------------------------------

class TestMTConnectParsing:
    SAMPLE_XML = """<?xml version="1.0"?>
    <MTConnectStreams>
        <Header sender="CNC-01" instanceId="1"/>
        <Streams>
            <DeviceStream>
                <ComponentStream>
                    <Samples>
                        <SpindlePower timestamp="0.0" sequence="1">5.2</SpindlePower>
                        <SpindlePower timestamp="0.001" sequence="2">5.3</SpindlePower>
                        <SpindlePower timestamp="0.002" sequence="3">5.5</SpindlePower>
                        <Temperature timestamp="0.0" sequence="4">42.1</Temperature>
                        <Temperature timestamp="0.001" sequence="5">42.2</Temperature>
                    </Samples>
                </ComponentStream>
            </DeviceStream>
        </Streams>
    </MTConnectStreams>"""

    def test_parses_channels(self):
        stream = parse_mtconnect_xml(self.SAMPLE_XML)
        assert stream.num_channels >= 2

    def test_extracts_values(self):
        stream = parse_mtconnect_xml(self.SAMPLE_XML)
        power = stream.get_channel("SpindlePower")
        assert power is not None
        assert power.num_samples == 3
        assert abs(power.data[0] - 5.2) < 0.01

    def test_machine_id(self):
        stream = parse_mtconnect_xml(self.SAMPLE_XML)
        assert stream.metadata.machine_id == "CNC-01"

    def test_invalid_xml(self):
        stream = parse_mtconnect_xml("not xml at all")
        assert stream.num_channels == 0

    def test_empty_xml(self):
        stream = parse_mtconnect_xml("<MTConnectStreams></MTConnectStreams>")
        assert stream.num_channels == 0


# ---------------------------------------------------------------------------
# OPC-UA Parsing
# ---------------------------------------------------------------------------

class TestOPCUAParsing:
    def test_basic_parsing(self):
        points = [
            OPCUADataPoint("ns=2;s=Spindle.Power", 5.0, 0.0),
            OPCUADataPoint("ns=2;s=Spindle.Power", 5.1, 0.001),
            OPCUADataPoint("ns=2;s=Spindle.Power", 5.2, 0.002),
            OPCUADataPoint("ns=2;s=Vib.X", 0.5, 0.0),
            OPCUADataPoint("ns=2;s=Vib.X", 0.6, 0.001),
        ]
        type_map = {
            "ns=2;s=Spindle.Power": SensorType.SPINDLE_POWER,
            "ns=2;s=Vib.X": SensorType.VIBRATION_X,
        }
        stream = parse_opcua_data(points, type_map)
        assert stream.num_channels == 2

    def test_filters_bad_status(self):
        points = [
            OPCUADataPoint("node1", 5.0, 0.0, "Good"),
            OPCUADataPoint("node1", 999.0, 0.001, "Bad"),
            OPCUADataPoint("node1", 5.1, 0.002, "Good"),
        ]
        stream = parse_opcua_data(points)
        ch = stream.get_channel("node1")
        assert ch.num_samples == 2

    def test_empty_data(self):
        stream = parse_opcua_data([])
        assert stream.num_channels == 0


# ---------------------------------------------------------------------------
# CSV Import
# ---------------------------------------------------------------------------

class TestCSVImport:
    def test_wide_format(self):
        csv_text = "time,vib_x,power\n0.0,1.0,5.0\n0.001,1.1,5.1\n0.002,1.2,5.2\n"
        stream = import_csv(csv_text)
        assert stream.num_channels == 2
        assert stream.get_channel("vib_x").num_samples == 3

    def test_long_format(self):
        csv_text = "time,channel,value\n0.0,vib_x,1.0\n0.001,vib_x,1.1\n0.0,power,5.0\n0.001,power,5.1\n"
        stream = import_csv(csv_text)
        assert stream.num_channels == 2

    def test_empty_csv(self):
        stream = import_csv("")
        assert stream.num_channels == 0

    def test_sensor_type_guessing(self):
        csv_text = "time,spindle_power,vibration_x,tool_temp\n0.0,5.0,1.0,40.0\n"
        stream = import_csv(csv_text)
        power_ch = stream.get_channel("spindle_power")
        assert power_ch.sensor_type == SensorType.SPINDLE_POWER

    def test_custom_time_column(self):
        csv_text = "timestamp,value1\n0.0,1.0\n0.001,1.1\n"
        stream = import_csv(csv_text, time_column="timestamp")
        assert stream.num_channels == 1


# ---------------------------------------------------------------------------
# Sensor Type Guessing
# ---------------------------------------------------------------------------

class TestSensorTypeGuessing:
    def test_vibration_x(self):
        assert _guess_sensor_type("vib_x") == SensorType.VIBRATION_X

    def test_power(self):
        assert _guess_sensor_type("spindle_power") == SensorType.SPINDLE_POWER

    def test_temperature(self):
        assert _guess_sensor_type("tool_temp") == SensorType.TOOL_TEMP

    def test_acoustic(self):
        assert _guess_sensor_type("ae") == SensorType.ACOUSTIC_EMISSION

    def test_unknown_defaults(self):
        assert _guess_sensor_type("unknown_sensor") == SensorType.VIBRATION_X

    def test_partial_match(self):
        assert _guess_sensor_type("my_power_sensor") == SensorType.SPINDLE_POWER


# ---------------------------------------------------------------------------
# SensorIngestion Class
# ---------------------------------------------------------------------------

class TestSensorIngestion:
    def test_ingest_csv(self):
        ingestion = SensorIngestion(default_sample_rate_hz=500.0)
        csv_text = "time,vib_x,power\n0.0,1.0,5.0\n0.001,1.1,5.1\n0.002,1.2,5.2\n"
        stream = ingestion.ingest_csv(csv_text)
        assert stream.num_channels == 2

    def test_ingest_mtconnect(self):
        ingestion = SensorIngestion()
        xml = "<MTConnectStreams><Streams><DeviceStream><ComponentStream><Samples>"
        xml += '<SpindlePower timestamp="0.0">5.0</SpindlePower>'
        xml += "</Samples></ComponentStream></DeviceStream></Streams></MTConnectStreams>"
        stream = ingestion.ingest_mtconnect(xml)
        assert stream.num_channels >= 1

    def test_ingest_opcua(self):
        ingestion = SensorIngestion()
        points = [OPCUADataPoint("node1", 5.0, 0.0), OPCUADataPoint("node1", 5.1, 0.001)]
        stream = ingestion.ingest_opcua(points)
        assert stream.num_channels == 1

    def test_normalize(self):
        ingestion = SensorIngestion()
        stream = SensorStream()
        ch = SensorChannel(SensorType.VIBRATION_X, data=np.linspace(0, 1, 100),
                           timestamps=np.linspace(0, 1, 100), sample_rate_hz=100.0)
        stream.add_channel("test", ch)
        normalized = ingestion.normalize(stream, target_rate_hz=50.0)
        assert normalized.get_channel("test").sample_rate_hz == 50.0


# ---------------------------------------------------------------------------
# Enum Completeness
# ---------------------------------------------------------------------------

class TestEnums:
    def test_sensor_types(self):
        expected = {"vibration_x", "vibration_y", "vibration_z", "spindle_power",
                    "feed_force", "cutting_force", "tool_temperature",
                    "workpiece_temperature", "coolant_temperature",
                    "acoustic_emission", "spindle_speed", "feed_rate"}
        actual = {st.value for st in SensorType}
        assert expected == actual

    def test_data_formats(self):
        expected = {"mtconnect", "opcua", "csv", "hdf5", "tdms", "simulated"}
        actual = {df.value for df in DataFormat}
        assert expected == actual
