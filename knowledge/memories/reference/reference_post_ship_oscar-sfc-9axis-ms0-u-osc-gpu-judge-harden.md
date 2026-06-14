---
name: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-gpu-judge-harden
description: Auto-distilled learnings from shipping OSCAR-SFC-9AXIS-MS0/U-OSC-GPU-JUDGE-HARDEN (commit ee26028a4). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.609Z
aliases: reference_post_ship_oscar-sfc-9axis-ms0-u-osc-gpu-judge-harden
---


# OSCAR-SFC-9AXIS-MS0/U-OSC-GPU-JUDGE-HARDEN

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-GPU-JUDGE-HARDEN (slot:oscar): close 3-of-3 scrutiny P2s — exact-model-match (kill prefix false-positive that would claim :7b residency proves :32b is on GPU) + surface matched_model as residency proof; loud WARNING on 0-judgeable producer drift; skip persist on limit:0 probe (no clobber); 60s fetch timeout on both Ollama calls. Re-verified LIVE: matched_model=qwen2.5-coder:32b, gpu_resident=true, 35724MiB. 15/15 engine tests (4 new P2 locks)

**Shipped:** 2026-06-08T15:29:46-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[oscar-sfc-9axis-ms0-u-osc-gpu-judge-harden]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._