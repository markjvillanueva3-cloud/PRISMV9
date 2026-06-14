---
name: reference_mcp_orphan_server_leak_2026_05_29
description: "MCP disconnected + slash commands not appearing" was NOT a dead server — it was 16 orphaned dist/index.js servers (~12GB, dead parents) starving the box so the live server couldn't answer the 1s HEAD probe
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.206Z
aliases: reference_mcp_orphan_server_leak_2026_05_29
---


2026-05-29 (slot:bravo): operator reported "issues with the mcp server, all slash commands are not coming up." Misleading banner: `🛑 MCP SERVER DISCONNECTED ... timeout`. **The server was actually UP** (PID listening on :3100, supervisor alive, `/health`→200).

**Real root cause:** 16 orphaned `node dist/index.js` MCP-server instances (~750 MB each = ~12 GB), ALL with **dead parent PIDs**, spawned in bursts (7:22–7:23 AM) by chat bridges that later exited. They bind no port and serve no live chat — pure leak. Likely each chat's `mcp-http-bridge.mjs` fallback-spawned its own full server during an earlier outage, and they were never reaped when the chats died. The memory pressure made the canonical :3100 server too slow to answer `mcp-connectivity-check.mjs`'s **1 s HEAD probe** → `timeout` → "disconnected" banner. And Claude Code's slash-command palette blocks on MCP prompt enumeration during the hung handshake → **no slash commands appear**.

**Diagnostic recipe (don't assume the banner = dead server):**
1. `Get-NetTCPConnection -LocalPort 3100 -State Listen` → is anything listening? (was: yes, PID 75808)
2. `Invoke-WebRequest http://127.0.0.1:3100/health -TimeoutSec 5` → 200 = server fine.
3. `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? CommandLine -match 'dist[\\/]index\.js'` → count + RSS. Many = leak.
4. For each, check parent alive (`Get-Process -Id ParentProcessId`). **Dead parent + not binding 3100 = orphan, safe to kill.**

**Fix:** reap orphans (keep the :3100 listener + supervisor PID); freed ~11.7 GB; `/health`→200, connectivity hook 7 ms ✓. Slash-command palette recovers once the handshake is fast (else `/mcp` reconnect or restart the chat — supervisor keeps the server up so reconnect is instant).

**Prevention (golf-owned):** the [[reference_fleet_reaper|fleet-reaper]] did NOT catch these in 3 h — it apparently doesn't target `node dist/index.js` with a dead parent. The bridge's fallback-spawn-on-outage behavior is the leak source. Both are golf [[reference_fleet_reaper|fleet-reaper]] / MCP-OOM-FIX follow-ups. Related: [[feedback_golf_owns_reaper]], [[reference_mcp_connectivity_check_wire_2026_05_24]].
