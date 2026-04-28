---
id: "spr-045"
title: "Profiling with Constant Surface Speed"
source: "web:sprutcam-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["css", "constant-surface-speed", "profiling", "g96"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.881Z
---

# Profiling with Constant Surface Speed

For OD/ID profiling on lathes, enable CSS (Constant Surface Speed) mode. SprutCAM programs G96 with the specified surface speed — the controller automatically adjusts RPM as the diameter changes. Set maximum RPM limit (G50) to prevent spindle overspeed on small diameters. CSS produces consistent surface finish across varying diameters. Switch to constant RPM (G97) for threading and grooving.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:sprutcam-docs
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-047|Face Turning with CSS and Max RPM Control]]
- [[camworks-cam-tips-cw-067|Facing — Optimize Feed Direction and Constant Surface Speed]]
- [[catia-cam-tips-cat-039|Face Turning Constant Surface Speed for Uniform Finish]]
- [[catia-cam-tips-cat-157|CATIA Lathe Constant Surface Speed Programming Limits]]
- [[edgecam-cam-tips-ec-041|Turning Face Cycle with Constant Surface Speed]]
