---
type: "chat-session"
source: "claude-code-cli"
session_id: "bce71f69-9857-47c3-9761-8a74e3366e3a"
title: "Review the new async-OCR job-execution engine for PRISM blueprint-vision (slot x"
date: "2026-06-25"
first_ts: "2026-06-25T02:06:33.032Z"
last_ts: "2026-06-25T02:08:23.114Z"
cwd: "H:\\prism\\mcp-server"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/bce71f69-9857-47c3-9761-8a74e3366e3a/subagents/agent-acdfea5fdc3fc3296.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the new async-OCR job-execution engine for PRISM blueprint-vision (slot x

> **claude-code-cli** | 2026-06-25 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/bce71f69-9857-47c3-9761-8a74e3366e3a/subagents/agent-acdfea5fdc3fc3296.jsonl`

## Transcript

### User | 2026-06-25T02:06:33.032Z

Review the new async-OCR job-execution engine for PRISM blueprint-vision (slot xray), unit U-XRAY-EXTRACTION-JOB-STORE + U-XRAY-EXTRACTION-JOB-RUNNER. Read in full:
- H:/prism/mcp-server/src/engines/blueprint-vision/extractionJobStore.ts
- H:/prism/mcp-server/src/engines/blueprint-vision/extractionJobRunner.ts
- H:/prism/mcp-server/src/__tests__/extractionJobStore.test.ts
- H:/prism/mcp-server/src/__tests__/extractionJobRunner.test.ts

WHAT IT IS: the foundation of the async VLM-OCR path of POST /api/v1/drawing/extract. The STORE is a durable per-job-file store (data/state/extraction-jobs/<jobId>.json, atomic temp+rename write, forward-only status queued->running->done|failed, schema-versioned, sanitized jobId). The RUNNER drives a job: claim (queued->running) -> ocr(source) [injected, GPU out-of-process] -> callTool('prism_cad','blueprint_extract_and_route',{fused}) -> markDone({contract,plan}) | markFailed. The runner never throws.

Verify (grade each PASS/FAIL with file:line):
1. STATE MACHINE correctness: is the forward-only transition logic (canTransition) sound? Can a job ever be resurrected from a terminal state, double-run, or lose its result on a race?
2. DURABILITY / atomicity: is the temp+rename atomic write correct? Is a torn/corrupt file handled safely (get returns null, prune skips)? Any data-loss path?
3. FILENAME SAFETY: jobId sanitization -- can a malicious jobId traverse/escape the dir (create AND get)? Is the regex sufficient?
4. RUNNER error handling: are ALL failure modes (ocr error, no-fused, contract error, thrown) correctly recorded as failed? Is the no-double-run claim guard correct? Does it surface raw internals (it should be generic)?
5. The fused->contract coupling: does {fused: ocrRes.fused} match what prism_cad blueprint_extract_and_route expects (the hasFused branch in cadDispatcher.ts -- verify)? Is cad.data unwrapped correctly?
6. TEST coverage: real reference values (not stubs)? happy + >=3 failure + adversarial? Would the tests fai
... [+141 chars truncated]

### Assistant | 2026-06-25T02:06:36.041Z

I'll review the async-OCR job-execution engine. Let me start by reading all four files in full, plus the cadDispatcher coupling point.

### Assistant | 2026-06-25T02:06:36.507Z

[tool_use: Read]

### Assistant | 2026-06-25T02:06:37.448Z

[tool_use: Read]

### User | 2026-06-25T02:06:37.476Z

[tool_result] 1	/**
2	 * extractionJobStore.ts -- durable per-job-file store for async blueprint-OCR extraction jobs
3	 * (U-XRAY-EXTRACTION-JOB-STORE). The foundation of the async VLM-OCR path of POST /api/v1/drawing/extract:
4	 * a PDF/raster upload enqueues a job here, a background runner advances it, and the poll endpoint reads it.
5	 *
6	 * Design:
7	 *  - PER-JOB FILES (`<dir>/<jobId>.json`), NOT one shar
... [+6188 chars truncated]

### Assistant | 2026-06-25T02:06:37.921Z

[tool_use: Read]

### Assistant | 2026-06-25T02:06:38.057Z

[tool_use: Read]

### User | 2026-06-25T02:06:39.302Z

[tool_result] 1	/**
2	 * extractionJobRunner.ts -- runs an enqueued async blueprint-OCR job to completion
3	 * (U-XRAY-EXTRACTION-JOB-RUNNER). Drives the lifecycle:
4	 *   queued -> running -> (OCR -> fused -> normalize-contract+route) -> done | failed
5	 *
6	 * Every side-effect is an INJECTED dependency, so the runner is fully unit-testable with mocks AND the
7	 * heavy GPU OCR stays out-of-process (the `ocr`
... [+2948 chars truncated]

### User | 2026-06-25T02:06:39.671Z

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

### User | 2026-06-25T02:06:40.096Z

[tool_result] 1	/**
2	 * extractionJobRunner.test.ts -- U-XRAY-EXTRACTION-JOB-RUNNER.
3	 * Drives the runner against a REAL ExtractionJobStore (temp dir) with a mock OCR + mock callTool, covering
4	 * the happy path, every failure mode (OCR error / no-fused / contract error / thrown), and the
5	 * no-double-run claim guard.
6	 */
7	import { describe, it, expect, beforeEach, afterEach } from "vitest";
8	import *
... [+5532 chars truncated]

### Assistant | 2026-06-25T02:06:43.523Z

Now let me verify the critical coupling point: what `prism_cad` `blueprint_extract_and_route` actually expects and returns (the `hasFused` branch and the `cad.data` unwrap shape).

### Assistant | 2026-06-25T02:06:44.007Z

[tool_use: Grep]

### Assistant | 2026-06-25T02:06:44.828Z

[tool_use: Grep]

### User | 2026-06-25T02:06:48.119Z

[tool_result] Found 9 files
src\__tests__\extractionJobRunner.test.ts
src\engines\blueprint-vision\extractionJobRunner.ts
src\routes\index.ts
src\routes\drawing.ts
src\__tests__\drawingRoute.test.ts
src\tools\dispatchers\cadDispatcher.ts
src\__tests__\cadDispatcher.blueprintExtractRoute.test.ts
data\state\ACTIONS_INDEX.json
data\state\TEST_COVERAGE_INDEX.json

### User | 2026-06-25T02:06:48.212Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts-3589-            // reachable as an app surface. Given a PRE-OBTAINED producer extraction (the VLM ensemble
H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts-3590-            // `fused` shape OR a Drawing2DExtractionEngine `drawing` result), return the versioned,
H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts-3591-    
... [+7885 chars truncated]

### Assistant | 2026-06-25T02:06:51.534Z

Now I have the exact dispatcher contract. Let me read the full `blueprint_extract_and_route` case and verify the error/success return shapes precisely, plus check `dispatcherError`'s shape.

### Assistant | 2026-06-25T02:06:52.419Z

[tool_use: Read]

### Assistant | 2026-06-25T02:06:53.038Z

[tool_use: Grep]

### User | 2026-06-25T02:06:53.476Z

[tool_result] 3648	          case "blueprint_extract_and_route": {
3649	            // U-XRAY-EXTRACT-AND-ROUTE -- one-call convenience composing blueprint_extract_contract +
3650	            // blueprint_extract_route: a producer extraction (VLM `fused` OR `drawing`) -> the versioned
3651	            // contract -> the confirm-gated fan-out plan, in a SINGLE dispatcher call (the app's
3652	            // uploa
... [+2648 chars truncated]

### User | 2026-06-25T02:06:55.423Z

[tool_result] dev\null:196198:function dispatcherError(error48, action, dispatcher) {
dev\null-196199-  const message = error48 instanceof Error ? error48.message : String(error48);
H:\prism\mcp-server\dev\null-196200-  return {
dev\null-196201-    success: false,
dev\null-196202-    error: message,
H:\prism\mcp-server\dev\null-196203-    action,
H:\prism\mcp-server\dev\null-196204-    dispatcher,
dev\null-1962
... [+2512 chars truncated]

### Assistant | 2026-06-25T02:07:00.393Z

The dispatcher contract is now fully verified. Let me confirm one detail: the runner checks `"error" in cad`. On success the dispatcher returns `{success: true, data: {...}}` — no `error` key. On error, `dispatcherError` returns `{success: false, error, action, dispatcher, details, content}` — has `error`. Let me verify the runner is actually wired into the drawing route (to confirm the `ocr` and `callTool` injection match), and check whether there's a registered store/runner consumer.

### Assistant | 2026-06-25T02:07:01.844Z

[tool_use: Grep]

### User | 2026-06-25T02:07:06.072Z

[tool_result] H:\prism\mcp-server\src\engines\blueprint-vision\extractionJobStore.ts-1-/**
src\engines\blueprint-vision\extractionJobStore.ts:2: * extractionJobStore.ts -- durable per-job-file store for async blueprint-OCR extraction jobs
src\engines\blueprint-vision\extractionJobStore.ts-3- * (U-XRAY-EXTRACTION-JOB-STORE). The foundation of the async VLM-OCR path of POST \api\v1\drawing\extract:
H:\prism\mcp-s
... [+13988 chars truncated]

### Assistant | 2026-06-25T02:07:16.562Z

The store and runner are NOT yet imported by any route or dispatcher — they are foundation units (the task prompt frames them as "the foundation of the async path"). This is consistent with `stop_on_unwired_assets` being currently bypassed fleet-wide. I'll note the wiring status but not flag it as a hard orphan since the task describes these as foundation pieces.

Now let me verify the subtle correctness points. First, the `transition` re-reads via `get()` which re-validates `rec.jobId === jobId`. Second, I want to confirm a potential silent-failure concern: in the runner, the post-OCR `failed`/`done` transitions ignore their `{ok}` result. Let me also double-check the `producer` field usage and whether `job.source` is read before the claim mutates the record (it reads from the pre-claim `job` snapshot — fine, source is immutable).

Let me check one real correctness concern in the runner: after the claim transition, `job` is the pre-claim snapshot. The OCR uses `job.source` — correct. But is there any concern that the contract-error branch `"error" in cad` could false-positive on a successful result that legitimately contains an `error` key in its data? The success shape is `{success: true, data: {...}}` — top-level has no `error` key. Verified at line 3679. Good.

Let me verify the test for the contract-error path matches the real dispatcher error shape (top-level `error`, not nested).

### Assistant | 2026-06-25T02:07:16.668Z

[tool_use: Read]

### User | 2026-06-25T02:07:17.912Z

[tool_result] 1	/**
2	 * Dispatcher Middleware Utility
3	 * Common validation and error handling for MCP dispatchers.
4	 * @module utils/dispatcherMiddleware
5	 */
6	
7	import { z } from "zod";
8	
9	export interface DispatcherErrorResult {
10	  success: false;
11	  error: string;
12	  action: string;
13	  dispatcher: string;
14	  details?: unknown;
15	  /**
16	   * MCP-protocol content payload. Always populated
... [+1287 chars truncated]

### Assistant | 2026-06-25T02:07:27.959Z

Confirmed: `dispatcherError` returns a top-level `error: string`. The runner's `"error" in cad` check (line 56) correctly catches it. The success path `{success: true, data}` has no top-level `error` key, so it won't false-positive.

Now an important subtlety: the runner calls `callTool` which in the live wiring would route through the actual dispatcher. But `blueprint_extract_and_route` can ALSO return a `dispatcherError` when validation fails (line 3670-3674) — also caught by `"error" in cad`. Good, that's covered generically.

Let me check one more correctness concern: the `details` field on `dispatcherError` includes `error.stack` — but the runner does NOT surface `cad.error` or `cad.details` onto the job; it writes the generic `"contract/route normalization failed"`. Good — no raw leak. Verified.

Let me now examine the atomic-write temp filename collision concern and the `transition` race window more carefully by re-reading those exact lines, and check whether `producer` carried in the record is ever stale-validated.

The analysis is complete. Let me do a final check on whether there's any TOCTOU data-loss path in `transition` — it does `get()` then `writeAtomic()` with no lock, but per-job-file design means only one runner should touch a job. The claim guard (`queued -> running`) is the serialization point. However, two concurrent runners could both `get()` a `queued` job, both pass `canTransition`, and both `writeAtomic` running — a double-claim race. Let me verify this is the actual concurrency model and whether it's mitigated.

### Assistant | 2026-06-25T02:07:28.708Z

[tool_use: Read]

### User | 2026-06-25T02:07:36.814Z

[tool_result] 1	/**
2	 * PRISM MCP Server -- Drawing Extraction Route (U-XRAY-DRAWING-EXTRACT-ROUTE)
3	 *
4	 * Phase-1 keystone of the blueprint-vision app-integration plan: the upload -> extract -> contract
5	 * chain. `routes/upload.ts` set `ready_for_ocr:true` and nothing consumed it; this route turns an
6	 * uploaded drawing into a structured, versioned BlueprintExtractionContract (+ the confirm-gated
7	 * 
... [+2683 chars truncated]

### Assistant | 2026-06-25T02:08:23.114Z

This confirms the architecture: the async PDF/raster path currently returns "202 queued" and notes "A future async job+poll route exposes it" (line 16-17). So the store+runner are the foundation pieces for that future route, not yet wired — consistent with the task framing. The single-runner-per-job model is the intended deployment (one background dispatcher pulls a job), so the double-claim race is a theoretical edge but worth noting since the store advertises itself as race-safe.

I have everything I need. Let me compile the verdict.

---

VERDICT: PASS

summary: The store and runner are clean, well-conventioned foundation units. The forward-only state machine is sound, the atomic temp+rename write is correct, the jobId regex fully prevents traversal, the runner records all four failure modes and never throws, and the `{fused}` -> `blueprint_extract_and_route` coupling matches the verified dispatcher contract (`hasFused` branch at cadDispatcher.ts:3653, `{success,data}` success shape at :3679, top-level `error` on `dispatcherError` at dispatcherMiddleware.ts:40). Tests use real reference values and would fail if the logic broke. Findings are all P2 (hardening/doc), none blocking.

findings:
- [P2] `extractionJobStore.ts:120-132` (`transition`) -- The read-modify-write (`get()` then `writeAtomic()`) is not atomic across processes. The class doc (lines 7-8) claims per-job files mean "concurrent jobs never race," which is true *across different jobs* but NOT for two runners racing the *same* job: both could `get()` a `queued` record, both pass `canTransition(queued, running)`, and both `writeAtomic`, double-claiming -> duplicate GPU OCR. The runner's claim guard (extractionJobRunner.ts:42-43) is the intended serialization point but only serializes when transitions are themselves serialized. In the documented deployment (single background dispatcher pulling jobs) this never fires, so it is not a live bug -- but the "never race / no duplicate OCR" guarantee is stronger
... [+5687 chars truncated]
