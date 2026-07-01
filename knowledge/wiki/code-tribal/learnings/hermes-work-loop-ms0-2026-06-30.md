---
title: Hermes parallel work-loop (HERMES-WORK-LOOP-MS0) -- compose, never rebuild; 4 scrutiny-caught bugs
tags: [hermes, parallel-agents, work-loop, scrutiny, r8-reuse, r9-mock-the-wire, r12-fail-loud]
created: 2026-06-30
slot: juliett
related: [reference_hermes_work_loop_ms0_2026_06_30, charlie-train-cycle-tsx-reexec, hermes-bridge-ms0]
---

# Hermes parallel work-loop (HERMES-WORK-LOOP-MS0/U3-U6)

The operator's "engineered loops + crons to launch parallel hermes agents with vault + PRISM-MCP
context to speed up tasks." A **plan+draft-only** loop: parallel Hermes agents pick open PRISM work,
reason over the Obsidian vault + a PRISM-MCP capability digest, and write a plan + draft diff to
`state/shared/hermes-work-loop-ledger.jsonl` for a HUMAN to review + commit. It **NEVER commits code**.

## The keystone: COMPOSE, never rebuild (R8/dedup)

The parallel fan-out machinery already existed -- `HermesParallelFanoutPlannerEngine`,
`HermesAutonomousDriveRunnerEngine.drive({executor, subtasks, maxParallel, gateEnabled})` (a
default-OFF-gated bounded-parallel wave runner taking an INJECTED `executor`). So the build was:
- a thin **feeder** (`HermesWorkSourceFeederEngine`: 4 work sources -> deduped, risk-classified
  `Subtask[]`; claim-dedup via the canonical `slot-task-claim.mjs::peerClaimedSet`);
- an **ask-hermes executor** injected into the EXISTING runner (cloud Grok / local Ollama, with
  vault `--with-context` + a PRISM-MCP digest);
- a gated default-OFF cron + a `/hermes-work-loop` skill.

No new planner, no new runner, no second gate. The dedup graph confirmed the posture by surfacing
the existing autonomous-drive driver/runner/scheduler -- all REUSED, not duplicated.

## 4 real bugs the per-file + 3-of-3 scrutiny caught

1. **Inflected code-stems silently mis-routed.** `CODE_SIGNALS` used `\bmigrat\b`/`\borchestrat\b`/
   `\brefactor\b` -- a trailing `\b` after a stem requires a NON-word char, so `migration`/
   `orchestrating`/`refactoring` (all end in a word char) MATCHED NONE. A "Run the database migration"
   roadmap unit classified as read-only/local instead of code/cloud. **Fix: `\w*` stem-expansion.**
   And `s\(x\)` inside the `\b(...)\b` group never matched (the one safety pattern whose miss made a
   unit LESS cautious) -- **fix: top-level alternative `... \b|s\(x\)`.**
2. **Read the wrong result field.** The driver read `DriveRunResult.ok` -- but the field is `.ran`
   (`{ran, gated, reason, aggregate, trace}`). The summary falsely reported `ranAgents:0` even when
   the wave fired. **Caught by LIVE validation** -- the green test had mocked `{ok}`, the wrong shape.
3. **A re-implemented parse = a dead claim-filter (P0, both arms).** `gatherHeldClaims` parsed the
   claim store as an object-MAP keyed by unit_id, but `slot-task-claim.mjs list --json` emits
   `claims` as an **ARRAY** (`Object.values`). `Object.entries(array)` -> `["0", row]` -> the filter
   was a SILENT NO-OP (a Hermes agent would race a live slot). **Fix: REUSE the canonical `readStore`
   + `peerClaimedSet` exports** -- they read `store.claims` (the MAP) directly, structurally killing
   the array-vs-map bug. The test had mocked the object-map CLI shape, masking it.
4. **A FILE_MODE for a literal prompt.** The executor used `summarize` for the local lane -- but
   `summarize` is a FILE_MODE in ask-hermes (treats the positional arg as a file PATH), so a literal
   prompt hit the lenient not-a-file fallback (noisy advisory + wrong code path). **Fix: use `ask`
   (the literal-query mode) for both lanes**; the cloud/local lane is the proxy's own routing,
   recorded in the ledger `lane`, not the ask-hermes mode. Caught LIVE.

## Reusable lessons

- **Mock the PRODUCTION wire, not the convenient shape (R9).** Bugs #2 and #3 both shipped green
  tests because the mock used a fabricated shape (`{ok}`, object-map) the real producer never emits.
  The fix proved itself only when re-mocked to the real `{ran,...}` / store-MAP contract.
- **A re-implementation of a parse introduces shape bugs; REUSE the canonical reader (R8).**
- **Live-validate anything that emits a reporting number** -- a false `ranAgents:0` is invisible to a
  green suite; the live run with real numbers surfaced it.
- **A fail-soft must not be invisible (R12).** End-of-task P2: `gatherHeldClaims` now surfaces
  `readStore().readOnly`/`reason` via an `onWarn` callback, so a corrupt/schema-mismatched claim
  store is logged (the loop continues, safe direction) instead of silently running with no peer filter.
- **PS 5.1 has no `??`** -- the pwsh-7 null-coalescing operator chokes Windows PowerShell 5.1; use
  an `if`-expression. (The sibling `install-hermes-autonomous-drive-task.ps1:116` still has this bug.)

## Shared-trunk absorption hazard

Staging into the shared `H:/prism` tree, then a concurrent peer `git commit`, sweeps the WHOLE index
(including your staged files) into the PEER's commit -- attribution lost. Mitigations that held: a
`[MAIN-FORCE]` marker IN the `git add` command (the add-lane-guard's documented cross-cutting escape),
a lock-poll loop before each commit, and an atomic stage+commit in one command to minimize the window.
The 5 core files landed in alpha's `4e6e70337c`; the U5 attribution anchor `28dc1f6fb6` documents the
true ownership.

Commits: `4e6e70337c` (5 core files, absorbed) + `28dc1f6fb6` (U5 attribution) + `0b027132bc` (P2 fail-loud).
