# PRISM Hook Settings — ON & OFF
**Generated:** 2026-04-21T04:20:51.397Z
**Source:** H:/prism/.claude/settings.json (backup: settings.json.pre-prune.bak)

## SUMMARY

| Event | Before | After | Removed |
|---|---|---|---|
| `PreToolUse` | 67 | 56 | 11 |
| `PostToolUse` | 47 | 46 | 1 |
| `UserPromptSubmit` | 33 | 13 | 20 |
| `SessionStart` | 66 | 21 | 45 |
| `Stop` | 49 | 42 | 7 |
| `Notification` | 1 | 1 | 0 |
| `PreCompact` | 14 | 6 | 8 |
| `PostToolUseFailure` | 2 | 2 | 0 |
| `SubagentStart` | 2 | 2 | 0 |
| `SessionEnd` | 3 | 2 | 1 |
| `TaskCompleted` | 1 | 1 | 0 |
| `ConfigChange` | 1 | 1 | 0 |
| `WorktreeCreate` | 1 | 1 | 0 |
| `WorktreeRemove` | 1 | 1 | 0 |
| `SubagentStop` | 1 | 1 | 0 |

**Total removed:** 93 hook registrations.

---

## KEPT (active hooks)

These hooks still fire. They fall into three categories:
1. **Token-saving** — caches that prevent redundant searches/reads
2. **Context-retention** — injects relevant context (JM Die paths, dedup reminders, current position)
3. **Safety** — prevents destructive ops, enforces duplication guard, catches physics errors

### Notification (1)
- `idle-reminder`

### PostToolUse (42)
- `agent-util-log`
- `build-cache-manager`
- `cache-writer`
- `context-economy-v2`
- `coordination-update-reminder`
- `decision-capture`
- `dev-outcome-tracker`
- `doc-cascade`
- `dsl-output-compressor`
- `efficiency-monitor`
- `error-learner-hook`
- `error-pattern-memory`
- `extraction-log-drift`
- `extraction-to-tribal`
- `git-anti-clobber-release`
- `hook-basin-drift`
- `inventory-on-write`
- `loop-detector`
- `mcp-posttool-tracker`
- `meta-learning-trigger`
- `neural-cad-validation`
- `node-process-janitor`
- `post-tool-p1`
- `post-write-sync-awareness`
- `posttool-bayesian-update`
- `posttool-curiosity-tick`
- `posttool-emergence-scan`
- `posttooluse-compressor`
- `read-tracker`
- `reasoning-completeness`
- `roadmap-completion-logger`
- `schema-drift-detector`
- `schema-version-read`
- `session-action-memory`
- `session-breadcrumb`
- `session-state-auto`
- `session-write-tracker`
- `signature-drift-detector`
- `success-pattern-tracker`
- `svi-watch-refresh`
- `test-quality-gate`
- `working-set-awareness`

### PostToolUseFailure (2)
- `error-recovery`
- `smart-recovery`

### PreCompact (5)
- `claim-registry-precompact`
- `coordination-sync`
- `milestone-tracker`
- `position-sync`
- `stable-session-id`

### PreToolUse (50)
- `agent-boundary-guard`
- `ai-duplication-guard`
- `ai-reasoning-inject`
- `ai-system-router-inject`
- `bash-result-cache`
- `build-create-detector`
- `canonical-constants`
- `claim-required`
- `command-awareness-inject`
- `critical-file-guard`
- `cross-session-awareness`
- `cross-terminal-conflict`
- `dedup-auto-invoke`
- `dep-graph-impact`
- `doc-freshness-check`
- `document-preserve-guard`
- `duplication-hard-block`
- `engine-write-guard`
- `file-read-cache`
- `forge-intent-claim`
- `git-anti-clobber`
- `git-commit-checkin`
- `grep-result-cache`
- `h-drive-enforcement`
- `json-read-summarizer`
- `kienzle-coeff-check`
- `literature-citation`
- `managed-block-guard`
- `master-index-search-gate`
- `mcp-pretool-injector`
- `no-silent-catch`
- `pre-delete-guard`
- `pre-rename-guard`
- `pre-tool-p1`
- `pretool-causal-trace`
- `pretool-world-simulator`
- `protect-document-content`
- `read-optimizer`
- `search-optimizer`
- `staged-hygiene-check`
- `state-write-watch`
- `subagent-context`
- `svi-projection`
- `sx-gate`
- `task-context-injector`
- `taylor-coeff-check`
- `test-legitimacy`
- `web-cache`
- `work-claim`
- `worktree-commit-route`

### SessionEnd (1)
- `claim-registry-release`

### SessionStart (15)
- `agent-coordination-daemon`
- `ai-self-awareness-inject`
- `compact-restore`
- `context-economy-v2`
- `coordination-startup-banner`
- `doc-freshness-check`
- `expert-role-inject`
- `milestone-tracker`
- `pipeline-health-monitor`
- `position-sync`
- `session-start-compact`
- `session_start_local_compute_warm`
- `stable-session-id`
- `sync-h-c-drives`
- `tier1-context-pack`

### Stop (42)
- `advisor-session-log`
- `ai-session-sync`
- `always-build-guard`
- `claim-registry-release`
- `protect-document-content`
- `session-end-goal-synthesis`
- `session-end-p1`
- `session-end-peer-share`
- `skill-session-tracker`
- `stable-session-id`
- `stop-guard`
- `stop_on_awareness_degraded`
- `stop_on_broken_imports`
- `stop_on_build_error`
- `stop_on_circular_deps`
- `stop_on_content_deletion`
- `stop_on_dirty_registry`
- `stop_on_duplicate_created`
- `stop_on_extraction_incomplete`
- `stop_on_failing_tests`
- `stop_on_formula_uncited`
- `stop_on_hook_unregistered`
- `stop_on_incomplete_pipeline`
- `stop_on_missing_tests`
- `stop_on_open_claim`
- `stop_on_open_lock`
- `stop_on_orphan_children`
- `stop_on_orphan_engine`
- `stop_on_roadmap_drift`
- `stop_on_skill_unwired`
- `stop_on_stale_handoff`
- `stop_on_svi_regression`
- `stop_on_sx_fail`
- `stop_on_uncommitted_critical`
- `stop_on_uncommitted_memory`
- `stop_on_undocumented_action`
- `stop_on_unregistered_asset`
- `stop_on_unsafe_gcode`
- `stop_on_unwired_assets`
- `svi-regression-guard`
- `sync-h-c-drives`
- `tribal-auto-categorize`

### SubagentStart (2)
- `command-awareness-inject`
- `subagent-context`

### SubagentStop (1)
- `subagent-results`

### UserPromptSubmit (13)
- `auto-route`
- `dedup-detect`
- `goal-stack-inject`
- `knowledge-augmented-reasoning-v3`
- `node-process-janitor`
- `quality-dashboard-inject`
- `self-awareness-auto-inject`
- `shortcode-injector`
- `skill-usage-tracker`
- `smart-skill-suggest`
- `stable-session-id`
- `task-goal-tracker`
- `tribal-categorize-reminder`

---

## DISABLED (removed registrations)

These hooks were removed because they were:
- **Compaction-ceremony** (obsolete on Opus 4.7 1M context — Anthropic's built-in autocompact at 95% is the real safety net)
- **No-ops** (verified len=0 on smoke test)
- **Duplicates** (same logic registered on multiple events or duplicated by another hook)
- **Missing files** (referenced in settings.json but no file on disk → CJS loader crash)
- **Overlapping awareness injections** (22KB of redundant SessionStart context the model ignores)

### PostToolUse (1 removed)
- `precompact-auto-trigger` (matcher: `*`)

### PreCompact (8 removed)
- `precompact-pending-guard` (matcher: `*`)
- `precompact-pending-guard` (matcher: `*`)
- `pre-compact-p1` (matcher: `*`)
- `svi-refresh` (matcher: `*`)
- `smart-compaction-plan` (matcher: `*`)
- `pre-compact` (matcher: `*`)
- `precompact-dossier` (matcher: `*`)
- `session-cost-summary` (matcher: `*`)

### PreToolUse (11 removed)
- `precompact-auto-trigger` (matcher: `*`)
- `pre-flight-check` (matcher: `^Bash$`)
- `pre-tool-awareness-refresh` (matcher: `^(Write|Edit|MultiEdit)$`)
- `bash /h/prism/.claude/helpers/bash-intercept.sh "$TOOL_INPUT` (matcher: `^Bash$`)
- `bash /h/prism/.claude/helpers/completion-gate.sh 2>/dev/null` (matcher: `^Bash$`)
- `omega-floor` (matcher: `^Bash$`)
- `awareness-floor` (matcher: `^Bash$`)
- `no-re-extract` (matcher: `^Bash$`)
- `allow-superseding` (matcher: `^Bash$`)
- `schema-version-bump` (matcher: `^Bash$`)
- `context-aware-inject` (matcher: `*`)

### SessionEnd (1 removed)
- `session-continuity-chain` (matcher: `*`)

### SessionStart (45 removed)
- `claim-registry-surface` (matcher: `*`)
- `session-start-causal-trace` (matcher: `*`)
- `session-start-goal-inject` (matcher: `*`)
- `h-drive-audit` (matcher: `*`)
- `awareness-snapshot` (matcher: `*`)
- `session-awareness-bootstrap` (matcher: `*`)
- `hook-stability-check` (matcher: `*`)
- `hook-tla-invariant` (matcher: `*`)
- `hook-saturation-alert` (matcher: `*`)
- `hook-circular-dep-check` (matcher: `*`)
- `hook-condition-number` (matcher: `*`)
- `session-continuity-chain` (matcher: `*`)
- `session_start_inventory_inject` (matcher: `*`)
- `prism-intelligence-briefing` (matcher: `*`)
- `gsd-inject` (matcher: `*`)
- `memory-system-init` (matcher: `*`)
- `ai-system-activate` (matcher: `*`)
- `ai-command-awareness` (matcher: `*`)
- `slash-command-registry-load` (matcher: `*`)
- `agent-registry-load` (matcher: `*`)
- `plugin-inventory-surface` (matcher: `*`)
- `claude-flow-health` (matcher: `*`)
- `capability-manifest-surface` (matcher: `*`)
- `cad-coverage-auto-refresh` (matcher: `*`)
- `cad-coverage-surface` (matcher: `*`)
- `skill-utilization-index` (matcher: `*`)
- `ai-deep-intelligence` (matcher: `*`)
- `self-improvement-activate` (matcher: `*`)
- `svi-refresh` (matcher: `*`)
- `session-gc` (matcher: `*`)
- `sync-memory` (matcher: `*`)
- `coordination-summary-generator` (matcher: `*`)
- `cross-session-work-aware` (matcher: `*`)
- `realtime-session-coordinator` (matcher: `*`)
- `awareness-bootstrap` (matcher: `*`)
- `goal-stack-init` (matcher: `*`)
- `session-start-p1` (matcher: `*`)
- `svi-inject` (matcher: `*`)
- `tier1-data-refresh` (matcher: `*`)
- `session_start_tier1_bolster` (matcher: `*`)
- `work-broadcast` (matcher: `*`)
- `curiosity-explorer` (matcher: `*`)
- `cognitive-budget-allocator` (matcher: `*`)
- `session-start-compact-p1` (matcher: `compact`)
- `inventory-refresh` (matcher: `*`)

### Stop (7 removed)
- `precompact-pending-guard` (matcher: `*`)
- `auto-compact-gate` (matcher: `*`)
- `duplication-guard-stop` (matcher: `*`)
- `session-summary` (matcher: `*`)
- `sync-memory` (matcher: `*`)
- `compaction-survival` (matcher: `*`)
- `stop-index-sync` (matcher: `*`)

### UserPromptSubmit (20 removed)
- `prompt-rewriter-ollama` (matcher: `*`)
- `comprehensive-build-enforce` (matcher: `*`)
- `sparc-optin-gate` (matcher: `*`)
- `self-awareness-enforce` (matcher: `*`)
- `mio-proactive-intelligence` (matcher: `*`)
- `try-before-asking` (matcher: `*`)
- `optimal-context-inject` (matcher: `*`)
- `formula-algorithm-suggest` (matcher: `*`)
- `extended-thinking-auto` (matcher: `*`)
- `user-prompt-submit-p1` (matcher: `*`)
- `ai-auto-command-router` (matcher: `*`)
- `cross-session-work-aware` (matcher: `*`)
- `realtime-session-coordinator` (matcher: `*`)
- `capability-reminder` (matcher: `*`)
- `neural-ai-optimizer` (matcher: `*`)
- `periodic-checkin` (matcher: `*`)
- `session-awareness-inject` (matcher: `*`)
- `inventory-check-guard` (matcher: `*`)
- `ai-feature-recommend` (matcher: `*`)
- `local-compute-intent` (matcher: `*`)

---

## REVERT INSTRUCTIONS

If something broke, restore with:
```bash
cp H:/prism/.claude/settings.json.pre-prune.bak H:/prism/.claude/settings.json
```

To re-enable a specific hook, edit `H:/prism/.claude/settings.json` and add it back to the appropriate event's `hooks` array.

## NEXT-SESSION TODO

Remaining items from `H:/prism/state/shared/PRISM-HOOK-AUDIT-2026-04-20.md`:

- Item 10: Build unified `prism-awareness-v2.mjs` (<400-token injector replacing scattered awareness hooks)
- Item 15: Delete 18 unwired hook files on disk (blueprint-accuracy-guard.mjs, c-to-h-mirror.mjs, etc.)
- Item 16: Regenerate ~20 corrupted skill .md files in `C:/Users/wompu/.claude/commands/`
- Item 17: Gate residual compaction ceremony behind `PRISM_CONTEXT_TIER=compact` env flag
