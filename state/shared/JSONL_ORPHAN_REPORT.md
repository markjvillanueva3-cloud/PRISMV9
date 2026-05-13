# JSONL Orphan Report

> Generated: 2026-05-13T22:05:32.632Z
> Source: `scripts/jsonl-orphan-scan.mjs`
> Target: `H:/prism/state/shared`
> Min lines: 1

**Rule:** Advisory only — an orphan flag means no codebase file references the basename, but doesn't prove no consumer exists (operators may grep externally). Verify before deleting; wiring up is usually the right move.

## Summary

- JSONLs found: 29
- JSONLs with ≥1 line(s): 26
- **Orphans (no consumer): 3**
- Consumed: 23
- Errors: 0
- Consumer files scanned: 29923
- Consumer files skipped: 1 too-large, 0 read-error

## Orphans

| Basename | Lines | Bytes | Path |
|----------|-------|-------|------|
| fusion-pipeline-runs.jsonl | 40 | 17427 | `H:/prism/state/shared/fusion-pipeline-runs.jsonl` |
| roadmap-pass-history.jsonl | 12 | 10539 | `H:/prism/state/shared/roadmap-pass-history.jsonl` |
| adaptive-thresholds-history.jsonl | 3 | 1491 | `H:/prism/state/shared/adaptive-thresholds-history.jsonl` |

<details><summary>Consumed JSONLs (collapsed)</summary>

| Basename | Lines | Consumers | Sample |
|----------|-------|-----------|--------|
| .tool-runtimes.jsonl | 193 | 3 | `bundles/posttool-bash-read-bundle.mjs` · `bundles/posttool-edit-bundle.mjs` · `hooks/tool-watchdog.mjs` |
| AGENT_CHAT.jsonl | 200 | 21 | `__tests__/golfSlotWriteAllowlist.test.ts` · `roadmap/ULTIMATE-PRISM-ROADMAP-v25.md` · `scripts/bootstrap-golf.mjs` · `__tests__/jsonl-orphan-scan.test.mjs` · `hooks/AGI_INFRA_PHASE_A_WIRING.md` |
| async-hook-queue.jsonl | 75 | 2 | `engines/AsyncHookDispatcherEngine.ts` · `prism/CLAUDE.md` |
| awareness-rebuild-queue.jsonl | 1 | 3 | `__tests__/cog-bridge-drain.test.ts` · `hooks/cog-bridge-awareness-rebuild.mjs` · `helpers/cog-bridge-drain.mjs` |
| brief-drift-log.jsonl | 3 | 1 | `commands/refresh-awareness.md` |
| CLAIM_EVENTS.jsonl | 272 | 2 | `hooks/work-claim.mjs` · `helpers/roadmap-claim-registry.mjs` |
| cog-bridge-memory-capture.jsonl | 1 | 3 | `__tests__/cog-bridge-drain.test.ts` · `hooks/cog-bridge-ai-memory-capture.mjs` · `helpers/cog-bridge-drain.mjs` |
| CONSENSUS_NEURAL_FEED.jsonl | 1 | 1 | `engines/ConsensusNeuralFeedbackEngine.ts` |
| consensus-queue.jsonl | 56 | 4 | `__tests__/AutoConsensusHooks.test.ts` · `hooks/auto-consensus-critical-edit.mjs` · `hooks/auto-consensus-userprompt.mjs` · `hooks/stop-consensus-drain.mjs` |
| COORDINATION_LEDGER.jsonl | 695 | 3 | `schemas/sessionActionSchemas.ts` · `dispatchers/sessionDispatcher.ts` · `helpers/agent-coordination.mjs` |
| goal-gate-bypasses.jsonl | 3 | 2 | `hooks/goal-complete-gate.mjs` · `prism/CLAUDE.md` |
| mcp-orphan-monitor.jsonl | 37 | 1 | `system-health/04-prism-mcp-orphan-monitor.ps1` |
| phase-claims.jsonl | 1 | 4 | `helpers/conflict-predictor.mjs` · `helpers/phase-claim-manager.mjs` · `user/claim-phase.md` · `commands/claim-phase.md` |
| pipeline-telemetry.jsonl | 11 | 2 | `commands/forge6.md` · `commands/rgs6.md` |
| precompact-trigger.jsonl | 18 | 1 | `hooks/precompact-auto-trigger.mjs` |
| ROADMAP_COMPLETIONS_QUEUE.jsonl | 608 | 1 | `hooks/roadmap-completion-logger.mjs` |
| session-learning-log.jsonl | 1048 | 5 | `schemas/unifiedErrorLedger.ts` · `__tests__/UnifiedErrorLedgerMigration.test.ts` · `scripts/generate-knowledge-galaxy.mjs` · `scripts/migrate-error-ledgers.mjs` · `hooks/session-learning-feedback.mjs` |
| SUBAGENT_ACTIVITY.jsonl | 1641 | 1 | `helpers/subagent-results.mjs` |
| system-viz-headline-history.jsonl | 1 | 4 | `__tests__/buildHeadlineHistory.test.ts` · `__tests__/golfSlotWriteAllowlist.test.ts` · `scripts/bootstrap-golf.mjs` · `scripts/build-headline-history.mjs` |
| task-claims.jsonl | 34 | 1 | `hooks/task-created-claim-guard.mjs` |
| TEST_GATE_OVERRIDES.jsonl | 1 | 1 | `hooks/stop_on_failing_tests.mjs` |
| tribal-citation-log.jsonl | 316 | 1 | `scripts/generate-knowledge-galaxy.mjs` |
| UNIFIED_EDIT_TAP.jsonl | 4559 | 2 | `scripts/unified-observability-drain.mjs` · `hooks/unified-edit-tap.mjs` |

</details>

## What to do with an orphan

1. **Wire it up** — append a reader hook/script to the codebase. Usually the right move; the data was being collected for a reason.
2. **Archive** — move to `state/shared/.archive/<YYYY-MM>/` if the collection era is over but the data is worth keeping.
3. **Delete** — only if the writer is also removed in the same commit.
4. **Rename** — if the file should be consumed under a different name (refactor signal).

Companion: `scripts/audit-close-out-candidates.mjs` (envelope-drift sister).