---
type: "chat-session"
source: "claude-code-cli"
session_id: "91f8b002-8bb7-404b-967b-339123ceeab0"
title: "PER-FILE SCRUTINY — review the dispatcher wiring for WIRE-INTAMP-MS0/U-WIRE-INTA"
date: "2026-05-17"
first_ts: "2026-05-17T22:45:01.405Z"
last_ts: "2026-05-17T22:46:15.367Z"
cwd: "H:\\prism\\mcp-server"
messages: 26
user_msgs: 10
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/91f8b002-8bb7-404b-967b-339123ceeab0/subagents/agent-ae30c752e5e966433.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# PER-FILE SCRUTINY — review the dispatcher wiring for WIRE-INTAMP-MS0/U-WIRE-INTA

> **claude-code-cli** | 2026-05-17 | 26 msgs (10 user / 16 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/91f8b002-8bb7-404b-967b-339123ceeab0/subagents/agent-ae30c752e5e966433.jsonl`

## Transcript

### User | 2026-05-17T22:45:01.405Z

PER-FILE SCRUTINY — review the dispatcher wiring for WIRE-INTAMP-MS0/U-WIRE-INTAMP. Slot foxtrot just wired IntelligenceAmplificationEngine into prism_intelligence via 3 actions: `ia_amplify`, `ia_get_source`, `ia_list_sources`.

**Scope — read these files end-to-end:**
1. H:/prism/mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts (focus: the 3 edits around lines ~30, ~64-65, ~234, ~1874)
2. H:/prism/mcp-server/src/engines/IntelligenceAmplificationEngine.ts (focus: the new `intelligenceAmplificationDispatch` function appended at end of file)
3. H:/prism/mcp-server/src/schemas/intelligenceActionSchemas.ts (focus: 3 new schemas + the merge into ACTION_INTELLIGENCE_SCHEMAS)

**Verify the wiring contract:**
- Action names in the `INTELLIGENCE_CORE_ACTIONS` z.enum match `CORE_ROUTING` keys match `intelligenceAmplificationDispatch` switch cases match the schemas registered in `ACTION_INTELLIGENCE_SCHEMAS` — all 4 surfaces in lock-step.
- The lazy-import `getEngine("intelligenceAmplification")` resolves to the exported `intelligenceAmplificationDispatch` function (not the singleton itself).
- Cache variable `_intelligenceAmplification` is declared in the let-block.
- No collision with existing action names (`ia_*` prefix is unique).
- Schema for `ia_amplify` does NOT use `z.any()`; uses real Zod types.
- Action enum uses snake_case (rules/dispatchers.md).
- Engine uses `(action, params)` signature compatible with the dispatcher's `await engine(action, params)` call site.

**P0/P1 issues to look for:**
- Action present in z.enum but missing from CORE_ROUTING (silent route to default IntelligenceEngine → error)
- Schema present but not exported in ACTION_INTELLIGENCE_SCHEMAS
- Engine method signature mismatch with dispatcher contract
- Missing `passthrough()` causing strict-mode rejection
- Wrong import path / wrong export name

Return a clear PASS or FAIL verdict with severity-rated findings. Keep under 400 words. The 19-case test file (H:/prism/mcp-server/src/__te
... [+146 chars truncated]

### Assistant | 2026-05-17T22:45:04.810Z

I'll read all four files in parallel to verify the wiring contract end-to-end.

### Assistant | 2026-05-17T22:45:05.250Z

[tool_use: Read]

### Assistant | 2026-05-17T22:45:05.625Z

[tool_use: Read]

### Assistant | 2026-05-17T22:45:05.908Z

[tool_use: Read]

### User | 2026-05-17T22:45:08.287Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32)
3	 *
4	 * Core intelligence: ~50 actions for compound manufacturing intelligence.
5	 * 200+ actions deprecated — forwarded to focused sub-dispatchers (SYS-MS1):
6	 *   prism_product (40), prism_machine_live (40), prism_integration (42),
7	 *   prism_knowledge_ext (40), prism_diagnosis (38)
8	 *
9	 * @milestone SYS-MS1-U05
10	 *
... [+10626 chars truncated]

### User | 2026-05-17T22:45:08.648Z

[tool_result] 1	/**
2	 * IntelligenceAmplificationEngine — Phase 0.24 U-INT5
3	 *
4	 * Amplifies AI capabilities by leveraging the full asset knowledge base.
5	 * Combines domain expertise, formulas, and learned patterns.
6	 *
7	 * @module engines/IntelligenceAmplificationEngine
8	 */
9	
10	import { log } from "../utils/Logger.js";
11	
12	export interface AmplificationContext {
13	  query: string;
14	  domain?:
... [+8992 chars truncated]

### User | 2026-05-17T22:45:08.804Z

[tool_result] 1	/**
2	 * Intelligence Dispatcher Action Schemas
3	 * =======================================
4	 * Per-action Zod schemas for all 49 core prism_intelligence actions.
5	 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
6	 *
7	 * @module schemas/intelligenceActionSchemas
8	 * @version 1.0.0
9	 */
10	
11	import { z } from "zod";
12	import type { ActionSchemaMap } from "./actionSchemaType
... [+37602 chars truncated]

### Assistant | 2026-05-17T22:45:13.293Z

Now I need to read the remaining dispatcher sections — the z.enum definition and the CORE_ROUTING map — to complete the 4-surface lock-step check.

### Assistant | 2026-05-17T22:45:13.559Z

[tool_use: Read]

### User | 2026-05-17T22:45:18.581Z

[tool_result] 100	    case "xprocPredLog": return _xprocPredLog ??= (await import("../../engines/ConformalPredictionLogEngine.js")).conformalPredictionLog;
101	    case "xprocMondrian": return _xprocMondrian ??= (await import("../../engines/CrossProcessMondrianClassificationEngine.js")).crossProcessMondrianClassification;
102	    case "xprocDeepEnsemble": return _xprocDeepEnsemble ??= (await import("../../engin
... [+10496 chars truncated]

### Assistant | 2026-05-17T22:45:22.980Z

I need to continue reading to get the rest of the enum, the CORE_ROUTING map, and the dispatch handler.

### Assistant | 2026-05-17T22:45:23.536Z

[tool_use: Read]

### User | 2026-05-17T22:45:25.677Z

[tool_result] 299	  "xproc_orchestrate_full",
300	  "xproc_orchestrate_brief",
301	  // XPROC-NEURAL Tier 8 (T8-02) — Rule-Extracted Neural Inference
302	  "xproc_extract_rules",
303	  "xproc_rule_explain_prediction",
304	  // XPROC-NEURAL Tier 8 (T8-04) — Formula-Neural Ensemble
305	  "xproc_blend_predict",
306	  "xproc_blend_weight_report",
307	  // XPROC-NEURAL Tier 2 (T2-01) — Episodic Memory (hierarchical 
... [+8320 chars truncated]

### Assistant | 2026-05-17T22:45:29.852Z

I need to find the CORE_ROUTING map and the main dispatch handler where `intelligenceAmplification` is routed.

### Assistant | 2026-05-17T22:45:30.800Z

[tool_use: Read]

### User | 2026-05-17T22:45:35.722Z

[tool_result] 499	  // XPROC-NEURAL-T1-04: LIME + ECE + L1 anomaly attention/explain
500	  "xproc_attention_explain", "xproc_attention_ece",
501	  "xproc_attention_baseline_add", "xproc_attention_anomaly",
502	  "xproc_attention_baseline_get", "xproc_attention_baseline_reset",
503	  // XPROC-NEURAL-T1-05: AGI bridge — keyword + neural blend composer
504	  "xproc_agi_compose",
505	  // XPROC-NEURAL-OPTIMIZE/U-NN
... [+10590 chars truncated]

### Assistant | 2026-05-17T22:45:39.000Z

I need to find the CORE_ROUTING map and the main dispatch switch that handles `ia_*` actions.

### Assistant | 2026-05-17T22:45:40.509Z

[tool_use: Grep]

### User | 2026-05-17T22:45:41.141Z

[tool_result] 27-let _intelligence: any, _jobLearning: any, _algorithmGateway: any, _shopScheduler: any,
28-    _intentEngine: any, _responseFormatter: any, _workflowChains: any, _onboardingEngine: any,
29-    _setupSheetEngine: any, _conversationalMemory: any, _userWorkflowSkills: any,
30:    _userAssistanceSkills: any, _intelligenceAmplification: any, _aiFeatureRegistry: any, _aiSystemRouter: any,
31-    _aut
... [+3203 chars truncated]

### Assistant | 2026-05-17T22:45:44.693Z

I now have all four surfaces. Let me also quickly verify the test file assumptions to confirm the contract alignment.

### Assistant | 2026-05-17T22:45:44.997Z

[tool_use: Read]

### User | 2026-05-17T22:45:45.715Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\IntelligenceAmplificationDispatch.test.ts' was already read 19s ago in this session and is unchanged (mtime 1779057806870). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disa
... [+24 chars truncated]

### Assistant | 2026-05-17T22:45:48.758Z

[tool_use: Grep]

### User | 2026-05-17T22:45:49.323Z

[tool_result] 2- * IntelligenceAmplificationDispatch wiring test — WIRE-INTAMP-MS0/U-WIRE-INTAMP
3- *
4: * Behavioral test asserting the engine is wired into prism_intelligence via the
5: * 3 dispatcher actions (ia_amplify, ia_get_source, ia_list_sources). Verifies:
6- *   - dispatcher adapter routes actions to the correct engine method
7- *   - schema rejects malformed input
--
14-import { describe, it, expect
... [+5638 chars truncated]

### Assistant | 2026-05-17T22:46:15.367Z

I now have complete visibility across all four surfaces. Here is the verdict.

---

**VERDICT: PASS**

All four surfaces are in lock-step. No P0 or P1 issues found. Detailed findings below.

---

**Surface 1 — `INTELLIGENCE_CORE_ACTIONS` z.enum array**
Lines 235-238 of `intelligenceDispatcher.ts`:
- `"ia_amplify"`, `"ia_get_source"`, `"ia_list_sources"` are all present.
- All three use snake_case. No collision with any existing `ia_*` prefix — grep confirms the prefix is unique to these three entries.

**Surface 2 — `CORE_ROUTING` map (lines 1878-1881)**
```
ia_amplify: "intelligenceAmplification",
ia_get_source: "intelligenceAmplification",
ia_list_sources: "intelligenceAmplification",
```
All three actions map to the `"intelligenceAmplification"` engine key. The dispatch path at line 2108-2110 is `CORE_ROUTING[action]` → `getEngine(engineName)(action, params)` — the `(action, params)` call signature matches the `intelligenceAmplificationDispatch(action: string, params: Record<string, unknown>)` signature exactly.

**Surface 3 — `getEngine("intelligenceAmplification")` (line 64)**
```
case "intelligenceAmplification":
  return _intelligenceAmplification ??= (await import("../../engines/IntelligenceAmplificationEngine.js")).intelligenceAmplificationDispatch;
```
- Cache variable `_intelligenceAmplification` is declared in the let-block at line 30. Present.
- Lazy import resolves the named export `intelligenceAmplificationDispatch`, not the singleton `intelligenceAmplificationEngine`. Correct — the dispatcher function is the exported callable, not the class instance.
- Import path `../../engines/IntelligenceAmplificationEngine.js` is correct relative to `src/tools/dispatchers/`.

**Surface 4 — `ACTION_INTELLIGENCE_SCHEMAS` (lines 824-827 of `intelligenceActionSchemas.ts`)**
- `ia_amplify`, `ia_get_source`, `ia_list_sources` are all registered in the export map under the `// IntelligenceAmplificationEngine (3)` comment block.
- `ia_amplify` uses `z.string().min(1)` fo
... [+1491 chars truncated]
