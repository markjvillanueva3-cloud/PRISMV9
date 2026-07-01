---
name: tribal-bc-049
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["drilling", "canned-cycles", "peck-tapping", "center-drill", "v37"]
confidence: 89
source: "web:bobcad-turning-drilling"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-049.md
promoted_at: 2026-06-09T22:31:15.943Z
---

# Center Drilling and Canned Cycle Mapping

BobCAD turning drilling supports spot, peck, deep-hole, tapping, and reaming canned cycles with automatic G-code mapping (G81/G83/G74/G84). For center drilling, use 90° center drill to depth producing 0.3mm chamfer beyond subsequent drill diameter. For deep holes (L/D > 5), use G83 high-speed peck with 1-2x diameter peck depth and full retract. BobCAD V37 enhanced peck tapping supports Fanuc, Siemens, Heidenhain, and Haas without custom scripts.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:bobcad-turning-drilling
**Operations:** drilling, tapping

## Related
- [[surfcam-cam-tips-sc2-051|Turning Center Drilling with Configurable Canned Cycles]]
- [[bobcad-cam-tips-bc-089|Canned Cycle Output for Standard and Custom Cycles]]
- [[camworks-cam-tips-cw-087|Canned Cycle Output — Map Operations to Controller Drill Cycles]]
- [[camworks-cam-tips-cw-098|Center Drilling — Short Rigid Pilot for Deep Holes]]
- [[catia-cam-tips-cat-111|Center Drilling vs Spot Drilling Selection Criteria]]
