---
name: "reap-zombies"
description: "Dead claim cleanup across sessions"
policy:
  tier: 2
  triggers:
    - events:
      - "SessionStart"
      keywords: []
    - events:
      - "UserPromptSubmit"
      keywords:
      - "reap zombies"
      - "dead claims"
  mode: "fire-forget"
  priority: 20
  timeout_ms: 8000
  token_budget: 200
---

# /reap-zombies — Dead Claim Cleanup

Clean up stale claims, orphaned locks, and zombie session entries.

## Usage
```
/reap-zombies [--age-hours N] [--dry-run]
```

## MCP Action
```
prism_session:reap_zombies
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (runs cleanup pipeline)
- **Advisor**: None (fully autonomous)

## What it does
1. Scan claim files in state/claims/
2. Identify stale claims (>N hours old)
3. Check if claiming session is still active
4. Release abandoned milestone claims
5. Clean up orphaned lock files
6. Remove dead session entries from registry
7. Update ACTIVE_WORK_REGISTRY.json

## Zombie Types
- **Claims**: Milestone claims from dead sessions
- **Locks**: File locks never released
- **Sessions**: Session entries with no heartbeat
- **Intents**: ForgeIntentClaim with no followup

## Options
- `--age-hours N`: Consider zombie if older than N hours (default: 2)
- `--dry-run`: Report but don't delete

## Output
- Zombie inventory
- Cleaned items count
- Freed resources summary

## Related
- `/sync-terminals` — Sync active sessions
- `/awareness-check` — Verify awareness score
