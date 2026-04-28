---
id: "bc-060"
title: "Bar Feeder Integration for Lights-Out Production"
source: "web:bobcad-bar-feeder"
confidence: 87
category: "cam_strategy"
tags: ["bar-feeder", "lights-out", "continuous-production", "part-counter"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.504Z
---

# Bar Feeder Integration for Lights-Out Production

BobCAD bar feeder programming includes the bar advance, clamp, and part-off sequence for continuous production. Program the bar advance distance (part length + cut-off width + face stock). Set the bar remnant length (minimum remaining bar before requesting a new bar). BobCAD outputs the bar feeder M-codes at the correct program locations. For lights-out operation, include part counter macros and tool life monitoring with automatic program stop when tool change is needed.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-bar-feeder
**Operations:** mill_turn

## Related
- [[edgecam-cam-tips-ec-195|Bar Feeder Integration with Part Counter]]
- [[edgecam-cam-tips-ec-197|Bar Feeder Lights-Out Operation Safety Programming]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[catia-cam-tips-cat-156|CATIA Lathe Sub-Spindle Transfer and Bar-Feeder Programming]]
- [[edgecam-cam-tips-ec-196|Bar Feeder Facing Stock Optimization]]
