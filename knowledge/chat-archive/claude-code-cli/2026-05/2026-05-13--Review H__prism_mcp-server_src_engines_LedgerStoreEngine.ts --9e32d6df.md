---
type: "chat-session"
source: "claude-code-cli"
session_id: "9e32d6df-f2c6-4f5c-a018-9841d647002c"
title: "Review H:/prism/mcp-server/src/engines/LedgerStoreEngine.ts end-to-end after the"
date: "2026-05-13"
first_ts: "2026-05-13T19:30:55.327Z"
last_ts: "2026-05-13T19:31:52.966Z"
cwd: "H:\\prism\\mcp-server"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/9e32d6df-f2c6-4f5c-a018-9841d647002c/subagents/agent-a9d5ed98e0422fd88.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review H:/prism/mcp-server/src/engines/LedgerStoreEngine.ts end-to-end after the

> **claude-code-cli** | 2026-05-13 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/9e32d6df-f2c6-4f5c-a018-9841d647002c/subagents/agent-a9d5ed98e0422fd88.jsonl`

## Transcript

### User | 2026-05-13T19:30:55.327Z

Review H:/prism/mcp-server/src/engines/LedgerStoreEngine.ts end-to-end after the U-CLEANUP-B5 changes.

Context — this engine was at v1 (schema version 1) before today. The B5 unit ships v2 deliverables: 6 new columns on `bug_attribution` (tokens_spent, cost_usd_micros, agent_type, dispatch_prompt, expected_files_json, originating_tick_id), per-slot rolling 24h scoring, and a pre-dispatch row writer for compaction-survival. The companion SQL file `H:/prism/mcp-server/src/migrations/golf-ledger-v2.sql` already PASSED 3-of-3 scrutiny (re-review) in this same session — review v2.sql before judging the engine.

What changed in this engine:
1. `LEDGER_SCHEMA_VERSION` bumped 1 → 2.
2. New constants/helpers: `MICROS_PER_USD`, `microsToUsd`, `usdToMicros`, `getMigrationSqlPath`, `SCORE_WINDOW_MS_24H`, `SEVERITY_WEIGHT`, `DISPATCH_PROMPT_MAX_BYTES`.
3. `BugAttributionRow` interface gained 6 fields.
4. New input type: `BugPreDispatchInput`.
5. New output type: `SlotScore24h`.
6. `LedgerStoreOptions` gained `migrationSqlPathByVersion` (test seam).
7. `ensureOpen` calls `applyMigrationSql(db, 1)` then `bootstrapToCurrentVersion(db)` BEFORE compiling prepared statements (so statements referencing v2 columns are safe).
8. `bootstrapToCurrentVersion` calls `applyV2GuardedMigrations` (pragma table_info guard per column) — does NOT seed `ledger_schema_version` so the first public `migrate(v)` returns `alreadyAtVersion=false` per the B10 contract.
9. `migrate()` rewritten: supports v1 and v2; forward-only (never downgrades meta); applies needed migrations idempotently.
10. `applyMigrationSql` is now versioned: `(db, version=1)` and resolves the SQL path via `resolveMigrationSqlPath`.
11. `insertBug` prepared statement now binds 13 columns (was 7). `insert()` bug_attribution branch updated to pass the new 6 fields with sensible defaults via `clampNonNegInt` + `optionalText` helpers.
12. New public methods: `insertPreDispatchRow(BugPreDispatchInput) → BugAttributionRow`, `getSlotScore2
... [+2206 chars truncated]

### Assistant | 2026-05-13T19:31:04.930Z

I'll review the engine end-to-end against the v2 changes.

### Assistant | 2026-05-13T19:31:05.410Z

[tool_use: Read]

### User | 2026-05-13T19:31:15.935Z

[tool_result] 1	/**
2	 * LedgerStoreEngine — CLEANUP-MS0 / U-CLEANUP-B10
3	 *
4	 * Domain ledger for the golf-slot watchdog + peer chats. Wraps the SAME
5	 * SQLite WAL database as `CoordinationStoreEngine` (state/shared/coordination.db)
6	 * via an independent connection — better-sqlite3 + WAL mode supports multiple
7	 * concurrent connections to the same file, so we get atomicity without sharing
8	 * a Databa
... [+52154 chars truncated]

### Assistant | 2026-05-13T19:31:52.966Z

## Code Quality Analysis Report — LedgerStoreEngine.ts (v2)

### Summary
- Overall Quality Score: 8.5/10
- Files Analyzed: 1 (1104 lines)
- Issues Found: 2 P1 + 4 P2 + 3 P3
- Technical Debt: ~1.5 hours

### Findings by Assessment Item

**1. Type completeness (PASS)** — All 6 new fields in `BugAttributionRow` align with v2.sql column types/nullability: 2 NOT NULL INTEGER (tokens_spent, cost_usd_micros), 4 TEXT nullable. `BugPreDispatchInput` requires the dispatch-time inputs and makes severity/summary/tokens/cost optional, which matches the "update at resolve" intent.

**2. Migration ordering (PASS)** — `ensureOpen` correctly applies v1 DDL → v2 guarded ALTERs → prepared statements. Critical: `insertBug`/`insertPreDispatch` reference v2 columns, so the bootstrap-before-prepare ordering is load-bearing. The B10 contract preservation (DDL applied physically, meta NOT seeded) is well-documented at line 555–571.

**3. Pragma table_info guard (PASS)** — `applyV2GuardedMigrations` checks each column independently, so a crash-mid-migration leaves a partial state that re-runs cleanly. **P2:** the index DDL runs unconditionally even when all columns already exist; SQLite `CREATE INDEX IF NOT EXISTS` is cheap but the `bytes` accounting double-counts on every reopen — minor cosmetic.

**4. migrate() edge cases (PASS)** — `migrate(1)` on v2-recorded DB returns `alreadyAtVersion=true` (line 600 `recorded >= version`). `migrate(2)` on v0 applies both v1 and v2 paths. `migrate(2)` twice — second returns `alreadyAtVersion=true`. Forward-only enforced via `Math.max` on line 621.

**5. insertPreDispatchRow validation (PASS)** — Validates all 7 required strings + epoch-ms, defaults severity/summary/tokens/cost. Uses `truncate` for byte-bounding. R12 fail-loud on missing required fields.

**6. NULL → "unknown" bucketing (PASS)** — Line 864 `r.originating_chat ?? "unknown"` correctly handles NULL. SQL `GROUP BY originating_chat` collapses NULLs to one bucket per SQLite semantics.

**7. S
... [+3720 chars truncated]
