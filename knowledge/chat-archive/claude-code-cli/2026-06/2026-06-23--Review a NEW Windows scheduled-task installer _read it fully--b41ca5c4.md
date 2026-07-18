---
type: "chat-session"
source: "claude-code-cli"
session_id: "b41ca5c4-7331-45fe-9acc-f6e302e6e33c"
title: "Review a NEW Windows scheduled-task installer (read it fully): - H:/prism/.claud"
date: "2026-06-23"
first_ts: "2026-06-23T13:30:12.159Z"
last_ts: "2026-06-23T13:31:43.792Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 7
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/b41ca5c4-7331-45fe-9acc-f6e302e6e33c/subagents/agent-aa875034a6c27ff52.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review a NEW Windows scheduled-task installer (read it fully): - H:/prism/.claud

> **claude-code-cli** | 2026-06-23 | 18 msgs (7 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b41ca5c4-7331-45fe-9acc-f6e302e6e33c/subagents/agent-aa875034a6c27ff52.jsonl`

## Transcript

### User | 2026-06-23T13:30:12.159Z

Review a NEW Windows scheduled-task installer (read it fully):
- H:/prism/.claude/helpers/install-ollama-wedge-guard-task.ps1

It registers a user-level task 'PRISM Ollama Wedge Guard' that runs `node scripts/ollama-wedge-guard.mjs --recover` every 10 minutes so the recurring Ollama /api/generate wedge self-heals unattended. The guard is double-gated: ONLY a confirmed 'wedged' classification (generate hangs + RAM/VRAM free) triggers the destructive reap+restart; a healthy host just runs a ~4s generate probe and exits 0.

COMPARE against the sibling it was cloned from (read it too):
- H:/prism/.claude/helpers/install-ollama-embed-keepalive-task.ps1

VERIFY (grade each): (1) convention conformance with the sibling — param block, Remove-IfExists, node resolution ($NodeExe), Register-ScheduledTask shape, -Uninstall and -RunNow handling, $RepoRoot resolution; (2) the `--recover` argument is correctly quoted/passed in the -Argument string; (3) cadence safety — is running `--recover` every 10 min on a HEALTHY host safe + non-thrashing, given the double-gating?; (4) any risk of a restart/flap loop or interfering with the 'PRISM Ollama Serve' task it restarts; (5) security/blast-radius of the scheduled action (it can kill ollama/llama-server and restart a task) — is user-level/no-UAC appropriate?; (6) anything that would make the task silently fail to register or run.

Read-only. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Be terse.

### Assistant | 2026-06-23T13:30:15.859Z

I'll review both files end to end, then verify the guard script the task invokes.

### Assistant | 2026-06-23T13:30:16.346Z

[tool_use: Read]

### Assistant | 2026-06-23T13:30:16.628Z

[tool_use: Read]

### User | 2026-06-23T13:30:17.610Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-ollama-embed-keepalive-task.ps1' was already read 3m ago in this session and is unchanged (mtime 1781118075824). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### User | 2026-06-23T13:30:18.834Z

[tool_result] 1	param(
2	  # Cadence (minutes). The guard is double-gated (only the 'wedged' class triggers a
3	  # reap+restart), so a 10-min tick on a HEALTHY host just runs the ~4s generate probe
4	  # (qwen2.5-coder:1.5b, keep_alive 30m) -> it doubles as a health monitor + warm-probe.
5	  # On a real wedge it self-heals within <=10 min instead of staying dark for days.
6	  [int]$EveryMinutes = 10,
7	  [swit
... [+2761 chars truncated]

### Assistant | 2026-06-23T13:30:22.480Z

The sibling file is already in my context from earlier this session. Let me retrieve its content to compare against, then read the guard script that the task invokes.

### Assistant | 2026-06-23T13:30:23.887Z

[tool_use: Grep]

### Assistant | 2026-06-23T13:30:24.126Z

[tool_use: Read]

### User | 2026-06-23T13:30:24.918Z

[tool_result] 1:param(
2:  # Cadence (minutes). nomic-embed-text is pinned with keep_alive=30m, so a 4-min
3:  # tick keeps the 30m residency window always well ahead -- and re-warms within
4:  # <=4 min of any LRU eviction, so the latency-capped recall embed path almost
5:  # never finds the model cold.
6:  [int]$EveryMinutes = 4,
7:  [switch]$RunNow,
8:  [switch]$Uninstall
9:)
11:# install-ollama-embed-keepal
... [+2066 chars truncated]

### User | 2026-06-23T13:30:25.041Z

[tool_result] read-once-guard: 'H:\prism\scripts\ollama-wedge-guard.mjs' was already read 18s ago in this session and is unchanged (mtime 1782221056326). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-23T13:30:40.071Z

The read-once guard claims the guard script is in my context, but it isn't (this is a fresh agent thread). I'll disable the cache and read it.

### Assistant | 2026-06-23T13:30:41.896Z

[tool_use: Bash]

### User | 2026-06-23T13:30:47.101Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * ollama-wedge-guard.mjs -- detect + auto-recover the Ollama "generate WEDGE"
     4	 * (BRAVO AI-SYNERGY-SUBSTRATE-GUARD, slot:bravo 2026-06-13).
     5	 *
     6	 * THE GAP this closes: the existing health probes are blind to the wedge.
     7	 *   - scripts/ollama-docker-health.mjs probes ONLY /api/tags (metadata) -> reports "up" while
     8	 *    
... [+11028 chars truncated]

### Assistant | 2026-06-23T13:31:09.416Z

Now I have all three files. Let me verify one detail: the actual cadence/timeout math and whether the 10-min RepetitionInterval can overlap with the guard's worst-case runtime, plus confirm the serve task name matches.

### Assistant | 2026-06-23T13:31:10.869Z

[tool_use: Bash]

### User | 2026-06-23T13:31:15.652Z

[tool_result] .claude/helpers/install-ollama-wedge-guard-task.ps1:19:# enable+restarts the user-level "PRISM Ollama Serve" scheduled task. It deliberately does
.claude/helpers/install-ollama-wedge-guard-task.ps1:50:  -Description "Detect + auto-recover the recurring Ollama /api/generate wedge (reap dead-parent orphan + enable+restart 'PRISM Ollama Serve'). Double-gated: only a confirmed wedge triggers a restart
... [+1378 chars truncated]

### Assistant | 2026-06-23T13:31:43.792Z

I have everything needed. The serve task name is consistent and overridable. Final analysis.

---

VERDICT: PASS

summary: The new `install-ollama-wedge-guard-task.ps1` is a faithful, correct clone of the embed-keepalive sibling — identical param block, `Remove-IfExists`, `$NodeExe`/`$RepoRoot` resolution, `Register-ScheduledTask` shape, and `-Uninstall`/`-RunNow` handling. The `--recover` argument is correctly quoted/passed, and the double-gating in `ollama-wedge-guard.mjs` (only a confirmed `wedged` class triggers reap+restart; healthy/probe-error/resource-starved do not) makes the 10-min cadence safe and non-thrashing. No P0/P1 found; two P2 robustness notes below.

findings:
- [P2] `install-ollama-wedge-guard-task.ps1:48` — Worst-case guard runtime can approach the 10-min repetition interval, risking overlapping launches. `GEN_TIMEOUT_MS` defaults to 45s (`ollama-wedge-guard.mjs:40`); on `--recover` the script does gen-probe (≤45s) + `recover()` powershell (timeout 60s, `ollama-wedge-guard.mjs:147`) + 4s settle + a second full probe (≤45s + 8s tags) ≈ up to ~160s. That is well under 600s, so no real overlap today — but the trigger has no `-ExecutionTimeLimit`/`MultipleInstances` policy and the sibling lacks one too, so it inherits the Task Scheduler default (queue/ignore). Fix (optional hardening): add `New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew` and pass via `-Settings` so a hung probe can never stack instances. Not a regression vs the sibling.
- [P2] `install-ollama-wedge-guard-task.ps1:42,45` — `node` resolution and the `$script`/`$NodeExe` `Test-Path` guards throw at *install* time only; if `node` is later removed from PATH (and the `H:\Tools\nodejs\node.exe` fallback is absent) the scheduled run fails silently with a non-zero exit that only surfaces via the Fleet Task Health watchdog. This matches the sibling's behavior and the description documents the exit-1 alert path, so it is acceptable — not
... [+2852 chars truncated]
