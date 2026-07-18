---
title: SFC Force-Safety Envelope (average -> worn -> runout-peak -> worst-case)
tags: [speed-feed, sfc, force, safety, kienzle, flank-wear, runout, non-regression]
slot: oscar
created: 2026-06-29
commits: [15c74d20f4, 524e86edb9, 6aa4634bb8]
related: [sfc-deflection-vc-lever, sfc-proven-pipeline, speed-feed-galaxy]
---

# SFC Force-Safety Envelope

The SFC (`UltimateSpeedFeedEngine`) historically reported cutting force at ONE operating point: the
**fresh tool, average chip load**. Real cuts fail at the EXTREMES the average hides -- a worn tool late
in life, and the heavily-loaded flute of a tool with runout. This arc (slot:oscar, 2026-06-29) added
three conservative force layers so the safety gates (spindle power, tool deflection, torque, workholding)
are evaluated against the force the cut must actually survive, NOT just the nominal.

## The four force layers

| Layer | Force | Models | Commit |
|-------|-------|--------|--------|
| **Average** (headline) | `Fc = Kc1.1*ap*hex^(1-mc)` | Kienzle at the mean chip | (baseline) |
| **Worn** (end-of-life) | `Fc*(1+Cw*VB)` | flank wear raises force; `WearForceCompensationEngine` (Cw cited Smithey-Kapoor-DeVor 2000); VB at the ISO-3685 limit (0.3 finishing / 0.6 roughing) | `15c74d20f4` |
| **Runout peak** (loaded flute) | `Fc*((hex+TIR)/hex)^(1-mc)` | one flute bites TIR deeper; reuses the in-engine `runoutImpact` RSS TIR | `524e86edb9` |
| **Worst-case** (combined) | `Fc*(1+Cw*VB)*((hex+TIR)/hex)^(1-mc)` | the runout-peak flute of a worn tool -- the true conservative envelope | `6aa4634bb8` |

## The shared design pattern: ADDITIVE + FLIP-ONLY (non-regressing)

Every layer follows the same shape, which is the reusable lesson:

1. **Headline stays on the nominal force.** The 401-assertion gauntlet asserts fresh/average
   `power_kw`/`deflection_um` VALUES. Replacing the verdict with the stressed force would break it. So the
   stressed force is an **additive output** (`cutting_force_worn_N`, `cutting_force_peak_runout_N`,
   `cutting_force_worst_case_N`, plus worn/peak power & deflection) -- the headline verdicts are untouched
   -> gauntlet byte-identical.
2. **A warning fires ONLY on a FLIP** -- a gate that PASSES at the nominal force but FAILS at the stressed
   force (power >90% available, deflection >50um, torque >90% machine limit, workholding SF <1.5). This is
   the operator's "change the tool / tighten the holder before it stalls" signal the nominal check misses.
3. **Conservative by construction.** Every multiplier is `>= 1` (analytic + runtime `Number.isFinite && >= 1`
   guard), so a stressed consequence is never *less* than nominal and never relaxes a verdict. Every flip
   threshold MATCHES its nominal-gate threshold exactly (a flip must use the same threshold to be coherent).
4. **Active only when its input is present.** Worn force needs milling/turning + a positive resultant;
   runout needs a runout input (`runout` is `undefined` otherwise). Drilling / no-runout paths emit nothing
   new -> byte-identical.

This pattern is now proven 3x and is the template for the remaining SFC force gaps (thermal-expansion ->
tolerance, BUE effective-rake): spec -> additive-flip build -> physics-reviewer -> 3-of-3.

## Cross-engine reach (R15)

`SpeedFeedNineAxisOrchestratorEngine.checkWorkholding` reads `sfc.forces.cutting_force_worn_N` and adds a
worn-clamp note + flip warning -- the same additive pattern, cross-engine. Headline `feasible`/`safety_factor`
stay on the fresh force.

## Lessons captured (R12 / R7 / R8)

- **A tsc type error can hide behind green tests.** The Step-1 `wearForceCorrection` call passed the wider
  `ToolMaterial` union into the narrow `WearForceInput.tool_material`; esbuild/vitest strip types so every
  test stayed green, and tsc's incremental `.tsbuildinfo` cache masked the TS2322 until an interface edit
  forced a re-check. Do a cache-cold `tsc --noEmit` before trusting "type-clean".
- **R7 -- two runout conventions existed.** `runoutImpact` uses `chip_load_variation = tir/2` (soft);
  `ToolRunoutEngine` uses `max_chip = fz + tir` (loaded-flute-takes-full-TIR). For a SAFETY peak, take the
  conservative cited convention (`fz+TIR`, matches MachiningPlaybookEngine "one flute takes the entire chip
  load"), not the average of the two.
- **R8 dedup -- the physics usually already exists.** Flank-wear reused `WearForceCompensationEngine`;
  runout reused the in-engine `runoutImpact` + existing TIR inputs. These were WIRING gaps (the model wasn't
  applied to the force gates), not missing physics. Search-first before building a new model.
- **physics-reviewer P2 -- floor the peak chip to the same `Math.max(0.01, hex_mm)` the headline Fc uses**,
  else `pf` is over-stated on sub-0.01mm light chips (safe-direction, but fixed for exactness).

## Queued follow-ups

- Combined worst-case currently a display output; a worst-case FLIP warning (gate fails at the envelope) is
  a natural extension.
- Remaining force gaps: workpiece thermal-expansion -> tolerance; BUE effective-rake force. The runout ->
  stability-lobe coupling is BLOCKED on the `ChatterStabilityLobeEngine` 0-lobes regression.

Memories: [[reference_oscar_sfc_flank_wear_step2_2026_06_29]] · [[reference_oscar_sfc_runout_peak_force_2026_06_29]].
Spec: `state/shared/specs/SFC-RUNOUT-PEAK-FORCE-COUPLING-SPEC-2026-06-29.md` (`10eef7ac8b`).
