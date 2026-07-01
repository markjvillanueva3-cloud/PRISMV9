---
name: reference_post_ship_sfc-jm-accuracy-u-osc-sweep-fz-mode-split
description: Auto-distilled learnings from shipping SFC-JM-ACCURACY/U-OSC-SWEEP-FZ-MODE-SPLIT (commit 0127e3427). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.035Z
aliases: reference_post_ship_sfc-jm-accuracy-u-osc-sweep-fz-mode-split
---


# SFC-JM-ACCURACY/U-OSC-SWEEP-FZ-MODE-SPLIT

[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-SWEEP-FZ-MODE-SPLIT (slot:oscar): emit per-mode fz median in the sweep --json summary (cost_batch/aggressive_rush/prism_optimized) so the aggregate +124.7% is not read as a uniform over-prediction. Live-validated: cost_batch ~46pct (conservative, matches G-Wizard direction) vs aggressive_rush ~200pct (high BY DESIGN). Completes task #17 data side; the text NOTE (2515b7ece8) already mitigates the console summary.

**Shipped:** 2026-06-25T04:24:13-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[sfc-jm-accuracy-u-osc-sweep-fz-mode-split]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._