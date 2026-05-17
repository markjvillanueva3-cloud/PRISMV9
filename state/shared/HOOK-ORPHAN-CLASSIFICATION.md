# HOOK-ORPHAN-CLASSIFICATION

_Generated: 2026-05-17T03:00:00Z_

_Source: SYSTEM-VIZ-BRAIN-MS0 / U-P0-HOOK-ORPHAN-RECONCILE — composes `hook-orphan-scan.mjs` + `hook-fire-rank.mjs`. Advisory; never deletes (per `feedback_never_delete_only_disable`)._

## Totals

- orphan pool in: **275**
- classified out: **275**
- WIRE high-confidence (score ≥ min): **16**

## Action distribution

- **WIRE**: 16
- **REVIEW**: 249
- **ARCHIVE**: 10
- **KEEP-AS-IS**: 0

## WIRE — top 16 / 16

| Score | Tier | Hook | Evidence |
|-------|------|------|----------|
| 51 | T0 | `golf-slot-write-allowlist` | docs:1 · doc-refs-1,tier-T0 |
| 51 | T0 | `smoke-test` | docs:1 · doc-refs-1,tier-T0 |
| 51 | T0 | `stop_on_uncommitted_critical` | docs:1 · doc-refs-1,tier-T0 |
| 36 | T2 | `tribal-by-domain-inject` | docs:1 · fires:45 · doc-refs-1,fires-45-via-bundle-or-async,tier-T2 |
| 31 | T2 | `claude-brief-staleness-check` | docs:1 · doc-refs-1,tier-T2 |
| 31 | T2 | `memory-rag-inject` | docs:1 · doc-refs-1,tier-T2 |
| 26 | T3 | `wiki-recall-on-read` | docs:1 · fires:191 · doc-refs-1,fires-191-via-bundle-or-async,tier-T3 |
| 25 | T3 | `inbox-capture-sharpen` | fires:1380 · fires-1380-via-bundle-or-async,tier-T3 |
| 21 | T3 | `alpha-slot-reaper-guardian` | docs:1 · doc-refs-1,tier-T3 |
| 21 | T3 | `error-pattern-learner` | docs:1 · doc-refs-1,tier-T3 |
| 21 | T3 | `error-pattern-memory` | docs:1 · doc-refs-1,tier-T3 |
| 21 | T3 | `mirror-c-to-h` | docs:1 · doc-refs-1,tier-T3 |
| 15 | T4 | `auto-postmortem-on-failure-restart` | fires:1 · fires-1-via-bundle-or-async,tier-T4 |
| 11 | T4 | `awareness-snapshot` | docs:1 · doc-refs-1,tier-T4 |
| 11 | T4 | `prism-awareness-v2` | docs:1 · doc-refs-1,tier-T4 |
| 11 | T4 | `sessionstart-bundle` | docs:1 · doc-refs-1,tier-T4 |

## REVIEW — top 25 / 249

| Score | Tier | Hook | Evidence |
|-------|------|------|----------|
| 10 | T0 | `agi-safety-envelope-guard` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `ai-duplication-guard` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `allow-superseding` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `claim-required` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `cost-ceiling-stop` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `cross-terminal-conflict` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `dep-graph-impact` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `document-preserve-guard` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `erp-quote-variance-guard` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `file-claim-commit-guard` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `fix-stdin-pattern` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `forge-intent-claim` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `hook-modification-justification` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `no-re-extract` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `ollama-reviewer-second-opinion` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `ollama-schema-engine-sync-gate` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `postgen-validator-skip-guard` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `pre-commit-conflict-sim` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `pre-delete-guard` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `pre-edit-lane-guard` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `pre-tool-p1` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `reviewer-fail-latch` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `skill-3q-gate` | tiered-but-no-doc-or-fire-evidence |
| 10 | T0 | `sparc-optin-gate` | tiered-but-no-doc-or-fire-evidence |
| 9 | T1 | `auto-learn-budget-guard` | tiered-but-no-doc-or-fire-evidence |

## ARCHIVE — top 10 / 10

| Score | Tier | Hook | Evidence |
|-------|------|------|----------|
| 1 | T3 | `_envelope` | helper-prefix-_ |
| 1 | T1 | `blueprint-coverage-floor-guard.test` | test-file-pattern |
| 1 | — | `chat-bus-inject.test` | test-file-pattern |
| 1 | — | `checkin-args-surface.test` | test-file-pattern |
| 1 | — | `regression-auto-write.test` | test-file-pattern |
| 1 | — | `rename-window-intercept.test` | test-file-pattern |
| 1 | — | `stop-dashboard-regen.test` | test-file-pattern |
| 1 | — | `stop-slot-task-claims-advisory.test` | test-file-pattern |
| 1 | — | `tribal-by-domain-inject.test` | test-file-pattern |
| 1 | — | `viz-first-redirect.test` | test-file-pattern |

## Operator next steps

1. Review top **WIRE** rows; for each, decide event matcher + tier + bundle vs individual entry (CLAUDE.md doctrine: individual entries, NOT bundle, for high-contention slots).
2. **ARCHIVE** rows: move to `.claude/hooks/_archived/` — never `rm`.
3. **REVIEW** rows: read the hook header, add tier frontmatter if real, otherwise downgrade to ARCHIVE.
4. Re-run: `node scripts/audit-hook-wiring.mjs --json` after settings.json changes to confirm reconcile.
