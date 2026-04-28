---
id: "wedm-mcam-003"
title: "Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out"
source: "mastercam_wire_tutorial:page18"
confidence: 89
category: "programming"
tags: ["wire-edm", "lead-in", "lead-out", "arc", "tangent", "burr", "witness-mark", "mastercam"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.607Z
---

# Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out

For Wire EDM, optimal lead configuration uses Line+Arc for lead-in and Arc+Line for lead-out. The arc motion (60-90° sweep, 0.125-0.5mm radius) creates a tangent approach/departure that minimizes witness marks and burrs at the cut start/end. The linear portion (G1) positions the wire from the thread point to the approach arc. Mastercam default: lead-in = Line and Arc, lead-out = Arc and Line, Arc radius = 0.5mm, Arc sweep = 90°. The arc segment at the part surface reduces the probability of leaving a witness mark because the wire approaches/departs tangentially rather than perpendicular.

**Category:** programming
**Confidence:** 89
**Source:** mastercam_wire_tutorial:page18
**Operations:** wire_edm

## Related
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-010|Overlap option eliminates burrs at contour start/end junction]]
- [[mastercam-cam-tips-mc-115|Lead-in/lead-out arcs prevent tool marks at entry and exit points]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
