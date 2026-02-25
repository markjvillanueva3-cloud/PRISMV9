---
name: mfg-thermal-monitor
description: Track thermal conditions and thermal growth in real-time during machining
---

# Thermal Monitoring

## When To Use
- Tracking spindle, bed, and ambient temperature during precision operations
- Detecting thermal drift that could affect dimensional accuracy
- Monitoring coolant temperature effectiveness during long production runs
- Triggering thermal compensation adjustments based on live data

## How To Use
```
prism_intelligence action=thermal_update params={machine_id: "DMG-5X-01", readings: {spindle_temp: 38.5, bed_temp: 24.1, ambient_temp: 21.0, coolant_temp: 19.8}}
prism_intelligence action=thermal_status params={machine_id: "DMG-5X-01"}
```

## What It Returns
- `machine_id` — machine being monitored
- `thermal_state` — overall thermal condition (stable, warming, drifting, critical)
- `temperatures` — current readings for all monitored points
- `drift_estimate_um` — estimated thermal growth in micrometers per axis
- `compensation_active` — whether thermal compensation is currently applied
- `time_to_stable` — estimated minutes until thermal equilibrium

## Examples
- Update thermal readings: `thermal_update params={machine_id: "HAAS-VF2-03", readings: {spindle_temp: 42.0, bed_temp: 25.5}}`
- Check thermal status before precision work: `thermal_status params={machine_id: "DMG-5X-01"}`
- Monitor with alert thresholds: `thermal_status params={machine_id: "DMG-5X-01", alert_threshold_C: 45.0}`
