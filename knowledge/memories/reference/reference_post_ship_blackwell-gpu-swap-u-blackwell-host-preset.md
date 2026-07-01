---
name: reference_post_ship_blackwell-gpu-swap-u-blackwell-host-preset
description: Auto-distilled learnings from shipping BLACKWELL-GPU-SWAP/U-BLACKWELL-HOST-PRESET (commit 4047a8223). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.764Z
aliases: reference_post_ship_blackwell-gpu-swap-u-blackwell-host-preset
---


# BLACKWELL-GPU-SWAP/U-BLACKWELL-HOST-PRESET

[MAIN] [BLACKWELL-GPU-SWAP]/U-BLACKWELL-HOST-PRESET (slot:golf): fleet-reaper 'blackwell' host preset for RTX PRO 6000 96GB (qwen2.5-coder:32b prewarm, 24GB GPU floor, 60m keep-alive) + BUILTIN_PRESETS.blackwell + 3 tests (26/26 green) + nim-bridge/host-tuning 4080->Blackwell comment fixes. Pairs with live ollama v0.30.3 GPU consolidation (CPU 1.3->GPU 220 tok/s, system-level).

**Shipped:** 2026-06-03T12:21:21-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[blackwell-gpu-swap-u-blackwell-host-preset]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._