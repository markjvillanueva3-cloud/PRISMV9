---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "Read H:/prism/scripts/dr-drill.mjs end-to-end and review it against this contrac"
date: "2026-05-14"
first_ts: "2026-05-14T16:20:17.526Z"
last_ts: "2026-05-14T16:22:55.165Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 7
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-a19718917b869ec65.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Read H:/prism/scripts/dr-drill.mjs end-to-end and review it against this contrac

> **claude-code-cli** | 2026-05-14 | 20 msgs (7 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-a19718917b869ec65.jsonl`

## Transcript

### User | 2026-05-14T16:20:17.526Z

Read H:/prism/scripts/dr-drill.mjs end-to-end and review it against this contract:

CONTRACT (from envelope U-CLEANUP-G14):
- MONTHLY restore G12 snapshot to H:/prism-dr-test/ ; run coord_sqlite health + row-count parity ; fail-loud to DR_DRILL_LEDGER.jsonl.
- Depends on U-CLEANUP-G12 (golf-state-snapshot.mjs) which produces snapshots at H:/prism-backups/golf-state/<fsSafeIso>/ each containing coordination.db + golf-owned-paths.json + golf-cron-registry.json + golf-token-budget.json + bug_attribution.jsonl + manifest.json. Manifest schema: {schemaVersion, generatedAt, copied[], dump:{table,rows}|null}.

For reference, the G12 producer is at H:/prism/scripts/golf-state-snapshot.mjs — verify the consumer assumptions in dr-drill.mjs match the producer's actual output (manifest field names, filesystem-safe ISO format, snapshot dir layout, dump rules).

Focus your review on:
1. Correctness of the restore flow: does it actually restore everything G12 wrote? Does it handle the "no snapshots yet" case correctly?
2. Correctness of validateRestoredDb: does it correctly distinguish PASS from FAIL? Is the rowsToFirstScalar helper safe against unexpected pragma return shapes (e.g. integrity_check returning multiple rows for a corrupt DB)?
3. The expectedRows logic: G12 records dump as {ok:true, rows:N} on success or {ok:false, reason:"..."} on degraded. The drDrill orchestrator extracts expectedRows via `manifestResult.manifest.dump && manifestResult.manifest.dump.ok !== false` — verify this matches G12's actual manifest shape (which DOES use ok!=false explicitly — read it).
4. Ledger row schema: stable + sufficient for trailing-12-months operator query?
5. Failure-category taxonomy: every failure mode hits exactly one of {no-snapshot, manifest, restore, db-integrity, row-parity, now-invalid}? Anything fall through the cracks?
6. The dry-run skip-ledger-write rule: result.dryRun && hooks.appendFn==null skips the write. Is this right? (Reasoning: dry-run is a planning preview, yo
... [+937 chars truncated]

### Assistant | 2026-05-14T16:20:28.557Z

I'll perform a thorough review of the DR drill script against the contract.

### Assistant | 2026-05-14T16:20:29.125Z

[tool_use: Read]

### User | 2026-05-14T16:20:35.387Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * dr-drill.mjs — CLEANUP-MS0 / U-CLEANUP-G14
4	 *
5	 * MONTHLY disaster-recovery drill: restore the latest G12 golf-state snapshot
6	 * to `H:/prism-dr-test/restore/`, verify the restored `coordination.db` is
7	 * intact, and check row-count parity against the manifest's recorded
8	 * `bug_attribution` row count. Every drill — pass or fail — appends one
9	 * JSONL li
... [+26217 chars truncated]

### Assistant | 2026-05-14T16:20:38.949Z

Now let me read the G12 producer to verify consumer assumptions match.

### Assistant | 2026-05-14T16:20:39.189Z

[tool_use: Read]

### User | 2026-05-14T16:20:42.073Z

[tool_result] read-once-guard: 'H:\prism\scripts\golf-state-snapshot.mjs' was already read 5m ago in this session and is unchanged (mtime 1778767478219). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-14T16:20:45.173Z

I have the G12 content in context. Let me run a targeted check on key parts I need to verify.

### Assistant | 2026-05-14T16:20:46.521Z

[tool_use: Grep]

### User | 2026-05-14T16:20:48.596Z

[tool_result] 14: *   - bug_attribution SQL-dump            (the bug_attribution table from
20: * Each snapshot dir also gets a `manifest.json` carrying the true ISO
21: * `generatedAt` + the copy/dump result — the restore side (G14 dr-drill) reads
27: * name back AND cross-checks manifest.json when present.
31: *   - `--dry-run` computes the full plan (copies, dump, prune) with zero writes.
67:// State files c
... [+2257 chars truncated]

### Assistant | 2026-05-14T16:20:51.053Z

Now I have a critical finding. Let me verify by looking at the manifest write exactly.

### Assistant | 2026-05-14T16:20:51.900Z

[tool_use: Read]

### User | 2026-05-14T16:20:56.122Z

[tool_result] 270	    result.dump = { ok: false, reason: dump.reason };
271	    result.skipped.push({ item: DUMP_BASENAME, reason: dump.reason });
272	  }
273	
274	  // 4. Write manifest.json (the restore side reads this, not the dir name).
275	  if (!opts.dryRun) {
276	    const manifest = {
277	      schemaVersion: SCHEMA_VERSION,
278	      generatedAt: result.generatedAt,
279	      copied: result.copied.map(
... [+1206 chars truncated]

### Assistant | 2026-05-14T16:21:07.680Z

**CRITICAL FINDING.** This is a P0 bug.

Look at G12 line 280:
```js
dump: result.dump && result.dump.ok ? { table: DUMP_TABLE, rows: result.dump.rows } : null,
```

When the dump succeeds, the manifest's `dump` field is `{table: "bug_attribution", rows: N}` — **NO `ok` field**. When degraded, the manifest's `dump` field is `null` (not `{ok:false, reason:"..."}`).

But dr-drill line 471:
```js
const expectedRows = manifestResult.manifest.dump && manifestResult.manifest.dump.ok !== false
  ? (typeof manifestResult.manifest.dump.rows === "number" ? manifestResult.manifest.dump.rows : null)
  : null;
```

The contract in the user's prompt asserts: *"G12 records dump as {ok:true, rows:N} on success or {ok:false, reason:"..."} on degraded"* and that G12's manifest "DOES use `ok!=false` explicitly".

That's **false**. G12 strips `ok` from the manifest entirely. So:
- On success: `manifest.dump = {table, rows}` → `dump.ok` is `undefined` → `undefined !== false` is `true` → reads `dump.rows` → expectedRows = N. **Works by accident.**
- On degraded: `manifest.dump = null` → first conjunct is falsy → expectedRows = null. **Works.**

So the production code path produces correct expectedRows, but the contract description in the user's prompt and the code comment on dr-drill line 263 (which says G12 marks `dump:null`) is internally inconsistent with what the user's prompt claims. The code itself is correct — just for the wrong stated reason. Drift risk is real if G12 ever changes its shape. P1, not P0.

Let me check a few more things.

### Assistant | 2026-05-14T16:21:08.028Z

[tool_use: Read]

### User | 2026-05-14T16:21:10.204Z

[tool_result] 60	// worktrees too (per the CLAUDE.md conflict-fork rule).
61	const DEFAULT_REPO = resolve(__dirname, "..");
62	const DEFAULT_BACKUP = "H:/prism-backups/golf-state";
63	const DEFAULT_RETAIN_DAYS = 30;
64	const SCHEMA_VERSION = 1;
65	const DAY_MS = 24 * 60 * 60 * 1000;
66	
67	// State files copied verbatim (relative to repo root). `kind` is informational.
68	const SOURCE_FILES = [
69	  { rel: "sta
... [+5449 chars truncated]

### Assistant | 2026-05-14T16:21:13.124Z

I noted the task list. Now I have enough to render the verdict.

Let me check a few more specific concerns about edge cases.

### Assistant | 2026-05-14T16:21:14.812Z

[tool_use: Grep]

### User | 2026-05-14T16:21:21.678Z

[tool_result] 10: *   - state/shared/coordination.db        (H8 SQLite WAL — full claim/presence store)
15: *     coordination.db → bug_attribution.jsonl, one row per line. Portable +
18: *     `skipped`, and the raw coordination.db copy is still the full backup.)
68:const SOURCE_FILES = [
69:  { rel: "state/shared/coordination.db", kind: "sqlite" },
133: * Open coordination.db read-only and dump every row of `
... [+1015 chars truncated]

### Assistant | 2026-05-14T16:22:55.165Z

**Another P0 finding.** G12 line 279 writes `manifest.copied = result.copied.map((c) => c.rel)` — so `copied[]` in the manifest contains **full relative paths** like `"state/shared/coordination.db"`, `"state/shared/golf-owned-paths.json"`. But the actual file in the snapshot dir is just `coordination.db` (flat — G12 line 244 uses `src.rel.split("/").pop()`).

Now in dr-drill:
- `REQUIRED_RESTORE_FILES = ["coordination.db", "manifest.json"]` — basenames.
- `restoredNames` is built from `restore.copied` which uses basenames from `readdirSync(snapshotDir)` (line 230 in dr-drill — `e.name`).

So the basename-only check on lines 487-491 works fine because dr-drill itself reads the actual filesystem of the snapshot, not the manifest's `copied[]`. Good — but dr-drill never validates `restoredNames` against `manifest.copied` for consistency. That's a P2 observability gap, not a correctness bug.

Now I have enough to render the full verdict. Let me also check whether dr-drill verifies `coordination.db` is actually listed in `manifest.copied` — it doesn't. If G12 ran and `state/shared/coordination.db` was missing on the source side (line 234 — `result.skipped.push({rel, reason:"source-missing"})`), then `coordination.db` wouldn't be in the snapshot dir at all → dr-drill's `restore` step would find it missing → REQUIRED_RESTORE_FILES check fires `failureCategory:"restore"`. OK, covered.

What about `manifest.json` itself? G12 only writes manifest.json on non-dry-run. dr-drill requires it. So a dry-run G12 → no manifest → dr-drill says `failureCategory:"manifest"`. OK.

Now — what if `coordination.db` is in the snapshot but is a zero-bytes file because the source was a zero-bytes copy? G12 has no zero-byte guard on the copy itself (line 244 unconditional copyFileSync). dr-drill's `validateRestoredDb` line 285 catches that as a FAIL. Good.

What about the dry-run rationale? Reasoning: dr-drill dry-run validation skip — line 500 sets `validation: {ok:true, dryRun:true}` and `resu
... [+16137 chars truncated]
