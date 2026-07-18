---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Independent second-pass review of TWO files (do NOT assume a prior reviewer caug"
date: "2026-05-31"
first_ts: "2026-05-31T03:04:09.427Z"
last_ts: "2026-05-31T03:09:46.503Z"
cwd: "H:\\prism-slot-bravo"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-ada639b957a8f05bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Independent second-pass review of TWO files (do NOT assume a prior reviewer caug

> **claude-code-cli** | 2026-05-31 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-ada639b957a8f05bf.jsonl`

## Transcript

### User | 2026-05-31T03:04:09.427Z

Independent second-pass review of TWO files (do NOT assume a prior reviewer caught everything). Weight toward SECURITY, integration with the design intent, and test integrity. Grade PASS/FAIL, P0/P1 only. This is a per-file scrutiny gate in a multi-file PRISM build.

FILES (read both fully):
1. H:/prism-zulu-obsidian/mcp-server/src/engines/ObsidianRestBridgeEngine.ts
2. H:/prism-zulu-obsidian/mcp-server/src/__tests__/ObsidianRestBridgeEngine.test.ts

DESIGN INTENT: a fail-soft, READ-ONLY (v1) client to a localhost Obsidian Local REST API (https://127.0.0.1:27123, self-signed). It will be consumed by (a) a prism_session dispatcher (obsidian_status/read/search actions) and (b) an OUTWARD-FACING Telegram bridge that routes mobile queries to the brain. PRISM is internal-only; nothing must leak.

SECURITY — scrutinize hard:
1. The default transport sets rejectUnauthorized:false for https. Is this scoped safely (localhost self-signed is expected), or could a PRISM_OBSIDIAN_URL override point it at a remote host and silently accept any cert (MITM/SSRF)? Should the engine pin to localhost or warn on non-loopback URLs?
2. SSRF/host-injection: PRISM_OBSIDIAN_URL + the path are combined via new URL(path, url). Could a crafted `notePath` or `query` escape the intended host/route (e.g., path starting with // or http://)? The search query is encodeURIComponent'd — confirm. The read path is split/encodeURIComponent'd per segment — confirm no bypass.
3. Header/auth: is the bearer key ever logged or echoed in a reason string? (It must never appear in any returned reason/data.)
4. Could the engine return secret/path data to a caller in a way the Telegram bridge would forward? (v1 returns note CONTENT + filenames — acceptable, but confirm no env/stack/abs-path leakage in error reasons.)
5. Is the write surface truly absent (no append/put/delete/patch anywhere)?

INTEGRATION + CONVENTIONS:
6. Does it follow PRISM engine conventions (class + static methods, Zod input validation, typed r
... [+864 chars truncated]

### Assistant | 2026-05-31T03:04:22.801Z

I'll review both files thoroughly. Let me read them in full.

### Assistant | 2026-05-31T03:04:22.801Z

[tool_use: Read]

### Assistant | 2026-05-31T03:04:22.806Z

[tool_use: Read]

### User | 2026-05-31T03:08:25.553Z

[tool_result] 1	/**
2	 * ObsidianRestBridgeEngine.test.ts
3	 *
4	 * Verifies the fail-soft contract of the live Obsidian vault client WITHOUT a
5	 * live vault: every method must return a typed { ok, reason } result and never
6	 * throw. An injected fake transport exercises live / down / timeout / no-key /
7	 * bad-payload paths; the no-key short-circuit must open NO socket.
8	 */
9	import { describe, it, expec
... [+7694 chars truncated]

### User | 2026-05-31T03:08:26.339Z

[tool_result] 1	/**
2	 * ObsidianRestBridgeEngine — live Obsidian vault client over the Local REST API.
3	 * =============================================================================
4	 *
5	 * Part of the Hermes/Zulu fleet-orchestrator galaxy
6	 * (mcp-server/src/engines/hermes-zulu). Gives PRISM an IN-SESSION read path into
7	 * a *running* Obsidian vault (the "live brain"), complementing the one-way
8	 * 
... [+12231 chars truncated]

### Assistant | 2026-05-31T03:08:30.448Z

Both files read fully. Now let me verify a couple of specific security concerns by reasoning about the `new URL(path, url)` behavior and the host-pinning question.

Let me confirm the `new URL` SSRF behavior precisely, since this is the load-bearing security question.

### Assistant | 2026-05-31T03:08:34.109Z

[tool_use: Bash]

### User | 2026-05-31T03:08:48.801Z

[tool_result] {"p":"//evil.com/x","host":"evil.com","href":"https://evil.com/x"}
{"p":"/vault/foo","host":"127.0.0.1:27123","href":"https://127.0.0.1:27123/vault/foo"}
{"p":"http://evil.com/x","host":"evil.com","href":"http://evil.com/x"}
{"p":"/search/simple/?query=x%26host%3Dy","host":"127.0.0.1:27123","href":"https://127.0.0.1:27123/search/simple/?query=x%26host%3Dy"}
{"p":"/vault/../../etc/passwd","host":"1
... [+181 chars truncated]

### Assistant | 2026-05-31T03:09:46.503Z

The `new URL` test is conclusive and the most important finding. Key results:

- `//evil.com/x` → host becomes **evil.com** (protocol-relative escape)
- `http://evil.com/x` → host becomes **evil.com** (absolute URL escape)
- The `safeVaultPath` guard catches `..`, leading `/`, and `scheme://`, but it is only applied to `read()` — NOT to `search()` query or the base URL.

Let me confirm the search query and the actual injection vectors reaching the transport. The query is `encodeURIComponent`'d, and the read path is per-segment encoded, so the *application-layer* paths are safe. The real exposure is `PRISM_OBSIDIAN_URL`. Let me check whether anything pins it to loopback.

There is no loopback check anywhere — `baseUrl()` returns `process.env.PRISM_OBSIDIAN_URL` verbatim, and `defaultTransport` sets `rejectUnauthorized:false` for *any* https URL. I have enough to render the verdict.

---

## VERDICT: FAIL

Two findings block this file. The engine is well-structured and the fail-soft contract is genuinely honored, but the `rejectUnauthorized:false` is not scoped to loopback, which is a real MITM/credential-exfil hole given an outward-facing Telegram consumer.

---

### P0-1 — `rejectUnauthorized:false` applied to ANY https host → MITM + bearer-key exfil (SECURITY)
**File 1, lines 105–118 (`defaultTransport`) + lines 74–76 (`baseUrl`).**

`PRISM_OBSIDIAN_URL` is read verbatim and `rejectUnauthorized:false` is set for *every* https URL, not just loopback. If that env var is ever set to a non-loopback host (operator typo, copied config, compromised env, or a future remote-vault experiment), the engine will:
1. Send the `Authorization: Bearer <key>` header (line 112) to that host, and
2. **silently accept any cert** — a MITM on the path harvests the bearer key.

The JSDoc comment "this client only ever targets localhost, so accepting it is safe" is an *assumption the code does not enforce*. This is exactly the SSRF/MITM concern the design intent flagged. The blast radius i
... [+7827 chars truncated]
