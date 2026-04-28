---
id: "sc2-093"
title: "Peck Drilling with Configurable Retract and Peck Depth"
source: "web:surfcam-drilling-peck"
confidence: 89
category: "cam_strategy"
tags: ["peck-drilling", "g83", "g73", "chip-break", "retract"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.103Z
---

# Peck Drilling with Configurable Retract and Peck Depth

SURFCAM peck drilling (G83) supports configurable peck depth, retract amount, and dwell time. For standard peck drilling, set first peck to 2x drill diameter and subsequent pecks to 1x diameter, with full retract (R-plane) between pecks. For chip-break drilling (G73), use 0.1mm retract only — sufficient to break the chip without full retraction. Reduce peck depth by 20% for each subsequent peck to account for chip packing in deep holes.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-drilling-peck
**Operations:** drilling

## Related
- [[bobcad-cam-tips-bc-109|Peck Drilling with Configurable Retract Strategy]]
- [[mastercam-cam-tips-mc-157|Chip break peck patterns must be tuned to material type and hole depth ratio]]
- [[edgecam-cam-tips-ec-098|Peck Drilling Depth by Material Type]]
- [[fusion360-cam-tips-ext-f360-150|Peck Drilling Depth-to-Diameter Guidelines]]
- [[solidcam-cam-tips-sc-140|Peck Drilling Optimization — Chip Break vs Full Retract Strategies]]
