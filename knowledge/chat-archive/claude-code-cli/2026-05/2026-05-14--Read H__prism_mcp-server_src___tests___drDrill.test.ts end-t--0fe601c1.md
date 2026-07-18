---
type: "chat-session"
source: "claude-code-cli"
session_id: "0fe601c1-0fbe-4ef2-b6d5-64d54264beb1"
title: "Read H:/prism/mcp-server/src/__tests__/drDrill.test.ts end-to-end and the SUT at"
date: "2026-05-14"
first_ts: "2026-05-14T16:37:58.932Z"
last_ts: "2026-05-14T16:41:05.652Z"
cwd: "H:\\prism"
messages: 36
user_msgs: 14
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-abd1e2836a0a3c69e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Read H:/prism/mcp-server/src/__tests__/drDrill.test.ts end-to-end and the SUT at

> **claude-code-cli** | 2026-05-14 | 36 msgs (14 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0fe601c1-0fbe-4ef2-b6d5-64d54264beb1/subagents/agent-abd1e2836a0a3c69e.jsonl`

## Transcript

### User | 2026-05-14T16:37:58.932Z

Read H:/prism/mcp-server/src/__tests__/drDrill.test.ts end-to-end and the SUT at H:/prism/scripts/dr-drill.mjs.

This is an INDEPENDENT 2nd-pass review of the test suite. Do not assume the first reviewer caught anything. You're weighted on what's easy to miss: stub-pattern detection, hermeticity violations, race conditions in test setup/teardown, false-positive PASS paths (test passes for the wrong reason), and integration coupling.

The SUT is a 600-line monthly DR-drill script that restores a G12 snapshot, validates the restored coordination.db with pragmas, checks row-count parity, and writes a JSONL ledger row. The test file is ~650 lines, ~60 test cases.

Focus on:
1. **Stub/placeholder patterns**: scan EVERY assertion for `.toBeDefined()`, `.toBeTruthy()`, `.toBeFalsy()`, `.not.toBeNull()`, `expect(x).toEqual(expect.anything())`, `expect(x).toMatch(/./)`, or any "shape-without-value" check. CLAUDE.md HARD BLOCKS stub assertions; if any survive, the test legitimacy gate will reject the file at commit time.

2. **False-positive PASS paths**: a test that passes even when the SUT does the wrong thing. Examples:
   - test that only checks `result.ok === true` without verifying the side effects (ledger row written, files actually copied to disk).
   - test that checks `errors.length > 0` without asserting WHICH error.
   - test that mocks the SUT itself rather than its dependencies.

3. **Hermeticity**: does any test touch H:/prism/state/shared/ (live), H:/prism-backups/ (live), H:/prism-dr-test/ (live)? Does any test rely on the better-sqlite3 native module being installed? All tests should be hermetic via SCRATCH and FakeDatabase.

4. **Race conditions**: tests run in parallel by default in vitest. Does any test share state (filesystem path, cached module) with another? The `loadDrDrill` cache-busted dynamic import + per-test SCRATCH dir should be sufficient — verify.

5. **Magic-number meaning**: tests use literals like rowCount: 7, dumpRows: 50, 30 phantom files
... [+2279 chars truncated]

### Assistant | 2026-05-14T16:38:06.112Z

I'll perform an independent 2nd-pass review of the test suite and SUT.

### Assistant | 2026-05-14T16:38:06.597Z

[tool_use: Read]

### User | 2026-05-14T16:38:12.828Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * dr-drill.mjs — CLEANUP-MS0 / U-CLEANUP-G14
4	 *
5	 * MONTHLY disaster-recovery drill: restore the latest G12 golf-state snapshot
6	 * to `H:/prism-dr-test/restore/`, verify the restored `coordination.db` is
7	 * intact, and check row-count parity against the manifest's recorded
8	 * `bug_attribution` row count. Every drill — pass or fail — appends one
9	 * JSONL li
... [+38248 chars truncated]

### Assistant | 2026-05-14T16:38:15.236Z

Now reading the test file end-to-end.

### Assistant | 2026-05-14T16:38:15.925Z

[tool_use: Read]

### User | 2026-05-14T16:38:18.081Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\drDrill.test.ts' was already read 33s ago in this session and is unchanged (mtime 1778776623918). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-14T16:38:21.085Z

The hook indicates I already have this file in context, but I don't see it in my current context window. Let me grep specific patterns to verify the assertions.

### Assistant | 2026-05-14T16:38:21.633Z

[tool_use: Bash]

### User | 2026-05-14T16:38:28.124Z

[tool_result] 1086 H:/prism/mcp-server/src/__tests__/drDrill.test.ts

### Assistant | 2026-05-14T16:38:31.266Z

[tool_use: Read]

### User | 2026-05-14T16:38:34.013Z

[tool_result] 1	/**
2	 * drDrill.test.ts — CLEANUP-MS0 / U-CLEANUP-G14 test suite
3	 *
4	 * Hermetic tests for scripts/dr-drill.mjs:
5	 *   - Pure helpers (parseSnapshotDirName, parseArgs, listSnapshots,
6	 *     findLatestSnapshot, isRestorePathSafe, extractPragmaResult, readManifest,
7	 *     restoreSnapshot, appendLedger).
8	 *   - validateRestoredDb with an injected synthetic better-sqlite3 Database
9	 *   
... [+7666 chars truncated]

### Assistant | 2026-05-14T16:38:37.303Z

[tool_use: Read]

### User | 2026-05-14T16:38:46.005Z

[tool_result] 200	    const d = dr.parseSnapshotDirName("2026-05-14T13-53-47-123Z");
201	    expect(d instanceof Date).toBe(true);
202	    expect(d.toISOString()).toBe("2026-05-14T13:53:47.123Z");
203	  });
204	  it("A2 — pads short millis", async () => {
205	    const dr = await loadDrDrill();
206	    const d = dr.parseSnapshotDirName("2026-01-01T00-00-00-5Z");
207	    expect(d.toISOString()).toBe("2026-01-01T
... [+13661 chars truncated]

### Assistant | 2026-05-14T16:38:49.738Z

[tool_use: Read]

### User | 2026-05-14T16:38:53.330Z

[tool_result] 500	    const r = dr.restoreSnapshot(join(SCRATCH, "no-such-snap"), join(SCRATCH, "restore"), {});
501	    expect(r.errors.length).toBe(1);
502	    expect(r.errors[0]).toContain("does not exist");
503	    expect(r.copied.length).toBe(0);
504	  });
505	  it("G5 — subdirectories inside a snapshot are skipped, not descended", async () => {
506	    const dr = await loadDrDrill();
507	    const backup 
... [+14190 chars truncated]

### Assistant | 2026-05-14T16:38:56.205Z

Understood — switching to targeted reads.

### Assistant | 2026-05-14T16:38:57.318Z

[tool_use: Read]

### User | 2026-05-14T16:39:01.526Z

[tool_result] 800	    const captured: any[] = [];
801	    const r = await dr.drDrill(
802	      { repo: SCRATCH, backup, restoreDir: join(SCRATCH, "restore") },
803	      { appendFn: (_: string, line: string) => captured.push(JSON.parse(line)) },
804	    );
805	    expect(r.failureCategory).toBe(dr.FAILURE_CATEGORIES.RESTORE);
806	    const dbErr = r.errors.filter((e: string) => e.includes("coordination.db"));

... [+13153 chars truncated]

### Assistant | 2026-05-14T16:39:07.203Z

Acknowledged. Now I have the full picture. Let me verify the J17 truncation math against the SUT logic and verify a few critical details with targeted greps.

### Assistant | 2026-05-14T16:39:07.958Z

[tool_use: Grep]

### User | 2026-05-14T16:39:13.453Z

[tool_result] 15: * Every assertion is on a real value (no `.toBeTruthy()` / `.toBeDefined()`
211:    expect(dr.parseSnapshotDirName("not-a-snapshot")).toBe(null);
212:    expect(dr.parseSnapshotDirName("")).toBe(null);
213:    expect(dr.parseSnapshotDirName("2026-05-14T13:53:47.123Z")).toBe(null);
217:    expect(dr.parseSnapshotDirName("9999-99-99T99-99-99-999Z")).toBe(null);
231:    expect(a.snapshot).toBe(nu
... [+233 chars truncated]

### Assistant | 2026-05-14T16:39:33.051Z

All `.toBe(null)` matches are real-value assertions on documented null returns — not stub patterns. No `.toBeDefined()` / `.toBeTruthy()` / `.toBeFalsy()` / `.not.toBeNull()` / `expect.anything()` / `.toMatch(/./)` survived. Good.

Now let me verify J17 carefully against the SUT's truncation math. From the SUT, `writeLedgerRow` (lines 771-775):

```js
errors: result.errors.slice(0, LEDGER_ERROR_CAP).concat(
  result.errors.length > LEDGER_ERROR_CAP
    ? [`...and ${result.errors.length - LEDGER_ERROR_CAP} more (truncated)`]
    : [],
),
```

For J17: 30 phantom files → 30 cross-check warnings appended to `result.errors` in the manifest-cross-check loop (lines 685-692 of SUT):

```js
if (Array.isArray(result.manifest.copied)) {
  for (const relPath of result.manifest.copied) {
    const bn = basename(String(relPath || ""));
    if (bn && !restoredNames.has(bn)) {
      result.errors.push(`manifest claimed copied[${relPath}] but file absent post-restore`);
    }
  }
}
```

Wait — this is important. Let me re-check: when `dumpRows: 0` is set in `makeSnapshotDir`, the default manifest includes `copied: ["state/shared/coordination.db", ...phantoms]` (line 120-124 of the test). That's `coordination.db` + 30 phantoms = 31 entries in `manifest.copied[]`. The cross-check loops over these. `coordination.db` IS in `restoredNames` (it was created in the snapshot), so it doesn't produce a warning. Only the 30 phantoms produce warnings → 30 errors. Truncation: `slice(0,20)` = 20 + `[".. and 10 more (truncated)"]` = 21. The test asserts `errors.length === 21` and `"10 more"` — both correct.

But wait — there's another wrinkle. The `result.validation.errors` from `validateRestoredDb` could also accrue. Let me check: rowCount: 0, expectedRows: 0 (dumpRows: 0), so parity is "ok". integrity ok, quickCheck ok. validation.ok = true. So we never enter the `if (!validation.ok)` block (lines 705-727). So no extra errors appended after the cross-check. J17 math is correct.

For J16: same pa
... [+1421 chars truncated]

### Assistant | 2026-05-14T16:39:33.841Z

[tool_use: Grep]

### User | 2026-05-14T16:39:36.130Z

[tool_result] mcp-server\src\__tests__\drDrill.test.ts:101

Found 101 total occurrences across 1 file.

### Assistant | 2026-05-14T16:39:40.223Z

[tool_use: Grep]

### User | 2026-05-14T16:39:46.633Z

[tool_result] No files found

### Assistant | 2026-05-14T16:39:50.094Z

[tool_use: Grep]

### User | 2026-05-14T16:39:50.975Z

[tool_result] 494:    dr.restoreSnapshot(snap, restore, { dryRun: false });
675:    dr.appendLedger(lp, { x: 1, y: "two" });
683:    dr.appendLedger(lp, { i: 1 });
684:    dr.appendLedger(lp, { i: 2 });
685:    dr.appendLedger(lp, { i: 3 });
695:    dr.appendLedger("ignored", { x: 1 }, {

### Assistant | 2026-05-14T16:39:54.650Z

Good — these are all sync helpers (`restoreSnapshot`, `appendLedger`) which don't need `await`. No missing-await on async calls (drDrill / validateRestoredDb are always awaited per the count above).

### Assistant | 2026-05-14T16:39:56.072Z

[tool_use: Grep]

### User | 2026-05-14T16:39:57.562Z

[tool_result] No matches found

### Assistant | 2026-05-14T16:40:00.463Z

No live H: drive paths in tests. Hermeticity holds.

### Assistant | 2026-05-14T16:40:01.568Z

[tool_use: Grep]

### User | 2026-05-14T16:40:05.398Z

[tool_result] 8: *   - validateRestoredDb with an injected synthetic better-sqlite3 Database

### Assistant | 2026-05-14T16:41:05.652Z

Task tracking is fine for the SUT author — I'm just reviewing, no task updates needed. No real `better-sqlite3` requires or `node_modules` references in tests. Hermetic via FakeDatabase.

Now the final cross-check — does the J17 walk hold up *exactly*? Let me reread one more critical detail: in the orchestrator (SUT line 656-661), if `restore.errors.length > 0` we early-return on RESTORE. The phantom-files cross-check runs at lines 685-692, *after* the required-files check, which passes (coordination.db + manifest.json are both present). So the only errors at the time of ledger write are the 30 phantom-cross-check warnings. PASS branch (lines 729-732) hits with `result.errors.length === 30`. `writeLedgerRow` slices to 20 + adds 1 marker = 21. ✓ J17 math is **correct**.

One final concern — the `pragmaCalls` array (line 152) is created with `?? []` but shared across the same hooks object. If two tests reused the same hooks object across `loadDrDrill()` calls, calls would accumulate. But each test creates a fresh `hooks` literal, so this is fine.

Now the verdict.

---

## Verdict: PASS (with P2/P3 advisory findings)

The suite is genuinely strong: 60 cases, every assertion is on a real value (verified by grep — only legitimate `.toBe(null)` matches for documented null returns survived), Database is fully synthetic with no native-module dependency, all paths route through a per-test `SCRATCH` dir with a `Date.now() + pid + random` suffix, hermeticity holds. The orchestrator coverage hits all 8 `FAILURE_CATEGORIES` enum values plus PASS, plus dry-run-without-write, plus dry-run-with-appendFn, plus cross-check observability, plus truncation cap, plus 2 real CLI subprocess invocations. J17 math walks through the SUT exactly: 30 phantom files → 30 cross-check warnings (coordination.db is real and skipped in the loop) → `slice(0,20).concat([..."10 more (truncated)"])` = 21 entries with `"10 more"` substring. J16 also holds: `result.errors[]` is a hybrid bag (gating errors 
... [+8124 chars truncated]
