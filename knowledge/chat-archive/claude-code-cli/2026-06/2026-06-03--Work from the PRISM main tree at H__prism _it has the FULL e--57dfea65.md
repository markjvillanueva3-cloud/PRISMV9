---
type: "chat-session"
source: "claude-code-cli"
session_id: "57dfea65-d281-4590-a8f2-029d3352b0f0"
title: "Work from the PRISM main tree at H:/prism (it has the FULL engine set — 3650+ en"
date: "2026-06-03"
first_ts: "2026-06-03T02:15:46.462Z"
last_ts: "2026-06-03T02:35:18.931Z"
cwd: "H:\\prism-slot-whiskey"
messages: 78
user_msgs: 31
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_2a9437bd-6a1/agent-ace7306aff42ae68e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:13"
---

# Work from the PRISM main tree at H:/prism (it has the FULL engine set — 3650+ en

> **claude-code-cli** | 2026-06-03 | 78 msgs (31 user / 47 assistant) | cwd: H:\prism-slot-whiskey
> Raw: `H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_2a9437bd-6a1/agent-ace7306aff42ae68e.jsonl`

## Transcript

### User | 2026-06-03T02:15:46.462Z

Work from the PRISM main tree at H:/prism (it has the FULL engine set — 3650+ engines).
EFFICIENCY: use the Grep and Glob tools (ripgrep), NOT bash 'grep -r'/'find' (they hang on this slow H: drive over huge dirs). Read at most ~12 files, bounded. Read offset/limit on large files.
Return PLAIN TEXT (no JSON, no tool to call for output) — a tight findings report.
For each component you assess, label it BUILT (exists+wired+works), PARTIAL (exists but unwired/stub/incomplete), or MISSING. Cite concrete file paths. End with a short "what to build/wire next" list for your lens.
Domain: JM Die runs 100% Okuma OSP lathes (LB/Genos/Multus). The closed loop is: read print -> generate Okuma .min program -> post/normalize -> compare to the 16,566 existing JM .min programs -> score accuracy -> feed back to learning. Lights-out machining needs the OBAR bar-loader subroutine (with VRSTT sequence-restart) included in generated programs.

LENS: LEARNING (self-improving loop). Assess the lathe learning stack. Look at: the lathe LoRA engines (mcp-server/src/engines/**/LatheLoRA*.ts), the india AI-training substrate, the 5-stage training loop (search scripts/lib + engines for 'training_loop' / 'runStage4_Reason' / 'runStage5_Generate'), outcome capture (search 'outcome' + 'OutcomeBus'), and how generated-program scores feed back into model improvement. Is the learn->improve->regenerate loop CLOSED or are stages skeletons? BUILT/PARTIAL/MISSING + what to wire.

### Assistant | 2026-06-03T02:16:14.233Z

I'll assess the lathe LEARNING stack. Let me start by mapping the relevant files.

### Assistant | 2026-06-03T02:16:14.666Z

[tool_use: Glob]

### Assistant | 2026-06-03T02:16:15.136Z

[tool_use: Glob]

### Assistant | 2026-06-03T02:16:16.141Z

[tool_use: Grep]

### Assistant | 2026-06-03T02:16:16.499Z

[tool_use: Glob]

### User | 2026-06-03T02:17:28.268Z

[tool_result] mcp-server\src\engines\LatheLoRAAdaptiveRefinementEngine.ts
mcp-server\src\engines\LatheLoRAAttentionAnalyzerEngine.ts
mcp-server\src\engines\LatheLoRABenchmarkSuiteEngine.ts
mcp-server\src\engines\LatheLoRACadenceEngine.ts
mcp-server\src\engines\LatheLoRACadenceOrchestratorEngine.ts
mcp-server\src\engines\LatheLoRAContinualLearningEngine.ts
mcp-server\src\engines\LatheLoRACronJobEngine.ts
mcp-ser
... [+2751 chars truncated]

### User | 2026-06-03T02:17:28.658Z

[tool_result] No files found

### User | 2026-06-03T02:17:29.144Z

[tool_result] No files found

### User | 2026-06-03T02:17:35.924Z

[tool_result] Found 9 files
scripts\lib\lathe-training-loop-stage-4-reason.mjs
scripts\lib\lathe-training-loop-stage-4-reason.test.mjs
mcp-server\data\ingestion_cache\TS-ENGINE-WIRING-TEMPLATE.md
scripts\lib\lathe-training-loop-stage-5-generate.mjs
scripts\lib\__real-data-batch.mjs
scripts\lib\__real-data-wizard.mjs
scripts\lib\lathe-training-loop-stage-5-generate.test.mjs
scripts\lathe-training-loop.mjs
state\
... [+60 chars truncated]

### Assistant | 2026-06-03T02:17:38.136Z

56 LatheLoRA engines and a 5-stage training loop script. Let me read the core orchestration: the training loop driver, the 5-stage script files, and the spec.

### Assistant | 2026-06-03T02:17:38.590Z

[tool_use: Read]

### Assistant | 2026-06-03T02:17:39.174Z

[tool_use: Read]

### User | 2026-06-03T02:18:00.780Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-whiskey.

### User | 2026-06-03T02:18:00.784Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-whiskey.

### Assistant | 2026-06-03T02:18:03.055Z

Path resolution issue. The Glob returned relative paths from H:/prism. Let me read from the main tree with explicit paths.

### Assistant | 2026-06-03T02:18:04.001Z

[tool_use: Read]

### Assistant | 2026-06-03T02:18:04.181Z

[tool_use: Read]

### User | 2026-06-03T02:18:24.733Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-whiskey.

### User | 2026-06-03T02:18:24.758Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-whiskey.

### Assistant | 2026-06-03T02:18:28.074Z

The Glob earlier resolved against H:\prism but the actual cwd is H:\prism-slot-whiskey. The files exist under H:/prism though (my Glob ran there). Let me check where the files actually are — the Bash tool resets cwd, so I'll use absolute paths and verify with Bash first.

### Assistant | 2026-06-03T02:18:29.306Z

[tool_use: Bash]

### User | 2026-06-03T02:20:16.859Z

[tool_result] ls: cannot access 'H:/prism/scripts/lathe-training-loop.mjs': No such file or directory
ls: cannot access 'H:/prism/scripts/lib/lathe-training-loop-stage-4-reason.mjs': No such file or directory
ls: cannot access 'H:/prism/scripts/lib/lathe-training-loop-stage-5-generate.mjs': No such file or directory

### Assistant | 2026-06-03T02:20:19.957Z

The Glob tool searched a different root than where Bash looks. The Glob ran with no `path` so it used the working directory. Let me find the actual absolute location.

### Assistant | 2026-06-03T02:20:21.117Z

[tool_use: Bash]

### User | 2026-06-03T02:22:00.044Z

[tool_result] ---slot---
H:/prism-slot-whiskey/scripts/lathe-training-loop.mjs
---pwd---
/h/prism-slot-whiskey

### Assistant | 2026-06-03T02:22:04.385Z

The files are in the slot worktree `H:/prism-slot-whiskey`, not `H:/prism`. The Glob tool defaults to the cwd (the slot worktree). The task instructions say work from H:/prism main tree, but `find H:/prism` returned nothing — meaning the main tree may not have these script files committed yet, OR the find timed out on the slow drive. Let me verify the main tree directly and read the actual files from the slot worktree (which is where they exist).

### Assistant | 2026-06-03T02:22:05.913Z

[tool_use: Bash]

### User | 2026-06-03T02:23:25.546Z

[tool_result] === main tree scripts dir ===
ls: cannot access 'H:/prism/scripts/lathe-training-loop.mjs': No such file or directory
audit-jm-die-lathe-corpus.mjs
build-lathe-engine-registry.mjs
build-lathe-knowledge-coverage.mjs
build-lathe-physics-inline-scan.mjs
build-lathe-test-gap.mjs
build-lathe-wiring-audit.mjs
demo-upgrade-jm-die-lathe-fixtures.mjs
sfc-variability-enumerate-lathe.mjs
train-lathe-full-arc
... [+130 chars truncated]

### Assistant | 2026-06-03T02:23:29.634Z

Now I understand the layout. The `lathe-training-loop.mjs` 5-stage script lives ONLY in the slot worktree `H:/prism-slot-whiskey` (uncommitted/in-progress work), while the LatheLoRA engines are committed in main `H:/prism`. The branch is `cad-fusion-live-ms0` and whiskey = lathe slot. Let me read the core files. I'll read the training loop driver and the two reasoning/generate stages from the slot tree, plus key engines from main.

### Assistant | 2026-06-03T02:23:30.119Z

[tool_use: Read]

### Assistant | 2026-06-03T02:23:31.039Z

[tool_use: Read]

### Assistant | 2026-06-03T02:23:31.199Z

[tool_use: Read]

### User | 2026-06-03T02:24:07.925Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * lathe-training-loop.mjs — PSN-integrated self-improving training loop driver.
4	 *
5	 * Implements the 11-stage loop specified in
6	 *   state/shared/specs/SPEC-LATHE-PSN-FULL-LOOP-TRAINING-2026-05-26.md
7	 *
8	 * This is the BOOTSTRAP driver. Stages 1-3 are functional (parse + quality
9	 * pipeline). Stages 4-11 are SKELETONS that emit structured stage records
10	
... [+8703 chars truncated]

### User | 2026-06-03T02:24:07.968Z

[tool_result] 1	// Training-loop Stage 4 (REASON) — implements U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (Stage 4 of 11)
2	// Design memo: reference_lathe_training_loop_stages_1_5_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	//
5	// runStage4_Reason(programReport, partSpec, engines) → ReasonReport
6	//
7	// Composes the 5 P0 engines built earlier this session to synthesi
... [+11684 chars truncated]

### User | 2026-06-03T02:24:08.021Z

[tool_result] 1	// Training-loop Stage 5 (GENERATE) — implements U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (Stage 5 of 11)
2	// Design memo: reference_lathe_training_loop_stages_1_5_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
5	//
6	// runStage5_Generate(originalProgram, reasonReport, ctx) → Prop
... [+6236 chars truncated]

### Assistant | 2026-06-03T02:24:13.124Z

Critical finding: there are TWO versions of stages 4 and 5. The driver `lathe-training-loop.mjs` has them as SKELETONS (status:"skeleton"), but separate `lathe-training-loop-stage-4-reason.mjs` and `-stage-5-generate.mjs` files have REAL implementations that are NOT imported by the driver. Let me check whether the driver imports them, whether the stage files are wired anywhere, and check outcome capture + how scores feed back.

### Assistant | 2026-06-03T02:24:14.523Z

[tool_use: Grep]

### Assistant | 2026-06-03T02:24:15.162Z

[tool_use: Grep]

### User | 2026-06-03T02:25:07.320Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-03T02:25:34.904Z

[tool_result] Found 8 files
scripts\lib\README-whiskey-lathe.md
knowledge\wiki\lessons\jm-die-v2-upgrade-pure-annotation-passthrough.md
scripts\lib\lathe-training-loop-stage-4-reason.mjs
scripts\lib\lathe-training-loop-stage-4-reason.test.mjs
scripts\lib\lathe-training-loop-stage-5-generate.mjs
scripts\lib\__real-data-batch.mjs
scripts\lib\__real-data-wizard.mjs
scripts\lib\lathe-training-loop-stage-5-generate.
... [+8 chars truncated]

### Assistant | 2026-06-03T02:25:38.077Z

Confirmed: the real `runStage4_Reason`/`runStage5_Generate` are referenced only by their own test files, `__real-data-*` harnesses, and the README — NOT by the loop driver `lathe-training-loop.mjs`. They are orphaned from the driver. Let me check the `__real-data-batch.mjs` (which may be the real wiring), the README catalog, and the india AI-training substrate + outcome capture.

### Assistant | 2026-06-03T02:25:38.553Z

[tool_use: Read]

### Assistant | 2026-06-03T02:25:39.010Z

[tool_use: Read]

### User | 2026-06-03T02:26:46.030Z

[tool_result] 1	// Throwaway batch runner: wizard across multiple JM-Die programs.
2	// Surfaces dialect cross-contamination, parsing failures, and per-program rec counts.
3	// Used iter163 to establish a cross-program quality baseline.
4	
5	import fs from "node:fs";
6	import path from "node:path";
7	import { parseBlocks, validateThreading } from "../lathe-quality-pipeline.mjs";
8	import { createBridge } from "
... [+5906 chars truncated]

### User | 2026-06-03T02:26:46.089Z

[tool_result] 1	# Whiskey lathe-domain engines — entry point
2	
3	> **STATUS**: Session-final at iter285. All 6 P0 engines + AB-locator CLI scanner code-complete + **143+9=152 hermetic tests** (39 in lathe-quality-pipeline + 9 new in iter275/iter281 ab-locator tests) + **13 real-data-driven fixes (iter281 AB-locator PRISM_UPGRADED priority fix added)** + full JM-Die archive scan = **14,475 A/B pairs across 118 
... [+4348 chars truncated]

### Assistant | 2026-06-03T02:26:52.803Z

This is very revealing. The stage 4/5 logic is real and tested (102 hermetic tests, 12/12 byte-exact round-trips) but lives as standalone `.mjs` library functions exercised only by `__real-data-batch.mjs` (a throwaway probe). The main loop driver still has skeletons. And critically: the "round-trip" only diffs program text — there's NO scoring against the 16,566 existing JM .min programs, NO feed back into a model, NO LoRA training. The "learning" is detector heuristics applied to one program at a time.

Now let me check the india AI-training substrate, outcome capture/OutcomeBus, and whether ANY LatheLoRA engine is wired to a dispatcher (the engines exist in main tree). Let me also check the spec to understand the intended closed loop.

### Assistant | 2026-06-03T02:26:53.735Z

[tool_use: Read]

### Assistant | 2026-06-03T02:26:55.200Z

[tool_use: Grep]

### User | 2026-06-03T02:27:34.726Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-whiskey.

### User | 2026-06-03T02:28:09.738Z

[tool_result] Found 4 files
H:\prism\mcp-server\src\tools\dispatchers\millDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\shopPracticeDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\turningDispatcher.ts

### Assistant | 2026-06-03T02:28:14.155Z

The graph confirms LATHE-LORA-MS0 shows as `[L8/ghost]` and the pipeline as `[L6/building]` — strong PARTIAL signal. The spec exists in main `H:/prism` (slot tree path failed). Let me check the turningDispatcher LatheLoRA references (which dispatcher action wires them), the spec, and search for OutcomeBus/outcome capture wiring.

### Assistant | 2026-06-03T02:28:15.434Z

[tool_use: Grep]

### Assistant | 2026-06-03T02:28:16.490Z

[tool_use: Read]

### User | 2026-06-03T02:28:46.183Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-whiskey.

### User | 2026-06-03T02:29:15.279Z

[tool_result] 126:  "lathe_lora_cadence_state",            // LatheLoRACadenceEngine.getState
127:  "lathe_lora_cadence_should_trigger",   // LatheLoRACadenceEngine.shouldTriggerRun
128:  "lathe_lora_cadence_active_version",   // LatheLoRACadenceEngine.getActiveVersion
142:  "lathe_lora_pipeline_estimated_duration", // LatheLoRAPipelineEngine.getEstimatedDuration
143:  "lathe_lora_cron_schedule_summary",       
... [+3732 chars truncated]

### Assistant | 2026-06-03T02:29:19.369Z

Many LatheLoRA actions ARE wired into turningDispatcher — but note these are mostly `*_stats`, `*_config`, `getState`, `getTestCases` (read-only introspection). The action-level wiring exists. The key question is whether the actual training/inference body runs (does `generateScript` write & execute a training job, or just emit a string?) and whether outcome scores feed back. Let me check the spec location, the actual training body, and outcome capture.

### Assistant | 2026-06-03T02:29:21.848Z

[tool_use: Bash]

### Assistant | 2026-06-03T02:29:22.357Z

[tool_use: Read]

### User | 2026-06-03T02:30:27.368Z

[tool_result] 1	/**
2	 * LatheLoRATrainingScriptEngine — Training Script Generator
3	 *
4	 * U-LLR03: Generates Python training scripts for LoRA/QLoRA fine-tuning
5	 * of local LLMs on JM Die lathe programs. Targets Unsloth/PEFT workflow.
6	 *
7	 * Ported from prism-lathe-master for PRISM integration.
8	 *
9	 * @module engines/LatheLoRATrainingScriptEngine
10	 */
11	
12	// ======================================
... [+1807 chars truncated]

### User | 2026-06-03T02:31:12.167Z

[tool_result] BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.html
BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.html.hash
BLUEPRINT-OCR-TRAINING-MS1-2026-05-12.md
BLUEPRINT-VISION-TRAINING-READINESS-2026-05-29.md
HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.html
HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.md
HM-TRAINING-GRAPHSAGE-SEED-VERIFICATION.md
HM-TRAINING-WIRING-PLAN-2026-05-20.html
HM-TRAINING-WIRING-PLAN-2026-05-20.md
JM-DIE-TR
... [+352 chars truncated]

### Assistant | 2026-06-03T02:31:17.152Z

Key clarification: The lathe loop spec + the stage-4/5 real implementations + the training loop driver all live ONLY in the slot worktree `H:/prism-slot-whiskey` (uncommitted), while the 56 LatheLoRA TS engines live in main `H:/prism`. The `LatheLoRATrainingScriptEngine` GENERATES a Python training script string — it does NOT execute training. Let me read the spec and confirm the loop closure intent, plus check outcome capture wiring.

### Assistant | 2026-06-03T02:31:17.879Z

[tool_use: Read]

### User | 2026-06-03T02:32:06.477Z

[tool_result] 1	# SPEC — Lathe PSN Full-Loop Self-Improving Training System (whiskey iter6 / 2026-05-26)
2	
3	> **Status:** design spec — bootstrap orchestrator ships in same commit at
4	> `scripts/lathe-training-loop.mjs`. Closes the loop between the Quality
5	> Testing Pipeline (SPEC-LATHE-QUALITY-TESTING-PIPELINE) and the existing
6	> PSN substrate so every test iteration strengthens the model.
7	> **Slot:**
... [+12640 chars truncated]

### Assistant | 2026-06-03T02:32:10.152Z

Now I have the complete picture. Let me do two final checks: outcome capture / OutcomeBus wiring (does any score feed back), and whether the LoRA quarterly cron (stage 8c) and the dataset builder actually accumulate training pairs. Let me also confirm the india AI-training substrate connection that whiskey is supposed to clone.

### Assistant | 2026-06-03T02:32:12.043Z

[tool_use: Grep]

### Assistant | 2026-06-03T02:32:13.944Z

[tool_use: Grep]

### Assistant | 2026-06-03T02:32:15.854Z

[tool_use: Grep]

### User | 2026-06-03T02:33:02.971Z

[tool_result] Found 21 files
scripts\populate-feature-store-seed.mjs
scripts\path-ledger-derive.mjs
scripts\lib\v11-cycle-time-conformal.test.mjs
scripts\lib\v11-cycle-time-conformal.mjs
scripts\lib\sfc-node-bridge.test.mjs
scripts\lib\sfc-node-bridge.mjs
scripts\lib\rgs-calibration-adapter.test.mjs
scripts\lib\rgs-calibration-adapter.mjs
scripts\lib\path-ledger.test.mjs
scripts\lib\path-ledger.mjs
scripts\lib\
... [+487 chars truncated]

### User | 2026-06-03T02:33:06.662Z

[tool_result] No matches found

### User | 2026-06-03T02:33:08.594Z

[tool_result] 129:  "lathe_deep_reasoning_record_outcome", // LatheDeepReasoningEngine.recordOutcome
159:  "lathe_lora_continual_buffer_stats",      // LatheLoRAContinualLearningEngine.getBufferStats
2052:              outcome: Parameters<typeof latheDeepReasoningEngine.recordOutcome>[1];
2057:            result = latheDeepReasoningEngine.recordOutcome(p.plan_id, p.outcome);
2180:          case "lathe_lora_cont
... [+22 chars truncated]

### Assistant | 2026-06-03T02:33:12.655Z

The graph surfaced two critical nodes: `turning:training_ingest_lathe_outcome` (built) and `lathe_deep_reasoning_record_outcome` (built). There IS an outcome-capture action. Let me read those dispatcher cases to determine whether they actually persist outcomes that feed back, and check the DatasetBuilder for accumulation. Then I have enough to write the report.

### Assistant | 2026-06-03T02:33:14.172Z

[tool_use: Grep]

### User | 2026-06-03T02:33:49.990Z

[tool_result] 209:  "training_ingest_lathe_outcome",          // ingestLatheOutcome — append shipped-job outcome to lathe ledger
210-
211-  \ WIRE-UNWIRED-MS0\U-WIRE-TURNINSP: TurningInspectionPlanEngine
212-  "turning_inspection_plan",                // generate — first-article + production inspection plan (AQL/ISO/AS9102)
213-
214-  \ WIRE-UNWIRED-MS0\U-WIRE-PARTOFF: LathePartoffSafetyRailEngine (SAFETY-CRITI
... [+2751 chars truncated]

### Assistant | 2026-06-03T02:33:53.169Z

I have enough to write the report. There's an `ingestLatheOutcome` action wired to `TrainingTemplateContinuousLearningEngine` that appends shipped-job outcomes to a ledger. Let me do one final verification: does that outcome ledger actually feed a retrain (close the loop), or is it a write-only sink? Let me quickly check the continuous-learning engine's ledger consumer.

### Assistant | 2026-06-03T02:33:54.612Z

[tool_use: Grep]

### User | 2026-06-03T02:34:28.335Z

[tool_result] 7: * (U-TL-U5) can later consume these outcomes to adjust ranking, weight customer
15: *   - ingestLatheOutcome(outcome, opts?) → IngestResult
248:function readLedger(file: string): OutcomeRecord[] {
291:  ingestLatheOutcome(
330:      records = readLedger(file);
365:      records = readLedger(file);
423:      records = readLedger(file);

### Assistant | 2026-06-03T02:35:18.931Z

That confirms it: the comment at line 7 says a future unit "(U-TL-U5) can later consume these outcomes to adjust ranking" — i.e., the outcome ledger is a WRITE sink with no model-consumer wired yet. The `readLedger` calls (lines 330/365/423) are for stats/summary, not retraining. The loop is open at the learn→improve junction.

I have a complete, well-grounded assessment. Writing the findings report.

---

LENS: LEARNING (self-improving lathe loop) — findings report

Layout note (load-bearing): The lathe *learning runtime* (the 5-stage loop driver, the real Stage-4/Stage-5 implementations, both training specs) lives ONLY in the uncommitted slot worktree `H:/prism-slot-whiskey` (branch `cad-fusion-live-ms0`, whiskey = lathe slot). The 56 LatheLoRA *TS engines* are committed in main `H:/prism`. So the learning stack is split across two trees and the two halves are not yet joined. `find H:/prism` returns none of the loop scripts.

## Component-by-component

### 1. LatheLoRA engine fleet (56 engines) — PARTIAL
- 56 engines exist: `H:/prism/mcp-server/src/engines/LatheLoRA*.ts` (DatasetBuilder, TrainingScript, ModelRegistry, ContinualLearning, RewardShaping, DriftDetector, Cadence, MasterOrchestrator, ReasoningEvaluator, SafetyEvaluator, etc.).
- ~40+ actions ARE wired into `H:/prism/mcp-server/src/tools/dispatchers/turningDispatcher.ts` (lines 126-410). BUT the overwhelming majority are read-only introspection: `*_stats`, `*_config`, `getState`, `getTestCases`, `getScheduleSummary`, `listPresets`. The system can *report on* a training pipeline it cannot *run*.
- `LatheLoRATrainingScriptEngine` (`lathe_lora_generate_script`) emits a Python Unsloth/PEFT training-script *string* + VRAM/time estimates (`H:/prism/mcp-server/src/engines/LatheLoRATrainingScriptEngine.ts:40-47`). It does NOT execute training, write a dataset, or produce an adapter. Graph confirms: `LATHE-LORA-MS0` = `[L8/ghost]`, pipeline = `[L6/building]`. So: scaffolding BUILT, actual fine-tune MISSING.

### 
... [+6551 chars truncated]
