---
type: "chat-session"
source: "claude-code-cli"
session_id: "06e3b710-cc8b-4160-a16d-b4938644fa7a"
title: "Review an ADDITIVE feature in the PRISM repo (H:/prism). Grade PASS or FAIL with"
date: "2026-06-23"
first_ts: "2026-06-23T22:44:03.252Z"
last_ts: "2026-06-23T22:50:21.149Z"
cwd: "H:\\prism"
messages: 61
user_msgs: 22
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/06e3b710-cc8b-4160-a16d-b4938644fa7a/subagents/agent-ae23640087281bf66.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Review an ADDITIVE feature in the PRISM repo (H:/prism). Grade PASS or FAIL with

> **claude-code-cli** | 2026-06-23 | 61 msgs (22 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/06e3b710-cc8b-4160-a16d-b4938644fa7a/subagents/agent-ae23640087281bf66.jsonl`

## Transcript

### User | 2026-06-23T22:44:03.252Z

Review an ADDITIVE feature in the PRISM repo (H:/prism). Grade PASS or FAIL with P0/P1/P2 findings and file:line citations. Read each file end-to-end.

CONTEXT / CONTRACT:
The unit adds a LIVE async fan-out path to the XPROC-NEURAL T12 orchestrator. Previously `CrossProcessHierarchicalNeuralOrchestratorEngine.orchestrate()` (sync) used a placeholder-echo `defaultInvoker` when no `tier_invoker` was supplied (R12-honest "default_stub" signal). This unit adds:
- Engine `static async orchestrateLive(input, invoker: AsyncTierInvoker)` — a PURE async composer (no I/O): same routing/provenance/headline contract as sync `orchestrate`, but awaits a REQUIRED async per-tier invoker, runs tiers in PARALLEL (Promise.all), preserves route order, records per-tier ok/error, sets `fan_out_mode: "live"` (>=1 ok) or `"none"`.
- `buildOllamaTierInvoker()` factory (lazy-imports OllamaClientEngine) — the Ollama-offload default invoker; fail-loud (throws on miss/timeout/empty so the tier records status='error', never a silent stub).
- `crossProcessHierarchicalNeuralOrchestratorAsync(action, params)` wrapper for action `xproc_orchestrate_live` (injectable `tier_invoker_async` for tests).
- Wiring: aiReasoningDispatcher.ts XPROC_ROUTES map + a BARE case in the xproc fall-through chain; aiReasoningActionSchemas.ts enum + schema map (+1 each, must keep the bijection).

INVARIANTS THAT MUST HOLD (verify each):
1. The 29 PRE-EXISTING sync orchestrate/orchestrateBrief tests are NOT affected (sync `orchestrate()` byte-identical except the fan_out_mode union type gained "live").
2. The new bare `case "xproc_orchestrate_live":` did NOT sever the xproc bare-case fall-through chain (this exact regression happened before — [[reference_xproc_fallthrough_severed_2026_06_20]]; the chain terminates at `case "xproc_outcome_adapter_reset": { result = await routeXprocAction(...) }` ~line 2941). Confirm the new case is bodyless and still falls through to routeXprocAction.
3. Engine purity: orchestrateLive mus
... [+1217 chars truncated]

### Assistant | 2026-06-23T22:44:07.469Z

I'll review this additive feature end-to-end. Let me start by reading all four files completely.

### Assistant | 2026-06-23T22:44:07.946Z

[tool_use: Read]

### Assistant | 2026-06-23T22:44:08.534Z

[tool_use: Read]

### User | 2026-06-23T22:44:08.890Z

[tool_result] 1	/**
2	 * CrossProcessHierarchicalNeuralOrchestratorEngine — XPROC-NEURAL Tier 12 (T12-02)
3	 *
4	 * Top-level operator-facing orchestrator. Composes outputs from multiple
5	 * XPROC tier engines into a single answer with full provenance.
6	 *
7	 * Pipeline:
8	 *   1. Route query → T12-01 returns tier list
9	 *   2. For each available tier, invoke its primary engine with the query's
10	 *      pa
... [+21149 chars truncated]

### User | 2026-06-23T22:44:09.692Z

[tool_result] 1	/**
2	 * CrossProcessHierarchicalNeuralOrchestratorEngine — T12-02 tests.
3	 * Compose tier outputs into a unified answer with provenance.
4	 */
5	
6	import { describe, it, expect } from "vitest";
7	import {
8	  CrossProcessHierarchicalNeuralOrchestratorEngine as Orch,
9	  crossProcessHierarchicalNeuralOrchestrator,
10	  crossProcessHierarchicalNeuralOrchestratorAsync,
11	  type OrchestrateInput
... [+21718 chars truncated]

### Assistant | 2026-06-23T22:44:14.575Z

The engine and test files are read end-to-end. Now let me examine the two wiring files (dispatcher and schemas) to verify the bare-case fall-through, the XPROC_ROUTES entry, and the enum/schema-map bijection.

### Assistant | 2026-06-23T22:44:15.882Z

[tool_use: Read]

### Assistant | 2026-06-23T22:44:16.370Z

[tool_use: Read]

### User | 2026-06-23T22:44:16.859Z

[tool_result] 620	
621	type XprocEngineLoader = () => Promise<(action: string, params: Record<string, unknown>) => unknown>;
622	
623	const XPROC_ROUTES: Record<string, XprocEngineLoader> = {
624	  // Tier 8 — Neuro-symbolic
625	  xproc_symbolic_project: () => import("../../engines/CrossProcessSymbolicConstraintEnforcerEngine.js").then(m => m.crossProcessSymbolicEnforcer),
626	  xproc_symbolic_violations: () =>
... [+15380 chars truncated]

### User | 2026-06-23T22:44:17.423Z

[tool_result] 2790	              recorded: false,
2791	              reason: `Unknown eventId: ${p.eventId}`,
2792	              error: `eventId not found: ${p.eventId}`,
2793	            }
2794	          : { learned, recorded: true, ...learned };
2795	        break;
2796	      }
2797	      case "exception_pending": {
2798	        const { exceptionLearningEngine } = await import("../../engines/ExceptionLearning
... [+9295 chars truncated]

### Assistant | 2026-06-23T22:44:24.775Z

The bare-case fall-through is correctly placed. The new `case "xproc_orchestrate_live":` (line 2844) sits bodyless inside the contiguous upper sub-block that terminates at `xproc_outcome_adapter_reset` (line 2943) which calls `routeXprocAction`. This is correct — it falls through to `routeXprocAction`, NOT into the `outcome_trace_record` body below.

Now I need to verify a critical coupling concern. The bare case routes via `routeXprocAction(action, params)`. I need to check whether `routeXprocAction` resolves `xproc_orchestrate_live` to the async wrapper (returning a Promise) and awaits it. Let me find `routeXprocAction`.

### Assistant | 2026-06-23T22:44:25.414Z

[tool_use: Grep]

### User | 2026-06-23T22:44:27.419Z

[tool_result] 1196:async function routeXprocAction(action: string, params: Record<string, unknown>): Promise<unknown> {

### Assistant | 2026-06-23T22:44:30.438Z

[tool_use: Read]

### User | 2026-06-23T22:44:31.314Z

[tool_result] 1196	async function routeXprocAction(action: string, params: Record<string, unknown>): Promise<unknown> {
1197	  // Tier 1: per-action handler (singleton-based engines, no uniform wrapper).
1198	  const tier1 = XPROC_TIER1_HANDLERS[action];
1199	  if (tier1) return tier1(params);
1200	
1201	  // Tier 2-12: uniform wrapper-function engines, lazy-loaded + cached.
1202	  let wrapper = _xprocCache.get
... [+2291 chars truncated]

### Assistant | 2026-06-23T22:44:40.759Z

This is the critical correctness point. Line 1211 `return wrapper(action, params)` returns `wrapper(...)`. For `xproc_orchestrate_live`, the loader (line 656) resolves to `crossProcessHierarchicalNeuralOrchestratorAsync`, which is `async` and returns a `Promise<unknown>`. Since `routeXprocAction` is itself `async` and `return`s that promise, the returned promise is unwrapped/awaited correctly through the async chain. And the bare case at line 2955 does `result = await routeXprocAction(action, params)`. So the Promise is properly awaited. Good — no floating-promise / unresolved-promise leak.

Now let me verify the schema file: the enum entry, the schema-map entry, and the bijection assertion in the dispatcher test. Let me read the relevant sections.

### Assistant | 2026-06-23T22:44:41.711Z

[tool_use: Read]

### Assistant | 2026-06-23T22:44:42.483Z

[tool_use: Read]

### User | 2026-06-23T22:44:42.736Z

[tool_result] 200	  "xproc_causal_test_independence",
201	  "xproc_causal_export_graph",
202	  "xproc_do_identify",
203	  "xproc_do_intervene",
204	  "xproc_counterfactual_query",
205	  "xproc_mediation_decompose",
206	  "xproc_mediation_path_strength",
207	  // T11 Active Learning & Curiosity (4 engines)
208	  "xproc_active_select",
209	  "xproc_active_rationale",
210	  "xproc_novelty_score",
211	  "xproc_nove
... [+972 chars truncated]

### User | 2026-06-23T22:44:43.455Z

[tool_result] 1810	  xproc_modality_dropout: z.object({}).passthrough(),
1811	  xproc_modality_predict: z.object({}).passthrough(),
1812	  xproc_modality_availability: z.object({}).passthrough(),
1813	  xproc_modality_constants: z.object({}).passthrough(),
1814	  // U-XPROC-T2-T12-PRISM-AI-WIRE — Tiers 2-9 + 11-12 fleet (124 actions across 38 engines).
1815	  // All engines do their own Zod validation in their 
... [+3218 chars truncated]

### Assistant | 2026-06-23T22:44:47.051Z

Both the enum (line 221) and schema map (line 1840) gained `xproc_orchestrate_live` — bijection preserved, +1 each. Now let me verify the dispatcher test's bijection/floor assertions (line ~33, ~34) and confirm the test file structure.

### Assistant | 2026-06-23T22:44:47.894Z

[tool_use: Read]

### User | 2026-06-23T22:44:49.200Z

[tool_result] 1	/**
2	 * AI Reasoning Dispatcher Tests — prism_ai
3	 * =========================================
4	 * ≥10 real-input cases + edge cases + integration with MillMasterOrchestratorFacadeEngine.
5	 *
6	 * @module __tests__/aiReasoningDispatcher.test
7	 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
8	 */
9	
10	import { describe, it, expect, beforeAll } from "vitest";
11	import {
12	  executeAIReason
... [+2436 chars truncated]

### Assistant | 2026-06-23T22:44:54.657Z

The dispatcher test is structural (line 32-34): no-dup, bijection, floor `>=426`. Adding `xproc_orchestrate_live` to both the enum and schema map keeps the set bijective and increments the count, so all three assertions hold. Note the test imports `AI_REASONING_ACTIONS` and `ACTION_AI_REASONING_SCHEMAS` (not `ALL_AI_ACTIONS`/`ALL_AI_SCHEMAS`). Let me confirm `xproc_orchestrate_live` lands in those specific exported names, and check that the enum entry I saw at line 221 is part of `AI_REASONING_ACTIONS`.

### Assistant | 2026-06-23T22:44:56.015Z

[tool_use: Grep]

### User | 2026-06-23T22:44:57.461Z

[tool_result] 21:export const AI_REASONING_ACTIONS = [
562:export type AIReasoningAction = (typeof AI_REASONING_ACTIONS)[number];
1405:export const ACTION_AI_REASONING_SCHEMAS: Record<AIReasoningAction, z.ZodTypeAny> = {

### Assistant | 2026-06-23T22:45:07.825Z

Both target exports are confirmed: `AI_REASONING_ACTIONS` starts at line 21 (so the entry at line 221 is inside it), and `ACTION_AI_REASONING_SCHEMAS` is the `Record<AIReasoningAction, z.ZodTypeAny>` at line 1405 (so the entry at line 1840 is inside it, and its type is keyed by `AIReasoningAction` — TS would error if the schema map key were not in the enum, and tsc passed). Bijection is statically enforced AND test-asserted.

Now let me verify the `OllamaClientEngine` contract that `buildOllamaTierInvoker` depends on — `connect()` returning `{ok, error}`, and `generate()` returning `{ok, value, error, wallMs}`. This is the hidden-coupling risk: if the actual API shape differs, the factory is silently broken (and untested since tests inject a mock).

### Assistant | 2026-06-23T22:45:09.191Z

[tool_use: Grep]

### User | 2026-06-23T22:45:11.194Z

[tool_result] 53:  wallMs: number;
56:function success<T>(value: T, wallMs: number): OllamaResult<T> {
57:  return { ok: true, value, error: null, wallMs };
60:function failure<T>(error: string, wallMs: number): OllamaResult<T> {
61:  return { ok: false, value: null, error, wallMs };
81:  async connect(host = DEFAULT_OLLAMA_HOST): Promise<OllamaResult<void>> {
116:  async generate(options: OllamaGenerateOptions
... [+34 chars truncated]

### Assistant | 2026-06-23T22:45:14.803Z

Let me read the `OllamaClientEngine` definitions for `connect`, `generate`, the `OllamaResult` type, and `OllamaGenerateOptions` to verify the exact contract `buildOllamaTierInvoker` relies on.

### Assistant | 2026-06-23T22:45:15.406Z

[tool_use: Read]

### User | 2026-06-23T22:45:16.322Z

[tool_result] 1	/**
2	 * OllamaClientEngine — Thin client around the `ollama` npm package
3	 *
4	 * Phase external-infra. Wraps Ollama's local LLM runtime so PRISM callers
5	 * can request chat completions, plain-text generation, and embeddings
6	 * without importing the Ollama SDK directly. The real daemon must be
7	 * running (either via `docker compose up -d ollama` or a host install);
8	 * this engine is a 
... [+5943 chars truncated]

### Assistant | 2026-06-23T22:45:24.486Z

The `OllamaClientEngine` contract matches `buildOllamaTierInvoker` exactly:
- `connect()` returns `OllamaResult<void>` with `{ok, error}` — used at line 445-446.
- `generate({model, prompt, system, temperature, maxTokens})` returns `OllamaResult<string>` with `{ok, value, error, wallMs}` — used at line 459-466. `generate` validates options via `validateGenerate` and the success path returns `r.response ?? ""`.

One subtle point: `generate` on a successful HTTP call returns `success(r.response ?? "", ...)` — so an empty response yields `{ok:true, value:""}`. The factory's check at line 463 `if (!r.ok || r.value == null || r.value.trim() === "")` correctly catches the empty-string case and throws, so the empty-response degenerate path is fail-loud. Good.

Let me verify the `RouteResult`/tier shape that `orchestrateLive` consumes — specifically that `tier.reason` exists (used at line 289 in the new `ctx`), since the sync `orchestrate` never references `tier.reason`. If `reason` doesn't exist on the tier object, the new context would silently carry `undefined`.

### Assistant | 2026-06-23T22:45:26.348Z

[tool_use: Grep]

### User | 2026-06-23T22:45:27.923Z

[tool_result] 15: *   - tiers: ordered list of tiers to invoke (primary first)
16: *   - reason: human-readable explanation tied to roadmap
36:  max_tiers: z.number().int().min(1).max(11).default(4).describe("Cap on returned tier count"),
67:export interface RoutedTier {
68:  tier_id: TierId;
69:  engine_id: string;
70:  confidence: number;       // 0..1
71:  reason: string;
72:  available: boolean;       // fa
... [+3560 chars truncated]

### Assistant | 2026-06-23T22:45:44.973Z

Confirmed: `RoutedTier` (line 67-73) has all six fields the new `ctx` reads — `tier_id`, `engine_id`, `confidence`, `reason`, `available`. So `ctx.reason` (line 289) is a real populated string, not `undefined`. The test at line 367 asserts `t803!.reason).toMatch(/safety|neuro-symbolic/i)` which matches the route table entry at line 159. Good.

Now let me address the two most important adversarial concerns specific to `orchestrateLive`:

1. **Sparse-array `provenance.filter()` correctness.** `provenance` is built via `new Array(route.tiers.length)` (line 265) and filled by index in both the unavailable (synchronous, line 271) and async (line 300/309) paths. The unavailable entries are assigned synchronously before `Promise.all`, and the ok/error entries inside the `jobs` closures all complete before `Promise.all` resolves. So by line 325, every index 0..n-1 is filled — no holes. `Array.prototype.filter` skips holes, but there are none here. Let me confirm there is no path where an index is left unassigned (e.g., an available tier whose job neither resolves nor rejects). The closure's try/catch covers both, so every available index gets exactly one assignment. The route-empty case (`route.tiers.length === 0`) yields `new Array(0)` → `[]`, matching the test at line 424. This is correct.

2. **`reduce` on `okEntries`** — guarded by `okEntries.length > 0` (line 330), so no empty-reduce throw.

Let me double-check one convention/coupling item: whether `crossProcessHierarchicalNeuralOrchestrator` (the SYNC wrapper) is still wired for `xproc_orchestrate_full`/`brief` while the new ASYNC wrapper handles `xproc_orchestrate_live` — and confirm the bare case at 2842/2843 (full/brief) still routes correctly through `routeXprocAction` → sync wrapper. The XPROC_ROUTES map shows line 654/655 → `crossProcessHierarchicalNeuralOrchestrator` (sync) and line 656 → `crossProcessHierarchicalNeuralOrchestratorAsync`. Both are bare cases in the upper sub-block. Since `routeXprocAction` does
... [+476 chars truncated]

### Assistant | 2026-06-23T22:45:46.203Z

[tool_use: Grep]

### User | 2026-06-23T22:45:48.428Z

[tool_result] Found 80 files
mcp-server\src\__tests__\CrossProcessHierarchicalNeuralOrchestratorEngine.test.ts
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\engines\CrossProcessHierarchicalNeuralOrchestratorEngine.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts
mcp-server\src\engines\PowerMillAIOrchestrationEngine.ts
mcp-server\src\tools\dispatchers\turningDispatcher.ts
mcp-serve
... [+4356 chars truncated]

### Assistant | 2026-06-23T22:45:53.392Z

Most of these matches are unrelated orchestrators (Mastercam/hyperMILL/lathe/etc). The `fan_out_mode` symbol is specific to this engine. Let me scope to just `fan_out_mode` to confirm there's no external consumer that does exhaustive-switch narrowing on the old 3-member union (which would now be a tsc error or a missing-case) — but tsc passed, so any consumer must already accept the wider union. Let me confirm there are no consumers outside the engine + its test.

### Assistant | 2026-06-23T22:45:54.271Z

[tool_use: Grep]

### User | 2026-06-23T22:45:56.878Z

[tool_result] Found 2 files
mcp-server\src\__tests__\CrossProcessHierarchicalNeuralOrchestratorEngine.test.ts
mcp-server\src\engines\CrossProcessHierarchicalNeuralOrchestratorEngine.ts

### Assistant | 2026-06-23T22:46:09.188Z

`fan_out_mode` is referenced only in the engine and its test — no external consumer does exhaustive narrowing that the widened union could break. The `orchestrateBrief` return type still declares `fan_out_mode: "supplied" | "default_stub" | "none"` (line 369), which is a narrower type than `OrchestrateResult["fan_out_mode"]`. Since `orchestrateBrief` only ever calls the sync `orchestrate` (line 371), which can only produce `supplied`/`default_stub`/`none` (never `live`), assigning `full.fan_out_mode` (typed as the 4-member union) to the 3-member return — let me verify that doesn't cause a type error. Actually `orchestrateBrief` returns `full.fan_out_mode` at line 381, and `full` is typed `OrchestrateResult`, so `full.fan_out_mode` is the 4-member union being returned where the 3-member union is declared. That would be a tsc error... but tsc passed per the contract. Let me re-read those exact lines to confirm the narrowing is sound.

The relevant lines: `orchestrateBrief` return type (line 364-370) declares `fan_out_mode: "supplied" | "default_stub" | "none"`, and line 381 returns `fan_out_mode: full.fan_out_mode` where `full: OrchestrateResult` has the 4-member union. This is a genuine type-widening assignment that TypeScript would normally reject (`"live"` not assignable to the narrower union).

The contract states "tsc --noEmit 0 errors" was verified. For both to be true, the brief return type must have also been widened, OR the assignment is structurally accepted. Let me re-read lines 361-383 precisely — I already have them from the first Read. Line 369 declares the 3-member union; line 381 assigns the 4-member `full.fan_out_mode`. This IS a type mismatch that tsc would flag.

Let me verify by checking whether tsc actually catches this, since this is the one place the contract claim and the code appear to diverge. Let me run a targeted type check.

### Assistant | 2026-06-23T22:46:11.098Z

[tool_use: Bash]

### User | 2026-06-23T22:46:43.490Z

[tool_result] ---EXIT:134---

### Assistant | 2026-06-23T22:46:49.310Z

Exit 134 is an OOM (the tsc heap blew up — this repo needs a 16GB heap per the CLAUDE.md). The grep found no matching lines, but that's because tsc crashed before completing. Let me reason about the type instead of relying on a full build, and verify with a minimal isolated check.

Actually, let me reason it out precisely. In TypeScript, returning a value of type `"supplied" | "default_stub" | "live" | "none"` for a property declared as `"supplied" | "default_stub" | "none"` is an error: `"live"` is not assignable. This would be `error TS2322`. The contract says tsc passed with 0 errors. Let me verify by isolating just this file's type-checking with adequate heap, scoped narrowly.

### Assistant | 2026-06-23T22:46:52.070Z

[tool_use: Bash]

### User | 2026-06-23T22:46:59.153Z

[tool_result] C:/Users/wompu/AppData/Local/Temp/fanout_check.ts(4,12): error TS2322: Type 'Wide' is not assignable to type '"none" | "supplied" | "default_stub"'.
  Type '"live"' is not assignable to type '"none" | "supplied" | "default_stub"'.
---EXIT:2---

### Assistant | 2026-06-23T22:47:09.209Z

The isolated reproduction confirms the type theory: returning a 4-member union (`Wide`) where a 3-member union is declared is `error TS2322`. 

But the structural setup in my isolated test is identical to the real `orchestrateBrief` ONLY if `full.fan_out_mode` is actually typed as the wide union. In the real engine, `orchestrate()` (the method `orchestrateBrief` calls) has an *inferred* return type, not the declared `OrchestrateResult`. Let me check: is `orchestrate()`'s return annotated as `OrchestrateResult`? Looking at line 127: `static orchestrate(input: OrchestrateInput): OrchestrateResult` — yes, explicitly annotated. So `this.orchestrate(input)` returns `OrchestrateResult`, and `full.fan_out_mode` is the 4-member union. Line 381 returns it into the 3-member declared union.

This means there genuinely SHOULD be a TS2322 error at line 381 — which contradicts the "tsc 0 errors" claim. Let me confirm `orchestrate`'s signature and the brief return once more directly, and look very carefully because the actual `fanOutMode` *variable* inside sync `orchestrate` is typed `"supplied" | "default_stub" | "none"` (line 204) — but the method's declared return type `OrchestrateResult` widens `fan_out_mode` to 4 members. The returned object literal's `fan_out_mode` field gets the declared type. So `full.fan_out_mode` is `OrchestrateResult["fan_out_mode"]` = 4-member.

Let me do one more precise isolated test that mirrors the EXACT real structure (method returns annotated `OrchestrateResult`, brief calls it).

### Assistant | 2026-06-23T22:47:12.840Z

[tool_use: Bash]

### User | 2026-06-23T22:47:25.736Z

[tool_result] fanout_real.ts(10,14): error TS2322: Type 'FanWide' is not assignable to type '"none" | "supplied" | "default_stub"'.
  Type '"live"' is not assignable to type '"none" | "supplied" | "default_stub"'.
---EXIT:2---

### Assistant | 2026-06-23T22:47:37.170Z

This precisely mirrors the real `orchestrateBrief` structure and reproduces `error TS2322` at the equivalent of line 381. So the real file *should* have a tsc error at line 381 — unless the real `orchestrateBrief` return type was ALSO widened to include `"live"`.

I read the actual file (line 364-370): the brief return type declares `fan_out_mode: "supplied" | "default_stub" | "none"` — the NARROW 3-member union, NOT widened. And line 381 returns `full.fan_out_mode` (4-member). This is a genuine type mismatch.

The contract claims "tsc --noEmit 0 errors." There are two possibilities: (a) the reviewer's tsc run didn't actually surface this (e.g., OOM'd like mine, or wasn't on the latest file state), or (b) something about the real compilation differs. Given my isolated reproduction is structurally exact, I'm confident this is a real TS2322. Since I cannot complete a full repo tsc (OOM), I must flag this as the strongest finding I can substantiate, and be honest that I could not run the full build to 100% confirm in-context — but the isolated reproduction is conclusive on the type rule.

Let me retry the full tsc once with the proper 16GB heap the repo requires, to definitively confirm whether line 381 errors in the real compilation context.

### Assistant | 2026-06-23T22:47:39.263Z

[tool_use: Bash]

### User | 2026-06-23T22:49:22.599Z

[tool_result] src/engines/CrossProcessHierarchicalNeuralOrchestratorEngine.ts(381,7): error TS2322: Type '"none" | "supplied" | "default_stub" | "live"' is not assignable to type '"none" | "supplied" | "default_stub"'.
src/engines/CrossProcessHierarchicalNeuralOrchestratorEngine.ts(459,25): error TS2322: Type 'string | false' is not assignable to type 'string'.
---DONE rc=2---

### Assistant | 2026-06-23T22:49:28.526Z

The full repo tsc (16GB heap) confirms **TWO real type errors** in the engine file — directly contradicting the "tsc --noEmit 0 errors" claim in the contract:

1. **Line 381** — `orchestrateBrief` returns the widened 4-member `fan_out_mode` into its narrow 3-member declared return type. TS2322.
2. **Line 459** — a second error I had not yet examined: `Type 'string | false' is not assignable to type 'string'` inside `buildOllamaTierInvoker`'s `generate` call. Let me examine line 459 closely to root-cause the second error.

### Assistant | 2026-06-23T22:49:29.496Z

[tool_use: Read]

### User | 2026-06-23T22:49:30.381Z

[tool_result] 436	  const model =
437	    opts?.model ??
438	    (typeof process !== "undefined" && process.env?.PRISM_XPROC_LIVE_MODEL) ??
439	    "qwen2.5-coder:32b";
440	  const timeoutMs = opts?.timeoutMs ?? 30000;
441	  let connected = false;
442	
443	  return async (ctx: TierInvokeContext): Promise<unknown> => {
444	    if (!connected) {
445	      const c = await client.connect();
446	      if (!c.ok) thr
... [+1227 chars truncated]

### Assistant | 2026-06-23T22:49:41.909Z

Root cause of the line 459 error is the `model` constant (lines 436-439). The middle operand of the `??` chain is:

```ts
(typeof process !== "undefined" && process.env?.PRISM_XPROC_LIVE_MODEL)
```

`process.env?.PRISM_XPROC_LIVE_MODEL` is `string | undefined`, but the `&&` with the boolean `typeof process !== "undefined"` produces `false | string | undefined`. The `?? "qwen2.5-coder:32b"` only replaces `null`/`undefined`, NOT `false`. So when `typeof process !== "undefined"` is `false`, the expression short-circuits to the boolean `false`, which `??` does not catch. Therefore `model` is typed `string | false`, and `generate({ model, ... })` requires `model: string` → TS2322 at line 459.

This is both a **type error** and a **latent runtime defect**: in any environment where `process` is undefined (e.g., a browser/worker bundle, or a non-Node runtime), `model` would be the boolean `false` and would be passed as the Ollama model id. The correct idiom is to guard so the operand is `string | undefined`, e.g. `(typeof process !== "undefined" ? process.env?.PRISM_XPROC_LIVE_MODEL : undefined)`.

Both errors are real, confirmed by the authoritative full-repo tsc with the correct heap. Now let me verify the test-integrity invariant once more, and check whether the test suite would actually catch these. The tests inject mock invokers (`liveInvoker`, `tier_invoker_async`) for all `orchestrateLive` paths — so `buildOllamaTierInvoker` (line 430-468) is **never exercised by any test**. That's why the line 459 defect (and the `false` runtime bug) slipped through the "43/43 tests pass" claim. Let me confirm there is no test importing or calling `buildOllamaTierInvoker`.

### Assistant | 2026-06-23T22:49:42.540Z

[tool_use: Grep]

### User | 2026-06-23T22:49:47.058Z

[tool_result] mcp-server\src\engines\CrossProcessHierarchicalNeuralOrchestratorEngine.ts:232:   * {@link buildOllamaTierInvoker}) so the headline is a genuine answer, NOT
mcp-server\src\engines\CrossProcessHierarchicalNeuralOrchestratorEngine.ts:430:export async function buildOllamaTierInvoker(opts?: {
mcp-server\src\engines\CrossProcessHierarchicalNeuralOrchestratorEngine.ts:489:          : await buildOllamaTi
... [+12 chars truncated]

### Assistant | 2026-06-23T22:50:21.149Z

Confirmed: `buildOllamaTierInvoker` is referenced only in JSDoc (line 232), its own definition (line 430), and the async wrapper's default-build branch (line 489) — which is **never reached in tests** because every test injects `tier_invoker_async`. So the factory has zero test coverage, and both its defects (the `string | false` type error and the underlying `false`-leak runtime bug) went undetected. The contract's "live Ollama run returned fan_out_mode=live (6742ms)" was a manual one-off, not a regression-locked test.

I have now verified every invariant. Let me compile the final verdict.

## Summary of verification performed

I read all four target files end-to-end plus the dependency contracts (`OllamaClientEngine.ts`, `CrossProcessTierRouterEngine.ts`, `routeXprocAction`, and the dispatcher test's bijection assertion). I ran the authoritative full-repo `tsc --noEmit` with the required 16GB heap (the contract's "0 errors" claim was checked and is **false**).

**Invariants confirmed PASS:**
- Inv. 2 (fall-through): the new bare `case "xproc_orchestrate_live":` at `aiReasoningDispatcher.ts:2844` is correctly bodyless and sits inside the contiguous upper sub-block that terminates at `xproc_outcome_adapter_reset` (line 2943) → `result = await routeXprocAction(...)`. It does NOT fall into the `outcome_trace_record` body below. The Promise from the async wrapper is properly awaited via `routeXprocAction` (async, `return wrapper(...)` at line 1211) and the `await` at line 2955. No regression of the 2026-06-20 severance.
- Inv. 3 (engine purity): `orchestrateLive` has zero Ollama/I/O imports; the only I/O is in `buildOllamaTierInvoker` via lazy `await import("./OllamaClientEngine.js")` (line 434).
- Inv. 4 (bijection): `xproc_orchestrate_live` added to enum (`aiReasoningActionSchemas.ts:221`) AND schema map (line 1840), +1 each; the `Record<AIReasoningAction, ...>` typing + the structural test (`aiReasoningDispatcher.test.ts:32-34`) both hold.
- Sparse-array safety: `pr
... [+4235 chars truncated]
