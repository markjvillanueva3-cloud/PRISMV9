# SELF-COMPACT-MS0/U-SELFCOMPACT-TESTPIN — [MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-TESTPIN (slot:alpha): strengthen multi-pane safety test per 3-of-3 arm B P1

**Commit:** `f97c2b299f20` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T00:45:54-05:00
**Tags:** self-compact-ms0, u-selfcompact-testpin, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-TESTPIN (slot:alpha): strengthen multi-pane safety test per 3-of-3 arm B P1

## Body
```
[MAIN-FORCE] [SELF-COMPACT-MS0]/U-SELFCOMPACT-TESTPIN (slot:alpha): strengthen multi-pane safety test per 3-of-3 arm B P1

Arm B (mutation-tested) found test 17 (multi-pane tab -> fallback) was outcome-only: it used the all-MISS deps, so an unsafe fall-through still yielded hwnd:null and the test passed for the wrong reason (MUTATION: adding ok-bad-pane-count to UIA_FALLTHROUGH_ERRORS survived it). Production code was already safe; this pins it. Now arms every lower tier to RETURN a window (hwnd:999) + asserts touched===false, mirroring the ambiguous-tab test (test 16) -- so any regression that lets a multi-pane WT tab fall through to title/pid resolution now fails. 24/24 tests still green.
```

## Files touched (2)
- scripts/self-compact.test.mjs | 13 +++++++++++--
- 1 file changed, 11 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till yielded hwnd:null and the test passed for the wrong reason (MUTATION: adding ok-bad-pane-count to UIA_FALLTHROUGH_ERRORS survived it). Production code was already safe; this pins it. Now arms every lower tier to RETURN a window (hwnd:999) + asserts touched===false, mirroring the ambiguous-tab test (test 16) -- so any regression that lets a multi-pane WT tab fall through to title/pid resolution n
- till green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f97c2b299f20`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._