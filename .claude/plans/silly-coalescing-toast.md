# SOLIDWORKS-FIDX — CAD Function Index Engine (parity to Mastercam/Inventor)

## Context

PRISM has shipped CAD function-index engines for Inventor (8 modules, 983 params, all 8 complete) and Mastercam (8 modules, 815 params, all 8 complete). These engines load a JSON catalog that AI orchestration layers query to discover what CAD operations exist, what parameters each takes, and what units / defaults / constraints apply — used for parameter discovery, code generation grounding, and dispatcher routing.

**SolidWorks has the bridge layer (`SolidWorksAutomationBridge`, 432 lines) and the VBA code generator (`SolidWorksCodeGeneratorEngine`, 1161 lines, 4 dispatcher actions, 44 tests) but no function-index engine and no `data/cad-functions/solidworks/` JSON catalog.** Task #40 (`SOLIDWORKS-FIDX`) closes that gap.

The engine is consumed by AI orchestration paths so a model can answer "what extrude parameters does SolidWorks expose, with units and defaults?" without grepping. Without it, SolidWorks-side AI is blind to its own surface — the same gap Mastercam closed in U-CAD-FIDX-MC-01..08.

## Approach

8-unit exhaust mirroring Inventor's module taxonomy (closer to SolidWorks's feature-tree topology than Mastercam's layered topology). Each unit ships one module catalog + adds tests. Unit 01 also ships the engine, schemas, dispatcher wiring, and `function-index.json`. Subsequent units (02–08) only add JSON + tests.

### Module breakdown (8 modules, ~1010 params target)

| # | Module | Approx params | SolidWorks-specific concepts |
|---|---|---|---|
| 1 | `sketch_operations` | ~140 | smart dimensions, geometric relations (16+ types), blocks, equation-driven dims |
| 2 | `part_operations` | ~180 | features (extrude/revolve/sweep/loft + cuts), boundary, hole wizard, rib, dome, patterns (linear/circular/curve/sketch/table/fill), mirror, body ops (move/copy/scale/combine/split/intersect) |
| 3 | `surface_operations` | ~110 | lofted/swept/boundary/fill, planar, knit, trim/untrim, extend, replace face, delete face, thicken |
| 4 | `assembly_operations` | ~150 | 16+ mate types (standard + advanced + mechanical), exploded view, smart fasteners, in-context modeling, configurations |
| 5 | `drawing_operations` | ~140 | sheet/title block, 9 view types, 6 dimension types, GD&T (Y14.5), surface finish, weld symbols, BOM, revision table, design tables |
| 6 | `sheet_metal_operations` | ~140 | base/edge/miter/swept flange, hem, jog, sketched/lofted bend, gusset, vent, K-factor + bend tables + gauge tables, unfold/flatten |
| 7 | `weldment_operations` | ~80 | structural members (profile library), trim/extend, gusset, end cap, weld bead, cut list, weld symbols, multi-body |
| 8 | `evaluation_operations` | ~70 | measure, mass props, section props, interference, clearance, draft/undercut/thickness analysis, design checker, costing, sustainability |

**Where this diverges from Mastercam/Inventor:**
- Folds Inventor's `frame_generator_operations` into `weldment_operations` (SolidWorks weldments cover this domain natively).
- Adds `evaluation_operations` as a discrete module (parallel to Mastercam's `analysis_operations`); SolidWorks has rich first-class evaluation (interference, costing, sustainability) that doesn't fit cleanly inside part/assembly modules.
- Drops Mastercam's `transformation_operations`/`modify_operations`/`file_layer_operations` because SolidWorks folds these into part/assembly (transforms = features) and there is no concept of a CAD layer in SolidWorks (configurations + components handle that role).

### Worktree + branch strategy

Current branch `work/cam-exhaust-ms0` is diverged (24 ahead, 1 behind, 6906 uncommitted) and scoped to CAM-EXHAUST. Per `CLAUDE.md` Lane Discipline + Conflict-Fork Rule, SOLIDWORKS-FIDX gets its **own worktree + branch**:

```bash
git worktree add ../prism-cad-sw-fidx -b work/cad-fidx-solidworks main
cd ../prism-cad-sw-fidx
```

All commits use `[CAD-FIDX-SW]/U-CAD-FIDX-SW-NN: <title>` format. Handoff topic: `cad-fidx-solidworks`.

### This unit (U-CAD-FIDX-SW-01) — sketch_operations + scaffold

Files to create (in new worktree `H:/prism-cad-sw-fidx/`):

1. **`mcp-server/src/engines/SolidWorksCADFunctionIndexEngine.ts`** (~400 lines) — mirror `MastercamCADFunctionIndexEngine.ts` exactly:
   - Static class, lazy JSON cache (`indexCache`, `moduleCache: Map`, `loadErrors[]`)
   - 13 public methods: `getIndex / listModules / getModuleEntry / getModule / listAllOperations / listOperations / getOperation / findParameter / searchParameters / getOperationsByCategory / getTotalParameterCount / getLoadErrors / clearCache`
   - Path resolution: `__dirname + ../../data/cad-functions/solidworks/`
   - Type aliases: `SolidWorksCADFunctionIndex`, `SolidWorksCADModuleCatalog`, `SolidWorksCADOperation`, `SolidWorksCADParameter`, `SolidWorksCADParameterLocator`

2. **`mcp-server/data/cad-functions/solidworks/function-index.json`** — top-level index with all 8 modules listed (only `sketch_operations` marked complete; rest `parameter_count_estimate: 0`, `phase_1_modules_remaining: 7`).
   - `system_id: "solidworks"`, `module_id: "cad_function_index"`
   - `global_cross_references.dispatchers_touched: ["prism_cad", "prism_ai"]`
   - `global_cross_references.engines_linked: ["SolidWorksCADFunctionIndexEngine", "SolidWorksAutomationBridge", "SolidWorksCodeGeneratorEngine"]`
   - `platform_integration: { swApp_com_enabled: true, vba_macro_enabled: true, vsta_addin_enabled: true, configurations: true, design_tables: true, equations: true, sheet_metal_layer: false, weldment_layer: false, ... }` (set false for not-yet-shipped modules)

3. **`mcp-server/data/cad-functions/solidworks/sketch-operations.json`** (~30KB, ~140 params) — first module catalog:
   - `metadata`: title, milestone (`U-CAD-FIDX-SW-01`), source (`SolidWorks 2024 API Help — Sketch`), totalParameters, operationCount
   - `commonTabs`: standard tab names for SolidWorks sketch dialogs
   - `operations`: ~22 operations covering:
     - 5 line creators (centerline, midpoint line, 3-point arc line, tangent arc to entity, parallel)
     - 4 circle/arc creators (center+radius, perimeter, 3-point arc, tangent arc)
     - 2 spline creators (parametric, equation-driven)
     - 5 polygon/rectangle (regular polygon 3..40 sides, rectangle/center rect/3-point rect/3-point center rect, parallelogram)
     - 1 ellipse, 1 partial ellipse, 1 conic
     - 16 geometric relations (coincident, concentric, collinear, parallel, perpendicular, tangent, equal, equal_curve_length, horizontal, vertical, midpoint, intersection, fix, symmetric, merge, pierce)
     - 6 dimension types (smart, horizontal, vertical, baseline, ordinate, angular)
     - 2 sketch tools (block, derived)
   - Each operation: `description`, `category`, `solidworks_command` (e.g. `Sketch.CreateLine`), `solidworks_api` (e.g. `ISketchManager.CreateLine`), `parameterCount`, `tabs: { tabId: { parameters: [...] } }`

4. **`mcp-server/src/schemas/cadActionSchemas.ts` (or extend existing)** — add Zod schemas for 10 new dispatcher actions:
   - `solidworks_function_index_summary` (passthrough)
   - `solidworks_function_index_get` (passthrough)
   - `solidworks_function_index_list_modules` (passthrough)
   - `solidworks_function_index_get_module` ({ moduleId: string })
   - `solidworks_function_index_list_operations` ({ moduleId?: string })
   - `solidworks_function_index_get_operation` ({ moduleId: string, operationId: string })
   - `solidworks_function_index_find_parameter` ({ moduleId: string, operationId: string, parameterName: string })
   - `solidworks_function_index_search_parameters` ({ query: string, limit?: number })
   - `solidworks_function_index_get_operations_by_category` ({ category: string, moduleId?: string })
   - `solidworks_function_index_get_total_parameter_count` (passthrough)
   - Export as `ACTION_CAD_SW_FIDX_SCHEMAS` and merge into the dispatcher's schema map.

5. **`mcp-server/src/tools/dispatchers/cadDispatcher.ts`** — add 10 actions to the action enum + handlers, all routed to `SolidWorksCADFunctionIndexEngine`. Place adjacent to the existing 4 SolidWorks actions (lines 703–770) to keep the SolidWorks block contiguous.

6. **`mcp-server/src/__tests__/SolidWorksCADFunctionIndexEngine.test.ts`** — mirror the Mastercam test pattern, ~30 `it()` blocks for unit 01:
   - **Index structure** (5): system_id, module_id, schema_version, indexed_at ISO format, sketch_operations module present
   - **Module navigation** (4): listModules returns all 8, getModuleEntry shape, unknown module returns null, sketch_operations entry has covered_units `["U-CAD-FIDX-SW-01"]`
   - **Catalog loading** (5): schemaVersion, metadata.milestone is `U-CAD-FIDX-SW-01`, operations dict size 22, cache identity (returns same object on second call), failure mode (returns null + records loadError)
   - **Operation discovery** (4): listOperations exact sketch ops, category prefixing, param counts, listAllOperations spans only sketch (others empty)
   - **Parameter discovery** (10): smart dimension supports horizontal/vertical/aligned modes; line creator supports midpoint/parallel/centerline modes; geometric relations enumerate all 16; polygon supports inscribed + circumscribed + 3..40 sides; circle constraints support diameter + radius modes; etc.
   - **Total param count** (2): assert `getTotalParameterCount() === ~140 ± 5` (sketch only); assert error-free load of every operation

7. **`mcp-server/src/__tests__/cadDispatcher.solidworksFunctionIndex.test.ts`** — ~12 `it()` blocks covering each of the 10 dispatcher actions returning `{ success: true, … }` with correct shape.

### Existing assets to reuse (do NOT duplicate)

- `MastercamCADFunctionIndexEngine.ts` (`H:/prism-cam-ms1-93a0/mcp-server/src/engines/MastercamCADFunctionIndexEngine.ts`) — line-by-line template for class structure, types, methods.
- `InventorCADFunctionIndexEngine.ts` (`H:/prism-cam-ms1-93a0/mcp-server/src/engines/InventorCADFunctionIndexEngine.ts:1-408`) — alternative template.
- `MastercamCADFunctionIndexEngine.test.ts` (197 it blocks, 2069 lines) — test pattern reference (we'll start with ~30 for unit 01, scale to ~200 across all 8 units).
- `SolidWorksAutomationBridge.ts` — referenced in `engines_linked` for cross-references; not modified.
- `SolidWorksCodeGeneratorEngine.ts` — referenced in `engines_linked`; not modified. Its `capabilities.supportedOps` set may be cross-checked for parity.

### Constraints + safety

- All physics constants (none expected in CAD layer, but enforce defensively): import from `mcp-server/src/physics/constants.ts`. No inline values.
- Static class, lazy load (mirror Mastercam) — no I/O at module-import time, only on first method call.
- Schema version `"1.0.0"` to match Inventor + Mastercam.
- Engine is read-only (no writes to JSON catalog) — catalog is hand-authored or generated externally.
- Tests run real catalog load (not mocked) — same as Mastercam tests.
- Commit format: `[CAD-FIDX-SW-01]/U-CAD-FIDX-SW-01: SolidWorks CAD function index — sketch_operations (22 ops, ~140 params) + engine + dispatcher (10 actions) + 42 tests`

## Verification

End-to-end checks to run after the unit ships:

1. **Build passes:** `cd mcp-server && npm run build` (in the new worktree). Expect zero TS errors.
2. **Tests pass:** `cd mcp-server && npx vitest run SolidWorksCADFunctionIndex` — expect ~42 tests passing (30 engine + 12 dispatcher).
3. **Engine direct test (manual):**
   ```typescript
   import { SolidWorksCADFunctionIndexEngine as Eng } from './engines/SolidWorksCADFunctionIndexEngine.js';
   Eng.getIndex().module_name; // → "SolidWorks CAD Unified Function Index"
   Eng.listModules(); // → 8 module IDs
   Eng.getModule('sketch_operations').operations.SMART_DIMENSION; // → operation object
   Eng.findParameter('sketch_operations', 'SMART_DIMENSION', 'mode'); // → param locator
   Eng.getTotalParameterCount(); // → ~140
   ```
4. **Dispatcher round-trip:** Call `cadDispatcher` with `solidworks_function_index_summary` and `solidworks_function_index_get_module { moduleId: "sketch_operations" }` — expect `{ success: true, index/module: {...} }`.
5. **Anti-regression:** confirm the 4 existing SolidWorks dispatcher actions (`solidworks_generate_script`, `_build_part`, `_execute`, `_capabilities`) still pass their existing tests — adding the function-index actions must not break them.
6. **Catalog completeness:** assert `function-index.json.coverage_summary.phase_1_modules_pending` lists the 7 not-yet-shipped modules; `phase_1_modules_remaining: 7`.

After unit 01 ships, units 02..08 each add one module catalog + ~25 tests, decrementing `phase_1_modules_remaining` until it reaches 0 and `solidworks_cad_8_of_8: true`. Total target: ~200 tests, ~1010 parameters across 8 modules, full Inventor/Mastercam parity.

## Open question

Once you approve the overall 8-unit shape and the unit-01 scope, I'll fork the worktree and start. **But first decide:** ship unit-01 now (engine scaffold + sketch module only, ~5–6 hour scope), or batch-plan all 8 units up front? My recommendation is unit-01 now — same cadence Mastercam used (8 commits, 8 units). Each subsequent unit is independent and resumable.
