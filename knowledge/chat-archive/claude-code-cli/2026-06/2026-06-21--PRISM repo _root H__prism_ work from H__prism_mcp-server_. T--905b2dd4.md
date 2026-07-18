---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "PRISM repo (root H:/prism; work from H:/prism/mcp-server). This is a DEDUP-CORRE"
date: "2026-06-21"
first_ts: "2026-06-21T01:42:27.914Z"
last_ts: "2026-06-21T01:49:51.840Z"
cwd: "H:\\prism\\mcp-server"
messages: 137
user_msgs: 50
assistant_msgs: 87
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a75302f6b398ff2cf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# PRISM repo (root H:/prism; work from H:/prism/mcp-server). This is a DEDUP-CORRE

> **claude-code-cli** | 2026-06-21 | 137 msgs (50 user / 87 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a75302f6b398ff2cf.jsonl`

## Transcript

### User | 2026-06-21T01:42:27.914Z

PRISM repo (root H:/prism; work from H:/prism/mcp-server). This is a DEDUP-CORRECT fix of a stale-test + small-wiring-gap situation. Full diagnosis is given — do NOT re-investigate the history, just execute and verify.

## DIAGNOSIS (already verified — trust this)
Two test files reference DEAD action names (`ai_pac_*`, `ai_vc_bound`, `ai_rademacher_bound`, `ai_pac_bayes_bound`, `ai_belief_*`, `ai_explain`, `ai_explain_formula`, `ai_reading_level_label`) from a clobbered old milestone. The backing engines were RE-WIRED under CANONICAL names by later milestones and are LIVE today:
- StatisticalLearningBoundsEngine → `bounds_pac_complexity`, `bounds_vc`, `bounds_rademacher`, `bounds_pac_bayes` (tested by `aiReasoningDispatcher.uwire29.test.ts` — DO NOT break it).
- BeliefStateReasoningEngine → `belief_set`, `belief_update`, `belief_query` (composite), `belief_list`, `belief_delete`. **belief_* currently has ZERO test coverage.**
- ReasoningExplainerEngine → `reasoning_explain` (= engine.explain; tested by `aiReasoningDispatcherUnwiredBatch1.test.ts` — DO NOT break it).
DO NOT re-add the old `ai_*` action names anywhere — they would be duplicate action surfaces (a dedup violation). The two engine methods `explainFormula` + `getReadingLevelLabel` are GENUINELY UNWIRED — wire them under the canonical `reasoning_*` convention.

## CANONICAL CONTRACTS (read these to confirm exact shapes)
- Dispatcher `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`: `case "belief_set"` (~line 2204), `case "belief_update"` (~2218), `case "belief_query"` (~2231, returns `{id, distribution, updatedAt, topK, entropy_bits, probability_of_state?}` — pass `{id, topK:N}` to get `data.topK`, default includes `entropy_bits`), `case "bounds_pac_complexity"` etc. (~2630), `case "reasoning_explain"` (find it: `grep -n 'case "reasoning_explain"'`).
- Schema `mcp-server/src/schemas/aiReasoningActionSchemas.ts`: action list `AI_REASONING_ACTIONS` has `reasoning_explain` (~line 491); schema map `
... [+4652 chars truncated]

### Assistant | 2026-06-21T01:42:32.746Z

I'll read CLAUDE.md first, then execute the tasks systematically.

### Assistant | 2026-06-21T01:42:32.801Z

[tool_use: Read]

### User | 2026-06-21T01:42:36.422Z

[tool_result] 1	# PRISM MCP Server — Development Context
2	
3	## CRITICAL SLASH COMMANDS — USE THESE PROACTIVELY
4	```
5	/pdf-learn      — Extract knowledge from PDFs → tribal tips/formulas (MUST USE for PDFs)
6	/video-learn    — Extract knowledge from videos → procedures/tips (MUST USE for videos)
7	/forge-triple   — Create engines + skills + hooks with EXHAUSTIVE extraction (MUST USE for new assets)
8	/dedup 
... [+10651 chars truncated]

### Assistant | 2026-06-21T01:42:38.971Z

Now let me read the key source files in parallel to understand the exact contracts before making any changes.

### Assistant | 2026-06-21T01:42:40.505Z

[tool_use: Grep]

### Assistant | 2026-06-21T01:42:41.670Z

[tool_use: Grep]

### Assistant | 2026-06-21T01:42:42.657Z

[tool_use: Grep]

### User | 2026-06-21T01:42:45.423Z

[tool_result] 3151:      case "reasoning_explain": {

### User | 2026-06-21T01:42:45.682Z

[tool_result] 2204:      case "belief_set": {
2220:      case "belief_update": {
2231:      case "belief_query": {
2258:      case "belief_list": {
2272:      case "belief_delete": {

### User | 2026-06-21T01:42:45.933Z

[tool_result] 2612:      case "bounds_pac_complexity": {
2619:      case "bounds_vc": {
2626:      case "bounds_rademacher": {
2633:      case "bounds_pac_bayes": {

### Assistant | 2026-06-21T01:42:48.411Z

Good. Now let me read the exact code blocks around each case to understand the return shapes and patterns.

### Assistant | 2026-06-21T01:42:48.801Z

[tool_use: Read]

### Assistant | 2026-06-21T01:42:49.556Z

[tool_use: Read]

### Assistant | 2026-06-21T01:42:49.980Z

[tool_use: Read]

### User | 2026-06-21T01:42:51.224Z

[tool_result] 3145	        const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
3146	        result = reasoningChainSharingEngine.queryChains(
3147	          params as unknown as Parameters<typeof reasoningChainSharingEngine.queryChains>[0],
3148	        );
3149	        break;
3150	      }
3151	      case "reasoning_explain": {
3152	        const { reasoningExpla
... [+2982 chars truncated]

### User | 2026-06-21T01:42:52.186Z

[tool_result] 2198	        result = engine.reason(p.problem, p.inputs, p.calculationType);
2199	        break;
2200	      }
2201	      // ─────────────────────────────────────────────────────────────────────
2202	      // ENGINE-WIRE-MS0/U-WIRE20: BeliefStateReasoningEngine — Bayesian beliefs
2203	      // ─────────────────────────────────────────────────────────────────────
2204	      case "belief_set": {
2205
... [+4283 chars truncated]

### User | 2026-06-21T01:42:52.539Z

[tool_result] 2606	      }
2607	      // ─────────────────────────────────────────────────────────────────────
2608	      // ENGINE-WIRE-MS0/U-WIRE29: StatisticalLearningBoundsEngine — PAC/VC/Rademacher
2609	      // Pure math; no state. Per-call `new` is fine (the singleton export
2610	      // exists for callers that want a stable identity, not for state).
2611	      // ───────────────────────────────────────
... [+2958 chars truncated]

### Assistant | 2026-06-21T01:42:56.465Z

Now let me read the ReasoningExplainerEngine to get the exact types:

### Assistant | 2026-06-21T01:42:57.614Z

[tool_use: Read]

### Assistant | 2026-06-21T01:42:57.882Z

[tool_use: Read]

### User | 2026-06-21T01:43:00.627Z

[tool_result] 1	/**
2	 * ReasoningExplainerEngine — Transparent AI
3	 *
4	 * AGENT-MS3 U-AGT10 — Makes agent reasoning transparent. "Why did you
5	 * recommend this?" gets a clear, traceable answer rooted in physics and
6	 * shop data. Produces audience-targeted explanations (machinist / engineer
7	 * / manager / auditor) with citations.
8	 *
9	 * NOTE: Source was recovered from a partially-corrupted file (null
... [+2202 chars truncated]

### User | 2026-06-21T01:43:00.852Z

[tool_result] 1	/**
2	 * aiReasoningDispatcher.bounds.test.ts — PAC/VC bounds + Bayesian belief
3	 * tracking, wired through prism_ai (U-WIRE08).
4	 *
5	 * Covers 8 actions across 2 engines:
6	 *   - StatisticalLearningBoundsEngine
7	 *       ai_pac_sample_complexity / ai_vc_bound
8	 *       ai_rademacher_bound       / ai_pac_bayes_bound
9	 *   - BeliefStateReasoningEngine
10	 *       ai_belief_set / ai_belief_
... [+13794 chars truncated]

### Assistant | 2026-06-21T01:43:03.729Z

Now let me read the explain test file and the schema file:

### Assistant | 2026-06-21T01:43:04.492Z

[tool_use: Read]

### Assistant | 2026-06-21T01:43:05.757Z

[tool_use: Grep]

### User | 2026-06-21T01:43:11.806Z

[tool_result] 491:  "reasoning_explain",              // ReasoningExplainerEngine.explain
2326:  reasoning_explain: z.object({

### User | 2026-06-21T01:43:12.198Z

[tool_result] 1	/**
2	 * aiReasoningDispatcher.explain.test.ts — XAI explanation surface,
3	 * wired through prism_ai (U-WIRE10).
4	 *
5	 * Covers 3 actions on ReasoningExplainerEngine:
6	 *   - ai_explain              → explain(request) → Explanation
7	 *   - ai_explain_formula      → explainFormula(formula, audience) → string
8	 *   - ai_reading_level_label  → getReadingLevelLabel(grade) → label
9	 *
10	 * Re
... [+10387 chars truncated]

### Assistant | 2026-06-21T01:43:15.982Z

Now I have all the context I need. Let me read the exact schema lines around `reasoning_explain` and the `AI_REASONING_ACTIONS` array:

### Assistant | 2026-06-21T01:43:16.781Z

[tool_use: Read]

### Assistant | 2026-06-21T01:43:17.361Z

[tool_use: Read]

### User | 2026-06-21T01:43:19.939Z

[tool_result] 485	  "ensemble_register_member",       // EnsembleModelSelectorEngine.registerMember
486	  "ensemble_predict",               // EnsembleModelSelectorEngine.predict
487	  "neural_model_register",          // NeuralModelRegistryEngine.registerModel
488	  "neural_model_list",              // NeuralModelRegistryEngine.listModels
489	  "reasoning_chain_register",       // ReasoningChainSharingEngine.r
... [+2085 chars truncated]

### User | 2026-06-21T01:43:21.637Z

[tool_result] 2320	  reasoning_chain_query: z.object({
2321	    problem: z.string().optional().describe("Problem fragment to match"),
2322	    minConfidence: z.number().min(0).max(1).optional().describe("Confidence floor"),
2323	    tags: z.array(z.string()).optional().describe("Optional tag filter"),
2324	    limit: z.number().int().positive().optional().describe("Max results"),
2325	  }).passthrough(),
2326	 
... [+1558 chars truncated]

### Assistant | 2026-06-21T01:43:25.115Z

Now I have everything I need. Let me also check the explain test's action type — the `AIReasoningAction` type must include these new actions for TypeScript to accept them:

### Assistant | 2026-06-21T01:43:26.522Z

[tool_use: Grep]

### User | 2026-06-21T01:43:28.536Z

[tool_result] 23:  AI_REASONING_ACTIONS,
25:  type AIReasoningAction,
566:  ...AI_REASONING_ACTIONS,
597:type AIAction = AIReasoningAction | AICapabilityAction | OutcomeCrosswireAction | RagCrosswireAction | BlueprintLoRAAction | Iter4AIAction | VictorAIDirectAction | CapProbeAction | GrpoAction | IndiaAIOrphanAction | CamMlLedgerAction | XferLearnAction | AttrDetectAction | TpeSearchAction;
1231:export async f
... [+344 chars truncated]

### Assistant | 2026-06-21T01:43:39.944Z

Good. `AIReasoningAction` is derived from `AI_REASONING_ACTIONS` in the schema file. Now I have everything I need. Here is my plan (>50 lines of new code, so stating plan first):

**Plan:**

1. `aiReasoningActionSchemas.ts`: Add `"reasoning_explain_formula"` and `"reasoning_reading_level"` to `AI_REASONING_ACTIONS` after `"reasoning_explain"` (line 491). Add 2 Zod schemas to `ACTION_AI_REASONING_SCHEMAS` after `reasoning_explain:` (line 2331).

2. `aiReasoningDispatcher.ts`: Add 2 `case` blocks after `case "reasoning_explain"` (line 3157), reusing the same lazy import of `reasoningExplainerEngine`.

3. `aiReasoningDispatcher.bounds.test.ts`: Rename all 8 dead `ai_*` action strings to canonical names. Map `ai_belief_topk` → `belief_query` with `topK` param, `ai_belief_entropy` → `belief_query` without topK param. Adjust assertions where the canonical shape differs from what the old names implied.

4. `aiReasoningDispatcher.explain.test.ts`: Rename `ai_explain`→`reasoning_explain`, `ai_explain_formula`→`reasoning_explain_formula`, `ai_reading_level_label`→`reasoning_reading_level`.

Note from the schema: the existing `reasoning_explain` schema has `audience: z.enum(["machinist", "engineer", "manager", "novice"])` but the test uses `"auditor"`. I need to check the actual dispatcher case — it passes `params as unknown as Parameters<typeof reasoningExplainerEngine.explain>[0]`, so Zod validation would reject `"auditor"`. Let me verify this before proceeding.

### Assistant | 2026-06-21T01:43:40.602Z

[tool_use: Read]

### Assistant | 2026-06-21T01:43:41.041Z

[tool_use: Read]

### User | 2026-06-21T01:43:47.687Z

[tool_result] 2326	  reasoning_explain: z.object({
2327	    chain: z.unknown().describe("ManufacturingReasoningChain to explain"),
2328	    audience: z.enum(["machinist", "engineer", "manager", "novice"]).optional()
2329	      .describe("Audience reading level (default: machinist)"),
2330	    style: z.enum(["narrative", "bullet", "formal"]).optional().describe("Explanation style"),
2331	  }).passthrough(),

### system

... [57 middle messages omitted -- see raw_file] ...

### User | 2026-06-21T01:47:05.348Z

[tool_result] The file H:/prism/mcp-server/src/__tests__/aiReasoningDispatcher.explain.test.ts has been updated. All occurrences were successfully replaced. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-21T01:47:07.627Z

Also update the explain test header comment to remove dead `ai_*` references:

### Assistant | 2026-06-21T01:47:10.121Z

[tool_use: Edit]

### User | 2026-06-21T01:47:13.995Z

[tool_result] The file H:/prism/mcp-server/src/__tests__/aiReasoningDispatcher.explain.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-21T01:47:16.651Z

All edits done. Now run the hard gate tests and the tsc check in parallel:

### Assistant | 2026-06-21T01:47:18.431Z

[tool_use: Bash]

### User | 2026-06-21T01:47:24.321Z

[tool_result] + Received

- false
+ true

 ❯ src/__tests__/aiReasoningDispatcher.explain.test.ts:116:25
    114|       context: { recommendation: "x" },
    115|     });
    116|     expect(out.success).toBe(false);
       |                         ^
    117|     expect(String(out.error)).toMatch(/question/i);
    118|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  src/__tests__/aiReasoningDispatcher.explain.tes
... [+721 chars truncated]

### Assistant | 2026-06-21T01:47:29.160Z

3 failures in the explain test — the `reasoning_explain` schema uses `.passthrough()` so Zod doesn't enforce `question` min-length or `maxWords` max. The existing schema accepts `chain` (a reasoning chain), not `question`/`maxWords`. The schema is too permissive for these test cases.

I need to check what the schema actually validates for `reasoning_explain` vs what the test expects — and whether the dispatcher validates via schema before calling the engine:

### Assistant | 2026-06-21T01:47:31.279Z

[tool_use: Grep]

### User | 2026-06-21T01:47:33.136Z

[tool_result] 310-  "extract_intent_entities",
311-  // Unit 4 -- PolicyExperienceLedgerEngine (append-only RL (s,a,r,s') JSONL store; offline-RL feed).
312-  // Read-only surfaces ONLY: stats() = totals/by-domain/by-adapter/reward summary; query() = filtered
313:  // tuple read (safeParse-guarded, never throws). append() is a WRITE -- deliberately NOT wired (R12 DATA-only).
314-  "policy_experience_stats",
315
... [+1236 chars truncated]

### Assistant | 2026-06-21T01:47:35.575Z

Let me find where schema validation actually fires in the dispatcher:

### Assistant | 2026-06-21T01:47:35.900Z

[tool_use: Read]

### User | 2026-06-21T01:47:36.753Z

[tool_result] 1231	export async function executeAIReasoningAction(
1232	  action: AIAction,
1233	  params: Record<string, unknown>
1234	): Promise<{ success: boolean; data?: unknown; error?: string }> {
1235	  const startTime = Date.now();
1236	  log.info(`[prism_ai] Executing action: ${action}`);
1237	
1238	  // Validate params against schema (U-WIRE03: pass the schema MAP, not the per-action schema —
1239	  /
... [+3097 chars truncated]

### Assistant | 2026-06-21T01:47:41.502Z

The dispatcher calls `validateActionParams(action, params, ALL_AI_SCHEMAS)`. The existing `reasoning_explain` schema uses `.passthrough()` — meaning it will validate what's declared but let extra fields through. The issue is: the schema declares `chain` as required (no `.optional()`), but the test passes `question`/`context`. Since `.passthrough()` is set, unknown keys go through — but `chain` is not marked optional so it could be required.

Let me check `validateActionParams` to understand exactly how it handles passthrough vs required fields:

### Assistant | 2026-06-21T01:47:42.628Z

[tool_use: Grep]

### User | 2026-06-21T01:47:43.915Z

[tool_result] src\validation\actionParamValidator.ts-32-  error?: {
src\validation\actionParamValidator.ts-33-    error: "validation_error";
src\validation\actionParamValidator.ts-34-    action: string;
src\validation\actionParamValidator.ts-35-    message: string;
src\validation\actionParamValidator.ts-36-    missing: string[];
src\validation\actionParamValidator.ts-37-    invalid: Array<{ field: string; expec
... [+6515 chars truncated]

### Assistant | 2026-06-21T01:47:55.304Z

Now I understand the issue clearly. The existing `reasoning_explain` schema has `.passthrough()` so unknown fields pass through, but `chain: z.unknown()` is required (not optional) — yet the test passes `question`/`context` without `chain`. The schema uses `.passthrough()` which still validates declared fields. Since `chain: z.unknown()` accepts literally anything including `undefined`, and `z.unknown()` does NOT require the field to be present (it means any value is valid IF provided) — wait, I need to verify: does `z.unknown()` require the key, or is it optional by nature?

In Zod, `z.unknown()` on an object field IS required unless `.optional()` is added. But `.passthrough()` only affects extra keys — it doesn't make declared keys optional. So `chain` is required.

The tests pass `question`/`context` without `chain` — so the schema should fail but the tests expect it to succeed. This means the old `ai_explain` action had NO schema (pass-through), and now `reasoning_explain` has a schema that blocks it.

The fix: the existing `reasoning_explain` schema was designed for a different call signature (passing a raw chain). The test uses `question`/`context`/`audience`/`maxWords` — the `ExplanationRequest` interface. I need to update the `reasoning_explain` schema to match the actual `ExplanationRequest` shape the test uses, while keeping the two new Zod rejection tests (empty question, unknown audience, maxWords > 2000) working.

### Assistant | 2026-06-21T01:48:01.335Z

[tool_use: Edit]

### User | 2026-06-21T01:48:04.294Z

[tool_result] The file H:/prism/mcp-server/src/schemas/aiReasoningActionSchemas.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-21T01:48:07.935Z

Now run the tests again:

### Assistant | 2026-06-21T01:48:09.885Z

[tool_use: Bash]

### User | 2026-06-21T01:48:15.353Z

[tool_result] TypeError: Cannot read properties of undefined (reading '_zod')
 ❯ Object.inst._zod.parse node_modules/zod/v4/core/schemas.js:1398:46
 ❯ eval node_modules/zod/v4/core/doc.js:33:16
 ❯ node_modules/zod/v4/core/schemas.js:897:34
 ❯ Object.inst._zod.parse node_modules/zod/v4/core/schemas.js:922:23
 ❯ Module.<anonymous> node_modules/zod/v4/core/parse.js:33:32
 ❯ _.inst.safeParse node_modules/zod/v4/cla
... [+729 chars truncated]

### Assistant | 2026-06-21T01:48:18.673Z

The `_zod` error is a Zod v4 issue — `z.record(z.unknown())` is not the right API in this version. Let me check what Zod version is in use and fix the schema:

### Assistant | 2026-06-21T01:48:19.608Z

[tool_use: Bash]

### User | 2026-06-21T01:48:23.103Z

[tool_result] has ZodRecord
[ 'record' ]

### Assistant | 2026-06-21T01:48:26.318Z

[tool_use: Bash]

### User | 2026-06-21T01:48:30.325Z

[tool_result] true

### Assistant | 2026-06-21T01:48:33.137Z

The fix is to use `z.record(z.string(), z.unknown())` (two-argument form). Update the schema:

### Assistant | 2026-06-21T01:48:34.720Z

[tool_use: Edit]

### User | 2026-06-21T01:48:37.284Z

[tool_result] The file H:/prism/mcp-server/src/schemas/aiReasoningActionSchemas.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-21T01:48:39.294Z

Now run the tests again:

### Assistant | 2026-06-21T01:48:41.648Z

[tool_use: Bash]

### User | 2026-06-21T01:48:47.903Z

[tool_result] stderr | src/__tests__/aiReasoningDispatcherUnwiredBatch1.test.ts > prism_ai — U-WIRE-AI-BATCH1 newly-wired engines > rejects ensemble_register_member with missing member field (schema validation)
[INFO] [prism_ai] Executing action: ensemble_register_member

stderr | src/__tests__/aiReasoningDispatcherUnwiredBatch1.test.ts > prism_ai — U-WIRE-AI-BATCH1 newly-wired engines > rejects ensemble_regist
... [+996 chars truncated]

### Assistant | 2026-06-21T01:48:52.196Z

All 85 tests pass across all 4 files. The `stderr` lines are expected INFO/ERROR log output from the dispatcher — not failures. Now run the tsc check:

### Assistant | 2026-06-21T01:48:53.242Z

[tool_use: Bash]

### User | 2026-06-21T01:49:26.295Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-21T01:49:31.375Z

Empty output — no TypeScript errors in either changed source file. Let me also verify no `ai_*` reasoning action names leaked back in:

### Assistant | 2026-06-21T01:49:33.449Z

[tool_use: Bash]

### User | 2026-06-21T01:49:38.231Z

[tool_result] src/schemas/aiReasoningActionSchemas.ts:65:  "ai_explain_decision",
src/tools/dispatchers/aiReasoningDispatcher.ts:1794:      case "ai_explain_decision": {

### Assistant | 2026-06-21T01:49:51.840Z

`ai_explain_decision` is an unrelated action that was already in the file — not one of the dead actions from the diagnosis. Zero dead stale names in the edited files.

---

**Final Report:**

**1. Vitest result:** Test Files 4 passed, Tests 85 passed (85)

**2. tsc grep result:** Empty — no TypeScript errors in `aiReasoningDispatcher.ts` or `aiReasoningActionSchemas.ts`

**3. Two new actions wired:**
- `reasoning_explain_formula` — returns `{ formula: string, audience: string, explanation: string }`
- `reasoning_reading_level` — returns `{ grade: number, label: string }`

**4. Assertions adjusted (with reasons):**

- `reasoning_explain` schema: replaced stale `chain: z.unknown()` schema (designed for a raw reasoning chain) with the correct `ExplanationRequest` shape — `question: z.string().min(1)`, `context: z.record(z.string(), z.unknown())`, `audience: z.enum([...])`, `maxWords: z.number().int().min(1).max(2000)` — because the test calls the engine with `question`/`context` params and the old schema would have passed all inputs silently through via `.passthrough()` without enforcing any field constraints. The 3 Zod rejection tests (empty question, unknown audience enum, maxWords > 2000) now correctly gate.

- `ai_belief_topk` → `belief_query` with `{id, topK: k}` param. The canonical `belief_query` case already returns `topK` in its result (default 3, or the requested count), so `data.topK` assertions are unchanged.

- `ai_belief_entropy` → `belief_query` with `{id}`. The canonical case includes `entropy_bits` by default (when `includeEntropy !== false`), so `data.entropy_bits` assertions are unchanged.

**5. Zero `ai_*` reasoning action names re-added.** (`ai_explain_decision` pre-existed and was not touched.)
