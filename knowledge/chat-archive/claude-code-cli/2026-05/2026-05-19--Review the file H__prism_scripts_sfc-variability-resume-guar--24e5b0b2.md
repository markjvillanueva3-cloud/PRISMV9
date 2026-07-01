---
type: "chat-session"
source: "claude-code-cli"
session_id: "24e5b0b2-d2bb-4979-b53b-5d101e78cd1c"
title: "Review the file H:\\prism\\scripts\\sfc-variability-resume-guard.mjs end-to-end (re"
date: "2026-05-19"
first_ts: "2026-05-19T00:43:41.042Z"
last_ts: "2026-05-19T00:48:53.943Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-a03a380bc172bafb8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Review the file H:\prism\scripts\sfc-variability-resume-guard.mjs end-to-end (re

> **claude-code-cli** | 2026-05-19 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-a03a380bc172bafb8.jsonl`

## Transcript

### User | 2026-05-19T00:43:41.042Z

Review the file H:\prism\scripts\sfc-variability-resume-guard.mjs end-to-end (read the whole file).

CONTEXT: This is a watchdog that makes a multi-day batch (`scripts/sfc-variability-batch-run.mjs`) self-resuming. The batch names output chunk files `chunk-w<workerIdx>-<12digitGlobalComboIdx>.jsonl` in `state/shared/sfc-variability-results/<domain>/`. It accepts `--domain mill|lathe --workers N --max-minutes N --chunk N --skip N --out <dir>`. With `--skip N` it skips combos with idx ≤ N. The guard must: detect if a batch is alive (node proc cmdline contains the batch script + `--domain <d>`); if dead, scan the out dir for the highest chunk index, compute a safe `--skip = maxIdx + margin` so new chunk filenames cannot collide with/overwrite existing files; then spawn the batch detached.

LOAD-BEARING SAFETY INVARIANT: process-enumeration FAILURE must be treated as "indeterminate → do NOT relaunch" (relaunching while a batch is actually alive would spawn a 2nd worker set with the SAME --skip → colliding chunk filenames → silent data overwrite/loss).

Verify rigorously and flag P0/P1 issues with severity:
1. The fail-safe invariant: does `classifyAlive` + `decideRelaunch` actually never relaunch on enumeration failure (throw, non-array, exit≠0, timeout)?
2. `computeResumeSkip` correctness for: no chunks (maxIdx=-1 → must be 0), normal, NaN/negative/Infinity margin, NaN maxIdx.
3. `parseChunkIndex` / `maxChunkIndex` edge cases (non-string, malformed names, empty array, non-array, huge numbers).
4. Chunk-collision safety: is `maxIdx + margin` actually sufficient given the batch's per-worker chunkStartIdx semantics (it starts at --skip then becomes idx+1 after each write)? Could a relaunch ever overwrite an existing chunk file?
5. Lockfile acquire/release correctness (O_EXCL, stale reap, race), telemetry fail-soft, runGuard never-throws.
6. Any inlined constant that should be canonical, any silent-failure that violates fail-loud (R12), any unreachable/dead code.

Report c
... [+131 chars truncated]

### Assistant | 2026-05-19T00:43:56.662Z

I'll read the file end-to-end and analyze it rigorously.

### Assistant | 2026-05-19T00:43:56.804Z

[tool_use: Read]

### User | 2026-05-19T00:44:11.833Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * SFC-ACCURACY-MS1 — Variability batch resume-guard (watchdog).
4	 *
5	 * The Stage-2 batch (`sfc-variability-batch-run.mjs`) is a multi-day workload
6	 * toward billions of compatibility-filtered combos. It has died TWICE on
7	 * machine switches (the H: drive is shared across PCs; disk state survives,
8	 * processes do not). This guard makes the batch self-resuming
... [+13175 chars truncated]

### Assistant | 2026-05-19T00:44:16.719Z

Now let me verify the critical claim in #4 — the batch's per-worker chunkStartIdx semantics. Let me read the batch script to verify the collision-safety argument.

### Assistant | 2026-05-19T00:44:18.249Z

[tool_use: Bash]

### User | 2026-05-19T00:44:37.070Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
43 matches in 7 files:

259:0:DEFAULT_CHUNK_ROWS,
261:0:0,
263:0:0,
31:0:each chunk file is named with starting combo index, so
337:0:slim, out, err }));
357:0:`${args.workerIdx}/${args.workerN}`,
H:/prism/scripts/sfc-variability-batch-run.mjs:7:* (input fingerprint, output, safety status) to chunked J
... [+2687 chars truncated]

### Assistant | 2026-05-19T00:44:40.567Z

Let me read the exact chunk-write and worker-dispatch logic in the batch to verify the collision-safety invariant precisely.

### Assistant | 2026-05-19T00:44:41.496Z

[tool_use: Read]

### User | 2026-05-19T00:44:55.201Z

[tool_result] 295	  const deadlineMs = startMs + args.maxMinutes * MIN_TO_MS;
296	  let idx = 0;
297	  let processedThisWorker = 0;
298	  let okCount = 0;
299	  let errCount = 0;
300	  let chunkBuf = [];
301	  let chunkStartIdx = args.skip;
302	
303	  const writeChunk = async () => {
304	    if (chunkBuf.length === 0) return;
305	    const fname = `chunk-w${args.workerIdx}-${String(chunkStartIdx).padStart(CHUNK
... [+2212 chars truncated]

### Assistant | 2026-05-19T00:45:01.948Z

Now I have the critical batch semantics. Let me check how the orchestrator dispatches workers (whether `--workers` is passed through to `--workerIdx`, and the relationship between guard's `--workers` arg and the actual worker argv).

### Assistant | 2026-05-19T00:45:02.467Z

[tool_use: Read]

### User | 2026-05-19T00:45:26.850Z

[tool_result] 368	// ─── MULTI-WORKER ORCHESTRATOR ───────────────────────────────────────
369	async function runOrchestrator(args) {
370	  const procs = [];
371	  const results = [];
372	  for (let i = 0; i < args.workers; i++) {
373	    const childArgs = [
374	      "--domain", args.domain,
375	      "--max-minutes", String(args.maxMinutes),
376	      "--max-cells", String(args.maxCells),
377	      "--chunk",
... [+2333 chars truncated]

### Assistant | 2026-05-19T00:45:30.921Z

I now have the full picture of the batch's chunk-naming semantics. Let me check the test file to see what's covered, and verify the `CHUNK_IDX_PAD` constant.

### Assistant | 2026-05-19T00:45:32.933Z

[tool_use: Bash]

### User | 2026-05-19T00:45:49.724Z

[tool_result] Exit code 1
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

H:/prism/scripts/sfc-variability-batch-run.mjs:67:const CHUNK_IDX_PAD = 12;
H:/prism/scripts/sfc-variability-batch-run.mjs:305:const fname = `chunk-w${args.workerIdx}-${String(chunkStartIdx).padStart(CHUN...
---TESTS---

### Assistant | 2026-05-19T00:45:55.682Z

[tool_use: Bash]

### User | 2026-05-19T00:46:23.168Z

[tool_result] ---workerIdx line 305---
    const fname = `chunk-w${args.workerIdx}-${String(chunkStartIdx).padStart(CHUNK_IDX_PAD, "0")}.jsonl`;
      "--workerIdx", `${i}/${args.workers}`,

### Assistant | 2026-05-19T00:46:27.938Z

Critical finding on chunk filename format. Line 378 passes `--workerIdx "0/4"` (the raw `i/N` string), and line 305 builds the filename as `chunk-w${args.workerIdx}-...`. Let me verify how the batch parses `--workerIdx` into `args.workerIdx`.

### Assistant | 2026-05-19T00:46:28.819Z

[tool_use: Read]

### User | 2026-05-19T00:46:55.973Z

[tool_result] 255	  const args = {
256	    domain: "mill",
257	    maxMinutes: DEFAULT_MAX_MINUTES,
258	    maxCells: Infinity,
259	    chunkSize: DEFAULT_CHUNK_ROWS,
260	    workers: DEFAULT_WORKERS,
261	    workerIdx: 0,
262	    workerN: 1,
263	    skip: 0,
264	    dryRun: false,
265	    out: null,
266	  };
267	  for (let i = 0; i < argv.length; i++) {
268	    const a = argv[i];
269	    if (a === "--domain") 
... [+1205 chars truncated]

### Assistant | 2026-05-19T00:48:53.943Z

I now have the complete and exact picture. `args.workerIdx` is parsed to a `Number` (e.g. `0`, `1`, `2`, `3`), so filenames are `chunk-w0-000000000000.jsonl` etc. The guard's `CHUNK_RE = /^chunk-w\d+-(\d+)\.jsonl$/` matches correctly. Now I have everything needed to verify the collision-safety invariant rigorously.

Let me trace the exact chunk-index sequence a worker produces, since this is the load-bearing safety property:

For worker `w` with `--skip = S`, `--workers = N`:
- `chunkStartIdx` initializes to `S` → first file is `chunk-w<w>-<S>.jsonl`
- `idx` is the **global** combo counter (incremented for *every* combo, before the skip/round-robin filters)
- After each `writeChunk()`: `chunkStartIdx = idx + 1` where `idx` is the global index of the **last-enumerated** combo at write time
- So subsequent filenames use `idx+1` (a global index value `> S`)

So **every chunk filename's embedded index is ≥ S** (the first one is exactly `S`, all others are `idx+1 > S` since `idx > S` once past the skip filter). This is the key fact for collision analysis.

Now let me write up the complete findings.

---

# Code Quality Analysis Report — `sfc-variability-resume-guard.mjs`

### Summary
- Files analyzed: 1 (guard) + 1 cross-referenced (`sfc-variability-batch-run.mjs`)
- Overall: the fail-safe invariant (#1) is **correctly implemented**; pure-core math (#2/#3) is sound. However there is a **P0 chunk-collision data-loss bug** (#4) and a **P0 process-enumeration false-negative** that both defeat the stated safety invariant in realistic operation.

---

### P0 — Chunk-collision IS possible: first relaunch chunk reuses an existing index → silent overwrite

**Location:** `computeResumeSkip` (lines 101-105) + interaction with batch `writeChunk` (batch lines 301-309).

The guard's safety claim is "new chunk filenames start strictly past every existing file (no overwrite)" (lines 17-19, 54-56, 98-99). This is **false** at the boundary.

Trace the batch's first chunk after a resume w
... [+16628 chars truncated]
