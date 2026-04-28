---
id: "wedm-mcam-002"
title: "Reverse cutting method eliminates re-threading between passes"
source: "mastercam_wire_tutorial:page16"
confidence: 88
category: "machining"
tags: ["wire-edm", "reverse-cut", "cutting-method", "re-thread", "efficiency", "mastercam"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.606Z
---

# Reverse cutting method eliminates re-threading between passes

Instead of cutting in one direction, re-threading the wire, and cutting the next pass, the Reverse cutting method makes the wire reverse direction at the end of each pass. After Pass 1 completes, the wire cuts Pass 2 going in the opposite direction, then Pass 3 reverses again, etc. Benefits: (1) eliminates re-thread time between passes — saves 30-60 seconds per pass, (2) reduces wire break risk from re-threading through debris, (3) maintains consistent finish by alternating direction wear. In Mastercam Wire, set Cutting method = Reverse in the Cut Parameters page. Use for parts with simple contours where direction reversal doesn't create quality issues.

**Category:** machining
**Confidence:** 88
**Source:** mastercam_wire_tutorial:page16
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-mcam-008|Maximum leadout shortens travel from contour end to cut point]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
