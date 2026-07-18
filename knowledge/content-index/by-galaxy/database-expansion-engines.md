---
name: database-expansion-engines
description: Strategic engine digest for the database-expansion galaxy -- all PRISM persistence surfaces (Qdrant vector store, SQLite-WAL coordination/ledger, JSONL ledgers, state-JSON sidecars, schema/migration discipline, DocuStrata + JM-file database). Grounded in doctrine (CLAUDE.md/PATHS.md/MEMORY.md) + real engine headers.
type: reference
galaxy: database-expansion
node_type: memory
---

# database-expansion galaxy -- engine digest

## Overview

The database-expansion galaxy (slot:juliett, worktree `H:/prism-slot-juliett`) owns
**every PRISM persistence surface**: the Qdrant vector store, the SQLite-WAL coordination +
ledger stores, append-only JSONL ledgers, JSON state sidecars (`mcp-server/data/state/*.json`),
schema versioning, migration safety, cross-writer atomicity, and the consolidated DocuStrata +
JM-file database. It is a **substrate galaxy** -- it maintains the stores other galaxies read/write.

**Primary dispatcher: `prism_memory`** (`semantic_search`, `vector_search_unified`,
`qdrant_vector_search`/`upsert`, `get_health`, `run_integrity`, `agent_memory_*`, `consolidate`).
Secondary: `prism_data` (`database_list`, `database_search`) and
`prism_context:memory_externalize`. Verified against `CLAUDE.md sec 3`.

**Structural fact (verified):** engines live FLAT in `mcp-server/src/engines/*.ts`, NOT under
`mcp-server/src/engines/database-expansion/` (that subdir is doctrine-only: CLAUDE.md/MEMORY.md/
PATHS.md/TOOLBELT.md). `CLAUDE.md sec 2` states verbatim: "No local `.ts` engines under
`mcp-server/src/engines/database-expansion/` -- code lives in parent engine dirs."

**Core disciplines (doctrine, `CLAUDE.md sec 5`):**
- **Atomic-write** for every multi-writer path -- `atomicWriteJson` from `scripts/lib/atomic-json.mjs`
  (tmp+rename, lockfile-guarded). `roadmap-index.json` is the canonical 5-writer race study.
- **Schema-version discipline** -- every state JSON carries `schemaVersion`; META tools probe-then-read
  (`if ('totals' in j)`) to avoid schema-read-blindness (the `ollama-offload-stats.json` v2 regression
  that silently returned 0/0/0).
- **Migration safety** -- a `schemaVersion` bump lands WITH a paired migration
  (`mcp-server/src/migrations/<scope>-v<N>.sql` or `stateMigrations.ts`) in the SAME commit; N-1
  back-compat for one minor version. Only 3 migration scripts on disk (`golf-ledger-v1.sql`,
  `golf-ledger-v2.sql`, `stateMigrations.ts`) -- most state files are versioned-by-convention
  (migration debt).
- **Never full-Read** the large stores: `system-graph.json` (548.9 MB, sierra-owned),
  `MILESTONE_PROGRESS.json` (~2.1 MB), the 3 large JSONL inventories (87-187 MB) -- use the query layer
  or `head -n 1`.

**Ownership boundary (`CLAUDE.md sec 1 EXCLUDES`, applied in the refinement below):** system-graph.json
generation belongs to sierra (system-viz, single writer of `regen-viz`); embedding-model training
belongs to india (ai-training); business logic consuming these stores belongs to charlie/echo/hotel.
Per the 2026-06-30 multi-domain policy these are LEADERSHIP boundaries, not walls.

## Refinement + count (honest)

A flat enumeration of `mcp-server/src/engines/*.ts` matching
`Database|Qdrant|AgentDB|SQLite|Persist|Store|Schema|Migration|Ingest|Docustrata|Vector|Memory`
returned **111 name-matches**. Most are name-collisions owned by other galaxies -- domain data-catalog
readers (`MaterialDatabaseEngine`, `ToolDatabaseBridgeEngine`, `Machine*DatabaseEngine`,
`Monolith*DatabaseEngine`, `WEDM*`, `PP*VectorEngine`), CAD/CAM/domain corpus ingesters
(`CADCorpusIngester`, `HyperMill*`, `Lathe*Ingest`, `Okuma*Ingester`), AI-training memory persistence
(`NeuralWeightPersistence`, `CrossProcessEWCMemory*`, `WEDMRLPolicyPersistence`), and
business/license stores (`LicenseStore`, `SubscriptionStore`, `Docustrata*BridgeEngine`).

Refining to the **persistence-infrastructure CORE juliett actually owns** (vector-store fabric,
relational-WAL, JSONL/state-JSON ledger, migration/schema discipline, content-addressable store)
yields **~24 engines**. This aligns with the MEMORY.md baseline of "~18 persistence engines" plus the
Qdrant-federation + schema-audit + backup + conflict-resolver engines shipped since that 2026-05-29
snapshot. Below, **16 core engines are header-verified**; the remainder are name-derived from doctrine.

## Strategic categories

1. **Vector / semantic store (Qdrant)** -- the embedding-backed recall layer over 14 `MemoryKind`
   collections (`prism_memory_<kind>`). Core: QdrantMemoryEngine + Singleton + VectorBridge + raw
   VectorStore + Surface + CapacityPlanner + FederatedRetriever (RRF cross-collection fusion).
2. **Relational / WAL store (SQLite better-sqlite3)** -- atomic multi-agent coordination + the golf
   ledger, both over `state/shared/coordination.db` in WAL mode. Core: CoordinationStoreEngine,
   LedgerStoreEngine.
3. **Memory-fabric / cross-session persistence** -- durable cross-session/cross-process memory that
   survives compaction. Core: AgentMemoryFabricEngine, MemoryGraphEngine, PersistentMemoryEngine,
   MemorySyncEngine, MemoryConsolidationEngine, TieredMemoryEngine.
4. **Migration + schema discipline** -- versioning, up/down chains, rollback, auto-schema inference,
   drift detection. Core: MigrationEngine, SchemaMigrationRollbackEngine, AutoSchemaGeneratorEngine,
   NamespaceMigrationEngine, SchemaDriftDetectorEngine, SchemaCoverageAuditEngine.
5. **JSONL / event-sourced ledger** -- append-only outcome/event stores with schemaVersion per record.
   Core: CrossProcessOutcomeStore, CoordinationLedgerEngine.
6. **Content-addressable / integrity + backup** -- full-file hashing, dedup, backup/restore drills,
   memory conflict reconciliation. Core: CADContentAddressableStoreEngine, BackupRestoreDrillEngine,
   MemoryConflictResolverEngine.
7. **DocuStrata + JM-file database (data corpus, NOT a `.ts` engine)** -- the consolidated JM
   corpus at `mcp-server/data/jm-die-database/` (73,506 docs + 38,251 files), built by
   `scripts/build-jm-die-database.mjs`; the large JSONL inventories (`jm-file-inventory.jsonl` 555K
   rows, `jm-die-scan-ledger.jsonl` 302K rows). Consumed at runtime by `JMDiePartLibraryEngine`.

## Key engines (detailed)

### QdrantMemoryEngine.ts
Semantic memory layer on top of the thin `QdrantVectorStoreEngine`. Gives higher-level engines a
typed `remember / recall / forget` surface keyed by **memory kind** (programs, outcomes, tips,
formulas, playbook rules, notes, errors, skills, engines, actions...). Collections are created on
demand via the fixed `prism_memory_<kind>` naming convention so home + work boxes share layout.
Embedding is pluggable (injected `embed(text)`). Never silently succeeds -- typed error on
disconnect/embed-failure (R12).
Path: `mcp-server/src/engines/QdrantMemoryEngine.ts`. Exports: `MEMORY_KINDS`, `QdrantMemoryEngine`, `Embedder` type.

### QdrantMemoryVectorBridgeEngine.ts
Unified vector-search router across the 14 `MemoryKind` collections (JULIETT-DB-BRIDGE-MS0). Fans one
query out over the requested kinds in a single call, normalizes + dedups (`kind:id`) + merges hits,
reports per-backend health. Failure-soft: returns `{ok:true, hits:[], per_backend.qdrant.ok:false}`
when Qdrant is offline rather than throwing. Pure routing (no embedder ownership -- delegates to the
Singleton); `Promise.allSettled` fan-out so a dead kind never blocks the rest.
Path: `mcp-server/src/engines/QdrantMemoryVectorBridgeEngine.ts`.

### QdrantFederatedRetrieverEngine.ts
Federated RAG retrieval: fans a single query embedding to N Qdrant collections in PARALLEL, then
fuses per-collection ranked lists via **Reciprocal Rank Fusion** (Cormack et al. SIGIR 2009,
`RRFscore = SUM w_L/(k+rank_L)`, k=60). Distinct from QdrantMemoryEngine (single-collection recall):
this is collection-set-agnostic and MERGES across collections with domain-affinity weighting
(+50% boost for the query's inferred domain). Graceful-degrade: fuses survivors, errors only if ALL fail.
Path: `mcp-server/src/engines/QdrantFederatedRetrieverEngine.ts`. Exports: `DEFAULT_RRF_K`, `DEFAULT_LIMIT`, `DEFAULT_DOMAIN_BOOST`.

### CoordinationStoreEngine.ts
SQLite WAL-mode replacement for the single-JSON work-claim store (`WORK_CLAIMS.json`), the dominant
multi-chat contention source (~60 read-modify-writes/min at 6 concurrent chats). `journal_mode=WAL`
+ `synchronous=NORMAL` + `busy_timeout=5000 ms`; prepared statements cached in the constructor
(no string-templating on the hot path). Back-compat: `claim()` returns `null`|`Conflict` in the same
shape legacy hooks expect; `migrateFromJson()` is idempotent. DB at `state/shared/coordination.db`.
Path: `mcp-server/src/engines/CoordinationStoreEngine.ts`. Exports: `ClaimRow`, schema v1.

### LedgerStoreEngine.ts
Domain ledger for the golf watchdog + peer chats. Wraps the SAME SQLite WAL DB as
CoordinationStoreEngine via an independent better-sqlite3 connection (WAL supports concurrent
connections). Tables (DDL in `golf-ledger-v1.sql`): `bug_attribution`, `peer_audit_ticks`,
`chat_bus_signals`, `golf_envelope_mutations`, `ledger_meta`. Cost stored as integer `micros`
(1 USD = 1e6) so SUM aggregates never drift. `query()` rejects any non-SELECT/WITH statement.
Path: `mcp-server/src/engines/LedgerStoreEngine.ts`. Exports: `LEDGER_SCHEMA_VERSION`(=2), `MICROS_PER_USD`, `microsToUsd`, `usdToMicros`, `getMigrationSqlPath`.

### MemoryGraphEngine.ts
Persistent cross-session memory graph (PRISM F2) for decision tracing + cross-session learning.
Components: GraphWriteQueue (single-writer serialization), WAL (atomic multi-record ops), InMemoryIndex
(O(1) incremental updates), QueryEngine (`trace_decision`/`find_similar`/`get_health`),
IntegrityChecker (edge validation, cycle detection, SIMILAR_TO cap), age-based eviction. SAFETY:
graph failure = no cross-session learning, but dispatchers/manufacturing continue normally.
Path: `mcp-server/src/engines/MemoryGraphEngine.ts`. Exports: `MemoryGraphEngine` (singleton). Note: state dir hardcoded to `C:/PRISM/mcp-server/state/memory_graph`.

### CrossProcessOutcomeStore.ts
Event-sourced outcome ledger for the 5 XPROC bridges (SFC/POST/FEAT/AI/ROUTER). Every bridge
invocation logged with request/response + eventual outcome (success/failure/operator_override/pending);
Tier-1 neural engines read it as their training signal. In-memory ring buffer (default 10,000, bounded
100..1e6) + append-only JSONL persistence, each event carrying a `schemaVersion`. `record()` /
`recordOutcome()` are O(1) append; `retrieveSimilar(context,k)` is weighted k-NN (process mismatch
dominates, weight 5.0).
Path: `mcp-server/src/engines/CrossProcessOutcomeStore.ts`. Exports: `OUTCOME_BRIDGES`, `OUTCOME_PROCESSES`, `OUTCOME_KINDS`, `SCHEMA_VERSION`, `OutcomeNumericFeatures`.

### AgentMemoryFabricEngine.ts
Cross-session memory fabric that survives sessions + compactions (AGENT U-AGT04/MS2). Stores learned
facts, user preferences, corrections, shop-specific knowledge, and prior-session context. Entries carry
type (fact/preference/correction/context/tribal), source, confidence, reinforcement count, tags,
priority, and optional expiry. This is the AgentDB-fabric surface the doctrine store-inventory tags
(schema ADR-006/ADR-009).
Path: `mcp-server/src/engines/AgentMemoryFabricEngine.ts`. Exports: `MemoryEntry`.

### PersistentMemoryEngine.ts
Cross-session learning fabric (MXU-MS3): typed entries with semantic tags, tag/domain/recency
retrieval, freshness/decay scoring, learning-pattern tracking (worked-vs-failed), operator preferences,
and S/F calibration data. Lightweight JSON in a flat file, tag-indexed for O(n) retrieval
(good for <10K entries; vector indexing is a stated future). Memory types:
learning/preference/calibration/pattern/decision/context.
Path: `mcp-server/src/engines/PersistentMemoryEngine.ts`. Exports: `MemoryType`, `MemoryEntry`.

### MemorySyncEngine.ts
Exports Qdrant-backed memory to a plain-JSON bundle on H: so the home (RTX 4080) and work (RTX 3080)
boxes share tribal tips, program embeddings, outcome vectors, formula memories. Bundle v1 is
forkable/diffable/git-friendly; import is upsert-semantic (newer bundle wins). CPP-MS3 adds
`MemoryCRDTEntry` + `mergeEntries()` -- a pure set-union-on-entryId merge with Last-Write-Wins
(max timestamp, lexicographic source tiebreak) for N-agent overlapping bundles.
Path: `mcp-server/src/engines/MemorySyncEngine.ts`. Exports: schema v1, `mergeEntries`, `MemoryCRDTEntry`.

### MemoryConflictResolverEngine.ts
Semantic, POST-HOC memory-key conflict RECONCILIATION (OBSIDIAN-INTELLIGENCE-MS3/D3) -- complementary
to the file-level `file-claim-guard`/`commit-ownership-guard` LOCKS. Catches semantic memory races that
slip past path locks (vault-mirror writes, cross-worktree independent claim state, sub-granularity
appends). DATA-LOSS INVARIANT: a cross-agent different-content pair is ALWAYS persisted to
`knowledge/memories/conflicts/<key>.diff.md` regardless of the timestamp window (window only labels
`concurrent` vs `superseded`). Append is serialized per key via an advisory lockfile (multi-MB memo
bodies are not `appendFileSync`-atomic); section counting uses an out-of-band HTML-comment sentinel so
hostile content cannot forge a boundary.
Path: `mcp-server/src/engines/MemoryConflictResolverEngine.ts`. Exports: `MEMORY_CONFLICT_SCHEMA_VERSION`, `MEMORY_CONFLICT_ENGINE_VERSION`.

### MigrationEngine.ts
Schema versioning + data-migration management (L2-P3-MS1). Tracks applied migrations, supports up/down,
validates ordering, prevents duplicate application. Actions: `migration_apply`, `migration_rollback`,
`migration_status`, `migration_list`, `migration_validate`. A Migration carries `up()`/`down()`
callables returning `{success, changes[]}`.
Path: `mcp-server/src/engines/MigrationEngine.ts`. Exports: `MigrationStatus`, `MigrationDirection`, `Migration`, `MigrationRecord`.

### SchemaMigrationRollbackEngine.ts
Snapshots state BEFORE schema migrations, records an up/down chain, and rolls back to any earlier
version (U-FORE-17 reliability substrate). Enforces `to === from+1` (dense integer chain).
Partial-wired to `prism_dev` (`schema_snapshot`/`schema_restore_snapshot`/`schema_history`/
`schema_migrations_list`); `registerMigration`/`migrate`/`rollback` stay library-only because up/down
callables cannot round-trip through JSON-RPC (documented honestly at file top).
Path: `mcp-server/src/engines/SchemaMigrationRollbackEngine.ts`. Exports: `SchemaMigration`, `MigrationResult`, `HistoryEntry`, `SchemaMigrationRollbackEngine`.

### AutoSchemaGeneratorEngine.ts
SOFTWARE-DEV automation (AUTO-2, NOT a manufacturing engine): scans dispatchers for actions missing Zod
schemas, infers parameter types from dispatcher case-blocks + engine method signatures, and generates
schema code. Workflow `scan()` -> `generate()` -> `apply()`, DRY-RUN by default. Target
`Schema_Coverage = actions_with_schema / total_actions >= 0.95`.
Path: `mcp-server/src/engines/AutoSchemaGeneratorEngine.ts`. Exports: `ActionSchemaStatus`, `SchemaGapReport`, `DispatcherSchemaReport`, `GeneratedSchema`.

### CADContentAddressableStoreEngine.ts
Content-addressable store for CAD files (CAD-COMPLETE-MS0/U-FS-01), superseding an earlier first-4KB-hash
defect. Full-file SHA-256 = stable content ID; BLAKE3 rolling-hash chunks at 4 MB boundaries enable
resumable multipart upload of 500MB+ STEP files + block-level dedup; persistent registry at
`data/state/CAD_FILE_REGISTRY.json`; periodic integrity re-verification (re-hash -> drift alert);
cross-tenant IP-leak detection via content-hash collision. Filesystem-agnostic (injectable `CASFs`).
Path: `mcp-server/src/engines/CADContentAddressableStoreEngine.ts`. Consumes `schemas/cadFileRegistrySchema.js`.

### BackupRestoreDrillEngine.ts
Backup/restore drill orchestration (LATHE-PROD-READY-MS0/U-LPR-OPS-BACKUP): registered backup assets
(training data / model weights / DB / configs / audit logs), backup-job recording with size+checksum,
HMAC-SHA256 signed attestations proving a backup matches its expected payload hash, restore drills with
real RTO measurement + attestation re-verification, and per-asset drill-cadence compliance
(overdue/due_soon/current). RTO/RPO tiers align with DisasterRecoveryEngine (tier-0: 4h/1h). Cites
NIST SP 800-34 / 800-209 + ISO 27040.
Path: `mcp-server/src/engines/BackupRestoreDrillEngine.ts`. Exports: `BackupTier`, `BackupCategory`, `DrillCadence`, `ComplianceBand`, `BackupAsset`, `BackupJob`.

## Full engine index

| Engine | Category | One-line |
|--------|----------|----------|
| QdrantMemoryEngine.ts | vector-store | Typed remember/recall/forget over 14 `prism_memory_<kind>` collections; pluggable embedder |
| QdrantMemoryEngineSingleton.ts | vector-store | Singleton wrapper carrying the nomic-embed-text embedder (WIRE-EXEMPT pattern) (name-derived) |
| QdrantMemoryVectorBridgeEngine.ts | vector-store | Unified fan-out router across the 14 MemoryKind collections; failure-soft, dedup by kind:id |
| QdrantFederatedRetrieverEngine.ts | vector-store | RRF (Cormack 2009) cross-collection fusion with domain-affinity boost |
| QdrantVectorStoreEngine.ts | vector-store | Thin raw vector-store backend (collections/upsert/search) the memory layer sits on (name-derived) |
| QdrantSurfaceEngine.ts | vector-store | Qdrant surface analytics / low-level collection surface (name-derived) |
| QdrantCapacityPlannerEngine.ts | vector-store | Partition + capacity planning for Qdrant collections (name-derived) |
| CoordinationStoreEngine.ts | relational-WAL | SQLite-WAL work-claim store replacing WORK_CLAIMS.json; busy_timeout 5s, prepared stmts |
| LedgerStoreEngine.ts | relational-WAL | golf-watchdog SQLite-WAL ledger (bug_attribution/audit_ticks/chat_bus/envelope_mutations); micro-USD cost |
| CoordinationLedgerEngine.ts | jsonl-ledger | Coordination event ledger (companion to CoordinationStore) (name-derived) |
| CrossProcessOutcomeStore.ts | jsonl-ledger | Event-sourced XPROC outcome ledger; ring buffer + append-JSONL; neural training signal source |
| AgentMemoryFabricEngine.ts | memory-fabric | Cross-session/compaction-surviving fabric (facts/preferences/corrections/context); AgentDB surface |
| MemoryGraphEngine.ts | memory-fabric | Persistent cross-session decision-trace graph (WAL + write-queue + integrity checker) |
| PersistentMemoryEngine.ts | memory-fabric | Cross-session learning fabric with decay scoring + S/F calibration; tag-indexed flat JSON |
| MemorySyncEngine.ts | memory-fabric | Qdrant -> JSON bundle for home/work PC sync; CRDT LWW merge for N-agent bundles |
| MemoryConsolidationEngine.ts | memory-fabric | Memory consolidation + compaction (name-derived) |
| TieredMemoryEngine.ts | memory-fabric | Tiered (hot/warm/cold) memory store (name-derived) |
| MigrationEngine.ts | migration-schema | Schema-version + data-migration mgmt; up/down, ordering validation, dup-prevention |
| SchemaMigrationRollbackEngine.ts | migration-schema | Pre-migration snapshots + up/down chain + rollback (partial-wired to prism_dev) |
| AutoSchemaGeneratorEngine.ts | migration-schema | Scans dispatchers for missing Zod schemas + generates them (dry-run; coverage >=0.95) |
| NamespaceMigrationEngine.ts | migration-schema | Namespace/key migration across stores (name-derived) |
| SchemaDriftDetectorEngine.ts | migration-schema | Detects schema drift between expected + on-disk shape (name-derived) |
| SchemaCoverageAuditEngine.ts | migration-schema | Audits schema coverage across actions/stores (name-derived) |
| CADContentAddressableStoreEngine.ts | integrity-backup | SHA-256 content-addressable CAD store + BLAKE3 resumable chunks + dedup + drift alert |
| BackupRestoreDrillEngine.ts | integrity-backup | Backup/restore drills with HMAC attestation + RTO measurement (NIST 800-34/ISO 27040) |
| MemoryConflictResolverEngine.ts | integrity-backup | Semantic post-hoc memory-race reconciliation; preserve-both data-loss invariant |

Notes on scope: the following name-matched engines are EXCLUDED as owned by other galaxies
(per `CLAUDE.md sec 1 EXCLUDES`) -- listed for traceability, not padded into the count:
domain data-catalogs (`MaterialDatabaseEngine`/`MaterialDatabaseBridgeEngine`/`ToolDatabaseBridgeEngine`/
`ToolHolderDatabaseEngine`/`MachineConfigDatabaseEngine`/`MachineRateDatabaseEngine`/`SurfaceFinishDatabaseEngine`/
`PatternDatabaseEngine`/`ProgramDatabaseEngine`/all `Monolith*DatabaseEngine` -> mill/lathe/speed-feed/post),
AI-training persistence (`NeuralWeightPersistenceEngine`/`CrossProcessEWCMemoryPreservationEngine`/
`CrossProcessEpisodicMemoryEngine`/`WEDMEWCMemoryEngine`/`WEDMRLPolicyPersistence`/`FeatureStoreEngine` -> india),
CAD/CAM/domain ingesters (`CADCorpusIngester*`/`HyperMill*`/`Lathe*Ingest*`/`Okuma*Ingester`/
`ShopFloorNoteIngestion`/`SpreadsheetIngestion`/`ContentIngestionPipeline`/`IngestionOrchestrator` -> cad/cam/lathe/post),
DocuStrata BUSINESS bridges (`Docustrata*BridgeEngine`/`DocustrataCustomerIndex`/`DocuStrataMaterialPrior`/
`Docustrata*PricingTrainer`/`JMCustomerVendorDatabase`/`JMDie*Ingest` -> charlie/hotel; juliett owns only the
consolidated store + loader script, not the business-logic consumers), licensing (`LicenseStore`/
`SubscriptionStore`/`EntitlementOverrideStore` -> hotel). These are consumers/producers of juliett's
stores, not persistence-infrastructure engines.

Non-engine store assets (data corpus, NOT `.ts` engines -- juliett-owned per PATHS.md):
`mcp-server/data/jm-die-database/` (73,506 docs + 38,251 files, built by `scripts/build-jm-die-database.mjs`),
`state/shared/databases/jm-file-inventory.jsonl` (555K rows), `jm-die-scan-ledger.jsonl` (302K rows),
`state/shared/databases/jm-part-library.jsonl` (30,890 records, runtime consumer `JMDiePartLibraryEngine`),
`scripts/lib/atomic-json.mjs` (the load-bearing atomic-write library),
`mcp-server/src/migrations/{golf-ledger-v1,golf-ledger-v2}.sql` + `stateMigrations.ts`.
