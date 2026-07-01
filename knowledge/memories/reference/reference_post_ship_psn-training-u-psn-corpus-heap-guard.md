---
name: reference_post_ship_psn-training-u-psn-corpus-heap-guard
description: Auto-distilled learnings from shipping PSN-TRAINING/U-PSN-CORPUS-HEAP-GUARD (commit cf7c3bcc0). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.999Z
aliases: reference_post_ship_psn-training-u-psn-corpus-heap-guard
---


# PSN-TRAINING/U-PSN-CORPUS-HEAP-GUARD

[MAIN-FORCE] [PSN-TRAINING]/U-PSN-CORPUS-HEAP-GUARD (slot:papa): self-reexec --max-old-space-size guard so the PSN training-corpus build never OOMs on default heap (cron/ad-hoc/loop) -- clone of nn-graph-retrain-lifecycle::shouldReexecForHeap; knob PRISM_PSN_CORPUS_HEAP_MB(16384). 14/14 tests incl bare-launch E2E that FATAL'd pre-fix at ~378MB. fleet-infra: PSN substrate serves all 11 legs

**Shipped:** 2026-06-24T19:42:31-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[psn-training-u-psn-corpus-heap-guard]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._