---
type: "chat-session"
source: "claude-code-cli"
session_id: "5fd23c5f-ca4e-4788-b782-6100b2862a94"
title: "Independent second-pass review of `H:/prism/mcp-server/data/docs/CAD_REGRESSION_"
date: "2026-05-12"
first_ts: "2026-05-12T17:56:38.517Z"
last_ts: "2026-05-12T17:59:22.246Z"
cwd: "H:\\prism"
messages: 55
user_msgs: 24
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/5fd23c5f-ca4e-4788-b782-6100b2862a94/subagents/agent-a6739ef37d1bd548d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent second-pass review of `H:/prism/mcp-server/data/docs/CAD_REGRESSION_

> **claude-code-cli** | 2026-05-12 | 55 msgs (24 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/5fd23c5f-ca4e-4788-b782-6100b2862a94/subagents/agent-a6739ef37d1bd548d.jsonl`

## Transcript

### User | 2026-05-12T17:56:38.517Z

Independent second-pass review of `H:/prism/mcp-server/data/docs/CAD_REGRESSION_RUNBOOK.md`. A specialist reviewer is checking technical accuracy in parallel — your job is to catch what they're likely to miss: **operator-experience pitfalls, missing safety advice, recovery scenarios, dangerous defaults, and adversarial misuse patterns**.

**CONTEXT:**
This runbook is the operator-facing documentation for `prism_cad_regression` — a 25-action MCP dispatcher that drives a 20,006-file CAD regression test. An operator unfamiliar with the codebase reads this runbook to kick off a multi-hour batch over the JM Die corpus. Mistakes are expensive: a corrupted state file means re-running 20K files (potentially many hours of compute). Worse: silently bad data could ship a "passing" build that actually regressed.

**FILES TO READ (you're checking the runbook against safety doctrine + dispatcher reality):**

1. The runbook: `H:/prism/mcp-server/data/docs/CAD_REGRESSION_RUNBOOK.md`
2. The hooks: `H:/prism/mcp-server/src/hooks/CADRegressionSafetyHooks.ts` (especially: what does NOT have a hook? what failure modes are unguarded?)
3. The dispatcher: `H:/prism/mcp-server/src/tools/dispatchers/cadRegressionDispatcher.ts`
4. The orchestrator: `H:/prism/mcp-server/src/engines/CADRegressionTestOrchestratorEngine.ts` (worker pool, abort signal, timeout handling)
5. The checkpoint engine: `H:/prism/mcp-server/src/engines/CADTestCheckpointEngine.ts` (atomicity, resume logic)

**WEIGHTING — focus on these (the technical-accuracy agent is handling action names + parameter typing):**

1. **The `force: true` escape hatch** — §4 and §5 tell the operator to set `force: true` to override the stuck-batch guard. Is this advice safe? The hook docblock says "Allow explicit overrides for operators who know the batch is genuinely live." But the runbook should bracket this with stronger warnings:
   - What if force=true is used when the previous orchestrator IS still running? Two orchestrators on one stat
... [+4770 chars truncated]

### Assistant | 2026-05-12T17:56:42.322Z

I'll perform an independent second-pass review focused on operator-experience pitfalls, missing safety advice, and adversarial misuse patterns.

### Assistant | 2026-05-12T17:56:42.726Z

[tool_use: Read]

### User | 2026-05-12T17:56:43.472Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\data\docs\CAD_REGRESSION_RUNBOOK.md' was already read 31s ago in this session and is unchanged (mtime 1778608527954). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-05-12T17:56:46.683Z

Good, I already have the runbook in context. Now let me read the supporting files in parallel.

### Assistant | 2026-05-12T17:56:47.520Z

[tool_use: Read]

### Assistant | 2026-05-12T17:56:47.859Z

[tool_use: Read]

### Assistant | 2026-05-12T17:56:48.697Z

[tool_use: Read]

### User | 2026-05-12T17:56:48.839Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\hooks\CADRegressionSafetyHooks.ts' was already read 15m ago in this session and is unchanged (mtime 1776828267801). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-05-12T17:56:49.087Z

[tool_use: Read]

### User | 2026-05-12T17:56:49.480Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\cadRegressionDispatcher.ts' was already read 13m ago in this session and is unchanged (mtime 1776624881852). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### User | 2026-05-12T17:56:54.627Z

[tool_result] 1	/**
2	 * CADRegressionTestOrchestratorEngine — U-CINF04 (CAD-INFRA-MS0)
3	 *
4	 * Orchestrates the 20,006-file CAD regression test through a parallel worker
5	 * pool with per-file timeout, atomic state persistence, and checkpoint-based
6	 * resume. The orchestrator is agnostic to *how* a task is executed — callers
7	 * inject a `TestRunner` implementation (worker_threads, process pool, or
8	 * 
... [+15903 chars truncated]

### User | 2026-05-12T17:56:56.682Z

[tool_result] 1	/**
2	 * CADTestCheckpointEngine — U-CINF05 (CAD-INFRA-MS0)
3	 *
4	 * Standalone engine owning CAD-regression checkpoint policy and persistence.
5	 * Implements the "every 100 files OR every 60s" cadence described in the
6	 * CAD-INFRA-MS0 milestone, plus load/resume-diff helpers used by dashboards,
7	 * CLI tools, and the regression orchestrator.
8	 *
9	 * Scope split vs CADRegressionTestOrches
... [+11120 chars truncated]

### Assistant | 2026-05-12T17:57:00.750Z

Now let me read the remaining files I need and check key adversarial concerns.

### Assistant | 2026-05-12T17:57:01.501Z

[tool_use: Read]

### Assistant | 2026-05-12T17:57:01.709Z

[tool_use: Read]

### User | 2026-05-12T17:57:03.398Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\hooks\CADRegressionSafetyHooks.ts' was already read 15m ago in this session and is unchanged (mtime 1776828267801). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-05-12T17:57:03.579Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\cadRegressionDispatcher.ts' was already read 13m ago in this session and is unchanged (mtime 1776624881852). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### Assistant | 2026-05-12T17:57:06.792Z

I have the files in context from earlier reads. Let me search the runbook content I have to do specific verifications, then check the dispatcher source for the `cad_regression_run` schema and any lockfile/mutex mechanism.

### Assistant | 2026-05-12T17:57:08.498Z

[tool_use: Grep]

### Assistant | 2026-05-12T17:57:10.087Z

[tool_use: Grep]

### Assistant | 2026-05-12T17:57:10.664Z

[tool_use: Grep]

### Assistant | 2026-05-12T17:57:13.223Z

[tool_use: Grep]

### Assistant | 2026-05-12T17:57:13.226Z

[tool_use: Grep]

### User | 2026-05-12T17:57:17.627Z

[tool_result] 19: *     wall-clock milliseconds, whichever trips first.

### User | 2026-05-12T17:57:17.830Z

[tool_result] 80:  "cad_regression_run",
129:    case "cad_regression_run":

### User | 2026-05-12T17:57:18.380Z

[tool_result] 76:    diffPng?: string;

### User | 2026-05-12T17:57:18.647Z

[tool_result] 41:async function indexer(): Promise<any> {
42:  return (_indexer ??= (await import("../../engines/CADFileIndexerEngine.js")).cadFileIndexerEngine);
44:async function classifier(): Promise<any> {
45:  return (_classifier ??= (await import("../../engines/CADFileClassifierEngine.js")).cadFileClassifierEngine);
47:async function orchestrator(): Promise<any> {
48:  return (_orchestrator ??= (await imp
... [+2715 chars truncated]

### User | 2026-05-12T17:57:18.800Z

[tool_result] 8: *     1. cad-regression-batch-id-format   — batchId must be non-empty slug/UUID
84:    "Rejects CAD regression actions whose batchId (or equivalent) does not match the required slug/UUID shape. Blocks before state reads hit the filesystem with a malformed key.",
86:  category: "enforcement",
100:    for (const key of ["batchId", "baseBatchId", "candidateBatchId"]) {
103:    if (Array.isArray(d.
... [+1187 chars truncated]

### Assistant | 2026-05-12T17:57:23.431Z

Now let me verify the key adversarial issues with targeted greps.

### Assistant | 2026-05-12T17:57:24.767Z

[tool_use: Grep]

### Assistant | 2026-05-12T17:57:25.957Z

[tool_use: Grep]

### Assistant | 2026-05-12T17:57:27.609Z

[tool_use: Grep]

### User | 2026-05-12T17:57:28.693Z

[tool_result] 79:  fileId: z.string().min(1).describe("Stable identifier for the CAD test file"),
104:      expectedStep: z.string().optional().describe("Path to expected baseline step file"),
106:      actualStep: z.string().optional().describe("Path to actual generated step file"),
108:      diffPng: z.string().optional().describe("Path to PNG diff overlay image"),
110:      errorLog: z.string().optional().de
... [+336 chars truncated]

### Assistant | 2026-05-12T17:57:28.860Z

[tool_use: Grep]

### User | 2026-05-12T17:57:29.904Z

[tool_result] 10: *     3. cad-regression-stuck-batch-guard — blocks on a batch that has not advanced
186:  id: "cad-regression-stuck-batch-guard",
231:      log.warn(`[cad-regression-stuck-batch-guard] BLOCKED: ${msg}`);

### User | 2026-05-12T17:57:30.957Z

[tool_result] 27:import { ACTION_CAD_REGRESSION_SCHEMAS } from "../../schemas/cadRegressionActionSchemas.js";
109:const actionEnum = z.enum(ACTIONS);
197:      params: z.record(z.string(), z.any()).optional(),

### User | 2026-05-12T17:57:31.734Z

[tool_result] 21: *   DEFAULT_MAX_BATCHES = 5. On each pruneRetention() call, batches sorted
67:/** Keep most recent N batches; older batches are pruned. */
104:  pruned: string[];
158:        name: "prune",
160:        actions: ["cad_artifact_prune"],
169:    if (!["write", "list", "prune"].includes(o.op as string)) {
170:      return `input.op must be write|list|prune (got ${o.op})`;
175:  protected async exe
... [+407 chars truncated]

### Assistant | 2026-05-12T17:57:38.272Z

Critical findings discovered:

1. **`batchId: z.string().uuid()`** in the schema — but the safety hook regex `/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/` is LOOSER. This is a layered defense, but the dispatcher takes `z.record(z.string(), z.any())` so the hook is the actual frontline filter. Let me verify the regex one more time against malicious inputs.
2. **No lockfile/mutex** at all in the orchestrator (zero hits for `lock|mutex|pid|process.pid`). Multiple orchestrators on the same batchId WILL race.
3. **The dispatcher route is `return await ...`** but the caller still awaits — so it WILL block the MCP request for the full run duration.
4. **Prune does not check active runs** — looking at the prune code path, it sorts by mtime and removes oldest N. There's no "is this batch currently running?" guard.

Let me verify the hook regex against malicious inputs and check the action-schema for `cad_regression_run`.

### Assistant | 2026-05-12T17:57:39.798Z

[tool_use: Grep]

### Assistant | 2026-05-12T17:57:41.712Z

[tool_use: Bash]

### Assistant | 2026-05-12T17:57:42.993Z

[tool_use: Grep]

### User | 2026-05-12T17:57:43.176Z

[tool_result] 32:const cad_regression_run = z
35:    fileIds: z.array(z.string().min(1)).min(1),
145:  cad_regression_run,

### User | 2026-05-12T17:57:52.916Z

[tool_result] ".............." => false
"..-..-.." => false
"abc..def" => true
"a--b" => true
"normal-id" => true
"../../../etc" => false
"a.." => true
"a.b.c..d" => true
"a/b" => false
"a\b" => false

### User | 2026-05-12T17:57:54.562Z

[tool_result] 22: *   by modification time are retained newest-first up to the limit; older
103:  retained: string[];
297:   * @param maxBatches - Number of batches to retain (default 5).
308:    const report: RetentionReport = { root, retained: [], pruned: [], maxBatches: cap };
327:        report.retained.push(sorted[i].batchId);

### Assistant | 2026-05-12T17:58:02.537Z

Confirmed critical findings:

1. **Regex test results**: `'../../../etc'` is correctly rejected (the leading `.` fails the `[A-Za-z0-9]` anchor), and `'a/b'`, `'a\b'` are rejected. However `'abc..def'`, `'a--b'`, `'a..'`, `'a.b.c..d'` ALL PASS. These aren't path-traversal attacks (no `/` or `\`), but `abc..def` would join correctly with `path.join`. The path-traversal concern from the prompt is **NOT a real exploit** — Node's `path.join` doesn't interpret `..` between letters as parent-dir.

2. **`cad_regression_run` schema** has `fileIds: z.array(z.string().min(1)).min(1)` — confirmed NO MAX. An operator could pass 10M fileIds.

3. **Prune retention** sorts by mtime and prunes — does NOT check whether a batch is currently being written to. An active run could have its state file pruned mid-run.

Let me check two final things: (a) what §13 actually says about the smoke test, and (b) whether the stuckBatchGuard checks process liveness.

### Assistant | 2026-05-12T17:58:04.069Z

[tool_use: Grep]

### Assistant | 2026-05-12T17:58:05.283Z

[tool_use: Grep]

### User | 2026-05-12T17:58:05.564Z

[tool_result] 127:The orchestrator checkpoints every 100 files (or every 60 s, whichever comes first). If the process dies — power loss, OOM, `kill -9` — restart resumes within 1 file of the last checkpoint.
356:| On CAD/CAM stack change (any commit touching `src/engines/CAD*.ts` or related) | Trigger `cad_regression_run` over a smoke subset (~100 files) | CI gate before merge |
364:For CI / fast feedback, run 
... [+171 chars truncated]

### Assistant | 2026-05-12T17:58:06.868Z

[tool_use: Grep]

### User | 2026-05-12T17:58:06.981Z

[tool_result] 127:The orchestrator checkpoints every 100 files (or every 60 s, whichever comes first). If the process dies — power loss, OOM, `kill -9` — restart resumes within 1 file of the last checkpoint.
134:// 2. Restart the orchestrator — same batchId, same fileIds, same stateDir
144:  "params": { "batchId": "<uuid>", "fileIds": [...], "force": true } }
147:Only set `force: true` after confirming via file
... [+1178 chars truncated]

### Assistant | 2026-05-12T17:58:08.005Z

[tool_use: Grep]

### User | 2026-05-12T17:58:08.363Z

[tool_result] 189:    "Blocks re-issuing a running batch whose lastCheckpoint / lastUpdate is older than the configured stuck threshold (default 30 minutes). Prevents a zombie batch from silently consuming compute.",
217:    const last = d.lastCheckpoint ?? d.lastUpdate ?? d.lastHeartbeat;
220:      return hookSuccess(cadRegressionStuckBatchGuard, "No lastCheckpoint hint provided");
224:      return hookSuccess
... [+73 chars truncated]

### User | 2026-05-12T17:58:09.442Z

[tool_result] 294:    // Initial checkpoint so resume has a baseline to load from

### Assistant | 2026-05-12T17:59:22.246Z

Excellent — critical finding confirmed: **the orchestrator does NO comparison logic at all** — zero hits for `tolerance|threshold|comparison|epsilon|baseline|pixelDiff`. The orchestrator just delegates to an injected `TestRunner` which is "deferred to its own unit" (line 13). So §6's "comparison failed: diff exceeded tolerance" is referring to a runner that **doesn't exist yet in this commit**. The runbook is documenting a category that has no implementation.

Also, the stuck-batch guard takes `lastCheckpoint` from the input params — meaning **the caller passes it to themselves**. An attacker (or careless operator) can pass `lastCheckpoint: new Date().toISOString()` and trivially bypass the guard with no `force: true` needed.

I have everything I need to write the review.

---

## Independent 3-Way Reviewer B — CAD Regression Runbook

**Scope:** Operator pitfalls, safety doctrine, recovery scenarios, adversarial misuse. Reviewer A (technical-accuracy) is covering action names and parameter types in parallel.

### Findings

- **[P0] No lockfile / no mutex / no PID stamp in the orchestrator — two concurrent `cad_regression_run` calls on the same batchId silently corrupt state.** Confirmed with `grep -i 'lock|mutex|pid|process\.pid' CADRegressionTestOrchestratorEngine.ts` → zero hits. The orchestrator's `_loadExisting` reads prior state, the worker pool runs, and `atomicWrite` writes — but two processes can interleave reads/writes between each other's `atomicWrite` cycles. Each `atomicWrite` is atomic, but the read-mutate-write loop is not. Two orchestrators on the same batchId WILL silently last-writer-wins, dropping transitions. The runbook should either (a) implement a `<statePath>.lock` lockfile in U-CINF04.1 and document it, or (b) explicitly warn: "Never invoke `cad_regression_run` twice on the same batchId from different MCP clients / processes. There is no mutex. The dispatcher cannot detect this. Operator is responsible." Lines 134 ("Restart the orchestrator —
... [+13483 chars truncated]
