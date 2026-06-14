---
name: reference_cimco_bridge_engine_spine1_2026_06_02
description: SPINE-1 of CIMCO integration shipped — CimcoVerificationBridgeEngine + prism_cimco dispatcher; the in-process surface every galaxy calls; + a fail-open ??/|| port lesson.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.061Z
aliases: reference_cimco_bridge_engine_spine1_2026_06_02
---


# CIMCO SPINE-1 — bridge engine + prism_cimco dispatcher (slot:echo, 2026-06-02)

**What shipped** (`cad-fusion-live-ms0`, commits `1031ecea70` + parity-fix `d7dfb6ded6`):
`mcp-server/src/engines/post-processor/CimcoVerificationBridgeEngine.ts` + `prism_cimco` dispatcher (`mcp-server/src/tools/dispatchers/cimcoDispatcher.ts`, registered in `index.ts`) + schema `cimcoActionSchemas.ts` + tests `src/__tests__/CimcoVerificationBridgeEngine.test.ts` (22/22).

**6 actions:** `cimco_inventory_summary` · `cimco_machine_query` · `cimco_post_query` · `cimco_tool_query` · `cimco_sim_report_evaluate` · `cimco_control_channels`. This is **SPINE-1** of the CIMCO integration — the single invocable in-process surface every galaxy calls (the plots doc dependency root). romeo's `CIMCO-TOOLDB-FILL-MS0` ([[reference_cimco_tmlib_exporter_2026_06_02]]) is the reverse direction (PRISM tools → .tmlib).

**Design (no logic dup):** the engine READS the 3 generated index JSONs under `state/shared/cimco/` (machine/post/tool — fail-soft, never re-parses `.mcfg`/`.js`/`.tmlib`; the `.mjs` indexers stay canonical). `evaluateSimulationReport()` is a faithful TS port of `scripts/cimco-control-map.mjs#parseSimulationReport` (the pass/fail gate), parity-locked by tests. Units-first: every machine/tool result carries units-resolution status; `summary().unitsUnresolvedTotal` surfaces the 44/86 units-unresolved `.mcfg`. A sim-clean verdict is labeled `controllerVerified:false` ("conformance-clean, NOT controller-verified").

**THE LESSON (generalizable — see [[feedback_port_gate_operator_byte_faithful]]):** the first cut used `??` (nullish) where canonical used `||` (logical OR) in the grouped-report branch. A falsy-but-present singular key (`{collision: 0, collisions:[{line:2}]}`) made `??` keep the `0`, `Array.isArray(0)===false`, and the real findings array was **silently dropped** → the gate returned `pass:true` on a program the canonical CLI FAILS. **Fail-OPEN in a safety gate.** Caught by 3-of-3 scrutiny arm B; arms A + C both PASSED it (A explicitly mis-called `??`/`||` "behaviorally equivalent"). Fix: `??`→`||` + a regression-lock parity test that exercises the divergent input. Wiki: [[cimco-verification-simulation-integration]] §Shipped, tribal tip #13.

**Still pending:** SPINE-2 live UIA driver (needs the running licensed app) + per-galaxy impls (juliett ingest, romeo edge-closure, foxtrot/whiskey `.mcfg`, kilo tool-map, charlie cycle-time, hotel MDC/DNC).
