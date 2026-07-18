---
name: reference_post_ship_blackwell-model-upgrade-u-bw-hookbridge-retire
description: Auto-distilled learnings from shipping BLACKWELL-MODEL-UPGRADE/U-BW-HOOKBRIDGE-RETIRE (commit 0615b476d). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.764Z
aliases: reference_post_ship_blackwell-model-upgrade-u-bw-hookbridge-retire
---


# BLACKWELL-MODEL-UPGRADE/U-BW-HOOKBRIDGE-RETIRE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-HOOKBRIDGE-RETIRE (slot:alpha): OllamaHookBridgeEngine defaultModel + all 7 modelOverrides pointed at DELETED qwen2.5-coder:7b/14b (live regression the retirement created — every hook using the bridge silently got a dead model). Re-pointed to kept 32b floor; stale 4080-era comment corrected; gpt-oss:20b noted as future speed re-point. Type-trivial string swaps. Remaining .ts stale-tag surface (AISystemRouterEngine enum + ~17 others) handoff-queued for U1b.

**Shipped:** 2026-06-04T13:17:28-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[blackwell-model-upgrade-u-bw-hookbridge-retire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._