---
title: PRISM pipeline — /diagnose-fix forensic-classify -> apply -> test -> trace
slug: diagnose-fix
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK22
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [/forge-debug, error-pattern-memory-lookup, regression-hunter-agent, /scrutiny-gate, test-runner-agent, trace-log]
stages: [classify, suggest, apply, test, trace, optional-memory-write]
consumes:
  - mcp-server/data/state/error-memory.json
  - .claude/commands/forge-debug.md
  - .claude/commands/scrutiny-gate.md
produces:
  - fix-diff
  - test-verdict
  - state/shared/diagnose-fix-log.jsonl
  - novel-class-memory-candidate
downgrade:
  mode: user-prompt
  fallback_to: manual-fix-without-classifier
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, latency_ms, outcome, session_id, slot]
---

# `/diagnose-fix` — Forensic Fix Pipeline (U-CK22)

Composed front-end for "something broke, here's the artifact, fix
it." Classifies the failure, proposes a fix grounded in
error-pattern memory, applies under per-file scrutiny, runs tests,
traces the verdict. R8: adds 0 logic.

## Stage table

| # | Stage | What | Stop-on-fail |
|---|-------|------|--------------|
| 1 | classify | read artifact + error-pattern-memory lookup + regression-hunter agent | yes — unknown class escalates to operator |
| 2 | suggest | based on class, propose fix; cite prior memory; dry-run diff | yes — HARD-BLOCK if fix would weaken assertion or skip test |
| 3 | apply | operator confirm (or --yes) → Edit/Write → per-file scrutiny Mode A fires | yes — scrutiny FAIL reverts Edit |
| 4 | test | run affected tests (or SUT if artifact IS a test) | yes — N=3 retry budget then revert |
| 5 | trace | append to state/shared/diagnose-fix-log.jsonl | warn — advisory |
| 6 | memory-write (optional) | novel class + repeated → memory candidate for operator review | no — opt-in |

## Classification taxonomy

| Class | Pattern | Typical fix |
|-------|---------|-------------|
| stub-assertion | `toBeDefined()` / `toBe(true)` against opaque result | replace with reference-value assertion (R12) |
| schema-drift | engine API doesn't match dispatcher schema | align schema OR fix engine API; reject "weaken schema to fit" |
| inline-constant | physics const inlined instead of imported from `physics/constants.ts` | extract to constants, import |
| race | shared-tree commit collision, RTK sweep, file-claim conflict | retry with raw git, slot-task-claim, conflict-fork |
| wedged-cli | RTK silently drops output / commit | bypass with `PATH=/c/Program\ Files/Git/cmd git` raw |
| missing-handler | dispatcher action defined but case handler absent | add case handler + lazy import |
| encoding | C0 control bytes in PS5.1 ConvertTo-Json | strip `[\x00-\x1F]` pre-serialization |
| path-resolution | hardcoded cwd-relative path breaks under different invocation cwd | switch to fileURLToPath / PROJECT_ROOT pattern |
| other | unrecognized | escalate to operator |

## Rollback chain

| Failed stage | Rollback |
|--------------|----------|
| 1 classify | no-op (read-only) |
| 2 suggest | no-op (dry-run diff is read-only) |
| 3 apply | git restore the edited file |
| 4 test | git restore (after max attempts); release slot-task claim |
| 5 trace | no-op (log append already happened or didn't — non-load-bearing) |
| 6 memory-write | git restore memory file + revert MEMORY.md pointer |

## Inputs

| Flag | Default | Purpose |
|------|---------|---------|
| `<artifact>` | (required) | path to broken file |
| `--symptom <text>` | (none) | aids classification |
| `--yes` | false | auto-apply (extreme caution) |
| `--max-attempts <N>` | 3 | TEST retry budget |
| `--no-memory-write` | false | skip stage 6 |

## Composes-with

Composed BY:

- `/session-cycle` (U-CK17) BUILD when deliverable is "fix broken X"
- `/loop` autonomous-iter test-failure sweeps
- `/pipeline execute diagnose-fix` (U-CK25)
- direct operator invocation when an artifact breaks

Composes:

- `/forge-debug` — diagnostic harness
- error-pattern-memory (`mcp-server/data/state/error-memory.json`)
- `regression-hunter` agent
- `test-runner` agent
- `/scrutiny-gate` (U-CK19) Mode A on APPLY
- `/learn-pipeline` (U-CK20) for stage-6 novel-class ingest

## Karpathy discipline pins

- **R8** — CLASSIFY before fix; never edit without classifying
- **R12** — fix that weakens assertion is HARD-BLOCKED at SUGGEST stage
- **R10** — each stage explicit verdict (class? proposed? PASS/FAIL?)
- **never delete only disable** — fixes preserve artifact when possible

## Knobs

- `PRISM_DIAGNOSE_FIX_AUTO_APPLY=1` — `--yes` alias
- `PRISM_DIAGNOSE_FIX_MAX_ATTEMPTS=N` — override default 3
- `PRISM_DIAGNOSE_FIX_NO_MEMORY=1` — `--no-memory-write` alias
- Scrutiny gate Mode A on APPLY is non-bypassable

## Related

- [[session-cycle]] — fires diagnose-fix in BUILD for fix-class units
- [[learn-pipeline]] — stage 6 candidate emission target (U-CK20)
- [[scrutiny-gate]] — Mode A APPLY-stage backstop (U-CK19)
- [[pipeline]] — meta-command (U-CK25)

## See also

- `.claude/commands/diagnose-fix.md` — operator skill spec (gitignored mirror)
- `feedback_always_capture_lessons.md` — memory-write doctrine
- `mcp-server/data/state/error-memory.json` — error-pattern memory source
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK22 — envelope
