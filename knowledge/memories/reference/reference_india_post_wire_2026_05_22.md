---
name: reference-india-post-wire-2026-05-22
description: india /loop 2026-05-22 — wired 2 orphaned post-processor engines into prism_cam; action-drift JSDoc trap + PostProcessorUnification Math.random bug
aliases: reference_india_post_wire_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.619Z
---


# INDIA-POST-WIRE — 2 orphaned post engines wired (2026-05-22 india /loop)

Session `bde6fa1d`, slot india, /loop. Shipped 2 wired units into `prism_cam` (camDispatcher.ts), 3-of-3 scrutiny PASS:

- **U-MASTERCAM-CTRL-CAT** (`1e5a7860bc`) — wired `MastercamControllerCatalogEngine` (E1204, 18 families / 70+ post variants) as 9 `cam_mastercam_controller_*` actions (list/get/search/by_axis/by_capability/dialect/tribal_tips/find_for_machine/stats). 12-case round-trip test.
- **U-CTRL-CALIB-WIRE** (`45307688ad`) — wired `MultiControllerCalibrationEngine` (cross-dialect calibration harness) as 3 `cam_controller_calibration_*` actions. The engine consults posts via a `ControllerProbe` abstraction (carries an `emissions()` method — not JSON-safe); the dispatcher reconstructs probes from plain JSON via the engine's `StaticControllerProbe` class, and `compare_all` defaults to `canonicalProbes()`. 7-case test.

Both replicate the already-wired Fusion360 sibling pattern (`cam_fusion360_controller_*`).

## Reusable findings

1. **Action-drift JSDoc trap** — `MastercamControllerCatalogEngine`'s own header declared `@actions mastercam_controller_list/lookup/...` but those action names route to a *different* engine (`BatchCAMControllerEngines` via `getEngine("mastercamCtrlCat")`, which exposes only `.lookup()`/`.listControllers()`). When wiring an unwired engine, **do not trust its `@actions` JSDoc** — grep the dispatcher case to see which engine the named action actually calls. The rich catalog had ZERO real dispatcher refs despite the JSDoc claim.

2. **PostProcessorUnificationEngine is stub-quality — do NOT wire** — line 72 `verified: Math.random() > 0.3` fabricates the config `verified` flag non-deterministically (so `getStats().coveragePercent` is random per run); templates are placeholder strings. Skipped — wiring random data into a safety platform is negative ROI. The `Math.random()` is a dormant R12 bug (no caller while unwired).

3. **U-ROUTEFIX2 (BP-MS0) route portion is already clean** — cross-checked all 50 `callTool` targets in `mcp-server/src/routes/ppg.ts` against the live `prism_cam`/`prism_product` action enums: **0 drift**. The ppg route file is well-formed.

## Remaining india work (loop continues)
ACP-MS5 P0-U01/02/03 (controller detection / template selection / post verification chains — envelopes history-stripped, large builds) and AI-TRAINING-FIRST-MS0 post units (CNCController/PostProcessor deep-learning training). Both are build-scope, not quick wirings.

See [[feedback_high_roi_backend_first_slot_queue]] · [[feedback_checkin_args_are_primary_work_order]].
