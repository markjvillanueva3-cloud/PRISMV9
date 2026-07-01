---
name: reference_fusion_live_tool_libraries_2026_06_15
description: "FUSION-LIVE tool-library import (slot:romeo 2026-06-15): how PRISM drives the RUNNING Fusion 360 seat to add tool libraries, and the converter that put all 25 JM libraries (18,136 tools / 62,784 per-material x per-operation feed/speed presets) live in Fusion. The live mechanism + the exact .tools preset schema + the PRISMBridge :18361 surface. Sibling of [[reference_cam_library_placement_2026_06_15]]."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.582Z
aliases: reference_fusion_live_tool_libraries_2026_06_15
---


**FUSION-LIVE tool libraries** (slot:romeo, 2026-06-15). Operator: *"you should have full backend navigation of fusion, its launched right now add all the tool libraries for me."* Delivered: **25 PRISM_JM_* libraries live in the running Fusion seat, 18,136 distinct tools + 62,784 feed/speed presets**, live-confirmed via the bridge.

## The live Fusion bridge (how PRISM drives Fusion)
- **PRISMBridge runs INSIDE Fusion** as a Python add-in HTTP server. Deployed at `%APPDATA%\Autodesk\Autodesk Fusion 360\API\AddIns\{PRISMBridge,PRISMBridgeCAD,prism-api-server,PRISM_API_Server}\`.
- **Live ports (PID-shared):** `:18361` = PRISMBridge (CAM, **the working one** -- status `connected`, Fusion v2704.0.41), `:18362` = PRISMBridgeCAD, `:18365` = nav-by-ref (delta UI). **`:18360` = `prism_api_server.py` (the documented full bridge w/ 17 routes) was DOWN** -- it has `runOnStartup:false`, so it only runs if the operator activates it in Tools->Scripts and Add-Ins. Don't assume 18360; probe 18361 first. `Fusion360LiveBridgeEngine.ts` targets 18360 (stale).
- **Routes (PRISMBridge :18361):** `GET /health /status /tool-library /tool-library/search /cam/*`; `POST /tool-import /execute /sketch /extrude ...`. Source: the deployed `PRISMBridge.py` (~3397 lines).
- **`POST /tool-import`** takes `{tools:[...<=1000], library_name}` -> adds to Fusion Local lib via `adsk.cam`; **capped at 1000 tools/req** AND its file_fallback re-reads+dedups the whole file each call (**O(n^2)** -- useless for 100k). Do NOT batch-import the full corpus through it.
- **`POST /execute`** runs raw Python in Fusion, returns `local_ns["result"]`. **Sandboxed:** NO `import`/`__import__`/`open`/`eval`/`exec`/`subprocess`/`shutil` (AST + builtins blocked). BUT `adsk` (with `adsk.cam` already loaded at module level), `app`, `math`, `json` are pre-injected -- so use `adsk.cam.CAMManager.get()...` directly, no import line.
- **Fusion-2704 API quirks (cost me 4 read-back attempts):** `ToolLibraries` has NO `toolLibraryUrls`; `childAssetURLs(url)` returns a `URLVector` (iterate `for u in childUrls`, NO `.count`); `URL` has NO `.clone()`. The bridge's own `_import_tools` adsk-path uses these stale names -> it usually falls to file_fallback. A live per-preset read-back was NOT completed (API navigation), but is not needed (see verification).

## The mechanism that WORKS: file-drop into the discovered Local dir
- Fusion auto-discovers `.tools` (JSON) files in **`%APPDATA%\Autodesk\Autodesk Fusion 360\CAM\Libraries\Local\`** (`_get_tool_library_dir()`). Drop a `.tools` there -> it appears under "Local" in the Tool Library (bridge `GET /tool-library` reads this folder fresh; Fusion UI rescans on dialog open). **NOT** `...\Fusion 360 CAM\...` (my first wrong attempt -- Fusion never saw those).
- `adsk.cam.ToolLibraries.importToolLibrary(url, ToolLibrary, name)` imports a ToolLibrary **OBJECT**, not a file -- there is **no headless CSV-file import** (CSV import is UI-only). So: **convert CSV -> .tools, file-drop.**

## The converter (committed)
`scripts/jm-csv-to-fusion-tools.py` (commits `c51468b944` v1 geometry-only, `bc78f3b609` v2 +presets). Converts each `state/shared/jm-fusion-tools/by-machine/<M>/FUSION-IMPORT.csv` -> `PRISM_JM_<M>.tools` in Local. **Key structural fact:** the CSV is **1 row per (tool x material x operation)** -- e.g. the 1/2" bull-nose end mill has **352 rows** (1018 Steel (P) Rough/HEM/Trochoidal/Slot/Ramp/Semi/Finish/HSM x each ISO group). v2 **groups rows by tool** and emits ONE tool with a `presets[]` array = the full all-conditions matrix (tasks #15-21). Run: `python scripts/jm-csv-to-fusion-tools.py ALL`.

## Exact local .tools preset schema (verbatim from JM's own Fusion lib `us-jmdie.json`)
```
"start-values":{"presets":[{ "name":"1018 Steel (P) Rough","description":"",
  "n":3509,"n_ramp":3509, "v_c":459, "f_z":0.0052, "f_n":fz*flutes, "v_f":110.24,
  "v_f_leadIn/leadOut/transition":v_f, "v_f_plunge":100, "v_f_ramp":plunge,
  "tool-coolant":"flood","ramp-angle":2,"use-stepdown":false,"use-stepover":false,
  "material":{"category":"all","query":"","use-hardness":false},
  "expressions":{"tool_coolant":"'flood'","tool_feedPerTooth":"0.0052 in","tool_surfaceSpeed":"459.0 fpm"},
  "guid":"<md5-derived>" }]}
```
CSV->preset map: tool_spindleSpeed->n, tool_surfaceSpeed->v_c (fpm), tool_feedPerTooth->f_z (in), tool_feedCutting->v_f (in/min), tool_feedPlunge->v_f_plunge, tool_feedCuttingRel->f_n, tool_coolant->tool-coolant, tool_presetMaterialCategory->material.category. **UNITS-FIRST: JM CSVs are INCHES -- unit copied verbatim, NO scaling (25.4x trap).**

## Result (live-verified via bridge GET /tool-library)
**25 PRISM_JM libraries, 18,136 distinct tools, 62,784 presets:** `PRISM_JM_Milling` (15,994), + 24 per-machine -- mills (VMC-01..05, haas-om-2, haas-vf-2, hurco-vmx30i, okuma-mb-56va, roku-roku-rmx5) = 54 tools each; lathes (LTH-01..06, okuma-crown/genos-l200/l300/l400/lb3000/lnc8) = 107; big (LTH-07, okuma-multus-b250) = 159. 0 skipped.

**Verification (R12):** (a) bridge confirms all 25 discovered with correct tool counts; (b) generated files structurally correct (352 presets on the sample tool, exact JM schema, CSV-sourced values); (c) schema verbatim from JM's loaded `us-jmdie.json` => Fusion parses it. A live per-preset API read-back was blocked by Fusion-2704 API method/URL-navigation differences -- not a data problem.

**Full 118,409 corpus NOT placed live:** a single 195MB / 118k-tool `.tools` is impractical (bridge reported `0 tools` for the monolith; Fusion's browser would choke). Removed from Local; stays import-on-demand in the seat folder (`...\Fusion 360 CAM\PRISM_Tool_Libraries\`). Every JM machine tool IS live via the per-machine libs. Linked: [[reference_cam_library_placement_2026_06_15]], [[reference_cad_cam_seat_paths_2026_05_27]], [[feedback_ultimate_destination_check]].
