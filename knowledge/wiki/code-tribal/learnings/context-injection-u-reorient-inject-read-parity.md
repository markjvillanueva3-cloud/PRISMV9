# CONTEXT-INJECTION/U-REORIENT-INJECT-READ-PARITY — [MAIN-FORCE] [CONTEXT-INJECTION]/U-REORIENT-INJECT-READ-PARITY (slot:zulu): close the last fail-open read in the reorientation pair -- inject now passes through on an exists-but-unreadable state file instead of synthesizing+saving over capture's anchors (a3e6d3ca97 clobber class; scrutiny arm-B P2 from U-MIDTURN-WORKINGSET). Mirrors capture's {state,unreadable} contract. E2E revert-canary: torn state file stays byte-identical through the real CLI (fails pre-fix). 37/37 tests.

**Commit:** `b5d445b9b568` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T11:00:44-05:00
**Tags:** context-injection, u-reorient-inject-read-parity, auto-distilled

## Subject
[MAIN-FORCE] [CONTEXT-INJECTION]/U-REORIENT-INJECT-READ-PARITY (slot:zulu): close the last fail-open read in the reorientation pair -- inject now passes through on an exists-but-unreadable state file instead of synthesizing+saving over capture's anchors (a3e6d3ca97 clobber class; scrutiny arm-B P2 from U-MIDTURN-WORKINGSET). Mirrors capture's {state,unreadable} contract. E2E revert-canary: torn state file stays byte-identical through the real CLI (fails pre-fix). 37/37 tests.

## Body
```
[MAIN-FORCE] [CONTEXT-INJECTION]/U-REORIENT-INJECT-READ-PARITY (slot:zulu): close the last fail-open read in the reorientation pair -- inject now passes through on an exists-but-unreadable state file instead of synthesizing+saving over capture's anchors (a3e6d3ca97 clobber class; scrutiny arm-B P2 from U-MIDTURN-WORKINGSET). Mirrors capture's {state,unreadable} contract. E2E revert-canary: torn state file stays byte-identical through the real CLI (fails pre-fix). 37/37 tests.
```

## Files touched (3)
- .claude/hooks/__tests__/session-reorient-capture.test.mjs | 19 +++++++++++++++++++
- .claude/hooks/session-reorient-inject.mjs                 | 24 +++++++++++++++++++++---
- 2 files changed, 40 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b5d445b9b568`
- Milestone envelope: `mcp-server/data/milestones/CONTEXT-INJECTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._