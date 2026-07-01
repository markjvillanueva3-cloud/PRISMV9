---
title: A machine/holder-RPM-capped achievable Vc is not an under-prediction vs an uncapped vendor surface speed
tags: [lesson, sfc, speed-feed, vendor-parity, rpm-cap, false-bug, r12, oscar]
created: 2026-06-25
slot: oscar
status: lesson
---

# Capped achievable Vc vs uncapped vendor surface speed is NOT a physics bug

## The false alarm

An SFC vendor-parity run flagged PRISM's aluminum (ISO-N) cutting speed as a **3.4x under-prediction**:
`PRISM 226 m/min vs 5-vendor baseline 775` for 6061 / 6mm / finishing. A memory was written claiming the
9-axis orchestrator "receives `iso_group:N` but falls to a material-blind / Taylor-default path that
under-predicts aluminum 3.5x," and Task #13 was opened to "fix the orchestrator's Vc model."

**That root cause was wrong.** Fixing the physics would have broken correct behavior.

## What a live formula-trace actually showed

Reproducing the exact comparator cell (`speedFeedNineAxisOrchestratorEngine.run`,
N / 6061 / 6mm 3FL carbide / milling finishing / prism_optimized, no machine, no holder):

```
Vc = Vc_base x hardness x strategy x tool_material x coolant
   = 460 x 1.00 x 1 x 1.00 (carbide) x 1.00 (coolant) = 460.0 m/min   <- material-AWARE, correct
n  = 460 x 1000 / (pi x 6) = 24,404 RPM
RPM 24404 exceeds machine max 12000 -- capped. Vc adjusted to 226 m/min
```

- `UltimateSpeedFeedEngine` uses the material-aware ISO-N table
  (`CUTTING_PARAMS.N_milling_finishing.vc = [305, 460, 915]`, line 792). Balanced = 460 -- a correct
  aluminum surface speed. There is **no** material-blind path.
- 226 is a **machine-RPM-cap artifact**: with no holder specified, the holder balance class defaults to
  `g6_3` -> `BALANCE_CLASS_MAX_RPM.g6_3 = 12,000 RPM` (ISO 1940 G6.3 safety limit,
  `SpeedFeedNineAxisOrchestratorEngine.ts:724`). A 6mm tool physically cannot reach 460 m/min under a
  12k-RPM cap, so Vc is correctly clamped to `pi x 6 x 12000 / 1000 = 226 m/min`.
- The vendor "775" is an **uncapped** material+tool surface-speed recommendation. Comparing a
  holder/machine-CAPPED achievable Vc against an UNCAPPED vendor surface speed is apples-to-oranges.

## The lesson

1. **A clamp output is not a model output.** Before calling a low number an "under-prediction," trace
   whether a downstream safety/machine clamp produced it. 226 was a *correct* clamp result, not a bad model.
2. **Compare like-for-like in vendor parity.** Vendor cribs publish unconstrained surface speeds; PRISM's
   recommendation is machine/holder-constrained. Compare PRISM's *uncapped* recommended Vc against them, and
   surface the cap delta separately -- never let a constraint masquerade as a divergence.
3. **A green/derived number can still be misread.** The "bug" lived entirely in the *comparison*, not the
   engine. Expose the structured intermediate (pre-cap Vc + `rpm_capped` flag) so the report explains itself
   and no future reader chases the phantom.
4. **R12 / oscar refuse-list:** do not "fix" correct physics to chase a parity number, and do not soften a
   G6.3 holder-balance safety cap to make a number look bigger.

## Fix direction (additive, safe)

`U-OSC-VC-UNCAPPED-PARITY`: add an additive `cutting_speed_uncapped_m_min` + `rpm_capped` to the
UltimateSpeedFeed / orchestrator result and report both in the tri-comparator
("PRISM 226 (capped from 460 @ G6.3 12k) vs baseline 775"). No existing number changes ->
401-gauntlet + page-product safe; physics-review the engine field.

Memory: [[reference_oscar_sfc_n_alu_rpm_cap_not_a_bug_2026_06_25]] · supersedes the N-cell root-cause in
[[reference_oscar_sfc_vendor_parity_run_2026_06_25]].
