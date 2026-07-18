---
title: HMEMV Temporal Recall + Obsidian Bases (HMEMV03 + HMEMV08)
type: architecture
tags: [hermes, obsidian, memory-vault, temporal-recall, qdrant, context-retention, hmemv]
created: 2026-06-11
status: shipped
slot: zulu
milestone: HERMES-MEMORY-VAULT-MS0
---

# HMEMV Temporal Recall + Obsidian Bases

Two HERMES-MEMORY-VAULT-MS0 context-retention units shipped 2026-06-11 (slot:zulu). Both are persistent-memory accelerators for the Obsidian/Hermes brain.

## HMEMV03 -- Temporal-aware recall (point-in-time belief query)

Answers: *"what did PRISM's memory/wiki BELIEVE about X at time T?"* -- the standout Mnemosyne-class feature.

- **Action:** `prism_memory:recall_as_of` (verified wired: z.enum line 137, switch case 1390, handler 1424, `available` fallback list -- all self-consistent in `mcp-server/src/tools/dispatchers/memoryDispatcher.ts`).
- **Params:** `query` (string, required), `as_of` (ISO-8601 timestamp with offset, e.g. `2026-06-01T00:00:00Z`, required), `topK`, `corpus` (`memory` | `wiki`), `maxFiles`.
- **Mechanism:** a DETERMINISTIC git-history walk (NOT physics, NOT a model) -- resolves the as-of commit via `git log --until=<T> -1` over the corpus dir, reads each candidate file as-of that commit (`git show <sha>:<path>`), and ranks. The core is a PURE function with an injectable `gitExec` so it is unit-testable without a live repo.
- **Performance fix (R12):** naive walk over the wiki corpus (~17K files) hung >280s -> MCP disconnect. Fixed with a BM25 path-prefilter (`scorePathCheap` -> top-200 `prefilterK`) + a `DEFAULT_BUDGET_MS=15000` budget (env `PRISM_TEMPORAL_RECALL_BUDGET_MS`) + `DEFAULT_MAX_FILES=25000`. Now `corpus=wiki` returns in 4.6s, `corpus=memory` 4.7s. On budget exhaustion it returns `partial`/`timedOut` flags -- never a silent hang.
- **Lib:** `scripts/lib/temporal-memory-recall-lib.mjs` (export `recallAsOf(query, {asOf, gitExec, topK, corpus, maxFiles})`). Tests: `scripts/lib/temporal-memory-recall-lib.test.mjs` (40/40).
- **Commit:** envelope-sync `d0c28a2d0e` records the ship (4 files, 1138 insertions: lib + test + dispatcher + schema).

## HMEMV08 -- Obsidian Bases (frontmatter-pivoted views)

Obsidian Bases (2025+ plugin feature) builds database-style table/card views from frontmatter fields. PRISM's wiki+memory already carry `name`/`description`/`type`/`tags` frontmatter, so the vault gets instant pivot tables.

- **3 `.base` files at `knowledge/bases/`:** `memory-by-type.base` (group `knowledge/memories/**` by the `type` field), `wiki-by-domain.base` (group `knowledge/wiki/**` by domain/section), `wiki-by-slot.base` (group by owning slot). Pure YAML config -- no executable code.
- **Validation:** `scripts/__tests__/hmemv08-bases-validate.test.mjs` (8/8) -- asserts every base YAML parses AND every filter references a frontmatter field that EXISTS in the real corpus (cited example files).
- **Commit:** `8dd0491369` (4 files, 424 insertions).
- **Unblocks:** HMEMV11 (Dataview queries, dep HMEMV08).

## Where these sit in the vault-accel stack

These join HMEMV09 (Qdrant ANN recall: `prism_memories` + `prism_wiki` collections, 53,930 wiki vectors) as the persistent-memory acceleration layer. Remaining HMEMV: HMEMV07 (predictive warmup), HMEMV10 (Hermes MemoryProvider), HMEMV11 (Dataview, now unblocked), HMEMV09 tribal corpus (deferred on sierra tribal-index shard recovery). The #1 open Obsidian gap is the mcp-obsidian stdio bridge giving Hermes vault-QUERY (today Hermes can WRITE flat files but cannot query/link the vault graph).

Related: [[hermes-memory-vault-ms0]] - [[zulu-orchestrator]] - [[reference_hmemv09_wiki_qdrant_streaming_2026_06_11]]
