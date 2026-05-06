---
policy:
  tier: 2
  triggers:
    - "token-economy-report"
    - "token report"
    - "session token"
    - "how many tokens"
---
# Token Economy Report — Session Token Breakdown

Display the current session's token usage by category, surface top waste patterns, and link the report file for downstream analysis. Wraps `mcp-server/data/state/token-economy-session.json` (written by the P9-U05 Stop hook).

## Args: $ARGUMENTS
- (none) — show current session
- `--session=<id>`: report on a specific past session (looks up by sessionId)
- `--format=<table|json|markdown>`: output format (default: table)
- `--top=<n>`: number of waste patterns to surface (default: 3)

## Trigger policy
```yaml
policy:
  tier: 2
  triggers:
    - keyword:"token report"
    - keyword:"session token"
    - keyword:"how many tokens"
    - on:Stop
```

## What it shows
| Category | Description |
|----------|-------------|
| `hooks` | Hook scripts that fired this session — inject blocks, blocking warnings |
| `injections` | UserPromptSubmit context blocks (awareness, chat-bus, wiki, memory) |
| `tool_calls` | Bash / Edit / Read / Write / Grep / Glob / Agent invocations |
| `file_reads` | Read tool events plus tool-result file content |

## Top waste detection
Surfaces the 3 (or `--top=N`) categories with the highest tokens-burned-per-action ratio. Examples:
- `hooks/c-to-h-mirror`: fired 23×, burned 4,200 tok → 183 tok/fire (low cost, frequent — fine)
- `injections/awareness-bundle`: fired 45×, burned 18,000 tok → 400 tok/fire (high cost, frequent — investigate)

## Source
- Hook: `.claude/hooks/token-economy-report.mjs` (Stop hook, P9-U05)
- State: `mcp-server/data/state/token-economy-session.json` — append-only, one record per session
- Schema: each record carries `{sessionId, ts, byCategory, waste, estimated}`

## MCP wiring
No direct dispatcher action yet. Future: `prism_session:token_economy_report` to query historical sessions.

## Related
- `/optimize-context` — fix the budget if this report shows it's high
- `/learned-patterns-apply` — pull lessons from past high-cost sessions
