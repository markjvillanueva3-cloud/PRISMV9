---
name: mfg-maint-trend
description: Detect degradation trends from sensor and performance data
---

# Maintenance Trend Detector

## When To Use
- Monitoring a machine over time for gradual performance degradation
- Checking if vibration, temperature, or accuracy is trending toward failure
- Comparing current trends against baseline or historical patterns
- Establishing early warning indicators before critical failure occurs

## How To Use
```
prism_intelligence action=maint_trend params={machine_id: "HAAS-VF2-03", metric: "spindle_vibration", window: "90_days"}
```

## What It Returns
- `trend_direction` — increasing, decreasing, or stable with rate of change
- `trend_slope` — numeric degradation rate (units/day)
- `projected_threshold_date` — estimated date when alarm threshold will be reached
- `baseline_deviation` — percentage deviation from original baseline
- `data_points` — summary of data points used in trend calculation

## Examples
- Track spindle vibration trend: `maint_trend params={machine_id: "HAAS-VF2-03", metric: "spindle_vibration", window: "90_days"}` — returns increasing trend at 0.003 mm/s per week, projected threshold breach in 45 days
- Monitor axis backlash: `maint_trend params={machine_id: "DMG-5X-01", metric: "x_axis_backlash", window: "180_days"}` — returns stable at 0.008mm, 12% above baseline, no immediate concern
- Check coolant degradation: `maint_trend params={machine_id: "MORI-NLX-02", metric: "coolant_concentration", window: "30_days"}` — returns decreasing trend, concentration dropping from 8% to 5.2%, recommend top-up within 5 days
