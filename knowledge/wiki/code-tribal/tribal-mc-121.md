---
name: tribal-mc-121
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "flushing", "wire-deflection", "submerged-cutting", "pressure"]
confidence: 84
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-121.md
promoted_at: 2026-06-09T22:31:16.425Z
---

# Wire EDM flushing pressure must be balanced to prevent wire deflection and breakage

Flushing in wire EDM removes eroded particles from the spark gap. In Mastercam Wire, flush settings (upper and lower nozzle pressure) are defined per operation. High flush pressure improves cutting speed but can deflect the wire, causing taper errors on tall parts. For workpieces over 80 mm thick, reduce flush pressure by 30–40% and compensate with slower feed. When cutting open profiles where flush cannot be sealed (no material on one side of the wire), switch to submerged cutting mode where the entire workpiece is underwater — this provides uniform cooling without directional flush pressure. Always reduce flush at corners to prevent wire push-off that rounds sharp internal corners.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:community
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
