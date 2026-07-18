---
title: U-WIRE-SWARM-GROUP — SwarmGroupExecutor → prism_orchestrate
node_type: architecture
unit: U-WIRE-SWARM-GROUP
milestone: WIRE-UNWIRED-MS0
slot: charlie
shipped: 2026-05-18
status: shipped
---

# U-WIRE-SWARM-GROUP

Wires the previously-unwired `SwarmGroupExecutor` engine into the
`prism_orchestrate` dispatcher. `/goal wire unwired engines` pickup, slot
charlie.

## The engine

`mcp-server/src/engines/SwarmGroupExecutor.ts` — 365 LOC, no stubs. One public
callable: `executeSwarmGroups(groups: TaskGroup[], timeout_ms = 45000):
Promise<SwarmGroupResult>`. It runs multiple `TaskGroup`s with dependency/wave
resolution — independent groups in parallel, dependent groups in wave order
with upstream outputs injected — and returns per-group results plus a top-3
cross-group synthesis. It was flagged in `BUILD_STATE.NEEDS_WIRING` (709
unwired engines) with zero dispatcher reference.

## The wire

| Surface | Change |
|---|---|
| `orchestrationDispatcher.ts` | `swarm_group_execute` added to the `ACTIONS` enum + a handler `case` — lazy-imports `executeSwarmGroups`, validates a non-empty `groups[]`, normalizes `timeout_ms`/`timeoutMs`, returns `ok({success, ...SwarmGroupResult})`. |
| `orchestrationActionSchemas.ts` | `swarm_group_execute` Zod schema (full `TaskGroup[]` shape + overall `timeout_ms`), registered in `ACTION_ORCHESTRATION_SCHEMAS`. |
| `SwarmGroupExecutorWiring.test.ts` | 7-case wiring-gate test. |

Invoke: `prism_orchestrate` action `swarm_group_execute`, params
`{ groups: TaskGroup[], timeout_ms?: number }`.

## Verification

7/7 vitest PASS — 5 source-grep fail-on-revert guards (enum entry, case, lazy
import, **arg-order-pinned** engine call, empty-groups reject, schema
registration) + a real `executeSwarmGroups([])` round-trip pinning the
`SwarmGroupResult` contract. Per-file scrutiny: code-analyzer + test-review-agent
both VERDICT PASS.

## Lesson — BUILD_STATE.NEEDS_WIRING has false positives

The unwired-engine list is grep-derived. Three earlier candidates
(`SpringCalcEngine`, `CamProfileEngine`, `BallScrewSelectionEngine`) were
*already* wired — `SpringCalcEngine` is the `spring_calculate` action in
`mechanicalDesignDispatcher.ts` (its name appears only as a string in an action
map, which the detector's import-grep missed). **Always
`grep -rl <Engine> mcp-server/src/tools/` before wiring — a 0-ref result is the
real "genuinely unwired" signal.**

## Deferred

`U-WIRE-SWARM-GROUP-E2E` — a full MCP-server dispatcher round-trip. The repo
flags MockMCPServer E2E as itself false-green-prone (it bypasses the
`z.enum(ACTIONS)` SDK gate), so a true server-level test is a deliberate
follow-up rather than an unreliable add.

## Sisters

- [[reference-wire-unwired-ms0-u-wire01-2026-05-16]] — WIRE-UNWIRED-MS0 milestone.
- [[u-offload-ratelimit-hint]] — prior unit this /loop session.
