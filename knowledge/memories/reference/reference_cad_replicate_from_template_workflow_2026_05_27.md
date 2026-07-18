---
name: reference-cad-replicate-from-template-workflow-2026-05-27
description: How to use the cad-replicate-from-template CLI + parse/emit lib trio to generate ANY new electrode/part by taking a JM Die reference STEP and scaling to target dims. Preserves real NURBS/CYLINDRICAL_SURFACE topology — no polygon approximation. Built iter124-127 (slot:delta).
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.497Z
aliases: reference_cad_replicate_from_template_workflow_2026_05_27
---


# CAD-replicate-from-template workflow (2026-05-27, iter124-127)

## What this solves
Generate Fusion-quality STEP files with real curved NURBS surfaces (not polygon approximations) by **scaling a known-good reference part** instead of constructing geometry from scratch. The "reverse-engineer + adapt" approach the operator specified.

## The 3-tool stack
1. **`scripts/lib/cad-step-parse-lib.mjs`** — STEP AP203/AP242 parser (any STEP file → AST)
2. **`scripts/lib/cad-step-emit-lib.mjs`** — AST scaler + serializer (AST → STEP text)
3. **`scripts/cad-replicate-from-template.mjs`** — CLI orchestrator

## Quick start

```bash
# Generate a smaller variant of JM's trilobe template at exact EJOT M8 Taptite dims:
node H:/prism-slot-delta/scripts/cad-replicate-from-template.mjs \
  "H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/trilobe-example.step" \
  --target-peak-radius 0.1421 \
  --target-length 1.000 \
  --out "H:/prism/state/shared/cad-generated/test-electrode-male-trilobe-burnform.step"
```

Output: 32 KB STEP file with EXACT JM topology (14 ADVANCED_FACE, 6 RATIONAL_B_SPLINE_SURFACE lobes, 6 CYLINDRICAL_SURFACE arcs, brass material) scaled radially 0.723× and axially 1.596× to match the EJOT print.

## All CLI options
- `<template.step>` (positional, required) — path to reference STEP
- `--uniform-scale <factor>` — scale all axes equally
- `--radial-scale <factor>` + `--axial-scale <factor>` — independent radial vs axial
- `--target-peak-radius <in>` — compute radial scale from current vs target peak radius
- `--target-length <in>` — compute axial scale from current vs target axial length
- `--template-peak-radius <in>` — override template's known peak radius (default 0.1965554 for JM trilobe)
- `--template-length <in>` — override template's known axial length (default 0.626550782618282 for JM trilobe)
- `--out <path>` — output STEP path (default `./out.step`)
- `--part-name <name>` — part name override

## How it works internally
1. `parseStepFile(text)` — char-by-char tokenizer respecting nested parens + quoted strings + escapes, returns `{entities: Map<id, {type, args, raw}>, byType: Map, references: Map, header}`
2. `scaleAstAxes(ast, {sx, sy, sz})` — walks every `CARTESIAN_POINT` and scales the (x, y, z) coordinate list per axis. For radii in `CIRCLE / CYLINDRICAL_SURFACE / SPHERICAL_SURFACE / CONICAL_SURFACE / TOROIDAL_SURFACE / VECTOR magnitude` uses **geometric mean of sx and sz** (radii live in the radial plane).
3. `serializeAst(ast)` — emits STEP text in stable id-sorted order: header section → `#id = ENTITY(args);` data section → `ENDSEC; END-ISO-10303-21;`

## When this approach works vs fails

**Works when:**
- Target part is the SAME archetype as the reference (e.g. trilobe scaled to different size)
- Operator wants smooth NURBS surfaces, real cylindrical/toroidal entities (Fusion-quality)
- Acceptable for small dimensional changes (<2× scale typically — extreme aspect-ratio changes can warp NURBS)

**Fails when:**
- Target part has different FEATURE TOPOLOGY (e.g. trilobe → counterbore + slot)
- Different lobe count (3-lobe template can't easily become 4-lobe or 6-lobe — would need topology surgery)
- Different feature SEQUENCE (added boss, removed step, etc.)

**For radically different parts:** add a new JM example STEP to `H:/PRISM/JM DIE/_PART LIBRARY/JM EXAMPLE PARTS/` for that archetype, then template from it. Each archetype gets its own reference.

## Reference library growth path

Current JM EXAMPLE PARTS:
- `trilobe-example.step` (P/N 9106325) — 3-lobe Taptite electrode

Future archetypes to add (operator-side):
- M3/M4/M5/M6/M8/M10/M12 Taptite trilobes (different sizes — but our scaler already handles trilobe-size variation)
- 4-lobe / 6-lobe / Altracs / mailbox / square / etc. electrodes
- Header dies, punches, sleeves, ejector pins

Each new reference unlocks a new archetype family.

## Cross-tool integration (next-iter opportunities)
- **JM xlsm template binding:** the `single-taptite.json` template (iter114) provides per-dim parameter names; the CLI provides per-axis scaling — wire them so an order row drives the CLI's `--target-peak-radius` + `--target-length`.
- **Multi-archetype dispatcher:** read a JM `_PART LIBRARY/INDEX.json`, route a dim spec to the right template.
- **Fusion / Mastercam handoff:** generated STEP → import to Mastercam X8 (running with valid license, see [[reference_cad_cam_seat_paths_2026_05_27]]) → emit NC program for sinker EDM.

## Anchor memories
- [[reference_jm_trilobe_example_step_analysis_2026_05_27]] — JM reference structural analysis (the source of truth for what topology to preserve)
- [[reference_jm_die_electrode_xlsm_format_2026_05_27]] — xlsm + decoded VBA
- [[reference_cad_cam_seat_paths_2026_05_27]] — Mastercam X8 + hyperCAD v31 paths
- [[reference_cad_domain_map_for_delta_2026_05_27]] — full CAD inventory
