---
name: reference_sfc_inference_gate_wire_la1_2026_06_01
description: "AI-SYSTEMS-SWEEP Unit 4 (LA-1): wired the trained-SFC-LoRA inference belt (SFCInferenceGateWireEngine) into live inference via prism_calc:ultimate_speed_feed. Gate-miss = untouched-baseline passthrough (avoids spurious adapted:true). Scrutiny caught + fixed an inlined wrong sfm constant (3.281 -> canonical METERS_TO_FEET). Commit 3d470ac75f."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.186Z
aliases: reference_sfc_inference_gate_wire_la1_2026_06_01
---


> **STATUS CORRECTION (slot:india 2026-06-15, verified):** the dispatcher WIRING is **NOT live on the main tree** (cad-fusion-live-ms0). Commit `3d470ac75f` is slot/india-only — `git merge-base --is-ancestor` confirms it is NOT an ancestor of main HEAD. On main: `SFCInferenceGateWireEngine.ts` + `sfcInferenceGateSchema.ts` + the engine test EXIST, but `mcp-server/src/tools/dispatchers/calcDispatcher.ts` has **zero** `applyToSFCResult`/`sfcGate`/`adapter_info` refs — the `ultimate_speed_feed` routing below is absent. So this is **another item stranded on slot/india, unmerged** (same class as the 6 features in `INDIA-MERGE-PLAN-MS0.md`). It is "wired" only on slot/india; it does NOT reach live inference on main until cherry-picked/merged. Add it to the india merge-landing queue. (Below describes the slot/india implementation, which remains correct on that branch.)

**Shipped (slot india, 2026-06-01, AI-SYSTEMS-IMPROVEMENT-SWEEP Unit 4 "LA-1"; commit `3d470ac75f` on slot/india):** the trained SFC LoRA adapters now reach live inference. `prism_calc:ultimate_speed_feed` (calcDispatcher.ts ~4913) routes the `UltimateSpeedFeedEngine.calculate()` baseline through `sfcInferenceGateWireEngine.applyToSFCResult(baseline, {engine, material, iso_group, operation})` and attaches `adapter_info: gated.gateOutput`.

**Design — gate-miss is an untouched-baseline passthrough (NOT `gated.result`):**
```ts
result = gated.gateOutput.adapter_hit
  ? { ...gated.result, adapter_info: gated.gateOutput }   // real adapter hit: adopt merged values
  : { ...baseline, adapter_info: gated.gateOutput };        // gate-miss: UNTOUCHED baseline
```
Why not always use `gated.result`: `SFCInferenceGateWireEngine.mergeAdaptedValues` (lines 168-201) spreads the existing OptimizedValue and only overrides `value` + adds `adapted: true`. It does NOT flatten / lose `.unit`. But on a gate-MISS the gate's `adapted` map is the baseline numbers themselves, so `gated.result` would stamp every mapped field `adapted: true` even though no adapter fired — an **observability lie**. The miss path returns the untouched baseline so nothing is mislabeled. `adapter_info` is still attached (the belt is observable: `adapter_hit:false` + `gate_version:"1.0.0"` survive `slimResponse`; the null `adapter_used`/`adapter_status` are dropped but carry no signal a miss needs).

**AI-T8 self-correction:** my first dispatcher comment claimed the merge "flattens to bare numbers / loses .unit" — FALSE (reading mergeAdaptedValues proved it preserves structure; the earlier test failure was `'RPM'` not `undefined`, confirming `.unit` survived). The real reason is the spurious `adapted:true`. Comment corrected. Lesson: verify your OWN comment rationale against the code, not just agent claims. [[feedback_verify_actual_contract_not_proxy]]

**Scrutiny-caught P1 (reviewer A):** `SFCInferenceGateWireEngine.ts:159` had `baseline.sfm = baseline.vc * 3.281` — an inlined physics constant AND wrong (m->ft is exactly `1/0.3048 = 3.280839895`, the intl foot; 3.281 is 0.005% low). My wiring activates that path, so I fixed it: added `export const METERS_TO_FEET = 1 / 0.3048;` to `mcp-server/src/physics/constants.ts` and imported it. NEVER-inline rule honored. [[feedback_foxtrot_canonical_constants_import]]

**Test:** `mcp-server/src/__tests__/calcDispatcher.sfcGate.integration.test.ts` (2 tests, via real `registerCalcDispatcher` handler + `JSON.parse` round-trip incl. slimResponse). Test 1 asserts passthrough invariant — `"adapted" in spindle_rpm === false` (fails if anyone reverts to unconditional `gated.result`). Test 2 asserts the belt ran (gate_version "1.0.0" + adapter_hit false). Rejected reviewer B's "no JSON round-trip / fake-reader" finding — it was a misread (cited nonexistent `invokeActionWithHandler`); B withdrew it on re-review. Both reviewers PASS round 2.

Sibling sweep units this session: [[reference_wikilink_graphrank_arm_2026_06_01]] (Unit 1), [[reference_reasoning_outcome_loop_cl5_2026_06_01]] (Unit 2), [[feedback_meta_learning_trigger_intentional_retirement_2026_06_01]] (Unit 3). Spec: `state/shared/specs/AI-SYSTEMS-IMPROVEMENT-SWEEP-2026-05-31.md`.
