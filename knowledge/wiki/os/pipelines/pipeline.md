---
title: PRISM pipeline — /pipeline meta-command (list/dry-run/execute/resume)
slug: pipeline
kind: pipeline
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK25
author: claude-2d30710b (slot hotel, /loop command-kernel)
trigger: command
composed_of: [pipeline-exec-list, pipeline-exec-dry-run, pipeline-exec-force, pipeline-exec-resume]
stages: [parse-subcommand, dispatch-to-executor, surface-result]
consumes: [knowledge/wiki/os/pipelines/, state/shared/pipeline-telemetry.jsonl]
produces: [stage-plan, execution-result, rollback-records, telemetry-rows]
downgrade:
  mode: hard-stop
  fallback_to: dry-run
telemetry:
  ledger: state/shared/pipeline-telemetry.jsonl
  fields: [fire_ts, chain_id, step_id, latency_ms, outcome, session_id, slot]
---

# `/pipeline` — Pipeline Meta-Command (U-CK25)

The operator-facing skin over the U-CK13 pipeline executor (`.claude/kernel/pipeline-exec.mjs`). Adds 0 logic — every subcommand maps to an existing executor flag, so the operator vocab is `list | dry-run | execute | resume` instead of CLI-flag muscle-memory. This entry is the committed registry mirror per U-CK05; the operator-facing skill spec is `.claude/commands/pipeline.md` (gitignored on disk).

## Subcommands

| Subcommand | Maps to | Side-effects |
|------------|---------|--------------|
| `list` | `pipeline-exec.mjs --list` | none — read-only enumeration |
| `dry-run <slug>` (default) | `pipeline-exec.mjs <slug>` | none — plan only |
| `execute <slug>` | `pipeline-exec.mjs <slug> --force-execute` | **invokes handlers** — destructive |
| `resume <slug>` | telemetry-walk + plan-from-start | none (the operator decides re-run scope) |

## Load-bearing invariants (inherited from U-CK13)

1. **Dry-run is the safety default.** Every chain starts as a plan, never a side-effect. Operator must explicitly type `execute` (which maps to `--force-execute`) to invoke handlers.
2. **Rollback chain fires on stage failure.** A stage that returns `{ok:false}` or throws walks the prior succeeded stages in REVERSE order through their rollback handlers. The skill surfaces `{ok:false, failedAt:idx, results, rollbacks}` honestly — no quiet retry.
3. **Telemetry is non-optional in execute mode.** Every stage appends one JSONL row to `state/shared/pipeline-telemetry.jsonl` (`{ts, slug, stepId, ok, tokens, latencyMs, outcome}`). The `resume` subcommand reads the SAME ledger to find the last successful stage.
4. **Per-tier token-budget surfaced not enforced.** The plan annotates each stage with the `token_budget.tier` ceiling (`entry-router: 500`, `coding: 2000`, `product-autopilot: 5000`); enforcement is the caller's obligation (per U-CK13 design — the executor cannot measure arbitrary handler token cost).

## Resume semantics

`/pipeline resume <slug>` is operator-mediated:

1. Read the newest `slug:<slug>, ok:true` row from `pipeline-telemetry.jsonl`.
2. Surface that `stepId` to the operator with the remaining stages in the plan.
3. Operator chooses: re-run from start (default), cherry-pick remaining stages via direct executor invocation, OR abandon. Auto-resume (skip succeeded stages and continue from the failed one) is intentionally deferred to a future `U-CK13.1` unit — the rollback chain semantics mean a partial-resume needs explicit operator consent.

This is honest scope (R12): we do not pretend the executor supports auto-resume.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | success (`list` succeeded, dry-run report emitted, all stages OK in execute) |
| 1 | any stage `{ok:false}` after rollback completes |
| 2 | setup / IO error — slug unknown, schema invalid, ledger unwritable |

## Discipline pins

- **R8: read before write.** `/pipeline` adds 0 logic. Any new pipeline behavior belongs in `pipeline-exec.mjs`, not this skill.
- **R10: checkpoint.** Each subcommand is a checkpoint — the operator sees plan / result / verdict before the next call. No silent multi-step.
- **R12: fail loud.** `failedAt` + `stepId` are surfaced in the operator output. The downgrade `mode: hard-stop` in this entry's frontmatter applies to the SKILL itself — if the executor cannot start (slug unknown), we exit 2, not silent-degrade to `dry-run`.

## Use cases

- Operator audit: which pipelines are registered → `/pipeline list`.
- Pre-merge gate: `/pipeline dry-run <changed-slug>` against the new registry entry.
- Scheduled fire: cron / hook calls `pipeline-exec.mjs <slug> --force-execute` directly (the skill's `execute` is the operator's interactive front-door — programmatic callers skip the skill).
- Forensic: `/pipeline dry-run <slug> --json` returns the annotated plan; diff against expected to catch frontmatter drift.

## Composes-with

| Caller | When |
|--------|------|
| `/session-cycle` (U-CK17) | calls `pipeline-exec.mjs` for the checkin → pick → research → build → close-out → handoff chain |
| `/research` (U-CK18) | registered AS a pipeline at `knowledge/wiki/os/pipelines/research.md` — invoked via `/pipeline execute research` OR direct skill call |
| `/learn-pipeline` (U-CK20) | same — extract → dedup → tribal → wiki → memory chain |
| `/wire-pipeline` (U-CK21) | same — orphan-inventory → dedup → wire → test → close chain |
| `/forge-supervised` (U-CK24) | same — /forge-triple → /scrutiny-gate → close chain |

## Related

- [[loop]] — sister pipeline (autonomous iteration that fires `/pipeline execute <slug>`)
- [[goal-complete]] — sister pipeline (Stop-hook gate that runs as a pipeline)
- [[knowledge-injection]] — sister pipeline (KIP closed-loop)
- [[research]] — sister pipeline + immediate downstream consumer

## See also

- `.claude/commands/pipeline.md` — operator skill spec (gitignored mirror)
- `.claude/kernel/pipeline-exec.mjs` (U-CK13) — the executor
- `knowledge/wiki/os/pipelines/_schema.md` (U-CK12) — frontmatter schema
- `scripts/validate-pipeline-registry.mjs` — schema validator
- `state/shared/pipeline-telemetry.jsonl` (ACP-MS0A P0-U04) — telemetry ledger
- `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK25 — the unit envelope
