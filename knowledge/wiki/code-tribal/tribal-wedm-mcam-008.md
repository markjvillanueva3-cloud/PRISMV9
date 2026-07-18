---
name: tribal-wedm-mcam-008
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "leadout", "maximum-leadout", "efficiency", "air-cutting", "mastercam"]
confidence: 82
source: "mastercam_wire_tutorial:page18"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-mcam-008.md
promoted_at: 2026-06-09T22:31:16.794Z
---

# Maximum leadout shortens travel from contour end to cut point

The Maximum Leadout option in Mastercam Wire shortens the lead-out move instead of forcing the wire to travel the full distance from contour end to cut point. Set a maximum distance (e.g., 0.3mm) — the lead-out will be truncated if it would exceed this length. Use when: (1) thread point is far from contour geometry, (2) multiple contours share a common thread point region, (3) minimizing air-cutting time is critical. Do NOT use maximum leadout on critical tolerance features where full lead-out is needed for dimensional accuracy. The shortened lead-out can cause slight dimensional variation at the cut completion point.

**Category:** programming
**Confidence:** 82
**Source:** mastercam_wire_tutorial:page18
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
