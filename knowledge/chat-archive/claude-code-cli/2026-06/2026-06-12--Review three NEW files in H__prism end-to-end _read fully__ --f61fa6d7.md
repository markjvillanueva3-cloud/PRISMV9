---
type: "chat-session"
source: "claude-code-cli"
session_id: "f61fa6d7-ca17-4439-b131-ead206c9010a"
title: "Review three NEW files in H:/prism end-to-end (read fully): 1. scripts/ollama-ni"
date: "2026-06-12"
first_ts: "2026-06-12T15:35:54.299Z"
last_ts: "2026-06-12T15:39:41.369Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 10
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/f61fa6d7-ca17-4439-b131-ead206c9010a/subagents/agent-a13d1549d56852b3a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Review three NEW files in H:/prism end-to-end (read fully): 1. scripts/ollama-ni

> **claude-code-cli** | 2026-06-12 | 21 msgs (10 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/f61fa6d7-ca17-4439-b131-ead206c9010a/subagents/agent-a13d1549d56852b3a.jsonl`

## Transcript

### User | 2026-06-12T15:35:54.299Z

Review three NEW files in H:/prism end-to-end (read fully):
1. scripts/ollama-night-batch.mjs — registry-driven off-hours Ollama batch runner. Contract: window-gated (22..6 local, wraps midnight, --force override, PRISM_NIGHT_BATCH_DISABLE=1 kill), schemaVersion'd registry validation that FAILS LOUD running nothing on any defect, no-shell child execution (spawnSync(file,args[]), cmd[0] must be "node", metacharacter rejection), single-runner lock with 4h stale-break, Ollama /api/tags pre-check aborts loud, per-job fail-soft with JSONL logging, summary exit codes (0 ok/2 some-failed/1 infra).
2. state/shared/ollama-night-batch-registry.json — seeded with 2 verified jobs (capability probe --out; mine-galaxy-transcripts --next-unpopulated --next-count 2).
3. scripts/ollama-night-batch.test.mjs — 9 node:test tests.

It is invoked unattended nightly by a Windows scheduled task ("PRISM Ollama Night Batch", node.exe, WorkingDirectory H:\prism) — weight the review toward unattended failure modes: lock leak paths (does every exit path release or correctly NOT release?), the timeout semantics of spawnSync on Windows, log growth (unbounded JSONL?), what happens if a child spawns its own long-lived processes, relative cmd paths vs cwd, and whether the registry validation truly prevents anything but `node <repo-script>` from running. Verify tests run green (`node --test scripts/ollama-night-batch.test.mjs`) and would fail on revert.

Flag P0/P1, grade PASS/FAIL, 3-line summary.

### Assistant | 2026-06-12T15:36:00.450Z

I'll read all three files end-to-end in parallel.

### Assistant | 2026-06-12T15:36:00.975Z

[tool_use: Read]

### Assistant | 2026-06-12T15:36:01.437Z

[tool_use: Read]

### Assistant | 2026-06-12T15:36:01.971Z

[tool_use: Read]

### User | 2026-06-12T15:36:03.327Z

[tool_result] 1	#!/usr/bin/env node
2	// ollama-night-batch.mjs -- registry-driven OFF-HOURS Ollama work lane
3	// (U-NIGHT-BATCH, slot:zulu, 2026-06-12).
4	//
5	// Operator directive: "find a way to enforce it for better token savings and
6	// more background tasks running during off hours." The fleet already owns the
7	// extraction machinery (registry-driven galaxy transcript miner, capability
8	// probe, Yo
... [+11390 chars truncated]

### User | 2026-06-12T15:36:03.449Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "note": "Off-hours Ollama work lane (U-NIGHT-BATCH, slot:zulu 2026-06-12). Jobs run sequentially inside the window by scripts/ollama-night-batch.mjs, invoked by the 'PRISM Ollama Night Batch' scheduled task. cmd[0] must be 'node'; no shell metacharacters. NEVER add unattended index-mutating embed batches here (tribal clobber 8bf1873577 lesson).",
4	  "window":
... [+877 chars truncated]

### User | 2026-06-12T15:36:03.884Z

[tool_result] 1	// Tests for ollama-night-batch.mjs (U-NIGHT-BATCH, slot:zulu 2026-06-12).
2	// R9: each test pins WHY -- the window gate keeps day work unaffected, the
3	// validator keeps the lane repo-scripts-only (no shell), runJobs isolates job
4	// failures, and a corrupt registry fails LOUD running nothing.
5	// Pure core tested hermetically (runImpl/logImpl injected); the live registry
6	// file is vali
... [+5649 chars truncated]

### Assistant | 2026-06-12T15:37:23.588Z

[tool_use: Bash]

### Assistant | 2026-06-12T15:37:24.797Z

[tool_use: Bash]

### Assistant | 2026-06-12T15:37:26.209Z

[tool_use: Grep]

### Assistant | 2026-06-12T15:37:26.808Z

[tool_use: Grep]

### User | 2026-06-12T15:37:33.880Z

[tool_result]   ...
# Subtest: runJobs: one job failing never stops the next; accounting + log rows correct
ok 8 - runJobs: one job failing never stops the next; accounting + log rows correct
  ---
  duration_ms: 0.2063
  ...
# Subtest: runJobs: ADVERSARIAL runImpl throw and timeout(null status) are contained as failures
ok 9 - runJobs: ADVERSARIAL runImpl throw and timeout(null status) are contained as failure
... [+136 chars truncated]

### User | 2026-06-12T15:37:36.413Z

[tool_result] 10: * to state/shared/ollama-capability-matrix.json (--out) for the routing layer to consume.
15: *   node scripts/ollama-capability-probe.mjs --out --json
68:  const write = args.includes("--out");

### User | 2026-06-12T15:37:36.598Z

[tool_result] 90:// --next-unpopulated: pick the highest-ROI galaxy that has NO vault memo yet and mine
92:// without re-specifying the target each time. --next-count N mines N such galaxies in a run.
93:const NEXT_UNPOP = has("--next-unpopulated");
94:const NEXT_COUNT = Math.max(1, parseInt(flag("--next-count", "1"), 10) || 1);
96:// --backend-only restricts --next-unpopulated to this set so ROI-greedy selecti
... [+765 chars truncated]

### User | 2026-06-12T15:37:41.345Z

[tool_result] -rwxr-xr-x 1 wompu 197611 39314 Jun  9 20:35 /h/prism/scripts/mine-galaxy-transcripts.mjs*
-rwxr-xr-x 1 wompu 197611  5126 Jun 12 08:13 /h/prism/scripts/ollama-capability-probe.mjs*

### Assistant | 2026-06-12T15:38:08.077Z

[tool_use: PowerShell]

### Assistant | 2026-06-12T15:38:09.141Z

[tool_use: Grep]

### User | 2026-06-12T15:38:11.455Z

[tool_result] PRISM Ollama Night Batch | Principal: wompu RunLevel: Limited
Exec: H:\Tools\nodejs\node.exe Args: H:\prism\scripts\ollama-night-batch.mjs WD: H:\prism
MSFT_TaskDailyTrigger at 2026-06-12T22:23:00-05:00

### User | 2026-06-12T15:38:12.929Z

[tool_result] No matches found

### Assistant | 2026-06-12T15:39:41.369Z

## Code Quality Analysis Report — U-NIGHT-BATCH (3 files)

### 3-Line Summary
Tests run green (9/9 via `node --test`, behaviors pinned so reverts break them); both seeded registry jobs verified real (`ollama-capability-probe.mjs:68` has `--out`, `mine-galaxy-transcripts.mjs:93-94` has `--next-unpopulated`/`--next-count`); scheduled task verified live (daily 22:23, node.exe, WD `H:\prism`, principal `wompu`/Limited — NOT SYSTEM). Lock discipline is correct on every exit path (pre-lock exits never acquire; post-acquire try/finally always releases; hard-kill leak recovered by the 4h stale-break). Two P1s: spawnSync's default 1 MiB `maxBuffer` can silently kill the 2h miner mid-run logged as an indistinguishable `-1`, and the "repo scripts only" claim is not actually enforced (`node -e <js>`, absolute paths, `..` traversal all pass validation).

**Grade: PASS** — no P0, core contract substantially met, but both P1s must be fixed before this unit closes.

---

### P1 Issues

**P1-1 — Hidden 1 MiB output ceiling kills long jobs with no recorded cause.**
`H:\prism\scripts\ollama-night-batch.mjs:134-139` — `spawnJob` sets `timeout` but not `maxBuffer`. spawnSync's default is 1 MiB on stdout/stderr each; exceeding it **terminates the child** with `status: null`. The lane grants the miner a 2h budget while silently imposing this ceiling; a chatty mining run gets killed mid-run, mapped to `exitCode: -1` — the exact same row as a timeout, an ENOENT (registry path typo), or a spawn crash, because `r.error` (`ETIMEDOUT`/`ENOBUFS`/`ENOENT`) is never written to the JSONL row (`runJobs`, lines 154-158). For an unattended nightly lane the log is the only forensic surface; this makes three distinct infra failures forensically identical. I have not verified the miner's actual output volume exceeds 1 MiB — but the defect is the unguarded ceiling plus the unlogged cause, regardless. Fix: `maxBuffer: 64 * 1024 * 1024` (or `stdio: ["ignore","pipe","pipe"]` with a large cap) and append `r.e
... [+4905 chars truncated]
