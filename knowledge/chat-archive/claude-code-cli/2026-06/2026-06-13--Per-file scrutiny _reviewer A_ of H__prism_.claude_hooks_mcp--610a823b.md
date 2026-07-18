---
type: "chat-session"
source: "claude-code-cli"
session_id: "610a823b-dfea-4855-b749-16661916b5fa"
title: "Per-file scrutiny (reviewer A) of H:/prism/.claude/hooks/mcp-connectivity-check."
date: "2026-06-13"
first_ts: "2026-06-13T15:09:19.971Z"
last_ts: "2026-06-13T15:11:06.864Z"
cwd: "H:\\prism-slot-tango"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/agent-a45ec8c9a89e67d1e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# Per-file scrutiny (reviewer A) of H:/prism/.claude/hooks/mcp-connectivity-check.

> **claude-code-cli** | 2026-06-13 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/agent-a45ec8c9a89e67d1e.jsonl`

## Transcript

### User | 2026-06-13T15:09:19.971Z

Per-file scrutiny (reviewer A) of H:/prism/.claude/hooks/mcp-connectivity-check.mjs -- a UserPromptSubmit hook that runs EVERY turn for EVERY chat. Read it END-TO-END, plus its test H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs (36 tests, all passing).

CONTEXT: This file now contains TWO detection layers that must coexist:
(A) golf's `countBridges` + `buildDegradedBanner` (U-MCP-BRIDGE-DETECT, fleet-wide: reads the fleet-reaper enum-cache, fires when server-up + 0 bridge processes anywhere). This was pulled from slot/golf this session -- it must remain INTACT (no regression).
(B) MY addition (MCP-CLIENT-ENFORCE-MS0, slot tango): a per-CHAT sentinel check -- imports resolveSlotName/readBridgeLiveness/isConfidentlyDisconnected/getLiveDir/getStaleMs from ../../scripts/lib/mcp-bridge-liveness.mjs, a buildClientDisconnectBanner() function, and a change to the `else if (result.ok === true)` branch in runCheck so the per-chat sentinel is checked FIRST and golf's countBridges runs as a FALLBACK only when the sentinel gives no banner.

VERIFY:
1. LAYERING CORRECTNESS in runCheck's `else if (result && result.ok === true)` branch: (a) sentinel check runs first, gated by PRISM_MCP_CLIENT_CHECK_DISABLE; (b) it uses opts.resolveSlotFn/opts.readBridgeLivenessFn injection seams for tests + real fns in prod; (c) golf's countBridges runs ONLY `if (!banner)`; (d) both are wrapped in try/catch so neither can break the turn. Confirm golf's original behavior is preserved when no sentinel exists (no-signal -> falls through to countBridges).
2. FAIL-SOFT: a throw from the sentinel path must never break the turn (the hook must always return {continue:true}). Trace it.
3. The disable knob PRISM_MCP_CLIENT_CHECK_DISABLE=1 actually skips the sentinel (test asserts the injected fn isn't called) -- verify the gate is correct.
4. buildClientDisconnectBanner: ASCII-only? names /mcp + the honest harness limit (a hook cannot reconnect the client)? exported for test?
5. nowMs/cfg are in sco
... [+629 chars truncated]

### Assistant | 2026-06-13T15:09:28.135Z

I'll review this file end-to-end along with its test. Let me read both completely first.

### Assistant | 2026-06-13T15:09:29.026Z

[tool_use: Read]

### Assistant | 2026-06-13T15:09:29.076Z

[tool_use: Read]

### User | 2026-06-13T15:09:40.510Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+16789 chars truncated]

### User | 2026-06-13T15:09:41.214Z

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
... [+17386 chars truncated]

### Assistant | 2026-06-13T15:09:46.171Z

Both files read end-to-end. Now let me verify the imported library's contract — the sentinel functions (`resolveSlotName`, `readBridgeLiveness`, `isConfidentlyDisconnected`, `getLiveDir`, `getStaleMs`) — to confirm the signatures used in `runCheck` match the real implementation, and that the injection seams are sound.

### Assistant | 2026-06-13T15:09:47.139Z

[tool_use: Read]

### Assistant | 2026-06-13T15:09:47.220Z

[tool_use: Read]

### User | 2026-06-13T15:09:57.284Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-bridge-liveness.mjs' was already read 33s ago in this session and is unchanged (mtime 1781361145166). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-13T15:10:00.828Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+21179 chars truncated]

### Assistant | 2026-06-13T15:10:04.265Z

The reconnect lib confirms the `result.ok === false` path is untouched and correct. The bridge-liveness lib is already in my context. Let me locate its function signatures to verify exact contracts for `resolveSlotName`, `readBridgeLiveness`, `isConfidentlyDisconnected`, `getLiveDir`, `getStaleMs`.

### Assistant | 2026-06-13T15:10:05.323Z

[tool_use: Grep]

### User | 2026-06-13T15:10:08.745Z

[tool_result] 68:export function getLiveDir(env = process.env) {
69-  const v = env && env.PRISM_MCP_BRIDGE_LIVE_DIR;
70-  return v && String(v).trim() ? String(v).trim() : DEFAULT_LIVE_DIR;
71-}
72-
73:export function getStaleMs(env = process.env) {
74-  const n = Number(env && env.PRISM_MCP_BRIDGE_STALE_MS);
75-  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STALE_MS;
76-}
77-
78-/**
79- * Resolve THIS cha
... [+2745 chars truncated]

### Assistant | 2026-06-13T15:11:06.864Z

I now have every contract needed. Let me verify each claim against exact lines.

**Contract verification of the imported sentinel API:**

- `getLiveDir(env)` — line 68, signature `(env)`. Hook calls `getLiveDir(env)` (line 280). ✓
- `getStaleMs(env)` — line 73, signature `(env)`. Hook calls `getStaleMs(env)` (line 280). ✓
- `resolveSlotName(env, cwd)` — line 99, signature `(env, cwd)`. Hook calls `(opts.resolveSlotFn || resolveSlotName)(env, opts.cwd)` (line 278). ✓
- `readBridgeLiveness(slot, opts)` — line 160, signature `(slot, {now, liveDir, staleMs, deps, isPidAlive})`. Hook calls `(...)(slot, { liveDir, staleMs, now: nowMs })` (lines 279-281). ✓ — `now` accepted as `opts.now` (line 161), `liveDir`/`staleMs` accepted (lines 162-163). Verdict shape `{ alive, reason, pid, ageMs }` matches what `buildClientDisconnectBanner` reads (`verdict.reason`, `verdict.pid`). ✓
- `isConfidentlyDisconnected(verdict)` — line 205, returns true only for `reason === "pid-dead" || "stale-heartbeat"`. Hook calls it at line 282. ✓ This is the precise gate that distinguishes a *confident* disconnect from a no-signal verdict (`no-sentinel`/`unknown-slot` → false → falls through to countBridges). ✓

Now I have everything to render the full verdict.

---

## Code Quality Analysis Report — `mcp-connectivity-check.mjs` (Reviewer A, per-file scrutiny)

### Summary
- File: `H:/prism/.claude/hooks/mcp-connectivity-check.mjs` (321 lines)
- Test: `H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs` (417 lines, 36 tests)
- Verified against: `scripts/lib/mcp-bridge-liveness.mjs` (sentinel API) + `scripts/lib/mcp-reconnect-action.mjs` (golf's down-path action)
- Scope: layering correctness, fail-soft, disable knob, banner content, scope/closure, test integrity, golf-path non-regression

---

### VERIFY 1 — Layering correctness in the `result.ok === true` branch (lines 271-293)

**(a) Sentinel runs first, gated by the disable knob** — `mcp-connectivity-check.mjs:276` opens with `if (String(env.P
... [+8778 chars truncated]
