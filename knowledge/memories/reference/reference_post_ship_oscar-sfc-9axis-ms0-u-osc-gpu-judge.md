---
name: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-gpu-judge
description: Auto-distilled learnings from shipping OSCAR-SFC-9AXIS-MS0/U-OSC-GPU-JUDGE (commit f31398a1a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.610Z
aliases: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-gpu-judge
---


# OSCAR-SFC-9AXIS-MS0/U-OSC-GPU-JUDGE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-GPU-JUDGE (slot:oscar): GPU-in-the-loop SFC closed-loop training — SpeedFeedGpuJudgeEngine runs a GPU-resident reasoning model (qwen2.5-coder:32b, 35.7GB VRAM 100%-resident on RTX PRO 6000 Blackwell) to judge every sweep regime vs vendor baseline. LIVE: 62/62 judged in 49.8s, 0 fallback, 52/62 sound (39 sound_conservative + 13 match), 4 too_conservative, 6 too_aggressive. Advisory-only, fail-loud on unreachable endpoint. Wired prism_calc:speed_feed_gpu_judge + 29 tests

**Shipped:** 2026-06-08T15:17:54-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[oscar-sfc-9axis-ms0-u-osc-gpu-judge]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._