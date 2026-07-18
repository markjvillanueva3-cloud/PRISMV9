---
title: PRISM pipeline — /wire-pipeline (orphan→wired)
slug: wire-pipeline
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK21
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [/orphan-inventory, /dedup, /research, dispatcher-wirer, round-trip-test, /scrutiny-gate, /close-out-audit]
stages: [inventory, dedup, research, wire, test, scrutiny, close-out, commit]
consumes:
  - state/shared/BUILD_STATE.json
  - .claude/commands/orphan-inventory.md
  - .claude/commands/research.md
  - DuplicationGuardEngine
produces:
  - dispatcher-action-wire
  - round-trip-test
  - close-out-record
  - BUILD_STATE-decrement
  - commit
downgrade:
  mode: hard-stop
  fallback_to: manual-wire-without-scrutiny
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, latency_ms, outcome, session_id, slot]
---

# `/wire-pipeline` — Orphan→Wired Pipeline (U-CK21)

Front-end for wiring an already-built engine into a dispatcher.
Composes the canonical surfaces — inventory + dedup + research +
wire + test + scrutiny + close-out — that every shipped engine
SHOULD have followed. R8: adds 0 logic.

Solves the 836-unwired-engines class (BUILD_STATE headline) and
honors the WIRE-UNWIRED-MS0 lesson: ~96% of "unwired" engines are
actually silent close-out debt (already wired, never closed out).
The INVENTORY + RESEARCH stages MUST detect and short-circuit before
generating noise.

## Stage table

| # | Stage | What | Stop-on-fail |
|---|-------|------|--------------|
| 1 | inventory | /orphan-inventory + validate-unwired-signal | yes — already-wired bails |
| 2 | dedup | /dedup near-match scan | yes — fully-wired near-match bails |
| 3 | research | /research <EngineName> (U-CK18) | yes — close-out-debt verdict short-circuits to step 7 |
| 4 | wire | dispatcher-wirer agent OR manual edit: z.enum action + case handler + schema | yes — schema mismatch must be fixed |
| 5 | test | round-trip E2E in __tests__/<name>-wire.test.ts (real reference values, no stubs) | yes — failing test must fix code, not weaken assertion |
| 6 | scrutiny | /scrutiny-gate Mode A per-file (dispatcher + test) then Mode B 3-of-3 | yes — Stop hook will block anyway |
| 7 | close-out | envelope flip + BUILD_STATE regen + chat-bus post | yes — drift must resolve |
| 8 | commit | `[SCOPE]/U-WIRE-<short>: wire <Engine> into <dispatcher>:<action> (N tests)` | warn — RTK retry with raw git |

## Rollback chain

| Failed stage | Rollback |
|--------------|----------|
| 1-3 | no-op (read-only) |
| 4 wire | git restore dispatcher to pre-stage-4; release slot-task claim |
| 5 test | git restore test file; do NOT weaken assertion |
| 6 scrutiny | leave files on disk; ledger FAIL entry; do NOT commit |
| 7 close-out | un-flip envelope; un-regen BUILD_STATE; do NOT post chat-bus |
| 8 commit | RTK retry with raw git; if real failure, post to AGENT_CHAT |

Operator-mediated for stages 4-7 (auto-git-reset clobbers peers in shared tree).

## Why INVENTORY uses validate-unwired-signal

The WIRE-UNWIRED-MS0/U-WIRE01 lesson (memory:
`reference_wire_unwired_ms0_u_wire01_2026_05_16`) found only 3
truly-unwired backend orphans out of 861 candidates — 96% were
silent close-out debt or test-only signals. Running this skill
WITHOUT the validator would generate 96 noise commits per 100
attempts. The validator is a load-bearing precondition, not
advisory.

## Inputs

| Flag | Default | Purpose |
|------|---------|---------|
| `<EngineName>` | (required) | engine class name or path |
| `--dispatcher <name>` | (auto-classified) | force specific dispatcher |
| `--unit <id>` | (none) | bind to roadmap unit; envelope flip enabled |
| `--no-commit` | false | stop after stage 7 |

## Composes-with

Composed BY:

- `/session-cycle` (U-CK17) BUILD stage when deliverable is "wire engine X"
- `/loop` autonomous-iter sweeps focused on wiring debt
- `/pipeline execute wire-pipeline` (U-CK25)
- direct operator invocation

Composes:

- `/orphan-inventory` — stage 1
- `/dedup` — stage 2 duplication guard
- `/research` (U-CK18) — stage 3 prior-art + verdict
- dispatcher-wirer agent (subagent_type) — stage 4 default
- `/scrutiny-gate` (U-CK19) — stage 6
- `/close-out-audit` — stage 7 drift check

## Karpathy discipline pins

- **R8** — INVENTORY + DEDUP + RESEARCH IS the read step before WIRE
- **R10** — each stage's exit is an explicit verdict (eligible? near-match? close-out-debt?)
- **R12** — failing test fixes code, not assertion; arm B of scrutiny gate explicitly catches stub-weakening
- **WIRE-UNWIRED-MS0** — validate-unwired-signal is non-skippable

## Knobs

- `PRISM_WIRE_PIPELINE_DISABLE_DEDUP=1` — skip stage 2 (dangerous)
- `PRISM_WIRE_PIPELINE_NO_COMMIT=1` — alias for `--no-commit`
- Scrutiny gate NOT disable-able (MINIMAL_ALLOWLIST)

## Related

- [[session-cycle]] — fires wire-pipeline in BUILD for wire-class units
- [[research]] — stage 3 verdict source (U-CK18)
- [[scrutiny-gate]] — stage 6 gate (U-CK19)
- [[pipeline]] — meta-command (U-CK25)
- [[loop]] — autonomous-iter wrapper

## See also

- `.claude/commands/wire-pipeline.md` — operator skill spec (gitignored mirror)
- `reference_wire_unwired_ms0_u_wire01_2026_05_16.md` memory — 96%-debt lesson
- `state/shared/BUILD_STATE.json` — NEEDS_WIRING source-of-truth
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK21 — envelope
