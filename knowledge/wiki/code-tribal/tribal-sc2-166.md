---
name: tribal-sc2-166
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "corner-strategy", "power-reduction", "corner-radius", "dwell"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-166.md
promoted_at: 2026-06-09T22:31:16.696Z
---

# SURFCAM Wire EDM Corner Strategy with Power Reduction

Sharp corners in wire EDM cause the wire to lag behind the programmed path, producing corner rounding. SURFCAM's corner strategy reduces power and feed rate approaching corners, then increases them after exit. Set corner approach distance to 2-5mm and reduce power to 60-70% of straight-cut values. For corners requiring <0.01mm radius, add a corner dwell of 0.5-1.0 seconds to allow the wire to catch up to the programmed position. Internal corners are more critical than external — the wire must reverse direction completely.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:surfcam-docs
**Operations:** wire_edm

## Related
- [[bobcad-cam-tips-bc-065|Corner Strategy with Power Reduction]]
- [[surfcam-cam-tips-sc2-059|Corner Strategies: Power Reduction and Overburn Control]]
- [[camworks-cam-tips-cw-078|Wire EDM Corner Strategy — Power Reduction and Dwell for Sharp Corners]]
- [[camworks-cam-tips-cw-164|Wire EDM Corner Strategy — Sharp Corners Without Overburn]]
- [[gibbscam-cam-tips-gc-070|Corner strategies balance accuracy versus wire lag compensation]]
