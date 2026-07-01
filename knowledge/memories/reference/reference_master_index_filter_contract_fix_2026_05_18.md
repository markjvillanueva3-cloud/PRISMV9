---
name: reference-master-index-filter-contract-fix-2026-05-18
description: 2026-05-18 hotel — 4 iters of master_index_query contract fixes. iter-0 post-blend min_confidence filter (R12 silent violation). iter-1 corrected mis-diagnosis (hits:[] elision is slimResponse, not engine). iter-2 STOPWORDS configurability (`stopwords?: "default"|"minimal"|"off"|string[]`) + index now built with STOPWORDS_MINIMAL so PRISM-meta tokens are queryable. iter-3 capability hits exempt from minUtilization (utilization=0 is a sentinel for N/A, not real low value — same R12 class as iter-0). 32/32 tests pass.
metadata:
  type: reference
---

# master_index_query filter-contract fix (2026-05-18 hotel)

**Commit:** (slot hotel, `claude-202b983a`, BACKEND-DEV-LOOP iter-0)

The unified `prism_session:master_index_query` MCP action has been live since 2026-05-12 (OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX). What shipped today is **NOT** a new engine — the dedup-preflight caught that and pivoted scope. Instead:

1. **`/knowledge-query` skill** (`.claude/commands/knowledge-query.md`) — discoverability surface with concrete filter recipes. Chats reach for Grep/Glob because the dispatcher list is huge and `master_index_query` is one of ~100 session actions; this skill makes it findable.
2. **22-case dispatcher round-trip regression test** (`mcp-server/src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts`) — pins the filter contract through schema → dispatcher → engine. Caught the R12 bug below on first run.
3. **R12 bug fix in `MasterIndexEngine.query()`** — post-blend `min_confidence` filter pass.

## The R12 bug

Engine flow:
1. Collect candidates → apply `min_confidence` against raw pre-blend score (line 668)
2. Blend: `h.confidence = h.confidence × max(UTIL_FLOOR=0.4, utilization^UTIL_BIAS=1.5)` (line 750)
3. Return hits — user sees BLENDED `confidence`

Result: hits passing `min_confidence: 0.5` raw came out at `confidence: 0.2` after blending. The filter contract was silently violated — same class as the `## Recent regressions` block in CLAUDE.md.

## Fix

Add a SECOND filter pass after the blend (kept the early prune for perf):

```typescript
let filteredHits = hits;
if (typeof opts.minConfidence === "number") {
  const minConf = opts.minConfidence;
  filteredHits = filteredHits.filter((h) => h.confidence >= minConf);
}
filteredHits.sort((a, b) => b.confidence - a.confidence);
// All downstream (bySource, byBuildClass, topUtilized, underUtilized,
// totalHits, returned hits) switched from `hits` → `filteredHits`.
```

## Test discoveries (pinned for future)

- **MCP serializer strips empty arrays/objects**: `utils/responseSlimmer.slimResponse` (wired into sessionDispatcher line 220) elides `hits:[]`, `topUtilized:[]`, `underUtilized:[]`, `bySource:{}`, `byBuildClass:{}` when empty. Engine's `emptyResult()` correctly emits all of them — the elision is serializer-layer for token efficiency. (Iter-0 originally mis-diagnosed this as an engine R12 bug; this entry was corrected in iter-1 same-day after confirming `emptyResult()` returns `hits: []` but the live MCP response still has no `hits` key.) Test's `hitsOf()` helper handles the contract — callers using raw MCP responses should `r.hits ?? []`.
- Engine STOPWORDS drop: `engine, engines, feature, features, system, systems, node, label, info, wiki, memory, prism`. Real UX concern — query "engine dispatcher" effectively becomes "dispatcher". Tests must use non-stopword vocabulary or degrade to zero-hit results testing nothing — original test cut had 6 silent fails from this trap. **Closed in iter-2** (`U-MIQ-STOPWORDS-CONFIG`, commit `994c6cd2a2`, same session) — see below.

## iter-2 — STOPWORDS configurability (`U-MIQ-STOPWORDS-CONFIG`)

**Commit:** `994c6cd2a2` (slot hotel, `claude-202b983a`, BACKEND-DEV-LOOP iter-2)

Adds opt-in `stopwords?: "default" | "minimal" | "off" | string[]` field to `MasterIndexQueryOptions`. Default behavior byte-identical to pre-iter-2 (back-compat). Four modes:

| Mode | Behavior |
|---|---|
| `"default"` (unset) | Full `STOPWORDS_DEFAULT` — English noise + PRISM-meta (back-compat) |
| `"minimal"` | English noise only — PRISM-meta tokens (`engine`, `system`, `wiki`, `memory`, `prism`, `feature`, `node`, `label`, `info`) reach the inverted index |
| `"off"` | Empty set — every token through |
| `string[]` | Custom suppression list — lowercased, empty entries dropped |

**Architectural fix beyond the API surface:** the inverted index ITSELF used to be built with the full default stopword set (`buildGraphCache` → `tokenize(blob)` defaulted to `STOPWORDS_DEFAULT`). That meant query-time stopword changes were USELESS — the buckets for `engine`/`system`/etc. didn't exist in the index. iter-2 changes `buildGraphCache` to use `STOPWORDS_MINIMAL` so PRISM-meta tokens always have inverted-index buckets; query-time stopword sets then filter against this richer index.

Cost: ~9 extra buckets per node (bounded); ~10s slower first-build on a 20K-node graph (first happy-path test got a 60s budget; subsequent queries hit cache and finish in <100ms).

**Defensive `resolveStopwords()` helper:**
```typescript
function resolveStopwords(value: unknown): Set<string> {
  if (value === undefined || value === null) return STOPWORDS_DEFAULT;
  if (Array.isArray(value)) { /* lowercased + filtered, drops empty/non-string */ }
  if (typeof value === "string") {
    if (value === "minimal") return STOPWORDS_MINIMAL;
    if (value === "off" || value === "none") return STOPWORDS_OFF;
    return STOPWORDS_DEFAULT;
  }
  return STOPWORDS_DEFAULT; // unknown type fallback — never throws
}
```

**Tests:** 7 new cases added (total 29 — all pass):
- 2 wiring (schema accepts modes, rejects unknown string)
- 1 back-compat (default-mode `totalHits` matches no-opts `totalHits`)
- 1 contract: `minimal` lets `engine system` query reach the index (default mode → 0 hits, minimal → >0)
- 1 contract: `off` ≥ `minimal` in hit count
- 1 contract: custom `string[]` suppresses exactly the named tokens
- 1 defensive: schema-valid edge inputs (empty strings, mixed case) round-trip without throwing

**Required `clearCache()` in `beforeAll`** of the stopwords block — iter-2 changed the index-build stopword set, but a previously-built cache from iter-1 tests would have the old (full-stopword) buckets. Without invalidating the cache, the contract test for "minimal lets engine system reach the index" silent-fails.

**File deltas:**
- `mcp-server/src/engines/MasterIndexEngine.ts` — added 3 constants (`STOPWORDS_DEFAULT`/`STOPWORDS_MINIMAL`/`STOPWORDS_OFF`) + `resolveStopwords()` + optional 2nd param on `tokenize()` + `stopwords` field on `MasterIndexQueryOptions` + opts.stopwords plumb in `query()` + `buildGraphCache` uses `STOPWORDS_MINIMAL`
- `mcp-server/src/schemas/sessionActionSchemas.ts` — added `stopwords: z.union([z.enum(["default","minimal","off"]), z.array(z.string())]).optional()` on `master_index_query`
- `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` — pass-through if string-or-array
- `mcp-server/src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts` — `describe("stopwords configurability")` block with 7 cases + happy-path timeout bumped to 60s (richer index needs longer first-build)

**Pinned-quirk #2 from iter-0 (STOPWORDS over-include) now closed.** Pinned-quirk #1 (slimResponse empty-array elision) remains a documented contract — `hitsOf()` helper handles it, callers should `r.hits ?? []`.

## iter-3 — capability hits exempt from `minUtilization` (`U-MIQ-CAPABILITY-MIN-UTIL`)

**Slot hotel, claude-9c7dcf3e, BACKEND-DEV-LOOP iter-3.**

Third R12 contract violation in the same class as iter-0. Capability hits (engine/action/skill/hook from `PRISMSelfAwarenessEngine.findCapabilities`) hard-code `utilization = 0` at engine line 808 as a SENTINEL for "no edge-graph data" — but the very next line ran the sentinel through `if (minUtilization && utilization < minUtilization) continue`. So a caller asking `min_utilization > 0` (the "find used things" filter) silently received ZERO capability hits, even when their query strongly matched a real engine or skill.

**Fix** (engine line 808-810): drop the `minUtilization` check for capability hits. `minUtilization` is a graph-node concept (utilization = log-normalized in-degree); capability hits don't have utilization data, so they're exempt by design. Callers wanting to exclude capability hits should use `sources: ["graph_node", ...]` (the documented surface).

**Contract change:** prior invariant "every returned hit has `utilization >= minUtilization`" → post-iter-3 invariant "every returned **graph_node** hit has `utilization >= minUtilization`; capability hits are exempt because their utilization is a sentinel for N/A". STRENGTHENING (find-used now also finds used capabilities), not a weakening.

The pre-existing test at `MasterIndexFilters.dispatcher.e2e.test.ts:231` was updated to scope its assertion to `hit.source === "graph_node"` — NOT weakened. The new `capability min_utilization exemption` describe block adds 3 cases:
- `min_utilization > 0` query matching real capabilities returns ≥1 capability hit (fix landed)
- Graph_node hits still respect `min_utilization` (fix didn't break filter where it applies)
- Capability hits keep `utilization=0` in the API response (shape contract unchanged)

**File deltas:**
- `mcp-server/src/engines/MasterIndexEngine.ts` — drop `minUtilization` check for capability hits (lines 808-810); JSDoc explaining the sentinel + R12 context
- `mcp-server/src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts` — update line 231 scope + new `capability min_utilization exemption` describe (3 cases). Total 32.

32/32 tests pass.

## Live verification

```bash
cd H:/prism/mcp-server && node ./node_modules/vitest/vitest.mjs run \
  src/__tests__/MasterIndexFilters.dispatcher.e2e.test.ts
# Test Files  1 passed · Tests  32 passed (32)
```

## Wiki + related

- Wiki: [[master-index-filter-contract-fix]]
- Sister memories: [[reference_master_index_surface]], [[reference_awareness_stack]], [[reference_subagent_per_task_presearch_2026_05_15]]
- Skill: `/knowledge-query`
