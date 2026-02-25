---
name: mfg-maint-analyze
description: Analyze machine health data for maintenance decisions
---

# Maintenance Analysis Engine

## When To Use
- Evaluating current machine health status from sensor or performance data
- Deciding whether a machine needs immediate, scheduled, or no maintenance
- Investigating unusual vibration, temperature, or accuracy readings
- Post-incident analysis of what led to a machine failure

## How To Use
```
prism_intelligence action=maint_analyze params={machine_id: "DMG-5X-01", data_source: "vibration", timeframe: "last_30_days"}
```

## What It Returns
- `health_score` — overall machine health rating (0-100, where 100 is perfect)
- `component_status` — per-component health breakdown (spindle, axes, coolant, etc.)
- `anomalies` — detected anomalies with severity and timestamp
- `recommendation` — maintenance action recommendation (none/monitor/schedule/urgent)
- `confidence` — confidence level of the analysis based on data quality

## Examples
- Analyze spindle health: `maint_analyze params={machine_id: "DMG-5X-01", data_source: "vibration"}` — returns health_score 73, spindle bearing showing 0.12mm/s vibration increase over 30 days
- Full machine health check: `maint_analyze params={machine_id: "HAAS-VF2-03", data_source: "all"}` — returns component breakdown: spindle 88, X-axis 95, Y-axis 91, Z-axis 67 (Z ballscrew wear detected)
- Analyze after accuracy drift: `maint_analyze params={machine_id: "MORI-NLX-02", data_source: "accuracy", timeframe: "last_7_days"}` — returns 0.015mm positional drift on X-axis, recommend geometric compensation check
