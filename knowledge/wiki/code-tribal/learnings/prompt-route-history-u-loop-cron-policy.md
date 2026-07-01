# PROMPT-ROUTE-HISTORY/U-LOOP-CRON-POLICY — [MAIN-FORCE] [PROMPT-ROUTE-HISTORY]/U-LOOP-CRON-POLICY (slot:alpha): per-class loop/cron escalation policy, surfaced in the live route inject

**Commit:** `5b5bdb830a3b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T15:29:16-05:00
**Tags:** prompt-route-history, u-loop-cron-policy, auto-distilled

## Subject
[MAIN-FORCE] [PROMPT-ROUTE-HISTORY]/U-LOOP-CRON-POLICY (slot:alpha): per-class loop/cron escalation policy, surfaced in the live route inject

## Body
```
[MAIN-FORCE] [PROMPT-ROUTE-HISTORY]/U-LOOP-CRON-POLICY (slot:alpha): per-class loop/cron escalation policy, surfaced in the live route inject

loopCron {loop,cron} on all 12 TASK_CLASS_POLICY classes; renderLoopCronLine surfaces a compact loop/cron line only when worthwhile (knob PRISM_LOOP_CRON_INJECT, backward-compat). Serves the operator's harnessed-loops/crons directive. Snapshot regenerated 12/12. 21 tests; both 2-arm scrutiny PASS (1 P2 stale-snapshot fixed here). E2E: build->LOOP, locate->silent, knob-off->suppressed.
```

## Files touched (5)
- .claude/hooks/prompt-route-inject.mjs      | 27 +++++++++++++++++++++++++--
- .claude/hooks/prompt-route-inject.test.mjs | 41 ++++++++++++++++++++++++++++++++++++++++-
- scripts/lib/feature-routing-graph.mjs      | 12 ++++++++++++
- state/shared/feature-routing-graph.json    | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------
- 4 files changed, 137 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5b5bdb830a3b`
- Milestone envelope: `mcp-server/data/milestones/PROMPT-ROUTE-HISTORY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._