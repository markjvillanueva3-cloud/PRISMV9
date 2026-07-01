---
name: tribal-mc-118
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "wire-edm", "2-axis", "lead-in", "witness-mark", "profile"]
confidence: 86
source: "web:mastercam-docs"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-118.md
promoted_at: 2026-06-09T22:31:16.424Z
---

# 2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part

In Mastercam Wire, always define a lead-in move that starts on scrap material and transitions tangentially onto the cut profile. A straight perpendicular lead-in leaves a small pip or witness mark at the entry point. Use a tangential arc lead-in (radius 0.5–2.0 mm) starting from the threading hole to blend smoothly onto the contour. For closed profiles, place the lead-in at a non-critical location such as a corner or blend radius where a slight mark is acceptable. The lead-in length should be at least 2× the wire diameter to allow the control to stabilize wire tension before reaching the part geometry.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:mastercam-docs
**Operations:** wire_edm, contouring

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[esprit-cam-tips-esp-051|Wire EDM 2-Axis Profile with Automatic Lead Placement]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
- [[mastercam-cam-tips-mc-115|Lead-in/lead-out arcs prevent tool marks at entry and exit points]]
