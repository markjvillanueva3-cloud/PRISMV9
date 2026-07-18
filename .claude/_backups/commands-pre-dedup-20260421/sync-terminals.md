# /sync-terminals — Cross-Terminal Synchronization

Synchronize awareness and state across multiple Claude Code terminal sessions.

## Usage
```
/sync-terminals [--mode push|pull|full]
```

## MCP Action
```
prism_session:sync_terminals
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs sync pipeline)
- **Advisor**: None (fully autonomous)

## What it does
1. Check ACTIVE_WORK_REGISTRY.json for other sessions
2. Identify state drift between terminals
3. Sync awareness cache via CrossTerminalBroadcastEngine
4. Resolve conflicts (latest-writer-wins or merge)
5. Update all sessions with unified state
6. Clear stale session entries

## Sync Modes
- **push**: Push local state to shared registry
- **pull**: Pull latest state from registry
- **full**: Bidirectional sync with conflict resolution

## Synced State
- cross-session-asset-registry.json
- extraction-log.json
- ACTIVE_WORK_REGISTRY.json
- awareness cache
- forge intent claims

## Output
- Sync summary (pushed/pulled items)
- Conflict resolution report
- Session registry status

## Related
- `/reap-zombies` — Clean up dead sessions
- `/awareness-check` — Verify awareness score
