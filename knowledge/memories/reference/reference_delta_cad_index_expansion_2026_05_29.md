---
name: reference-delta-cad-index-expansion-2026-05-29
description: "MS-CAM-MASTERY Pillar A/C progress (delta). The 34-unit milestone (drive Fusion/hyperCAD/Mastercam to every button) was never finished — envelope says 0/34. Shipped: U-CAMM-FUNCINDEX-CI (coverage audit + anti-regression CI gate) + U-CAMM-FUS-A (Fusion index +58 commands from UI_INVENTORY: Form/Plastic/Mesh). Authoritative Fusion UI = 1510 inputs; the CAD function-index now covers ~163 Solid+Form+Plastic+Mesh ops. KEY PATTERN: UI inventory is command-level (name+desc+panel), NOT params — added ops marked params_pending (ops↑/params-flat is the honest signal, never fake param counts)."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.541Z
aliases: reference_delta_cad_index_expansion_2026_05_29
---


# CAD function-index expansion toward "every button" (MS-CAM-MASTERY, 2026-05-29)

Operator: "drive Fusion/hyperCAD/Mastercam to fullest potential — every button/function/menu/param. I don't think we ever finished." Correct — milestone **MS-CAM-MASTERY** (34 units = 5 pillars × 6 systems + 2 shared; A=how-to-CAD function-index, B=how-to-CAM, C=completeness-audit+LoRA, D=3-button bridge add-in, E=orchestration) is `not_started` in the envelope with heavy drift (lots built). Operator chose track: **expand the indexes**.

## Authoritative gap (Fusion)
`FUSION360_COMPLETE_UI_INVENTORY.json` (main: `mcp-server/data/extracted-knowledge/fusion360/`, restored to worktree) = `total_inputs: 1510` across 6 workspaces. Design tabs: Solid 96, Surface 14, Sheet_Metal 10, Mesh 19, Plastic 6, Utilities 5, sketch 65, form 38. Manufacture 112 = CAM (kilo's Pillar B). The CAD function-index pre-expansion = ~the Solid tab (102 ops, param-rich via `cad-params/fusion360/` 102 cmd dirs with type/unit/range/default).

## Shipped
- **`U-CAMM-FUNCINDEX-CI`** (commit fd88595f1f) — `scripts/cad-function-index-coverage.mjs` (+lib +12 tests): measures CAD-index coverage (modules/ops/params, counted EXACTLY as `*FunctionIndexEngine.countOperationParams`), `--ci` anti-regression gate vs `state/shared/cad-function-index-coverage-baseline.json`. Baseline: fusion 8/105/950, hypercad 8/160/1001, inventor 8/150/983, mastercam 8/120/815.
- **`U-CAMM-FUS-A`** (commits 30a0fcd976 + f7e5fd379e) — `scripts/cad-fusion-index-expand.mjs` (+12 tests): ingests UI_INVENTORY Form/Plastic/Mesh/Sketch tabs → +102 command-level ops total → fusion **8mod/105ops → 10mod/207ops/950params**. New modules `form_operations` (38 T-spline), `plastic_operations` (6); mesh +14; **sketch 22→66 (+44: command variants + 13 individual geometric Constraint buttons + Text/Pattern/Fillet/Chamfer)** — the generic param-rich ops + command-level button variants coexist (dual-layer: parametric dialog + toolbar flyout, both real). Generator self-maintains coverage_summary + platform_integration + metadata.operationCount (no drift). Collision-guarded + idempotent. **Fusion Design CAD command-coverage now substantially COMPLETE** (Solid+Sketch+Form+Plastic+Mesh = the full modeling workspace).
- Earlier same session: **cad_function_index** dispatcher wiring (3c6a2e77 — the 4 CAD-side `*FunctionIndexEngine` were orphaned).

## Load-bearing R12 pattern (reuse for every platform)
UI/SDK inventories give COMMAND names, not dialog params. Added ops MUST be marked `params_pending:true, parameterCount:0, tabs:{}` so the coverage audit shows **operations↑ / params-flat** — command coverage grows honestly; param-depth enrichment (the cad-params-style work) is a separate, source-gated (MS-RES-CADCAM-DOCS) follow-up. NEVER fabricate params to inflate the count.

## NEXT (iter4+)
- Param-enrich the 58 command-level Fusion ops (needs Form/Plastic/Mesh dialog-param source — not in cad-params yet).
- Reconcile Fusion Sketch tab (~40 crude-new, but high naming-collision with existing sketch ops — needs careful name-mapping).
- hyperCAD/Mastercam: source = `state/shared/cad-action-templates/4cam-function-catalog.json` (170 fns, SDK macro-API names). Their indexes are already richer (160/120 ops) — check 4cam-vs-index overlap before expanding.
- Live-drive loop (Pillar D/E) for hyperCAD/Mastercam = COM/NETHook runner (needs apps running + operator verify) — see [[reference_delta_cad_app_automation_architecture_2026_05_29]].
