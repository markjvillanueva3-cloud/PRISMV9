---
name: reference_post_ship_blackwell-token-synergy-ms0-u-bw-synth-model-resolve
description: Auto-distilled learnings from shipping BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE (commit ae2fbfdff). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.766Z
aliases: reference_post_ship_blackwell-token-synergy-ms0-u-bw-synth-model-resolve
---


# BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-SYNTH-MODEL-RESOLVE (slot:alpha): host-aware synthesis-model resolver. scripts/lib/host-aware-synthesis-model.mjs routes local synthesis scripts to the best INSTALLED model for the host (qwen2.5-coder:32b on the 96GB Blackwell) instead of hardcoding 7b/3b — via host-class.mjs (detectHostClass) + the U-BW-BEST-TIER-REACH cost-router (search_synthesis->best). Reuse-not-fork (R8). Fail-soft: ollama-down->script fallback, never a phantom uninstalled model; honest source tags (override/blackwell-best/router/fallback). The proven R13 core for the pending galaxy-*-synthesis + ask-ollama wiring. 13/13 hermetic tests, 2-reviewer PASS 0 P0/P1.

**Shipped:** 2026-06-04T07:49:40-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[blackwell-token-synergy-ms0-u-bw-synth-model-resolve]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._