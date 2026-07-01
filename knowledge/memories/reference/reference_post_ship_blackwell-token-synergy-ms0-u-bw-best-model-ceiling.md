---
name: reference_post_ship_blackwell-token-synergy-ms0-u-bw-best-model-ceiling
description: Auto-distilled learnings from shipping BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-BEST-MODEL-CEILING (commit 049e98115). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.766Z
aliases: reference_post_ship_blackwell-token-synergy-ms0-u-bw-best-model-ceiling
---


# BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-BEST-MODEL-CEILING

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-BEST-MODEL-CEILING (slot:alpha): raise best-tier ceiling — 96GB Blackwell runs far bigger than the 32B (20GB of 96GB used, 77GB free). Prefer 70B-class (qwen2.5:72b/llama3.3:70b/deepseek-r1:70b) ahead of qwen2.5-coder:32b in TIER_PREFERENCES.best; install-gated down-walk auto-promotes when golf pulls one, 32B fallback today. +2 tests (37 green). gemma3=general/multimodal, not the synthesis pick.

**Shipped:** 2026-06-04T09:16:54-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[blackwell-token-synergy-ms0-u-bw-best-model-ceiling]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._