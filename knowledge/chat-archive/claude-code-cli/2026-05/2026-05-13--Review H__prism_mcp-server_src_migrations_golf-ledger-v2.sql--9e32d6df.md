---
type: "chat-session"
source: "claude-code-cli"
session_id: "9e32d6df-f2c6-4f5c-a018-9841d647002c"
title: "Review H:/prism/mcp-server/src/migrations/golf-ledger-v2.sql end-to-end. This is"
date: "2026-05-13"
first_ts: "2026-05-13T19:06:33.196Z"
last_ts: "2026-05-13T19:07:17.008Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/9e32d6df-f2c6-4f5c-a018-9841d647002c/subagents/agent-acb084630e0f95668.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review H:/prism/mcp-server/src/migrations/golf-ledger-v2.sql end-to-end. This is

> **claude-code-cli** | 2026-05-13 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9e32d6df-f2c6-4f5c-a018-9841d647002c/subagents/agent-acb084630e0f95668.jsonl`

## Transcript

### User | 2026-05-13T19:06:33.196Z

Review H:/prism/mcp-server/src/migrations/golf-ledger-v2.sql end-to-end. This is the schema-evolution migration for U-CLEANUP-B5.

Context — U-CLEANUP-B5 spec from `state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md` and `mcp-server/data/milestones/CLEANUP-MS0.json`:
- Title: "B5 — bug_attribution SQLite table writes via B10 (no naked appendFileSync); per-slot rolling 24h scoring with tokensSpent + costUsdEstimate columns; pre-dispatch write of {commitSha, agentType, dispatchPrompt, expectedFiles, originatingTickId} for compaction-survival"
- Depends on U-CLEANUP-B10 (LedgerStoreEngine + golf-ledger-v1.sql — both shipped, complete)
- v1 schema for bug_attribution already has: id, bug_id, originating_chat, commit_sha, file_paths_json, severity, summary, detected_at, resolved_at, resolved_by, resolution_note
- B5 spec from line 499: "B4 writes full {commitSha, agentType, dispatchPrompt, expectedFiles, originatingTickId} to ledger AT dispatch time. B5 result handler re-reads + reconstructs context from disk"

What to assess (grade P0/P1/P2/P3, then PASS or FAIL):
1. **Schema correctness**: Are the 6 added columns the right shape + nullability? Column-name conventions consistent with v1 (snake_case, `_json` suffix for JSON-stringified payloads)? Defaults sensible for legacy v1 rows?
2. **Idempotency**: SQLite has no `ADD COLUMN IF NOT EXISTS`. The file relies on the engine's `migrate(2)` to gate the ALTERs via `pragma table_info`. Is that strategy load-bearing or fragile? Is the comment about "fail loud on re-run of v2.sql directly" defensible?
3. **Index choice**: idx_bug_attribution_tick (on originating_tick_id) + idx_bug_attribution_agent (on agent_type). Are these the right indexes for the B5 use-cases (result-handler lookup by tick + per-agent leaderboards for B12 LoRA export)? Any missing?
4. **Backward compatibility**: Will existing v1 INSERT statements in LedgerStoreEngine.ts (`insertBug`) still succeed after this migration? (They don't reference the new columns
... [+831 chars truncated]

### Assistant | 2026-05-13T19:06:52.303Z

I'll review the migration file end-to-end.

### Assistant | 2026-05-13T19:06:52.782Z

[tool_use: Read]

### User | 2026-05-13T19:06:56.606Z

[tool_result] 1	-- golf-ledger-v2.sql — schema bump for U-CLEANUP-B5
2	--
3	-- B5 adds 6 columns to bug_attribution + 2 indexes to support:
4	--   (a) per-slot rolling 24h scoring with cost-attribution (tokens_spent, cost_usd_estimate)
5	--   (b) pre-dispatch row write for compaction-survival (agent_type, dispatch_prompt,
6	--       expected_files_json, originating_tick_id) — context the result handler
7	--    
... [+2618 chars truncated]

### Assistant | 2026-05-13T19:07:17.008Z

## Code Quality Analysis Report — golf-ledger-v2.sql

### Summary
- Files Analyzed: 1
- Issues Found: 3 (1 P1, 2 P2)
- Overall Quality: 8.5/10

### Schema correctness (P3 — pass)
6 columns match v1 conventions: snake_case throughout, `_json` suffix on `expected_files_json` (matches v1 `file_paths_json`). INTEGER for tokens_spent + REAL for cost_usd_estimate are correct sqlite types. Defaults (0 / NULL) are defensible per the file's own documented rationale (v1-era cost=0 means "unknown", v2 pre-dispatch cost=0 means "observed, no work yet" — distinguishable by `agent_type IS NOT NULL`).

### Idempotency (P2)
The `migrate(2)` + `pragma table_info` gate strategy is **load-bearing but defensible** — sqlite genuinely has no `ADD COLUMN IF NOT EXISTS` and the file documents the contract explicitly. The "fail loud on direct re-run" comment is correct per R12. **Risk**: if a future contributor adds raw-sql-runner tooling that bypasses LedgerStoreEngine.migrate(), they'll hit "duplicate column name" with no migration-version context. Mitigation already in place (comment lines 10-16).

### Indexes (P3 — pass)
Both indexes match documented use cases: tick lookup is O(log n) for result-handler joins; agent_type supports B12 GROUP BY for LoRA export. **Not missing**: a composite `(agent_type, detected_at)` would help rolling-24h-per-agent scoring (B5 spec line: "per-slot rolling 24h scoring") — consider for v3 if EXPLAIN QUERY PLAN shows table scans.

### Backward compat (P3 — pass)
Existing `insertBug` INSERTs against named columns will succeed — the 6 new columns either DEFAULT 0 or accept NULL. No positional INSERT patterns observed.

### FK concerns (P1)
`originating_tick_id` lacks declared FK to `peer_audit_ticks.tick_id`. Engine-level enforcement is **acceptable but documented nowhere in the SQL** — a future schema-only reader can't see the relationship. Recommend either (a) add `REFERENCES peer_audit_ticks(tick_id)` (sqlite FKs are opt-in via `PRAGMA foreign_keys=ON`, lo
... [+689 chars truncated]
