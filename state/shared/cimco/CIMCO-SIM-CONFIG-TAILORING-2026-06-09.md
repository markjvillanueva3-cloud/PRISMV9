# CIMCO simulation config + tailoring plan (slot:echo, 2026-06-09) -- operator directive

> Operator: "I paid for the simulation add-on, make sure it's activated and all CIMCO settings are tailored
> for our setup. Go through each possible setting in CIMCO to adjust to fit our needs." This is the root-cause
> work behind the universal **header-only** sim reads (all **12 sim-able** JM machines -- 7 lathe + 5 mill -- read
> 0 findings; the other 3 of the 15-machine fleet are EDM, routed to discharge-physics, never CIMCO-sim-driven).

## Root cause of the header-only reads (R12 -- evidence-based, not assumed)
The sim **runs** (CIMCO launches, Machine Simulation opens, "Simulate" executes, the Report grid realizes) but
reports **0 data rows** on every machine. Two experiments this session pin the cause:
1. Baseline `invoke-read` -> header-only (Report Header 4 cols + empty Report Row).
2. `invoke-read --pre "Check collision and limit errors"` (collision-check enabled FIRST) -> **still header-only**
   (`invokeState:"pre=fired;open=fired;run=fired"`, `found=true`, 0 rows).

So enabling the collision/limit check is **necessary but NOT sufficient**. The sim has **nothing to collide
against**: no MACHINE envelope (travel limits/kinematics) and no STOCK/WORKPIECE geometry are loaded, so the
checker finds nothing. The clean reads are a *configuration* gap, not a reader bug and not (only) clean programs.

## CIMCO sim-config control surface (mapped live, `--op map`, 2337 controls)
The Simulation ribbon + Setup carry every control needed to tailor the sim:
| control | role | purpose |
|---|---|---|
| `Check collision and limit errors` | pushbutton/window | enable collision + travel-limit checking (necessary) |
| `Configure Machine Type` / `Machine` / `Machine Type` / `Machine Templates` | pushbutton/r57 | load the machine kinematics (.mcfg) -> travel limits + collision geometry |
| `Add Stock` / `Add Workpiece` / `Add Fixture` | r57 | define material + fixtures to gouge/collide |
| `Stop Conditions` | r57 | what the sim stops/reports on (collision/limit/etc.) |
| `Tool Setup` / `Show Tool Holder` | pushbutton | tool + holder geometry (holder collisions) |
| `Solid Model` / `Stock Compare` / `Backplot Setup` | -- | sim render + compare modes |
| `Global Setup` / `Other Settings` / `Macro Setup` / `DNC Setup` / `Configure Block Numbering` | pushbutton | general install settings |
| `About` | -- | license/version -> verify the simulation ADD-ON is activated (Task #3) |

## Add-on activation (Task #3) -- CONFIRMED FUNCTIONAL + LICENSED (2026-06-10 via list-windows --pre "About")
The simulation DID run end-to-end (collision-check fired, sim executed, Report realized) -- a non-licensed
add-on would refuse. **About dialog read (live, `list-windows --pre "About"`):** standard `#32770` titled
"CIMCO Edit", **version `CIMCO Edit: 26.01.10+f1578423ab`** (Copyright 1991-2026 CIMCO A/S, reseller CIMCO
Americas LLC), **active web license** ("Connecting to license server...", static cid 1103/1105) + `License
Details` button (cid 1024), `Find keyfile` (cid 213), `Activate web license` (cid 215). => the install is a real
licensed CIMCO Edit 2026 and the sim add-on is **functional on a licensed seat**.
**TASK #3 DEFINITIVELY CONFIRMED (2026-06-10, commit `cf832d0607`):** `--op read-setting --name "advanced
simulation"` read **`Disable advanced simulation` (cid 14016) = UNCHECKED** (`checked:false`, BM_GETCHECK) on the
Select-plugins page => the sim add-on is **NOT disabled = ACTIVE**. Differentiated proof: 2 other plugins (NC-Base
13971, DNC-Max 13982) read as checked/disabled in the same call, so the BM_GETCHECK read returns real per-control
state. Combined with end-to-end sim runs + the licensed About dialog, Task #3 is closed: **sim add-on ACTIVE on a
licensed CIMCO Edit 26.01.10 seat.**

## Cross-slot ownership (DO NOT reinvent)
**romeo owns the CIMCO machine-config (.mcfg) supply** -- operator-expanded 2026-06-04 (commit `f1e4ade66e`,
[[reference_romeo_cimco_machine_bind_2026_06_04]], chat-bus topic `CIMCO-SPINE2-machine-bind`). The JM->`.mcfg`
map already exists: `state/shared/cimco/jm-fleet-sim-map.json` ([[reference_cimco_jm_machine_map_2026_06_02]]).
echo owns DRIVING the sim (the `invoke-read` op + sweep); romeo owns SUPPLYING the right `.mcfg`. Coordinate via
the chat bus, don't solo-build the machine-config.

## Tailoring sequence (the fix, in dependency order) -- next iterations
1. **Load the machine per JM machine** -- each JM machine maps to a CIMCO `.mcfg` in `jm-fleet-sim-map.json`
   (e.g. LTH-03 -> `Cimco Lathe 3 Axis C.mcfg`, VMC-03 -> `Haas VF-6_40.mcfg`). Read romeo's machine-bind answer
   (`f1e4ade66e`) for HOW CIMCO selects the sim machine, then wire the chosen mechanism (persistent setting via
   `Configure Machine Type` one-time per machine, vs a loadable per-session config) into the sim driver / `--pre`.
2. **Add stock/workpiece** -- `Add Stock` with the part's stock dims so the cutter has material to gouge.
3. **Collision-check ON** -- `Check collision and limit errors` (proven fireable via `--pre`).
4. **Stop Conditions** -- ensure collision + limit are reporting conditions.
5. **Re-run a KNOWN-BAD NC** (a program that over-travels or gouges) -> the Report should now show data rows ->
   the verdict gate (`parseSimulationReport`) flags it -> proves the loop CATCHES problems (not just clean reads).

## Driver capability shipped this session
`PrismCimcoUI.exe --op invoke-read --pre <ctl> --name <ctl> --then <ctl>` -- `--pre` fires a config control
(e.g. collision-check) BEFORE opening + running the sim. Same `FireControl` safety (MotionDeny + --allow-actions).
This is the hook the tailoring sequence will use to pre-configure the sim per run.

## Machine-bind mechanism (from romeo's answer `f1e4ade66e` -- concrete, sourced)
- **`.mcfg` source dir:** `H:/prism/resources/cimco-2026/CIMCOEdit/MachineCfg` -- **86 configs**, indexed in
  `state/shared/cimco/machine-index.json` (each: file/displayName/orientation/unit/axes[Name,Type,Limits,MaxSpeed]).
- **Bind:** the **"Configure Machine Type"** ribbon control **file-picks a `.mcfg`** from that dir (no registry).
  The sim then runs against that `.mcfg`'s kinematics -> **travel-LIMIT checking works even WITHOUT stock** (a
  program exceeding the machine's axis travel will flag). This is the first real verdict the loop can catch.
- **⚠ UNITS HAZARD:** the resolved `.mcfg` is often **mm** but JM convention = **INCH** -> 25.4x scale error.
  `mustVerifyKinematics`: confirm NC G20/G21 vs `.mcfg` unit AND that axis limits bracket the real machine before
  trusting any collision verdict. A CIMCO-sim CLEAN = conformance-clean, NOT controller-verified.
- **OPEN GAP (stock/fixture collision):** stock + fixture collision bodies are **per-setup**, NOT in the machine
  DB, and a per-setup body manifest **does not exist yet** (CAM/setup-sheet layer). Until built, the honest verdict
  ceiling is "kinematics + tool-collision-only (workholding UNVERIFIED)". Holders ride `tool-index.json` `.tmlib`.

## LIVE DISCOVERY 2026-06-10 (slot:echo) -- the settings surface is a Win32 #32770, NOT a blind file-picker
The `read-window` crash blocked the old plan, so I built a CRASH-SAFE recon op instead: **`--op list-windows`**
(`PrismCimcoUI.exe`, committed) uses **ONLY Win32** window enumeration (`EnumWindows`/`EnumChildWindows`/
`GetClassName`/`GetWindowText`/`GetDlgCtrlID`) and **never touches MSAA** (`AccessibleObjectFromWindow`/
`AccessibleChildren`), so it **cannot** trigger the unmanaged provider AV that killed `read-window`. With
`--pre "Configure Machine Type" --allow-actions` it fires the control (holding the modal open) then enumerates it.

**Live result (exit 0, clean JSON, validated against CIMCO + lathe NC `9007405.MIN`):** firing "Configure Machine
Type" (`pre:"fired"`) opens the **global CIMCO Setup property-sheet** -- a standard **`#32770`** titled
**"Setup: File Types"** (hwnd `0x51284`), navigated by a **`SysTreeView32 "Tree1"` (cid 14000)**, with
**`OK`=1 / `Cancel`=2 / `Default`=13902 / `Help`=13986**. The "File Types" page alone exposed **~70 settings with
exact dialog cids** -- e.g. `Use 'Dark Mode' colors`=13938, `Default simulation window size` edit=14494,
`Language` combo=13951, `Tab width` edit=13977, `Start maximized`=13918, `Always show all files (*.*)`=13969.

**MODEL CORRECTION (R12 -- evidence over assumption):** "Configure Machine Type" does **NOT** open a blind file
dialog. It opens the **entire CIMCO settings surface as ONE Win32-drivable `#32770` property sheet**. This is
exactly the operator's "go through each possible setting in CIMCO" surface, and the `.mcfg` machine bind is a
**page within this tree** (navigate `Tree1` to the Machine/Simulation node), not a direct ribbon file-picker. ALL
of it is Win32-drivable (`BM_CLICK` checkboxes / `CB_SETCURSEL` combos / `WM_SETTEXT` edits / `TVM_SELECTITEM`
tree) -- **the MSAA `read-window` capability is no longer needed for this work** (the AV class is fully sidestepped).

## SETUP-PAGES SHIPPED 2026-06-10 (slot:echo, commit `2322f566b3`) -- all 23 pages mapped
**`--op setup-pages` is built + live-validated** (23 pages, distinct per-page control counts, exit 0). It did NOT
need the cross-process `TVM_GETITEM`/`ReadProcessMemory` text read -- it walks the tree by **HTREEITEM handle**
(`TVM_GETNEXTITEM` root/next/child, opaque handles via `SendMessage`), `TVM_SELECTITEM`s each page, and Win32-
enumerates the page's VISIBLE controls (`AllChildHwnds`). Pages self-identify by their group-box/control titles.
Foreground-preferred `#32770` bind + `pagesTruncated`/`controlsTruncated` fail-loud flags + re-select-root.

**The 23 Setup pages (page index : name):** 0 General program settings · 1 Editor settings · 2 NC-Assistant ·
3 Print options · 4 File-types list · 5 Color settings · 6 Renumber settings · 7 Load/Save · 8 File compare ·
9 Special Characters/NC-Codes/Units · **10 Backplot Setup (MACHINE/SIM CONFIG)** · 11 Control Settings (per-
controller, showed "Okuma Turning" on a lathe NC) · 12 Scanning Mode · 13 Automatic tool scanning · 14 Navigation
scanning · 15 Multi channel view · 16 Tool list setup · 17 General settings · 18 Global Colors · 19 External
Command 1 · 20 Downloader · 21 list · **22 Select plugins (ADD-ON TOGGLES)**.

**Page 10 "Backplot Setup" = the machine/sim config (NOT a blind .mcfg file-pick -- MODEL CORRECTION):**
`Control Type:` (cid 14641) · `Machine setup:` (combo, label cid -1) · `Turning configuration:` (cid 14585) +
`List2` SysListView32 (cid 14582) with `+`/`-` (14043/14052) · `Automatically import tools from a tool library`
(14635) · `Tool library:` · `Highlight syntax errors when backplotting` (14531) · `Use machine setup feedrates`.
So machine-load = select Control Type + Machine setup on THIS page (a config selector), NOT a "Configure Machine
Type" file dialog. ("Configure Machine Type" merely OPENS Setup; the machine config lives on Backplot Setup.)

**Page 22 "Select plugins" = add-on enablement (Task #3 definitive control):**
`Disable advanced simulation` = **cid 14016** (checkbox; UNCHECKED => sim add-on ACTIVE) · `Disable Backplot`
(13987) · `Disable DNC/Serial` (13994) · `Disable CNC-Calc` (14008) · `Disable advanced NC-Functions` (14004) ·
`Enable configuration password protection` (14077) · `Edit configuration paths` (14505).

## NEXT BUILD (precise) -- read-control + set-setting (one op, both directions)
1. **`--op read-setting --page <hint> --cid <id>`** (or read all controls' state on a page) -- navigate to the page
   whose controls match `<hint>` (e.g. "Select plugins"), then read a checkbox via `BM_GETCHECK` / combo selection
   via `CB_GETCURSEL`+`CB_GETLBTEXT` / edit via `WM_GETTEXT`. **FIRST USE: read `Disable advanced simulation`
   (cid 14016) on Select plugins -> unchecked = Task #3 DEFINITIVELY CONFIRMED** (sim add-on active). Read-only, safe.
2. **`--op set-setting --page <hint> --cid <id> --to <val>`** -- checkbox `BM_SETCHECK`+`BM_CLICK`, combo
   `CB_SETCURSEL`, edit `WM_SETTEXT`. **Read-back-verify after every write** (fail-loud if it didn't take). Gate
   `--allow-actions`. **Safety:** a SETTING is config-only (never machine motion); `OK` persists -> only press OK
   when the operator wants persistence, else leave unpersisted. Tailors the operator's "every setting".
3. **`--op load-machine`** -- on Backplot Setup (page 10): set `Control Type` + `Machine setup` to the JM machine's
   config (per `jm-fleet-sim-map.json`), `OK`. **UNITS HAZARD** (mm config vs INCH NC = 25.4x -- `mustVerifyKinematics`).
   Eval: load machine + run an over-travel NC -> Report shows a limit row -> verdict gate FAILS (proves the loop catches).

**SUPERSEDED:** the old "drive a blind file-open dialog + MSAA `read-window`" plan. `read-window` (crashed
2026-06-09, exit 255 unmanaged AV) is NOT needed -- `list-windows` + `setup-pages` + the known control cids replace
it entirely. The hardened-MSAA-read-window design notes are retained below for history only.

**HISTORICAL (read-window crash, 2026-06-09 -- no longer on the critical path):** a naive `read-window` (EnumWindows
+ the existing WalkReport on every "CIMCO"-titled top-level) CRASHED -- exit 255, an UNMANAGED MSAA-provider fault
the managed try/catch cannot catch (walking an arbitrary window's IAccessible tree hits unstable providers). The
`list-windows` Win32-only approach sidesteps this entirely; if MSAA reading of a non-report window is ever needed,
the hardened design must (a) target a specific dialog hwnd by title, (b) defensive try/catch per node, (c) a
depth/timeout watchdog.

## Note on the "all-15 sweep complete" result
The earlier all-15 sweep (`fleet-drive-results.json`) is LOOP-complete (every machine drove + read), but the
header-only verdicts are not yet FIDELITY-complete precisely because of this config gap. Once the machine+stock
config lands, re-run `cimco-fleet-sweep.ps1` (now with `--pre` + machine-load) for true per-machine verdicts.
