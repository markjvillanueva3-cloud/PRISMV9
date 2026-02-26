---
name: mfg-tool-wear-monitor
description: Track tool wear progression in real-time during machining operations
---

# Tool Wear Monitoring

## When To Use
- Starting wear tracking when a new tool is loaded into the spindle
- Updating wear state with live cutting data (force, power, time)
- Checking remaining tool life before starting the next operation
- Deciding when to index an insert or replace a worn tool

## How To Use
```
prism_intelligence action=tool_wear_start params={machine_id: "DMG-5X-01", tool_id: "T12", tool_type: "carbide endmill", diameter: 12, expected_life_min: 45}
prism_intelligence action=tool_wear_update params={machine_id: "DMG-5X-01", tool_id: "T12", cutting_time_s: 120, avg_force_N: 350}
prism_intelligence action=tool_wear_status params={machine_id: "DMG-5X-01", tool_id: "T12"}
```

## What It Returns
- `tool_id` — identifier of the monitored tool
- `wear_percent` — estimated percentage of tool life consumed
- `remaining_life_min` — estimated remaining useful life in minutes
- `wear_zone` — current wear zone (green/yellow/red)
- `flank_wear_mm` — estimated flank wear in millimeters

## Examples
- Start tracking a new endmill: `tool_wear_start params={machine_id: "HAAS-VF2-03", tool_id: "T05", tool_type: "carbide endmill", diameter: 10}`
- Update after a cutting pass: `tool_wear_update params={machine_id: "HAAS-VF2-03", tool_id: "T05", cutting_time_s: 90, avg_power_kW: 3.2}`
- Check if tool is still good: `tool_wear_status params={machine_id: "HAAS-VF2-03", tool_id: "T05"}`
