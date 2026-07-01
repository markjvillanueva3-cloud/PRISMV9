---
name: reference-hypermill-use-v31-not-v33-2026-05-27
description: "Always use hyperMILL/hyperCAD-S version 31.0, NOT 33.0. Operator's licensed and running version is v31 (key plugged in 2026-05-27). v33 trial expired. All path resolution, COM probes, AddIn deployment, and macro execution must target the 31.0 install tree."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.614Z
aliases: reference_hypermill_use_v31_not_v33_2026_05_27
---


# Open Mind hyperCAD-S / hyperMILL: USE v31, NEVER v33 (2026-05-27)

## The rule
Always reference **`H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/`** — never `33.0/`.

- **v31 = LICENSED + RUNNING** on this workstation. Operator confirmed 2026-05-27 with key dongle plugged in and hyperCAD-S window open.
- **v33 = TRIAL EXPIRED** (this user's trial ended). Files are on H: but won't execute productively.

## Why this matters
Earlier in this session I probed COM ProgIDs and AddIn paths against `33.0/` because both `31.0/` and `33.0/` directory trees exist side-by-side. That's incorrect — operator's actively licensed seat is v31.

Even if v33 looks newer or has additional features (e.g. `33.0/cycwin/FeedElectrodex64.exe` exists, v31 doesn't have that exact filename), **license validity beats feature inventory**. Without the license, none of v33's tools will produce real output.

## Canonical v31 paths
- Install root: `H:/PRISM/resources/HYPERMILL/hyperMILL/31.0/`
- Win64 binaries: `31.0/win64/` (omVISrcx64.exe)
- API runner: `31.0/cycwin/HCSApiRunx64.exe`
- DLL loader: `31.0/cycwin/startDll_x64.exe`
- AddIns: `31.0/AddIns/` (TDMtoolIDs, hmAutoColor, hmStartUp, hmTDMSystems, toolDBUpdate)
- AddIn dev: `31.0/addins project/hmAutoColor/`
- Process Studio: `31.0/processStudio/__ProcessStudio.hml`
- Config: `31.0/Inch.cfg/`, `31.0/Metric.cfg/`
- Macros: `31.0/macrotech/`
- Language: `31.0/Language/`

## Note on cycwin tools
v31's `cycwin/` has fewer tools than v33's (no FeedElectrodex64.exe in v31 from what I saw). If the operator needs the FeedElectrode-style workflow from v31, that may be implemented as a different tool, an AddIn, or a Process Studio template under v31. Don't reach into v33 to compensate — find the v31 equivalent.

## Memory anchors
- [[reference_solidworks_local_install_2026_05_27]] — local CAD seat availability
- [[reference_cad_domain_map_for_delta_2026_05_27]] — full CAD-domain inventory
- [[reference_jm_die_electrode_xlsm_format_2026_05_27]] — JM Die xlsm + VBA decoded
