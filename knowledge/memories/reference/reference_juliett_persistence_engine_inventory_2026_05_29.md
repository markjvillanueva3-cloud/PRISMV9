---
name: reference_juliett_persistence_engine_inventory_2026_05_29
description: The ~18 PRISM persistence engines + prism_memory action surface (database-expansion domain)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.630Z
aliases: reference_juliett_persistence_engine_inventory_2026_05_29
---


**PRISM persistence-engine inventory (2026-05-29, slot:juliett — Glob-confirmed).** All under `mcp-server/src/engines/`.

**Qdrant / vector (5):** `QdrantMemoryEngine` (core store) · `QdrantMemoryEngineSingleton` (singleton wrapper, WIRE-EXEMPT pattern) · `QdrantMemoryVectorBridgeEngine` (unified search across 14 MemoryKind collections) · `QdrantVectorStoreEngine` (vector ops) · `QdrantCapacityPlannerEngine` (partition/capacity).
**Memory-fabric (5):** `AgentMemoryFabricEngine` · `MemoryGraphEngine` (semantic index) · `MemoryConsolidationEngine` · `PersistentMemoryEngine` · `MemorySyncEngine` (bundles).
**Migration (3):** `MigrationEngine` · `SchemaMigrationRollbackEngine` · `AutoSchemaGeneratorEngine`.
**Ledger / coordination (3):** `CoordinationStoreEngine` (work claims) · `CoordinationLedgerEngine` · `LedgerStoreEngine` (SQLite WAL, better-sqlite3, ~50K LOC, golf slot).
**Embedding (1):** `OllamaEmbedderEngine` (nomic-embed-text 768-d).

**Dispatcher surface — `prism_memory` is primary:** `semantic_search`, `vector_search_unified`, `qdrant_vector_search`, `qdrant_vector_upsert`, `agent_memory_{remember,query,reinforce,forget,stats}`, `embed_text`, `embed_pairwise_cosine`, `consolidate`, `get_health`, `run_integrity`, `memory_sync_list_bundles`. Plus `prism_context:{memory_externalize,memory_restore,kv_sort_json}` and `prism_data:{database_list,database_search}`.

**Migrations dir** `mcp-server/src/migrations/`: `golf-ledger-v1.sql`, `golf-ledger-v2.sql`, `stateMigrations.ts` (only 3 — rest is versioned-by-convention = migration debt). Full atlas: `engines/database-expansion/PATHS.md`.
