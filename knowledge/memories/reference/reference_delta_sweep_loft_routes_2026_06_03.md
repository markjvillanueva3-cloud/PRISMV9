---
name: reference_delta_sweep_loft_routes_2026_06_03
description: U-CADFL-SWEEP-LOFT — first advanced-feature live-bridge routes (sweep+loft+offset-plane) + the fn-index map is only ~82-85% (NOT the COMPLETE it claims) + the remaining intricate-geometry route punch list.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.551Z
aliases: reference_delta_sweep_loft_routes_2026_06_03
---


# U-CADFL-SWEEP-LOFT — advanced Fusion live-bridge routes (slot:delta, 2026-06-03)

**Why this matters:** delta's closed loop was PROVEN ([[reference_delta_live_closed_loop_proven_2026_06_01]]) but HARD-CAPPED at simple geometry (extrude/revolve/hole/fillet/chamfer/shell). The wall to "highly intricate CAD + assemblies" was NOT the function-index map — it was the **live bridge route surface**: the add-in implemented only 17 routes and had no way to *drive* sweep/loft/etc. even though the map catalogs them. This unit wires the first two.

## The two-layer finding (workflow wg9a1cjad, 4 agents, 655k tok)
1. **The fn-index MAP** (`mcp-server/data/cad-functions/fusion360/`, 8 modules, ~98 python_api, ~950 params) is **~82-85% complete, NOT 100%** — its `function-index.json` `coverage_state:"COMPLETE"` / `fusion_cad_8_of_8:true` is OVERSTATED (R12 drift). `platform_integration.form_workspace:false` already half-admits it. Missing whole ops: **Form/T-Spline (the organic-surface blocker), Coil/Helix, Surface Loft/Sweep/Ruled/NURBS, Pipe, Emboss, Sketch Text, Replace Face, primitives, Split Face, Joint Origin, Lofted Flange.** Depth on present ops is excellent (~950 params honest).
2. **The live BRIDGE** had 17 routes; sweep/loft/etc. were mapped-but-not-drivable.

## SHIPPED this unit
- **Add-in** `resources/fusion360/prism-api-server/prism_api_server.py`: `_handle_sweep` (sweepFeatures, profile+path, twist/taper), `_handle_loft` (loftFeatures, 2+ sections, solid/surface, closed), `_resolve_sketch` helper, `_handle_sketch` extended with `offset_mm` (offset construction plane for stacked loft profiles). ROUTE_POST + DISPATCH + docstring 17→19; route-count message now `len(DISPATCH)` (no future drift). 29/29 pytest.
- **Bridge** `mcp-server/src/engines/Fusion360LiveBridgeEngine.ts`: `sweep()`, `loft()`, `createSketch({offset_mm})` — validation returns structured `{success:false,error}` (engines/CLAUDE.md convention), pass-through to dedicated routes.
- **Test** `mcp-server/src/__tests__/Fusion360LiveBridgeEngine.sweepLoft.test.ts` — 11/11, real route+payload+result-mapping contract (passed test-legitimacy gate). tsc-clean (my files; workspace has unrelated pre-existing errors).

## KEY decision (R7)
**Dedicated route** pattern (like extrude/revolve), NOT codegen-via-`/execute` (like revolveStepProfile/extrudeTapered). Reason: closed-loop generation must not depend on the `PRISM_FUSION_RAW_DISABLE=1` operator kill switch. Every future advanced feature → dedicated route.

## REMAINING route punch list (next units, dependency-ordered)
Map ✓ / bridge ✗ (just need the route — fastest): **draft, rib, web, mirror, path-pattern, split-body, boundary-fill.**
Map ✗ AND bridge ✗ (plot map + add route): **coil/helix** (springs/threads/worm), **pipe**, **emboss + sketch-text**, **replace-face**, **primitives**, **split-face**, **lofted-flange (sheet-metal)**, **joints + joint-origin (assemblies — the "and assemblies" half of the goal)**, **Form/T-Spline 9th module (organic surfaces — highest-leverage, hardest)**, **surface loft/sweep/ruled/NURBS.**

## LIVE-TEST gate (open)
Add-in routes are code-only until a Fusion instance RELOADS the add-in. Operator-designated port [[reference_delta_cad_port_18632]] (18632) was DOWN at build time; live instance was on :18365. Live sweep/loft proof = relaunch add-in (it picks up the new routes), `/new` doc, sketch profile + path, call sweep; same for loft on offset-plane sketches.

Related: [[reference_delta_cad_training_pipeline_2026_05_31]] · [[reference_delta_live_closed_loop_proven_2026_06_01]] · galaxy `mcp-server/src/engines/cad-fusion-live/MEMORY.md`.
