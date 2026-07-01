---
type: "chat-session"
source: "claude-code-cli"
session_id: "1981bb83-0e76-4058-af8a-a99dd99987be"
title: "Per-file scrutiny review of a NEW safety-critical engine that drives a real 5-ax"
date: "2026-05-31"
first_ts: "2026-05-31T06:28:59.838Z"
last_ts: "2026-05-31T06:32:11.110Z"
cwd: "H:\\prism-slot-kilo\\mcp-server"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/agent-a1816ed42afb00978.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:59"
---

# Per-file scrutiny review of a NEW safety-critical engine that drives a real 5-ax

> **claude-code-cli** | 2026-05-31 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism-slot-kilo\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-kilo/1981bb83-0e76-4058-af8a-a99dd99987be/subagents/agent-a1816ed42afb00978.jsonl`

## Transcript

### User | 2026-05-31T06:28:59.838Z

Per-file scrutiny review of a NEW safety-critical engine that drives a real 5-axis CNC machine. Read these two files END TO END:
- H:/prism-slot-kilo/mcp-server/src/engines/CAMDriveRecipeEngine.ts
- H:/prism-slot-kilo/mcp-server/src/__tests__/CAMDriveRecipeEngine.test.ts

Context: this engine compiles a parameterized CAM-drive "recipe" (validated by mcp-server/src/schemas/camDriveRecipeSchema.ts) into Fusion-360 calls by evaluating deterministic "decision rules" against a live geometry probe, then EXECUTES the steps via INJECTED deps (deps.callDispatcher / deps.bridgeRequest / deps.gate). It is the autonomous-replay executor for CAM programs. Spec: H:/prism-slot-kilo/state/shared/cam-drive/CAMDRIVE-RECIPE-ENGINE-SPEC.md. The decision-rule registry it consumes: H:/prism-slot-kilo/state/shared/cam-drive/decision-rules.json. The recipe it replays: H:/prism-slot-kilo/state/shared/cam-drive/recipes/UPSET_OP1_5AX_2026-05-31.json.

15/15 vitest cases currently pass. Scrutinize for issues the tests might miss. Flag P0 (correctness/safety bug — wrong actuation, gate bypassable, silent failure, NaN/units error) and P1 (logic/robustness gap). Specifically verify:
1. SAFETY: can any code path ACTUATE (call dispatcher/bridge) without the gate clearing when gate.required=true? Is the gate checked before EVERY actuating step? Could a malformed step skip the gate?
2. The placeholder resolver (resolveTemplate/getPath): prototype-pollution risk, undefined-token handling, embedded vs pure-token correctness.
3. The pure rule math (place.center_bbox, seat_bottom_riser, parting.geometry_driven, stock.oversize, wcs.stock_bottom_center, tool.rank_costeff_mrr): correctness, NaN/Infinity/empty-input guards, off-by-one, the parting strict-inside-bbox bound.
4. onFail policies: are abort/retry/gate_to_operator/skip_if_optional all handled? Is 'retry' actually implemented or silently treated as abort (the schema allows it)?
5. Any inlined physics constants (must be NONE — feeds delegate to disp
... [+311 chars truncated]

### Assistant | 2026-05-31T06:29:24.988Z

I'll read both files end to end, plus the supporting spec and data files to verify the engine against its contract.

### Assistant | 2026-05-31T06:29:25.945Z

[tool_use: Read]

### Assistant | 2026-05-31T06:29:26.339Z

[tool_use: Read]

### User | 2026-05-31T06:29:54.144Z

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
... [+22593 chars truncated]

### User | 2026-05-31T06:29:54.887Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import {
3	  CAMDriveRecipeEngine,
4	  type CamDriveDeps,
5	  type LiveProbe,
6	  type ToolCandidate,
7	} from "../engines/CAMDriveRecipeEngine.js";
8	import type { CamDriveRecipe, CamDriveDecisionRules } from "../schemas/camDriveRecipeSchema.js";
9	
10	// ── fixtures ────────────────────────────────────────────────────────────────
11	
12	const PR
... [+15025 chars truncated]

### Assistant | 2026-05-31T06:29:58.268Z

Now let me read the schema and the supporting data files to verify the engine against its actual contract.

### Assistant | 2026-05-31T06:29:58.764Z

[tool_use: Read]

### Assistant | 2026-05-31T06:29:59.152Z

[tool_use: Read]

### User | 2026-05-31T06:30:35.983Z

[tool_result] 1	import { z } from "zod";
2	
3	/**
4	 * CAM-DRIVE RECIPE SCHEMA (CAMDRIVE-RECIPE-ENGINE-MS0)
5	 *
6	 * Zod v4 contract for the autonomous CAM-drive replay artifacts:
7	 *  - a parameterized RECIPE (state/shared/cam-drive/recipes/<id>.json) the
8	 *    CAMDriveRecipeEngine compiles + executes with ZERO LLM, and
9	 *  - the DECISION-RULE REGISTRY (state/shared/cam-drive/decision-rules.json)
10	 *  
... [+10457 chars truncated]

### User | 2026-05-31T06:30:36.578Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedAt": "2026-05-31",
4	  "advisoryOnly": false,
5	  "mustHumanVerify": true,
6	  "author": "kilo (CAM)",
7	  "purpose": "Decision-rule registry for autonomous CAM-drive replay. Every judgment call a human/Claude makes while driving Fusion 360 CAM is encoded here as a DETERMINISTIC rule (closed-form formula | ranked argmax | decision-table | threshold-w
... [+8645 chars truncated]

### Assistant | 2026-05-31T06:30:40.753Z

Now let me read the recipe being replayed and the spec to verify against the real contract, especially around the gate semantics for `post` steps and `parting` strict-inside-bbox bound.

### Assistant | 2026-05-31T06:30:41.719Z

[tool_use: Read]

### Assistant | 2026-05-31T06:30:42.304Z

[tool_use: Read]

### User | 2026-05-31T06:30:59.022Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "recipeId": "UPSET_OP1_5AX_2026-05-31",
4	  "generatedAt": "2026-05-31",
5	  "advisoryOnly": false,
6	  "mustHumanVerify": true,
7	  "author": "kilo (CAM)",
8	  "source": { "kind": "live-capture", "ref": "state/shared/cam-drive/OP1-SETUP-PROGRESS.md + this session against PRISM_Fusion_Drive :18365" },
9	  "units": "inch",
10	  "bridgeUrl": "http://127.0.0.1:18
... [+14615 chars truncated]

### User | 2026-05-31T06:30:59.040Z

[tool_result] 1	# CAMDriveRecipeEngine — autonomous CAM-drive replay (executor build spec)
2	
3	**Status:** foundation data shipped (decision-rules.json + recipe + trace); EXECUTOR pending — next unit `CAMDRIVE-RECIPE-ENGINE-MS0`.
4	**Source:** workflow `cam-drive-automation-map` (5-agent discovery + design, 2026-05-31). This spec persists that design.
5	**Principle:** wire into EXISTING PRISM infra — NO parall
... [+4161 chars truncated]

### Assistant | 2026-05-31T06:32:11.110Z

I now have the full contract. I found a critical safety issue in the gate path. Let me verify the exact behavior on the `safety_validate` step (step 16) and the `verify` undefined-handling path, plus the gate-vs-actuation ordering for steps where `gate.required` is absent vs false.

Let me re-examine the gate semantics carefully against the recipe. Step 16 (`safety_validate`) and step 17 (`post`) both have `gate.required=true`. Step 6-14 (`op_create`) all have `gate.required=true`. But critically — let me trace whether a step with NO `gate` block (like steps 1-4, the bridge `part_insert`/`stock_generate`) actuates without a gate, which is by design. The real issue is different. Let me check the `verify` failure path when `res` from the gate-cleared dispatcher is malformed, and the retry policy.

I have enough to render findings. Let me do a final targeted check on one math edge: whether `Date.parse` of an ISO string in `stampLatency` and the outcome `gateBlocks` counter are consistent with the `gate_to_operator` status.

Looking at line 249: `gateBlocks: results.filter((r) => r.status === "aborted").length` — but a `gate_to_operator` failure sets status `"gated"`, not `"aborted"`. And a hard gate-block sets `"aborted"`. That's a semantic question but not a safety bug. The real safety findings are below.

## Findings

**P0 — `retry` onFail policy is silently treated as `abort` (schema allows it; spec & recipe USE it).**
`CAMDriveRecipeEngine.ts:219-236`. The `onFail` handler only branches on `skip_if_optional`, `gate_to_operator`, and an `else` (treated as `failed`/abort). The schema enum (`camDriveRecipeSchema.ts:92`) includes `"retry"` with `maxRetries`, and the **real recipe uses it**: step 2 `doc_saveas` and step 15 `toolpath_generate` both declare `{ "policy": "retry", "maxRetries": 1 }`. On a transient bridge failure (e.g. async cloud-ref resolve, the 180 s toolpath job) the engine aborts the entire run instead of retrying. This is a silent failure-mode mismatc
... [+10135 chars truncated]
