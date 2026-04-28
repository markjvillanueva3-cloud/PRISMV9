---
id: "wedm-kb-024"
title: "Start hole positioning: 2-3mm from contour, never inside radius"
source: "handbook:mitsubishi_fa_app_notes"
confidence: 90
category: "setup"
tags: ["wire-edm", "start-hole", "threading", "lead-in", "positioning"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.570Z
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
