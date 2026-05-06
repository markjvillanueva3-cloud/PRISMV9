---
policy:
  tier: 1
  triggers:
    - "context-delta"
    - "what changed"
    - "catch me up"
    - "context delta"
    - "since i left"
---
# Context Delta — What Changed Since Last Checkpoint

Show the *delta* between this point in the conversation and a prior checkpoint — git changes, file edits, decisions reached, hooks fired, tasks closed. Designed to give a fresh agent (or the user returning after a break) a tight catch-up without re-reading the whole transcript.

## Args: $ARGUMENTS
- (none) — delta since session start
- `--since=<checkpoint>`: one of `session-start | last-prompt | last-commit | last-handoff | <iso-ts>`
- `--scope=<git|files|hooks|tasks|decisions|all>`: which axes to report (default: all)
- `--format=<table|markdown|json>`: output format (default: markdown)

## Trigger policy
```yaml
policy:
  tier: 1
  triggers:
    - keyword:"what changed"
    - keyword:"catch me up"
    - keyword:"context delta"
    - keyword:"since I left"
    - on:SessionStart  # opt-in via metadata flag for resume sessions
```

## What gets reported per axis

### git
- `git diff --stat <since>..HEAD` — files changed + lines
- New commits with subject lines
- Branch divergence vs origin (ahead/behind)
- Uncommitted changes (working tree + staged)

### files
- Read tool log entries since `<since>` (which files were inspected)
- Edit/Write log entries (which files were mutated and how many times)
- New files created (deduplicated against git output)

### hooks
- Hook fires by category: `SessionStart | UserPromptSubmit | PreToolUse | PostToolUse | Stop`
- Top 5 hooks by trigger count
- Any blocking hook errors that surfaced

### tasks
- TodoWrite/TaskCreate items created, in_progress, completed, deleted since `<since>`
- Plan-mode plans approved or discarded

### decisions
- Heuristic extraction of explicit decisions in assistant text:
  - "I'll use X because Y"
  - "Pick A over B because Z"
  - User confirmations of approach choices
- Each decision linked back to the prompt index that produced it

## Output shape (markdown)
```markdown
# Context Delta — since 2026-05-06T14:30:00Z

## git (5 commits ahead of origin)
- 26eab3f25  P19-U01 close + shebang fix
- f88536279  P11-U03 cron planner
...

## files
- mcp-server/src/__tests__/CronSchedulePlan.test.ts (created, 240 lines)
- scripts/lib/cron-schedule-plan.mjs (created, 280 lines)
...

## tasks
- closed: 4 (P11-U03, P19-U01, P19-U02, P20-U01)
- in_progress: 0
- pending: 1 (P20-U02 conditional pull)

## decisions
1. Split cron-schedule into JS plan + thin PS1 wrapper (testability on Linux CI)
2. Skip multi-stage COPY --from=stage paths in docker-audit (false-flag fix)
```

## MCP wiring
No dedicated dispatcher yet — this skill aggregates from existing read sources:
- `git diff/log/status` via Bash
- `prism_session:tool_call_log` (planned)
- `mcp-server/data/state/cron-runs.jsonl` for hook fires
- TodoWrite/TaskCreate state via TaskList

## When to run it
- **Resume sessions**: SessionStart on a chat with `metadata.resume:true` shows the delta vs the last handoff
- **Mid-session**: user lost track of what's been done — `/context-delta` snaps the state into view
- **Pre-handoff**: confirm the handoff manifest captures everything that changed (cross-check delta against HANDOFF.md draft)

## Related
- `/handoff` — writes the durable record this skill compares *to*
- `/optimize-context` — caller often follows delta with a slim if many file reads accumulated
- `/token-economy-report` — orthogonal axis (tokens spent vs work output)
