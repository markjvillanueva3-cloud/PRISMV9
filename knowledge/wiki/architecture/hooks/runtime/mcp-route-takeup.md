---
title: Hook — mcp-route-takeup
type: hook
hook_name: mcp-route-takeup
hook_source: runtime
source_path: H:/prism/.claude/hooks/mcp-route-takeup.mjs
events: [PostToolUse]
generated_by: manual (TOKEN-SAVINGS-PIVOT/iter17)
last_verified: 2026-05-22
tags: [hook, source-runtime, event-posttooluse, token-savings, telemetry]
related:
  - knowledge/wiki/architecture/hooks/runtime/mcp-route-suggest.md
  - knowledge/wiki/architecture/token-savings-pivot.md
---

# Hook — `mcp-route-takeup`

**Source:** runtime · **File:** `H:/prism/.claude/hooks/mcp-route-takeup.mjs`
**Triggers on:** PostToolUse

## Purpose

Companion to `mcp-route-suggest`. Closes the **take-rate measurement gap** — `mcp-route-suggest` fires TOKEN-SAVE nudges and records each one in `state/shared/mcp-route-suggest-stats.json`, but until this hook shipped (TOKEN-SAVINGS-PIVOT iter8, `fbf39cb036`) we had no data on how often the model actually TOOK the suggested route. The 30% take-rate in `/route-suggest-stats` was doctrine, not measurement.

## How it works

For every PostToolUse event:

1. **Filter** — skip non-mcp tools and non-prism dispatchers (`extractMcpAction` returns null).
2. **Look up** — extract the canonical action key (e.g. `prism_session:master_index_query`).
3. **Read sidecar** — load `mcp-route-suggest-stats.json`; if missing, skip.
4. **Match recent fires** — `classifiersTakenBy(sidecar, mcpAction, sessionId)` walks `recent[]` and credits any classifier whose:
   - timestamp is within 60s of now
   - sessionId prefix-matches this session
   - classifier name maps to the just-invoked MCP action (per `_ACTION_TO_CLASSIFIERS`)
5. **Record** — bump `takeupTotals.totalTakeups`, `takeupTotals.byClassifier[c]`, unshift a row into `takeups[]` (cap 100).
6. **Atomic write** — per-PID temp + rename, same pattern as the iter-3 sidecar writer.

## Action → classifier map (iter13 — 7 entries)

| MCP action | Credits classifiers |
|---|---|
| `prism_session:master_index_query` | `isBroadGrep`, `isLargeRead`, `isBroadGlob` |
| `prism_session:action_search` | `isVerboseBash` |
| `prism_session:tool_route_best` | `isVerboseBash`, `isBroadGrep`, `isBroadGlob` |
| `prism_session:dispatcher_map_compact` | `isLargeRead` |
| `prism_dev:code_search` | `isBroadGrep`, `isVerboseBash` |
| `prism_dev:file_write` | `isLargeWrite` |
| `prism_dev:file_read` | `isLargeRead` |

## Safety properties

- **Window-bounded** — only fires within 60s of a nudge count; older nudges aren't credited.
- **Session-bounded** — only the same chat's fires get credited (sessionId prefix-match), preventing cross-session leakage in the 26-chat fleet.
- **Atomic-write** — per-PID temp + rename, mirrors `mcp-route-suggest` writer + `scripts/lib/atomic-json.mjs`.
- **Best-effort try/catch** — telemetry NEVER fails the hook. A missing sidecar or parse error returns `{continue:true}` silently.
- **Dedup** — `classifiersTakenBy` returns a Set; multiple fires of the same classifier within the window count once per MCP action invocation.

## Disable knobs

- `PRISM_MCP_ROUTE_TAKEUP_DISABLE=1` — disables sidecar writes; hook still passes through.
- `PRISM_HOOK_PROFILE` — disables the hook entirely via the per-session profile.

## Tests

`.claude/hooks/__tests__/mcp-route-takeup.test.mjs` — 13/13 PASS as of iter8.

Coverage:
- `extractMcpAction`: happy path, non-mcp tool, mcp tool no action, non-prism mcp tool, null/undefined defensive.
- `classifiersTakenBy`: happy path, window expiry, cross-session no credit, action-mismatch no credit, dedupe set, file_write maps only to isLargeWrite, unknown action, malformed sidecar fail-soft.

## See also

- Sister hook: [[mcp-route-suggest]] (PreToolUse, fires the nudges + writes recent[])
- Milestone home: [[token-savings-pivot]] (15+ iter chain)
- ROI reporter: `/route-suggest-stats` (haiku skill, reads sidecar)
- Atomic-write pattern: [[atomic-write-idempotency-patterns]]
