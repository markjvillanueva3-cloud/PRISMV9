---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Independent third review (arm C) of MCP-reliability commit 3d7b08eaa9 on slot/br"
date: "2026-06-17"
first_ts: "2026-06-17T16:42:34.026Z"
last_ts: "2026-06-17T16:46:12.697Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 21
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a09b6a3617891ea77.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Independent third review (arm C) of MCP-reliability commit 3d7b08eaa9 on slot/br

> **claude-code-cli** | 2026-06-17 | 56 msgs (21 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a09b6a3617891ea77.jsonl`

## Transcript

### User | 2026-06-17T16:42:34.026Z

Independent third review (arm C) of MCP-reliability commit 3d7b08eaa9 on slot/bravo (live edited files in H:/prism). Weighted toward SILENT BREAKAGE, regression risk, I/O safety, and integration coupling -- do NOT assume the other reviewers caught everything. Read each file end-to-end. Grade PASS or FAIL with P0/P1 + file:line.

THE CHANGE: H:/prism/.claude/hooks/mcp-bridge-enforce-pretool.mjs -- maybeWriteBroadcast became async and now does a live probeUrl(:3100/health) before writing the fleet "/mcp reconnect" broadcast, writing ONLY when the new pure liveBroadcastVerdict (H:/prism/scripts/lib/mcp-bridge-enforce.mjs) confirms DOWN (ok===false). main() became async; the isMain runner is main().catch(()=>allow()).

HUNT FOR (be adversarial):
- ASYNC/EXIT races: main() calls allow()/deny() which do process.stdout.write + process.exit(0). In the async path, is there any way the broadcast write (writeFileSync) or cache refresh (saveState) is interrupted by an early process.exit, or that stdout is written twice, or that the process exits before the awaited probe resolves?
- FAIL-OPEN integrity: every catch must fail open (allow / never break the gate / never false-alarm). Is there ANY throw path in the async chain that could (a) hang the tool call indefinitely, (b) block when it should allow, or (c) write a false broadcast on the hook's OWN error?
- PROBE COST: probeUrl is only reached after shouldWriteBroadcast (TTL dedup) passes AND the chat is not alive AND fleet count 0 AND serverUp!==true. Confirm the probe does NOT run in the common (connected / fleet>0 / fresh-healthy-cache) path -- i.e., no added latency to normal tool calls. What is the worst-case latency in the rare path (timeout)?
- TIMEOUT semantics: probeUrl returns ok:false on timeout. Under heavy real load could a healthy-but-slow :3100 time out -> false DOWN -> false broadcast? Is the timeout (default 2000ms, was the connectivity probe bumped 1000->3000 for exactly this reason) adequate? Is this a NEW fa
... [+495 chars truncated]

### Assistant | 2026-06-17T16:42:47.435Z

I'll review commit 3d7b08eaa9 on slot/bravo, focusing on the async/exit races and fail-open integrity in the MCP bridge enforcement hook. Let me start by reading the changed files end-to-end.

### Assistant | 2026-06-17T16:42:47.906Z

[tool_use: Read]

### User | 2026-06-17T16:42:48.338Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-bridge-enforce-pretool.mjs' was already read 34s ago in this session and is unchanged (mtime 1781713985718). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-17T16:42:48.680Z

[tool_use: Read]

### User | 2026-06-17T16:42:49.120Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-bridge-enforce.mjs' was already read 35s ago in this session and is unchanged (mtime 1781713842532). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T16:42:52.043Z

The files are already in my context from the session. Let me work with the content I have. Let me verify the key functions in detail by reading the specific sections, and check the consumers and the connectivity-check sibling.

### Assistant | 2026-06-17T16:42:52.986Z

[tool_use: Bash]

### Assistant | 2026-06-17T16:42:54.417Z

[tool_use: Bash]

### User | 2026-06-17T16:43:05.779Z

[tool_result] commit 3d7b08eaa9491f80b6b1b4c47bb21b7d25332b77
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 17 11:39:56 2026 -0500

    [MAIN] [MCP-RELIABILITY]/U-MCP-FALSEPOS-LIVEPROBE (slot:bravo): PERMANENT fix for "chats still getting kicked off the MCP server" -- gate the fleet "/mcp reconnect" broadcast on a LIVE :3100 probe (positive DOWN evidence), not on bridge-count + a s
... [+2788 chars truncated]

### User | 2026-06-17T16:43:07.677Z

[tool_result] 3d7b08eaa9 [MAIN] [MCP-RELIABILITY]/U-MCP-FALSEPOS-LIVEPROBE (slot:bravo): PERMANENT fix for "chats still getting kicked off the MCP server" -- gate the fleet "/mcp reconnect" broadcast on a LIVE :3100 probe (positive DOWN evidence), not on bridge-count + a stale cache.
02ca1d03bc [MAIN] [MCP-KICKOFF-FIX]/U-MCP-CONCURRENCY-CAP (slot:bravo): permanent fix for chats kicked off the MCP daemon -- ROOT
... [+1904 chars truncated]

### Assistant | 2026-06-17T16:43:10.622Z

The files are M (modified live in working tree), but committed at 3d7b08eaa9. Let me check whether the working tree matches the commit or has further uncommitted edits, and read the actual current content end-to-end.

### Assistant | 2026-06-17T16:43:11.993Z

[tool_use: Bash]

### User | 2026-06-17T16:43:17.033Z

[tool_result] ===END DIFF VS COMMIT===

### Assistant | 2026-06-17T16:43:20.465Z

Working tree matches the commit exactly (empty diff). The "M" status is just because slot/bravo HEAD differs from the recorded git status snapshot baseline. Now let me read the actual current file content end-to-end since the read-once guard says it's in my context — but I need to be sure. Let me disable the cache and read both files fully.

### Assistant | 2026-06-17T16:43:21.359Z

[tool_use: Read]

### User | 2026-06-17T16:43:22.270Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * mcp-bridge-enforce-pretool.mjs -- PreToolUse ENFORCEMENT gate for a dead prism
5	 * MCP bridge (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
6	 *
7	 * WHY (operator 2026-06-16): "chats still losing connection and enforcements in
8	 * place for chats to check to see if they're connected don't work -- find a way to
9	 * automate and enforce it." MS0
... [+14708 chars truncated]

### Assistant | 2026-06-17T16:43:25.481Z

Now I have the full hook file. Let me read the library file end-to-end to verify the pure verdict functions, and check the connectivity-check sibling for `probeUrl`/`saveState`/`getConfig` semantics.

### Assistant | 2026-06-17T16:43:26.018Z

[tool_use: Read]

### User | 2026-06-17T16:43:26.761Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-bridge-enforce.mjs' was already read 72s ago in this session and is unchanged (mtime 1781713842532). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T16:43:30.214Z

The guard insists it's in context, but I want to be certain I see the actual function bodies. Let me grep the specific functions in the library and the connectivity-check sibling for `probeUrl`, `saveState`, `getConfig`.

### Assistant | 2026-06-17T16:43:32.462Z

[tool_use: Grep]

### Assistant | 2026-06-17T16:43:33.736Z

[tool_use: Grep]

### User | 2026-06-17T16:43:33.850Z

[tool_result] 15: *   This module is the ENFORCEMENT half: a PreToolUse hook calls decideEnforcement
42: * Pure (testable) exports: decideEnforcement, buildEnforceReason, buildBroadcastSignal,
43: *   shouldWriteBroadcast, BROADCAST_SCHEMA_VERSION, DEFAULT_THROTTLE_MS, DEFAULT_BROADCAST_TTL_SEC.
46:export const DEFAULT_THROTTLE_MS = 180_000; // block at most once per 3min per chat
47:export const DEFAULT_BROADC
... [+786 chars truncated]

### User | 2026-06-17T16:43:35.144Z

[tool_result] 86:export function countBridges(env = process.env, deps = {}) {
136:export function getConfig(env = process.env) {
158:export function saveState(path, state, deps = {}) {
186:export function probeUrl(url, timeoutMs, httpClient = http) {

### Assistant | 2026-06-17T16:43:38.203Z

Let me read the key function bodies precisely: `decideEnforcement` (lines 67-122), `liveBroadcastVerdict` (205+), `shouldWriteBroadcast` (167+) in the lib, and `probeUrl`/`saveState`/`getConfig`/`countBridges` in the connectivity-check sibling.

### Assistant | 2026-06-17T16:43:39.124Z

[tool_use: Read]

### Assistant | 2026-06-17T16:43:39.790Z

[tool_use: Read]

### User | 2026-06-17T16:43:42.292Z

[tool_result] 60	 *                                    Omitted/undefined => legacy broadcast-on-fleet-0 behavior.
61	 * @param {number} a.lastEnforcedMs   epoch ms of this chat's last enforce-block (0 = never)
62	 * @param {number} a.now              epoch ms
63	 * @param {number} [a.throttleMs]     re-block window (default DEFAULT_THROTTLE_MS)
64	 * @returns {{ block:boolean, reason:string|null, broadcast:bool
... [+8548 chars truncated]

### User | 2026-06-17T16:43:42.527Z

[tool_result] 80	
81	/**
82	 * Count live `mcp-http-bridge` processes from the fleet-reaper enum cache (cheap file read).
83	 * Returns { ok:true, bridges, ageSec } when the cache is fresh + parseable; { ok:false, reason }
84	 * otherwise (fail-soft: an UNKNOWN bridge count must NEVER trigger a false degraded banner).
85	 */
86	export function countBridges(env = process.env, deps = {}) {
87	  if (String(env.PRI
... [+8128 chars truncated]

### Assistant | 2026-06-17T16:43:47.603Z

Now I have the complete picture. Let me verify a couple of key claims raised in the prompt: (1) the connectivity-probe timeout bump 1000→3000 (the prompt asks if it was bumped), and (2) the `STATE_FILE` default in connectivity-check vs `CONNECTIVITY_STATE` in the hook, to confirm the cross-process write-contention concern.

### Assistant | 2026-06-17T16:43:49.506Z

[tool_use: Grep]

### Assistant | 2026-06-17T16:43:50.804Z

[tool_use: Bash]

### User | 2026-06-17T16:43:51.393Z

[tool_result] 60:const DEFAULT_URL = "http://127.0.0.1:3100";
66:const DEFAULT_TIMEOUT_MS = 3000;
67:const DEFAULT_THROTTLE_SEC = 30;
68:const STATE_FILE = join(tmpdir(), "prism-hook-state", "mcp-connectivity-state.json");
79:const BRIDGE_CACHE_MAX_AGE_SEC = 900; // reaper writes every ~5min; >15min = stale, don't trust it
98:    if (ageSec > BRIDGE_CACHE_MAX_AGE_SEC) return { ok: false, reason: "stale-cache", 
... [+288 chars truncated]

### User | 2026-06-17T16:43:57.053Z

[tool_result] ===END .mcp.json diff===

### Assistant | 2026-06-17T16:44:03.654Z

Confirmed key facts:
- `STATE_FILE` (connectivity-check) = `tmpdir()/prism-hook-state/mcp-connectivity-state.json` — exactly matches `CONNECTIVITY_STATE` default in the hook. Same file. So the saveState-on-healthy-probe write goes to the same file the connectivity-check writes.
- `DEFAULT_TIMEOUT_MS = 3000` (the connectivity-probe). But the new gate probe uses its own `ENFORCE_PROBE_TIMEOUT_MS` (default 2000), NOT the connectivity-check's 3000.

The rtk-filtered .mcp.json diff returned nothing meaningful; the commit message itself documents the revert. Let me verify the saveState `state` shape it writes is compatible with what `loadState`/`readCachedServerUp` expects, and check the `mcp-broadcast-reconnect-inject.mjs` consumer of the signal file to confirm the schema contract is unchanged. Also let me verify there are no other consumers of `maybeWriteBroadcast`'s sync-vs-async change.

### Assistant | 2026-06-17T16:44:05.558Z

[tool_use: Grep]

### Assistant | 2026-06-17T16:44:06.745Z

[tool_use: Grep]

### User | 2026-06-17T16:44:07.588Z

[tool_result] .claude\hooks\mcp-bridge-enforce-pretool.mjs:46:  liveBroadcastVerdict,
.claude\hooks\mcp-bridge-enforce-pretool.mjs:97:// only a HUNG server hits this). Knob: PRISM_MCP_ENFORCE_PROBE_TIMEOUT_MS.
.claude\hooks\mcp-bridge-enforce-pretool.mjs:98:const ENFORCE_PROBE_TIMEOUT_MS = Math.max(100, Number(process.env.PRISM_MCP_ENFORCE_PROBE_TIMEOUT_MS) || 2000);
.claude\hooks\mcp-bridge-enforce-pretool.mjs
... [+657 chars truncated]

### User | 2026-06-17T16:44:08.294Z

[tool_result] 51:  if (!signal || typeof signal.signaledAtMs !== "number") { exitSilent(); return; }
54:  if (signal.expiresAtMs && Date.now() > signal.expiresAtMs) { exitSilent(); return; }
57:  if (Date.now() - signal.signaledAtMs < GRACE_SEC * 1000) { exitSilent(); return; }
72:  if (lastSeenMs >= signal.signaledAtMs) {
81:    writeFileSync(seenFile, new Date(signal.signaledAtMs).toISOString(), "utf8");
86: 
... [+71 chars truncated]

### Assistant | 2026-06-17T16:44:16.494Z

All contracts verified:

1. **`maybeWriteBroadcast` is only called at line 247** — single call site, properly awaited. No other consumer of the async function exists.
2. **Broadcast signal schema unchanged** — `buildBroadcastSignal` still emits `signaledAtMs`/`expiresAtMs`/`signaledByPid` etc., and the consumer `mcp-broadcast-reconnect-inject.mjs` reads exactly those fields. No drift.
3. **`saveState(CONNECTIVITY_STATE, { lastProbeAt, lastStatus })`** — shape matches exactly what `loadState`/`readCachedServerUp` read (`s.lastProbeAt`, `s.lastStatus`).

Now let me trace the critical async/exit-race concern precisely. The key path:
- Line 247: `if (d.broadcast) await maybeWriteBroadcast(now);` — this is awaited inside `main()`.
- Line 248: `if (!d.block) return allow();`
- `maybeWriteBroadcast` itself never calls `allow()`/`deny()`/`process.exit()` — it only does fs writes and returns. So there is no interleaving of `process.exit()` with the awaited probe.

Let me verify there is no second `process.exit` or stdout-write path that could fire before the await resolves, and confirm `probeUrl`'s timeout always settles (no hang). Let me also confirm `decideEnforcement`'s `broadcast`/`block` computation is byte-identical to pre-commit.

### Assistant | 2026-06-17T16:44:18.081Z

[tool_use: Bash]

### User | 2026-06-17T16:44:21.278Z

[tool_result] ===END lib diff===

### Assistant | 2026-06-17T16:44:24.456Z

rtk is swallowing the diff output. Let me get the raw diff for the lib file (bypassing rtk) to confirm `decideEnforcement`/broadcast computation was untouched and only `liveBroadcastVerdict` was added.

### Assistant | 2026-06-17T16:44:26.406Z

[tool_use: Bash]

### User | 2026-06-17T16:44:30.664Z

[tool_result] + * @param {boolean} [a.serverUp]      cached :3100 health (true=healthy). When true, a fleet
+  // the caller has NOT confirmed the server healthy (serverUp !== true). Back-compat: a caller
+  // that does not pass serverUp (undefined) keeps the legacy broadcast-on-fleet-0 behavior, so
+  const broadcastOut = fleetOut && a.serverUp !== true;
-    return { block: false, reason: null, broadcast: fl
... [+516 chars truncated]

### Assistant | 2026-06-17T16:44:36.533Z

This confirms a critical point: the lib changes in THIS commit `3d7b08eaa9` are limited to (a) adding the `serverUp` param to `decideEnforcement` (which changes `broadcast: fleetOut` → `broadcast: broadcastOut = fleetOut && a.serverUp !== true`) and (b) adding the pure `liveBroadcastVerdict`. 

Wait — the prompt states "does decideEnforcement still compute broadcast=fleetOut && serverUp!==true unchanged". The diff shows that `broadcastOut = fleetOut && a.serverUp !== true` was *introduced* in this commit (the previous version was bare `broadcast: fleetOut`). Let me verify the commit boundary — this diff is the full `3d7b08eaa9` commit which the prompt attributes to U-MCP-FALSEPOS-LIVEPROBE. But the `serverUp` suppression was attributed to U-MCP-FALSEPOS-SUPPRESS (golf). Let me check the parent to be precise about what THIS commit changed vs what was already there.

### Assistant | 2026-06-17T16:44:39.419Z

[tool_use: Bash]

### User | 2026-06-17T16:44:44.963Z

[tool_result] 3d7b08eaa9 [MAIN] [MCP-RELIABILITY]/U-MCP-FALSEPOS-LIVEPROBE (slot:bravo): PERMANENT fix for "chats still getting kicked off the MCP server" -- gate the fleet "/mcp reconnect" broadcast on a LIVE :3100 probe (positive DOWN evidence), not on bridge-count + a stale cache.
f4d63e1adf [MAIN] [MCP-CLIENT-ENFORCE-MS1]/U-PRETOOL-GATE-SAFE (slot:bravo): gate no longer eats shared-tree git staging (operato
... [+397 chars truncated]

### Assistant | 2026-06-17T16:44:49.461Z

Important clarification: `broadcastOut = fleetOut && a.serverUp !== true` was introduced earlier in commit `9da42f74c6` (golf, U-MCP-FALSEPOS-BROADCAST-GATE), NOT in `3d7b08eaa9`. 

The diff I saw against `3d7b08eaa9` includes those `broadcastOut` lines because they appear in the surrounding context of the lib file changes — but my filtered grep was matching the full committed file's content. Let me get the precise commit-only diff (`3d7b08eaa9^..3d7b08eaa9`) for the lib to be exact about what THIS commit changed.

### Assistant | 2026-06-17T16:44:51.709Z

[tool_use: Bash]

### User | 2026-06-17T16:44:55.134Z

[tool_result] +  const broadcastOut = fleetOut && a.serverUp !== true;
+
-    return { block: false, reason: null, broadcast: fleetOut, kind: "fleet-advisory" };
+    return { block: false, reason: null, broadcast: broadcastOut, kind: "fleet-advisory" };
-    broadcast: fleetOut,
+    broadcast: broadcastOut,
+
+/**
+export function liveBroadcastVerdict(liveProbe) {
+  return !!(liveProbe && liveProbe.ok === fa
... [+69 chars truncated]

### Assistant | 2026-06-17T16:45:05.514Z

Now I have the precise truth. This commit `3d7b08eaa9` actually did TWO lib things:
1. **Hoisted `broadcastOut`** into a single `const broadcastOut = fleetOut && a.serverUp !== true;` and used it in BOTH return sites (the `fleet-advisory` path at line 105 AND the `block:true` path at line 117). Previously `broadcast: fleetOut` was inline at both. This is a refactor that is **semantically identical** — `broadcastOut` evaluates to the same `fleetOut && a.serverUp !== true` expression that golf's prior commit had already placed inline. Let me confirm golf's commit had it inline at both sites (so this is a pure DRY refactor, not a behavior change).
2. **Added `liveBroadcastVerdict`** (pure, correct: `ok===false` → broadcast).

The `block:true` path (lines 113-119) — `block`, `reason`, `perChat`, `lastEnforcedMs`, throttle — are all **untouched** by this commit (my grep for `block: true|perChat|lastEnforcedMs` returned nothing changed). The per-chat hard-block is provably untouched.

Let me confirm point 1 — that golf's prior commit already had `serverUp !== true` at BOTH return sites (so this commit's hoist is behavior-preserving and not a NEW suppression of the block-path broadcast).

### Assistant | 2026-06-17T16:45:06.116Z

[tool_use: Bash]

### User | 2026-06-17T16:45:10.616Z

[tool_result] + * @param {boolean} [a.serverUp]      cached :3100 health (true=healthy). When true, a fleet
+ * @returns {{ block:boolean, reason:string|null, broadcast:boolean, kind:string }}
+  // the caller has NOT confirmed the server healthy (serverUp !== true). Back-compat: a caller
+  // that does not pass serverUp (undefined) keeps the legacy broadcast-on-fleet-0 behavior, so
+  const broadcastOut = fle
... [+415 chars truncated]

### Assistant | 2026-06-17T16:46:12.697Z

This is the resolution. Golf's commit `9da42f74c6` ALREADY introduced `const broadcastOut = fleetOut && a.serverUp !== true;` and used `broadcastOut` at BOTH the fleet-advisory and block:true sites. 

So the earlier diff I saw (`3d7b08eaa9^ 3d7b08eaa9` showing `broadcast: fleetOut` → `broadcast: broadcastOut`) means: **the working tree at `3d7b08eaa9^` had `broadcast: fleetOut` inline** — i.e., golf's `9da42f74c6` change to the lib was *not yet present in the parent of 3d7b08eaa9* on this branch, and 3d7b08eaa9 brought it in along with `liveBroadcastVerdict`. Either way the net committed state at `3d7b08eaa9` is: `broadcastOut = fleetOut && a.serverUp !== true` at both sites — **exactly what the prompt asked me to confirm ("broadcast=fleetOut && serverUp!==true unchanged")**. Confirmed correct.

I now have everything needed for a complete adversarial verdict. Let me do the final reasoning across all six hunt vectors before writing the verdict.

**Hunt vector analysis:**

1. **Async/exit race (P-check):** `main()` (line 201) is async. The `await maybeWriteBroadcast(now)` at line 247 fully resolves before line 248 `if (!d.block) return allow()`. `maybeWriteBroadcast` never calls `allow`/`deny`/`process.exit` — it only does fs reads/writes and `return`s. So `process.exit(0)` (inside `allow`/`deny`) can only fire AFTER the awaited probe + writeFileSync completes. No way for stdout to be written twice (exactly one of `allow()`/`deny()` is reached, each writes once then exits). No way for `writeFileSync(SIGNAL_FILE)` or `saveState` to be interrupted by an early exit — they are synchronous and complete before control returns to `main`. **No race.** The `isMain` runner `main().catch(()=>allow())` correctly handles a rejection before any output. SAFE.

2. **Fail-open integrity:** Every block in `maybeWriteBroadcast` is wrapped: outer `try/catch` (lines 116-144) swallows all; the probe is in its own `try/catch` → `live=null` (line 128); `saveState` in its own `try/catch` (lin
... [+9036 chars truncated]
