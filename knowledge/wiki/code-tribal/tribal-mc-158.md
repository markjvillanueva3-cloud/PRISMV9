---
name: tribal-mc-158
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "spot-drill", "center-drill", "angled-surface", "pilot", "drill-walking"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-158.md
promoted_at: 2026-06-09T22:31:16.434Z
---

# Spot and center drill strategy prevents drill walking on angled or curved entry surfaces

Before drilling, always program a spot drill or center drill operation in Mastercam to create a pilot divot that guides the twist drill. For flat surfaces, a 90° spot drill at depth = 0.2× hole diameter is sufficient. For angled surfaces (up to 10°), use a rigid center drill (60° point) at depth = 0.3× diameter and reduce feed by 30%. For surfaces angled >10°, first create a flat spot using a flat end mill pocket or facing operation, then spot drill. In Mastercam, use the Solid Hole Recognition to automatically detect all holes and assign spot drill operations based on entry surface angle. Set the spot drill diameter 1–2 mm larger than the twist drill to create a stable cone that centers the drill. For countersunk holes, the spot drill can also serve as the countersink if the angle matches (82° or 90°).

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community
**Operations:** drilling, hole_making

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[catia-cam-tips-cat-111|Center Drilling vs Spot Drilling Selection Criteria]]
- [[camworks-cam-tips-cw-098|Center Drilling — Short Rigid Pilot for Deep Holes]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
