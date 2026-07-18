---
name: tribal-wedm-mcam-007
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "chaining", "thread-point", "perpendicular", "approach", "break-entity", "mastercam"]
confidence: 85
source: "mastercam_wire_tutorial:page12"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-mcam-007.md
promoted_at: 2026-06-09T22:31:16.794Z
---

# Break closest entity to thread point — creates perpendicular wire approach

When chaining geometry for Wire EDM, enable 'Break closest entity to thread point' in Chaining Options. This breaks the entity closest to the thread point into two pieces so the toolpath begins with a perpendicular move. Benefits: (1) creates the shortest motion between thread point and geometry, (2) ensures a clean 90° entry into the cut, (3) prevents the wire from approaching at a shallow angle that can leave witness marks. This is especially important when the thread point is outside the stock — the perpendicular approach minimizes air-cutting distance. Disable only for No Core toolpaths where the thread point IS the start point.

**Category:** programming
**Confidence:** 85
**Source:** mastercam_wire_tutorial:page12
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-125|Open profile wire EDM cuts require extra stock and careful start/end positioning]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
