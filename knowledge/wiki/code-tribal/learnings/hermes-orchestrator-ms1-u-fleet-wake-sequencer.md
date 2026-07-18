# HERMES-ORCHESTRATOR-MS1/U-FLEET-WAKE-SEQUENCER — [MAIN] [bravo] [HERMES-ORCHESTRATOR-MS1]/U-FLEET-WAKE-SEQUENCER: staggered token-gated fleet wake sequencer

**Commit:** `ae96c9995de8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T08:53:31-05:00
**Tags:** hermes-orchestrator-ms1, u-fleet-wake-sequencer, auto-distilled

## Subject
[MAIN] [bravo] [HERMES-ORCHESTRATOR-MS1]/U-FLEET-WAKE-SEQUENCER: staggered token-gated fleet wake sequencer

## Body
```
[MAIN] [bravo] [HERMES-ORCHESTRATOR-MS1]/U-FLEET-WAKE-SEQUENCER: staggered token-gated fleet wake sequencer

Closes the missing link from the 2026-06-03 ZULU-fleet-control assessment: the
fleet had a working PULL loop (slot-brief delivery) but NO proactive staggered
WAKE with a token-accumulation gate. Stagger chat continuations to avoid
simultaneous account-check API errors; wait until each woken chat starts
accumulating tokens before waking the next.

- scripts/fleet-wake-sequencer.mjs: pure-core (computeWakePlan/classifyAccumulation/
  nextAction) + injected I/O; one slot at a time, gate on transcript growth,
  per-slot timeout skips a dead chat. DRY-RUN default; --apply actuates. Resolves
  by stable PRISM <slot> caption (R12 skip-on-ambiguous). Lockfile single-runner.
- state/shared/active-fleet.json: single source of truth for the 17 active slots.
- 47 node:test cases. 2-arm scrutiny FAIL->fixed->PASS (P0 title, P1 spawn env, P1
  shared-tree transcript).
```

## Files touched (4)
- scripts/fleet-wake-sequencer.mjs      | 533 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/fleet-wake-sequencer.test.mjs | 440 ++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/active-fleet.json        |  31 ++++
- 3 files changed, 1004 insertions(+)

## Lessons surfaced in commit body
- til each woken chat starts

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ae96c9995de8`
- Milestone envelope: `mcp-server/data/milestones/HERMES-ORCHESTRATOR-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._