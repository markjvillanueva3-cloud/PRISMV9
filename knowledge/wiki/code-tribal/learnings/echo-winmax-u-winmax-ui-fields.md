# ECHO-WINMAX/U-WINMAX-UI-FIELDS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-FIELDS: SOLVED WinMax field entry — autonomous tool-define PROVEN end-to-end

**Commit:** `41860eb20666` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T23:33:14-05:00
**Tags:** echo-winmax, u-winmax-ui-fields, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-FIELDS: SOLVED WinMax field entry — autonomous tool-define PROVEN end-to-end

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-FIELDS: SOLVED WinMax field entry — autonomous tool-define PROVEN end-to-end

Supersedes the "SendInput is next" note in U-WINMAX-UI-TYPERAW. NO new code needed —
the existing ops compose into the working recipe. WinMax fields are an EDIT-MODE
model: a field accepts digits only after a click-xy puts it in edit mode (status
line prompts "Enter tool diameter."); auto-focus / {TAB} is NOT edit mode.

PROVEN per-field recipe (existing ops, all committed):
  1. click-xy <field winRel x,y>   -> edit mode (clears field for replacement)
  2. type-raw "<digits>"           -> digits land (no ^a, no SetFocus)
  3. type-raw "{ENTER}"            -> COMMITS + advances to next field
then {F8} EXIT saves the tool to the database.

PROVEN END-TO-END LIVE: a FACE MILL saved to the TOOL & MATERIAL DATABASE with
DIAMETER 2.0000, LENGTH OF CUT 0.5000, TOOL LENGTH 2.0000, CUTTING EDGES 5 —
verified persisted in the list. The entire autonomous tool-definition path
(F1 ADD TOOL -> click-xy dropdown+type -> per-field recipe -> F8 save) now works.

Why earlier methods failed (all ruled out + documented): ^a = form-exit
accelerator; SendKeys digits ignored without edit-mode; UIA set-value writes
display-only (discarded on next interaction). README has the FACE MILL geometry
field positions + the full recipe.

REMAINING (next session, all mechanical now): define T2-T4 (END MILL/END MILL/
DRILL - re-probe each type's geometry form); clean up 2 junk FACE MILL (dia 0)
rows; determine how the program's T1-T4 NUMBERS link to the DB tools (does this
clear "TOOL 1 NOT DEFINED"?); set G54; reload clean NC; Graphics Verify.
```

## Files touched (2)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/macros/README.md | 21 +++++++++++++++------
- 1 file changed, 15 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 41860eb20666`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._