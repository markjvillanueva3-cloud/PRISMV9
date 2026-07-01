# TOKEN-SAVINGS/U-SUBAGENT-INJECTION-MEASURE-P2 — [MAIN-FORCE] [TOKEN-SAVINGS]/U-SUBAGENT-INJECTION-MEASURE-P2 (slot:alpha): scrutiny P2 comment-accuracy fixes

**Commit:** `0693e28ef0a7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T20:39:04-05:00
**Tags:** token-savings, u-subagent-injection-measure-p2, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-SUBAGENT-INJECTION-MEASURE-P2 (slot:alpha): scrutiny P2 comment-accuracy fixes

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-SUBAGENT-INJECTION-MEASURE-P2 (slot:alpha): scrutiny P2 comment-accuracy fixes

Both 3-of-3 P2 comment-drift findings (zero logic change):
- SPAWN_TOOL_NAMES comment reworded -- the "Agent" example is the Agent-MATCHER
  hooks gating on the tool name, not "ai-system-router-inject injects" (it emits a
  routing decision/reason, NOT additionalContext, so the context filter excludes it).
- subagent-model-enforce test fixture comment clarified -- the fixture models a
  non-emitting gate to exercise the exclusion path; the LIVE hook emits in warn-mode
  so is probed-but-benign in production.

15/15 tests green, no behavior change. Deferred P2 (handoff): the probe leaves a
pid-namespaced subagent-probe-<pid>.jsonl under state/shared/agent-fanout-pressure/
(harmless, swept by hygiene) because agent-fanout-pressure-gate (a legit context
emitter) records the probe spawn.
```

## Files touched (3)
- scripts/measure-subagent-injection.mjs      | 6 ++++--
- scripts/measure-subagent-injection.test.mjs | 2 +-
- 2 files changed, 5 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0693e28ef0a7`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._