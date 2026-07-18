# HERMES-PARALLEL-MS0 — strategic parallel-agent features for the Zebra-Hermes orchestrator

**Shipped:** 2026-05-24 (slot bravo iter25, claude-ea80ce2f)
**Branch:** `cad-fusion-live-ms0`  (`[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` lane)
**User directive (verbatim):** *"seems like were drastically underutilizing parallel agents. add features into the hermes zebra agent to utilize parallel agents strategically and efficiently"*

## The gap this closes

The existing Zebra-as-Hermes orchestrator (`mcp-server/src/engines/lib/zebraAwarenessReader.ts` + `scripts/zebra-awareness-*.mjs`) ranks **one** slot per task. It cannot:

1. Decompose a parent task into N parallel-launchable subtasks routed to distinct slots
2. Partition the file blast-radius so parallel agents don't collide on `index.lock` (the *exact* failure mode observed earlier this session — 5-minute lock-wait loops between HMPI commit attempts)
3. Estimate the aggregate token spend before firing N agents in one tool block
4. Merge N parallel verdicts, flagging file-edit conflicts and disagreement-on-answer

These 4 engines fix that — each pure-core, Zod-validated, R12 fail-soft, no I/O.

## Shipped units (4/4)

| Unit  | Engine                                  | Tests | Dispatcher actions                                 |
|-------|-----------------------------------------|-------|----------------------------------------------------|
| HZP01 | HermesParallelFanoutPlannerEngine       | 11    | hermes_fanout_plan · hermes_fanout_render          |
| HZP02 | HermesFileScopePartitionerEngine        | 13    | hermes_file_scope_partition · hermes_file_scope_render |
| HZP03 | HermesParallelBudgetEnvelopeEngine      | 13    | hermes_budget_estimate · hermes_budget_render      |
| HZP04 | HermesParallelVerdictAggregatorEngine   | 17    | hermes_verdict_aggregate · hermes_verdict_render   |

Totals: **4 engines · 54 tests · 8 dispatcher actions** added to `sessionDispatcher.ts`.

## Test-run verification

```
npx vitest run src/__tests__/HermesParallel*.test.ts src/__tests__/HermesFileScope*.test.ts
Test Files  4 passed (4)
Tests       54 passed (54)
Duration    449ms
```

## Usage protocol (call shape — caller drives the loop)

```ts
// 1) Decompose the parent task offline (caller-supplied; not this engine's job).
//    Then ask the awareness reader for slot candidates per domain.
const candidates = rankSlotsForTaskDescriptor({ text: parentText });

// 2) Plan the fan-out.
const plan = HermesParallelFanoutPlannerEngine.plan({
  parent_task_id, subtasks, candidates, max_parallel: 5,
});
if (!plan.parallelizable) return /* fall back to sequential */;

// 3) Partition file scopes — REFUSE TO LAUNCH ON CONFLICT.
const partition = HermesFileScopePartitionerEngine.partition(
  plan.wave_1.map(a => ({ agent_id: a.slot, files: filesPerAgent[a.subtask_id] }))
);
if (!partition.safe_to_fanout) return /* resolve conflicts first */;

// 4) Budget gate.
const budget = HermesParallelBudgetEnvelopeEngine.estimate({
  agents: plan.wave_1.map(a => ({ agent_id: a.slot, size_hint: subtaskById(a.subtask_id).size_hint })),
  remaining_budget_tokens,
});
if (budget.verdict === "refused") return /* degrade to fewer agents */;
const launchCount = budget.max_parallel_fits;

// 5) Launch — caller invokes the Agent tool N times in a single message.

// 6) Aggregate.
const result = HermesParallelVerdictAggregatorEngine.aggregate(returnedVerdicts);
if (result.file_conflicts.length || !result.has_consensus) return /* manual review */;
```

## Safety properties (held)

- **Pure-core** — every engine is stateless, no I/O, no network, no filesystem.
- **Sequential refusal** — `HZP01.plan` returns `parallelizable: false` with `reject_reason` when the decomposition has only one leaf (the rest are chained dependencies). No silent serial-as-parallel mistake.
- **Hard conflict gate** — `HZP02.safe_to_fanout` is `false` whenever 2+ agents claim the same file (path-normalized across `\` vs `/` and `./` prefix). Caller must resolve before launch.
- **Budget refusal** — `HZP03` returns `verdict: "refused"` + `max_parallel_fits: 0` if even ONE agent can't fit. Never silently truncates.
- **Quality + consensus** — `HZP04` flags file-edit conflicts, surfaces majority answer (`has_consensus`), and picks `best_agent_id` by quality with duration tiebreak.
- **Schema-rejected** edge cases — duplicate IDs, self-dependencies, unknown size hints, negative budgets, quality > 1.0 all throw.

## PSN synergy

- **Leg #1 + #4 (Obsidian + Memories)** — HZP04 aggregator is the upstream for the auto-memory feed: a partial-success fan-out generates a `feedback_partial_fanout_<timestamp>.md` candidate.
- **Leg #2 (PRISM OS)** — HZP03 budget envelope plugs into the `UnifiedControlPlaneEngine` (HAGI02) budget gate. Together: fan-out passes only if BOTH per-tenant kill-switch AND aggregate budget gate green.
- **Leg #6 (System Viz)** — every engine emits `[TAG ...]` render lines → ghost-roost consumable.
- **Leg #11 (PRISM AI)** — `aiSystemRouterEngine.route()` can now ask "is this task fan-out-able?" via HZP01 → routes deep-reasoning parents to Claude, leaves to a mixed slot pool.

## Memory references

- [[reference_hermes_zebra_ms0_2026_05_20]] (HERMES-MS0 parent)
- [[feedback_fleet_design_10_chats]] (max_parallel reads `SLOT_NAMES.length`)
- [[reference_hermes_mcp_plugin_inventory_ms0_2026_05_24]] (today's parent /goal arc)
- this session's HMPI-MS0 close-out observed the lock-thrash root failure mode that HZP02 prevents
