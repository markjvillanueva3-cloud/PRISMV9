---
name: reference_post_ship_hermes-util-u-offload-source-split
description: Auto-distilled learnings from shipping HERMES-UTIL/U-OFFLOAD-SOURCE-SPLIT (commit a04efc769). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.893Z
aliases: reference_post_ship_hermes-util-u-offload-source-split
---


# HERMES-UTIL/U-OFFLOAD-SOURCE-SPLIT

[MAIN-FORCE] [HERMES-UTIL]/U-OFFLOAD-SOURCE-SPLIT (slot:zulu): make hermes/ollama utilization VISIBLE in the offload dashboard. The per-hook table showed only fired/offload/keep -- hiding bySource, so 'is the remote lane actually USED or always degrading to fallback?' was unanswerable. Add pure formatSourceSplit(bySource) + wire into the render. LIVE PROOF: ask-hermes now renders [hermes=853 ollama-fallback=2 fail=1] = hermes 99.6% effectively utilized (real answers, not degrade). +5 R9 tests (ordering/adversarial/empty), 28/28. Directly serves 'utilize ollama+hermes effectively'.

**Shipped:** 2026-06-18T11:34:05-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[hermes-util-u-offload-source-split]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._