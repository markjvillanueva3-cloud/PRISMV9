# SFC Combined Worst-Case FLIP Warning -- build-ready spec (U-OSC-SFC-WORSTCASE-FLIP)

**Author:** oscar (slot:oscar) * 2026-06-30 * checkpoint at the 5h session ceiling.
**Status: BUILD-READY -- mechanical, ship in a clean context WITH physics-reviewer + tsc + 3-of-3.**
This is the queued follow-up named in [[sfc-force-safety-envelope]] / `reference_oscar_sfc_runout_peak_force_2026_06_29`:
the combined worst-case force (`cutting_force_worst_case_N`, L2812 of `UltimateSpeedFeedEngine.ts`) is today a
DISPLAY-only output -- it has no FLIP warning. This spec adds the warning. Same proven additive/flip-only/
conservative pattern as the shipped flank-wear (`15c74d20f4`) + runout (`524e86edb9`) + worst-case-force
(`6aa4634bb8`) units. Spec'd (not built inline) because the soul makes physics-reviewer MANDATORY on any
force-gate change and the build hit the hard session-time ceiling -- do it clean, do not rush the safety gate.

## 1. The gap (verified 2026-06-30, engine read at HEAD)
`UltimateSpeedFeedEngine.ts` emits per-effect FLIP warnings at the WORN force (STEP 12B, ~L2634-2648) and at
the RUNOUT-peak force (STEP 14R, ~L2788-2802), each firing when a gate (spindle power >90% available /
deflection >50um / torque >90% machine limit) PASSES at the average force but FAILS at that single stressed
force. The COMBINED worst-case force `Fc_worst = F * wornMultiplier * peakForceFactor` (a WORN tool WITH
runout) is computed at L2812-2814 but ONLY rendered as `forces.cutting_force_worst_case_N` -- no warning. The
genuinely NEW, non-redundant operator signal: a gate that passes at the average AND at worn-alone AND at
runout-peak-alone, but FAILS only at the PRODUCT (worn tool together with runout). Neither single effect trips
it; their composition does. That band is invisible today.

## 2. The change (one additive block, no new types, no new force formula)
Insert AFTER the `worstCaseForceN` computation (currently `UltimateSpeedFeedEngine.ts:2814`, just before the
`if (toolLife < taylor.T_min ...)` at L2816). All variables below are already method-scoped at that point:
`wornMultiplier` (L2626), `peakForceFactor` (L2775), `wornUtilPct` (L2624), `peakUtilPct` (L2773),
`wornDeflectionUm` (L2625), `peakDeflectionUm` (L2774), `available`/`machinePower`/`isWithinBudget`/`power_kw`/
`torque`/`deflection_um`/`wearVbLimit`/`runout`/`input.machine_max_torque_nm`. NOTE: `peakForceFactor !==
undefined` is set ONLY inside `if (runout && runout.total_tir_mm > 0)`, so `runout` is non-null whenever the
block runs (the `runout!` assert is logically safe).

```ts
    // COMBINED worst-case FLIP warnings: fire ONLY for the genuinely combined-only band -- a gate that
    // PASSES at the average force AND at worn-alone AND at runout-peak-alone, but FAILS at the product
    // (a WORN tool WITH runout together). The per-effect flips (STEP 12B wear, STEP 14R runout) already
    // alarm the single-effect cases; this catches the case neither single effect trips but their
    // composition does. Conservative: cf = wornMultiplier*peakForceFactor >= each factor >= 1.
    // Non-regressing: only ADDS a warning; headline verdicts stay on the average force. Active only when
    // BOTH wear and runout are present (worstCaseForceN defined).
    if (wornMultiplier !== undefined && peakForceFactor !== undefined) {
      const cf = wornMultiplier * peakForceFactor; // >= 1
      const tirUmW = Number.isFinite(runout?.total_tir_mm) ? runout!.total_tir_mm * 1000 : 0;
      // Power: within the 90%-of-available budget on average AND worn-alone AND peak-alone, exceeds combined.
      if (machinePower && available !== undefined && isWithinBudget) {
        const combinedUtil = (power_kw / available) * 100 * cf;
        if (combinedUtil > 90 && (wornUtilPct ?? 0) <= 90 && (peakUtilPct ?? 0) <= 90) {
          warnings.push(`Worst-case STALL risk: a WORN tool (${wearVbLimit}mm flank wear) WITH ${tirUmW.toFixed(0)}um runout TOGETHER spikes spindle power to ~${(power_kw * cf).toFixed(1)}kW (~${combinedUtil.toFixed(0)}% of the ${available.toFixed(1)}kW available) -- each effect alone stays within budget but their combination overloads the spindle late in tool life. Change the tool earlier and reduce TIR (shrink-fit/hydraulic holder).`);
        }
      }
      // Deflection: within the 50um accuracy limit on average AND worn-alone AND peak-alone, exceeds combined.
      if (deflection_um !== undefined && deflection_um <= 50 && (wornDeflectionUm ?? 0) <= 50 && (peakDeflectionUm ?? 0) <= 50) {
        const combinedDefl = deflection_um * cf;
        if (combinedDefl > 50) {
          warnings.push(`Worst-case ACCURACY loss: a WORN tool (${wearVbLimit}mm flank wear) WITH ${tirUmW.toFixed(0)}um runout TOGETHER deflects ~${combinedDefl.toFixed(0)}um (>50um limit) vs ${deflection_um.toFixed(0)}um at the fresh average chip -- each effect alone holds tolerance but together the peak cut walks. Change the tool earlier, reduce TIR, or shorten the stickout.`);
        }
      }
      // Torque: within 90% of the machine torque limit on average AND worn-alone AND peak-alone, exceeds combined.
      if (input.machine_max_torque_nm) {
        const lim90 = input.machine_max_torque_nm * 0.9;
        const combinedTorque = torque * cf;
        if (torque <= lim90 && torque * wornMultiplier <= lim90 && torque * peakForceFactor <= lim90 && combinedTorque > lim90) {
          warnings.push(`Worst-case TORQUE risk: a WORN tool (${wearVbLimit}mm flank wear) WITH ${tirUmW.toFixed(0)}um runout TOGETHER spikes torque to ~${combinedTorque.toFixed(1)}Nm (near the ${input.machine_max_torque_nm}Nm machine limit) from ${torque.toFixed(1)}Nm at the fresh average -- change the tool earlier and reduce TIR.`);
        }
      }
    }
```

## 3. Why combined-ONLY gating (the key design decision)
Because `cf = wornMult * peakFactor >= max(wornMult, peakFactor)`, a naive "passes average, fails worst-case"
flip would be a STRICT SUPERSET of the per-effect flips -> it would double-/triple-alarm the same gate (worn
flip + peak flip + worst flip all firing). The `(wornUtilPct ?? 0) <= 90 && (peakUtilPct ?? 0) <= 90` guards
(and the deflection/torque analogs) restrict the warning to the band where NEITHER single effect alarmed but
their product does -- the only genuinely new signal. This is the R7 "surface the distinct case, don't
duplicate" discipline.

## 4. Tests (extend the EXISTING file -- it already has worst-case-force cases)
Add to `mcp-server/src/__tests__/UltimateSpeedFeed-runout-peak-force.test.ts` (do NOT create a new file -- it
already imports the engine + has the `RUNOUT` const + the worst-case-force describe block). Self-calibrating,
mirroring the existing peak-flip probe at L64-78:
- **combined-only STALL flip:** probe wornMult + peakFactor with an unconstrained machine; a combined-only
  band exists iff `min(wornMult, peakFactor) > 1` (both effects active). Set `targetAvgUtil` just below
  `90 / max(wornMult, peakFactor)` (so worn-alone AND peak-alone both stay <=90) but above `90 / cf` (so
  combined > 90); size `machine_power_kw = (power_kw / (targetAvgUtil/100)) / 0.85`. Assert: `is_within_budget
  === true`, `power_utilization_worn_pct <= 90`, `power_utilization_peak_runout_pct <= 90`, and
  `warnings` matches `/Worst-case STALL risk/`.
- **no double-fire (non-regression):** a case where the WORN-alone flip already fires (size the machine so
  `wornUtilPct > 90`) -> assert NO `/Worst-case STALL risk/` warning (the combined-only guard suppresses it;
  the worn flip carries it).
- **no runout -> no worst-case flip:** `calc` without a runout input -> `worstCaseForceN` undefined -> assert
  no `/Worst-case .* risk/` warning (byte-identical to today).
- **deflection combined-only flip:** scan dia-8 stickout (deflection ~L^3) for an avg <= 50 with worn-alone
  <= 50 AND peak-alone <= 50 but `avg * cf > 50`; assert `/Worst-case ACCURACY loss/`.
- **adversarial:** huge TIR + tiny machine -> no crash, finite; combined warning may fire, asserts stay finite.

## 5. Gates (do NOT skip -- this is why it was spec'd not rushed)
- **physics-reviewer MANDATORY** (force-gate change; verify cf composition, the >=1 conservatism, the
  combined-only gating logic, threshold parity with the per-effect flips at 90%/50um/90%).
- 401-gauntlet + the full SFC sweep green (non-regression: no runout input -> byte-identical; the new block
  only adds a warning string, never changes a numeric headline).
- Per-file 2-arm scrutiny + 3-of-3 at Stop.

## 6. Non-regression proof
The block reads only already-computed method-scoped values and pushes strings into `warnings`. No numeric
output (`required_power_kw`, `deflection_um`, `torque_Nm`, `is_within_budget`, `cutting_force_*`) changes. The
gauntlet asserts numeric VALUES -> byte-identical. The block is inert unless BOTH `wornMultiplier` and
`peakForceFactor` are defined (milling/turning + positive resultant + a runout input) AND the gate lands in
the combined-only band.

## 7. Commit-env (oscar drift -- proven this arc)
`export PRISM_GIT_ADD_LANE_DISABLE=1` (inline `VAR=val command git` does NOT propagate to the hook child;
export does) + `[MAIN-FORCE]` subject + `git commit -F <msgfile>` (avoids `-m` multiline breaking the
worktree-route hook) + index-lock wait-retry loop + `git add` the test file inside the retry loop.

Sibling shipped arc: [[sfc-force-safety-envelope]]. Memories: [[reference_oscar_sfc_runout_peak_force_2026_06_29]]
* [[reference_oscar_sfc_flank_wear_step2_2026_06_29]]. After this, the remaining SFC force gaps are: workpiece
thermal-expansion -> tolerance (`SFC-THERMAL-EXPANSION-TOLERANCE-SPEC-2026-06-29.md`, BLOCKED on the
constants.ts CANONICAL_CTE add behind the CRITICAL FILE GUARD -- operator CONFIRM_CRITICAL=true) and BUE
effective-rake force (DEDUP-READ-FIRST -- likely already modeled).
