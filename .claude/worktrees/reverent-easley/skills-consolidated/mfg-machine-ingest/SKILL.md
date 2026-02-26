---
name: mfg-machine-ingest
description: Ingest real-time sensor data from connected CNC machines for analysis
---

# Machine Data Ingestion

## When To Use
- Feeding live sensor readings (vibration, temperature, load) into PRISM for analysis
- Setting up continuous data streams from machine controllers
- Populating historical data buffers for trend analysis
- Providing raw data for chatter detection or thermal monitoring pipelines

## How To Use
```
prism_intelligence action=machine_ingest params={machine_id: "DMG-5X-01", data: {spindle_rpm: 12000, spindle_load: 45, vibration_x: 0.8, vibration_y: 1.2, coolant_temp: 22.5}, timestamp: "2026-02-23T10:30:00Z"}
```

## What It Returns
- `ingested` — confirmation of data acceptance (true/false)
- `machine_id` — machine the data was recorded for
- `timestamp` — server-side timestamp of ingestion
- `alerts` — any threshold violations triggered by this data point
- `buffer_depth` — number of data points currently in the rolling buffer

## Examples
- Ingest spindle sensor data: `machine_ingest params={machine_id: "HAAS-VF2-03", data: {spindle_rpm: 8000, spindle_load: 62, vibration_rms: 2.1}}`
- Ingest thermal sensor readings: `machine_ingest params={machine_id: "DMG-5X-01", data: {bed_temp: 24.3, spindle_temp: 38.7, ambient_temp: 21.0}}`
- Batch ingest multiple data points: `machine_ingest params={machine_id: "DMG-5X-01", batch: [{data: {...}, timestamp: "T1"}, {data: {...}, timestamp: "T2"}]}`
