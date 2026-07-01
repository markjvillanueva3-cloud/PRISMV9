# CIMCO-INTEGRATION-MS0/U-CIMCO-COMBO-READ — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-COMBO-READ (slot:echo): read ComboBox selections (cross-process) -- locates the machine-config combos

**Commit:** `1090ae505574` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T12:32:34-05:00
**Tags:** cimco-integration-ms0, u-cimco-combo-read, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-COMBO-READ (slot:echo): read ComboBox selections (cross-process) -- locates the machine-config combos

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-COMBO-READ (slot:echo): read ComboBox selections (cross-process) -- locates the machine-config combos

Extend read-setting to report ComboBox current selection (selIndex + selected text) via CB_GETCURSEL/CB_GETLBTEXTLEN/CB_GETLBTEXT through a SendMessageW+StringBuilder overload (OS-marshaled cross-process -- no ReadProcessMemory). READ-ONLY (proves the cross-process combo marshaling before building combo-WRITE; R13 read-before-write).

LIVE-VALIDATED on Backplot Setup with differentiated real data: Control Type combo cid 14639 = 'Okuma Turning' (idx 30); MACHINE SETUP combo cid 14307 = 'CIMCO Lathe Default (Imperial)' (idx 0, IMPERIAL = JM units-safe); orientation cid 14340. These are the exact combos load-machine must drive.

Per-file 2-arm scrutiny PASS (0 P0). Fixes applied: .ToInt64 LRESULT idiom (match BM_GETCHECK); doc caveat that combo-read is current-selection-only (load-machine writer needs CB_GETCOUNT enumeration to map name->index).
```

## Files touched (3)
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe | Bin 36864 -> 37376 bytes
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/Program.cs       |  28 +++++++++++++++++++++++++++-
- 2 files changed, 27 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1090ae505574`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._