---
title: PRISM pipeline — /session-cycle end-to-end lifecycle
slug: session-cycle
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK17
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [/checkin, /pick-unit, /research, build-with-scrutiny, /scrutiny-gate, close-out, /handoff]
stages: [checkin, pick, research, build, scrutiny-gate, close-out, handoff]
consumes:
  - state/shared/chat-slots.json
  - mcp-server/data/state/atomic-roadmap.json
  - state/shared/MILESTONE_PROGRESS.json
  - state/shared/slot-task-claims.json
produces:
  - unit-deliverables
  - envelope-status-flip
  - scrutiny-ledger-entry
  - handoff-md
  - loop-tick
downgrade:
  mode: user-prompt
  fallback_to: manual-step-by-step
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, latency_ms, outcome, session_id, slot]
---

# `/session-cycle` — End-to-End Lifecycle Pipeline (U-CK17)

The canonical PRISM dev-session as a single composed chain. Operator
types `/session-cycle` (optionally with `--slot` / `--unit`) and the
chat threads checkin → pick → research → build → scrutiny → close-out
→ handoff. No new logic — every stage maps to an existing surface.

## Stage contract

| # | Stage | Surface | Outputs | Stop-on-fail |
|---|-------|---------|---------|--------------|
| 1 | checkin | `/checkin` or `/checkin-<slot>` | slot binding, handoff read | yes — peer holds slot |
| 2 | pick | `/pick-unit` or `/pick-dev` or per-slot queue | unit-id, spec path | yes — no eligible units |
| 3 | research | `/research <MILESTONE::U-XX>` (U-CK18) | brief + verdict | hard-short-circuit on `close-out-debt` or `peer-claimed` |
| 4 | build | implementer, per-file 2-reviewer gate | files + tests | yes — reviewer FAIL halts before next file |
| 5 | scrutiny-gate | `/scrutiny-gate` (U-CK19) | 3-of-3 ledger entry | yes — Stop hook hard-blocks |
| 6 | close-out | envelope flip + MILESTONE_PROGRESS update + `/close-out-audit` | committed close-out | yes — drift must resolve |
| 7 | handoff | `/handoff-<slot>` | HANDOFF.md, slot release, loop tick | warn — manual fallback exists |

## Hard short-circuits (the WIRE-UNWIRED-MS0 lever)

Stage 3 (RESEARCH) returns one of four verdicts:

- **build-needed** — proceed to BUILD (the happy path).
- **close-out-debt** — already shipped, never closed out. **Skip BUILD**, jump straight to CLOSE-OUT (envelope-flip-only). This is the high-leverage path: ~96% of "unwired" engines fall here.
- **peer-claimed** — another slot owns the unit. **HALT**. Do not race-build.
- **already-deep-known** — token-mode brief found exhaustive prior art. Operator decides whether the new build is justified.

## Rollback chain

Stages 1-2 are read-only — no rollback needed. Stages 3-7:

| Failed stage | Rollback action |
|--------------|-----------------|
| 3 research | none — read-only |
| 4 build | git restore staged + working tree to pre-stage-4 ref; release slot-task claim |
| 5 scrutiny | leave files on disk + scrutiny ledger entry marking the FAIL; do NOT commit; operator decides fix-and-retry vs revert |
| 6 close-out | un-flip envelope; un-write MILESTONE_PROGRESS entry; do NOT post chat-bus |
| 7 handoff | manual `per-agent-handoff.mjs write` fallback (the precompact hook is the auto-write surface; manual is the safety net) |

The U-CK13 executor will invoke `.claude/kernel/rollback/session-cycle/<stage>.mjs` if present. Today these are no-op stubs (rollback is operator-mediated for the BUILD/CLOSE-OUT stages — automatic git-reset of an in-progress chat would clobber other slots in the same shared tree).

## Inputs

| Flag | Purpose | Default |
|------|---------|---------|
| `--slot <nato>` | bind specific slot | current slot from chat-slots.json |
| `--unit <MILESTONE::U-XX>` | skip PICK, force unit | (auto-pick) |
| `--no-loop` | single iter, no autonomous /loop after handoff | (loop engages if keyword present) |
| trailing args | passed to user-facing skills (e.g. PICK stage) | (none) |

## Knobs

- `PRISM_SESSION_CYCLE_DISABLE_RESEARCH=1` — skip RESEARCH (not recommended)
- `PRISM_SESSION_CYCLE_DISABLE_SCRUTINY=1` — skip SCRUTINY (Stop hook will catch anyway)
- `PRISM_SESSION_CYCLE_FORCE_BUILD=1` — proceed past `close-out-debt` verdict (legitimate only for envelope-was-wrong rebuilds)

## Karpathy discipline pins

- **R8 read-before-write** — RESEARCH stage is non-skippable in nominal mode.
- **R10 checkpoint** — every stage's exit emits a state restate to the loop-tick note. The next stage starts from a fully-described state.
- **R11 match conventions** — stage order is fixed: CHECKIN → PICK → RESEARCH → BUILD → SCRUTINY-GATE → CLOSE-OUT → HANDOFF. Forking the order breaks the contract.
- **R12 fail loud** — any stage's `{ok:false}` surfaces as `failedAt:<stage>`. No silent retry; no quiet skip.

## Composes-with

`/session-cycle` is composed BY:

- `/loop` (U-CK04-extension) — each autonomous iter IS one session-cycle.
- `/checkin-<nato> /loop <task>` — the engaged loop body.
- `/pipeline execute session-cycle` (U-CK25) — programmatic entry.

`/session-cycle` composes (in order):

- `/checkin` / `/checkin-<slot>`
- `/pick-unit` / `/pick-dev`
- `/research` (U-CK18)
- per-file 2-reviewer scrutiny gate (build stage internal)
- `/scrutiny-gate` (U-CK19)
- `/close-out-audit`
- `/handoff-<slot>`

## Related

- [[loop]] — sister pipeline (autonomous iter that fires session-cycle per iter)
- [[research]] — stage 3 detail (U-CK18)
- [[pipeline]] — meta-command that can fire session-cycle (U-CK25)
- [[goal-complete]] — Stop-hook gate that close-out triggers against

## See also

- `.claude/commands/session-cycle.md` — operator skill spec (gitignored mirror)
- `.claude/commands/checkin.md` + `pick-unit.md` + `research.md` + `pipeline.md` + `handoff.md` — the 5 leaf surfaces
- `.claude/hooks/scrutinize-before-stop.mjs` — the Stop-hook 3-of-3 gate (SCRUTINY-GATE stage backstop)
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK17 — the unit envelope
