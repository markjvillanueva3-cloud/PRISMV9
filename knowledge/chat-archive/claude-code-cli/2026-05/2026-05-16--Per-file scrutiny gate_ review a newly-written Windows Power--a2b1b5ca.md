---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Per-file scrutiny gate: review a newly-written Windows PowerShell scheduled-task"
date: "2026-05-16"
first_ts: "2026-05-16T13:39:35.652Z"
last_ts: "2026-05-16T13:40:46.643Z"
cwd: "H:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ad0528f5c4a4d08c7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Per-file scrutiny gate: review a newly-written Windows PowerShell scheduled-task

> **claude-code-cli** | 2026-05-16 | 15 msgs (6 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ad0528f5c4a4d08c7.jsonl`

## Transcript

### User | 2026-05-16T13:39:35.652Z

Per-file scrutiny gate: review a newly-written Windows PowerShell scheduled-task script for PRISM milestone OBSIDIAN-INTELLIGENCE-MS3, unit B4 (U-WEEKLY-SYNTHESIS). Read the WHOLE file end-to-end and grade PASS or FAIL.

FILE UNDER REVIEW: H:/prism-hotel-c2/scripts/cron/weekly-synthesis-cron.ps1
ENGINE IT INVOKES (read its CLI section — `runCli`, the `--run` guard, exit codes — so you can verify the script invokes it correctly): H:/prism-hotel-c2/mcp-server/src/engines/WeeklySynthesisEngine.ts
SIBLING CONVENTION REFERENCE (the B3 cron — the script should match its structure/idioms): H:/prism-hotel-c2/scripts/cron/queue-processor-cron.ps1

WHAT THE SCRIPT DOES: registers a Windows scheduled task that fires every Sunday 8:10 PM, running `node <dist>/engines/WeeklySynthesisEngine.js --run`. Supports -DryRun / -Uninstall / -RunNow. Target runtime is Windows PowerShell 5.1.

KNOWN PRISM GOTCHAS this script must avoid (verify each):
1. ASCII-ONLY: any em-dash / smart-quote / non-ASCII char causes PS5.1 mojibake parse failure. Confirm the file is pure ASCII.
2. NO `[TimeSpan]::MaxValue` as -RepetitionDuration: its ~10.7M-day span overflows the task-XML schema and is rejected/clamped on Win10/11. (This script uses a native `-Weekly` trigger instead — verify that is correct and needs no duration.)
3. EXIT CODE PROPAGATION: `powershell.exe -Command` collapses a &-invoked native exe's non-zero exit to 1. The action string must end with `; exit $LASTEXITCODE` (backtick-escaped so it evaluates at run time) to preserve the engine's 0/1/2 contract in Task Scheduler's Last Run Result.
4. The `--run` flag must be passed — the engine's CLI guard only synthesizes when argv includes `--run`.

Also verify: idempotent re-register, -DryRun mutates nothing, -Uninstall touches no vault state, node.exe resolution is robust, the engine dist path is correct for the post-merge main-tree location (`H:/prism/mcp-server/dist/...`), ExecutionTimeLimit is sane, error handling on the bootstrap build.
... [+241 chars truncated]

### Assistant | 2026-05-16T13:39:40.892Z

I'll review the scheduled-task script against the engine it invokes and the sibling convention. Let me read all three files.

### Assistant | 2026-05-16T13:39:42.160Z

[tool_use: Read]

### Assistant | 2026-05-16T13:39:42.203Z

[tool_use: Read]

### Assistant | 2026-05-16T13:39:42.323Z

[tool_use: Read]

### User | 2026-05-16T13:39:42.784Z

[tool_result] read-once-guard: 'H:\prism-hotel-c2\mcp-server\src\engines\WeeklySynthesisEngine.ts' was already read 5m ago in this session and is unchanged (mtime 1778938386952). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### User | 2026-05-16T13:39:43.073Z

[tool_result] 1	#requires -Version 5.0
2	<#
3	.SYNOPSIS
4	  Register / unregister the PRISM Weekly Synthesis scheduled task
5	  (OBSIDIAN-INTELLIGENCE-MS3 / B4 - U-WEEKLY-SYNTHESIS).
6	
7	.DESCRIPTION
8	  Fires the WeeklySynthesisEngine CLI once a week, Sunday evening:
9	    node H:/prism/mcp-server/dist/engines/WeeklySynthesisEngine.js --run
10	  The engine reads the last 7 DAILY-CONTEXT-YYYY-MM-DD.md briefs t
... [+9797 chars truncated]

### User | 2026-05-16T13:39:43.262Z

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
... [+8931 chars truncated]

### Assistant | 2026-05-16T13:39:46.646Z

The engine TS file wasn't returned (read-once guard). I need its CLI section to verify the `--run` guard and exit codes. Let me grep for the relevant parts.

### Assistant | 2026-05-16T13:39:48.563Z

[tool_use: Grep]

### User | 2026-05-16T13:39:49.146Z

[tool_result] 1:// WIRE-EXEMPT: cron-invoked synthesizer. The engine is a library (importable for tests + dispatcher composition) AND a CLI (--run). Its invocation path — a Sunday-evening scheduled task — ships as a sibling deliverable of this same unit (B4): scripts/cron/weekly-synthesis-cron.ps1. No dispatcher action is required for the cron path; downstream composition (Track G observability) imports the eng
... [+2234 chars truncated]

### Assistant | 2026-05-16T13:39:51.656Z

I have the engine CLI contract. Let me read the full `runCli` body to verify exit-code semantics.

### Assistant | 2026-05-16T13:39:52.214Z

[tool_use: Read]

### User | 2026-05-16T13:39:53.007Z

[tool_result] 564	async function runCli(): Promise<number> {
565	  const vaultRoot =
566	    process.env.PRISM_WEEKLY_SYNTHESIS_VAULT_ROOT || "H:/prism/knowledge/memories";
567	  // The cron fires Sunday 8PM LOCAL. On a host west of UTC that instant is
568	  // already Monday in UTC, so a raw isoDateUTC() would roll the anchor into
569	  // the NEXT ISO week (wrong-week file + a Tue..Mon loader window). Snap th
... [+1083 chars truncated]

### Assistant | 2026-05-16T13:40:46.643Z

I now have everything needed. Here is the review.

---

## Per-File Scrutiny Report: `weekly-synthesis-cron.ps1`

**File:** `H:/prism-hotel-c2/scripts/cron/weekly-synthesis-cron.ps1` (226 lines)
**Engine contract verified against:** `WeeklySynthesisEngine.ts` (`runCli` L564-593, CLI guard L595-614)
**Convention reference:** `queue-processor-cron.ps1` (B3 sibling)

### Engine contract verification (the four KNOWN GOTCHAS)

1. **ASCII-only** — PASS. I scanned all 226 lines; every dash is a hyphen-minus (`0x2D`), all quotes are straight ASCII, no em-dashes or smart quotes. Notably the script's comments use the plain ` - ` form (e.g. L5, L18, L87, L110, L216) where the B3 sibling uses an em-dash at L138 — this script is the *cleaner* one. Pure ASCII confirmed.

2. **No `[TimeSpan]::MaxValue`** — PASS, and correctly reasoned. L172-173 uses the native `New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At`. A `-Weekly` trigger is a genuine recurring trigger in the task-XML `<ScheduleByWeek>` schema — it carries its own cadence and needs **no** `-RepetitionInterval`/`-RepetitionDuration`, so the `[TimeSpan]::MaxValue` overflow class is structurally impossible here. The L167-171 comment documents this correctly. Correct choice — superior to the B3 `-Once + -RepetitionInterval` workaround for a fixed weekly cadence.

3. **Exit-code propagation** — PASS. L162 ends the action string with `; exit \`$LASTEXITCODE`. The backtick escapes `$` so PowerShell's `@(...)` array literal stores the *literal text* `$LASTEXITCODE` rather than expanding it at registration time; it evaluates inside the scheduled `powershell.exe` at run time. The engine's contract is 0=success / 1=engine-failure (`runCli` L587/L592) / 2=CLI-crash (guard L611). Without `; exit $LASTEXITCODE`, `powershell.exe -Command` would collapse all non-zero to 1 and erase the 1-vs-2 distinction. The wrapper correctly preserves the full 0/1/2 contract. The L148-157 comment is accurate.

4. **`--run` flag** — PASS. L162 pa
... [+7090 chars truncated]
