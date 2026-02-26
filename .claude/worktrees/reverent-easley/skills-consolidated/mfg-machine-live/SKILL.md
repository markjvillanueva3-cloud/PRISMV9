---
name: mfg-machine-live
description: Get real-time machine status and monitoring data from connected CNC machines
---

# Live Machine Status

## When To Use
- Checking the current state of a specific connected machine (idle, running, alarm)
- Getting a dashboard view of all connected machines on the shop floor
- Monitoring spindle load, feed rate, and program execution in real time
- Verifying a machine is ready before sending a new program

## How To Use
```
prism_intelligence action=machine_live_status params={machine_id: "DMG-5X-01"}
prism_intelligence action=machine_all_status params={}
```

## What It Returns
- `machine_id` — identifier of the queried machine
- `state` — operational state (running, idle, alarm, offline)
- `program` — currently loaded/running program name and line number
- `spindle` — RPM, load percentage, and temperature
- `axes` — current positions and feed rates for all axes
- `alarms` — any active alarm codes

## Examples
- Check one machine: `machine_live_status params={machine_id: "HAAS-VF2-03"}`
- View entire shop floor: `machine_all_status params={}`
- Check machine before job start: `machine_live_status params={machine_id: "DMG-5X-01", include_program: true}`
