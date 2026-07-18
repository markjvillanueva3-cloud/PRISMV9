---
type: "chat-session"
source: "claude-code-cli"
session_id: "a0a74c41-2bd4-4650-b52c-94b448b82813"
title: "Review H:/prism/docker/hook-broker/server.mjs (just created, ~270 LOC, HTTP brok"
date: "2026-05-22"
first_ts: "2026-05-22T23:25:20.061Z"
last_ts: "2026-05-22T23:26:14.510Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-aba3341ab95839441.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review H:/prism/docker/hook-broker/server.mjs (just created, ~270 LOC, HTTP brok

> **claude-code-cli** | 2026-05-22 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-aba3341ab95839441.jsonl`

## Transcript

### User | 2026-05-22T23:25:20.061Z

Review H:/prism/docker/hook-broker/server.mjs (just created, ~270 LOC, HTTP broker daemon) + its test file H:/prism/docker/hook-broker/server.test.mjs (~340 LOC, 18 hermetic tests, all pass).

Context: U-DOCKER-HOOK-BROKER-P2 — Tier-1 broker that holds the 78 module-safe hooks warm in memory. Reads HOOK-BROKER-COMPAT-REPORT.json (from U-DHB-P1, just shipped), dynamic-imports each module-safe hook, caches the callable default export, serves them over HTTP. Routes: GET /healthz, GET /loaded, POST /reload, POST /hook/:name. NO Dockerfile yet — that's P3.

Read both files end-to-end. Audit:
1. `loadHooks` — dynamic-import with cache-busting URL (`?t=${now}`). Is the cache busting sufficient when the same loadHooks runs multiple times within the same millisecond? (Spec calls /reload "hot reload"; tests run fast in series — multiple loads in ms-bucket would race.)
2. `invokeHook` — Promise.race with timeout. Is the timer correctly cleared on race-win by the handler? Currently `finally { if (timer) clearTimeout(timer); }` — verify the timer reference survives the race.
3. Path safety on POST /hook/:name — the check rejects names containing `/` or `..`. Is that enough? What about absolute paths, URL-encoded slashes (`%2F`), control chars, very long names?
4. Body cap handling — `readBody` rejects + `req.destroy()` on overrun. Connection-reset semantics OK for clients?
5. Handler invocation — `Promise.resolve().then(() => hook.handler(stdinText))` wraps sync exceptions into rejection. Verify this works for `throw new Error()` inside a sync handler AND inside an async handler.
6. Server shutdown — does the test cleanup correctly close servers + await close? Any leaked sockets if a test fails mid-run?
7. Pre-Write hook flagged `promise-race-uncaught` + several `floating-promise` + `unhandled-promise` — verify all are false positives or fix.

Report P0/P1/P2 + PASS/FAIL grade. Under 400 words.

### Assistant | 2026-05-22T23:25:35.836Z

I'll review both files end-to-end.

### Assistant | 2026-05-22T23:25:36.280Z

[tool_use: Read]

### User | 2026-05-22T23:25:40.886Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * server.mjs — U-DOCKER-HOOK-BROKER-P2 (Tier-1 broker daemon)
4	 *
5	 * HTTP server that holds module-safe `.claude/hooks/*.mjs` warm in memory.
6	 * Reads `state/shared/HOOK-BROKER-COMPAT-REPORT.json` (produced by
7	 * `scripts/classify-hooks-for-broker.mjs`), dynamic-imports every hook
8	 * classified as `module-safe`, caches the exports, and routes incoming
9	 * P
... [+11503 chars truncated]

### Assistant | 2026-05-22T23:25:44.227Z

[tool_use: Read]

### User | 2026-05-22T23:25:46.560Z

[tool_result] 1	/**
2	 * server.test.mjs — U-DOCKER-HOOK-BROKER-P2
3	 *
4	 * Hermetic tests for the broker HTTP server. Builds synthetic hook files
5	 * in a temp dir, drives `loadHooks` + `invokeHook` directly, and stands
6	 * up a `createBrokerServer()` on a random port to verify the routes.
7	 */
8	
9	import { describe, it } from "node:test";
10	import assert from "node:assert/strict";
11	import { mkdtempSyn
... [+14066 chars truncated]

### Assistant | 2026-05-22T23:26:14.510Z

## Code Quality Analysis Report

### Summary
- Overall Quality Score: 7.5/10
- Files Analyzed: 2 (server.mjs ~304 LOC + server.test.mjs ~349 LOC)
- Issues Found: 5 (1 P1, 4 P2)
- Grade: **PASS** (with P1 to address before P3 Dockerfile lands)

### P1 — Same-millisecond reload race (cache-busting insufficient)
**File:** `H:/prism/docker/hook-broker/server.mjs:122,128`
`const now = Date.now()` is captured ONCE per `loadHooks()` call, then the SAME `now` is appended to every URL in that batch. Two reloads landing in the same ms-bucket produce identical `?t=` suffixes → Node's ESM loader returns the cached module, defeating the "hot reload" contract. Tests don't catch this because they never call `loadHooks` twice in the same ms.
**Fix:** Use a strictly-monotonic counter or per-file randomness: `?t=${now}-${++reloadSeq}` (module-level counter) or `?t=${now}-${randomBytes(4).toString("hex")}`. The dedicated test below would have caught it — add one.

### P2 — Path-safety surface is narrow
**File:** `server.mjs:236-240`
After `decodeURIComponent`, the check rejects `/` and `..` but accepts: null bytes (`\0`), backslashes (`\`, a Windows path separator — `loaded.get()` won't match but the rejection should be explicit), control chars (CR/LF for log injection), and unbounded length. The Map lookup is the actual safety boundary (nothing escapes to fs), so this is defense-in-depth, not exploitable today.
**Fix:** Single allowlist regex — `/^[A-Za-z0-9_-]{1,128}$/` matches existing hook naming convention.

### P2 — Body-cap leaks bytes
**File:** `server.mjs:187-194`
On overrun, `rejectBody()` fires but `chunks.push(chunk)` already ran for the overrunning chunk. Then `req.destroy()` may race with further `data` events that `chunks.push()` after the reject. Memory is freed when the promise settles, but the `chunks` array briefly holds >MAX bytes.
**Fix:** Set a `rejected` flag, early-return from the `data` handler once set, and don't push the offending chunk.

### P2 — `t0` dead 
... [+1582 chars truncated]
