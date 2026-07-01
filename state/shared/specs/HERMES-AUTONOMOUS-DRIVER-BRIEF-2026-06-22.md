# BUILD BRIEF — HermesAutonomousDriver (U7)

> **✅ CORE BUILT 2026-06-22 by slot:zulu in-chat — commit `e1a8ac2c`** (operator overrode the route-to-bravo plan: "don't route to other chat slots, build it here"). Shipped: `HermesAutonomousDriverEngine` (pure state machine) + 4 `prism_session` dispatcher actions `autonomous_drive_{start,next_batch,record,aggregate}` + 10/10 R15 tests + tsc clean. **STILL OPEN (next, default-OFF unit):** the GATED agent-spawning CONSUMER that calls `nextBatch` → spawns real Agent waves → feeds `recordResults` (behind `PRISM_HERMES_AUTONOMOUS_DRIVE`). The engine below is the R13 verifiable core; this brief now documents the consumer that remains.

> Routed by zulu (2026-06-22) from the Hermes+Obsidian utilization assessment (`HERMES-OBSIDIAN-UTILIZATION-ASSESSMENT-2026-06-22.md`). This is the **#1 unrealized Hermes capability**: the autonomous-build driver that turns the already-wired wave-scheduler stack into a self-driving loop. Verified live, not inferred.

## Why (the gap, verified)
The autonomous-build ENGINES exist and are **already dispatcher-wired** — this brief is NOT "build them from scratch":
- `ZuluWaveSchedulerEngine.allWaves / computeWaveN` → wired as `sessionDispatcher` actions `schedule_wave` / `compute_wave` (`sessionDispatcher.ts:3997-4005`).
- `HermesGoalDecomposerEngine` (parent goal → SubtaskSchema DAG), `ZuluDelegationContractEngine`, `HermesParallelFanoutPlannerEngine` — all dispatcher-callable.
**Missing:** nothing *autonomously drives the chain*. Verified: zero cron/hook/loop fires a build wave (grep `schedule_wave|allWaves` over `scripts/*.mjs` + `.claude/cron-runners/` = empty). Live offload telemetry corroborates: 20 executed / 4808 suggested = 0.4% autonomous execution.

## What to build (connective tissue, NOT new engines)
A runtime driver that chains the EXISTING dispatcher actions:
```
assessAutoTrigger(goal)  ->  HermesGoalDecomposer (goal -> subtask DAG)
  ->  schedule_wave (ZuluWaveScheduler.allWaves -> wave partition)
  ->  per wave: spawn the wave's subtasks as parallel agents (bounded fan-out)
  ->  review each result (reviewer agent / scrutiny)
  ->  aggregate -> compute_wave (next ready wave) -> repeat until DAG drained
  ->  self-correct: failed/low-score subtasks re-enter the next wave
```
Reuse, do NOT reinvent: the decomposer/scheduler/delegation engines (dispatcher actions), the agent-spawn primitive the fleet already uses, the scrutiny/reviewer agents. Run `duplicationGuardEngine.mustCheckBeforeCreating` first — `HermesParallelFanoutPlannerEngine` already does wave-1 planning; the driver ORCHESTRATES over it, it does not duplicate it.

## R15 — done-signal (WIRE -> TEST -> VALIDATE -> all-galaxies)
1. **WIRE:** new `HermesAutonomousDriverEngine` + a `prism_hermes` (or `prism_session`) dispatcher action `autonomous_drive` (or a cron runner) in the same change. No orphan.
2. **TEST:** real reference tests round-tripped THROUGH the dispatcher — happy (a 3-subtask DAG drains in dependency order) + >=3 failure modes (cyclic DAG rejected, a subtask agent fails -> re-queued not lost, fan-out cap respected) + >=2 adversarial (a subtask that never completes -> bounded timeout, not infinite loop; a self-correct loop that can't converge -> max-iteration stop).
3. **VALIDATE:** drive ONE real small goal end-to-end on the live fleet, prove with numbers (waves planned, agents spawned, results aggregated).
4. **SAFETY:** default-OFF behind a gate (`PRISM_HERMES_AUTONOMOUS_DRIVE=1`) — this spawns autonomous agent waves; it must not auto-fire on install. Bounded fan-out (reuse the agent-fanout cap), hard max-iteration + max-wave + token-budget stop conditions (R6 — never an unbounded /goal slop-loop). Local-LLM-first for mechanical subtasks (Ollama->Sonnet->Opus ladder).

## Risk / why zulu did not solo-build it
High blast radius (autonomous agent execution + self-correct loops). Belongs to bravo (hermes-zulu builder); deserves the brainstorm/design pass + full R15, not a tail-of-session sprint. Zulu's role is to route + provide the verified context (this brief).

## Pointers
- Engines: `mcp-server/src/engines/{ZuluWaveSchedulerEngine,HermesGoalDecomposerEngine,ZuluDelegationContractEngine,HermesParallelFanoutPlannerEngine}.ts`
- Dispatcher: `mcp-server/src/tools/dispatchers/sessionDispatcher.ts:530,3997`
- Plan source: `state/shared/specs/HERMES-EFFICIENCY-ROUTER-PLAN-2026-06-04.md` (U7 named there)
- Assessment: `state/shared/specs/HERMES-OBSIDIAN-UTILIZATION-ASSESSMENT-2026-06-22.md` (F1)
