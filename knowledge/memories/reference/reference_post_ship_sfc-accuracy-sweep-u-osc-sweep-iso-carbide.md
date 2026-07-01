---
name: reference_post_ship_sfc-accuracy-sweep-u-osc-sweep-iso-carbide
description: Auto-distilled learnings from shipping SFC-ACCURACY-SWEEP/U-OSC-SWEEP-ISO-CARBIDE (commit bb0184f15). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.030Z
aliases: reference_post_ship_sfc-accuracy-sweep-u-osc-sweep-iso-carbide
---


# SFC-ACCURACY-SWEEP/U-OSC-SWEEP-ISO-CARBIDE

[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-ISO-CARBIDE (slot:oscar): add carbide-only per-ISO median to the sweep summary so the accuracy-proof artifact shows the apples-to-apples signal, not just the material-MIXED median. The all-material per-ISO median compares hss/ceramic/cbn rows against a CARBIDE-keyed baseline, so it can read 'aggressive' (P all-mat +6.5%) while carbide alone is conservative (P carbide-only -5.5% SAFE). Both columns now print + prism_carbide_only_median_delta_pct in --json. Validated: prod smoke 6 ISO groups carbide-SAFE/neutral. Serves the operator's 'prove it works 100%' gate. Completes the sweep-reporting honesty trio (per-mode fz + carbide-only ISO + uncapped Vc).

**Shipped:** 2026-06-25T05:05:04-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[sfc-accuracy-sweep-u-osc-sweep-iso-carbide]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._