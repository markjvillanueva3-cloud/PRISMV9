---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Review the file `H:\\prism\\.claude\\helpers\\docker-hook-broker.mjs` end-to-end. Th"
date: "2026-05-15"
first_ts: "2026-05-15T19:49:18.998Z"
last_ts: "2026-05-15T19:49:57.210Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-adb1f6b7aa07dbdab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review the file `H:\prism\.claude\helpers\docker-hook-broker.mjs` end-to-end. Th

> **claude-code-cli** | 2026-05-15 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-adb1f6b7aa07dbdab.jsonl`

## Transcript

### User | 2026-05-15T19:49:18.998Z

Review the file `H:\prism\.claude\helpers\docker-hook-broker.mjs` end-to-end. This is the load-bearing client for the PRISM Docker hook broker (OBSIDIAN-INTELLIGENCE-MS3 / A1 / U-DOCKER-HOOK-BROKER).

CONTEXT YOU NEED TO KNOW:
- The broker server is at `H:\prism\scripts\docker\prism-hooks-broker-server.mjs` (you may read it for context — that's the HTTP server the client talks to).
- The envelope's A1 exit-condition #4 is **"Fallback to legacy in-process node execution if container is down (graceful degrade)"** — this file is the only thing that delivers that safety property. If fallback is wrong, every hook in PRISM breaks when Docker dies.
- Spec source: `H:\prism\state\shared\specs\2026-05-09-U-DOCKER-HOOK-BROKER.md`.
- Test file: `H:\prism\.claude\helpers\docker-hook-broker.test.mjs` — 11 tests, all pass.

WHAT TO ASSESS (P0/P1 only):
1. **Fallback correctness** — does network failure / timeout / 501 reliably route to spawn-fallback, with no path that silently swallows hook output?
2. **Non-501 5xx handling** — the design is "surface broker bugs, don't mask them". Verify a 500 from the broker doesn't accidentally fall back.
3. **Spawn safety** — `spawnFallback()` uses `H:/.claude/bin/portable-node` by default. Is the resolved hook path properly absolute (path-traversal-safe)? Does it handle child-process spawn errors?
4. **HTTP client integrity** — timer leaks, socket leaks, Content-Length correctness, payload string vs Buffer mismatches.
5. **Env-var defaults** — are they coherent with the server's defaults (server listens 0.0.0.0:9876; client targets 127.0.0.1:9876)?
6. **Concurrency** — is anything in the module state that breaks under parallel hook invocations?
7. **Karpathy R12 fail-loud** — does the module silently swallow any class of error?

Grade PASS / FAIL with confidence. List concrete P0/P1 findings with line citations. Skip P2/P3 (we'll defer).
Under 400 words.

### Assistant | 2026-05-15T19:49:24.846Z

I'll review the broker client end-to-end against the spec.

### Assistant | 2026-05-15T19:49:25.386Z

[tool_use: Read]

### User | 2026-05-15T19:49:32.753Z

[tool_result] 1	// PRISM Docker hook-broker client — OBSIDIAN-INTELLIGENCE-MS3 / U-DOCKER-HOOK-BROKER (A1).
2	//
3	// Routes a hook event to the running prism-hooks container at 127.0.0.1:9876 (HTTP) and,
4	// if the broker is unreachable or refuses, falls back to direct subprocess execution
5	// (the legacy path the harness uses today). The fallback path is the "graceful degrade"
6	// the envelope's exit-condi
... [+5331 chars truncated]

### Assistant | 2026-05-15T19:49:57.210Z

Acknowledged. The doctrine reminder is noted; this review is read-only and does not introduce a new manual workflow — I'm grading an existing client against its spec.

# Verdict: PASS (high confidence) with 2 P1 findings

## P0 findings
None. Fallback routing is correct: only `r.ok` returns broker-success; `501` and `status===0` (network/timeout/refused) go to `spawnFallback`; all other non-2xx surface as broker errors per the "don't mask bugs" doctrine (lines 94-100). No silent error swallowing — every `resolve()` returns a fully-shaped result object.

## P1 findings

**P1-1 — Spawn path-traversal vector (line 70).** `path.resolve(HOOKS_DIR, name)` resolves `..` segments, so `invokeHook({name: "../../../etc/passwd"})` (or a Windows equivalent like `..\\..\\..\\Users\\x\\evil`) escapes `HOOKS_DIR` and spawns whatever `.mjs` it lands on under portable-node. Caller is trusted today (harness wrapper), but the spec calls this "load-bearing" and the function is exported. Mitigation: after `path.resolve`, assert the result starts with `path.resolve(HOOKS_DIR) + path.sep`; reject otherwise. Also reject `name` containing `/`, `\`, or `\0`.

**P1-2 — `req.write` after possible early `resolve` (lines 53-58).** If `req.on("error")` fires synchronously (e.g., invalid header), the promise resolves, but execution still falls through to `req.write(payload); req.end()`. The second call on an errored request will throw an uncaught `ERR_STREAM_DESTROYED`/`ERR_STREAM_WRITE_AFTER_END` synchronously out of the Promise executor — surfaces as an unhandled exception in the calling hook, not a clean fallback. Mitigation: guard with a `settled` flag or move `req.write/req.end` above the listeners, or wrap in `try {} catch {}`.

## Items verified clean
- **Non-501 5xx**: line 100 surfaces `{ok:false, viaBroker:true, status, stderr}` — does NOT fallback. Correct per spec.
- **HTTP timers**: `t.unref()` (line 55) + `clearTimeout` on `close` (line 56) — no timer leak; `req.destroy()` on timeout 
... [+770 chars truncated]
