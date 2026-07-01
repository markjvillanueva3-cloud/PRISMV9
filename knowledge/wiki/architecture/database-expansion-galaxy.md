---
title: Database-Expansion Galaxy (slot:juliett)
kind: architecture
status: shipped
date: 2026-05-29
unit: U-PSGB-JULIETT
milestone: PER-SLOT-GALAXY-BUILDOUT
author: claude-a6304a93 (slot juliett)
---

# Database-Expansion Galaxy

The persistence domain owned by **slot:juliett**. Every surface PRISM writes to — vector store, relational/KV store, append-only ledgers, regenerated indexes, schema-versioned state JSON. Galaxy home: `mcp-server/src/engines/database-expansion/` (CLAUDE.md · MEMORY.md · PATHS.md · TOOLBELT.md).

## Stores

| Class | Store | Engine(s) |
|-------|-------|-----------|
| Vector / semantic | Qdrant (14 MemoryKind collections) + wiki `_embeddings.jsonl` (103.5M) | `QdrantMemoryEngine`, `QdrantMemoryVectorBridgeEngine`, `QdrantVectorStoreEngine`, `QdrantCapacityPlannerEngine`, `OllamaEmbedderEngine` |
| Relational / KV / ledger | SQLite WAL (`coordination.sqlite`, engine-created) | `CoordinationStoreEngine`, `CoordinationLedgerEngine`, `LedgerStoreEngine` |
| Memory-fabric | cross-session memory graph | `AgentMemoryFabricEngine`, `MemoryGraphEngine`, `MemoryConsolidationEngine`, `PersistentMemoryEngine`, `MemorySyncEngine` |
| Migration | schema ladder | `MigrationEngine`, `SchemaMigrationRollbackEngine`, `AutoSchemaGeneratorEngine` (+ `src/migrations/*.sql`, `stateMigrations.ts`) |
| State JSON | `roadmap-index.json`, `BUILD_STATE.json`, `MILESTONE_PROGRESS.json`, `cross-session-asset-registry.json` | various |

## Primary dispatcher

`prism_memory` — `semantic_search`, `vector_search_unified`, `qdrant_vector_search/upsert`, `agent_memory_{remember,query,reinforce,forget,stats}`, `embed_text`, `consolidate`, `get_health`, `run_integrity`. Plus `prism_context:memory_externalize/restore` and `prism_data:database_list/search`.

## The three disciplines

1. **Atomic writes** on every multi-writer path — see [[database-expansion-atomic-write-discipline]].
2. **Schema-version + migration** — see [[database-expansion-schema-versioning]].
3. **Read-back proof** — a write is not done until a query-side read confirms it (the 2026-05-15 memory-relevance 0%-recall class).

## Related galaxies

- `system-viz` (sierra) PRODUCES juliett's biggest read target (`system-graph.json`, 548.9M).
- `ai-training` (india) CONSUMES Qdrant + embedding files.
- `discovery` (tango) CONSUMES `cross-session-asset-registry.json` + `extraction-log.json`.
- `token-optimization` (alpha) audits read-cost of these stores.
- `fleet-hygiene` (golf) sweeps stale `.cron-locks/*.lock` + `*.tmp` orphans.

## Cross-refs
- [[knowledge-vault-schema]] · [[ledger-store]] · [[hermes-zulu-integration]]
- Memory: `reference_juliett_galaxy_buildout_2026_05_29`, `reference_juliett_persistence_engine_inventory_2026_05_29`
