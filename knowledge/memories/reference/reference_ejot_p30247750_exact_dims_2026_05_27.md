---
name: reference-ejot-p30247750-exact-dims-2026-05-27
description: "Exact print dimensions for EJOT P30247750-1D2 D-60 CARB top-die insert M8 x 1.25 Taptite electrode burn-form (operator-confirmed 2026-05-27). The part is JUST the trilobe burn-form — no shank, no head. Stepped two-trilobe with large radial blend."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.566Z
aliases: reference_ejot_p30247750_exact_dims_2026_05_27
---


# EJOT P30247750-1D2 — operator-confirmed exact dims (2026-05-27)

## Geometry — JUST the burn-form
The part is THE TRILOBE BURN-FORM ONLY — no shank, no operator-grip. Total length 1.000"-1.002".

```
   axial (Z)
     ↑
     |              ┌──────────┐
     |              │          │   LARGE TRILOBE (main body)
     |              │ ←Ø.2872  │   • length: 0.605"-0.607"  (nominal 0.606")
     |              │  Ø.2664→ │   • peak diameter: 0.2872" (peak r=0.1436")
     |              │          │   • valley diameter: 0.2664" (valley r=0.1332")
     |              │          │
     |             /            \  R 0.787" BLEND TRANSITION
     |            /              \ • length: 0.175"
     |           /                \• radius: 0.784"-0.790" (nominal 0.787")
     |          /                  \• circular arc revolved around part axis
     |         |                    |
     |         | ←Ø.2659             SMALLER TIP TRILOBE
     |         |  Ø.2563→           • length: 1.001 - 0.606 - 0.175 = 0.220"
     |         └────────────┘       • peak diameter: 0.2659" (peak r=0.13295")
     |                              • valley diameter: 0.2563" (valley r=0.12815")
     |
     └→ radial
```

## Computed dimensions

| Section | Length (in) | Peak Ø (in) | Valley Ø (in) | Peak r (in) | Valley r (in) |
|---|---|---|---|---|---|
| Large (main body) | 0.605–0.607 (nom **0.606**) | 0.2872 | 0.2664 | 0.1436 | 0.1332 |
| R-blend transition | 0.175 (R=0.784–0.790, nom **R=0.787**) | tapers Ø0.2872→Ø0.2659 | tapers Ø0.2664→Ø0.2563 | — | — |
| Small (tip) | **0.220** (computed: 1.001 − 0.606 − 0.175) | 0.2659 | 0.2563 | 0.13295 | 0.12815 |
| **Total** | **1.001** (1.000–1.002) | | | | |

## With JM Die spark-gap convention (-0.003" per OD = -0.0015" per side)

| Section | Electrode peak r (in) | Electrode valley r (in) |
|---|---|---|
| Large (main body) | 0.1421 | 0.1317 |
| Small (tip) | 0.13145 | 0.12665 |

## Construction strategy — what the next CAD iter must produce

The geometry has THREE sections joined into ONE part:

1. **Large trilobe section** (z = 0 to 0.606)
   - 3-lobe cosine-modulated cross section: r(θ, z) = R_mean_large + amp_large · cos(3θ)
   - R_mean_large = (0.1421 + 0.1317)/2 = 0.1369
   - amp_large = (0.1421 − 0.1317)/2 = 0.0052

2. **R-blend transition section** (z = 0.606 to 0.781)
   - SURFACE_OF_REVOLUTION of a circular arc, radius 0.787"
   - Arc tangentially connects large trilobe envelope to small tip envelope
   - Lobes morph from large_amp to small_amp over the 0.175" axial span

3. **Small tip section** (z = 0.781 to 1.001)
   - 3-lobe: r(θ, z) = R_mean_small + amp_small · cos(3θ)
   - R_mean_small = (0.13145 + 0.12665)/2 = 0.12905
   - amp_small = (0.13145 − 0.12665)/2 = 0.0024

## STEP entities needed for proper output
- **Large section lateral surface:** SURFACE_OF_LINEAR_EXTRUSION of a B_SPLINE_CURVE_WITH_KNOTS profile (smooth 3-lobe closed periodic curve)
- **R-blend section lateral surface:** SURFACE_OF_REVOLUTION of an arc-shaped B_SPLINE_CURVE_WITH_KNOTS profile (the radius transition)
- **Small section lateral surface:** SURFACE_OF_LINEAR_EXTRUSION of a smaller-radius B-spline trilobe
- **End caps:** 2 PLANE entities with FACE_OUTER_BOUND from the matching trilobe edges
- **Edge topology:** EDGE_CURVE bindings between sections via shared closed-loop edges

## Why JM's trilobe-example.step doesn't match
JM 9106325 has different topology: 6 NURBS lobe patches + 6 cylindrical arcs in a single section. The EJOT print is a TWO-section stepped trilobe with a blend — different feature graph. Scaling JM's geometry can produce a JM-shaped part at EJOT size, but cannot produce EJOT's two-trilobe + blend topology.

## Anchor memories
- [[reference_jm_trilobe_example_step_analysis_2026_05_27]] — JM reference analyzed (different archetype)
- [[reference_cad_replicate_from_template_workflow_2026_05_27]] — template-scale approach (works for same-archetype, not for EJOT)
- [[reference_jm_die_electrode_xlsm_format_2026_05_27]] — JM xlsm + macro decoded
- [[reference_cad_cam_seat_paths_2026_05_27]] — Mastercam X8 + hyperCAD v31 running
