---
type: "chat-session"
source: "claude-code-cli"
session_id: "0f3a0c22-434c-4b12-9967-54ebbcb52788"
title: "Reviewer C (analyst — silent breakage, regression, integration coupling, resourc"
date: "2026-05-29"
first_ts: "2026-05-29T15:03:05.169Z"
last_ts: "2026-05-29T15:07:38.306Z"
cwd: "H:\\prism-slot-foxtrot"
messages: 43
user_msgs: 17
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-ac8db706807545727.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:45"
---

# Reviewer C (analyst — silent breakage, regression, integration coupling, resourc

> **claude-code-cli** | 2026-05-29 | 43 msgs (17 user / 26 assistant) | cwd: H:\prism-slot-foxtrot
> Raw: `H:/.claude/projects/H--prism-slot-foxtrot/0f3a0c22-434c-4b12-9967-54ebbcb52788/subagents/agent-ac8db706807545727.jsonl`

## Transcript

### User | 2026-05-29T15:03:05.169Z

Reviewer C (analyst — silent breakage, regression, integration coupling, resource safety) for PRISM. Do NOT assume A/B caught anything. Commit 83f3f986d7 in H:/prism-slot-foxtrot adds 2 actions to the prism_mill dispatcher (millDispatcher.ts) + Zod schemas + a WIRE-EXEMPT tag.

Read mcp-server/src/tools/dispatchers/millDispatcher.ts (the diff region), mcp-server/src/schemas/millActionSchemas.ts (new schemas), mcp-server/src/engines/MillingLoRADatasetBuilderEngine.ts + its base mcp-server/src/engines/MachineLoRABaseEngine.*.

Your weighting:
1. **No regression to existing prism_mill actions** — does the new lazy-import var / enum insert / case insert disturb any existing case? (e.g., accidental fallthrough, duplicate case label, enum ordering breaking a count test.) Check `command grep -n "mill_lora" mcp-server/src/tools/dispatchers/millDispatcher.ts`.
2. **Resource safety** — mill_lora_dataset_build takes a `jobs` array and builds a dataset. Is there ANY unbounded-input risk (huge jobs array → OOM)? Is the dispatcher param-normalization safe if jobs is missing/null/not-an-array? Does the case guard it before calling buildDataset?
3. **Schema correctness** — does the Zod schema for jobs faithfully encode RawJob (features: record, actual: record)? Would a malformed job slip through to the engine and throw an uncaught error (vs being dropped by validate())?
4. **WIRE-EXEMPT soundness** — is MillTurnLoRADatasetBuilderEngine genuinely reachable via MillTurnOrchestrationEngine, and is THAT orchestrator actually wired (millDispatcher case "mill_turn")? If the orchestrator only imports the type but never calls the builder, the exemption is FALSE. Verify: `command grep -n "LoRADataset\|lora" mcp-server/src/engines/MillTurnOrchestrationEngine.ts`.
5. **Audit-script edit** — the WIRE-EXEMPT honoring in mill-wiring-audit.mjs reads each unwired engine file; is that bounded + fail-soft?

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: P0/P1, then ≤5 notes. If
... [+14 chars truncated]

### Assistant | 2026-05-29T15:03:14.180Z

I'll review commit 83f3f986d7 against the five weighted criteria. Let me read the relevant files first.

### Assistant | 2026-05-29T15:03:14.933Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:03:16.136Z

[tool_use: Bash]

### User | 2026-05-29T15:03:21.234Z

[tool_result] commit 83f3f986d7325878bcec29b69d5ef370c23528e1
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri May 29 10:02:13 2026 -0500

    [foxtrot] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-FOXTROT-WIRE-LORA: wire MillingLoRADatasetBuilderEngine to prism_mill (maximize HIGH-ROI unwired node)
    
    Closes the gate's 'don't defer the maximize' — actually wires the HIGH-ROI unwired nodes the
... [+1538 chars truncated]

### User | 2026-05-29T15:03:24.385Z

[tool_result] 83f3f986d7 [foxtrot] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-FOXTROT-WIRE-LORA: wire MillingLoRADatasetBuilderEngine to prism_mill (maximize HIGH-ROI unwired node) (69 seconds ago) <markjvillanueva3-cloud>
mcp-server/src/schemas/millActionSchemas.ts        | 46 ++++++++++++++++++++++
 mcp-server/src/tools/dispatchers/millDispatcher.ts | 21 ++++++++++
 2 files changed, 67 insertions(+)

mcp-server/src/sc
... [+4718 chars truncated]

### Assistant | 2026-05-29T15:03:26.843Z

Now let me read the engine, its base, the orchestrator, and the audit script.

### Assistant | 2026-05-29T15:03:28.358Z

[tool_use: Read]

### Assistant | 2026-05-29T15:03:28.556Z

[tool_use: Read]

### User | 2026-05-29T15:03:29.351Z

[tool_result] read-once-guard: 'H:\prism-slot-foxtrot\mcp-server\src\engines\MillingLoRADatasetBuilderEngine.ts' was already read 21s ago in this session and is unchanged (mtime 1778853296212). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (
... [+28 chars truncated]

### User | 2026-05-29T15:03:29.614Z

[tool_result] read-once-guard: 'H:\prism-slot-foxtrot\mcp-server\src\engines\MachineLoRABaseEngine.ts' was already read 13s ago in this session and is unchanged (mtime 1778853295793). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: P
... [+18 chars truncated]

### Assistant | 2026-05-29T15:03:32.242Z

The read-once-guard says these were already read in this session, but I don't have them in my context (this is a fresh review thread). Let me bypass the cache.

### Assistant | 2026-05-29T15:03:33.129Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:03:34.124Z

[tool_use: Bash]

### User | 2026-05-29T15:03:43.780Z

[tool_result]   1 │ /**
  2 │  * MillingLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL01
  3 │  * =================================================================
  4 │  *
  5 │  * Builds LoRA fine-tuning datasets for milling operations by wrapping
  6 │  * {@link BaseLoRADatasetBuilder} with a milling-specific render function
  7 │  * and validation policy.
  8 │  *
  9 │  * INPUT: RawJob records so
... [+4232 chars truncated]

### User | 2026-05-29T15:03:59.954Z

[tool_result]   1 │ /**
  2 │  * MachineLoRABaseEngine — shared foundation for per-machine LoRA pipelines
  3 │  * ========================================================================
  4 │  *
  5 │  * CAM-ML-CLOSEDLOOP-MS0 foundation. Extracted from the production Lathe
  6 │  * LoRA pattern (49 engines) so that the 8 machine-type pipelines
  7 │  * (milling, 5-axis, mill-turn, WEDM, sinker EDM, laser, wat
... [+21608 chars truncated]

### Assistant | 2026-05-29T15:04:04.188Z

Now I have the engine and base. The base builder is bounded — it iterates `jobs` once, no recursion, no exponential blowup. Let me verify the regression checks (criterion 1), the orchestrator wiring (criterion 4), and the audit script (criterion 5).

### Assistant | 2026-05-29T15:04:05.792Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:04:06.551Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:04:07.677Z

[tool_use: Bash]

### User | 2026-05-29T15:04:46.048Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
12 matches in 5 files:

52:0:any;
862:0:{
886:0:{
893:0:{
mcp-server/src/tools/dispatchers/millDispatcher.ts:264:"mill_lora_cadence_state",           // MillingLoRACadenceEngine.getState
mcp-server/src/tools/dispatchers/millDispatcher.ts:268:"mill_lora_dataset_build",           // MillingLoRADatasetBui
... [+774 chars truncated]

### User | 2026-05-29T15:04:46.567Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
7 matches in 4 files:

862:0:{
886:0:{
893:0:{
mcp-server/src/tools/dispatchers/millDispatcher.ts:264:"mill_lora_cadence_state",           // MillingLoRACadenceEngine.getState
mcp-server/src/tools/dispatchers/millDispatcher.ts:268:"mill_lora_dataset_build",           // MillingLoRADatasetBuilderEngine.
... [+292 chars truncated]

### User | 2026-05-29T15:04:46.828Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
2 matches in 1 files:

mcp-server/.../engines/MillTurnOrchestrationEngine.ts:7:*   - MillTurnLoRACadenceEngine [EXISTS]
mcp-server/.../engines/MillTurnOrchestrationEngine.ts:8:*   - MillTurnLoRADatasetBuilderEngine [EXISTS]

### Assistant | 2026-05-29T15:04:51.261Z

The grep output is partially scrambled by RTK. The MillTurnOrchestrationEngine only references `MillTurnLoRADatasetBuilderEngine [EXISTS]` in a doc comment — this is a critical signal for criterion 4. The two LoRA-related lines are both in a comment block, not actual code calls. Let me verify this rigorously, and check the case-label uniqueness and the audit script. Let me bypass RTK with `command` properly and use raw node.

### Assistant | 2026-05-29T15:04:53.174Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:04:54.632Z

[tool_use: Bash]

### User | 2026-05-29T15:05:02.350Z

[tool_result] 8: *   - MillTurnLoRADatasetBuilderEngine [EXISTS]

### User | 2026-05-29T15:05:04.571Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
3 matches in 1 files:

mcp-server/.../engines/MillTurnOrchestrationEngine.ts:25:import { log } from "../utils/Logger.js";
mcp-server/.../engines/MillTurnOrchestrationEngine.ts:156:mod = await import(route.module_path);
mcp-server/.../engines/MillTurnOrchestrationEngine.ts:225:const mod = await import(r
... [+18 chars truncated]

### Assistant | 2026-05-29T15:05:08.642Z

This is a key finding. `MillTurnOrchestrationEngine` only mentions `MillTurnLoRADatasetBuilderEngine` in a doc comment (line 8) — it does NOT statically import it. It uses dynamic `await import(route.module_path)`. The reachability depends on whether a route's `module_path` points to the LoRA dataset builder. Let me examine the orchestrator's routing table to verify whether the LoRA dataset builder is genuinely reached.

### Assistant | 2026-05-29T15:05:09.328Z

[tool_use: Read]

### User | 2026-05-29T15:05:11.131Z

[tool_result] 1	/**
2	 * MillTurnOrchestrationEngine — L2 Mill-Turn Aggregator
3	 * ======================================================
4	 * Single entry point for mill-turn operations. Wraps:
5	 *   - MillTurnCAMEngine (CAM operations for mill-turn)
6	 *   - MillTurnSwissPipelineEngine (Swiss-type lathes)
7	 *   - MillTurnLoRACadenceEngine [EXISTS]
8	 *   - MillTurnLoRADatasetBuilderEngine [EXISTS]
9	 *
10	
... [+8232 chars truncated]

### Assistant | 2026-05-29T15:05:18.427Z

This is the decisive finding for criterion 4. The WIRE-EXEMPT claim is **FALSE**.

`MillTurnOrchestrationEngine`'s routing table (lines 85-122) has exactly 6 routes: `cam_generate`, `swiss_pipeline`, `sub_spindle`, `live_tool`, `multi_channel`, `bar_feeder`. Every one points to either `MillTurnCAMEngine` or `MillTurnSwissPipelineEngine`. **None routes to `MillTurnLoRADatasetBuilderEngine`.** The only mention of it anywhere in the orchestrator is a stale doc comment on line 8 (`MillTurnLoRADatasetBuilderEngine [EXISTS]`). The orchestrator neither imports it nor invokes it.

Let me read the WIRE-EXEMPT tag that was added and the audit-script change to assess criteria 4 and 5.

### Assistant | 2026-05-29T15:05:19.819Z

[tool_use: Bash]

### User | 2026-05-29T15:05:40.692Z

[tool_result] 83f3f986d7 [foxtrot] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-FOXTROT-WIRE-LORA: wire MillingLoRADatasetBuilderEngine to prism_mill (maximize HIGH-ROI unwired node) (3 minutes ago) <markjvillanueva3-cloud>
mcp-server/src/engines/MillTurnLoRADatasetBuilderEngine.ts | 2 ++
 scripts/mill-wiring-audit.mjs                              | 9 +++++++--
 2 files changed, 9 insertions(+), 2 deletions(-)

mcp-server
... [+1158 chars truncated]

### Assistant | 2026-05-29T15:05:48.682Z

The WIRE-EXEMPT tag's stated justification is verifiably false: *"reached via millTurnOrchestrationEngine (wired in millDispatcher loadEngine case "mill_turn"); not a direct dispatcher action."* But the orchestrator's route table never routes to the dataset builder. Let me confirm two more things: (a) that the dispatcher's `mill_turn` case does indeed wire the orchestrator (so I can characterize the gap precisely), and (b) verify the audit script's `readFileSync` import and bounds.

### Assistant | 2026-05-29T15:05:50.103Z

[tool_use: Bash]

### Assistant | 2026-05-29T15:05:50.934Z

[tool_use: Bash]

### User | 2026-05-29T15:06:29.996Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
5 matches in 3 files:

113:0:
576:0:{
mcp-server/src/tools/dispatchers/millDispatcher.ts:114:return _millTurn ??= (await import("../../engines/MillTurnOrchestrationEngine...
mcp-server/src/tools/dispatchers/millDispatcher.ts:211:"mill_turn_orchestrate",
mcp-server/src/tools/dispatchers/millDispatcher.t
... [+50 chars truncated]

### User | 2026-05-29T15:06:30.032Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
11 matches in 4 files:

30:0:fs";
31:0:url";
32:0:path";
scripts/mill-wiring-audit.mjs:34:const __dirname = dirname(fileURLToPath(import.meta.url));
scripts/mill-wiring-audit.mjs:36:const ENGINES_DIR = resolve(ROOT, "mcp-server/src/engines");
scripts/mill-wiring-audit.mjs:55:try { files = readdirSync(D
... [+624 chars truncated]

### Assistant | 2026-05-29T15:06:52.859Z

Confirmed. The dispatcher's `mill_turn` case (line 577) does wire `millTurnOrchestrationEngine`, but the orchestrator routes only to `MillTurnCAMEngine` / `MillTurnSwissPipelineEngine` — never to the LoRA dataset builder. So the chain that the WIRE-EXEMPT tag claims (`dispatcher → orchestrator → MillTurnLoRADatasetBuilderEngine`) is broken at the orchestrator hop. The exemption is unsound.

Let me read the audit script region around the change to confirm fail-soft + bounds (criterion 5), and confirm `readFileSync` is imported.

### Assistant | 2026-05-29T15:06:53.716Z

[tool_use: Read]

### User | 2026-05-29T15:06:56.577Z

[tool_result] 28	// (a name match is necessary, not sufficient — confirm the action enum too).
29	
30	import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
31	import { fileURLToPath } from "node:url";
32	import { dirname, resolve, join } from "node:path";
33	
34	const __dirname = dirname(fileURLToPath(import.meta.url));
35	const ROOT = resolve(__dirname, "..");
36	const ENGINES_DIR = r
... [+3621 chars truncated]

### Assistant | 2026-05-29T15:07:38.306Z

I now have everything needed. Let me assess the audit-script change for criteria 5 and confirm the remaining points.

The audit script change (criterion 5): the `readFileSync` on line 102 is bounded — it only fires for engines that did NOT already hit on name-match (`if (!hit)`), reads a single file's full content once (no recursion, files are mill-engine `.ts` source, KB-scale), and is wrapped in `try/catch { fail-soft }`. So it is bounded and fail-soft. **However**, there is a correctness regression here: the WIRE-EXEMPT check matches the literal string `WIRE-EXEMPT` *anywhere in the engine file*. Any mill engine that merely mentions `WIRE-EXEMPT` in a comment, doc, or string — or that has a legitimate-but-different exemption — is now auto-counted as "wired" with **no verification that the exemption is actually sound**. The audit script became a rubber-stamp for any file containing that token, which is exactly how this commit's false exemption passes its own audit (the commit message proudly reports "mill wiring 87%→90%" using this very loosened check).

Let me verify the resource-safety / schema-correctness points are fully nailed before writing the verdict. The schema's `actual` is `z.record(z.string(), z.unknown())` — it does NOT enforce `rpm`/`feed_mm_min > 0`; that's only in the prose `.describe()`. But the engine's `validate()` drops such jobs (returns non-null reason → `continue`), so a malformed job is dropped, not thrown. Let me double check there's no uncaught-throw path in `render` for a job that passes `validate`.

Validate requires the 4 feature keys be non-empty and rpm/feed be positive finite numbers. `render` calls `String(job.features.x)` for the 4 required keys (all guaranteed present by validate) and `JSON.stringify(sortKeys(...))`. `sortKeys` iterates `Object.keys`. No throw path for a validated job. For resource safety: `buildDataset(p.jobs, p.split)` — the case guards `Array.isArray(p.jobs)` before calling. The build loop is O(n) over jobs, s
... [+4796 chars truncated]
