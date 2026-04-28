---
id: "wedm-mcam-002"
title: "Makino DUO: M17 compound code replaces separate thread/tank/flush sequence"
source: "mastercam:generic_makino_4x_wire_tech_pst"
confidence: 92
category: "programming"
tags: ["wire-edm", "makino", "duo", "m17", "m58", "tank", "threading", "m-code", "controller"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.582Z
---

# Makino DUO: M17 compound code replaces separate thread/tank/flush sequence

On Makino DUO machines, M17 is a compound system code that simultaneously powers on, threads the wire, fills the tank, and activates flushing. It replaces the multi-step M06+M07 or Mitsubishi-style M78+M80+M82+M84 sequences. After cutting, M58 drains the tank. The Mastercam Makino post outputs M17 after each thread point automatically. Adding Mitsubishi-style M78/M80/M82/M84 blocks to a Makino program will cause a control alarm. Likewise, never use the Makino M17 on a Mitsubishi FA machine — it is not a Mitsubishi standard code.

**Category:** programming
**Confidence:** 92
**Source:** mastercam:generic_makino_4x_wire_tech_pst
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-mcam-008|Maximum leadout shortens travel from contour end to cut point]]
- [[mastercam-cam-tips-mc-118|2-axis wire EDM profile cuts require proper lead-in to avoid witness marks on the part]]
