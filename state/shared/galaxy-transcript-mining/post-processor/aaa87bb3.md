# post-processor session aaa87bb3 (2026-06-04, 18.8MB, spine 97KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED (builds/commits)**  
- `d92b58cd21` – U‑CIMCO‑NAV‑PLANNER: 511‑surface map navigation, 27/27 tests.  
- `b81369b3c3` – U‑CIMCO‑VERIFY‑OPEN‑FILE: byte‑equiv + dialect lint, 13/13 tests.  
- `0e7359e56a` – UIA de‑risk probe: CIMCO Machine Simulation button enabled, 3‑file scrutiny.  
- `cfc30ff4fb` – MSAA breakthrough proof: Codejock XTP ribbon exposes 213 IAccessible children headless.  
- `02f53b0bf3` – .NET Framework `csc.exe` present → net48 C# helper without SDK install.  
- `9cb2582eef` – PrismCimcoUI.exe (net48 console): reads 1530 controls, names/roles/default‑actions.  
- `ff2a968587` – watchdog patch: forces return from `accDoDefaultAction` >8 s to avoid hangs.  
- `f46119631e` – spec update A7: documents MSAA channel & watchdog logic.

**DECISIONS (architecture/scope + why)**  
- Adopt **MSAA/IAccessible** as sole automation channel; UIA unusable.  
- Build net48 C# helper PrismCimcoUI.exe instead of PowerShell (PS‑5.1 fails to bind IAccessible).  
- Implement 8 s watchdog around `accDoDefaultAction` to prevent indefinite blocking on Codejock controls.  
- Commit driver as separate reusable unit for future post‑proveout work (e.g., VMC‑01 Hurco E2E).  
- Orchestrator built as single‑instance node app; Hermes planner verdict `useWorkflow:false`.  
- Collision verdict requires machine config bound in CIMCO; orchestrator reads report only after bind.  
- Build order: driver → machine‑config bind (Romeo) → `--op read-report` → orchestrator validation → fleet matrix verdicts → VMC‑01 Hurco E2E.

**OPERATOR DIRECTIVES (verbatim asks)**  
- “Always build for comprehensive coverage.”  
- “Paid for machine simulation add‑on; figure out how to get it working.”  
- “Launch CIMCO, Hurco apps and CAD/CAM apps when needed.”  
- “Focus on getting CIMCO ready to read our posts relative to the machine and controller the post is for.”  
- “Test simulations as well for all in one coverage of the post‑processor capabilities, accuracy and collision avoidance system.”  
- “Push through.”  
- Provide CIMCO machine‑bind path + JM fleet → CIMCO‑machine map.  
- Clarify how a `.mcfg` loads into a Backplot session (Configure Machine Type/template).

**FINDINGS/BUGS**  
- UIA exposes only 21 nodes of Codejock XTP ribbon; MSAA exposes full 213 children headless via `AccessibleObjectFromWindow`.  
- PowerShell 5.1 fails to bind IAccessible for `AccessibleChildren`; names empty.  
- `accDoDefaultAction` on Codejock controls can block indefinitely; fixed with watchdog.  
- `.NET Framework csc.exe` available, enabling compiled helper without SDK install.  
- `ForegroundLockTimeout` maxed (2147483647); disabling did not affect MSAA visibility.  
- Orchestrator cannot validate core output without bound machine config; currently ready but unverified.

**DOMAIN SPECIFICS (engines/actions/dispatchers/metrics/paths)**  
- **Engines:** CIMCO Edit 2026, CIMCOSimulation.exe, Hurco VMC‑01, CIMCO Backplot, Machine Simulation.  
- **Actions:** `planNavigation(job)`, `verifyOpenFile(file)`, `accDoDefaultAction(childId)`, `AccessibleChildren()` enumeration, watchdog timeout, `--keep`, `spawn‑timeout‑kill`, `--op read-report`, `assessLiveRunClearance`.  
- **Dispatchers:** PRISM `/checkin-echo` wrapper, chat-slot claim helper, `audit-roadmap-drift.mjs`, spec update hooks (`state/shared/specs/...`).  
- **Metrics:** test pass counts (27/27, 13/13), driver watchdog hit count, UIA node counts (21 vs 213), collision verdict, live‑run clearance.  
- **Paths:** `H:/prism/.claude/helpers/chat-slots.mjs`; `scripts/cimco-nav-planner.mjs`; `scripts/cimco-verify-open-file.mjs`; `state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md`; `jm-fleet-sim-map.json`; Backplot machine‑bind configuration.

**TOOLS USED (which PRISM tools/dispatchers/skills/scripts/hooks)**  
- `/checkin-echo` slot‑binding wrapper.  
- `chat-slots.mjs` reclaim/claim helpers.  
- `audit-roadmap-drift.mjs`.  
- `cimco-nav-planner.mjs`, `cimco-verify-open-file.mjs`.  
- PowerShell scripts: `cimco-ms-realize-probe.ps1`, `cimco-uia-diag.ps1`, `cimco-backplot-setup-probe.ps1`.  
- C# helper build via `csc.exe` (no SDK).  
- Spec update script (`state/shared/specs/...`).  
- Node orchestrator script (`cimco-sim-driver.mjs`).  
- Hermes workflow planner (`hermes-workflow-planner.mjs`).  
- PRISM chat bus for coordination.

**OPEN THREADS (what is still to build)**  
- Validate `PrismCimcoUI.exe --op invoke "Machine Simulation"` starts 3D simulation engine, triggers collision checks, reads report via MSAA.  
- Implement `AccessibleChildren()` name mapping for Simulation Report grid; extract verdict data (collision/limit).  
- Obtain machine‑config bind path from Romeo; deliver JM‑fleet → CIMCO mapping file.  
- Implement & verify `--op read-report`; validate orchestrator against bound config.  
- Run fleet matrix to produce collision verdicts.  
- Complete VMC‑01 Hurco E2E proof‑out (first end‑to‑end test, fail‑closed clearance).  
- Integrate native simulation machine registration and collision‑body coverage into workflow.  
- Add driver unit to PRISM’s per-file scrutiny pipeline; ensure 3-of‑3 gate passes.  
- Update wiki entry for shipped units & handoff notes.
