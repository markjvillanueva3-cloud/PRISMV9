# FRONTEND-APP/U-Q-VSM-TESTS — [MAIN-FORCE] [FRONTEND-APP]/U-Q-VSM-TESTS (slot:quebec): close stop_on_unwired_assets gate -- 6 more real reference-value tests for ValueStreamMapEngine (5->11, gate needs >=10)

**Commit:** `e951c44dfa12` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T19:12:47-05:00
**Tags:** frontend-app, u-q-vsm-tests, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-VSM-TESTS (slot:quebec): close stop_on_unwired_assets gate -- 6 more real reference-value tests for ValueStreamMapEngine (5->11, gate needs >=10)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-VSM-TESTS (slot:quebec): close stop_on_unwired_assets gate -- 6 more real reference-value tests for ValueStreamMapEngine (5->11, gate needs >=10)

Edge/guard + adversarial coverage (all hand-computed, R9, no stubs):
- variance_pct guarded to 0 (not Infinity) on zero planned time
- scrap_rate_pct guarded to 0 (not NaN) when nothing made yet
- value_added_ratio guarded to 0 (not NaN) when lead time is 0
- both standing R12 honesty caveats present with a board; no false 'board unavailable'
- missing parts_complete/parts_scrapped default to 0, not NaN
- negative variance_pct when an op beats plan (sign correctness) + deterministic generated_at

11/11 pass; test file tsc-clean (2 pre-existing tsc errors are in ReinforcementLearningCAMFeedbackEngine, untouched).
```

## Files touched (2)
- mcp-server/src/__tests__/ValueStreamMapEngine.test.ts | 72 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 72 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e951c44dfa12`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._