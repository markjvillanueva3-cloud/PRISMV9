---
name: reference_post_ship_tribal-outcome-loop-ms0-u-ttob01
description: Auto-distilled learnings from shipping TRIBAL-OUTCOME-LOOP-MS0/U-TTOB01 (commit 6f9a21c99). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.822Z
aliases: reference_post_ship_tribal-outcome-loop-ms0-u-ttob01
---


# TRIBAL-OUTCOME-LOOP-MS0/U-TTOB01

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TRIBAL-OUTCOME-LOOP-MS0]/U-TTOB01 (slot:foxtrot iter29): closed-loop self-training bridge — TribalTipOutcomeBridgeEngine joins tribal tip applications to OutcomeTrackingEngine outcomes. Weighted scoring (good=+1 / adjusted=+0.5 / aborted=-0.25 / scrap=-1) + Laplace smoothing protects low-N tips. Operation-bucket filter + confidence-tier (low/med/high by N). 9/9 vitest passing. Wires the missing edge between tribal-tip corpus (303 tips) and outcome JSONL (was: bridge didn't exist — couldn't ask 'which tips correlate with good runs').

**Shipped:** 2026-05-27T12:47:53-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[tribal-outcome-loop-ms0-u-ttob01]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._