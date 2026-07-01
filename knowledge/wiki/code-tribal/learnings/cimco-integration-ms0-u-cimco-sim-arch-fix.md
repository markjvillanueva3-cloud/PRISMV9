# CIMCO-INTEGRATION-MS0/U-CIMCO-SIM-ARCH-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-ARCH-FIX (slot:echo): architecture correction — no dotnet SDK on this box, and the proven WinMAX helper uses RAW System.Windows.Automation (not FlaUI). So the production driver is PowerShell-native raw-UIA (cimco-sim-drive.ps1 + ui-map FSM), functionally equiv to compiled C# but no build step — runs here today. Brittleness was fixed-sleeps, not language; fix = wait-for-control-enabled + retry-invoke + re-probe-confirm FSM. Operator option: provision .NET SDK for a compiled PrismCimcoUI.exe clone. Spec A3 added.

**Commit:** `5cf1a88ed74d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T11:21:26-05:00
**Tags:** cimco-integration-ms0, u-cimco-sim-arch-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-ARCH-FIX (slot:echo): architecture correction — no dotnet SDK on this box, and the proven WinMAX helper uses RAW System.Windows.Automation (not FlaUI). So the production driver is PowerShell-native raw-UIA (cimco-sim-drive.ps1 + ui-map FSM), functionally equiv to compiled C# but no build step — runs here today. Brittleness was fixed-sleeps, not language; fix = wait-for-control-enabled + retry-invoke + re-probe-confirm FSM. Operator option: provision .NET SDK for a compiled PrismCimcoUI.exe clone. Spec A3 added.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SIM-ARCH-FIX (slot:echo): architecture correction — no dotnet SDK on this box, and the proven WinMAX helper uses RAW System.Windows.Automation (not FlaUI). So the production driver is PowerShell-native raw-UIA (cimco-sim-drive.ps1 + ui-map FSM), functionally equiv to compiled C# but no build step — runs here today. Brittleness was fixed-sleeps, not language; fix = wait-for-control-enabled + retry-invoke + re-probe-confirm FSM. Operator option: provision .NET SDK for a compiled PrismCimcoUI.exe clone. Spec A3 added.
```

## Files touched (5)
- scripts/account-switch-restart-coordinator.mjs               | 139 ++++++++++++++++++++++++++++--
- scripts/account-switch-restart-coordinator.test.mjs          | 150 +++++++++++++++++++++++++++++++++
- state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.html |   8 +-
- state/shared/specs/CIMCO-SPINE2-LIVESIM-PLAN-2026-06-04.md   |   9 +-
- 4 files changed, 295 insertions(+), 11 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5cf1a88ed74d`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._