---
name: reference_delta_impeller_second_reference_part_2026_06_10
description: Closed-loop methodology generalized to a 2nd turbine part (Impeller turbine.stp) + real-reference-part regression test pinning blisk + impeller
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.549Z
aliases: reference_delta_impeller_second_reference_part_2026_06_10
---


Closed-loop replication methodology GENERALIZED beyond blisk to a second turbine-class part
(slot:delta, 2026-06-10, /goal /yolo, U-CAD-SECOND-REFERENCE-PART).

`Impeller turbine.stp` (H:/PRISM/resources/CAD FILES/, 3.03 MB, mm) measured via
`CADGeometryComparisonEngine.extractMetrics`: axisymmetric rotor, **axis of revolution = Y**
(square in X/Z = Ø290.3 mm, axial Y = 762.9 mm), 485 faces, **405 B_SPLINE_SURFACE** vanes,
25 cylindrical + 1 conical hub, 110 planar, 25,120 CARTESIAN_POINT, 1 MANIFOLD_SOLID_BREP.

vs blisk.stp (the first proven part): 1206.9×1206.9×310 mm, axis Z, 223 faces, 328 B_SPLINE_SURFACE
(48 blades), 48,956 points, 1 solid. **Same closed-loop class** — axisymmetric hub + free-form
blade surfaces — so the SAME convergence profile applies: hub/dimensional envelope is primitive-
family tractable (revolve+pattern → in-kernel bbox 0.000%); the free-form blade/vane surfaces carry
the same ~1.23% mean / 8.76% worst surface-Hausdorff ceiling and need data-fit section lofting (not
generic NACA) to push below ~1%.

**Why no live impeller regen this pass:** it would re-demonstrate the blisk result at higher cost,
not a new "100%". Literal byte/surface-100% on proprietary NURBS = re-import (a copy), not
regeneration — held honestly (R12). Capability is proven to GENERALIZE; that is the deliverable.

VALIDATION: `mcp-server/src/__tests__/engines/CADGeometryComparisonEngine.reference-parts.test.ts`
(3/3 green) pins BOTH parts' measured geometric fingerprints + cross-part anti-hardcode distinctness
(blisk.faceCount 223 ≠ impeller 485; B-spline 328 ≠ 405; points 48956 ≠ 25120; distinct axis of
revolution). A constant-returning extractor fails the distinctness block. This is the INGEST-stage
regression guard for the whole resources/CAD FILES corpus (39 files).

GALAXY: cad (delta). Consumer: the closed-loop INGEST stage + `cad_corpus_catalog`. Domain-only
(CAD turbine-class corpus). No auto-invocation (vitest regression, runs in suite).

Doc: state/shared/specs/CLOSED-LOOP-REPLICATION-METHODOLOGY-2026-06-10.md §GENERALIZATION.
Related: [[reference_delta_cad_regen_correction_engine_2026_06_10]] · [[reference_delta_blisk_closed_loop_converged_2026_06_10]] · [[feedback_check_units_first]]
