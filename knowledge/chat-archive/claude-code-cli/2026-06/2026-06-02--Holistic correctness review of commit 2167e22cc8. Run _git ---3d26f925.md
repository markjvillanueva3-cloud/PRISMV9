---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Holistic correctness review of commit 2167e22cc8. Run `git -C H:/prism show 2167"
date: "2026-06-02"
first_ts: "2026-06-02T14:43:28.636Z"
last_ts: "2026-06-02T14:45:32.362Z"
cwd: "H:\\prism-slot-golf"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a51504037ec3930e9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Holistic correctness review of commit 2167e22cc8. Run `git -C H:/prism show 2167

> **claude-code-cli** | 2026-06-02 | 10 msgs (4 user / 6 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a51504037ec3930e9.jsonl`

## Transcript

### User | 2026-06-02T14:43:28.636Z

Holistic correctness review of commit 2167e22cc8. Run `git -C H:/prism show 2167e22cc8` and read the surrounding function in H:/prism/mcp-server/src/index.ts (runHTTP, ~L935-1300).

The change hardens the PRISM MCP HTTP server against a bind-race instance leak (11 instances × ~700MB hung portless took :3100 down fleet-wide). It adds:
1. FIX 2 — a pre-bootstrap port preflight at the TOP of runHTTP(): `net.createServer()` probes the port; on EADDRINUSE it `process.exit(0)` BEFORE the heavy `bootstrapServices()` engine load (~700MB); on 'listening' it closes the probe and resolves to continue.
2. FIX 1 — an `httpServer.on('error')` handler after `app.listen()` (L1265): EADDRINUSE → exit(0), else exit(1).

Review for CORRECTNESS:
- Winner path: port free → probe binds → 'listening' → probe.close(cb) → cb resolves → runHTTP continues to bootstrap + real listen. Does probe.close's callback always fire so runHTTP never hangs at the preflight await?
- Is exit(0) (not exit(1)) the right semantics for "a peer already owns the port"?
- TOCTOU between probe.close and the real app.listen — is it genuinely covered by FIX 1's error handler?
- Non-EADDRINUSE probe error path (it resolves and proceeds) — correct?
- Does PORT/host derivation in the preflight match the real bind at L1262-1265?

Grade PASS or FAIL. List only P0/P1 issues with file:line. Be concise (the diff is 41 lines).

### Assistant | 2026-06-02T14:43:45.643Z

I'll review commit 2167e22cc8 for correctness.

### Assistant | 2026-06-02T14:43:45.653Z

[tool_use: Bash]

### User | 2026-06-02T14:44:36.272Z

[tool_result] 2167e22cc8 [MAIN] [MCP-HARDEN]/U-MCP-BIND-FAILFAST (slot:golf): pre-bootstrap port preflight + listen EADDRINUSE handler (5 minutes ago) <markjvillanueva3-cloud>
mcp-server/src/index.ts | 42 +++++++++++++++++++++++++++++++++++++++++-
 1 file changed, 41 insertions(+), 1 deletion(-)

mcp-server/src/index.ts
  @@ -22,6 +22,7 @@ import express from "express";
  +import net from "node:net";
   
   imp
... [+2819 chars truncated]

### Assistant | 2026-06-02T14:44:39.496Z

Now let me read the surrounding function in index.ts to verify the PORT/host derivation matches the real bind and check the preflight context.

### Assistant | 2026-06-02T14:44:40.436Z

[tool_use: Read]

### Assistant | 2026-06-02T14:44:40.973Z

[tool_use: Read]

### User | 2026-06-02T14:44:57.201Z

[tool_result] 930	  } catch { /* smoke test module not available */ }
931	}
932	
933	/**
934	 * Run server with HTTP transport (for remote access)
935	 */
936	async function runHTTP(): Promise<void> {
937	  log.info(`Starting ${SERVER_NAME} v${SERVER_VERSION} (HTTP mode)`);
938	  log.info(SERVER_DESCRIPTION);
939	
940	  // HARDEN (golf 2026-06-02 MCP-HARDEN) FIX 2 — pre-bootstrap port preflight.
941	  // The he
... [+2405 chars truncated]

### User | 2026-06-02T14:44:57.382Z

[tool_result] 1240	  // ========================================================================
1241	  // R5+L6: REST API routes — 9 route modules, 42 endpoints
1242	  // ========================================================================
1243	
1244	  // Helper: call an MCP tool handler and return result
1245	  async function callTool(toolName: string, action: string, params: Record<string, any> = {}) {
1
... [+4257 chars truncated]

### Assistant | 2026-06-02T14:45:32.362Z

I have everything I need. Let me work through each correctness question against the code.

**1. Does `probe.close`'s callback always fire (winner path doesn't hang)?**
The winner path: `probe.listen()` → `'listening'` fires → `probe.close((cb) => resolve())`. Node's `server.close(cb)` invokes the callback once the server stops accepting connections AND all existing connections are closed. The probe `net.createServer()` accepts no connections (no `'connection'` handler, and it's only open for microseconds). With zero open connections, `close()` fires its callback on the next tick. Safe — no hang. The only theoretical way `close(cb)` never fires is a lingering connection, which can't happen here. PASS.

**2. Is `exit(0)` correct semantics for "peer already owns the port"?**
Yes. The comment is accurate — a bind-race loser exiting cleanly should NOT trip the supervisor respawn/backoff loop. `exit(0)` = "my job is done, a peer is serving." This is the intended fleet semantics. Correct.

**3. PORT/host derivation match between preflight (L948-949) and real bind (L1287-1289)?**
- Preflight: `process.env.PORT || "3000"`, `process.env.PRISM_BIND_HOST || "127.0.0.1"`
- Real bind: `process.env.PORT || "3000"`, `process.env.PRISM_BIND_HOST || '127.0.0.1'`

Identical. Match confirmed.

**4. Non-EADDRINUSE probe error → `resolve()` and proceed — correct?**
Yes. If the probe hits a different error (e.g., EACCES, EADDRNOTAVAIL), resolving lets the real `app.listen()` surface it through FIX 1's handler, which classifies non-EADDRINUSE as fatal `exit(1)`. Defensible: don't make a probe-only quirk fatal; defer the authoritative decision to the real bind. Correct.

**5. TOCTOU between probe.close and real app.listen — covered by FIX 1?**
Yes. Between the probe closing (port released) and `app.listen()` (port re-acquired), a peer could grab the port. FIX 1's `httpServer.on('error')` catches that EADDRINUSE and `exit(0)`. This window is genuinely covered. PASS.

Now the issues I did fin
... [+3429 chars truncated]
