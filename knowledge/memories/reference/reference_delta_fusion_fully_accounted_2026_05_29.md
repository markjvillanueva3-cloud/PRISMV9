---
name: reference-delta-fusion-fully-accounted-2026-05-29
description: "Fusion 360 is FULLY ACCOUNTED (MS-CAM-MASTERY, delta). Every distinct extractable CAD command across ALL UI surfaces (Design tabs + sketch + form + Drawing + Inspect + context-menus + browser-tree + timeline) is indexed: 336 distinct − 41 explicit denylist = 295 accountable, ALL indexed → deficit 0/100%. Gate scripts/cad-fusion-ui-accounting.mjs v4.0.0 (--gate). fusion function-index 105→369 ops / 8→15 modules. Took THREE cuts: v1 module-presence overclaim (scrutiny caught), v2 mode-inflated summary denominator (wrong), v3/v4 distinct-command ⊆ indexed. Adversarial 5-dim workflow BLOCK→PASS. The accounting+gate PATTERN carries to hyperCAD/Mastercam once their UI inventories exist."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.548Z
aliases: reference_delta_fusion_fully_accounted_2026_05_29
---


# Fusion 360 FULLY ACCOUNTED (MS-CAM-MASTERY, 2026-05-29)

Operator directive: do NOT move to another CAD software until the current one is fully accounted + tested; prove on one → carries to the others. **Fusion is now there.**

## Final state (commit on slot/delta, U-CAMM-FUS-C)
- **fusion function-index: 8 modules/105 ops → 15 modules/369 ops** (the whole Design workspace by panel-routing + Drawing + Inspect + context/browser/timeline surfaces). New modules: construction_operations(20), insert_operations, history_operations(parametric timeline).
- **Accounting+coverage gate** `scripts/cad-fusion-ui-accounting.mjs v4.0.0` (`--gate`): **336 distinct CAD commands across ALL surfaces − 41 explicit denylist = 295 accountable, ALL indexed → deficit 0 / 100% / PASS.** Lib `scripts/lib/cad-fusion-ui-accounting.mjs`. 44/44 tests across 3 suites.
- Surface-presence guard `missingCadSurfaces()` fails the gate LOUD if a future inventory restructuring drops a command surface (no silent denominator shrink).

## THE PATTERN (carries to hyperCAD/Mastercam/every CAD app)
1. **UI inventory → index**: extract every command from every UI surface (toolbar tabs + sketch + form + drawing + inspect + **context-menus + browser-tree + timeline**), mark command-level ops `params_pending` (param-depth is a separate enrichment; never fabricate).
2. **Accounting gate**: deficit = distinct-extractable-commands ∖ indexed ∖ explicit-denylist. PASS iff deficit 0 + every category dispositioned + no surface dropped.
3. **Denylist is explicit + documented** (`EXCLUDED_CONTEXT_OP_IDS`): view-nav/clipboard/visibility/file/UI/settings + CAM-domain (kilo/echo). Surfaced as a gate caveat — accounted-by-indexing, never classified-away.
4. **Adversarially verify** before claiming done.

## R12 — THREE cuts (the lesson)
- **v1** overclaimed "fully accounted" on module-PRESENCE (a category had ≥1 module → "covered"). Scrutiny reviewer measured ~242-tool gap behind the green. → reworked to coverage.
- **v2** used the vendor `total_inputs_summary` COUNT as the denominator — but those are MODE-INFLATED (design says 285; distinct commands = 142). Wrong denominator.
- **v3/v4** measures DISTINCT extractable command op-ids ⊆ indexed. An adversarial 5-dimension workflow then caught a remaining false-green: the extractor only walked toolbars, never context_menus/browser_panel/timeline, where genuine model-mutating commands (GROUND/EDIT_FEATURE/SUPPRESS/REDEFINE_SKETCH_PLANE…) live ONLY. Fixed: walk all surfaces, index the 34 genuine, explicit-denylist the 41 non-CAD. BLOCK→PASS.
- **Lesson**: "accounted" must mean *indexed*, measured against the *complete* command surface, verified adversarially — not presence, not a vendor count, not a fixed-path walk. [[reference_delta_cad_accounting_denominator_2026_05_29]] · [[reference_delta_cad_index_expansion_2026_05_29]].

## NEXT (per directive — only now that Fusion passes)
hyperCAD-S + Mastercam: same pipeline, but SOURCE-GATED (MS-RES-CADCAM-DOCS) — need their UI command inventories harvested first (the 4cam-function-catalog is CAM-macro, not a CAD-dialog UI map). Then param-DEPTH enrichment for the command-level ops (Form/Plastic/Mesh/Sketch/context dialog params). Live-drive loop (Pillar D/E) = COM/NETHook runner, needs apps running + operator verify. See [[reference_delta_cad_app_automation_architecture_2026_05_29]].
