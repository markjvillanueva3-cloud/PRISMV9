---
name: tribal-wedm-mcam-010
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "overlap", "burr", "junction", "finish", "witness-mark", "mastercam"]
confidence: 86
source: "mastercam_wire_tutorial:page28"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-mcam-010.md
promoted_at: 2026-06-09T22:31:16.795Z
---

# Overlap option eliminates burrs at contour start/end junction

The Overlap option in Mastercam Wire extends the toolpath slightly past the start point to eliminate potential burrs where the cut begins and ends. Typical overlap: 0.02mm (0.0008"). The wire cuts past the starting point, then retracts — this ensures the junction is fully cleaned. Without overlap, a small witness line or burr can remain where the first and last discharge craters meet. Use overlap on: precision die profiles, punch inserts, any feature with cosmetic requirements. Do NOT use overlap on no-core toolpaths (creates double-cut at start). The overlap motion uses skim pass power settings, not rough.

**Category:** programming
**Confidence:** 86
**Source:** mastercam_wire_tutorial:page28
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
