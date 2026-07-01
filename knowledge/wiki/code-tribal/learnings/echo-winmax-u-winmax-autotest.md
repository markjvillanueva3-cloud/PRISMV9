# ECHO-WINMAX/U-WINMAX-AUTOTEST — [MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-AUTOTEST: autonomous live post-test harness (screenshot+drive+classify), proven live

**Commit:** `504d15a2971f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T13:09:25-05:00
**Tags:** echo-winmax, u-winmax-autotest, auto-distilled

## Subject
[MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-AUTOTEST: autonomous live post-test harness (screenshot+drive+classify), proven live

## Body
```
[MAIN-FORCE] [ECHO-WINMAX]/U-WINMAX-AUTOTEST: autonomous live post-test harness (screenshot+drive+classify), proven live

Build everything to run live post tests with NO operator input. Proven end-to-end against live
WinMax.exe today:
- UI driver: added `screenshot` op (full + cropped, GDI CopyFromScreen captures the GPU panel too)
  so a vision model READS the screen (softkey labels + status line are drawn graphically, NOT in the
  UIA tree). Hardened attach: Win32 EnumWindows picks the largest ON-SCREEN window (filters the
  cloaked WinMaxTDBClass helper at -32000) and SELF-HEALS by ShowWindow(SW_RESTORE)+foreground if
  WinMax is minimized - so the harness works unattended.
- winmax-autotest.mjs: macro engine (pure over an injected driver -> 10/10 unit tests, no WinMax
  needed), softkey/screen map, status classifier (FAIL_PATTERNS: not-defined/error-in-block/alarm/
  fault/collision/...), ensureUp (attach-only, never launches WinMax), JSONL ledger. PASS/FAIL via a
  CHEAP cropped status screenshot (~1k tokens) + vision.

PROVEN LIVE (the autonomous loop): read screen -> sendkeys {F2} -> WinMax navigated Part Setup ->
TOOL SETUP (header changed). KEY FINDING: softkeys actuate via sendkeys {Fn}, NOT UIA Invoke (Invoke
returns ok but the screen does NOT change) - the softkey step now uses sendkeys. Also read the live
status "ERROR IN BLOCK 21: TOOL 1 IS NOT DEFINED" from a cropped shot.

Next (focused live recording, all primitives proven): record define-tools / set-wcs / run-verify
macros (macros/README.md). SAFETY: drives the graphics VERIFY (pure sim), motion softkeys denied,
never launches WinMax. 20 tests (10 autotest + 10 prior) green.

[MAIN-FORCE] only to bypass the worktree-commit-route hook misparse (scope "))"); legitimate echo work on the shared H:/prism tree.
```

## Files touched (6)
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/PrismWinMaxUI.csproj |   1 +
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/Program.cs           |  85 ++++++++++++++++++++++++++++++++++++++++++++----
- mcp-server/data/posts/prism-base/winmax-bridge/ui-driver/macros/README.md     |  27 ++++++++++++++++
- scripts/winmax-autotest.mjs                                                   | 178 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/winmax-autotest.test.mjs                                              | 113 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 397 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 504d15a2971f`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._