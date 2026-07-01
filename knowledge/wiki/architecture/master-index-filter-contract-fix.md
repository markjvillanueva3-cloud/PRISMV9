---
title: master-index-filter-contract-fix
kind: architecture
layer: L5
domain: backend-dev
created: 2026-05-18
chat: claude-202b983a
slot: hotel
related:
  - [[reference_master_index_surface]]
  - [[reference_awareness_stack]]
  - [[reference_subagent_per_task_presearch_2026_05_15]]
---

# master-index-filter-contract-fix

## Summary

2026-05-18 (hotel, `claude-202b983a`) — shipped two artifacts that close a discoverability gap + a silent R12 contract violation in the existing `prism_session:master_index_query` MCP surface (OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX). Nothing new was built engine-side; the unified knowledge query has been live since 2026-05-12.

| Artifact | Purpose |
|---|---|
| `.claude/commands/knowledge-query.md` | Discoverability skill — surfaces the existing MCP action with concrete filter recipes (`sources` / `layers` / `min_utilization` / `min_confidence` / `build_classes`) so chats stop defaulting to Grep/Glob for "where is X / what's wired to Y" questions. |
| `mcp-server/src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts` | 22-case round-trip regression test that pins the filter contract end-to-end through `schema → dispatcher → engine`. Caught the bug below on first run. |
| `mcp-server/src/engines/MasterIndexEngine.ts` (`query()` body) | Bug fix — post-blend `min_confidence` filter pass. |

## The bug the test caught

`MasterIndexEngine.query()` applied the `min_confidence` filter at lines 668/732 against the **raw pre-blend** scoring score, but then mutated `h.confidence` at line 750 with `confidence × max(UTIL_FLOOR, utilization^UTIL_BIAS)`. With `UTIL_FLOOR=0.4` and most nodes having low utilization, the blend reduces by ≥2.5×. So a hit with raw score 0.5 (passing `min_confidence: 0.5`) became 0.2 in the response — and the user saw `confidence=0.2` in a "min_confidence ≥ 0.5" result set. **Silent contract violation** — exactly the R12 class of bug `## Recent regressions` exists to catch.

Live repro before fix:
```
master_index_query({query: "knowledge", min_confidence: 0.5}) →
  hits[0].confidence === 0.235  ← below the threshold the user asked for
```

## The fix

Add a **post-blend filter pass** in `query()` after the score-blending loop and before aggregations:

```typescript
let filteredHits = hits;
if (typeof opts.minConfidence === "number") {
  const minConf = opts.minConfidence;
  filteredHits = filteredHits.filter((h) => h.confidence >= minConf);
}
filteredHits.sort((a, b) => b.confidence - a.confidence);
// downstream aggregations (bySource / byBuildClass / topUtilized /
// underUtilized / totalHits / returned hits) all switched to filteredHits
```

The early prune at line 668 is **kept** as a performance optimization (don't pay scoring cost for items the user pre-excluded). The post-blend pass is **correctness** — what the user contracted for.

**Why not move the existing prune?** The blend uses utilization which is computed AFTER candidate collection. Re-architecting to compute utilization first would require either two passes or restructuring. A second filter is simpler and preserves the perf win.

## Discoverability gap closed

Live query before the skill shipped:
```
master_index_query({query: "knowledge query unified obsidian"}) → 53,694 hits
```
Same query with one filter:
```
master_index_query({..., sources: ["engine"], min_confidence: 0.1}) → 2 hits
```

The filters always worked (for the documented contract — modulo the bug above) but chats didn't know to use them. The skill makes the recipe surface-visible at the slash-command layer where chats reach for `/grep`, `/glob`, `/agent`.

## Tests

22 cases. All pass against the live `state/shared/system-viz/system-graph.json` (20.7K nodes, 77.6K edges):

- **Wiring (3)** — action in ACTIONS enum, schema accepts every filter, `q` alias works.
- **Happy path (1)** — non-stopword query returns well-formed envelope.
- **Filter wiring (7)** — `sources`, `layers`, `min_confidence`, `min_utilization`, `build_classes`, combined filter composition, `limit`. Each verifies the filter is honored on the **user-facing** values.
- **Failure modes (5)** — empty query (engine emits warning + 0 hits), nonexistent layer, oversized query (>500 char), schema rejects unknown source enum, schema rejects unknown build_class enum.
- **Adversarial (3)** — NaN limit, `min_confidence > 1.0`, mutually-exclusive filter combo (engine+frontend).
- **Variability (3)** — same filter set across physics / knowledge / dev queries.

Two design notes the test pins down:

- **MCP serializer (`utils/responseSlimmer.slimResponse`) strips empty arrays/objects** from session-dispatcher responses for token efficiency. So `hits:[]`, `topUtilized:[]`, `underUtilized:[]`, `bySource:{}`, `byBuildClass:{}` all drop out of the JSON envelope when empty. Engine's `emptyResult()` correctly emits `hits:[]` — the elision is at the serializer layer, NOT the engine. (Iter-0 originally mis-diagnosed this as an engine R12 bug; corrected in iter-1 commit.) Test's `hitsOf()` helper handles the contract — callers using the raw MCP response should always `r.hits ?? []`.
- **Engine STOPWORDS over-include code-search vocabulary**: `engine`, `engines`, `feature`, `features`, `system`, `systems`, `node`, `label`, `info`, `wiki`, `memory`, `prism`. This IS a real UX concern for a code-search engine — a query like "engine dispatcher" effectively becomes "dispatcher" because `engine` is dropped at tokenization. **Closed in iter-2** (`U-MIQ-STOPWORDS-CONFIG`, 2026-05-18, same session) — see below.

## iter-2 — STOPWORDS configurability (`U-MIQ-STOPWORDS-CONFIG`)

Adds opt-in `stopwords?: "default" | "minimal" | "off" | string[]` field to `MasterIndexQueryOptions`. Default behavior byte-identical to pre-iter-2 (back-compat). Three modes + custom set:

| Mode | Behavior |
|---|---|
| `"default"` (unset) | Full STOPWORDS_DEFAULT — English noise + PRISM-meta (back-compat) |
| `"minimal"` | English noise only — PRISM-meta tokens (`engine`, `system`, `wiki`, …) reach the inverted index |
| `"off"` | Empty set — every token through |
| `string[]` | Custom suppression list — lowercased, empty entries dropped |

**Architectural fix beyond the API**: the inverted index ITSELF used to be built with the full default stopword set (`buildGraphCache` line 578 → `tokenize(blob)` defaulted to STOPWORDS_DEFAULT). That meant query-time stopword changes were useless — the buckets for `engine`/`system`/etc. didn't exist. iter-2 changes the index-build call to `tokenize(blob, STOPWORDS_MINIMAL)` so PRISM-meta tokens always have buckets; query-time stopword sets then filter against this richer index. Cost: ~9 extra buckets × N nodes (bounded), ~10s slower first-build on a 20K-node graph (first happy-path test got a 60s budget; subsequent queries hit cache and finish in <100ms).

`resolveStopwords()` helper is defensive — unknown string mode → default fallback (never throws), custom arrays drop empty/non-string entries.

New test cases (7 added, total 29 — all pass):
- 2 wiring (schema accepts modes, rejects unknown string)
- 1 back-compat (default-mode totalHits matches no-opts totalHits)
- 1 contract: `minimal` lets `engine system` query reach the index (default mode produces 0 hits, minimal produces >0)
- 1 contract: `off` ≥ `minimal` in hit count
- 1 contract: custom `string[]` suppresses exactly the named tokens
- 1 defensive: schema-valid edge inputs (empty string entries, mixed case) round-trip without throwing

## iter-3 — capability hits exempt from `minUtilization` (`U-MIQ-CAPABILITY-MIN-UTIL`)

Closes a third R12 contract violation in the same class as iter-0: capability hits (engine/action/skill/hook from `PRISMSelfAwarenessEngine.findCapabilities`) hard-code `utilization = 0` at line 808 — but `0` here is a SENTINEL for "no edge-graph data", not a real "low utilization" measurement. Pre-iter-3, line 809 ran the sentinel through `if (minUtilization && utilization < minUtilization) continue` — so a caller asking for `min_utilization > 0` (the "find used things" filter) silently received ZERO capability hits, even on queries that strongly matched a real engine or skill.

Live repro before fix:
```
master_index_query({query: "knowledge obsidian vault dispatcher", min_utilization: 0.1}) →
  hits: every entry .source === 'graph_node'   ← capability hits silently nuked
```

**Fix** (engine line 808-810): drop the `minUtilization` check for capability hits. `minUtilization` is a graph-node concept (utilization is computed from in-degree); capability hits don't have utilization data, so they're exempt by design. Callers wanting to exclude capability hits should use `sources: ["graph_node", ...]` (the documented surface).

**Contract change** (load-bearing): the prior pre-iter-3 invariant was "every returned hit has `utilization >= minUtilization`". The post-iter-3 invariant is "every returned **graph_node** hit has `utilization >= minUtilization`; capability hits are exempt because their utilization is a sentinel for N/A". This is a STRENGTHENING of the user-facing contract (find-used now also finds used capabilities), not a weakening.

The pre-existing test at `MasterIndexFilters.dispatcher.e2e.test.ts:231` was updated (NOT weakened — its assertion was scoped to `hit.source === "graph_node"`, with an explanatory comment pointing to the new describe block). The dedicated `capability min_utilization exemption` describe block adds 3 cases:
- `min_utilization > 0` query that matches real capabilities returns ≥1 capability hit (proves the fix landed).
- Graph_node hits still respect `min_utilization` (proves the fix didn't break the filter where it applies).
- Capability hits keep `utilization=0` in the API response (proves the shape contract is unchanged — only the filter behavior).

32/32 tests pass.

## Knobs / contracts

None added. Existing `MasterIndexQueryOptions` interface unchanged — only the engine's internal flow changed to honor the documented contract.

## Verification

```bash
cd H:/prism/mcp-server && node ./node_modules/vitest/vitest.mjs run \
  src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts
# Test Files  1 passed (1) · Tests  22 passed (22)
```

## Sister entries

- [[reference_master_index_surface]] — original ship 2026-05-12 (alpha, claude-7f79dd78), 6-surface stack
- [[reference_awareness_stack]] — full search-first stack the unified query joins
- [[reference_subagent_per_task_presearch_2026_05_15]] — bravo's per-subagent injection of the same surface
