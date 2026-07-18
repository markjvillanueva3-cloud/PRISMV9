---
name: reference_oscar_sfc_wiring_session2_2026_06_20
description: "SFC-WIRING-MS0 session-2 (slot:oscar, 2026-06-20): 4 backend units shipped on cad-fusion-live-ms0 -- coolant direct-cooling-thermal, hardened-steel kc FORCE fix (S(x)=1.00), Kienzle fossil-test fix, thermal-kc consistency. Hardened-steel physics now fully coherent. Remaining gaps + next."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.715Z
aliases: reference_oscar_sfc_wiring_session2_2026_06_20
---


SFC-WIRING-MS0 continuation (slot:oscar, 2026-06-20, session 2). 4 units shipped on `cad-fusion-live-ms0` from `H:/prism` (NOT the slot worktree):

1. **U-SFC-COOLANT-THERMAL** -- the SFC interface temp was coolant-INSENSITIVE (`cuttingTemperature` takes no coolant arg), so cryogenic (earns higher Vc) mis-reported a HIGHER temp than flood (backwards; cryo removes heat). Added canonical `CANONICAL_COOLANT_TEMP_FACTOR` (dry 1.0 -> air_blast 0.97 -> ... -> cryogenic 0.65) + `getCoolantTempFactor()` in constants.ts; `temp_C *= getCoolantTempFactor(input.coolant)`. Report-only (feeds thermal_margin/risk/wear/life-cap, NO clamp). 727 tests, 2-arm PASS. Fixed gauntlet-r2 `cryo<=flood*1.1` (was RED 4756>4338).

2. **U-SFC-KC-EFFECTIVE-ISO-FORCE** -- THE force-path safety fix. When effectiveIso flips P->H (steel HB>400 / HRC), the Kienzle FORCE kept base kc 1800 instead of ISO-H 3200 -> force/torque/stability UNDER-predicted -> under-conservative workholding+chatter margins. Added `hSwitched`/`forceKc11`/`forceMc` (= `CANONICAL_KIENZLE[effectiveIso]` when hSwitched, else mat.*) near the effectiveIso def (~L2123); routed to ALL 4 specific-cutting-force consumers (primary `kienzleCuttingForce` ~L2400, stability Kc ~L2590, Merchant friction ~L2606, Albrecht ploughing ~L2652) + 2 formula traces. SAFE direction (kc 1800->3200, mc 0.25->0.30 both RAISE force -> tighter clamps). Already-ISO-H (d2/hardened_steel, base iso H) NOT double-switched (hSwitched=false). Power NOT asserted to rise: P=Fc*Vc and the H-switch derates Vc, so hardened power can FALL (honest; workholding FORCE is the binding margin). 768 tests, 3-arm PASS (physics + safety-physics S(x)=1.00 verified workholding clamp strictly more-conservative + reviewer all-assertions-break-on-revert). Warning rewritten (R9): drops the obsolete "under-predicted" caveat.

3. **U-SFC-KIENZLE-FOSSIL-TEST-FIX** -- 2 RED guardian tests in KienzleForceModelEngine.test.ts asserted `CANONICAL_KIENZLE.N.mc===0.23` / `.S.mc===0.28`; canonical (constants.ts + physics CLAUDE.md) is N.mc=0.22, S.mc=0.27. `git -S` proved the constant was NEVER 0.23/0.28 (bulk-absorbed fossil from U-TEST-FOSSIL "absorb 1,651 orphan untracked tests"). R9: fixed the stale TEST to canonical (constants.ts is authoritative, unchanged). 32/32. Surfaced by safety-physics during unit-2 review.

4. **U-SFC-THERMAL-KC-HARDENED** -- thermal follow-up to unit-2: `temp_C` now uses `forceKc11` too (was base `mat.kc1_1`), so hardened-steel heat is consistent with the force path. Jaeger/Loewen-Shaw temp rise ~ sqrt(kc), so 1800->3200 raises reported temp ~1.33x -> tighter thermal-risk/wear/life advisory (SAFE, report-only). Base steel k/cp retained (diffusivity ~unchanged; getGradeThermal overrides for known grades). 587 tests, 2-arm PASS. Test pins `cutting_speed_mpm` + `tool_coating` to isolate the kc switch from the Vc-derate/coating confounds.

**Hardened-steel physics is now fully coherent: force + stability + friction + ploughing + thermal ALL use the ISO-H kc on the H-switch.**

5. **U-SFC-LIFE-UNCERTAINTY-FOSM** (gap #7) -- the SFC ALREADY reported `uncertainty.tool_life` via `monteCarloUncertainty(toolLife, [matUncert, 0.20, 0.10])` but with INLINE, material-blind CVs (oscar no-inline violation + physics-blindness). Replaced with a FOSM propagation through the Taylor params: new `CANONICAL_TAYLOR_LIFE_CV {V_cv:3, n_cv:5, C_cv:8}` (constants.ts, ISO 3685) fed through `stochasticToolWearEngine.fosmTaylorLife`. The 1/n exponent amplifies scatter -> low-n materials (hardened/superalloy) now report WIDER life bands (aluminum 25% -> hardened 51%, vs old uniform 22%). Report-only, ci_95_low floored at 0. 572 tests, 2-arm PASS. **R8 LESSON: gap #7 was an IMPROVE of an existing mechanism, NOT a new band -- always check before wiring.**

6. **U-SFC-BALL-END-EFFECTIVE-DIA** (gap #8) -- a ball-nose mill at ap<R cuts on a contact circle SMALLER than nominal (Deff=2sqrt(ap(D-ap))), so surface speed at the cut is Vc*Deff/D < headline Vc. Extracted `ballEndMillEngine.effectiveDiameter()` as a PURE single-source method (calculate() refactored to call it, byte-identical + negative-ap guard), wired into the SFC as ADDITIVE `result.ball_end_effective {effective_diameter_mm, engagement_pct, effective_cutting_speed_m_min, rpm_to_hold_target_vc}` + warning. Fires only for corner_radius>=0.95*R milling at 0<ap<R. Report-only. 482 tests, 2-arm PASS. **R8 LESSON: reused existing engine geometry (extracted pure method), didn't duplicate.**

## gap #10 -- R8 VERIFIED ALREADY-DONE (the sink EXISTS)
The outcome-capture SINK is already built + wired: `sfcOutcomeCaptureWireEngine.recordEmission` (engine) <- `captureSFC`/`captureSFCAndThread` (shared middleware `src/middleware/sfcOutcomeWire.ts`, used by UltimateSpeedFeed + AutoSpeedFeed + SFCCalculate + MachineAwareSpeedFeed + LatheSpeedFeedFacade) <- `UltimateSpeedFeedEngine.calculate` captures EVERY prediction (deferred via setImmediate L3231, fire-and-forget, "never affect the result"). Reader engines exist (MillActualFeedbackTuning, OutcomeDriftCalibrationBridge, OutcomeEpisodicMemoryBridge, CrossProcessOutcomeStore). So gap #10 (literal "outcome-capture sink") = DONE -- do NOT rebuild it.
**Remaining = gap #3-FULL (few-shot consumer side), a separate substantial unit:** the capture context is `{material, operation, tool_id}` -- MISSING `customer` (the few-shot `SFCFewShotNewMaterialEngine` key is customer x material x tool_class) and the ACTUAL shop-floor outcome (success/chatter/tool_break/poor_finish). To wire the ProtoMAML support set: (a) add `customer?` (+ key cut conditions Vc/fz/ap) to the SFC input + thread into the captureSFC context (touches the shared SFCEmissionInput schema -> 5 engines, clone-don't-fork); (b) join captured predictions with actual outcomes from an ingestion source (MTConnectToOutcomeBridge / operator feedback); (c) read the joined records as the few-shot support set. Substantial closed-loop feature -- fresh-context unit.

## REMAINING (next session, dependency order)
- **gap #3-FULL** few-shot ProtoMAML support-set wiring (see the gap #10 finding above -- the sink exists; enrich capture with customer+conditions + actual-outcome join).
- **thermal-k-derate** (physics P2, task #11): derate base-steel k alongside kc for hardened state (true hardened k ~24 vs 52 W/mK -> would raise temp further). Own physics-reviewer.
- **gap #10** outcome-capture sink (closed-loop persistence; UNBLOCKS gap #3 few-shot ProtoMAML).
- **thermal-k-derate** (physics P2, task #11): derate base-steel k alongside kc for hardened state (true hardened-tool-steel k ~24 vs 52 W/mK -> would raise temp further). Own physics-reviewer.
- **FRONTEND phase-1** (operator-authorized): deprecate confirmed-orphan `SpeedFeedPage`+`useSpeedFeed` (verify no deep-link, surface to quebec); surface the new uncertainty/advisory signal in the UI; verify port-3100 E2E. THEN prove 100% -> electron + capacitor iOS/Android (quebec app-infra, same Vite build).

Builds on [[reference_oscar_sfc_wiring_gaps_2to9_2026_06_20]] (units 1-5, same goal). The kc-vs-effectiveIso force decoupling noted there as a deferred safety finding is now FIXED (unit 2).
