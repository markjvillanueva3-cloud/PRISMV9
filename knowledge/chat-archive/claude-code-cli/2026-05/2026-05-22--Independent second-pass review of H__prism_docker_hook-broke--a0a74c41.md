---
type: "chat-session"
source: "claude-code-cli"
session_id: "a0a74c41-2bd4-4650-b52c-94b448b82813"
title: "Independent second-pass review of H:/prism/docker/hook-broker/server.mjs (~270 L"
date: "2026-05-22"
first_ts: "2026-05-22T23:25:20.068Z"
last_ts: "2026-05-22T23:26:17.995Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a2a3b7e76da29ed96.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent second-pass review of H:/prism/docker/hook-broker/server.mjs (~270 L

> **claude-code-cli** | 2026-05-22 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a0a74c41-2bd4-4650-b52c-94b448b82813/subagents/agent-a2a3b7e76da29ed96.jsonl`

## Transcript

### User | 2026-05-22T23:25:20.068Z

Independent second-pass review of H:/prism/docker/hook-broker/server.mjs (~270 LOC, just created) + H:/prism/docker/hook-broker/server.test.mjs (~345 LOC, 18 hermetic tests, all pass).

This is U-DOCKER-HOOK-BROKER-P2 — Tier-1 hook broker daemon that listens on localhost:9876 and serves 78 module-safe hooks via HTTP. The broker reads a JSON compat report (state/shared/HOOK-BROKER-COMPAT-REPORT.json from U-DHB-P1), dynamic-imports each module-safe hook, caches the callable default exports. Wrong behavior here = corrupted cross-chat state under production load.

Weight the review on:
1. **Multi-chat safety** — 26 chat slots share this broker. A handler in one chat completing or throwing must not affect other in-flight invocations. Look at `loaded` Map mutation patterns + the `invokeHook` race semantics. Any shared mutable state that could leak across requests?
2. **Race in `loadHooks`** — between `loaded.clear()` and the loop that re-populates, an inflight `invokeHook` would lookup against an empty Map → 404 spuriously. Is this OK? (Spec says /reload is rare, but multi-chat concurrent /reload?)
3. **Timer leak on race-win by handler** — `setTimeout` returns a Timeout; Promise.race resolves with the handler's value, then `finally` clears the timer. But if the handler resolves first AND the timer hasn't fired, we still hold the Timeout reference. On Node 18+, leaking timers prevents process exit. Tests pass because the test process exits anyway — production broker would slowly leak.
4. **Path injection on POST /hook/:name** — check `name.includes("/") || name.includes("..")` is the only guard. What about `name = "foo%00bar"` (null byte), `name = "foo\\bar"` (backslash on Windows), `name = "."`, `name = ""`, `name = "..%2F.."`?
5. **No CSRF / origin check** — broker listens on 127.0.0.1. Is that enough? Any other Node process on the box can hit any hook. Acceptable for Tier-1?
6. **Cache-bust collision** — `import(url + "?t=" + now)` — two simultaneous loadHooks within t
... [+420 chars truncated]

### Assistant | 2026-05-22T23:25:34.958Z

I'll review the broker daemon and tests.

### Assistant | 2026-05-22T23:25:35.491Z

[tool_use: Read]

### User | 2026-05-22T23:25:40.292Z

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

### Assistant | 2026-05-22T23:25:44.527Z

[tool_use: Read]

### User | 2026-05-22T23:25:46.644Z

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

### Assistant | 2026-05-22T23:26:17.995Z

# Independent Second-Pass Review — server.mjs + server.test.mjs

## Verdict: **FAIL** (one P0 + four P1)

## P0 — Module-level state across concurrent requests

`loaded`/`failures`/`ready` are module-scoped, mutated by `loadHooks()` and `resetBrokerState()`. The broker is single-process, so multi-chat 26-slot traffic interleaves on the same Map. **No inflight tracking, no read-write lock.** A `POST /reload` arriving while `POST /hook/foo` is executing follows this exact path:

1. `invokeHook("foo")` enters `Promise.race`, captures `hook.handler` reference (safe — local var).
2. `/reload` calls `loadHooks()` → `loaded.clear()` → empties Map.
3. A *second* `POST /hook/foo` arriving between steps 2 and the re-populate loop hits `loaded.get("foo") === undefined` → spurious 404 to a healthy hook.
4. Window is ~tens-of-ms per hook × 78 hooks = potentially seconds of 404s during reload.

Fix: build a `Map` *locally* in `loadHooks`, then `loaded = newMap` swap-assign atomically; or guard `/reload` with a `reloadInFlight` lock that 503s concurrent reload + queues `/hook/*` until done. (Q2: not OK — multi-chat /reload is realistic during slot worktree cutovers.)

## P1-A — Cache-bust collision (your Q6 confirmed)

`?t=${now}` with `now = Date.now()` captured *outside* the loop produces an identical URL for every hook in one load AND an identical URL across two `loadHooks` calls in the same ms. Node's import cache keys on the resolved URL — second loadHooks within 1ms re-uses the stale modules. Fix: `?t=${Date.now()}-${Math.random()}` or `performance.now()` per-file inside the loop.

## P1-B — Path-injection guard incomplete (your Q4 confirmed)

`name.includes("/") || name.includes("..")` misses: backslash on Windows (`foo\\bar` resolves through fs APIs), `name === ""` (empty after slice — currently caught by `!name` ✓), null byte `foo\x00bar` (Map lookup succeeds but corrupts logs), URL-encoded `%5C` decodes to `\`. Replace with allowlist: `/^[a-z0-9][a-z0-9._-]{0,127}$/i`.


... [+1774 chars truncated]
