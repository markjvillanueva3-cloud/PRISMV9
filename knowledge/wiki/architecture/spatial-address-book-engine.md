---
title: SpatialAddressBookEngine (canonical node-id resolution for agent coordination)
type: architecture
layer: L6
created: 2026-06-15
slot: sierra
unit: GRAPH-AS-LLM-CONTEXT-MS0/U-GAC05
tags: [address-book, node-id, alias-resolution, agent-coordination, fuzzy-match, prism_session, system-viz]
related:
  - graph-context-lens-engine
  - graphrag-retrieval-engine
  - dual-channel-context-engine
---

# SpatialAddressBookEngine

Fifth unit of GRAPH-AS-LLM-CONTEXT-MS0 (slot:sierra). A canonical-node-id ADDRESS BOOK so N
agents sharing a fixed spatial layout coordinate by **node-id mention** instead of paraphrased
text. When every agent says `eng.mill` rather than "the mill engine" / "milling module" /
"the mill galaxy", coordination collapses from O(N^2) paraphrase reconciliation to O(1) id
lookup (the spec's "locked viz coordinates as shared address space").

## Design

Composes **GraphRAGRetrievalEngine** (U-GAC02): reuses its mtime-cached find-cache `loadNodes`
and `tokenize`. The 345K-node find-cache (id/label/info/layer) IS the canonical address space --
no second loader.

`resolveAlias(text, opts)` resolution ladder:
1. **exact-id** -- the text already IS a canonical id (confidence 1.0)
2. **exact-label** -- unique case-insensitive label match (0.95); >1 -> ambiguous
3. **fuzzy** -- token-overlap rank over id+label (overlap / query-token-count + substring boost);
   clear winner -> fuzzy (capped 0.9, always below exact-label); near-tie -> ambiguous; nothing -> unknown

`resolveMany(aliases[])` loads the find-cache ONCE and shares the node set across the batch.
`isCanonical(id)` is the cache-stale / deleted-node signal (exact id presence).

## Surfaces

- `prism_session:spatial_resolve` -- params `{text|alias|query|q OR aliases[], maxCandidates,
  minFuzzy, ambiguityMargin, findCachePath}`. Single -> ResolveResult; batch -> `{results:[...]}`.
- `.claude/hooks/agent-handoff-canonicalize.mjs` (UserPromptSubmit, wired settings.json) --
  ADVISORY: regex-detects canonical node-ids already in a prompt and injects a "reference these
  VERBATIM" reminder. Cheap (regex-only, NO find-cache load), fail-soft (emits `{}` on any path),
  dedup+capped, excludes noisy fs/test/git/core/script namespaces. Knobs:
  `PRISM_HANDOFF_CANONICALIZE_{DISABLE,K}`.

## Design note: hook is advisory, not a rewriter

The spec's step-3 said "rewrite handoff text to use canonical node-ids". A per-prompt rewrite of
arbitrary user input is the dangerous failure mode, and loading the 65MB find-cache on every
UserPromptSubmit is a latency leak. So the hook is **non-destructive + cheap** (advisory inject,
regex-only); the heavy paraphrase->id resolution lives in the engine / `spatial_resolve` for
deliberate calls. (R12-honest divergence from the literal spec, safer + faster.)

## Live behavior (real 345K-node graph)

Conservative BY DESIGN -- never silently commits a wrong id:
- `eng.mill` -> exact-id (1.0); `isCanonical("eng.mill")` true, `isCanonical("eng.fake")` false.
- common terms (`mill engine`, `prism_ai`, `lathe`) -> **ambiguous** with a candidate list (the
  graph has many near-duplicate fs.*/core.*/vault.* nodes) -- the spec's "ambiguous -> return
  candidates" failure mode. Exact ids/labels resolve cleanly.

## Tests + proof

16 tests: `SpatialAddressBookEngine.test.ts` (12 -- exact-id/exact-label/fuzzy/ambiguous(label)/
ambiguous(fuzzy near-tie)/unknown/malformed-throw/isCanonical/resolveMany+non-array/deterministic/
node-deleted) + `sessionDispatcher.spatialResolve-wire.test.ts` (4 -- exact-id, fuzzy via alias,
batch, missing-text structured error). Live-validated on the real find-cache.

## 2-agent scrutiny

A (PASS after fixes) + B (FAIL -> fixed): P1 localeCompare tiebreak was locale-nondeterministic
(tr-TR i/I would diverge concurrent resolvers) -> ASCII comparator; P2 hook MAX cap `Number(env)`
-> NaN-unbounded -> `Math.max(1, parseInt||12)`; ambiguityMargin engine-opt was dropped by the
dispatcher -> plumbed + schema. Kept `||` (not `??`) in the alias chain -- the codebase-wide
dispatcher alias convention (node_card/action_search/tool_route), empty-primary -> fallback is intended.

## Lessons

- A deterministic tiebreak must be locale-INDEPENDENT (ASCII `<`/`>`, not localeCompare) or two
  agents on different locales diverge -- defeating the whole shared-address-space premise.
- A per-prompt hook must never load a 65MB index; keep it regex-cheap and push heavy work to a
  deliberate dispatcher call.
- A huge address space (345K nodes) makes fuzzy resolution mostly ambiguous-with-candidates --
  that conservative "ask, don't guess" outcome is the correct, honest default.

## Next: U-GAC06..08 (3 remaining)
community-summary generator over engine clusters (deps GAC02), stale-graph guard hook (1h cron),
hallucinated-node-id guard hook (hooks = cross-worktree-blocked, use node-fs).
