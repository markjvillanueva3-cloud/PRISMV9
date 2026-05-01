---
name: predictive-maint-guide
description: 'Predictive maintenance guide. Use when the user needs machine health monitoring, maintenance scheduling, failure prediction, or spare parts planning for CNC equipment.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
  product: Maintenance
---

# Predictive Maintenance Guide

## When to Use
- Monitoring spindle health, bearing vibration, or thermal drift
- Scheduling preventive maintenance based on usage data
- Predicting component failure before unplanned downtime
- Planning spare parts inventory based on MTBF data

## How It Works
1. Collect machine telemetry via digital twin state
2. Analyze trends via `prism_intelligence→predictive_maintenance_alert`
3. Compare against baselines via `prism_intelligence→machine_health_score`
4. Schedule maintenance via `prism_scheduling→maintenance_schedule`
5. Track compliance via cadence-weekly-maintenance hook

## Returns
- Health score per subsystem (spindle, axes, coolant, hydraulics)
- Remaining useful life (RUL) estimates with confidence bands
- Maintenance schedule with priority ranking
- Cost of downtime vs. cost of preventive action

## Example
**Input:** "Predict spindle health for Haas VF-4, 12,000 spindle hours"
**Output:** Spindle health: 78% (bearing vibration 2.1mm/s, baseline was 0.8mm/s at install). RUL: 800-1,200 hours (68% confidence). Recommendation: schedule bearing replacement in next planned downtime (~4 weeks). Estimated replacement: $4,200 + 8h labor. Unplanned failure cost: $18,000+ (spindle cartridge + rush shipping + 3-5 day downtime).
