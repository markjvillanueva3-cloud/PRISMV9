---
name: reference_cimco_settings_surface_win32_2026_06_10
description: CIMCO settings surface is a Win32
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.517Z
aliases: reference_cimco_settings_surface_win32_2026_06_10
---


CIMCO closed-loop / config-tailoring breakthrough (slot:echo, 2026-06-10, commit `39508c2774`).

**`--op list-windows` (PrismCimcoUI.exe):** CRASH-SAFE Win32-ONLY window/dialog recon — `EnumWindows`/`EnumChildWindows`/`GetClassName`/`GetWindowText`/`GetDlgCtrlID`, **never** touches MSAA (`AccessibleObjectFromWindow`/`AccessibleChildren`), so it CANNOT trigger the unmanaged provider AV that crashed the old `read-window` op (exit 255). `--pre <ctl> --allow-actions` fires a control (holds a modal open) then enumerates {windows:[{hwnd,class,title,children:[{class,title,cid}],childrenTruncated?}]}. **Output sink MUST stay gitignored** (dumps system-wide window titles). This SUPERSEDES the hardened-MSAA-read-window plan — that capability is no longer needed.

**Model correction (R12):** firing "Configure Machine Type" does NOT open a blind `.mcfg` file-picker. It opens the **GLOBAL CIMCO Setup property-sheet** — a standard `#32770` "Setup: File Types" (navigated by `SysTreeView32 "Tree1"` cid 14000; `OK`=1/`Cancel`=2/`Default`=13902/`Help`=13986). This ONE Win32-drivable dialog IS the operator's "go through every setting" surface; the `.mcfg` machine bind is a TREE PAGE within it. Drive via `BM_CLICK`/`CB_SETCURSEL`/`WM_SETTEXT`/`TVM_SELECTITEM` — all Win32, AV-safe. File Types page alone = ~70 settings with exact cids (Dark Mode 13938, Default sim window size 14494, Language 13951, Tab width 13977).

**Version (About `#32770`, live):** `CIMCO Edit: 26.01.10+f1578423ab`, active web license; sim add-on FUNCTIONAL (sim ran end-to-end on all 12 sim-able machines) + INSTALL-LICENSED. Per-module "Simulation" line pending one `License Details` (cid 1024) BM_CLICK.

**`--op setup-pages` SHIPPED + validated (commit `2322f566b3`):** walks the Setup tree by HTREEITEM handle (`TVM_GETNEXTITEM`/`TVM_SELECTITEM` via `SendMessage` — NO cross-process `ReadProcessMemory`/TVITEM read needed), enumerates all **23 pages** + each page's visible controls (`AllChildHwnds`). Foreground-preferred `#32770` bind + `pagesTruncated`/`controlsTruncated` flags. KEY pages: **page 10 "Backplot Setup" = machine/sim config** (Control Type cid 14641, Machine setup combo, Turning configuration list cid 14582 + `+`/`-` 14043/14052) — a config SELECTOR, NOT a blind .mcfg file-pick (model correction); **page 22 "Select plugins" = add-on toggles**, `Disable advanced simulation` = **cid 14016** (unchecked ⇒ sim add-on ACTIVE = Task #3 definitive control).

**`--op read-setting --name <hint>` SHIPPED (commit `cf832d0607`):** opens Setup, navigates to the UNIQUE page matching the hint (FAIL-CLOSED on >1 match), reads each control + checkbox state via `BM_GETCHECK` (read-only — no write/persist; `IsCheckboxButton` via GWL_STYLE BS_TYPEMASK). **TASK #3 CLOSED:** `--name "advanced simulation"` → `Disable advanced simulation` cid 14016 = UNCHECKED ⇒ sim add-on **ACTIVE** (2 other plugins read as checked/disabled = differentiated proof). CIMCO 26.01.10 licensed seat.

**Next builds:** `set-setting --cid --to` → `set-setting --cid --to` (BM_SETCHECK/CB_SETCURSEL/WM_SETTEXT + read-back-verify, --allow-actions) → `load-machine` (set Control Type + Machine setup on Backplot Setup page 10; UNITS HAZARD mm-config vs INCH-NC = 25.4×). Then re-run `cimco-fleet-sweep.ps1` for true per-machine verdicts.

Detail: `state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md`. Related: [[reference_cimco_live_drive_blockers_2026_06_09]] · [[reference_romeo_cimco_machine_bind_2026_06_04]] · [[reference_cimco_jm_machine_map_2026_06_02]] · [[feedback_check_units_first]].
