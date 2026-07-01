# HERMES-UTIL/U-HERMES-AUTONOMOUS-DRIVER — [MAIN-FORCE] [HERMES-UTIL]/U-HERMES-AUTONOMOUS-DRIVER (slot:zulu): build the autonomous-build DRIVER state machine + 4 dispatcher actions

**Commit:** `e1a8ac2ceab9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:29:12-05:00
**Tags:** hermes-util, u-hermes-autonomous-driver, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-AUTONOMOUS-DRIVER (slot:zulu): build the autonomous-build DRIVER state machine + 4 dispatcher actions

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-AUTONOMOUS-DRIVER (slot:zulu): build the autonomous-build DRIVER state machine + 4 dispatcher actions

Closes F1 of HERMES-OBSIDIAN-UTILIZATION-ASSESSMENT-2026-06-22: the wave
engines (ZuluWaveScheduler/HermesGoalDecomposer/HermesParallelFanoutPlanner)
were built + dispatcher-wired but NOTHING autonomously drove the chain
(0.4% autonomous exec). This is that driver -- the #1 unrealized Hermes
capability, built in-chat per operator directive ("don't route, build here").

WHAT: HermesAutonomousDriverEngine -- a PURE, DETERMINISTIC state machine over
ZuluWaveScheduler.allWaves/computeWaveN:
  start(plan)        -> validate + partition (cycle-detect) -> DriveState
  nextBatch(state)   -> subtask_ids ready to dispatch NOW (pure derivation)
  recordResults(s,r) -> apply a wave's outcomes, self-correct (requeue failed
                        up to maxRetries), recompute readiness -> next state
  isComplete/aggregate -> terminal check + rollup
The risky half (actually SPAWNING agents) stays in the GATED consumer
(PRISM_HERMES_AUTONOMOUS_DRIVE) -- this engine only orchestrates STATE, so it
is fully testable and cannot run away. Hard bounds (maxIterations/maxRetries)
guarantee termination on any DAG (R6 no unbounded /goal spiral). This is the
R13 verifiable-core-before-integration: the spawning consumer is the next
(default-OFF) unit.

WIRE: 4 sessionDispatcher actions mirroring the schedule_wave family --
autonomous_drive_{start,next_batch,record,aggregate} (stateless round-trip;
consumer holds the JSON-serializable DriveState).

TEST: 10/10 -- 2 happy (linear DAG drains in dep order + parallel-leaves-then-join
with numeric aggregate asserts) + 3 failure (cyclic DAG rejected pre-exec,
transient failure REQUEUED not lost, retries-exhausted -> permanent -> bounded
termination) + 3 adversarial (maxIterations stops a never-succeeding loop,
unknown-id ignored / empty-DAG completes, pure-transition no-mutation) + 2 guards
(duplicate-id aborts, maxRetries:0 immediate-permanent). tsc clean.

NOT in this commit (honest scope, R12): the gated agent-spawning CONSUMER that
calls nextBatch -> spawns real Agent waves -> feeds recordResults. That is the
separate default-OFF integration unit per the brief's R13 sequencing.
```

## Files touched (4)
- mcp-server/src/__tests__/HermesAutonomousDriverEngine.test.ts | 172 +++++++++++++++++++++++++++++++++
- mcp-server/src/engines/HermesAutonomousDriverEngine.ts        | 256 ++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts         |  29 ++++++
- 3 files changed, 457 insertions(+)

## Lessons surfaced in commit body
- TIL]/U-HERMES-AUTONOMOUS-DRIVER (slot:zulu): build the autonomous-build DRIVER state machine + 4 dispatcher actions
- TILIZATION-ASSESSMENT-2026-06-22: the wave

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e1a8ac2ceab9`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._