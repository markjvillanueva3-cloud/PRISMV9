---
name: reference-solidworks-local-install-2026-05-27
description: SolidWorks IS installed locally on this machine at H:/PRISM/resources/SOLIDWORKS/. Operator confirmed 2026-05-27. This unlocks the path-2 option (decompiled VBA macro → port to JS → drive live SW seat) and the SolidWorks COM bridge for parametric CAD generation. Plus relevant Inventor + Mastercam.
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:10.955Z
aliases: reference_solidworks_local_install_2026_05_27
---


# Local CAD seats available on THIS workstation (2026-05-27)

## SolidWorks ✅ INSTALLED
- **Path:** `H:/PRISM/resources/SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS/`
- **Executable:** `sldworks.exe` (2.3 MB launcher)
- **Plugin tree present:** DFMXpress, DriveWorksXpress, FloXpress, Toolbox, Simulation, swScheduler, Treehouse, sldBenchmarking, sld3DViaUploader, fworks, circuitworks
- **API hooks:** `api/` subdirectory present (means SDK + COM type library available)
- **Confirmed by operator:** 2026-05-27 — replaces the prior assumption that we'd need a remote SolidWorks seat

## What this unlocks for delta

### Path 2 (DECOMPILED MACRO + LIVE SW DRIVE) — now feasible
The JM Die xlsm macro's actual workflow:
```
1. CreateObject("sldworks.application")        ' COM bind to running/launching SW
2. swApp.OpenDoc(masterSLDPRT_path, 1)         ' open master SLDPRT
3. For each dim row:
     Part.Parameter(name).SystemValue = val   ' drive parametric variables
4. Part.EditRebuild                            ' SW regenerates the model
5. Save as STEP / IPT / IGES                   ' SW exports the result
```

PRISM can drive this directly via:
- Node ↔ COM bridge: `winax` npm package can do COM out-of-process automation
- Python ↔ COM bridge: `pywin32` (`win32com.client.Dispatch("sldworks.application")`) — already in our python env
- Direct CLI: `sldworks.exe /noregex /macro=<script.swp>` to run a SolidWorks macro file at startup

### Engine map already in PRISM
- `mcp-server/src/engines/SolidWorksAPIBridgeEngine.ts` — designed for this exact handshake
- `mcp-server/src/engines/SolidWorksCADExecutionBridge.ts` — execution layer
- `prism_cad` dispatcher has `solidworks_live_execute`/`solidworks_live_validate` actions

### What's still needed (for next iter)
1. **Master SLDPRT files** — JM Die's xlsm references `C:\Users\Milling\Documents\Automated EXCEL\Master Files\*.SLDPRT` which probably isn't at that exact path on this machine. Need to locate or recreate.
2. **License check** — installation present ≠ valid license. First-launch test will reveal.
3. **VBA → JS port** — translate the decompiled Sheet9.cls Build event into a node winax/pywin32 driver.

## Inventor 🔍 (operator mentioned H drive availability)
- **Status:** confirmed by operator but path not yet captured — search `H:/PRISM/resources/INVENTOR/` next iter
- **Engine ready:** `InventorCADCodeGeneratorEngine.ts` (78.8K) is the largest CAD-side engine — explicitly built for Inventor COM driving
- **API:** Inventor exposes `Inventor.Application` COM object

## Mastercam (referenced by xlsm)
- **Path embedded in JM xlsm macro:** `C:\Program Files\McamforSWX9\MastercamWorksX9.dll`
- **Status on H:** unverified — check `H:/PRISM/resources/MASTERCAM/`
- **Engine:** `MastercamCADExecutionBridge.ts` exists for in-SolidWorks Mastercam

## Practical action plan (iter120+)

### Phase 1 — sanity check
- Launch `sldworks.exe` once, confirm it opens + has a valid license
- Test: `python -c "import win32com.client; sw=win32com.client.Dispatch('sldworks.application'); print(sw.RevisionNumber)"` from a PowerShell window

### Phase 2 — minimal macro port
- Take Sheet9.cls.bas Build event (~50 useful lines, decompiled at `H:/prism/state/shared/jm-electrode-extracted/Sheet9.cls.bas`)
- Port to `scripts/drive-solidworks-trilobe.mjs` (or `.py` if winax doesn't compile)
- Test with the trilobe parameters from single-taptite.json template

### Phase 3 — emit STEP from live SW
- After regen: `Part.Extension.SaveAs(outPath, 0, swSaveAsOptions_Silent, swSaveAsVersion_Current, ...)`
- SolidWorks-emitted STEP files have proper CYLINDRICAL_SURFACE / TOROIDAL_SURFACE / CONICAL_SURFACE entities — fixes the "too many straight lines" complaint operator-side

### Phase 4 — closed-loop template
- Wire `prism_cad:generate_assembly` to call the SolidWorks driver
- Captures dim row + STEP output ↔ closes the learning loop from JM xlsm format adoption

## Anchors
- [[reference_jm_die_electrode_xlsm_format_2026_05_27]] — the xlsm format with VBA decoded
- [[reference_cad_domain_map_for_delta_2026_05_27]] — full CAD engine inventory
- [[reference_cad_piece3_fleet_complete_2026_05_27]] — current STEP emit state
