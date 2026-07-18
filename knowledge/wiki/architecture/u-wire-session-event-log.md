---
title: U-WIRE-SESSION-EVENT-LOG — SessionEventLogEngine → prism_session
node_type: architecture
unit: U-WIRE-SESSION-EVENT-LOG
milestone: WIRE-UNWIRED-MS0
slot: charlie
shipped: 2026-05-18
status: shipped
---

# U-WIRE-SESSION-EVENT-LOG

Wires the previously-unwired `SessionEventLogEngine` into `prism_session`.
`/goal wire unwired engines` /loop pickup, slot charlie.

## The engine

`mcp-server/src/engines/SessionEventLogEngine.ts` — an in-memory session-event
recorder (lighter than `SessionReplayEngine`; no git). Singleton
`sessionEventLogEngine` + 7 methods: `record(type, summary, data?)`,
`getState()`, `replay(maxEvents=20)`, `oneLiner()`, `since(timestamp)`,
`counts()`, `reset()`. `EventType` is a 12-value union. Flagged in
`BUILD_STATE.NEEDS_WIRING` with 0 dispatcher references.

## The wire — op-discriminator pattern

A 7-method engine wired as 7 dispatcher actions would bloat the `z.enum`.
Instead: **one** action `session_event_log` with an `op` field, and an inner
switch routes to the method:

| `op` | engine call |
|---|---|
| `record` | `record(type, summary, data?)` — fail-loud on missing type/summary |
| `state` (default) | `getState()` |
| `replay` | `replay(maxEvents?)` |
| `oneliner` | `oneLiner()` |
| `counts` | `counts()` |
| `since` | `since(timestamp)` — fail-loud on non-numeric timestamp |
| `reset` | `reset()` |

Schema `session_event_log` registered in `ACTION_SESSION_SCHEMAS`; `type` is a
12-value `z.enum` (the engine's `EventType`).

## Verification

12/12 vitest (`SessionEventLogEngineWiring.test.ts`) — source-grep fail-on-revert
guards (scoped to the case block) + a fresh-instance round-trip exercising all
7 methods incl. bucket-routing. Per-file scrutiny: code-analyzer +
test-review-agent both VERDICT PASS.

## Lessons

- **op-discriminator** keeps a multi-method engine to one `z.enum` action.
- **Schema enum, not `z.string()`** — the first cut typed `type` as
  `z.string()`; with the dispatcher's `Parameters<typeof fn>[0]` cast that made
  the cast a *runtime no-op* (invalid `EventType` strings stored silently).
  `z.enum([...12])` makes it fail-loud at `validateActionParams`. Per
  `H:/.claude/rules/schemas.md`.
- **Scope wiring-grep to the case block** — grepping `case "record":` against
  a 2200-line dispatcher can false-pass off a foreign sub-switch; slice the
  `session_event_log` case block first.
- The engine is a **process-global singleton** — the "session" log is really
  server-wide across all chats. Consistent with sibling `SessionLifecycleEngine`;
  noted, not changed (engine frozen for this wiring unit).

## Deferred

`U-WIRE-SESSION-EVENT-LOG-E2E` — full MCP-server dispatcher round-trip.

## Sisters

- [[u-wire-swarm-group]] — prior wire this /loop (same op-pattern family).
- [[reference-wire-unwired-ms0-u-wire01-2026-05-16]] — WIRE-UNWIRED-MS0 milestone.
