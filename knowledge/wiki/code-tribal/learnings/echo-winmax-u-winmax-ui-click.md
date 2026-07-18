# ECHO-WINMAX/U-WINMAX-UI-CLICK — [MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICK: click + type-into ops + tool-setup field map

**Commit:** `71f7f8ed869c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T19:56:29-05:00
**Tags:** echo-winmax, u-winmax-ui-click, auto-distilled

## Subject
[MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICK: click + type-into ops + tool-setup field map

## Body
```
[MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-UI-CLICK: click + type-into ops + tool-setup field map

Live WinMax tool setup. AutomationIds are SCREEN-RELATIVE (id 301 = softkey on Part Setup, the
tool-number field on Tool Setup) so macros re-probe per screen. Tool Setup map: TOOL NUMBER=301
DIAMETER=303 TOOL CAL LENGTH=310 SPEED=322. Mixed entry: TOOL CAL LENGTH accepted UIA set-value
(PROVEN, set 2.0); DIAMETER rejects it and needs click-field+type+Enter. Added click (Win32
SetCursorPos+mouse_event) + type-into ops; a live click landed wrong once (opened the Find box) so
GetClickablePoint needs the window-offset fix (re-probe rect + verify focus by screenshot before
typing). Status stays graphical so PASS/FAIL uses cropped shot + vision. Honest: length entry
proven, diameter/dropdown needs the click-coordinate fix; all primitives present. Findings in
macros/README.md.
```

## Files touched (3)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs       | 30 ++++++++++++++++++++++++++++++
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/macros/README.md |  7 +++++++
- 2 files changed, 37 insertions(+)

## Lessons surfaced in commit body
- wrong once (opened the Find box) so

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 71f7f8ed869c`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._