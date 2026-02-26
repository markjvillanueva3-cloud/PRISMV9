---
name: Failure Diagnosis Engine
description: Diagnose manufacturing failures from symptoms using knowledge base
---

## When To Use
- When a part fails inspection and you need root cause analysis
- When tools are breaking or wearing prematurely
- When surface finish is out of spec and you need to know why
- When chatter marks appear and you need the cause
- NOT for alarm code lookup — use mfg-alarm-decode for CNC alarms

## How To Use
```
prism_intelligence action=failure_diagnose params={
  symptoms: ["poor surface finish", "chatter marks at 45deg"],
  operation: "face_milling",
  material: "304SS",
  tool: "4-flute 20mm endmill",
  conditions: {
    speed_rpm: 3000,
    feed_mmpm: 800,
    doc: 2.0,
    woc: 15
  }
}
```

## What It Returns
- Ranked list of probable causes with confidence percentage
- Root cause analysis linking symptoms to parameters
- Recommended corrective actions in priority order
- Parameter adjustments with specific new values
- Similar historical cases from the knowledge base

## Examples
- Input: `failure_diagnose params={symptoms: ["tool breakage after 5 min", "blue chips"], material: "Ti-6Al-4V"}`
- Output: 85% heat buildup (speed too high), reduce Vc from 60 to 45 m/min, check coolant pressure

- Input: `failure_diagnose params={symptoms: ["taper on bore", "oversized diameter"], operation: "boring"}`
- Output: 70% tool deflection (L/D too high), switch to damped boring bar, reduce DOC to 0.3mm
