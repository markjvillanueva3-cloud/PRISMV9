---
type: "chat-session"
source: "claude-code-cli"
session_id: "24e5b0b2-d2bb-4979-b53b-5d101e78cd1c"
title: "Independently review H:\\prism\\scripts\\sfc-variability-resume-guard.mjs end-to-en"
date: "2026-05-19"
first_ts: "2026-05-19T00:43:52.783Z"
last_ts: "2026-05-19T00:54:30.513Z"
cwd: "H:\\prism"
messages: 43
user_msgs: 16
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-a6cfccb6f50ea782e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independently review H:\prism\scripts\sfc-variability-resume-guard.mjs end-to-en

> **claude-code-cli** | 2026-05-19 | 43 msgs (16 user / 27 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-a6cfccb6f50ea782e.jsonl`

## Transcript

### User | 2026-05-19T00:43:52.783Z

Independently review H:\prism\scripts\sfc-variability-resume-guard.mjs end-to-end (read the whole file). Do NOT assume any other reviewer caught anything.

CONTEXT: A watchdog that auto-resumes a multi-day batch script `scripts/sfc-variability-batch-run.mjs` after machine switches/crashes. It must detect liveness via Windows process enumeration, and on death compute a safe `--skip` and spawn the batch detached. The batch writes `chunk-w<workerIdx>-<globalComboIdx>.jsonl` files; a relaunch with a too-small --skip would overwrite existing chunks (silent data loss). Enumeration failure must be fail-safe (do NOT relaunch).

Weight your review toward what a code-correctness reviewer is LIKELY TO MISS:
- Integration/coupling with the real batch script's argv contract (`--domain --workers --max-minutes --chunk --skip --out`) and its chunk-filename scheme — is `buildBatchArgv` exactly compatible?
- The detached spawn: `spawn(process.execPath, argv, {detached:true, stdio:"ignore"}).unref()` — does this actually survive the guard process exiting and the scheduled-task session ending on Windows? Any handle/cwd hazard?
- Windows specifics: PowerShell spawnSync argv quoting, the `Get-CimInstance ... Select CommandLine` could truncate long cmdlines (Win32_Process.CommandLine truncation) — would that defeat `classifyAlive` and cause a false "dead" → dangerous relaunch while alive?
- Lockfile semantics across two PCs sharing the H: drive (the lock path is on shared storage but PIDs are per-host) — false "lock held" or false stale-reap across hosts?
- Concurrency: two scheduled-task fires overlapping; guard + a human manual launch; the 20s PowerShell timeout vs the 5-min cadence.
- Security (spawn argv injection — none expected but verify), error budgets, naming/convention conformance, any inlined constant, any stub/placeholder, any silent failure that should be loud (R12).

Report P0/P1/P2 with line refs and a final PASS or FAIL verdict.

### Assistant | 2026-05-19T00:44:03.688Z

I'll review this file end-to-end independently.

### Assistant | 2026-05-19T00:44:04.110Z

[tool_use: Read]

### User | 2026-05-19T00:44:11.107Z

[tool_result] read-once-guard: 'H:\prism\scripts\sfc-variability-resume-guard.mjs' was already read 6s ago in this session and is unchanged (mtime 1779151331807). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T00:44:15.472Z

The read-once guard says it's in context, but I don't actually have the file content. Let me bypass the cache.

### Assistant | 2026-05-19T00:44:16.347Z

[tool_use: Bash]

### User | 2026-05-19T00:44:36.216Z

[tool_result] 330

### Assistant | 2026-05-19T00:44:40.009Z

[tool_use: Bash]

### User | 2026-05-19T00:45:02.345Z

[tool_result] #!/usr/bin/env node
/**
 * SFC-ACCURACY-MS1 — Variability batch resume-guard (watchdog).
 *
 * The Stage-2 batch (`sfc-variability-batch-run.mjs`) is a multi-day workload
 * toward billions of compatibility-filtered combos. It has died TWICE on
 * machine switches (the H: drive is shared across PCs; disk state survives,
 * processes do not). This guard makes the batch self-resuming so it survives

... [+6306 chars truncated]

### Assistant | 2026-05-19T00:45:08.012Z

[tool_use: Bash]

### User | 2026-05-19T00:45:40.045Z

[tool_result]  * Default Windows process enumerator (node.exe cmdlines), shell-free via
 * spawnSync with a fixed argv. Throws on PowerShell failure so classifyAlive
 * resolves it to the fail-safe "indeterminate" state.
 */
function defaultProcEnum() {
  const r = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
    
... [+5325 chars truncated]

### Assistant | 2026-05-19T00:45:43.365Z

Now I have the full file. Let me verify the integration points against the real batch script — the argv contract and chunk-filename scheme are load-bearing.

### Assistant | 2026-05-19T00:45:45.470Z

[tool_use: Bash]

### User | 2026-05-19T00:46:13.750Z

[tool_result] H:/prism/scripts/sfc-variability-batch-run.mjs  16.8K
---ARGV PARSE---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
grep: unknown option -- domain\|--workers\|--max-minutes\|--chunk\|--skip\|--out\|process.argv\|parseArg
Usage: grep [OPTION]... PATTERN [FILE]...
Try 'grep --help' for more information.
0 matches for '--domain\|--workers\|--max-min
... [+53 chars truncated]

### Assistant | 2026-05-19T00:46:18.141Z

Let me use Grep properly for the batch script's argv parsing and chunk filename scheme.

### Assistant | 2026-05-19T00:46:19.106Z

[tool_use: Grep]

### User | 2026-05-19T00:46:29.401Z

[tool_result] 13: * workers in parallel (--workers N) and round-robin assign by combo index.
16: *   --domain mill|lathe   (which enumerator to use, default mill;
18: *   --max-minutes N       (wall-clock cap; default 60)
20: *   --chunk N             (rows per output chunk file; default 5000)
21: *   --workers N           (parallelism; default 1)
23: *   --skip N              (skip first N combos — resumable)

... [+1332 chars truncated]

### Assistant | 2026-05-19T00:46:34.256Z

Critical finding emerging. The chunk filename at line 305 uses `String(chunkStartIdx).padStart(CHUNK_IDX_PAD, "0")` — zero-padded. The guard's `CHUNK_RE = /^chunk-w\d+-(\d+)\.jsonl$/` will match padded numbers, and `Number(m[1])` strips leading zeros, so parsing is fine. But let me examine the chunk index semantics and the worker-fanout logic closely — this is the load-bearing data-loss surface.

### Assistant | 2026-05-19T00:46:35.058Z

[tool_use: Bash]

### User | 2026-05-19T00:47:16.061Z

[tool_result]   return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, FP_LEN);
}

// ─── ARG PARSING ──────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {
    domain: "mill",
    maxMinutes: DEFAULT_MAX_MINUTES,
    maxCells: Infinity,
    chunkSize: DEFAULT_CHUNK_ROWS,
    workers: DEFAULT_WORKERS,
    workerIdx: 0,
    workerN: 1,
  
... [+5315 chars truncated]

### Assistant | 2026-05-19T00:47:20.552Z

Now I have the critical integration details. This is the load-bearing data-loss surface. Let me analyze the chunk index semantics precisely, and check the scheduled-task installer and tests.

### Assistant | 2026-05-19T00:47:21.890Z

[tool_use: Grep]

### User | 2026-05-19T00:47:26.094Z

[tool_result] 67:const CHUNK_IDX_PAD = 12;
69:const DEFAULT_CHUNK_ROWS = 5000;
71:const DEFAULT_MAX_MINUTES = 60;
73:const DEFAULT_WORKERS = 1;
257:    maxMinutes: DEFAULT_MAX_MINUTES,
259:    chunkSize: DEFAULT_CHUNK_ROWS,
260:    workers: DEFAULT_WORKERS,
301:  let chunkStartIdx = args.skip;
305:    const fname = `chunk-w${args.workerIdx}-${String(chunkStartIdx).padStart(CHUNK_IDX_PAD, "0")}.jsonl`;
308:    c
... [+23 chars truncated]

### Assistant | 2026-05-19T00:47:30.453Z

Now I have the complete picture of the chunk-index semantics. Let me check the scheduled-task installer and the test file to assess integration and detached-spawn behavior.

### Assistant | 2026-05-19T00:47:31.521Z

[tool_use: Bash]

### User | 2026-05-19T00:49:47.316Z

[tool_result] Command running in background with ID: bkqhp8624. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\27ff145e-96f4-49da-919f-4973d7a7507f\tasks\bkqhp8624.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-19T00:49:51.171Z

[tool_use: Glob]

### User | 2026-05-19T00:50:15.040Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-19T00:50:25.870Z

[tool_use: Glob]

### User | 2026-05-19T00:50:48.085Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-19T00:50:52.155Z

Glob is timing out (large repo). Let me check the background find task and use direct path tests.

### Assistant | 2026-05-19T00:50:54.070Z

[tool_use: Bash]

### User | 2026-05-19T00:51:07.432Z

[tool_result] absent: H:/prism/.claude/helpers/install-sfc-variability-task.ps1
absent: H:/prism/scripts/install-sfc-variability-task.ps1
absent: H:/prism/scripts/__tests__/sfc-variability-resume-guard.test.mjs
absent: H:/prism/scripts/sfc-variability-resume-guard.test.mjs
absent: H:/prism/scripts/lib/__tests__/sfc-variability-resume-guard.test.mjs

### Assistant | 2026-05-19T00:51:11.702Z

Neither the installer (referenced in the docstring line 11) nor any test file exists. Let me confirm via the background find and check git status for what's actually staged in this session.

### Assistant | 2026-05-19T00:51:13.363Z

[tool_use: Bash]

### User | 2026-05-19T00:51:37.643Z

[tool_result] ---GIT---
?? scripts/generate-sfc-variability-features.mjs
?? scripts/sfc-variability-batch-run.mjs
?? scripts/sfc-variability-cache.mjs
?? scripts/sfc-variability-enumerate-lathe.mjs
?? scripts/sfc-variability-enumerate.mjs
?? scripts/sfc-variability-resume-guard.mjs

### Assistant | 2026-05-19T00:51:43.609Z

The find returned nothing (no installer, no test). Confirmed: the docstring references `install-sfc-variability-task.ps1` (line 11) which does not exist anywhere, and there is **no test file** despite the docstring's claim (lines 36-40) that the pure functions are "exported for hermetic testing." Let me check the batch's `--out` default resolution and the `loadEnumerator`/domain set for the integration check, then verify the CLI entry detection under tsx.

### Assistant | 2026-05-19T00:51:45.282Z

[tool_use: Bash]

### User | 2026-05-19T00:51:51.459Z

[tool_result] 8: * under state/shared/sfc-variability-results/<domain>/.
16: *   --domain mill|lathe   (which enumerator to use, default mill;
17: *                          lathe enumerator built separately as Stage 1B)
25: *   --out <dir>           (default state/shared/sfc-variability-results/<domain>)
---ENTRY---
// ESM entry-point detection — Windows-safe via fileURLToPath.
const _modulePath = fileURLToPat
... [+645 chars truncated]

### Assistant | 2026-05-19T00:51:58.764Z

I now have everything needed for a complete independent analysis. Let me verify the most dangerous claim — the `--skip` collision-safety semantics — by tracing the exact arithmetic.

**Chunk filename trace (batch script):**
- `chunkStartIdx` initialized to `args.skip` (line 301)
- First chunk written: `chunk-w<workerIdx>-<skip padded to 12>.jsonl` (line 305)
- After write: `chunkStartIdx = idx + 1` (line 308), where `idx` is the global combo index (1-based, incremented at line 313 `idx++`)
- Guard's `parseChunkIndex` extracts that number; `computeResumeSkip` = `maxIdx + margin`

This exposes the core data-loss bug. Let me trace it precisely:

### Assistant | 2026-05-19T00:51:59.655Z

[tool_use: Bash]

### User | 2026-05-19T00:52:32.100Z

[tool_result]   let okCount = 0;
  let errCount = 0;
  let chunkBuf = [];
  let chunkStartIdx = args.skip;

  const writeChunk = async () => {
    if (chunkBuf.length === 0) return;
    const fname = `chunk-w${args.workerIdx}-${String(chunkStartIdx).padStart(CHUNK_IDX_PAD, "0")}.jsonl`;
    const fpath = resolve(outDir, fname);
    await writeFile(fpath, chunkBuf.join("\n") + "\n", "utf8");
    chunkStartIdx = 
... [+843 chars truncated]

### Assistant | 2026-05-19T00:54:30.513Z

I now have a complete and definitive picture. The chunk filename scheme is the crux of the data-loss safety claim, and the guard's `--skip` computation is **arithmetically wrong** relative to the batch's actual filename scheme. Let me lay out the full review.

---

# Independent Review: `scripts/sfc-variability-resume-guard.mjs`

**Verdict: FAIL** — one P0 silent data-loss bug (the exact failure mode this guard exists to prevent), plus a P0 multi-worker collision miss, and several P1/P2 issues.

---

## P0-1 — `computeResumeSkip` does NOT prevent chunk overwrite; the safety invariant is violated by construction

This is the load-bearing claim of the entire file (docstring lines 21–25, 95–99) and it is **false**.

**The batch's actual chunk-filename scheme** (`sfc-variability-batch-run.mjs`):
- A chunk file is named with `chunkStartIdx`, NOT the highest combo index it contains (line 305).
- `chunkStartIdx` starts at `args.skip` (line 301). The **first** chunk a worker writes is literally `chunk-w<W>-<skip>.jsonl` (zero-padded to 12).
- After each write, `chunkStartIdx = idx + 1` (line 308) — the *next* global combo index.

**The guard's logic** (`maxChunkIndex` → `computeResumeSkip`, guard lines 86–106):
- `maxChunkIndex` returns the largest *filename* number = the largest `chunkStartIdx` ever written = the start index of the **last (newest) chunk file**, NOT the highest data index processed.
- `computeResumeSkip` returns `maxIdx + margin` (margin default 100).

**Why this silently destroys data:**

Worker 0, `--skip 0`, `--chunk 5000`, processes combos 1..15000, dies mid-4th-chunk. Files on disk:
- `chunk-w0-000000000000.jsonl` (chunkStartIdx 0, holds idx 1..5000)
- `chunk-w0-000000005001.jsonl` (chunkStartIdx 5001, holds idx 5001..10000)
- `chunk-w0-000000010001.jsonl` (chunkStartIdx 10001, holds idx 10001..15000)

`maxChunkIndex` = **10001**. `computeResumeSkip(10001, 100)` = **10101**.

The relaunched batch starts at `--skip 10101`. But combos **10001..15000 were
... [+17688 chars truncated]
