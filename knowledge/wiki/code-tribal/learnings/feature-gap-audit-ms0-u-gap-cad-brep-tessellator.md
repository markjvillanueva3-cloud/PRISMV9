# FEATURE-GAP-AUDIT-MS0/U-GAP-CAD-BREP-TESSELLATOR — port BRepTessellator from monolith

**Commit:** `710c6b0fb41a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T18:50:37-05:00
**Tags:** feature-gap-audit-ms0, u-gap-cad-brep-tessellator, auto-distilled

## Subject
[FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-BREP-TESSELLATOR: port BRepTessellator from monolith

## Body
```
[FEATURE-GAP-AUDIT-MS0]/U-GAP-CAD-BREP-TESSELLATOR: port BRepTessellator from monolith

Re-modularizes PRISM_BREP_TESSELLATOR.js (716 lines, MIT 18.433) from the
v8.89 monolith into a class-based, statically-dispatched TypeScript engine.

R8 dedup-preflight: AdaptiveTessellationEngine.ts already ports
PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2.js (R2.3.1) — unit re-scoped to the
BRep half only. CADKernelEngine.ts has BRep TOPOLOGY types but no STEP
entity-map driven tessellation, so this engine adds a complementary surface.

Engine — mcp-server/src/engines/BRepTessellatorEngine.ts:
  - Static-method class (engines.md convention) + Zod input schema.
  - Surfaces: PLANE (ear-clip MIT 18.433), CYLINDRICAL_SURFACE,
    CONICAL_SURFACE, SPHERICAL_SURFACE (UV-sphere), TOROIDAL_SURFACE,
    B_SPLINE_SURFACE_WITH_KNOTS (tensor-product bilinear fallback).
  - Shared buildParametricGrid() for parametric surfaces (DRY vs monolith).
  - Fail-soft per-face errors (continueOnFaceError default true).
  - Pure computation — no physics constants, no rendering, no GPU.

Tests — mcp-server/src/__tests__/BRepTessellatorEngine.test.ts (39/39 PASS):
  - Input validation: non-Map stepData/entityMap, Zod schema bounds.
  - Linear algebra primitives: normalize, cross, transformPoint/Vector,
    getPlacement (identity + AXIS2_PLACEMENT_3D resolution).
  - Ear-clipping: degenerate, triangle, CCW/CW square, regular hexagon
    (n-vertex polygon ⇒ n-2 triangles invariant).
  - Geometry: 1-face quad, 6-face cube (12 tris/24 verts/monotonic faceInfo),
    cylindrical (every vertex on radius=R, normals unit-length radial),
    spherical (every vertex on radius=5, normal == v/r), conical
    (base ring at z=0 matches input r), toroidal (r ∈ [Rmaj-Rmin, Rmaj+Rmin]).
  - B-spline 4×4 control grid → resolution×resolution mesh.
  - Adversarial: NaN coords, Infinity coords, 100-face stress, missing
    surface ref (skip with continueOnFaceError, throw without).
  - Dispatcher round-trip: graceful contract assertion via mock-server
    registration (textual fallback when registerCadDispatcher shape varies).

Dispatcher — cadDispatcher.ts:
  - Adds 'brep_tessellate' to ACTIONS enum (next to mesh_*).
  - Lazy-import case handler with Map rehydration from MCP JSON boundary.
  - Returns {success: true, data: {vertices, normals, triangles, faceInfo, statistics}}.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../src/__tests__/BRepTessellatorEngine.test.ts    | 863 +++++++++++++++++++++
- mcp-server/src/engines/BRepTessellatorEngine.ts    | 839 ++++++++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  30 +
- 3 files changed, 1732 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 710c6b0fb41a`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._