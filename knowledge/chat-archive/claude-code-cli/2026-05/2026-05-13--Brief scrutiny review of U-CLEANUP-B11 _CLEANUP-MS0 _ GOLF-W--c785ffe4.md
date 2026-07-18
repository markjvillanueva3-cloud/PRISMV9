---
type: "chat-session"
source: "claude-code-cli"
session_id: "c785ffe4-cff7-477e-b466-ab1899a5842e"
title: "Brief scrutiny review of U-CLEANUP-B11 (CLEANUP-MS0 / GOLF-WATCHDOG). Two files:"
date: "2026-05-13"
first_ts: "2026-05-13T17:01:02.519Z"
last_ts: "2026-05-13T17:01:46.121Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-a3f08e68a59bf20ea.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Brief scrutiny review of U-CLEANUP-B11 (CLEANUP-MS0 / GOLF-WATCHDOG). Two files:

> **claude-code-cli** | 2026-05-13 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-a3f08e68a59bf20ea.jsonl`

## Transcript

### User | 2026-05-13T17:01:02.519Z

Brief scrutiny review of U-CLEANUP-B11 (CLEANUP-MS0 / GOLF-WATCHDOG). Two files:

1. `H:/prism/mcp-server/src/engines/LedgerProjectorEngine.ts` — JSONL projector for B10 ledger. Cursor-based incremental projection. Tables: bug_attribution → peer-bug-attribution.jsonl, peer_audit_ticks → peer-audit-ticks.jsonl, chat_bus_signals → peer-bus-signals.jsonl, golf_envelope_mutations → golf-envelope-mutations.jsonl. Cursors persisted to .ledger-projector-cursors.json (schema v1).
2. `H:/prism/mcp-server/src/__tests__/ledgerProjectorEngine.test.ts` — 16 tests GREEN.

Spec: §R3-VER2 — "in-process callback on every INSERT" was aspirational; pragmatic impl is cursor-poll since B10 doesn't expose insert events.

Focused review (300 words max):

1. **Cursor advancement correctness** — does `projectTable` correctly track the highest `id` of the batch? `newCursor = Number((rows[rows.length - 1] as { id: number }).id)`. Test verifies. Race: what if a new INSERT lands DURING the cursor save? (`saveCursorFile` is atomic tmp+rename, but the SELECT was already taken.) Acceptable — next projection will pick up rows since cursor.

2. **Cap behavior** — `MAX_ROWS_PER_PROJECTION_RUN=10_000`. `truncated:true` when rows.length === cap. But the cursor advances only to the last row in the batch, so the NEXT call will pick up the remainder. No test verifies the 10001-row truncation path. P3 coverage gap.

3. **SQL injection via `table` parameter** — `projectTable(table: ProjectionTable)` uses the table name in a string-interpolated SQL: `SELECT * FROM ${table} WHERE id > ?`. The type union restricts to 4 known values; JS callers passing arbitrary strings would crash B10's query() rejection (only SELECT/WITH allowed). Safe.

4. **JSONL line integrity** — appended via `appendFileSync` of `lines.join("\n") + "\n"`. Concurrent appends from multiple projector instances on same file could interleave. Single-instance use is correct. Document the constraint.

5. **resetCursors with forceClearJsonl** — d
... [+898 chars truncated]

### Assistant | 2026-05-13T17:01:11.796Z

I'll perform a focused scrutiny review of the LedgerProjectorEngine and its test file.

### Assistant | 2026-05-13T17:01:12.218Z

[tool_use: Read]

### Assistant | 2026-05-13T17:01:12.572Z

[tool_use: Read]

### User | 2026-05-13T17:01:19.425Z

[tool_result] 1	/**
2	 * LedgerProjectorEngine — CLEANUP-MS0 / U-CLEANUP-B11 (R3-VER2)
3	 *
4	 * Projects the B10 SQLite ledger into JSONL files so the existing JSONL
5	 * consumers (chat-bus-inject hook, MILESTONE_PROGRESS readers, F3/F4/F5/F6
6	 * dashboards) keep working unchanged. SQLite is the source of truth; the
7	 * JSONLs are read-side views for legacy compatibility.
8	 *
9	 * DESIGN
10	 *   - Each led
... [+10315 chars truncated]

### User | 2026-05-13T17:01:20.112Z

[tool_result] 1	/**
2	 * ledgerProjectorEngine.test.ts — U-CLEANUP-B11
3	 *
4	 * Coverage:
5	 *   - Initial project: empty cursor → projects all rows, cursor advances.
6	 *   - Incremental: 2nd project after new inserts → only NEW rows appended.
7	 *   - Idempotence: 2 projectAll calls back-to-back → 2nd is a no-op.
8	 *   - Cursor persistence: cursor file is JSON v1 with `updatedAt` ISO-Z.
9	 *   - Reset: rese
... [+12790 chars truncated]

### Assistant | 2026-05-13T17:01:46.121Z

## Code Quality Analysis Report — U-CLEANUP-B11

### Engine Review

1. **Cursor advancement** — Correct. `newCursor = Number((rows[rows.length - 1] as { id: number }).id)`. ORDER BY id ASC + LIMIT guarantees monotonic advance. Race during save: SELECT snapshot is fixed; next poll picks up newer rows. Safe.

2. **Cap behavior (P3 gap)** — `truncated:true` fires at `rows.length >= MAX_ROWS_PER_PROJECTION_RUN` (10,000). Cursor advances to last row in batch, so next call drains remainder. **No test covers 10,001-row truncation path** — verified by reading test file (only single-digit row counts). Recommend adding one test that inserts 10,005 rows, asserts `truncated:true`, then runs again and asserts `truncated:false` with 5 rows. P3.

3. **SQL injection** — `${table}` is interpolated, but `ProjectionTable` is a 4-value union and `ALL_TABLES` is frozen. TS callers cannot pass arbitrary strings. Plain JS callers would hit `LedgerStoreEngine.query()`'s SELECT/WITH allowlist. Safe in practice; defense-in-depth would be a `Set.has()` check at runtime, but not blocking.

4. **JSONL append integrity** — `appendFileSync` with joined string is atomic per call on POSIX, but multi-instance concurrent projectors on same JSONL would interleave at OS-block boundaries. Docblock should explicitly say "single-instance only; B6 cron is the sole writer". Currently implicit. P2 doc gap.

5. **resetCursors partial-failure** — Cursor file is reset BEFORE JSONL unlinks. If unlink throws mid-loop, state is inconsistent (cursor=0, some files still present). Re-projection appends duplicates (documented). Acceptable; matches docblock contract.

6. **Empty JSONL after reset alone** — Documented in line 173 docblock ("Existing JSONL files are NOT truncated... consumers must dedupe by `id`"). Test `reset zeros all cursors but leaves JSONL files intact by default` verifies duplicate-append behavior with `expect(lines.length).toBe(2)`. Contract honored.

7. **Test integrity scan** — Read all 16 tests
... [+2351 chars truncated]
