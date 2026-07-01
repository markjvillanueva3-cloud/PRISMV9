# ECHO-WINMAX/U-WINMAX-UI-MAXIMIZE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-MAXIMIZE: maximize op (stable known layout) + per-program TOOL TYPE findings

**Commit:** `438b14a0228a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T00:25:19-05:00
**Tags:** echo-winmax, u-winmax-ui-maximize, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-MAXIMIZE: maximize op (stable known layout) + per-program TOOL TYPE findings

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-MAXIMIZE: maximize op (stable known layout) + per-program TOOL TYPE findings

Adds a `maximize` op (ShowWindow SW_MAXIMIZE on the window handle, ungated — benign +
reversible, no input injection / machine motion) so click-xy coords have a STABLE
known layout instead of drifting when the operator resizes the window. Returns the
new window bounds. PROVEN: maximized WinMax to 3456x1408 (dual-monitor).

Finding: WinMax forms are FIXED-WIDTH + left-aligned, so the form fields sit at the
SAME window-relative positions regardless of window size — confirming `click <id>`
(UIA live-rect, U-WINMAX-UI-CLICKID) is the right resize-robust approach for fields,
and click-xy coords for the (left-aligned) form area are stable across resizes.

OPEN PUZZLE (the remaining blocker to clear "TOOL 1 IS NOT DEFINED"): the PER-PROGRAM
TOOL SETUP form's TOOL TYPE dropdown resists ALL programmatic methods tried — arrow
click only FOCUSES it (doesn't open the list, unlike the DATABASE add-tool dropdown
which DID open on arrow-click), {DOWN} moves to the next field, type-ahead "F" is a
no-op. Setting DIAMETER + CAL via the click<id> recipe works but auto-sets
TYPE=UNKNOWN / LOCATION=Manual, and the error persists (a real TYPE is required).
HYPOTHESIS: the per-program tool must be LINKED to a DATABASE tool (where types are
real), not manually typed — likely via a softkey (F4 TOOL OFFSETS? or more softkeys
F5-F8 not yet seen) or the WinMax-manual-documented Tool Setup flow. NEXT SESSION:
read resources/winmax-docs WinMax Mill User Guide "Tool Setup" / "Part Fixturing and
Tool Loading" section to find the program<->database tool link, then set TYPE=FACE
MILL for T1-T4, set G54, reload clean NC, Graphics Verify.

8th driver capability this session. All field/navigation primitives proven; the
remaining work is the WinMax tool-management ORCHESTRATION (program-tool linkage).
```

## Files touched (2)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs | 10 ++++++++++
- 1 file changed, 10 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 438b14a0228a`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._