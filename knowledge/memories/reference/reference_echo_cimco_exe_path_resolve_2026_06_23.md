---
name: reference_echo_cimco_exe_path_resolve_2026_06_23
description: "Echo fixed the CIMCO live-drive blocker: PrismCimcoUI.exe hardcoded the old C: CIMCO path; operator reinstalled to H:. Re-pointed via env-override+auto-detect (U-CIMCO-EXE-PATH-RESOLVE). Plus a git-bash taskkill /F mangling gotcha."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.558Z
aliases: reference_echo_cimco_exe_path_resolve_2026_06_23
---


**U-CIMCO-EXE-PATH-RESOLVE** (slot:echo, 2026-06-23, commit on `cad-fusion-live-ms0`).

**The blocker (operator: "we built a system for you to fully drive and launch cimco, use it please" + "I had to reinstall a new version, it will be in the h drive"):** the CIMCO live sim drive (`cimco-fleet-drive.mjs` -> `PrismCimcoUI.exe --op invoke-read --launch`) returned `drive-failed-ribbon` ("no XTPMainFrame window") on every machine. Root cause: `Program.cs:70` hardcoded `private const string EXE = @"C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe"`. The operator reinstalled the working CIMCO to `H:\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe`, so the launcher started the wrong/old install and the Codejock ribbon never realized.

**Fix:** changed `const EXE` -> `static readonly EXE = ResolveCimcoExe()` which resolves at startup: `PRISM_CIMCO_EXE` env override first, then known install roots first-that-exists (`H:\CIMCO 2026\...` preferred, then legacy `C:\Program Files\CIMCO 2026\...`, then `H:\PRISM\resources\cimco-2026\...`); + a launch-time `File.Exists(EXE)` fail-loud guard ("set PRISM_CIMCO_EXE"). Rebuilt via `build.ps1` (framework `csc.exe` at `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe` -- NO .NET SDK needed; `dotnet` CLI is absent on this host).

**Verified LIVE:** attach `--op map` realized **1096 controls** on the H: CIMCO; the full launch-drive on LTH-01 went `drive-failed-ribbon` -> `ribbonRealized:true, invokeState:"open=fired;run=fired"` (CIMCO launched from H:, Machine Simulation opened, Simulate fired, report grid read), `report-header-only` (sim-clean lathe NC; `.mcfg` machine-load is the remaining fidelity wire). A partial fleet sweep then confirmed LTH-02 + LTH-03 also `ribbonRealized:true` (fix works on multiple machines).

**GOTCHA -- git-bash mangles `taskkill /F`:** in the Bash tool (git-bash), `taskkill /F /PID <n>` fails with `Invalid argument/option - 'F:/'` because git-bash POSIX-path-converts `/F` -> `F:/`. With `2>/dev/null` the kill SILENTLY fails and the process survives. Use `powershell -NoProfile -Command "Stop-Process -Id <n> -Force"` OR `taskkill //F //PID <n>` (double-slash escape). NOTE: `cimco-fleet-drive.mjs`'s own `killCimco` is UNAFFECTED -- it uses `execFileSync("taskkill", ["/F",...])` (arg array, not a git-bash shell string), so the driver kills CIMCO fine; only interactive bash taskkill is mangled.

**Remaining (queued):** `.mcfg` machine-load fidelity wire (KEYSTONE -- header-only -> real collision verdicts; Backplot Setup setup-page 10, Control Type cid 14641 + Machine setup combo per `jm-fleet-sim-map.json`, + INCH/mm units guard; **romeo owns the .mcfg supply -- coordinate, don't solo-build**). The 240 "drift posts" are JM production-archive copy-divergences (shop reconciliation, not a PRISM-post bug, not echo-auto-fixable). Playbook: `state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md`.
