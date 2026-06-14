---
name: reference-u-bridge-wire-mastercam-2026-05-18
description: U-BRIDGE-WIRE-MASTERCAM shipped 2026-05-18 echo — 10 mastercam_cad_function_index_* actions wired
aliases: reference_u_bridge_wire_mastercam_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.990Z
---


# U-BRIDGE-WIRE-MASTERCAM — MastercamCADFunctionIndexEngine wired (2026-05-18 echo)

Shipped 2026-05-18 by claude-00a9c6dc slot echo, commit `2f2c5b0ef5`. Closes 1 of 3 unwired Mastercam engines flagged in today's echo loop themes (loop-201ca088 "fix tsc + wire unwired engines").

**The class fix:** `MastercamCADFunctionIndexEngine` had a complete static API (getIndex/listModules/getModule/listOperations/listAllOperations/getOperation/findParameter/searchParameters/getOperationsByCategory/getTotalParameterCount) but ZERO dispatcher references. Every consumer would have had to import the engine class directly. Now wired via 10 snake_case actions on `camDispatcher` mirroring the `fusion360_function_index_*` / `inventor_hsm_function_index_*` sibling pattern.

**Actions (all 10):** `mastercam_cad_function_index_{get,list_modules,get_module,list_operations,list_all_operations,get_operation,find_parameter,search_parameters,get_operations_by_category,get_total_parameter_count}`.

**Tests:** 18-case vitest suite (`mcp-server/src/__tests__/MastercamCADFunctionIndexDispatcher.test.ts`) pins schema_version `1.0.0` + the 8 canonical module ids in order (wireframe / solid / surface / drafting / transformation / analysis / modify / file_layer) + dispatcher source-grep anti-regression on all 10 enum entries + 10 case statements + the lazy import path + R12 throw-path source contract on `getIndex`'s "not found" error. 18/18 PASS.

**Per-file 2-reviewer gate:** wiring-review-agent + reviewer, both PASS, 0 P0/P1 after the Arm-B throw-path test was added.

**No namespace collision:** the pre-existing `mastercam_controller_*` enum entries at camDispatcher.ts:1492 route to `MastercamControllerCatalogEngine` (a DIFFERENT namespace — controller/post catalog, not CAD function index). Source-grep confirmed only 6 files reference `MastercamCADFunctionIndexEngine` and none expose a competing dispatcher action.

**Remaining 2 unwired Mastercam engines** (today's echo theme continuation):
- `MastercamControllerCatalogEngine.ts` (standalone) — ghost-wired by `BatchCAMControllerEngines.ts` sibling; standalone is effectively orphaned. Decision: archive-rename or merge — DEFERRED.
- `MastercamHeadlessIntegrationTestEngine.ts` — test scaffold for headless Mastercam automation (X8 through 2025). Probably WIRE-EXEMPT (test harness, not a runtime engine) — DEFERRED.

Sister: [[reference_juliett_devtools_synergy_map_2026_05_17]] (CAMSpeedFeedBridgeEngine 4→6 tier-1 systems shipped iter 4 of loop-cdc4a2c4).
