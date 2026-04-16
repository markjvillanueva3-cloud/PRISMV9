# MCAT-MS0 Variability Census

Date: 2026-04-02
Generated: 2026-04-03T01:37:48.670Z
Lane: `MCAT-MS0 / P1-U01 support`

## Current Gate

- Collaboration mode: `finish-current-delivery-first`
- Active gate: `finish-current-backend-and-frontend-work-first`

## Headline Counts

- Machines, merged enhanced corpus: `920`
- Machines, stale MachineRegistry header: `824`
- Machines, SVI summary: `910`
- Tools, intended historical corpus: `95,608`
- Tools, active raw rows: `15,912`
- Tools, active id-bearing rows: `15,911`
- Tools, active unique ids: `13,967`
- Materials, master reference: `163`
- Materials, live detail JSON files: `214`
- Workholding top-level records: `20`
- Calculator fallback machines/tools/materials/workholding: `17/19/40/5`
- Calculator programming environments/toolpaths: `66/337`
- Backend strategy registry headline: `762+ Strategies across 5 major categories`
- Holder sample count for mill + magazine + CAT40: `909`

## Reconciliation

- WARN `machines_header_vs_live_enriched`: MachineRegistry header = `824`, ALL_MACHINES_ENRICHED.json = `920`
  MachineRegistry metadata still lags the merged enhanced machine corpus.
- WARN `machines_svi_vs_live_enriched`: SVI summary = `910`, ALL_MACHINES_ENRICHED.json = `920`
  SVI still reports 910 machines while the merged enhanced machine corpus on disk is 920.
- GAP `tools_target_vs_active_unique`: Historical/SVI tool corpus = `95,608`, Active live unique ids = `13,967`
  The active live tool roots are far below the intended PRISM tool universe and must be recovered before exhaustive calculator proof can be honest.
- WARN `tools_raw_vs_id_bearing`: ToolRegistry wrapped raw rows = `15,912`, id-bearing tool rows = `15,911`
  At least one helper row exists in data/tools that does not carry an id and does not become a live tool record.
- WARN `materials_header_vs_detail_json`: MaterialRegistry header = `1,047`, ISO-group detail JSON files = `214`
  MaterialRegistry header count and actual live detail-file count do not currently reconcile.
- WARN `calculator_toolpaths_vs_backend_strategy_registry`: Calculator static toolpaths = `337`, Backend strategy registry headline = `762+ Strategies across 5 major categories`
  Calculator toolpath surface is still much smaller and static relative to the backend strategy corpus.

## Source Families

- [machines] `machine_enriched_json` -> `920` via `calculator_live_and_downstream`
  paths: data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json
  notes: Primary merged machine truth currently used by the live calculator machine search path.
- [machines] `machine_registry_source_dirs` -> `11` via `backend_reference`
  paths: mcp-server/src/registries/MachineRegistry.ts
  notes: Registry metadata still references 11 unique machine source directories across extracted and enhanced layers.
- [machines] `machine_registry_header_claim` -> `824` via `stale_metadata`
  paths: mcp-server/src/registries/MachineRegistry.ts
  notes: Header still says 824 machines even though merged enhanced JSON currently contains 920.
- [tools] `cutting_tools_index` -> `1,944` via `calculator_live_via_tool_search`
  paths: data/tools/CUTTING_TOOLS_INDEX.json
- [tools] `drilling` -> `360` via `calculator_live_via_tool_search`
  paths: data/tools/DRILLING.json
- [tools] `endmill_catalogs` -> `937` via `calculator_live_via_tool_search`
  paths: data/tools/ENDMILL_CATALOGS.json
- [tools] `hole_finishing` -> `189` via `calculator_live_via_tool_search`
  paths: data/tools/HOLE_FINISHING.json
- [tools] `indexable_milling_toolholding` -> `984` via `backend_live_only`
  paths: data/tools/INDEXABLE_MILLING_TOOLHOLDING.json
  notes: Present in backend roots, but not yet fully surfaced in the calculator holder route.
- [tools] `manufacturer_catalogs` -> `1,051` via `calculator_live_via_tool_search`
  paths: data/tools/MANUFACTURER_CATALOGS.json
- [tools] `milling` -> `948` via `calculator_live_via_tool_search`
  paths: data/tools/MILLING.json
- [tools] `specialty` -> `240` via `calculator_live_via_tool_search`
  paths: data/tools/SPECIALTY.json
- [tools] `threading` -> `126` via `calculator_live_via_tool_search`
  paths: data/tools/THREADING.json
- [tools] `toolholders` -> `6,741` via `calculator_holder_live`
  paths: data/tools/TOOLHOLDERS.json
- [tools] `tools_hierarchy` -> `1` via `calculator_live_via_tool_search`
  paths: data/tools/TOOLS_HIERARCHY.json
- [tools] `turning` -> `81` via `calculator_live_via_tool_search`
  paths: data/tools/TURNING.json
- [tools] `turning_holders_expanded` -> `600` via `backend_live_only`
  paths: data/tools/TURNING_HOLDERS_EXPANDED.json
  notes: Present in backend roots, but not yet fully surfaced in the calculator holder route.
- [tools] `turning_inserts` -> `1,710` via `calculator_live_via_tool_search`
  paths: data/tools/TURNING_INSERTS.json
- [tools] `tool_registry_active_unique_ids` -> `13,967` via `backend_live_root`
  paths: data/tools/*.json, extracted/tools/*
  notes: Current active live root is far below the intended 95,608-tool historical corpus.
- [tools] `tool_registry_raw_rows` -> `15,912` via `backend_live_root`
  paths: data/tools/*.json
  notes: Includes one non-id helper row; id-bearing rows are slightly lower.
- [tools] `tool_intended_historical_corpus` -> `95,608` via `target_not_recovered`
  paths: PRISM-DESKTOP-PROJECT-INSTRUCTIONS.md, CLAUDE.md, CAMX-RESTRUCTURED-ROADMAP-v24.md, api/v1/dev/svi/summary
  notes: This is the historical/full corpus target, not the currently active live tool root on disk.
- [materials] `materials_master_reference` -> `163` via `reference_only`
  paths: data/materials/MATERIALS_MASTER.json
  notes: MaterialRegistry currently loads ISO-group detail JSONs, not MATERIALS_MASTER.json directly.
- [materials] `materials_detail_json` -> `214` via `calculator_live_via_material_search`
  paths: data/materials/**/*.json
  notes: These are the files MaterialRegistry actively loads into the live material search path.
- [materials] `materials_extracted_js` -> `46` via `raw_corpus_only`
  paths: extracted/materials/**/*.js
  notes: Present on disk, but not part of the current MaterialRegistry live load path.
- [materials] `material_registry_header_claim` -> `1,047` via `stale_metadata`
  paths: mcp-server/src/registries/MaterialRegistry.ts
  notes: Registry header still claims 1,047 materials; live master reference currently lists 163 top-level materials and 214 detail JSON files.
- [workholding] `vises` -> `5` via `backend_reference_fallback_ui`
  paths: data/workholding/WORKHOLDING.json
  notes: Calculator currently exposes only a small fallback workholding surface rather than the full workholding corpus.
- [workholding] `chucks` -> `4` via `backend_reference_fallback_ui`
  paths: data/workholding/WORKHOLDING.json
  notes: Calculator currently exposes only a small fallback workholding surface rather than the full workholding corpus.
- [workholding] `collets` -> `4` via `backend_reference_fallback_ui`
  paths: data/workholding/WORKHOLDING.json
  notes: Calculator currently exposes only a small fallback workholding surface rather than the full workholding corpus.
- [workholding] `fixtures` -> `5` via `backend_reference_fallback_ui`
  paths: data/workholding/WORKHOLDING.json
  notes: Calculator currently exposes only a small fallback workholding surface rather than the full workholding corpus.
- [workholding] `toolholders` -> `2` via `backend_reference_fallback_ui`
  paths: data/workholding/WORKHOLDING.json
  notes: Calculator currently exposes only a small fallback workholding surface rather than the full workholding corpus.
- [cam_toolpaths] `calculator_programming_environments` -> `66` via `calculator_fallback_only`
  paths: mcp-server/web/src/data/calculatorWorkspace.ts
  notes: Static frontend CAM environment surface; not yet backed by the backend strategy registry.
- [cam_toolpaths] `calculator_toolpaths` -> `337` via `calculator_fallback_only`
  paths: mcp-server/web/src/data/calculatorWorkspace.ts
  notes: Frontend toolpath surface is still static even though backend strategy registry is much larger.
- [cam_toolpaths] `backend_strategy_registry_header` -> `762+ Strategies across 5 major categories` via `backend_live_only`
  paths: mcp-server/src/registries/ToolpathStrategyRegistry.ts
  notes: Strategy registry headline remains much larger than the calculator's current static toolpath set.
- [calculator_fallback] `calculator_machine_fallback` -> `17` via `calculator_fallback_only`
  paths: mcp-server/web/src/data/calculatorWorkspace.ts
  notes: Used only when live machine search fails or is unavailable.
- [calculator_fallback] `calculator_tool_fallback` -> `19` via `calculator_fallback_only`
  paths: mcp-server/web/src/data/calculatorWorkspace.ts
  notes: Very small compared with the active live tool registry and the intended historical tool corpus.
- [calculator_fallback] `calculator_material_fallback` -> `40` via `calculator_fallback_only`
  paths: mcp-server/web/src/data/calculatorWorkspace.ts
  notes: Fallback only; live material path is backed by MaterialRegistry detail JSONs.
- [calculator_fallback] `calculator_workholding_fallback` -> `5` via `calculator_fallback_only`
  paths: mcp-server/web/src/data/calculatorWorkspace.ts
  notes: Workholding is still mostly static in the calculator UI.

## Consumer Matrix

- `calculator` -> `partial`
  truth: mixed_live_and_fallback
  machine: live /api/v1/data/machine/search + static fallback
  tool: live /api/v1/data/tool/search + tiny static fallback
  holder: live /api/v1/data/holder/catalog from TOOLHOLDERS.json only
  workholding: static fallback only
  cam/toolpath: static fallback only
- `user_machine_profile` -> `partial`
  truth: backend_canonical_contract
  machine: canonical package + overlay contract exists
  tool: planned preference storage only
  holder: planned preference storage only
  workholding: overlay-ready
  cam/toolpath: preference-ready
- `program_release` -> `partial`
  truth: partially_converged_machine_consumer
  machine: shared search/lookup/facets live
  tool: not converged
  holder: not converged
  workholding: not converged
  cam/toolpath: not converged
- `print_to_cnc` -> `pending`
  truth: target
  machine: planned parity target
  tool: planned parity target
  holder: planned parity target
  workholding: planned parity target
  cam/toolpath: planned parity target

## Immediate Next

- U-MVAR02 - define the legality graph and bundle schema against the discovered source families
- Recover the missing tool corpus path so active live tool roots move materially closer to the intended 95,608-tool universe
- Promote workholding and backend toolpath registry surfaces out of fallback-only status in the calculator

## Repro

- Generator: [mcat-variability-census.mjs](/scripts/mcat-variability-census.mjs)
- Command: `node --experimental-strip-types H:/PRISM/scripts/mcat-variability-census.mjs --date 2026-04-02`
