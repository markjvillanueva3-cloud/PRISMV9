---
type: "chat-session"
source: "claude-code-cli"
session_id: "621b40e6-642b-48d2-bd0d-2c75bf77af44"
title: "Independent regression/silent-breakage review of a dispatcher↔engine API-drift f"
date: "2026-06-24"
first_ts: "2026-06-24T14:56:32.497Z"
last_ts: "2026-06-24T15:00:29.402Z"
cwd: "H:\\prism\\mcp-server"
messages: 57
user_msgs: 22
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a7e7fb308cf6593ba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Independent regression/silent-breakage review of a dispatcher↔engine API-drift f

> **claude-code-cli** | 2026-06-24 | 57 msgs (22 user / 35 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-a7e7fb308cf6593ba.jsonl`

## Transcript

### User | 2026-06-24T14:56:32.497Z

Independent regression/silent-breakage review of a dispatcher↔engine API-drift fix in the PRISM repo (H:/prism). Read each file END TO END and grade PASS or FAIL with file:line citations. Do NOT assume the author got it right.

CONTEXT: `resourceExtractionDispatcher.ts` had 8 actions calling engine methods that were renamed/removed during refactors (R12 silent breakage — they threw "is not a function" or returned wrong-shaped objects in production; weak tests passed on the dispatcher's `{action, error}` catch object). The fix routes each action to the engine's REAL current API + adds 3 additive engine methods + strengthens tests.

FILES TO REVIEW:
1. H:/prism/mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts — cases: ocr_process, ocr_stats, drawing_extract, drawing_summary, office_process, office_search, log_alarms (all changed). The final return is `slimResponse({ action, ...result })`.
2. H:/prism/mcp-server/src/engines/ImageOCRPipelineEngine.ts — methods processImage(imagePath, simulatedText:string, simulatedConfidence:number), getQueueStats(), registerImage(path, metadata).
3. H:/prism/mcp-server/src/engines/Drawing2DExtractionEngine.ts — extractDrawing(path, {entities,dimensions,annotations,layers}), getResult(path).
4. H:/prism/mcp-server/src/engines/OfficeDocumentPipelineEngine.ts — extractDocument(path,{sections,tables,metadata}), NEW findByPartNumber + searchByKeyword.
5. H:/prism/mcp-server/src/engines/MachineLogHarvesterEngine.ts — harvestFile(path, content:string), NEW getAllAlarms.
6. H:/prism/mcp-server/src/__tests__/resourceExtractionDispatcher.test.ts — strengthened assertions.

VERIFY SPECIFICALLY:
- Every dispatcher engine-method call now matches a method that ACTUALLY EXISTS on that engine with the right arg shape (e.g. processImage is positional not options-object; getResult/getQueueStats/getAllAlarms/findByPartNumber/searchByKeyword exist).
- The return-shape assumptions hold: slimResponse strips null/undefined + EMPTY ARRAYS and 
... [+803 chars truncated]

### Assistant | 2026-06-24T14:56:35.554Z

I'll review this dispatcher↔engine API-drift fix systematically. Let me start by reading all the files end to end.

### Assistant | 2026-06-24T14:56:36.068Z

[tool_use: Read]

### Assistant | 2026-06-24T14:56:36.967Z

[tool_use: Read]

### Assistant | 2026-06-24T14:56:37.011Z

[tool_use: Read]

### User | 2026-06-24T14:56:37.049Z

[tool_result] 1	/**
2	 * prism_resource_extraction — Content Extraction Pipeline Dispatcher
3	 * AI-AWARE-HARDEN: Wires 7 extraction engines for comprehensive content processing
4	 *
5	 * 14 actions:
6	 *   archive_discover   — Discover archives in a directory
7	 *   archive_analyze    — Analyze archive contents without extracting
8	 *   classify_dark      — Classify hard-to-extract content
9	 *   dark_report  
... [+18600 chars truncated]

### User | 2026-06-24T14:56:38.033Z

[tool_result] 1	/**
2	 * ImageOCRPipelineEngine — OCR Text Extraction from Images
3	 * U-AWR27: Image OCR Pipeline (550 images)
4	 */
5	
6	import { log } from '../utils/Logger.js';
7	
8	export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'tiff' | 'tif' | 'bmp' | 'gif' | 'webp';
9	export type OCRQuality = 'high' | 'medium' | 'low' | 'failed';
10	
11	export interface ImageMetadata {
12	  path: string;
13	  name: s
... [+6485 chars truncated]

### User | 2026-06-24T14:56:38.092Z

[tool_result] 1	/**
2	 * Drawing2DExtractionEngine — DXF/DWG 2D Drawing Parser
3	 * U-AWR28: 2D Drawing Extraction (124 DXF/DWG files)
4	 */
5	
6	import { log } from '../utils/Logger.js';
7	
8	export type DrawingFormat = 'dxf' | 'dwg';
9	export type EntityType = 'line' | 'arc' | 'circle' | 'polyline' | 'dimension' | 'text' | 'block';
10	
11	export interface Point2D { x: number; y: number; }
12	
13	export interf
... [+6279 chars truncated]

### Assistant | 2026-06-24T14:56:41.970Z

I have the dispatcher, ImageOCRPipelineEngine, and Drawing2DExtractionEngine. Now let me read the remaining files: OfficeDocumentPipelineEngine, MachineLogHarvesterEngine, the slimResponse utility, and the test file.

### Assistant | 2026-06-24T14:56:42.526Z

[tool_use: Read]

### Assistant | 2026-06-24T14:56:42.919Z

[tool_use: Read]

### User | 2026-06-24T14:56:43.489Z

[tool_result] 1	/**
2	 * OfficeDocumentPipelineEngine — Office Document Parser
3	 * U-AWR29: Office Document Pipeline (17 docx/pptx files)
4	 */
5	
6	import { log } from '../utils/Logger.js';
7	
8	export type OfficeFormat = 'docx' | 'xlsx' | 'pptx' | 'doc' | 'xls' | 'ppt';
9	
10	export interface TableData {
11	  headers: string[];
12	  rows: string[][];
13	  sheetName?: string;
14	}
15	
16	export interface Docu
... [+7249 chars truncated]

### Assistant | 2026-06-24T14:56:43.523Z

[tool_use: Read]

### Assistant | 2026-06-24T14:56:43.825Z

[tool_use: Read]

### User | 2026-06-24T14:56:43.903Z

[tool_result] 1	/**
2	 * MachineLogHarvesterEngine � Machine Log & Config Parser
3	 * U-AWR30: Machine Log Harvester (3,350 text/log/ini files)
4	 */
5	
6	import { log } from "../utils/Logger.js";
7	
8	export type LogFileType = "log" | "txt" | "ini" | "cfg" | "conf" | "csv" | "dat";
9	export type PatternCategory = "alarm" | "error" | "warning" | "cycle_time" | "tool_change" | "parameter" | "speed_feed" | "tempe
... [+7751 chars truncated]

### User | 2026-06-24T14:56:44.072Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\responseSlimmer.ts' was already read 13m ago in this session and is unchanged (mtime 1781115864340). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-24T14:56:44.747Z

[tool_result] 1	/**
2	 * Tests for resourceExtractionDispatcher — AI-AWARE-HARDEN wiring
3	 */
4	
5	import { describe, it, expect, vi, beforeEach } from "vitest";
6	
7	// Mock server
8	const mockTool = vi.fn();
9	const mockServer = { tool: mockTool };
10	
11	// Import after mocking
12	import { registerResourceExtractionDispatcher } from "../tools/dispatchers/resourceExtractionDispatcher.js";
13	
14	describe("re
... [+9919 chars truncated]

### Assistant | 2026-06-24T14:56:48.701Z

I have all files except responseSlimmer (cached but I need to confirm its exact behavior on the critical empty-array-stripping question). Let me retrieve its content precisely, plus verify the new schema/router modules referenced by the two document_extract actions, and check the engine method existence claims.

### Assistant | 2026-06-24T14:56:49.744Z

[tool_use: Grep]

### User | 2026-06-24T14:56:50.730Z

[tool_result] 1:/**
2: * Response Slimmer Utility
3: * Reduces verbose response objects for MCP transport efficiency.
4: * @module utils/responseSlimmer
5: */
7:/**
8: * Slim a response object by removing null/undefined values and empty arrays.
9: *
10: * @param response - the value to slim
11: * @param maxDepth - recursion ceiling (default 32). A circular reference or a
12: *   pathologically deep payload woul
... [+2497 chars truncated]

### Assistant | 2026-06-24T14:56:55.755Z

Now I have the exact slimResponse behavior. Critical confirmations:
- Line 42: strips `null`/`undefined`
- Line 43: strips empty arrays (`value.length === 0`)
- Line 44: recurses into nested objects/arrays
- A scalar `0` (number) is NOT stripped (line 42 only checks null/undefined; 0 is neither)

Let me verify the two `document_extract_*` actions' dependencies actually exist (the schema module + router), since those are part of the changed dispatcher and could be silent orphans. Let me also confirm the git diff to understand exactly what changed in this session vs pre-existing.

### Assistant | 2026-06-24T14:57:02.537Z

[tool_use: Bash]

### Assistant | 2026-06-24T14:57:02.618Z

[tool_use: Bash]

### User | 2026-06-24T14:57:08.334Z

[tool_result] warning: in the working copy of 'mcp-server/src/engines/MachineLogHarvesterEngine.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'mcp-server/src/engines/OfficeDocumentPipelineEngine.ts', CRLF will be replaced by LF the next time Git touches it
 .../__tests__/resourceExtractionDispatcher.test.ts |  29 ++++--
 .../src/engines/MachineLogHarvesterEngine.t
... [+212 chars truncated]

### User | 2026-06-24T14:57:13.822Z

[tool_result] mcp-server/src/engines/blueprint-vision/documentExtractionRouter.ts
mcp-server/src/schemas/DocumentExtractionContract.ts

### Assistant | 2026-06-24T14:57:18.862Z

The diff confirms only 4 files changed (the dispatcher, MachineLogHarvester, OfficeDocument, and the test) — ImageOCRPipelineEngine and Drawing2DExtractionEngine were NOT modified this session (their methods already existed). The `document_extract_*` dependency modules both exist. Let me see the precise diff for each changed file to verify exactly what was added/changed and that no assertions were weakened.

### Assistant | 2026-06-24T14:57:20.042Z

[tool_use: Bash]

### User | 2026-06-24T14:57:24.496Z

[tool_result] diff --git a/mcp-server/src/engines/MachineLogHarvesterEngine.ts b/mcp-server/src/engines/MachineLogHarvesterEngine.ts
index bf3118f0b1..0ac1b5eca0 100644
--- a/mcp-server/src/engines/MachineLogHarvesterEngine.ts
+++ b/mcp-server/src/engines/MachineLogHarvesterEngine.ts
@@ -180,6 +180,14 @@ export class MachineLogHarvesterEngine {
   static findByAlarm(alarmCode: string): HarvestResult[] {
     re
... [+2134 chars truncated]

### Assistant | 2026-06-24T14:57:28.545Z

The two new engine methods are purely additive — appended after existing methods, no shadowing. Now the dispatcher diff and test diff to confirm no weakened assertions and the exact wiring changes.

### Assistant | 2026-06-24T14:57:29.453Z

[tool_use: Bash]

### User | 2026-06-24T14:57:33.636Z

[tool_result] diff --git a/mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts b/mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts
index 44cd02569a..9e8636e5e6 100644
--- a/mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts
+++ b/mcp-server/src/tools/dispatchers/resourceExtractionDispatcher.ts
@@ -158,20 +158,20 @@ Params vary by action — pass relevant fields in the par
... [+8393 chars truncated]

### Assistant | 2026-06-24T14:57:37.196Z

The dispatcher diff confirms exactly the API-drift fixes described. Now the test diff to verify assertions were strengthened, not weakened.

### Assistant | 2026-06-24T14:57:38.330Z

[tool_use: Bash]

### User | 2026-06-24T14:57:42.822Z

[tool_result] diff --git a/mcp-server/src/__tests__/resourceExtractionDispatcher.test.ts b/mcp-server/src/__tests__/resourceExtractionDispatcher.test.ts
index 00fbacdb05..5b4ba524a6 100644
--- a/mcp-server/src/__tests__/resourceExtractionDispatcher.test.ts
+++ b/mcp-server/src/__tests__/resourceExtractionDispatcher.test.ts
@@ -110,8 +110,11 @@ describe("resourceExtractionDispatcher", () => {
           action: 
... [+3110 chars truncated]

### Assistant | 2026-06-24T14:57:51.719Z

Now I need to verify the most critical silent-breakage risk the prompt called out: the empty-array-stripping interaction with `slimResponse`. The final return is `slimResponse({ action, ...result })`. Let me trace each changed action's return shape against slimResponse's stripping behavior, focusing on whether the test's asserted field survives.

Key cases to trace through `slimResponse`:

1. **office_search** → `result = { count: matches.length, matches }`. Final: `slimResponse({ action: "office_search", count: 0, matches: [] })`. Line 43 strips empty array `matches`, but `count` is `0` (a number, not null/undefined/empty-array) → survives. Test asserts `typeof result.count === "number"`. ✓ This is exactly why the wrapping with `count` was done — robust.

2. **log_alarms** (no severity) → `result = { total: 0, alarms: [] }`. Final: `slimResponse({ action, total: 0, alarms: [] })`. `alarms: []` stripped, `total: 0` survives. Test asserts `typeof result.total === "number"`. ✓

3. **log_alarms** (severity) → `{ ...all, severityFilter, severityFilterApplied: false, note }`. Test asserts `result.severityFilterApplied === false`. Critical: does `false` survive slimResponse? Line 42 strips only null/undefined; `false` is neither → survives. ✓

Let me verify one subtle thing about `success: true` in office_process/drawing_extract — a boolean `true` is also not stripped. And let me double-check there's no edge where `result` spread could clobber `action`, plus verify `getStatistics`/`getSummary`/`processDocument`/`harvestLog`/`searchByPartNumber`/`getAlarmsBySeverity` (the OLD method names) truly don't exist on the engines.

### Assistant | 2026-06-24T14:57:54.849Z

[tool_use: Bash]

### Assistant | 2026-06-24T14:57:57.271Z

[tool_use: Bash]

### User | 2026-06-24T14:58:01.820Z

[tool_result] === OLD method names (should be 0 hits each = confirmed removed/never-existed) ===
getStatistics: 0 hits
getSummary: 0 hits
processDocument: 0 hits
harvestLog: 0 hits
searchByPartNumber: 0 hits
getAlarmsBySeverity: 0 hits

### User | 2026-06-24T14:58:11.174Z

[tool_result] === NEW/used method names present? ===
ImageOCRPipelineEngine.processImage: 1
ImageOCRPipelineEngine.getQueueStats: 1
ImageOCRPipelineEngine.registerImage: 1
Drawing2DExtractionEngine.extractDrawing: 1
Drawing2DExtractionEngine.getResult: 1
OfficeDocumentPipelineEngine.extractDocument: 1
OfficeDocumentPipelineEngine.findByPartNumber: 1
OfficeDocumentPipelineEngine.searchByKeyword: 1
MachineLogHarv
... [+68 chars truncated]

### Assistant | 2026-06-24T14:58:25.289Z

Confirmed: every old (drifted) method name is gone (0 hits), and every method the dispatcher now calls exists as a static method. The fix's central claim — routing to the REAL current API — holds.

Now let me check a few remaining silent-breakage angles the prompt asked about, and a concurrency/state angle (these engines use static `Map` state shared across all calls/chats):

1. The `drawing_extract` test asserts `result.metadata.path` and `result.success === true` survive slimResponse. `metadata` is a non-empty object → survives & recurses; `path` is a string; `success: true` boolean survives. But — does slimResponse strip nested empty arrays inside `metadata`? `metadata.layers` defaults to `['0']` (non-empty). Fine. But the top-level `entities: []`, `dimensions: []`, `annotations: []` get stripped — test doesn't assert on those, so OK.

2. Let me verify the **office_process** path more carefully — the test passes `text: "Sample text"`, so a paragraph section is created, `sections.length === 1`, `officeOpts.sections` is set. Result has `metadata.path`, `success: true`. Both survive. ✓

3. Concurrency / static-state cross-test contamination: `getQueueStats`, `getAllAlarms`, `office_search` all read static Maps that persist across tests and across dispatcher invocations in the same process. The tests assert only `typeof === number`, so they're robust to whatever residual state exists. But is there a hidden ordering dependency? Let me verify the `ocr_stats` test doesn't depend on a clean state and that `ocr_process` (which runs earlier and registers/processes "image.png") doesn't break `ocr_stats`. The assertions are type-only, so safe.

Let me check one real edge: the `ocr_process` test passes `dpi: 300` → dispatcher calls `registerImage(imagePath, {dpi: 300})` then `processImage`. Since 300 >= 150, no confidence penalty. `result.imagePath === "image.png"` asserted — survives slimResponse (string). ✓ Let me verify the test for `office_search` with `count` could ever 
... [+95 chars truncated]

### Assistant | 2026-06-24T14:58:26.687Z

[tool_use: Grep]

### User | 2026-06-24T14:58:27.636Z

[tool_result] No matches found

### Assistant | 2026-06-24T14:58:29.310Z

[tool_use: Bash]

### User | 2026-06-24T14:58:33.664Z

[tool_result] === does any returned result object carry a key named 'action' that would clobber the spread? ===
exit: searched

### Assistant | 2026-06-24T14:58:38.352Z

No `action` key collision — `slimResponse({ action, ...result })` safely keeps `action` (and the test for `office_process` asserts `result.action === "office_process"`, which proves the success path is reached, not the catch object). 

Now let me run the actual test file to verify it passes — the strongest proof the wiring is correct and assertions hold against real engine returns through slimResponse.

### Assistant | 2026-06-24T14:58:39.361Z

[tool_use: Bash]

### User | 2026-06-24T14:58:46.133Z

[tool_result] stderr | src/__tests__/resourceExtractionDispatcher.test.ts > resourceExtractionDispatcher > action handler > log_alarms > returns all alarms
[INFO] [prism_resource_extraction] Action: log_alarms

stderr | src/__tests__/resourceExtractionDispatcher.test.ts > resourceExtractionDispatcher > action handler > log_alarms > filters by severity
[INFO] [prism_resource_extraction] Action: log_alarms

stder
... [+1842 chars truncated]

### Assistant | 2026-06-24T14:58:50.908Z

All 25 tests pass against the real engines through slimResponse. Now let me close the remaining lenses: (a) the `office_search` test — does it ever hit a non-empty `matches` that would make `count > 0` but the assertion is still type-only (robust either way); (b) verify the type-check (tsc) doesn't error on the changed files, since a type mismatch would be a silent break at build time; and (c) confirm the two `document_extract_*` actions (also in the switch, though not the focus) are not newly orphaned by this change.

### Assistant | 2026-06-24T14:58:53.159Z

[tool_use: Bash]

### User | 2026-06-24T14:59:16.343Z

[tool_result] --- tsc scan done (empty above = no errors in the changed files) ---

### Assistant | 2026-06-24T14:59:30.943Z

No type errors in any of the changed files. Let me do one final check on a subtle silent-breakage angle the prompt flagged — the `log_alarms` severity honesty and whether `severityFilterApplied: false` could be mistaken. The harvester's `HarvestResult.alarms` is `string[]` of alarm codes only (line 39, 104: `alarms.push(alarmMatch[1])` — just the captured digits), with no severity field anywhere. `getAllAlarms()` returns `{ total, alarms: [{code, file}] }` — no fabricated severity. The dispatcher returns all + `severityFilterApplied: false` + an honest note. This is R12-honest. 

Let me also verify there isn't an existing different consumer of these engine methods elsewhere that the rename could have broken (blast radius beyond this dispatcher).

### Assistant | 2026-06-24T14:59:33.954Z

[tool_use: Bash]

### User | 2026-06-24T14:59:39.089Z

[tool_result] === Other consumers of these engines (blast radius) ===
mcp-server/src/engines/CameraIntakeRouterEngine.ts
mcp-server/src/engines/InsertBoxToCatalogBridgeEngine.ts
mcp-server/src/engines/MachineServiceTagOCREngine.ts
mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts
mcp-server/src/routes/cad.ts
mcp-server/src/schemas/BlueprintExtractionContract.ts
mcp-server/src/schemas/DocumentExtractionC
... [+101 chars truncated]

### Assistant | 2026-06-24T14:59:52.493Z

There are other consumers. Since the engine changes were purely additive (only `getAllAlarms`, `findByPartNumber`, `searchByKeyword` added — no signatures changed, no methods removed), these other consumers can't be broken by this diff. But let me verify which engine methods those other consumers call, to confirm none relied on a method that this change touched (the additive methods don't shadow anything, but I should confirm no consumer was calling, e.g., a method that was renamed). Since the diff shows ZERO removals/renames in the engines (only additions), the only renames were in the *dispatcher's call sites* (drifted names that didn't exist anyway). Let me do a quick spot-confirm that these other consumers reference the OCR/Office/etc engines by the methods that still exist.

### Assistant | 2026-06-24T14:59:55.982Z

[tool_use: Bash]

### User | 2026-06-24T15:00:00.168Z

[tool_result] Drawing2DExtractionEngine.extractDrawing
Drawing2DExtractionEngine.getQueueStats
Drawing2DExtractionEngine.js
Drawing2DExtractionEngine.registerDrawing
ImageOCRPipelineEngine.processImage

### Assistant | 2026-06-24T15:00:29.402Z

All methods other consumers call (`extractDrawing`, `getQueueStats`, `registerDrawing`, `processImage`) still exist with unchanged signatures. The additive diff didn't touch any of them. Blast radius is clean — no un-updated consumer.

I have everything needed for a verdict. Let me consolidate my trace.

## Summary of verification

**Method existence (P0 risk — the core fix):** All 6 drifted method names (`getStatistics`, `getSummary`, `processDocument`, `harvestLog`, `searchByPartNumber`, `getAlarmsBySeverity`) confirmed absent (0 hits) from the engines — they would have thrown "is not a function" in production. All 10 methods the dispatcher now calls confirmed present as static methods with matching arg shapes: `processImage(path, text, confidence)` positional (dispatcher passes 3 positional args + pre-registers dpi via `registerImage` — correct, since `processImage` reads dpi off the queued image), `getQueueStats()`, `getResult(path)`, `extractDrawing(path, {entities,dimensions,annotations,layers})`, `extractDocument(path, {sections,tables,metadata})`, `findByPartNumber`, `searchByKeyword`, `harvestFile(path, content:string)`, `getAllAlarms()`.

**slimResponse empty-array-stripping (the subtle silent-break the prompt flagged):** Confirmed `slimResponse` strips null/undefined (line 42) and empty arrays (line 43) but NOT scalar `0`/`false`. Traced:
- `office_search` → `{count: 0, matches: []}`: `matches` stripped, `count: 0` survives (number). Test asserts `typeof result.count === "number"` ✓
- `log_alarms` (no severity) → `{total: 0, alarms: []}`: `alarms` stripped, `total: 0` survives ✓
- `log_alarms` (severity) → `severityFilterApplied: false` survives (boolean ≠ null/undefined). Test asserts `=== false` ✓
The wrapping of arrays in `{count,...}`/`{total,...}` is exactly the correct guard against the empty-array erasure — well-reasoned.

**Severity honesty (R12):** `HarvestResult.alarms` is `string[]` of codes only — no severity field exists. The dispatcher retur
... [+3997 chars truncated]
