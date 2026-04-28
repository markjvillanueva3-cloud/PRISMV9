---
id: "esp-135"
title: "Swiss-Type Bar Feed and Remnant Management"
source: "web:esprit-docs"
confidence: 0.86
category: "setup"
tags: ["swiss-type", "bar-feed", "remnant", "production", "part-counting"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.565Z
---

# Swiss-Type Bar Feed and Remnant Management

ESPRIT's bar feed management automates the end-of-bar sequence for Swiss-type production. Configure under Machine Setup → Bar Feeder: bar length, remnant length (minimum usable stub, typically 40-80mm), and end-of-bar detection method (mechanical pusher position or proximity sensor). When the remaining bar length is less than part length + cutoff width + remnant, ESPRIT inserts the bar-change macro (M99 + bar-feed codes). For high-volume production, enable automatic part counting with M-code output for the parts catcher.

**Category:** setup
**Confidence:** 0.86
**Source:** web:esprit-docs
**Operations:** turning_cutoff

## Related
- [[bobcad-cam-tips-bc-167|BobCAD Swiss-Type Lathe Programming with Guide Bushing]]
- [[bobcad-cam-tips-bc-174|BobCAD Swiss-Type Bar End Detection and Remnant Management]]
- [[camworks-cam-tips-cw-170|Swiss-Type Bar Remnant Management — Material Yield Optimization]]
- [[esprit-cam-tips-esp-130|Guide Bushing Compensation for Swiss-Type Z-Axis]]
- [[solidcam-cam-tips-sc-085|Swiss-Type Bar Feeder — Automatic Remnant Length Calculation]]
