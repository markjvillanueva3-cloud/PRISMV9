---
title: U-BRIDGE-WIRE-MASTERCAM (2026-05-18)
domain: cam
kind: architecture
status: shipped
shipped_at: 2026-05-18
commit: 2f2c5b0ef5
slot: echo
---

# U-BRIDGE-WIRE-MASTERCAM — Mastercam CAD Function Index dispatcher wiring

## Why

`MastercamCADFunctionIndexEngine` exposes 10 static methods for navigating the Mastercam CAD authoring catalog (8 modules: wireframe, solid, surface, drafting, transformation, analysis, modify, file_layer). The engine was complete but had **zero dispatcher references** — every consumer had to import the engine class directly, defeating the MCP-routing surface. The unit wires all 10 methods through `camDispatcher` as snake_case actions.

## Sibling pattern

Mirrors the existing `fusion360_function_index_*` (Fusion360FunctionIndexEngine) and `inventor_hsm_function_index_*` (InventorHSMFunctionIndexEngine) clusters in the same dispatcher. Per-case lazy import, `{success: true, ...}` or `{success: false, error: "..."}` ternary on nullable returns.

## Actions

| Action | Engine method |
|---|---|
| `mastercam_cad_function_index_get` | `getIndex()` |
| `mastercam_cad_function_index_list_modules` | `listModules()` |
| `mastercam_cad_function_index_get_module` | `getModule(module_id)` |
| `mastercam_cad_function_index_list_operations` | `listOperations(module_id)` |
| `mastercam_cad_function_index_list_all_operations` | `listAllOperations()` |
| `mastercam_cad_function_index_get_operation` | `getOperation(module_id, operation_id)` |
| `mastercam_cad_function_index_find_parameter` | `findParameter(module_id, operation_id, parameter_name)` |
| `mastercam_cad_function_index_search_parameters` | `searchParameters(query, limit?)` |
| `mastercam_cad_function_index_get_operations_by_category` | `getOperationsByCategory(category, module_id?)` |
| `mastercam_cad_function_index_get_total_parameter_count` | `getTotalParameterCount()` |

## Anti-regression contract

The 18-case test at `mcp-server/src/__tests__/MastercamCADFunctionIndexDispatcher.test.ts` pins:
- `index.schema_version === "1.0.0"` (catches catalog re-versioning)
- 8 canonical module ids in order (catches dropped/added modules)
- All 10 enum entries + 10 case statements present in `camDispatcher.ts` source (catches wiring-row drops)
- Lazy-import path string present
- `getIndex` throw-path source contract — the engine MUST throw with the canonical `Mastercam CAD function index not found:` prefix (catches a future "helpful" refactor that swaps the throw for `return null`)

## No namespace collision

The pre-existing `mastercam_controller_*` action cluster routes to `MastercamControllerCatalogEngine` (a different namespace — controller/post catalog). Source-grep confirmed only 6 files reference `MastercamCADFunctionIndexEngine` and none expose a competing dispatcher action.

## See also

- `mcp-server/src/engines/MastercamCADFunctionIndexEngine.ts`
- `mcp-server/src/tools/dispatchers/camDispatcher.ts` (action enum line ~1911, switch cases line ~16380)
- `mcp-server/data/cad-functions/mastercam/function-index.json` (the indexed catalog)
- `mcp-server/src/engines/Fusion360FunctionIndexEngine.ts` (sibling pattern)
- Memory: `reference_u_bridge_wire_mastercam_2026_05_18`
