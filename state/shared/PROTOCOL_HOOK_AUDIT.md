# Protocol-to-Hook Enforcement Audit

**Generated:** 2026-04-18
**Status:** 3 gaps fixed, 2 gaps verified already covered

## Directive → Hook Coverage Matrix

| Directive | Hook(s) | Status |
|-----------|---------|--------|
| **PRISM-SELF-AWARENESS-DIRECTIVE** | `self-awareness-enforce.mjs`, `self-awareness-auto-inject.mjs`, `awareness-floor.mjs`, `awareness-bootstrap.mjs`, `inventory-check-guard.mjs`, `duplication-hard-block.mjs`, `dedup-auto-invoke.mjs`, `ai-feature-recommend.mjs`, `master-index-search-gate.mjs`, `build-create-detector.mjs` | ENFORCED (10+ hooks) |
| **CLAUDE-CODEX-SVI-DIRECTIVE** | `svi-inject.mjs`, `svi-projection.mjs`, `svi-watch-refresh.mjs`, **`svi-regression-guard.mjs`** (NEW) | ENFORCED |
| **CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE** | `claim-required.mjs`, `cross-terminal-conflict.mjs`, `forge-intent-claim.mjs`, `roadmap-completion-logger.mjs` | ENFORCED |
| **AGENT_BOUNDARY_DIRECTIVE** | **`agent-boundary-guard.mjs`** (NEW) | ENFORCED |
| **CLAUDE-CODEX-COORDINATION-DIRECTIVE** | `agent-coordination.mjs` (helper), **`coordination-update-reminder.mjs`** (NEW) | ENFORCED (reminder hook) |
| **CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE** | `claim-required.mjs`, `cross-terminal-conflict.mjs` | ENFORCED |
| **CLAUDE-CODEX-MCP-DIRECTIVE** | `mcp-pretool-injector.mjs`, `mcp-posttool-tracker.mjs` | ENFORCED |
| **CLAUDE-CODEX-COMMAND-AWARENESS-DIRECTIVE** | `ai-command-awareness.mjs`, `ai-auto-command-router.mjs`, `smart-skill-suggest.mjs` | ENFORCED |
| **Physics/Safety (implicit)** | `kienzle-coeff-check.mjs`, `taylor-coeff-check.mjs`, `sx-gate.mjs`, `canonical-constants.mjs`, `test-legitimacy.mjs` | ENFORCED |

## Hooks Added This Session

1. **`agent-boundary-guard.mjs`** (PreToolUse, blocking)
   - Enforces: `AGENT_BOUNDARY_DIRECTIVE.md`
   - Blocks: Claude from frontend files, Codex from backend files
   - Wired: settings.json PreToolUse Write/Edit/MultiEdit

2. **`coordination-update-reminder.mjs`** (PostToolUse Bash, advisory)
   - Enforces: `CLAUDE-CODEX-COORDINATION-DIRECTIVE.md`
   - Reminds: Every 3 git commits, suggest coordination surface update
   - Wired: settings.json PostToolUse Bash

3. **`svi-regression-guard.mjs`** (Stop, advisory)
   - Enforces: `CLAUDE-CODEX-SVI-DIRECTIVE.md`
   - Checks: Psi regression, SVI increase at session end
   - Wired: settings.json Stop hooks

## Files Fixed

- **CLAUDE-CODEX-TASK-QUEUE-DIRECTIVE.md** — Recreated (was corrupted with garbage data)

## Hook Chain Summary

| Phase | Count | Key Enforcement |
|-------|-------|-----------------|
| PreToolUse (Write/Edit) | 28+ | boundary, duplication, physics, safety |
| PreToolUse (Bash) | 12+ | git anti-clobber, delete guard, awareness |
| PostToolUse | 25+ | tracking, learning, cache, coordination |
| UserPromptSubmit | 20+ | command routing, skill suggest, context |
| SessionStart | 30+ | initialization, awareness, intelligence |
| Stop | 15+ | sync, summary, SVI regression check |

## Enforcement Strengths

- **Blocking hooks** (exit 1): duplication-hard-block, agent-boundary-guard, sx-gate, kienzle-coeff-check, taylor-coeff-check, canonical-constants, test-legitimacy, git-anti-clobber, critical-file-guard
- **Warning hooks** (advisory): coordination-update-reminder, svi-regression-guard, awareness-floor
- **Injection hooks** (context): self-awareness-auto-inject, smart-skill-suggest, ai-feature-recommend

## Remaining Gaps (None Critical)

All identified protocol directives now have enforcement hooks wired in settings.json.
