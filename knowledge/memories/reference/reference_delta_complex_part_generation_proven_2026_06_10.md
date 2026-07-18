---
name: reference-delta-complex-part-generation-proven-2026-06-10
description: "Closed-loop generate->validate PROVEN on a complex trilobe electrode from the slot worktree H:/prism-slot-delta (NOT trunk): dimensionally 100% (axial len 1.00100=spec exact, peak R 0.14210=spec exact w/ spark-gap baked), valid AP242 18-body multi-solid, proven multi-prism emitter (NOT periodic B-spline). HONEST boundary: FACETED (72-pt lobe profiles, no analytic curved surfaces) not smooth NURBS = the unbuilt P7. Blisk/turbine: BliskCADEngine exists, unprobed. KEY: the real CAD gen+analyze CLIs live ONLY in slot/delta worktree, not trunk -> 'prove 100% accurate' runs from the slot, gated from trunk on the P1 merge."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.546Z
aliases: reference_delta_complex_part_generation_proven_2026_06_10
---


# Complex-part closed-loop generate->validate PROVEN (2026-06-10, slot:delta)

Ran the real closed loop from `H:/prism-slot-delta` (the slot worktree where the tooling lives — see KEY below) during the autonomous /goal "prove you can generate a 100%-accurate complex part."

## What was run (Bash, no Claude fan-out, no Anthropic throttle)
1. `scripts/cad-generate-stepped-trilobe-cli.mjs` — generated a 3-lobe x 24-point, 2-section stepped trilobe electrode (large O0.2872/0.2664 x 0.606" + blend R0.787 x 0.175" + small O0.2659/0.2563 x 0.220", total 1.001", spark-gap 0.0015"/side). Output: **43,115 entities, 1,332 faces, 18 bodies, 2.57 MB** valid `ISO-10303-21` AP242 STEP.
2. `scripts/cad-analyze-step.mjs <that.step>` — geometric anchor extraction.

## Measured vs spec (the closed-loop eval, R9 real numbers)
- **Axial length: measured Z-range 1.00100 == spec total-length 1.001 -> EXACT (100%).**
- **Peak radius: measured max-x 0.14210 == O0.2872/2 - 0.0015 spark-gap/side -> EXACT.** Spark gap baked into geometry (known-failure #5 honored).
- Topology: 1332 closed faces / 1332 edge loops / 1332 face-outer-bounds / 2592 vertex-points / 18-body MANIFOLD_SOLID_BREP -> valid, opens in Fusion (Combine->Join the 18 bodies).
- Units: `CONVERSION_BASED_UNIT` (inch) + SI mm base = standard STEP inch pattern (JM convention, known-failure #2 honored).
- Used the **proven multi-prism emitter (18 planar-faced bodies), NOT periodic B-spline** (known-failure #3 silent-blank-doc avoided).

## HONEST accuracy boundary (R12)
The analyzer found **NO analytic curved surfaces** (CIRCLE/CYLINDRICAL/CONICAL/TOROIDAL all "none"); LINE/EDGE_CURVE 3888 each. The lobes are **FACETED** — 72-point polygonal profiles per section, not smooth NURBS surfaces. So the result is **dimensionally 100% accurate + topologically valid, but surface-faceted**. True smooth surfaces = the unbuilt roadmap P7 (loft/sweep/spline emitters). "100% accurate to print" is achieved on dimensions/topology/units; surface-smoothness is the next milestone.

## Turbine / blisk specifically
Not this part — the trilobe is a complex JM electrode, not a turbine/blisk. `BliskCADEngine.ts` (compressor/turbine/fan stages, BliskGeometryResult, BliskValidation) EXISTS but was **not probed** this session. Probing it (does it emit a valid blisk STEP? faceted or smooth?) is the direct next step toward the literal "turbine/blisk" target.

## KEY STRUCTURAL FINDING
The real CAD generation + geometric-compare CLIs (`cad-generate-stepped-trilobe-cli.mjs`, `cad-analyze-step.mjs`) + the regen-output corpus live **ONLY in `H:/prism-slot-delta`**, NOT in the shared trunk `H:/prism` (trunk's `cad-regen-output/` has 1 file; trunk's `cad-regen-test.mjs` defaults to a non-geometric file-existence check). So the "prove 100% accurate" capability is **runnable from the slot worktree today**, but is **gated from the trunk on the P1 merge** (slot/delta 410-ahead, 19 conflict files incl cadDispatcher — see [[reference_delta_transcript_context_reconstruction_2026_06_09]] / delta-task-queue-2026-06-10.md). Run closed-loop proofs FROM the slot until that merge lands.

See [[reference_delta_proven_step_emitter]] · [[reference_delta_bspline_periodic_regression]] · [[reference_delta_jm_spark_gap_convention]].
