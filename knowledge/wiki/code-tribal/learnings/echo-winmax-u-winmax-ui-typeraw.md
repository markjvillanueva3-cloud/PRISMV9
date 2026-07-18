# ECHO-WINMAX/U-WINMAX-UI-TYPERAW — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-TYPERAW: type-raw op + FULL field-input diagnosis (SendInput is next)

**Commit:** `e55e3403d0f3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T23:27:03-05:00
**Tags:** echo-winmax, u-winmax-ui-typeraw, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-TYPERAW: type-raw op + FULL field-input diagnosis (SendInput is next)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-TYPERAW: type-raw op + FULL field-input diagnosis (SendInput is next)

Adds a `type-raw` op (SendKeys with NO SetFocus, NO click, NO ^a — types into the
currently-focused control verbatim) and, more importantly, captures the COMPLETE
systematic diagnosis of WinMax field input, which rules out every synthesized
method and points to the answer.

Field-input findings (ADD-TOOL geometry form, all proven live):
- ^a is a WinMax FORM-EXIT ACCELERATOR (not select-all) — it closes the form
  before the value types. Never send ^a to a WinMax form.
- SendKeys digit input (WM_CHAR) does NOT register in WinMax custom numeric
  fields — via type-into, type-tab, or type-raw. {TAB} navigation and {Fn}
  softkeys DO work via SendKeys.
- UIA set-value (ValuePattern.SetValue) writes the field DISPLAY (CUTTING
  DIAMETER showed 2.0) but WinMax discards it on the next interaction — only the
  last set-value lingers; set-value+{TAB} does not commit (all reverted to 0).

CONCLUSION: WinMax fields honor only REAL key events. NEXT (fresh session): build
a `type-hw` op using Win32 SendInput/keybd_event with hardware SCANCODES for
digits + decimal, type each geometry field, then {F8} to save; validate one field
sticks through F8 before T1-T4. Cheap alt to check first: whether typed digits go
to a calculator-style entry/echo line that {ENTER} commits.

Full recipe + field ids + the TAB order are in ui-driver/macros/README + the
handoff. Junk FACE MILL rows (dia 0) accumulated from the proof runs — clean up
once the input method is cracked. type-tap/type-into remain correct primitives
for STANDARD WinForms fields elsewhere; they just can't drive WinMax's custom fields.
```

## Files touched (3)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs       | 12 ++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/macros/README.md | 26 ++++++++++++++++++++------
- 2 files changed, 32 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e55e3403d0f3`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._