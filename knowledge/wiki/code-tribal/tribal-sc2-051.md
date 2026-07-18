---
name: tribal-sc2-051
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["drilling", "canned-cycles", "peck", "center-drill", "turning"]
confidence: 88
source: "web:surfcam-lathe-drilling"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-051.md
promoted_at: 2026-06-09T22:31:16.672Z
---

# Turning Center Drilling with Configurable Canned Cycles

SURFCAM Lathe drilling supports spot, peck, deep-hole, tapping, and reaming canned cycles. Map each operation to the appropriate G-code cycle (G81/G83/G74/G84). For center drilling, use a 60° or 90° center drill to a depth that produces a chamfer 0.3mm larger than the subsequent drill diameter. For deep holes (L/D > 5), use G83 high-speed peck drilling with a peck depth of 1-2x drill diameter and full retract for chip evacuation.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-lathe-drilling
**Operations:** drilling, turning

## Related
- [[bobcad-cam-tips-bc-049|Center Drilling and Canned Cycle Mapping]]
- [[camworks-cam-tips-cw-069|Turning Drill Operations — Center, Peck, and Deep Hole on Lathe]]
- [[edgecam-cam-tips-ec-042|Drilling on Lathe with Center Support]]
- [[gibbscam-cam-tips-gc-059|Center drilling before through-drilling ensures positional accuracy]]
- [[sprutcam-cam-tips-spr-019|Canned Drilling Cycles Configuration]]
