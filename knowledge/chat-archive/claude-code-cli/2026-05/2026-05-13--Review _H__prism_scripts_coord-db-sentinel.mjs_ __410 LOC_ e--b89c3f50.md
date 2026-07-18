---
type: "chat-session"
source: "claude-code-cli"
session_id: "b89c3f50-1cd2-448c-b2d0-f04ee6b13601"
title: "Review `H:/prism/scripts/coord-db-sentinel.mjs` (~410 LOC) end-to-end for conten"
date: "2026-05-13"
first_ts: "2026-05-13T23:25:50.865Z"
last_ts: "2026-05-13T23:26:33.013Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/b89c3f50-1cd2-448c-b2d0-f04ee6b13601/subagents/agent-a1119b96df2993ad8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/coord-db-sentinel.mjs` (~410 LOC) end-to-end for conten

> **claude-code-cli** | 2026-05-13 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b89c3f50-1cd2-448c-b2d0-f04ee6b13601/subagents/agent-a1119b96df2993ad8.jsonl`

## Transcript

### User | 2026-05-13T23:25:50.865Z

Review `H:/prism/scripts/coord-db-sentinel.mjs` (~410 LOC) end-to-end for content correctness. CLEANUP-MS0/U-CLEANUP-G2.

Spec: PRAGMA integrity_check + quick_check on `state/shared/coordination.db` (H8 SQLite WAL); count rows in claims/presence/meta tables; read `state/shared/WORK_CLAIMS.json` (legacy pre-H8 store, shape `{claims:{...},schemaVersion,updatedAt}`); compute |db-json|/max divergence%; alert if >=10%; flag retirement_candidate when db has rows + json count=0 + integrity ok. Read-only / advisory / exit-0-always. Outputs `state/shared/COORD_DB_HEALTH.{md,json}`.

Verify each:
1. `parseArgs` handles --json, --frozen-time, --db, --json-claims + PRISM_AUDIT_FROZEN_TIME env fallback
2. `loadSqliteDB` rejects missing file / zero-byte file / open failure; returns db handle on success; opts.databaseFactory + opts.sqliteModule injection paths work for tests (the `await import(opts.databaseFactory ? "node:fs" : mod)` is intentionally a no-op import when factory provided — verify it actually works that way)
3. `queryIntegrity` runs both PRAGMAs, catches per-pragma errors as `error: <msg>` strings (no throw)
4. `getDbCounts` iterates EXPECTED_TABLES, returns per-table {ok,count[,reason]}, flips haveSchema:false on any missing
5. `getJsonCounts` rejects missing/parse-fail/non-object/array roots; treats `claims:undefined` or `claims:non-object` as count=0 (defensive — was buggy in v0, fixed by Array.isArray check + claims-not-object branch)
6. `computeDivergence` no division-by-zero on 0/0; clamps non-finite/negative to 0; returns 100% when one side is 0
7. `generateAlerts` short-circuits on dbStatus.ok:false; reports integrity FAIL / quick_check FAIL separately; warns on json unreadable + tags retirement-candidate; alerts on schema drift listing missing tables; alerts on divergence >= thresholdPct (default 10)
8. `buildHealthReport` always returns a structured payload (ok:true/false), spreads emptyHealthShape() on ok:false branch, computes retirement_candidate correc
... [+670 chars truncated]

### Assistant | 2026-05-13T23:25:58.400Z

I'll review the script end-to-end against the 12 verification points.

### Assistant | 2026-05-13T23:25:58.873Z

[tool_use: Read]

### User | 2026-05-13T23:26:00.257Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * coord-db-sentinel.mjs — Coordination Store Health Sentinel (CLEANUP-MS0/U-CLEANUP-G2)
4	 *
5	 * Two-pronged health check on the coordination state pair:
6	 *   1. SQLite WAL (`state/shared/coordination.db`) — H8 store, source of truth
7	 *   2. Legacy JSON (`state/shared/WORK_CLAIMS.json`) — pre-H8 store, retirement candidate
8	 *
9	 * Runs PRAGMA integrity_check +
... [+20325 chars truncated]

### Assistant | 2026-05-13T23:26:33.013Z

## Code Quality Analysis Report

### Critical Issues (P0)

None.

### High Priority (P1)

**1. `loadSqliteDB` injection branch is broken (line 118) — verification point #2 FAILS**

```js
const imported = await import(opts.databaseFactory ? "node:fs" : mod);
Database = opts.databaseFactory || imported.default || imported;
```

The intent comment says "no-op import when factory provided," but this is **not equivalent**. When `opts.databaseFactory` is provided:
- `imported` becomes the `node:fs` module namespace
- `imported.default` is `undefined` (node:fs has no default export in ESM)
- The `||` short-circuits to `opts.databaseFactory` correctly

This works *by accident* because `databaseFactory` is truthy and consumed first. However, if a test ever passes a `sqliteModule` AND a `databaseFactory`, the `sqliteModule` is silently ignored. Worse: if `databaseFactory` is the literal `0`, `false`, or `""` (edge), the import path picks `node:fs` then crashes resolving `imported.default`. The "intentional no-op" framing in the spec is misleading — recommend `if (opts.databaseFactory) { Database = opts.databaseFactory; } else { const imported = await import(opts.sqliteModule || DEFAULT_SQLITE_MODULE); Database = imported.default || imported; }`.

**2. `invokedDirectly` check is broken on Windows (line 471-477) — verification point #12 FAILS**

```js
return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
```

On Windows, `process.argv[1]` is typically `H:\prism\scripts\coord-db-sentinel.mjs` (backslashes), while `fileURLToPath(import.meta.url)` returns the same. *However*, when invoked via npm scripts, symlinks, or `node ./scripts/...`, `process.argv[1]` may be a relative path or use forward slashes. The strict `===` will then fail and the CLI will silently no-op when run directly. Standard pattern uses `pathToFileURL(process.argv[1]).href === import.meta.url` or `realpathSync` normalization on both sides.

### Verified Passes (3-12 except noted)

- #1 p
... [+1420 chars truncated]
