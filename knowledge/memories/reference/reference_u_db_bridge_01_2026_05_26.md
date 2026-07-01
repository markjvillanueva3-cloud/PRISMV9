---
name: reference-u-db-bridge-01-2026-05-26
description: "U-DB-BRIDGE-01 QdrantMemoryVectorBridgeEngine shipped 2026-05-26 by slot juliett — 4 files, 950 LOC, 42/42 tests; absorbed into peer commit e5821f9984 (quebec U-B1) per slot-bridge-hooks-disabled regression"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.236Z
aliases: reference_u_db_bridge_01_2026_05_26
---


# U-DB-BRIDGE-01 — QdrantMemoryVectorBridgeEngine (juliett, 2026-05-26)

Closes the third systematic-bridge slot in prism_memory (after b783 U-DB-BRIDGE-03 catalog + 86a U-DB-BRIDGE-05 FeatureStore on 2026-05-25). Plan: `state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md` §U-DB-BRIDGE-01.

## Shipped

- `mcp-server/src/engines/QdrantMemoryVectorBridgeEngine.ts` (382 LOC) — `search(input)` fans `Promise.allSettled` across 14 MEMORY_KINDS via `QdrantMemoryEngine.recall()`, score-merges + dedups `kind:id` (higher score wins) + filters by `minScore` + sorts desc + trims to `topK`. Lazy singleton resolution (no live-Qdrant import-time dependency).
- `mcp-server/src/__tests__/qdrantMemoryVectorBridge.test.ts` (527 LOC) — 42 cases hermetic via injected mock `RecallBackend`: 8 happy-path / 10 input-validation / 4 fail-soft / 3 dedup-filter / 4 metadata / 2 singleton / 2 score-handling / 10 schema-contract / 2 wiring-anti-regression including PLURAL-BRIDGE proof (3 distinct prism_memory Qdrant actions with non-aliased contracts).
- `mcp-server/src/schemas/memoryActionSchemas.ts` — `vector_search_unified` Zod schema + `ACTION_MEMORY_SCHEMAS` registration.
- `mcp-server/src/tools/dispatchers/memoryDispatcher.ts` — z.enum + inline-if handler with lazy import.

## Why this engine

Before: caller wanting "any semantic memory matching X" looped the 14 kinds itself (14 RTTs) OR dropped to raw `QdrantSurfaceEngine` (collection-string, no kind awareness). After: one fan-out call returns merged top-K with per-kind miss reasons + dedup count + per-backend health status.

## R7 finding — surface conflicts, don't blend

Plan listed targets as `Qdrant + FeatureStore + .claude/memory.db`. Reading actual code:
- `FeatureStoreEngine` is NOT vector — it's JSONL feature ROWS with AS-OF temporal semantics. Plan author confused ML-term "feature store" with PRISM's row-store implementation.
- `.claude/memory.db` is Claude harness-owned with no in-process JS surface (imports are one-way via `memory_import_claude`).
Bridge routes only across actually-vector-bearing backends. Future tiered/fabric vector backends extend the `source` union.

## R12 fail-loud — backend offline

The 2026-05-26 banner reports Ollama `/api/chat` dead from GPU contention (33/50 timeouts). Qdrant similarly affected when NIMs hold the GPU. Bridge:
- Returns `{ok:true, hits:[], perBackend.qdrant.ok:false, error:"qdrant not connected"}` — never throws.
- Partial failure (1 kind dies, others succeed) → continue, mark failed kind in `stats.missReasons`, `perBackend.qdrant.ok` stays true.
- Test suite explicitly proves all four offline/throw paths.

## REGRESSION — attribution absorption

**Class:** shared-tree commit absorbed into peer commit per `[[feedback_commit_to_slot_worktree]]` warning.

My `git commit` returned "no changes added to commit" (working tree clean) — staged work had already been absorbed into peer commit **`e5821f9984`** (slot:quebec U-B1-LAZY-SPLIT-AUDIT) which used `git add -A` on the shared `H:/prism` tree. My 4 files (527+382+19+22 = 950 insertions) appear in that commit's stat, not under a juliett-attributed commit.

**Root cause:** The 3 slot-bridge hooks that would have prevented this (`worktree-commit-route`, `git-add-lane-guard`, `main-tree-write-block`) were intentionally disabled `*_DISABLE=1` on 2026-05-26 per commit `5828080636` (`feedback_slot_bridge_hooks_disabled`). The disable was needed for chats whose slot worktrees don't exist; the side effect is exactly this absorption class.

**Mitigation today:** none. Code shipped + tests pass + commit verifiable via `git log -- mcp-server/src/engines/QdrantMemoryVectorBridgeEngine.ts`. Attribution loss is recoverable via this memory + the CLAUDE.md regression entry — provenance lives in docs even when the commit subject doesn't carry it.

**Forward fix:** when slot worktrees DO exist for a chat, the hooks should arm. The disable was a fleet-wide kill switch; a per-slot guard (arm only when `chat-slots.json[slot].branch` does NOT start with `slot/<name>` AND the slot worktree IS missing) would preserve the absorption protection.

## Wiring

`prism_memory` now hosts 3 distinct Qdrant-touching actions:
- `qdrant_vector_search` — raw, collection-keyed (TOOL-INVENTORY-MS0)
- `qdrant_vector_upsert` — raw, collection-keyed (TOOL-INVENTORY-MS0)
- **`vector_search_unified`** — kind-keyed fan-out across all 14 (this commit)

The 14 MEMORY_KINDS: `program, outcome, tip, formula, rule, playbook, note, error, skill, engine, action, gsd, directive, wiki`.

## Cross-references

- Commit: `e5821f9984` (absorbed)
- Plan: `state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md`
- Sibling bridges: `b783f986ab` U-DB-BRIDGE-03, `86a52e097a` U-DB-BRIDGE-05, `7dad7fade2` U-DB-SEED-FEATURESTORE
- Related: [[feedback_commit_to_slot_worktree]] · [[feedback_slot_bridge_hooks_disabled]] · [[reference_juliett_12chat_allocation_2026_05_17]]
- Wiki: `knowledge/wiki/architecture/qdrant-memory-vector-bridge.md` (companion entry)
