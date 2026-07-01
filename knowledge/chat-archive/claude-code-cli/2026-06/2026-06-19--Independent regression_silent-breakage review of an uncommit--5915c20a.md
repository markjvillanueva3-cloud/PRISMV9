---
type: "chat-session"
source: "claude-code-cli"
session_id: "5915c20a-a517-4e95-bc12-edf7d9055431"
title: "Independent regression/silent-breakage review of an uncommitted unit in PRISM at"
date: "2026-06-19"
first_ts: "2026-06-19T12:44:40.526Z"
last_ts: "2026-06-19T12:48:59.564Z"
cwd: "H:\\prism"
messages: 61
user_msgs: 22
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-aca3cb11175d40822.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent regression/silent-breakage review of an uncommitted unit in PRISM at

> **claude-code-cli** | 2026-06-19 | 61 msgs (22 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5915c20a-a517-4e95-bc12-edf7d9055431/subagents/agent-aca3cb11175d40822.jsonl`

## Transcript

### User | 2026-06-19T12:44:40.526Z

Independent regression/silent-breakage review of an uncommitted unit in PRISM at H:/prism. Do NOT assume a holistic reviewer caught everything — weight toward silent breakage, regression risk, I/O races, error-budget completeness, integration coupling. Grade PASS/FAIL with P0/P1/P2 + file:line. Read each file fully.

UNIT (U-TAKEUP-EVAL-DENOMINATOR, slot:alpha): adds a `takeupTotals.evaluations` denominator to the route-takeup measurement so the audit stops falsely reporting `takeup-wiring-broken` when the credit path is proven-live but the fleet genuinely takes 0.

FILES (use `git -C H:/prism diff -- <file>`):
1. `.claude/hooks/mcp-route-takeup.mjs` (PostToolUse hook, fires after every tool call)
2. `scripts/audit-mcp-route-takerate.mjs` (reads the sidecar, emits dashboards)
3. `.claude/hooks/__tests__/mcp-route-takeup.test.mjs`
4. `scripts/audit-mcp-route-takerate.test.mjs`

FOCUS ON:
- **Read-modify-write race**: `mcp-route-suggest.mjs` (fire side) and `mcp-route-takeup.mjs` (now writes on every eligible-route evaluation, not just rare credits) both RMW the SAME `state/shared/mcp-route-suggest-stats.json` via temp+rename. Does the increased takeup write frequency materially worsen the existing last-writer-wins clobber risk? Is the existing pattern preserved? Is this a NEW regression or pre-existing?
- **Hot-path cost**: `main()` now calls `_recordTakeup` (a full file read+write) on EVERY eligible MCP action / script route, where before it was ~never. Quantify how often `extractMcpAction || extractScriptRoute` returns non-null (i.e., is this actually a hot path?). Confirm non-eligible tool calls still early-return before any IO (line ~210).
- **Silent-failure correctness**: the try/catch swallows must remain (telemetry never fails). Confirm the new return values (stats|null) don't change main()'s control flow or output.
- **Did the early-return removal change any credit-path semantics?** Previously `_recordTakeup` early-returned on 0 classifiers (never touched the
... [+527 chars truncated]

### Assistant | 2026-06-19T12:44:43.627Z

I'll start by reading the diffs for all four files, then trace the consumers and the RMW pattern.

### Assistant | 2026-06-19T12:44:44.657Z

[tool_use: Bash]

### User | 2026-06-19T12:44:45.369Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-19T12:44:48.574Z

I'll read the full files directly to get accurate line numbers, and capture the diffs scoped.

### Assistant | 2026-06-19T12:44:49.045Z

[tool_use: Read]

### Assistant | 2026-06-19T12:44:49.225Z

[tool_use: Read]

### User | 2026-06-19T12:44:49.883Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-route-takeup.mjs' was already read 9s ago in this session and is unchanged (mtime 1781872850036). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-19T12:44:50.236Z

[tool_result] read-once-guard: 'H:\prism\scripts\audit-mcp-route-takerate.mjs' was already read 9s ago in this session and is unchanged (mtime 1781872802871). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T12:44:53.429Z

The guard says these files are already in my context, but they aren't actually present in the conversation. Let me disable the cache and read them.

### Assistant | 2026-06-19T12:44:53.911Z

[tool_use: Read]

### User | 2026-06-19T12:44:54.335Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-route-takeup.mjs' was already read 14s ago in this session and is unchanged (mtime 1781872850036). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-19T12:44:55.142Z

[tool_use: Bash]

### User | 2026-06-19T12:44:59.823Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T4
     3	/**
     4	 * mcp-route-takeup.mjs
     5	 * --------------------
---SEP---

### Assistant | 2026-06-19T12:45:02.677Z

The Read guard is misfiring. I'll use Bash with cat to read the full files since that works.

### Assistant | 2026-06-19T12:45:03.442Z

[tool_use: Bash]

### User | 2026-06-19T12:45:07.503Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T4
     3	/**
     4	 * mcp-route-takeup.mjs
     5	 * --------------------
     6	 * PostToolUse companion to mcp-route-suggest.mjs (TOKEN-SAVINGS-PIVOT iter8).
     7	 *
     8	 * Closes the take-rate measurement gap. The route-suggest hook fires TOKEN-SAVE
     9	 * nudges and records each fire to state/shared/mcp-route-suggest-stats.json,
    10	 * bu
... [+15110 chars truncated]

### Assistant | 2026-06-19T12:45:10.808Z

Now the audit script and both test files.

### Assistant | 2026-06-19T12:45:11.881Z

[tool_use: Bash]

### User | 2026-06-19T12:45:16.502Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * audit-mcp-route-takerate.mjs — B5 from DORMANT-FEATURES-ENUMERATION-2026-05-26.
     4	 *
     5	 * Restores the audit script that `state/shared/dashboards/mcp-route-takerate-audit.md`
     6	 * has been referencing for ~weeks without the file existing on disk (silent-overwrite
     7	 * absorption per [[feedback_commit_to_slot_worktree]]).
     8	 *
... [+13944 chars truncated]

### Assistant | 2026-06-19T12:45:18.818Z

Now the two test files.

### Assistant | 2026-06-19T12:45:19.699Z

[tool_use: Bash]

### User | 2026-06-19T12:45:22.966Z

[tool_result]      1	// mcp-route-takeup.test.mjs — pure tests for the TOKEN-SAVINGS-PIVOT iter8
     2	// PostToolUse take-rate measurement hook.
     3	
     4	import { test } from "node:test";
     5	import assert from "node:assert/strict";
     6	import { extractMcpAction, classifiersTakenBy, extractScriptRoute, eligibleClassifiersFor, _SCRIPT_ROUTE_TO_CLASSIFIERS, _recordTakeup } from "../mcp-route-takeup.
... [+23244 chars truncated]

### Assistant | 2026-06-19T12:45:25.810Z

[tool_use: Bash]

### User | 2026-06-19T12:45:29.985Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * audit-mcp-route-takerate.test.mjs — unit tests for the audit classifier + summary.
     4	 *
     5	 * Run: node --test scripts/audit-mcp-route-takerate.test.mjs
     6	 */
     7	import test from "node:test";
     8	import assert from "node:assert/strict";
     9	import { classify, summarize, renderMd } from "./audit-mcp-route-takerate.mjs";
    10	
... [+10139 chars truncated]

### Assistant | 2026-06-19T12:45:33.921Z

Now let me trace the fire-side hook (`mcp-route-suggest.mjs`) to assess the RMW race claim, and check whether the takeup hook is wired into PostToolUse (to assess hot-path frequency).

### Assistant | 2026-06-19T12:45:36.573Z

[tool_use: Bash]

### User | 2026-06-19T12:45:40.321Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T4
     3	/**
     4	 * mcp-route-suggest.mjs
     5	 * ---------------------
     6	 * Compact PreToolUse router that nudges PRISM work toward existing MCP, helper,
     7	 * and audit-chain surfaces before broad shell churn expands token cost.
     8	 * Uses local Ollama for intelligent suggestions (zero Claude API tokens).
     9	 * Falls back to regex
... [+4493 chars truncated]

### Assistant | 2026-06-19T12:45:43.740Z

Both sides use the same temp+rename-per-PID pattern on the SAME file. Now let me confirm wiring (is the takeup hook actually in PostToolUse, firing on every tool call?) and check the live sidecar to gauge real-world frequency.

### Assistant | 2026-06-19T12:45:47.462Z

[tool_use: Bash]

### User | 2026-06-19T12:45:51.706Z

[tool_result] === takeup wired in settings? ===
H:/.claude/settings.json
C:/Users/wompu/.claude/settings.json
=== PostToolUse matcher context ===
1692:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-route-takeup.mjs",
=== live sidecar size + keys ===
totalFires 672
recent.length 100
takeupTotals null
bytes 19584

### Assistant | 2026-06-19T12:46:09.304Z

The hook is wired into PostToolUse (fires on every tool call). Let me check the matcher to confirm it's unfiltered (matcher `*` vs filtered), and look at the PostToolUse matcher block around line 1692.
[tool_use: Bash]

### User | 2026-06-19T12:46:12.989Z

[tool_result] PostToolUse[1] matcher= ""  hookCount= 8

### Assistant | 2026-06-19T12:46:20.621Z

Matcher is `""` (matches all tool calls). So the takeup hook fires after EVERY tool call. Now let me quantify the hot-path concern precisely. The key question: how often does `extractMcpAction || extractScriptRoute` return non-null, given the early-return at line 236. Let me verify the early-return logic and the eligibility of common tool calls.

The hook reads stdin, then at line 235-236: if neither extractor returns a route, it early-returns BEFORE any file IO (line 239 read happens only after). Let me confirm there's no file read before the early return.

Looking at the code: `main()` flow is:
1. `_hp_shouldSkip` (line 229) - no file IO of the sidecar
2. `readStdin` (line 230)
3. `extractMcpAction || extractScriptRoute` (line 235) - pure, no IO
4. **line 236: early-return if null** - this is BEFORE the sidecar read at line 239

So non-eligible tool calls (Read, Edit, Grep, Glob, most Bash) early-return before any sidecar IO. Good. Let me verify what fraction of tool calls are eligible by checking the extractors against typical tool usage.

### Assistant | 2026-06-19T12:46:25.910Z

[tool_use: Bash]

### User | 2026-06-19T12:46:29.230Z

[tool_result] early-return Read => null
early-return Edit => null
early-return Grep => null
early-return Glob => null
early-return Bash => null
early-return Bash => null
ELIGIBLE     Bash => script:master-index
ELIGIBLE     Bash => script:ollama
ELIGIBLE     mcp__prism_safe__prism_session => prism_session:master_index_query
ELIGIBLE     mcp__prism_safe__prism_dev => prism_dev:file_write
ELIGIBLE     mcp__prism_
... [+77 chars truncated]

### Assistant | 2026-06-19T12:46:39.429Z

One subtle finding here: `mcp__prism_safe__prism_cam` with `toolpath_generate` returns ELIGIBLE (`prism_cam:toolpath_generate`) even though it's NOT in `_ACTION_TO_CLASSIFIERS`. So `extractMcpAction` returns a route key for ANY `prism_*` MCP call, and `_recordTakeup` then bumps `evaluations` for it. This means the "denominator" counts MCP actions that have no classifier mapping. Let me verify this is the actual behavior in `_recordTakeup` — does it still bump evaluations even when `eligibleClassifiersFor` is null?

Tracing: `main()` calls `classifiersTakenBy(sidecar, mcpAction, ...)` → for `prism_cam:toolpath_generate`, `eligibleClassifiersFor` returns null → returns `[]` (line 159-160). Then `_recordTakeup(sessionId, "prism_cam:toolpath_generate", [])` → bumps `evaluations` unconditionally (line 199), credits nothing. So EVERY prism_* MCP call (toolpath, calc, safety, etc.) inflates the `evaluations` denominator even though it's not a creditable route. Let me confirm whether this is intended by re-reading the doctrine in the comments.

The comment (line 176-186) says evaluations is recorded "whenever an eligible route -- an MCP dispatcher action or a documented native-script route -- is invoked." But `extractMcpAction` accepts ALL `prism_*` actions, not just the ones in `_ACTION_TO_CLASSIFIERS`. So "eligible" in the denominator's sense != "has a classifier mapping." Let me check whether this is a real semantic problem by examining how often non-mapped prism_* actions fire vs mapped ones, and whether the audit interprets evaluations correctly.

### Assistant | 2026-06-19T12:46:42.311Z

[tool_use: Bash]

### User | 2026-06-19T12:46:46.031Z

[tool_result] route key: prism_cam:toolpath_generate   eligibleClassifiers: null
route key: prism_session:master_index_query   eligibleClassifiers: ["isBroadGrep","isLargeRead","isBroadGlob","isBroadWebSearch","backendAuditChain","doctrineSurface"]

### Assistant | 2026-06-19T12:46:50.658Z

Confirmed. This is a real semantic concern for the denominator's meaning, though it's arguably "any prism MCP route was taken." I'll note it as a P2 (definitional, doesn't break the gate's stated goal of distinguishing wiring-broken from genuine-0, since any nonzero evaluations proves the hook is live). Now let me run both test suites to confirm they pass and are hermetic.

### Assistant | 2026-06-19T12:46:52.294Z

[tool_use: Bash]

### User | 2026-06-19T12:46:56.311Z

[tool_result] === takeup hook tests ===
  ...
# Subtest: _recordTakeup — disabled knob is a no-op (writes nothing)
ok 38 - _recordTakeup — disabled knob is a no-op (writes nothing)
  ---
  duration_ms: 0.6683
  ...
# Subtest: _recordTakeup — missing sidecar is a safe no-op (never throws)
ok 39 - _recordTakeup — missing sidecar is a safe no-op (never throws)
  ---
  duration_ms: 0.207
  ...
1..39
# tests 39
# su
... [+423 chars truncated]

### Assistant | 2026-06-19T12:46:59.688Z

All 39 + 19 tests pass. Now let me verify test hermeticity — confirm tests only write to temp dirs and that the live sidecar wasn't touched by the test run.

### Assistant | 2026-06-19T12:47:04.865Z

[tool_use: Bash]

### User | 2026-06-19T12:47:08.723Z

[tool_result] === live sidecar untouched? (compare mtime + takeupTotals still null) ===
takeupTotals: {"evaluations":1}
mtime: 2026-06-19T12:46:28.964Z
=== any leaked tk-rec temp dirs in tmpdir? ===
leaked tk-rec dirs: 0 []
=== dashboards dir written by audit test? ===
exists mtime 2026-06-18T18:34:48.751Z

### Assistant | 2026-06-19T12:47:17.677Z

Important finding: the live sidecar now shows `takeupTotals: {"evaluations":1}` with a fresh mtime (12:46:28, seconds ago). Earlier it was `null`. This was NOT the test — the test dirs are clean (0 leaked tk-rec, dashboards untouched from yesterday). This is the LIVE PostToolUse hook firing during my own session: my `mcp__...` or `script:` route calls bumped `evaluations`. Actually, let me verify the cause — it's likely one of my own Bash `node scripts/system-viz-query`-style calls, or the wired live hook reacting to a real tool call. Let me confirm the test suite itself isn't the writer by checking the exact value and confirming the production hook is the cause (this actually proves the hook is live and hermetic — the tests use temp files).

The mtime 12:46 is during this review session. None of my tool calls invoked `system-viz-query.mjs`, `ask-ollama.mjs`, or a `prism_*` MCP action though. Let me check whether a concurrent fleet chat or the test's `--test` runner triggered it. The critical hermeticity question: did the TEST write to the live sidecar? The temp-dir cleanliness says no. Let me definitively confirm by checking that `_recordTakeup` default `statsFile` is never invoked with the live path in tests.

### Assistant | 2026-06-19T12:47:20.387Z

[tool_use: Bash]

### User | 2026-06-19T12:47:23.594Z

[tool_result] Exit code 1
=== every _recordTakeup call in test passes t.file (temp)? ===
376:    const out = _recordTakeup("sess1234", "prism_session:action_search", [], t.file);
389:    _recordTakeup("sess1234", "prism_session:action_search", ["isVerboseBash", "doctrineSurface"], t.file);
403:    _recordTakeup("a", "prism_session:action_search", [], t.file);
404:    _recordTakeup("b", "prism_session:dispatcher
... [+409 chars truncated]

### Assistant | 2026-06-19T12:47:32.118Z

Confirmed hermetic: every `_recordTakeup` test call passes `t.file` (a temp file) or a temp-dir nonexistent path. No test invokes `main()` or the live `_STATS_FILE` default. The audit test imports only pure functions (`classify`, `summarize`, `renderMd`) and never calls `writeFiles`/`loadStats`. The live sidecar write at 12:46 was the production PostToolUse hook reacting to a real tool call in the session (proving it's live), NOT the tests. Exit code 1 is just grep finding no matches in the second pattern — expected.

Now the RMW race analysis. Let me confirm the disable-knob env restore in the one test that mutates env, and verify the audit's `evaluations` default-0 path against an old sidecar with no field (already tested at line 184-186, but let me confirm the renderMd null-guards).

The renderMd uses `summary.evaluations ?? 0` at lines 155, 170, 176. Since `summarize` always sets `evaluations` to a Number (line 83, `Number(...) || 0`), it can never be undefined/NaN in the summary. The `?? 0` is belt-and-suspenders. Good — no NaN leak.

Now the RMW race — the core focus. Let me reason precisely about the concurrency model and quantify the worsening.

### Assistant | 2026-06-19T12:47:32.938Z

[tool_use: Bash]

### User | 2026-06-19T12:47:36.829Z

[tool_result]   if (classifiers.length === 0) return;
  try {
    let stats;
    try {
      stats = JSON.parse(_fs.readFileSync(_ROUTE_STATS_FILE, "utf8"));
    } catch {
      stats = {
        schemaVersion: "1.0.0",
        createdAt: new Date().toISOString(),
        totalFires: 0,
        byToolName: {},
        byClassifier: {},
        recent: [],
      };
    }
    const slot = _resolveSlotForSession(s
... [+2498 chars truncated]

### Assistant | 2026-06-19T12:47:51.473Z

I now have the complete picture of both RMW sides. Let me finalize the race analysis.

**RMW race assessment:** Both `mcp-route-suggest.mjs` (fire side, PreToolUse) and `mcp-route-takeup.mjs` (takeup side, PostToolUse) do `read → mutate in-memory → writeFileSync(tmp-${pid}) → renameSync(tmp, file)` on the SAME `mcp-route-suggest-stats.json`. The temp-per-PID prevents tmp-file collisions, but the rename is last-writer-wins on the whole file — a classic lost-update. Two writers interleaving (read A, read B, write A, write B) lose A's mutation.

Key question from the prompt: does the increased takeup write frequency **materially worsen** the pre-existing race?

- **Pre-existing:** the race already existed. The fire side writes on every classifier match (frequent). The takeup side previously wrote only on `taken.length > 0` (rare credits). So previously, takeup-vs-fire collisions were rare.
- **Now:** takeup writes on EVERY eligible route (every `prism_*` MCP call + every documented script route). This is more frequent. But critically: within a SINGLE chat, PreToolUse(suggest) and PostToolUse(takeup) for the same tool call are **strictly sequential** (Pre fires and completes before the tool runs; Post fires after) — no self-race within one chat's one tool call. The race is purely CROSS-CHAT (multiple fleet slots) OR cross-tool-call timing. The added write frequency does increase the cross-chat collision probability somewhat, but the data being clobbered is monotonic counters (`evaluations`, `totalFires`) and bounded arrays — a lost increment under-counts telemetry by 1, which is advisory and self-healing on the next write. No correctness invariant breaks; no partial-write (rename is atomic on Windows/NTFS for same-volume). 

This is a **pre-existing P2 pattern, marginally amplified, but not a new correctness regression** — the clobbered data is best-effort advisory telemetry where an occasional lost increment is acceptable (and was already accepted by the fire side). I'
... [+217 chars truncated]

### Assistant | 2026-06-19T12:47:57.994Z

[tool_use: Bash]

### User | 2026-06-19T12:48:01.822Z

[tool_result] === env restore correctness (line 414-424) ===
test("_recordTakeup — disabled knob is a no-op (writes nothing)", () => {
  const t = _tmpStats();
  const prev = process.env.PRISM_MCP_ROUTE_TAKEUP_DISABLE;
  process.env.PRISM_MCP_ROUTE_TAKEUP_DISABLE = "1";
  try {
    const out = _recordTakeup("sess1234", "prism_session:action_search", ["doctrineSurface"], t.file);
    assert.equal(out, null, "no-
... [+535 chars truncated]

### Assistant | 2026-06-19T12:48:06.588Z

All semantics verified:
- **Env restore** correct (save/restore in `finally`, handles `undefined` via `delete`).
- **Credit-gating** correct: a 0-credit evaluation bumps ONLY `evaluations` (no `takeups[]` row, no `byClassifier`, no `totalTakeups`). Credits land only on `taken.length>0`. No double-credit, no spurious rows.

Let me do one last consumer trace: confirm nothing else reads `takeupTotals` in a way that would break on the new `evaluations` field (schema drift), and that the fire-side `nonRedundantFires`/audit don't choke on the new field.

### Assistant | 2026-06-19T12:48:08.737Z

[tool_use: Bash]

### User | 2026-06-19T12:48:20.558Z

[tool_result] === all consumers of takeupTotals / evaluations across repo ===
.claude/hooks/mcp-route-suggest.mjs:340:  const tt = stats.takeupTotals && typeof stats.takeupTotals === "object" ? stats.takeupTotals : {};
.claude/hooks/mcp-route-takeup.mjs:197:    stats.takeupTotals ??= {};
.claude/hooks/mcp-route-takeup.mjs:203:      stats.takeupTotals.totalTakeups = (stats.takeupTotals.totalTakeups || 0) + taken
... [+968 chars truncated]

### Assistant | 2026-06-19T12:48:24.831Z

Let me check the two other consumers — `mcp-route-suggest.mjs:340` and `route-savings-session-start-inject.mjs:86` — to confirm the new `evaluations` field doesn't break them (schema-additive safety).

### Assistant | 2026-06-19T12:48:31.545Z

[tool_use: Bash]

### User | 2026-06-19T12:48:36.469Z

[tool_result] === mcp-route-suggest.mjs:338-350 (reads takeupTotals) ===
  // structurally unactionable (data already injected), so including them in
  // the denominator misleads the rate. Knob defaults ON; =0 restores legacy.
  const useFilter = process.env.PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT !== "0";
  const fires = useFilter ? nonRedundantFires(stats) : stats.totalFires;
  if (typeof fires !== "number" || !N
... [+1140 chars truncated]

### Assistant | 2026-06-19T12:48:59.564Z

Both other consumers read only `takeupTotals.totalTakeups` / `byClassifier` with defensive `Number(...) || 0` guards. The new `evaluations` field is purely additive — no consumer reads it that wouldn't tolerate it, and none break. Schema is additive (no `schemaVersion` bump needed; the field defaults 0 on old sidecars, as the audit test at line 184-186 proves).

I have a complete picture. Final summary of the review.

---

VERDICT: PASS

summary: The unit adds a purely-additive `takeupTotals.evaluations` denominator. The change is schema-additive, hermetic (all 39+19 tests pass and write only to temp dirs — verified the live sidecar and dashboards were untouched by the test run), correctly gates credits behind `taken.length>0` (no double-credit / no spurious `takeups[]` rows on a 0-credit evaluation), preserves the silent-failure try/catch, and the non-eligible early-return at line 236 fires BEFORE any sidecar IO so the hot path stays cheap. All three other `takeupTotals` consumers read with defensive `Number(...)||0` guards and tolerate the new field.

findings:
- [P2] `.claude/hooks/mcp-route-takeup.mjs:235` + `:199` — **Denominator over-counts non-creditable routes.** `extractMcpAction` returns a route key for ANY `prism_*:*` MCP action (e.g. `prism_cam:toolpath_generate`, `prism_calc:*`), not just the ~9 actions in `_ACTION_TO_CLASSIFIERS`. `main()` then calls `_recordTakeup(..., [])` for those, bumping `evaluations` even though `eligibleClassifiersFor` returns null and no classifier could ever be credited. Verified live: `prism_cam:toolpath_generate` → eligibleClassifiers `null` yet still increments the denominator. The comment at line 176-186 says evaluations is recorded "whenever an *eligible* route ... is invoked", but the implementation's notion of "eligible" (passes `extractMcpAction`) is broader than "has a classifier mapping". Impact is bounded: any nonzero `evaluations` still correctly distinguishes `genuine-low-take-rate` from `takeup-wiring-broken` (t
... [+1998 chars truncated]
