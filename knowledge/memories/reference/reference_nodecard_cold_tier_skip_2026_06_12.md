---
name: reference_nodecard_cold_tier_skip_2026_06_12
description: "A5 of the sierra completion-sweep -- CAG cold-tier skip shipped for the node-card prefetch hook (U-NODECARD-COLD-SKIP, commit 3135edf57f). On a pure-COLD query (CAG router classifies it answerable from SessionStart-KV-cache-anchored doctrine), node-card-prefetch-inject.mjs now suppresses the card injection since it would duplicate anchored context; HOT/HYBRID queries still inject. Knob PRISM_NODECARD_PREFETCH_COLD_SKIP=0 forces always-inject. The --near GPU-semantic half remains routed (B5, GPU-service decision)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.664Z
aliases: reference_nodecard_cold_tier_skip_2026_06_12
---


# node-card prefetch CAG cold-tier skip -- U-NODECARD-COLD-SKIP (2026-06-12, slot:sierra, commit 3135edf57f)

The staged tail of CHEAP-NODE-ACCESS-MS0. `node-card-prefetch-inject.mjs` (UserPromptSubmit T2)
injects a compact node card with zero tool call when a prompt names a system-viz node id. A5 adds a
**CAG cold-tier skip**: it imports `classifyQuery` from `scripts/lib/cag-router.mjs` (pure,
zero-import, sub-ms) and, when the prompt classifies **pure COLD** (answerable from the static
doctrine SessionStart already KV-cache-anchors -- CLAUDE.md, ENGINE_DIGEST, wiki-index, ...),
suppresses the card -- it would duplicate already-cached context for no marginal value. HOT and
HYBRID queries STILL inject (live-state questions genuinely benefit from the cheap card). Conservative
by design: only PURE COLD skips ("explain eng.mill" classifies HYBRID -> still injects).

## Design that mattered
- **Cheap-when-irrelevant preserved.** `shouldColdSkip` is called INSIDE `buildPrefetchContext`
  ONLY after `detectNodeIds` finds a candidate -- a node-less prompt never classifies (the ~0ms
  common path is untouched). A test asserts `classify` is not called on a node-less prompt.
- **Fail-soft.** A classifier throw/null returns false (never suppresses a real card).
- **Knob.** `PRISM_NODECARD_PREFETCH_COLD_SKIP=0` forces always-inject (escape hatch).
- **Testability.** `shouldColdSkip(prompt,{enabled,classify})` + `buildPrefetchContext(prompt,
  {coldSkip,_classify})` inject a stub classifier so tier behavior is deterministic in tests.

## Eval gate (R15)
17 node:test cases (10 existing untouched + 7 new incl. 3 failure/adversarial: disabled, throw,
HOT-still-injects). Live-validated through the real hook against the canonical offset index: a COLD
prompt naming `eng.mill` injected nothing, a HOT prompt injected the card, and `COLD_SKIP=0` restored
the injection -- real tier numbers, not "looks fine".

## Remaining / routed
The `--near` GPU-semantic-search half of the staged tail is NOT in-slot buildable (needs a GPU
embed-service decision: which model/port, per-prompt latency budget) -> routed to inventory §B5
(india/juliett or operator). Pairs with [[reference_cheap_node_access_ms0_2026_06_04]] and
[[reference_sierra_completion_sweep_r8_closures_2026_06_12]] (the sweep this closes A5 of).
