---
type: "chat-session"
source: "claude-code-cli"
session_id: "621b40e6-642b-48d2-bd0d-2c75bf77af44"
title: "Fix dispatcher->engine method drift in PRISM (H:/prism), THREE dispatchers: `qua"
date: "2026-06-24"
first_ts: "2026-06-24T17:27:03.642Z"
last_ts: "2026-06-24T17:36:30.844Z"
cwd: "H:\\prism"
messages: 127
user_msgs: 49
assistant_msgs: 78
raw_file: "H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-afa4d8b9c725bf136.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# Fix dispatcher->engine method drift in PRISM (H:/prism), THREE dispatchers: `qua

> **claude-code-cli** | 2026-06-24 | 127 msgs (49 user / 78 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/621b40e6-642b-48d2-bd0d-2c75bf77af44/subagents/agent-afa4d8b9c725bf136.jsonl`

## Transcript

### User | 2026-06-24T17:27:03.642Z

Fix dispatcher->engine method drift in PRISM (H:/prism), THREE dispatchers: `qualityDispatcher.ts` (4 findings: printReading.generateSetupSheet/generateInspectionPlan/compareRevisions/extractDxfDimensions), `ppDispatcher.ts` (3: analysis.analyze/generateReport/applyFixes), `millDispatcher.ts` (2: trace_ledger.queryRecent + inference_orch.classify). All under mcp-server/src/tools/dispatchers/. A handler calls engine.METHOD() where METHOD doesn't exist on the resolved engine -> throws "is not a function" at runtime (tsc-blind; getEngine() is any). Detector: `cd H:/prism && node scripts/audit-dispatcher-engine-methods.mjs --json`.

CRITICAL KNOWN AUDITOR BLIND SPOT: the auditor MISSES methods exported as object-literal properties (`export const engine = { compute, run }` shorthand, or `{ key: fn }`) -- it only recognizes class methods + inline `m: function`/`m: (..)=>`. So if the engine is `export const X = { method1, method2 }` and your method IS in that object, it is a FALSE POSITIVE (the method exists). Check for this FIRST before classifying dark.

RULES (non-negotiable):
1. VERIFY each on disk: read the dispatcher case + the engine (getEngine("key") -> engine file). Classify false-positive if the method exists (incl. object-literal export). 
2. rename/wrong-engine: READ the target method body, confirm SEMANTIC fit. Can't confirm -> SPEC.
3. dark-capability needing real domain design (SPC/inspection-plan logic, post-processor analysis, trace-ledger query) you can't ground -> SPEC for owner (quality->quality, pp->echo, mill->foxtrot). NEVER fake.
4. ASCII-only; no inlined physics constants; no stubs/.skip; every APPLIED fix gets a REAL test (R9) in mcp-server/src/__tests__/.
5. Do NOT git commit. Edit + test only. file-claim-guard block -> skipped-peer-claimed + SPEC instead.
6. After: re-run auditor + report each dispatcher's new MISSING count; run affected tests + report pass/fail HONESTLY (R12).

Return structured: per dispatcher beforeCount/afterCount, per-findi
... [+181 chars truncated]

### Assistant | 2026-06-24T17:27:11.852Z

[tool_use: TaskCreate]

### User | 2026-06-24T17:27:12.732Z

[tool_result] Task #6 created successfully: Verify each finding: read dispatcher cases + engine files

### Assistant | 2026-06-24T17:27:15.763Z

[tool_use: TaskUpdate]

### User | 2026-06-24T17:27:16.283Z

[tool_result] Updated task #6 status

### Assistant | 2026-06-24T17:27:19.345Z

Let me start by reading the three dispatcher files and running the auditor in parallel.

### Assistant | 2026-06-24T17:27:20.877Z

[tool_use: Bash]

### Assistant | 2026-06-24T17:27:22.558Z

[tool_use: Grep]

### User | 2026-06-24T17:27:26.256Z

[tool_result] {
  "dir": "H:\\prism\\mcp-server\\src\\tools\\dispatchers",
  "scanned": 107,
  "dispatchers": [
    {
      "file": "adaptiveControlDispatcher.ts",
      "missing": [],
      "indeterminate": [],
      "liveCount": 45
    },
    {
      "file": "agentDispatcher.ts",
      "missing": [],
      "indeterminate": [],
      "liveCount": 0
    },
    {
      "file": "aiDispatcher.ts",
      "missing":
... [+4582 chars truncated]

### User | 2026-06-24T17:27:28.009Z

[tool_result] 15-import { log } from "../../utils/Logger.js";
16-import { slimResponse } from "../../utils/responseSlimmer.js";
17-import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
18-import { QUALITY_ACTION_SCHEMAS } from "../../schemas/qualityActionSchemas.js";
19-
20:let _quality: any, _tolerance: any, _dimensional: any, _blueprint: any, _printReading: any, _fai: an
... [+2748 chars truncated]

### Assistant | 2026-06-24T17:27:31.890Z

Good - I can see the printReading engine is `PrintReadingEngine.ts`. Let me read it and the other engines in parallel to check what methods they actually export.

### Assistant | 2026-06-24T17:27:36.519Z

[tool_use: Bash]

### Assistant | 2026-06-24T17:27:36.997Z

[tool_use: Read]

### User | 2026-06-24T17:27:44.133Z

[tool_result] cadDispatcher.ts [{'key': 'cadTaxonomy', 'method': 'generateCadQueryCode', 'modPath': '../../engines/CADOperationTaxonomyEngine.js', 'engine': 'CADOperationTaxonomyEngine.ts', 'candidates': [{'method': 'getByCategory', 'score': 0.39}]}]
camDispatcher.ts [{'key': 'mastercamStrategy', 'method': 'recommend', 'modPath': '../../engines/MastercamStrategyEngine.js', 'engine': 'MastercamStrategyEngine.ts
... [+5042 chars truncated]

### User | 2026-06-24T17:27:45.122Z

[tool_result] 1	/**
2	 * PrintReadingEngine — Engineering Print Intelligence Pipeline
3	 *
4	 * Higher-level pipeline that orchestrates BlueprintOCREngine with
5	 * existing PRISM engines to provide end-to-end print reading:
6	 * - Blueprint analysis → feature recognition → tolerance validation
7	 * - Auto-populate setup sheets from print metadata
8	 * - Generate inspection plans from extracted GD&T
9	 * - DXF 
... [+14625 chars truncated]

### Assistant | 2026-06-24T17:27:58.725Z

Key finding: `PrintReadingEngine.ts` exports `printReadingEngine` as an **object literal** with properties `generateSetupSheet`, `generateInspectionPlan`, `compareRevisions`, `extractDxfDimensions` - all 4 methods ARE present. This is the auditor blind spot - all 4 quality dispatcher findings are **FALSE POSITIVES**.

Now let me read the ppDispatcher and millDispatcher engines in parallel:

### Assistant | 2026-06-24T17:28:00.073Z

[tool_use: Bash]

### Assistant | 2026-06-24T17:28:01.349Z

[tool_use: Bash]

### User | 2026-06-24T17:28:04.902Z

[tool_result] 728:    case "analysis":

### User | 2026-06-24T17:28:06.292Z

[tool_result] 178:    case "trace_ledger":
180:    case "inference_orch":
767:  "mill_part_classify",                 // MillPartClassifierEngine.classify
768:  "mill_part_classify_batch",           // MillPartClassifierEngine.classifyBatch
3121:            const engine = await getEngine("trace_ledger");
3126:            const engine = await getEngine("trace_ledger");
3127:            result = engine.queryRecen
... [+701 chars truncated]

### Assistant | 2026-06-24T17:28:11.304Z

Now let me read the specific dispatcher cases and engine files in parallel:

### Assistant | 2026-06-24T17:28:12.016Z

[tool_use: Read]

### Assistant | 2026-06-24T17:28:12.523Z

[tool_use: Read]

### User | 2026-06-24T17:28:12.991Z

[tool_result] 720	    case "telemetry":
721	      return _ppTel ??= (await import("../../engines/PostProcessorTelemetryEngine.js")).postProcessorTelemetryEngine;
722	    case "toolNumberRange":
723	      return _ppTNR ??= (await import("../../engines/PPToolNumberRangeValidatorEngine.js")).ppToolNumberRangeValidatorEngine;
724	    case "trainer":
725	      return _ppTrn ??= (await import("../../engines/PostProce
... [+3592 chars truncated]

### User | 2026-06-24T17:28:13.717Z

[tool_result] 3110	          // ============================================================
3111	          case "mill_e2e_workflow": {
3112	            const engine = await getEngine("e2e");
3113	            result = await engine.executeWorkflow(params);
3114	            break;
3115	          }
3116	
3117	          // ============================================================
3118	          // REASONING TRAC
... [+2510 chars truncated]

### Assistant | 2026-06-24T17:28:21.006Z

Good. Now I have the key data. `mill_trace_query` calls `engine.queryRecent()` - I need to check if that method exists. And `mill_inference_run` calls `engine.infer()` - but the auditor said `classify` was missing (different method). Let me check the actual engines and find the pp actions:

### Assistant | 2026-06-24T17:28:22.852Z

[tool_use: Bash]

### Assistant | 2026-06-24T17:28:23.618Z

[tool_use: Bash]

### Assistant | 2026-06-24T17:28:24.351Z

[tool_use: Bash]

### User | 2026-06-24T17:28:27.955Z

[tool_result] 25:export interface MillingReasoningStep {
34:export interface MillingTraceEntry {
54:export interface MillingLedgerStats {
66:export interface MillingLedgerAppendResult {
81:export class MillingReasoningTraceLedgerEngine {
170:  getRecent(limit = 100): MillingTraceEntry[] {
178:  queryByAction(action: string, limit = 100): MillingTraceEntry[] {
187:  queryWithReasoning(limit = 100): MillingTraceE
... [+102 chars truncated]

### User | 2026-06-24T17:28:29.589Z

[tool_result] 6: * Orchestrates all neural network inference for milling operations:
8: *   - Manages inference pipeline with dependency resolution
11: *   - Provides unified inference API for downstream consumers
28:export interface MillingConditions {
41:export interface InferenceRequest {
49:export interface PredictionResult {
55:  inference_time_ms: number;
59:export interface InferenceResponse {
64:  total
... [+1369 chars truncated]

### User | 2026-06-24T17:28:29.862Z

[tool_result] 18:export interface PostIssue {
31:export type PostIssueCategory =
44:export interface AnalysisResult {
324:export function analyzePostProcessor(code: string, filename: string = "unknown.cps"): AnalysisResult {
403:export function generateAnalysisReport(result: AnalysisResult): string {
460:export function applyAutoFixes(code: string, issues: PostIssue[]): { code: string; fixesApplied: number } {

... [+189 chars truncated]

### Assistant | 2026-06-24T17:28:39.664Z

Excellent. Now I have all the facts. Let me analyze:

**qualityDispatcher.ts (4 findings):** All FALSE POSITIVES. `PrintReadingEngine.ts` exports `printReadingEngine` as an object literal `{ analyze, generateSetupSheet, generateInspectionPlan, compareRevisions, extractDxfDimensions }` - all 4 methods exist (lines 394-401). The auditor missed object-literal exports.

**ppDispatcher.ts (3 findings):** All FALSE POSITIVES. `PostProcessorAnalysisEngine.ts` exports `postProcessorAnalysisEngine` as `{ analyze: analyzePostProcessor, generateReport: generateAnalysisReport, applyFixes: applyAutoFixes }` (lines 478-481). All 3 methods exist.

**millDispatcher.ts (2 findings):**
- `trace_ledger.queryRecent`: `MillingReasoningTraceLedgerEngine` has `getRecent()` (line 170), `queryByAction()` (line 178), `queryWithReasoning()` (line 187) - but NO `queryRecent()`. **REAL BUG** - method name mismatch.
- `inference_orch.classify`: The auditor said `classify` is missing, but the dispatcher case `mill_inference_run` calls `engine.infer()` (line 3136), NOT `classify`. Let me verify the auditor's claim about classify more carefully.

### Assistant | 2026-06-24T17:28:41.214Z

[tool_use: Bash]

### Assistant | 2026-06-24T17:28:41.841Z

[tool_use: Read]

### User | 2026-06-24T17:28:42.964Z

[tool_result] 160	      this.ring.splice(0, this.ring.length - TRACE_RING_SIZE);
161	    }
162	    if (this.diskWritesEnabled) {
163	      void appendToFile(this.ledgerPath, JSON.stringify(entry) + "\n").catch((e) => {
164	        log.warn(`[milling-trace-ledger] async disk write failed: ${(e as Error).message}`);
165	      });
166	    }
167	    return { ok: true, entry };
168	  }
169	
170	  getRecent(limit = 1
... [+1750 chars truncated]

### User | 2026-06-24T17:28:46.947Z

[tool_result] 180:    case "inference_orch":
767:  "mill_part_classify",                 // MillPartClassifierEngine.classify
768:  "mill_part_classify_batch",           // MillPartClassifierEngine.classifyBatch
3135:            const engine = await getEngine("inference_orch");
3378:          // via validateActionParams) → engine.classify() (FAIL-LOUD defense
3385:          case "mill_part_classify": {
3387:   
... [+461 chars truncated]

### Assistant | 2026-06-24T17:28:50.978Z

Now I have the full picture. Let me check what the auditor specifically flagged for `inference_orch.classify` vs the actual dispatcher code:

### Assistant | 2026-06-24T17:28:51.625Z

[tool_use: Read]

### User | 2026-06-24T17:28:52.596Z

[tool_result] 3130	
3131	          // ============================================================
3132	          // INFERENCE ORCHESTRATION (MillingInferenceOrchestratorEngine)
3133	          // ============================================================
3134	          case "mill_inference_run": {
3135	            const engine = await getEngine("inference_orch");
3136	            result = await engine.infer(p
... [+757 chars truncated]

### system

... [47 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-24T17:34:06.946Z

`keywords` is required (line 112 confirms). The `recordTraceSync` fix is correct. Now run the tests and auditor to close out the task:

### Assistant | 2026-06-24T17:34:08.351Z

[tool_use: Bash]

### User | 2026-06-24T17:34:12.325Z

[tool_result] Exit code 1
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
PASS (56) FAIL (1)

1. MillingReasoningTraceLedgerEngine -- queryRecent absent, getRecent is the entry (Fix 9) getRecent() returns entries in insertion order (oldest first in slice)
   AssertionError: expected +0 to be 3 // Object.is equality
       at H:/PRISM/mcp-server/src/__tests__/dispatcher-method-drift-f
... [+867 chars truncated]

### Assistant | 2026-06-24T17:34:16.149Z

One test still failing. The insertion-order test is asserting `expected +0 to be 3`. Let me read the exact test around line 544:

### Assistant | 2026-06-24T17:34:16.802Z

[tool_use: Read]

### User | 2026-06-24T17:34:18.043Z

[tool_result] 525	    }
526	    const result = eng.getRecent(3);
527	    expect(result.length).toBeLessThanOrEqual(3);
528	  });
529	
530	  it("getRecent() returns entries in insertion order (oldest first in slice)", () => {
531	    const eng = new MillingReasoningTraceLedgerEngine();
532	    eng.setDiskWrites(false);
533	    const actions = ["mill_a", "mill_b", "mill_c"];
534	    for (const action of actions) 
... [+1133 chars truncated]

### Assistant | 2026-06-24T17:34:21.451Z

The test expects `result.length` to be 3, but `getRecent` returns 0. The issue is `setDiskWrites(false)` — let me check if that method exists and if writes to the ring buffer depend on it:

### Assistant | 2026-06-24T17:34:22.695Z

[tool_use: Grep]

### User | 2026-06-24T17:34:24.070Z

[tool_result] No matches found

### Assistant | 2026-06-24T17:34:27.858Z

`setDiskWrites` doesn't exist on the engine. It's being called on a fresh instance and silently doing nothing (no-op since the method doesn't exist on TypeScript `any` path — but actually this would throw). Let me check what methods the class actually has:

### Assistant | 2026-06-24T17:34:29.045Z

[tool_use: Grep]

### Assistant | 2026-06-24T17:34:29.321Z

[tool_use: Read]

### User | 2026-06-24T17:34:30.296Z

[tool_result] 130	    if (!v.ok) {
131	      return { ok: false, errors: v.errors };
132	    }
133	    this.ring.push(entry);
134	    if (this.ring.length > TRACE_RING_SIZE) {
135	      this.ring.splice(0, this.ring.length - TRACE_RING_SIZE);
136	    }
137	    if (this.diskWritesEnabled) {
138	      try {
139	        await appendToFile(this.ledgerPath, JSON.stringify(entry) + "\n");
140	      } catch (e) {
141	
... [+1472 chars truncated]

### User | 2026-06-24T17:34:30.543Z

[tool_result] No matches found

### Assistant | 2026-06-24T17:34:40.343Z

The `setDiskWrites` call — that method doesn't exist on the engine. The `diskWritesEnabled` field controls disk writes but there's no public setter. The test at line 532 calls `eng.setDiskWrites(false)` which silently does nothing (TypeScript `any` or just undefined method call). The ring still gets written to since `recordTraceSync` pushes to `this.ring` regardless of `diskWritesEnabled`. So `getRecent(10)` should return 3 entries. But the test reports `expected +0 to be 3`.

Let me check the constructor — maybe there's something that prevents ring pushes, or `diskWritesEnabled` defaults affect the sync path:

### Assistant | 2026-06-24T17:34:41.252Z

[tool_use: Read]

### User | 2026-06-24T17:34:42.631Z

[tool_result] 1	/**
2	 * MillingReasoningTraceLedgerEngine — MILL-AGI-P0/U-P0.2
3	 *
4	 * Append-only JSONL ledger of milling dispatcher reasoning traces. Each entry
5	 * records a decision point: which dispatcher, action, keywords, a short
6	 * summary of inputs/outputs, confidence, and which downstream engines were
7	 * consulted. Provides an audit trail for post-hoc analysis and drives the
8	 * reasoning-led
... [+4335 chars truncated]

### Assistant | 2026-06-24T17:34:46.694Z

`setDiskWrites` EXISTS at line 95-97. So the method call is fine. The issue is at line 113: `awareness_used must be boolean`. The test's `recordTraceSync` calls omit `awareness_used`, which means validation fails and the entry is NOT pushed to the ring.

The fix: add `awareness_used: false` to the test's `recordTraceSync` calls:

### Assistant | 2026-06-24T17:34:48.265Z

[tool_use: Read]

### User | 2026-06-24T17:34:49.734Z

[tool_result] 495	
496	describe("MillingReasoningTraceLedgerEngine -- queryRecent absent, getRecent is the entry (Fix 9)", () => {
497	  const ledger = new MillingReasoningTraceLedgerEngine();
498	
499	  it("queryRecent does NOT exist on the engine (the method the dispatcher wrongly called)", () => {
500	    expect(typeof (ledger as unknown as Record<string, unknown>)["queryRecent"]).toBe("undefined");
501	  })
... [+1775 chars truncated]

### Assistant | 2026-06-24T17:34:58.427Z

`awareness_used` is required (boolean, validated at line 113) but missing from all 5 test `recordTraceSync` calls. All entries silently fail validation and don't push to the ring. Fix all affected calls:

### Assistant | 2026-06-24T17:35:01.706Z

[tool_use: Edit]

### User | 2026-06-24T17:35:04.480Z

[tool_result] The file H:\prism\mcp-server\src\__tests__\dispatcher-method-drift-fixes.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-24T17:35:09.149Z

The Ollama advisory says `awareness_used` is not in the type. But we just confirmed the interface at line 44: `awareness_used: boolean;` IS in `MillingTraceEntry`, and `recordTraceSync` takes `Omit<MillingTraceEntry, "schemaVersion" | "id" | "at">` — so `awareness_used` IS a valid field. The advisory is wrong here. Now fix the second affected call (insertion-order test):

### Assistant | 2026-06-24T17:35:10.449Z

[tool_use: Edit]

### User | 2026-06-24T17:35:13.281Z

[tool_result] The file H:\prism\mcp-server\src\__tests__\dispatcher-method-drift-fixes.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-24T17:35:15.545Z

Now run the tests:

### Assistant | 2026-06-24T17:35:16.386Z

[tool_use: Bash]

### User | 2026-06-24T17:35:21.572Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
PASS (57) FAIL (0)

### Assistant | 2026-06-24T17:35:24.120Z

57/57 PASS. Now run the auditor to get updated MISSING counts:

### Assistant | 2026-06-24T17:35:25.118Z

[tool_use: Bash]

### User | 2026-06-24T17:35:29.261Z

[tool_result] {
  "dir": "H:\\prism\\mcp-server\\src\\tools\\dispatchers",
  "scanned": 107,
  "dispatchers": [
    {
      "file": "adaptiveControlDispatcher.ts",
      "missing": [],
      "indeterminate": [],
      "liveCount": 45
    },
    {
      "file": "agentDispatcher.ts",
      "missing": [],
      "indeterminate": [],
      "liveCount": 0
    },
    {
      "file": "aiDispatcher.ts",
      "missing":
... [+2367 chars truncated]

### Assistant | 2026-06-24T17:35:36.093Z

[tool_use: Bash]

### User | 2026-06-24T17:35:42.581Z

[tool_result] qualityDispatcher.ts: missing=4, indeterminate=1
  MISSING: [{"key":"printReading","method":"generateSetupSheet","modPath":"../../engines/PrintReadingEngine.js","engine":"PrintReadingEngine.ts","candidates":[]},{"key":"printReading","method":"generateInspectionPlan","modPath":"../../engines/PrintReadingEngine.js","engine":"PrintReadingEngine.ts","candidates":[]},{"key":"printReading","method":"com
... [+1084 chars truncated]

### Assistant | 2026-06-24T17:35:51.811Z

Good data. `millDispatcher` dropped from 2 → 1 (the `queryRecent→getRecent` fix applied). The remaining `inference_orch.classify` is still reported — I previously classified it as a false positive from a comment at line 3378. Let me verify that classification is still correct before closing out:

### Assistant | 2026-06-24T17:35:53.350Z

[tool_use: Bash]

### User | 2026-06-24T17:35:59.015Z

[tool_result] 180:    case "inference_orch":
3135:            const engine = await getEngine("inference_orch");
3385:          case "mill_part_classify": {
3387:            result = millPartClassifierEngine.classify(
3388:              params as Parameters<typeof millPartClassifierEngine.classify>[0],
3392:          case "mill_part_classify_batch": {
3396:            const p = params as { parts: Parameters<type
... [+120 chars truncated]

### Assistant | 2026-06-24T17:36:03.013Z

[tool_use: Bash]

### User | 2026-06-24T17:36:07.147Z

[tool_result]           // ============================================================
          // INFERENCE ORCHESTRATION (MillingInferenceOrchestratorEngine)
          // ============================================================
          case "mill_inference_run": {
            const engine = await getEngine("inference_orch");
            result = await engine.infer(params);
            break;
         
... [+483 chars truncated]

### Assistant | 2026-06-24T17:36:30.844Z

Confirmed: `inference_orch` only calls `engine.infer(params)` at line 3136. The auditor found `classify` from `millPartClassifierEngine.classify` at line 3387-3388 (a different engine in a different case block). The `inference_orch.classify` finding is a false positive from the auditor scanning outside the case scope.

Now I have everything needed for the complete structured report:

---

## Structured Result — Dispatcher Method Drift Fix

### Summary

| Dispatcher | Before (MISSING) | After (MISSING) | Delta |
|---|---|---|---|
| `qualityDispatcher.ts` | 4 | 4 | 0 (all false positives — no fix needed) |
| `ppDispatcher.ts` | 3 | 3 | 0 (all false positives — no fix needed) |
| `millDispatcher.ts` | 2 | 1 | -1 (real fix applied) |

The auditor still reports counts unchanged for quality/pp because it cannot detect object-literal exports — that is the documented blind spot. The regression-lock tests in Block 10 and 11 prove the methods exist at runtime.

---

### Per-Finding Detail

**qualityDispatcher.ts** — all 4 findings: FALSE POSITIVE

| Method | Classification | Action | Evidence |
|---|---|---|---|
| `printReading.generateSetupSheet` | FALSE POSITIVE | none (method exists) | `PrintReadingEngine.ts:398` — `generateSetupSheet` is an object-literal property on `printReadingEngine` export |
| `printReading.generateInspectionPlan` | FALSE POSITIVE | none (method exists) | `PrintReadingEngine.ts:399` |
| `printReading.compareRevisions` | FALSE POSITIVE | none (method exists) | `PrintReadingEngine.ts:400` |
| `printReading.extractDxfDimensions` | FALSE POSITIVE | none (method exists) | `PrintReadingEngine.ts:401` |

Root cause: `PrintReadingEngine.ts` exports `export const printReadingEngine = { analyze, generateSetupSheet, generateInspectionPlan, compareRevisions, extractDxfDimensions }` (object-literal shorthand, lines 394–401). The auditor only recognizes class methods and inline `m: function`/arrow-function forms — it misses shorthand property exports entirely.

--
... [+2494 chars truncated]
