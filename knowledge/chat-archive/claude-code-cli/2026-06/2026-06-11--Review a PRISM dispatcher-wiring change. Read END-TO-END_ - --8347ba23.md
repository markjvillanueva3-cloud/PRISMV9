---
type: "chat-session"
source: "claude-code-cli"
session_id: "8347ba23-a479-47f7-8ee0-b6014bc5e610"
title: "Review a PRISM dispatcher-wiring change. Read END-TO-END: - H:/prism/mcp-server/"
date: "2026-06-11"
first_ts: "2026-06-11T20:12:37.757Z"
last_ts: "2026-06-11T20:13:53.894Z"
cwd: "H:\\prism-slot-bravo"
messages: 39
user_msgs: 14
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-af42519f38834f848.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Review a PRISM dispatcher-wiring change. Read END-TO-END: - H:/prism/mcp-server/

> **claude-code-cli** | 2026-06-11 | 39 msgs (14 user / 25 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-af42519f38834f848.jsonl`

## Transcript

### User | 2026-06-11T20:12:37.757Z

Review a PRISM dispatcher-wiring change. Read END-TO-END:
- H:/prism/mcp-server/src/engines/SFCMultiHypothesisRankerEngine.ts (the engine — note: static methods, export const = the CLASS)
- H:/prism/mcp-server/src/__tests__/calcDispatcher.sfc-ranker-wire.test.ts (new test, 8 cases)
- The 2 new cases in H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts — grep `sfc_rank_hypotheses` and `sfc_ranker_stats` (cases + z.enum entries).

CONTEXT: SFCMultiHypothesisRankerEngine is the SFC (Speed/Feed Calculator) Bayesian candidate-ranking arbiter. It carried a FALSE `// WIRE-EXEMPT` marker (verified: phantom consumers — a comment + a surfaces_into metadata string, zero real callers), so it was dark. This change wires it into calcDispatcher (cloning the speedfeed_dl_stats dynamic-import-in-case pattern): `sfc_rank_hypotheses` -> static rank(input), `sfc_ranker_stats` -> static isReady()+getSelfAwareness(). 8/8 tests pass; tsc on my files is clean.

VERIFY (flag P0/P1 with real file:line):
1. STATIC CALL CORRECTNESS: the export is `export const sfcMultiHypothesisRankerEngine = SFCMultiHypothesisRankerEngine` (the CLASS, not an instance). rank()/isReady()/getSelfAwareness() are static. Confirm `sfcMultiHypothesisRankerEngine.rank(...)` (calling a static method via the class-bound const) is correct, and the param cast `params as Parameters<typeof sfcMultiHypothesisRankerEngine.rank>[0]` resolves correctly.
2. R12 VALIDATION: the handler guards `candidates` is a non-empty array + `material` is a non-empty string before calling rank(). Confirm no silent no-op. Is the `{ success: true, ...ranked }` spread safe (does the engine output have a colliding `success` field)?
3. R12-SAFETY: rank() must be deterministic data/compute, NOT NN inference. Confirm (the engine uses reward.weighted_total likelihoods, physics priors, no untrained-NN inference path). Does wiring it ship any untrained-model output?
4. TEST INTEGRITY (R9): the strongest test is the parity assertion (dispatche
... [+486 chars truncated]

### Assistant | 2026-06-11T20:12:40.762Z

I'll review this dispatcher-wiring change by reading all the relevant files end-to-end.

### Assistant | 2026-06-11T20:12:41.254Z

[tool_use: Read]

### Assistant | 2026-06-11T20:12:42.144Z

[tool_use: Read]

### User | 2026-06-11T20:12:42.949Z

[tool_result] 1	// WIRE-EXEMPT: Middleware engine called by SFC engines internally, not exposed via dispatcher
2	/**
3	 * SFCMultiHypothesisRankerEngine â€” U-PPG-SFC-09
4	 * ==============================================
5	 *
6	 * Bayesian update over candidate sources: {Kienzle prior, Taylor prior, formula,
7	 * learned_residual via gate, RAG_prior via U-07, IRL_reward via iqlEngine}.
8	 * Emits ranked sfm/fp
... [+29358 chars truncated]

### User | 2026-06-11T20:12:43.265Z

[tool_result] 1	/**
2	 * sfc_rank_hypotheses + sfc_ranker_stats -- calcDispatcher wiring test
3	 * (OSCAR-SFC-SELFLEARN-WIRE, bravo 2026-06-11)
4	 * ============================================================================
5	 * Wires the orphan SFCMultiHypothesisRankerEngine (FALSE // WIRE-EXEMPT marker;
6	 * zero real callers) so the SFC Bayesian candidate-ranking primitive is reachable.
7	 * Round-tripped 
... [+5659 chars truncated]

### Assistant | 2026-06-11T20:12:46.693Z

Now let me read the dispatcher cases and the surrounding pattern they were cloned from.

### Assistant | 2026-06-11T20:12:47.701Z

[tool_use: Grep]

### User | 2026-06-11T20:12:48.960Z

[tool_result] 1058:  "speedfeed_dl_stats",
1070:  // speed/feed candidate arbiter was dark. Its own getSelfAwareness already declares sfc_rank_hypotheses. R12-safe:
1072:  "sfc_rank_hypotheses", "sfc_ranker_stats",
9450:          case "speedfeed_dl_stats": {
9468:          // speedfeed_dl_stats (L1). R12-safe by design: exposes only the engines' deterministic stats() surface
9521:          case "sfc_rank_hypoth
... [+50 chars truncated]

### Assistant | 2026-06-11T20:12:51.792Z

Let me read the new cases and the cloned-from pattern in full.

### Assistant | 2026-06-11T20:12:52.255Z

[tool_use: Read]

### User | 2026-06-11T20:12:53.130Z

[tool_result] 9440	              to_scale: String(params.to_scale) as "Ra_um"|"Rz_um"|"Rq_um"|"Rt_um"|"Ra_uin"|"N_grade",
9441	            });
9442	            break;
9443	          }
9444	
9445	          // FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-PARTIAL-L1-STATS (2026-05-20): SpeedFeedDeepLearningEngine L1 introspection wire.
9446	          // R12-safe — exposes calibration/training status, NOT inference outp
... [+8401 chars truncated]

### Assistant | 2026-06-11T20:12:56.310Z

Now let me verify the z.enum entries and how `result` is wrapped/returned, plus confirm the `success` field collision concern. Let me check the z.enum area and the result-wrapping logic.

### Assistant | 2026-06-11T20:12:57.912Z

[tool_use: Read]

### User | 2026-06-11T20:12:58.835Z

[tool_result] 1050	  "quick_tap_drill", "quick_cutting_time", "quick_scallop_height", "quick_thread_pitch", "quick_cutting_power",
1051	  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SMART-DEFAULTS: 7 actions wiring SmartDefaultsEngine
1052	  // (context-aware default RPM/feed/DOC/WOC/coolant — NOT Kienzle/Taylor; SFM baselines).
1053	  "smart_defaults_get", "smart_defaults_sfm", "smart_defaults_chipload",
1054	  "
... [+2571 chars truncated]

### Assistant | 2026-06-11T20:13:03.321Z

Both z.enum entries are present (line 1072). Now let me verify how `result` gets serialized into the `content[0].text` shape the test parses, and confirm there's no double-wrapping or `success` collision. Let me find the handler envelope around the switch.

### Assistant | 2026-06-11T20:13:04.970Z

[tool_use: Grep]

### User | 2026-06-11T20:13:06.094Z

[tool_result] 367:      return { result: JSON.stringify(result.value).slice(0, 200) };
371:      return { result: JSON.stringify(result.value).slice(0, 200) };
377:      return { result: JSON.stringify(result.value).slice(0, 200) };
383:      return { result: JSON.stringify(result.value).slice(0, 200) };
387:      return { result: JSON.stringify(result.value).slice(0, 200) };
408:      return { result: JSON.str
... [+1386 chars truncated]

### Assistant | 2026-06-11T20:13:09.238Z

Let me read the result-wrapping envelope (lines 1329-1420) to confirm pass-through is real and there's no `success` collision or slimming that would defeat the parity test.

### Assistant | 2026-06-11T20:13:10.246Z

[tool_use: Read]

### User | 2026-06-11T20:13:12.422Z

[tool_result] 1329	      let result: any;
1330	      const calcStart = Date.now();
1331	
1332	      // Emit CALC_STARTED event
1333	      try { eventBus.publish(EventTypes.CALC_STARTED, { action }, { category: "calculation", priority: "normal", source: "calcDispatcher" }); } catch { /* best-effort */ }
1334	
1335	      // Map actions to specific pre-hook phases
1336	      const SPECIFIC_HOOKS: Record<string, st
... [+4367 chars truncated]

### Assistant | 2026-06-11T20:13:17.304Z

I have confirmed the envelope. The two new actions are not in `_cacheableActions` (no cross-action cache pollution), and the final return wraps `result` via `slimResponse` into `content[0].text` — which the test's `callAction` helper parses. Let me verify the param-validation path: the new actions need to pass `validateActionParams` (line 1350) or the dispatcher returns `dispatcherError` before reaching the case. This matters for the adversarial negative-sfm test, which expects `success:true` + engine `ok:false`. Let me check whether these actions have per-action zod schemas registered.

### Assistant | 2026-06-11T20:13:19.162Z

[tool_use: Grep]

### User | 2026-06-11T20:13:20.686Z

[tool_result] 10:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
1070:  // speed/feed candidate arbiter was dark. Its own getSelfAwareness already declares sfc_rank_hypotheses. R12-safe:
1072:  "sfc_rank_hypotheses", "sfc_ranker_stats",
1350:        const validation = validateActionParams(action, params, ACTION_CALC_SCHEMAS);
9521:          case "sfc_rank_hypotheses"
... [+45 chars truncated]

### Assistant | 2026-06-11T20:13:23.755Z

`ACTION_CALC_SCHEMAS` isn't defined in this file — it's imported. Let me confirm it's imported and how `validateActionParams` behaves for actions absent from the schema map (it must pass-through, otherwise the adversarial test's `success:true` expectation would fail).

### Assistant | 2026-06-11T20:13:24.971Z

[tool_use: Grep]

### User | 2026-06-11T20:13:26.590Z

[tool_result] 11:import { ACTION_CALC_SCHEMAS } from "../../schemas/calcActionSchemas.js";
20:/** Zod-validated params — dispatcher validates via ACTION_CALC_SCHEMAS before engine calls.
1350:        const validation = validateActionParams(action, params, ACTION_CALC_SCHEMAS);

### Assistant | 2026-06-11T20:13:29.382Z

[tool_use: Grep]

### User | 2026-06-11T20:13:30.882Z

[tool_result] No matches found

### Assistant | 2026-06-11T20:13:34.649Z

Confirmed: no per-action schema for `sfc_rank_hypotheses`, so `validateActionParams` must pass-through (not block) for the adversarial test to reach the case with `success:true`. Let me verify that `validateActionParams` returns `{valid:true}` for unregistered actions, and confirm `isIndexReady` exists on `SFCRAGWarmStartEngine` (called by `isReady()`).

### Assistant | 2026-06-11T20:13:35.929Z

[tool_use: Grep]

### User | 2026-06-11T20:13:37.525Z

[tool_result] 76:export function validateActionParams(
77-  action: string,
78-  params: Record<string, unknown>,
79-  schemas: Record<string, z.ZodTypeAny>,
80-): ValidationResult {
81-  const schema = schemas[action];
82-  if (!schema) {
83-    // No schema = pass through (valid)
84-    return { valid: true, success: true, data: params };
85-  }
86-  const result = schema.safeParse(params);
87-  if (result.su
... [+340 chars truncated]

### Assistant | 2026-06-11T20:13:43.144Z

Confirmed: unregistered action → pass-through valid. The adversarial negative-sfm path reaches the case, structural guards pass (candidates non-empty, material is string), `rank()` runs, the engine's internal `safeParse` rejects `sfm:-100`, returns `ok:false` + warning — and the dispatcher wraps that as `{success:true, ok:false, warnings:[...]}`. Test assertions match exactly.

Now let me verify `isIndexReady` exists on `SFCRAGWarmStartEngine` (so `isReady()` doesn't throw) and confirm the `priors`/`citations`/`warnings` fields the engine reads off `ragResult` are real (since the parity test runs with `use_rag_priors:false`, the RAG path is skipped — but `sfc_ranker_stats` calls `isReady()` which hits the RAG engine).

### Assistant | 2026-06-11T20:13:44.486Z

[tool_use: Grep]

### User | 2026-06-11T20:13:46.027Z

[tool_result] 320:  static isIndexReady(): boolean {
321-    const stats = JMDieProgramRAGEngine.getIndexStats();
322-    return stats !== null && stats.total_programs > 0;
323-  }

### Assistant | 2026-06-11T20:13:49.796Z

`isIndexReady` exists and returns a deterministic boolean (no throw — `getIndexStats()` returning null is handled). `sfc_ranker_stats` is safe.

Now let me verify claim #5 (DEDUP — the engine truly had 0 real dispatcher reachability before this change). I'll search the whole dispatchers tree for any prior reference to this engine's import or `.rank(` call outside the files just changed.

### Assistant | 2026-06-11T20:13:50.676Z

[tool_use: Grep]

### User | 2026-06-11T20:13:52.376Z

[tool_result] Found 7 files
H:\prism\mcp-server\src\__tests__\calcDispatcher.sfc-ranker-wire.test.ts
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts
H:\prism\mcp-server\src\engines\MultiModelConsensusEngine.ts
H:\prism\mcp-server\src\engines\SFCMultiHypothesisRankerEngine.ts
H:\prism\mcp-server\src\__tests__\engines\sfcMultiHypothesisRankerEngine.test.ts
H:\prism\mcp-server\src\engines\SFCRAGWarmSta
... [+83 chars truncated]

### Assistant | 2026-06-11T20:13:53.894Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
