---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Review this ONE PowerShell file end-to-end: `H:/prism-hotel-c2/scripts/cron/queu"
date: "2026-05-16"
first_ts: "2026-05-16T04:27:41.541Z"
last_ts: "2026-05-16T04:29:07.664Z"
cwd: "h:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ab3ed1d62c63dc8b7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review this ONE PowerShell file end-to-end: `H:/prism-hotel-c2/scripts/cron/queu

> **claude-code-cli** | 2026-05-16 | 20 msgs (8 user / 12 assistant) | cwd: h:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ab3ed1d62c63dc8b7.jsonl`

## Transcript

### User | 2026-05-16T04:27:41.541Z

Review this ONE PowerShell file end-to-end: `H:/prism-hotel-c2/scripts/cron/queue-processor-cron.ps1` (B3 U-QUEUE-PROCESSOR, OBSIDIAN-INTELLIGENCE-MS3). It registers a Windows scheduled task that runs `H:/prism-hotel-c2/scripts/queue-processor-daemon.mjs` every 2 hours.

It is deliberately modeled on the two sibling cron scripts — read them as the convention reference: `H:/prism-hotel-c2/scripts/cron/daily-context-cron.ps1` (B1, daily) and `H:/prism-hotel-c2/scripts/cron/connection-finder-cron.ps1` (B2, weekly). Also read the daemon it invokes (`scripts/queue-processor-daemon.mjs`) to confirm the invocation is correct.

Spec exit-condition #1 this file must satisfy: "Watcher service running (cron OR Stop hook poll, 2h cadence)".

Weight your review toward operator clarity + completeness + correctness:
1. The 2h cadence: `New-ScheduledTaskTrigger -Once -At $startBase -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration ([TimeSpan]::MaxValue)`. Is `[TimeSpan]::MaxValue` accepted by Register-ScheduledTask for an indefinite repetition on PowerShell 5.1 / Win11 Task Scheduler? (Known gotcha: some Win versions reject MaxValue and need a very-long finite span or omitting -RepetitionDuration.) If it's a risk, give the safer form.
2. `$startBase = (Get-Date).Date.AddHours((Get-Date).Hour + 1)` — is the start time always in the future? Edge: run at exactly xx:00:00; run at 23:xx (Hour 23 → +1 → AddHours(24) = midnight next day — correct?).
3. Idempotency: Uninstall-then-Register on refresh; the `-MultipleInstances IgnoreNew` re-entrancy guard (the engine doc relies on this being present); ExecutionTimeLimit 15min vs a 2h cadence (a hung pass is killed well before the next tick — good?).
4. Convention conformance vs B1/B2: param block, DryRun/Uninstall/RunNow, bootstrap build:fast, log path under state/shared/cron-logs/, Principal/Settings. Flag any drift.
5. Does it invoke the DAEMON correctly (the daemon takes no args for one-shot/cron mode — confirm no stray flag
... [+355 chars truncated]

### Assistant | 2026-05-16T04:27:47.249Z

I'll review this cron script end-to-end. Let me read the target file and its convention references.

### Assistant | 2026-05-16T04:27:47.685Z

[tool_use: Read]

### Assistant | 2026-05-16T04:27:48.100Z

[tool_use: Read]

### Assistant | 2026-05-16T04:27:48.526Z

[tool_use: Read]

### User | 2026-05-16T04:27:48.912Z

[tool_result] 1	#requires -Version 5.0
2	<#
3	.SYNOPSIS
4	  Register / unregister the PRISM Queue Processor scheduled task
5	  (OBSIDIAN-INTELLIGENCE-MS3 / B3 - U-QUEUE-PROCESSOR).
6	
7	.DESCRIPTION
8	  Fires scripts/queue-processor-daemon.mjs (one-shot, no args) every 2 hours.
9	  The daemon drains knowledge/memories/queue/ of RESEARCH-*/SYNTHESIZE-*/
10	  DRAFT-*.md task files via QueueProcessorEngine: bodies
... [+8088 chars truncated]

### Assistant | 2026-05-16T04:27:49.129Z

[tool_use: Read]

### User | 2026-05-16T04:27:49.335Z

[tool_result] 1	#requires -Version 5.0
2	<#
3	.SYNOPSIS
4	  Register / unregister the PRISM Daily Context Brief scheduled task (OBSIDIAN-INTELLIGENCE-MS3 / B1).
5	
6	.DESCRIPTION
7	  Fires DailyContextWorkflowEngine at 06:00 local time daily. The engine reads
8	  yesterday's daily note + active project overviews + inbox captures and writes
9	  knowledge/memories/generated/DAILY-CONTEXT-YYYY-MM-DD.md via Ollama 
... [+6655 chars truncated]

### User | 2026-05-16T04:27:49.757Z

[tool_result] 1	#requires -Version 5.0
2	<#
3	.SYNOPSIS
4	  Register / unregister the PRISM Weekly Connection Brief scheduled task
5	  (OBSIDIAN-INTELLIGENCE-MS3 / B2).
6	
7	.DESCRIPTION
8	  Fires ConnectionFinderEngine every Monday 08:00 local time. The engine scans
9	  the knowledge vault (memories + memories/inbox + wiki/code-tribal), calls
10	  Ollama qwen2.5-coder:7b, and writes
11	  knowledge/memories/gen
... [+6650 chars truncated]

### User | 2026-05-16T04:27:49.801Z

[tool_result] read-once-guard: 'H:\prism-hotel-c2\scripts\queue-processor-daemon.mjs' was already read 11m ago in this session and is unchanged (mtime 1778904947915). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-05-16T04:27:55.675Z

The daemon file content isn't actually in my visible context (the read-once guard claims it was read 11m ago, but I don't have it). Let me fetch the daemon's invocation contract directly.

### Assistant | 2026-05-16T04:27:56.030Z

[tool_use: Grep]

### User | 2026-05-16T04:27:56.725Z

[tool_result] 4- * ==============================================================================
5- * The invocation entry for `QueueProcessorEngine`. Two modes:
6- *
7: *   (default, one-shot)  — run ONE queue pass and exit. This is what the 2 h
8- *                          scheduled task (`scripts/cron/queue-processor-cron.ps1`,
9- *                          shipped in this same unit) calls. Re-entrancy is

... [+2475 chars truncated]

### Assistant | 2026-05-16T04:27:59.684Z

I have what I need. The daemon confirms: default invocation = one-shot mode (no args), `--watch` is the opt-in alternate. The cron script correctly invokes with no args. Let me verify two more daemon details — the engine-path env and exit-code contract — to confirm the cron's claims.

### Assistant | 2026-05-16T04:28:01.466Z

[tool_use: Grep]

### User | 2026-05-16T04:28:03.287Z

[tool_result] 38-import { pathToFileURL } from "node:url";
39-
40:const DEFAULT_VAULT_ROOT = "H:/prism/knowledge/memories";
41:const DEFAULT_ENGINE_JS = "H:/prism/mcp-server/dist/engines/QueueProcessorEngine.js";
42:const DEFAULT_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 h
43:const MIN_INTERVAL_MS = 60 * 1000; // floor — never hammer the vault faster than 1/min
44-
45-function parseArgs(argv) {
--
80-  const envRa
... [+1012 chars truncated]

### Assistant | 2026-05-16T04:28:05.966Z

I have everything needed for a complete review. Let me check the daemon's `runOnce` exit-code mapping (the cron's comment claims exit 0/1/2/3) to verify the comment is accurate.

### Assistant | 2026-05-16T04:28:06.825Z

[tool_use: Read]

### User | 2026-05-16T04:28:08.633Z

[tool_result] 120	async function runOnce(Engine) {
121	  const vaultRoot = process.env.PRISM_QUEUE_PROCESSOR_VAULT_ROOT || DEFAULT_VAULT_ROOT;
122	  const engine = new Engine();
123	  const startedAt = new Date().toISOString();
124	  let result;
125	  try {
126	    result = await engine.runQueue({ vaultRoot });
127	  } catch (err) {
128	    const line = JSON.stringify({
129	      ok: false,
130	      error: "cr
... [+1114 chars truncated]

### Assistant | 2026-05-16T04:29:07.664Z

I now have full context. Daemon contract confirmed: exit 0 (`result.ok`), 1 (`!result.ok` — invalid queue root etc.), 2 (crash), 3 (engine-not-built). The cron's comment block at lines 127-130 accurately describes it. The cron correctly invokes the daemon with **no args** = one-shot mode.

Here is my end-to-end review.

---

## Code Review: `H:/prism-hotel-c2/scripts/cron/queue-processor-cron.ps1`

### Spec exit-condition #1 ("Watcher service running, cron, 2h cadence")
Satisfied in principle — the script registers a Task Scheduler task with a 2h repetition. But two issues below (one P0) put the *cadence* itself at risk on Win11 / PS 5.1.

---

### 🔴 P0 — `[TimeSpan]::MaxValue` for `-RepetitionDuration` will fail task registration on Win11

**Lines 144-146:**
```powershell
$Trigger = New-ScheduledTaskTrigger -Once -At $startBase `
  -RepetitionInterval (New-TimeSpan -Hours $IntervalHrs) `
  -RepetitionDuration ([TimeSpan]::MaxValue)
```

This is the well-known Win10/Win11 Task Scheduler gotcha. `[TimeSpan]::MaxValue` ≈ 10,675,199 days. The Task Scheduler XML schema serializes `RepetitionDuration` as an ISO-8601 duration; MaxValue overflows the schema's accepted range and `Register-ScheduledTask` (line 178) throws `The task XML contains a value which is incorrectly formatted or out of range. (0x4180004B)` — or silently truncates the repetition so it does **not** repeat indefinitely. On a fresh Win11 box this fails hard at register time. **The task either won't register at all, or registers without an indefinite repetition** — directly defeating the "2h cadence" spec exit-condition.

The B1/B2 siblings never hit this because `-Daily` / `-Weekly` triggers carry their own implicit recurrence and never set `-RepetitionDuration`. This script is the first to need explicit repetition, so the convention reference doesn't cover it.

**Concrete fix — the canonical PS 5.1 idiom is to OMIT `-RepetitionDuration` entirely.** When only `-RepetitionInterval` is supplied to a `-Once`
... [+7680 chars truncated]
