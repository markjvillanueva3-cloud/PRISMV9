---
name: reference_kilo_cam_catalog_query_2026_05_29
description: CAM feature-catalog utilize layer — CAMCatalogQueryEngine (normalized per-op param enumeration+validation) + completeness audit for Fusion/hyperMILL/Mastercam
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.632Z
aliases: reference_kilo_cam_catalog_query_2026_05_29
---


Operator: *"follow delta's example — build everything we need to utilize Fusion, hyperMILL and Mastercam CAM features: every button, input, function, setting and parameter."* Phase 1 (U-CAM-CAT-QUERY + U-CAM-CAT-AUDIT, slot:kilo 2026-05-29).

**Key reframe (planning caught it — R8):** the catalogs are NOT dark. `CAMCatalogLoaderEngine` (counts/coverage) + 25 per-system `*FunctionIndexEngine` + 8 Phase-5 engines + `cam_catalog_load_*`/`cam_func_*` actions already exist. The grounded data lives in `mcp-server/data/cam-functions/<system>/*.json` (Fusion 27 ops/497 params, hyperMILL 52/724, Mastercam 56/510). What was MISSING: (a) a normalized cross-system per-operation parameter ENUMERATION+validation surface, (b) a completeness MEASUREMENT.

**Built:**
- `mcp-server/src/engines/CAMCatalogQueryEngine.ts` — normalized cross-system query: `listSystems/listOperations/getOperationParams/lookupParam/validateOperation/coverage`. One `NormalizedCamParam{name,label,type,default,unit,min,max,enumValues,required,description,system,operation,uiTab}`. **Canonical key is `id ?? name`** (Fusion uses name, Mastercam/hyperMILL use id; hyperMILL carries BOTH — id is the machine key, name is the label). Robust **recursive walker** `extractInto` handles every layout: Fusion `section.<op>.tabs.<tab>.params[]`, Mastercam `toolpaths[]`/`pages` + strategy-maps `section.{roughTurning,…}` + `modules`-plural + keyed audit sections, hyperMILL `operations[].dialogs[].parameters[]` + db `menus[].dialogs[]`. Depth-capped 12, dedup per (op,param), fail-soft per file.
- `prism_cam` actions: `cam_catalog_operations`, `cam_catalog_operation_params`, `cam_catalog_param_lookup`, `cam_catalog_validate_op` (enum + switch in camDispatcher.ts).
- `mcp-server/src/__tests__/camDispatcher.catalog-query-wire.test.ts` — 16/16: engine-direct real-data across all 3 systems (Fusion adaptive_clearing spindle_speed 1-60000rpm; Mastercam dynamic_mill machining_strategy enum; hyperMILL 5ax_swarf_cutting CURVE_CONTACT 0-1) + validate failure modes (out-of-range/unknown/invalid-enum/missing-required) + dispatcher round-trip.
- `scripts/cam-catalog-completeness-audit.mjs` → `state/shared/CAM-CATALOG-COVERAGE.{json,md}` — observed ops/params vs claimed → coverage%, thin/stub ops, optional `cam-catalog-target-universe.json` for stricter universe%. ADVISORY + mustHumanVerify.

**Honest coverage (the "do we have everything" answer):** Fusion **59%** (497/847 claimed), hyperMILL **152%** (observed>claimed, well-covered), Mastercam **55%** (510/923), 0 thin ops. So NO, not exhaustive — Phase 2 grounded fill (~40% remaining for Fusion/Mastercam, from vendor PDFs/OPEN MIND/Mastercam X8 docs/seats; **never hallucinate** a param) is the multi-session campaign. Plan: `H:/.claude/plans/rippling-inventing-hopper.md`. 0 net-new tsc errors (548 baseline). Two real bugs caught mid-build: id-vs-name key (hyperMILL) + the rigid walker missing Mastercam (17%→55%). See [[reference_kilo_cam_psn_edges_complete_2026_05_29]] · [[reference_kilo_cam_collision_gate_2026_05_29]].
