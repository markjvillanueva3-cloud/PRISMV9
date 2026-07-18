---
name: golf-mcp-proc-spike-not-pileup-2026-06-14
description: "NEAR-MISS + rule vindication (golf, 2026-06-14): a single-sample census fired mid-load-burst showed 1152 total procs (2.5x baseline) AND 22 'mcp-server|dist/index' node procs -- which LOOKS exactly like the duplicate-MCP-daemon pileup the MCP banner says to fix with `singleton-service-guard.mjs --fix`. It was NOT a pileup. One tick later: 439 procs, 5 MCP procs, 0 dead-parented MCP daemons (3 child-of-mcp + 2 live-parented = ONE healthy server + workers), port3100 LISTENING, supervisor Running, watchdog Ready. Both the 1152 and the 22 were transient spikes captured at the instant of a load+auto-respawn burst. LESSON: never treat a raw MCP-proc COUNT as a pileup -- ANCESTRY-confirm (dead-parented independent daemons) first, and REPORT-ONLY (don't --fix) held correct. A blind --fix would have killed a healthy server's workers."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.598Z
aliases: reference_golf_mcp_proc_spike_not_pileup_2026_06_14
---


**Event (2026-06-14, slot golf, session 02a2de10 -- perpetual /goal fleet-health loop).** During sustained heavy fleet load (multiple chats running parallel workflow fanouts -> recurring 450-600 proc bursts + bash bursts up to 104, plus Stop-gate timeouts and MCP-connectivity "fetch failed" banners -- all transient load symptoms), a routine census tick happened to fire at the *peak* of a load+respawn burst and reported:
- **1152 total procs** (vs ~444 baseline -- 2.5x)
- **22 node procs matching `mcp-server|dist/index`** (vs the normal 1-2)
- (concurrently: MCP-disconnected banner with `timeout (HTTP --)`, guardian schtasks "query-failed -- transient", 2-4 Stop gates "NOT evaluated (timeout/crash)")

The 22-MCP-proc reading **looks identical** to the duplicate-daemon pileup the MCP connectivity banner explicitly says to clear with `node scripts/singleton-service-guard.mjs --fix` ("reaps any duplicate-daemon pileup AND respawns a clean daemon"). It is tempting to run --fix.

**DO NOT. Ancestry-confirm first.** The follow-up read-only ancestry pass (one tick later) showed ground truth:
- **total procs = 439** (baseline -- the 1152 had fully drained)
- **MCP procs = 5**: `child-of-mcp=3, liveNonMcpParent=2, deadParent=0`. **Zero dead-parented independent daemons** => NOT a pileup. It is one healthy MCP server (2 live-parented entry procs) + 3 worker children. `mcp-server|dist/index` matches worker children too, inflating the raw count.
- port3100 LISTENING, `PRISM MCP Server`=Running, `PRISM MCP Server Watchdog`=Ready.

So both the 1152 and the 22 were **single-sample spikes captured at the worst instant** of a load+auto-respawn cycle (the supervisor was mid-respawn, pid 109832, after a transient connectivity timeout). The server was never actually down or piled-up.

## RULES (golf hygiene -- reinforced)
1. **A raw MCP-proc COUNT is NOT a pileup signal.** `mcp-server|dist/index` matches the server's worker CHILDREN, so a healthy server shows several. A *pileup* = multiple **dead-parented / independent** MCP daemons (each a separate `node dist/index.js` whose parent is the supervisor or dead, not another mcp proc). Compute `deadParent` + `child-of-mcp` split BEFORE concluding. deadParent=0 => no pileup.
2. **REPORT-ONLY on MCP held correct.** Golf does NOT run `singleton-service-guard.mjs --fix` / start / daemon-start. The supervisor + watchdog own respawn; --fix is the operator's call for a *confirmed* pileup. A blind --fix here would have reaped a healthy server's workers (and a naive manual start collides on port 3100 -> `0x80070020` ERROR_SHARING_VIOLATION). Diagnose-only (`singleton-service-guard.mjs` with NO flags) is the report-safe probe if a deeper check is ever needed.
3. **Single-sample census during a load burst overstates by 2-3x.** Total proc count, MCP count, bash count all spike at burst peaks and drain within ~1 tick. ALWAYS take a confirming second sample (and an ancestry breakdown) before acting on an alarming count. Same lesson family as the search-tool/git-fsmonitor bursts this session ([[reference_golf_fsmonitor_daemon_count_2026_06_14]]) and the transient guardian/schtasks false-read ([[reference_golf_zombie_reaper_v2_6h_flap_2026_06_14]], guardian fix `fc27bddc99`).
4. **Transient timeout signals cluster under load** -- MCP "fetch failed", guardian "schtasks query-failed", Stop "gate(s) NOT evaluated (timeout/crash)" all fire together at burst peaks and all self-heal. None is a confirmed failure; verify ground truth (process alive + port listening + task Running) before reporting a real outage (R12 both directions: don't cry-wolf, but do verify).

Siblings: [[reference_golf_fsmonitor_daemon_count_2026_06_14]], [[reference_golf_reaper_searchtool_orphan_gap_2026_06_14]], [[reference_reaper_guardian_false_negative_2026_05_26]], [[feedback_golf_owns_reaper]].
