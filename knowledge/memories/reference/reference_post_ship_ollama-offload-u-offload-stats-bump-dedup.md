---
name: reference_post_ship_ollama-offload-u-offload-stats-bump-dedup
description: Auto-distilled learnings from shipping OLLAMA-OFFLOAD/U-OFFLOAD-STATS-BUMP-DEDUP (commit 7d6f31499). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.958Z
aliases: reference_post_ship_ollama-offload-u-offload-stats-bump-dedup
---


# OLLAMA-OFFLOAD/U-OFFLOAD-STATS-BUMP-DEDUP

[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-STATS-BUMP-DEDUP (slot:alpha): extract shared atomic-RMW offload-stats envelope (scripts/lib/offload-stats-bump.mjs: atomicOffloadStatsRMW/ensureOffloadBucket/clampSaved); migrate the 4 byte-identical writers recordUsage(ask-hermes)/recordTieredUsage/recordFileDigestOffload/recordLocalOffload to it. Behavior-preserving: 150 tests green (12 new + 21+20+28+69 unchanged), 2-arm scrutiny PASS (arm B empirically confirmed the test catches a write-before-mutate regression). Hook-side updateOffloadStats/bumpStats copies are decision/decay-gate-coupled -> separate follow-up, not byte-identical.

**Shipped:** 2026-06-24T14:43:15-05:00 by markjvillanueva3-cloud
**Files:** 7 touched

Full distillation: [[ollama-offload-u-offload-stats-bump-dedup]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._