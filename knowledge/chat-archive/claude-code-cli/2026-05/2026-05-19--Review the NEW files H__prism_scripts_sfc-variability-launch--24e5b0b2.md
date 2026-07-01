---
type: "chat-session"
source: "claude-code-cli"
session_id: "24e5b0b2-d2bb-4979-b53b-5d101e78cd1c"
title: "Review the NEW files H:\\prism\\scripts\\sfc-variability-launch.mjs + H:\\prism\\scri"
date: "2026-05-19"
first_ts: "2026-05-19T02:04:47.035Z"
last_ts: "2026-05-19T02:09:04.034Z"
cwd: "H:\\PRISM"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-ada3da1de86221c59.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review the NEW files H:\prism\scripts\sfc-variability-launch.mjs + H:\prism\scri

> **claude-code-cli** | 2026-05-19 | 26 msgs (11 user / 15 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-ada3da1de86221c59.jsonl`

## Transcript

### User | 2026-05-19T02:04:47.035Z

Review the NEW files H:\prism\scripts\sfc-variability-launch.mjs + H:\prism\scripts\sfc-variability-launch.test.mjs + H:\prism\.claude\helpers\install-sfc-variability-task.ps1 end-to-end (read all three whole files). Also cross-reference H:\prism\scripts\sfc-variability-resume-guard.mjs (the guard that triggers the launcher) and H:\prism\scripts\sfc-variability-batch-run.mjs (the batch the launcher spawns).

CONTEXT: This is a two-task durability system for a multi-day combinatorial batch.
- The GUARD (scheduled task, every 5 min) detects the batch dead → computes a resume `--skip` → writes a per-domain `.resume-state.json` sidecar → `schtasks /run "PRISM SFC Variability Batch <Domain>"`.
- That on-demand TASK's action is the LAUNCHER (`sfc-variability-launch.mjs --domain mill`). The launcher reads the sidecar, resolves params via the guard's pure `pickResumeParams`, and `spawn`s `sfc-variability-batch-run.mjs` as a NON-detached child, then waits on it (so the launcher = the task's process, stays alive for the batch's full ~10h, keeping the task "running" and its job object open).
- The INSTALLER registers all 3 tasks (guard recurring + 2 on-demand batch tasks).

The whole point: the batch must survive the guard process exiting (a detached child of the guard's scheduled-task job gets killed when that task instance ends — the two-task design avoids this).

Verify rigorously, flag P0/P1/P2 with line refs:
1. INTEGRATION CHAIN: guard writes sidecar → `schtasks /run` → Task Scheduler runs launcher → launcher reads sidecar → spawns batch. Does every link's contract match? The launcher imports `pickResumeParams` + `buildBatchArgv` from the guard module — are those imports correct and the argv it builds accepted by the batch's parseArgs?
2. JOB-OBJECT SURVIVAL: the launcher spawns the batch NON-detached and waits via `child.on("exit")`. Is the launcher process guaranteed to stay alive for the batch's lifetime? Does Task Scheduler keep the batch task "running" until the lau
... [+1720 chars truncated]

### Assistant | 2026-05-19T02:05:03.576Z

I'll review these files end-to-end. Let me start by reading all five files.

### Assistant | 2026-05-19T02:05:04.053Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:04.488Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:04.904Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:05.327Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:05.693Z

[tool_use: Read]

### User | 2026-05-19T02:05:20.214Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * SFC-ACCURACY-MS1 — Variability batch launcher.
4	 *
5	 * This is the ACTION of the per-domain on-demand scheduled task
6	 * ("PRISM SFC Variability Batch Mill" / "...Lathe"). It is NOT meant to be
7	 * run by hand in normal operation — the resume-guard triggers the task via
8	 * `schtasks /run`, and Task Scheduler runs THIS launcher.
9	 *
10	 * Why a launcher (not 
... [+4495 chars truncated]

### User | 2026-05-19T02:05:20.518Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Hermetic tests for sfc-variability-launch.mjs pure helpers.
4	 *
5	 * The launcher's resume-param resolution is covered by the guard suite's
6	 * `pickResumeParams` tests (the launcher imports that pure fn). This file
7	 * pins the launcher's OWN pure helpers: --domain parsing and the fail-soft
8	 * sidecar reader.
9	 *
10	 * Run: node --test scripts/sfc-variabilit
... [+2734 chars truncated]

### User | 2026-05-19T02:05:20.526Z

[tool_result] 1	param(
2	  [string]$GuardTaskName = 'PRISM SFC Variability Guard',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the guard's poll-trigger anchor. PRISM already
5	  # runs 5-min host tasks at ~+60s (Cleanup Orchestrator), +120s (Memory
6	  # Pressure Auto-Relief), +210s (Fleet Reaper), +330s (Fleet Memory Monitor).
7	  # +390s lands the SFC guard clear of all four.
8	  [int]$StartO
... [+10140 chars truncated]

### User | 2026-05-19T02:05:21.151Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * SFC-ACCURACY-MS1 Stage 2 — Streaming batch worker.
4	 *
5	 * Reads the Stage 1 enumerator's combo stream, drives
6	 * SpeedFeedOrchestratorEngine.compute() on each cell, and persists
7	 * (input fingerprint, output, safety status) to chunked JSONL files
8	 * under state/shared/sfc-variability-results/<domain>/.
9	 *
10	 * Operator directive: "generate the billions"
... [+17652 chars truncated]

### User | 2026-05-19T02:05:22.946Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * SFC-ACCURACY-MS1 — Variability batch resume-guard (watchdog). v4.
4	 *
5	 * The Stage-2 batch (`sfc-variability-batch-run.mjs`) is a multi-day workload
6	 * toward billions of compatibility-filtered combos. It has died TWICE on
7	 * machine switches (the H: drive is shared across PCs; disk state survives,
8	 * processes do not). This guard makes the batch self-resu
... [+32454 chars truncated]

### Assistant | 2026-05-19T02:05:29.016Z

Now I have all five files. Let me analyze the integration chain carefully, paying special attention to the launcher's spawn path.

Let me verify one critical thing — whether the batch's `runOrchestrator` is reached when invoked via the launcher.

### Assistant | 2026-05-19T02:05:30.719Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:05:31.253Z

[tool_use: Bash]

### User | 2026-05-19T02:05:48.704Z

[tool_result] LAUNCH SYNTAX OK
GUARD SYNTAX OK
BATCH SYNTAX OK

### User | 2026-05-19T02:05:52.251Z

[tool_result]   ...
# Subtest: readSidecarFile: malformed JSON → null (fail-soft, never throws)
ok 5 - readSidecarFile: malformed JSON → null (fail-soft, never throws)
  ---
  duration_ms: 1.0484
  ...
# Subtest: readSidecarFile: non-object JSON (array/scalar) → null
ok 6 - readSidecarFile: non-object JSON (array/scalar) → null
  ---
  duration_ms: 1.1758
  ...
1..6
# tests 6
# suites 0
# pass 6
# fail 0
# canc
... [+50 chars truncated]

### Assistant | 2026-05-19T02:05:59.168Z

Now let me trace the critical path. The launcher builds argv with `--domain` but the batch's `runFn` selection depends on `args.workers > 1 && args.workerN === 1`. Let me verify the launcher does NOT pass `--workerIdx`.

The launcher's `buildBatchArgv` produces: `--domain`, `--workers`, `--max-minutes`, `--chunk`, `--skip`, `--out` — no `--workerIdx`. So `workerN` stays at default 1, and with `workers > 1` (default 4), `runFn = runOrchestrator`. Good — the launcher's child IS the orchestrator.

Let me check one more thing — whether `runOrchestrator`'s child spawn paths resolve correctly given the launcher sets `cwd: PROJECT_ROOT`.

### Assistant | 2026-05-19T02:06:00.545Z

[tool_use: Bash]

### Assistant | 2026-05-19T02:06:01.765Z

[tool_use: Bash]

### User | 2026-05-19T02:06:12.224Z

[tool_result] mcp-server/node_modules/tsx/dist/cli.mjs  117.6K
---
_dryrun-mill/
_smoke-mill/
mill/
---guard-telemetry---
state/shared/sfc-variability-guard.jsonl  2.3K

### User | 2026-05-19T02:06:27.875Z

[tool_result] # tests 52
# suites 0
# pass 52
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 413.2648
---check guard test exists---
scripts/sfc-variability-resume-guard.test.mjs  28.5K

### Assistant | 2026-05-19T02:06:39.493Z

Let me verify the critical job-object survival claim and the `runOrchestrator` worker-spawn behavior in detail. The key question: does the launcher's child (orchestrator) properly wait on its worker grandchildren?

Looking at `runOrchestrator` (batch lines 369-411): it spawns N children, pushes a Promise per child resolving on `child.on("close")`, then `await Promise.all(procs)`. So `runOrchestrator` returns only after all workers close. And the batch entry point (lines 422-424) does `runFn(args).then(...)` — the process stays alive until the promise settles. Good.

Now let me check a subtle issue with the orchestrator's worker spawn `cwd`.

`runOrchestrator` line 389: `cwd: resolve(".")`. The launcher sets the child's `cwd: PROJECT_ROOT`. So `resolve(".")` inside the orchestrator = PROJECT_ROOT. The orchestrator then resolves `mcp-server/node_modules/tsx/dist/cli.mjs` and `scripts/sfc-variability-batch-run.mjs` relative to that cwd — correct.

Let me check one potential issue: the launcher passes `--out outDir` (absolute), but does the orchestrator forward `--out` to workers? Yes (line 380). And `--workers`? Let me re-check — `runOrchestrator`'s `childArgs` (lines 373-381) does NOT include `--workers`, but includes `--workerIdx i/N`. So workers get `workerN=N` from `--workerIdx`, and `workers` stays default 1 → worker takes `runWorker`. Correct.

Let me verify the `--max-cells` default handling, since the launcher's `buildBatchArgv` does NOT pass `--max-cells`.

### Assistant | 2026-05-19T02:06:41.821Z

[tool_use: Bash]

### User | 2026-05-19T02:07:12.986Z

[tool_result] (node:14180) ExperimentalWarning: CommonJS module H:\PRISM\[eval] is loading ES Module H:\PRISM\scripts\sfc-variability-resume-guard.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
---test buildBatchArgv output---
["--domain","mill","--workers","4","--max-
... [+67 chars truncated]

### Assistant | 2026-05-19T02:09:04.034Z

`buildBatchArgv` produces exactly: `--domain mill --workers 4 --max-minutes 600 --chunk 50 --skip 400100 --out /abs/out`. Every flag is accepted by the batch's `parseArgs` (lines 267-282). `--max-cells` is absent → defaults to `Infinity` — correct for a "generate the billions" run. `--workerIdx` is absent → `workerN=1` → `runFn = runOrchestrator`. The integration chain holds.

Let me do one final check on the launcher's `tsx` argv — the launcher passes `TSX_CLI` as `argv[0]` to `spawn(process.execPath, argv, ...)`.

The launcher line 90-97: `argv = [TSX_CLI, BATCH_SCRIPT, ...buildBatchArgv(...)]` then `spawn(process.execPath, argv, ...)`. So it runs `node <tsx-cli> <batch-script> --domain mill ...`. The batch's `process.argv.slice(2)` would be `[BATCH_SCRIPT, --domain, mill, ...]` — wait. Let me think carefully.

When you run `node tsx/cli.mjs batch-script.mjs --domain mill`, tsx itself consumes `tsx/cli.mjs` as `argv[1]`, then re-invokes with `batch-script.mjs` as the new `argv[1]`. So the batch sees `process.argv = [node, batch-script.mjs, --domain, mill, ...]` and `slice(2)` = `[--domain, mill, ...]`. Correct — that matches how the batch's own `runOrchestrator` spawns workers (line 388: `[tsxCli, resolve("scripts/..."), ...childArgs]`). The launcher mirrors the proven pattern exactly.

I have everything I need. Here is my review.

---

# CODE REVIEW: SFC Variability Two-Task Durability System

**Verdict: PASS** — with 2 P1 and 4 P2 findings. No P0. The integration chain is correct end-to-end; the job-object survival design is sound; the resume contract matches. The P1s are real correctness/robustness gaps worth fixing before relying on this for a multi-day unattended run.

---

## 1. INTEGRATION CHAIN — verified correct

The full chain holds:

- **Guard writes sidecar → trigger.** `runGuard` (guard:623-627) writes the sidecar via `buildSidecarRecord` *before* calling `relaunch` (guard:631). `defaultRelaunch` (guard:354-366) runs `schtasks /run /tn "PRISM SFC Vari
... [+17271 chars truncated]
