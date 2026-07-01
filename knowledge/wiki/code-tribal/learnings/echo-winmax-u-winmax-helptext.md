# ECHO-WINMAX/U-WINMAX-HELPTEXT — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-HELPTEXT: probe/find read tooltips + settle the vision boundary

**Commit:** `fe6f720ac9c5` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T01:19:13-05:00
**Tags:** echo-winmax, u-winmax-helptext, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-HELPTEXT: probe/find read tooltips + settle the vision boundary

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-HELPTEXT: probe/find read tooltips + settle the vision boundary

Extend PrismWinMaxUI driver with SafeHelp(el) -> AutomationElement.HelpText; probe nodes +
actionable controls + find matches now carry helpText. find now matches on tooltip too.

Decisive finding (vision-free boundary settled): the DS WinMax console-key toolbar buttons
(Item 32972-33005, incl. Draw) are NOT in the UIA accessibility tree — no Name, no HelpText.
`find "draw"` returns []. So Draw is a GENUINE vision touch-point (same class as the graphical
status line + icon dropdowns), not a mapping gap we failed to fill. winmax-courses.json
draw-trigger candidates updated: one-time coordinate calibration of the Draw button on the
fixed maximized layout, then click-xy forever; or a keyboard accelerator if the manual has one.

Net: ~95% of WinMax drives vision-free (FSM nav + UIA fields/reads); the ~5% graphical
console/status elements are the documented exception. HelpText extraction still nets capability
for any screen that DOES expose tooltips.
```

## Files touched (3)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs | 19 ++++++++++++++-----
- mcp-server/data/posts/prism-base/winmax-bridge/winmax-courses.json  |  2 +-
- 2 files changed, 15 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till nets capability

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fe6f720ac9c5`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._