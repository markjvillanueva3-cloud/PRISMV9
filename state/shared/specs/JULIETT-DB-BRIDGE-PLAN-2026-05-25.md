---
title: JULIETT Database-Bridging Plan — Compiled Task Queue
slot: juliett
session: claude-f75381c1
written_at: 2026-05-25
mustHumanVerify: true
advisoryOnly: true
related:
  - "[[feedback_psn_definition]]"
  - "[[reference_juliett_12chat_allocation_2026_05_17]]"
  - "[[roadmap-consolidation-2026-05-16]]"
  - "[[reference_master_index_surface]]"
---

# JULIETT — Database-Bridging Plan + Compiled Task Queue

**Work order (2026-05-25):** review sessions for juliett, regain DB-expansion context, wire/bridge similar databases throughout PSN + /system-viz + entire PRISM app, compile rest of juliett tasks.

## Context recovered

Juliett's recent handoffs (claude-1dab582f, fee91401, 3930f131, f75381c1) all sit on CAD-FUSION-LIVE-MS0 / TOOL-CATALOG-INGEST-MS0 / WEDM-PHASE-A — **none touched DB bridging.** The 5/25 2am CST window has no juliett+database commits in git log; the work order is forward-looking. In-flight: **U-SFPSN-05** (GilbertMRRModel composition into UltimateSpeedFeedEngine.ts:1615).

## PRISM database surface inventory (11 distinct backends)

| # | Backend | Engine(s) | Dispatcher | PSN leg | Status |
|---|---------|-----------|------------|---------|--------|
| 1 | Qdrant vectors (14 collections) | QdrantMemoryEngine, QdrantVectorStoreEngine | prism_memory | 4 Memories | built+wired |
| 2 | Tiered memory (work/episodic/semantic) | TieredMemoryEngine, CrossProcessEpisodicMemoryEngine | prism_memory | 4 Memories | built+wired |
| 3 | Coordination SQLite | CoordinationStoreEngine | infra | 2 PRISM OS | built+wired |
| 4 | Agent memory fabric | AgentMemoryFabricEngine | prism_memory (6 actions) | 4 Memories | built+wired |
| 5 | Outcome episodic store | OutcomeEpisodicMemoryBridgeEngine | prism_memory | 10 NN/GNN | built+wired |
| 6 | Catalog registries (tool/holder/machine/finish) | 4 *DatabaseEngine + registryManager | prism_data (18 actions) | 7 Engines | built+wired |
| 7 | BOX program DB | (implicit dataDispatcher) | prism_data:box_db_* (4) | 7 Engines | built+wired |
| 8 | Obsidian vault (MD) | ObsidianVaultSyncEngine, MemorySyncEngine | prism_memory:brain_recall | 1 Obsidian | built+wired |
| 9 | Memory graph (in-memory) | MemoryGraphEngine | prism_memory (6 core + 38 compound) | 4 Memories | built+wired |
| 10 | Feature store (CAD embeddings) | FeatureStoreEngine | — (no dispatcher action) | 10 NN/GNN | **built/UNWIRED** |
| 11 | System graph (JSON, 280MB+) | (graph I/O lib) | prism_session:master_index_query | 6 System Viz | built+wired |
| 12 | .claude/memory.db (Claude Code) | (Claude harness) | prism_memory:consolidation_* | 4 Memories | external |

## 5 overlap groups (bridge candidates)

| Group | Surfaces overlapping | Bridge state | Gap |
|-------|---------------------|--------------|-----|
| **A. Vector stores** | Qdrant + FeatureStore + .claude/memory.db | Partial (separate query paths) | No unified router — vector_search_unified missing |
| **B. Episodic/Outcome memory** | CrossProcessEpisodicMemory + OutcomeEpisodicMemoryBridge | Partial (one feeds the other) | No `recall_outcome_pattern` action |
| **C. State/Coordination** | CoordinationStoreEngine ↔ coordination.db | ✓ Bridged | none |
| **D. Catalogs** | Tool + Holder + Material + Machine + Finish DBs | Siloed (per-type queries) | No `search_all_catalogs` cross-match action |
| **E. Knowledge/Memory** | Obsidian vault + MemoryGraph | ✓ Partial (brain_recall 2026-05-21) | Causal-graph linking TODO |

## 12 missing cross-leg PSN bridges

1. NN-graph embeddings ↔ Qdrant persistent (Leg 10↔4)
2. Tribal tips ↔ relational/SQL layer (Leg 5)
3. Outcome events ↔ time-series DB (Leg 11 — SPC/OEE)
4. System-viz ghost nodes ↔ normalized dependency index (Leg 6)
5. Wiki ↔ full-text search index (Leg 3 — currently grep-based)
6. Engine wiring state ↔ persistent build cache (Leg 7)
7. Memories + Tribal ↔ unified semantic index (Legs 4+5)
8. Formulas ↔ evaluation cache (Leg 9 — Kienzle recomputes every call)
9. Test coverage ↔ coverage metrics DB (Leg 7 — 4,382 tests)
10. Registries ↔ PostgreSQL (Legs 7/9 — enables material × tool × machine JOINs)
11. Dispatcher actions ↔ invocation audit log (Leg 2 — 9,350 actions, no audit trail)
12. JM Die program archive ↔ indexed search (filesystem crawl today)

## TOP 5 highest-leverage DB-bridge units (proposed)

| Unit ID | Description | Engine ↔ Dispatcher | Effort |
|---------|-------------|---------------------|--------|
| **U-DB-BRIDGE-01** | QdrantMemoryVectorBridgeEngine — unified vector query router (kind → Qdrant/FeatureStore/.claude) | prism_memory:vector_search_unified | 3h |
| **U-DB-BRIDGE-02** | UnifiedEpisodicRecallEngine — outcome pattern recall across tiered + bus | prism_memory:recall_outcome_pattern | 2.5h |
| **U-DB-BRIDGE-03** | CatalogUnifiedQueryEngine — cross-catalog match (tool+holder+material+coating) | prism_data:cross_catalog_match | 4h |
| **U-DB-BRIDGE-04** | MemoryGraphCausalBridgeEngine — `trace_causal_path` decision↔outcome chains | prism_memory:trace_causal_path | 3h |
| **U-DB-BRIDGE-05** | FeatureStorePublicAccessEngine — expose FeatureStore to MCP layer (unwired today) | prism_intelligence:feature_store_query | 1.5h |

Total ~14h. U-01 first (unblocks others); U-02/U-03/U-04 can parallelize after merge.

## /system-viz integration — recommended new roost

**`ghost.database_surfaces`** roost (analogous to `ghost.priority_queue` + `ghost.misc_tasks`). Each DB surface becomes a child node tagged `{built|wired|ghost}` + `legOwner` + `schemaVersion` + `sizeEstimate`. Generator outline:

- New file: `scripts/generate-database-surfaces-roost.mjs`
- Register in `scripts/regen-viz.mjs` FAST[] array
- Splice in `scripts/merge-augmentations.mjs`
- Surfaces the 12 missing bridges as ghost children — visual punch-list

## JULIETT — Top-20 pending pickup queue (priority-queue + ROADMAP-CONSOLIDATED)

| # | unit_id | milestone | 1-line |
|---|---------|-----------|--------|
| 1 | **U-MONO-MAT-REPOINT** | MS-MONOLITH-HARVEST | **tier-0** — repoint `mcp-server/src/constants.ts:61` PATHS.MATERIALS_DB → `extracted/materials_v9_complete/` (1,047 mats) — DB-bridge AND speedfeed |
| 2 | U-DPM0-DATABASE-MATERIAL_DB | DOMAIN-PIPELINE-MS0 | Promote MATERIAL_DB partial → built (pair w/ #1) |
| 3 | U-DPM0-DATABASE-TOOL_DB | DOMAIN-PIPELINE-MS0 | Promote TOOL_DB partial → built |
| 4 | U-DPM0-DATABASE-FIXTURE_DB | DOMAIN-PIPELINE-MS0 | Build missing FIXTURE_DB stage |
| 5 | U-DPM0-DATABASE-ALARM_DB | DOMAIN-PIPELINE-MS0 | Build missing ALARM_DB stage |
| 6 | U-WIRE-BACKLOG-DATABASE | FEATURE-GAP-AUDIT-MS0 | Wire ~12 unwired DB engines |
| 7 | U-GAP-DB-MASTER-ALARM | FEATURE-GAP-AUDIT-MS0 | Ingest v8.89 MASTER_ALARM_DATABASE (2,500 alarms) |
| 8 | U-GAP-DB-VERIFIED-FIX-PROC | FEATURE-GAP-AUDIT-MS0 | Ingest v8.89 VERIFIED_FIX_PROCEDURES |
| 9 | U-GAP-DB-GCODE-MCODE | FEATURE-GAP-AUDIT-MS0 | Ingest v8.89 GCODE_MCODE_DATABASE |
| 10 | U-GAP-DB-TOOL-CATALOG-HARVEST | FEATURE-GAP-AUDIT-MS0 | OPEN MIND + 287 .tooldb/.db/.mdb (~131MB) |
| 11 | U-INFRA-02 | MS-INFRA | AuthEngine → Postgres (replace in-mem Maps) |
| 12 | U-P1-QDRANT-EPISODIC-RECALL | SYSTEM-VIZ-BRAIN-MS0 | Qdrant episodic recall on SessionStart |
| 13 | U-ST02 | SCENARIO-TEST-MS0 | ScenarioRunStorageEngine 3-layer hybrid |
| 14 | U-CGT02 | CAD-GROUND-TRUTH-MS0 | F3DSQLiteParserEngine Fusion360 archive |
| 15 | U-TOOLINV-08 | TOOL-INVENTORY-MS0 | Adopt mcp-server-qdrant peer alt |
| 16 | U-MONO-PORT-POSTDB | MS-MONOLITH-HARVEST | Port PRISM_VERIFIED_POST_DATABASE_V2.js (5.6MB) |
| 17 | U-AITRAIN-DATABASE-TOOL-DATABASE-DEEP-LEARNING | AI-TRAINING-FIRST-MS0 | Train ToolDatabaseDeepLearningEngine |
| 18 | **U-SFPSN-05** | SF-PSN-WIRE-MS0 | **in-flight** — GilbertMRRModel composition at UltimateSpeedFeedEngine.ts:1615 |
| 19 | U-REV-MS0-HOIST-SFC-01 | REVENUE-MS0 | Wire 8 SpeedFeed engines to prism_calc |
| 20 | U-KAR17 | KAR-MS2.1 | ProvenSpeedFeedAggregatorEngine |

Plus speedfeed track (FE-12/13, INFRA-05, GAP-SF-NC-CALIBRATION, F360-20, muS-D30..D33, AITRAIN-SPEEDFEED-DEEP-LEARNING, MS-SFC-CALIBRATE-01..24).

## RECOMMENDED NEXT ACTION (single top-1)

**Claim + ship `U-MONO-MAT-REPOINT`** then chain `U-DB-BRIDGE-01`:

1. **U-MONO-MAT-REPOINT** — single-constant repoint at `mcp-server/src/constants.ts:61`; unlocks 1,047-material vendor DB for every downstream SFC consumer. Tier-0 blocker that lives on both juliett's speedfeed track AND the DB-bridge work. ~30min including round-trip test.
2. **U-DB-BRIDGE-01** (QdrantMemoryVectorBridgeEngine) — highest-ROI new bridge; unblocks U-02/U-03/U-04. ~3h.
3. Build `ghost.database_surfaces` roost — visual punch-list for remaining 12 bridges (~1-2h).

Total session target: 3 units, ~5h, all DB-bridge + speedfeed compounding.

## Cross-references

- DB inventory source: `mcp-server/src/engines/` (Qdrant*, Memory*, Database*, Store*, *Bridge*)
- Constants target: `mcp-server/src/constants.ts:61` (PATHS.MATERIALS_DB)
- Roadmap: `state/shared/specs/ROADMAP-CONSOLIDATED.json` (17 DB matches in 2,897 pending)
- Misc orphans: `state/shared/specs/MISC-TASKS-INVENTORY.json`
- Live priority queue: `node .claude/helpers/priority-queue.mjs --slot juliett --top 100`
- In-flight: `state/shared/handoffs/HANDOFF-claude-a8894112-juliett-sf-psn-wire.md`
