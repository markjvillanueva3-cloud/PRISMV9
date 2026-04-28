---
id: "wedm-mcam-001"
title: "Makino DUO: G54/G55 WCS and radius list at program top"
source: "mastercam:generic_makino_4x_wire_tech_pst"
confidence: 95
category: "programming"
tags: ["wire-edm", "makino", "duo", "g54", "g92", "wcs", "radius-list", "mastercam"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.582Z
---

# Makino DUO: G54/G55 WCS and radius list at program top

Makino DUO43/DUO64 programming best practice from Mastercam X8 post (Generic Makino 4X Wire TECH.pst): always use G54/G55 work coordinate offsets rather than G92 reference setting. Additionally, declare all wire radius offsets at the top of the program as a radius list (#2001 = 0.007, etc.) so all offsets are declared once and reused — this prevents register value conflicts when the same E-code condition is used on multiple chains. G92 output for Makino DUO has not been tested and is not recommended. Using G54/G55 also enables multi-setup programs (multiple cavities) without resetting the reference between contours.

**Category:** programming
**Confidence:** 95
**Source:** mastercam:generic_makino_4x_wire_tech_pst
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[camworks-cam-tips-cw-160|Wire EDM Multi-Pass Strategy — Rough, Skim, and Finish Cuts]]
- [[topsolid-cam-tips-ts-144|TopSolid Wire EDM Multi-Pass Sequencing — Automatic Rough-Skim-Finish]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
