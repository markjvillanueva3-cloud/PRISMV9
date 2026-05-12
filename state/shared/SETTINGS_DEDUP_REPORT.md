# Settings Dedup Report

Generated: 2026-05-12T19:11:46.579Z
Schema:    v1

## Summary

| Dimension | Count |
|---|---|
| Files scanned | 4 |
| Total wired entries | 226 |
| Duplicate commands | **0** |
| Matcher overlap | **2** |
| Dead refs | **0** |
| Cross-file duplication | **69** |
| Bloated chains (>25 entries) | 3 |
| Coverage gaps | 2 |

## `H:/.claude/settings.json`

Entries: 74

## `H:/.claude/settings.local.json`

Entries: 0

## `H:/prism/.claude/settings.json`

Entries: 152

### Matcher overlap (2) — double-fires

- **PostToolUse** `H:/prism/.claude/helpers/mcp-posttool-tracker.mjs` wired via `` and `mcp__prism__prism_.*`
  - `` ⋂ `mcp__prism__prism_.*` on tools: *
- **PreToolUse** `H:/prism/.claude/helpers/mcp-action-router.mjs` wired via `^mcp__prism.*` and `^mcp__prism` and `^Bash$`
  - `^mcp__prism.*` ⋂ `^mcp__prism` on tools: mcp__prism

### Bloated chains (>25 hooks per event)

- **PostToolUse**: 49 hooks
- **SessionStart**: 33 hooks
- **Stop**: 30 hooks

## `H:/prism/.claude/settings.local.json`

Entries: 0

## Cross-file duplication (69)

Scripts wired in multiple settings files — the harness merges them so each fires once per file.

- **PostToolUse** `H:/prism/.claude/helpers/mcp-posttool-tracker.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PostToolUse** `H:/prism/.claude/helpers/read-once-cache.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PostToolUse** `H:/prism/.claude/hooks/agent-pid-tracker.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PostToolUse** `H:/prism/.claude/hooks/grep-result-cache.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PostToolUse** `H:/prism/.claude/hooks/post-recommendation-capture.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PostToolUse** `H:/prism/.claude/hooks/recall-counter-track.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreCompact** `H:/prism/.claude/helpers/precompact-handoff.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreCompact** `H:/prism/.claude/hooks/claude-brief-precompact.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreCompact** `H:/prism/.claude/hooks/compression-precompact.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreCompact** `H:/prism/.claude/hooks/file-read-cache.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreCompact** `H:/prism/.claude/hooks/octopus-provider-probe.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreCompact** `H:/prism/.claude/hooks/precompact-pending-guard.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreCompact** `H:/prism/.claude/hooks/quality-dashboard-alert.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/helpers/mcp-action-router.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/helpers/mcp-pretool-injector.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/helpers/search-optimizer.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/agent-rules-inject.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/agent-vs-direct.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/ai-system-router-inject.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/autonomous-loop-defer.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/bundles/bash-bundle.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/bundles/edit-bundle.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/bundles/read-bundle.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/glob-narrow-path.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/grep-index-first.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/mcp-connection-coordinator.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/precompact-auto-trigger.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **PreToolUse** `H:/prism/.claude/hooks/tribal-spike.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/chat-state-isolator.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/dotclaude-junctions-guard.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/git-health-guard.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/git-sync-fetch.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/portable-node-guard.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/portable-python-guard.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/roadmap-resume.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/session-handoff-load.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/session-id-pin.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/session-start-zombie-reap.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/settings-baseline-snapshot.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/hooks/settings-mirror-guard.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SessionStart** `H:/prism/.claude/scripts/verify-hook-refs.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/always-build-guard.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/commit-pressure-stop-gate.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/git-sync-stop.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/quality-dashboard-alert.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_broken_imports.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_build_error.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_c_drive_write.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_cutting_calculation_protocol.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_duplicate_created.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_failing_tests.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_hook_unregistration.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_orphan_children.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_skill_unwired.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_svi_regression.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_unsafe_gcode.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **Stop** `H:/prism/.claude/hooks/stop_on_unwired_assets.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **SubagentStart** `H:/prism/.claude/hooks/subagent-start-context.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/auto-consensus-userprompt.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/comprehensive-build-enforce.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/local-compute-intent.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/ollama-auto-router.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/ollama-task-offloader.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/prompt-context-inject.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/prompt-rewriter-ollama.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/session-id-pin.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/session-reorient-inject.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/stale-state-warn.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json
- **UserPromptSubmit** `H:/prism/.claude/hooks/token-budget-gate.mjs`
  - H:/.claude/settings.json
  - H:/prism/.claude/settings.json

## Coverage gaps (2)

Known events with zero hooks across all settings files (informational):

- SessionEnd
- Notification

