---
policy:
  tier: 3
  triggers:
    - "rgs-sync"
---
# Shared RGS Sync

Use this command when Claude or Codex needs to align on roadmap sequencing, execution gating, or the readiness to begin the next SVI-maximization roadmap pass.

This command is multi-terminal aware. Multiple Claude Code terminals and future multiple Codex terminals should write into the same roadmap state without overwriting each other, using per-terminal instance identity.

This is a shared protocol, not a Claude-only macro. Codex should mirror the same workflow whenever the user types `/rgs-sync`.

## Inputs

Optional `$ARGUMENTS` can be:

- `status`
- `note: ...`
- `sync: lane=... | status=... | current=... | next=... | done=... | blockers=... | needs=... | convergence-target=...`
- `set-mode: ...`

Examples:

- `/rgs-sync`
- `/rgs-sync status`
- `/rgs-sync note: backend gate still open; keep roadmap expansion deferred`
- `/rgs-sync sync: lane=frontend-current | status=active | current=Jobs/Scheduling desk convergence | next=swap provider seams to live payload states | done=hot-job ordering | needs=backend hot-job fanout payload | convergence-target=shared hot-job contract`
- `/rgs-sync set-mode: ready-for-gap-roadmap`
- `/rgs-sync note: claude terminal 2 is covering persistence validation while terminal 1 stays on live sync`

## Execution

1. Read:
   - `H:/prism/state/shared/CLAUDE-CODEX-RGS-SYNC-PROTOCOL.md`
   - `H:/prism/state/shared/CLAUDE-CODEX-ROADMAP-EXECUTION-DIRECTIVE.md`
   - `H:/prism/state/shared/ROADMAP_COLLABORATION_STATE.md`
   - `H:/prism/state/shared/AGENT_COORDINATION_STATUS.md`
   - `H:/prism/state/shared/AGENT_WORKBOARD.md`
2. If `$ARGUMENTS` starts with `note:` run:

```powershell
node .claude/helpers/roadmap-sync.mjs note --note "<note text>"
```

The helper will auto-detect family and terminal instance from the environment when possible. Only pass `--agent-family` or `--agent-instance` if a terminal needs an explicit override.

3. If `$ARGUMENTS` starts with `set-mode:` run:

```powershell
node .claude/helpers/roadmap-sync.mjs set-mode --mode "<mode value>"
```

4. If `$ARGUMENTS` starts with `sync:` run:

```powershell
node .claude/helpers/roadmap-sync.mjs sync --lane "<lane>" --status "<status>" --current "<current>" --next "<next>" --done "<done>" --blockers "<blocker 1 || blocker 2>" --needs "<need 1 || need 2>" --convergence-target "<target>"
```

Only pass the fields that are actually present. Do not invent fields that were not supplied.

5. Otherwise run:

```powershell
node .claude/helpers/roadmap-sync.mjs status
```

## Output

Respond with:

- the current roadmap collaboration mode
- whether the current backend/frontend finish-first gate is still active
- whether it is appropriate to start a new large roadmap pass yet
- which agent families and terminal instances are currently represented in roadmap state
- the latest structured sync snapshot for the frontend lane and backend lane when available
- the most important sequencing reminder for Claude and Codex
