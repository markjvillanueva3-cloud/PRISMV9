---
name: reference-delta-cad-toolchain-session-2026-05-27
description: "Full slot:delta CAD toolchain shipped 2026-05-27 (iter96-132, ~37 commits). Parser, emitter, scaler, replicator, analyzer, smooth-spline emitter, EJOT-exact-dim generator. Captures the operator-iteration arc on the EJOT P30247750 trilobe electrode, what each tool solves, and what remains unsolved."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.542Z
aliases: reference_delta_cad_toolchain_session_2026_05_27
---


# Slot:delta CAD toolchain — full session recap (2026-05-27)

## Operator's deliverable target
EJOT P30247750-1D2 D-60 CARB top-die insert M8 x 1.25 Taptite electrode burn-form (the SINKER EDM ELECTRODE that burns the trilobe cavity into the die).

Exact print dims captured at [[reference_ejot_p30247750_exact_dims_2026_05_27]]:
- Large body trilobe: 0.606" long, peak Ø.2872 / valley Ø.2664
- R0.787" arc-blend transition: 0.175" long
- Small tip trilobe: 0.220" long, peak Ø.2659 / valley Ø.2563
- Total: 1.001"
- Spark gap: -.003" total (-.0015"/side) per JM Die convention

## Tool inventory (slot:delta worktree `H:/prism-slot-delta/scripts/`)

### Core libraries (`./scripts/lib/`)

**`cad-step-ap242-emitter.mjs`** — Direct AP242 emitter, 6 functions:
- `emitValidPrismStep(polygon, depth)` — single polygon-prism solid
- `emitMultiPrismStep(solidSpecs)` — multiple stacked polygon-prism solids
- `emitMultiSmoothPrismStep(solidSpecs)` — same but with B_SPLINE_CURVE lateral edges (smooth curves in Fusion). **Default for the EJOT generator at iter132+.**
- `emitValidCylinderStep(radius, depth)` — single round cylinder via CYLINDRICAL_SURFACE
- `emitValidSteppedCylinderStep(sections)` — multiple stacked cylinders with planar annular transitions (mimics JM trilobe-example.step style)
- `StepAp242Builder` class + `AP242_CONSTANTS`

Unit: CONVERSION_BASED_UNIT('INCH') via 25.4 mm conversion. Fixed at iter122.

**`cad-step-parse-lib.mjs`** — Pure-fn AP203/AP242 STEP parser:
- `parseStepFile(text)` returns `{ok, header, entities:Map, byType:Map, references:Map}`
- Handles complex entities, escaped strings, nested parens, multi-line records, comments
- `entitiesOfType(ast, name)`, `deref(ast, id)`, `summarizeEntity(ent)`
- Smoke-tested: 536 entities / 72 types on JM reference, 0 dangling refs

**`cad-step-emit-lib.mjs`** — AST → STEP text serializer + scalers:
- `serializeAst(ast)` — round-trip emit
- `scaleAst(ast, factor)` — uniform scaling (CARTESIAN_POINT + radii)
- `scaleAstAxes(ast, {sx, sy, sz})` — per-axis anisotropic scaling, radii use geometric mean of sx*sz
- `emitScaledStep(ast, factor)`, `emitScaledAxesStep(ast, axes)`

**`cad-step-roundtrip.test.mjs`** — 8 round-trip identity tests, all pass.

### CLIs (`./scripts/`)

**`cad-analyze-step.mjs`** — Inspect any STEP file:
```
node scripts/cad-analyze-step.mjs <file.step>
```
Reports schema, entity counts, type histogram, material, coord ranges per axis, unique radii by surface type, suggested template-replicator args.

**`cad-replicate-from-template.mjs`** — Generic replicator:
```
node scripts/cad-replicate-from-template.mjs <ref.step> \
  --target-peak-radius 0.142 --target-length 1.0 --out output.step
```
Scales any reference STEP to new dims, preserving topology. Supports uniform / anisotropic / target-dim modes.

**`cad-generate-stepped-trilobe-cli.mjs`** — Parametric stepped-trilobe generator:
```
node scripts/cad-generate-stepped-trilobe-cli.mjs \
  --large-peak-dia 0.2872 --large-valley-dia 0.2664 --large-length 0.606 \
  --small-peak-dia 0.2659 --small-valley-dia 0.2563 \
  --blend-radius 0.787 --blend-length 0.175 --total-length 1.001
```
Computes tip length, R-arc trajectory, builds 18-body stacked-prism electrode. Defaults to EJOT spec.

**`cad-generate-ejot-electrode-exact.mjs`** — Hardcoded EJOT generator (single-shot for the canonical part). Used emitMultiSmoothPrismStep from iter132 → 3.3K entities, 54 faces, smooth B-spline lobes.

**`cad-generate-trilobe-from-jm-template.mjs`** — Reverse-engineer from JM template:
- Parses `H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/trilobe-example.step`
- Scales to EJOT dims (anisotropic: radial 0.723× + axial 1.596×)
- Result: JM-style topology (6 NURBS + 6 cylindrical) at EJOT size — BUT JM's reference is a DIFFERENT archetype than EJOT (single-section vs EJOT's two-section+blend), so this scaler is not the right approach for EJOT specifically.

### Earlier session work (synth lib, fleet)

**`scripts/lib/cad-assembly-synthesize-lib.mjs`** — 38 distinct CAD synthesis primitives (sketch primitives, feature ops, composed ops, topology entities, sweeps, fillets, etc.) — built iter25-iter113.

**`scripts/cad-fleet-regen-valid.mjs`** — 70-file fleet regen across 10 archetypes × 7 CAD softwares, all valid AP242.

## Iter timeline (iter95-iter132 — ~37 commits)

| Range | Theme | Outcome |
|---|---|---|
| 95-115 | Synth-lib expansion (linearArray, helix, rectGrid, polarArray, ribPattern, bend, slot, counterbore, countersink, boss, structuralChannel, keyway, sphericalSurface, offsetSurface, trimmedCurve, edgeCurve, orientedEdge, edgeLoop) | 38 distinct CAD primitives, 140/140 tests pass |
| 116 | Trilobe burn-form first emit (polygon-prism) | Built but Fusion-broken (CLOSED_SHELL → LINE invalid topology) |
| 117 | Fleet regen 49 simple archetypes | Valid AP242 |
| 118 | Fleet regen 21 patterned archetypes | All 70 fleet valid |
| 119-122 | Valid AP242 prism emitter + inch unit fix | Right topology, right unit |
| 123-128 | Reverse-engineer JM trilobe-example.step → parser → emitter → scaler → CLI | Full template-replicator chain |
| 129 | Round-trip identity tests | 8/8 pass + uniform scaleAst bug fixed |
| 130 | EJOT exact print dims | 3-section stacked (large + R0.787 blend + small tip), 1.001" total |
| 131 | Generic stepped-trilobe CLI | Future Taptite variants = 1 CLI call |
| 132 | Smooth B_SPLINE_CURVE_WITH_KNOTS lateral edges | 1332→54 faces, smooth in Fusion |

## What's solved
✅ Valid AP242 STEP files (Fusion-openable) — using `emitMultiPrismStep` (polygon-line edges)
✅ Inch units (CONVERSION_BASED_UNIT 25.4mm)
✅ Operator's exact print dimensions (large 0.606 + blend 0.175 + tip 0.220 = 1.001)
✅ R0.787" arc-discretized blend (16-segment, real arc trajectory)
✅ Spark gap convention (-.003"/side)
✅ Brass material + RGB color in emitted STEP (iter135)
✅ Generic CLI for future Taptite variants
✅ Parser + scaler + analyzer toolchain for any future reference STEP
✅ Round-trip identity tests 8/8 PASS + dimensional verifier 5/5 PASS (iter138)

## Known regression — DO NOT USE
❌ **`emitMultiSmoothPrismStep` (iter132) — Fusion shows blank document**
    The closed-periodic B_SPLINE_CURVE_WITH_KNOTS this function emits is malformed:
    - Used N+1 uniform knots with all multiplicities = 1
    - For degree-3 periodic, valid forms are: (a) N+p+1 knots with periodic wrap-around,
      or (b) clamped-open form with degree+1 multiplicity at both ends + wrap-around control points
    - Fusion's STEP loader silently rejects malformed periodic curves, producing a blank document
    - **Reverted at iter137** — EJOT generator now uses proven `emitMultiPrismStep`
    - The smooth-spline function is kept in the library for a future proper fix
    - **For visible smoothness:** the right path forward is to emit 6 RATIONAL_B_SPLINE arc patches
      (matching JM's 6-segment pattern, degree-2 with weight (1, √3/2, 1))

## What remains unsolved (next-session candidates)
- **Single-body output:** Currently 18 stacked bodies — operator must Combine→Join in Fusion. To produce ONE solid, adjacent sections must share edge loops. Topology surgery needed.
- **True NURBS arc lobes:** My periodic B-spline approximates the trilobe curve from 72 sampled points. JM's reference uses 6 RATIONAL_B_SPLINE_SURFACE patches with weight (1, √3/2, 1) for proper math-arc representation. Mathematically cleaner but more emit code.
- **Material assignment:** Output is geometry-only. To match JM-style brass appearance in Fusion, emit STYLED_ITEM + SURFACE_STYLE_FILL_AREA + COLOUR_RGB.
- **VBA macro port (path-2):** Decoded macro logic at `H:/prism/state/shared/jm-electrode-extracted/Sheet9.cls.bas` — would need a live CAD seat to drive (SolidWorks not COM-registered on this machine; Mastercam X8 and hyperCAD v31 are running, see [[reference_cad_cam_seat_paths_2026_05_27]]).
- **CAM program generation:** The electrode is just the geometry side. Sinker EDM program (orbit motion + gap voltage + electrode down-feed) is a kilo (CAM specialist) deliverable.

## Quick start commands for the next delta session

```bash
# 1. Regenerate the EJOT electrode (default = print dims):
node H:/prism-slot-delta/scripts/cad-generate-ejot-electrode-exact.mjs

# 2. Or use the parametric CLI for a different size:
node H:/prism-slot-delta/scripts/cad-generate-stepped-trilobe-cli.mjs --help

# 3. Analyze any STEP file:
node H:/prism-slot-delta/scripts/cad-analyze-step.mjs <file.step>

# 4. Replicate any JM reference at new dims:
node H:/prism-slot-delta/scripts/cad-replicate-from-template.mjs <ref.step> \
  --target-peak-radius 0.150 --target-length 1.2 --out new.step

# 5. Run all tests:
node --test H:/prism-slot-delta/scripts/lib/cad-step-roundtrip.test.mjs
node --test H:/prism-slot-delta/scripts/lib/cad-assembly-synthesize-lib.test.mjs
node --test H:/prism-slot-delta/scripts/lib/cad-step-ap242-emitter.test.mjs
```

## Reference STEP files
- `H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/trilobe-example.step` — JM Die 9106325, 30 KB, AP203, 6 NURBS lobe patches + 6 cylindrical arcs + brass material. Use as TEMPLATE for similar archetypes.
- `H:/prism/state/shared/cad-generated/test-electrode-male-trilobe-burnform.step` — Current EJOT output (3.3K entities, smooth B-spline lobes, 18 stacked bodies, 1.001" length).

## Anchor memories
- [[reference_jm_trilobe_example_step_analysis_2026_05_27]] — JM reference fully analyzed
- [[reference_ejot_p30247750_exact_dims_2026_05_27]] — EJOT print exact dims
- [[reference_cad_replicate_from_template_workflow_2026_05_27]] — template-replicator workflow
- [[reference_jm_die_electrode_xlsm_format_2026_05_27]] — xlsm + VBA macro decoded
- [[reference_cad_cam_seat_paths_2026_05_27]] — Mastercam X8 + hyperCAD v31 running + paths
- [[reference_solidworks_local_install_2026_05_27]] — SolidWorks COM registration needed
- [[reference_hypermill_use_v31_not_v33_2026_05_27]] — v31 not v33
- [[reference_cad_domain_map_for_delta_2026_05_27]] — full PRISM CAD-domain inventory
- [[reference_cad_piece3_fleet_complete_2026_05_27]] — fleet state at iter112
