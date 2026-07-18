# FLEET-LOOP-AUTOMATION/U-REBLOCK-STORM-BREAKER — [MAIN-FORCE] [FLEET-LOOP-AUTOMATION]/U-REBLOCK-STORM-BREAKER (slot:xray): halt re-block storm on operator decision-wait

**Commit:** `1bc709c145dd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T11:41:36-05:00
**Tags:** fleet-loop-automation, u-reblock-storm-breaker, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-LOOP-AUTOMATION]/U-REBLOCK-STORM-BREAKER (slot:xray): halt re-block storm on operator decision-wait

## Body
```
[MAIN-FORCE] [FLEET-LOOP-AUTOMATION]/U-REBLOCK-STORM-BREAKER (slot:xray): halt re-block storm on operator decision-wait

The endless-tick bug (operator 2026-06-18): when the chat re-blocks Stop with no
productive work -- e.g. waiting on an operator decision, emitting text-only turns
-- the unlimited CLAUDE_CODE_STOP_HOOK_BLOCK_CAP (set for unbounded PRODUCTIVE
loops) left no harness valve, so a rogue Stop hook that ignores stop_hook_active
re-blocked forever. The chat ticked hundreds of times waiting for a human.

Fix: stop-reblock-storm-breaker.mjs, wired FIRST in the Stop chain. It keeps
productive loops unbounded (an active /loop or any tool-call turn resets the
counter) but HALTS via {continue:false} (which overrides any later decision:block)
after N consecutive TEXT-ONLY re-blocks with no active loop -- the unmistakable
signature of a decision-wait / idle storm. Per-session counter; fail-soft
(any error -> continue:true). Distinguishes storm from loop by the one reliable
signal: productive turns make tool calls, storms are text-only.

16/16 node:test (decideBreak truth table + transcript tail-parse + adversarial
NaN/threshold + storm-scenario E2E). Live-proven: 3 synthetic storm fires ->
fire 3 emits continue:false. Knobs: PRISM_REBLOCK_STORM_{DISABLE,THRESHOLD,VERBOSE}.
Sibling of [[feedback_unbreakable_loop_break]].
```

## Files touched (3)
- .claude/hooks/__tests__/stop-reblock-storm-breaker.test.mjs | 142 +++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/stop-reblock-storm-breaker.mjs                | 211 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 353 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1bc709c145dd`
- Milestone envelope: `mcp-server/data/milestones/FLEET-LOOP-AUTOMATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._