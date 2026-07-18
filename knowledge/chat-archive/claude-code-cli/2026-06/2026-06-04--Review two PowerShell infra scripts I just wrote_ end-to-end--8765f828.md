---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "Review two PowerShell infra scripts I just wrote, end-to-end, for correctness an"
date: "2026-06-04"
first_ts: "2026-06-04T03:57:34.408Z"
last_ts: "2026-06-04T04:00:21.614Z"
cwd: "H:\\PRISM"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/agent-add3f61ad9b575ddc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Review two PowerShell infra scripts I just wrote, end-to-end, for correctness an

> **claude-code-cli** | 2026-06-04 | 15 msgs (6 user / 9 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/agent-add3f61ad9b575ddc.jsonl`

## Transcript

### User | 2026-06-04T03:57:34.408Z

Review two PowerShell infra scripts I just wrote, end-to-end, for correctness and safety. Grade PASS/FAIL and list P0/P1 issues with file:line.

FILES (read both fully):
1. H:\prism\scripts\mcp-priority-guardian.ps1
2. H:\prism\.claude\helpers\install-mcp-priority-guardian-task.ps1

CONTEXT / what they must do:
- Permanently relieve a recurring "MCP DISCONNECTED" drop caused by CPU priority inversion: ollama `llama-server.exe` RUNNER processes respawn at AboveNormal priority and preempt the Normal-priority MCP server (the :3100 Node listener), starving its event loop. The guardian runs every 1 min as a Windows scheduled task and: demotes llama-server runners -> Normal, raises the MCP :3100 listener -> AboveNormal. Affinity pinning is OPT-IN via env masks (default 0 = no affinity change). It must NOT touch `ollama.exe` (the serve/model-load process) — only `llama-server.exe` runners.
- Supersedes a now-DISABLED ollama-cpu-throttle.ps1 task.
- The installer registers the task (default principal = current user S4U; -AsSystem requires elevation), with header-marker sanity check, -Uninstall/-RunNow/-DryRun.

VERIFY CAREFULLY:
1. **Windows PowerShell 5.1 compatibility** — the scheduled task runs `powershell.exe` (5.1, NOT pwsh 7). Flag any 7-only syntax (e.g. ternary `? :`, `??`, `-Parallel`, `Clean{}` blocks). My guardian uses `$(if(){}else{})`, `-notin`, `[System.Diagnostics.ProcessPriorityClass]` cast from string, Get-NetTCPConnection, [IntPtr][int64] affinity — confirm all are 5.1-valid.
2. Idempotency (only change a process when class/affinity differs) + fail-soft (per-process try/catch; a process exiting mid-loop must not crash the run) + knob gating (PRISM_MCP_GUARDIAN_DISABLE).
3. The priority class is never set to High/Realtime (would starve the OS) — confirm the guard clamps to Normal/AboveNormal only.
4. Affinity logic: [IntPtr]$maskN only applied when mask > 0; correct bitmask semantics.
5. Installer correctness: trigger/settings/principal construction valid f
... [+491 chars truncated]

### Assistant | 2026-06-04T03:57:45.450Z

I'll review both PowerShell infra scripts end-to-end. Let me read both files fully.

### Assistant | 2026-06-04T03:57:45.918Z

[tool_use: Read]

### Assistant | 2026-06-04T03:57:46.345Z

[tool_use: Read]

### User | 2026-06-04T03:57:50.549Z

[tool_result] 1	# mcp-priority-guardian.ps1  (PRISM MCP Priority Guardian, slot golf, 2026-06-03)
2	# FAIL_THRESHOLD / mcp-priority-guardian header markers (installer sanity-check).
3	#
4	# PURPOSE — permanently fix the recurring "MCP DISCONNECTED" drop caused by CPU
5	# event-loop starvation under aggregate fleet load (200+ /loop sessions +
6	# Obsidian + Defender + ollama). Two compounding causes this closes:
... [+5067 chars truncated]

### User | 2026-06-04T03:57:51.288Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM MCP Priority Guardian',
3	  [int]$EveryMinutes = 1,
4	  # Phase offset so this task doesn't land on the same wall-clock minute as
5	  # the supervisor / watchdog (+90s) / fleet-reaper (+210s) / memory monitor
6	  # (+330s). +150s lands clear of them.
7	  [int]$StartOffsetSeconds = 150,
8	  [switch]$DryRun,
9	  [switch]$RunNow,
10	  [switch]$Uninstall,
11	  [
... [+5174 chars truncated]

### Assistant | 2026-06-04T03:57:54.349Z

Both files read fully. Let me verify a few specifics empirically before grading — the PS 5.1 string-to-enum cast, the `-match` semantics on an array (the header-marker check), and the affinity comparison semantics.

### Assistant | 2026-06-04T03:57:59.539Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:58:02.316Z

[tool_use: Bash]

### User | 2026-06-04T03:58:18.320Z

[tool_result] cast=AboveNormal
notin=True
m1=True
m2=True
combined=True

### User | 2026-06-04T03:58:36.400Z

[tool_result] Major  Minor  Build  Revision
-----  -----  -----  --------
5      1      22621  6133    



intptr=15
eq=True
ne=False
ne_diff=True

### Assistant | 2026-06-04T03:58:40.186Z

All core PS 5.1 semantics confirmed valid on the actual 5.1 runtime. Let me verify two more edge cases: the `Get-NetTCPConnection` availability/`OwningProcess` field, and a subtle issue with how `$mcpClass` is consumed when an env var is set but is an invalid-but-nonempty class string vs. the cast on line 81.

### Assistant | 2026-06-04T03:58:46.547Z

[tool_use: Bash]

### User | 2026-06-04T03:59:33.358Z

[tool_result] hasCmd=True
bogus_cast=THROWS
high_cast_ok=High
emptyEnv=default

### Assistant | 2026-06-04T04:00:21.614Z

All semantics confirmed. I now have everything needed to grade. Let me consolidate findings.

Key verifications:
- PS 5.1 `[ProcessPriorityClass]'AboveNormal'` cast works; invalid strings throw (so the line-53 guard is load-bearing and correct).
- `-notin @('Normal','AboveNormal')` clamps High/Realtime correctly.
- `$head -match 'X'` on the 5-line array returns truthy correctly; both markers present in lines 1-2 of the guardian — the sanity check matches.
- `[IntPtr]$int64` and `-ne` comparison between IntPtr values work for idempotent affinity diffing.
- `Get-NetTCPConnection` + `.OwningProcess` available on 5.1.
- Empty-string env → `if($e)` falls to default branch.

---

## Code Quality Analysis Report

### Summary
- **Overall Grade: PASS** (with 1 P1 correctness gap and several P2 hardening items)
- Files Analyzed: 2
- Both scripts are Windows PowerShell 5.1-compatible — no 7-only syntax present. `$(if(){}else{})`, `-notin`, the string→`[ProcessPriorityClass]` cast, `Get-NetTCPConnection`, and `[IntPtr][int64]` affinity were all empirically validated on the live 5.1.22621 runtime.

The design is sound: it targets `llama-server.exe` only (never `ollama.exe`), clamps priority to Normal/AboveNormal, makes affinity strictly opt-in, is idempotent and fail-soft, and honors the disable knob. Verdict criteria 1, 2, 3, 4 all hold. The findings below are real but none are release-blocking on their own; the P1 is a robustness gap you should fix.

---

### P1 Findings

**P1-1 — Single-listener assumption silently mis-targets a stale/peer process. (mcp-priority-guardian.ps1:77)**
`Get-NetTCPConnection -LocalPort $port -State Listen | Select-Object -First 1` takes whichever listener the OS enumerates first. Your own context flags "multiple listeners on the port" as an edge case. With IPv4+IPv6 dual-stack, the *same* Node process appears twice (harmless), but during a watchdog restart there can be a brief window with a dying old PID and a fresh PID both transiently bound, or a
... [+6170 chars truncated]
