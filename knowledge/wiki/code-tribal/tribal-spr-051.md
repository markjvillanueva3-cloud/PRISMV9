---
name: tribal-spr-051
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["boring", "precision", "finish-boring", "spring-pass"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-051.md
promoted_at: 2026-06-09T22:31:16.630Z
---

# Boring Cycle for Precision Internal Features

SprutCAM's boring cycle supports: rough boring (G85), finish boring with orient spindle stop (G76), and fine boring (G87). For precision bores (IT6-IT7), use finish boring with spring pass: advance to depth, dwell 0.5s, orient spindle, retract at shifted position to avoid drag mark. Set boring bar deflection compensation in the tool offset — cantilever deflection = FL³/3EI.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:sprutcam-docs
**Operations:** turning

## Related
- [[sprutcam-cam-tips-spr-180|Boring Cycle with Spring Pass]]
- [[camworks-cam-tips-cw-103|Boring — Single-Point Precision for Interpolated Holes]]
- [[catia-cam-tips-cat-115|Boring Cycle for Precision Hole Diameter and Position]]
- [[edgecam-cam-tips-ec-100|Bore Cycle with Dwell and Feed-Out]]
- [[esprit-cam-tips-esp-083|Boring Cycle for Precision Hole Finishing]]
