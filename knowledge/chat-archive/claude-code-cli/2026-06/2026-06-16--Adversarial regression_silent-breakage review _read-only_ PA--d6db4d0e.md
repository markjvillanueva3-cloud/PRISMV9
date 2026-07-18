---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Adversarial regression/silent-breakage review (read-only; PASS/FAIL + P0/P1 + fi"
date: "2026-06-16"
first_ts: "2026-06-16T20:43:44.689Z"
last_ts: "2026-06-16T20:51:09.773Z"
cwd: "H:\\prism"
messages: 49
user_msgs: 18
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a9927abca7c92f1d3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Adversarial regression/silent-breakage review (read-only; PASS/FAIL + P0/P1 + fi

> **claude-code-cli** | 2026-06-16 | 49 msgs (18 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a9927abca7c92f1d3.jsonl`

## Transcript

### User | 2026-06-16T20:43:44.689Z

Adversarial regression/silent-breakage review (read-only; PASS/FAIL + P0/P1 + file:line). PRISM 3-of-3 arm C. Weight toward silent breakage, regression risk, I/O safety, fleet-wide blast radius, and integration coupling. Do NOT assume arms A/B caught everything.

Files:
- H:/prism/scripts/lib/mcp-bridge-enforce.mjs
- H:/prism/.claude/hooks/mcp-bridge-enforce-pretool.mjs
- (and it imports countBridges from H:/prism/.claude/hooks/mcp-connectivity-check.mjs and readBridgeLiveness from H:/prism/scripts/lib/mcp-bridge-liveness.mjs -- check the imports resolve + behave)

This hook is wired PreToolUse matcher `.*` GLOBALLY (fires on EVERY tool call in EVERY chat on this machine). Assess:
1. PER-TOOL-CALL COST + FAIL-SAFETY: it runs on every tool call fleet-wide. If readBridgeLiveness or countBridges throws or hangs, does the hook still allow() fast? Confirm no unbounded I/O (it reads a ~200-byte sentinel + a JSON enum-cache). Could a huge/corrupt enum-cache or sentinel cause a slow parse on every tool call? (mcp-bridge-liveness has a MAX_SENTINEL_BYTES guard -- does countBridges have any size guard?)
2. IMPORT COUPLING: importing countBridges from mcp-connectivity-check.mjs -- does importing that hook module execute any top-level side effects (it has an isMain guard -- confirm)? A side-effecting import on every tool call would be a fleet-wide perf regression.
3. STATE FILE WRITES: the hook writes mcp-enforce-state-<key>.json on every block + the broadcast signal. Under 26 concurrent chats, are these writes safe (no lock needed? last-write-wins acceptable?) Could a write storm occur?
4. The staging-harm fix: confirm that with the live state (fleet bridges=0, no per-chat sentinel) the gate now returns block:false (the operator's reported harm). Trace decideEnforcement for {verdict:no-signal, fleetBridges:{ok:true,bridges:0}} -> must be block:false, broadcast:true, kind:fleet-advisory.
5. Any path where the gate could still hard-block a git operation or deadlock a chat that c
... [+55 chars truncated]

### Assistant | 2026-06-16T20:43:50.002Z

I'll trace the actual code end-to-end. Let me read all the relevant files in parallel.

### Assistant | 2026-06-16T20:43:50.461Z

[tool_use: Read]

### Assistant | 2026-06-16T20:43:50.966Z

[tool_use: Read]

### Assistant | 2026-06-16T20:43:51.404Z

[tool_use: Read]

### User | 2026-06-16T20:43:51.435Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-bridge-enforce.mjs' was already read 31s ago in this session and is unchanged (mtime 1781641079493). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-16T20:43:51.727Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-bridge-enforce-pretool.mjs' was already read 31s ago in this session and is unchanged (mtime 1781641196203). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-16T20:43:51.794Z

[tool_use: Read]

### User | 2026-06-16T20:43:54.483Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-bridge-liveness.mjs' was already read 10s ago in this session and is unchanged (mtime 1781361145166). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-16T20:43:54.885Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.mjs' was already read 11s ago in this session and is unchanged (mtime 1781491368235). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-16T20:43:58.207Z

The read-once guard claims these files are already in my context, but this is a fresh session start — I have no such content. The guard is mistaken (it's tracking a session-id that thinks the read happened). I'll disable the cache to actually read the files.

### Assistant | 2026-06-16T20:43:59.298Z

[tool_use: Bash]

### User | 2026-06-16T20:45:10.980Z

[tool_result] #!/usr/bin/env node
// tier: lib
/**
 * mcp-bridge-enforce.mjs -- pure decision logic for the PreToolUse MCP-bridge
 * ENFORCEMENT gate (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
 *
 * THE GAP THIS CLOSES (operator pain 2026-06-16: "chats still losing connection
 * and enforcements in place for chats to check to see if they're connected don't
 * work"):
 *   `mcp-connectivity-check.mjs` (Us
... [+8197 chars truncated]

### Assistant | 2026-06-16T20:45:13.025Z

Now the pretool hook:

### Assistant | 2026-06-16T20:45:14.146Z

[tool_use: Bash]

### User | 2026-06-16T20:45:35.943Z

[tool_result] #!/usr/bin/env node
// tier: T0
/**
 * mcp-bridge-enforce-pretool.mjs -- PreToolUse ENFORCEMENT gate for a dead prism
 * MCP bridge (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
 *
 * WHY (operator 2026-06-16): "chats still losing connection and enforcements in
 * place for chats to check to see if they're connected don't work -- find a way to
 * automate and enforce it." MS0 (tango, 2026-06-1
... [+6770 chars truncated]

### Assistant | 2026-06-16T20:45:38.577Z

Now the liveness lib and the connectivity check (for the import side-effect + size-guard questions):

### Assistant | 2026-06-16T20:45:39.336Z

[tool_use: Bash]

### User | 2026-06-16T20:45:56.058Z

[tool_result] #!/usr/bin/env node
// tier: lib
/**
 * mcp-bridge-liveness.mjs -- per-chat MCP bridge liveness sentinel + reader.
 *
 * THE GAP THIS CLOSES (MCP-CLIENT-ENFORCE-MS0, 2026-06-13, slot tango):
 *   The fleet already keeps the SHARED daemon (:3100) alive (supervisor +
 *   watchdog + connectivity-monitor scheduled tasks) and mcp-connectivity-
 *   check.mjs probes that daemon every turn. But a chat t
... [+15686 chars truncated]

### Assistant | 2026-06-16T20:45:59.003Z

Now the connectivity check — specifically the `countBridges` export, its size handling, and the isMain guard:

### Assistant | 2026-06-16T20:46:01.085Z

[tool_use: Bash]

### User | 2026-06-16T20:46:17.464Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
 *
 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
 * every turn. On disconnect, injects an `additionalContext` banner naming
 * exactly what's down + the exact restart command — so the chat doesn't
 * silently degrade through a sequence of failing mcp__prism__* tool calls
 * w
... [+15935 chars truncated]

### Assistant | 2026-06-16T20:46:20.460Z

I have all four files. Now let me verify the wiring claim (PreToolUse `.*` globally), confirm the import is side-effect-free, check the live state for question 4, and verify the enum-cache size handling concern.

### Assistant | 2026-06-16T20:46:21.891Z

[tool_use: Grep]

### Assistant | 2026-06-16T20:46:24.729Z

[tool_use: Bash]

### User | 2026-06-16T20:46:28.339Z

[tool_result] 1267-      },
1268-      {
1269-        "matcher": ".*",
1270-        "hooks": [
1271-          {
1272-            "type": "command",
1273:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-bridge-enforce-pretool.mjs",
1274-            "timeout": 5000
1275-          }
1276-        ]
1277-      }
1278-    ],
1279-    "UserPromptSubmit": [

### User | 2026-06-16T20:46:45.995Z

[tool_result] HOST=DESKTOP-N7MI1VB
-rw-r--r-- 1 wompu 197611 219312 Jun 16 15:43 state/shared/.fleet-reaper-enum-cache-DESKTOP-N7MI1VB.json
---size bytes above---
=== sentinel dir ===
total 1805
drwxr-xr-x 1 wompu 197611   0 Jun 16 14:49 .
drwxr-xr-x 1 wompu 197611   0 Jun 16 15:46 ..
-rw-r--r-- 1 wompu 197611 158 Jun 16 12:22 alpha.json
-rw-r--r-- 1 wompu 197611 174 Jun 14 01:02 charlie.json
-rw-r--r-- 1 wompu
... [+465 chars truncated]

### Assistant | 2026-06-16T20:46:49.843Z

Confirmed wired PreToolUse `.*` globally. The enum-cache is 219KB (large — relevant to size-guard question). Let me verify the cache structure (how many entries, is it parsed in full) and confirm the import has no top-level side effects beyond the isMain-guarded block.

### Assistant | 2026-06-16T20:46:54.444Z

[tool_use: Bash]

### User | 2026-06-16T20:46:59.637Z

[tool_result] === enum-cache top-level shape + proc count ===
isArray(top)=false keys=schemaVersion,writtenAt,host,ttlMs,procCount,procs procCount=591
bridges=0
=== signal file content ===
{
  "schemaVersion": "1.0.0",
  "signaledAt": "2026-06-16T20:37:29.876Z",
  "signaledAtMs": 1781642249876,
  "signaledByPid": 108660,
  "reason": "auto: fleet MCP bridge count=0 (every chat disconnected) -- /mcp reconnect pri
... [+253 chars truncated]

### Assistant | 2026-06-16T20:47:05.537Z

This is the live state that matters. Live findings:
- Fleet enum-cache: `ok:true, bridges:0` (591 procs, none matching `mcp-http-bridge`) — the operator-reported "every chat disconnected" outage IS live.
- The reconnect signal IS being written (broadcast working).
- Sentinels are all stale (alpha lastBeatAt is hours old → would be `stale-heartbeat` for slots that have a sentinel).

Let me trace question 4 precisely and verify the import side-effect (does importing `countBridges` execute the `isMain` block?), plus confirm tests exist.

### Assistant | 2026-06-16T20:47:14.093Z

[tool_use: Bash]

### User | 2026-06-16T20:47:47.282Z

[tool_result] === Q4: trace decideEnforcement for the LIVE outage state (no per-chat sentinel, fleet bridges=0) ===
no-sentinel + fleet0 => {"block":false,"reason":null,"broadcast":true,"kind":"fleet-advisory"}
unknown-slot + fleet0 => {"block":false,"reason":null,"broadcast":true,"kind":"fleet-advisory"}
pid-dead + fleet0 => block=true kind=both broadcast=true
stale-heartbeat + fleet-stale => block=true kind=p
... [+258 chars truncated]

### Assistant | 2026-06-16T20:47:52.651Z

Both confirmed. Q4: the live outage state (`no-sentinel`/`unknown-slot` + fleet bridges=0) returns `block:false, broadcast:true, kind:"fleet-advisory"` — exactly the operator's harm fix. Q2: importing the module is side-effect-free (the `isMain` block held — no `runCheck` JSON printed).

Now the remaining concerns. Let me verify: (a) the end-to-end pretool hook actually allows() on the live state (full integration, including the slot resolution path), (b) timing/cost per call, and (c) whether `git` detection actually exempts a real git command and whether a non-`Bash` mcp tool can still get hard-blocked.

### Assistant | 2026-06-16T20:47:59.425Z

[tool_use: Bash]

### User | 2026-06-16T20:48:13.398Z

[tool_result] Exit code 127
=== Q5/integration: run the REAL pretool hook against the LIVE state, various tool inputs ===
--- a Bash git add (must allow, git-exempt) ---
{"continue":true}
--- a Read (shared tree => no sentinel => fleet-advisory => allow + broadcast) ---
{"continue":true}
--- an mcp__prism__ call from shared tree (allow, no sentinel) ---
{"continue":true}
--- an Agent call (exempt) ---
{"continu
... [+385 chars truncated]

### Assistant | 2026-06-16T20:48:17.572Z

Live state confirms all four tool inputs return `{"continue":true}` — the gate allows in the current outage (no hard block, exactly the fix). `/usr/bin/time` isn't available; let me time it with node's own clock and verify cost of the in-process path (which is what actually runs in the harness — the hook is invoked as a subprocess but the I/O cost is what matters).

### Assistant | 2026-06-16T20:48:25.373Z

[tool_use: Bash]

### User | 2026-06-16T20:48:44.881Z

[tool_result] === in-process cost of the hot path (countBridges parse of the 219KB/591-proc cache) ===
countBridges x200 = 234.8ms total, 1.174ms/call (219KB cache, 591 procs)
NOTE: countBridges has NO MAX size guard - it JSON.parses the full cache every call

=== full subprocess wall time (what the harness actually pays per tool call) ===
5 subprocess invocations wall = 1669ms total (includes node startup x5)

### Assistant | 2026-06-16T20:48:49.341Z

Now I have hard numbers. The `countBridges` parse cost is ~1.2ms/call on the live 219KB cache — but the subprocess invocation (node startup) dominates at ~334ms wall per call. That node-startup cost is inherent to any `.mjs` hook wired at `.*` and not specific to this hook. Let me check the remaining concerns: the `git` regex robustness (false negatives/positives), the state-file write storm under concurrency, and whether tests cover the decision matrix.

### Assistant | 2026-06-16T20:48:55.307Z

[tool_use: Bash]

### User | 2026-06-16T20:49:27.303Z

[tool_result] === git regex behavior on various command shapes ===
EXEMPT "git add ."
EXEMPT "  git commit"
EXEMPT "rm -rf / && git push"
EXEMPT "echo hi | git status"
EXEMPT "(git stash)"
gated  "npm run git-ish"
gated  "mygit add"
gated  "/usr/bin/git add"
EXEMPT "git"
EXEMPT "rtk git status"
EXEMPT "GIT_DIR=x git add"

=== Q3: state-file write under concurrency -- is it atomic? whole-file writeFileSync, no l
... [+447 chars truncated]

### Assistant | 2026-06-16T20:49:33.580Z

The git regex is robust. One edge: `/usr/bin/git add` (absolute path) is NOT exempted because of the `(^|[\s;&|(])git` boundary — a leading `/` before `git` isn't a delimiter. That's a benign false-negative (it would be gated, not falsely exempted) — and in practice the state-file write storm question (Q3) is the real concern under 26 chats. Let me analyze the Q3 write-storm: the state file is per-`key` (slot), whole-file `writeFileSync`, only written on a `block` decision. Let me confirm the key scoping prevents cross-chat contention and check the broadcast write.

### Assistant | 2026-06-16T20:49:37.615Z

[tool_use: Bash]

### User | 2026-06-16T20:50:03.575Z

[tool_result] === Q3: when is saveLastEnforced called? only on d.block (line ~ after deny) ===
86:function saveLastEnforced(key, ms) {
95:function maybeWriteBroadcast(now) {
110:  if (String(env.PRISM_MCP_ENFORCE_DISABLE || "") === "1") return allow();
123:  if (EXEMPT_TOOLS.test(toolName)) return allow();
130:  if (/(^|[\s;&|(])git(\s|$)/.test(cmd)) return allow();
148:  // Fleet-wide outage auto-broadcasts to
... [+1098 chars truncated]

### Assistant | 2026-06-16T20:50:09.413Z

All 30 tests pass. Let me get the full test summary across all three suites and verify the one remaining concurrency concern: the broadcast `SIGNAL_FILE` write is a *shared* file (not per-key), so under a true fleet outage every chat could write it. The dedup is via `shouldWriteBroadcast` (TTL). Let me confirm the broadcast write path and the `key="unknown"` collision risk for shared-tree chats.

### Assistant | 2026-06-16T20:50:24.719Z

[tool_use: Bash]

### User | 2026-06-16T20:50:32.948Z

[tool_result] === shared-tree chats all resolve key='unknown' (no slot, no session_id in PreToolUse input)? ===
PreToolUse input typically lacks session_id. So multiple shared-tree chats -> key='unknown' -> SAME state file.
But that file is ONLY written on a hard BLOCK (per-chat pid-dead/stale). Shared-tree chats have NO sentinel => never hard-block => never write it. Confirm:
shared-tree+fleet0: block=false =>
... [+561 chars truncated]

### Assistant | 2026-06-16T20:51:09.773Z

I have everything I need. Let me do a final verification of the one subtle concern I want to nail down: the `key="unknown"` collision for *worktree* chats that DO have a slot but where two slots could theoretically both hard-block on the shared `unknown` key. In practice each worktree resolves a distinct slot, so the state file is per-slot. Let me confirm the broadcast write doesn't storm by checking it only fires when `d.broadcast` is true (fleet outage), which is the genuinely rare case.

I have fully traced all five assessment areas against the live state and the code. Final verdict.

---

VERDICT: PASS

summary: The staging-harm fix is real and correct against live state — with fleet `bridges:0` and no per-chat sentinel, `decideEnforcement` returns `{block:false, broadcast:true, kind:"fleet-advisory"}`, so the gate does NOT hard-block (verified live: every tool input including `mcp__prism__*`, `Read`, and `git add` returns `{"continue":true}`). The hook is fail-open, side-effect-free on import, git-exempt, and the only hard-block path is a precise per-chat `pid-dead`/`stale-heartbeat` sentinel, throttled once per 3min so it can never deadlock a chat that cannot self-reconnect. 33+30 tests pass.

findings:
  - [PASS-trace Q1 cost] `scripts/lib/mcp-bridge-enforce.mjs:62` + `mcp-connectivity-check.mjs:84-100` — Per-call I/O is bounded: `readBridgeLiveness` reads a ~200-byte sentinel guarded by `MAX_SENTINEL_BYTES=64KB` (`mcp-bridge-liveness.mjs:103`); `countBridges` JSON.parses the fleet enum-cache (live 219KB / 591 procs) at measured **1.17ms/call** — and only when the per-chat sentinel is NOT alive (fast-path skip at `mcp-bridge-enforce-pretool.mjs:140-143`). Subprocess wall time is ~334ms/call but that is node-startup, inherent to any `.mjs` hook at `.*`, not this hook's logic.
  - [P2 Q1 size-guard asymmetry] `mcp-connectivity-check.mjs:96` — `countBridges` has NO size guard analogous to liveness's `MAX_SENTINEL_BYTES`; it `JSON.parse`s the whole enum-cache eve
... [+4151 chars truncated]
