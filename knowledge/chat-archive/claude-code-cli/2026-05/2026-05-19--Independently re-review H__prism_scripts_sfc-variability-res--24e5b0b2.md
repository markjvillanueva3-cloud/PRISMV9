---
type: "chat-session"
source: "claude-code-cli"
session_id: "24e5b0b2-d2bb-4979-b53b-5d101e78cd1c"
title: "Independently re-review H:\\prism\\scripts\\sfc-variability-resume-guard.mjs (v2 re"
date: "2026-05-19"
first_ts: "2026-05-19T01:02:13.012Z"
last_ts: "2026-05-19T01:08:12.328Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 14
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-a7bad2589457e5173.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Independently re-review H:\prism\scripts\sfc-variability-resume-guard.mjs (v2 re

> **claude-code-cli** | 2026-05-19 | 38 msgs (14 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/24e5b0b2-d2bb-4979-b53b-5d101e78cd1c/subagents/agent-a7bad2589457e5173.jsonl`

## Transcript

### User | 2026-05-19T01:02:13.012Z

Independently re-review H:\prism\scripts\sfc-variability-resume-guard.mjs (v2 rewrite) + its test H:\prism\scripts\sfc-variability-resume-guard.test.mjs end-to-end. Do NOT assume the other reviewer caught anything.

Cross-reference the real batch it controls: H:\prism\scripts\sfc-variability-batch-run.mjs (chunk filename scheme ~line 305 `chunk-w<workerIdx>-<chunkStartIdx padded12>.jsonl`; chunkStartIdx starts at args.skip then becomes idx+1 after each flush ~lines 301/308; worker filter `idx<=skip continue` + `(idx-1)%workerN===workerIdx` ~lines 314-315; record shape `{fp,idx,in,out,err}` ~line 337; orchestrator spawns N children each with same --skip ~lines 369-403; defaults DEFAULT_CHUNK_ROWS=5000 line 69).

A prior FAIL found: (P0) filename-derived resume skip → silent multi-worker corpus gaps; (P0) empty enumeration → false "dead" → relaunch into live batch. The v2 claims to fix both via record-idx min-worker-frontier resume + empty-enum→indeterminate + worker-count-mismatch fail-safe.

Weight your review toward what a correctness reviewer is likely to MISS:
1. CONTRACT EXACTNESS: does `buildBatchArgv` produce argv the batch's parseArgs actually accepts (--domain --workers --max-minutes --chunk --skip --out, positional tsx cli + script)? Will the relaunched batch with `--skip = minFrontier` and SAME --workers deterministically re-produce byte-identical chunk files in the overlap region (so overwrites are idempotent, not corruption)? Is "same --workers AND same --chunk" actually sufficient for deterministic reproduction, or does enumerator order / Date-based logic break determinism?
2. The min-frontier choice creates REWORK (workers redo combos between minFrontier and their own frontier). Is that rework actually deduped downstream, or does it produce duplicate/overwritten chunk files that corrupt aggregates? Trace a concrete case.
3. Windows job-object survival of the detached spawn from a scheduled task (no CREATE_BREAKAWAY_FROM_JOB) — is the "guard re-checks e
... [+851 chars truncated]

### Assistant | 2026-05-19T01:02:35.972Z

I'll review these files end-to-end independently. Let me start by reading all three.

### Assistant | 2026-05-19T01:02:36.409Z

[tool_use: Read]

### Assistant | 2026-05-19T01:02:36.802Z

[tool_use: Read]

### Assistant | 2026-05-19T01:02:37.219Z

[tool_use: Read]

### User | 2026-05-19T01:02:41.488Z

[tool_result] read-once-guard: 'H:\prism\scripts\sfc-variability-resume-guard.mjs' was already read 27s ago in this session and is unchanged (mtime 1779152303277). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T01:02:42.727Z

[tool_result] read-once-guard: 'H:\prism\scripts\sfc-variability-batch-run.mjs' was already read 9s ago in this session and is unchanged (mtime 1779135229222). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T01:02:43.715Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * Hermetic tests for sfc-variability-resume-guard.mjs.
4	 *
5	 * Pins the two P0s the 2026-05-19 per-file scrutiny caught in v1:
6	 *   P0-1/P0-2  resume skip MUST be the min over workers of each worker's
7	 *              max RECORD idx (not a filename-derived value) — else
8	 *              multi-worker round-robin death produces silent corpus gaps.
9	 *   P0 (fail
... [+13726 chars truncated]

### Assistant | 2026-05-19T01:02:49.843Z

The read-once guard says the guard.mjs and batch-run.mjs are already in my context, but I need to actually see them. Let me read the specific portions I need.

### Assistant | 2026-05-19T01:02:50.617Z

[tool_use: Read]

### User | 2026-05-19T01:03:08.988Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * SFC-ACCURACY-MS1 — Variability batch resume-guard (watchdog).
4	 *
5	 * The Stage-2 batch (`sfc-variability-batch-run.mjs`) is a multi-day workload
6	 * toward billions of compatibility-filtered combos. It has died TWICE on
7	 * machine switches (the H: drive is shared across PCs; disk state survives,
8	 * processes do not). This guard makes the batch self-resuming
... [+17179 chars truncated]

### Assistant | 2026-05-19T01:03:13.907Z

Now let me read the rest of the guard file.

### Assistant | 2026-05-19T01:03:14.841Z

[tool_use: Read]

### User | 2026-05-19T01:03:34.319Z

[tool_result] 400	    schemaVersion: TELEMETRY_SCHEMA,
401	    ts: new Date(now()).toISOString(),
402	    domains: [], disabled: false, dryRun,
403	  };
404	
405	  if (process.env.PRISM_SFC_VARIABILITY_GUARD_DISABLE === "1") {
406	    summary.disabled = true;
407	    return summary;
408	  }
409	
410	  for (const domain of domains) {
411	    if (!VALID_DOMAINS.has(domain)) {
412	      summary.domains.push({ doma
... [+4499 chars truncated]

### Assistant | 2026-05-19T01:03:38.803Z

Now I have the full guard. Let me read the batch-run.mjs critical sections to verify the contract.

### Assistant | 2026-05-19T01:03:39.610Z

[tool_use: Read]

### User | 2026-05-19T01:03:47.618Z

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
... [+5039 chars truncated]

### Assistant | 2026-05-19T01:03:52.712Z

Now let me read the batch's argument parser and the chunk-writing / worker-filter logic (the contract surface the guard depends on).

### Assistant | 2026-05-19T01:03:53.690Z

[tool_use: Read]

### User | 2026-05-19T01:03:58.372Z

[tool_result] 230	  };
231	}
232	
233	function round(v, dp) {
234	  if (typeof v !== "number" || !Number.isFinite(v)) return null;
235	  const m = Math.pow(10, dp);
236	  return Math.round(v * m) / m;
237	}
238	
239	// Lightweight non-crypto fingerprint — fast enough for 1B+ calls.
240	// 16 hex chars from FNV-style rolling hash over sorted-key JSON.
241	function fingerprint(slim) {
242	  const fpRaw = JSON.str
... [+7338 chars truncated]

### Assistant | 2026-05-19T01:04:09.221Z

I now have the complete picture of all three files and the exact contract surface. Let me trace through the critical correctness paths.

**Contract analysis — `buildBatchArgv` vs batch `parseArgs`:**

Guard emits: `[tsxCli, batchPath, --domain, --workers, --max-minutes, --chunk, --skip, --out]`

Batch `parseArgs` (lines 267-282) accepts: `--domain`, `--max-minutes`, `--max-cells`, `--chunk`, `--workers`, `--workerIdx`, `--skip`, `--dry-run`, `--out`. So `--domain/--workers/--max-minutes/--chunk/--skip/--out` are all accepted. **Contract holds.**

Entry dispatch (line 419): `runFn = (args.workers > 1 && args.workerN === 1) ? runOrchestrator : runWorker`. Guard passes `--workers 4` and NO `--workerIdx`, so `workerN` defaults to 1 → `runOrchestrator`. Correct — guard spawns the orchestrator, which fans out children. **Contract holds.**

Now let me trace the **critical determinism / rework-idempotency claim** carefully.

**Worker filter (lines 313-315):** `idx++; if (idx <= args.skip) continue; if (args.workerN > 1 && ((idx-1) % args.workerN) !== args.workerIdx) continue;`

So worker `w` (of N) processes combos where `idx > skip` AND `(idx-1) % N === w`. This is deterministic given enumerator order + N + skip.

**Chunk filename (line 305):** `chunk-w${workerIdx}-${chunkStartIdx padded 12}.jsonl`. `chunkStartIdx` starts at `args.skip` (line 301), becomes `idx+1` after each flush (line 308).

Now I'll trace the concrete rework-overlap case the prompt asks about.

### Assistant | 2026-05-19T01:04:09.834Z

[tool_use: Bash]

### User | 2026-05-19T01:04:22.581Z

[tool_result]   ...
# Subtest: runGuard: kill switch disables everything
ok 26 - runGuard: kill switch disables everything
  ---
  duration_ms: 0.2433
  ...
# Subtest: runGuard: unknown domain → skip
ok 27 - runGuard: unknown domain → skip
  ---
  duration_ms: 0.2316
  ...
# Subtest: runGuard: dryRun never spawns
ok 28 - runGuard: dryRun never spawns
  ---
  duration_ms: 0.2384
  ...
1..28
# tests 28
# suites 0
... [+77 chars truncated]

### Assistant | 2026-05-19T01:04:41.682Z

28/28 pass. Now the deep correctness trace — the rework-overlap idempotency claim, which is the load-bearing property and the thing a correctness reviewer is most likely to miss.

**Concrete rework case (the determinism question):**

Original run: `--skip 0 --workers 4 --chunk 50`. Worker 0 processes `idx ∈ {1,5,9,...}` (since `(idx-1)%4===0`). Worker 0 writes its first chunk file `chunk-w0-000000000000.jsonl` (chunkStartIdx=0) after collecting 50 *processed* rows. At flush, `chunkStartIdx = idx+1` where `idx` is the global enumerator index at that moment.

Suppose worker 2 dies at frontier 400 (max record idx=400), workers 0/1/3 reach ~1200. `computeResumeSkip` → `skip = min(1000,980,400,1200) = 400`.

Relaunch: `--skip 400 --workers 4 --chunk 50`. Now worker 0 processes `idx > 400` AND `(idx-1)%4===0`. Its first chunk on relaunch is named `chunk-w0-000000000400.jsonl` (chunkStartIdx=args.skip=400).

**This is the critical finding.** Trace worker 0's filenames:

- **Original run**: worker 0's first chunk = `chunk-w0-000000000000.jsonl`. It collects 50 processed rows. The 50th processed row is at some global `idx` = roughly `1 + 4*49 = 197` (worker 0 takes every 4th). At flush `chunkStartIdx = idx+1 ≈ 198`. Next file: `chunk-w0-000000000198.jsonl`. Then ≈ `chunk-w0-000000000397.jsonl`, then `chunk-w0-000000000597.jsonl`, etc. The chunk boundaries fall at idx values determined by **where 50 processed rows accumulate starting from skip=0**.

- **Relaunch run** (`--skip 400`): worker 0's first processed combo is the first `idx > 400` with `(idx-1)%4===0` → `idx=401`. First chunk = `chunk-w0-000000000400.jsonl`. It collects 50 rows; 50th is at `idx ≈ 401 + 4*49 = 597`; flush sets chunkStartIdx=598; next file `chunk-w0-000000000598.jsonl`.

**The overlap region is NOT byte-identical, and the chunk filenames DO NOT align.** In the original run worker 0 had a chunk boundary at e.g. idx 397/597; in the relaunch run, starting from skip=400, the boundaries land at 597/797. Th
... [+999 chars truncated]

### Assistant | 2026-05-19T01:04:43.072Z

[tool_use: Bash]

### User | 2026-05-19T01:04:52.213Z

[tool_result] scripts/sfc-variability-batch-run.mjs
scripts/sfc-variability-resume-guard.mjs
scripts/sfc-variability-resume-guard.test.mjs
---AGG---
scripts/generate-sfc-variability-features.mjs
scripts/sfc-variability-batch-run.mjs
scripts/sfc-variability-cache.mjs
scripts/sfc-variability-resume-guard.mjs

### Assistant | 2026-05-19T01:04:56.246Z

[tool_use: Bash]

### User | 2026-05-19T01:04:59.083Z

[tool_result] 29 matches in 13 files:

183:0:cell.in, out: cell.out, src: domain });
20:0:~50ms per 5K-cell chunk (parse JSONL + index)
208:0:true, out, src} on exact fingerprint match,
21:0:~0.05ms (Map.get on fingerprint)
218:0:true, fp, out: entry.out, src: entry.src };
22:0:appended to current chunk file, in-memory map updated
221:0:false, fp };
235:0:slim, out: slimOut, src: domain });
241:0:-1, in: slim, 
... [+1598 chars truncated]

### Assistant | 2026-05-19T01:05:02.995Z

This confirms the consumer behavior. Let me read the exact load loop in the cache.

### Assistant | 2026-05-19T01:05:03.861Z

[tool_use: Read]

### User | 2026-05-19T01:05:22.852Z

[tool_result] 160	  async _load() {
161	    const start = Date.now();
162	    const domains = ["mill", "lathe"];
163	    let loaded = 0;
164	    for (const domain of domains) {
165	      const dir = resolve(RESULTS_ROOT, domain);
166	      if (!(await pathExists(dir))) continue;
167	      const entries = await readdir(dir);
168	      const chunks = entries.filter((f) => f.startsWith("chunk-") && f.endsWith(".js
... [+1450 chars truncated]

### Assistant | 2026-05-19T01:05:58.019Z

This is the decisive evidence. The cache consumer (`_load`, lines 160-198):

1. Reads **all** `chunk-*.jsonl` files in the dir (line 168) — it does NOT track which are from which run.
2. Builds a `byFp` Map keyed on **fingerprint** (line 183): `this.byFp.set(cell.fp, {...})`.

So the downstream **does dedup by fingerprint** — a re-processed combo with an identical `fp` simply overwrites the same Map key with an identical value. The `loaded++` counter (line 184) double-counts rework rows, but the *correctness* of the fingerprint→result map is preserved (idempotent overwrite of identical value).

**This refutes the corruption concern but exposes a documentation defect.** The docstring's stated mechanism — "chunk-file overwrite in the overlap region is idempotent" — is **factually wrong** (relaunch creates NEW non-overlapping filenames, it does not overwrite). The system is nonetheless correct because the **real** dedup mechanism is the fingerprint Map in `sfc-variability-cache.mjs:183`, which the docstring also mentions ("Stage-4/Stage-6 fingerprint layer dedupes the rework"). So there are two contradictory rationales in the same comment block; only the fingerprint one is true. This is a P2 (misleading docstring asserting a false safety property — masks the real invariant a future maintainer must preserve), not a P0, because the actual data-integrity outcome is correct.

Now let me verify the remaining review axes.

**Axis 3 — Windows job-object survival / self-heal cadence.** The guard's claim (lines 55-57): "guard re-checks every cadence, so even a job-object kill of a detached child is recovered within one interval — the periodic re-check IS the durability mechanism."

The detached spawn (line 394): `spawn(process.execPath, argv, { cwd, detached: true, stdio: "ignore" }); child.unref();`. On Windows, `detached:true` without `windowsHide` and without breakaway means the child is created in a new process group but **may still be in the scheduled task's job object**. 
... [+2450 chars truncated]

### Assistant | 2026-05-19T01:05:59.466Z

[tool_use: Bash]

### User | 2026-05-19T01:06:18.079Z

[tool_result] 7 matches in 3 files:

348:0:process.pid, ts: new Date(nowMs).toISOString() })); }
439:0:"relaunched", aliveState, skip, skipReason: reason, pid };
scripts/sfc-variability-resume-guard.mjs:6:* toward billions of compatibility-filtered combos. It has died TWICE on
scripts/sfc-variability-resume-guard.mjs:50:* and double the host load (and, pre-fix, collide chunk files). Covered
scripts/sfc-variabil
... [+259 chars truncated]

### Assistant | 2026-05-19T01:07:09.261Z

Confirmed: the lock has **no host field and no liveness check** — staleness is purely mtime-based (`nowMs - st.mtimeMs > LOCK_STALE_MS`, line 341). Now let me reason about the cross-PC scenario, since the docstring itself says (line 6) the H: drive is shared across PCs.

**Cross-PC lock analysis (P1):**

- PC-A holds the lock (mtime fresh, written every guard invocation cycle). PC-B's guard runs, sees a fresh lock (mtime < 10 min old because PC-A keeps re-touching it every 5-min cadence), and backs off (`fd == null` → "lock held", exit 0). **Correct** — PC-B does not double-launch.
- **The dangerous case**: The lock is held *during a single guard pass only* — `acquireLock` at line 486, `releaseLock` in the `finally` at line 503. A guard pass is fast (proc enum + readdir + a few small file reads ≈ seconds). The lock is NOT held for the multi-hour batch lifetime — it's released as soon as `runGuard` returns. So the lock only serializes two guards racing in the same ~few-second window. Cross-PC: PC-A's guard runs at T, releases at T+3s. PC-B's guard runs at T+1s, sees the lock, backs off — **and does nothing this cadence** (no relaunch attempt). On PC-B's *next* cadence (T+5min) PC-A's guard isn't running, lock is free, PC-B acquires it, enumerates processes — but PC-B's `Get-CimInstance` only sees **PC-B's local processes**. If the batch is alive on PC-A, PC-B's proc enum shows NO batch (PC-A's node procs are not visible cross-machine) → `classifyAliveFromLines` returns **"dead"** → PC-B **relaunches a second batch on PC-B writing into the SAME shared H: out dir**.

This is a **real P1 cross-PC double-launch**: the lock does not prevent it (it's released between passes; the batch outlives the lock), and process enumeration is inherently host-local so a batch alive on PC-A is invisible to PC-B's liveness check. Two batches then write `chunk-w<i>-<startIdx>.jsonl` into the same dir. Because both run `--workers 4 --skip <same minFrontier>` deterministically, their per-(w
... [+5634 chars truncated]

### Assistant | 2026-05-19T01:07:12.813Z

[tool_use: Bash]

### User | 2026-05-19T01:07:23.699Z

[tool_result] no-collapse-revert(Math.min over present only would be 290000): {"skip":200050,"reason":"min-worker-frontier over 4 workers"}
min-frontier: 400 (max-revert would be 1200)

### Assistant | 2026-05-19T01:08:12.328Z

Confirmed. The two P0 anti-regression tests are real and would fail under either the max-frontier or filename-derived revert. The suite has genuine teeth on the resume-math core.

I have completed an independent end-to-end review. Final verdict below.

---

## VERDICT: **PASS** (with 1 P1, 3 P2, 2 P3 — none block; the two original P0s are correctly fixed and anti-regression-pinned)

The two v1 P0s are genuinely fixed and the fixes are pinned by non-tautological anti-regression tests that I verified would fail under reversion:
- **Resume skip = min-worker-frontier from RECORD idx** (not filename, not max): `computeResumeSkip` (lines 180-194) + tests at `test.mjs:86` and `test.mjs:175` — verified independently that max-frontier (→1200) and filename-derived (→10001) both fail their assertions.
- **Empty enumeration → indeterminate, never dead**: `classifyAliveFromLines` (lines 234-245, the `lines.length === 0` guard) + `test.mjs:121,213` — fail-safe holds.

Contract exactness confirmed: `buildBatchArgv` (lines 211-222) emits flags all accepted by the batch's `parseArgs` (`batch-run.mjs:267-282`); guard passes `--workers N` with no `--workerIdx`, so `workerN` defaults to 1 → entry dispatch (`batch-run.mjs:419`) selects `runOrchestrator`, the correct fan-out path. No spawn-argv injection (fixed argv, domain pre-validated against `VALID_DOMAINS`).

### P1 — Cross-PC double-launch defeats the docstring's central fail-safe (`sfc-variability-resume-guard.mjs:338-354`, `:418`)
The lock is held only for the ~seconds of one guard pass (`acquireLock` line 486 → `releaseLock` finally line 503); it does NOT span the multi-hour batch. `acquireLock` staleness is pure mtime (line 341) — **no host field, no liveness probe** (pid is written at line 348 but never checked). On PC-B's cadence when PC-A's guard is not mid-pass, PC-B acquires the free lock, runs `defaultProcEnum` which is **host-local** (`Get-CimInstance` sees only PC-B's processes), the PC-A-resident batch is invisible → `
... [+5444 chars truncated]
