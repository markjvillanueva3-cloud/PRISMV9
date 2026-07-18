# FUSION CAM-AUTHORING NAVMAP — 100% plotted authoring backend

> **Purpose.** A future build navigates *every input function* needed to programmatically author a Fusion CAM program (turning + milling + 5-axis + mill-turn) from this one map. Synthesized 2026-06-01 (slot:kilo) from three reconnaissance maps: (1) the live add-in HTTP surface, (2) the `adsk.cam` authoring API, (3) the 15-family → strategy taxonomy.
>
> **Provenance legend per claim:**
> - `[DOC]` — grounded in the live add-in source `fusion360_api_server.py` (3532 lines, port `:18365`) or official Autodesk Fusion API docs.
> - `[INFER]` — inferred from API shape / corpus / convention; verify against a live `.parameters` dump before a generator relies on it.
> - `[UNVERIFIED]` — strategy string / param name not yet confirmed against a live seat.
>
> **Source files:** add-in `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` · matrix `state/shared/cam-drive/CAM-OP-TEMPLATE-MATRIX.json` (schema 1.1.0, 15 families) · instance-coord `state/shared/cam-drive/FUSION-INSTANCE-COORDINATION.md` (delta :18362 / kilo :18365). **INCH everywhere** — JM Die fleet is LTH-01..07 **100% Okuma OSP** turning; `PostUnits.InchesOutput` on every post.

---

## 1. COVERAGE SCORECARD

| Axis | Current add-in exposes | Full `adsk.cam` authoring surface | Gap |
|---|---|---|---|
| Document control (new/save/close/undo/params) | ✅ complete `[DOC]` | same | 0% |
| Design/geometry READ (tree/features/B-Rep/feature-candidates) | ✅ complete `[DOC]` | same | 0% |
| CAM READ (setups/stock/bodies/tools/posts/programs) | ✅ complete `[DOC]` | same | 0% |
| **Setup CREATE** (mill/turn, stock, models) | ✅ `_create_cam_setup` `[DOC]` | `Setups.createInput → .add` | ~80% (no explicit WCS/origin) |
| **Setup WCS / origin / Z-flip** | ❌ defaults only | `SetupInput.parameters` (`wcs_*`) | **MISSING** |
| **Operation CREATE by strategy** | ✅ `_create_cam_operation`, 21-entry `OPERATION_TYPE_MAP` `[DOC]` | `Operations.createInput('<strategy>') → .add` | ~70% (no geometry bind) |
| **Operation GEOMETRY bind** (faces/edges/pockets/contours) | ❌ none | `CadContours2dParameterValue` / `CadObjectParameterValue` on op params | **MISSING — biggest gap** |
| **Tool assign** (library + inline) | ✅ `_assign_cam_tool` `[DOC]` | `operationInput.tool = tool` | ~90% |
| **Op parameters** (mapped + raw native) | ⚠️ mapped keys + `raw_parameters` blind passthrough `[DOC]` | `CAMParameters.itemByName().value` | PARTIAL (no enumerate/validate) |
| **Tool-axis / 5-axis orientation** (3+2, lead/lean, swarf, tilt-modes) | ❌ none | `tool_orientation*` / `tool_leadAngle` / `tool_tiltAngle` params | **MISSING** |
| **Turning op GEOMETRY** (profile/groove/thread/face binding) | ❌ setup-only | turning strategies + geometry params | **MISSING** |
| **Op EDIT / DELETE / REORDER** | ❌ create-only | mutate `Operation.parameters`; collection remove/move | **MISSING** |
| **Toolpath GENERATE** (async + poll) | ✅ `_generate_cam_toolpath` + `/cam/toolpath/status` `[DOC]` | `CAM.generateToolpath → GenerateToolpathFuture` | ~95% |
| **NCProgram + POST** | ✅ `_cam_post_process` `[DOC]` | `NCPrograms.createInput → NCProgram.postProcess` | ~85% |

### Scorecard verdict
- **Current plotted: ~55–60%** of the authoring surface needed to *build a correct program*. The **happy-path skeleton is complete and live-proven** (setup → operation → tool → toolpath → post, mapped + raw params).
- **Plotted target: 100%** — reached by adding the **5 input functions that make a program *correct* not merely *created***: geometry binding, tool-axis, WCS, op-edit, turning-geometry.
- **The exact gap (55→100%):** authoring is **create-only and geometry-blind**. An op is created and parameterized but never told *what to cut* or *how to aim the tool*; toolpaths generate against op defaults, not intended features. `/cam/feature-candidates` *identifies* features but nothing *assigns* them.

---

## 2. `adsk.cam` AUTHORING API MAP — the navigable input-function tree

> The canonical create-chain. Every node is an input function a driver must call in order. `[DOC]` = official Autodesk Fusion API; param *names* are `[INFER]`/`[UNVERIFIED]` (no typed accessors — all parameter-string driven).

```
adsk.core.Application.activeDocument
 └─ products.itemByProductType('CAMProductType') → adsk.cam.CAM            [DOC]  (the authoring gateway)
     │
     ├─ 2A. SETUP  ───────────────────────────────────────────────────────────────
     │   CAM.setups : Setups
     │   Setups.createInput(operationType) → SetupInput                    [DOC]
     │       operationType ∈ { MillingSetupOperationType,
     │                         TurningSetupOperationType,                  ← JM lathe path
     │                         AdditiveSetupOperationType }                [DOC]
     │   SetupInput.models           = [BRepBody...]                       [DOC]  part bodies
     │   SetupInput.stockMode        ∈ CAMStockModes                       [DOC]
     │                                 (relativeBox/fixedBox/fixedCylinder/fromSolid)
     │   SetupInput.parameters : CAMParameters                            [DOC]
     │       ├─ job_stockMode, stock offsets/sizes        [INFER name]
     │       ├─ WCS:  wcs_orientation, wcs_origin*         [INFER name]   ← NO typed WCS object
     │       ├─ stockSolids  (stock-from-solid attach)     [INFER]
     │       └─ fixtures     (clamp bodies → collision)    [INFER]
     │   Setups.add(setupInput) → Setup                                    [DOC]
     │   Setup.{operations, folders, patterns, machine, fixtures}          [DOC]
     │
     ├─ 2B. OPERATION  ──────────────────────────────────────────────────────────
     │   setup.operations : Operations   (or folder.operations)
     │   Operations.createInput('<strategyString>') → OperationInput       [DOC]  ← string id, NOT enum
     │       (milling: 'face','pocket2d','adaptive','contour2d','parallel','scallop','drill'…
     │        turning: 'turningFace','turningProfileRoughing','turningProfileFinishing',
     │                 'turningGroove','turningSingleGroove','turningPart','turningThread'
     │        hole:    'drilling' (one strategy; cycle param differentiates spot/peck/tap/bore)
     │        5-axis:  'swarf','multiAxisContour','flow','morphedSpiral','rotary'…)         §3/§4
     │   OperationInput.tool         = Tool                                [DOC]  (§2D)
     │   OperationInput.displayName  = str                                 [DOC]
     │   OperationInput.parameters : CAMParameters                         [DOC]
     │       ├─ GEOMETRY  ── the load-bearing gap ──                       [DOC mechanism / INFER names]
     │       │    CAMParameter.value : CAMParameterValue
     │       │    geometry selections live in:
     │       │      • CadContours2dParameterValue.getCurveSelections() → CurveSelections
     │       │            .createNewChainSelection() / .createNewPocketSelection()  [DOC]
     │       │      • CadObjectParameterValue   (faces/bodies)              [DOC]
     │       ├─ PASSES/HEIGHTS  (stepdown, stepover, clearance, retract, feed plane) [INFER names]
     │       ├─ LINKING        (lead-in/out, ramp, transitions)            [INFER names]
     │       └─ TOOL-AXIS (5-axis)  tool_orientation*, tool_leadAngle,
     │                              tool_tiltAngle, toolOrientation modes   [INFER/UNVERIFIED]  §4
     │   Operations.add(operationInput) → Operation                        [DOC]
     │   Operation.{parameters, tool, toolpath, hasToolpath, isValid,
     │              isSuppressed, cycleTime}   ← read/EDIT after create     [DOC]
     │
     ├─ 2C. GENERATE  ───────────────────────────────────────────────────────────
     │   CAM.generateToolpath(operation|setup|folder) → GenerateToolpathFuture  [DOC]
     │   CAM.generateAllToolpaths(skipValid:bool)      → GenerateToolpathFuture  [DOC]
     │   Future.{isGenerationCompleted, numberOfOperations, numberOfCompleted}   [DOC]
     │       ⚠ ASYNC-ONLY: poll in an adsk.doEvents() loop; no sync block.       [DOC]
     │   CAM.checkInterference(...) → collision flags                            [DOC]
     │
     ├─ 2D. TOOL  ───────────────────────────────────────────────────────────────
     │   CAMManager.libraryManager : CAMLibraryManager                     [DOC]
     │   .toolLibraries : ToolLibraries
     │       .urlByLocation(LibraryLocations) →  Local/Fusion360/Cloud     [DOC]
     │       .toolLibraryAtURL(url) → ToolLibrary                          [DOC]
     │   ToolLibrary iterable<Tool>; .toolByGroupAndType(...)              [DOC]
     │   Tool.{parameters, copy()};  Tool.createFromJson(jsonStr)          [DOC]  ← inline tool path
     │   bind:  operationInput.tool = tool                                 [DOC]
     │
     └─ 2E. NCPROGRAM / POST  ────────────────────────────────────────────────────
         CAM.ncPrograms : NCPrograms                                       [DOC]
         NCPrograms.createInput() → NCProgramInput                         [DOC]
         NCProgramInput.{displayName, operations[], postConfiguration(url),
                         parameters}                                       [DOC]
         NCPrograms.add(input) → NCProgram                                 [DOC]
         NCProgram.postProcess(PostProcessInput) → writes NC file          [DOC]
         (legacy) PostProcessInput.create(name, postCfgPath, outFolder, PostUnits)  [DOC]
         PostUnits ∈ {DocumentUnitsOutput, InchesOutput, MillimetersOutput}[DOC]
             → JM/Okuma: ALWAYS InchesOutput; .cps = Okuma OSP post        [INFER, INCH invariant]
```

**Structural truths a driver must encode** `[DOC]`:
1. **No typed strategy enum** — `createInput` takes a **camelCase string id**; discover valid ids from a template / existing op `.strategy`, never hard-assume.
2. **No first-class WCS object** — WCS/origin/orientation is *only* named `CAMParameter` strings on `SetupInput.parameters`.
3. **No typed tool-axis accessors** — 5-axis lead/lean/tilt are parameter strings; extract names from a live multi-axis op `.parameters` dump.
4. **No multi-turret / sub-spindle scheduling object** — turret/spindle assignment + sync timing live in the **machine config + post**, only thin op-param exposure.
5. **Geometry binds via parameter-value objects**, not a method — `CadContours2dParameterValue` / `CadObjectParameterValue` set on the op's geometry `CAMParameter`.
6. **Generation is async** — `GenerateToolpathFuture` + `adsk.doEvents()`; the add-in already wraps this as `/cam/toolpath` + `/cam/toolpath/status` poll.

---

## 3. 15-FAMILY → `fusion_strategy` TABLE (replaces all `fusion_strategy_verified=false` guesses)

> Matrix `CAM-OP-TEMPLATE-MATRIX.json` currently carries **descriptive UI labels** with `fusion_strategy_verified=false` for **all 15** families. Below are the real `adsk.cam` strings. **Confirmed `[DOC]`** from the official Turning Workflow API sample: `turningFace`, `turningProfileRoughing`. Milling `parallel`/`scallop`/`swarf` confirmed `[DOC]`. Others `[INFER]`/`[UNVERIFIED]`.
>
> **LOAD-BEARING CORRECTION:** Fusion does **not** have 15 distinct turning op-types. The real turning set is **~7 strategy strings** + `drilling` (one strategy, many *cycle* params). 6 of the 15 matrix families collapse onto a smaller strategy set + a differentiating **orientation / cycle / mode** param. The 15 families remain valid **PRISM template families** (distinct cutting-condition rules + JM tool bindings) — but the generator must bind **strategy string + differentiating param**, not invent 15 strategies.

| # | PRISM family | Matrix guess (`false`) | **Real `adsk.cam` strategy string** | Differentiating param | Status |
|---|---|---|---|---|---|
| 1 | facing | `face` | **`turningFace`** | — | `[DOC]` confirmed |
| 2 | OD_roughing | `turning (profile roughing)` | **`turningProfileRoughing`** | orientation=outside | `[DOC]` confirmed |
| 3 | OD_finishing | `profile (turning finishing)` | **`turningProfileFinishing`** | orientation=outside | `[INFER]` (pattern of #2) |
| 4 | ID_boring | `bore (turning, inside)` | **`turningProfileRoughing`** + inside orientation | `orientation=inside` — NOT a separate strategy | `[INFER]` **was WRONG** |
| 5 | drilling_centering | `drill + center spot` | **`drilling`** | `cycle=spot` (drilling cycle) | `[INFER]` collapses to `drilling` |
| 6 | grooving | `groove / face-groove` | **`turningGroove`** | mode=radial | `[INFER]` |
| 7 | parting_cutoff | `part (cutoff)` | **`turningPart`** | — | `[INFER]` |
| 8 | threading | `thread (turning)` | **`turningThread`** | — | `[INFER]` |
| 9 | profile | `profile (general contour)` | **`turningProfileFinishing`** (+`turningProfileRoughing`) | — reuses #2/#3, not unique | `[INFER]` |
| 10 | face_grooving | `face groove` | **`turningGroove`** + **Face mode**, or **`turningSingleGroove`** | `mode=face` flag | `[INFER]` Face is a *mode*, not a strategy |
| 11 | chamfer | `chamfer (turning)` | **NO dedicated strategy** — geometry inside `turningProfileFinishing` / lead-chamfer on `turningGroove`/`turningPart` | profile-feature | `[INFER]` **was WRONG** |
| 12 | bore_finish | `bore (single-line finish)` | **`turningProfileFinishing`** + inside orientation | `orientation=inside` | `[INFER]` **was WRONG** (= #3 inside) |
| 13 | live_tool_milling | `mill (live C/Y)` | **MILLING set** on rotary/turning setup: `face`,`pocket2d`/`adaptive`,`contour2d`,`engrave`,`drilling` | C/Y-axis gated | `[INFER]` **was WRONG** (not one op) |
| 14 | peck_drill | `drill (peck/deep)` | **`drilling`** | `cycle=chip-breaking`/`deep-drilling` | `[INFER]` peck = cycle param |
| 15 | tap | `tap (synchronized)` | **`drilling`** | `cycle=tapping`/`right-tapping` | `[INFER]` tap = cycle param |

**Missing family the matrix does not model at all:** **`turningSingleGroove`** (Single Groove — back-of-part relief before parting / positional grooving). `[DOC: Autodesk turning-updates blog]`

**Verification action for the generator:** set `fusion_strategy_verified=true` only after a live add-in dump of an existing op's `.strategy` confirms each string. Mark families 4/11/12/13 as **collapse-mappings** (strategy + param), not standalone strategies. Add the `drilling`-**cycle** axis (spot/chip-breaking/deep-drilling/tapping/right-tapping/boring) — families 5/14/15 are ONE strategy + cycle.

---

## 4. 5-AXIS + MULTI-TURN OP TAXONOMY (for 100+op intricate programs)

### 4A. 5-axis / multi-axis MILLING strategies — **entirely UN-modeled in the matrix** (turning-only today)

| Fusion 5-axis strategy | API string | Status | Use |
|---|---|---|---|
| Swarf | `swarf` | `[DOC]` | flank-cut ruled walls with side of tool |
| Multi-Axis Parallel | `parallel` (multi-axis via tool-axis params) | `[DOC]` | parallel passes, tilted axis |
| Scallop / steep-shallow | `scallop` | `[DOC]` | constant-scallop finishing |
| Multi-Axis Contour | `multiAxisContour` | `[INFER]` | drive-curve simultaneous contour |
| Flow | `flow` | `[INFER]` | surface-flow finishing between rails |
| Morphed Spiral | `morphedSpiral` | `[UNVERIFIED]` | spiral morph between boundaries |
| Rotary | `rotary` | `[UNVERIFIED]` | 4th-axis wrap finishing |
| Multi-Axis Blend | `multiAxisBlend` | `[UNVERIFIED]` | blend between two drive curves |
| Geodesic | `geodesic` | `[UNVERIFIED]` | even-stepover organic finish |
| Deburr (multi-axis) | `deburr` | `[UNVERIFIED]` | automated 5-axis edge break |

**Tool-axis TILT MODES** (NOT strategies — `toolAxis`/tilt **CAM parameters** set per op; generator selects the mode) `[INFER param family]`:
Fixed (3+2 positional) · tilt away/toward part · tilt through line/point/curve · lead/lean (vs travel dir) · from-point/to-point · normal-to / from-surface · tilt-range limit (collision avoid).

### 4B. MULTI-TURN (mill-turn / multi-spindle) — **entirely UN-modeled** (family 13 is the only live-tool stub)

| Multi-turn capability | Fusion mechanism | Status |
|---|---|---|
| Sub-spindle transfer / pickup | `turningPart` + part-transfer/secondary-spindle params + secondary-spindle Setup orientation | `[INFER]` |
| Bar Pull | dedicated turning strategy (`barFeed`/`stockTransfer`) | `[UNVERIFIED]` (newer Autodesk turning update) |
| Stock transfer / cut-off-and-catch | part-catcher M-codes on `turningPart` + 2nd-spindle grab | `[INFER]` |
| B-axis mill-turn (tilting head) | milling strategies + B-axis tool-orientation; B-axis turning = Profile + orientation param | `[INFER]` |
| C-axis live milling | milling set on C-axis (= matrix family 13) | `[INFER]` |
| Y-axis live milling/drilling | milling set + `drilling` Y-offset positioning | `[INFER]` |
| Polar / cylindrical interpolation | milling + polar (G12.1/G112) machining-mode flag → maps to JM corpus M110/G138 | `[INFER]` corpus-observed |

### 4C. What PRISM does NOT yet model (the operation-count multiplier — path to 100+ programs)
1. `turningSingleGroove` strategy — not a family. `[DOC]`
2. Strategy-string accuracy — 4 families (ID_boring, chamfer, bore_finish, live_tool_milling) bound to **non-existent** strategy names; re-map per §3.
3. `drilling`-**cycle** taxonomy (spot/chip-breaking/deep/tapping/boring) — families 5/14/15 are ONE strategy + cycle.
4. **All ~8–10 5-axis milling strategies + tool-axis tilt-mode param family** — zero coverage.
5. **All multi-turn ops** — sub-spindle transfer, Bar Pull, B-axis, Y-axis, polar — zero coverage.

> **JM/Okuma cross-ref `[INCH]`:** JM fleet is 100% Okuma OSP turning, INCH, `G95` feed-per-REV implicit modal default (misreading as /min = 12–60× feed error). The Fusion authoring layer is unit/dialect-agnostic — INCH + Okuma OSP enter only at the **post** (`PostUnits.InchesOutput` + Okuma `.cps`). The 5-axis/multi-turn machinery above is largely **aspirational for JM today** (LTH-01..07 are turning lathes); it's the surface required to reach the matrix goal "*a CAM operation for ALL operations in Fusion*" + intricate 100+op programs, not all of it maps onto current JM iron.

---

## 5. PRIORITIZED ENDPOINT-ADDITION LIST (make `fusion360_api_server.py` drive-capable)

> Dependency-ordered. Each new HTTP handler annotated with the `adsk.cam` call it wraps. **Present today** `[DOC]`: `/cam/setup` (`_create_cam_setup`), `/cam/operation` (`_create_cam_operation`, 21-strategy `OPERATION_TYPE_MAP`), `/cam/assign-tool` (`_assign_cam_tool`), `/cam/toolpath` + `/cam/toolpath/status` (`_generate_cam_toolpath`), `/cam/post` (`_cam_post_process`). The 7 below close 55→100%.

> **BUILD STATUS (2026-06-02):** **#3 ✅ BUILT** (`_list_cam_operation_parameters`, commit `09d54916e9`) — read-only, real-shape tested (6/6), wired into `_dispatch_get`. It surfaces an op's real `.strategy` + param names → the mechanism that flips `fusion_strategy_verified` false→true. **#5 ✅ BUILT + #7 ✅ BUILT** (`_edit_cam_operation` / `_delete_cam_operation` / `_reorder_cam_operation`, commit pending) — wired into `_dispatch_post`, real-shape tested (20/20, `test_cam_op_lifecycle.py`). Edit sets only caller-supplied **verified** Fusion param names (unknown → reported in `failed`, never guessed); delete refuses an implicit target (`deleteMe()`); reorder is capability-detected best-effort (fail-soft REFUSE with available methods + fallback when the API lacks a move — never a silent no-op). **GATE (still open):** #1/#2/#4/#6 are param-name SETTERS binding `[INFER]`/`[UNVERIFIED]` names — R13-gated on a **live #3 dump** (operator loads `PRISM_Fusion_Drive` on kilo's `:18361` so #3 loads, then hit `GET /cam/operation/parameters` on a real op to verify names). #5's edit mechanism is the SAME `itemByName/.expression` path #3 verifies — once #3 confirms names, the gated setters become thin wrappers over #5.

| Order | New endpoint | Handler | Wraps (`adsk.cam`) | Why / unblocks | Priority |
|---|---|---|---|---|---|
| **1** | `POST /cam/operation/geometry` | `_set_cam_operation_geometry` | op `CAMParameter.value` → `CadContours2dParameterValue.getCurveSelections().createNewChainSelection()` / `createNewPocketSelection()`; `CadObjectParameterValue` for faces | **HIGHEST — blocks correct toolpaths.** Assigns *what to cut* (faces/edges/pockets/contours, or a named group from `/cam/feature-candidates`). Without it every toolpath generates against op defaults. Mandatory for ALL 2D contour/pocket/face + ALL turning ops. | P0 |
| **2** | `POST /cam/setup/wcs` | `_set_cam_setup_wcs` | `SetupInput.parameters` / `Setup.parameters` → `wcs_orientation`, `wcs_origin*`, Z-flip `[INFER names]` | Sets WCS origin + orientation explicitly (today relies on Fusion defaults → wrong datum). Pairs with setup create. | P0 |
| **3** | `GET /cam/operation/parameters?strategy=…` | `_list_cam_operation_parameters` | enumerate `op.parameters` → name/type/range/enum per `CAMParameter` | Lets the driver **validate `raw_parameters` before blind-setting** (today raw_parameters is name-blind, fail-soft). Prereq for safe param authoring + tool-axis. | P0 (enables 1,4,5) |
| **4** | `POST /cam/operation/tool-axis` | `_set_cam_operation_tool_axis` | op `CAMParameters` → `tool_orientation*`, `toolOrientation` mode enum, `tool_leadAngle`, `tool_tiltAngle` `[INFER/UNVERIFIED]` | Aims 5-axis ops: 3+2 plane / fixed vector / lead-lean / tilt-through-line/point / normal-to-surface. `OPERATION_TYPE_MAP` already lists `swarf_5ax`/`multiaxis_contour` strategies that can be *created but not aimed* today. | P1 |
| **5 ✅** | `POST /cam/operation/edit` | `_edit_cam_operation` | resolve op by setup+name/index → set `raw_parameters` {name:expr} via `itemByName/.expression` (idempotent, per-param fail-soft) | **BUILT.** Authoring was create-only; now a wrong-param op is corrected in place. Enables iterative re-author + the closed-loop optimize regimen. Caller supplies #3-verified names. | P1 |
| **6** | `POST /cam/turning/geometry` (profile/groove/thread/face) | `_set_cam_turning_geometry` | turning op `CAMParameters` → turning-profile/groove/thread geometry + spindle-mode/CSS/chuck params | Turning parity: setup accepts `type:"turning"` but no endpoint binds turning geometry or spindle/CSS/chuck. **Directly serves the JM matrix** (15 turning families). | P1 |
| **7 ✅** | `POST /cam/operation/delete` + `POST /cam/operation/reorder` | `_delete_cam_operation` / `_reorder_cam_operation` | `op.deleteMe()` / `setup.operations.move` (capability-detected) | **BUILT** (POST not DELETE — body carries the op selector; `_dispatch_delete` is path-only). Delete refuses implicit target. Reorder fail-soft REFUSEs when the API lacks move (never silent). Completes lifecycle (create→edit→delete→order) for multi-op program builds. | P2 |

**Dependency chain:** `#3 (enumerate params)` is the keystone — `#1 geometry`, `#4 tool-axis`, `#5 edit`, `#6 turning-geometry` all set named `CAMParameter`s and need #3 to validate names first. Recommended build order: **3 → 1 → 2 → 6 → 4 → 5 → 7**. With **1+2+3** the add-in produces *correct milling programs*; **+6** unlocks the JM turning matrix; **+4** unlocks 5-axis; **+5/+7** complete the lifecycle for intricate 100+op programs.

> **Verify-before-bind discipline `[INFER]`:** because no typed enums/accessors exist for strategy strings, WCS params, or tool-axis params, every name in §2/§3/§4 marked `[INFER]`/`[UNVERIFIED]` must be confirmed against a **live `/cam/operation/parameters` dump (endpoint #3)** before the generator commits it. This is the single mechanism that flips `fusion_strategy_verified=false` → `true` across the matrix.
