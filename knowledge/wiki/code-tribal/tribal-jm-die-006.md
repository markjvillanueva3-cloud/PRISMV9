---
name: tribal-jm-die-006
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "m01", "optional-stop", "glue-tab", "slug-drop", "mitsubishi"]
confidence: 88
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-006.md
promoted_at: 2026-06-09T22:31:16.783Z
---

# JM Die glue stop convention — M01 before tab burn-out points

JM Die uses M01 (optional stop) at strategic points in wire EDM programs for operator intervention, typically: (1) before burning out glue tabs (allows operator to reduce tank level and position catch tray), (2) at major slug drop points where manual extraction is needed, (3) before final skim on critical tolerance features. The M01 is optional stop, not M00 mandatory stop — this allows unattended runs when the operator cycles 'optional stop OFF' on the controller. During setup runs, keep optional stop ON; for production runs, turn it OFF for continuous cutting.

**Category:** setup
**Confidence:** 88
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
- [[wedm-knowledge-tips-jm-die-005|JM Die Mitsubishi FA startup sequence — M78-M80-M82-M84 then M20]]
- [[wedm-knowledge-tips-jm-die-014|JM Die M90/M91 adaptive control — enable for rough cuts, disable for final skim]]
