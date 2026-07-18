# Stop Hook Audit — 2026-05-26

Source: `scripts/audit-stop-hooks.mjs` (auto-generated, read-only audit)
Trigger: KNOWLEDGE-WIKI-MS0 / U-WIKI00 — Agent 15 scrutiny score 28/100

## Summary

- Total `.mjs` hook files in `.claude/hooks/`: **824**
- Stop-event hook files (by naming): **103**
- Registered in `settings.json` Stop array: **37**
- Orphans (file exists, NOT registered): **84**
  - Build-critical (should re-register): **6**
  - Advisory (review case-by-case): **78**
- Broken refs (registered, file missing): **18**
- Hooks disabled via `DISABLED_TOKEN_REDUX_2026_04_23` marker: **7**

## 🔴 Build-Critical Orphans (RECOMMEND RE-REGISTER, continueOnError:false)

Per `MEMORY.md` `feedback_dont_soften_completeness_gates.md`: these guard correctness, not advisory.

| Approve? | Hook file | Notes |
|----------|-----------|-------|
| [ ] | `stop_on_circular_deps.mjs` | Build-critical per filename heuristic — review file head before re-enabling |
| [ ] | `stop_on_dirty_registry.mjs` | Build-critical per filename heuristic — review file head before re-enabling |
| [ ] | `stop_on_missing_tests.mjs` | Build-critical per filename heuristic — review file head before re-enabling |
| [ ] | `stop_on_orphan_engine.mjs` | Build-critical per filename heuristic — review file head before re-enabling |
| [ ] | `stop_on_uncommitted_critical.mjs` | Build-critical per filename heuristic — review file head before re-enabling |
| [ ] | `stop_on_unregistered_asset.mjs` | Build-critical per filename heuristic — review file head before re-enabling |

## 🟡 Advisory Orphans (review case-by-case)

| Approve? | Hook file |
|----------|-----------|
| [ ] | `stop_on_awareness_degraded.mjs` |
| [ ] | `stop-bundle.mjs` |
| [ ] | `stop-regression-bundle.mjs` |
| [ ] | `stop-regression-bundle.test.mjs` |
| [ ] | `git-sync-stop.mjs` |
| [ ] | `session-cleanup.mjs` |
| [ ] | `session-end-goal-synthesis.mjs` |
| [ ] | `session-end-p1.mjs` |
| [ ] | `session-learning-feedback.mjs` |
| [ ] | `stop-audit-registry-refresh.mjs` |
| [ ] | `stop-bash-orphan-cleaner.mjs` |
| [ ] | `stop-bg-runner.mjs` |
| [ ] | `stop-bug-finding-wiki-gate.mjs` |
| [ ] | `stop-bug-finding-wiki-gate.test.mjs` |
| [ ] | `stop-cohort-drift-watch.mjs` |
| [ ] | `stop-compounding-budget.mjs` |
| [ ] | `stop-cross-slot-skill-suggest.mjs` |
| [ ] | `stop-cross-tree-collision-advisory.mjs` |
| [ ] | `stop-dashboard-regen.mjs` |
| [ ] | `stop-dashboard-regen.test.mjs` |
| [ ] | `stop-defer-queue-drain.mjs` |
| [ ] | `stop-dream-queue-surface.mjs` |
| [ ] | `stop-fleet-soul-graduation.mjs` |
| [ ] | `stop-force-handoff.mjs` |
| [ ] | `stop-force-loop-continue.mjs` |
| [ ] | `stop-graph-staleness-backstop.mjs` |
| [ ] | `stop-graph-staleness-backstop.test.mjs` |
| [ ] | `stop-hook-aggregator.mjs` |
| [ ] | `stop-index-sync.mjs` |
| [ ] | `stop-ledger-prune.mjs` |
| [ ] | `stop-memory-size-watchdog.mjs` |
| [ ] | `stop-memory-to-wiki-suggest.mjs` |
| [ ] | `stop-obsidian-memory-feed.mjs` |
| [ ] | `stop-playbook-corpus-drift-advisory.mjs` |
| [ ] | `stop-psn-automate-status.mjs` |
| [ ] | `stop-psn-autonomy-tick.mjs` |
| [ ] | `stop-psn-savings-aggregate.mjs` |
| [ ] | `stop-rag-index-staleness-check.mjs` |
| [ ] | `stop-regression-backflow.mjs` |
| [ ] | `stop-release-slot.mjs` |
| [ ] | `stop-rtk-fraction-recalibrate.mjs` |
| [ ] | `stop-session-spend-summary.mjs` |
| [ ] | `stop-slot-task-claims-advisory.mjs` |
| [ ] | `stop-slot-task-claims-advisory.test.mjs` |
| [ ] | `stop-soul-evolution.mjs` |
| [ ] | `stop-system-awareness-freshness.mjs` |
| [ ] | `stop-system-awareness-freshness.test.mjs` |
| [ ] | `stop-system-viz-drift.mjs` |
| [ ] | `stop-system-viz-reminder.mjs` |
| [ ] | `stop-tab-blink.mjs` |
| [ ] | `stop-token-savings-summary.mjs` |
| [ ] | `stop-tribal-distill-suggest.mjs` |
| [ ] | `stop-wiki-from-nodes-autopopulate.mjs` |
| [ ] | `stop-wiki-from-nodes-autopopulate.test.mjs` |
| [ ] | `stop-wiring-audit-suggest.mjs` |
| [ ] | `stop_on_awareness_degraded.mjs` |
| [ ] | `stop_on_content_deletion.mjs` |
| [ ] | `stop_on_extraction_incomplete.mjs` |
| [ ] | `stop_on_formula_uncited.mjs` |
| [ ] | `stop_on_hook_unregistered.mjs` |
| [ ] | `stop_on_incomplete_pipeline.mjs` |
| [ ] | `stop_on_non_h_roadmap.mjs` |
| [ ] | `stop_on_open_claim.mjs` |
| [ ] | `stop_on_open_lock.mjs` |
| [ ] | `stop_on_repeat_error.mjs` |
| [ ] | `stop_on_roadmap_drift.mjs` |
| [ ] | `stop_on_session_mistake_digest.mjs` |
| [ ] | `stop_on_stale_handoff.mjs` |
| [ ] | `stop_on_sx_fail.mjs` |
| [ ] | `stop_on_uncommitted_memory.mjs` |
| [ ] | `stop_on_undocumented_action.mjs` |
| [ ] | `stop_on_user_correction.mjs` |
| [ ] | `stop-force-handoff.test.mjs` |
| [ ] | `stop-force-loop-continue.test.mjs` |
| [ ] | `stop-playbook-corpus-drift-advisory.test.mjs` |
| [ ] | `stop-rtk-fraction-recalibrate.test.mjs` |
| [ ] | `stop-session-spend-summary.test.mjs` |
| [ ] | `stop-token-savings-summary.test.mjs` |

## ✅ Currently Registered Stop Hooks

| File | continueOnError | Effective gate? |
|------|-----------------|-----------------|
| `stop-auto-wire.mjs` | `null` | ⚠️ advisory only |
| `stop-consensus-drain.mjs` | `null` | ⚠️ advisory only |
| `async-hook-enqueue.mjs` | `null` | ⚠️ advisory only |
| `output-cache-capture.mjs` | `null` | ⚠️ advisory only |
| `roadmap-checkpoint.mjs` | `null` | ⚠️ advisory only |
| `session-end-peer-share.mjs` | `null` | ⚠️ advisory only |
| `duplication-guard-stop.mjs` | `null` | ⚠️ advisory only |
| `stop-mark-completed-tasks.mjs` | `null` | ⚠️ advisory only |
| `claim-registry-release.mjs` | `null` | ⚠️ advisory only |
| `stop_on_orphan_children.mjs` | `null` | ⚠️ advisory only |
| `stop_on_c_drive_write.mjs` | `null` | ⚠️ advisory only |
| `stop_on_cutting_calculation_protocol.mjs` | `null` | ⚠️ advisory only |
| `linear-roadmap-sync.mjs` | `null` | ⚠️ advisory only |
| `supabase-state-sync.mjs` | `null` | ⚠️ advisory only |
| `stop_on_unwired_assets.mjs` | `null` | ⚠️ advisory only |
| `stop_on_skill_unwired.mjs` | `null` | ⚠️ advisory only |
| `enforce-roadmap-closeout.mjs` | `null` | ⚠️ advisory only |
| `stop_on_failing_tests.mjs` | `null` | ⚠️ advisory only |
| `commit-pressure-stop-gate.mjs` | `null` | ⚠️ advisory only |
| `always-build-guard.mjs` | `null` | ⚠️ advisory only |
| `stop_on_build_error.mjs` | `null` | ⚠️ advisory only |
| `stop_on_duplicate_created.mjs` | `null` | ⚠️ advisory only |
| `stop_on_svi_regression.mjs` | `null` | ⚠️ advisory only |
| `stop_on_broken_imports.mjs` | `null` | ⚠️ advisory only |
| `stop_on_unsafe_gcode.mjs` | `null` | ⚠️ advisory only |
| `stop_on_hook_unregistration.mjs` | `null` | ⚠️ advisory only |
| `quality-dashboard-alert.mjs` | `null` | ⚠️ advisory only |
| `stop-obsidian-memory-extract.mjs` | `null` | ⚠️ advisory only |
| `session-consolidate-graph.mjs` | `null` | ⚠️ advisory only |
| `stop_close_prism_nodes.mjs` | `null` | ⚠️ advisory only |
| `stop_close_prism_nodes_v2.mjs` | `null` | ⚠️ advisory only |
| `scrutinize-before-stop.mjs` | `null` | ⚠️ advisory only |
| `enforce-handoff-topic.mjs` | `null` | ⚠️ advisory only |
| `error-pattern-promote.mjs` | `null` | ⚠️ advisory only |
| `leave-a-copy-behind-guard.mjs` | `null` | ⚠️ advisory only |
| `autonomous-loop-watchdog.mjs` | `null` | ⚠️ advisory only |
| `bash-orphan-cleaner.mjs` | `null` | ⚠️ advisory only |

## ⛔ Broken Refs (registered but file missing)

- `async-hook-enqueue.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/async-hook-enqueue.mjs`
- `output-cache-capture.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/output-cache-capture.mjs`
- `roadmap-checkpoint.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/roadmap-checkpoint.mjs`
- `claim-registry-release.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/claim-registry-release.mjs`
- `linear-roadmap-sync.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/linear-roadmap-sync.mjs`
- `supabase-state-sync.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/supabase-state-sync.mjs`
- `enforce-roadmap-closeout.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/enforce-roadmap-closeout.mjs`
- `commit-pressure-stop-gate.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/commit-pressure-stop-gate.mjs`
- `quality-dashboard-alert.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/quality-dashboard-alert.mjs`
- `session-consolidate-graph.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/session-consolidate-graph.mjs`
- `stop_close_prism_nodes.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/stop_close_prism_nodes.mjs`
- `stop_close_prism_nodes_v2.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/stop_close_prism_nodes_v2.mjs`
- `scrutinize-before-stop.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/scrutinize-before-stop.mjs`
- `enforce-handoff-topic.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/enforce-handoff-topic.mjs`
- `error-pattern-promote.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/error-pattern-promote.mjs`
- `leave-a-copy-behind-guard.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/leave-a-copy-behind-guard.mjs`
- `autonomous-loop-watchdog.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/autonomous-loop-watchdog.mjs`
- `bash-orphan-cleaner.mjs` — registered in settings.json but no file at `H:\prism\.claude\hooks/bash-orphan-cleaner.mjs`

## 🔇 Disabled via `DISABLED_TOKEN_REDUX_2026_04_23` Marker

Files with this marker short-circuit early (`process.exit(0)`) — silently advisory.
Per `feedback_dont_soften_completeness_gates.md`, correctness-critical ones should be re-enabled.

| Approve re-enable? | Hook file |
|--------------------|-----------|
| [ ] | `complexity-gate.mjs` |
| [ ] | `lathe-master-post-quality-gate.mjs` |
| [ ] | `naming-convention-enforcer.mjs` |
| [ ] | `performance-pattern-detector.mjs` |
| [ ] | `pre-edit-impact-analyzer.mjs` |
| [ ] | `reference-inject.mjs` |
| [ ] | `task-goal-tracker.mjs` |

## Recommended Actions (after user approval)

1. **Re-register** every checkbox-approved build-critical orphan with `continueOnError: false`.
2. **Re-register** approved advisory orphans with `continueOnError: true` (warning, not blocking).
3. **Remove `DISABLED_TOKEN_REDUX_2026_04_23` marker** from each approved file.
4. **Update `.claude/helpers/apply-hook-fixes.mjs`** with allowlist preventing future re-disable of build-critical hooks.
5. **Smoke test**: deliberately introduce a failing test, attempt `/handoff` — verify Stop hook BLOCKS the session end.

---
_Generated by audit-stop-hooks.mjs at 2026-05-26T04:20:41.836Z_