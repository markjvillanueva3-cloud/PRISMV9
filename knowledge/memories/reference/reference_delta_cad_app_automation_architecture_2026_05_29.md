---
name: reference-delta-cad-app-automation-architecture-2026-05-29
description: "CAD/CAM app-driving architecture discovery (delta, MS-CAM-MASTERY). How PRISM drives Fusion/hyperCAD/Mastercam/Esprit. THREE transport models: Fusion=LIVE HTTP bridge (PRISMBridge.py add-in :18361, 40+ endpoints incl raw /execute + full CAM); hyperCAD/Mastercam=EMIT (code-gen .ckm macro / .cs NETHook, operator runs); Esprit=action-template only (no key). 43 *FunctionIndexEngine.ts built (39 wired), 170-fn 4cam-function-catalog.json, 139 action entries/app template. The 'every button' knowledge layer is substantially BUILT — gap is the live-execution loop for hyperCAD/Mastercam + 4 unwired function-index engines."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:09.077Z
aliases: reference_delta_cad_app_automation_architecture_2026_05_29
---


# CAD/CAM app-automation architecture — how PRISM "drives" the CAD apps (2026-05-29 discovery)

Operator goal: drive Fusion/hyperCAD/Mastercam/Esprit to fullest potential (every button/function/menu/setting/param). Milestone = **`MS-CAM-MASTERY`** (34 units, status drift `not_started` but dozens of engines built; 5 pillars/system: A=how-to-CAD click-level via *FunctionIndexEngine, B=how-to-CAM every strategy+dialog, C/D/E truncated; Fusion-first, P0-FUSION tier-0). Envelope file `milestones/MS-CAM-MASTERY.json` NOT in delta worktree (1697 behind).

## THREE transport models (the load-bearing distinction)
1. **Fusion 360 = LIVE bidirectional HTTP bridge** — `scripts/fusion-addins/PRISMBridge.py` (3397 lines, has `__pycache__`=run) is a Fusion add-in HTTP server on **localhost:18361** (moved off :18360 to avoid PRISM_API_Server collision, 2026-05-27). Thread-safe via CustomEvent main-thread dispatch. Endpoints: /execute (RAW Python API = every button), /sketch /extrude /revolve /fillet /chamfer /hole /pattern /combine /shell /export /undo /new /parameter /tool-import /tool-library /cam/setups /cam/setup/{stock,bodies} /status /geometry /health. Engines: `Fusion360LiveBridgeEngine` `Fusion360AutomationBridge` `Fusion360InHostRunnerEngine` `Fusion360CodeGeneratorEngine` (all WIRED into camDispatcher). Older sibling: `mcp-server/scripts/fusion360-addin/fusion360_api_server.py` (2613 lines, :18360 read-only extractor). **PROOF path:** start Fusion → load PRISMBridge add-in (Utilities→Add-Ins) → `curl localhost:18361/health`. (Probed 2026-05-29: empty = Fusion not running this instant; infra real.)
2. **hyperCAD-S = EMIT (code-gen, open-loop)** — `scripts/cad-live-regen-hypercad.mjs` reads `cad-regen-output/<slug>/<slug>.geom.json` + `hypercad-s.actions.json`, emits a **`.ckm`** HyperCAD macro (OPEN MIND Macro API: `Line2D.New`, `Arc2D.NewByThreePoints`…). Pure emitter `scripts/lib/cad-live-regen-emit.mjs` (38 tests). **Live execution is OUTSIDE the script** — operator runs the .ckm in HyperCAD, stamps `liveSuccess:true` in `cad-training-ledger.jsonl`. v31 RUNNING on PC (NOT v33).
3. **Mastercam = EMIT** — `scripts/cad-live-regen-mastercam.mjs` emits a **`.cs`** NETHook source (X8 RUNNING). Same emit→operator-runs loop.
4. **Esprit = action-template only** (`esprit.actions.json` 16KB) — NO license key on PC; can build, can't prove.

## "Every button" knowledge layer — substantially BUILT
- **43 `*FunctionIndexEngine.ts`** (Alphacam, BobCADCAM, CAMWorks, CATIA, Cimatron, Creo, Edgecam, Esprit, FeatureCAM, **Fusion360CAD, Fusion360, HyperCADCAD, HyperMill, MastercamCAD, Mastercam**, NXCAM*, PowerMill*, SolidCAM*, SolidWorksCAD, SprutCAM, Tebis, TopSolidCAM, VISI, Vericut, WorkNC…). **39 wired**, 4 unwired.
- **`state/shared/cad-action-templates/4cam-function-catalog.json`** — 170 curated fns across hyperCAD-S/hyperMILL/Mastercam/ESPRIT w/ real SDK macro-API names. Emitter: `scripts/cad-4cam-function-catalog.mjs` (operator-extensible).
- **14 `<app>.actions.json`** templates, 139 action entries each (fusion360/hypercad-s/mastercam/esprit + catia/nx/inventor/solidworks/openscad/powermill/hypermill).
- Fusion API inventory extracts: `knowledge/wiki/architecture/extracts/fusion360-complete-api-inventory.md`; params at `cad-params/fusion360/` (30 ops/286 params).

## Real gaps (build queue)
- **`HyperCADCADFunctionIndexEngine` UNWIRED** (0 dispatchers) + 3 other unwired *FunctionIndexEngines → wire into prism_cad/prism_cam.
- **Live-execution loop OPEN for hyperCAD + Mastercam** — currently emit-only. To truly "drive": COM runner (hyperCAD-S has .NET/COM automation `Application.RunMacro`) + Mastercam NETHook auto-load/COM. Needs apps running + iterative verification (multi-session, operator-in-loop).
- Esprit: needs license key before any live proof.

See [[reference_delta_cad_galaxy_synergy_audit_2026_05_28]] · [[cad-knowledge-index]] · CLAUDE.md §MS-CAM-MASTERY (this branch = cad-fusion-live-ms0).
