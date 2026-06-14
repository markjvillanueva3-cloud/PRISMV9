---
name: reference-delta-cad-domain-completeness-audit-2026-05-29
description: "Workflow+codex CAD-domain completeness audit (delta, session f27ecf49). Workflow partial: intake/geometry/features area COMPLETE (verdict: broadly real+substantial), validation+knowledge-meta areas RATE-LIMITED (no data), codex TIMED OUT 600s. Real gaps found (0 P0, 2 P1): no sketch-constraint solver; CadBridge has no revolve/loft/sweep RPC (blocks turned/lofted/swept geometry). P2: no NURBS-surface evaluator in JS kernel, PartMediaToCAD photo degrades to bbox, convexHull3D approximation bug (only tetrahedron, wrong for >4-vertex hulls). Front-half pipeline confirmed real (NURBS-curve Cox-de-Boor, Moller-Trumbore, CadQuery/OCCT bridge for booleans, full ASME-Y14.5 GD&T, real OCR)."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:09.078Z
aliases: reference_delta_cad_domain_completeness_audit_2026_05_29
---


# delta CAD-domain completeness audit (2026-05-29, session f27ecf49)

Operator: "use workflow and codex to assess galaxy build — everything we need for CAD domain." Workflow `wf_ee462d1d` (3 agents). Honest run status: **1/3 areas completed** (intake-geometry-features), **2/3 rate-limited** (validation, knowledge-meta — transient "Server is temporarily limiting requests", NOT usage limit), **codex timed out 600s** (no result). Prior turns already covered the rate-limited areas: knowledge-meta GREEN (completeness workflow w5j2s020v closed all 7 gaps); validation broadly covered (CADAccuracyValidatorEngine 27K real, CollisionDetectionEngine SAFETY real, /tolerance-stack + /dfm-check + cad-step-lint guard).

## Verdict (completed area): front-half pipeline is REAL + substantial
`CADKernelEngine` has genuine NURBS-CURVE (Cox-de Boor), Moller-Trumbore ray-tri, signed-tetra mesh volume, 2D/3D hull, polygon offset. Real 3D booleans / manifold / watertight validation delegated to a spawned **CadQuery/OpenCASCADE `bridge.py`** (sound architecture, not a stub). `CADAssemblyGraphEngine` (BOM/cycle/impact), `CADDrawingKnowledgeEngine` (full ASME-Y14.5 GD&T taxonomy), BlueprintOCR/VisionOCR (35-38K), PDFBlueprintDimensionExtractor, Mesh/BRepTessellator/StockModel — all real. **`CADFeatureRecognitionEngine` is real in H:/prism main**; the 655B stub in the delta worktree is the ~1697-commit lag, NOT a true gap.

## Real gaps (build queue — 0 P0, 2 P1, 3 P2)
- **P1 `U-CAD-SKETCH-CONSTRAINT-SOLVER`** — no 2D geometric-constraint solver anywhere (no coincidence/distance/angle/parallel/perp/tangent + DOF/under-over-constrained analysis). Parametric sketch round-trip from extracted blueprint dims depends on CadQuery Python-side or direct dim emission. Fix: build `SketchConstraintSolverEngine` (Newton/Levenberg-Marquardt on constraint Jacobian) OR expose FreeCAD/CadQuery Sketcher solve via a new `bridge.py` RPC `solveSketch`.
- **P1 `U-CAD-BRIDGE-REVOLVE-LOFT-SWEEP`** — `bridge.py` exposes only box/cylinder/sphere/cone/sketch_extrude + boolean + fillet/chamfer/shell. **No revolve/sweep/loft RPC** → turned (revolved) parts, swept profiles, lofted transitions cannot be modeled through the real kernel. Lathe/organic geometry intake is blocked. Fix: add `revolve(profile,axis,angle)`, `sweep(profile,path)`, `loft(profiles[])` (CadQuery one-liners) + surface in `CadBridge.ts` createGeometry union + a modeling-op dispatcher action.
- **P2** — no `evaluateNURBSSurface` in JS `CADKernelEngine` (NURBSSurface interface declared w/ knot_vector_u/v but only `evaluateNURBSCurve` exists). Add tensor-product Cox-de Boor + surface-normal + tessellate; keep trimmed/periodic on OCCT bridge.
- **P2** — `PartMediaToCADEngine` (photo→CAD) is VLM feature-inference, emits a placeholder bounding box for unknown geometry (line ~493); no photogrammetry/silhouette fallback. Fix: silhouette/space-carving OR loud confidence flag so unknown parts don't silently become a box.
- **P2 (real bug)** — `convexHull3D` builds only the initial tetrahedron from 4 extreme points and never iterates the rest ("Gift-wrapping simplified") → wrong hull/volume/surface_area for any point set with >4 hull vertices. Fix: complete incremental/QuickHull3D + regression test (unit cube → 8 verts, volume 1).

## Caveats (R12)
All gaps are in `CADKernelEngine.ts` / `CadBridge` which live in H:/prism MAIN (worktree 1697 behind). Fixes need main-tree edit (merge blocked) or worktree+merge. Not built this session (assessment-only ask + YELLOW token zone + flaky API quota). Re-run validation+knowledge-meta areas after quota recovers: `Workflow({scriptPath: cad-domain-completeness-wf_ee462d1d-f6f.js, resumeFromRunId: wf_ee462d1d-f6f})` (completed agent cached). See [[reference_delta_per_feature_synergy_sweep_2026_05_29]] · [[cad-knowledge-index]].
