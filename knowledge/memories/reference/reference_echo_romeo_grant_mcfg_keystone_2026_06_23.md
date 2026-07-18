---
name: reference_echo_romeo_grant_mcfg_keystone_2026_06_23
description: "Operator granted echo the romeo chat-slot/domain capabilities (2026-06-23), removing the last coordination blocker on the CIMCO .mcfg machine-load fidelity keystone. echo now drives the sim AND configures/supplies the .mcfg."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.565Z
aliases: reference_echo_romeo_grant_mcfg_keystone_2026_06_23
---


**Operator grant (2026-06-23, slot:echo):** "you have permission to access and do romeo domain/chat slot capabilities."

**Context:** romeo owns the CIMCO machine-config (`.mcfg`) supply/authoring (operator-expanded 2026-06-04; `CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md` says "echo drives the sim, romeo supplies the right `.mcfg`, coordinate via chat bus, don't solo-build the machine-config"). The `.mcfg` machine-load fidelity wire (the keystone that turns every header-only sim into a real per-machine collision verdict) was therefore split across echo (drive) + romeo (config).

**Effect of the grant:** the keystone is now **coordination-free** -- echo may do BOTH the driving (echo's lane) AND the machine-config supply/authoring (romeo's lane). No chat-bus coordination needed before building the `.mcfg` load-machine wire.

**The keystone build (now fully echo+romeo-doable, queued for fresh budget):**
1. **Combo-write op** -- `set-setting` (shipped) writes CHECKBOXES only (2-state `BM_SETCHECK`). The `Machine setup` selector on **Backplot Setup** (CIMCO Setup property-sheet page 10) is a **combo** -> need a NEW combo path: `CB_GETCOUNT` + per-index `CB_GETLBTEXT` to map the target `.mcfg` display-name -> `CB_SETCURSEL` to select it. Flagged as the "future load-machine WRITER" at `Program.cs:43`. Build as `--op load-machine` (or extend `set-setting` to combos).
2. **Rebuild** `PrismCimcoUI.exe` via `build.ps1` (framework `csc.exe`; no .NET SDK).
3. **Wire** as a `--pre` step in `cimco-fleet-drive.mjs::driveMachine` BEFORE `Simulate`, loading `<machine>.mcfg` per `state/shared/cimco/jm-fleet-sim-map.json` (86 configs already exist in the install `MachineCfg/`; mapped per JM machine).
4. **INCH/mm units guard** -- the `.mcfg` is often mm but JM is INCH (25.4x scale error); `mustVerifyKinematics`: confirm NC `G20`/`G21` vs `.mcfg` unit + axis limits bracket the real machine before trusting any verdict.
5. **Eval** -- run a KNOWN-BAD over-travel NC -> Report grid shows data rows (`reportRows>0`) -> `parseSimulationReport` flags it -> proves the loop CATCHES problems (not just clean header-only reads).

**Prereq DONE this session:** the CIMCO launcher was re-pointed to the operator's reinstalled H: install ([[reference_echo_cimco_exe_path_resolve_2026_06_23]], `U-CIMCO-EXE-PATH-RESOLVE`) -- live-verified `ribbonRealized=true` on LTH-01/02/03, so the sim is driveable before this fidelity wire lands. Playbook: `state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md`.
