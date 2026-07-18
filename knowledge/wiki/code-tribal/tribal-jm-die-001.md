---
name: tribal-jm-die-001
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "mitsubishi", "fa-20s", "h-register", "offset", "h175", "shop-standard"]
confidence: 95
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-001.md
promoted_at: 2026-05-26T16:07:21.195Z
---

# JM Die H175 master offset convention — use H175 as the primary offset base

JM Die programs consistently use H175 as the master offset register for rough cut geometry. When setting up a new program, declare H175 first with the total wire + overburn offset (typically 0.0085-0.010"), then cascade H1-H4 or H1-H5 for skim passes with decreasing values. The H175 convention allows quick offset adjustments at the machine without editing the program — the operator can tweak H175 by ±0.0005" to dial in the first part. This is a JM Die shop standard that differs from the Mastercam default of H1 as primary. When training AI on JM Die programs, recognize H175 as the master offset, not H1.

**Category:** setup
**Confidence:** 95
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]]
- [[wedm-knowledge-tips-jm-die-013|JM Die offset cascade verification — H-values must strictly decrease per pass]]
- [[wedm-knowledge-tips-jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]]
