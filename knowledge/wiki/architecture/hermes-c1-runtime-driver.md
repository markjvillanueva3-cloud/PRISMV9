---
title: "Hermes C1 multi-wave runtime driver"
type: architecture
tags: [hermes, zulu, orchestration, fan-out, dag, governance, capability]
created: 2026-06-18
source: slot:bravo (HERMES-CAPABILITY-C1)
related: [hermes-zulu-galaxy, hermes-zulu-integration, psn-octopus-fleet-synergy-ms0]
---

# Hermes C1 multi-wave runtime driver

The **C1 runtime driver** turns a raw goal into autonomous, governed, resumable multi-wave fan-out
building. It is the agent-spawning executor that sits on top of the deterministic `ZuluWaveSchedulerEngine`
cores. Built by slot:bravo (HERMES-CAPABILITY-C1) and **complete end-to-end as of 2026-06-18**.

## The pipeline (3 stages)

```
raw goal ──▶ [1] decompose ──▶ FanoutPlanRequest ──▶ [2] feasibility ──▶ drains? ──▶ [3] execute
            hermes_decompose_goal          (subtask DAG)   project_governed_schedule        hermes-multiwave-build (Workflow)
```

1. **Decompose** — `prism_session:hermes_decompose_goal` (engine `HermesGoalDecomposerEngine`,
   `31cd3ed86c`). Turns a raw goal + slot candidates into a validated `FanoutPlanRequest` (a
   `SubtaskSchema` dependency DAG). Decomposition is genuine reasoning, so it is **LLM-backed via a
   local Ollama model** (R5) — but the LLM call is INJECTED, so the engine stays pure + unit-testable.
   Pure helpers `buildDecomposePrompt` / `parseDecomposition` (JSON-in-fences/prose extraction +
   coercion) / `validateDecomposition` (Kahn cycle + missing-dep + self-dep + dup-id). **Fail-loud
   (R12):** an empty goal / no candidates / no llm / unparseable response / invalid-or-cyclic DAG /
   >20 subtasks all THROW — it never returns a fabricated plan. `prompt_only:true` returns the built
   prompt with no LLM call (hermetic wiring path).

2. **Feasibility** — `prism_session:project_governed_schedule` (`ZuluWaveSchedulerEngine.projectGovernedSchedule`,
   `8d816e44d0`). Projects the COMPLETE governed multi-wave schedule in one call (simulating
   all-dispatched-succeeds) and returns a `drains` / `stalled` verdict — the UPFRONT check a runtime
   executor runs BEFORE spawning any agent. A cyclic DAG throws; a vetoed/unrouted subtask surfaces
   in `stalled`. Companion `project_schedule_render` for a one-line DRAINS/STALLED render.

3. **Execute** — the `hermes-multiwave-build` Workflow (`.claude/workflows/hermes-multiwave-build.mjs`,
   `183cc1184f`). A synchronous MCP dispatcher CANNOT spawn+await subagents, so the executor is a
   **Workflow** (only a harness or chat `/loop` can fan out agents). It (a) feasibility-gates via
   `project_governed_schedule` and REFUSES to spawn into a stall, then (b) drives each governed wave
   via `wave_loop_step`, spawning one PRISM builder agent per assignment, and (c) **independently
   verifies** each builder's claimed commit (read-only git check) before feeding only commit-verified
   subtask_ids back as completed — so a false `completed:true` can never dispatch dependents atop
   unbuilt work or report a false done. Bounded to `total_subtasks + 2` iterations.

## Governance (governed-by-construction)

Every wave applies, per assignment, the `ZuluFleetGovernor` authority check + the C4 delegation
pre-gate + the C5 back-pressure throttle (the gates only NARROW, never widen; operator-granted via the
delegation store). The executor refuses to launch into a plan that provably cannot drain. This is why
the bravo soul refuses `unsafe-fleet-control-before-governance` — the C1 driver is the *governed* path.

## How to invoke

```js
// 1+2 (synchronous, MCP): goal -> request -> feasibility
prism_session: hermes_decompose_goal { goal, candidates:[{slot,hermes_role,primary_domain,score}], max_subtasks? }
prism_session: project_governed_schedule { request, souls }     // { drains, stalled, wave_count, ... }

// 3 (harness only): actually RUN the build
Workflow({ name: 'hermes-multiwave-build', args: { request, souls, unit_id } })
```

The executor's first LIVE run is **operator-supervised** (it builds + commits code via fan-out).

## Lesson captured (schema round-trip)

`SubtaskSchema.depends_on` required `.default([])` (`HermesParallelFanoutPlannerEngine`): a
`FanoutPlanRequest` returned over MCP runs through `slimResponse`, which DROPS empty arrays, stripping
every leaf subtask's `depends_on:[]`; the downstream `FanoutPlanRequestSchema.parse` in
`project_governed_schedule` / `wave_loop_step` then threw "Required" on every leaf. Root-cause fix:
`absent === leaf === []` via `.default([])` (additive — `z.infer` output type stays `string[]`).
General rule: a Zod-required array that can be empty AND is returned through a slimming serializer +
re-parsed downstream MUST carry `.default([])`. See [[reference_fanout_request_slim_strips_depends_on_2026_06_18]].

## Provenance

`8d816e44d0` (projection core) · `183cc1184f` (executor Workflow) · `31cd3ed86c` (goal decomposer +
schema fix). Memory: [[reference_fanout_request_slim_strips_depends_on_2026_06_18]]. Ledger:
`state/shared/specs/BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md` (unit #9 HERMES-CAPABILITY-EXPANSION).
