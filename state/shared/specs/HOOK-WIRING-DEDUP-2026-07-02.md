# Hook-Wiring Dedupe Matrix -- 2026-07-02

Mirror H:/.claude == C: user layer: **true**

Timeout-unit suspects (settings timeout is SECONDS per docs; these look like intended ms): **0**

## Verdict counts
- UNIQUE_KEEP: **255**
- PROJECT_DUP_FREE: **67**
- BUNDLE_DOUBLE_RUN: **15**
- MISSING_FILE: **6**

## Rows needing action (non-UNIQUE_KEEP)

| layer | event | matcher | hook | verdict | why |
|---|---|---|---|---|---|
| userC | SessionStart | `""` | stress-harness-emit.mjs | MISSING_FILE | wired but file not found at normalized path (check roots/casing) |
| userC | SessionStart | `""` | ensure-index-daemon-guardian.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) ups-core-bundle.mjs; standalone wire double-runs it |
| userC | SessionStart | `""` | fleet-work-digest-inject.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) ups-core-bundle.mjs; standalone wire double-runs it |
| userC | SessionStart | `""` | golf-slot-reaper-guardian.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) ups-core-bundle.mjs; standalone wire double-runs it |
| userC | PreCompact | `""` | stress-harness-emit.mjs | MISSING_FILE | wired but file not found at normalized path (check roots/casing) |
| userC | PreCompact | `""` | file-read-cache.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) read-bundle.mjs; standalone wire double-runs it |
| userC | Stop | `""` | stop-force-handoff.mjs | MISSING_FILE | wired but file not found at normalized path (check roots/casing) |
| userC | Stop | `""` | stop-force-loop-continue.mjs | MISSING_FILE | wired but file not found at normalized path (check roots/casing) |
| userC | Stop | `""` | stress-harness-emit.mjs | MISSING_FILE | wired but file not found at normalized path (check roots/casing) |
| userC | Stop | `""` | token-awareness-sidecar.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) ups-core-bundle.mjs; standalone wire double-runs it |
| userC | Stop | `""` | skill-auto-trigger.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) ups-core-bundle.mjs; standalone wire double-runs it |
| userC | PreToolUse | `Agent` | ai-system-router-inject.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) edit-bundle.mjs; standalone wire double-runs it |
| userC | PreToolUse | `Write` | pre-tool-savings-multi.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) bash-bundle.mjs, grep-glob-bundle.mjs; standalone wire double-runs it |
| userC | UserPromptSubmit | `""` | stress-harness-emit.mjs | MISSING_FILE | wired but file not found at normalized path (check roots/casing) |
| userC | PostToolUse | `""` | token-awareness-sidecar.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) ups-core-bundle.mjs; standalone wire double-runs it |
| userC | PostToolUse | `""` | skill-auto-trigger.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) ups-core-bundle.mjs; standalone wire double-runs it |
| userC | PostToolUse | `Read` | read-once-cache.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) read-bundle.mjs; standalone wire double-runs it |
| userC | PostToolUse | `Read` | recall-counter-track.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) posttool-edit-bundle.mjs; standalone wire double-runs it |
| project | SessionStart | `""` | session-id-pin.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | settings-mirror-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | portable-node-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | verify-hook-refs.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | portable-python-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | multi-computer-awareness.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | ollama-autostart.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | nim-autostart.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | plugin-path-fixer.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | git-health-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | git-sync-fetch.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | dotclaude-junctions-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | roadmap-resume.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | session-start-goal-inject.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | inventory-check-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | expert-role-inject.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | ai-command-awareness.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | ai-deep-intelligence.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | claude-brief-inject.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | build-state-inject.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | gsd-inject.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | tier1-context-pack.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | output-cache-inject.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | settings-baseline-snapshot.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | cognitive-budget-allocator.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | curiosity-explorer.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | chat-state-isolator.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | session-handoff-load.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | session-start-zombie-reap.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SessionStart | `""` | agent-worktree-stale-unlock.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreCompact | `""` | claude-brief-precompact.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreCompact | `""` | precompact-handoff.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreCompact | `""` | precompact-pending-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreCompact | `""` | quality-dashboard-alert.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreCompact | `""` | octopus-provider-probe.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreCompact | `""` | file-read-cache.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | stop_on_cutting_calculation_protocol.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | commit-pressure-stop-gate.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | always-build-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | stop_on_unsafe_gcode.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | quality-dashboard-alert.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | scrutinize-before-stop.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | stop-goal-clear-advance.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | enforce-handoff-topic.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | Stop | `""` | error-pattern-promote.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `""` | precompact-auto-trigger.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `^(Edit|Write|MultiEdit|NotebookEdit)$` | file-claim-guard.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `^mcp__prism.*` | mcp-action-router.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `^mcp__prism.*` | mcp-pretool-injector.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `^mcp__prism` | mcp-action-router.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `^Task$` | agent-rules-inject.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `Edit|Write|MultiEdit` | edit-bundle.mjs | PROJECT_DUP_FREE | bundle wired identically in userC; harness dedupes identical command strings |
| project | PreToolUse | `Agent` | ai-system-router-inject.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `Agent` | agent-vs-direct.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `Bash` | bash-bundle.mjs | PROJECT_DUP_FREE | bundle wired identically in userC; harness dedupes identical command strings |
| project | PreToolUse | `Bash` | asset-deletion-block.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) edit-bundle.mjs; standalone wire double-runs it |
| project | PreToolUse | `^Bash$` | mcp-action-router.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `Read` | read-bundle.mjs | PROJECT_DUP_FREE | bundle wired identically in userC; harness dedupes identical command strings |
| project | PreToolUse | `mcp__prism__` | mcp-connection-coordinator.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `^(Bash|Edit|Write|MultiEdit|NotebookEdit|Agent|Task|TaskCreate|Skill|mcp__.*)$` | tribal-spike.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PreToolUse | `^(Bash|Edit|Write|MultiEdit|NotebookEdit|Agent|Task|TaskCreate|Skill|mcp__.*)$` | autonomous-loop-defer.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | UserPromptSubmit | `""` | session-id-pin.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PostToolUse | `Edit|Write|MultiEdit` | build-cache-manager.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) posttool-edit-bundle.mjs; standalone wire double-runs it |
| project | PostToolUse | `Edit|Write|MultiEdit` | build-tracker.mjs | BUNDLE_DOUBLE_RUN | absorbed by wired bundle(s) posttool-edit-bundle.mjs; standalone wire double-runs it |
| project | PostToolUse | `Read` | read-once-cache.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PostToolUse | `Read` | recall-counter-track.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PostToolUse | `Agent` | agent-pid-tracker.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PostToolUse | `Grep` | grep-result-cache.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | PostToolUse | `mcp__prism__prism_.*` | post-recommendation-capture.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |
| project | SubagentStart | `*` | subagent-start-context.mjs | PROJECT_DUP_FREE | identical command string in userC; harness-deduped (cleanup is clarity-only) |

## Unique keeps with heavy signals (block-capable or network)

| layer | event | hook | block | net | detached | knobs |
|---|---|---|---|---|---|---|
| userC | SessionStart | ollama-autostart.mjs |  | Y | Y |  |
| userC | SessionStart | nim-autostart.mjs |  | Y | Y |  |
| userC | SessionStart | hermes-proxy-health-inject.mjs |  | Y |  |  |
| userC | PreCompact | quality-dashboard-alert.mjs | Y |  |  |  |
| userC | PreCompact | octopus-provider-probe.mjs |  | Y |  |  |
| userC | Stop | stop-reblock-storm-breaker.mjs | Y |  |  | PRISM_REBLOCK_STORM_DISABLE |
| userC | Stop | goal-complete-gate.mjs | Y |  |  | PRISM_GOAL_GATE_AUDIT_BYPASS PRISM_GOAL_GATE_DISABLE PRISM_GOAL_GATE_LOOP_ACCEPT_DISABLE |
| userC | Stop | scrutinize-before-stop.mjs | Y |  |  |  |
| userC | Stop | stop-task-boundary-compact-nudge.mjs | Y |  |  | PRISM_TASK_BOUNDARY_COMPACT_DISABLE |
| userC | Stop | macro-bulk-emit-guard.mjs | Y |  |  | PRISM_MACRO_BULK_GUARD_DISABLE PRISM_MACRO_BULK_GUARD_BYPASS |
| userC | Stop | stop-slot-task-claims-advisory.mjs | Y |  |  | PRISM_SLOT_TASK_ADVISORY_DISABLE PRISM_SLOT_TASK_ADVISORY_THROTTLE_MS |
| userC | Stop | stop-system-viz-drift.mjs | Y |  |  | PRISM_DRIFT_STOP_HOOK_DISABLE |
| userC | Stop | stop-bug-finding-wiki-gate.mjs | Y |  |  | PRISM_BUG_FINDING_WIKI_GATE_DISABLE |
| userC | Stop | stop-playbook-corpus-drift-advisory.mjs | Y |  |  | PRISM_PLAYBOOK_DRIFT_DISABLE |
| userC | Stop | blueprint-coverage-floor-guard.mjs | Y |  |  | PRISM_BLUEPRINT_COVERAGE_FLOOR_BYPASS PRISM_BLUEPRINT_COVERAGE_FLOOR_DISABLE |
| userC | Stop | stop-regression-bundle.mjs | Y |  |  |  |
| userC | Stop | commit-pressure-stop-gate.mjs | Y |  |  |  |
| userC | Stop | stop_on_unsafe_gcode.mjs | Y |  |  |  |
| userC | Stop | quality-dashboard-alert.mjs | Y |  |  |  |
| userC | Stop | stop-close-own-bg-tasks.mjs | Y |  |  | PRISM_CLOSE_BG_TASKS_DISABLE PRISM_CLOSE_BG_TASKS_MODE |
| userC | Stop | docker-service-health-stop.mjs |  | Y |  | PRISM_DOCKER_HEALTH_ADVISORY_DISABLE |
| userC | Stop | stop-bundle.mjs | Y |  |  |  |
| userC | PreToolUse | precompact-auto-trigger.mjs | Y |  |  |  |
| userC | PreToolUse | fork-storm-circuit-breaker.mjs | Y |  |  | PRISM_FORKSTORM_BREAKER_DISABLE |
| userC | PreToolUse | injection-knob-enforce.mjs | Y |  |  | PRISM_INJECTION_KNOB_ENFORCE_DISABLE PRISM_FOO_BAR_INJECT_DISABLE |
| userC | PreToolUse | injection-budget-cap-enforce.mjs | Y |  |  | PRISM_INJECTION_BUDGET_CAP_DISABLE |
| userC | PreToolUse | enforce-plan-before-build.mjs | Y |  |  |  |
| userC | PreToolUse | cross-session-orchestrator.mjs | Y |  |  | PRISM_COORD_ORCH_DISABLE |
| userC | PreToolUse | stale-graph-guard.mjs | Y |  |  |  |
| userC | PreToolUse | subagent-model-enforce.mjs | Y |  |  | PRISM_SUBAGENT_MODE |
| userC | PreToolUse | localhost-ollama-hardcode-guard.mjs |  | Y |  | PRISM_LOCALHOST_GUARD_DISABLE |
| userC | PreToolUse | agent-fanout-pressure-gate.mjs | Y |  |  |  |
| userC | PreToolUse | subagent-model-enforce.mjs | Y |  |  | PRISM_SUBAGENT_MODE |
| userC | PreToolUse | agent-fanout-pressure-gate.mjs | Y |  |  |  |
| userC | PreToolUse | hallucinated-node-id-guard.mjs | Y |  |  | PRISM_NODEID_GUARD_DISABLE |
| userC | PreToolUse | read-bundle.mjs | Y |  |  |  |
| userC | PreToolUse | cost-bridge-margin-floor-gate.mjs | Y |  |  | PRISM_QUOTING_MARGIN_GATE_DISABLE |
| userC | PreToolUse | autonomous-loop-defer.mjs | Y |  |  |  |
| userC | PreToolUse | error-block-prewarn.mjs |  | Y |  |  |
| userC | PreToolUse | file-claim-guard.mjs | Y |  |  |  |
| userC | PreToolUse | claude-md-golf-only-guard.mjs | Y |  |  | PRISM_CLAUDE_MD_GUARD_BYPASS PRISM_CLAUDE_MD_GUARD_DISABLE |
| userC | PreToolUse | ascii-guard.mjs | Y |  |  | PRISM_ASCII_GUARD_BYPASS |
| userC | PreToolUse | intake-quarantine-guard.mjs | Y |  |  | PRISM_INTAKE_QUARANTINE_DISABLE PRISM_INTAKE_QUARANTINE_BYPASS |
| userC | PreToolUse | build-cache-guard.mjs | Y |  |  | PRISM_BUILD_CACHE_GUARD_DISABLE |
| userC | PreToolUse | raw-graph-parse-precommit-guard.mjs | Y |  |  | PRISM_RAW_GRAPH_GUARD_DISABLE |
| userC | PreToolUse | mcp-readonly-cache.mjs | Y |  |  | PRISM_MCP_READONLY_CACHE_DISABLE |
| userC | PreToolUse | pretool-memory-size-gate.mjs | Y |  |  | PRISM_MEMORY_GROWTH_GATE_DISABLE |
| userC | PreToolUse | gpu-vram-admission-guard.mjs | Y |  |  | PRISM_VRAM_GUARD_MODE |
| userC | PreToolUse | mcp-bridge-enforce-pretool.mjs | Y |  |  | PRISM_MCP_ENFORCE_DISABLE PRISM_MCP_ENFORCE_THROTTLE_MS |
| userC | UserPromptSubmit | rename-window-intercept.mjs | Y |  |  | PRISM_RENAME_WINDOW_DISABLE |
| userC | UserPromptSubmit | ups-domain-bundle.mjs | Y |  |  | PRISM_UPS_DOMAIN_DISABLE |
| userC | UserPromptSubmit | ups-core-bundle.mjs | Y |  |  | PRISM_UPS_CORE_DISABLE |
| userC | PostToolUse | posttool-edit-bundle.mjs | Y |  |  |  |
| userC | PostToolUse | posttool-bash-read-bundle.mjs | Y |  |  |  |
| userC | PostToolUse | cross-session-orchestrator.mjs | Y |  |  | PRISM_COORD_ORCH_DISABLE |
| userC | PostToolUse | error-block-capture.mjs | Y |  |  |  |
| userC | PostToolUse | build-cache-guard.mjs | Y |  |  | PRISM_BUILD_CACHE_GUARD_DISABLE |
| project | SessionStart | embedder-inject-qdrant.mjs |  | Y |  |  |
| project | Stop | enforce-roadmap-closeout.mjs | Y |  |  | PRISM_CLOSEOUT_GATE_BYPASS |
| project | Stop | leave-a-copy-behind-guard.mjs | Y |  |  |  |
| project | Stop | autonomous-loop-watchdog.mjs | Y |  |  |  |
| project | PreToolUse | hook-creation-gate.mjs | Y |  |  |  |
| project | PreToolUse | hook-cross-worktree-block.mjs | Y |  |  | PRISM_CROSS_WORKTREE_BYPASS |
| project | PreToolUse | critical-file-guard.mjs | Y |  |  |  |
| project | PreToolUse | h-drive-enforcement.mjs | Y |  |  |  |
| project | PreToolUse | pre-rename-guard.mjs | Y |  |  |  |
| project | PreToolUse | task-created-claim-guard.mjs | Y |  |  |  |
| project | PreToolUse | hook-tier-validator.mjs | Y |  |  |  |
| project | PreToolUse | tsc-baseline-regression-gate.mjs | Y |  |  |  |
| project | PreToolUse | auto-fork-executor.mjs | Y |  |  |  |
| project | PreToolUse | bash-result-cache.mjs | Y |  |  |  |
| project | PostToolUse | ollama-terminal-watcher.mjs |  | Y |  |  |
| project | PostToolUse | permission-denied-retry.mjs | Y |  |  |  |
| project | PostToolUse | system-viz-live-bridge.mjs |  | Y |  |  |
| project | PostToolUse | mcp-safety-bridge.mjs |  | Y |  |  |
| project | PostToolUse | anti-regression-auto-sweep.mjs | Y |  |  |  |
| project | PostToolUse | test-quality-gate.mjs | Y |  |  |  |
| project | SubagentStop | subagent-stop-verifier.mjs | Y |  |  |  |
