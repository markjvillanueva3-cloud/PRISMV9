---
name: activate-features
description: One-shot activation of all automatic Claude Code features -- hooks, crons, health checks, telemetry. Run once per fresh setup.
model: sonnet
effort: medium
---

# Activate All Automatic Features

Run a comprehensive check of all Claude Code automation features and activate any that are missing.

## Steps

### 1. Verify Hooks
Read ~/.claude/settings.json and confirm all 18 hook events are registered:
- SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure
- PermissionRequest, PreCompact, PostCompact, SubagentStart, SubagentStop
- WorktreeCreate, WorktreeRemove, Stop, StopFailure, TaskCompleted
- TeammateIdle, ConfigChange, SessionEnd, InstructionsLoaded

Report: [X] Hooks: N/18 events wired

### 2. Verify Agents
List ~/.claude/agents/ and confirm these exist:
- 11 specialist agents (physics-verifier, test-impact, catalog-enricher, doc-generator, forge-worker, pipeline-runner, security-auditor, health-monitor, telemetry-analyst, model-router, code-reviewer)
- 3 team configs (forge-team, test-team, pipeline-team)

Report: [X] Agents: N/11 agents, M/3 teams

### 3. Verify Rules
List ~/.claude/rules/ and confirm 13+ rules files exist.

Report: [X] Rules: N/13 rule files

### 4. Verify Skills
List ~/.claude/skills/ and confirm 24+ CCM skills exist.

Report: [X] Skills: N/24 skills

### 5. Run Health Check
Execute: python3 ~/.claude/hooks/lib/self_healing.py full
Report the health score.

Report: [X] Health: score/100

### 6. Initialize Telemetry
Verify ~/.prism/telemetry/ exists with retention-config.json.
If missing, create the directory and a default retention config (30-day retention, 50MB max).

Report: [X] Telemetry: initialized

### 7. Initialize Optimizer
Execute: python3 ~/.claude/hooks/lib/adaptive_optimizer.py full
This creates the baseline optimization profile.

Report: [X] Optimizer: baseline created

### 8. Initialize Coordination Stats
Execute: python3 ~/.claude/hooks/lib/coordination_stats.py dashboard
Verify stats tracking is operational.

Report: [X] Coordination: operational

### 9. Verify Feature Config
Read ~/.prism/feature-config.json and confirm all auto-feature toggles are present.

Report: [X] Feature config: all toggles present

### 10. Final Report
Output a summary table:

FEATURE ACTIVATION STATUS
-------------------------------
Component          Status    Count
-------------------------------
Hook Events        [X/!]     N/18
Agents             [X/!]     N/11
Teams              [X/!]     M/3
Rules              [X/!]     N/13
Skills             [X/!]     N/24
Health Score       [X/!]     S/100
Telemetry          [X/!]     active
Optimizer          [X/!]     baselined
Coordination       [X/!]     tracking
Feature Config     [X/!]     loaded
-------------------------------
Overall: READY / NEEDS ATTENTION

If any component shows [!], provide specific remediation steps.
