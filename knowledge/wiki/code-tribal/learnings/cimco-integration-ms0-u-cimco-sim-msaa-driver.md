# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-MSAA-DRIVER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-DRIVER (slot:echo): SHIPPED+VALIDATED PrismCimcoUI.exe - the C# MSAA driver that does the IAccessible interop PowerShell couldn't. mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/{Program.cs,PrismCimcoUI.exe,build.ps1} - net48 console compiled with the framework csc.exe (NO .NET SDK; MSYS_NO_PATHCONV=1 to stop Git-Bash mangling /r: flags). LIVE-VALIDATED: --op map walked 1530 named controls (4794-5747 nodes) where PS-5.1 got 0 names; --op find "Simulation" returns Machine Simulation (pushbutton da=Click, path XTPMainFrame>xtpBarTop>..>The Ribbon), Simulation (pagetab da=Switch), Backplot, Backplot Setup, Loop Simulation, etc - the full ribbon, invocable via accDoDefaultAction. PID-snapshot launch-ownership kills ONLY the instance it started (validated 0-orphan), never a peer/operator CIMCO. 2-reviewer per-file scrutiny PASSED after fixes: closed 4 P0 (name-kill blast-radius->PID-snapshot-diff; deny-list checks RESOLVED accName not the operator query; --nc arg-injection + File.Exists fail-closed; invoke ok:true overclaim -> effectUnverified:true, never a clearance signal) + 3 P1 (JSON Trunc + lone-surrogate-safe Esc; settle-on-attach; exact-match-preferred + fail-closed-on-ambiguity invoke). Recompiled pure-ASCII (csc has the same ANSI-mis-decode risk as PS-5.1), re-validated. Spec A7. SUPERSEDES A4 "needs operator-opened interactive CIMCO" - MSAA reads cold/headless, the helper --launches CIMCO itself. Next: cimco-sim-driver.mjs orchestrator + --op read-report -> assessLiveRunClearance -> VMC-01 Hurco E2E.

**Commit:** `9cb2582eef17` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T13:51:53-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-msaa-driver, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-DRIVER (slot:echo): SHIPPED+VALIDATED PrismCimcoUI.exe - the C# MSAA driver that does the IAccessible interop PowerShell couldn't. mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/{Program.cs,PrismCimcoUI.exe,build.ps1} - net48 console compiled with the framework csc.exe (NO .NET SDK; MSYS_NO_PATHCONV=1 to stop Git-Bash mangling /r: flags). LIVE-VALIDATED: --op map walked 1530 named controls (4794-5747 nodes) where PS-5.1 got 0 names; --op find "Simulation" returns Machine Simulation (pushbutton da=Click, path XTPMainFrame>xtpBarTop>..>The Ribbon), Simulation (pagetab da=Switch), Backplot, Backplot Setup, Loop Simulation, etc - the full ribbon, invocable via accDoDefaultAction. PID-snapshot launch-ownership kills ONLY the instance it started (validated 0-orphan), never a peer/operator CIMCO. 2-reviewer per-file scrutiny PASSED after fixes: closed 4 P0 (name-kill blast-radius->PID-snapshot-diff; deny-list checks RESOLVED accName not the operator query; --nc arg-injection + File.Exists fail-closed; invoke ok:true overclaim -> effectUnverified:true, never a clearance signal) + 3 P1 (JSON Trunc + lone-surrogate-safe Esc; settle-on-attach; exact-match-preferred + fail-closed-on-ambiguity invoke). Recompiled pure-ASCII (csc has the same ANSI-mis-decode risk as PS-5.1), re-validated. Spec A7. SUPERSEDES A4 "needs operator-opened interactive CIMCO" - MSAA reads cold/headless, the helper --launches CIMCO itself. Next: cimco-sim-driver.mjs orchestrator + --op read-report -> assessLiveRunClearance -> VMC-01 Hurco E2E.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-DRIVER (slot:echo): SHIPPED+VALIDATED PrismCimcoUI.exe - the C# MSAA driver that does the IAccessible interop PowerShell couldn't. mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/{Program.cs,PrismCimcoUI.exe,build.ps1} - net48 console compiled with the framework csc.exe (NO .NET SDK; MSYS_NO_PATHCONV=1 to stop Git-Bash mangling /r: flags). LIVE-VALIDATED: --op map walked 1530 named controls (4794-5747 nodes) where PS-5.1 got 0 names; --op find "Simulation" returns Machine Simulation (pushbutton da=Click, path XTPMainFrame>xtpBarTop>..>The Ribbon), Simulation (pagetab da=Switch), Backplot, Backplot Setup, Loop Simulation, etc - the full ribbon, invocable via accDoDefaultAction. PID-snapshot launch-ownership kills ONLY the instance it started (validated 0-orphan), never a peer/operator CIMCO. 2-reviewer per-file scrutiny PASSED after fixes: closed 4 P0 (name-kill blast-radius->PID-snapshot-diff; deny-list checks RESOLVED accName not the operator query; --nc arg-injection + File.Exists fail-closed; invoke ok:true overclaim -> effectUnverified:true, never a clearance signal) + 3 P1 (JSON Trunc + lone-surrogate-safe Esc; settle-on-attach; exact-match-preferred + fail-closed-on-ambiguity invoke). Recompiled pure-ASCII (csc has the same ANSI-mis-decode risk as PS-5.1), re-validated. Spec A7. SUPERSEDES A4 "needs operator-opened interactive CIMCO" - MSAA reads cold/headless, the helper --launches CIMCO itself. Next: cimco-sim-driver.mjs orchestrator + --op read-report -> assessLiveRunClearance -> VMC-01 Hurco E2E.
```

## Files touched (6)
- .claude/helpers/chat-slots-preview-reclaimable.test.mjs          |  51 +++--
- .../posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe     | Bin 0 -> 16384 bytes
- .../data/posts/prism-base/cimco-bridge/ui-driver/Program.cs      | 324 +++++++++++++++++++++++++++++
- .../data/posts/prism-base/cimco-bridge/ui-driver/build.ps1       |  12 ++
- state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md       |  10 +
- 5 files changed, 378 insertions(+), 19 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9cb2582eef17`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._