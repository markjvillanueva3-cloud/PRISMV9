---
name: reference_db_expansion_bridge_ms0_2026_06_01
description: "DB-EXPANSION-BRIDGE-MS0 — all 25 real registered databases wired to consumer galaxies via DB_MANIFEST consumers[] + DatabaseRegistry + idempotent PATHS.md wirer."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.536Z
aliases: reference_db_expansion_bridge_ms0_2026_06_01
---


DB-EXPANSION-BRIDGE-MS0 (juliett, 2026-06-01 /goal /loop). Goal: "all databases properly wired and bridged to all domains/nodes/galaxies that will intake them, by necessity + logic." DONE + verified.

**The intake bridge has two layers:**
1. **Runtime discovery** — `data/databases/DB_MANIFEST.json` is read AT RUNTIME by `mcp-server/src/registries/DatabaseRegistry.ts` (`databaseRegistry.load()` → `list()`/`search()`/`getStats()`). Consumed by `dataDispatcher.ts` (`prism_data:database_list`/`database_search`) + `globalSearch`/`listRegistries` (autopilot/dev/infra/OS dispatchers). **The manifest is runtime-read JSON, NOT compiled into dist** — editing it surfaces on the next registry `load()`, NO TS rebuild needed (verified: the 13h-stale dist loaded the freshly-edited 27-entry manifest correctly).
2. **Galaxy awareness** — each DB entry carries a `consumers: [galaxy...]` array (necessity+logic). `scripts/wire-db-stores-to-consumers.mjs` (idempotent, `--check` freshness gate) reads `consumers[]` and splices a marked `## 📥 Registered DB intake` section into each consumer galaxy's `mcp-server/src/engines/<g>/PATHS.md` (store id + source_dir + count + manifest + query path).

**Shipped:**
- `c6c749cd01` — registered 3 juliett directory stores (JMDieDocuStrataDB 111745 / VendorCatalogDB 425 / PrismReferenceDB 13920) in DB_MANIFEST (24→27).
- `d344a368d5` — churn-free `spliceSection` (no-op when block present verbatim) — stops the reorder war with charlie's `wire-vendor-corpus-to-galaxies.mjs` (both append-at-end).
- `a893b0161d` — `scripts/enrich-db-manifest-consumers.mjs` (CONSUMER_MAP: necessity+logic DB→galaxy map; idempotent fills-missing-only; atomic tmp+rename; flags unmapped) attached `consumers[]` to the other 22 registered DBs; wirer propagated all 25 (2 deferred skipped: InferenceDB/CompoundActionDB) to **18 consumer galaxies**.

**Verified:** DatabaseRegistry.load()=27 dbs (all surface in list()); 23/23 node:tests (8 enrich + 15 wire); wirer `--check` fresh; 0 unregistered store-like dirs on disk (15/15 covered). Qdrant/AgentDB/SQLite-coord/JSONL ledgers are infra/memory stores bridged via `prism_memory` (not domain "intake" DBs).

**To add a new DB to the bridge:** register it in DB_MANIFEST.json (with `consumers[]`, or add to CONSUMER_MAP + run `enrich-db-manifest-consumers.mjs`), then `node scripts/wire-db-stores-to-consumers.mjs`. Related: [[reference_vendor_catalog_db_2026_05_31]] · [[reference_catalog_extraction_pipeline_gap_2026_05_31]] · [[feedback_commit_to_slot_worktree]].
