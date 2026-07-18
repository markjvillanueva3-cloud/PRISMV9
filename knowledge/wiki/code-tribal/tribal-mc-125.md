---
name: tribal-mc-125
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "open-profile", "approach", "submerged", "thin-stock"]
confidence: 83
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-125.md
promoted_at: 2026-06-09T22:31:16.426Z
---

# Open profile wire EDM cuts require extra stock and careful start/end positioning

Open profile wire EDM (where the wire enters from one edge and exits another) eliminates the need for start holes but introduces unique challenges. In Mastercam Wire, extend the cut path 2–5 mm beyond the part edges to ensure the wire fully clears the workpiece before stopping. The approach move must include a straight lead-in segment long enough for the wire to stabilize (minimum 3 mm in the approach material). Without sealed flushing on open profiles, submerged cutting is strongly recommended. Program the wire path direction so that the slug (waste side) faces upward on vertical cuts, allowing gravity to pull it away from the wire. For open profiles on thin stock (<5 mm), reduce wire tension by 20% to prevent workpiece deflection.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-mcam-007|Break closest entity to thread point — creates perpendicular wire approach]]
