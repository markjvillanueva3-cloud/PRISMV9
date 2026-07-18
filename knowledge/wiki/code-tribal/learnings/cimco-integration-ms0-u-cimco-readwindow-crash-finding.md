# CIMCO-INTEGRATION-MS0/U-CIMCO-READWINDOW-CRASH-FINDING — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-READWINDOW-CRASH-FINDING (slot:echo): naive read-window crashed (unmanaged MSAA AV) -- reverted, record the hardening requirements

**Commit:** `9a3d782ae51b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:57:42-05:00
**Tags:** cimco-integration-ms0, u-cimco-readwindow-crash-finding, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-READWINDOW-CRASH-FINDING (slot:echo): naive read-window crashed (unmanaged MSAA AV) -- reverted, record the hardening requirements

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-READWINDOW-CRASH-FINDING (slot:echo): naive read-window crashed (unmanaged MSAA AV) -- reverted, record the hardening requirements

Attempted a read-window op (EnumWindows + WalkReport on arbitrary top-levels) to read the About/config dialogs. CRASHED exit 255 (unmanaged MSAA-provider fault on an arbitrary window, uncatchable by managed try/catch). Reverted to keep the driver stable (--pre exe). Hardened design must target a specific dialog hwnd (not walk every match) + defensive COM wrapping + depth/timeout watchdog. Fresh-budget build.
```

## Files touched (2)
- state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md | 8 ++++++++
- 1 file changed, 8 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9a3d782ae51b`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._