# ECHO-WINMAX/U-WINMAX-UI-CLICKID — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICKID: resize-robust field entry via click <id> (UIA live rect)

**Commit:** `222b4c693d66` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T23:59:17-05:00
**Tags:** echo-winmax, u-winmax-ui-clickid, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICKID: resize-robust field entry via click <id> (UIA live rect)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICKID: resize-robust field entry via click <id> (UIA live rect)

Makes `click <id>` Edit-preferred (like the data-entry ops) so it binds the data
field's LIVE UIA BoundingRectangle center instead of the colliding softkey Button
(id 303 = DIAMETER Edit AND F3 Button). `click` keeps its button fallback and stays
exempt from the data-entry refuse-guard. PROVEN on a RESIZED window: `click 303`
hit the DIAMETER field at the correct live position and the recipe
`click <id>` -> type-raw "<digits>" -> type-raw "{ENTER}" set DIAMETER 2.0000 +
TOOL CAL LENGTH 2.0000 on the per-program TOOL SETUP form.

WHY THIS MATTERS (window-resize fragility, discovered live): the WinMax window was
resized mid-session from 1734x1399 to 814x686, which RE-LAID-OUT the form and broke
every hardcoded click-xy coordinate. UIA element clicks (`click <id>`) track the
live rect, so they are resize-PROOF. RULE: use `click <id>` for any field that is a
UIA Edit; reserve click-xy (coordinate) ONLY for non-UIA controls (dropdowns), and
read its coords from a FRESH screenshot each time (or maximize the window to a known
size first).

PROGRAM-TOOL LINKAGE (investigated live): defining the per-program TOOL SETUP form's
DIAMETER + CAL LENGTH does NOT clear "TOOL 1 IS NOT DEFINED" while TOOL TYPE stays
"UNKNOWN" (entering a diameter auto-sets TYPE=UNKNOWN, LOCATION=Manual). A REAL tool
TYPE is required. OPEN BLOCKER: the per-program TOOL TYPE dropdown is non-UIA AND, on
the resized window, an arrow-click only FOCUSES it (does not open the list) — unlike
the database ADD-TOOL dropdown which opened on an arrow click in the big window.
NEXT: maximize the window to a known size + re-read the arrow coord, OR find the
per-program dropdown's open mechanism (double-click? a softkey? F4 TOOL OFFSETS?),
then set TYPE=FACE MILL and re-check the error. Then define T2-T4 numbers similarly,
set G54, reload clean NC, Graphics Verify. Full state in the handoff + macros/README.
```

## Files touched (2)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs | 17 ++++++++++-------
- 1 file changed, 10 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 222b4c693d66`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._