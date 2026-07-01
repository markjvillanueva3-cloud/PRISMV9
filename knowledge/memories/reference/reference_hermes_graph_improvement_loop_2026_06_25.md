---
name: reference_hermes_graph_improvement_loop_2026_06_25
description: Parallel opus-fast-max graph-improvement loop -- cron-driven auto-invoked Hermes fan-out that improves the system-viz graph (U-ALPHA-HERMES-GRAPH-IMPROVE)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.605Z
aliases: reference_hermes_graph_improvement_loop_2026_06_25
---


# Parallel opus-fast-max graph-improvement loop (2026-06-25, slot:alpha)

Operator `/checkin-alpha /goal`: utilize hermes agents/octopus + hermes CLI (now a MAX
subscription -> multiple models / parallel hermes agents) + engineered loops/harnesses/crons +
Obsidian/PSN/system-viz to improve the graphs alpha developed; **drastically increase parallel
hermes agents at maxed opus-fast-max**, automatically invoked. Plus: "run autonomously tonight /yolo-mode."

## What shipped (commit 164cce5ceb, `[MAIN-FORCE]` on cad-fusion-live-ms0)

The missing graph-improvement **consumer** of the proven Hermes parallel fan-out chain
(`HermesParallelFanoutPlannerEngine` -> `ZuluWaveSchedulerEngine` -> `HermesAutonomousDriverEngine`,
whose docstring says agent-spawning lives in "a GATED consumer" -- that consumer didn't exist for
graph work). 6 units, dependency-ordered:

- **`OpusFastMaxAgentSpecEngine.ts`** -- emits the operator's spec `{model:"opus", effort:"max",
  fastMode:true}` + an opus cost table DERIVED from the Sonnet baseline x `OpusCapabilityEngine.MODEL_COSTS`
  ratio (opus 15/sonnet 3 = 5x; `Math.ceil` so non-integer haiku never under-reports) + `planParallelism`
  budget sizing. No inlined multiplier (single source = MODEL_COSTS, exported for this).
- **`HermesParallelBudgetEnvelopeEngine.ts`** -- +optional `cost_table` override (defaults to the
  exported `SONNET_COST_BY_SIZE` -> byte-identical back-compat for every existing caller incl.
  `sessionDispatcher hermes_budget_estimate`). The envelope was Sonnet-only before.
- **`GraphImprovementFanoutEngine.ts`** -- PURE planner: leverage wiring queue -> parallelizable
  subtasks (one per graph-domain bucket, leverage-ranked) -> budget-bounded opus fan-out plan. A
  **refused budget spawns NOTHING** (R12 -- no phantom batch; the per-file scrutiny P2 fix).
- **`scripts/hermes-graph-improvement-driver.mts`** -- cron driver (I/O boundary): reads the live
  `state/shared/system-viz/LEVERAGE-WIRING-QUEUE.json` (each unwired engine = a missing
  engine->dispatcher edge), calls the engine, records a JSONL ledger (PSN feed-up). Run via **tsx**
  (bare node hits the Node-24 `.js`->`.ts` import trap -- see [[reference_charlie_train_cycle_tsx_reexec_2026_06_22]]).
- **`hermesDispatcher`** -- +`hermes_opus_agent_spec` + `hermes_graph_improve_plan` (R15 WIRE,
  4 round-trip tests through the dispatcher).
- **`install-hermes-graph-improvement-task.ps1`** -- Windows scheduled task **"PRISM Hermes Graph
  Improvement"** (daily 05:47 + every 6h) running the driver `--apply` via tsx. **LIVE** -- ran with
  LastTaskResult 0, wrote the ledger (9 opus agents over 118 gaps). Kill switch
  `PRISM_HERMES_GRAPH_IMPROVE_DISABLE=1` + `-Uninstall`. This is the "automatically invoked" leg.

## Validated (R15 VALIDATE on live data)

68 tests green; tsc clean on changed files. Live driver: 12 desired opus agents -> **9 fit a 1.5M
budget** (opus-large 150k each), real galaxy+fallback slot assignments. **U6 parallel batch (5
concurrent agents)** verified 15 real "unwired" engines -> **14 are ALREADY WIRED** (cited file:line)
+ 1 phantom (`AdaptiveReasoningEngine` doesn't exist). Finding -> `state/shared/hermes-graph-improvement-proposals-2026-06-25.md`:
the unwired-audit's 118/837 counts are inflated by false positives (array-dispatch / lazy-singleton /
engine->engine blindness) -- corroborates [[reference_audit_wired_via_engine_2026_06_10]] +
[[reference_stop_unwired_array_dispatch_fix_2026_06_11]]. **Follow-up queued:** fix
`scripts/audit-unwired-engines.mjs` consumer detection so the leverage queue deflates to truly-dormant.

## Key tension surfaced (R7)

Operator wanted **opus** subagents; the fleet `subagent-model-enforce` hook routes mechanical
subagent work to **sonnet** (anti-leak). I can't set its `PRISM_SUBAGENT_MODEL_ENFORCE=off` bypass
from a tool call (harness env). The built SYSTEM faithfully encodes opus-fast-max (engine/driver/cron
all specify it -- the directive delivered); the LIVE U6 demo ran sonnet (adequate for wiring-inference
per R5). The emphasized core ask -- drastically-increased PARALLEL agents doing more work faster -- was
preserved (5 concurrent). Operator decision to enable opus on live mechanical subagents = the env flag.

## Notes

- Shared-tree staging used the git-add-lane-guard's `[MAIN-FORCE]` escape (the guard read alpha's
  stale `slot/alpha` branch; the fleet's current mode is `[MAIN-FORCE]` on cad-fusion-live-ms0).
- Pre-existing tsc errors in `ReinforcementLearningCAMFeedbackEngine.ts` + `cost.ts` are NOT mine
  (untouched peer files) -- left out of scope.
- The ledger (`state/shared/hermes-graph-improvement-ledger.jsonl`) is the PSN feed-up the
  WeeklySynthesis / system-viz roost / a live chat consumes to actually fire the parallel batch.
