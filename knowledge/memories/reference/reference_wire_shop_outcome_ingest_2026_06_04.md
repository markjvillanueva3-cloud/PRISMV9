---
name: reference_wire_shop_outcome_ingest_2026_06_04
description: U-WIRE-SHOP-OUTCOME-INGEST — wired the
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.060Z
aliases: reference_wire_shop_outcome_ingest_2026_06_04
---


**[WIRING]/U-WIRE-SHOP-OUTCOME-INGEST (slot:romeo, 2026-06-04, commit `9b5aa4c2b6`).** Wired the orphan `ShopOutcomeIngestProcessorEngine` → `prism_dev:shop_outcome_ingest`. It is the HEAD of the self-improving DB-gen pipeline: reads a JSONL outcome ledger, ingests each row via the real PSN self-improving loop, and (with `sink_path`) GENERATES the outcome DB (one `LoopIngestResult` per processed row) that the SFC + quoting learners consume. 7 round-trip tests THROUGH the dispatcher, 2-arm scrutiny PASS/PASS.

**Discovery pattern (Ultracode):** a 6-agent `Workflow` (`blackwell-dbgen-wiring-map`) fanned out 5 domain scouts → 1 synthesis to rank the unwired engines whose wiring most improves database/catalog generation. Plain-text returns (NOT schema — default workflow subagent schema-incompat), synthesis returns one compact ranked list to keep main context lean. Then I **independently re-verified** the #1 was genuinely unwired before touching it (the fabricated-unwired regression class is real — see below).

**GOTCHA — `normalizeParams` is an ALIAS MAP for manufacturing params, NOT a generic snake→camel converter** (`mcp-server/src/utils/paramNormalizer.ts`). So a non-aliased path param like `input_path` arrives snake_case as the caller sent it. A dispatcher **schema** (`ACTION_DEV_SCHEMAS`) + **case** for a new action with non-manufacturing params MUST use snake_case keys. My first cut used `inputPath` in the schema → validation rejected every real call (the test caught it). Fix: schema + case both read `input_path`/`sink_path`.

**PATTERN — dispatcher round-trip test:** `MockMCPServer` captures `server.tool(...)`, `call(server, action, params)` invokes the handler + parses `content[0].text` JSON. Template: `mcp-server/src/__tests__/devDispatcher.formula-harvest-wire.test.ts`. Anti-stub = exact real-disk counts (a no-op returning zeros fails). `slimResponse` STRIPS empty arrays on the wire (`responseSlimmer.ts:24`) — normalize with `?? []`.

**PATH SAFETY for MCP-exposed file actions:** confine reads/writes like `case "file_write"` does — `path.resolve(MCP_ROOT, p)` + `startsWith` guard, reject traversal. `prism_dev` already exposes confined `file_write`, so an unconfined sink would be inconsistent (R11).

**STALE GHOST-LABELS (→ for slot:sierra system-viz cleanup):** the workflow flagged `MaterialHarvesterEngine` + `CAMCatalogPhysicsLinkerEngine` as tagged `ghost.unwired`/`engines-unwired` in the system-viz graph + a wiki label, but BOTH are actually WIRED (MaterialHarvester → dev+data dispatchers; CAMCatalogPhysicsLinker → camDispatcher). False-positive ghost labels — do NOT wire (would duplicate). System-viz/wiki need re-sync.

**4 REMAINING DB-gen wiring candidates (next-loop targets, ranked):** (1) `GCodeMaterialParserEngine` → `prism_dev`/`prism_cam` (bulk material/ISO extractor over the 160K NC archive); (2) `ERPImportEngine` → `prism_business:erp_import` (ERP work-order/vendor/cost import); (3) `MonolithSurfaceFinishDatabaseEngine` → `prism_calc` (query surface); (4) `MonolithToolTypesDatabaseEngine` → `prism_cam` (query surface). `MonolithHyperMillFixtureDatabaseEngine` = unwired but LOW value (auto-select query, not a generator — already engine-side reachable via `CatalogUnifiedQueryEngine`). See [[reference_blackwell_db_gen_concurrency_2026_06_04]].
