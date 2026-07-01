---
name: reference_hermes_autonomous_driver_built_2026_06_22
description: HermesAutonomousDriverEngine BUILT 2026-06-22 (slot:zulu, commit e1a8ac2c) — the autonomous-build DRIVER glue that closes F1 of the Hermes/Obsidian assessment (the #1 unrealized Hermes capability, 0.4% autonomous exec). Pure deterministic state machine over ZuluWaveScheduler + 4 prism_session dispatcher actions + 10/10 R15 tests. The gated agent-spawning CONSUMER is the next default-OFF unit.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.604Z
aliases: reference_hermes_autonomous_driver_built_2026_06_22
---


# HermesAutonomousDriver BUILT — 2026-06-22 (slot:zulu)

Operator: "don't route to other chat slots, build it here" — overrode the route-to-bravo plan in the
brief. Built in-chat. Commit **`e1a8ac2c`** on `cad-fusion-live-ms0`.

## What shipped (the R13 verifiable core)
`mcp-server/src/engines/HermesAutonomousDriverEngine.ts` — a PURE, DETERMINISTIC state machine over
the already-wired `ZuluWaveSchedulerEngine.allWaves/computeWaveN`. NO I/O, NO agent-spawning:
- `start({parent_task_id, subtasks, bounds?})` → validate + partition (cycle-detect via allWaves which
  THROWS on a cycle, line 375) → `DriveState`. Cyclic/duplicate/malformed DAG → `status:"aborted"`.
- `nextBatch(state)` → subtask_ids ready to dispatch NOW (computeWaveN over completed_ids, minus
  permanently-failed). Pure derivation — the consumer spawns these.
- `recordResults(state, results)` → successes advance the DAG; a failure with retry budget left is
  LEFT not-completed so nextBatch re-offers it (self-correction); past `maxRetries` → permanent
  `failed_ids` → dependents deadlock → `status:"failed"` (honest, bounded). Terminal state is immutable.
- `isComplete/isTerminal/aggregate`. Bounds `maxIterations`(≤1000, def 100) + `maxRetries`(≤10, def 2)
  guarantee termination on ANY DAG (R6 no unbounded /goal spiral).

**Key design (why it's safe to ship now):** the risky half — actually SPAWNING agents to run a wave —
stays in the GATED consumer (`PRISM_HERMES_AUTONOMOUS_DRIVE`, default-OFF). The engine only orchestrates
STATE, so it is fully testable and cannot run away. The consumer feeds results back; the engine never
calls out. This is R13 verifiable-core-before-integration.

## Wired (R15 no-orphan)
4 `prism_session` (sessionDispatcher.ts) actions mirroring the `schedule_wave` family — stateless
round-trip, consumer holds the JSON-serializable DriveState:
`autonomous_drive_start` · `autonomous_drive_next_batch` · `autonomous_drive_record` · `autonomous_drive_aggregate`.

## Tested (10/10, tsc clean)
2 happy (linear DAG drains in dep order + parallel-leaves-then-join, numeric aggregate asserts) +
3 failure (cyclic rejected pre-exec · transient failure REQUEUED not lost · retries-exhausted→permanent→
bounded termination) + 3 adversarial (maxIterations stops a never-succeeding loop · unknown-id ignored /
empty-DAG completes · pure no-mutation transition) + 2 guards (duplicate-id aborts · maxRetries:0 immediate).
Two real bugs caught pre-commit (R12): (1) redundant outer `.default({})` tripped Zod v4 overload → removed;
(2) a test used `maxRetries:1000` which the schema's sane `max(10)` cap correctly rejected → the schema was
right, the test value was wrong → fixed to 10.

## CONSUMER — NOW BUILT (same session, 2026-06-22 slot:zulu)
The GATED agent-spawning consumer shipped: `HermesAutonomousDriveRunnerEngine` (async) +
`prism_session:autonomous_drive` dispatcher action.
- `drive(opts)` decomposes (optional) → starts the pure driver → per wave executes the ready set
  in `maxParallel`-bounded chunks via an INJECTED `executor` (real = Ollama via the dispatcher;
  Sonnet/Opus agents plug into the same seam via a Workflow `agent()` executor; test = mock) →
  records ONCE per wave (so driver.iteration == wave count) → self-corrects → aggregates.
- SAFETY: DEFAULT-OFF gate (`PRISM_HERMES_AUTONOMOUS_DRIVE`=1 / `gate:true`) checked at BOTH the
  engine and the dispatcher boundary (gated-off never imports/calls Ollama — proven by tests);
  bounded fan-out; per-subtask timeout (live path defaults 180s); termination guaranteed by the
  driver bounds + a runner-side wave cap.
- 3-of-3 scrutiny PASS (A+B+C, no P0/P1). Arm C's three P2s were then HARDENED: live-path timeout
  default, connect fail-loud envelope (R12), timeout-timer clear/unref.
- 15 tests (10 runner unit, mock executor + 5 dispatcher e2e, mocked Ollama). tsc clean.
- Commits: `<runner-core>` + `08ca8fe073` (wire) + `<harden>`.

## LIVE-PROVEN (2026-06-22, operator "lets do it")
Ran the full loop end-to-end with a REAL Ollama executor (gate armed) via the new
`scripts/hermes-autonomous-drive.mts` (tsx-run headless CLI, default-OFF). Numbers:
- 3-subtask DAG (a,b → c), `maxParallel:2`, qwen2.5-coder:7b →
  `ran:true gated:false waves:2 iterations:2 status:complete completed:3 failed:0`.
- wave 0 dispatched `[a,b]` IN PARALLEL (live fan-out), wave 1 `[c]` (dependency respected);
  real outputs `{a:"ALPHA", b:"BETA", c:"DONE"}`; elapsed 3353ms.
- Gate-OFF CLI run (no `--gate`): `{ran:false, gated:true}` — refuses without touching Ollama.
The autonomous-build loop is PROVEN: goal/DAG → (gated) decompose → wave-schedule →
Ollama-execute each wave (bounded parallel) → self-correct → aggregate. CLI commit `<U-HERMES-DRIVE-CLI>`.

BOTH entry paths live-proven:
- Pre-supplied DAG (above): 3 subtasks, 2 waves, 3/3 complete.
- GOAL → DECOMPOSE → execute: `--goal "add a TS add(a,b) + vitest test" --candidates [bravo]`,
  qwen2.5-coder:32b → Ollama decomposed into a 7-subtask DAG, runner drained it in 5
  dependency-ordered waves (waves 1+2 each ran 2 subtasks IN PARALLEL), all ok, 0 failed.
  FINDING: the decompose path needs a strong coder model (32b) for reliable STRICT-JSON;
  the 7b suffices for execution but not decomposition.

## STILL OPEN (next)
- A Sonnet/Opus-tier RUN: wire a Workflow `agent()` executor into the same injected seam (Ollama
  proves the mechanical tier; heavy waves want real Claude agents). Operator-gated (real autonomous agents).
- Optional: a cron/scheduled-task wrapper behind the gate for unattended runs.

Supersedes the "owner: bravo / unbuilt" status in `HERMES-AUTONOMOUS-DRIVER-BRIEF-2026-06-22.md` (now
banner-updated) and closes F1 of [[reference_hermes_obsidian_utilization_assessment_2026_06_22]].
Linked: [[reference_zulu_octopus_7voice_cluster_2026_06_22]] · [[feedback_verify_live_config_value_not_symptom]].
