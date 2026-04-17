---
name: feature-matrix
description: Show which Claude Code features are active, which should be activated, and when each triggers automatically.
model: haiku
effort: low
allowed-tools: Read, Grep, Glob
---

# Feature Utilization Matrix

Display the full feature utilization decision matrix showing what is active and what auto-triggers.

## Instructions

Read ~/.prism/feature-config.json for current settings, then output:

FEATURE UTILIZATION MATRIX -- Auto-Trigger Rules

HOOK EVENTS (18/18 wired):
  SessionStart         -> Load context, check health, suggest features
  UserPromptSubmit     -> Auto-detect skill patterns, inject hints
  PreToolUse           -> Safety gates, dedup, auto-fix, feature recommendations
  PostToolUse          -> Quality checks, telemetry, anti-regression
  PostToolUseFailure   -> Error classification, retry recommendation
  PermissionRequest    -> Auto-approve safe operations
  PreCompact           -> Save critical facts
  PostCompact          -> Restore critical facts, verify survival
  SubagentStart        -> Track agent, enforce budget
  SubagentStop         -> Log completion, update coordination stats
  WorktreeCreate       -> Log, inject CLAUDE.md
  WorktreeRemove       -> Archive results
  Stop                 -> Completion check
  StopFailure          -> Error-specific recovery guidance
  TaskCompleted        -> Chain next milestone
  TeammateIdle         -> Reassign work
  ConfigChange         -> Validate settings
  SessionEnd           -> Persist metrics, cleanup
  InstructionsLoaded   -> Check freshness

HOOK TYPES (4/4 available):
  command  -> Complex logic, file I/O (19 scripts)
  prompt   -> LLM quality/safety checks (4 hooks: code quality, commit msg, safety gate, secrets)
  agent    -> Multi-file verification (2 hooks: physics verification, test impact)
  http     -> External notifications (3 templates ready)

AGENT FEATURES (auto-selected):
  model routing     -> haiku for lookups, sonnet for analysis, opus for complex/physics
  background mode   -> Long tasks (catalog enrichment, doc gen, test runs)
  worktree isolation -> Risky edits (dispatchers, constants, schemas)
  team dispatch     -> Multi-agent workflows (forge, test, pipeline teams)

AUTOMATIC TRIGGERS:
  After 10+ edits            -> Suggest /prism-review
  After engine edit           -> Physics verification agent fires
  After any edit              -> Test impact agent suggests tests
  Health score < 80           -> Suggest /self-heal on SessionStart
  Token pressure > 200K       -> Suggest /compact
  haiku success < 70%         -> Escalate to sonnet
  Cron templates not active   -> Suggest /cron-bootstrap
  Schema drift detected       -> Self-healing auto-repair
  Context compacted           -> Restore 18 critical facts
  Session ends                -> Persist all telemetry metrics

Then check ~/.prism/feature-config.json and annotate each trigger with [ON] or [OFF] based on current config. If the config file is missing, note that /activate-features should be run first.
