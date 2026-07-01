---
name: reference_post_ship_cimco-integration-ms0-u-cimco-sim-msaa-driver
description: Auto-distilled learnings from shipping CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-MSAA-DRIVER (commit 9cb2582ee). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.809Z
aliases: reference_post_ship_cimco-integration-ms0-u-cimco-sim-msaa-driver
---


# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-MSAA-DRIVER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-MSAA-DRIVER (slot:echo): SHIPPED+VALIDATED PrismCimcoUI.exe - the C# MSAA driver that does the IAccessible interop PowerShell couldn't. mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/{Program.cs,PrismCimcoUI.exe,build.ps1} - net48 console compiled with the framework csc.exe (NO .NET SDK; MSYS_NO_PATHCONV=1 to stop Git-Bash mangling /r: flags). LIVE-VALIDATED: --op map walked 1530 named controls (4794-5747 nodes) where PS-5.1 got 0 names; --op find "Simulation" returns Machine Simulation (pushbutton da=Click, path XTPMainFrame>xtpBarTop>..>The Ribbon), Simulation (pagetab da=Switch), Backplot, Backplot Setup, Loop Simulation, etc - the full ribbon, invocable via accDoDefaultAction. PID-snapshot launch-ownership kills ONLY the instance it started (validated 0-orphan), never a peer/operator CIMCO. 2-reviewer per-file scrutiny PASSED after fixes: closed 4 P0 (name-kill blast-radius->PID-snapshot-diff; deny-list checks RESOLVED accName not the operator query; --nc arg-injection + File.Exists fail-closed; invoke ok:true overclaim -> effectUnverified:true, never a clearance signal) + 3 P1 (JSON Trunc + lone-surrogate-safe Esc; settle-on-attach; exact-match-preferred + fail-closed-on-ambiguity invoke). Recompiled pure-ASCII (csc has the same ANSI-mis-decode risk as PS-5.1), re-validated. Spec A7. SUPERSEDES A4 "needs operator-opened interactive CIMCO" - MSAA reads cold/headless, the helper --launches CIMCO itself. Next: cimco-sim-driver.mjs orchestrator + --op read-report -> assessLiveRunClearance -> VMC-01 Hurco E2E.

**Shipped:** 2026-06-04T13:51:53-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[cimco-integration-ms0-u-cimco-sim-msaa-driver]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._