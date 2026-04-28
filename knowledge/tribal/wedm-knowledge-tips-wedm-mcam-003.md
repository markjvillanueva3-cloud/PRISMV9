---
id: "wedm-mcam-003"
title: "Makino DUO: use line-only lead-in; never arc leads on taper programs"
source: "mastercam:generic_makino_4x_wire_tech_pst"
confidence: 93
category: "programming"
tags: ["wire-edm", "makino", "duo", "lead-in", "arc-lead", "taper", "land", "chain-height", "mastercam"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.583Z
---

# Makino DUO: use line-only lead-in; never arc leads on taper programs

Makino application notes (embedded in Mastercam Makino 4X Wire TECH.pst) explicitly state: use line-only lead-in and lead-out geometry. Arc leads create compensation discontinuities at the G40→G41/G42 switch point, causing dimension errors at the entry point. For taper programs: when cutting a feature with a land (constant-height zone in a tapered profile), always set the chain height to the land height. The Makino post outputs this as the P value (program plane) and Q (opposite taper end). The P value is the reference dimension-holding surface — incorrect chain height will shift the final dimension to the wrong Z level.

**Category:** programming
**Confidence:** 93
**Source:** mastercam:generic_makino_4x_wire_tech_pst
**Operations:** wire_edm

## Related
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-010|Overlap option eliminates burrs at contour start/end junction]]
- [[mastercam-cam-tips-mc-115|Lead-in/lead-out arcs prevent tool marks at entry and exit points]]
- [[gibbscam-cam-tips-gc-063|2-axis wire EDM uses automatic lead-in to prevent witness marks on part]]
