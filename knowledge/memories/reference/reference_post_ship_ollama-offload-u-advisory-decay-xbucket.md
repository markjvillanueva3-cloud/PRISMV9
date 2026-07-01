---
name: reference_post_ship_ollama-offload-u-advisory-decay-xbucket
description: Auto-distilled learnings from shipping OLLAMA-OFFLOAD/U-ADVISORY-DECAY-XBUCKET (commit b5fa10a63). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.957Z
aliases: reference_post_ship_ollama-offload-u-advisory-decay-xbucket
---


# OLLAMA-OFFLOAD/U-ADVISORY-DECAY-XBUCKET

[MAIN-FORCE] [OLLAMA-OFFLOAD]/U-ADVISORY-DECAY-XBUCKET (slot:alpha): surface the TRUE cross-bucket advisory take-rate (observability only). Pure crossBucketTakeRate + CONVERSION_BUCKET_MAP (advisory->execution bucket) read the conversion from the EXECUTION bucket a pure-advisory hook drives, not its always-0 own offloaded; decayReport gains additive crossBucketTakeRate/crossBucketKey fields + an xtake CLI column. decayDecision/classify UNTOUCHED -- the 18 original tests prove the live mute path is byte-unchanged. 26 tests green; LIVE: large-read-digest take 0.0% own-bucket -> 0.8% true cross-bucket (1/118). The gate-DECISION wiring of this signal stays a separate gated unit (would re-judge mute status on 4 live hooks).

**Shipped:** 2026-06-24T15:22:47-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[ollama-offload-u-advisory-decay-xbucket]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._