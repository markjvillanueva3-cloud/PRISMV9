---
name: reference_delta_section_floor_experiment_inconclusive_2026_06_10
description: "Pure-node \"real-section reconstruction floor\" proxy is INVALID (file-order decimation != spatial sectioning); loft fidelity needs a CAD kernel. Worst-case Hausdorff is outlier-dominated -> report mean."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.550Z
aliases: reference_delta_section_floor_experiment_inconclusive_2026_06_10
---


INCONCLUSIVE EXPERIMENT (slot:delta, 2026-06-10) — recorded so it is NOT repeated.

Attempted to prove the data-fit "real-section regeneration reaches <1%" claim with a pure-node
proxy: extract blisk.stp's real CARTESIAN_POINT cloud (48,951 pts), decimate by file-order stride
("sections"), measure directed Hausdorff(full -> decimated) as the "reconstruction floor."

RESULT WAS INVALID, not reported as proof:
- worst gap stayed ~4.2% even at 4080 retained pts, jumping to 8.77% at 510 — NOT a clean
  density->accuracy curve.
- ROOT CAUSE: STEP CARTESIAN_POINT file order is NOT spatially coherent, so stride-decimation
  drops spatially-clustered points and leaves artificial gaps. File-order stride != spatial
  sectioning. The numbers are decimation artifacts, not geometry.

HONEST TAKEAWAYS (these ARE valid):
1. The worst-case surface Hausdorff (5.087% on the NACA replica) is dominated by SPARSE/isolated
   regions (a single point with no near neighbor) -> it is one-outlier-sensitive. The MEAN chamfer
   (1.551%) is the REPRESENTATIVE regeneration-accuracy metric; lead with it, caveat the worst-case.
2. There is NO clean pure-node point-decimation proxy for LOFT-SURFACE fidelity. A section loft
   interpolates a B-spline surface BETWEEN sections; its fidelity is a CAD-kernel property, not a
   point-set property. Proving real-section regen reaches <1% REQUIRES the actual live kernel loft
   (Fusion), not a node experiment. Do not try to substitute a point proxy again.

NEXT (the real unit, fresh window): live Fusion real-section reconstruction — extract one blade's
spatial cross-sections (Z-banded, per angular sector) from blisk's B_SPLINE_SURFACE region, loft
them, pattern 48, export, measure Hausdorff vs blisk.stp. THAT produces the improved part + the
honest sub-NACA number. Needs live Fusion :18361 + a full window.

This fire's REAL validated progress is unaffected: 3 commits (U-CAD-SECOND-REFERENCE-PART,
U-CAD-CORPUS-CLASS-COVERAGE, U-CAD-FIDELITY-E2E-VALIDATE cb1ec539a3) with canonical measured
accuracy 0.000% dims / 1.551% mean / 5.087% worst on the real pair.

Related: [[reference_delta_impeller_second_reference_part_2026_06_10]] · [[reference_delta_dist_buildfast_vs_incremental_2026_06_10]] · [[feedback_verify_actual_contract_not_proxy]]
