# ECHO-WINMAX/U-WINMAX-UI-CLICKXY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICKXY: click-xy op solves the non-UIA TOOL TYPE dropdown

**Commit:** `1d3962351a7c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T22:35:19-05:00
**Tags:** echo-winmax, u-winmax-ui-clickxy, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICKXY: click-xy op solves the non-UIA TOOL TYPE dropdown

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICKXY: click-xy op solves the non-UIA TOOL TYPE dropdown

Adds a window-relative raw-coordinate click op to the WinMax UI driver, which
SOLVES the last blocker to autonomous tool definition: the TOOL TYPE dropdown
exposes no UIA node, so set-value/type-into could not touch it.

PROVEN LIVE end-to-end:
- click-xy the dropdown arrow (winRel ~598,179) -> the list OPENS.
- click-xy FACE MILL -> it selects and the GEOMETRY fields appear.
- a FACE MILL tool is created in the TOOL AND MATERIAL DATABASE.

Design:
- Coords are WINDOW-RELATIVE (match the screenshot crop space) + the live window
  origin is added, so it is robust to the window moving (it moved to x=1713 / a
  2nd monitor this session and click-xy handled it).
- Validated inside the window rect (never clicks another app), --allow-actions
  gated, handled before element Locate.
- SAFETY (review P1 fixed): click-xy REFUSES the right-edge softkey band
  (x >= width-210) so action/run softkeys go through the safe sendkeys "{Fn}"
  path. Proven: click-xy 1600,200 refused.

Independent review PASS (P0 none; P1 softkey-motion-bypass fixed; P2 terminology).
Findings documented in macros/README + winmax-ui-map.json: TOOL TYPE list order,
GEOMETRY field ids (CUTTING DIAMETER=303, LENGTH OF CUT CAL=314, TOOL LENGTH
CAL=315, CUTTING EDGES=324), and the FIELD-COMMIT RULE: terminate geometry fields
with {TAB}, NOT {ENTER} ({ENTER} = save+exit before the value commits; typed dia
2.0 saved as 0.0000). Next: TAB-terminated entry variant, fill T1-T4, set G54,
reload clean NC, Graphics Verify.
```

## Files touched (4)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs         | 33 +++++++++++++++++++++++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/macros/README.md   | 40 ++++++++++++++++++++++++++++++----------
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/winmax-ui-map.json |  6 ++++--
- 3 files changed, 67 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1d3962351a7c`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._