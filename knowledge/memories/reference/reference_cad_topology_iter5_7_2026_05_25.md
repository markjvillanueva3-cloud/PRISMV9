---
name: reference_cad_topology_iter5_7_2026_05_25
description: CAD-PIPELINE-WIRE-MS0 topology emitter closes from 27.8% → 97.7% of source 485-face impeller in 3 iters (iter+5..+7 on slot:delta 2026-05-25) — plane slabs + cone frustums + raised caps + B-spline blade quad-slabs. Corpus avg faces 123 → 288 → 361.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.043Z
aliases: reference_cad_topology_iter5_7_2026_05_25
---


# CAD topology emitter — iter+5..+7 arc (97.7% impeller fidelity)

Shipped 2026-05-25 on slot:delta in 3 commits:

| commit | iter | impeller faces | corpus avg | jump |
|---|---|---|---|---|
| `0bb401454f` | iter+5 | 135 (27.8%) | 123.51 | + 16 plane slabs (schema v3) |
| `<post-iter+5>` | iter+6 | 282 (58.1%) | 288.20 | + cone frustums + raised caps (planes 16→40, cyls 24→64, schema v4) |
| `<post-iter+7>` | iter+7 | 474 (97.7%) | 361.53 | + 32 B-spline blade quad-slabs (schema v5) |

## Schema evolution (geom.json)

- v3: planes[] with embedded placement.{origin,zAxis,xAxis}
- v4: cones[] with embedded placement
- v5: splineSurfaces[].corners (4 well-spaced XYZ pts resolved from points table BEFORE the controlPointRefs slice(0,32) so true surface extent is captured)

## Emitter additions

- `pickPlacedPlanes` / `emitPlaneSlabEntities` — 6-face rectangular slabs from plane placement, W = min(bbox)/8, T = W/40, dedupe by rounded (origin,normal). Cap 40.
- `pickPlacedCones` / `emitConeFrustumEntities` — 3-face truncated cone (lateral CONICAL_SURFACE + 2 PLANE caps). Cap 16.
- `pickPlacedBsplines` / `emitBladeSlabEntities` — 6-face quad slab from arbitrary 4 corner pts + computed normal (cross product). Dedupe by rounded centroid. Cap 32.
- Entity-id allocation discipline: planes 5000+i*200, cones 18000+i*100, blades 20000+i*220 — no overlap.

## Honesty (don't claim what we don't deliver)

- Plane slabs: heuristic size — MARK plane positions, NOT true source face extent (would need source EDGE_LOOP extract).
- Blade slabs: FLAT quads through 4 corners — captures position+orientation+extent, NOT curvature. The visual "flat vanes vs curved impeller" gap is the next big target (requires B_SPLINE_SURFACE_WITH_KNOTS emission with full control net).
- 170 corpus slugs still single-hub-fallback because their geom.json placement resolution returns empty for cylinders+planes+cones+blades — likely fixture-class.

## Cross-refs

- `[[reference_cad_pipeline_closed_loop_2026_05_24]]` — base closed-loop pipeline
- `[[reference_cad_topology_emitter_2026_05_25]]` — iter+1 topology-rich emitter foundation
- Wiki: [`knowledge/wiki/architecture/cad-pipeline-closed-loop.md`] — 7-iter table + schema evolution + emitter helpers
- Scripts: `cad-step-geometric-extract.mjs`, `cad-emit-impeller-fusion-step.mjs`, `cad-step-topology-validate.mjs`, `cad-corpus-topology-sweep.mjs`, `cad-corpus-topology-emit-all.mjs`, `cad-to-desktop.mjs`
- Skill: `/cad-to-desktop` (drops SOURCE + REGEN_TOPOLOGY + REGEN_LEGACY + STL to operator Desktop)

## Pending next-iter targets

- Iter+8 (this session): relax MIN_RADIUS to unblock 170 single-hub slugs
- B_SPLINE_SURFACE_WITH_KNOTS emission for curved blades (visual upgrade)
- Source EDGE_LOOP extraction (closes 11-face residual on impeller + replaces plane-slab heuristics)
- Wire topology STEP into print-compare scoring
