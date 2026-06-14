---
name: reference_winmax_launch_fix_2026_06_01
description: Why the Hurco WinMax sims wedge on launch (RTServices.dll crash-loop) and the guarded launcher that fixes it
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.057Z
aliases: reference_winmax_launch_fix_2026_06_01
---


**WinMax sim launch wedge + fix (slot:echo, 2026-06-01).** The Hurco WinMax DS/MT Desktop simulators "don't finish launching" when wedged. Diagnosed live + fixed.

**Root cause:** a prior crash-looped launch leaves the stack half-up — the RT components (`Max5UI` / `WinmaxMillRT` / `CNC_MachineConfigMgr` / `CNC_LogMgr`) crash-fault in **`RTServices.dll`**, the RT engine dies, but `CNC_RTServicesAutoStart` + `WcfDataService` survive holding **net.tcp :4502** + RT singletons → every relaunch re-crashes. Two contributing factors:
1. The two products launch from **different installs** and **REQUIRE a `/product` arg** — a bare `CNC_Launcher.exe` (no `/product`) just sits idle, spawning nothing.
2. `DS WinMax Mill` (RTServices.dll **01/28/2026**) and `MT WinMax Desktop` (**12/15/2025**) ship **different RTServices.dll versions** and both bind :4502 → running both at once, or double-launching one, is an ABI collision → the crash cascade.

**Canonical launch map** (from the operator's Start-Menu `v10/v11 WinMax *.lnk` shortcuts):
- **mill** → `C:\Program Files (x86)\Hurco\DS WinMax Mill\x64\CNC_Launcher.exe /company Hurco /product "DS WinMax Mill"` — RT proc `WinmaxMillRT`.
- **lathe** → `C:\Program Files\Hurco\MT WinMax Desktop\CNC_Launcher.exe /company Hurco /product "MT WinMax Lathe"` — RT proc `CNC_RT`.
- Readiness signal (both): **net.tcp :4502 listening + `Max5UI` up + no new RTServices crash** in the Application event log.

**Fix / how to launch:** `scripts/winmax-launch.ps1` (pwsh7) — enforces ONE product at a time: kills EVERY stale WinMax process (`CNC_|Max5|Winmax|WcfData`) for a clean slate, launches the right product, waits for readiness, fails loud on a crash. `-Product mill|lathe`, `-KillOnly` to just clear a wedge. **Run with `pwsh` NOT Windows PowerShell 5.1** (5.1 parse-errors on the script). Verified live: mill healthy 20s, lathe healthy 27s, switching both ways clean. The PRISM bridge still NEVER auto-launches — this helper is operator-invoked. Pairs with [[reference_winmax_course_framework_2026_05_31]] + the lathe course scaffold `winmax-lathe-courses.json`.
