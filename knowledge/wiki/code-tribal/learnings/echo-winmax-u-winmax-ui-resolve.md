# ECHO-WINMAX/U-WINMAX-UI-RESOLVE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-RESOLVE: fix AutomationId-collision element resolution + safety guards

**Commit:** `bd5cb8ca012b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T21:48:00-05:00
**Tags:** echo-winmax, u-winmax-ui-resolve, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-RESOLVE: fix AutomationId-collision element resolution + safety guards

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-RESOLVE: fix AutomationId-collision element resolution + safety guards

Root cause of the 2026-05-30 type-into bug was NOT a click coordinate error.
WinMax reuses one AutomationId across control kinds on a screen - id 303 is
BOTH the F3 softkey Button and the DIAMETER Edit; a bare FindFirst returned the
button, so a data-entry op drove a softkey and navigated the UI.

Three layered fixes in PrismWinMaxUI Program.cs - compiled 0/0, proven live
[type-into 303 now clicks the real field at 237,317 with focusVerified true,
vs the old 1621,262 softkey]:
- Edit-preferred Locate: data ops pass ControlType.Edit so AndCondition binds
  the field, not the colliding button. Generic button/menu lookups unchanged.
- Non-editable refuse guard: set-value/type-into refuse if the resolved element
  is not Edit/ComboBox/Document - a data op can never actuate a softkey.
- Validated rect-center click + focus gate: drop GetClickablePoint, use the
  live BoundingRectangle center, validate vs the virtual screen, and abort
  type-into if post-click focus lands on a different non-empty id.

3-of-3 scrutiny PASS; 2 P1 findings [virtual-screen off-by-one, unguarded
el.Current.Name] fixed before commit. macros/README updated with the corrected
root cause, the TOOL and MATERIAL DATABASE add-tool flow, and the remaining
non-UIA TOOL TYPE dropdown blocker. Disk NC verified intact [136 lines]; the
loaded WinMax buffer is clobbered and needs reload before verify.
```

## Files touched (3)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs       | 98 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------------
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/macros/README.md | 76 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------------
- 2 files changed, 146 insertions(+), 28 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bd5cb8ca012b`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._