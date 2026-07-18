---
type: "chat-session"
source: "claude-code-cli"
session_id: "3b735015-a3e0-4ba4-8b97-35384113b9f9"
title: "Re-review (round 2) of a PRISM Claude Code hook after fixes. Read both files END"
date: "2026-05-18"
first_ts: "2026-05-18T02:19:58.926Z"
last_ts: "2026-05-18T02:21:09.012Z"
cwd: "H:\\prism"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a9bd60e4a8e4aee69.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Re-review (round 2) of a PRISM Claude Code hook after fixes. Read both files END

> **claude-code-cli** | 2026-05-18 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3b735015-a3e0-4ba4-8b97-35384113b9f9/subagents/agent-a9bd60e4a8e4aee69.jsonl`

## Transcript

### User | 2026-05-18T02:19:58.926Z

Re-review (round 2) of a PRISM Claude Code hook after fixes. Read both files END TO END:
FILE 1: H:\PRISM\.claude\hooks\build-cache-guard.mjs
FILE 2: H:\PRISM\.claude\hooks\build-cache-guard.test.mjs

Round 1 raised these issues — VERIFY each is correctly and completely fixed, and flag any NEW defect the rewrite introduced:

P0-a: `summarizeBuildOutput` could mark a real build FAILURE as `ok:true` (false PASS) — it ignored exit code, missed `npm ERR!` / esbuild `[ERROR]`.
  → Now: signature is `{out, exitCode, isError}`; `ok` is true|false|null; `null` when ambiguous; only `ok===true` is ever denied. Verify a real failure can no longer be served as a PASS.

P0-b: deny-loop escape was time-based with DENY_LOOP_MS(3m) < TTL(5m) → a re-issue at minute 3-5 got denied AGAIN despite the deny message promising "next attempt passes through".
  → Now: count-based — a deny sets `denies[key]`; the next check sees the mark, passes, and clears it (`decideBuildCheck` returns reason `deny-loop-escape`). Verify the promise is now always kept.

P1-a: a cached FAIL was denied like a PASS, discouraging a legitimate verification re-run.
  → Now: `decideBuildCheck` returns `not-confirmed-pass` (action pass) for any `entry.ok !== true`. Verify.

P1-b: `editTs > entry.ts` missed a same-millisecond edit.
  → Now: `>=`. Verify it still does NOT invalidate when editTs is 0/older than the build.

P1-c: compound `cmd1 && npm run build` was denied whole, silently skipping `cmd1`.
  → Now: `hasUnsafeShell` rejects any command with `&&|;|\||&|$(|backtick`; eligibility = `isBuildCmd && !hasUnsafeShell`. Verify a compound is never denied.

P1-d: bare-`tsc` rule `/(^|\s)tsc(\s|$)/` matched `grep tsc file`.
  → Now: `/^tsc(\s|$)/` anchored to command head (post-normalize). Verify no false match, and that `cd x && tsc -p .` still classifies (normalizeCmd strips the cd prefix first).

P1-e: `ageMin` could render "0m ago".
  → Now: `fmtAge` shows seconds under 90s. Verify.

P1-f: missing fail-on-revert 
... [+612 chars truncated]

### Assistant | 2026-05-18T02:20:10.964Z

I'll review both files end to end.

### Assistant | 2026-05-18T02:20:11.809Z

[tool_use: Read]

### Assistant | 2026-05-18T02:20:11.976Z

[tool_use: Read]

### User | 2026-05-18T02:20:12.745Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * build-cache-guard.mjs — build/test result cache with edit-invalidation.
5	 *
6	 * HIGH-ROI-HOOKS-MS0 / U-HRH01. Closes a verified gap: bash-result-cache.mjs
7	 * explicitly REJECTS any command containing `npm` or `node`, so build/test
8	 * commands (`npm run build`, `npx vitest run`, `tsc`) are never cached —
9	 * yet they are PRISM backend dev's sing
... [+13503 chars truncated]

### User | 2026-05-18T02:20:12.945Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * build-cache-guard.test.mjs — HIGH-ROI-HOOKS-MS0 / U-HRH01.
5	 *
6	 * Pure-function coverage + subprocess integration oracles. The subprocess
7	 * oracles are load-bearing: a pure-function suite never proves the wired
8	 * `main()` path — the deny / capture / invalidate / never-deny-a-FAIL
9	 * round-trips must be exercised end-to-end. Several oracles 
... [+14688 chars truncated]

### Assistant | 2026-05-18T02:20:18.286Z

Let me see the rest of the test file (it appeared to be truncated at line 394).

### Assistant | 2026-05-18T02:20:19.030Z

[tool_use: Read]

### User | 2026-05-18T02:20:19.928Z

[tool_result] 393	});
394	

### Assistant | 2026-05-18T02:20:23.214Z

The test file ends at line 394. Now let me count the test cases. I see `test(` calls — let me verify the count of 33.

### Assistant | 2026-05-18T02:20:23.906Z

[tool_use: Grep]

### User | 2026-05-18T02:20:24.424Z

[tool_result] .claude\hooks\build-cache-guard.test.mjs:33

Found 33 total occurrences across 1 file.

### Assistant | 2026-05-18T02:21:09.012Z

33 test cases confirmed. Now let me verify each round-1 issue against the actual code.

## Verification of Round 1 Fixes

**P0-a — false PASS from a real failure.** `summarizeBuildOutput` (mjs:124-148) now destructures `{out, exitCode, isError}` and computes `failSignal` (mjs:129-133) from `exitCode !== 0 || isError === true || errorCount > 0 || /...npm ERR!|[ERROR]|ELIFECYCLE.../`. Critically the precedence at mjs:137-140: `if (failSignal) ok = false; else if (successSignal) ok = true; else ok = null`. A non-zero exit with `"Build complete"` stdout → `failSignal` true → `ok = false`, even though `successSignal` also matched. Test mjs.test:201-204 proves exactly this. `decideBuildCheck` mjs:116 denies only `entry.ok === true`. **P0-a fixed correctly.**

**P0-b — deny-loop escape now count-based.** Deny sets `data.denies[key] = Date.now()` (mjs:309). `decideBuildCheck` mjs:111 checks `denyMark` before TTL/edit/ok logic and returns `deny-loop-escape`; mjs:303-307 then `delete data.denies[key]` + saves + passes. The mark is consumed regardless of elapsed time — test mjs.test:163-172 deliberately passes `denyMark` older than the old 3-min window and still expects escape. Subprocess oracle mjs.test:365-393 proves the full round-trip (deny → next check passes). **P0-b fixed correctly.** The promise is now always kept.

**P1-a — cached FAIL no longer denied.** mjs:116 `if (entry.ok !== true) return {action: "pass", reason: "not-confirmed-pass"}`. Covers `ok:false` and `ok:null`. Tests mjs.test:173-179. **Fixed.**

**P1-b — same-ms edit.** mjs:113 `editTs >= entry.ts`. Test mjs.test:147-162 proves `editTs === entry.ts` invalidates. The "older edit does NOT invalidate" requirement: at mjs.test:180-189 `editTs: NOW - 5000` with `entry.ts: NOW - 1000` → `editTs < entry.ts` → falls through to deny. **Fixed and the older-edit non-invalidation is proven.**

**P1-c — compound never denied.** `hasUnsafeShell` mjs:77-78 rejects `&&|||;|||lone-&|$(|backtick`. Eligibility mjs:288 `!cm
... [+5098 chars truncated]
