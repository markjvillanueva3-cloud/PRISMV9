---
type: "chat-session"
source: "claude-code-cli"
session_id: "da9aacf5-7d0a-4de6-899e-d8a50c78583a"
title: "You are arm A (content-specialist) of PRISM's per-file scrutiny gate. Review the"
date: "2026-05-31"
first_ts: "2026-05-31T21:47:28.632Z"
last_ts: "2026-05-31T21:50:49.578Z"
cwd: "H:\\prism-slot-alpha"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a2ce4173abb872db4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# You are arm A (content-specialist) of PRISM's per-file scrutiny gate. Review the

> **claude-code-cli** | 2026-05-31 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/da9aacf5-7d0a-4de6-899e-d8a50c78583a/subagents/agent-a2ce4173abb872db4.jsonl`

## Transcript

### User | 2026-05-31T21:47:28.632Z

You are arm A (content-specialist) of PRISM's per-file scrutiny gate. Review these THREE files end-to-end (read each fully):

1. H:/prism/scripts/lib/mcp-reconnect-action.mjs   (the core — single-flight MCP-daemon reconnect ACTION)
2. H:/prism/scripts/lib/mcp-reconnect-action.test.mjs   (26-case hermetic node:test, all passing)
3. H:/prism/scripts/mcp-reconnect.mjs   (CLI wrapper)

CONTRACT it must satisfy (MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION):
- Operator rule: "if any chat slot is disconnected they automatically connect and check each turn to ensure you guys are always connected." This is the ACTION half. DETECTION already exists in .claude/hooks/mcp-connectivity-check.mjs (per-turn probe + banner) and .claude/hooks/mcp-daemon-autostart.mjs (SessionStart spawn via H:/prism/.claude/helpers/mcp-server-daemon.mjs start). The gap: nothing auto-reconnects MID-session each turn.
- This lib is called by the per-turn connectivity hook (a golf patch-sibling will wire it) with the hook's ALREADY-computed `up` boolean → maybeReconnect({up}). No double-probe.
- SINGLE-FLIGHT across up to 13 concurrent chats on ONE host (shared H: fs): an O_EXCL lockfile whose TTL doubles as the throttle. 13 chats must spawn AT MOST ONE daemon per TTL window — verify the lock logic actually guarantees this (no TOCTOU window that lets two chats both spawn).
- FAIL-SOFT: maybeReconnect must NEVER throw (a hook calls it). Verify every path is wrapped.
- DETACHED spawn (zero per-turn latency), reuses mcp-server-daemon.mjs start. Honest R12 reporting (no fake "spawned" when the helper is missing).
- DETERMINISTIC decision core (decideReconnect) — pure, fully covered.

Focus your review on: (a) single-flight correctness / race conditions / TOCTOU in decideReconnect + acquireReconnectLock + maybeReconnect; (b) the lock TTL-as-throttle reasoning — is there a flapping/spawn-storm failure mode?; (c) fail-soft completeness (any unwrapped throw path?); (d) clock-skew / future-dated-lock handling
... [+542 chars truncated]

### Assistant | 2026-05-31T21:47:38.414Z

I'll review all three files end-to-end against the contract. Let me read them fully.

### Assistant | 2026-05-31T21:47:38.847Z

[tool_use: Read]

### Assistant | 2026-05-31T21:47:39.339Z

[tool_use: Read]

### Assistant | 2026-05-31T21:47:39.565Z

[tool_use: Read]

### User | 2026-05-31T21:47:42.783Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+12564 chars truncated]

### User | 2026-05-31T21:47:43.842Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.test.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// Hermetic node:test for the single-flight reconnect action. Injected deps everywhere EXCEPT
4	// the real-fs O_EXCL lock round-trip + the CLI subprocess oracle (the two "hermetic fakes
5	// don't prove wiring" guards — the lock primitive and the main() path must be exercised li
... [+12381 chars truncated]

### User | 2026-05-31T21:47:44.764Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/mcp-reconnect.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION CLI (alpha, 2026-05-31).
3	//
4	// Probe the shared MCP daemon and, if down, single-flight a detached reconnect (see
5	// scripts/lib/mcp-reconnect-action.mjs). Directly runnable by any chat / scheduled task; the
6	// per-turn enforcement path is the connectivity hook calling maybeReconnect() (gol
... [+1957 chars truncated]

### Assistant | 2026-05-31T21:47:49.299Z

Now let me verify the sibling conventions the contract says this mirrors, and confirm the spawn target it claims to reuse.

### Assistant | 2026-05-31T21:47:49.814Z

[tool_use: Read]

### Assistant | 2026-05-31T21:47:50.062Z

[tool_use: Read]

### User | 2026-05-31T21:47:54.114Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+8910 chars truncated]

### User | 2026-05-31T21:47:56.160Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * mcp-daemon-autostart.mjs — SessionStart Hook
5	 *
6	 * Auto-starts the shared MCP HTTP daemon on session start.
7	 * This ensures all Claude chats share a single MCP server instance
8	 * instead of each spawning their own stdio process.
9	 *
10	 * @hook SessionStart
11	 */
12	
13	import { spawn } from "child_process";
14	import http from "http";
15	
1
... [+2573 chars truncated]

### Assistant | 2026-05-31T21:47:59.246Z

I have both sibling files. Let me verify the spawn target exists (R12 honesty depends on it) and the lock-dir path is real, then trace the single-flight race carefully.

### Assistant | 2026-05-31T21:48:01.092Z

[tool_use: Bash]

### User | 2026-05-31T21:48:18.939Z

[tool_result] H:/prism/.claude/helpers/mcp-server-daemon.mjs  7.2K
---STATE DIR---
H:/prism/state/shared/
---RUN TESTS---
  ...
# Subtest: CLI --probe-only --json emits valid JSON with a boolean up field
ok 25 - CLI --probe-only --json emits valid JSON with a boolean up field
  ---
  duration_ms: 3234.1433
  ...
# Subtest: CLI default run is fail-soft (exit 0) and JSON-parseable with --json
ok 26 - CLI default 
... [+198 chars truncated]

### Assistant | 2026-05-31T21:48:41.898Z

Spawn target exists, state dir exists, 26/26 pass. Now let me carefully analyze the single-flight TOCTOU race — the critical concern.

The race is in `maybeReconnect`: between `readLock` (line 144), `decideReconnect` (146), and `acquire` (152). Let me trace the concurrent-chat scenario closely.

**Critical analysis — the single-flight guarantee:**

The TOCTOU window is real but let me verify it cannot cause a double-spawn. Two chats both down, no lock exists:

1. Chat A: `readLock` → null. Chat B: `readLock` → null.
2. Both `decideReconnect` → `{shouldReconnect:true, reason:"no-lock"}`.
3. Both call `acquire(lockPath, info, {reclaimStale:false})`.
4. `acquireReconnectLock` uses `fs.writeFileSync(p, data, {flag:"wx"})` = `O_CREAT|O_EXCL`. **The kernel serializes this atomically.** Exactly one of A/B succeeds; the other gets `EEXIST`. Since `reclaimStale === false` for the no-lock path, the loser returns `false` immediately (line 90, not entering the reclaim branch). Loser → `lock-race-lost` skip, never spawns. **No double-spawn.** Correct.

**The stale-lock-reclaim race** — the subtle one:

Two chats both see the SAME stale lock (age ≥ TTL):
1. Both `decideReconnect` → `{shouldReconnect:true, reason:"stale-lock-reclaim"}`.
2. Both call `acquire` with `{reclaimStale:true}`.
3. Inside `acquireReconnectLock`: both `writeExclImpl` throw `EEXIST` (stale lock still present). Both enter the reclaim branch (line 85): `unlinkImpl(lockPath)` then retry `writeExclImpl`.
4. Chat A unlinks, Chat B unlinks (the second unlink is a no-op/swallowed). Then both retry `writeFileSync(wx)`. **Again O_EXCL serializes** — exactly one wins, one gets EEXIST → `catch { return false }` (line 88). **Only one spawns.** Correct.

But there is a **third-chat interleave** worth checking: Chat A reclaims (unlinks stale, writes fresh), and a third Chat C with `reclaimStale:false` (it read the lock as fresh between A's unlink and A's write?). Let me reason: C's `readLock` either reads the stale lock (
... [+1853 chars truncated]

### Assistant | 2026-05-31T21:48:48.559Z

[tool_use: Bash]

### User | 2026-05-31T21:49:29.928Z

[tool_result] readLock throw  => {"ok":false,"connected":null,"action":"error","reason":"internal: readfail"}
now throw       => {"ok":false,"connected":null,"action":"error","reason":"internal: nowfail"}
spawnImpl throw => {"ok":false,"connected":null,"action":"error","reason":"internal: spawnthrow"}
render(error)   => "   ⚠ auto-reconnect: internal error (x) — non-fatal."
decide({})      => {"shouldReconnect"
... [+88 chars truncated]

### Assistant | 2026-05-31T21:49:40.584Z

Every throw path inside `maybeReconnect` is caught by the outer `try/catch` (line 125-166) and returns `{ok:false, action:"error"}` — never throws into the hook. The `decideReconnect` defaults are also safe. Fail-soft is complete.

Now one important subtlety: the contract says this is called from a **UserPromptSubmit hook** which is async-capable, but `maybeReconnect` is **synchronous**. The caller passes `up` (already probed), so no async needed inside — correct. But note `acquireReconnectLock` does a **synchronous** `writeFileSync` — this is the single-flight primitive and must be sync to be atomic with the decision. Good. The only async is `probeDaemon` (CLI path), which the CLI awaits. Confirmed consistent.

Let me check one remaining concern: the `spawnDaemon` receives `opts` passthrough from `maybeReconnect` (line 155: `(opts.spawnDaemonImpl || spawnDaemon)(daemonHelper, opts)`). In production `opts` is the hook's call options — does passing it to the real `spawnDaemon` cause any issue? `spawnDaemon` reads `opts.existsImpl` and `opts.spawnImpl` — in production those are undefined so it falls back to real `fs.existsSync`/`spawn`. Safe. Let me verify the CLI passes no spurious impls.

The CLI (line 31) calls `maybeReconnect({ up: probe.up })` — `opts` has only `up`, so `spawnDaemon` gets `{up:...}` as its opts, reads no impls from it, uses real fs/spawn. Correct.

Let me verify the test for stale-lock-reclaim actually fails on regression (not a stub), and confirm convention conformance on the probe semantics.

### Assistant | 2026-05-31T21:49:47.106Z

[tool_use: Bash]

### User | 2026-05-31T21:50:13.923Z

[tool_result] age==ttl (60000) => {"shouldReconnect":true,"reason":"stale-lock-reclaim","lockAgeMs":60000}
age==ttl-1       => {"shouldReconnect":false,"reason":"reconnect-in-flight","lockAgeMs":59999}
probe 499 => {"up":true,"status":499,"error":null}
probe 500 => {"up":false,"status":500,"error":null}

### Assistant | 2026-05-31T21:50:49.578Z

Boundary is precise (`age < ttlMs` exclusive → at exactly ttl it reclaims) and probe threshold (`<500` = up) matches the sibling `mcp-connectivity-check.mjs` exactly (line 122 `res.statusCode < 500`). Convention conformance confirmed.

**Test integrity assessment:** The tests are real-behavior, not stubs. They assert concrete values (`r.pid === 4242`, `reclaimFlag === true`, `acq[0].o.reclaimStale === false`, `d.lockAgeMs === 5000`). The fresh-lock test (line 110-121) sets `acquireImpl` to `throw` and asserts it's never called — that test FAILS if the single-flight skip regresses to attempting acquire. The real-fs O_EXCL round-trip (line 205-221) exercises the actual lock primitive end-to-end including the EEXIST-loses and reclaim-wins paths. The CLI subprocess oracle runs the real `main()` and parses real JSON. These are meaningful "wiring" guards as claimed.

One gap in test coverage I want to confirm vs. claim: there is **no test of the concurrent stale-reclaim double-acquire** at the `acquireReconnectLock` level (two reclaimers racing the same stale lock). The real-fs test does single-threaded reclaim only. This is a P2 (the O_EXCL guarantee makes it correct by construction, and node:test can't easily fork two true-concurrent writers), not a P1.

I have enough to render a verdict. Let me record findings.

## Scrutiny Verdict — Arm A (content-specialist / code-analyzer)

**Files reviewed (read end-to-end):**
- `H:/prism/scripts/lib/mcp-reconnect-action.mjs`
- `H:/prism/scripts/lib/mcp-reconnect-action.test.mjs`
- `H:/prism/scripts/mcp-reconnect.mjs`

Plus sibling-convention cross-check against `mcp-connectivity-check.mjs` + `mcp-daemon-autostart.mjs`, spawn-target existence, and live execution of the suite (26/26) and adversarial probes.

### (a) Single-flight correctness / TOCTOU — PASS
The read→decide→acquire window in `maybeReconnect` (lib lines 144–153) does **not** admit a double-spawn. Creation IS the check: `acquireReconnectLock` (lines 73–92) uses `fs.wri
... [+4404 chars truncated]
