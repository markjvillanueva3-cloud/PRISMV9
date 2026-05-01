---
name: digital-twin-setup
description: 'Digital twin setup and configuration. Use when the user needs real-time machine monitoring, virtual commissioning, or digital representation of CNC equipment and processes.'
license: MIT
metadata:
  author: PRISM
  version: "1.0.0"
---

# Digital Twin Setup Guide

## When to Use
- Setting up real-time machine state monitoring
- Virtual commissioning before running on actual hardware
- Tracking machine health, spindle hours, and axis backlash over time
- Connecting MTConnect/OPC-UA data feeds to PRISM

## How It Works
1. Register machine via `prism_data→machine_search` (1,016 machines)
2. Configure digital twin state via `prism_intelligence→digital_twin_state`
3. Set up health monitoring via cadence-hourly-machine-health hook
4. Enable predictive maintenance via `prism_intelligence→predictive_maintenance_alert`

## Returns
- Real-time machine state (idle/running/alarm/maintenance)
- Spindle hours, axis travel counters, temperature trends
- Predictive maintenance alerts with confidence scores
- Historical utilization and OEE data

## Example
**Input:** "Set up digital twin for Haas VF-2 serial HV2-12345"
**Output:** Twin created: Haas VF-2 (HV2-12345), spindle 15,000 RPM max, 22.4kW, X=762 Y=508 Z=635mm travel. Current: 4,230 spindle hours, next service at 5,000h. Health: 94% (slight vibration increase on Y-axis bearing).
