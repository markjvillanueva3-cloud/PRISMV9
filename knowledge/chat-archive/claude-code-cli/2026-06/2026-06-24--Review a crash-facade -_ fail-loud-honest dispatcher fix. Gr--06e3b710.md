---
type: "chat-session"
source: "claude-code-cli"
session_id: "06e3b710-cc8b-4160-a16d-b4938644fa7a"
title: "Review a crash-facade -> fail-loud-honest dispatcher fix. Grade PASS/FAIL with P"
date: "2026-06-24"
first_ts: "2026-06-24T02:43:08.843Z"
last_ts: "2026-06-24T02:45:14.549Z"
cwd: "H:\\prism\\mcp-server"
messages: 38
user_msgs: 15
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/06e3b710-cc8b-4160-a16d-b4938644fa7a/subagents/agent-a384d7cab06a488a0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Review a crash-facade -> fail-loud-honest dispatcher fix. Grade PASS/FAIL with P

> **claude-code-cli** | 2026-06-24 | 38 msgs (15 user / 23 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/06e3b710-cc8b-4160-a16d-b4938644fa7a/subagents/agent-a384d7cab06a488a0.jsonl`

## Transcript

### User | 2026-06-24T02:43:08.843Z

Review a crash-facade -> fail-loud-honest dispatcher fix. Grade PASS/FAIL with P0/P1/P2 + file:line. Hunt for silent breakage.

CHANGES (entire diff):
1. `H:/prism/mcp-server/src/engines/PerAppInCADInferenceAdapter.ts` — ADDED module const `DEFAULT_SLO_TARGET_MS = 100`; changed `private sloTargetMs = 100` -> `= DEFAULT_SLO_TARGET_MS` (behavior-identical); ADDED interface `InCADInferenceCapabilities`; ADDED a pure `static describeCapabilities()` returning the capability contract from the schema enums (CADAppTypeSchema.options etc.). The class CONSTRUCTOR requires `opts: {runtime, extractor, ...}` (both required).
2. `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts` ~line 5820 — `per_app_incad_infer` was `new PerAppInCADInferenceAdapter()` with NO args (constructor reads opts.runtime -> TypeError crash on construct). Rewired to NOT construct: returns `result = {success:true, data:{wired:false, mode:"backend-required", reason, capabilities: PerAppInCADInferenceAdapter.describeCapabilities()}}`.
3. `H:/prism/mcp-server/src/__tests__/cadDispatcher.incad-infer-faillaud.test.ts` — NEW, 5 cases, passing.

CRITICAL CHECKS:
- Confirm the OLD case genuinely crashed on construct: read the constructor (`this.runtime = opts.runtime` with opts undefined -> TypeError). Confirm the NEW case no longer constructs (calls only the static) so it cannot crash. P0 if it still can crash.
- Confirm `static describeCapabilities()` is genuinely pure: no `this`, no construct, no I/O, no Date/random. Confirm it returns spread copies (`[...CADAppTypeSchema.options]`) so a caller can't mutate the zod schema's `.options` array.
- ADDITIVE SAFETY: the field-default change `sloTargetMs = DEFAULT_SLO_TARGET_MS` must equal the old `100` exactly (no behavior change for existing consumers). Confirm DEFAULT_SLO_TARGET_MS === 100. Check the engine's importers/consumers are unaffected (purely additive).
- Is `wired:false` / the data object pruned by responseSlimmer (cadDispatcher's return path)? 
... [+408 chars truncated]

### Assistant | 2026-06-24T02:43:12.799Z

I'll investigate this crash-facade -> fail-loud-honest fix. Let me start by reading the key files.

### Assistant | 2026-06-24T02:43:13.272Z

[tool_use: Read]

### Assistant | 2026-06-24T02:43:13.740Z

[tool_use: Read]

### User | 2026-06-24T02:43:15.577Z

[tool_result] 1	/**
2	 * PerAppInCADInferenceAdapter — U-CAD-APP-20 (PHASE-48)
3	 *
4	 * Embeds foundation model inference directly inside CAD plugin processes
5	 * for ultra-low-latency predictions (≤100ms p99 SLO).
6	 *
7	 * Features:
8	 *   - In-process ONNX/TensorRT model loading per CAD application
9	 *   - Feature extraction from CAD geometry
10	 *   - Multiple inference types (tool, parameter, error, rec
... [+24057 chars truncated]

### User | 2026-06-24T02:43:15.925Z

[tool_result] 1	/**
2	 * cadDispatcher per_app_incad_infer fail-loud-honest wiring (U-INCAD-INFER-FAILLOUD).
3	 *
4	 * The case previously did `new PerAppInCADInferenceAdapter()` with NO args, but the
5	 * constructor REQUIRES an injected InferenceRuntime + FeatureExtractor -> a TypeError
6	 * crash on construct (it never reached the dark runInference/extractFromGeometry probe).
7	 * This adapter runs inference
... [+4892 chars truncated]

### Assistant | 2026-06-24T02:43:20.440Z

The engine file and test file are clear. Now let me read the actual dispatcher change and verify the OLD vs NEW behavior, plus trace the responseSlimmer concern.

### Assistant | 2026-06-24T02:43:22.368Z

[tool_use: Bash]

### Assistant | 2026-06-24T02:43:23.200Z

[tool_use: Bash]

### User | 2026-06-24T02:43:27.448Z

[tool_result]  .claude/settings.json                              |     2 -
 AGENTS.md                                          |   458 +-
 CLAUDE.md                                          |    34 +-
 GEMINI.md                                          |   459 +-
 PRISM-INVENTORY-LATEST.md                          |    44 +-
 knowledge/PRISM Knowledge Vault.md                 |     2 +-
 knowledge/PRISM-System
... [+2358 chars truncated]

### User | 2026-06-24T02:43:32.902Z

[tool_result] diff --git a/mcp-server/src/tools/dispatchers/cadDispatcher.ts b/mcp-server/src/tools/dispatchers/cadDispatcher.ts
index 091097c04f..c987577a84 100644
--- a/mcp-server/src/tools/dispatchers/cadDispatcher.ts
+++ b/mcp-server/src/tools/dispatchers/cadDispatcher.ts
@@ -5818,10 +5818,25 @@ Params vary by action — pass relevant fields in params object.`,
             break;
           }
           case
... [+1998 chars truncated]

### Assistant | 2026-06-24T02:43:39.583Z

The diff is exactly as described. Now let me verify the critical claims. First, the OLD case crash: the old code did `new (mod as any).PerAppInCADInferenceAdapter()` with no args, and the constructor does `this.runtime = opts.runtime` where `opts` is `undefined` -> TypeError. Confirmed by reading the constructor (line 219). The NEW case only calls the static `describeCapabilities()` -> no construct -> cannot crash. Confirmed.

Now let me verify the responseSlimmer concern and how the result is returned/wrapped by the dispatcher.

### Assistant | 2026-06-24T02:43:40.996Z

[tool_use: Grep]

### User | 2026-06-24T02:43:41.954Z

[tool_result] 16:import { slimResponse } from "../../utils/responseSlimmer.js";
5924:          // result=value;break -> post-switch wraps slimResponse(result) into content.
6055:      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };

### Assistant | 2026-06-24T02:43:41.961Z

[tool_use: Grep]

### User | 2026-06-24T02:43:43.072Z

[tool_result] src\tools\dispatchers\cadDispatcher.ts:5821:            // FIX (U-INCAD-INFER-FAILLOUD): the case did `new PerAppInCADInferenceAdapter()`
src\tools\dispatchers\cadDispatcher.ts:5829:            const { PerAppInCADInferenceAdapter } = await import("../../engines/PerAppInCADInferenceAdapter.js");
src\tools\dispatchers\cadDispatcher.ts:5837:                capabilities: PerAppInCADInferenceAdapter.de
... [+2714 chars truncated]

### Assistant | 2026-06-24T02:43:47.778Z

The pre-Grep graph hint flags a critical concern: "slimResponse strips empty arrays at MCP transport". This is exactly the responseSlimmer behavior I need to verify against the asserted fields. The capabilities arrays (`cadApps[10]`, `inferenceTypes[10]`) are NON-empty so they should survive, but `slimResponse` may strip other things. Let me read the responseSlimmer implementation and the dispatcher's post-switch wrapping.

### Assistant | 2026-06-24T02:43:48.043Z

[tool_use: Read]

### Assistant | 2026-06-24T02:43:48.785Z

[tool_use: Read]

### User | 2026-06-24T02:43:49.233Z

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

### User | 2026-06-24T02:43:49.877Z

[tool_result] 5915	              alerts,
5916	              routine,
5917	              bridge: "cad_probe_drift_analyze + alerts → probe_routine_generate (DEA-MS0/U-DEA-november-P06)",
5918	            };
5919	            break;
5920	          }
5921	
5922	          // WIRE-UNWIRED-PAPA / U-WIRE-CREO-RIBBON (slot:papa, 2026-06-15)
5923	          // CreoAddinRibbonEngine (declarative, stateless singleton, lazy-
... [+8118 chars truncated]

### Assistant | 2026-06-24T02:43:59.179Z

I have the full picture of the slimmer behavior. Now let me verify the responseSlimmer interaction carefully against the asserted fields, and check the `wired:false` survival concern.

The slimmer logic (line 42-43):
- Strips `null`/`undefined` values
- Strips empty arrays (`value.length === 0`)
- Recurses into objects/arrays

Critical analysis of the result object `{ success: true, data: { wired: false, mode: "backend-required", reason: "...", capabilities: {...} } }`:
- `success: true` -> survives (boolean, not null/undefined/empty-array)
- `data.wired: false` -> **survives** (boolean `false` is NOT `null`/`undefined`, and `false` is not an empty array). This is the key concern — `false` is falsy but the slimmer only strips `null`/`undefined`/empty-array, NOT all falsy values. Confirmed survives.
- `data.mode`, `data.reason` -> strings, survive
- `data.capabilities.cadApps` (10 items), `inferenceTypes` (10) -> non-empty arrays, survive
- `data.capabilities.backendRequired` -> non-empty object, survives

Now let me check whether `per_app_incad_infer` is in the z.enum action list (so it's reachable), verify there's no OTHER consumer of the old construct path, and check the `register` wrapping where `success === false` short-circuits before content.

### Assistant | 2026-06-24T02:44:00.597Z

[tool_use: Grep]

### Assistant | 2026-06-24T02:44:01.488Z

[tool_use: Read]

### User | 2026-06-24T02:44:03.954Z

[tool_result] 141	describe("PerAppInCADInferenceAdapter", () => {
142	  let adapter: PerAppInCADInferenceAdapter;
143	  let runtime: ReturnType<typeof createMockRuntime>;
144	  let extractor: ReturnType<typeof createMockExtractor>;
145	  let clock: ReturnType<typeof createMockClock>;
146	
147	  beforeEach(() => {
148	    clock = createMockClock();
149	    runtime = createMockRuntime(clock);
150	    extractor = 
... [+948 chars truncated]

### User | 2026-06-24T02:44:04.786Z

[tool_result] src\tools\dispatchers\cadDispatcher.ts:578:  "per_app_incad_infer",
src\tools\dispatchers\cadDispatcher.ts:5820:          case "per_app_incad_infer": {
src\tools\dispatchers\cadDispatcher.ts:5836:                  "per_app_incad_infer runs model inference inside a CAD plugin host and requires an injected InferenceRuntime + FeatureExtractor, which a JSON dispatcher call cannot supply. Invoke from t
... [+882 chars truncated]

### Assistant | 2026-06-24T02:44:10.500Z

Confirmed:
- `per_app_incad_infer` is in the z.enum action list (line 578), so it's a valid reachable action.
- The pre-existing `PerAppInCADInferenceAdapter.test.ts` always constructed the adapter WITH `{runtime, extractor, clock, ...}` (line 151-158) — so the existing importer/consumer tests are unaffected by the additive changes. They never relied on a no-arg constructor.

Now let me verify the `register` wrapper to confirm the `success === false` short-circuit in the test helper matches reality, and confirm there's no double-wrap issue. Let me look at the dispatcher registration around where the handler returns and confirm the response shape. Let me also run the new test to confirm it passes.

### Assistant | 2026-06-24T02:44:11.362Z

[tool_use: Bash]

### User | 2026-06-24T02:44:17.605Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

stderr | src/__tests__/cadDispatcher.incad-infer-faillaud.test.ts > cadDispatcher per_app_incad_infer -- fail-loud-honest (no crash-on-construct) > reports backend-required + real capabilities, NOT a crash or 'method not callable'
[INFO] [prism_cad] Action: per_app_incad_infer

stderr | src/__tests__/cadDispatcher.incad-infer-faillaud.test.ts > cadDispatcher per_a
... [+959 chars truncated]

### Assistant | 2026-06-24T02:44:24.761Z

All 5 tests pass and round-trip through the real `prism_cad` dispatcher. Now let me confirm the additive safety of the `sloTargetMs` default change and verify the old PerAppInCADInferenceAdapter test suite still passes (no behavior change for existing consumers). Let me also do a final check that the static method has no `this`/I/O/Date/random.

The `describeCapabilities()` body (lines 238-251) is verified pure:
- No `this` reference (it's `static`, and the body references only module-const `DEFAULT_SLO_TARGET_MS` and the module-level schema `.options`).
- No `new` / construct.
- No I/O, no `Date`, no `Math.random()`.
- Returns spread copies `[...CADAppTypeSchema.options]` etc. — so a caller mutating the returned arrays cannot corrupt the zod schema's `.options` (the schema arrays are not aliased).

Let me run the existing adapter test suite to confirm the additive change didn't break existing consumers.

### Assistant | 2026-06-24T02:44:25.619Z

[tool_use: Bash]

### User | 2026-06-24T02:44:31.892Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/PerAppInCADInferenceAdapter.test.ts (54 tests) 75ms

 Test Files  1 passed (1)
      Tests  54 passed (54)
   Start at  21:44:30
   Duration  283ms (transform 47ms, setup 0ms, import 102ms, tests 75ms, environment 0ms)

### Assistant | 2026-06-24T02:44:41.443Z

All 54 pre-existing tests pass — the additive changes broke nothing. Now let me verify one subtle concern: zod's `.options` property type. Is `[...CADAppTypeSchema.options]` actually a mutation-safe spread of a real array, and could the `as T` cast in slimmer or the spread expose a frozen/readonly array issue? Let me also confirm `.options` is the right zod accessor (not `.enum` or `.values`) and that the spread genuinely produces a fresh array each call (deterministic + non-aliased). The test at line 87 asserts `c.cadApps).toEqual([...CADAppTypeSchema.options])` and passes, confirming the accessor and content. And test line 80 (`a.data).toEqual(b.data`) confirms determinism across calls.

Let me do a final blast-radius check — confirm no other call site relied on the old crash-path return shape (`{ engine, note: "method not callable" }` or `runInference`/`extractFromGeometry` results) being returned from this action.

### Assistant | 2026-06-24T02:44:42.191Z

[tool_use: Grep]

### User | 2026-06-24T02:44:43.173Z

[tool_result] No matches found

### Assistant | 2026-06-24T02:44:43.402Z

[tool_use: Grep]

### User | 2026-06-24T02:44:51.121Z

[tool_result] Found 5 files
src\__tests__\cadDispatcher.incad-infer-faillaud.test.ts
H:\prism\knowledge\wiki\consensus\a36c971c.md
src\tools\dispatchers\cadDispatcher.ts
H:\prism\state\shared\SCHEMA_GAP_REPORT.json
data\state\ACTIONS_INDEX.json

### Assistant | 2026-06-24T02:45:14.549Z

No web/frontend consumer reads the old crash-path return shape. The remaining references are the dispatcher itself, the new test, and metadata/index files (`SCHEMA_GAP_REPORT.json`, `ACTIONS_INDEX.json`, a consensus wiki note) — none of which consume the runtime return shape. No silent breakage from the changed return shape.

I have everything I need to render a verdict. Let me compile my findings.

## Verdict

VERDICT: PASS

summary: The fix correctly converts a guaranteed crash-on-construct (`new PerAppInCADInferenceAdapter()` with a required-opts constructor -> `this.runtime = opts.runtime` on `undefined` opts -> TypeError, verified at `PerAppInCADInferenceAdapter.ts:218-219`) into a deterministic fail-loud-honest report that never constructs the adapter and only calls the pure static `describeCapabilities()`. All asserted fields survive `slimResponse`, the additive default change is byte-identical to the old `100`, the static method is genuinely pure with mutation-safe spread copies, and no consumer (frontend or backend) read the old crash-path return shape, so there is no silent breakage.

findings: none

Audit trail — consumers / edge-paths I traced so the PASS is verifiable:

- Crash confirmed (P0-avoided): OLD `cadDispatcher.ts:5820` did `new (mod as any).PerAppInCADInferenceAdapter()` no-arg; constructor `PerAppInCADInferenceAdapter.ts:211-225` dereferences `opts.runtime`/`opts.extractor` with `opts` undefined -> TypeError before any method probe. NEW case (`cadDispatcher.ts:5829-5838`) destructures the class and calls ONLY `PerAppInCADInferenceAdapter.describeCapabilities()` — no `new`, so it cannot throw on construct.
- Static purity: `describeCapabilities()` (`PerAppInCADInferenceAdapter.ts:238-251`) references no `this`, no `new`, no I/O, no `Date`/`Math.random`; only the module const `DEFAULT_SLO_TARGET_MS` and the four schema `.options` arrays, each spread (`[...CADAppTypeSchema.options]`) into fresh arrays so a caller cannot mutate the zod schemas. D
... [+2004 chars truncated]
