---
id: "esp-165"
title: "B-Axis PrimeTurning for Reverse-Direction Cutting"
source: "web:esprit-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["b-axis", "primeturning", "reverse-cutting", "chip-thinning", "sandvik"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.602Z
---

# B-Axis PrimeTurning for Reverse-Direction Cutting

ESPRIT supports B-axis PrimeTurning (Sandvik concept) where the tool enters at the chuck and cuts toward the tailstock — the reverse of conventional turning. The B-axis orients the insert at a negative entering angle (typically -25° to -30°). Benefits: 2-3x higher feed rates due to chip thinning, better chip control (chips flow away from the finished surface), and reduced radial force on slender parts. Program in ESPRIT under Turning → Strategy → PrimeTurning with B-axis angle, DOC, and the special CoroTurn Prime A/B insert geometries. Requires a machine with B-axis travel below -20°.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:esprit-forum
**Operations:** turning_roughing, turning_finishing

## Related
- [[controller-knowledge-tips-ctrl-114|Star swiss lathe Fanuc variant with NC Assist and B-axis]]
- [[edgecam-cam-tips-ec-047|Live Tooling Strategy for Mill-Turn Machines]]
- [[edgecam-cam-tips-ec-149|B-Axis Turning for Complex Contour Interpolation]]
- [[edgecam-cam-tips-ec-150|B-Axis Insert Clearance Angle Optimization]]
- [[edgecam-cam-tips-ec-151|B-Axis Prime Turning for Bi-Directional Cutting]]
