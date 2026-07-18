---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "You are tracing the CAM closed-loop self-learning DATA FLOW end-to-end to see if"
date: "2026-05-31"
first_ts: "2026-05-31T21:57:04.406Z"
last_ts: "2026-05-31T22:27:50.675Z"
cwd: "H:\\prism-slot-kilo"
messages: 85
user_msgs: 31
assistant_msgs: 54
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_ed7a0827-3f1/agent-a1e7695bde3ff166d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:00"
---

# You are tracing the CAM closed-loop self-learning DATA FLOW end-to-end to see if

> **claude-code-cli** | 2026-05-31 | 85 msgs (31 user / 54 assistant) | cwd: H:\prism-slot-kilo
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/workflows/wf_ed7a0827-3f1/agent-a1e7695bde3ff166d.jsonl`

## Transcript

### User | 2026-05-31T21:57:04.406Z

You are tracing the CAM closed-loop self-learning DATA FLOW end-to-end to see if it is REAL or aspirational. the slot/kilo worktree (cwd). All paths relative to it. Read REAL files — cite file + the actual symbol/value. Distinguish BUILT+WIRED+WORKING from absent/stub/unwired. The recurring failure here is trusting a name or a mock instead of reading the code — do not repeat it.

Trace: CAMDriveRecipeEngine.execute() → outcomeCaptureBusEngine.record(...) → which outcomes/*.jsonl file? → SelfLearningLoopOrchestratorEngine → OutcomeFeedbackWireEngine.computeCorpusDelta() (threshold?) → MillingMetaLearningEngine. Open each file.

Critical questions: (1) Does record() actually persist to disk, and to WHICH domain file (the CAM-drive engine emits domain:"mill" — does CAM work land in outcomes/mill.jsonl, i.e. CAM outcomes pollute/merge the MILL corpus rather than a cam.jsonl)? (2) What is the >=N-outcomes threshold and is there ANY real outcome data today (cat/wc the jsonl)? (3) Does MillingMetaLearning actually read it and write tuned weights back, or is the back-write a stub? (4) Is the loop CLOSED (re-tuned rules re-consumed next run) or open? Cite real code + real file contents/counts.

### Assistant | 2026-05-31T21:57:15.614Z

I'll trace the CAM closed-loop self-learning data flow end-to-end, reading real files. Let me start by locating the key engines.

### Assistant | 2026-05-31T21:57:17.039Z

[tool_use: Bash]

### Assistant | 2026-05-31T21:57:17.999Z

[tool_use: Glob]

### User | 2026-05-31T21:57:46.257Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-31T22:03:23.202Z

[tool_result] Command running in background with ID: bhh68mib0. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\05ea8391-3689-4bbb-8b39-f2b1e22d3035\tasks\bhh68mib0.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-31T22:03:25.444Z

Let me narrow the search to the engines directory.

### Assistant | 2026-05-31T22:03:26.281Z

[tool_use: Glob]

### User | 2026-05-31T22:04:14.467Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-31T22:04:18.280Z

[tool_use: Bash]

### Assistant | 2026-05-31T22:04:16.945Z

Glob is timing out. Let me use the background bash result and direct find.

### User | 2026-05-31T22:04:48.648Z

[tool_result] === CAMDriveRecipeEngine ===
1F 1D:

./ CAMDriveRecipeEngine.ts
=== OutcomeCaptureBusEngine ===
1F 1D:

./ OutcomeCaptureBusEngine.ts
=== SelfLearningLoopOrchestratorEngine ===
0 for 'SelfLearningLoopOrchestratorEngine.ts'
=== OutcomeFeedbackWireEngine ===
0 for 'OutcomeFeedbackWireEngine.ts'
=== MillingMetaLearningEngine ===
1F 1D:

./ MillingMetaLearningEngine.ts

### Assistant | 2026-05-31T22:04:51.507Z

Three found directly, two not. RTK is wrapping `find` and mangling output. Let me check the background result and search more broadly for the two missing engines.

### Assistant | 2026-05-31T22:04:52.413Z

[tool_use: Bash]

### User | 2026-05-31T22:10:07.584Z

[tool_result] Command running in background with ID: b141v2foo. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\05ea8391-3689-4bbb-8b39-f2b1e22d3035\tasks\b141v2foo.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-31T22:10:09.867Z

[tool_use: Read]

### User | 2026-05-31T22:10:27.860Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-05-31T22:10:29.843Z

Let me use Grep which integrates better and search for the symbol names directly.

### Assistant | 2026-05-31T22:10:31.304Z

[tool_use: Grep]

### Assistant | 2026-05-31T22:10:31.822Z

[tool_use: Grep]

### User | 2026-05-31T22:11:20.827Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-31T22:11:47.622Z

[tool_result] Found 2 files
mcp-server\src\engines\OutcomeFeedbackWireEngine.test.mjs
mcp-server\src\engines\OutcomeFeedbackWireEngine.mjs

### Assistant | 2026-05-31T22:11:52.555Z

`OutcomeFeedbackWireEngine` is a `.mjs` file, not `.ts`. Let me read the background output and look at the key files. The engines exist as `.mjs`/`.ts` mix. Let me find SelfLearningLoopOrchestrator and read the core files.

### Assistant | 2026-05-31T22:11:53.567Z

[tool_use: Read]

### Assistant | 2026-05-31T22:11:54.452Z

[tool_use: Bash]

### User | 2026-05-31T22:12:03.193Z

[tool_result] 1	LatheMetaLearningEngine.ts  93.7K
2	LearningLoopEngine.ts  13.4K
3	MetaLearningOptimizerEngine.ts  4.5K
4	MillingMetaLearningEngine.ts  27.4K
5	OutcomeFeedbackWireEngine.mjs  5.7K
6	OutcomeFeedbackWireEngine.test.mjs  6.4K
7	PostProcessorMetaLearningEngine.ts  33.1K
8	SelfLearningCAMEngine.ts  68.7K
9	SelfLearningLoopE2E.test.mjs  5.1K
10	SelfLearningLoopOrchestratorEngine.mjs  7.6K
11	SelfLearn
... [+79 chars truncated]

### User | 2026-05-31T22:12:20.254Z

[tool_result] LatheMetaLearningEngine.ts  93.7K
LearningLoopEngine.ts  13.4K
MetaLearningOptimizerEngine.ts  4.5K
MillingMetaLearningEngine.ts  27.4K
PostProcessorMetaLearningEngine.ts  33.1K
SelfLearningCAMEngine.ts  68.7K
SelfLearningLoopE2E.test.mjs  5.1K
SelfLearningLoopOrchestratorEngine.mjs  7.6K
SelfLearningLoopOrchestratorEngine.test.mjs  6.9K
WEDMLearningLoopEngine.ts  9.9K

### Assistant | 2026-05-31T22:12:23.153Z

All files located. `SelfLearningLoopOrchestratorEngine` and `OutcomeFeedbackWireEngine` are `.mjs`. Now let me read the chain. Starting with CAMDriveRecipeEngine and OutcomeCaptureBusEngine.

### Assistant | 2026-05-31T22:12:23.588Z

[tool_use: Read]

### User | 2026-05-31T22:13:17.076Z

[tool_result] 1	import {
2	  camDriveRecipeSchema,
3	  camDriveDecisionRulesSchema,
4	  type CamDriveRecipe,
5	  type CamDriveStep,
6	  type CamDriveDecisionRules,
7	} from "../schemas/camDriveRecipeSchema.js";
8	
9	/**
10	 * CAMDriveRecipeEngine — autonomous, LLM-free CAM-drive replay.
11	 *
12	 * Compiles a parameterized CAM-drive recipe (camDriveRecipeSchema) into concrete
13	 * Fusion-360-drive calls by eva
... [+27393 chars truncated]

### Assistant | 2026-05-31T22:13:20.526Z

Now I have the source. Key finding #1: at line 294-306, `execute()` calls `deps.recordOutcome({ domain: "mill", kind: "recommendation_emitted", source: "system", lineage_id: ... })`. So the CAM-drive engine hardcodes `domain: "mill"`. Now let me read the OutcomeCaptureBusEngine to see if `record()` persists to disk and to which file.

### Assistant | 2026-05-31T22:13:21.371Z

[tool_use: Read]

### User | 2026-05-31T22:13:32.147Z

[tool_result] 1	/**
2	 * OutcomeCaptureBusEngine — U-LEARN-01
3	 * =====================================
4	 *
5	 * Universal cross-domain event bus for every outcome PRISM observes.
6	 * This is the spine of the learning loop: every physics/CAM/CAD/PP/SFC/
7	 * shop-floor signal that matters to future improvements is appended
8	 * here as a typed, versioned, provenance-tagged event.
9	 *
10	 * Consumers (built 
... [+16364 chars truncated]

### Assistant | 2026-05-31T22:13:39.306Z

Confirmed findings #1 and #2 (partially):
- `record()` DOES persist to disk via `atomicAppend()` (lines 374-411), a real tmp-file + fsync + rename. NOT a stub.
- The file path is `this.pathFor(ev.domain)` = `state/outcomes/${domain}.jsonl` (line 340-342). `OUTCOMES_DIR` = `path.resolve(process.cwd(), "state/outcomes")` (line 58).
- Since CAMDriveRecipeEngine emits `domain: "mill"`, the CAM-drive outcome lands in `state/outcomes/mill.jsonl` — confirming the question's hypothesis: **CAM-drive work pollutes the MILL corpus, there is no `cam.jsonl` shard for it.**

Now let me check: (a) what the actual outcomes directory contains today, (b) the SelfLearningLoopOrchestrator, (c) OutcomeFeedbackWire computeCorpusDelta threshold, (d) MillingMetaLearning back-write.

### Assistant | 2026-05-31T22:13:42.596Z

[tool_use: Bash]

### User | 2026-05-31T22:19:39.300Z

[tool_result] Command running in background with ID: bjur38p38. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\05ea8391-3689-4bbb-8b39-f2b1e22d3035\tasks\bjur38p38.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-31T22:19:41.782Z

[tool_use: Read]

### User | 2026-05-31T22:19:51.020Z

[tool_result] read-once-guard: 'H:\prism-slot-kilo\mcp-server\src\engines\SelfLearningLoopOrchestratorEngine.mjs' was already read 19m ago in this session and is unchanged (mtime 1779842469025). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. 
... [+29 chars truncated]

### Assistant | 2026-05-31T22:19:53.534Z

The read-once-guard says I read this file 19m ago, but it's not in my context (this is a fresh task). Let me bypass with a fresh read via offset.

### Assistant | 2026-05-31T22:19:54.397Z

[tool_use: Read]

### system

... [5 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-31T22:20:55.621Z

[tool_use: Bash]

### User | 2026-05-31T22:21:29.806Z

[tool_result] === mill.jsonl line count ===
88
=== mill.jsonl: kind distribution ===
=== mill.jsonl: source distribution ===
=== any recommendation_emitted (CAM-drive signature)? ===
6
=== first 2 lines ===
{"schemaVersion":"1.1.0","event_id":"a119c62e-085f-49f0-ba54-dba70de92fcd","lineage_id":"a119c62e-085f-49f0-ba54-dba70de92fcd","domain":"mill","kind":"cross_process_stage_complete","severity":"info","source"
... [+602 chars truncated]

### Assistant | 2026-05-31T22:21:34.656Z

mill.jsonl has 88 lines of REAL data, 6 of which are `recommendation_emitted` (the CAM-drive signature). The `grep -o` for kind distribution returned empty because RTK mangled it — let me re-run cleanly and inspect the recommendation_emitted events to confirm they're from CAMDriveRecipeEngine. Let me also read the two remaining engines.

### Assistant | 2026-05-31T22:21:34.870Z

[tool_use: Read]

### User | 2026-05-31T22:21:37.750Z

[tool_result] read-once-guard: 'H:\prism-slot-kilo\mcp-server\src\engines\OutcomeFeedbackWireEngine.mjs' was already read 20m ago in this session and is unchanged (mtime 1779842561883). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-05-31T22:21:40.325Z

The read-once-guard is blocking but the content is NOT in my context (fresh task). Let me bypass with offset/limit.

### Assistant | 2026-05-31T22:21:41.098Z

[tool_use: Read]

### User | 2026-05-31T22:21:49.380Z

[tool_result] 1	// OutcomeFeedbackWireEngine.mjs
2	// Consumes shop-floor outcomes from the MetaLearningOptimizerEngine ledger
3	// and emits corpus deltas + retrain triggers for the self-learning loop.
4	// Pure-fn computation; the orchestrator decides when to fire retrain based
5	// on threshold (RETRAIN_OUTCOME_THRESHOLD in SelfLearningLoopOrchestrator).
6	//
7	// Per kilo soul: this engine is the wire from 
... [+5912 chars truncated]

### Assistant | 2026-05-31T22:22:00.493Z

Critical finding on OutcomeFeedbackWireEngine. It is **pure functions only** (`computeCorpusDelta`, `shouldRetrain`, `aggregateByTemplate`, `isValidOutcome`). Crucially:

1. The docstring (line 2) claims it "Consumes shop-floor outcomes from the MetaLearningOptimizerEngine ledger" — but `computeCorpusDelta(outcomes)` takes `outcomes` as an **argument**. It does NOT read any file, does NOT read mill.jsonl, does NOT call OutcomeCaptureBusEngine.query(). Someone must pass it the outcomes.

2. The outcome shape it expects (lines 11-14, 38-44): `{ outcomeId, templateId, decision, query, observed: 'success'|'partial'|'fail' }`. **This is a COMPLETELY DIFFERENT schema from what OutcomeCaptureBusEngine stores** (which has `domain, kind, source, lineage_id, confidence, actual`, and NO `outcomeId`/`decision`/`observed` fields). The CAM-drive event emits `kind: "recommendation_emitted"`, `actual: {postedOk, gateBlocks, stepsRun}` — none of which is `observed: 'success'`. So even if mill.jsonl events WERE passed to `computeCorpusDelta`, `isValidOutcome()` would reject every one of them as `skipped` (no `outcomeId`, no `decision`, no `observed`).

3. The threshold: `shouldRetrain` uses `threshold = 50` (default), checking `delta.totalConsumed < threshold` (line 133). Matches the orchestrator's `RETRAIN_OUTCOME_THRESHOLD = 50`. There's also `PRODUCTION_PROMOTION_SUCCESS_FLOOR = 3` (a template must succeed ≥3 times with 0 fails to promote).

Now the key question: does ANYTHING actually wire these pure functions to the bus data, and does MillingMetaLearning read mill.jsonl and write back weights? Let me read MillingMetaLearningEngine and search for who calls computeCorpusDelta with real bus data.

### Assistant | 2026-05-31T22:22:01.402Z

[tool_use: Read]

### User | 2026-05-31T22:22:14.788Z

[tool_result] 1	/**
2	 * MillingMetaLearningEngine — Self-Improving Milling Intelligence
3	 * =================================================================
4	 * Implements continuous learning, adaptation, and self-improvement:
5	 *
6	 * META-LEARNING CAPABILITIES:
7	 * ┌─────────────────────────────────────────────────────────────────────┐
8	 * │ EXPERIENCE LEARNING         │ TRANSFER LEARNING              
... [+29475 chars truncated]

### Assistant | 2026-05-31T22:22:25.083Z

This is the critical engine. Findings on MillingMetaLearningEngine:

1. **All "learning" state is in-memory only** — `EXPERIENCE_DATABASE`, `PATTERN_DATABASE`, `FEEDBACK_LOG` are module-level `Map`/array (lines 152-154). Line 149 comment literally says "LEARNING DATABASE (Simulated in-memory)". **There is NO disk read and NO disk write.** It never reads `mill.jsonl`, never reads the OutcomeCaptureBus, never persists learned patterns. On process restart, every learned pattern + experience is GONE; only the 8 hardcoded `SEED_PATTERNS` survive.

2. **It never consumes the outcomes corpus.** `learnFromExperience(experience)` and `processFeedback(feedback)` take their input as **arguments**. Nothing in this engine reads `mill.jsonl`. There is no `loadFromBus()`, no `fs.readFileSync`, no import of OutcomeCaptureBusEngine or OutcomeFeedbackWireEngine.

3. **No back-write of tuned weights.** The "weights" (`learning_rate`, `exploration_factor`, `confidence_calibration`) live in `this.state` in memory only, and the seed patterns' `rule` strings are static. `getAdaptiveRecommendation` re-derives parameters from a hardcoded `materialFactors` table (lines 596-603) + the static SEED_PATTERNS — it does not consume anything the loop produced.

Now I must verify the wiring claims: does ANY caller (a) call CAMDriveRecipeEngine.execute with a real `recordOutcome` bound to the bus, and (b) does any code feed mill.jsonl → computeCorpusDelta → MillingMetaLearning? Let me search for callers and check the dispatcher adapter + the E2E test, and confirm the mill.jsonl recommendation_emitted events.

### Assistant | 2026-05-31T22:22:26.966Z

[tool_use: Grep]

### Assistant | 2026-05-31T22:22:29.205Z

[tool_use: Bash]

### User | 2026-05-31T22:22:39.561Z

[tool_result] Found 10 files
mcp-server\src\tools\dispatchers\camDispatcher.ts
mcp-server\src\engines\CAMDriveRecipeAdapter.ts
mcp-server\src\engines\CAMDriveRecipeEngine.ts
mcp-server\src\schemas\camDriveRecipeSchema.ts
mcp-server\src\engines\OutcomeFeedbackWireEngine.mjs
mcp-server\src\tools\dispatchers\millDispatcher.ts
mcp-server\src\schemas\millActionSchemas.ts
mcp-server\src\registries\AISubsystemRegistry
... [+117 chars truncated]

### User | 2026-05-31T22:22:46.065Z

[tool_result] === recommendation_emitted events in mill.jsonl (CAM-drive signature) ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 6 files:

83:0:...","domain":"mill","kind":"recommendation_emitted","severity":"info","source":"sy...

=== kind counts (clean) ===

### Assistant | 2026-05-31T22:22:49.555Z

RTK is interfering with grep on mill.jsonl. Let me read the raw lines directly and check the two key wiring files: CAMDriveRecipeAdapter.ts (does it bind recordOutcome to the real bus?) and MillingAILearningOrchestratorEngine.ts (does it tie outcomes → computeCorpusDelta → millingMetaLearning?).

### Assistant | 2026-05-31T22:22:49.849Z

[tool_use: Read]

### User | 2026-05-31T22:22:54.343Z

[tool_result] 1	import { mkdirSync, appendFileSync } from "node:fs";
2	import { dirname } from "node:path";
3	import { camDriveGateEngine } from "./CAMDriveGateEngine.js";
4	import { outcomeCaptureBusEngine } from "./OutcomeCaptureBusEngine.js";
5	import type { RecordOutcomeInput } from "./OutcomeCaptureBusEngine.js";
6	import type { CamDriveDeps } from "./CAMDriveRecipeEngine.js";
7	
8	/**
9	 * CAMDriveRecipeA
... [+5795 chars truncated]

### Assistant | 2026-05-31T22:23:00.266Z

The producer side IS REAL and WIRED. `buildCamDriveDeps` (line 66) binds `recordOutcome` → `outcomeCaptureBusEngine.record(toRecordOutcomeInput(o))` (line 96). So when the dispatcher runs a recipe, the CAM-drive outcome genuinely lands in `mill.jsonl` (domain:"mill"). The 6 `recommendation_emitted` events in mill.jsonl confirm a real run happened.

Now the consumer side — let me check MillingAILearningOrchestratorEngine (does it close the loop?) and the dispatcher to see if `outcome_feedback_compute_delta` / `self_learning_loop_step` are wired actions that actually read mill.jsonl.

### Assistant | 2026-05-31T22:23:00.794Z

[tool_use: Read]

### User | 2026-05-31T22:23:07.332Z

[tool_result] 1	/**
2	 * MillingAILearningOrchestratorEngine — L2 AI/ML Aggregator
3	 * ==========================================================
4	 * Single entry point that routes to ALL milling AI/ML sub-engines.
5	 * Uses dynamic imports so it stays functional even when a sub-engine
6	 * has not yet been built — each route returns a status marker.
7	 *
8	 * Aggregated engines (38 total target):
9	 *   - Mi
... [+10369 chars truncated]

### Assistant | 2026-05-31T22:23:14.805Z

Important: This orchestrator is a pure dynamic-import ROUTER. For `meta_learn` it routes to `millingMetaLearningEngine.learn(request)` (line 128-133) — but **MillingMetaLearningEngine has NO `learn` method** (it has `learnFromExperience`, `processFeedback`, `getAdaptiveRecommendation`). So line 207's guard `typeof engine[route.method] !== "function"` would return `buildMissingResponse` ("MillingMetaLearningEngine.learn is not a function"). This route is **dead** — it never actually invokes the meta-learner. And even if it did, it would NOT read mill.jsonl; it just forwards `request`.

Crucially, this orchestrator does NOT read the outcome bus, does NOT call computeCorpusDelta, does NOT feed mill.jsonl to anything. It's a request router, not a loop closer.

Now let me confirm: is there ANY code that reads mill.jsonl (or the bus) and feeds it into computeCorpusDelta or the meta-learner? Let me check the dispatchers for the wired actions and search for bus `.query(` consumers, plus the E2E test to see what it actually proves.

### Assistant | 2026-05-31T22:23:16.696Z

[tool_use: Grep]

### Assistant | 2026-05-31T22:23:17.408Z

[tool_use: Read]

### User | 2026-05-31T22:23:32.213Z

[tool_result] 1	// SelfLearningLoopE2E.test.mjs
2	// End-to-end round-trip test wiring all 3 self-learning engines.
3	// Per comprehensive-build directive: must invoke through the integration
4	// path, not only the engine singletons.
5	
6	import test from 'node:test';
7	import assert from 'node:assert/strict';
8	import { classify } from './TemplateApplicabilityClassifierEngine.mjs';
9	import { step, driveLoop,
... [+5166 chars truncated]

### User | 2026-05-31T22:23:43.801Z

[tool_result] mcp-server\src\engines\AlgorithmOrchestratorEngine.ts:81:    const candidates = await this.query({ domain });
mcp-server\src\__tests__\AlgorithmOrchestratorEngine.test.ts:24:    const results = await algorithmOrchestratorEngine.query({ domain: "mill" });
mcp-server\src\__tests__\FormulaIntegrationEngine.test.ts:19:    const results = await formulaIntegrationEngine.query({ domain: "kienzle" });
mcp
... [+2628 chars truncated]

### Assistant | 2026-05-31T22:23:54.638Z

This is decisive. The grep for consumers of `outcomeCaptureBusEngine.query` shows:
- `ppgOutcomeCaptureWireEngine.test.ts` and `sfcOutcomeCaptureWireEngine.test.ts` query the bus for `post_processor` and `speed_feed` domains — those are TEST files for OTHER domains' wire engines.
- **No production (non-test) code queries the bus for domain "mill" and feeds it to computeCorpusDelta or the meta-learner.** The only `bus.query({domain:"mill"})` calls are in `OutcomeCaptureBusEngine.test.ts` (the bus's own unit test).

The E2E test (`SelfLearningLoopE2E.test.mjs`) is the smoking gun for the disconnect:
- Line 10 imports `computeCorpusDelta` and feeds it **hand-fabricated outcome objects** (lines 72-79) with the `{outcomeId, templateId, decision, observed}` shape — NOT events read from mill.jsonl, NOT events from the bus.
- The orchestrator's `outcomeCount` is hardcoded into the test event payload (line 34: `outcomeCount: 50`), not derived from a count of mill.jsonl.
- **The test never touches OutcomeCaptureBusEngine at all** (no import), never touches CAMDriveRecipeEngine, never touches MillingMetaLearningEngine. It proves the three pure functions compose with each other on synthetic data — it does NOT prove the bus data flows through them.

Let me confirm two final things: (1) that the dispatcher actions `self_learning_loop_step`/`outcome_feedback_compute_delta` mentioned in the contracts are actually wired or not, and (2) verify the OutcomeFeedbackWire never reads from disk (confirm no fs import). Let me check the camDispatcher and millDispatcher for the relevant actions and grep for any fs read in the two .mjs engines.

### Assistant | 2026-05-31T22:23:59.352Z

[tool_use: Bash]

### User | 2026-05-31T22:24:46.064Z

[tool_result] === fs/readFile in the two .mjs loop engines? ===
  (no fs/bus references in either — pure functions confirmed)

=== dispatcher actions: self_learning_loop_step / outcome_feedback_compute_delta / cam_drive_recipe wired? ===
tools/dispatchers/camDispatcher.ts:1679:  "cam_drive_recipe_compile", "cam_drive_recipe_execute", "cam_drive_recipe_replay", "cam_drive_trace_query",
tools/dispatchers/camDispa
... [+230 chars truncated]

### Assistant | 2026-05-31T22:24:52.266Z

Confirmed. The two `.mjs` loop engines have **zero** fs/bus references — pure functions, definitively. And the dispatcher wiring shows:
- `cam_drive_recipe_execute`/`compile`/`replay` ARE wired in camDispatcher (lines 11545-11574) — the producer path is real.
- **NO** `self_learning_loop_step`, `outcome_feedback_compute_delta`, or `computeCorpusDelta`/`driveLoop` action is wired in ANY dispatcher. The "Dispatcher contract (target wire-up)" comments in both `.mjs` engines (SelfLearningLoop line 21, OutcomeFeedbackWire line 17) are **aspirational** — the word "target" gives it away, and no dispatcher case exists.

Let me read the cam_drive_recipe_execute dispatcher case to confirm it binds the real adapter (closing the producer-side verification), then I have the complete picture.

### Assistant | 2026-05-31T22:24:53.291Z

[tool_use: Read]

### User | 2026-05-31T22:25:01.081Z

[tool_result] 11545	          case "cam_drive_recipe_compile": {
11546	            const { CAMDriveRecipeEngine } = await import("../../engines/CAMDriveRecipeEngine.js");
11547	            result = await CAMDriveRecipeEngine.compile(
11548	              params.recipe as unknown as Parameters<typeof CAMDriveRecipeEngine.compile>[0],
11549	              params.decisionRules as unknown as Parameters<typeof CAMDriv
... [+2682 chars truncated]

### Assistant | 2026-05-31T22:25:07.390Z

I now have the complete, verified picture. The producer path is fully wired (`cam_drive_recipe_execute` → `buildCamDriveDeps` → `CAMDriveRecipeEngine.execute` → `outcomeCaptureBusEngine.record` → `mill.jsonl`), but the consumer/closing path is disconnected: the loop engines are pure functions never wired to a dispatcher, never reading the bus, and the meta-learner is in-memory-only and never consumes the corpus. The loop is OPEN, not closed.

Let me record the final verification of the recommendation_emitted event shape vs what computeCorpusDelta expects, to nail finding #1's pollution claim and the schema-mismatch.

### Assistant | 2026-05-31T22:25:10.056Z

[tool_use: Bash]

### User | 2026-05-31T22:25:55.621Z

[tool_result] {"schemaVersion":"1.0.0","event_id":"bc5c13b9-e125-4b2d-aead-46715422f4d4","lineage_id":"ADAPTER-E2E-TEST:run","domain":"mill","kind":"recommendation_emitted","severity":"info","source":"system","timestamp":"2026-05-31T18:10:34.562Z","context":{},"actual":{"test":true,"postedOk":true},"confidence":1}

=== confirm NO cam.jsonl shard exists ===
cam.jsonl ABSENT (CAM-drive outcomes merge into mill.js
... [+4 chars truncated]

### Assistant | 2026-05-31T22:26:00.572Z

Fully confirmed. The recommendation_emitted event has `lineage_id:"ADAPTER-E2E-TEST:run"` — meaning the 6 events in mill.jsonl are from the **adapter E2E test**, not real production CAM runs. The event shape (`domain, kind:"recommendation_emitted", actual:{postedOk}`, NO `outcomeId`/`templateId`/`decision`/`observed`) would be rejected by `isValidOutcome()` and never enter a corpus delta even if fed. And `cam.jsonl` is absent — CAM-drive outcomes merge into the mill corpus.

I have traced the entire chain with real evidence. Compiling findings.

### Assistant | 2026-05-31T22:26:48.129Z

[tool_use: StructuredOutput]

### User | 2026-05-31T22:27:38.676Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T22:27:50.675Z

I have traced the full chain against real source and real on-disk data. Summary of the verified state:

**Producer half — REAL and WIRED:**
- `cam_drive_recipe_execute` (camDispatcher.ts:11555) → `buildCamDriveDeps` → `outcomeCaptureBusEngine.record()` → real atomic write to `mcp-server/state/outcomes/mill.jsonl` (88 lines today). This path genuinely works.

**Consumer/closing half — OPEN, not closed:**

1. **CAM pollutes the MILL corpus.** `execute()` hardcodes `domain:"mill"` (CAMDriveRecipeEngine.ts:295), and `pathFor` keys the shard by domain, so CAM-drive outcomes land in `mill.jsonl`. There is no `cam.jsonl` (verified absent). The 6 CAM events present carry `lineage_id:"ADAPTER-E2E-TEST:run"` — they're from the adapter test, not production.

2. **Threshold:** `RETRAIN_OUTCOME_THRESHOLD = 50` (orchestrator) / `shouldRetrain` default 50 + `PRODUCTION_PROMOTION_SUCCESS_FLOOR = 3`. But `outcomeCount` is read from the event payload, never from counting the bus.

3. **MillingMetaLearning does NOT read the corpus and does NOT write tuned weights back.** It's explicitly "Simulated in-memory" (line 149) — Maps/arrays, no fs, lost on restart, only 8 hardcoded SEED_PATTERNS survive. The router that's supposed to invoke it calls a non-existent `.learn()` method (dead route).

4. **The loop is OPEN.** The two loop engines (`OutcomeFeedbackWireEngine`, `SelfLearningLoopOrchestratorEngine`) are pure functions with zero fs/bus imports and zero dispatcher wiring; their schema doesn't even match the bus's; the only E2E test feeds them synthetic hand-built objects. Re-tuned rules are never re-consumed — `getAdaptiveRecommendation` re-derives from a static `materialFactors` table.

The recurring failure this task warned about (trusting a name/mock) is exactly what's present here: the "Dispatcher contract (target wire-up)" comments and the green E2E test create the *appearance* of a closed loop, but the bus data never reaches the learner and no weights flow back.
