---
name: reference_tango_unwired_bridge_dispatcher_test_2026_06_15
description: tango closed the R15 gap from e1f7d3700c — prism_unwired_bridge had no dispatcher test; added a 14/14 true mock-server round-trip test. each-pass-feeds-next. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.221Z
aliases: reference_tango_unwired_bridge_dispatcher_test_2026_06_15
---


**TANGO UNWIRED-BRIDGE-DISPATCHER-TEST (slot tango, 2026-06-15, commit `19d17feef0`)** — cron /loop iter; closed the one R15 debt I flagged honestly last iter.

**THE GAP:** `e1f7d3700c` registered `prism_unwired_bridge` into index.ts but shipped it with build:fast + tsc validation ONLY — NO dispatcher test (the sibling algorithmDispatcher had 56/56; this had 0). I named it as a follow-up in [[reference_tango_register_unwired_bridge_dispatcher_2026_06_15]] rather than claim R15-complete. This iter closed it (loop-discipline #4 "fix the WEAKEST part" + #3 "each pass feeds the next").

**THE TEST** (`unwiredBridgeDispatcher.synergy.test.ts`, 14/14 vitest, 46ms): a TRUE round-trip, not engine-singleton-direct. A mock server captures the `server.tool(name, desc, schema, handler)` registration, then each action is invoked through the dispatcher's OWN switch + `validateActionParams` + lazy-import + engine + `slimResponse`. Coverage: registration (name + 10-action enum accept-all/reject-unknown); information-theory EXACT log2-bit values (entropy [0.5,0.5]=1.0, [1,1,1,1]=2.0, [1]=0; KL(p||p)=0; Gibbs KL>0); asset-discovery reachability; 4 failure modes (empty/negative/NaN dist via schema, unknown action via switch default); R12 coverage-honesty test NAMING golden_baseline_init + predictive_world_simulate as deliberately-not-invoked (state-mutating) — not silently dropped (my soul refuses "reporting coverage without naming what was dropped").

**KEY CONTRACTS verified-on-disk before asserting** (so assertions are real, not stubs — R9): `FisherInformationEngine.entropy` = Shannon bits (log2), normalizes unnormalised mass, round6 -> exact values assertable. `slimResponse` DROPS empty-array values + null/undefined but keeps `0` and non-empty objects -> success-path `{success:true,data:{entropy:0}}` survives, but asset actions returning `data:[]` lose the data key (so assert `success===true` only, not data). dispatcherError spreads `success:false` TOP-LEVEL (+ content text) while the success path nests success inside content.text -> failure tests assert `res.success===false`, happy tests assert `parsed.success===true`.

**LESSON:** a dormant-dispatcher registration is only R15-complete WITH a round-trip test — build+tsc proves it compiles/wires, not that the actions actually round-trip. Mock-server-capture is the hermetic pattern (no live MCP bridge needed; bridge was down all session). Sister: [[reference_tango_register_unwired_bridge_dispatcher_2026_06_15]], [[reference_tango_register_algorithm_dispatcher_2026_06_15]].
