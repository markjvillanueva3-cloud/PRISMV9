---
name: Probe Calibration Drift Tracker
description: Track probe calibration drift and measurement system analysis
---

## When To Use
- When recording probe calibration checks for drift tracking
- When analyzing measurement system drift over time
- When performing Gauge R&R or measurement system analysis (MSA)
- When deciding if a probe needs recalibration
- NOT for CMM measurement data — use mfg-cmm-import for that

## How To Use
```
prism_intelligence action=measure_probe_record params={
  probe_id: "RENISHAW-TP200-001",
  calibration_sphere: 25.000,
  measured: 25.003,
  timestamp: "2024-02-15T08:00:00Z",
  temperature: 20.2
}

prism_intelligence action=measure_probe_drift params={
  probe_id: "RENISHAW-TP200-001",
  period: "last_90_days",
  threshold: 0.005
}
```

## What It Returns
- Drift trend over the specified period with direction
- Current offset from calibration reference
- Alert if drift exceeds specified threshold
- Temperature correlation analysis
- Recommended recalibration interval based on drift rate
- Historical calibration records

## Examples
- Input: `measure_probe_drift params={probe_id: "TP200-001", period: "last_30_days"}`
- Output: Drift +0.002mm over 30 days, linear trend, within 0.005 threshold, next cal in 45 days

- Input: `measure_probe_record params={probe_id: "TP200-001", calibration_sphere: 25.000, measured: 25.008}`
- Output: WARNING — offset 0.008mm exceeds 0.005 threshold, recommend immediate recalibration
