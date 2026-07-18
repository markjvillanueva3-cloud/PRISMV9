---
name: reference_post_ship_prism-first-part-perfect-u-spc-precontrol
description: Auto-distilled learnings from shipping PRISM-FIRST-PART-PERFECT/U-SPC-PRECONTROL (commit af1831c46). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.991Z
aliases: reference_post_ship_prism-first-part-perfect-u-spc-precontrol
---


# PRISM-FIRST-PART-PERFECT/U-SPC-PRECONTROL

[MAIN] [PRISM-FIRST-PART-PERFECT]/U-SPC-PRECONTROL (slot:foxtrot iter26) [BOOTSTRAP-SLOT-ENFORCE]: SPCPreControlEngine — live Cp/Cpk/Pp/Ppk + green/yellow/red pre-control verdict per ISO 22514-2 + AIAG SPC §2 + AS9100 §8.5.1.3 + Montgomery §6.5. Computes σ_within via R-bar/d2 (n=2, d2=1.128), σ_overall via sample stdev. Process position centered/skewed_high/skewed_low (±5% spread tolerance). Default cpk_min=1.33 (production), cpk_target=1.67 (aerospace/medical per 21 CFR Part 820 §820.250). 16/16 tests PASS. Wired prism_safety.spc_precontrol_evaluate. Closes operator-actionable quality-cost gating per AS9100.

**Shipped:** 2026-05-24T14:38:37-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[prism-first-part-perfect-u-spc-precontrol]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._