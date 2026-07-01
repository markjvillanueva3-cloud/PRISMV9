---
name: ""
source: prism-memory
synced: 2026-06-27T20:30:46.516Z
aliases: reference_cimco_edit_h_launcher_2026_06_24
---


**"CIMCOEdit - H"** (desktop shortcut `C:\Users\wompu\OneDrive\Desktop\CIMCOEdit - H.lnk`, operator-confirmed 2026-06-24) is the canonical launcher for the **correctly-licensed** CIMCO Edit app installed on the **H drive**. Always launch CIMCO via this shortcut — it points at the licensed H-drive instance, not any other/unlicensed copy.

- **Target exe:** `H:\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe`
- **Working dir:** `H:\CIMCO 2026\CIMCOEdit`
- **Args:** (none — license is bound to this install, not passed on the command line)
- **Install root:** `H:\CIMCO 2026\` (version: CIMCO 2026)
- **License manager:** `H:\CIMCO 2026\CIMCOEdit\Sys\KeyManager.exe` (proper license key is registered for this install; the paid **simulation add-on** is part of the licensed setup per the echo CIMCO closed-loop goal)
- **Other bundled exes:** `Dll\CIMCOSimulation.exe` (backplot/sim), `Dll\GroovingKernelWrapper.exe`, `Sys\mariadb.exe` (CIMCO's embedded DB)

**Why this matters (echo/post-processor):** CIMCO Edit is the operator's editor-of-record for closed-loop post-processor validation — code-correctness + simulation of emitted NC for all JM machines. The echo CIMCO closed-loop work (`state/shared/cimco/CIMCO-CLOSED-LOOP-STATUS-2026-06-09.md`, ui-driver at `mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/Program.cs`) drives THIS licensed instance. Use the `CIMCOEdit - H` shortcut so the simulation add-on and license resolve correctly.

Related: [[reference_echo_jm_cps_fleet]] · CIMCO closed-loop ledger section D in `state/shared/specs/ECHO-OPEN-TASKS-LEDGER.md`.
