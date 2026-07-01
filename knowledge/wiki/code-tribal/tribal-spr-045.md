---
name: tribal-spr-045
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["css", "constant-surface-speed", "profiling", "g96"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-045.md
promoted_at: 2026-06-09T22:31:16.629Z
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
