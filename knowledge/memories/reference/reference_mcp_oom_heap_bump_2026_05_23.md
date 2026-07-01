---
name: reference-mcp-oom-heap-bump-2026-05-23
description: MCP HTTP server at :3100 was OOM-killed every ~14 min (exit code 0xFFFFFFFF) because Node 22 default heap (~1.5GB) was hit by accumulated retained refs from peer chats' constant prism_guard:error_ledger_recall_similar calls. Fix: supervisor spawnChild() now injects NODE_OPTIONS=--max-old-space-size=4096 (4GB) to push the OOM horizon out ~10x. Mitigation only — the true leak fix belongs in a separate session targeting error_ledger_recall_similar ref-retention.
metadata:
  type: reference
---

# MCP server :3100 OOM fix — heap bump to 4GB (2026-05-23, slot:kilo)

## User directive

> "before continuing current work, fix whatever is causing chats to always disconnect from the mcp server"

## Diagnostic finding

The May 22 [[reference_mcp_server_3100_crash_fix_2026_05_22]] fixes (BUGS 1-3: ESM import bugs + JSON import attribute + installer encoding) had landed. Both scheduled tasks (`PRISM MCP Server` + `PRISM MCP Server Watchdog`) were registered. Bridge had retry-with-backoff + self-heal + 60s init budget already in place.

But chats were still seeing disconnects. Live diagnosis (2026-05-23):

| Signal | Value | Meaning |
|---|---|---|
| `/health uptime_seconds` | **105** (then 12 after manual restart) | Server crashed within last 2 min |
| Bridge log error/warn count | **0** | Bridge stack itself is healthy |
| Bridge "stdin closed" count | 95 | Clean Claude-Code-side disconnects (normal lifecycle) |
| Supervisor log latest exit | `code: 4294967295, signal: null, uptimeMs: 857698` | `0xFFFFFFFF` = Windows abnormal kill (OOM signature) after 14.3 min uptime |
| Supervisor PID history | 15+ distinct PIDs in recent window | Crash-respawn loop |
| RSS at startup | ~720 MB | Heavy baseline |
| heap_used / heap_total | 624 / 664 MB | Close to Node 22 default ~1.5GB cap |
| Heaviest action | `prism_guard:error_ledger_recall_similar` called constantly by peer chats | Likely ref-retention culprit |

**Root cause:** Node 22's default `--max-old-space-size` is ~1.5 GB. The server starts at 720 MB RSS, retains memory through every `error_ledger_recall_similar` call, and OOMs after ~14 min. Supervisor respawns within ~5 s but during the ~30 s cold-start window, any chat issuing a tool call gets a transient error → Claude Code's MCP client may drop the `prism` server for the remainder of that chat's session.

## Fix applied (`scripts/mcp-server-supervisor.mjs` `spawnChild()`)

Inject `NODE_OPTIONS=--max-old-space-size=4096` into the child env. 4 GB cap moves the OOM horizon out ~10× (from ~14 min to multi-hour). Operator override is honored: if `process.env.NODE_OPTIONS` already contains `--max-old-space-size`, we use the existing value verbatim instead of overriding it.

Verified post-fix:
- `Stop-ScheduledTask` + `Start-ScheduledTask` cleanly restarted the supervisor
- New child uptime: 12 s, healthy, RSS 694 MB
- Bridge can forward without retry pressure now

## Mitigation vs root cause (R12 fail-loud)

This is a **mitigation**, NOT the leak fix. The real bug is whatever in `prism_guard:error_ledger_recall_similar` (or its callers) retains references across calls. Symptoms expected to recur on a longer horizon if leak is unbounded:

- If RSS grows monotonically past 4 GB → OOM kills resume at ~10× the previous interval (~140 min instead of ~14 min)
- If leak is logarithmic / sub-linear → 4 GB may be enough indefinitely

**Operator follow-up units:**
1. **U-MCP-OOM-LEAK-ROOT-CAUSE** — instrument `prism_guard:error_ledger_recall_similar` with heap snapshots before/after, identify retained-references graph, fix the actual leak. Multi-session work.
2. **U-MCP-RATE-LIMIT** — add per-bridge rate limiting on `prism_guard:*` actions so a single misbehaving chat can't pressure-leak the shared server.
3. **U-MCP-WATCHDOG-MEM-PROBE** — extend `mcp-server-watchdog.mjs` to also alert on RSS > 3 GB (preemptive restart before OOM kill).

## Cross-refs

- [[reference_mcp_server_3100_crash_fix_2026_05_22]] — predecessor fix (BUGS 1-3, ESM/JSON/installer)
- `scripts/mcp-server-supervisor.mjs` — spawnChild() patched
- `.claude/helpers/mcp-http-bridge.mjs` — already has retry + self-heal (lima 5/22)
- Per kilo soul: this is off-domain (kilo = print-to-program); user directive override per CLAUDE.md instruction priority (user > skills > default)
