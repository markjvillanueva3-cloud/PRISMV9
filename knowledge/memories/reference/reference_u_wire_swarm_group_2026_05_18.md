---
name: reference-u-wire-swarm-group-2026-05-18
description: "Wired SwarmGroupExecutor into prism_orchestrate:swarm_group_execute (WIRE-UNWIRED-MS0, charlie 2026-05-18)"
aliases: reference_u_wire_swarm_group_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.031Z
---


# U-WIRE-SWARM-GROUP (2026-05-18 charlie)

`/goal wire unwired engines` pickup. `SwarmGroupExecutor` was a genuine unwired
engine — BUILD_STATE.NEEDS_WIRING (709 unwired), 365 LOC, 0 stubs, 0 dispatcher
references. Exports one callable: `executeSwarmGroups(groups, timeout_ms=45000)`.

## What shipped

- `orchestrationDispatcher.ts` — new `prism_orchestrate` action
  `swarm_group_execute`: ACTIONS-enum entry + handler case (lazy-import
  `executeSwarmGroups`, non-empty `groups[]` validation, `timeout_ms`/`timeoutMs`
  normalization, `ok({success,...result})`). Mirrors the adjacent
  `agent_recommend` case (the U-WIRE02 precedent).
- `orchestrationActionSchemas.ts` — `swarm_group_execute` Zod schema (full
  `TaskGroup[]` shape + overall `timeout_ms`), registered in
  `ACTION_ORCHESTRATION_SCHEMAS`.
- `SwarmGroupExecutorWiring.test.ts` — 7-case wiring-gate test: 5 source-grep
  fail-on-revert guards + a real `executeSwarmGroups` round-trip.

## BUILD_STATE false-positives — verify before wiring (R8)

The first 3 candidates from `BUILD_STATE.NEEDS_WIRING.sample_engines` were NOT
genuinely unwired:
- `SpringCalcEngine` → already a `spring_calculate` action in
  `mechanicalDesignDispatcher.ts` (string in an action map — the detector's
  grep missed it).
- `CamProfileEngine`, `BallScrewSelectionEngine` → 1 dispatcher ref each.

Lesson: BUILD_STATE's unwired list is grep-derived and has false positives.
Always `grep -rl <Engine> mcp-server/src/tools/` before wiring — a 0-ref result
is the real signal. `SwarmGroupExecutor`/`SwarmGroupExecutor`-class checked: 0 refs,
confirmed genuinely unwired.

## Per-file scrutiny

code-analyzer + test-review-agent → both VERDICT PASS. Fixed in-session: P2
(schema `input` was `.optional()` but the engine's `TaskGroup.input` is
required — tightened the schema to match), P1-seam (arg-order pinned in the
wiring guard regex `executeSwarmGroups(\s*groups` so a swapped-arg bug fails the
test; misleading test comment corrected). The 2 independent-`reviewer` arms were
blocked by an account-wide rate limit (recurring this session).

Deferred: `U-WIRE-SWARM-GROUP-E2E` — a full MCP-server dispatcher round-trip.
The repo flags MockMCPServer E2E as itself false-green-prone (it bypasses the
`z.enum(ACTIONS)` SDK gate), so adding one unreliably was worse than deferring.

## Sisters

[[reference_u_p0_u02_recovery_2026_05_18]] · [[reference_u_offload_ratelimit_hint_2026_05_18]] — prior units this /loop.
[[reference_wire_unwired_ms0_u_wire01_2026_05_16]] — the WIRE-UNWIRED-MS0 milestone.
