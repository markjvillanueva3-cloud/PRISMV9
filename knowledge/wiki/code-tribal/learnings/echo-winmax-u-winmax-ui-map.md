# ECHO-WINMAX/U-WINMAX-UI-MAP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-MAP: WinMax UI as a navigable FSM (whereami + BFS pathfinder)

**Commit:** `767ded8e40ea` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T22:17:49-05:00
**Tags:** echo-winmax, u-winmax-ui-map, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-MAP: WinMax UI as a navigable FSM (whereami + BFS pathfinder)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-WINMAX-UI-MAP: WinMax UI as a navigable FSM (whereami + BFS pathfinder)

Pre-maps the WinMax controller GUI as a finite state machine so the autonomous
post-test harness navigates deterministically + vision-free instead of blind
screenshot-guessing (the class of bug that got us lost into Tagged Blocks this
session and burned ~40k-token full screenshots to ask "where am I").

Key design fact: WinMax screen headers are GRAPHICAL (0 UIA Text nodes), so a
screen is fingerprinted by its probe SIGNATURE - the Edit field-id set (minus
StatusBar.* chrome) + List/ListItem presence. Field-less menu screens share an
empty signature and are disambiguated by their softkey labels (vision, once).

Files:
- winmax-ui-map.json - seed map: 7 screens (ISNC editor, Tagged Blocks, Input
  menu, Part Setup, Tool Setup form, Tool Database, Add-Tool form) with softkeys,
  field-id signatures, observed transitions, and the unmapped-gaps list.
- scripts/winmax-ui-map.mjs - engine. Pure core: signatureOf / fingerprint /
  matchScreen (confident | ambiguous+candidates | unknown) / disambiguateBySoftkeys
  / shortestPath (BFS). Live: whereami, navigate (PER-STEP verified - exact match
  continues, ambiguous landing is vision-confirmed via a tiebreak callback or HALTS
  with needsTiebreak, any other landing = drift = STOP), record-screen, record-transition.
- scripts/winmax-ui-map.test.mjs - 22 tests, real assertions vs the seed map.
- scripts/vitest.config.mjs - makes the scripts/ *.test.mjs suite runnable (the
  root config only includes src/__tests__).

Proven live: whereami correctly narrowed 7 screens to the 5 field-less candidates
with their softkey labels for a one-shot tiebreak. Independent review PASS; 4 P1s
fixed (rubber-stamped ambiguous arrival -> halt/vision-confirm; robust multi-line
JSON parse; sendkeys exit-code check; named DRIVER_TIMEOUT_MS). 22/22 green.

Next: record-screen the real TOOL_DATABASE probe (seeded hasList from vision; an
empty list may not emit a UIA List node), map a clean route into TOOL_DATABASE,
then GRAPHICS_VERIFY / WORK_OFFSETS / PROGRAM_MANAGER screens.
```

## Files touched (5)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/winmax-ui-map.json |  87 +++++++++++++++++++++++++++
- scripts/vitest.config.mjs                                                   |  14 +++++
- scripts/winmax-ui-map.mjs                                                   | 331 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/winmax-ui-map.test.mjs                                              | 187 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 619 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 767ded8e40ea`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._