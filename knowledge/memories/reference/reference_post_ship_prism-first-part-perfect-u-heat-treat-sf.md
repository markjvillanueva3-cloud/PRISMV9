---
name: reference_post_ship_prism-first-part-perfect-u-heat-treat-sf
description: Auto-distilled learnings from shipping PRISM-FIRST-PART-PERFECT/U-HEAT-TREAT-SF (commit 46b8140bc). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.668Z
aliases: reference_post_ship_prism-first-part-perfect-u-heat-treat-sf
---


# PRISM-FIRST-PART-PERFECT/U-HEAT-TREAT-SF

[MAIN] [PRISM-FIRST-PART-PERFECT]/U-HEAT-TREAT-SF (slot:foxtrot iter27) [BOOTSTRAP-SLOT-ENFORCE]: HeatTreatmentAwareSpeedFeedEngine — 7-regime modifier (annealed=1.00 / normalized=0.85 / Q&T=0.55 / through_hardened=0.35 / precip=0.45 / nitrided=0.30 / case_hardened=0.40) on SFM + chip-load + Taylor tool-life (V·T^n=C extension, T scales by modifier^-1/n). Hardness sanity check per regime band. Per Machinery's Handbook §6 + Sandvik §C-2 + ASM Vol 16 §6 + Kennametal Hard-Turn. 16/16 tests PASS. Wired prism_safety.heat_treat_sf_adjust. Closes material-regime depth gap from iter20 scope — every SF call now respects hardened-state physics.

**Shipped:** 2026-05-24T14:49:12-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[prism-first-part-perfect-u-heat-treat-sf]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._