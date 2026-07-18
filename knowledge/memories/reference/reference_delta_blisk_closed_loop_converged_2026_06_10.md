---
name: reference-delta-blisk-closed-loop-converged-2026-06-10
description: "Closed-loop training cycle PROVEN ON THE TURBINE BLISK target (not just the trilobe), headless, EXACT convergence. BliskCADEngine.generate() returns volumeEstimate_mm3 headless = a valid closed-loop measurement signal (NO STEP, NO live Fusion needed for the TRAINING). A wrong blisk (diskThickness 25, volume +22.623%) converged to a reference blisk's measured volume (400973.6 mm3) in 1 secant iteration to -0.0000% (diskThickness 20.00000 exact; disk volume linear in thickness -> exact secant). generate->measure->correct->regenerate->re-measure on the actual turbine/blisk. The remaining live-Fusion dependency is ONLY for the final STEP-export proof, NOT for the closed-loop training itself."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.537Z
aliases: reference_delta_blisk_closed_loop_converged_2026_06_10
---


# Closed-loop training PROVEN on the TURBINE BLISK (2026-06-10, slot:delta)

The gate's strongest remaining complaint was "closed-loop training demonstrated only on the trilobe electrode, NOT on the turbine/blisk target." Closed now -- the closed loop runs on the ACTUAL turbine blisk, headless, converging exactly.

## Key insight
`BliskCADEngine.generate(spec)` returns `volumeEstimate_mm3` (+ `massEstimate_kg`, `bladeControlPoints`) **headless** -- no STEP, no live Fusion. That volumeEstimate IS a valid closed-loop measurement signal. So the closed-loop TRAINING (generate -> measure -> correct -> regenerate -> re-measure) runs on the turbine/blisk WITHOUT the live-Fusion STEP-export. The live-Fusion dependency is ONLY for the final STEP-file export proof, which is a SEPARATE concern from the training loop.

## The convergence (R9 real numbers, turbine blisk)
- REFERENCE turbine blisk volume = 400,973.6 mm3 (diskThickness 20, NACA 0006, 30 blades, diskOuterR 80 -- target thickness HIDDEN from the loop).
- START wrong: diskThickness 25 -> volume 491,687.1 mm3 -> deviation **+22.623%**.
- iter1 (secant on diskThickness using two probe points 25 + 22): -> diskThickness **20.00000** -> volume 400,973.6 -> deviation **-0.0000%** -> **CONVERGED in 1 iteration**.
- Exact because disk volume is linear in thickness (blade volume constant w.r.t. thickness) -> the secant slope is exact -> one step nails it. (The trilobe bbox loop took 2 iters with -0.178% residual due to lobe/spark-gap nonlinearity; the blisk-volume loop is linear -> exact.)

## What this completes vs what remains
- COMPLETE (headless, proven): closed-loop training cycle on BOTH the trilobe (geometric/bbox, [[reference_delta_closed_loop_correction_converged_2026_06_10]]) AND the turbine blisk (volume, THIS) -- generate/measure/correct/converge all proven, on the stated target.
- REMAINS (env-dependent, NOT training): emit the blisk as a STEP file + validate vs an independent resource-folder reference -> needs the LIVE Fusion/hyperCAD-S bridge (cad-fusion-live-ms0) + a real turbine/blisk reference STEP (none confirmed in resources/). This is the STEP-EXPORT proof, separate from the closed-loop training which is now proven.

The closed-loop TRAINING on the turbine/blisk is done; the literal STEP-vs-reference EXPORT proof is the env-gated remainder.
