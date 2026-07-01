---
type: "chat-session"
source: "claude-code-cli"
session_id: "b41ca5c4-7331-45fe-9acc-f6e302e6e33c"
title: "Review a safety-sensitive change to two files (read both fully): - H:/prism/scri"
date: "2026-06-23"
first_ts: "2026-06-23T13:30:00.212Z"
last_ts: "2026-06-23T13:36:41.513Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/b41ca5c4-7331-45fe-9acc-f6e302e6e33c/subagents/agent-a145b66280632e845.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Review a safety-sensitive change to two files (read both fully): - H:/prism/scri

> **claude-code-cli** | 2026-06-23 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b41ca5c4-7331-45fe-9acc-f6e302e6e33c/subagents/agent-a145b66280632e845.jsonl`

## Transcript

### User | 2026-06-23T13:30:00.212Z

Review a safety-sensitive change to two files (read both fully):
- H:/prism/scripts/ollama-wedge-guard.mjs
- H:/prism/scripts/ollama-wedge-guard.test.mjs

CONTEXT: the script auto-recovers a wedged local Ollama daemon by reaping a dead-parent llama-server.exe orphan and restarting the 'PRISM Ollama Serve' Windows scheduled task. THIS CHANGE: (1) extracted the inline PowerShell recovery string into a new pure exported function `buildRecoveryScript(serveTask)`; (2) added `Enable-ScheduledTask` immediately BEFORE `Start-ScheduledTask` — a fix for a LIVE bug where the task was DISABLED, so the old Stop+Start produced `start-fail: The task is disabled` and left Ollama DOWN (worse than wedged); (3) added `windowsHide:true` to the spawnSync; (4) added 3 tests for buildRecoveryScript.

VERIFY (grade each): (a) the Enable-before-Start ordering is correct and Enable-ScheduledTask is idempotent/behavior-neutral when the task is already enabled; (b) NO regression to the orphan-reap loop or the Stop-before-Start sequencing; (c) PowerShell-injection / quoting safety of the `${serveTask}` interpolation (it is env-overridable via PRISM_OLLAMA_SERVE_TASK — is that a real risk here?); (d) the new tests would actually FAIL if the enable-before-start ordering regressed (R9 — tests verify intent); (e) shouldRecover still gates the destructive recovery to ONLY the 'wedged' class; (f) any silent-failure or error-budget gap introduced.

Read-only. Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Be terse.

### Assistant | 2026-06-23T13:30:05.750Z

I'll read both files fully.

### Assistant | 2026-06-23T13:30:06.228Z

[tool_use: Read]

### Assistant | 2026-06-23T13:30:06.642Z

[tool_use: Read]

### User | 2026-06-23T13:30:08.412Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-wedge-guard.mjs -- detect + auto-recover the Ollama "generate WEDGE"
4	 * (BRAVO AI-SYNERGY-SUBSTRATE-GUARD, slot:bravo 2026-06-13).
5	 *
6	 * THE GAP this closes: the existing health probes are blind to the wedge.
7	 *   - scripts/ollama-docker-health.mjs probes ONLY /api/tags (metadata) -> reports "up" while
8	 *     /api/generate hangs.
9	 *   - scripts/f
... [+10391 chars truncated]

### User | 2026-06-23T13:30:08.943Z

[tool_result] 1	/**
2	 * Tests for ollama-wedge-guard.mjs (BRAVO AI-SYNERGY-SUBSTRATE-GUARD).
3	 * Pure-classifier tests. The probe + recovery are live/host-specific (validated separately).
4	 * Run: node --test scripts/ollama-wedge-guard.test.mjs
5	 */
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import { classifyOllamaHealth, shouldRecover, buildRecoveryScript } from "./oll
... [+5744 chars truncated]

### Assistant | 2026-06-23T13:30:15.093Z

Let me verify the `gpu-vram-guard` dependency exists and check the consumer of this script (the scheduled task or watchdog that invokes it).

### Assistant | 2026-06-23T13:30:17.049Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:30:18.071Z

[tool_use: Bash]

### User | 2026-06-23T13:30:27.780Z

[tool_result] 582b17b180 [MAIN-FORCE] [AI-SYNERGY-SUBSTRATE-GUARD]/U-OLLAMA-WEDGE-GUARD-HARDEN (slot:bravo): reuse canonical multi-GPU VRAM reader + discriminate 404 from hang (3-of-3 arm-C P1/P2)
ac1c756d5e [MAIN-FORCE] [AI-SYNERGY-SUBSTRATE-GUARD]/U-OLLAMA-WEDGE-GUARD (slot:bravo): detect + recover the recurring Ollama generate-WEDGE (self-heal the fleet's local-AI substrate)
---diff vs HEAD---
diff --git a/s
... [+5292 chars truncated]

### User | 2026-06-23T13:35:20.356Z

[tool_result] Command running in background with ID: bzurojbh7. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\b41ca5c4-7331-45fe-9acc-f6e302e6e33c\tasks\bzurojbh7.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-23T13:35:23.753Z

Let me get the background command output and verify the test actually passes and the script parses.

### Assistant | 2026-06-23T13:35:25.646Z

[tool_use: Read]

### User | 2026-06-23T13:35:26.604Z

[tool_result] 1	-rw-r--r-- 1 wompu 197611 9297 Jun 10 09:27 scripts/lib/gpu-vram-guard.mjs
2	---callers---
3	

### Assistant | 2026-06-23T13:35:30.788Z

The dependency exists. No callers found (no scheduled task / watchdog invokes this script yet — it's run-on-demand / via the documented scheduled-task path). Let me run the tests and verify the script syntax-parses.

### Assistant | 2026-06-23T13:35:32.106Z

[tool_use: Bash]

### Assistant | 2026-06-23T13:35:33.875Z

[tool_use: Bash]

### User | 2026-06-23T13:35:38.586Z

[tool_result]   ...
# Subtest: buildRecoveryScript: ENABLES the serve task BEFORE starting it (the 2026-06-23 disabled-task fix)
ok 10 - buildRecoveryScript: ENABLES the serve task BEFORE starting it (the 2026-06-23 disabled-task fix)
  ---
  duration_ms: 0.2656
  ...
# Subtest: buildRecoveryScript: still reaps the dead-parent orphan + stops the task first (no regression)
ok 11 - buildRecoveryScript: still reap
... [+412 chars truncated]

### User | 2026-06-23T13:35:47.553Z

[tool_result] SYNTAX_OK
---scheduled-task / watchdog refs---
.claude/helpers/install-ollama-wedge-guard-task.ps1:11:# install-ollama-wedge-guard-task.ps1 -- durable USER-LEVEL scheduled task that runs
.claude/helpers/install-ollama-wedge-guard-task.ps1:44:$script = Join-Path $RepoRoot 'scripts\ollama-wedge-guard.mjs'

### Assistant | 2026-06-23T13:35:51.460Z

12/12 tests pass, script parses. There is a real consumer: `install-ollama-wedge-guard-task.ps1`. Let me read it to verify how the script is invoked (the `--recover` path that actually triggers the destructive recovery) and confirm the task runs elevated enough for `Enable-ScheduledTask`.

### Assistant | 2026-06-23T13:35:51.878Z

[tool_use: Read]

### User | 2026-06-23T13:35:52.814Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-ollama-wedge-guard-task.ps1' was already read 6m ago in this session and is unchanged (mtime 1782221304787). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### Assistant | 2026-06-23T13:35:56.722Z

[tool_use: Bash]

### User | 2026-06-23T13:36:01.290Z

[tool_result] 12:# `node scripts/ollama-wedge-guard.mjs --recover` so the recurring Ollama /api/generate
23:$ErrorActionPreference = 'Stop'
26:$NodeExe  = if (Get-Command node -ErrorAction SilentlyContinue) { (Get-Command node).Source } else { 'H:\Tools\nodejs\node.exe' }
30:  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
47:$action  = New-ScheduledTaskAction -Execute $NodeExe -Argument
... [+589 chars truncated]

### Assistant | 2026-06-23T13:36:05.904Z

I have what I need. Let me check the registration's privilege level (line ~49) since `Enable-ScheduledTask` and `Stop-Process -Force` on another user's runner need elevation.

### Assistant | 2026-06-23T13:36:08.629Z

[tool_use: Bash]

### User | 2026-06-23T13:36:13.584Z

[tool_result] }

if (-not (Test-Path $NodeExe)) { throw "node not found at $NodeExe (set PATH or edit installer)" }

$script = Join-Path $RepoRoot 'scripts\ollama-wedge-guard.mjs'
if (-not (Test-Path $script)) { throw "missing $script" }

$action  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$script`" --recover" -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -Re
... [+582 chars truncated]

### Assistant | 2026-06-23T13:36:41.513Z

I have everything needed. The installer registers a USER-LEVEL task (no `-Principal ... -RunLevel Highest`), which is a pre-existing property of the unchanged installer, not introduced by this diff. My findings on the diff under review:

VERDICT: PASS

summary: The diff is a clean, surgical extraction of the recovery string into a pure `buildRecoveryScript(serveTask)` plus the live-bug fix (Enable-before-Start) and `windowsHide:true`. The destructive path is still double-gated (`shouldRecover` + `--recover` flag) to the `wedged` class only; the orphan-reap loop and Stop->Start sequencing are byte-identical aside from the two inserted Enable lines. 12/12 tests pass, script parses. No P0/P1 silent breakage found.

Per the requested grading axes:

- (a) Enable-before-Start ordering — CORRECT. `Enable-ScheduledTask` (`ollama-wedge-guard.mjs:140`) precedes `Start-ScheduledTask` (`:141`). `Enable-ScheduledTask` on an already-enabled task is a no-op (idempotent/behavior-neutral) — the claim in the docstring (`:127-128`) holds. It is also wrapped in `try{}catch{}` with `-ErrorAction SilentlyContinue | Out-Null`, so even a permission failure to enable won't abort the subsequent Start. PASS.

- (b) No regression to orphan-reap or Stop-before-Start — CONFIRMED. The dead-parent-gated reap loop (`:132-135`), the `Stop-ScheduledTask` (`:136`), the two `Start-Sleep 2` (`:137`,`:139`), and the belt-and-suspenders `Stop-Process ollama,llama-server` (`:138`) are unchanged from the prior `recover()` body (verified against the diff: only the two Enable lines added and `${SERVE_TASK}`->`${serveTask}` param-renamed). PASS.

- (c) PowerShell-injection of `${serveTask}` — LOW/acceptable risk, NOT introduced by this diff. The value is interpolated inside single-quoted PS literals (`-TaskName '${serveTask}'`). A `'` in the env value would break out, but the source is `PRISM_OLLAMA_SERVE_TASK` — operator-set environment, not untrusted/network/file input. The pre-existing code already interpol
... [+2423 chars truncated]
