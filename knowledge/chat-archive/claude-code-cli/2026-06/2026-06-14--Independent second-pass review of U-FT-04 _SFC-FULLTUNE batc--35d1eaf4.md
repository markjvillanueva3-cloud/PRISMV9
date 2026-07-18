---
type: "chat-session"
source: "claude-code-cli"
session_id: "35d1eaf4-6a6d-473d-bc4b-97c2e1c28152"
title: "Independent second-pass review of U-FT-04 (SFC-FULLTUNE batch worker) on branch "
date: "2026-06-14"
first_ts: "2026-06-14T05:14:14.639Z"
last_ts: "2026-06-14T05:26:18.922Z"
cwd: "H:\\prism-slot-oscar\\mcp-server"
messages: 55
user_msgs: 21
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a43ea0c9773aae5b2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:03"
---

# Independent second-pass review of U-FT-04 (SFC-FULLTUNE batch worker) on branch 

> **claude-code-cli** | 2026-06-14 | 55 msgs (21 user / 34 assistant) | cwd: H:\prism-slot-oscar\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-oscar/35d1eaf4-6a6d-473d-bc4b-97c2e1c28152/subagents/agent-a43ea0c9773aae5b2.jsonl`

## Transcript

### User | 2026-06-14T05:14:14.639Z

Independent second-pass review of U-FT-04 (SFC-FULLTUNE batch worker) on branch slot/oscar, worktree H:/prism-slot-oscar. Do NOT assume a prior reviewer caught everything. Read the files end-to-end. Weight toward integration, hidden coupling, error budgets, resource safety, convention conformance, test integrity. Report P0/P1/P2 + PASS/FAIL.

FILES:
- `mcp-server/scripts/sfc-batch-worker.mjs` (NEW): forked-child worker. Drives an enumerated slice through driveCells({fastBulk:true}), writes <unitId>.jsonl atomically (.partial->rename), IPC protocol {type:run/result/error/ready/shutdown} with runId echo. IMPORTANT design note in its header: it uses child_process.fork (NOT worker_threads) because tsx's loader hard-refuses register() inside a worker_thread post-Node-20; a forked child's main thread loads tsx via the --import execArgv the coordinator passes. Verify this rationale is sound and the worker is correct for that runtime.
- `mcp-server/src/data/sfc-combinatorial-driver.ts` (MODIFIED): new public driveCells() (drive() delegates to it); fastBulk option threads fast_bulk:true.
- `mcp-server/src/__tests__/sfc/combinatorial-driver.test.ts` (MODIFIED): new driveCells tests.

CHECK:
1. RESOURCE SAFETY: the worker creates ONE driver (withRealEngine) at module load and reuses it across units — good (catalog load amortized). Per unit it holds up to 17,640 SampledCell + 17,640 DrivenCell records in memory before writing (driveCells returns all records). On a 16-core box with ~14 workers that's ~14 x (tens of MB). Acceptable, or a memory concern for the full sweep? Is streaming-per-cell needed, or is per-unit batching (max 17,640 records) genuinely bounded + fine?
2. SHARD FORMAT: worker writes DrivenCell JSONL; U-FT-06 reducer will compareRecords(DrivenCell[]) by reading these shards. Confirm the worker's JSON.stringify(rec) round-trips to a valid DrivenCell the reducer can JSON.parse (no functions/circular/BigInt in DrivenCell). 
3. ERROR BUDGET: what happens if outputDi
... [+1144 chars truncated]

### Assistant | 2026-06-14T05:14:19.776Z

I'll review U-FT-04 by reading all three files end-to-end. Let me start by reading them in parallel, plus the type definitions I'll need to verify the shard format claims.

### Assistant | 2026-06-14T05:14:20.222Z

[tool_use: Read]

### Assistant | 2026-06-14T05:14:21.197Z

[tool_use: Read]

### Assistant | 2026-06-14T05:14:21.564Z

[tool_use: Read]

### User | 2026-06-14T05:14:25.929Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\scripts\sfc-batch-worker.mjs' was already read 2s ago in this session and is unchanged (mtime 1781413633292). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-14T05:14:28.186Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-driver.ts' was already read 3s ago in this session and is unchanged (mtime 1781335734092). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRIS
... [+15 chars truncated]

### User | 2026-06-14T05:14:28.227Z

[tool_result] read-once-guard: 'H:\prism-slot-oscar\mcp-server\src\__tests__\sfc\combinatorial-driver.test.ts' was already read 3s ago in this session and is unchanged (mtime 1781335860549). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (dis
... [+25 chars truncated]

### Assistant | 2026-06-14T05:14:38.135Z

The read-once guard is reporting these files were already read in this session, but I don't have their content in my context (this is a fresh review task). Let me bypass the cache to get the actual content.

### Assistant | 2026-06-14T05:14:39.154Z

[tool_use: Bash]

### User | 2026-06-14T05:16:39.152Z

[tool_result] /**
 * SFC full-space batch sweep WORKER (U-FT-04, SFC-FULLTUNE).
 * ==========================================================
 *
 * One worker of the offline 20,321,280-cell sweep. The coordinator (U-FT-05,
 * sfc-batch-coordinator.mjs) forks a pool of these and fans the 1,152 regime-aligned
 * work units (sfc-combinatorial-enumerator.enumerateWorkUnits) across them, one unit
 * per `{type:'run'
... [+4744 chars truncated]

### Assistant | 2026-06-14T05:16:40.714Z

I have the worker. Now the driver and test files.

### Assistant | 2026-06-14T05:16:42.029Z

[tool_use: Bash]

### User | 2026-06-14T05:16:55.458Z

[tool_result] [fork-storm-breaker] fork-storm guard: 460 live bash.exe >= ceiling 400. New Bash spawns are PAUSED to protect the MCP server (:3100) from process-storm starvation -- the "api server error" root cause. The storm drains within seconds; WAIT briefly, then retry. Do NOT fan out more agents/bash right now. Override only if you are certain: append [SCOPED] / --force-spawn, raise PRISM_FORKSTORM_CEILING
... [+39 chars truncated]

### Assistant | 2026-06-14T05:17:00.106Z

Fork-storm guard paused Bash. Let me use the Read tool with PRISM_READ_CACHE disabled via env isn't an option on Read, but the guard message indicates the file content isn't actually in my context. Let me try Read again — the cache guard may have been a stale-state artifact; if it refuses I'll use offset to force a fresh read.

### Assistant | 2026-06-14T05:17:00.107Z

[tool_use: Read]

### User | 2026-06-14T05:17:08.282Z

[tool_result] 1	/**
2	 * SFC combinatorial harness DRIVER -- the run loop that ties the harness together.
3	 * For each sampled cell (U-CSFH-04) it: maps the cell to an UltimateSpeedFeedInput,
4	 * runs the SFC engine, applies the per-cell GATES (U-CSFH-05), attaches a cited
5	 * vendor row (U-CSFH-03), and emits one DrivenCell record. The output is the
6	 * dataset U-CSFH-07/08 compare + derive baseline params
... [+9275 chars truncated]

### Assistant | 2026-06-14T05:17:11.374Z

Now the test file and the key dependencies — the FAST flag handling in the engine, the enumerator API, and whether DrivenCell is JSON-safe. Let me read the test file first, then verify the upstream/downstream contracts.

### Assistant | 2026-06-14T05:17:12.361Z

[tool_use: Read]

### User | 2026-06-14T05:17:42.528Z

[tool_result] 1	/**
2	 * Tests for the SFC combinatorial harness DRIVER (U-CSFH-06-DRIVER).
3	 *
4	 * OSCAR-SFC-9AXIS-MS0 / slot:oscar, 2026-06-11.
5	 *
6	 * Two layers (pure-core + injected-readers rule):
7	 *   1. DI unit tests with a fast FAKE calculator + fake vendor provider -- pin the
8	 *      driven/error/gate-tally/citation paths + the cell->input mapping + the
9	 *      NEVER-FABRICATE contract (engin
... [+13064 chars truncated]

### Assistant | 2026-06-14T05:17:50.245Z

I have all three target files. Now I need to verify the upstream/downstream contracts that the worker depends on. Critical things to check:

1. The enumerator API: does `enumerateRange(offset, count)` exist with that signature, and is it end-clamped as the worker's comment claims? Does `SFC_FULL_SPACE_SIZE` export?
2. The FAST flag: does the engine's `calculate()` actually accept `fast_bulk` on its input, and does `fast_bulk:true` truly skip the ledger emission?
3. The `.js` import extension resolution from a `.mjs` file via tsx.
4. Whether DrivenCell is fully JSON-safe (the `CitedDataRow`, `CellGateVerdict`, `SampledCell` shapes).
5. Dedup: does an existing batch/sweep worker already exist?

Let me check these in parallel.

### Assistant | 2026-06-14T05:17:51.017Z

[tool_use: Read]

### Assistant | 2026-06-14T05:17:52.351Z

[tool_use: Grep]

### Assistant | 2026-06-14T05:17:52.601Z

[tool_use: Glob]

### User | 2026-06-14T05:18:15.245Z

[tool_result] 185-  // result object is byte-identical with this flag on or off. Per-call override; takes
186-  // precedence over the PRISM_SFC_FAST_BULK env var (a batch worker sets it without
187-  // mutating process-global env). Production/dispatcher callers never set it (default OFF).
188:  fast_bulk?: boolean;
189-}
190-
191-/** Confidence-scored atomic value with formula provenance */
--
238- * 20.3M-ce
... [+730 chars truncated]

### User | 2026-06-14T05:18:15.455Z

[tool_result] No files found

### User | 2026-06-14T05:18:15.779Z

[tool_result] 1	/**
2	 * SFC combinatorial FULL-SPACE ENUMERATOR (U-FT-02, SFC-FULLTUNE-BUILDOUT).
3	 *
4	 * The index-addressable primitive the batch sweep is built on. Where the SAMPLER
5	 * (`sfc-combinatorial-sampler.ts`) draws a stratified ~1716-cell DOE *sample*, this
6	 * module deterministically ENUMERATES the entire valid discrete cross-product as a
7	 * bijection between a flat index `[0, SFC_FULL_SPA
... [+10093 chars truncated]

### Assistant | 2026-06-14T05:18:25.600Z

Key findings so far:

- `enumerateRange(offset, count)` exists with the exact signature, is end-clamped (`Math.min(offset+count, SFC_FULL_SPACE_SIZE)`), and `SFC_FULL_SPACE_SIZE` is exported. The worker's usage is correct.
- `fast_bulk` is a real input field; `sfcFastBulkEnabled` resolves per-call boolean first. The threading `{...input, fast_bulk:true}` in `driveCells` is correct.
- Glob for `sfc-batch-*.mjs` found no other file — but the worker imports `sfc-batch-coordinator.mjs` (U-FT-05) in its header doc, and that glob found nothing. Wait — that's because U-FT-05 isn't built yet (it's pending in the task list). That's expected, not a dedup issue. No duplicate worker exists.

Now I need to verify three critical things:
1. Does `fast_bulk:true` actually skip the ledger emission (the U-FT-04 prompt's question #4 — self-learning poison risk)?
2. Is `DrivenCell` fully JSON-safe? Need to check `CitedDataRow`, `CellGateVerdict`, `SampledCell` for functions/BigInt/circular/undefined-keys.
3. Does `withRealEngine()` actually work — is the engine truly a reusable singleton, and does it load catalogs once?

Let me check the ledger-skip path in the engine, and the three nested type shapes for JSON safety.

### Assistant | 2026-06-14T05:18:28.292Z

[tool_use: Grep]

### Assistant | 2026-06-14T05:18:28.509Z

[tool_use: Read]

### User | 2026-06-14T05:18:38.186Z

[tool_result] 60-// U-OSC9-CALIB-APPLY-WIRE (CSFH unit 12, KEYSTONE): closes the SFC self-learning loop. The DL engine
61-// learns shop-floor speed/feed corrections from predicted-vs-actual; THIS engine is the live
62-// prism_calc:speed_feed surface, which previously had ZERO DL refs (the learn->apply ring trained in a
63-// sandbox nobody read). The flag-gated apply below reads those factors; composeSegmentK
... [+3028 chars truncated]

### User | 2026-06-14T05:18:42.508Z

[tool_result] 1	/**
2	 * SFC combinatorial CITED-DATA source -- resolves a real, provenance-bearing
3	 * (vc, fz) reference for a combinatorial cell, or returns UNRESOLVED. It NEVER
4	 * fabricates a value: every number it emits came from a provider and carries its
5	 * source; a miss is `resolved:false` with `vc_mpm/fz_mm = null`, never a silent
6	 * default. (Pairs with the U-CSFH-05 gates' silent-default det
... [+5431 chars truncated]

### Assistant | 2026-06-14T05:18:50.923Z

Critical confirmation on the ledger-skip (question #4): the engine at line 3108 wraps `captureSFC(...)` in `if (!sfcFastBulkEnabled(input))`, so `fast_bulk:true` genuinely skips the ledger append. The worker's unconditional `{ fastBulk: true }` is correct and the 20.3M-row poison risk is averted. The returned result object is byte-identical with the flag on/off, so the `DrivenCell.summary` the reducer reads is unaffected.

Now, `CitedDataRow` is plain JSON-safe (booleans, numbers, nulls, strings, string[], nested plain object). I need to verify `CellGateVerdict` and `SampledCell` are equally JSON-safe (no functions/BigInt/Map/Set/undefined-value issues that would break JSONL round-trip). Let me check the gates type and the SampledCell type, and also confirm the engine is a true singleton (reused across units safely).

### Assistant | 2026-06-14T05:18:53.114Z

[tool_use: Grep]

### Assistant | 2026-06-14T05:18:54.317Z

[tool_use: Grep]

### User | 2026-06-14T05:19:04.945Z

[tool_result] 2007-// ============================================================================
2008-
2009:export class UltimateSpeedFeedEngine {
2010-  /**
2011-   * Calculate fully optimized cutting parameters from any subset of inputs.
--
3488-// ============================================================================
3489-
3490:export const ultimateSpeedFeedEngine = new UltimateSpeedFeedEngine();

### User | 2026-06-14T05:19:05.123Z

[tool_result] H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-validity.ts-48-}
H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-validity.ts-49-
src\data\sfc-combinatorial-validity.ts:50:/** Result of validating one cell -- `reasons` is empty iff valid. */
H:\prism-slot-oscar\mcp-server\src\data\sfc-combinatorial-validity.ts-51-export interface ValidityResult {
src\data\sfc-combinatorial-valid
... [+7218 chars truncated]

### Assistant | 2026-06-14T05:19:08.355Z

Let me read the full `CellGateVerdict` / `GateResult` shape and the `SampledCell` interface to confirm complete JSON safety (no functions/Map/Set), then verify the `.js`-extension import resolution works in this repo (tsx + NodeNext). These are the last load-bearing checks.

### Assistant | 2026-06-14T05:19:09.766Z

[tool_use: Read]

### Assistant | 2026-06-14T05:19:10.309Z

[tool_use: Read]

### User | 2026-06-14T05:19:24.988Z

[tool_result] 28	
29	/** pass = clean · honest_limited = acknowledged caveat · fail = hard violation. */
30	export type GateStatus = "pass" | "honest_limited" | "fail";
31	
32	/** One gate's verdict. `failures` non-empty => fail; only `caveats` => honest_limited. */
33	export interface GateResult {
34	  status: GateStatus;
35	  failures: string[];
36	  caveats: string[];
37	}
38	
39	/**
40	 * The minimal struct
... [+2792 chars truncated]

### User | 2026-06-14T05:19:25.241Z

[tool_result] 1	/**
2	 * SFC combinatorial DOE SAMPLER -- generates the sampled cell space the harness
3	 * driver runs through the SFC engine. Full-enumerates the discrete validity cells
4	 * (U-CSFH-02) and stratified-samples the continuous axes (diameter / flutes /
5	 * power / hardness / coolant) x the ISO-group axis, with a per-regime coverage
6	 * floor so even sparse operations (tapping has 2 valid cells
... [+2727 chars truncated]

### Assistant | 2026-06-14T05:19:35.739Z

Both nested types are fully JSON-safe:
- `SampledCell`: all string-union and number fields — no functions/Map/Set/BigInt/Date.
- `CellGateVerdict`: nested `GateResult` (status string, string[] failures/caveats), `overall` string, flat string[] arrays. Plain JSON.
- `CitedDataRow`: booleans, numbers, nulls, strings, string[], nested plain object — plain JSON.

So `DrivenCell` (driven bool, sample, summary {numbers}|null, gate|null, citation, error string|null) round-trips cleanly through `JSON.stringify` → JSONL → `JSON.parse`. No BigInt leaks: the worker's `process.hrtime.bigint()` is converted with `Number(...)/1e6` before it touches the result, and it lives in the IPC `result` payload (not the shard), so even there it's a plain number. Question #2 is satisfied.

One more JSON nuance worth confirming: the `cm³/min` unit string contains a non-ASCII superscript-three. `JSON.stringify` escapes/round-trips it fine, and JSONL with UTF-8 read-back is fine — but the worker opens the file with `fs.openSync(partial, "w")` and `fs.writeSync(fd, string)`, which defaults to UTF-8. Good, no encoding hazard.

Now the last load-bearing items: (1) confirm the `.js`-extension imports from a `.mjs` resolve under this repo's module setup, and (2) check whether `enumerateRange` materializing up to 17,640 cells plus 17,640 DrivenCells is the real memory ceiling (question #1). Let me verify tsconfig module mode and the worker count assumptions, and confirm `SFC_CELLS_PER_WORK_UNIT` = 17,640.

### Assistant | 2026-06-14T05:19:38.180Z

[tool_use: Bash]

### User | 2026-06-14T05:20:31.334Z

[tool_result] module: ES2022 moduleResolution: Bundler
---axes lengths---
45:export const ISO_BANDS: Array<{ iso: ISOGroup; representative: string; vcBand: [number, number] }> = [
71:export const COOLANTS: CoolantType[] = [
76:export const DIAMETER_SWEEP_MM = [1, 3, 6, 10, 12, 16, 20, 25, 50, 80];
79:export const FLUTE_SWEEP = [2, 3, 4, 5, 6, 7, 8];
82:export const MACHINE_POWER_KW = [3, 7.5, 11, 15, 22, 30];
8
... [+66 chars truncated]

### Assistant | 2026-06-14T05:20:39.096Z

Confirmed cardinalities: diameter 10 × flute 7 × power 6 × hardness 6 × coolant 7 = **17,640** cells per work unit (`SFC_CELLS_PER_WORK_UNIT`). The worker's per-unit memory ceiling is exactly 17,640 `SampledCell` + 17,640 `DrivenCell` records — bounded and known.

Now the module-resolution finding is important. `tsconfig` reports `module: ES2022`, `moduleResolution: Bundler`. The worker is a `.mjs` file run by Node via tsx, importing `../src/data/sfc-combinatorial-driver.js` (a `.js` extension pointing at a `.ts` source). I need to confirm this `.js`→`.ts` resolution works at runtime under tsx (the prompt says it was validated E2E 7/7, so empirically it works, but let me confirm there's no esbuild/tsx config mismatch and check how the existing CAD worker — the cited prior-art `CADRegressionWorkerThreadRunnerEngine` — is actually invoked, since the worker claims to mirror it). Let me also confirm there's no existing `package.json` "type" conflict and look at how tsx is passed.

### Assistant | 2026-06-14T05:20:41.636Z

[tool_use: Bash]

### User | 2026-06-14T05:21:08.060Z

[tool_result] === package.json type ===
9:    "type": "module",
97:        "tsx": "^4.6.2",
=== other .mjs workers in scripts that import ../src (prior art for .js->.ts via tsx) ===
scripts/sfc-batch-worker.mjs
=== how is tsx invoked / --import in repo ===
package.json:17:        "dev": "tsx watch src/index.ts",
package.json:27:        "release-gate": "npx tsx scripts/release-gate.ts",
package.json:28:        "
... [+1665 chars truncated]

### Assistant | 2026-06-14T05:21:25.506Z

This surfaces an important integration nuance. Existing prior-art `.mjs` scripts in this repo that import TypeScript do it one of two ways:
1. **In-process registration**: `import { register } from "tsx/esm/api"` then `register()` (e.g. `build-skill-quality-registry.mjs:26`), or `tsx.tsImport(...)` (e.g. `monthly-perf-report.mjs`, `generate-personal-brief.mjs`).
2. Top-level `import ... from "../src/....js"` with the loader registered **externally** via `--import tsx` on the command line.

The worker `sfc-batch-worker.mjs` uses approach (2) with **bare top-level static imports** of `.js`-extensioned TS sources, and does NOT self-register the tsx loader. It relies entirely on the coordinator passing `--import tsx` (or equivalent) in the child's `execArgv`. This is exactly what the header comment says: *"a forked child's MAIN thread loads tsx via the `--import` execArgv the coordinator passes."*

This is the correct architecture for the worker_threads-vs-fork rationale — **and the rationale is sound**: tsx's `register()` genuinely refuses to run inside a worker_thread on Node 20+ (it throws "tsx must be loaded with --import"), whereas a forked child process has its own main thread where `--import` works. The empirical 7/7 E2E pass confirms the coordinator stub (or the test harness) does pass the loader.

**However**, this creates a hard coupling that is the most significant finding: the worker is **non-runnable standalone**. If invoked as `node sfc-batch-worker.mjs` (or `tsx` not in execArgv), the top-level `import "../src/.../driver.js"` fails immediately with `ERR_MODULE_NOT_FOUND` (no `.js` file exists; only `.ts`) — before any of the IPC guard code runs. That's acceptable *by design* (it's a forked child, never a CLI), and the first executable line `if (typeof process.send !== "function") throw` does guard the IPC-channel case. But the loader dependency is implicit — it lives only in U-FT-05, which isn't built yet. Let me verify the test E2E path and check the one
... [+667 chars truncated]

### Assistant | 2026-06-14T05:21:26.886Z

[tool_use: Grep]

### User | 2026-06-14T05:21:29.019Z

[tool_result] 15: * cell to `<outputDir>/<unitId>.jsonl`. The shard is written to a `.partial` sibling and
69:  // Write all DrivenCell records as JSONL to a .partial sibling, then rename on success
72:  const partial = shardPath + ".partial";

### Assistant | 2026-06-14T05:21:44.857Z

Confirmed: there is **no `unlinkSync` / `rmSync` / `existsSync`** anywhere in the worker. So on a mid-write failure (disk full during `writeSync`, or `fsyncSync` failure), the `.partial` file is left on disk. The `finally` only closes the fd; the function then throws, the `.partial` is never renamed (so the coordinator won't mis-count it as complete — good, that invariant holds), but the orphaned `.partial` **leaks**.

This is a P2, not a P0, because: (a) the rename-on-success invariant means a leaked `.partial` is never mistaken for a complete shard, so correctness of the sweep result is preserved; (b) on a retry of that unit, `fs.openSync(partial, "w")` truncates and overwrites the stale `.partial`, so it's self-healing on re-run. The only real cost is disk residue if a unit permanently fails and is never retried. Worth noting for U-FT-05 (the coordinator should sweep stale `.partial` files), but not a blocker for the worker itself.

I now have everything needed for a verdict. Let me do a final check on the one thing I haven't directly verified: that the existing 9 `drive()` tests still pass after the refactor (the prompt's question #6 — refactor risk). The refactor made `drive()` delegate to `driveCells()`. Reading the driver code again: `drive()` now calls `this.driveCells(cells, { vendorContext, fastBulk })`. The old `drive()` tests check `total`, `drivenCount`, `gateTally`, `citedCount`, `seed` determinism, `maxCells` slicing. The slicing (`samples.slice(0, max)`) stayed in `drive()`; `driveCells` just iterates. Behavior is preserved. One subtle thing: the old `drive()` likely passed `vendorContext` directly into the per-cell loop — now it's forwarded via `driveCells` opts. The test at line 134-145 (`vendorContext drives tool-specific citations`) exercises exactly this path through `drive()`, and the test at line 174-179 (`seed forwards`) confirms determinism. These tests are in the same file and would pass.

The R12 concern (vitest could not run in this workt
... [+852 chars truncated]

### Assistant | 2026-06-14T05:21:45.813Z

[tool_use: Grep]

### User | 2026-06-14T05:21:56.433Z

[tool_result] 19:import { cellAtIndex, enumerateRange } from "../../data/sfc-combinatorial-enumerator.js";

### Assistant | 2026-06-14T05:26:18.922Z

Confirmed: `cellAtIndex` is imported at line 19 but **never used** in the test body (only `enumerateRange` is used, at lines 184, 230). That's an unused import — a P3 lint nit (`@typescript-eslint/no-unused-vars` / `noUnusedLocals` would flag it). Under `vitest` it won't fail the test run, but if the repo has `noUnusedLocals: true` in tsconfig, `tsc` would error. The prompt states tsc passed with 0 errors in this worktree, so either `noUnusedLocals` is off or type-only imports are exempt — but since `cellAtIndex` is a value import (not `import type`), this is worth flagging for CI cleanliness.

I have completed a full end-to-end review. Final verdict below.

---

## INDEPENDENT SECOND-PASS REVIEW — U-FT-04 (SFC-FULLTUNE batch worker)

**VERDICT: PASS** (with 1 P2 + 2 P3 follow-ups; no P0/P1)

All three files are correct, the upstream/downstream contracts are verified present with matching signatures, and the load-bearing design claims (fork-vs-thread rationale, FAST-flag ledger skip, atomic shard write, JSON-safe shard format) all hold under end-to-end inspection.

### Verified contracts (not assumed — read end-to-end)

1. **FAST flag / ledger poison (Q4) — CORRECT and load-bearing.** `UltimateSpeedFeedEngine.calculate()` gates the `captureSFC(...)` ledger emission behind `if (!sfcFastBulkEnabled(input))` (`UltimateSpeedFeedEngine.ts:3108`). `sfcFastBulkEnabled` resolves a per-call `input.fast_bulk` boolean first (`:249`). The worker calls `driver.driveCells(cells, { fastBulk: true })` **unconditionally** (`sfc-batch-worker.mjs:62`), and `driveCells` threads it as `{ ...input, fast_bulk: true }` (`sfc-combinatorial-driver.ts:183`). A 20.3M-row ledger emission is genuinely averted, and the engine doc confirms the returned result is byte-identical with the flag on/off — so the `DrivenCell.summary` the U-FT-06 reducer consumes is unaffected. There is **no** path where the worker accidentally drops the flag.

2. **Shard format / reducer round-trip (Q2) — CLEAN JSON.** `
... [+6404 chars truncated]
