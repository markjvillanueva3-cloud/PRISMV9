---
name: mcp-supervisor-persistence-fix-2026-05-31
description: "Permanent fix for MCP :3100 going unsupervised — the PRISM MCP Server supervisor task was fire-once (Boot/Logon) and died LastResult=2 on 05/29, so nothing relaunched the supervisor. golf added a 3-min repeating trigger + patched the installer."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.207Z
aliases: reference_mcp_supervisor_persistence_fix_2026_05_31
---


**Operator (2026-05-31): "find a permanent fix for the MCP server going down."**

**The layered diagnosis (built on prior work — R8, did not re-derive):**
- The `prism` MCP path = `mcp-http-bridge.mjs` (stdio→HTTP) → shared `:3100` server. The **bridge is already fully resilient** (self-heal supervisor spawn, retry-with-backoff, 60s init budget, /ready-gate, kept-alive on uncaught) — built post-2026-05-22 + alpha's U-MCPR01. Client side is solid.
- The **supervision layer was the gap.** `PRISM MCP Server` task (runs `mcp-server-supervisor.mjs`, a long-running respawn-on-crash loop) had **only fire-once triggers (AtStartup + AtLogon), no repetition** — by explicit design ("the supervisor is a long-running loop, start it once"). That assumption FAILS when the loop itself dies: the task showed **`LastResult=2` since 2026-05-29 and never ran again** → no persistent supervisor → `:3100` recovery fell to the slow 5-min watchdog + reactive per-request bridge self-heal (`supervisor --once`).
- Observed live: `:3100` down → a `--once` supervisor was mid-respawn → server cold-boot took **~40-50s** (loads 4234 tribal tips + registries) → came back up. So recovery works but is slow + not persistent.

**The fix (golf, bounded, task-health domain):**
1. **Running task:** added a `PT3M` repeating trigger to `PRISM MCP Server` (kept Boot+Logon). The supervisor's **O_EXCL PID lock** makes a re-run a safe no-op when one is alive, so the repetition only ever *fills a gap* — guaranteeing a persistent fast respawner is always running, within 3 min of any supervisor death.
2. **Permanent:** patched `.claude/helpers/install-mcp-server-task.ps1` (the `$trigger` array) so re-registration (elevated install / other PC) keeps the repetition — else the next install reverts it.
3. The `PRISM MCP Server Watchdog` already repeats every 5 min (/health probe → restart) — second layer, unchanged.

**Remaining DEEPER root cause (flag for papa / operator — NOT golf-fixed):** the server still *crashes* (forcing the cold-boot) from the per-request `server.connect(transport)` closure leak at `mcp-server/src/index.ts:973-983` (~10MB/min → OOM). The structural fix is **`U-MCP-FACTORY-REFACTOR`** (per-session McpServer factory) per spec [[spec-mcp-capacity-ms0]] + `MCP-DISCONNECT-ROOT-CAUSE-2026-05-25.md`. That's a server-core refactor + rebuild (papa/backend domain, risky, the deferred MCP-CAPACITY-MS0 milestone). The supervision fix makes recovery **fast + always-on**; the core refactor would stop the crashes happening at all. Also worth: speeding the ~40-50s cold-start. Related: [[reference_mcp_server_3100_crash_fix_2026_05_22]], [[reference_mcp_oom_heap_bump_2026_05_23]], [[reference_prism_task_always_active_hardening_2026_05_31]].
