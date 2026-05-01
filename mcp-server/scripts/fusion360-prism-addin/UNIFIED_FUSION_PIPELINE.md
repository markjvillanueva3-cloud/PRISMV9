# PRISM Unified Fusion Add-In

## What this add-in does (today, 2026-04-28)

A **single** Fusion 360 add-in (`PRISM CAM Optimizer`) that bundles four
distinct user flows. All four talk to the same PRISM HTTP server at
`http://localhost:3100`. The whole add-in folder is a Windows directory
junction back to `H:\PRISM\mcp-server\scripts\fusion360-prism-addin\`,
so any change you make on H: takes effect on every PC that runs
`install.py --link`.

| Flow                       | Where in Fusion                  | Backend route / engine                                   |
|----------------------------|----------------------------------|----------------------------------------------------------|
| **Optimize All (CAM panel)** | `Manufacturing → PRISM panel`    | `prism_cam:smart_tool_select`, `cam_strategy_recommend`, `auto_speed_feed_*`, `pp_run_full` |
| **Generate Program**       | `PRISM panel → Generate Program` | `prism_cam:cam_unified_generate`, `pp_run_full`          |
| **Print → Program (full pipeline)** | `PRISM panel → Run Full Pipeline` | `prism_cam:auto_print_to_program` (`AutoPrintToProgramBridgeEngine`) |
| **Excel Bridge (CAD-from-Excel)** | File watcher: `C:\PRISM\fusion-bridge\part_request.json` | `excel_bridge.builder.build_part` (in-process, runs on Fusion UI thread) |
| **PRISM.cps (post processor)** | Fusion's CAM post-processor selector — point at `PRISM.cps` in the deployed folder | server-side reload of post via `prism_cam:cam_post_invoke_*` |

The add-in ships with **one** manifest (`PRISM_CAM_Optimizer.manifest`),
**one** entry point (`PRISM_CAM_Optimizer.py`), and one panel
(`panel.html`). Older standalone add-ins (`PRISM-ExcelBridge`,
`PRISMBridge`) are auto-disabled by `install.py` so Fusion only lists
the unified one.

## Print → Program pipeline

The handler chains up to four backend stages, controlled by panel toggles:

```
[file]
   │
   ├─► (optional) Stage 1 — AI orchestration
   │         prism_ai:ai_milling_agi
   │         prism_ai:ai_milling_deep_reason   (chained inside agi)
   │         prism_ai:ai_milling_synthesize    (chained inside agi)
   │         result: ai_plan{strategy, sequencing hints, tool bias}
   │         feeds forward as params.ai_plan
   │
   ├─► Stage 2 — Main pipeline (always)
   │         prism_cam:auto_print_to_program
   │         AutoPrintToProgramBridgeEngine:
   │           format detection (STEP/IGES/DXF/native)
   │           process detection (milling/turning/multi-axis/mill-turn/wedm)
   │           feature recognition  (prism_cad:cad_feature_recognize)
   │           strategy selection   (cam_strategy_recommend)
   │           toolpath generation  (toolpath_generate)
   │           adaptive posting     (pp_run_full + auto_speed_feed_batch)
   │
   ├─► (optional) Stage 3 — Simulation / verification
   │         user picks ONE of:
   │           PRISM predictive  → prism_cam:cnc_simulate_predictive
   │           Digital twin      → prism_ai:ai_milling_twin_simulate
   │           Vericut bridge    → prism_cam:vericut_export
   │                              (then prism_cam:vericut_import_collision
   │                               ingests Vericut's report — uses your
   │                               hyperMILL seat's Vericut attachment)
   │           Fusion built-in   → manual; add-in does not call (Fusion
   │                              picks up the imported toolpath)
   │
   └─► (optional) Stage 4 — Final collision check
             prism_cam:collision_check_full
```

Per-block adaptive feed is computed inside `pp_run_full` by the
`PostProcessorPipeline` calling `SpeedFeedOrchestratorEngine` and
`AutoSpeedFeedEngine` on each motion block (it inspects engagement,
chip-thinning, deflection, and chatter risk to choose between the
relevant algorithm — Kienzle force vs effective-feed-per-tooth vs
chip-thinning-corrected).

Result shape returned to the panel:

```json
{
  "success": true,
  "detected_format": "step",
  "detected_process": "milling",
  "pipeline_used": "auto_print_to_program",
  "stages_completed": ["...", "..."],
  "features_detected": 7,
  "gcode_lines": 12483,
  "cycle_time_min": 47.3,
  "safety_score": 0.84,
  "ai_plan": {...},
  "sim_engine": "vericut",
  "sim_result": {...},
  "collision_check": {"collisions_found": 0},
  "warnings": [...]
}
```

### Input limits

- Max upload: **25 MB** raw (panel.html guards against runaway
  base64 → JSON in Fusion's Chromium).
- Currently **text-only formats**: STEP (.step/.stp), IGES (.igs/.iges),
  DXF, JSON, plain text. The handler explicitly rejects PDF/PNG/JPG/STL
  with an actionable error — `AutoPrintToProgramBridgeEngine` has no
  binary input branch yet (TODO: add a base64 branch on the engine).

### AI engine inventory wired today

| Stage usage | Action | Engine |
|-------------|--------|--------|
| Orchestration | `prism_ai:ai_milling_agi` | `MillingAGIMasterEngine` |
| Deep reasoning | `prism_ai:ai_milling_deep_reason` | `MillingDeepReasoningEngine` |
| Synthesis | `prism_ai:ai_milling_synthesize` | `MillingSynthesisEngine` |
| Twin simulation | `prism_ai:ai_milling_twin_simulate` | `MillingDigitalTwinEngine` |
| Scientific analysis | `prism_ai:ai_mill_scientific_analyze` | `ScientificAnalysisEngine` |
| Pattern mining | `prism_ai:pattern_query` | `PatternMiningEngine` |
| Predictive sim | `prism_cam:cnc_simulate_predictive` | `CNCPredictiveSimulatorEngine` |
| Vericut bridge | `prism_cam:vericut_export` + `vericut_import_collision` | `VericutBridgeEngine` |
| Collision | `prism_cam:collision_check_full` | `CollisionPreventionEngine` |

## Excel Bridge (CAD-from-Excel)

Folded into the unified add-in as the `excel_bridge` sub-package
(`excel_bridge/__init__.py`, `builder.py`, `watcher.py`). Lifecycle:

- `prism_addin.run()` calls `excel_bridge.start_watcher(_app, _ui)`.
- A daemon thread polls `C:\PRISM\fusion-bridge\part_request.json`
  every 1 s and fires Fusion custom event `prism_build` with the JSON.
- A `CustomEventHandler` runs on Fusion's UI thread and calls
  `build_part()` → builds cylinder / tube / stepped_cylinder / box /
  revolution per the JSON.
- `prism_addin.stop()` calls `excel_bridge.stop_watcher()`.

Excel macros sit in `excel_bridge/vba/`:
`ExcelVBA_Code.bas`, `JMDie_FusionBridge.bas`, `JMDie_Universal_Module.bas`.
Import them into the user's `.xlsm` workbook and wire to the existing
"build part" button — they replace the legacy SolidWorks integration.

## Multi-PC discipline

- **Source of truth:** `H:\PRISM\mcp-server\scripts\fusion360-prism-addin\`.
- **One-time per PC:** `python H:\PRISM\mcp-server\scripts\fusion360-prism-addin\install.py --link`.
- That command:
  1. Disables sibling legacy add-ins (`PRISM-ExcelBridge`, `PRISMBridge`,
     stale `.bak-*` folders) by renaming them with `.disabled`.
  2. Creates a Windows directory junction
     `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\PRISM_CAM_Optimizer`
     → the H: source folder.
- Edits to ANYTHING under `fusion360-prism-addin/` (panel.html,
  prism_addin.py, PRISM.cps, excel_bridge/...) are picked up by Fusion
  on the next restart, on every PC. No copy-paste sync.

## Cross-CAM bridge — current state

PRISM has the **engine-level** scaffolding for hyperMILL, Mastercam,
Inventor HSM, and HyperCAD interop already:

| CAM            | Bridge engine                              | Function index engine                  | Status                  |
|----------------|--------------------------------------------|----------------------------------------|-------------------------|
| Fusion 360     | `AutoPrintToProgramBridgeEngine` + this add-in | `Fusion360FunctionIndexEngine`        | Live (this document)    |
| Mastercam      | `MastercamBridgeEngine`, `MastercamCAMOrchestrator` | `MastercamFunctionIndexEngine`       | Server-side; **no in-Mastercam add-in yet** |
| hyperMILL      | `HypermillBridgeEngine` + `cam_hypermill_*` actions | `HypermillExtendedFunctionIndexEngine` | Server-side; **no in-hyperMILL add-in yet** |
| Inventor HSM   | `InventorHSMBridgeEngine`                  | `InventorHSMFunctionIndexEngine`       | Server-side; **no in-Inventor add-in yet** |

What "server-side" means: PRISM can already
- accept a job description and emit Mastercam-style chains, hyperMILL
  job lists, or Inventor HSM operations,
- translate strategies between CAM systems via
  `prism_cam:cam_cross_translate` and the `ontology_translate` family,
- generate post-processor output for any of them
  (`prism_cam:cam_post_invoke_from_inventory`).

What's missing for true parity with this Fusion add-in:
- A **Mastercam C-Hook / .NET add-in** that talks to `localhost:3100/api/cam`.
- A **hyperMILL .NET add-in** (in-process, attaches to hyperCAD-S and
  hyperMILL Project Manager).
- An **Inventor add-in** (`Inventor.Application` add-on) that uses the
  same panel HTML.

Each of those is a separate engineering effort with its own host SDK
(Mastercam C-Hook in C++, hyperMILL .NET in C#, Inventor .NET in C#).
The PRISM HTTP server they all talk to is **identical** — only the
in-CAM shell changes. We can iterate one CAM at a time and they all
share the same backend pipeline this Fusion add-in uses today.

## Bridging in the other direction (Fusion ↔ other CAMs)

For toolpaths/strategies built in hyperMILL or Mastercam to **show up
inside Fusion**, two paths:

1. **Translate** — `prism_cam:cam_cross_translate` takes an operation
   in one CAM's vocabulary and emits it in another's. Fusion can then
   consume the translated result via the same `auto_print_to_program`
   pipeline.
2. **Replay G-code** — post the source toolpath through PRISM, import
   the resulting NC into Fusion's Manufacturing as an external program
   (Fusion supports referencing an external NC file in a setup).

The reverse (Fusion → hyperMILL / Mastercam / Inventor) needs a tiny
translator add-in on the **destination** CAM that calls the same PRISM
endpoints. None of those exist yet on disk
(`H:\PRISM\mcp-server\scripts\` only contains `fusion360-*` directories).

## Files

```
fusion360-prism-addin/
├── PRISM_CAM_Optimizer.py        # entry shim (Fusion calls this)
├── PRISM_CAM_Optimizer.manifest  # Fusion add-in metadata
├── prism_addin.py                # main implementation
├── prism_api_client.py           # HTTP client → localhost:3100
├── prism_bridge.py
├── prism_operation_writer.py
├── tool_library_sync.py
├── auto_cam.py
├── panel.html                    # the sidebar UI
├── PRISM.cps                     # post processor (point Fusion at this)
├── install.py                    # --link (junction) or copy install
├── excel_bridge/
│   ├── __init__.py               # public API: start_watcher, stop_watcher
│   ├── builder.py                # CAD primitives (cylinder, tube, ...)
│   ├── watcher.py                # file-watcher daemon
│   ├── sample_parts.json
│   ├── EXCEL_BRIDGE_NOTES.txt    # original README
│   └── vba/
│       ├── ExcelVBA_Code.bas
│       ├── JMDie_FusionBridge.bas
│       └── JMDie_Universal_Module.bas
├── FUSION_INTEGRATION_GUIDE.md   # higher-level user guide
└── UNIFIED_FUSION_PIPELINE.md    # this file
```
