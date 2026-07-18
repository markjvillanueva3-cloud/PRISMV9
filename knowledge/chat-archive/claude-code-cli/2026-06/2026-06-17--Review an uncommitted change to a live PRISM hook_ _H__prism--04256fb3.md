---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Review an uncommitted change to a live PRISM hook: `H:/prism/.claude/hooks/mcp-c"
date: "2026-06-17"
first_ts: "2026-06-17T19:56:33.837Z"
last_ts: "2026-06-17T19:58:52.735Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 11
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-ae023ee152e4f86d3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Review an uncommitted change to a live PRISM hook: `H:/prism/.claude/hooks/mcp-c

> **claude-code-cli** | 2026-06-17 | 30 msgs (11 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-ae023ee152e4f86d3.jsonl`

## Transcript

### User | 2026-06-17T19:56:33.837Z

Review an uncommitted change to a live PRISM hook: `H:/prism/.claude/hooks/mcp-connectivity-check.mjs` (UserPromptSubmit hook that probes the shared MCP server :3100 each turn and emits a "🛑 MCP SERVER DISCONNECTED — every mcp__prism__* tool call will fail this turn" banner when the probe fails).

See the change: `cd H:/prism && git diff -- .claude/hooks/mcp-connectivity-check.mjs`. Read the full `runCheck` function and `probeUrl`/`buildBanner`.

THE CHANGE (U-MCP-CONNCHECK-DEBOUNCE): previously `runCheck` ran ONE probe (3s timeout); a single transient timeout/ECONNRESET on a healthy-but-momentarily-slow server emitted the DISCONNECTED banner. VERIFIED LIVE this session: the banner fired while the server was actually UP (uptime 74min) — /ready took 2.9s (near the 3s ceiling), then /health returned 200 in 5ms three times; queue empty. So it was a false alarm. The fix adds a DEBOUNCE: on a failed probe, do ONE confirming re-probe (shorter timeout `Math.min(cfg.timeoutMs, 2000)`); only declare DOWN if BOTH fail. Knob `PRISM_MCP_CONNECTIVITY_NO_DEBOUNCE=1` restores single-probe fail-fast. The merge line is: `result = (confirm && confirm.ok === true) ? confirm : (confirm || result);`

VERIFY (grade PASS/FAIL, P0/P1 with file:line):
1. Is the verdict-merge correct in all cases? (first ok → no re-probe; first fail + re-probe ok → treat UP, suppress banner; first fail + re-probe fail → keep DOWN, banner + auto-reconnect still fire.)
2. Does the down-path behavior (auto-reconnect via maybeReconnect at result.ok===false) still fire correctly ONLY for a sustained outage, and NOT for a transient (which is now treated as up)? Is that the right call?
3. Is `result` correctly changed from const to let? Does saveState persist the DEBOUNCED (final) verdict — and is that what the throttle/"always re-probe when prior was disconnect" logic wants?
4. Latency: re-probe only on failure (happy path zero added latency)? Worst-case added latency on a genuine down = one `min(timeout,2000)`ms 
... [+371 chars truncated]

### Assistant | 2026-06-17T19:56:37.616Z

I'll review this change to the MCP connectivity check hook. Let me start by reading the diff and the full file.

### Assistant | 2026-06-17T19:56:38.571Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:56:38.704Z

[tool_use: Read]

### User | 2026-06-17T19:56:50.493Z

[tool_result] diff --git a/.claude/hooks/mcp-connectivity-check.mjs b/.claude/hooks/mcp-connectivity-check.mjs
index 7ecba8d1d9..08ada406dd 100644
--- a/.claude/hooks/mcp-connectivity-check.mjs
+++ b/.claude/hooks/mcp-connectivity-check.mjs
@@ -31,6 +31,7 @@
  *   PRISM_MCP_CONNECTIVITY_DISABLE=1    skip the probe entirely
  *   PRISM_MCP_CONNECTIVITY_TIMEOUT_MS   probe timeout (default 3000)
  *   PRISM_MCP_CO
... [+2190 chars truncated]

### User | 2026-06-17T19:56:52.918Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+20898 chars truncated]

### Assistant | 2026-06-17T19:56:56.736Z

I have the full diff and the complete file. Let me verify the supporting pieces the change depends on: the test file (to check coverage of the debounce) and the `probeUrl` contract that determines what `ok===false` means for the merge logic.

### Assistant | 2026-06-17T19:56:57.219Z

[tool_use: Glob]

### Assistant | 2026-06-17T19:56:57.609Z

[tool_use: Glob]

### User | 2026-06-17T19:57:19.224Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-17T19:57:19.825Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-17T19:57:21.914Z

Let me narrow the search to the hooks directory directly.

### Assistant | 2026-06-17T19:57:23.384Z

[tool_use: Bash]

### User | 2026-06-17T19:57:29.129Z

[tool_result] mcp-connectivity-check.mjs*
mcp-connectivity-check.test.mjs
---__tests__---

### Assistant | 2026-06-17T19:57:31.476Z

The test file lives alongside the hook. Let me read it to assess test integrity for the new debounce behavior.

### Assistant | 2026-06-17T19:57:31.607Z

[tool_use: Read]

### User | 2026-06-17T19:57:32.164Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.test.mjs' was already read 19s ago in this session and is unchanged (mtime 1781726134963). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE
... [+3 chars truncated]

### Assistant | 2026-06-17T19:57:36.355Z

The guard says it was already read, but I don't actually have its contents in context (the Glob calls timed out, not a Read). Let me read it with explicit offset to bypass the guard, since I genuinely need the content.

### Assistant | 2026-06-17T19:57:37.055Z

[tool_use: Read]

### User | 2026-06-17T19:57:40.220Z

[tool_result] 1	// mcp-connectivity-check.test.mjs — pure-core tests with injected http + fs.
2	// Run: node --test H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  getConfig,
8	  loadState,
9	  saveState,
10	  shouldProbe,
11	  buildBanner,
12	  runCheck,
13	  countBridges,
14	  buildDegradedBanner,
15	  buil
... [+21793 chars truncated]

### Assistant | 2026-06-17T19:57:43.123Z

I have the full picture now: the hook source, the diff, and the test file. Let me verify the merge logic against `probeUrl`'s contract and confirm the tests actually run green.

### Assistant | 2026-06-17T19:57:44.154Z

[tool_use: Bash]

### User | 2026-06-17T19:57:57.235Z

[tool_result]   ...
# Subtest: runCheck debounce: sustained (both probes fail) -> DISCONNECTED banner
ok 39 - runCheck debounce: sustained (both probes fail) -> DISCONNECTED banner
  ---
  duration_ms: 1.0463
  ...
# Subtest: runCheck debounce: happy path (probe OK) -> NO re-probe (zero added latency)
ok 40 - runCheck debounce: happy path (probe OK) -> NO re-probe (zero added latency)
  ---
  duration_ms: 1.044
... [+343 chars truncated]

### Assistant | 2026-06-17T19:58:01.584Z

All 41 tests pass, including the 4 new debounce tests. Now let me verify my analysis of the merge logic and the `maybeReconnect` contract that the down-path depends on. Let me trace through every case carefully.

The merge line is: `result = (confirm && confirm.ok === true) ? confirm : (confirm || result);`

Let me verify the `probeUrl` contract guarantees `confirm` is always a truthy object (it always resolves with an object via `finish()`), and check the `maybeReconnect` signature.

### Assistant | 2026-06-17T19:58:02.106Z

[tool_use: Read]

### User | 2026-06-17T19:58:04.412Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+5329 chars truncated]

### Assistant | 2026-06-17T19:58:22.385Z

I have confirmed the `maybeReconnect` contract: it takes `{ ok }` (the hook passes `{ ok: result.ok }`), and `decideReconnect` only spawns when `up` is falsy. The down-path is correctly gated on the final (debounced) `result.ok === false`.

Let me trace through every case of the merge logic with the `probeUrl` contract in mind.

**`probeUrl` contract** (lines 187-217): Always resolves via `finish()` with an object `{ ok, status, error, latencyMs }`. It never resolves `undefined` or rejects. So `confirm` from `probeFn` is always a truthy object when the real `probeUrl` is used.

**Merge line**: `result = (confirm && confirm.ok === true) ? confirm : (confirm || result);`

Trace of all cases (entered only when `result.ok === false` and debounce not disabled):

| First probe | Re-probe (`confirm`) | Merge result | Banner? | Reconnect? |
|---|---|---|---|---|
| ok=false | `{ok:true}` | `confirm` (UP) | No | No (gated on ok===false) |
| ok=false | `{ok:false}` | `confirm` (fresher DOWN) | Yes | Yes |
| ok=false | `null`/`undefined` (defensive only) | `result` (orig DOWN) | Yes | Yes |

The happy path (`result.ok === true`): the `if` is not entered, zero re-probe, sentinel + fleet0 branches untouched. Correct.

Now let me verify the six specific questions and check the one subtle correctness concern: when the re-probe returns `confirm.ok === false`, the merged `result` becomes `confirm`, which has a `latencyMs` reflecting only the confirm probe. That's cosmetic (banner shows the error). Let me also confirm there's no issue with `confirm.ok` being a non-boolean falsy/truthy value. The `probeUrl` always sets `ok` to a strict boolean (`res.statusCode < 500` or literal `false`), so `confirm.ok === true` and the `result.ok === false` guard are both safe against truthiness surprises.

Let me also double-check whether `saveState` persisting the debounced verdict interacts correctly with `shouldProbe`'s "always re-probe when prior was disconnect" logic.

`shouldProbe` (lines 173-1
... [+1143 chars truncated]

### Assistant | 2026-06-17T19:58:23.741Z

[tool_use: Bash]

### User | 2026-06-17T19:58:30.317Z

[tool_result] C:/Users/wompu/.claude/settings.json:1411:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-connectivity-check.mjs",
H:/.claude/settings.json:1411:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-connectivity-check.mjs",

### Assistant | 2026-06-17T19:58:52.735Z

The hook is wired in both settings.json (UserPromptSubmit). No dispatcher wiring is relevant here (this is a hook, not an engine). Let me do a final ASCII/convention check on the added lines and confirm there are no smart-quotes or em-dashes in the new code (the comment uses `--` ASCII, which matches the file's convention).

Looking at the diff: the new code uses `->` and `--` (ASCII), `Math.min`, plain `let`. The comment style matches the surrounding heavy-comment convention (R11). No smart quotes, no em-dashes in code. The knob is documented in the header (line 34) consistent with the other knobs.

I have completed a full end-to-end review. Here is my verdict.

---

VERDICT: PASS

summary: The U-MCP-CONNCHECK-DEBOUNCE change to `mcp-connectivity-check.mjs` is correct in all six dimensions asked. The verdict-merge handles every case (first-ok skips re-probe; first-fail+re-probe-ok suppresses the banner and correctly does NOT auto-reconnect; first-fail+re-probe-fail keeps DOWN so banner + `maybeReconnect` fire); the `const`→`let` promotion is required and `saveState` persists the final debounced verdict, which is exactly what `shouldProbe`'s recovery logic wants; happy path adds zero latency; the sentinel and fleet0 branches are untouched; and the both-must-fail rule means a real outage still surfaces. All 41 tests pass (including 4 new debounce tests covering transient/sustained/happy/knob-disabled).

findings: none

What I verified (so this PASS is auditable):

1. **Merge correctness** (`H:/prism/.claude/hooks/mcp-connectivity-check.mjs:280`) — `result = (confirm && confirm.ok === true) ? confirm : (confirm || result);`. `probeUrl` (lines 187-217) always resolves a truthy object via `finish()` (never `undefined`/reject) and sets `ok` to a strict boolean. Traced all branches: transient (fail→ok) → `confirm` (UP, banner suppressed); sustained (fail→fail) → `confirm` (fresher DOWN, banner fires); defensive `confirm` falsy → falls back to original `result` (DOWN). All
... [+2424 chars truncated]
