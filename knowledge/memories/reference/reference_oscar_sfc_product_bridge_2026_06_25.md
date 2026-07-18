---
name: reference_oscar_sfc_product_bridge_2026_06_25
description: "P0 (slot:oscar 2026-06-25): the SFC web calculator was 100% non-functional -- prism_product:sfc_calculate false-blocked EVERY web calc at the pre-machine-completeness-gate because the page posts FLAT machine_max_rpm/machine_power_kw but the gate reads NESTED machine.spindle.*. calcDispatcher bridged its sf_* actions; productDispatcher did not. Fixed via shared applySfcMachineBridge."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.711Z
aliases: reference_oscar_sfc_product_bridge_2026_06_25
---


**Commit:** U-OSC-SFC-PRODUCT-BRIDGE ([SFC-WEB-ACCURACY], slot:oscar, cad-fusion-live-ms0, 2026-06-25).

**Bug (live-verified on the running :3100 bridge):** the SFC web page (`mcp-server/web/src/components/sfc/buildSfcRequest.ts`) posts FLAT `machine_max_rpm`/`machine_power_kw` to `POST /api/v1/sfc/calculate` -> `prism_product:sfc_calculate`. The `pre-machine-completeness-gate` (`mcp-server/src/hooks/MachineValidationHooks.ts:426`, fires in the dispatcher `pre-calculation` phase, runs BEFORE Zod in productDispatcher) reads the NESTED `machine.spindle.{max_rpm,power_kw}` shape. So it false-blocked EVERY web SFC calculation ("INCOMPLETE MACHINE DATA: spindle.max_rpm, spindle.power"). `calcDispatcher` already bridged its `sf_orchestrate`/`sf_quick` actions (U-SFC-MACHINE-HOOK-SHAPE, 2026-06-22) but `productDispatcher` -- the path the WEB PAGE actually hits -- did not.

**Proof:** flat payload -> `{blocked:true, blocker:"pre-machine-completeness-gate"}`; nested `machine.spindle.*` -> full correct result (1045 slot, 10mm 4FL carbide, 10000rpm/15kW: Vc 200 m/min, rpm 6366, fz 0.137mm, feed 3487mm/min, Fc 2889N, 9.63kW, tool_life 8.9min, Ra 1.47um N7, MRR 174cm3/min, safety 1.0, Kienzle+Taylor cited, uncertainty bands). The backend ENGINE was correct all along; only the dispatcher-gate wiring blocked it.

**Fix:** centralize the flat->nested bridge into ONE shared `applySfcMachineBridge(action, params)` + `SFC_BRIDGE_ACTIONS` set (`mcp-server/src/utils/sfcMachineBridge.ts`); wire it into `productDispatcher.ts` after normalizeParams + before the pre-calculation hooks; refactor `calcDispatcher.ts`'s inline block to call the shared helper (behavior-identical for sf_orchestrate/sf_quick). Additive + non-destructive: SFC compute actions only, never overwrites an explicit `machine`, genuinely-incomplete data STILL blocks (no safety softening).

**Tests:** +6 unit vs the REAL gate (`sfcMachineBridge.test.ts`, 15/15) + new `sfc-product-bridge-roundtrip.test.ts` (registers the real gate into the singleton `hookExecutor` so it is LIVE on the dispatch path, then drives `registerProductDispatcher` end to end: no-machine BLOCKS, flat-bridged PASSES -- reverting the productDispatcher hunk turns it red). 0 new tsc errors (the 2 pre-existing are in unrelated `ReinforcementLearningCAMFeedbackEngine.ts`). Per-file 2-arm scrutiny PASS.

**Lesson (R8/R7):** a dispatcher pre-hook gate that reads a DIFFERENT param shape than the client posts will silently false-block the whole product path -- and a fix applied to ONE dispatcher (calc) does NOT cover a sibling dispatcher (product) hitting the same gate. When a hook reads a normalized/nested shape, bridge the client shape in EVERY dispatcher that fires that hook, via one shared helper (don't fork). Also: an isolated unit harness does NOT register server-startup hooks -- to round-trip-test a gate you must register it into the singleton executor yourself. Related: [[feedback_frontend_ui_owned_by_desktop_claude_2026_06_25]] (a backend defect surfaced through the frontend is still backend work).
