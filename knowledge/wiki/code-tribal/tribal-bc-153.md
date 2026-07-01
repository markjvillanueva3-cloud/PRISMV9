---
name: tribal-bc-153
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["wire-edm", "2-axis", "profile-cutting", "wire-offset", "lead-in"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-153.md
promoted_at: 2026-06-09T22:31:15.969Z
---

# BobCAD Wire EDM 2-Axis Profile Cutting Fundamentals

BobCAD's Wire EDM module programs 2-axis profile cutting from wireframe geometry. Select the cutting profile, define the start hole location, and set the wire offset direction (left/right of profile). BobCAD generates lead-in/lead-out moves, threading sequences, and multi-pass skim cut offsets. Set the initial wire offset based on the cutting technology table for your wire diameter (typically 0.25mm brass wire). The offset includes the wire radius plus the spark gap (0.01-0.03mm per side). Always program a lead-in arc (90° minimum) to establish stable cutting before the profile begins.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[esprit-cam-tips-esp-051|Wire EDM 2-Axis Profile with Automatic Lead Placement]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
