---
id: "nx-079"
title: "Centerline Drilling with Controlled Peck Depth Reduction"
source: "web:siemens-nx-docs"
confidence: 86
category: "cam_strategy"
tags: ["siemens-nx", "centerline-drilling", "peck-depth", "deep-hole", "chip-evacuation"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.383Z
---

# Centerline Drilling with Controlled Peck Depth Reduction

In NX Centerline Drilling, enable progressive peck depth reduction for deep holes (L/D > 5) by setting the First Peck to 3x diameter and the Reduction Factor to 0.7. NX automatically shortens each subsequent peck to account for increasing chip evacuation difficulty. Set the dwell time to 0.5 seconds at full depth for spot-facing operations. Use the Minimum Peck parameter (typically 0.5 mm) to prevent excessively short pecks near the bottom that produce no meaningful chip breakage.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** drilling, turning

## Related
- [[mastercam-cam-tips-mc-163|Peck depth optimization balances chip evacuation time against total drill cycle time]]
- [[camworks-cam-tips-cw-099|Peck Drilling — Deep Hole Chip Evacuation with Full Retract]]
- [[edgecam-cam-tips-ec-159|BTA Drilling Programming for Large Diameter Deep Holes]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[gibbscam-cam-tips-gc-149|Swiss-type low-pressure coolant nozzle positioning affects chip evacuation in deep bores]]
