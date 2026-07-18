# CAM-EXHAUST-MS1-04: Fusion 360 Inspection Module

## Context

User's standing priority: full-blown CAM function/input/feature exhaust on Fusion → hyperMILL → Mastercam → Inventor HSM → Esprit → SolidCAM. We're 3 modules into the Fusion MS1 deep pass: Probing (MS1-01), Additive (MS1-02), Cutting (MS1-03). Per AskUserQuestion just asked, next module is **Inspection** — chosen as the natural follow-on to Probing (probing = on-machine cycles; inspection = CMM planning, tolerance analysis, GD&T validation, reporting).

Working in own worktree per CLAUDE.md conflict-fork rule: `H:/prism-fusion-ms1`, branch `work/cam-fusion-ms1`, forked from `0a8cf8f8a` (the just-pushed roadmap commit).

**Critical Phase-1 finding**: `probing.json` already contains 3 inspection-flavored ops (`INSPECT_FEATURE_VERIFY`, `INSPECT_TOLERANCE_GATE`, `INSPECT_SPC_LOG`). The Inspection module must complement, not duplicate — focus on **planning, analysis, reporting** layers above raw probe cycles.

## Scope — 10 operations, ~175 parameters

| # | Operation | Category | ~Params | Purpose |
|---|---|---|---|---|
| 1 | `CMM_PLAN_GENERATE` | Planning | 22 | Auto-generate inspection path from GD&T-tagged CAD |
| 2 | `CMM_SAMPLING_STRATEGY` | Planning | 18 | Point density, scan pattern, datum sequence |
| 3 | `TOLERANCE_STACK_ANALYZE` | Analysis | 16 | RSS / worst-case stack-up |
| 4 | `TOLERANCE_STACK_MONTE_CARLO` | Analysis | 18 | Statistical stack-up with distributions |
| 5 | `GDT_VALIDATE` | Validation | 16 | GD&T frame validation (datum order, modifier compatibility) |
| 6 | `GDT_ZONE_CHECK` | Validation | 18 | Feature within tolerance zone (form/orientation/location/runout) |
| 7 | `PROBE_COMPENSATION_CALIBRATE` | Compensation | 14 | Pre-travel bias, deflection, dynamic error |
| 8 | `SURFACE_FORM_ANALYZE` | Analysis | 16 | Flatness / cylindricity / roundness from point cloud |
| 9 | `GENERATE_INSPECTION_REPORT` | Reporting | 14 | PDF / CSV / QIF output, pass/fail summary |
| 10 | `COMPARE_TO_CAD` | Analysis | 18 | Best-fit point-cloud-to-model, deviation heatmap |

## Common tab structure (5 tabs)

- **Process** — probe selection, contact mode, inspection trigger
- **Geometry** — target features, datums, GD&T tags
- **Inspection** — sampling strategy, point density, tolerance allocation
- **Analysis** — algorithms, statistics, pass/fail thresholds
- **Report** — output format, fields, GD&T summary

## Physics links (catalog-string, not constants.ts)

Phase-1 confirmed physics_links are stringly-typed arrays in catalog JSON; constants.ts has no inspection-domain constants today. Defining these in `inspection.json`:

```
CMM_PROBE_CYCLE_TIME, TOLERANCE_STACKUP_RSS, TOLERANCE_STACKUP_MONTE_CARLO,
GDT_TOLERANCE_ZONE, SURFACE_FORM_DEVIATION, PROBE_PRE_TRAVEL_BIAS,
PROBE_DYNAMIC_ERROR, POINT_CLOUD_BEST_FIT_ALIGNMENT
```

## Files

**Create:**
- `mcp-server/data/cam-functions/fusion360/inspection.json` — ~600 lines, 10 toolpaths, ~175 params, metadata milestone `CAM-EXHAUST-MS1-04`

**Edit:**
- `mcp-server/data/cam-functions/fusion360/function-index.json` — append `inspection` module entry (`covered_units: ["U-CAM-MS1-04"]`, `parameter_count_estimate: 175`, `dependencies: ["probing"]`)
- `mcp-server/src/__tests__/Fusion360FunctionIndexEngine.test.ts` — add ~10 inspection tests (or sibling file `Fusion360InspectionModule.test.ts` if existing test sprawls)

**No changes to:**
- `Fusion360FunctionIndexEngine.ts` (module-agnostic, loads any registered catalog)
- `camDispatcher.ts` (existing actions are module-agnostic — `cam_fusion360_function_index_get_module`, etc., already work)
- `constants.ts` (no new physics constants needed; stringly-typed catalog convention is established)

## Test plan — 10 tests, happy + 3 failure modes

Reuse existing test file pattern: real catalog loads, no mocks.

Happy path:
1. `inspection` module is registered in function-index
2. `getModule("inspection")` returns catalog with `schemaVersion === "1.0.0"`
3. `toolpathCount === 10` (matches metadata)
4. Every toolpath has `parameterCount > 0` (no empty stubs)
5. `getOperationsByCategory("Analysis")` returns 4 ops (TOLERANCE_STACK_ANALYZE, MONTE_CARLO, SURFACE_FORM_ANALYZE, COMPARE_TO_CAD)
6. `findParameterByName("Sampling Strategy")` resolves to `CMM_SAMPLING_STRATEGY`
7. `physics_links` array contains expected 8 strings

Failure modes:
8. `getModule("inspection_typo")` returns null (unknown module ID)
9. `findOperationByName("nonexistent_op")` returns null
10. `getOperationsByCategory("ImaginaryCategory")` returns `[]` (empty, not crash)

## Verification

```bash
cd H:/prism-fusion-ms1/mcp-server
npm run build:fast                                         # tsc must pass
npx vitest run src/__tests__/Fusion360FunctionIndexEngine.test.ts   # all green
npx vitest run --grep "inspection"                         # spot-check new tests only
```

## Commit + push

Commit on `work/cam-fusion-ms1` (own branch, not `work/cam-exhaust-ms0`):

```
CAM-EXHAUST-MS1-04: Fusion 360 Inspection module (10 ops, ~175 params, +10 tests)

Adds CMM-planning, tolerance-stack, GD&T-validation, surface-form, and
inspection-reporting toolpaths to the Fusion 360 function index.
Complements MS1-01 Probing (on-machine cycles) — no operation duplication.

Physics links: CMM_PROBE_CYCLE_TIME, TOLERANCE_STACKUP_{RSS,MONTE_CARLO},
GDT_TOLERANCE_ZONE, SURFACE_FORM_DEVIATION, PROBE_PRE_TRAVEL_BIAS,
PROBE_DYNAMIC_ERROR, POINT_CLOUD_BEST_FIT_ALIGNMENT.
```

Then push to `origin/work/cam-fusion-ms1`, record scrutiny mark.

## Out of scope (next milestones)

- MS1-05: Mill-Turn (sub-spindle sync, parts catcher, multi-channel)
- MS1-06: Manufacturing Model / Setup (workpiece, fixture, kinematics)
- MS1-07+: Deepen MS0 2D/3D milling per-op tab structure
