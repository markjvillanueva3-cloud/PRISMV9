---
name: reference_delta_live_closed_loop_proven_2026_06_01
description: LIVE closed-loop CAD replication PROVEN on delta's isolated Fusion bridge :18365 — 3/3 cycles converged to verdict=match against real Fusion geometry read-back. Isolation re-verified (env-port fix worked). Shipped roundtrip-orchestrator + spec-diff (print-to-print) + live-cycle runner. Open gap: real print.json is a geom-feature summary, not the dim/GD&T shape spec-diff wants.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.085Z
aliases: reference_delta_live_closed_loop_proven_2026_06_01
---


# LIVE closed-loop CAD replication PROVEN (slot:delta, 2026-06-01)

## Isolation RESOLVED + delta claimed :18365
Operator relaunched a 2nd Fusion + my env-port fix (PRISM_BRIDGE_CAD_PORT, prior session) took effect. Re-verified
ISOLATED: nonce sketch via :18365 moved its timeline 4->5 while :18361/:18362 stayed FLAT at 0 (last session the
same test LEAKED 3->5 across all three). Two Fusion PIDs (18544=4.3GB binds all ports via SO_REUSEADDR, 59648=new).
Behavioral leak-test is the definitive proof, NOT netstat (SO_REUSEADDR cross-lists). Delta CLAIMS :18365 (CAD),
recorded at state/shared/fusion-bridge-claims.json; kilo owns :18361 (CAM); delta never drives 18361/18362.

## THE PROOF — 3/3 live cycles converged (ledger-verified, not stdout-trusted)
`node scripts/cad-fusion-live-cycle.mjs --port 18365 --cycles 3` → ledger
state/shared/cad-live-cycle-ledger.json: reportedPort 18365, health.ok, summary {total:3,converged:3,rate:1,
mean 4 iters}. Each cycle built a reference box LIVE, read its ACTUAL /geometry (12000/10000/7200 mm3 exact =
x*y*z real Fusion solid volume), then replicated from WRONG initial dims → geom-diff vs live ref → snap-one-dim
correction → rebuild → verdict=match @ iter4. Nothing simulated — every body/bbox/volume read back from Fusion.

## Shipped this session (4 commits)
- bf97d11fe1 — U-CADTP-ROUNDTRIP-ORCH (`cad-fusion-roundtrip-orchestrator.mjs`, 10/10): multi-cycle replicate
  driver over runConvergenceLoop; reusable BOX strategy (BOX_COURSE + boxApplyParams + boxCorrectionStrategy);
  per-cycle ledger + convergence summary. AND U-CADTP-SPEC-DIFF (`cad-fusion-spec-diff.mjs`, 16/16): print<->print
  comparator keyed by feature id — DROPPED dim/GD&T callout = diverged (the dropped-PMI catcher, delta-soul rule).
- 89e75646bb — U-CADTP-LIVE-CYCLE (`scripts/cad-fusion-live-cycle.mjs`): the live runner. /new-first course →
  fresh doc each cycle so the operator's open part is untouched. Targets the CLAIMED isolated 18365.
- (prior session) geom-diff a0060e7119 + convergence-harness a2b780e225 + live-bridge 779a65d573 = the metric +
  loop + transport this builds on. Full stack: [[reference_delta_geom_diff_and_channel_lesson_2026_05_31]] +
  [[reference_delta_fusion_isolation_and_live_bridge_2026_06_01]].

## Operator's DUAL-comparison requirement (2026-06-01) — CAD<->CAD done, print<->print gap open
Operator: "generate new print after drawing cad, check against previous first print — TWO comparisons: cad-model
to cad-model AND print-to-print for double-checking." CAD<->CAD axis = geom-diff, PROVEN live. print<->print axis
= spec-diff, BUILT + tested (16/16) but NOT yet wired to real data: the system's actual
state/shared/cad-regen-output/<part>/<part>.print.json is a GEOMETRY-FEATURE SUMMARY (bbox_3d_mm, cylinder_count,
cylinder_radii_mm[], bspline_count, solid_count) — NOT the {dimensions:[{id,nominal,tol}], gdt:[{id,symbol,
value,datums}]} shape spec-diff consumes. Two real pairs exist per part: .print.json + .print.regen.json. NEXT:
either (a) add a print-feature-summary diff mode to spec-diff matching the real shape, or (b) a normalizer from
print.json→spec shape. spec-diff stays the ideal target for when xray OCR emits dimensioned/GD&T specs.

## Reusable for the full pipeline
A real replicate-to-100% on an arbitrary part = supply that part's referenceModel (live /geometry of the
existing CAD, OR cad-regen-output/<part>.geom.json) + a feature-appropriate course/correction strategy (box
strategy generalizes to extrude-prisms; freeform still bridge-gated on sweep/loft per
[[reference_delta_cad_training_pipeline_2026_05_31]]). The orchestrator runs N cycles + ledgers convergence.
