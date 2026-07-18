# SYSTEM-VIZ/U-VIZ-MERGE-GUARD-OOM — [MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-GUARD-OOM (slot:sierra): +2 regression tests for countGraphArrayStreaming string-escape/unbalanced-brace (reviewer-B P2)

**Commit:** `757456eaae97` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:55:02-05:00
**Tags:** system-viz, u-viz-merge-guard-oom, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-GUARD-OOM (slot:sierra): +2 regression tests for countGraphArrayStreaming string-escape/unbalanced-brace (reviewer-B P2)

## Body
```
[MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-GUARD-OOM (slot:sierra): +2 regression tests for countGraphArrayStreaming string-escape/unbalanced-brace (reviewer-B P2)

Test-only. Closes the convergent P2 from the 3-of-3 on 6884155fb6 (reviewer B,
echoed by A+C): the byte-walk's subtlest logic (inStr tracking + BACKSLASH-skip)
was correct but untested. Adds: (1) escaped quotes/backslashes + in-string
{}[], in string elements; (2) UNBALANCED braces/brackets inside string elements
must not corrupt depth. Both via JSON.stringify (valid escaping). 20/20 graph-io.
```

## Files touched (2)
- scripts/lib/graph-io.test.mjs | 38 ++++++++++++++++++++++++++++++++++++++
- 1 file changed, 38 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 757456eaae97`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._