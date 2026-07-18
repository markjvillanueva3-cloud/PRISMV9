---
name: reference_oscar_sfc_proven_activated_2026_06_22
description: "SHIPPED (slot:oscar 2026-06-22, 698525d504): the dormant JM-Die proven S/F pipeline is ACTIVATED for lathe -- ProvenSpeedFeedAggregatorEngine now has serialize/hydrate + loadFromStore/persistToStore + sync lazy load-at-init; resumable miner scripts/extract-jm-proven-speedfeed.ts; versioned store mcp-server/data/state/proven-speed-feed-store.json (schemaVersion 1.0.0). Validated 800 programs -> 4556 rows -> 19 param sets. ALSO: corrects the stale reference_oscar_mill_proven_path_broken_2026_06_21 -- BOTH mill bugs are already FIXED."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.711Z
aliases: reference_oscar_sfc_proven_activated_2026_06_22
---


**SFC proven-pipeline ACTIVATED (lathe) -- slot:oscar 2026-06-22, commit 698525d504.** Builds on [[reference_oscar_sfc_proven_pipeline_poc_2026_06_21]] (the POC) + the reconciliation [[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]].

## What shipped (U-SFC-PROVEN-PIPELINE-ACTIVATE)
Closes the "proven store empty in every process" gap that made the orchestrator proven-blend (`SpeedFeedOrchestratorEngine.ts:2196` -> `getProvenParams`) DEAD in practice.
- **Engine** (`ProvenSpeedFeedAggregatorEngine.ts`): added `serialize()`/`hydrate()` (PURE, no I/O), `loadFromStore()`/`persistToStore()` (fail-soft I/O cloning the AgentMemoryFabric pattern + `safeWriteSync` from utils/atomicWrite), and a SYNC lazy `ensureHydrated()` guard on the 3 read methods (getProvenParams / getHighConfidenceParams / exportForSpeedFeedOrchestrator). Strictly additive: absent/corrupt/schema-mismatch store leaves the map empty (prior behaviour, never throws). `STORE_SCHEMA_VERSION="1.0.0"`. Knobs: `PRISM_PROVEN_SF_STORE` (path override), `PRISM_PROVEN_SF_NO_HYDRATE=1` (disable).
- **Harness** (`mcp-server/scripts/extract-jm-proven-speedfeed.ts`, run via `npx tsx`): resumable corpus miner -- durable cursor `data/state/proven-sf-mine-cursor.jsonl` + raw rows `proven-sf-raw-lathe.jsonl` (both gitignored), re-runs skip done files, checkpoint-persist every N. Args: `--max-files N --reset --checkpoint-every N --store <path> --json`.
- **Store** (committed seed): `mcp-server/data/state/proven-speed-feed-store.json` (247KB, NOT gitignored).
- **Tests**: `src/__tests__/ProvenSpeedFeedAggregatorStore.test.ts` 8/8 (round-trip, schema-mismatch reject, malformed skip, disk round-trip, absent + corrupt fail-soft, load-at-init lazy hydrate, no-hydrate knob).

## Validation (R15 step 3 -- real numbers)
800 real JM Die `.MIN` programs -> 4556 S/F rows -> 19 proven param sets. Headline: **tool_steel od_finishing CSS 450 SFM (~137 m/min), feed 0.005 ipr, n=459, confidence 0.82** = published-aligned. facing 250 (n=273), grooving 200, parting feed 0.0015 (n=400), + inconel/tungsten_carbide. **Confirms caveat #2 AT SCALE**: JM Die actual lathe Vc is NOT 2x-conservative -> the orchestrator's ~-63%-vs-published deration matches NEITHER published NOR JM-Die reality -> strengthens converge-onto-engine.

## R12 honesty: live-server propagation
The orchestrator loads the aggregator via `require()` of the COMPILED bundle -> these src changes reach the LIVE MCP server only on next rebuild + restart (esbuild bundle was 15h stale). Tests/harness run src directly via tsx/vitest, so the logic is proven. Store DATA is already on disk. Do NOT claim the running server is blending until rebuilt+restarted.

## STALE-MEMORY CORRECTION (R12, read-the-body-not-the-title)
[[reference_oscar_mill_proven_path_broken_2026_06_21]] is **STALE** -- BOTH mill bugs are already FIXED in current code:
- Bug 1 (CommonJS require in ESM): fixed by `f10b3aec2a U-SFC-MILL-PROVEN-REQUIRE-FIX` -- `MillPatternMinerEngine.ts:26-34` are now static ESM imports.
- Bug 2 (.mcx-8 binaries): fixed by `09d605bac1 U-SFC-MILL-MCX-SKIP` -- `MILL_GCODE_CONTROLLERS` (L119) + `MASTERCAM_BINARY_RE` (L121) filter + account for non-G-code (L708-719).
So the mill ENGINE is ready; the mill LANE just isn't wired into the harness yet.

## Queued next (logical order)
1. **U-SFC-PROVEN-MILL-LANE**: extend the harness with a mill lane -- feed `JMDieProgramInventoryEngine`-classified entries {filePath,programType,controller,customer,topFolder} to `millPatternMinerEngine.mineJMDiePrograms()` -> `aggregateMillData(result.chip_load_samples)` -> same store. Cheap seed: `src/data/jmdie-proven-mill-programs.ts` (8 curated entries). Validate on real .nc.
2. **U-SFC-PROVEN-REFRESH-ACTION + CRON**: a `prism_calc` action to refresh the store + a scheduled re-mine (operator asked for crons). Full-corpus mine = 34,993 lathe .MIN (run the resumable harness in chunks; host reaps long procs).
3. **U-SFC-CONVERGE-P2 (OPERATOR-GATED)**: now that proven data confirms converge-onto-engine, surface the per-case `state/shared/SFC-CONVERGENCE-DIFF.md` for sign-off. OUTWARD-FACING (doubles production roughing Vc, fixes hardened over-speed, -90% displayed tool life) -> do NOT silently flip.
4. Frontend phase-1 ([[reference_oscar_sfc_frontend_build_plan_2026_06_18]]): deprecate orphan SpeedFeedPage, surface uncertainty/divergence advisory, verify live-wired to :3100.
