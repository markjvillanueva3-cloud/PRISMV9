# CIMCO-INTEGRATION-MS0/U-CIMCO-SETUP-PAGES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SETUP-PAGES (slot:echo): map all 23 CIMCO Setup pages via Win32 TreeView nav (no MSAA)

**Commit:** `2322f566b335` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T10:28:39-05:00
**Tags:** cimco-integration-ms0, u-cimco-setup-pages, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SETUP-PAGES (slot:echo): map all 23 CIMCO Setup pages via Win32 TreeView nav (no MSAA)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-SETUP-PAGES (slot:echo): map all 23 CIMCO Setup pages via Win32 TreeView nav (no MSAA)

New --op setup-pages: opens the Setup #32770 (--pre 'Configure Machine Type'), finds it + its SysTreeView32 (foreground-preferred), walks every tree page by HTREEITEM handle (TVM_GETNEXTITEM -- opaque handles via SendMessage, NO cross-process struct marshaling/ReadProcessMemory), selects each (TVM_SELECTITEM) + Win32-enumerates the page's VISIBLE controls (active-page isolation). The only MSAA touch is the pre-existing --pre FireControl.

LIVE-VALIDATED twice (exit 0, 23 pages, distinct per-page control counts proving page isolation). KEY FINDINGS: page 10 'Backplot Setup' = machine/sim config (Control Type cid 14641, Machine setup, Turning configuration list cid 14582); page 22 'Select plugins' = add-on toggles incl 'Disable advanced simulation' cid 14016 (the definitive Task#3 control). Maps the operator's full 'go through every setting' surface + locates machine-load + add-on-verify targets.

Per-file 2-arm scrutiny PASS (0 P0). Reviewer P1/P2 fixes applied: GetForegroundWindow tie-break (bind the RIGHT #32770), pagesTruncated fail-loud flag, re-select root after walk (neutral attach-mode), chrome-in-every-page doc.
```

## Files touched (3)
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/PrismCimcoUI.exe | Bin 27136 -> 30208 bytes
- mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/Program.cs       | 114 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 114 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2322f566b335`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._