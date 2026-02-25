---
name: Machine Crash Analysis
description: Determine sequence of events leading to crash and preventive measures
---

## When To Use
- A machine crash has occurred and you need to understand the chain of events
- Investigating near-miss incidents to prevent future crashes
- Documenting crash root cause for corrective action reports
- Evaluating whether a crash was caused by program, setup, or operator error

## How To Use
```
prism_intelligence action=forensic_crash params={
  crash_description: "Tool plunged into fixture during rapid move to Z0, broke 20mm endmill and gouged vise jaw",
  machine: "Haas VF-2",
  program_context: "After tool change to T5, G0 X0 Y0 Z0 with no safe Z retract",
  alarms_triggered: ["SERVO ALARM 410", "OVERLOAD Z-AXIS"],
  damage_observed: "broken tool, 3mm gouge in vise, possible spindle bearing damage"
}
```

## What It Returns
- Reconstructed sequence of events leading to the crash
- Root cause classification (programming, setup, mechanical, operator)
- Damage assessment and inspection recommendations
- Preventive measures to avoid recurrence
- Checklist for post-crash machine verification

## Examples
- Input: `forensic_crash params={ crash_description: "spindle collision with rotary table during 5-axis move", machine: "DMG MORI DMU 50" }`
- Output: Likely RTCP error or WCS offset mismatch; check fixture offset, tool length, and RTCP calibration

- Input: `forensic_crash params={ crash_description: "tool broke on first plunge, drill hit clamp", alarms_triggered: ["OVERLOAD SPINDLE"] }`
- Output: Fixture clamp in toolpath; verify clearance plane height and clamp positions in CAM simulation
