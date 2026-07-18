# CAD-COMPLETE-MS0/U-AI-SCRUTINY-FIX — [MAIN] [CAD-COMPLETE-MS0]/U-AI-SCRUTINY-FIX: remediate 3-of-3 review findings on U-AI-03/09/12

**Commit:** `56c16db549ee` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T12:45:54-05:00
**Tags:** cad-complete-ms0, u-ai-scrutiny-fix, auto-distilled

## Subject
[MAIN] [CAD-COMPLETE-MS0]/U-AI-SCRUTINY-FIX: remediate 3-of-3 review findings on U-AI-03/09/12

## Body
```
[MAIN] [CAD-COMPLETE-MS0]/U-AI-SCRUTINY-FIX: remediate 3-of-3 review findings on U-AI-03/09/12

Independent review of the 4 CAD-agent engines surfaced 3 genuine state-hygiene
defects (the 2 flagged "P0"s were false positives — registerMany exists, switch
matches by value not case position):

- CADAppCircuitBreaker: transition→half_open now resets the success/failure
  streak — a stray success recorded while OPEN could otherwise leak in and
  close the breaker after fewer real trial successes than configured.
- CADAppCircuitBreaker: a half-open trial probe in flight for a full cooldown
  with no recorded outcome is presumed dead and re-opens the breaker, instead
  of wedging it in half_open forever (probe-slot leak).
- RiskTierClassifier: classifyPlan escalates on the COUNT of non-trivial ops,
  not merely the peak — one risky op among trivial cosmetics no longer
  cumulative-blast-escalates the whole plan (matches the documented intent).
- UnitOfMeasure: magnitude-heuristic confidences capped < 0.5 so a consumer
  thresholding on confidence (not just the ambiguous flag) also rejects an
  explicitly-ambiguous unit guess.

+2 circuit-breaker regression tests. 82 tests pass across the 4 suites; tsc clean.
```

## Files touched (5)
- .../src/engines/CADAppCircuitBreakerEngine.test.ts | 205 +++++++++++++++++++++
- .../src/engines/CADAppCircuitBreakerEngine.ts      |  19 ++
- mcp-server/src/engines/RiskTierClassifierEngine.ts |  11 +-
- .../engines/UnitOfMeasureDisambiguationEngine.ts   |  11 +-
- 4 files changed, 239 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 56c16db549ee`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._