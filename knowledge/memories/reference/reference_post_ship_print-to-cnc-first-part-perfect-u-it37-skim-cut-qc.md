---
name: reference_post_ship_print-to-cnc-first-part-perfect-u-it37-skim-cut-qc
description: Auto-distilled learnings from shipping PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT37-SKIM-CUT-QC (commit a3da9d6c3). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.658Z
aliases: reference_post_ship_print-to-cnc-first-part-perfect-u-it37-skim-cut-qc
---


# PRINT-TO-CNC-FIRST-PART-PERFECT/U-IT37-SKIM-CUT-QC

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PRINT-TO-CNC-FIRST-PART-PERFECT]/U-IT37-SKIM-CUT-QC (slot:foxtrot /loop iter37): SkimCutQCEngine — WEDM trim-pass quality predictor (9th P1 closure). Tests 20/20. Empirical model: Ra_n = Ra_rough × rolloff^n (rolloff 0.50-0.65 by material), recast asymptotes to 30% × rough × (0.30 + 0.70 × rolloff^n), dim accuracy 1/sqrt(n+1). 4 verdict tiers: meets_spec / marginal / additional_skims_required / infeasible (>6 skims still fails — recommend grinding/lapping secondary op). 8 materials covered. Action skim_cut_qc routable via prism_safety. Reference Sodick AP §A2 + Fanuc Robocut §6 + Charmilles RoboFil §D-2 + Mitsubishi MV1200R §3. Pathspec-staged.

**Shipped:** 2026-05-24T17:40:55-05:00 by markjvillanueva3-cloud
**Files:** 14 touched

Full distillation: [[print-to-cnc-first-part-perfect-u-it37-skim-cut-qc]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._