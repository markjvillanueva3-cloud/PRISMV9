---
name: reference_post_ship_print-to-cnc-first-part-perfect-u-it38-bar-puller
description: Auto-distilled learnings from shipping PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT38-BAR-PULLER (commit d414e7a05). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.988Z
aliases: reference_post_ship_print-to-cnc-first-part-perfect-u-it38-bar-puller
---


# PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT38-BAR-PULLER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT38-BAR-PULLER (slot:foxtrot /loop iter38): BarPullerCoordinationEngine — lathe bar-feeder advance verifier (10th P1 closure). Tests 21/21. 5-axis verifier per bar-advance cycle: stock_sufficient (remaining ≥ part + bar_end_min 150mm default) / puller_stroke (≥ part + safety 10mm) / puller_grip (≥ axial_cut × 1.5 safety_factor) / chuck_puller_sequencing (chuck_open=true MANDATORY, UNSAFE if closed → 60kN binding) / z_clearance (rapid ≥ part + safety). 4 verdict tiers: verified / bar_change_required (stock low) / rejected / unsafe (chuck-closed dominates). Surfaces parts_remaining_in_bar count + per-check pass/required/actual. Action bar_puller_verify routable via prism_safety. Reference Okuma OSP-P300L §6.4 + Mazak Quick Turn §3 + Iemca Boss-338 §C-2 + LNS Servo III §4 + Sandvik Turning §C-6. Pathspec-staged.

**Shipped:** 2026-05-24T17:52:15-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[print-to-cnc-first-part-perfect-u-it38-bar-puller]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._