---
type: "chat-session"
source: "claude-code-cli"
session_id: "06e3b710-cc8b-4160-a16d-b4938644fa7a"
title: "Review a dark-facade fix: a NEW pure info method added to a factory object + dis"
date: "2026-06-24"
first_ts: "2026-06-24T02:03:53.890Z"
last_ts: "2026-06-24T02:08:03.308Z"
cwd: "H:\\prism\\mcp-server"
messages: 63
user_msgs: 24
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/06e3b710-cc8b-4160-a16d-b4938644fa7a/subagents/agent-aa2d28de8de1b80f3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Review a dark-facade fix: a NEW pure info method added to a factory object + dis

> **claude-code-cli** | 2026-06-24 | 63 msgs (24 user / 39 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/06e3b710-cc8b-4160-a16d-b4938644fa7a/subagents/agent-aa2d28de8de1b80f3.jsonl`

## Transcript

### User | 2026-06-24T02:03:53.890Z

Review a dark-facade fix: a NEW pure info method added to a factory object + dispatcher rewire + test. Grade PASS/FAIL with P0/P1/P2 + file:line. Hunt for silent breakage.

CHANGES (entire diff):
1. `H:/prism/mcp-server/src/engines/MachineLoRABaseEngine.ts` — ADDED interface `MachineLoRABaseInfo` + added a `getInfo()` method to the exported `machineLoRABase` factory OBJECT (which previously had only `buildDatasetHelper`/`createCadence`). getInfo returns static metadata: engine/version/description, helpers, defaults {split: {...DEFAULT_SPLIT}, cadence: {...DEFAULT_CADENCE}}, machineTypes (8), cadence enums.
2. `H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` ~line 4541 — `machine_lora_base_info` rewired from dark `.getInfo?.() ?? .info ?? {note:"method not callable"}` (inside `result = {success:true, data: ...}`) to `result = machineLoRABase.getInfo();` (BARE).
3. `H:/prism/mcp-server/src/__tests__/aiReasoningDispatcher.machine-lora-info-wire.test.ts` — NEW, 3 cases, passing.

CRITICAL CHECKS:
- ENVELOPE: read `executeAIReasoningAction` (defined ~line 1241 in aiReasoningDispatcher.ts). Does it return `{success, data: result}` (so a BARE result means r.data === the info)? Confirm the rewire to bare `result = getInfo()` is correct and that the OLD `result = {success:true, data:X}` form would have double-wrapped (r.data.data). Reference the sibling `mit_course_knowledge_query` (~line 4513) which uses the bare form and whose committed test asserts r.data.scope directly. P0 if the envelope is wrong.
- ADDITIVE SAFETY: `machineLoRABase` has 17 importers. Confirm getInfo is purely additive (the object still exports buildDatasetHelper/createCadence unchanged; no existing export signature changed) so none of the 17 can break. 
- ENUM HONESTY: getInfo's cadence.intervals/triggers/runStatuses are string literal arrays. Are they type-checked against the CadenceInterval/TriggerType/RunStatus unions (i.e. would a typo fail tsc)? Confirm the interface field type
... [+134 chars truncated]

### Assistant | 2026-06-24T02:04:07.667Z

I'll investigate this dark-facade fix systematically. Let me start by reading the core files in parallel.

### Assistant | 2026-06-24T02:04:08.744Z

[tool_use: Read]

### Assistant | 2026-06-24T02:04:08.818Z

[tool_use: Read]

### User | 2026-06-24T02:04:10.225Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\MachineLoRABaseEngine.ts' was already read 1s ago in this session and is unchanged (mtime 1782266482175). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-24T02:04:10.268Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\aiReasoningDispatcher.machine-lora-info-wire.test.ts' was already read 0s ago in this session and is unchanged (mtime 1782266564638). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for 
... [+34 chars truncated]

### Assistant | 2026-06-24T02:04:15.549Z

The read-once guard claims these are in context, but they aren't — this is a fresh agent session. Let me disable the cache and read them.

### Assistant | 2026-06-24T02:04:16.503Z

[tool_use: Bash]

### Assistant | 2026-06-24T02:04:17.007Z

[tool_use: Bash]

### User | 2026-06-24T02:04:24.917Z

[tool_result] /**
 * MachineLoRABaseEngine — shared foundation for per-machine LoRA pipelines
 * ========================================================================
 *
 * CAM-ML-CLOSEDLOOP-MS0 foundation. Extracted from the production Lathe
 * LoRA pattern (49 engines) so that the 8 machine-type pipelines
 * (milling, 5-axis, mill-turn, WEDM, sinker EDM, laser, waterjet,
 * grinding) can share machine-agno
... [+20746 chars truncated]

### User | 2026-06-24T02:04:25.542Z

[tool_result] /**
 * aiReasoningDispatcher machine_lora_base_info wiring (U-MACHINE-LORA-INFO-WIRE).
 *
 * Dark-facade fix: the case probed machineLoRABase.getInfo()/.info -- neither
 * existed on the factory object (only buildDatasetHelper/createCadence) -> always
 * "method not callable". Added the real getInfo(): pure introspection of the
 * shared LoRA foundation. Routed through executeAIReasoningAction (ba
... [+3005 chars truncated]

### Assistant | 2026-06-24T02:04:29.244Z

Now let me read the dispatcher envelope and the rewired action. I need the `executeAIReasoningAction` definition (~1241), the `machine_lora_base_info` case (~4541), and the sibling `mit_course_knowledge_query` (~4513).

### Assistant | 2026-06-24T02:04:30.656Z

[tool_use: Read]

### Assistant | 2026-06-24T02:04:31.006Z

[tool_use: Read]

### User | 2026-06-24T02:04:32.492Z

[tool_result] 1235	    action: z.enum(ALL_AI_ACTIONS).describe("AI reasoning action to execute"),
1236	    params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
1237	  }),
1238	};
1239	
1240	/** Execute AI reasoning action */
1241	export async function executeAIReasoningAction(
1242	  action: AIAction,
1243	  params: Record<string, unknown>
1244	): Promise<{ success: boole
... [+4901 chars truncated]

### User | 2026-06-24T02:04:34.028Z

[tool_result] 4500	
4501	      // --- Knowledge graph / neural bridge / LoRA ---
4502	      case "kg_neural_bridge_search": {
4503	        const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
4504	        const p = params as any;
4505	        result = { success: true, data: (knowledgeGraphNeuralBridgeEngine as any).search?.(p.query ?? p, p.k ?? 10) ?? {
... [+4703 chars truncated]

### Assistant | 2026-06-24T02:04:38.480Z

I now have the envelope, the rewired case, the sibling reference, and the new method. Let me verify the critical claims. First, the envelope return shape and how `result` is wrapped.

### Assistant | 2026-06-24T02:04:39.873Z

[tool_use: Grep]

### Assistant | 2026-06-24T02:04:41.290Z

[tool_use: Grep]

### User | 2026-06-24T02:04:43.740Z

[tool_result] No matches found

### User | 2026-06-24T02:04:44.209Z

[tool_result] 367:// DATA + a single config mutator; validation guards early-return dispatcherError.
1253:    return dispatcherError(validation.error ?? "Validation failed", action, "prism_ai");
1518:        } catch (routeErr: unknown) {
2303:          return dispatcherError(`Unknown belief id: ${p.id}`, action, "prism_ai");
2386:          return dispatcherError("Missing required 'chain' parameter (ReasoningCha
... [+953 chars truncated]

### Assistant | 2026-06-24T02:04:48.204Z

The switch ends at line 5368, and the catch is at 5379. Let me read the code between the end of the switch and the return statement to find exactly how `result` is wrapped into the final return value.

### Assistant | 2026-06-24T02:04:48.882Z

[tool_use: Read]

### User | 2026-06-24T02:04:49.949Z

[tool_result] 5366	      default: {
5367	        const _exhaustive: never = action;
5368	        return dispatcherError(`Unknown action: ${_exhaustive}`, action, "prism_ai");
5369	      }
5370	    }
5371	
5372	    const duration = Date.now() - startTime;
5373	    log.info(`[prism_ai] ${action} completed in ${duration}ms`);
5374	
5375	    // Slim response
5376	    const slimmed = slimResponse(result);
5377	
5378
... [+610 chars truncated]

### Assistant | 2026-06-24T02:04:59.506Z

Critical finding on the envelope: the result is NOT returned raw — it passes through `slimResponse(result)` at line 5376 before being wrapped as `{ success: true, data: slimmed }`. This is a transform I must investigate. The envelope IS `{success, data: <slimmed result>}`, confirming the bare-result rewire is correct in principle (`r.data === slimResponse(getInfo())`), but `slimResponse` could mutate/drop fields the test asserts. Let me find `slimResponse`.

### Assistant | 2026-06-24T02:05:00.950Z

[tool_use: Grep]

### Assistant | 2026-06-24T02:05:01.626Z

[tool_use: Grep]

### User | 2026-06-24T02:05:03.983Z

[tool_result] Found 82 files
src\tools\dispatchers\aiReasoningDispatcher.ts
src\tools\dispatchers\orchestrationDispatcher.ts
src\tools\dispatchers\cadDispatcher.ts
src\tools\dispatchers\fiveAxisDispatcher.ts
src\tools\dispatchers\devDispatcher.ts
src\tools\dispatchers\sessionDispatcher.ts
src\tools\dispatchers\authDispatcher.ts
src\tools\dispatchers\calcDispatcher.ts
src\tools\dispatchers\qualityDispatcher.ts
s
... [+3285 chars truncated]

### User | 2026-06-24T02:05:04.076Z

[tool_result] No matches found

### Assistant | 2026-06-24T02:05:09.548Z

The graph reveals two highly relevant memories: `reference_slimresponse_strips_empty_arrays` and the slimResponse TS2554 cluster. This is a critical signal — `slimResponse` strips empty arrays. The `getInfo()` payload contains several string-literal arrays (helpers, machineTypes, intervals, triggers, runStatuses) that are NOT empty, so they should survive — but I must confirm exactly what slimResponse does to non-empty arrays and nested objects. Let me find its definition (it's imported, since it's not defined locally).

### Assistant | 2026-06-24T02:05:10.726Z

[tool_use: Grep]

### User | 2026-06-24T02:05:12.527Z

[tool_result] 20:import { slimResponse } from "../../utils/responseSlimmer.js";
4403:          // Named-field convention (this dispatcher wraps to { success, data: slimResponse(result) },
4732:        // { success:true, data: slimResponse(result) }, so callers read r.data.* directly.
5376:    const slimmed = slimResponse(result);

### Assistant | 2026-06-24T02:05:17.466Z

[tool_use: Read]

### User | 2026-06-24T02:05:18.525Z

[tool_result] 1	/**
2	 * Response Slimmer Utility
3	 * Reduces verbose response objects for MCP transport efficiency.
4	 * @module utils/responseSlimmer
5	 */
6	
7	/**
8	 * Slim a response object by removing null/undefined values and empty arrays.
9	 *
10	 * @param response - the value to slim
11	 * @param maxDepth - recursion ceiling (default 32). A circular reference or a
12	 *   pathologically deep payload w
... [+2516 chars truncated]

### Assistant | 2026-06-24T02:05:26.088Z

I now understand `slimResponse` fully. It strips null/undefined values and empty arrays, and recurses into nested objects/arrays. Let me trace the exact `getInfo()` payload through it:

- `engine`, `version`, `description` — strings, preserved.
- `helpers` — non-empty array (length 2), preserved.
- `defaults` — object, recursed. Both `split` and `cadence` are objects with non-null primitive values. But note: `DEFAULT_SPLIT` has NO `stratifyBy` field (it's optional and absent), and `DEFAULT_CADENCE` has all fields populated. All primitive values are preserved.
- `machineTypes` — non-empty array (length 8), preserved.
- `cadence` (the enum object) — recursed; `intervals`/`triggers`/`runStatuses` are all non-empty arrays, preserved.

No empty arrays, no null/undefined fields in the payload, so slimResponse is lossless here. The test assertions all hold. Now let me verify the additive-safety claim about the 17 importers, and confirm tsc would catch enum typos. Let me check the importers and run a type-check + the test.

### Assistant | 2026-06-24T02:05:27.371Z

[tool_use: Grep]

### Assistant | 2026-06-24T02:05:28.408Z

[tool_use: Grep]

### User | 2026-06-24T02:05:28.714Z

[tool_result] Found 30 files
src\__tests__\aiReasoningDispatcher.machine-lora-info-wire.test.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\engines\MachineLoRABaseEngine.ts
src\tools\dispatchers\edmDispatcher.ts
src\__tests__\LoRADatasetFamilyWiring.test.ts
src\__tests__\WEDMLoRADatasetBuilderWiring.test.ts
src\engines\WEDMLoRADatasetBuilderEngine.ts
src\tools\dispatchers\machineDispatcher.ts
src\__tests
... [+936 chars truncated]

### User | 2026-06-24T02:05:29.972Z

[tool_result] src\tools\dispatchers\aiReasoningDispatcher.ts:4543:        // existed on the machineLoRABase factory object -> "method not callable".
src\tools\dispatchers\aiReasoningDispatcher.ts:4548:        const { machineLoRABase } = await import("../../engines/MachineLoRABaseEngine.js");
src\tools\dispatchers\aiReasoningDispatcher.ts:4549:        result = machineLoRABase.getInfo();
src\__tests__\aiReasoning
... [+1005 chars truncated]

### Assistant | 2026-06-24T02:05:35.895Z

The actual consumers of the `machineLoRABase` factory object's methods are only in `machineDispatcher.ts` (using `buildDatasetHelper` and `createCadence`) and the new `aiReasoningDispatcher.ts` (`getInfo`). The other 27 files import the *classes/types* (`BaseLoRACadence`, `DEFAULT_SPLIT`, etc.), not the factory object's methods. Adding `getInfo` to the object literal is purely additive — it cannot change `buildDatasetHelper`/`createCadence` signatures. Confirmed additive-safe.

Now let me verify the two remaining claims by running tsc on the touched files and running the test, plus confirm the action is in the z.enum and has a schema (anti-regression + dispatcher convention).

### Assistant | 2026-06-24T02:05:37.062Z

[tool_use: Grep]

### User | 2026-06-24T02:05:39.303Z

[tool_result] src\tools\dispatchers\aiReasoningDispatcher.ts:161:  "machine_lora_base_info",
src\tools\dispatchers\aiReasoningDispatcher.ts:4541:      case "machine_lora_base_info": {
src\__tests__\aiReasoningDispatcher.machine-lora-info-wire.test.ts:2: * aiReasoningDispatcher machine_lora_base_info wiring (U-MACHINE-LORA-INFO-WIRE).
src\__tests__\aiReasoningDispatcher.machine-lora-info-wire.test.ts:29:describe
... [+888 chars truncated]

### Assistant | 2026-06-24T02:05:45.398Z

The action is in the z.enum at line 161 (pre-existing — this was a dark action being repaired, not a new action, so anti-regression action count is unchanged). The test validates params with `{}` — I need to verify the schema for `machine_lora_base_info` permits empty params (the test passes `{}` and `{junk, machineType}`). Recall `executeAIReasoningAction` runs `validateActionParams` at line 1251 BEFORE the switch. If the schema requires fields or rejects unknown keys, the test's 3rd case (`{junk:"ignored", machineType:"milling"}`) would fail validation. Let me check the schema, then run tsc + the test.

### Assistant | 2026-06-24T02:05:46.555Z

[tool_use: Bash]

### User | 2026-06-24T02:05:53.349Z

[tool_result] ---ALL_AI_SCHEMAS def---
584:const ALL_AI_SCHEMAS = {

### Assistant | 2026-06-24T02:05:57.934Z

No schema is keyed for `machine_lora_base_info`. I need to verify how `validateActionParams` behaves when an action has no schema entry — does it pass (lenient) or fail? If it fails on a missing schema, the rewire is fine but the action was never reachable. Let me check `validateActionParams` and the schema map.

### Assistant | 2026-06-24T02:05:59.590Z

[tool_use: Bash]

### User | 2026-06-24T02:06:10.465Z

[tool_result] src/utils/dispatcherMiddleware.ts:114:export function validateActionParams(
src/validation/actionParamValidator.ts:52:export function validateActionParams(

### Assistant | 2026-06-24T02:06:13.602Z

[tool_use: Read]

### User | 2026-06-24T02:06:14.642Z

[tool_result] 114	export function validateActionParams(
115	  action: string,
116	  params: Record<string, unknown>,
117	  schemas: Record<string, z.ZodTypeAny>,
118	): ValidationResult {
119	  const schema = schemas[action];
120	  if (!schema) {
121	    // No schema registered -> pass through, but FLAG it (fail-loud observability,
122	    // NON-blocking). We do NOT throw: ~40% of actions have no schema yet an
... [+1924 chars truncated]

### Assistant | 2026-06-24T02:06:19.906Z

Confirmed: a missing schema passes through with `{valid: true}` (lenient, fail-loud observability flag only). So the test's empty-params and junk-params cases all pass validation. The action is genuinely reachable. This matches the sibling `mit_course_knowledge_query` pattern, which also does its own in-handler guarding rather than relying on a schema.

Now let me confirm the two final hard claims with the compiler and runtime: (1) tsc on the engine + dispatcher (would catch any enum-literal typo against the union types), and (2) the test passes.

### Assistant | 2026-06-24T02:06:21.549Z

[tool_use: Bash]

### User | 2026-06-24T02:06:48.878Z

[tool_result] ---TSC-EXIT-MARKER---
done

### Assistant | 2026-06-24T02:06:54.072Z

No tsc errors in any of the three touched files. This confirms the enum-honesty claim: the string-literal arrays `intervals`/`triggers`/`runStatuses` are typed as `CadenceInterval[]`/`TriggerType[]`/`RunStatus[]` via the `MachineLoRABaseInfo` interface, so a typo or dropped/extra member would fail compilation. tsc is clean, so the literals match the unions exactly.

Now run the test to confirm it actually passes (verify, don't assume).

### Assistant | 2026-06-24T02:06:55.285Z

[tool_use: Bash]

### User | 2026-06-24T02:07:02.369Z

[tool_result] [INFO] [prism_ai] Executing action: machine_lora_base_info

stderr | src/__tests__/aiReasoningDispatcher.machine-lora-info-wire.test.ts > aiReasoningDispatcher machine_lora_base_info -- dark-action fix (real getInfo) > returns the real foundation introspection, NOT 'method not callable'
[INFO] [prism_ai] machine_lora_base_info completed in 2ms

stderr | src/__tests__/aiReasoningDispatcher.machine-
... [+1926 chars truncated]

### Assistant | 2026-06-24T02:07:13.651Z

All 3 tests pass live. Now let me close the loop on two subtle silent-breakage angles the brief did not explicitly raise but my lenses demand:

1. **slimResponse + defensive-copy interaction (regression risk).** The test asserts `d.defaults.split` is a *copy* (`not.toBe(DEFAULT_SPLIT)`). But `slimResponse` rebuilds every nested object into a NEW `slimmed` object (line 40-46) — so even if `getInfo()` had returned the canonical reference directly, slimResponse would have produced a copy anyway. This means the test's `not.toBe` assertion would pass even WITHOUT the `{...DEFAULT_SPLIT}` spread in getInfo. So the spread is correct (genuinely copies), but the dispatcher-routed test alone does NOT prove it — slimResponse masks it. The R9 intent ("a consumer mutating the result cannot corrupt canon") still holds because slimResponse is always in the path. This is a test-strength nuance worth noting, not a defect.

2. **`stratifyBy` absence under slimResponse (silent shape change).** `DEFAULT_SPLIT` has no `stratifyBy` (optional, undefined). slimResponse skips undefined keys — but `stratifyBy` is already absent from the literal, so no field is dropped. The `toEqual(DEFAULT_SPLIT)` deep-equal passes because both sides lack the key. No silent breakage.

Let me verify one integration-coupling concern: does any OTHER existing test assert the OLD `{success, data: {note: "method not callable"}}` shape for this action (which the rewire would now break)? And confirm the sibling reference claim about `mit_course_knowledge_query`'s committed test reading `r.data.scope` directly.

### Assistant | 2026-06-24T02:07:16.348Z

[tool_use: Bash]

### User | 2026-06-24T02:07:32.674Z

[tool_result] src/__tests__/aiReasoningDispatcher.machine-lora-info-wire.test.ts
---other refs to this action in tests besides the new one---
---mit sibling committed test r.data.scope---
src/__tests__/aiReasoningDispatcher.mit-knowledge-wire.test.ts

### Assistant | 2026-06-24T02:07:39.113Z

No other test references `machine_lora_base_info`, so the rewire breaks no existing test. The new test is the only consumer-test, and it asserts the new bare shape. The sibling `mit_course_knowledge_query` has its own committed wire test, confirming the bare-result pattern is the established convention in this dispatcher (line 4732 comment also documents it: `"{ success:true, data: slimResponse(result) }, so callers read r.data.* directly"`).

Let me do one final blast-radius check: confirm the `aiReasoningDispatcher` MCP entry point (`aiReasoningDispatcher` at line 5387, the real MCP handler) returns `executeAIReasoningAction` unchanged so any MCP-surface caller sees the same `{success, data}` shape — there's no second wrapping layer that would double-wrap.

### Assistant | 2026-06-24T02:07:40.266Z

[tool_use: Read]

### User | 2026-06-24T02:07:41.472Z

[tool_result] 5386	/** MCP tool handler entry point */
5387	export async function aiReasoningDispatcher(
5388	  args: { action: AIAction; params?: Record<string, unknown> }
5389	): Promise<{ success: boolean; data?: unknown; error?: string }> {
5390	  return executeAIReasoningAction(args.action, args.params ?? {});
5391	}
5392	
5393	/** Export action lists for registration (legacy + U-AIMAX10 merged). */
5394	e
... [+188 chars truncated]

### Assistant | 2026-06-24T02:08:03.308Z

The MCP entry point passes through `executeAIReasoningAction` directly with no second wrapping. The envelope is exactly `{success: true, data: slimResponse(getInfo())}` at every surface. No double-wrap anywhere.

I have verified every critical claim and traced the full blast radius. Here is my verdict.

---

VERDICT: PASS

summary: The dark-facade fix is correct and silently-breaks nothing. The envelope `executeAIReasoningAction` wraps a bare `result` as `{success:true, data: slimResponse(result)}` (verified at aiReasoningDispatcher.ts:5376-5378), so the rewire to `result = machineLoRABase.getInfo()` correctly makes `r.data` the info object — the OLD inner-`{success,data}` form would indeed have double-wrapped to `r.data.data`. `getInfo` is purely additive to the factory object (the 27 type/class importers and the only two method-consumers, machineDispatcher.ts buildDatasetHelper/createCadence, are untouched), the enum literals are union-typed and tsc-clean, and the defaults are spread copies. tsc clean on all three files; 3/3 tests pass live.

findings:
  - [PASS-AUDIT] aiReasoningDispatcher.ts:5376 -- envelope routes `result` through `slimResponse()` (NOT raw) before `{success,data:slimmed}`. Traced the getInfo payload field-by-field through responseSlimmer.ts:40-46: every array (helpers=2, machineTypes=8, intervals=5, triggers=4, runStatuses=3) is non-empty and every value non-null, so slimResponse is lossless here — no field the test asserts is stripped. The bare-result rewire is correct.
  - [PASS-AUDIT] MachineLoRABaseEngine.ts:579-625 -- getInfo added to the object literal alongside unchanged buildDatasetHelper/createCadence; no existing export signature altered. Grep confirms only machineDispatcher.ts:710/725 consume the factory methods (buildDatasetHelper/createCadence); the other 27 files import classes/types/DEFAULT_* constants. None of the 17+ importers can break.
  - [PASS-AUDIT] MachineLoRABaseEngine.ts:616-622 -- intervals/triggers/runStatuses are typ
... [+1911 chars truncated]
