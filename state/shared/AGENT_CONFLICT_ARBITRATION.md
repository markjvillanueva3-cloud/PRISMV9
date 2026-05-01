# AGENT_CONFLICT_ARBITRATION — Multi-chat coordination + consensus dissent log

Append-only event log shared across the ~6 concurrent Claude chats running on
this repo. Two source surfaces write here:

| Writer | Path | Event kinds |
|---|---|---|
| `.claude/helpers/arbitration-log.mjs` (P5-U04) | hook context | `auto-fork`, `lane-block`, `directive-warn` |
| `mcp-server/src/utils/arbitrationWriter.ts` (P4-U02) | engine / MCP context | `consensus-dissent` |

## File layout

```
state/shared/AGENT_CONFLICT_ARBITRATION.json   ← canonical event store
state/shared/AGENT_CONFLICT_ARBITRATION.md     ← this file (markdown reader)
state/shared/AGENT_CONFLICT_ARBITRATION.json.lock/   ← transient (cleared after write)
```

The `.json` is gitignored (`.gitignore` rule `state/shared/AGENT_*.json`); each
worktree initializes its own copy. The `.md` is force-tracked because the
schema description is part of the contract.

## Schema (`schemaVersion: 1.0.0`)

```json
{
  "schemaVersion": "1.0.0",
  "createdAt": "<ISO-8601>",
  "events": [
    {
      "ts": "<ISO-8601>",
      "kind": "auto-fork" | "lane-block" | "directive-warn" | "consensus-dissent",
      "sessionId": "<claude-{id} | unknown>",
      "pcName": "<host>",
      "details": { ... }
    }
  ]
}
```

Retention: most recent **5,000 events**. Older events are dropped on append to
keep the log bounded.

## `consensus-dissent` details (P4-U02)

```json
{
  "decision": "PASS | CONDITIONAL | FAIL | REFUSED",
  "reason": "<one-line>",
  "votes": { "PASS": <n>, "CONDITIONAL": <n>, "FAIL": <n> },
  "validProviders": <int>,
  "totalProviders": <int>,
  "partialQuorum": <bool>,
  "cloudPresent": <bool>,
  "flagsSurfaced": ["<flag>", ...],
  "dissentCount": <int>,
  "cacheKey": "<sha-256-hex>",
  "cacheHit": <bool>,
  "providers": [
    { "id": "<id>", "kind": "cloud|ollama", "valid": <bool>, "decision": "PASS|CONDITIONAL|FAIL", "error": "<msg|undefined>" }
  ],
  "context": { "sessionId": "...", "commitHash": "...", "files": [...], "note": "..." } | null
}
```

A `consensus-dissent` event is appended whenever the gate emits anything other
than a clean unanimous PASS — that is, REFUSED, FAIL, CONDITIONAL, OR a PASS
with non-empty `dissent[]` / `flagsSurfaced[]`. Clean unanimous PASS calls do
NOT log (signal-to-noise).

## Concurrency

`mkdir(lockDir)` is atomic on Windows + Unix. Both writers use it under
`<json>.lock/` with up to 8 retries and exponential backoff (5 ms base). The
critical section is read-merge-write of the JSON. A failed lock acquisition
throws — callers (engine + hook) decide whether to surface or swallow.

## Querying

```bash
# Recent dissent events for the current session
node H:/prism/.claude/helpers/arbitration-log.mjs read --session "$(node H:/prism/.claude/helpers/stable-session-id.mjs)"

# 24h summary
node H:/prism/.claude/helpers/arbitration-log.mjs summary
```

The TS writer in `mcp-server/src/utils/arbitrationWriter.ts` exposes
`readArbitrationEvents()` for in-process reads.

## Why this exists

- P5 hooks (lane-guard, auto-fork, directive-detect) need an audit trail to
  prove the rails are firing without false positives. Without the log we cannot
  tell whether a session got auto-forked recently.
- P4-U02's consensus gate writes its dissent here so the next session can see
  *which* providers disagreed on a recent shop-floor edit — diversity of
  rationale is the whole point of the N-of-5 quorum.

## Source

- `.claude/helpers/arbitration-log.mjs` — Node CLI + hook helper (P5-U04)
- `mcp-server/src/utils/arbitrationWriter.ts` — TS port for engine context (P4-U02)
- `mcp-server/src/tools/consensusGateTools.ts` — `prism_safety:consensus_gate` writes here (P4-U02)
