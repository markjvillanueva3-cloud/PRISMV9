---
type: "chat-session"
source: "claude-code-cli"
session_id: "d63af58b-aaae-45fd-bf3d-c0a2aec5aca0"
title: "You are auditing PRISM's LoRA training substrate for slot india. Output a TIGHT "
date: "2026-05-26"
first_ts: "2026-05-26T14:37:26.544Z"
last_ts: "2026-05-26T15:33:16.181Z"
cwd: "H:\\prism"
messages: 97
user_msgs: 46
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism/d63af58b-aaae-45fd-bf3d-c0a2aec5aca0/subagents/agent-acc2fe9423083d944.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# You are auditing PRISM's LoRA training substrate for slot india. Output a TIGHT 

> **claude-code-cli** | 2026-05-26 | 97 msgs (46 user / 51 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d63af58b-aaae-45fd-bf3d-c0a2aec5aca0/subagents/agent-acc2fe9423083d944.jsonl`

## Transcript

### User | 2026-05-26T14:37:26.544Z

You are auditing PRISM's LoRA training substrate for slot india. Output a TIGHT findings report to disk + return a ≤200-word summary.

## Scope

Per CLAUDE.md §lathe_lora_* / mill_lora_* / 5axis_lora_* / wedm_lora_* / millturn_lora_*. The PRISM LoRA system covers:
- Per-domain LoRA datasets + retrain cadence
- LoRA cadence orchestrator (`lora_cadence_state`, `lora_cadence_should_trigger`, `lora_cadence_active_version`)
- LoRA deployment lifecycle (shadow → canary → active → retire)
- LoRA drift detection
- LoRA embedding cache
- LoRA ensemble
- LoRA serving/routing
- LoRA experiment + benchmark + monitoring + master orchestrator
- LoRA tribal augmenter

## Goal

Answer these 6 questions with concrete evidence:
1. How many LoRA-related dispatcher actions exist across `prism_mill`, `prism_turning`, `prism_edm`, `prism_cam`, `prism_quoting`?
2. Which LoRA cadences are LIVE (have data being written) vs documented-but-dormant? Check `state/shared/loop-state/` + grep `lora` in mcp-server/data/state.
3. Is there a per-domain LoRA training dataset on disk somewhere? Check `mcp-server/data/state/lora-*` + `state/shared/lora-*` paths.
4. Has any LoRA ever been promoted to `active`? (`lathe_lora_cadence_active_version` action exists per CLAUDE.md.)
5. What's the drift state — is `lora_drift_check_all_clear` returning clear?
6. **Article incorporation**: dunik_7's "Layer 4 consolidator that runs while you sleep" — does any LoRA cadence implement this with a NEW-file + review-gate? Map it concretely.

## Inspect

- `mcp-server/data/docs/DISPATCHER_DIGEST.md` (grep for `lora`)
- `knowledge/wiki/code-tribal/learnings/*lora*.md`
- `state/shared/dashboards/` (any lora dashboards?)
- `mcp-server/data/state/` (any lora persistence?)
- `knowledge/memories/reference/reference_*lora*.md`

## Output

Write `state/shared/audit-2026-05-26-india/02-lora-substrate.md` with sections:
- ## LoRA dispatcher inventory (action counts per dispatcher)
- ## LoRA lifecycle state — what's actually flowi
... [+305 chars truncated]

### Assistant | 2026-05-26T14:37:51.061Z

I'll audit the LoRA training substrate systematically. Let me start by exploring the dispatcher inventory and state.

### Assistant | 2026-05-26T14:37:52.035Z

[tool_use: Bash]

### User | 2026-05-26T14:39:25.942Z

[tool_result] dir ready

### Assistant | 2026-05-26T14:39:30.564Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:39:31.869Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:39:32.626Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:39:33.274Z

[tool_use: Bash]

### User | 2026-05-26T14:40:50.065Z

[tool_result] (Bash completed with no output)

### User | 2026-05-26T14:40:50.863Z

[tool_result] (Bash completed with no output)

### User | 2026-05-26T14:40:51.200Z

[tool_result] WEDM_LORA_CHECKPOINT.json  736B

### User | 2026-05-26T14:40:51.461Z

[tool_result] AI-LORA-ARTIFACTS.md  7.3K

### Assistant | 2026-05-26T14:40:58.499Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:40:59.509Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:41:00.586Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:41:01.331Z

[tool_use: Bash]

### User | 2026-05-26T14:42:04.444Z

[tool_result] node_formula_formula_adjusted_aireasoningdispatcher_action_lora_drift_active.md  1.7K
node_formula_formula_adjusted_aireasoningdispatcher_action_lora_drift_buffer_size.md  1.8K
node_formula_formula_adjusted_aireasoningdispatcher_action_lora_drift_check_all_clear.md  1.8K
node_formula_formula_adjusted_aireasoningdispatcher_action_lora_drift_get_config.md  1.8K
node_formula_formula_adjusted_aireason
... [+7036 chars truncated]

### User | 2026-05-26T14:42:06.102Z

[tool_result] # PRISM Dispatcher Digest

**104 dispatchers** route MCP actions to engines.
Each dispatcher handles a specific manufacturing/system domain.
Auto-generated: 2026-05-26 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
Total actions across all dispatchers: **13335**.

## Dispatcher Map

| Dispatcher | Domain | Actions |
[105 more lines]

### User | 2026-05-26T14:42:08.489Z

[tool_result] backend-dev-loop-u-wire-lathe-lora-reason-eval.md  1.9K
backend-dev-loop-u-wire-lathe-lora-safety-eval.md  2.0K

### User | 2026-05-26T14:42:10.031Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-26T14:42:15.777Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:42:16.449Z

[tool_use: Bash]

### User | 2026-05-26T14:42:58.309Z

[tool_result] Exit code 1
cat: state/shared/dashboards/AI-LORA-ARTIFACTS.md: The system cannot find the file specified. (os error 2)

### User | 2026-05-26T14:43:16.169Z

[tool_result] {
  "schemaVersion": 1,
  "adapterName": "wedm-lora-v1",
  "baseModel": "mistralai/Mistral-7B-v0.1",
  "status": "not_trained",
  "lastTraining": null,
  "config": {
    "lora_r": 8,
    "lora_alpha": 16,
    "lora_dropout": 0.1,
    "target_modules": ["q_proj", "v_proj"],
    "task_type": "CAUSAL_LM"
  },
  "trainingData": {
    "source": "WEDM_OUTCOME_LEDGER.jsonl",
    "samples": 0,
    "lastUp
... [+335 chars truncated]

### Assistant | 2026-05-26T14:43:22.599Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:43:23.703Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:43:25.191Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:43:25.784Z

[tool_use: Bash]

### User | 2026-05-26T14:45:22.476Z

[tool_result] 0 for '*lora*'

### User | 2026-05-26T14:45:25.218Z

[tool_result] (Bash completed with no output)

### User | 2026-05-26T14:45:25.958Z

[tool_result] loop-00569f88-7a6b-4018-a82d-4cb1fd5b91aa.json  882B
loop-00a9c6dc-0c91-4629-88da-a181fbfef41f.json  613B
loop-02531854-9ec3-4aea-8139-f728ed0ed592.json  332B
loop-03315be5-fba7-4186-8b85-d4558278f3e3.json  318B
loop-047e0a72-c897-4996-aabd-94b7e86c04cd.json  5.8K
loop-056b67b6-e6af-4baa-80ac-0db33a1f9094.json  291B
loop-06a24572-08cb-49a7-a098-2e03c0e8fcf4.json  1.8K
loop-06f48301-9119-48dc-9f66-
... [+659 chars truncated]

### User | 2026-05-26T14:45:38.180Z

[tool_result] ./.cache/commit-msg-lora-codex-fix.txt
./.cache/commit-msg-lora-tests.txt
./.cache/commit-msg-lora-drift.txt
./.claude/commands/lathe-lora.md
./.claude/commands/train-lora.md
./claude-backup-from-c/plans/fusion360-cam-api-exploration.md
./docs/cam-ai/lora-training.md
./knowledge/memories/reference/node_formula_formula_adjusted_aireasoningdispatcher_action_lora_drift_active.md
./knowledge/memories/
... [+3505 chars truncated]

### Assistant | 2026-05-26T14:45:44.696Z

[tool_use: Grep]

### Assistant | 2026-05-26T14:45:46.213Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:45:47.332Z

[tool_use: Bash]

### Assistant | 2026-05-26T14:45:48.034Z

[tool_use: Bash]

### User | 2026-05-26T14:45:56.825Z

[tool_result] Found 11 files
state\shared\loop-state\loop-91364a5d-72dc-41a9-9d66-7aeb54ece5c5.json
state\shared\loop-state\loop-cb7f240f-2c6d-48c0-b225-0a2fba99eec8.json
state\shared\loop-state\loop-ef40a9d1-9ca5-42bb-8314-de693bc5f7b5.json
state\shared\loop-state\loop-b247372e-4fef-4908-afe2-a6ab09e8aeeb.json
state\shared\loop-state\loop-a403dcf6-ce47-4321-866c-494ec28f385a.json
state\shared\loop-state\loop-e
... [+395 chars truncated]

### User | 2026-05-26T14:47:00.259Z

[tool_result] mcp-server/data/state/WEDM_LORA_CHECKPOINT.json

### User | 2026-05-26T14:47:01.149Z

[tool_result] # CAM AI — LoRA training

The CAM AI LoRA training loop is fed by `CAMFeedbackLoopEngine`. Shop-
floor outcomes and operator corrections accumulate in a ring buffer;
`loraTrainingExport()` projects that buffer into a stream of
`LoRATrainingPair` records that downstream per-CAM adapter training
scripts (units U-CAM108..U-CAM111) consume.

## Inputs — what becomes a training pair

Two events feed th
... [+2854 chars truncated]

### User | 2026-05-26T14:47:19.904Z

[tool_result] ./cad-engine/.venv/Lib/site-packages/colorama
./cad-engine/.venv/Lib/site-packages/colorama-0.4.6.dist-info
./mcp-server/data/test-lathe-lora
./mcp-server/data/wedm-lora-smoke-out

### system

... [17 middle messages omitted -- see raw_file] ...

### User | 2026-05-26T15:00:57.801Z

[tool_result] (Bash completed with no output)

### User | 2026-05-26T15:01:00.770Z

[tool_result] (Bash completed with no output)

### User | 2026-05-26T15:01:01.044Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-26T15:01:05.222Z

[tool_use: Read]

### Assistant | 2026-05-26T15:01:06.248Z

[tool_use: Read]

### Assistant | 2026-05-26T15:01:08.381Z

[tool_use: Bash]

### User | 2026-05-26T15:02:22.210Z

[tool_result] 1	[
2	  {
3	    "id": "9007405.MIN-gcode-001",
4	    "instruction": "Explain what this Okuma OSP G-code does and suggest any improvements.",
5	    "input": "G140\nNSTRT\n(PROGRAM NAME - 9007405)\n(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)\n(MCX FILE - C:\\USERS\\CNC LATHE\\BOX SYNC\\CNC LATHE\\GENERAL OPERATION.MCX-8)\n(NC FILE - C:\\USERS\\CNC LATHE\\BOX SYNC\\CNC LATHE\\9007405.MIN)\n(MATERIA
... [+1380 chars truncated]

### User | 2026-05-26T15:02:22.287Z

[tool_result] 1	{"id":"3024313-4D1.MIN-wp-001","instruction":"What pulse-on, pulse-off, peak current, and gap voltage should I use for offset_compensation on D2 tool steel?","input":"Controller: unknown pulse-on hint S0 peak current hint T1200 wire feed F2","output":"Recommended wire-EDM parameters for this cut (unknown dialect):\n\nPhysics derivation per Kunieda et al. CIRP Annals 2005 — E = V_gap * I_peak * t
... [+4155 chars truncated]

### User | 2026-05-26T15:07:17.616Z

[tool_result] Command running in background with ID: brwtq8ywu. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\d63af58b-aaae-45fd-bf3d-c0a2aec5aca0\tasks\brwtq8ywu.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-26T15:07:26.156Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:07:30.311Z

[tool_use: Grep]

### Assistant | 2026-05-26T15:07:31.347Z

[tool_use: Grep]

### User | 2026-05-26T15:07:51.642Z

[tool_result] mcp-server\src\tools\dispatchers\cadDispatcher.ts:2
mcp-server\src\tools\dispatchers\edmDispatcher.ts:9
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:4
mcp-server\src\tools\dispatchers\camDispatcher.ts:17
mcp-server\src\tools\dispatchers\millDispatcher.ts:136
mcp-server\src\tools\dispatchers\dataDispatcher.ts:2
mcp-server\src\tools\dispatchers\shopPracticeDispatcher.ts:6
mcp-server\src
... [+87 chars truncated]

### User | 2026-05-26T15:07:51.911Z

[tool_result] mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:2922:      case "lora_drift_check_all_clear": {
mcp-server\src\tools\dispatchers\millDispatcher.ts:475:  "mill_lora_cadence_should_trigger",
mcp-server\src\tools\dispatchers\millDispatcher.ts:483:  "mill_lora_cadence_active_version",
mcp-server\src\tools\dispatchers\millDispatcher.ts:484:  "mill_lora_cadence_active_versions_all_axes",
mcp-s
... [+773 chars truncated]

### User | 2026-05-26T15:13:07.621Z

[tool_result] Command running in background with ID: b6q8t148t. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\d63af58b-aaae-45fd-bf3d-c0a2aec5aca0\tasks\b6q8t148t.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-26T15:13:11.788Z

I have enough evidence. Let me check drift state and synthesize the findings.

### Assistant | 2026-05-26T15:13:13.302Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:13:14.884Z

[tool_use: Bash]

### Assistant | 2026-05-26T15:13:16.292Z

[tool_use: Grep]

### User | 2026-05-26T15:14:09.161Z

[tool_result] Found 2 files
knowledge\memories\reference\reference_kilo_reorient_2026_05_26.md
knowledge\memories\reference\reference_cam_ai_training_ms0_5system_2026_05_26.md

### User | 2026-05-26T15:19:23.617Z

[tool_result] Command running in background with ID: bh32r5r3t. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\d63af58b-aaae-45fd-bf3d-c0a2aec5aca0\tasks\bh32r5r3t.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-26T15:19:23.635Z

[tool_result] Command running in background with ID: bqpst905s. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\d63af58b-aaae-45fd-bf3d-c0a2aec5aca0\tasks\bqpst905s.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-26T15:19:27.830Z

I have enough evidence to write the findings. Let me check the CAM-AI-TRAINING reference for context, then write the report.

### Assistant | 2026-05-26T15:19:28.841Z

[tool_use: Read]

### Assistant | 2026-05-26T15:19:30.616Z

[tool_use: Bash]

### User | 2026-05-26T15:20:05.525Z

[tool_result] 1	---
2	name: reference-cam-ai-training-ms0-5system-2026-05-26
3	description: "CAM-AI-TRAINING-MS0 closeout — 5-system catalog (141 templates), 3766-tuple MASTER LoRA training set across 8 tracks (template + physics + param + cross-system + ISO 286 + finish + coolant + operator-gate), 100% real-data provenance, 29/29 integration tests, train/holdout split stratified."
4	type: reference
5	source: p
... [+2308 chars truncated]

### User | 2026-05-26T15:24:17.579Z

[tool_result] H:/prism/mcp-server/data/state/appdata-junction-drift.jsonl
H:/prism/mcp-server/data/state/CAM_ML_DRIFT_LOG.jsonl
H:/prism/mcp-server/data/state/dotclaude-junctions-drift.jsonl
H:/prism/mcp-server/data/state/portable-node-drift.jsonl
H:/prism/mcp-server/data/state/portable-python-drift.jsonl
---
H:/prism/mcp-server/data/state/lathe-engine-registry.json
H:/prism/mcp-server/data/state/LATHE_AI_FULL_
... [+1021 chars truncated]

### Assistant | 2026-05-26T15:24:23.545Z

Got it. Now I have enough evidence. Let me check the LATHE_AI_TRAINING_REPORT briefly, then write the report.

### Assistant | 2026-05-26T15:24:25.651Z

[tool_use: Bash]

### User | 2026-05-26T15:30:07.643Z

[tool_result] Command running in background with ID: bqbmknfiq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\d63af58b-aaae-45fd-bf3d-c0a2aec5aca0\tasks\bqbmknfiq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-26T15:30:12.572Z

[tool_use: Read]

### Assistant | 2026-05-26T15:30:13.109Z

[tool_use: Read]

### Assistant | 2026-05-26T15:30:13.736Z

[tool_use: Read]

### User | 2026-05-26T15:30:31.091Z

[tool_result] 1	{"schemaVersion":1,"run_id":"drift-mo8y9j6u-k7ro","run_at":"2026-04-21T18:21:07.302Z","test_set_size":15,"test_set_customers":13,"evals":[{"target":"spindle_rpm_midpoint","model_kind":"bayesian","n_samples":8,"mae":154.28593395529916,"rmse":212.99741656859143},{"target":"feed_mm_min_midpoint","model_kind":"bayesian","n_samples":0,"mae":null,"rmse":null}],"alerts":[],"summary":{"n_evals":2,"n_ale
... [+54 chars truncated]

### User | 2026-05-26T15:30:31.099Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "id": "LATHE-LORA-MS0",
4	  "title": "LatheLoRA Fine-Tuning Pipeline with Deep AI Integration",
5	  "track": "AI-LATHE",
6	  "version": "1.0.0",
7	  "created_at": "2026-04-18T18:00:00Z",
8	  "status": "in_progress",
9	  "total_units": 50,
10	  "completed_units": 23,
11	  "sessions": 19,
12	  "estimated_hours": "24-32",
13	  "complexity": "XL",
14	  "description": "C
... [+1224 chars truncated]

### User | 2026-05-26T15:30:31.151Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "_lastBackfillTs": "2026-05-08T16:41:54.025Z",
4	  "timestamp": "2026-04-15T12:38:33.262Z",
5	  "archivePath": "H:/PRISM/JM DIE/CNC LATHE",
6	  "version": "1.0.0",
7	  "totalProgramsFound": 16558,
8	  "programsParsed": 16558,
9	  "programsAnalyzed": 16558,
10	  "parseErrors": 0,
11	  "totalTimeMs": 7684,
12	  "avgTimePerProgramMs": 0.46406570841889117,
13	  "a
... [+367 chars truncated]

### Assistant | 2026-05-26T15:30:35.793Z

Now I have all evidence. Let me write the audit report.

### Assistant | 2026-05-26T15:32:04.983Z

[tool_use: Write]

### User | 2026-05-26T15:33:00.152Z

[tool_result] File created successfully at: H:/prism/state/shared/audit-2026-05-26-india/02-lora-substrate.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-26T15:33:16.181Z

Report written. Returning the ≤200-word summary.

---

# LoRA Substrate Audit — slot india findings (≤200 words)

Report: `H:/prism/state/shared/audit-2026-05-26-india/02-lora-substrate.md`

**3 highest-leverage findings (Karpathy R12 — fail loud):**

1. **~245 LoRA dispatcher actions exist; runtime is empty.** Turning(71) + Mill(~80) + CAM(17) + EDM(9) + aiReasoning(8) + ShopPractice(6) + Data(4) + CAD(4) span cadence/drift/deploy/ensemble/embedding/experiment/monitoring/tribal-augmenter/master-orch. ZERO adapters have ever entered shadow→canary→active. `WEDM_LORA_CHECKPOINT.json`: `status:"not_trained", samples:0, deployed:false`. `LATHE-LORA-MS0.json`: 23/50 units, no shipped adapter.

2. **`lora_drift_check_all_clear` returns "clear" vacuously.** Sole drift evaluation: `CAM_ML_DRIFT_LOG.jsonl` — single line, 2026-04-21, 15-sample Bayesian eval. `CAMFeedbackLoopEngine.recordOutcome` does NOT emit `lora_drift_record`, so the coordinator has nothing to detect. Clear ≠ actually clear.

3. **The one real corpus (CAM-AI-TRAINING-MS0, 3766 tuples shipped kilo 5/26) has no consumer wired.** Stratified 3206/560 split sitting in `cam-master-split-summary.json` with no train.mjs reading it.

**Article incorporation (Layer-4 dreaming + CAG):** 4 concrete india units — `mill-lora-nightly-consolidator.mjs` (Layer-4 sleeper firing `mill_lora_cadence_should_trigger`), `wedm-lora-trainer-wire.mjs`, `lora-drift-monitor-real.mjs` (closes vacuous-clear), `lora-master-corpus-trainer.mjs` (8 per-track adapters from CAM-AI MASTER set). All emit NEW-file shadow tier + review-gate promotion; none overwrite.
