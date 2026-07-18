---
name: tribal-wedm-kb-024
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wire-edm", "start-hole", "threading", "lead-in", "positioning"]
confidence: 90
source: "handbook:mitsubishi_fa_app_notes"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-024.md
promoted_at: 2026-05-26T16:07:21.290Z
---

# Start hole positioning: 2-3mm from contour, never inside radius

Position the start (threading) hole 2-3mm from the contour, connected by a straight lead-in. NEVER place the start hole directly on the contour or inside a tight radius — the re-thread after wire break will fail because the hole diameter is only ~0.3mm larger than the wire, leaving no room for the wire guide to find the hole at an angle. For multiple contours, minimize start hole count by chaining contours with rapid moves between them.

**Category:** setup
**Confidence:** 90
**Source:** handbook:mitsubishi_fa_app_notes
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[solidcam-cam-tips-sc-137|Wire EDM Start Hole and Approach Strategy — Minimize Witness Marks]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[bobcad-cam-tips-bc-153|BobCAD Wire EDM 2-Axis Profile Cutting Fundamentals]]
- [[bobcad-cam-tips-bc-155|BobCAD Wire EDM No-Core Cutting Strategy]]
