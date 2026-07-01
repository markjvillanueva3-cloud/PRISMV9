---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Adversarial regression/integration review of commit 2167e22cc8 (run `git -C H:/p"
date: "2026-06-02"
first_ts: "2026-06-02T14:43:35.427Z"
last_ts: "2026-06-02T14:49:45.337Z"
cwd: "H:\\prism-slot-golf"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a914f2049a7cd975f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Adversarial regression/integration review of commit 2167e22cc8 (run `git -C H:/p

> **claude-code-cli** | 2026-06-02 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/agent-a914f2049a7cd975f.jsonl`

## Transcript

### User | 2026-06-02T14:43:35.427Z

Adversarial regression/integration review of commit 2167e22cc8 (run `git -C H:/prism show 2167e22cc8`; file H:/prism/mcp-server/src/index.ts, runHTTP ~L935-1300). It adds a pre-bootstrap `net.createServer` port preflight + an `httpServer.on('error')` handler so bind-race-loser MCP instances exit instead of hanging at ~700MB.

Hunt for SILENT BREAKAGE / regressions / integration risk:
1. The preflight binds :PORT with a throwaway server then closes it — under the load surge (26 chats × workflows+agents), could that transient bind/close window reject a real client connection, collide with the supervisor's startup /health probe, or race the WebSocket attach?
2. `process.exit(0)` on the loser path — the commit claims this avoids tripping the supervisor's backoff/respawn. VERIFY against H:/prism/scripts/mcp-server-supervisor.mjs: does the supervisor's child-exit handler treat exit(0) as "don't respawn" vs exit(1)? Could exit(0) cause the supervisor to think the server stopped cleanly and NOT restart a legitimately-needed server?
3. `httpServer.on('error')` is attached AFTER `app.listen()` returns — can a synchronous EADDRINUSE from listen() fire before the handler is attached and be missed? (Node attaches listen async, but confirm.)
4. Interaction with the existing SIGTERM handler (L1288) + gracefulShutdown.

Grade PASS or FAIL. List only P0/P1 with file:line + concrete reproduction. Concise.

### Assistant | 2026-06-02T14:43:55.465Z

I'll review commit 2167e22cc8 with focus on silent breakage and integration risks. Let me gather the evidence.

### Assistant | 2026-06-02T14:43:55.467Z

[tool_use: Bash]

### Assistant | 2026-06-02T14:43:56.138Z

[tool_use: Bash]

### User | 2026-06-02T14:44:38.161Z

[tool_result] commit 2167e22cc88bc32d40dec1fb15b7268eec35b88d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 2 09:38:58 2026 -0500

    [MAIN] [MCP-HARDEN]/U-MCP-BIND-FAILFAST (slot:golf): pre-bootstrap port preflight + listen EADDRINUSE handler
    
    Bind-race losers now exit ~3.7s with code 0 (preflight, ~50MB) instead of loading
    every engine (~700MB) then hanging portless.
... [+579 chars truncated]

### User | 2026-06-02T14:45:02.400Z

[tool_result] 2167e22cc8 [MAIN] [MCP-HARDEN]/U-MCP-BIND-FAILFAST (slot:golf): pre-bootstrap port preflight + listen EADDRINUSE handler (6 minutes ago) <markjvillanueva3-cloud>
mcp-server/src/index.ts | 42 +++++++++++++++++++++++++++++++++++++++++-
 1 file changed, 41 insertions(+), 1 deletion(-)

mcp-server/src/index.ts
  @@ -22,6 +22,7 @@ import express from "express";
  +import net from "node:net";
   
   imp
... [+2819 chars truncated]

### Assistant | 2026-06-02T14:45:05.911Z

Let me read the actual file around the relevant regions to confirm ordering and surrounding context.

### Assistant | 2026-06-02T14:45:07.312Z

[tool_use: Read]

### Assistant | 2026-06-02T14:45:07.555Z

[tool_use: Read]

### User | 2026-06-02T14:45:57.492Z

[tool_result] 1255	      return text ? JSON.parse(text) : result;
1256	    } catch (e: any) {
1257	      return { error: e.message };
1258	    }
1259	  }
1260	
1261	  // Register all route modules (SFC, CAD, CAM, Quality, Schedule, Cost, Export, Data, Safety)
1262	  const { registerRoutes } = await import("./routes/index.js");
1263	  registerRoutes(app, callTool);
1264	
1265	  // Serve the built web app directl
... [+4741 chars truncated]

### User | 2026-06-02T14:45:57.495Z

[tool_result] 925	
926	  // H1-MS3: Boot smoke tests (non-blocking)
927	  try {
928	    const { runSmokeTests } = await import("./utils/smokeTest.js");
929	    runSmokeTests().catch(e => log.warn(`[SMOKE] Failed: ${e.message}`));
930	  } catch { /* smoke test module not available */ }
931	}
932	
933	/**
934	 * Run server with HTTP transport (for remote access)
935	 */
936	async function runHTTP(): Promise<void>
... [+3055 chars truncated]

### Assistant | 2026-06-02T14:46:01.422Z

Now I have a critical finding forming. Note the **PORT default mismatch**: preflight uses `process.env.PORT || "3000"` and the real listen also uses `3000`, but the commit message and fleet doctrine reference `:3100`. Let me verify the supervisor's exit-code handling — this is the central claim to verify.

### Assistant | 2026-06-02T14:46:02.253Z

[tool_use: Bash]

### User | 2026-06-02T14:47:21.094Z

[tool_result] #!/usr/bin/env node
/**
 * mcp-server-supervisor.mjs — Spawn and supervise the PRISM MCP HTTP server.
 *
 * Mirrors the canonical supervisor pattern (install-fleet-reaper-task.ps1
 * driven). Designed to run as a Windows scheduled task on AtStartup +
 * AtLogon so the server is up before any Claude Code chat opens. Also runs
 * on-demand from the CLI.
 *
 * Behavior:
 *   - On launch: probe /healt
... [+8740 chars truncated]

### Assistant | 2026-06-02T14:47:27.110Z

This is the critical finding region. The supervisor's `child.on("exit")` handler **does not distinguish exit code 0 from exit code 1** — it respawns on ANY exit (unless `stopping || ONCE`). Let me confirm there's no code-based branching I'm missing in the rest of the file, and check the startup idempotency probe.

### Assistant | 2026-06-02T14:47:27.112Z

[tool_use: Bash]

### User | 2026-06-02T14:47:57.323Z

[tool_result]   }
  // Give the child exit handler a moment, then release lock and exit.
  setTimeout(() => {
    releasePidLock();
    process.exit(0);
  }, 6000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
// On Windows, scheduled task termination sends CTRL_BREAK_EVENT via the
// shell wrapper — surface it the same way.
process.on("SIGBREAK", 
... [+1121 chars truncated]

### Assistant | 2026-06-02T14:48:03.675Z

I now have the supervisor's full exit logic confirmed. The exit handler treats `code` as a logging field only — it **always** respawns. Now let me verify the WebSocket attach timing and check the PORT default discrepancy concern (preflight runs before `webSocketEngine.attach`, and the real listen attaches the error handler). Let me also confirm whether the supervisor probes the port host the preflight binds and verify the `process.exit(0)` claim against the actual respawn path.

Let me also check the keepAlive ordering concern and whether the preflight `probe.listen` to `127.0.0.1` vs the supervisor passing `HOST` vs `PRISM_BIND_HOST`.

### Assistant | 2026-06-02T14:48:05.493Z

[tool_use: Bash]

### User | 2026-06-02T14:48:22.391Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
/usr/bin/grep: Invalid back reference
0 matches for 'PRISM_BIND_HOST\|process.env.HOST\|process.env.PORT\|PRISM_MCP_SERVER_PORT\|"3100"\|'3100'\|"3000"\|'3000''

### Assistant | 2026-06-02T14:48:26.427Z

[tool_use: Grep]

### User | 2026-06-02T14:48:39.010Z

[tool_result] 948:    const pfPort = parseInt(process.env.PORT || "3000", 10);
949:    const pfHost = process.env.PRISM_BIND_HOST || "127.0.0.1";
1011:  // exact BUG-1 / BUG-2 class from reference_mcp_server_3100_crash_fix_2026_05_22)
1287:  const port = parseInt(process.env.PORT || "3000", 10);
1288:  // R6: Bind to localhost by default; set PRISM_BIND_HOST=0.0.0.0 for Docker/network exposure
1289:  const host
... [+133 chars truncated]

### Assistant | 2026-06-02T14:48:48.726Z

The preflight binds the same host (`PRISM_BIND_HOST || 127.0.0.1`) and same PORT default (`3000`) as the real listen — consistent, and the supervisor injects both `PRISM_BIND_HOST` and `PORT=3100`, so host/port are aligned between probe and listen. No PORT mismatch bug.

Now the decisive question. Let me confirm the supervisor child-exit handler has no code-based respawn suppression anywhere (it doesn't — confirmed above). Let me also check whether `app.listen` can throw EADDRINUSE synchronously before the handler is attached.

The Node.js `net.Server.listen()` is asynchronous — EADDRINUSE is always emitted as an `'error'` event on the next tick, never thrown synchronously. The handler is attached synchronously on the very next statement after `app.listen()` returns, well before the event loop processes the bind result. So FIX 1's handler cannot miss the error. That concern is clear.

I have enough to grade. Let me do one final confirmation on the WebSocket attach race and the double-exit interplay.

### Assistant | 2026-06-02T14:48:48.729Z

[tool_use: Read]

### User | 2026-06-02T14:48:59.382Z

[tool_result] 1000	      uptime_seconds: Math.round(uptime),
1001	      memory: { heap_used_mb: heapUsedMB, heap_total_mb: heapTotalMB, rss_mb: rssMB },
1002	      registries: registryStats,
1003	      total_entries: totalEntries,
1004	      timestamp: new Date().toISOString()
1005	    });
1006	  });
1007	
1008	  // MCP-READINESS (slot alpha 2026-05-28 — U-MCPR01): /ready is a STRICTER
1009	  // probe than /hea
... [+817 chars truncated]

### Assistant | 2026-06-02T14:49:45.337Z

I have everything needed. The WebSocket attach (`webSocketEngine.attach(httpServer)`) at L1319 happens after the error handler is attached at L1300, and a bind-race loser will have already `process.exit(0)`'d before reaching the WS attach (the EADDRINUSE fires on next tick, but the subsequent `await import(...WebSocketEngine)` yields the event loop, giving the error event a chance to fire and exit before attach completes). The TOCTOU window between preflight close and real listen is exactly what FIX 1 covers. No WS race regression.

Here is my verdict.

---

## Adversarial Review — commit `2167e22cc8` (MCP bind-fail-fast)

**Grade: FAIL** — one P0 silent-breakage bug that defeats the commit's own central claim, plus one P1.

---

### P0 — `process.exit(0)` on the loser does NOT prevent supervisor respawn; the commit's keystone claim is false

**Files:** `mcp-server/src/index.ts:955` and `:1303` vs `scripts/mcp-server-supervisor.mjs:215-230`

The commit message and the inline comments at `index.ts:1297-1299` assert:

> "exit(0) on EADDRINUSE = 'a peer already owns the port'… → does NOT trip the supervisor backoff/respawn loop."

**This is not what the supervisor does.** The child-exit handler (`mcp-server-supervisor.mjs:215`) is:

```js
child.on("exit", (code, signal) => {
  const uptimeMs = Date.now() - startedAt;
  log(stopping ? "info" : "warn", "Child exited", { code, signal, uptimeMs });
  child = null;
  if (stopping || ONCE) return;          // ← ONLY suppression paths
  if (uptimeMs >= UPTIME_RESET_MS) backoffMs = BACKOFF_INITIAL_MS;
  const delay = Math.min(backoffMs, BACKOFF_MAX_MS);
  respawnTimer = setTimeout(() => { respawnTimer = null; spawnChild(); }, delay);
  backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
});
```

`code` is consumed **only as a log field**. There is no `if (code === 0) return;` branch anywhere. The handler respawns on *every* exit unless the supervisor itself is `stopping` or in `--once` mode. So exit(0) and exit(1) are treated
... [+5896 chars truncated]
