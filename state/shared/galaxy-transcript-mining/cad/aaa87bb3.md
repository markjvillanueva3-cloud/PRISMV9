# cad session aaa87bb3 (2026-06-04, 18.8MB, spine 97KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `PrismCimcoUI.exe` – autonomous CIMCO UI driver (MSAA read/drive, 1530 controls).  
- Watchdog‑enhanced driver (`ff2a968587`) – 8 s timeout on `accDoDefaultAction`.  

**DECISIONS**  
- Use MSAA/IAccessible for CIMCO automation; UIA unusable.  
- Compile helper with .NET Framework `csc.exe` (no SDK).  
- Add watchdog around UI actions.  
- Build autonomous driver and orchestrator unit (`useWorkflow:false`).  
- Await Romeo’s machine‑bind path & JM‑fleet mapping before generating collision verdicts.  

**OPERATOR DIRECTIVES**  
- `/loop [5m] /goal`; “push through”; “continue”.  
- Notify Romeo that driver is ready; await machine‑config binding.  
- After receipt, build `--op read-report`, run orchestrator, generate fleet verdicts, complete VMC‑01 Hurco E2E.  

**FINDINGS/BUGS**  
- Codejock XTP ribbon lacks UIA provider; MSAA shows 213 children.  
- PowerShell 5.1 cannot bind `IAccessible` for `AccessibleChildren`; C# can.  
- `accDoDefaultAction` blocks forever – resolved with 8‑s watchdog.  
- `csc.exe` & `Accessibility.dll` available → .NET Framework build possible.  
- Blocker: no bound machine config to produce simulation report for collision assessment.  

**DOMAIN SPECIFICS**  
- PrismCimcoUI: MSAA driver for CIMCO Edit 2026 simulation engine.  
- Units: `cimco-nav-planner`, `cimco-verify-open-file`; next `cimco-sim-drive`.  
- Dispatchers: UIA → MSAA; watchdog timeouts.  
- Metrics: 1530 controls read, 388 MB sim memory usage during run.  
- Orchestration script: `cimco-sim-driver.mjs`.  
- Collision verdict flow: `--op read-report → assessLiveRunClearance`.  
- Machine‑config binding via CIMCO Backplot (Configure Machine Type/template).  
- JM‑fleet to CIMCO mapping (`jm-fleet-sim-map.json`), VMC‑01 Hurco first.  

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `checkin.md` pipeline, ultracode workflow.  
- Windows utilities: PowerShell 5.1, pwsh 7, oleacc (`IAccessible`).  
- Build: .NET Framework compiler (`csc.exe`), manual JSON handling (no System.Text.Json).  
- PRISM Hermes workflow planner; Node orchestrator script `cimco-sim-driver.mjs`.  
- PrismCimcoUI.exe; Chat bus for inter‑operator coordination.  

**OPEN THREADS**  
- Complete invoke path for simulation run & report reading via MSAA.  
- Integrate driver into CI pipeline and handoff to operator.  
- VMC‑01 Hurco E2E test with live collision verdict.  
- Coordinate with Romeo on database setup, full collision coverage, machine‑bind path, JM‑fleet mapping.  
- Final spec documentation & memory updates.
