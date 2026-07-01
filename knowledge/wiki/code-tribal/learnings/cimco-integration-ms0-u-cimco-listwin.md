# CIMCO-INTEGRATION-MS0/U-CIMCO-LISTWIN — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-LISTWIN (slot:echo): crash-safe Win32 list-windows recon op + settings-surface discovery

**Commit:** `39508c2774ae` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T09:02:40-05:00
**Tags:** cimco-integration-ms0, u-cimco-listwin, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-LISTWIN (slot:echo): crash-safe Win32 list-windows recon op + settings-surface discovery

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-LISTWIN (slot:echo): crash-safe Win32 list-windows recon op + settings-surface discovery

Built --op list-windows: Win32-ONLY enumeration (EnumWindows/EnumChildWindows/GetClassName/GetWindowText/GetDlgCtrlID) that NEVER touches MSAA -> cannot trigger the unmanaged provider AV that crashed read-window (exit 255). --pre fires a control first (gated on --allow-actions), holding a modal open for enumeration.

LIVE-VALIDATED (exit 0, clean JSON, CIMCO + lathe NC 9007405.MIN): firing 'Configure Machine Type' opens the GLOBAL CIMCO Setup property-sheet -- a standard #32770 'Setup: File Types' navigated by SysTreeView32 Tree1 (cid 14000), OK=1/Cancel=2/Default=13902. ~70 settings enumerated with exact cids. MODEL CORRECTION (R12): NOT a blind file-picker -- the entire settings surface is one Win32-drivable #32770; the .mcfg machine bind is a tree page within it. SUPERSEDES the crashed read-window plan.

Per-file 2-arm scrutiny PASS (0 P0). Hardening from review: childrenTruncated flag + 200-child cap, ChildWindowsAll 4000 bound, security comment, op-list doc.
```

## Files touched (4)
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe | Bin 25088 -> 27136 bytes
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/Program.cs       |  76 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md              |  69 ++++++++++++++++++++++++++++++++++-----------------
- 3 files changed, 123 insertions(+), 22 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 39508c2774ae`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._