---
name: reference-delta-real-blisk-reference-characterized-2026-06-10
description: "The REAL turbine/blisk references in H:/PRISM/resources/CAD FILES (which delta wrongly claimed didn't exist) characterized via CADGeometryComparisonEngine.extractMetrics headless. blisk.stp = 451.5M mm3, bbox 1207x1207x310mm (~1.2m blisk), 223 faces, 328 B_SPLINE_SURFACE + 10 torus + 7 cyl + 5 cone + 174 circle (NURBS-smooth). Impeller turbine.stp = 64.3M mm3, 405 B_SPLINE. PROVES: (a) the validate-vs-real-reference half works on genuine NURBS parts; (b) the EXACT '100% accurate' gap = real refs are NURBS-smooth, PRISM headless emit is FACETED (PLANE-only, 0 B-spline) -> need Fusion kernel (loft ops->NURBS) or headless NURBS emitter (P7)."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.550Z
aliases: reference_delta_real_blisk_reference_characterized_2026_06_10
---


# Real turbine/blisk references characterized (2026-06-10, slot:delta)

After deep-searching `H:/PRISM/resources/CAD FILES` (correcting the false "no reference exists" claim, [[feedback_never_claim_absence_without_deep_search]]), characterized the real reference parts with the actual validate engine (`CADGeometryComparisonEngine.extractMetrics`, headless, tsx).

## blisk.stp (4,908,613 B)
- volume **451,549,096 mm3** · surfaceArea 4,409,777 mm2
- bbox **1206.90 x 1206.90 x 310.00 mm** (~1.2 m diameter blisk -- large industrial)
- topology: 223 faces / 1386 edges / 318 verts / **1 solid** / 1 shell
- surfaces: **B_SPLINE_SURFACE=328**, TOROIDAL=10, CYLINDRICAL=7, CONICAL=5, PLANE=9, CIRCLE=174 -> **NURBS-smooth** (blades are B-spline surfaces)

## Impeller turbine.stp (3,030,548 B)
- volume **64,310,734 mm3** · surfaceArea 1,054,604 mm2 · bbox 290.34 x 762.91 x 290.34 mm
- 485 faces / 3846 edges / 813 verts / 1 solid
- surfaces: **B_SPLINE_SURFACE=405**, CYLINDRICAL=25, PLANE=110, CIRCLE=185 -> NURBS-smooth

## What this PROVES (goal #3 progress)
1. **Validate-vs-real-reference WORKS headless.** extractMetrics read both genuine multi-MB NURBS parts (volume/surface/topology/bbox) -- the "validate a generated part against a resources/ reference" capability is proven on the REAL targets, not a self-copy. `compare(generated, blisk.stp)` would yield real volume/bbox/topology deltas.
2. **The "100% accurate" gap is now EXACT (evidence, not hand-waving):** the real references are **NURBS-smooth** (328 / 405 B_SPLINE_SURFACE). PRISM's HEADLESS generation (trilobe direct-emitter, [[reference_delta_complex_part_generation_proven_2026_06_10]]) is **FACETED -- PLANE faces only, ZERO B-spline surfaces.** So "generate 100% accurate to this reference" requires **NURBS surface generation**: either the LIVE Fusion kernel executing BliskCADEngine's loft ops (-> NURBS blades), or a headless NURBS/loft emitter (the unbuilt roadmap P7). The faceted multi-prism path cannot match a 328-B-spline-surface blisk.

## State of the goal-3 proof
- HAVE: real reference (blisk.stp) + working headless validate engine + proven closed-loop convergence mechanism ([[reference_delta_blisk_closed_loop_converged_2026_06_10]]).
- NEED for literal "100% accurate generated blisk vs blisk.stp": NURBS-capable generation (Fusion kernel via the live bridge, OR P7 headless NURBS emitter) so a generated blisk can be emitted as a STEP with B-spline surfaces and full-geometry-compared to blisk.stp. Scalar-volume convergence is provable headless but volume-match != shape-match (necessary, not sufficient).
- This is the real, evidence-quantified frontier of the goal -- not "no reference" (false) but "faceted-vs-NURBS generation fidelity".
