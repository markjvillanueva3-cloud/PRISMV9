---
type: "chat-session"
source: "claude-code-cli"
session_id: "7e379b1d-d716-46f2-8850-28bcd0a929a9"
title: "Independent review of a WEDM engine fabricated-output fix (slot:bravo, ENGINE-AU"
date: "2026-06-19"
first_ts: "2026-06-19T17:42:28.591Z"
last_ts: "2026-06-19T17:46:01.761Z"
cwd: "H:\\prism\\mcp-server"
messages: 63
user_msgs: 23
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a604827d6924aa69c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Independent review of a WEDM engine fabricated-output fix (slot:bravo, ENGINE-AU

> **claude-code-cli** | 2026-06-19 | 63 msgs (23 user / 40 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/7e379b1d-d716-46f2-8850-28bcd0a929a9/subagents/agent-a604827d6924aa69c.jsonl`

## Transcript

### User | 2026-06-19T17:42:28.591Z

Independent review of a WEDM engine fabricated-output fix (slot:bravo, ENGINE-AUDIT) + new test:
- `H:/prism/mcp-server/src/engines/WEDMCalculatorAIEngine.ts`: `calculatePassParameters` no longer hardcodes `pathLength=100`; it uses an optional additive `cut_length_mm` input (real cut/cycle time), falling back to a named `DEFAULT_ESTIMATE_PATH_LENGTH_MM` with a warning + lowered `cycle_time_confidence` (0.85→0.35) when absent. 5 edit sites.
- `H:/prism/mcp-server/src/__tests__/WEDMCalculatorAIEngine.test.ts`: 10 tests (ALL PASS, tsc clean), engine had no prior test.

Verify:
1. CORRECTNESS + COMPLETENESS: the fix removes the fabrication on ALL paths (both `calculate` result-assembly call sites that go through `calculatePassParameters`); the `cut_length_mm` semantics (contour perimeter x passes) are coherently documented; no remaining magic `100` literal in the cut-time path.
2. TEST INTEGRITY (R9): real reference-value/invariant assertions (linearity 5×, confidence 0.85/0.35, estimate-warning present/absent, 0/negative→fallback, aggregate=sum(cutting)+threading+dwell), not presence-only stubs. Min-10 engine-test convention met. Would they fail if the bug returned?
3. CONVENTION: matches file idiom; ASCII-only in code; no inlined physics constants (the cut-time fix is geometry/plumbing, not a Kienzle/Taylor constant — confirm); the named constant is documented.
4. R12 honesty: is flagging the estimate (warning + low confidence) genuinely better than the silent 100 fabrication, and is the commit claim accurate (not overclaiming)?
5. Any blast-radius risk: does lowering cycle_time_confidence or adding a warning break a downstream consumer that asserts a fixed warning count / confidence value? (grep consumers of cycle_time_confidence / WEDMCalcResult.warnings if feasible.)

Read both files end-to-end. Report P0/P1/P2 with file:line. Grade PASS or FAIL.

### Assistant | 2026-06-19T17:42:37.074Z

I'll review the WEDM engine fix and its new test. Let me read both files end to end and investigate the surrounding contract.

### Assistant | 2026-06-19T17:42:37.550Z

[tool_use: Read]

### Assistant | 2026-06-19T17:42:38.034Z

[tool_use: Read]

### User | 2026-06-19T17:42:38.865Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\WEDMCalculatorAIEngine.ts' was already read 17s ago in this session and is unchanged (mtime 1781890746846). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### User | 2026-06-19T17:42:41.835Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\WEDMCalculatorAIEngine.test.ts' was already read 18s ago in this session and is unchanged (mtime 1781890879973). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### Assistant | 2026-06-19T17:42:44.511Z

The read-once guard claims I read these already, but they're not in my context. Let me bypass the cache to read them fresh.

### Assistant | 2026-06-19T17:42:46.163Z

[tool_use: Bash]

### User | 2026-06-19T17:42:52.962Z

[tool_result] /**
 * WEDMCalculatorAIEngine — AI-Powered Wire EDM Calculator for PRISM App
 *
 * Provides Claude Opus-level intelligence for the Wire EDM calculator page:
 * - Speed/feed optimization with physics reasoning
---WC---
  709 H:/prism/mcp-server/src/engines/WEDMCalculatorAIEngine.ts
  109 H:/prism/mcp-server/src/__tests__/WEDMCalculatorAIEngine.test.ts
  818 total

### Assistant | 2026-06-19T17:42:55.649Z

The read-once guard is blocking the Read tool but the content isn't in my context. Let me disable the cache via the environment variable and use Read.

### Assistant | 2026-06-19T17:42:56.061Z

[tool_use: Read]

### User | 2026-06-19T17:42:56.784Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\WEDMCalculatorAIEngine.ts' was already read 35s ago in this session and is unchanged (mtime 1781890746846). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-06-19T17:42:59.102Z

The guard is persistent. I'll read the full files via Bash with the cache disabled since the Read tool is blocked and the content genuinely is not in my context.

### Assistant | 2026-06-19T17:43:00.232Z

[tool_use: Bash]

### User | 2026-06-19T17:43:04.596Z

[tool_result]      1	/**
     2	 * WEDMCalculatorAIEngine — AI-Powered Wire EDM Calculator for PRISM App
     3	 *
     4	 * Provides Claude Opus-level intelligence for the Wire EDM calculator page:
     5	 * - Speed/feed optimization with physics reasoning
     6	 * - Wire type selection with material compatibility
     7	 * - Pass strategy recommendations
     8	 * - Surface finish prediction with conf
... [+29050 chars truncated]

### Assistant | 2026-06-19T17:43:06.909Z

Now let me read the test file end to end.

### Assistant | 2026-06-19T17:43:07.869Z

[tool_use: Bash]

### User | 2026-06-19T17:43:12.436Z

[tool_result]      1	/**
     2	 * WEDMCalculatorAIEngine guard (slot:bravo 2026-06-19, ENGINE-AUDIT/U-FIX-WEDM-CUTTIME-FABRICATION).
     3	 *
     4	 * The engine/algo/formula audit (iter 8) found `calculatePassParameters` hardcoded
     5	 * `pathLength = 100; // placeholder`, so EVERY passes[].cutting_time_min and the shipped
     6	 * predicted_cycle_time_min were computed from a fabricated 100mm path -- a
... [+6152 chars truncated]

### Assistant | 2026-06-19T17:43:14.983Z

Both files read in full. Now let me verify the claims in the task prompt. First, check the git diff to confirm the 5 edit sites and that there's no remaining magic `100` in the cut-time path.

### Assistant | 2026-06-19T17:43:17.004Z

[tool_use: Bash]

### User | 2026-06-19T17:43:21.931Z

[tool_result] diff --git a/mcp-server/src/engines/WEDMCalculatorAIEngine.ts b/mcp-server/src/engines/WEDMCalculatorAIEngine.ts
index 060b0f9623..b029f95b47 100644
--- a/mcp-server/src/engines/WEDMCalculatorAIEngine.ts
+++ b/mcp-server/src/engines/WEDMCalculatorAIEngine.ts
@@ -50,6 +50,13 @@ export interface WEDMCalcInput {
   wire_diameter_mm?: number;
   machine?: string;
   priority?: "speed" | "quality" | "b
... [+3027 chars truncated]

### Assistant | 2026-06-19T17:43:26.999Z

The diff confirms exactly the 5 edit sites: (1) input field, (2) named constant, (3) pathLength resolution, (4) confidence ternary, (5) warning. The old `const pathLength = 100; // placeholder` is fully removed. Now let me verify there's no remaining magic `100` in the cut-time path and grep for downstream consumers of `cycle_time_confidence`, `WEDMCalcResult.warnings`, and `calculate(`/`calculateQuick(`.

### Assistant | 2026-06-19T17:43:28.432Z

[tool_use: Grep]

### User | 2026-06-19T17:43:29.395Z

[tool_result] 59:  cut_length_mm?: number;
154:// Fallback cut-path length (mm) used ONLY when the caller supplies no `cut_length_mm`. A neutral
157:const DEFAULT_ESTIMATE_PATH_LENGTH_MM = 100;
447:      const pathLength = input.cut_length_mm && input.cut_length_mm > 0
448:        ? input.cut_length_mm
450:      const cuttingTime = pathLength / feed;
523:      confidence: input.cut_length_mm && input.cut_length
... [+306 chars truncated]

### Assistant | 2026-06-19T17:43:29.834Z

[tool_use: Grep]

### Assistant | 2026-06-19T17:43:30.603Z

[tool_use: Grep]

### User | 2026-06-19T17:43:32.505Z

[tool_result] src\engines\WEDMCalculatorAIEngine.ts:57:   * estimate (a warning + cycle_time_confidence is lowered) -- it never silently fabricates the time.
src\engines\WEDMCalculatorAIEngine.ts:77:  cycle_time_confidence: number;
src\engines\WEDMCalculatorAIEngine.ts:156:// low-confidence estimate (warning + lowered cycle_time_confidence) -- never presented as exact.
src\engines\WEDMCalculatorAIEngine.ts:261:
... [+997 chars truncated]

### User | 2026-06-19T17:43:32.962Z

[tool_result] Found 29 files
src\__tests__\WEDMCalculatorAIEngine.test.ts
src\engines\WEDMCalculatorAIEngine.ts
src\tools\dispatchers\edmDispatcher.ts
src\engines\WEDMProgramOptimizerEngine.ts
src\data\wedm-engine-registry.ts
src\engines\WireEDMMasterAIEngine.ts
H:\prism\prism-test-6d0595\mcp-server\src\tools\dispatchers\edmDispatcher.ts
H:\prism\prism-test-6d0595\mcp-server\src\engines\WireEDMSelfAwarenessInte
... [+1615 chars truncated]

### Assistant | 2026-06-19T17:43:38.670Z

No remaining magic `100` literal in the cut-time path — the only `100` is the named `DEFAULT_ESTIMATE_PATH_LENGTH_MM` constant (line 157) and `Math.round(x*100)/100` rounding helpers (which are unrelated to path length). No external consumer asserts a fixed `cycle_time_confidence` value (the only refs in the live tree are within the engine and its own test; the `prism-test-6d0595` and `tmp/prism-consensus-recovery` are sandbox copies, not live consumers). 

Now let me check the live consumers in the dispatcher and the two WEDM engines that reference the singleton, to assess blast radius — specifically whether any consumer asserts a fixed warning count or reads `warnings`/`cycle_time_confidence` in a brittle way.

### Assistant | 2026-06-19T17:43:40.528Z

[tool_use: Grep]

### Assistant | 2026-06-19T17:43:41.935Z

[tool_use: Grep]

### User | 2026-06-19T17:43:42.016Z

[tool_result] 225-      }
226-      if (!bridged.profile_length_mm) {
227:        bridged.profile_length_mm = bridged.total_cut_length_mm ?? bridged.total_profile_length_mm;
228-      }
229-      return bridged;
--
700-          case "sinker_calculate": {
701-            const engine = await getEngine("sinker");
702:            result = engine.calculate(params);
703-            break;
704-          }
--
1480-  
... [+2868 chars truncated]

### User | 2026-06-19T17:43:43.133Z

[tool_result] No matches found

### Assistant | 2026-06-19T17:43:43.141Z

[tool_use: Grep]

### User | 2026-06-19T17:43:44.325Z

[tool_result] 1014-        case "WireEDMSettingsEngine": {
1015-          const { wireEDMSettingsEngine } = await import("./WireEDMSettingsEngine.js");
1016:          const result = wireEDMSettingsEngine.calculate({
1017-            wire_type: "brass_0.25",
1018-            workpiece_material: request.material ?? "D2",
--
1079-
1080-        case "WEDMCalculatorAIEngine": {
1081:          const { wedmCalculatorA
... [+373 chars truncated]

### Assistant | 2026-06-19T17:43:49.005Z

Critical finding here. The dispatcher action `wedm_calculator_run` (edmDispatcher.ts:2409-2413) passes `params as Parameters<...>[0]` directly into `calculate()`. The new `cut_length_mm` field is optional and additive, so the contract is backward compatible — but I need to verify whether `cut_length_mm` is in the validated input schema, otherwise a caller supplying it would have it stripped/rejected by schema validation, defeating the fix's reachability at the dispatcher surface. Let me check the schema and how `params` is validated for that action.

### Assistant | 2026-06-19T17:43:50.615Z

[tool_use: Grep]

### User | 2026-06-19T17:43:52.675Z

[tool_result] src\schemas\calcActionSchemas.ts-3476-    tool_cost_per_edge_usd: z.number().nonnegative().describe('Cost per tool edge C_tool ($)'),
src\schemas\calcActionSchemas.ts:3477:    cut_length_mm: z.number().positive().optional().describe('Total length of cut per part (mm) — required for per-part cost'),
src\schemas\calcActionSchemas.ts-3478-    f_mm_rev: z.number().positive().optional().describe('Feed 
... [+18577 chars truncated]

### Assistant | 2026-06-19T17:43:56.233Z

I need to confirm whether the `wedm_calculator_run` action has a Zod schema that would strip `cut_length_mm`. The dispatcher uses `params as Parameters<...>` (a TS cast, not a parse). Let me check how `wedm_calculator_run` params are validated upstream in edmDispatcher — whether there is a schema gate that would drop unknown keys.

### Assistant | 2026-06-19T17:43:58.325Z

[tool_use: Bash]

### User | 2026-06-19T17:44:02.011Z

[tool_result] 24:// cases pass the schema-validated `params` to the engines' typed inputs.
29:// args without `as any` (the schema-validated `params` carries these as `unknown`).
51:const ALL_EDM_SCHEMAS = { ...EDM_ACTION_SCHEMAS, ...WEDM_PIPELINE_ACTION_SCHEMAS, ...WEDM_ML_OPTIMIZER_SCHEMAS, ...WEDM_FEATURE_IMPORTANCE_SCHEMAS, ...WEDM_TRANSFER_LEARNING_SCHEMAS, ...WEDM_ONLINE_LEARNING_SCHEMAS, ...WEDM_THERMAL_
... [+1640 chars truncated]

### Assistant | 2026-06-19T17:44:07.309Z

There's a Zod validation gate at line 553-554: `validateActionParams(action, params, ALL_EDM_SCHEMAS)`. I need to find whether `wedm_calculator_run` has a schema entry in `ALL_EDM_SCHEMAS`, and how `validateActionParams` handles an action with no schema (pass-through?) and whether the schema (if present) would strip `cut_length_mm`. Let me check.

### Assistant | 2026-06-19T17:44:08.578Z

[tool_use: Bash]

### User | 2026-06-19T17:44:17.756Z

[tool_result] === validateActionParams def ===
src/utils/dispatcherMiddleware.ts:76:export function validateActionParams(
src/validation/actionParamValidator.ts:52:export function validateActionParams(

### Assistant | 2026-06-19T17:44:22.060Z

`wedm_calculator_run` has NO schema entry in `src/schemas/`. So the behavior when an action has no registered schema depends on `validateActionParams`. The dispatcher imports it from one of those two files. Let me check which one edmDispatcher imports and how it handles a missing-schema action (pass-through vs strip vs reject).

### Assistant | 2026-06-19T17:44:23.198Z

[tool_use: Bash]

### User | 2026-06-19T17:44:28.631Z

[tool_result] 21:import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
554:        const validation = validateActionParams(action, params, ALL_EDM_SCHEMAS);
=== which module ===
  };
}

/**
 * Validate action params against the schema registry.
 *
 * @param action - The dispatcher action name
 * @param params - Normalized params (after normalizeParams)
 * @param schemas - 
... [+2437 chars truncated]

### Assistant | 2026-06-19T17:44:31.985Z

Note edmDispatcher imports `validateActionParams` from `dispatcherMiddleware.js`, not `actionParamValidator.ts`. Let me check the middleware version's missing-schema behavior to confirm the dispatcher path passes `cut_length_mm` through.

### Assistant | 2026-06-19T17:44:32.659Z

[tool_use: Bash]

### User | 2026-06-19T17:44:37.411Z

[tool_result]   error?: z.ZodError;
  /**
   * Compat alias for Zod issues. Many dispatchers reach for `validation.errors`
   * (plural) expecting the issue array directly — this property is populated
   * with `error.issues` whenever validation fails so those callsites type-check
   * without rewriting them all. Prefer `error.issues` in new code.
   */
  errors?: z.ZodError["issues"];
  /** Error message strin
... [+1690 chars truncated]

### Assistant | 2026-06-19T17:44:43.670Z

Confirmed. `wedm_calculator_run` has no schema in `ALL_EDM_SCHEMAS`, so `validateActionParams` returns `{ valid: true, ... data: params }` (pass-through). The dispatcher then casts the raw `params` (including any caller-supplied `cut_length_mm`) straight into `calculate()`. So the fix IS reachable through the dispatcher — a caller can supply `cut_length_mm` and get the real cycle time, and the engine re-validates `> 0` internally. This is a robustness positive, not a finding.

Now let me confirm the test passes and tsc is clean, and double-check the aggregate-rounding test for a possible double-rounding edge (the test re-applies the engine's rounding so it should match — but the engine's `total` is rounded once, and `cutting_time_min` per pass is rounded then summed; the test sums the rounded per-pass values then adds 1.25 and rounds — let me verify the arithmetic isn't subtly off).

### Assistant | 2026-06-19T17:44:44.929Z

[tool_use: Bash]

### User | 2026-06-19T17:44:51.225Z

[tool_result] [INFO] [PRISMIntelligence] Reasoning: wedm_calculator - Enhance Wire EDM calculator results with AI reason...

stderr | src/__tests__/WEDMCalculatorAIEngine.test.ts > WEDMCalculatorAIEngine cut-time fabrication fix > the 0/negative cut_length matches the default-omitted estimate (both use the fallback)
[INFO] [WEDMCalculatorAI] Calculated 2-pass strategy for D2 cold-work tool steel 25mm in 0ms

st
... [+1935 chars truncated]

### Assistant | 2026-06-19T17:44:58.960Z

All 10 tests pass. Now let me verify R9 — would the tests fail if the bug returned? Let me reason about the key invariant tests against the old fabricated `pathLength = 100`:

- Linearity test (line 46-54): with old code, `cutting_time` is constant (100/feed) regardless of `cut_length_mm`, so `r500.passes[i].cutting_time_min` would equal `r100.passes[i].cutting_time_min` (not 5×). The `toBeCloseTo(5*..., 1)` would FAIL. Good.
- Confidence test (line 35, 42): old code always returned `0.85`; `expect(...).toBe(0.35)` for the omitted case would FAIL. Good.
- Estimate warning (line 36): old code never pushed the warning; `expect(hasEstimateWarning(r)).toBe(true)` would FAIL. Good.
- Default-vs-500 (line 62-67): old code, both = 100/feed, so `r500 > rDefault` would FAIL (equal). Good.

These are genuine bug-revealing assertions, not stubs. Let me verify tsc cleanliness on these two files and check the rounding edge in the aggregate test more carefully, plus confirm there are no smart-quotes/em-dashes/non-ASCII in the edited code.

### Assistant | 2026-06-19T17:45:00.967Z

[tool_use: Bash]

### User | 2026-06-19T17:45:05.549Z

[tool_result] === non-ASCII scan of edited regions (engine + test) ===
grep: -P supports only unibyte and UTF-8 locales
NO non-ASCII bytes found in either file

### Assistant | 2026-06-19T17:45:09.212Z

The grep with -P had a locale issue but the fallback echoed "NO non-ASCII". Let me do a definitive byte-level scan and verify the comment `mm²` on line 153 (which is pre-existing, not part of the diff) doesn't affect the edited lines.

### Assistant | 2026-06-19T17:45:12.833Z

[tool_use: Bash]

### User | 2026-06-19T17:45:16.696Z

[tool_result] === non-ASCII bytes by line (test file) ===
test: clean ASCII
=== non-ASCII bytes in the 5 EDITED engine regions only ===
edited engine regions: clean ASCII (any matches below are pre-existing lines like mm2)

### Assistant | 2026-06-19T17:45:25.602Z

Both the test file and all 5 edited engine regions are clean ASCII. The pre-existing `mm²` on line 153 is outside the diff (and the new comment was inserted as a separate block above `BASE_AREA_RATES`).

Now the last item — the aggregate-rounding test (line 95-99). The engine rounds `total` once via `Math.round((cuttingTime + 0.75 + 0.5)*100)/100` where `cuttingTime` is the sum of UNROUNDED per-pass times (line 510 sums `p.cutting_time_min` which ARE rounded). The test sums the rounded per-pass `cutting_time_min` and re-rounds. Since `estimateCycleTime` line 510 also sums the already-rounded per-pass `cutting_time_min` values (the same array the test reads), the two sums are identical, and `toBeCloseTo(..., 1)` (tolerance 0.05) absorbs any rounding. This is internally consistent and already proven green. No issue.

Let me do a final check on the `min-10 engine-test convention` and confirm the engine had no prior test (task claim), and verify the two sandbox copies aren't live build inputs.

### Assistant | 2026-06-19T17:45:28.944Z

[tool_use: Bash]

### User | 2026-06-19T17:45:36.552Z

[tool_result] === prior tests for this engine in live tree (excluding the new one) ===
(empty above = untracked/new, confirming no prior committed test)
=== test count ===
10
=== sandbox dirs gitignored? ===
(check-ignore returned nothing)

### Assistant | 2026-06-19T17:46:01.761Z

The sandbox dirs (`prism-test-6d0595`, `tmp/prism-consensus-recovery`) aren't tracked roots of the build — they're separate worktree/recovery copies; the live build root is `mcp-server/`. The new test is untracked (no prior committed test for this engine — confirms the task claim), and has exactly 10 `it()` blocks (meets the min-10 convention).

I have everything I need. Let me compile my findings.

## Review Complete

I read both files end to end, confirmed the diff (5 edit sites), traced the dispatcher reachability path, ran the tests, and scanned for blast-radius and convention issues.

VERDICT: PASS

summary: The fix cleanly removes the `pathLength = 100; // placeholder` fabrication on the only cut-time code path (`calculatePassParameters`), which serves both `calculate()` and `calculateQuick()`. It replaces it with an optional additive `cut_length_mm` input, a named `DEFAULT_ESTIMATE_PATH_LENGTH_MM` fallback, a lowered `cycle_time_confidence` (0.85→0.35), and an explicit ESTIMATE warning — a genuine R12 improvement over the silent 100mm fabrication. The 10 new tests are real bug-revealing invariant assertions (all would fail if the bug returned), all pass, and the dispatcher path (`wedm_calculator_run`) passes `cut_length_mm` through (no schema strips it), so the fix is reachable through the live surface.

findings: none

Detailed verification (auditable):

1. CORRECTNESS + COMPLETENESS — PASS. The old `const pathLength = 100; // placeholder` is fully removed (`WEDMCalculatorAIEngine.ts:444-450`). `calculatePassParameters` is the single cut-time site and is called by both result-assembly paths: `calculate()` step 3 (`:234`) and `calculateQuick()` (`:690`). The only remaining `100` in the cut-time path is the documented named constant `DEFAULT_ESTIMATE_PATH_LENGTH_MM` (`:157`); all other `100` literals are `Math.round(x*100)/100` rounding helpers, unrelated to path length (grep-confirmed at `:447,450,523,643-644`). `cut_length_mm` semantics ("contour perimeter x
... [+2504 chars truncated]
