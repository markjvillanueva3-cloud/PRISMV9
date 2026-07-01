---
name: reference-jm-trilobe-example-step-analysis-2026-05-27
description: "Full structural analysis of JM Die trilobe-example.step (the gold-standard reference electrode part 9106325). Reveals 6 RATIONAL_B_SPLINE_SURFACE patches + 6 CYLINDRICAL_SURFACE arc segments alternating around the perimeter, brass material, Y-axis as part axis. This is the canonical reference for all trilobe electrode replicators."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.629Z
aliases: reference_jm_trilobe_example_step_analysis_2026_05_27
---


# JM Trilobe Reference STEP File — Full Analysis (2026-05-27)

## Source
`H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/trilobe-example.step` — 30.6 KB, AP203 schema, 676 lines, 545 entities

## Part identity
- **Part number:** `9106325` (JM internal)
- **Material:** Brass, Soft Yellow (density 8470 kg/m³)
- **Color:** RGB(0.953, 0.796, 0.486) — brass matte
- **Originating system:** Autodesk Translation Framework v15.8.0.0 → ST-Developer v20.1
- **Unit:** INCH via CONVERSION_BASED_UNIT (LENGTH_MEASURE(25.4) off SI MILLI METRE) — same pattern I now use after iter122 fix
- **Axis convention:** Y is the AXIAL direction (along the part's length), X+Z are the radial cross-section plane. This is OPPOSITE of my emitter (which uses Z axial).

## Trilobe surface representation — THE KEY INSIGHT

The trilobe lateral surface is NOT polygon-approximated. It's NOT a single B-spline. It's:

### 12 alternating surface patches around the perimeter (6 + 6):

**6 lobe NURBS patches (B_SPLINE_SURFACE_WITH_KNOTS, entities #242–#247):**
- 3 peak lobes (3 outward bulges)
- 3 valley lobes (3 inward dips)  
- Each is `RATIONAL_B_SPLINE_SURFACE` with `BOUNDED_SURFACE`
- Degree (2,2) — biquadratic
- 3×3 control points each (9 CARTESIAN_POINTs)
- Knot multiplicities (3,3) — clamped (acts as a single Bezier patch)
- **Rational weights pattern:** `((1, √3/2, 1), (w, w·√3/2, w), (1, √3/2, 1))` where w ≈ 0.994 — this is the **standard NURBS representation of a circular arc** at degree 2. `√3/2 ≈ 0.866` is the canonical weight for a 60° arc.

**6 CYLINDRICAL_SURFACE arc segments (entities #43–#48):**
- 2 distinct radii: **0.1965554"** (larger) and **0.158093995381062"** (smaller)
- These are the "rest" sections between lobe patches (the cylindrical part where the radius is constant for a brief angular span)

**Alternating pattern around the circumference:**
```
... lobe_peak (NURBS) | cyl_arc (small_r) | lobe_valley (NURBS) | cyl_arc (large_r) | lobe_peak | ...
```
or some similar interleaving — 6 + 6 = 12 patches × 30° each = 360° full circumference.

## Topology breakdown
| Entity type | Count | Purpose |
|---|---|---|
| MANIFOLD_SOLID_BREP | 1 | Body1 |
| CLOSED_SHELL | 1 | All 14 faces |
| ADVANCED_FACE | 14 | 6 lobe + 6 cylindrical + 2 cap planes |
| EDGE_LOOP | 14 | One per face |
| ORIENTED_EDGE | 76 | All edge references |
| EDGE_CURVE | 38 | Edge geometry bindings |
| VERTEX_POINT | 26 | Topology vertices |
| CIRCLE | 25 | Arc-edge geometry |
| LINE | 13 | Straight edges (axial bones between cap and shoulder) |
| AXIS2_PLACEMENT_3D | 34 | Coord frames per surface |
| DIRECTION | 81 | Vector definitions |
| CARTESIAN_POINT | 102 | All control + reference points |
| B_SPLINE_SURFACE_WITH_KNOTS | 6 | The lobe NURBS patches |
| CYLINDRICAL_SURFACE | 6 | The cylindrical arc segments |
| PLANE | 2 | End caps |

## Axial profile (Y-stations)
The 3 Y-coordinates used for B-spline control points reveal the axial layout:
- **Y = 0.125** (low end)
- **Y = 0.281381745543407** (middle — likely a feature transition)
- **Y = 0.434** (high end — outer face)

This suggests the part has at least 3 distinct axial stations where the cross-section profile may shift slightly. The control points at each station define the lobe shape at that height — meaning the part may have a **draft angle** or **tapered profile** built in (not purely extruded).

Also: there's a Y=0 face and Y=0.626 face implied by other CARTESIAN_POINTs — so the FULL axial range is **0.0 to 0.626"** (or ~16 mm). Operator's print said 1.000" total length — so this reference part is NOT exactly the EJOT P30247750 electrode, but a similar TYPE of part (different specific dims).

## Reference radii in the file
- `0.1965554` — likely the lobe peak radius (outer envelope radius)
- `0.158093995381062` — likely the valley radius (inner envelope radius)
- `0.162453805523703` — appears in CIRCLE entities
- `0.123992400904765` — appears in CIRCLE entities (could be the fillet radius? ~0.124")
- `1.417` — suspicious large value, appears in 4 CIRCLEs. Possible interpretation: the **radius of curvature** of one of the lobe arcs as viewed from the OPPOSITE side of the part (a large arc of curvature centered far away from the part center). 1.417 × 360° in radians ≈ way larger than the part, so this must be a curvature radius for a "nearly straight" arc segment.

## What this means for the PRISM replicator

To produce JM-quality trilobe STEP files, I need to:

1. **Use Y as axial axis** (or transform at the end). Easier to use Y directly during construction.

2. **Generate 6 RATIONAL_B_SPLINE_SURFACE patches** for the lobes:
   - Each patch is a 3×3 quadratic Bezier with weight pattern `(1, √3/2, 1)` for arc-like profile in the U direction
   - The 3 V control rows define the axial profile (3 stations)
   - This gives a smooth, properly curved lobe surface

3. **Generate 6 CYLINDRICAL_SURFACE patches** between the lobes:
   - Use 2 radii (peak and valley envelope radii)
   - These provide the constant-radius "rest" arcs

4. **Stitch the 12 lateral patches + 2 cap planes** into one CLOSED_SHELL.

5. **Material assignment** — emit MATERIAL_DEFINITION + COLOUR_RGB so the output looks brass in Fusion (operator-visible quality signal).

6. **Use AP203 schema** to match JM's exact format (not AP242). The translator chain Autodesk → ST-Developer → AP203 is the proven path.

## Practical next-iter scope (iter124+)

- **iter124:** Write a STEP-AST parser (`scripts/lib/cad-step-parse-lib.mjs`) that ingests `trilobe-example.step` and produces a structured tree (entities by id, references resolved).
- **iter125:** Write a `cad-trilobe-replicator.mjs` that emits the SAME 14-face topology but with operator-supplied parameters (lobe peak r, valley r, lobe count, length, axial taper).
- **iter126:** Diff-test: regen with JM's exact dims → byte-level diff should be near-zero (only file timestamps + auto-gen IDs differ).
- **iter127:** Apply to EJOT P30247750 print's dims → produce a proper Fusion-compatible JM-style electrode STEP.

## Cross-reference
- The B_SPLINE_SURFACE for a circular arc at degree 2: control points (P0, P1, P2) where P0, P2 are arc endpoints and P1 is the intersection of tangent lines at P0 and P2, with weight √3/2 on P1 produces a 60° arc. For 3 lobes spaced 120° apart, three 60° arc patches with valleys between them gives proper 3-fold symmetry.

## Anchor memories
- [[reference_jm_die_electrode_xlsm_format_2026_05_27]] — xlsm macro decoded
- [[reference_cad_cam_seat_paths_2026_05_27]] — Mastercam X8 + hyperCAD v31 available
- [[reference_hypermill_use_v31_not_v33_2026_05_27]] — v31 rule
- [[reference_solidworks_local_install_2026_05_27]] — SW install status
- [[reference_cad_domain_map_for_delta_2026_05_27]] — full CAD inventory
