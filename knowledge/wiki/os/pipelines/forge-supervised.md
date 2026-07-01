---
title: PRISM pipeline — /forge-supervised (forge-triple + scrutiny-gate + close-out)
slug: forge-supervised
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK24
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [duplication-guard-preflight, /research, /forge-triple, /scrutiny-gate, /close-out-audit, commit]
stages: [pre-flight, forge, scrutiny-3of3, close-out, commit]
consumes:
  - .claude/commands/forge-triple.md
  - .claude/commands/research.md
  - .claude/commands/scrutiny-gate.md
  - DuplicationGuardEngine
produces:
  - engine-skill-hook-trio
  - scrutiny-ledger-entry
  - close-out-record
  - commit
downgrade:
  mode: hard-stop
  fallback_to: manual-forge-triple-without-supervision
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, latency_ms, outcome, session_id, slot]
---

# `/forge-supervised` — Forge with Mandatory Scrutiny (U-CK24)

The supervised front-end over `/forge-triple` — fires the 3-of-3
scrutiny gate BEFORE commit, then writes a close-out record. Adds 0
new logic — composes existing surfaces. Solves the rogue-forge
problem where direct `/forge-triple` calls commit before the Stop
hook fires the gate.

## Stage table

| # | Stage | What | Stop-on-fail |
|---|-------|------|--------------|
| 1 | pre-flight | duplicationGuardEngine.mustCheckBeforeCreating() + ENGINE_DIGEST.md scan + /research <token> (U-CK18) | yes — dup THROW; close-out-debt short-circuits to step 4 |
| 2 | forge | /forge-triple <token> with per-file 2-reviewer gate (Mode A of U-CK19) | yes — reviewer FAIL halts before next file |
| 3 | scrutiny-3of3 | /scrutiny-gate end-of-task — 3 parallel agents, all 3 must PASS | yes — Stop hook would block anyway; gate is non-bypassable |
| 4 | close-out | envelope flip (if unit-bound) + MILESTONE_PROGRESS update + chat-bus post | yes — drift must resolve |
| 5 | commit | [SCOPE]/U-ID: title; references 3-of-3 ledger entry | warn — RTK sweep collision retry with raw git |

## Stage 3 — why it's the load-bearing addition

Direct `/forge-triple` invocations commit immediately. The Stop hook
fires the gate AFTER commit; if a finding surfaces, fixing requires a
follow-up commit. `/forge-supervised` moves the gate ALEAD OF the
commit so the trio lands in a single PASS-already commit. This
removes the "fix-up commit" tax for the common case.

## Inputs

| Flag | Default | Purpose |
|------|---------|---------|
| `<token>` | (required) | engine name or `MILESTONE::U-XX` unit-id |
| `--unit <id>` | (none) | bind to roadmap unit; enables envelope flip |
| `--skip-research` | false | skip pre-flight step 3 (R8 violation; not recommended) |
| `--no-commit` | false | stop after stage 4; operator commits manually |

## Rollback chain

| Failed stage | Rollback |
|--------------|----------|
| 1 pre-flight | no-op (read-only) |
| 2 forge | git restore staged + working tree to pre-stage-2 ref; release slot-task claim |
| 3 scrutiny | leave files on disk + ledger FAIL entry; do NOT commit |
| 4 close-out | un-flip envelope; un-write MILESTONE_PROGRESS entry; do NOT post chat-bus |
| 5 commit | RTK retry with raw `PATH=/c/Program\ Files/Git/cmd git`; if real failure, post to AGENT_CHAT |

The U-CK13 executor invokes `.claude/kernel/rollback/forge-supervised/<stage>.mjs` if present. Today these are operator-mediated for safety (auto-git-reset in a shared tree clobbers peers).

## Composes-with

Composed BY:

- `/session-cycle` (U-CK17) BUILD stage when deliverable is a new engine+skill+hook trio
- `/pipeline execute forge-supervised` (U-CK25) — programmatic
- direct operator invocation

Composes:

- `/research` (U-CK18) — pre-flight prior-art
- `/forge-triple` — trio generator
- `/scrutiny-gate` (U-CK19) — Mode B 3-of-3
- `duplicationGuardEngine.mustCheckBeforeCreating()` — pre-flight THROW
- `/close-out-audit` — pre-commit drift check

## Knobs

- `PRISM_FORGE_SUPERVISED_DISABLE_RESEARCH=1` — `--skip-research` alias
- `PRISM_FORGE_SUPERVISED_NO_COMMIT=1` — `--no-commit` alias
- 3-of-3 gate is NOT exposed as a disable flag. The Stop hook is in MINIMAL_ALLOWLIST and would block regardless.

## Karpathy discipline pins

- **R8** — pre-flight stage IS the read step
- **R10** — every stage's exit is an explicit PASS/FAIL verdict
- **R11** — chain order fixed: pre-flight → forge → scrutiny → close-out → commit
- **R12** — `--skip-research` / `--no-commit` are honest flags; scrutiny bypass is intentionally absent

## Related

- [[session-cycle]] — fires forge-supervised in BUILD when deliverable is a trio
- [[scrutiny-gate]] — Mode B ceremony fired in stage 3
- [[research]] — pre-flight prior-art (U-CK18)
- [[pipeline]] — meta-command that can fire forge-supervised (U-CK25)

## See also

- `.claude/commands/forge-supervised.md` — operator skill spec (gitignored mirror)
- `.claude/commands/forge-triple.md` — underlying generator
- `feedback_parallel_scrutiny_per_file.md` — per-file gate doctrine in stage 2
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK24 — envelope
