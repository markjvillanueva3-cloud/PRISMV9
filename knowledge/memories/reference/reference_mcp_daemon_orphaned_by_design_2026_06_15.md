---
name: mcp-daemon-orphaned-by-design-2026-06-15
description: "FLEET-HYGIENE/golf lesson (2026-06-15): the PRISM mcp-server node daemon is ORPHANED-BY-DESIGN -- its launcher exits right after spawning it, so its ppid points to a DEAD parent forever, yet it IS the live MCP server holding port 3100. A process census will flag it as an orphaned node proc (dead-parent + age>=600s); REAPING IT KILLS MCP. This is exactly why the orphan-census auto-kill excludes /mcp-server|dist[\\/]index/. Also: the singleton-service-guard 'mcp port DOWN and no daemon' signal can be a TRANSIENT probe-abort under load (operation aborted) while the daemon is actually UP -- verify by checking which pid OWNS port 3100 and its uptime BEFORE believing 'down'. Golf is REPORT-ONLY on MCP: never --fix / manual-start (races supervisor -> 0x80070020 ERROR_SHARING_VIOLATION) and never reap the daemon."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.651Z
aliases: reference_mcp_daemon_orphaned_by_design_2026_06_15
---


**Lesson (golf, 2026-06-15).** During the perpetual `/goal` fleet-health loop, the singleton-service-guard emitted `⚠ mcp: port DOWN and no daemon — start it` and consolidate-graph reported `mcp-down (This operation was aborted)`. Investigation (report-only) revealed the truth, which is the OPPOSITE of "down":

## What was actually true
- `Get-NetTCPConnection -LocalPort 3100 -State Listen` → **port 3100 held by pid=12568**, a single live `node mcp-server` proc.
- pid 12568 had `ppid=38084` where **38084 is DEAD** → a process census classifies 12568 as an *orphaned* node proc (dead-parent + age≥600s).
- pid 12568 uptime was **continuous** across two readings 2.5 min apart (15.5m → 18m) → it **never restarted**; it is the stable persistent daemon.
- The ~22 short-lived `mcp-server` children seen one tick earlier (age ~59s) were **transient per-request workers** — they exited on their own (live count dropped 22 → 1). They were NOT a "supervisor restart cohort" (an earlier same-session claim I corrected under R12).

## Why the daemon looks orphaned but must NEVER be reaped
The mcp-server is **orphaned-by-design**: the launcher/wrapper spawns the long-running server then **exits**, leaving the server with a dead ppid permanently. A naive node-orphan rule (`name==node && dead-parent && age≥600`) matches it. **Killing it takes down MCP for the whole fleet.** This is the exact reason the golf process-census `$nodeOrph` filter carries `-notmatch 'master-index-daemon|obsidian|git-sync|consolidate-graph|mcp-server|dist[\\/]index'`, and why the census reports `mcp-orph` as a SEPARATE report-only counter (never added to the `$killed` loop). Both MCP-aware reapers (`PRISM Node Orphan Cleaner`, `PRISM Zombie Reaper v2`) likewise protect it.

## "MCP port DOWN" can be a transient probe-abort, not a real down
The singleton-guard / consolidate-graph probe can momentarily fail to reach port 3100 while the daemon is busy (a tool call in flight) → it prints `This operation was aborted` / `port DOWN and no daemon`. **Do not believe it at face value.** Verify: (1) `Get-NetTCPConnection -LocalPort 3100 -State Listen` → is a pid bound? (2) is that pid's uptime continuous (not a fresh restart)? If yes, MCP is UP — stand down.

**Transient-abort vs real-sustained-outage — the discriminator is CONSECUTIVE-COUNTER COUNT + port-owner uptime:**
- TODAY (transient): ONE `aborted` reading; pid 12568 held port 3100 with **continuous 18m uptime** → flap, MCP fine, stand down.
- CONTRAST [[reference_mcp_daemon_pileup_port_conflict_2026_06_09]] (real): **6+ CONSECUTIVE** Stop-hook `consolidate-graph mcp-down (fetch failed)` counters + NO pid bound to 3100 → a genuine sustained outage (daemon-pileup/port-conflict) needing supervisor recovery. There, the right move is still report-only (let the supervisor/watchdog recycle), but it is a real down, not a flap.
Rule: a SINGLE `aborted`/`mcp-down` with a live continuous port-owner = transient (hold); MULTIPLE consecutive `mcp-down (fetch failed)` with NO port-owner = real (supervisor's job, still never golf-manual-start).

## Golf's correct action = REPORT ONLY (proven correct here)
- **Never** `node scripts/singleton-service-guard.mjs --fix`, never manual `start`/daemon-start → collides with the supervisor's in-flight management → `0x80070020` ERROR_SHARING_VIOLATION.
- **Never** reap an `mcp-orph` proc — it is the live server.
- DO: verify port-3100 owner + uptime, confirm the recovery-path tasks (`PRISM MCP Server`, `PRISM MCP Server Watchdog`) are Ready/lastResult=0x0, then hold. The supervisor (3-min cadence) owns MCP lifecycle.

Siblings: [[feedback_golf_owns_reaper]] (golf reaper doctrine), [[reference_fleet_work_digest_2026_06_15]] (same-session golf work). The golf soul refuse-list item "reaping-a-process-without-ancestry-confirmation" is precisely what saved MCP here — ancestry said "dead parent" but the port-owner check said "this IS the server."
