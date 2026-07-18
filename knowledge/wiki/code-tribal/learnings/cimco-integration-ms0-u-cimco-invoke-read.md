# CIMCO-INTEGRATION-MS0/U-CIMCO-INVOKE-READ — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-INVOKE-READ (slot:echo): single-process sim-run+report-read C# op -- solves the live-read blocker

**Commit:** `40cf2e0d3b26` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T20:28:12-05:00
**Tags:** cimco-integration-ms0, u-cimco-invoke-read, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-INVOKE-READ (slot:echo): single-process sim-run+report-read C# op -- solves the live-read blocker

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-INVOKE-READ (slot:echo): single-process sim-run+report-read C# op -- solves the live-read blocker

BLOCKER 1 SOLVED. PrismCimcoUI.exe gains --op invoke-read --name <ctl> --then <run-ctl>: in ONE process, launch CIMCO -> open Machine Simulation -> fire the Simulate RUN control (so the collision-check ACTUALLY executes -- invoking the sim tab alone left the report empty) -> settle -> read the populated report grid, holding the frame handle throughout. Fixes BOTH the two-process invoke->read attach race AND the collision-run-trigger gap.

PROVEN LIVE on LTH-03/9007405.MIN: {found:true, invokeState:'open=fired;run=fired', container:{name:Report}} -- the populated Report grid (cols Start Time(Line)/Type/Message/Action) read in a single process. Clean program -> header-only (0 findings) -> correctly non-clearing.

- Program.cs: --op invoke-read case + FireControl helper (resolve+MotionDeny+soft Join timeout, no Environment.Exit -- a running-sim modal is expected) + ReportEnvelope optional invokeState field (existing read-report callers byte-identical). 'Simulate' clears MotionDeny (virtual run, not a physical-machine write).
- cimco-fleet-drive.mjs: driveMachine rewired to the single invoke-read call (one launch/process).
- REMAINING: golf fleet-reaper kills the long node driver mid-sweep (node-orphan-cleaner reaps the ~125s/machine drive) -- single machine via exe works; all-15 unattended needs reaper exemption. NOT a code bug.
```

## Files touched (5)
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe | Bin 22528 -> 24576 bytes
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/Program.cs       |  91 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/cimco-fleet-drive.mjs                                            |  33 ++++++++++++++++-----------------
- state/shared/cimco/CIMCO-CLOSED-LOOP-STATUS-2026-06-09.md                |  10 +++++-----
- 4 files changed, 109 insertions(+), 25 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 40cf2e0d3b26`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._