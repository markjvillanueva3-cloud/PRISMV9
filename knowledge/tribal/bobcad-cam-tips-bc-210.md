---
id: "bc-210"
title: "BobCAD Dynamic Machining Helical vs Ramp Entry Selection"
source: "web:bobcad-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["dynamic-machining", "helical-entry", "ramp-entry", "pocket-width", "auto-select"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.621Z
---

# BobCAD Dynamic Machining Helical vs Ramp Entry Selection

BobCAD's Dynamic Machining offers helical and linear ramp entries. Use helical entry when the pocket width >2.5x tool diameter — the circular motion distributes entry forces evenly. Use linear ramp when the pocket is narrow (<2.5xD) or long and narrow (slots). Set the helix angle to 2-5° for soft materials, 1-2° for hardened steel. For linear ramps, use 1-3° angle. BobCAD automatically selects the entry method based on pocket geometry when set to 'Auto'. Override to 'Helical' for deep pockets where the ramp would require too many zigzags, causing excessive dwell marks.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** roughing, pocketing

## Related
- [[bobcad-cam-tips-bc-129|BobCAD V36 Dynamic Machining Maintains Constant Chip Load]]
- [[bobcad-cam-tips-bc-193|BobCAD Dynamic Machining for Hardened Steel 48-62 HRC]]
- [[bobcad-cam-tips-bc-209|BobCAD Adaptive Feed in Dynamic Machining for Variable Stock]]
- [[bobcad-cam-tips-bc-211|BobCAD Dynamic Machining Comparison with Conventional Roughing]]
- [[bobcad-cam-tips-bc-196|BobCAD Helical Entry for Hardened Material Pockets]]
