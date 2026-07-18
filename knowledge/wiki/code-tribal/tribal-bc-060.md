---
name: tribal-bc-060
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bar-feeder", "lights-out", "continuous-production", "part-counter"]
confidence: 87
source: "web:bobcad-bar-feeder"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-060.md
promoted_at: 2026-06-09T22:31:15.947Z
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
