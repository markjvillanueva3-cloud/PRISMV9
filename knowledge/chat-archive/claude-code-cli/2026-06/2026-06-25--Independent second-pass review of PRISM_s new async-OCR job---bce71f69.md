---
type: "chat-session"
source: "claude-code-cli"
session_id: "bce71f69-9857-47c3-9761-8a74e3366e3a"
title: "Independent second-pass review of PRISM's new async-OCR job-execution engine (sl"
date: "2026-06-25"
first_ts: "2026-06-25T02:06:46.468Z"
last_ts: "2026-06-25T02:10:17.409Z"
cwd: "H:\\prism\\mcp-server"
messages: 80
user_msgs: 32
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism/bce71f69-9857-47c3-9761-8a74e3366e3a/subagents/agent-adef99c71433c80e2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass review of PRISM's new async-OCR job-execution engine (sl

> **claude-code-cli** | 2026-06-25 | 80 msgs (32 user / 48 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/bce71f69-9857-47c3-9761-8a74e3366e3a/subagents/agent-adef99c71433c80e2.jsonl`

## Transcript

### User | 2026-06-25T02:06:46.468Z

Independent second-pass review of PRISM's new async-OCR job-execution engine (slot xray). Do NOT assume the other reviewer caught everything. Read in full:
- H:/prism/mcp-server/src/engines/blueprint-vision/extractionJobStore.ts
- H:/prism/mcp-server/src/engines/blueprint-vision/extractionJobRunner.ts
- H:/prism/mcp-server/src/__tests__/extractionJobStore.test.ts
- H:/prism/mcp-server/src/__tests__/extractionJobRunner.test.ts

The STORE persists per-job files (atomic temp+rename), forward-only status. The RUNNER: claim queued->running, ocr(source) [injected], callTool('prism_cad','blueprint_extract_and_route',{fused}), markDone({contract,plan})|markFailed; never throws.

Weighted toward silent breakage / concurrency / integration the other arm may miss:
1. CONCURRENCY: two runners dispatched for the same jobId -- does the queued->running claim guard actually prevent a double-OCR (the store.transition reads-then-writes; is there a TOCTOU window where both claim running)? Is the per-job-file design genuinely race-safe vs a shared-blob, and what is the residual race?
2. ATOMIC WRITE: the temp filename uses updatedAt-derived suffix -- can two writes to the same job (running then done) collide on the temp name, or a concurrent prune unlink mid-rename? Cross-filesystem rename (tmp vs data dir) -- is rename atomic if dir spans filesystems?
3. INTEGRATION: confirm against the LIVE cadDispatcher.ts blueprint_extract_and_route case that {fused} is accepted and the return is {success,data:{contract,plan,...}} so `cad.data` is the right unwrap. Confirm normalizeFusedToContract (BlueprintExtractionContract.ts) actually consumes the `fused` shape the runner forwards (the OCR ensemble's fuseEnsemble output) -- any field-shape mismatch that would silently produce an empty contract?
4. RESULT INTEGRITY: the job stores the WHOLE cad.data as `result: unknown`. If callTool returns a content-wrapped shape (per index.ts callTool unwrap), is `data` still present? Could `result` ever be th
... [+318 chars truncated]

### Assistant | 2026-06-25T02:06:49.809Z

I'll review this async-OCR job-execution engine. Let me start by reading all four files in full, then trace the integration points against the live dispatcher.

### Assistant | 2026-06-25T02:06:50.697Z

[tool_use: Read]

### User | 2026-06-25T02:06:51.168Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\blueprint-vision\extractionJobStore.ts' was already read 14s ago in this session and is unchanged (mtime 1782352932053). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### Assistant | 2026-06-25T02:06:51.389Z

[tool_use: Read]

### Assistant | 2026-06-25T02:06:51.607Z

[tool_use: Read]

### User | 2026-06-25T02:06:51.912Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\blueprint-vision\extractionJobRunner.ts' was already read 14s ago in this session and is unchanged (mtime 1782353092294). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-06-25T02:06:51.920Z

[tool_use: Read]

### User | 2026-06-25T02:06:52.122Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\extractionJobStore.test.ts' was already read 14s ago in this session and is unchanged (mtime 1782352981116). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-06-25T02:06:52.413Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\extractionJobRunner.test.ts' was already read 13s ago in this session and is unchanged (mtime 1782353128531). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_REA
... [+10 chars truncated]

### Assistant | 2026-06-25T02:06:55.246Z

The read-once-guard claims these files are in my context, but they are not — that guard is mistaken about a fresh agent session. Let me disable the cache and read them.

### Assistant | 2026-06-25T02:06:56.181Z

[tool_use: Bash]

### Assistant | 2026-06-25T02:06:56.911Z

[tool_use: Read]

### User | 2026-06-25T02:07:00.918Z

[tool_result] PRISM_READ_CACHE is now disabled for this session

### User | 2026-06-25T02:07:02.099Z

[tool_result] 1	/**
2	 * extractionJobStore.ts -- durable per-job-file store for async blueprint-OCR extraction jobs
3	 * (U-XRAY-EXTRACTION-JOB-STORE). The foundation of the async VLM-OCR path of POST /api/v1/drawing/extract:
4	 * a PDF/raster upload enqueues a job here, a background runner advances it, and the poll endpoint reads it.
5	 *
6	 * Design:
7	 *  - PER-JOB FILES (`<dir>/<jobId>.json`), NOT one shar
... [+6188 chars truncated]

### Assistant | 2026-06-25T02:07:07.828Z

Good, the store file is now in context. Let me read the runner and both test files.

### Assistant | 2026-06-25T02:07:08.397Z

[tool_use: Read]

### User | 2026-06-25T02:07:09.737Z

[tool_result] 1	/**
2	 * extractionJobRunner.ts -- runs an enqueued async blueprint-OCR job to completion
3	 * (U-XRAY-EXTRACTION-JOB-RUNNER). Drives the lifecycle:
4	 *   queued -> running -> (OCR -> fused -> normalize-contract+route) -> done | failed
5	 *
6	 * Every side-effect is an INJECTED dependency, so the runner is fully unit-testable with mocks AND the
7	 * heavy GPU OCR stays out-of-process (the `ocr`
... [+2948 chars truncated]

### Assistant | 2026-06-25T02:07:13.368Z

[tool_use: Read]

### Assistant | 2026-06-25T02:07:13.898Z

[tool_use: Read]

### User | 2026-06-25T02:07:16.500Z

[tool_result] 1	/**
2	 * extractionJobRunner.test.ts -- U-XRAY-EXTRACTION-JOB-RUNNER.
3	 * Drives the runner against a REAL ExtractionJobStore (temp dir) with a mock OCR + mock callTool, covering
4	 * the happy path, every failure mode (OCR error / no-fused / contract error / thrown), and the
5	 * no-double-run claim guard.
6	 */
7	import { describe, it, expect, beforeEach, afterEach } from "vitest";
8	import *
... [+5532 chars truncated]

### User | 2026-06-25T02:07:16.740Z

[tool_result] 1	/**
2	 * extractionJobStore.test.ts -- U-XRAY-EXTRACTION-JOB-STORE.
3	 * Real lifecycle + durability + forward-only-transition + adversarial-jobId coverage on a temp dir.
4	 */
5	import { describe, it, expect, beforeEach, afterEach } from "vitest";
6	import * as fs from "fs";
7	import * as os from "os";
8	import * as path from "path";
9	import {
10	  ExtractionJobStore,
11	  canTransition,
12	  
... [+7009 chars truncated]

### Assistant | 2026-06-25T02:07:21.487Z

Now I have all four files. Let me verify the integration points against the live dispatcher and the contract normalizer. These are the load-bearing claims I need to check before asserting.

### Assistant | 2026-06-25T02:07:22.915Z

[tool_use: Grep]

### Assistant | 2026-06-25T02:07:23.357Z

[tool_use: Glob]

### Assistant | 2026-06-25T02:07:23.369Z

[tool_use: Glob]

### User | 2026-06-25T02:07:28.326Z

[tool_result] Found 7 files
src\__tests__\extractionJobRunner.test.ts
src\engines\blueprint-vision\extractionJobRunner.ts
src\routes\index.ts
src\routes\drawing.ts
src\__tests__\drawingRoute.test.ts
src\tools\dispatchers\cadDispatcher.ts
src\__tests__\cadDispatcher.blueprintExtractRoute.test.ts

### User | 2026-06-25T02:07:30.183Z

[tool_result] src\schemas\BlueprintExtractionContract.ts

### User | 2026-06-25T02:07:30.325Z

[tool_result] src\tools\dispatchers\cadDispatcher.ts

### Assistant | 2026-06-25T02:07:33.718Z

Let me read the live dispatcher case and the contract normalizer to verify the integration claims.

### Assistant | 2026-06-25T02:07:34.777Z

[tool_use: Grep]

### User | 2026-06-25T02:07:38.026Z

[tool_result] 280-  // U-XRAY-EXTRACT-CONTRACT-WIRE -- normalize a producer extraction -> versioned BlueprintExtractionContract
281-  "blueprint_extract_contract",
282-  // U-XRAY-EXTRACT-CONSUMER-ROUTER -- route a validated contract -> the prism features that can consume it
283-  "blueprint_extract_route",
284-  // U-XRAY-EXTRACT-AND-ROUTE -- one-call convenience: producer extraction -> contract -> fan-out pla
... [+2785 chars truncated]

### Assistant | 2026-06-25T02:07:41.562Z

Now let me read the full dispatcher case body and the `dispatcherError` shape, plus the `normalizeFusedToContract` function. These are critical for findings 3 and 4.

### Assistant | 2026-06-25T02:07:43.006Z

[tool_use: Read]

### Assistant | 2026-06-25T02:07:43.963Z

[tool_use: Grep]

### User | 2026-06-25T02:07:46.337Z

[tool_result] 3648	          case "blueprint_extract_and_route": {
3649	            // U-XRAY-EXTRACT-AND-ROUTE -- one-call convenience composing blueprint_extract_contract +
3650	            // blueprint_extract_route: a producer extraction (VLM `fused` OR `drawing`) -> the versioned
3651	            // contract -> the confirm-gated fan-out plan, in a SINGLE dispatcher call (the app's
3652	            // uploa
... [+3614 chars truncated]

### User | 2026-06-25T02:07:47.201Z

[tool_result] No matches found

### Assistant | 2026-06-25T02:07:51.121Z

The dispatcher case confirms the success return is `{ success: true, data: { contract, plan, producer, valid } }`. Now I need the `dispatcherError` shape (the error envelope) — it's imported, not defined here. And I need `normalizeFusedToContract`. Let me find both.

### Assistant | 2026-06-25T02:07:53.001Z

[tool_use: Grep]

### Assistant | 2026-06-25T02:07:53.988Z

[tool_use: Grep]

### User | 2026-06-25T02:07:54.894Z

[tool_result] 17:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
662:          return dispatcherError(
2803:              return dispatcherError(
2811:              return dispatcherError(
2842:              return dispatcherError(

[Showing results with pagination = limit: 5]

### User | 2026-06-25T02:08:02.568Z

[tool_result] 228:export function normalizeFusedToContract(fused: unknown, opts: NormalizeOpts = {}): BlueprintExtractionContract {
229-  const floor = Number.isFinite(opts.confirmFloor as number) ? (opts.confirmFloor as number) : OCR_PER_FIELD_CONFIRM_FLOOR;
230-  const f = (fused && typeof fused === "object" ? fused : {}) as Record<string, any>;
231-
232-  const dimensions: ContractDimension[] = (Array.isArra
... [+2379 chars truncated]

### Assistant | 2026-06-25T02:08:07.548Z

The normalizer confirms it consumes `f.dimensions[].value_mm`, `f.gdt`, `f.notes`, `f.profiles`, `f.surface_finishes`, `f.title_block`, `f.summary.n_models`. The test's mock `fused` uses `{ dimensions: [{ value_mm: 25.4 }], summary: { n_models: 2 } }` — matching shape. Now let me verify the `dispatcherError` envelope shape (finding 4: could `result` ever be a raw error envelope) and check the actual OCR ensemble `fuseEnsemble` output field names against the normalizer's expectations.

### Assistant | 2026-06-25T02:08:09.440Z

[tool_use: Grep]

### Assistant | 2026-06-25T02:08:09.907Z

[tool_use: Glob]

### Assistant | 2026-06-25T02:08:09.963Z

[tool_use: Glob]

### User | 2026-06-25T02:08:12.321Z

[tool_result] 32:export function dispatcherError(
33-  error: unknown,
34-  action: string,
35-  dispatcher: string,
36-): DispatcherErrorResult {
37-  const message = error instanceof Error ? error.message : String(error);
38-  const body = {
39-    success: false as const,
40-    error: message,
41-    action,
42-    dispatcher,
43-    details: error instanceof Error ? { stack: error.stack } : undefined,
44- 
... [+409 chars truncated]

### User | 2026-06-25T02:08:12.603Z

[tool_result] No files found

### User | 2026-06-25T02:08:13.328Z

[tool_result] No files found

### Assistant | 2026-06-25T02:08:19.389Z

Critical finding emerging on the error envelope. `dispatcherError` returns `{ success: false, error, action, dispatcher, details, content }` — there is **no `data` key**, but there IS an `error` key. Let me trace finding 4 precisely. The runner at line 56 checks `"error" in cad`, and the `dispatcherError` envelope has `error`. So a dispatcher error IS caught. But the runner is called via `callTool`, not the dispatcher directly — I must check how `callTool` unwraps the dispatcher result (the `content`-wrapped shape). Let me find the actual `fuseEnsemble` output and the `callTool` implementation.

### Assistant | 2026-06-25T02:08:21.285Z

[tool_use: Bash]

### Assistant | 2026-06-25T02:08:22.516Z

[tool_use: Grep]

### User | 2026-06-25T02:08:24.207Z

[tool_result] 16- *   - PDF / raster image   -> 202 queued: VLM-ensemble OCR is an async GPU job (10-60s); it is NOT
17- *     run synchronously here (R12 -- never fake a sync OCR). A future async job+poll route exposes it.
18- *
19- * Pattern mirrors routes/document.ts; the orchestration is a pure exported function so it is unit-
20: * testable with a mock callTool (no express harness).
21- *
22- * @module rou
... [+3074 chars truncated]

### User | 2026-06-25T02:08:27.531Z

[tool_result] ---grep fuseEnsemble def---

### Assistant | 2026-06-25T02:08:32.930Z

This is important: `routes/drawing.ts` (the sibling sync route) is the source-of-truth pattern. The runner mirrors its unwrap exactly: line 138 `cad.data` if `"data" in cad`, else `cad`; and the error check `"error" in cad`. The runner is consistent with the live sibling. 

Now the critical question for finding 4: does `callTool` (the one the *runner* will be injected with in production) return the dispatcher result with `data`/`error` keys at top level, or does it return the `content`-wrapped MCP shape (where `error` would NOT be a top-level key)? Let me find the production `callTool` and how the runner is wired into the route.

### Assistant | 2026-06-25T02:08:34.346Z

[tool_use: Grep]

### User | 2026-06-25T02:08:35.607Z

[tool_result] Found 4 files
src\__tests__\extractionJobRunner.test.ts
src\engines\blueprint-vision\extractionJobRunner.ts
src\__tests__\extractionJobStore.test.ts
src\engines\blueprint-vision\extractionJobStore.ts

### Assistant | 2026-06-25T02:08:36.078Z

[tool_use: Grep]

### User | 2026-06-25T02:08:39.770Z

[tool_result] src\__tests__\agentRouter.test.ts:85:      const callTool = fakeCallTool({
src\__tests__\agentRouter.test.ts:107:      const callTool = fakeCallTool({});
src\__tests__\agentRouter.test.ts:146:      const callTool = fakeCallTool({
src\__tests__\agentRouter.test.ts:169:      const callTool = fakeCallTool({});
src\__tests__\agentRouter.test.ts:209:      const callTool = fakeCallTool({});
src\__tests_
... [+1539 chars truncated]

### Assistant | 2026-06-25T02:08:45.179Z

Significant finding: **the runner and store are NOT wired into any production code path.** Only the two source files and their two tests reference `runExtractionJob`/`ExtractionJobStore`. There is no route, no index.ts registration, no job-dispatch wiring. This is an orphan per R15 (the module header claims "a background runner advances it" and "POST /api/v1/drawing/extract... enqueues a job here" but no enqueue/dispatch site exists). Let me confirm the production `callTool` definition and verify `drawing.ts` does NOT yet enqueue jobs (the route header said async is a "future" route).

### Assistant | 2026-06-25T02:08:47.566Z

[tool_use: Grep]

### Assistant | 2026-06-25T02:08:48.516Z

[tool_use: Grep]

### User | 2026-06-25T02:08:48.771Z

[tool_result] 117-import { log } from "../utils/Logger.js";
118-
119-/** Tool call function signature — injected from index.ts */
120:export type CallToolFn = (toolName: string, action: string, params?: Record<string, any>) => Promise<any>;
121-
122-/**
123- * Register all API routes on the Express app
124- */
125:export function registerRoutes(app: Express, callTool: CallToolFn): void {
126-  // Health check e
... [+125 chars truncated]

### User | 2026-06-25T02:08:49.532Z

[tool_result] 16: *   - PDF / raster image   -> 202 queued: VLM-ensemble OCR is an async GPU job (10-60s); it is NOT
17: *     run synchronously here (R12 -- never fake a sync OCR). A future async job+poll route exposes it.
23: * @since   U-XRAY-DRAWING-EXTRACT-ROUTE (2026-06-24, slot xray)
30:/** Extensions whose extraction is an async VLM-OCR job, NOT run synchronously on this request. */
69:export async func
... [+436 chars truncated]

### Assistant | 2026-06-25T02:08:53.721Z

Now I have the full picture for the integration trace. Let me read the production `callTool` body (in index.ts) to settle finding 4 definitively — whether a real `callTool` returns the top-level `{success,data}`/`{success,error}` shape (so the runner's `"error" in cad` and `cad.data` unwraps work) or a `content`-only MCP wrap.

### Assistant | 2026-06-25T02:08:55.516Z

[tool_use: Grep]

### User | 2026-06-25T02:08:56.491Z

[tool_result] 887:    const text = result?.content?.[0]?.text;
888:    return text ? JSON.parse(text) : result;
1286:          const p = JSON.parse(Buffer.concat(_chunks).toString("utf8"));
1389:  async function callTool(toolName: string, action: string, params: Record<string, any> = {}) {
1398:      const text = result?.content?.[0]?.text;
1399:      return text ? JSON.parse(text) : result;
1401:      // callT
... [+167 chars truncated]

### Assistant | 2026-06-25T02:08:59.306Z

Let me read the production `callTool` body in full to confirm the unwrap and error handling.

### Assistant | 2026-06-25T02:09:00.125Z

[tool_use: Read]

### User | 2026-06-25T02:09:01.242Z

[tool_result] 1389	  async function callTool(toolName: string, action: string, params: Record<string, any> = {}) {
1390	    // _registeredTools is a plain Record<string, RegisteredTool>, not a Map
1391	    const registeredTools = (server as any)._registeredTools ?? {};
1392	    const tool = registeredTools[toolName];
1393	    if (!tool) return { error: `Tool ${toolName} not found` };
1394	    try {
1395	      /
... [+1108 chars truncated]

### Assistant | 2026-06-25T02:09:09.339Z

Now finding 4 is fully traced. The production `callTool`:
1. On success: unwraps `result.content[0].text` via `JSON.parse` → returns the dispatcher body `{ success: true, data: { contract, plan, ... } }`. So `cad.data` unwrap is correct.
2. On dispatcher error: `dispatcherError` returns `{ success:false, error, ..., content:[{text: JSON.stringify(body)}] }` → `callTool` parses content.text → `{ success:false, error, action, dispatcher, details }` → has top-level `error` → runner's `"error" in cad` catches it. Correct.
3. On tool-not-found or thrown: returns `{ error: ... }` → has `error` → caught. Correct.

So finding 4 holds up: the runner's unwrap matches both the success and error envelope shapes of the real `callTool`. Now let me nail the concurrency TOCTOU (finding 1) and the temp-name collision (finding 2) precisely, and check `firstNum`/`f.summary?.n_models` edge in the contract. Let me also verify whether `value_mm` undefined produces an empty contract silently (finding 3 adversarial). Let me look at `finalizeContract` and `validateBlueprintExtractionContract` to see if an empty-dimensions fused silently yields a "valid" empty contract.

### Assistant | 2026-06-25T02:09:10.859Z

[tool_use: Grep]

### User | 2026-06-25T02:09:12.042Z

[tool_result] 187:function finalizeContract(
188-  dimensions: ContractDimension[],
189-  gdt: ContractCallout[],
190-  notes: ContractCallout[],
--
196:  const nNeedsConfirm = dimensions.filter((d) => d.needs_confirm).length + allCallouts.filter((c) => c.needs_confirm).length;
197-
198-  const contract: BlueprintExtractionContract = {
199-    schemaVersion: BLUEPRINT_EXTRACTION_CONTRACT_VERSION,
--
208:      n
... [+599 chars truncated]

### Assistant | 2026-06-25T02:09:15.497Z

Let me check whether the schema requires at least one dimension (i.e., whether an empty/malformed `fused` produces a *valid* but empty contract — which the runner would happily mark `done`, a silent data-loss path). Let me look at the zod schema definition for dimensions.

### Assistant | 2026-06-25T02:09:17.046Z

[tool_use: Grep]

### User | 2026-06-25T02:09:18.000Z

[tool_result] 83:    n_dimensions: z.number().int().nonnegative(),
84-    n_needs_confirm: z.number().int().nonnegative().describe("total fields (dims + callouts) below the confirm floor"),
85-    n_corroborated: z.number().int().nonnegative().describe("dims with status=corroborated (>=quorum models)"),
--
94:export const blueprintExtractionContractSchema = z
95-  .object({
96-    schemaVersion: z.literal(BLUEP
... [+1246 chars truncated]

### Assistant | 2026-06-25T02:09:28.711Z

Confirmed: `dimensions: z.array(...).default([])` — **the schema accepts an empty dimensions array as valid.** So if the OCR `fused` has a non-null but malformed/empty `dimensions` (or all `value_mm` are non-finite and get filtered out), `normalizeFusedToContract` produces a *valid* empty contract, `validateBlueprintExtractionContract` returns `ok:true`, and the runner marks the job `done` with an empty result. This is a real silent-success path — but I need to weigh it: the runner's gate at line 47 only checks `ocrRes.fused == null`, so a `fused: { dimensions: [] }` (truthy object, zero dims) passes the gate and yields an empty-but-"done" job. This matches the runner's own test at line 121 (`fused: { dimensions: [] }` → status `done`). That is arguably acceptable (an empty extraction is a legitimate terminal state, surfaced via `summary.n_dimensions: 0`), but the job's `done` status conveys success to the poll endpoint with no signal that zero dimensions were extracted. I'll note it as P2 since the contract summary carries `n_dimensions`.

Now let me settle the concurrency and atomic-write findings with a final check on whether `os.tmpdir()` vs the data dir cross-filesystem rename matters, and the temp-name collision window. Let me verify the test for double-run actually proves no-double-OCR through the real claim path (finding 6).

I have enough to analyze all the test integrity points from the files already in context. Let me do one final verification: confirm there's no separate enqueue/poll route or wiring file that I missed (the orphan claim), checking routes/index.ts registration and any drawing async job route.

### Assistant | 2026-06-25T02:09:31.195Z

[tool_use: Grep]

### User | 2026-06-25T02:09:32.263Z

[tool_result] 66:import { createDrawingRouter } from "./drawing.js";
202:  // U-XRAY-DRAWING-EXTRACT-ROUTE (slot:xray 2026-06-24): Phase-1 upload->extract->contract chain.
203:  // POST /api/v1/drawing/extract -- DXF/content synchronous (producer -> blueprint_extract_and_route),
205:  app.use("/api/v1/drawing", createDrawingRouter(callTool));
207:  // (POST /api/v1/upload, GET /types) -- the front of the upload
... [+195 chars truncated]

### Assistant | 2026-06-25T02:10:17.409Z

Confirmed. The only drawing route registered is `createDrawingRouter` (the synchronous DXF chain, which on a PDF/raster returns `202 queued_for_async_ocr` with NO actual enqueue into the job store). The `ExtractionJobStore` and `runExtractionJob` are not imported by any route, index, or job-dispatch site. The async path is documented as "a future async job+poll route" — so the runner/store are the foundation, intentionally landed ahead of their wiring (a logical-order build per R13). This is a real but expected-by-design orphan; I'll flag it as P2 (R15 wiring debt) since it is the substrate, not the consumer, and the runner+store are pure/tested.

I have completed the full trace. Let me compile the verdict.

## Review Complete

I traced all four files plus the live integration chain: `cadDispatcher.ts:3648` (the `blueprint_extract_and_route` case), `dispatcherMiddleware.ts:32` (`dispatcherError` envelope), `index.ts:1389` (production `callTool` unwrap), `BlueprintExtractionContract.ts:228` (`normalizeFusedToContract`), `routes/drawing.ts:69` (the sibling sync route the runner mirrors), and `routes/index.ts:205` (route registration).

---

VERDICT: PASS

summary: The store's per-job-file design is genuinely race-safe for the *intended* single-runner-per-job model, the runner's claim-guard correctly prevents a double-OCR in-process, and the dispatcher-result unwrap (`cad.data` / `"error" in cad`) is verified correct against BOTH the success envelope (`{success,data}`) and every error envelope the real `callTool` can return (`dispatcherError` -> top-level `error`; thrown -> `{error}`; not-found -> `{error}`). The integration contract holds: `normalizeFusedToContract` consumes exactly the `fused` shape the runner forwards. The residual issues are a multi-process TOCTOU window inherent to the read-then-write `transition` (not exploitable by the current in-process dispatch model) and a silent empty-contract "done" path — both P2, plus the expected-by-design wiring debt.


... [+5931 chars truncated]
