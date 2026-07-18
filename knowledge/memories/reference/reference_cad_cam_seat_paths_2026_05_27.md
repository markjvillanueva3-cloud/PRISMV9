---
name: reference-cad-cam-seat-paths-2026-05-27
description: "Canonical install paths for ALL licensed/running CAD + CAM seats on this workstation, confirmed by operator 2026-05-27. Mastercam X8 RUNNING with key. hyperCAD-S/hyperMILL v31 RUNNING with key. Fusion 360 + SolidWorks NOT installed. Inventor trial expired. For both delta (CAD specialist) and kilo (CAM specialist) slots."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.493Z
aliases: reference_cad_cam_seat_paths_2026_05_27
---


# CAD + CAM seat paths — workstation `DESKTOP-N7MI1VB` (2026-05-27)

## ✅ Mastercam X8 (LICENSED + RUNNING)
- **Executable:** `H:\PRISM\resources\MasterCam\MASTERCAM\mcamX8\compressed\Mastercam.exe`
- **Install root:** `H:\PRISM\resources\MasterCam\MASTERCAM\mcamX8\compressed\`
- **Subfolders:** `apps/`, `chooks/`, `common/`, `Extensions/`, `help/`, `Macros/`, `ManagedUI/`, `Probe Database/`, `resources/`
- **NetHook DLLs:** all the X8 core 5-axis DLLs in compressed/ (5axcore.dll 29 MB, 5axutil.dll 17 MB, 5axui.dll 2.9 MB)
- **WPF UI shell:** ActiproSoftware.* DLLs (Docking, Ribbon, PropertyGrid, DataGrid)
- **License files:** `C:\Program Files\Common Files\Mastercam\MastercamLicensing\` (MastercamDotComLinking.exe, MastercamLicenseBorrowUtility.exe)
- **User config:** `C:\Users\wompu\AppData\Roaming\Mastercam\`
- **Key status:** ✅ valid physical license key plugged in (operator confirmed 2026-05-27)
- **Currently running:** YES (operator confirmed)
- **Automation API:** NetHook 2 (.NET-based). Mastercam X8 does NOT expose top-level COM ProgIDs to external clients — automation is via NetHook .NET DLLs loaded INTO the running Mastercam process.
- **NetHook deployment path:** `H:\PRISM\resources\MasterCam\MASTERCAM\mcamX8\compressed\chooks\` (custom hooks)

### How to drive Mastercam X8 from PRISM
1. Write a .NET DLL (`Mastercam.X8.NetHook.dll`) using Mastercam's `NetHook2.dll` interop assembly
2. Deploy to `compressed/chooks/`
3. Add to NetHook menu in Mastercam, click to execute, or invoke via `RunNetHook` chook
4. The DLL has full access to Mastercam's PartFile, geometry, toolpath, post API
5. Use this to consume PRISM's `single-taptite.json` template → build geometry + toolpath natively

## ✅ hyperCAD-S / hyperMILL v31.0 (LICENSED + RUNNING)
- **Use v31 ONLY, never v33** — v33 trial expired (see [[reference_hypermill_use_v31_not_v33_2026_05_27]])
- **Install root:** `H:\PRISM\resources\HYPERMILL\hyperMILL\31.0\`
- **API runner:** `H:\PRISM\resources\HYPERMILL\hyperMILL\31.0\cycwin\HCSApiRunx64.exe` (265 KB)
- **API DLL:** `31.0\cycwin\HCSApix64.dll` (3 MB) — the actual API surface for external scripts
- **Add-In folder:** `31.0\AddIns\` (TDMtoolIDs, hmAutoColor, hmStartUp, hmTDMSystems, toolDBUpdate)
- **AddIn dev:** `31.0\addins project\hmAutoColor\` (example .NET AddIn source)
- **Process Studio:** `31.0\processStudio\__ProcessStudio.hml`
- **Inch config:** `31.0\Inch.cfg/`
- **Metric config:** `31.0\Metric.cfg/`
- **Macros:** `31.0\macrotech\`
- **VoluMill core:** `31.0\cycwin\VoluMillEngines.dll` (20 MB)
- **Key status:** ✅ valid dongle plugged in (operator confirmed 2026-05-27)
- **Currently running:** YES (operator confirmed)
- **Automation API:** Open Mind's `HCSApi` C++/COM via `HCSApix64.dll` + .NET AddIns deployable to `AddIns/`. Use `HCSApiRunx64.exe` to execute scripts against a running hyperCAD-S instance.

### How to drive hyperCAD-S/hyperMILL v31 from PRISM
1. Write a .NET AddIn (modeled on `addins project/hmAutoColor/`) referencing HCSApi types
2. Deploy DLL to `H:\PRISM\resources\HYPERMILL\hyperMILL\31.0\AddIns\<MyAddIn>\`
3. Restart hyperCAD-S; the AddIn auto-loads
4. Or batch-execute a script: `HCSApiRunx64.exe <script.cs>`
5. AddIn has full access to hyperCAD geometry API + hyperMILL toolpath API

## ❌ SolidWorks (NOT INSTALLED, only file-snapshot)
- **Snapshot path:** `H:\PRISM\resources\SOLIDWORKS\SOLIDWORKS Corp\SOLIDWORKS\sldworks.exe`
- **Issue:** files copied without proper installer — `side-by-side configuration is incorrect`; COM ProgID `SldWorks.Application` not registered
- **To fix:** operator needs to obtain installer from `customerportal.solidworks.com` (active SW license required)
- See [[reference_solidworks_local_install_2026_05_27]] for full plan

## ❌ Inventor (TRIAL EXPIRED)
- **Snapshot paths:** `H:\PRISM\resources\Inventor\`, `H:\PRISM\resources\Inventor 2027\`, plus a C: install
- **Issue:** COM ProgID `Inventor.Application` registered but `Server execution failed` (trial expired 2026-05-27 per operator)
- **To fix:** operator needs licensed Inventor seat (Autodesk Account Manager → manage.autodesk.com)

## ❌ Fusion 360 (NOT INSTALLED)
- **Snapshot path:** `H:\PRISM\resources\FUSION360\` — only CAM data/posts/tool-library, no executable
- **Process prefetch:** `C:\Windows\Prefetch\FUSION360.EXE-E49BECAC.pf` (was run at some point, no longer installed)
- **Free download:** `autodesk.com/products/fusion-360/personal`
- **Once installed:** Python add-in API at `~/AppData/Roaming/Autodesk/Autodesk Fusion 360/API/AddIns/`

## Other tools on H:
- HSMWorks 2026 / 2027 — `H:\PRISM\resources\HSMWorks 2026\setup.exe` (CAM add-in for SolidWorks; needs SW first)
- FreeCAD — `H:\PRISM\resources\Freecad\`
- DWG TrueView 2027 — `H:\PRISM\resources\DWG TrueView 2027 - English\` (viewer only)

## Slot ownership (per [[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0)
- **delta (CAD specialist):** owns geometry generation, STEP/IGES emit, BRep topology, GD&T, feature recognition
- **kilo (CAM specialist):** owns toolpath generation, post-processing, simulation, machining strategy

For ELECTRODE generation specifically (the EJOT P30247750 work this session):
- **delta:** owns the GEOMETRY (electrode body parametric model — emit valid AP242 STEP)
- **kilo:** owns the EDM-burn PROGRAM (orbit motion, gap voltage, electrode-down-feed schedule)

## Action plan for live integration (any of three paths — operator chooses)
1. **Mastercam X8 NetHook** — write .NET DLL, deploy to `compressed/chooks/`, drive geometry from PRISM template
2. **hyperCAD-S v31 AddIn** — write .NET AddIn, deploy to `31.0/AddIns/`, drive via HCSApi
3. **Fusion 360 Python add-in** — operator installs Fusion 360 (free), I write Python add-in for PRISM template

## Anchor memories
- [[reference_hypermill_use_v31_not_v33_2026_05_27]] — v31 vs v33 rule
- [[reference_solidworks_local_install_2026_05_27]] — SW install status
- [[reference_cad_domain_map_for_delta_2026_05_27]] — full CAD inventory
- [[reference_jm_die_electrode_xlsm_format_2026_05_27]] — JM xlsm + VBA decoded
- [[reference_cad_piece3_fleet_complete_2026_05_27]] — current STEP emit state
