# TOKEN-SAVINGS/U-PSN-TAILREAD-CEILING-CORRECT — [MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-TAILREAD-CEILING-CORRECT (slot:alpha): 8MB->64MB -- prior commit's '~2.2MB largest' claim was FALSE (3-of-3 FAIL)

**Commit:** `e013cef6b9dc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T01:29:58-05:00
**Tags:** token-savings, u-psn-tailread-ceiling-correct, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-TAILREAD-CEILING-CORRECT (slot:alpha): 8MB->64MB -- prior commit's '~2.2MB largest' claim was FALSE (3-of-3 FAIL)

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-TAILREAD-CEILING-CORRECT (slot:alpha): 8MB->64MB -- prior commit's '~2.2MB largest' claim was FALSE (3-of-3 FAIL)

The 3-of-3 on 54f0b2d7a8 correctly FAILED: I claimed '8MB covers every live
ledger (largest ~2.2MB)' WITHOUT enumerating state/shared/dashboards/ -- where
pre-tool-savings-multi.jsonl is 13.2MB. The 8MB cap still truncated it (~39% /
57,616 lines dropped -> totals.nudges under-reported 2795 vs real 4471). That was
an R12 false-coverage claim + a half-fixed windowing bug (the exact class the unit
set out to kill), and an 'enumerate-before-read' miss on my part.

Correction (verified full enumeration of all 6 SOURCES ledgers): largest is
pre-tool-savings-multi 13.2MB, then prompt-rewrites 2.2MB, rtk-adoption 1.9MB.
- MAX_READ_BYTES 8MB -> 64MB: a real crash-guard ceiling ~5x the verified largest.
- Honest comment: cites the REAL sizes, frames 64MB as a crash-guard (not a routine
  window), and DISCLOSES (does not claim solved) that 4 of 6 ledgers are unpruned ->
  grow unbounded -> the proper fix is incremental/offset aggregation (deferred unit).
- tailRead boundary-aligned edge (arm B P2): only strip the leading fragment when
  the slice began MID-line (buf[start-1] !== '\n'); a boundary-aligned slice keeps
  its first complete line.
+2 tests (boundary-aligned-keep + INTEGRATION: a >8MB ledger fully counted through
aggregateSavings -- the test that would have caught the 13.2MB miss); 6/6. LIVE
after: pre-tool-savings-multi 87024->144661 lines, totals.nudges 2795->4471.
```

## Files touched (3)
- .claude/hooks/__tests__/stop-psn-savings-aggregate.test.mjs | 47 +++++++++++++++++++++++++++++++++++++++++++++--
- .claude/hooks/stop-psn-savings-aggregate.mjs                | 50 ++++++++++++++++++++++++++++++++++----------------
- 2 files changed, 79 insertions(+), 18 deletions(-)

## Lessons surfaced in commit body
- till truncated it (~39% /

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e013cef6b9dc`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._