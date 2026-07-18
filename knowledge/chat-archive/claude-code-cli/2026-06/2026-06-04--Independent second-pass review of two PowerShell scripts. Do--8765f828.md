---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "Independent second-pass review of two PowerShell scripts. Do NOT assume a prior "
date: "2026-06-04"
first_ts: "2026-06-04T03:57:48.868Z"
last_ts: "2026-06-04T04:06:46.773Z"
cwd: "H:\\PRISM"
messages: 54
user_msgs: 22
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/agent-aeb9a75c039b0d45d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Independent second-pass review of two PowerShell scripts. Do NOT assume a prior 

> **claude-code-cli** | 2026-06-04 | 54 msgs (22 user / 32 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/agent-aeb9a75c039b0d45d.jsonl`

## Transcript

### User | 2026-06-04T03:57:48.868Z

Independent second-pass review of two PowerShell scripts. Do NOT assume a prior reviewer caught everything — weight your review toward integration, hidden coupling, operational safety, and regressions the first pass might miss. Grade PASS/FAIL with P0/P1 (file:line + fix).

FILES (read both fully):
1. H:\prism\scripts\mcp-priority-guardian.ps1
2. H:\prism\.claude\helpers\install-mcp-priority-guardian-task.ps1

What they do: a Windows scheduled task (every 1 min) that demotes ollama `llama-server.exe` runner processes to Normal priority and raises the MCP server (`:3100` Node listener) to AboveNormal, to stop CPU event-loop starvation that drops the MCP connection. Affinity pinning is env-gated (default off). Supersedes a disabled `ollama-cpu-throttle.ps1`.

Weight your review toward:
1. **OPERATIONAL SAFETY / regressions** — Could this guardian ever (a) demote/kill the wrong process (is `llama-server` an exact match, or could it match an unrelated `llama-server*`)? (b) raise the WRONG process to AboveNormal if something else transiently binds :3100? (c) fight another scheduler — does the now-disabled ollama-cpu-throttle or the fleet-reaper also touch these priorities, causing a flip-flop war? (d) starve ollama or the OS by mis-set priority/affinity?
2. **Does it actually fix the stated problem durably?** MCP process priority persists until restart; runners respawn frequently. Is 1-min cadence adequate, or is there a window where a freshly-spawned AboveNormal runner starves MCP for up to 60s? Should the fix ALSO be born-protected at MCP spawn (note this as a gap if so).
3. **Affinity correctness** — if an operator sets PRISM_MCP_AFFINITY_MASK and PRISM_OLLAMA_RUNNER_MASK to OVERLAPPING masks, what happens? Any footgun?
4. **Reversibility** — is every change cleanly reversible (knob + Disable-ScheduledTask + Uninstall)? Is anything deleted that should be disabled?
5. **Installer/guardian contract drift** — the installer sanity-checks the guardian header for markers 'm
... [+462 chars truncated]

### Assistant | 2026-06-04T03:58:00.130Z

I'll review both files thoroughly. Let me read them in full.

### Assistant | 2026-06-04T03:58:01.062Z

[tool_use: Read]

### Assistant | 2026-06-04T03:58:01.157Z

[tool_use: Read]

### User | 2026-06-04T03:58:07.666Z

[tool_result] read-once-guard: 'H:\prism\scripts\mcp-priority-guardian.ps1' was already read 18s ago in this session and is unchanged (mtime 1780545366997). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T03:58:07.758Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-mcp-priority-guardian-task.ps1' was already read 18s ago in this session and is unchanged (mtime 1780545416088). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-06-04T03:58:12.252Z

The guard says these files are already in my context, but I don't actually see them — this is a fresh agent invocation. Let me bypass the cache to read them properly.

### Assistant | 2026-06-04T03:58:13.207Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:58:14.055Z

[tool_use: Bash]

### User | 2026-06-04T03:58:33.159Z

[tool_result] # mcp-priority-guardian.ps1  (PRISM MCP Priority Guardian, slot golf, 2026-06-03)
# FAIL_THRESHOLD / mcp-priority-guardian header markers (installer sanity-check).
#
# PURPOSE — permanently fix the recurring "MCP DISCONNECTED" drop caused by CPU
# event-loop starvation under aggregate fleet load (200+ /loop sessions +
# Obsidian + Defender + ollama). Two compounding causes this closes:
#   (cause 
... [+4778 chars truncated]

### User | 2026-06-04T03:58:44.931Z

[tool_result] param(
  [string]$TaskName = 'PRISM MCP Priority Guardian',
  [int]$EveryMinutes = 1,
  # Phase offset so this task doesn't land on the same wall-clock minute as
  # the supervisor / watchdog (+90s) / fleet-reaper (+210s) / memory monitor
  # (+330s). +150s lands clear of them.
  [int]$StartOffsetSeconds = 150,
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$AsSystem
)

# in
... [+4837 chars truncated]

### Assistant | 2026-06-04T03:58:48.558Z

Now I have both files. Let me verify a few integration claims before grading — specifically whether `ollama-cpu-throttle` is actually disabled, whether the fleet-reaper touches process priorities (flip-flop war risk), and how the sibling watchdog installer is structured.

### Assistant | 2026-06-04T03:58:50.117Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:58:50.440Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:58:50.918Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:58:51.350Z

[tool_use: Glob]

### User | 2026-06-04T03:58:55.940Z

[tool_result] Found 3 files
.claude\helpers\install-mcp-priority-guardian-task.ps1
.claude\helpers\claude-tree-priority.mjs
.claude\helpers\slot-job-object.ps1

### User | 2026-06-04T03:58:56.248Z

[tool_result] Found 4 files
scripts\mcp-priority-guardian.ps1
scripts\ollama-cpu-throttle.ps1
scripts\fleet-reaper-sweep.mjs
scripts\lib\reaper-self-io-priority.mjs

### User | 2026-06-04T03:59:11.246Z

[tool_result] .claude\helpers\install-mcp-server-watchdog-task.ps1

### User | 2026-06-04T03:59:11.290Z

[tool_result] scripts\ollama-cpu-throttle.ps1

### Assistant | 2026-06-04T03:59:15.480Z

There are competing schedulers. Let me check exactly what `claude-tree-priority.mjs`, `slot-job-object.ps1`, `fleet-reaper-sweep.mjs`, and `reaper-self-io-priority.mjs` do to process priorities — this is the flip-flop war risk. And the disabled-state of ollama-cpu-throttle and the sibling watchdog settings.

### Assistant | 2026-06-04T03:59:21.565Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:59:22.131Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:59:22.948Z

[tool_use: Bash]

### User | 2026-06-04T03:59:39.668Z

[tool_result] 2: * claude-tree-priority.mjs — pure-injected helper for FLEET-REAPER-MS3/U-FR-MS3-A.
4: * Walk a process tree rooted at a claude.exe and set its priority class so the
6: * the idle siblings. Strictly capped at AboveNormal (Above-Normal is the
7: * highest safe class — High and Realtime affect scheduler stability and are
11: *   1. Never set above AboveNormal — `parsePriorityName` rejects High/Rea
... [+1624 chars truncated]

### User | 2026-06-04T03:59:56.813Z

[tool_result] 176:if (-not ([System.Management.Automation.PSTypeName]'PrismJobObject').Type) {
182:public static class PrismJobObject {
188:    public const int  JobObjectBasicAccountingInformation = 1;
189:    public const int  JobObjectExtendedLimitInformation   = 9;
207:        public UIntPtr Affinity;
208:        public UInt32 PriorityClass;
245:    static extern IntPtr CreateJobObject(IntPtr lpJobAttribute
... [+2976 chars truncated]

### User | 2026-06-04T04:00:16.085Z

[tool_result] H:/prism/scripts/fleet-reaper-sweep.mjs:97:// FLEET-REAPER-MS3/U-FR-MS3-D: drop reaper self CPU priority during sweep so
H:/prism/scripts/fleet-reaper-sweep.mjs:106:} from "./lib/reaper-self-io-priority.mjs";
H:/prism/scripts/fleet-reaper-sweep.mjs:120:import { setPriorityForPids as _setPriorityForPidsExternal } from "../.claude/helpers/claude-tree-priority.mjs";
H:/prism/scripts/fleet-reaper-swee
... [+4530 chars truncated]

### Assistant | 2026-06-04T04:00:21.111Z

This is the critical finding. There IS a competing scheduler. Let me confirm the exact interaction: the fleet-reaper demotes idle slot trees (claude.exe + descendants including node) to BelowNormal, and `claude-tree-priority.mjs` boosts the active claude tree to AboveNormal. The MCP server is a node process — I need to confirm whether the MCP `:3100` node listener is a descendant of a claude.exe tree (which would make it subject to reaper demotion AND tree-priority boost), which would fight the guardian. Let me check how the MCP server is spawned and whether the reaper could demote it.

### Assistant | 2026-06-04T04:00:23.005Z

[tool_use: Bash]

### Assistant | 2026-06-04T04:00:24.423Z

[tool_use: Bash]

### User | 2026-06-04T04:01:05.220Z

[tool_result] // PowerShell enumeration can fail). Knob: PRISM_FLEET_REAPER_BALLAST_MB (0=off).
export const DEFAULT_BALLAST_MB = 256;
const MAX_BALLAST_MB = 4096;

// ── FLEET-REAPER-MS1 Layer 1: soft RAM/CPU relief ──
// Under memory pressure, processes owned by STALE chat slots (no heartbeat in
// 2-10 min — see process-slot-map.mjs) get a reversible nudge: CPU priority
// dropped to BelowNormal + working se
... [+4524 chars truncated]

### User | 2026-06-04T04:03:42.852Z

[tool_result] 3:// the Stop-hook arm, the /fleet-reaper skill, the alpha-guardian) — never via
12: * spawns node.exe (hooks/helpers/MCP), bash.exe (the Bash tool), and git.exe
21: * — gated by a confirm-after-N-ticks rule so a brief heartbeat gap never kills a
30: *   - the process is older than the age floor (default 45s — never touch a
46: *   node fleet-reaper-sweep.mjs --dry-run             # classify + dec
... [+2407 chars truncated]

### Assistant | 2026-06-04T04:03:47.538Z

Important: the reaper DOES have an MCP-protect regex (`_MCP_PROTECT_REGEX`) that excludes `dist[\\/]index\.js`, `mcp-http-bridge`, `mcp-server-supervisor`, etc. from reaping. Let me verify whether that protection also covers the soft-relief (priority-demote) path, or only the kill path — because if soft-relief demotes the MCP server to BelowNormal while the guardian raises it to AboveNormal, that's the flip-flop war. Let me check `selectSoftReliefTargets` and whether protected PIDs are filtered there.

### Assistant | 2026-06-04T04:03:49.169Z

[tool_use: Bash]

### User | 2026-06-04T04:04:03.128Z

[tool_result]  * Never reap an mcp-http-bridge / mcp-server-supervisor / mcp dist server / the
 * fleet-reaper itself / the standalone MCP watchdog — regardless of how a PID
 * arrived on the kill list. The classify path treats bridges whose parent
 * claude.exe is gone as "owned-by-crashed"; killing those bridges drops the
 * chat's `prism` connection for the rest of its session, which is the actual
 * user-fa
... [+4465 chars truncated]

### Assistant | 2026-06-04T04:04:08.150Z

This confirms the critical concern. The `getProtectedPids()` / `reapProcesses()` BRIDGE-PROTECT only applies to the **kill** path (`reapProcesses`). The **soft-relief priority-demote** path (`applyPriorityRelief` → `selectSoftReliefTargets`) does NOT consult `getProtectedPids()`. Let me confirm `selectSoftReliefTargets` does not exclude protected PIDs, and confirm what the MCP server process actually is (whether it's `dist/index.js` matched by the protect regex, and whether soft-relief targets node processes by RSS regardless of protection).

### Assistant | 2026-06-04T04:04:09.686Z

[tool_use: Bash]

### User | 2026-06-04T04:04:23.664Z

[tool_result] 641:let _protectedPidCache = { ts: 0, pids: new Set() };
642:function getProtectedPids() {
645:  if (now - _protectedPidCache.ts < PROTECT_CACHE_TTL_MS) return _protectedPidCache.pids;
656:    _protectedPidCache = { ts: now, pids };
659:    return _protectedPidCache.pids; // fail-safe: better to skip a kill than wrongly kill a bridge
667:  // BRIDGE-PROTECT: filter the kill list against the MCP-br
... [+1364 chars truncated]

### Assistant | 2026-06-04T04:04:28.373Z

Let me read `selectSoftReliefTargets` and `buildProtectedPidSet` to determine definitively whether the MCP server can be soft-relief-demoted to BelowNormal (which would fight the guardian).

### Assistant | 2026-06-04T04:04:28.778Z

[tool_use: Bash]

### Assistant | 2026-06-04T04:04:28.563Z

[tool_use: Bash]

### User | 2026-06-04T04:04:36.177Z

[tool_result]   const counts = { alive: 0, stale: 0, crashed: 0, idle: 0 };
  for (const status of seen.values()) {
    if (Object.prototype.hasOwnProperty.call(counts, status)) counts[status] += 1;
  }
  return counts;
}

/**
 * Select processes eligible for a soft (reversible) pressure nudge. Pure.
 *
 * Two target sets, merged:
 *
 * (1) STALE-OWNED (always): processes whose classified `class` is
 *     `own
... [+4103 chars truncated]

### User | 2026-06-04T04:04:46.854Z

[tool_result] 163:import { runStuckHunters, buildProtectedPidSet } from "./lib/fleet-reaper-stuck-hunters.mjs";
2035:      // buildProtectedPidSet collects self + ancestors + descendants; both
2037:      const protectedPids = buildProtectedPidSet(procs, process.pid);
2127:      const protectedPids = buildProtectedPidSet(procs, process.pid);
2179:      const protectedPids = buildProtectedPidSet(procs, process.pi
... [+118 chars truncated]

### Assistant | 2026-06-04T04:04:52.332Z

Now I have the definitive picture for the flip-flop war analysis. The soft-relief path keys on the classified `class` field (`owned-by-stale` or `owned-by-alive-large`), NOT on the MCP-protect regex. The crucial question: is the MCP `:3100` server classified as `owned-by-alive`/`owned-by-stale` (a slot descendant) or is it excluded from classification as a protected/standalone process? The protect comment says "classifyProcess already excluded them." Let me verify the MCP server is a standalone/supervisor-spawned process (not a claude.exe descendant), confirm the ollama-cpu-throttle disabled state, and check the sibling watchdog installer settings for convention drift.

### Assistant | 2026-06-04T04:04:54.698Z

[tool_use: Bash]

### Assistant | 2026-06-04T04:04:56.633Z

[tool_use: Bash]

### Assistant | 2026-06-04T04:04:58.899Z

[tool_use: Bash]

### User | 2026-06-04T04:05:05.308Z

[tool_result] 29: *   - classifyProcess() returned `owned-by-crashed` or `unowned` (a reap CANDIDATE)
489: * @param {object} candidate  the current classifyProcess() result
624: * Never reap an mcp-http-bridge / mcp-server-supervisor / mcp dist server / the
625: * fleet-reaper itself / the standalone MCP watchdog — regardless of how a PID
638:const _MCP_PROTECT_REGEX = "mcp-http-bridge|mcp-server-supervisor|dis
... [+1570 chars truncated]

### User | 2026-06-04T04:05:13.260Z

[tool_result] 13:# Disable: schtasks /Change /TN "PRISM Ollama CPU Throttle" /DISABLE
=== is the task actually disabled? check installer ===

### User | 2026-06-04T04:05:21.291Z

[tool_result] 22:# minutes, probes /health, and after $FAIL_THRESHOLD consecutive failures
33:# RestartCount/Interval recovery).
71:if (-not (($head -match 'mcp-server-watchdog') -and ($head -match 'FAIL_THRESHOLD'))) {
72:  throw "Refusing to install: $watchdogScript does not look like mcp-server-watchdog.mjs (missing header markers)."
89:# ExecutionTimeLimit 2 min: a worst-case probe + kill + supervisor-spawn
... [+549 chars truncated]

### Assistant | 2026-06-04T04:05:26.735Z

I have enough to determine the soft-relief interaction definitively. The key question is whether `classifyProcess` excludes the MCP server from the `owned-by-alive`/`owned-by-stale` classes (which feed soft-relief). Let me check how the supervisor spawns the MCP server (is it a child of a claude tree or standalone) and verify whether the protect regex is applied during classification or only at kill time.

### Assistant | 2026-06-04T04:05:27.253Z

[tool_use: Bash]

### User | 2026-06-04T04:05:43.789Z

[tool_result]       writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}`, { flag: "wx" });
      acquired = true;
      break;
    } catch {
      try {
        const st = statSync(lockPath);
        if (Date.now() - st.mtimeMs > LEDGER_LOCK_TIMEOUT_MS) {
          writeFileSync(lockPath, `${process.pid}`, { flag: "w" }); // break stale lock
          acquired = true;
          break;
        }
... [+2043 chars truncated]

### Assistant | 2026-06-04T04:06:46.773Z

I have what I need. The MCP server is spawned by the `mcp-server-supervisor` (a standalone, not a claude.exe descendant), so the reaper's `classifyProcess` would put it as `unowned`/protected — meaning the soft-relief `owned-by-stale`/`owned-by-alive` filter won't normally target it. So the flip-flop war risk via the reaper is bounded but not zero (the soft-relief path does NOT consult the MCP-protect regex, so if the supervisor ever spawns under a different ancestry classification it could be hit). The guardian's 1-min re-assert would override any BelowNormal demotion within 60s regardless.

I now have everything needed across all six review axes. Let me also quickly confirm the affinity overlap footgun semantics and the `Get-NetTCPConnection` first-match risk by checking if anything else could transiently bind 3100.

The analysis is complete. Here is my independent second-pass verdict.

---

## VERDICT: PASS (with 2 P1 findings + 4 P2/notes)

Both scripts are operationally sound, reversible, idempotent, and correctly avoid the dangerous priority classes (never High/Realtime). The core fix is well-reasoned and the affinity gating is sensible. No P0 blockers. I found two P1 issues that warrant fixing before this is considered durable, plus several lower-severity notes the first pass may have under-weighted.

---

### P1 findings

**P1-1 — `Get-NetTCPConnection -LocalPort 3100 | Select -First 1` can raise the WRONG process to AboveNormal (guardian raising a transient impostor).**
`H:\prism\scripts\mcp-priority-guardian.ps1:73-78`. The guardian trusts whatever owns the `:3100` listener with zero identity verification. The sibling reaper deliberately does NOT trust port/name alone — it verifies the command line matches `mcp-http-bridge|mcp-server-supervisor|dist[\\/]index\.js` (`fleet-reaper-sweep.mjs:638`). The guardian has no such check. Failure modes:
- During an MCP restart window, a stale TIME_WAIT or a freshly-bound non-MCP node process (or any operator tool that
... [+8971 chars truncated]
