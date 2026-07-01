# STOP-HOOK-ACCURACY/U-ARRAY-DISPATCH-DETECT — [MAIN] [STOP-HOOK-ACCURACY]/U-ARRAY-DISPATCH-DETECT (slot:lima): teach stop_on_unwired_assets to recognize array-membership dispatch (FOO_ACTIONS.includes(action) -> sub-engine)

**Commit:** `d30223d5a833` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T17:09:04-05:00
**Tags:** stop-hook-accuracy, u-array-dispatch-detect, auto-distilled

## Subject
[MAIN] [STOP-HOOK-ACCURACY]/U-ARRAY-DISPATCH-DETECT (slot:lima): teach stop_on_unwired_assets to recognize array-membership dispatch (FOO_ACTIONS.includes(action) -> sub-engine)

## Body
```
[MAIN] [STOP-HOOK-ACCURACY]/U-ARRAY-DISPATCH-DETECT (slot:lima): teach stop_on_unwired_assets to recognize array-membership dispatch (FOO_ACTIONS.includes(action) -> sub-engine)

Stop gate falsely flagged 21 machineLiveDispatcher actions (+4 other dispatchers: diagnosis/integration/knowledgeExt/product) as UNHANDLED because checkDispatcherActionHandlers knew only switch-case / lookup-table / object-key handlers, not array-membership dynamic dispatch. Added pure exported findUnhandledActions() with Pattern 4 + URL-aware comment-strip + main()-guard for importability; removed dead git()/execSync. NOT a softening: injected-orphan negative control still caught. 15/15 tests; LIVE machineLive 21->0; 2-reviewer per-file PASS (fixed a P1 false-negative in the comment-strip). Pre-existing objKeyRe over-match logged as Pattern-3 follow-up.

verify: node --test .claude/hooks/__tests__/stop_on_unwired_assets.array-dispatch.test.mjs
```

## Files touched (4)
- .claude/hooks/__tests__/stop_on_unwired_assets.array-dispatch.test.mjs | 182 +++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/stop_on_unwired_assets.mjs                               | 157 ++++++++++++++++++++++++-----------
- CLAUDE.md                                                              |   4 +
- 3 files changed, 295 insertions(+), 48 deletions(-)

## Lessons surfaced in commit body
- till caught. 15/15 tests; LIVE machineLive 21->0; 2-reviewer per-file PASS (fixed a P1 false-negative in the comment-strip). Pre-existing objKeyRe over-match logged as Pattern-3 follow-up.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d30223d5a833`
- Milestone envelope: `mcp-server/data/milestones/STOP-HOOK-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._