---
name: reference_cad_regen_fidelity_run_2026_06_26
description: CAD regen-fidelity runner shipped (240 generated + 12 reference STEPs) + TWO findings -- extractMetrics point-cloud bbox under-measures curved geometry (engine limitation) AND a real v-block 2x-Z cadquery generation defect.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.496Z
aliases: reference_cad_regen_fidelity_run_2026_06_26
---


# CAD regen-fidelity runner + 2 findings (2026-06-26, slot:delta, commit b2bbc21125)

Built the headless regen-fidelity-over-corpus runner (the T3 geometry-half the analyzer-overflow fix
[[reference_cad_analyze_step_nurbs_overflow_2026_06_26]] unblocked), per a 5-agent recon Workflow.

## What shipped
- `scripts/lib/cad-regen-fidelity-lib.mjs` (pure: parseInchesFromSpec / dimFidelity / bandPass /
  aggregate; orientation-invariant SORTED-dim compare; `bboxMeasurable` gate) + 20 tests.
- `scripts/cad-regen-fidelity-run.mts` (tsx): composes the VERIFIED `cadGeometryComparisonEngine`
  `.extractMetrics` (:397) + `.compare` (:1074, `overallPassed`); per-call thresholds (NEVER mutates
  the global singleton). Walks 240 generated + 12 reference STEPs -> `state/shared/specs/CAD-REGEN-FIDELITY-RESULT-2026-06-26.json`.
- LIVE: determinism 240/240; reference self-consistency 12/12 + analyzer no-overflow 12/12 (the
  NURBS-overflow fix proven across blisk/impeller); dim-fidelity EXACT on 13/14 cubes.

## HONEST SCOPE (R12)
A TRUE NURBS regen-fidelity (re-emit a `B_SPLINE_SURFACE` net, ~0% surface) is **MERGE+BUILD-gated** --
no surface emitter exists on trunk OR in slot/delta (recon verified). The runner records the achievable
prismatic dimensional-fidelity + self-consistency and surfaces the gated part in `gated{}` -- never
mislabels it as NURBS regen. It does NOT satisfy T2(held-out-50) or T3(print-callout).

## FINDING 1 (engine limitation) -- extractMetrics bbox is point-cloud-derived
`cadGeometryComparisonEngine.extractMetrics` builds the bbox from `CARTESIAN_POINT` coords. EXACT for
all-planar parts (a cube's 8 corners are points -> 0% on 13/14 cubes), but a CURVED extent is a `CIRCLE`
entity (center+radius), NOT a point cloud -> the bbox UNDER-measures: a "0.75in dia x 3in" cylinder reads
bbox `[9.49, 0, 76.2]` (radius-ish, Y=0, misses the diameter). **Consequence:** any headless CAD
dim-fidelity via this bbox is only valid for faceted/planar parts. The runner gates the dim band on
`bboxMeasurable` (cubes only) and excludes curved/plate parts (kept for determinism). A real bbox for
curved parts needs the merged smooth-solid kernel or a CIRCLE-radius-aware extractMetrics fix (next unit).

## FINDING 2 (real generation defect) -- v-block emitted 2x too tall
The text->CAD (cadquery) lane generated *"a v-block 2.0 inch cube with a 90 degree v-groove"* with bbox
`[50.8, 50.8, 101.6]` -- Z = 4 inch, **2x the intended 2 inch** (also flagged `analysisExit=1`).
determinism=true, so it is a genuine generation defect, not a measurement artifact -- the dim band
correctly CAUGHT it (the sole 1/14 cube failure; `bandMet=false` honestly reflects it). The v-groove
extrude likely doubled the Z extent. A real text->CAD quality bug to fix (cadquery codegen prompt / op).

Lesson (R16): investigate a suspicious metric BEFORE shipping it -- the first-pass "43.75% band-pass /
worst 100%" conflated a measurement artifact (cylinders) with a real defect (v-block); separating them
turned a misleading number into 13/14-exact + one genuine finding.
