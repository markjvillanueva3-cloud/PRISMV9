---
title: QdrantMemoryVectorBridgeEngine
type: architecture
unit: U-DB-BRIDGE-01
milestone: JULIETT-DB-BRIDGE-MS0
slot: juliett
written_at: 2026-05-26
related:
  - "[[catalog-unified-query-engine]]"
  - "[[feature-store-public-bridge]]"
  - "[[memory-dispatcher]]"
  - "[[qdrant-memory-engine]]"
---

# QdrantMemoryVectorBridgeEngine

Unified vector-search router across the 14 PRISM `MemoryKind` collections. One fan-out call replaces a 14-RTT loop and adds dedup + score-merge + fail-soft on Qdrant offline.

## Dispatcher action

`prism_memory:vector_search_unified`

```typescript
const r = await callDispatcher("prism_memory", {
  action: "vector_search_unified",
  query: "thin-wall milling deflection",
  kinds: ["tip", "wiki", "rule"],   // optional, default = all 14
  topK: 10,                          // 1..100
  minScore: 0.3,                     // 0..1
  includeMetadata: false,            // omit per-hit payload to save tokens
});
```

## Return shape

```typescript
{
  ok: true,
  hits: [
    { id, kind, text, score, source: "qdrant", createdAt?, metadata? },
    ...
  ],
  perBackend: {
    qdrant: {
      ok: boolean,         // any kind succeeded → true (partial-success counts)
      hitsCount: number,   // raw hits before dedup
      kindsQueried: number,
      kindsFailed: number,
      error?: string,      // first representative error when any kind failed
    },
  },
  stats: {
    totalRawHits: number,
    dedupRemoved: number,
    belowMinScore: number,
    kindsWithHits: MemoryKind[],
    missReasons: string[],   // "tip: qdrant not connected", ...
  },
}
```

`ok: false` is only returned on input-shape failure. Backend offline returns `ok: true` with `hits: []` and `perBackend.qdrant.ok: false`.

## The 14 kinds

Defined in `QdrantMemoryEngine.MEMORY_KINDS`:

`program, outcome, tip, formula, rule, playbook, note, error, skill, engine, action, gsd, directive, wiki`

## Why it exists

Before this bridge, "give me any semantic memory matching X" meant either looping the 14 kinds yourself (14 RTTs, one per kind) or dropping to the raw `QdrantSurfaceEngine` which uses collection strings and doesn't understand kind→collection naming. The bridge:

1. **Fans out** with `Promise.allSettled` — one slow kind never blocks the others.
2. **Score-preserves** — Qdrant cosine is already 0..1; bridge filters by `minScore` and sorts desc but never re-ranks.
3. **Dedups** by `kind:id` (keeps higher score). Same id across DIFFERENT kinds is *not* deduped (e.g. a tip and a wiki with the same slug).
4. **Reports per-backend health** — caller decides whether to fall back to pattern matching when Qdrant is offline.
5. **Auto-sizes** `perKindLimit` to `clamp(ceil(topK * 2 / kinds.length), 1, 50)` — dedup headroom without unbounded fan-out.

## R7 scope correction

The 5/25 plan listed targets as `Qdrant + FeatureStore + .claude/memory.db`. Reading actual code:

- **FeatureStoreEngine** is NOT vector-backed — it's JSONL feature ROWS with AS-OF temporal semantics. Plan author conflated ML-term "feature store" with PRISM's row-store implementation.
- **`.claude/memory.db`** is owned by the Claude harness with no in-process JS surface; imports are one-way via `memory_import_claude`.

Bridge routes only across actually-vector-bearing backends. Future tiered/fabric vector backends will extend the `source` union on `UnifiedVectorHit`.

## R12 fail-soft

Per the 2026-05-26 banner (Ollama `/api/chat` dead from GPU contention, Qdrant similarly affected when NIMs hold the GPU), the bridge MUST stay useful when the backend flakes:

| Condition | Bridge behavior |
|---|---|
| Qdrant connection refused | `ok:true, hits:[], perBackend.qdrant.ok:false, error:"qdrant not connected"` |
| 1 kind fails, others succeed | Continue, mark failed kind in `stats.missReasons`, `perBackend.qdrant.ok` still true |
| `recall()` throws an Error | Caught at task wrapper, error message in `missReasons` |
| `recall()` throws non-Error (string/object) | Caught at task wrapper, `String(e)` in `missReasons` |
| Embedder fails | Backend reports `"embed failed"`, bridge surfaces it via `missReasons` |

The test suite proves all four offline/throw paths.

## Test coverage

`mcp-server/src/__tests__/qdrantMemoryVectorBridge.test.ts` — 42 hermetic cases (mock `RecallBackend`, never touches live Qdrant):

| Block | Cases | Coverage |
|---|---|---|
| Happy path | 4 | merge sort dedup, kinds default = 14, topK clamp, perKindLimit clamp |
| Input validation | 10 | empty query, unknown kind, empty kinds, topK 0/neg/non-int, minScore <0 / >1, non-array kinds, perKindLimit 0 |
| Fail-soft | 4 | all-offline, partial failure, Error-throw, non-Error-throw |
| Dedup + filters | 3 | same `kind:id` higher score wins, minScore filter, same id across kinds keeps both |
| Metadata + provenance | 4 | metadata omit/include, createdAt forwarded, source='qdrant' |
| Singleton | 2 | exports + lazy init |
| Score handling | 2 | missing score → 0, sort strictly desc |
| Schema contract | 10 | full input shape preserved, enum/range/path-specific error issues |
| Wiring anti-regression | 2 | schema parses representative input, PLURAL-BRIDGE proof |

## PLURAL-BRIDGE proof

`prism_memory` now hosts 3 distinct Qdrant-touching bridge actions, all live in `ACTION_MEMORY_SCHEMAS` with non-aliased contracts:

| Action | Keying | Source | Shape |
|---|---|---|---|
| `qdrant_vector_search` | raw `collection` string | TOOL-INVENTORY-MS0/U-TOOLINV-01 | `{ collection, query, limit?, filter? }` |
| `qdrant_vector_upsert` | raw `collection` string | TOOL-INVENTORY-MS0/U-TOOLINV-01 | `{ collection, id, text, metadata? }` |
| **`vector_search_unified`** | kind-aware fan-out | **JULIETT-DB-BRIDGE-MS0/U-DB-BRIDGE-01** | `{ query, kinds?, topK?, minScore?, includeMetadata?, perKindLimit? }` |

A schema-shape test proves the three contracts are NOT aliases — e.g. `qdrant_vector_search.safeParse({query:"x"})` fails (`collection` missing) but `vector_search_unified.safeParse({query:"x"})` passes.

## Attribution loss

The U-DB-BRIDGE-01 commit was absorbed into peer commit `e5821f9984` (slot:quebec U-B1-LAZY-SPLIT-AUDIT) because the slot-bridge hooks that prevent this (`worktree-commit-route`, `git-add-lane-guard`, `main-tree-write-block`) were intentionally disabled `*_DISABLE=1` on 2026-05-26 per commit `5828080636`. The disable is needed for chats without slot worktrees; the side effect is exactly this absorption class. See `[[reference_u_db_bridge_01_2026_05_26]]` for the full attribution-loss memory and the forward-fix proposal (per-slot guard that arms only when slot worktree exists).

## Cross-references

- Engine source: `mcp-server/src/engines/QdrantMemoryVectorBridgeEngine.ts`
- Tests: `mcp-server/src/__tests__/qdrantMemoryVectorBridge.test.ts`
- Schema: `mcp-server/src/schemas/memoryActionSchemas.ts` (`vector_search_unified`)
- Dispatcher: `mcp-server/src/tools/dispatchers/memoryDispatcher.ts` (inline-if handler)
- Sibling bridges shipped same week: `b783f986ab` (U-DB-BRIDGE-03 catalog), `86a52e097a` (U-DB-BRIDGE-05 FeatureStore), `7dad7fade2` (U-DB-SEED-FEATURESTORE)
- Plan: `state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md`
- Memory: `[[reference_u_db_bridge_01_2026_05_26]]`
