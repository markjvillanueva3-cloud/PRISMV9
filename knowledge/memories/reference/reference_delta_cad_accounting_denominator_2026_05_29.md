---
name: reference-delta-cad-accounting-denominator-2026-05-29
description: "CRITICAL accounting-gate finding (delta, MS-CAM-MASTERY U-CAMM-FUS-C). The Fusion UI accounting gate (scripts/cad-fusion-ui-accounting.mjs) uses total_inputs_summary counts as the coverage denominator — but those are MODE-INFLATED. toolbar_tools_design says 285 but distinct extractable design commands = 142 (97 indexed → real deficit ~70, NOT 182). Before closing the deficit, fix the gate denominator to distinct-extractable-tools. The 70 missing design commands + a missing construction_operations module are the tractable remaining build to make Fusion fully accounted."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.537Z
aliases: reference_delta_cad_accounting_denominator_2026_05_29
---


# CAD accounting gate — denominator is mode-inflated; real Fusion deficit is ~tractable (2026-05-29)

Operator directive: don't move off a CAD software until it's FULLY accounted + tested; prove on one → carry to others. Built the Fusion UI accounting+coverage gate (`scripts/cad-fusion-ui-accounting.mjs`, commit `c60777dc65`) after scrutiny caught a "module-presence = fully accounted" overclaim. The coverage-aware gate honestly reports CAD-command coverage 235 indexed / 476 UI tools = 49%, deficit 242.

## The denominator finding (R12 — measured, do not trust the summary count)
`total_inputs_summary` counts are **mode/option-inflated**, NOT distinct commands:
- `toolbar_tools_design: 285` → but distinct extractable design commands (Solid 96 + Surface 14 + Sheet_Metal 10 + Mesh 19 + Plastic 6 + Utilities 5 = 150 raw, **142 distinct op-ids**). Indexed design-module ops = 97. **Real distinct deficit = 70** (not 182).
- Same inflation likely on drawing (52) + inspect (36 = 10 tools × sub-modes).
So the gate's summary-based deficit (242) OVERSTATES. The honest denominator = distinct extractable tools per category.

## The real, tractable remaining build (to make Fusion genuinely fully accounted)
1. **Fix the gate denominator**: measure coverage against distinct-extractable-tool count (what `extractTabTools` finds), not the summary count. Report both (summary for reference, distinct for the gate). Keeps the gate honest in the OTHER direction too (don't understate if the extractor misses tools — cross-check).
2. **Index the 70 missing distinct design commands** — concrete list includes: NEW_COMPONENT, CREATE_SKETCH, CREATE_FORM, BOX, CYLINDER, SPHERE, TORUS, COIL, PIPE (Solid create); OFFSET_FACE, REPLACE_FACE, SPLIT_FACE, SILHOUETTE_SPLIT, MOVE_COPY, ALIGN, DELETE, PHYSICAL_MATERIAL, APPEARANCE, MANAGE_MATERIALS, CHANGE_PARAMETERS (Modify); JOINT_ORIGIN, contact-sets (Assemble); **~25 Construct-panel commands** (OFFSET_PLANE, PLANE_AT_ANGLE, MIDPLANE, AXIS_*, POINT_* …).
3. **NEW module `construction_operations`** — the Construct panel (planes/axes/points) has NO module; biggest single chunk of the design deficit.
4. **Generator complication**: a Design *tab* spans multiple *panels* mapping to different modules (Solid → feature+modify+assembly+construction). The current generator maps one tabKey→one module. Closing the design deficit needs per-PANEL routing (extend the generator) OR a dedicated `construction_operations` + targeted feature/modify augments.
5. Drawing (drawing_operations 18, extract the distinct Drawing-tab tools) + Inspect (inspect_operations 10; decide whether to index Measure's 8 sub-modes as ops or keep 10 distinct + adjust denominator).

## Discipline note (R6)
Do NOT rush the denominator-rework + 70-command index into a near-full context — the original "fully accounted" overclaim came from exactly that rush. Tackle in a fresh session with budget. Per the operator directive, stay on Fusion until the (corrected-denominator) gate passes; only then carry the proven pattern to hyperCAD/Mastercam. See [[reference_delta_cad_index_expansion_2026_05_29]] · [[reference_delta_cad_app_automation_architecture_2026_05_29]].
