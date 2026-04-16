---
name: Hook System State
description: 52+ user-level Python hooks, 42+ project-level Node.js hooks. Quality pipeline wired into /compact + /startup. Last audit 2026-03-30.
type: project
---

# Hook System — Last audited 2026-03-30

## Scale
- **User-level** (`~/.claude/hooks/lib/`): 52+ Python enforcement hooks
- **Project-level** (`.claude/helpers/`): 42+ Node.js registered hooks + 14 orphaned helpers
- **Total event types hooked**: PreToolUse, PostToolUse, PreCompact, PostCompact, Stop, UserPromptSubmit, SessionStart, SessionEnd, SubagentStart/Stop, TaskCompleted, ConfigChange, WorktreeCreate/Remove, Notification

## Key Hook Chains (execution time concern)
- **On file Write/Edit**: 16 PreToolUse + 23 PostToolUse hooks (~60-90s total)
- **On PreCompact**: 14 hooks across both layers (~60-90s)
- **Longest single hooks**: TSC compilation (~30s), ESLint (~25s)

## Session Lifecycle Hooks (deployed 2026-03-30)
- `position-sync.mjs` — auto-refreshes CURRENT_POSITION.md (SessionStart + PreCompact)
- `svi-refresh.mjs` — auto-refreshes SVI.json + SVI-compact.md (SessionStart + PreCompact)
- `coordination-sync.mjs` — syncs AGENT_CHAT + WORKBOARD + ROADMAP_COLLABORATION_STATE (PreCompact)
- `enforce-quality-snapshot.py` — quality dashboard snapshot with regression warnings (PreCompact)

## Quality Pipeline Hooks (MCP-AUTOMATION-HARDENING, deployed 2026-03-29..30)
- `enforce-review-gate.py` — blocks engine edits when >3 without /prism-review
- `enforce-formula-accuracy-gate.py` — blocks compact if formula accuracy drops
- `enforce-quality-snapshot.py` — shows Q/Psi/accuracy at every compact

## Legacy
- 14 `.sh` scripts in `.claude/helpers/` have `.mjs` replacements (Codex migration 2026-03-28). Shell scripts kept for protection/review/worktree lifecycle.

**Why:** Hooks are the real enforcement layer. They fire regardless of permission mode.

**How to apply:** Trust the hooks. When they warn, act. When they block, comply. Check hook execution times if edits feel slow.
