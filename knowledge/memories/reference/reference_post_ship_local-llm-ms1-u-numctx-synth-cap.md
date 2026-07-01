---
name: reference_post_ship_local-llm-ms1-u-numctx-synth-cap
description: Auto-distilled learnings from shipping LOCAL-LLM-MS1/U-NUMCTX-SYNTH-CAP (commit 74ee07007). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.929Z
aliases: reference_post_ship_local-llm-ms1-u-numctx-synth-cap
---


# LOCAL-LLM-MS1/U-NUMCTX-SYNTH-CAP

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-SYNTH-CAP (slot:india): lockstep both transcript miners' MCP output cap 8192->16384 (reviewer-B P2) -- num_predict is a CEILING (model emits EOS when done) so terse MAP slices cost nothing, but a dense-galaxy cross-session SYNTHESIS is no longer silently output-truncated; the route exists to STOP truncation so its own cap must not reintroduce it (R12). clone-don't-fork: india + galaxy bumped together. 12/12 tests

**Shipped:** 2026-06-09T20:36:31-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[local-llm-ms1-u-numctx-synth-cap]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._