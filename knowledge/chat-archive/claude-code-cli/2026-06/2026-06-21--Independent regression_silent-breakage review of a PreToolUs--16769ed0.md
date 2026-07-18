---
type: "chat-session"
source: "claude-code-cli"
session_id: "16769ed0-dcdd-41c8-9cc5-58b633f8a1d5"
title: "Independent regression/silent-breakage review of a PreToolUse:Read hook refactor"
date: "2026-06-21"
first_ts: "2026-06-21T00:21:15.750Z"
last_ts: "2026-06-21T00:27:28.320Z"
cwd: "H:\\prism"
messages: 62
user_msgs: 23
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-ae4c94382e30eea98.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:07"
---

# Independent regression/silent-breakage review of a PreToolUse:Read hook refactor

> **claude-code-cli** | 2026-06-21 | 62 msgs (23 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/16769ed0-dcdd-41c8-9cc5-58b633f8a1d5/subagents/agent-ae4c94382e30eea98.jsonl`

## Transcript

### User | 2026-06-21T00:21:15.750Z

Independent regression/silent-breakage review of a PreToolUse:Read hook refactor (slot:alpha, cad-fusion-live-ms0). Do NOT assume the other reviewer caught everything. Weighted toward silent breakage, the spawn contract, and I/O safety. Read both files END TO END. Grade PASS/FAIL with P0/P1/P2 + file:line. Read-only.

## Files
- `.claude/hooks/read-auto-limit.mjs` (refactored: pure helpers + import-guarded main() + fail-soft ledger append on the nudge path)
- `.claude/hooks/read-auto-limit.test.mjs` (18 tests)

## Hunt specifically for
1. **Spawn contract**: `read-bundle.mjs` spawns this hook as a child process (`{ path, timeout: 2000 }`) and pipes the Read payload on stdin, expecting a single JSON line on stdout (`{continue:true,...}`). Confirm main() ALWAYS writes exactly one valid JSON object to stdout and exits 0 on EVERY path (non-Read, no path, limit-set, stat-fail, small, large). A path that writes nothing or throws to stderr would break the bundle. Note the `allow()` helper calls process.exit(0) — confirm no code-path falls through and double-writes stdout (e.g. after `if (tool_name !== "Read") allow();` does execution correctly stop?).
2. **Double-write / fallthrough**: trace each early-exit. `allow()` exits the process, so subsequent statements don't run — but verify there's no path that calls console.log twice (the bundle parses `stdout.trim().split("\n").pop()`, so a double-write would still parse the LAST line — but flag any double-write as sloppy).
3. **The new appendFileSync**: it runs in a spawned short-lived process (not async) — confirm it cannot block beyond the 2000ms bundle timeout (mkdirSync+appendFileSync of one small line is sub-ms) and is wrapped so a throw can NEVER escape (fail-soft).
4. **est_tokens honesty**: confirm `aggregateSavings` (psn-savings-aggregate.mjs) does NOT add est_tokens to savedTokens for kind `nudge-emitted` (it only does for kind `hit`). If it did, this would silently inflate the fleet savings headline. Trace it.
5. **
... [+413 chars truncated]

### Assistant | 2026-06-21T00:21:18.816Z

I'll review this PreToolUse:Read hook refactor with focus on silent breakage, the spawn contract, and I/O safety. Let me read both files end to end and trace the consumers.

### Assistant | 2026-06-21T00:21:19.293Z

[tool_use: Read]

### Assistant | 2026-06-21T00:21:19.343Z

[tool_use: Read]

### User | 2026-06-21T00:21:20.315Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\read-auto-limit.mjs' was already read 14s ago in this session and is unchanged (mtime 1782001064829). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-21T00:21:21.037Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\read-auto-limit.test.mjs' was already read 14s ago in this session and is unchanged (mtime 1782001137292). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T00:21:23.477Z

The read-once guard says I already read these — but I don't actually have the content in my context (this is the start of my session). The guard is mistaken about my session. Let me disable the cache and read them.

### Assistant | 2026-06-21T00:21:24.434Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:21:25.228Z

[tool_use: Bash]

### User | 2026-06-21T00:21:29.888Z

[tool_result] #!/usr/bin/env node
// tier: T1
/**
 * read-auto-limit.mjs - PreToolUse Read
 * Auto-suggests a `limit` parameter for large files to save tokens (70-90%).
 *
 * U-READ-AUTO-LIMIT-LEDGER (slot:alpha 2026-06-20): re-light the dark token-
 * efficiency ledger. The advisory message is purely a NUDGE; the WRITE path
 * that recorded each nudge fire had been removed, so
 * state/shared/dashboards/read-a
... [+5392 chars truncated]

### User | 2026-06-21T00:21:33.684Z

[tool_result] // read-auto-limit.test.mjs
// -------------------------
// Tests for U-READ-AUTO-LIMIT-LEDGER (slot:alpha 2026-06-20): the read-auto-limit
// PreToolUse hook now re-lights its dark telemetry ledger (one {kind:"nudge-emitted"}
// line per nudge) and exposes pure helpers for hermetic testing. Covers the gating
// thresholds, the byte-identical advisory message, the ledger entry shape, the
// fail-s
... [+8630 chars truncated]

### Assistant | 2026-06-21T00:21:39.735Z

I have both files. Now let me trace the critical hunt items: the spawn contract double-write, the aggregator's `est_tokens` honesty, and the consumer that reads the ledger. Let me investigate the key risk I already see — the `allow()` fallthrough pattern.

Looking at `main()`: after `if (tool_name !== "Read") allow();` — `allow()` calls `process.exit(0)`, which terminates the process synchronously. So execution does stop. Same for the subsequent `if (!filePath) allow();` and `if (limit !== undefined) allow();`. No double-write there. But let me verify the aggregator and consumers, which are the silent-breakage surfaces.

### Assistant | 2026-06-21T00:21:40.685Z

[tool_use: Read]

### User | 2026-06-21T00:21:41.594Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\psn-savings-aggregate.mjs' was already read 15s ago in this session and is unchanged (mtime 1779755738154). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-21T00:21:41.687Z

[tool_use: Bash]

### User | 2026-06-21T00:24:02.495Z

[tool_result] .claude/hooks/bundles/read-bundle.mjs
.claude/hooks/pre-tool-savings-multi.mjs
.claude/hooks/read-auto-limit.mjs
.claude/hooks/read-auto-limit.test.mjs
.claude/hooks/session-start-savings-headline.mjs
.claude/hooks/stop-psn-savings-aggregate.mjs
.claude/hooks/__tests__/session-start-savings-headline.test.mjs
.claude/projects/H--prism/8b785b10-fc31-4613-8c28-594f7533b4f2/workflows/scripts/ollama-au
... [+1077 chars truncated]

### Assistant | 2026-06-21T00:24:06.196Z

The read-once guard keeps intercepting `psn-savings-aggregate.mjs`. Let me read it with the cache disabled, plus the spawn-side consumer `read-bundle.mjs` and the ledger reader `stop-psn-savings-aggregate.mjs`.

### Assistant | 2026-06-21T00:24:07.140Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:24:07.700Z

[tool_use: Bash]

### User | 2026-06-21T00:24:12.449Z

[tool_result] // scripts/lib/psn-savings-aggregate.mjs
// -------------------------------------
// PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
//
// Unifies the 6 token-savings telemetry sidecars shipped this session into
// one PSN-friendly daily summary. Pure-function aggregator; the Stop hook
// calling this owns file I/O.
//
// Tracked ledgers:
//   1. rtk-savings-ledger.jsonl                  → 
... [+3937 chars truncated]

### User | 2026-06-21T00:24:19.282Z

[tool_result] #!/usr/bin/env node
// tier: T1
// read-bundle.mjs — single PreToolUse hook for Read. Replaces the 4-hook
// Read matcher in settings.json with one bundled invocation.

import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";

const HOOK_BASE = "H:/prism/.claude/hooks";
const HELPER_BASE = "H:/prism/.claude/helpers";

const READ_HOOKS = [
  { path: `${HELPER_BASE}/read-optimizer.mjs`,  
... [+2437 chars truncated]

### Assistant | 2026-06-21T00:24:23.716Z

Now I understand the spawn contract. Crucially, `read-bundle.mjs` uses `runBundle(READ_HOOKS, stdinPayload)` via `hook-runner.mjs`. I need to verify how `runBundle` spawns each child and parses its stdout — the original prompt says it does `stdout.trim().split("\n").pop()`. Let me confirm the actual parsing contract in `hook-runner.mjs`, and check the graph note flagging a "PSN-savings-aggregate schema-mismatch confirmed, fix deferred".

### Assistant | 2026-06-21T00:24:25.104Z

[tool_use: Bash]

### Assistant | 2026-06-21T00:24:25.668Z

[tool_use: Bash]

### User | 2026-06-21T00:24:28.078Z

[tool_result] Exit code 1
cat: 'H:/prism/.claude/hooks/lib/hook-runner.mjs': No such file or directory

### User | 2026-06-21T00:24:32.231Z

[tool_result] #!/usr/bin/env node
// tier: T3
/**
 * stop-psn-savings-aggregate.mjs — Stop hook
 *
 * PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
 *
 * Reads the 6 token-savings telemetry sidecars and writes a unified daily
 * summary to state/shared/dashboards/psn-savings-aggregate.json. Master-index
 * nightly regen picks it up so future prompts see the cumulative figure.
 *
 * Throttled 1/hour glo
... [+3019 chars truncated]

### Assistant | 2026-06-21T00:24:35.266Z

`hook-runner.mjs` isn't at that path. Let me locate it and read it to confirm how `runBundle` parses each spawned child's stdout (the critical spawn contract), and confirm the `est_tokens` honesty path one more time end to end.

### Assistant | 2026-06-21T00:24:35.673Z

[tool_use: Glob]

### Assistant | 2026-06-21T00:24:36.761Z

[tool_use: Bash]

### User | 2026-06-21T00:24:43.641Z

[tool_result] .claude\hooks\bundles\lib\hook-runner.mjs

### User | 2026-06-21T00:24:50.161Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * pre-tool-savings-multi.mjs — multi-PreToolUse advisory hook
 *
 * PSN-TOOL-SAVINGS-MULTI/U-PTSM01 (2026-05-24, slot:alpha)
 *
 * Single hook, dispatches on tool_name. Covers four tool classes the prior
 * coverage gap missed: Grep / Glob / Write / Bash-git. Each emits a 1-line
 * advisory when an empirically-wasteful pattern is detected.
 *
 * Pure helpers ex
... [+2633 chars truncated]

### Assistant | 2026-06-21T00:24:52.454Z

Found `hook-runner.mjs` at `.claude/hooks/bundles/lib/hook-runner.mjs`. This is the spawn contract — the single most important file to verify. Let me read it.

### Assistant | 2026-06-21T00:24:53.225Z

[tool_use: Bash]

### User | 2026-06-21T00:24:58.022Z

[tool_result] // tier: T4
// hook-runner.mjs — parallel hook execution library for U-D3 bundles.
// Spawns each hook as a child process, pipes stdin, collects stdout/stderr,
// enforces per-hook timeout, aggregates results.
//
// Hook protocol (Claude Code):
//   stdin  = JSON {tool_name, tool_input, ...}
//   stdout = JSON {decision?, reason?, additionalContext?, hookSpecificOutput?}
//          | empty / non-
... [+11032 chars truncated]

### Assistant | 2026-06-21T00:25:00.625Z

I now have the complete spawn contract. Let me verify the key claim about `est_tokens` honesty by actually running the test suite, and confirm the aggregator import path resolves. I'll run the tests directly.

### Assistant | 2026-06-21T00:25:01.483Z

[tool_use: Bash]

### User | 2026-06-21T00:25:05.257Z

[tool_result]   ---
  duration_ms: 0.2518
  type: 'suite'
  ...
# Subtest: SUBPROCESS round-trip -- the re-lit-from-dark proof
    # Subtest: spawning the hook on a >50KB Read appends a nudge-emitted line to the ledger
    ok 1 - spawning the hook on a >50KB Read appends a nudge-emitted line to the ledger
      ---
      duration_ms: 38.9356
      ...
    # Subtest: a Read with limit already set does NOT nudge 
... [+361 chars truncated]

### Assistant | 2026-06-21T00:25:11.924Z

All 18 tests pass. Now let me trace the most important silent-breakage concern: the `main()` non-Read / no-path / limit paths use bare `allow();` **without `return`**. Let me verify there's no fallthrough double-write or a stat on `undefined`. This is the spawn-contract risk item #1 and #2.

Looking at `main()` closely:
```js
if (tool_name !== "Read") allow();        // no return
const filePath = tool_input?.file_path;
const limit = tool_input?.limit;
if (!filePath) allow();                    // no return
if (limit !== undefined) allow();          // no return
```

`allow()` calls `process.exit(0)` which terminates synchronously — so execution **does** stop and there's no double-write. The `JSON.parse` catch and `statSync` catch both have explicit `return` after `allow()` (belt-and-suspenders). This is correct but stylistically inconsistent. Let me confirm `process.exit` behavior isn't deferred and check whether any test exercises the non-Read / no-path subprocess paths (it doesn't — only limit-set and large-file). Let me verify these paths directly via subprocess to be airtight.

### Assistant | 2026-06-21T00:25:16.496Z

[tool_use: Bash]

### User | 2026-06-21T00:25:20.280Z

[tool_result] === non-Read tool ===
{"continue":true}
exit=0
=== Read, no file_path ===
{"continue":true}
exit=0
=== Read, nonexistent file (stat fail) ===
{"continue":true}
exit=0
=== malformed stdin ===
{"continue":true}
exit=0
=== small file ===
{"continue":true}
exit=0

### Assistant | 2026-06-21T00:25:23.339Z

Every early-exit path writes exactly one valid JSON object and exits 0. Note the small-file test produced `{"continue":true}` — but wait, the test file is `read-auto-limit.test.mjs` which is ~7KB, under 50KB, so it correctly does NOT nudge. Let me confirm a large real file nudges exactly once with no double-write, and verify the line count is exactly one JSON line on stdout (critical for the bundle's `split("\n").pop()` parse contract).

### Assistant | 2026-06-21T00:25:27.266Z

[tool_use: Bash]

### User | 2026-06-21T00:25:30.981Z

[tool_result] === large file: count stdout lines (must be exactly 1 JSON line) ===
1
--- raw ---
{"continue":true}
=== validate it parses as single JSON ===
parsed OK, keys: continue
=== file size of hook-runner.mjs ===
11467

### Assistant | 2026-06-21T00:25:34.878Z

`hook-runner.mjs` is only 11KB — under 50KB bytes, but `estimateLines(11467) = ceil(11467/50) = 230` lines, under 1000 lines, so no nudge — correct. I need a genuinely large file (>50KB or >1000 estimated lines = >50KB). Let me find one and verify the nudge path emits exactly one line, and that `stderr` is clean (a write to stderr would not break the bundle parse but would be sloppy / could pollute logs).

### Assistant | 2026-06-21T00:25:40.484Z

[tool_use: Bash]

### User | 2026-06-21T00:25:46.749Z

[tool_result] size: 60000
=== large-file NUDGE path: stdout lines + stderr capture ===
exit=0
stdout line count: 1
--- last line parses? ---
OK; has additionalContext: false
--- stderr (should be empty) ---
[stderr bytes: 0]
--- ledger lines written (should be 1) ---
/usr/bin/bash: line 33: /tmp/tmp.gi1DpPm3sn: No such file or directory
cat: /tmp/tmp.gi1DpPm3sn: No such file or directory

### Assistant | 2026-06-21T00:25:52.448Z

The output says "has additionalContext: false" but stdout was 1 line and the ledger didn't get written. That's suspicious — the multi-line additionalContext (the message has embedded `\n`) means `echo "$out" | wc -l` counts the embedded newlines. Let me re-check: the message has `\n` inside the JSON string but those are escaped as `\n` in JSON, so they're literal `\n` characters within the single JSON line — wait no, `buildMessage` does `.join("\n")` producing real newlines, then `JSON.stringify` escapes them to `\n`. So stdout IS one physical line. But "additionalContext: false" and the ledger missing suggests the nudge didn't fire. 

The issue: my mktemp produced a path, but the `additionalContext` came back false. Let me look more carefully — the `tail -1` parse may have a quoting issue with the embedded content. Let me redo this cleanly with a verification that the nudge actually fired.

### Assistant | 2026-06-21T00:25:58.477Z

[tool_use: Bash]

### User | 2026-06-21T00:26:02.652Z

[tool_result] status: 0
stderr bytes: 0
stdout physical lines: 1
has additionalContext: true
msg first line: "📄 Large file detected: 58.6KB (~1200 lines)"
ledger exists: true
ledger lines: 1 -> {"ts":1782001561956,"kind":"nudge-emitted","file":"H:/prism/__big_test_tmp__.txt","file_kb":58.6,"est_tokens":15000}

### Assistant | 2026-06-21T00:26:11.349Z

Now confirmed precisely:
- Nudge path: exit 0, **exactly one physical stdout line**, clean stderr, `additionalContext` present.
- Message first line is byte-identical: `📄 Large file detected: 58.6KB (~1200 lines)` (the `\u{1F4C4}` glyph + "Large file detected" string unchanged — consumer-grep-safe per item #6).
- Ledger: exactly one `{"kind":"nudge-emitted",...}` line written. The earlier shell run failed only because the H:↔/h path mapping and mktemp -u path differed — the node harness with the actual H: path proves the write.

Now the critical honesty trace (item #4). In `summarizeJsonl`, `kind === "nudge-emitted"` → `out.hits += 1` and does **NOT** touch `out.savedTokens`. Only `kind === "hit"` adds `est_tokens` to `savedTokens`. The test `AGGREGATOR round-trip` proves `savedTokens === 0` even with 1M est_tokens. Confirmed — no headline inflation.

Let me verify two remaining integration concerns: (1) the `stop-psn-savings-aggregate.mjs` SOURCES map key is `"read-auto-limit"` pointing at the exact DEFAULT_LEDGER path the hook writes to (path-coupling), and (2) whether `mkdirSync` with `recursive:true` on a path whose dirname already exists throws (it doesn't — recursive is idempotent). Also confirm there are no OTHER readers that expect the old ledger schema.

### Assistant | 2026-06-21T00:26:16.001Z

[tool_use: Bash]

### User | 2026-06-21T00:26:22.015Z

[tool_result] === hook DEFAULT_LEDGER vs stop-hook SOURCES path ===
hook writes to: H:/prism/state/shared/dashboards/read-auto-limit-ledger.jsonl
27:  "read-auto-limit": "H:/prism/state/shared/dashboards/read-auto-limit-ledger.jsonl",
=== any OTHER reader of the ledger or 'already-bounded' / 'nudge-emitted' kinds ===
.claude/hooks/read-auto-limit.mjs:12: * month-stale read-detector data. We now append ONE {kind
... [+1291 chars truncated]

### Assistant | 2026-06-21T00:26:29.318Z

This is an important finding. The live ledger is **already being written today** (Jun 20 19:22, timestamps `1782001186393` etc. — minutes ago) with `kind:"nudge-emitted"` entries. So the refactor IS live and the ledger is no longer dark — confirmed working end to end in production, not just in tests.

Path coupling is correct: hook `DEFAULT_LEDGER` === stop-hook `SOURCES["read-auto-limit"]` byte-for-byte. The aggregator handles both `nudge-emitted` (hit, 0 savedTokens) and the documented legacy `already-bounded` (miss) kind. No other consumer reads this ledger with a conflicting schema expectation.

One subtle observation worth noting for honesty: I see entries with **both** forward-slash paths (`H:/prism/CLAUDE.md`) and backslash paths (`H:\\prism\\mcp-server\\...`) — the hook records `filePath` verbatim from `tool_input.file_path` without normalization. That's cosmetic (the `file` field is informational), not a break. Let me do a final check on the import-guard robustness (the `__mainBasename` logic) which determines whether `main()` runs when spawned — a subtle silent-breakage vector if it ever fails to match.

### Assistant | 2026-06-21T00:26:35.302Z

[tool_use: Bash]

### User | 2026-06-21T00:26:40.200Z

[tool_result] === import-guard: does main() fire when spawned by absolute path? (already proven by subprocess tests, but verify the basename match logic) ===
[eval]:4
  const b=(argv1||"").replace(/\/g,"/").split("/").pop()||"";
                              ^^^^^^^

SyntaxError: missing ) after argument list
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:
... [+447 chars truncated]

### Assistant | 2026-06-21T00:26:43.698Z

The syntax error was only my shell-escaping of the backslash in the inline `-e` script, not a real issue. The important result stands: **import does NOT run main()** (it returned cleanly with all 8 exports and exited 0, no stdin block, no stdout output). The subprocess tests already proved main() DOES fire on spawn. Let me confirm the guard logic correctly with a proper file to avoid shell escaping.

### Assistant | 2026-06-21T00:26:47.768Z

[tool_use: Bash]

### User | 2026-06-21T00:26:51.877Z

[tool_result] file:///C:/Users/wompu/AppData/Local/Temp/guardcheck.mjs:2
  const b=(argv1||"").replace(/\/g,"/").split("/").pop()||"";
                              ^^^^^^^

SyntaxError: missing ) after argument list
    at compileSourceTextModule (node:internal/modules/esm/utils:338:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:102:18)
    at #translate (node:internal/mod
... [+199 chars truncated]

### Assistant | 2026-06-21T00:26:58.188Z

The heredoc collapsed `\\` to `\`. This is a shell artifact, not a code defect. I already have definitive proof from the actual subprocess tests (test #7/#8 spawn `HOOK_PATH` = `fileURLToPath(...)` absolute path and main() fires + exits 0) and from my own subprocess runs above (all 5 early-exit paths plus the nudge path returned exit 0 with correct JSON). The import test confirmed main() does NOT fire on import. The guard works in production — the live ledger being written minutes ago is the ultimate proof.

I have everything needed. Let me do one final consumer-coupling check: confirm `session-start-savings-headline.mjs` (which the original prompt's concern #4 touches — fleet savings headline) reads the aggregate output, not the raw ledger, so the `nudge-emitted → 0 savedTokens` mapping is what flows into the headline.

### Assistant | 2026-06-21T00:26:59.571Z

[tool_use: Bash]

### User | 2026-06-21T00:27:03.605Z

[tool_result] === headline reads aggregate output (savedTokens), not raw ledger ===
8: * Producer→consumer closure: stop-psn-savings-aggregate writes a unified
24:const AGGREGATE = "H:/prism/state/shared/dashboards/psn-savings-aggregate.json";
35:  "read-auto-limit": "read",
60:    const saved = Number.isFinite(stats.savedTokens) ? stats.savedTokens : 0;
112:  const savedK = ((totals.savedTokens || 0) / 1000).t
... [+162 chars truncated]

### Assistant | 2026-06-21T00:27:28.320Z

Confirmed. The savings headline reads `totals.savedTokens` from the aggregate JSON (`psn-savings-aggregate.json`). Since `nudge-emitted` contributes 0 to `savedTokens`, the fleet headline cannot be inflated by these nudge entries. The `est_tokens` field never reaches `savedTokens`. R12 honesty fully intact end to end: hook → ledger → aggregator → headline.

I have completed a full end-to-end trace of every concern. Here is my verdict.

---

VERDICT: PASS

summary: The refactor is clean across every silent-breakage axis I hunted. `main()` writes exactly one valid JSON object and exits 0 on all six paths (non-Read, no-path, limit-set, stat-fail, small, large — verified live via subprocess), the new `appendFileSync` is fully fail-soft and knob-gated, and the `est_tokens → savedTokens` honesty boundary holds end-to-end (nudge-emitted maps to a HIT with 0 realized savings, so the fleet headline cannot inflate). The ledger is already live in production (entries written minutes ago), proving the dark-ledger re-light works, not just the tests.

findings: none

Consumers / edge-paths traced (audit trail for the PASS):

1. **Spawn contract (`runBundle` in `.claude/hooks/bundles/lib/hook-runner.mjs`)** — each child's stdout is parsed via `JSON.parse(stdout.trim())` (not the `split("\n").pop()` the prompt assumed, but `buildResult` at line ~67); the hook emits exactly one physical JSON line in every case, so the parse succeeds regardless. Non-JSON/empty → child treated as no-op success. The bundle never breaks on this hook.
2. **Double-write / fallthrough (`read-auto-limit.mjs:108-140`)** — the three bare `allow();` calls (non-Read, no `file_path`, `limit !== undefined`) have no `return`, but `allow()` calls `process.exit(0)` which terminates synchronously, so no statement runs after them and `statSync(resolve(undefined))` is never reached. Verified live: non-Read, no-path, malformed-stdin, stat-fail, small, and large all emit one line + exit 0. The two paths that DO have an ex
... [+2543 chars truncated]
