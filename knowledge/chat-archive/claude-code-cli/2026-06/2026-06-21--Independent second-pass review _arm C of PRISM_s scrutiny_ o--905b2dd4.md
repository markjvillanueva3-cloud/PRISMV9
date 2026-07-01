---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Independent second-pass review (arm C of PRISM's scrutiny) of a GHOST-build unit"
date: "2026-06-21"
first_ts: "2026-06-21T05:54:53.634Z"
last_ts: "2026-06-21T05:58:48.465Z"
cwd: "H:\\prism\\mcp-server"
messages: 67
user_msgs: 25
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-aeaea697c307de3ca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent second-pass review (arm C of PRISM's scrutiny) of a GHOST-build unit

> **claude-code-cli** | 2026-06-21 | 67 msgs (25 user / 42 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-aeaea697c307de3ca.jsonl`

## Transcript

### User | 2026-06-21T05:54:53.634Z

Independent second-pass review (arm C of PRISM's scrutiny) of a GHOST-build unit (slot:india). Do NOT assume the other reviewer caught everything. Read the ACTUAL files and grade PASS/FAIL with file:line citations. Read-only.

CHANGED FILES:
1. H:/prism/mcp-server/src/engines/CNCControllerDeepLearningEngine.ts — added `ingestLearnedPatterns`, `getLearnedPatternStats`, private `synthesizeLearnedTemplate`; made `recommendMacro` + `generateMacro` (okuma branch) learned-aware; new private learned-state fields.
2. H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts — rewrote the `controller_ingest_learned` case (~L2670) to resolve the canonical ledger + call `ingestLearnedPatterns` (was a `deepReason` stub).
3. H:/prism/mcp-server/data/state/learned-cnc-controller-patterns.json — schemaVersion bump to "1.0.0".

Weight your review toward SILENT BREAKAGE + REGRESSION RISK + INTEGRATION COUPLING:
- Did rewriting the `controller_ingest_learned` dispatcher case break any OTHER caller or test that depended on the old `deepReason`-based response shape? (grep for consumers of `controller_ingest_learned`.)
- Does the dispatcher's canonical-ledger path resolution (`resolve(process.cwd(), "data/state/...")` with a `mcp-server/` fallback) work both under vitest (cwd=mcp-server) AND when the MCP server runs from a different cwd? Is the existsSync-fallback safe if NEITHER candidate exists (it passes candidates[0] to ingest, which then throws a clean "cannot read" error — acceptable)?
- I/O safety: readFileSync on an attacker-influenced path? (path comes from the dispatcher-resolved canonical const, not caller input — confirm the schema `controller_ingest_learned: z.object({}).passthrough()` means callers cannot inject a path.)
- Error-budget completeness: every throw path in ingestLearnedPatterns leaves state intact (parse-into-locals-then-commit). Confirm the commit is truly after all throws.
- Does `recommendMacro` returning a richer learned MacroPattern (vs only buil
... [+649 chars truncated]

### Assistant | 2026-06-21T05:54:59.017Z

I'll review this GHOST-build unit as arm C, weighted toward silent breakage, regression risk, and integration coupling. Let me start by reading the actual changed files.

### Assistant | 2026-06-21T05:55:00.987Z

[tool_use: Bash]

### Assistant | 2026-06-21T05:55:01.216Z

[tool_use: Read]

### User | 2026-06-21T05:55:07.062Z

[tool_result] <persisted-output>
Output too large (57.7KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\905b2dd4-3c0c-4201-92ed-f8a0effe134a\tool-results\bhrjmhd3g.txt

Preview (first 2KB):
 .../__tests__/mcp-bridge-enforce-pretool.test.mjs  |     96 +-
 .claude/hooks/auto-consensus-userprompt.mjs        |     26 +-
 .claude/hooks/auto-consensus-userprompt.test.mjs   |     41 +
 .claude/hooks
... [+1800 chars truncated]

### User | 2026-06-21T05:55:09.006Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1793 of 2160 total (25589 tokens, cap 25000). Call Read with offset=1794 limit=1793 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "schemaVersion": "1.0.0",
3	  "schemaNote": "Consumer landed (U-AITRAIN-POST-CNC-CONTROLLER-DL-S
... [+56774 chars truncated]

### Assistant | 2026-06-21T05:55:12.377Z

Now let me read the two code files — the engine and the dispatcher case — focusing on the changed regions.

### Assistant | 2026-06-21T05:55:13.799Z

[tool_use: Grep]

### User | 2026-06-21T05:55:16.436Z

[tool_result] 103:// and consumed here via ingestLearnedPatterns(). All rows carry their controller so
107:/** A learned tool-slot convention (which tool number a shop uses for an op). */
117:/** A learned V-variable idiom (a named parameter + its observed expression). */
127:/** A learned macro label idiom (a label + the token that conventionally follows). */
143:/** Result of ingestLearnedPatterns() -- counts
... [+3363 chars truncated]

### Assistant | 2026-06-21T05:55:19.555Z

Let me read the engine's changed regions in full — the type definitions, the ingest method, the stats method, the template synthesis, and the recommendMacro/generateMacro changes.

### Assistant | 2026-06-21T05:55:21.033Z

[tool_use: Read]

### User | 2026-06-21T05:55:22.423Z

[tool_result] 95	  steps: string[];
96	  precautions: string[];
97	  verification: string[];
98	}
99	
100	// ----------------------------------------------------------------------------
101	// Learned-pattern corpus (AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DL).
102	// Mined from the JM-Die macro corpus by scripts/train-cnc-controller-from-corpus.mjs
103	// and consumed here via ingestLearnedPatter
... [+2268 chars truncated]

### Assistant | 2026-06-21T05:55:26.068Z

Now let me read the core ingest method and the recommendMacro/generateMacro changes in detail.

### Assistant | 2026-06-21T05:55:26.973Z

[tool_use: Read]

### User | 2026-06-21T05:55:28.078Z

[tool_result] 620	    };
621	  }
622	
623	  // ==========================================================================
624	  // MACRO INTELLIGENCE
625	  // ==========================================================================
626	
627	  /**
628	   * Ingest a learned-patterns ledger (mined from the JM-Die macro corpus by
629	   * scripts/train-cnc-controller-from-corpus.mjs) and REPLACE any prior corpus.
... [+12333 chars truncated]

### Assistant | 2026-06-21T05:55:31.616Z

I have the engine changes well understood. Now let me look at critical context: the `knownFamilies` set, `ControllerFamily` type, and how `macro_labels` is structured in the JSON ledger (the engine reads `following_token` + `label`, but I need to confirm the ledger actually has a `macro_labels` array with those keys). Let me also check the dispatcher case.

### Assistant | 2026-06-21T05:55:36.966Z

[tool_use: Grep]

### Assistant | 2026-06-21T05:55:37.131Z

[tool_use: Bash]

### User | 2026-06-21T05:55:41.538Z

[tool_result] 27:export type ControllerFamily =
131:  following_token: string;
440:  private macroPatterns = MACRO_PATTERNS;
452:  private readonly knownFamilies = new Set<string>(Object.keys(CONTROLLER_PROFILES));
683:      !Array.isArray(L.macro_labels)
687:          `(tool_slot_conventions, v_variable_idioms, macro_labels)`,
701:      return typeof c === "string" && this.knownFamilies.has(c) ? (c as Controll
... [+288 chars truncated]

### User | 2026-06-21T05:55:44.638Z

[tool_result] 2:  "schemaVersion": "1.0.0",
6:  "fileCount": 4,
10:  "ledger": {
11:    "tool_slot_conventions": [
195:    "v_variable_idioms": [
2107:    "macro_labels": [

### Assistant | 2026-06-21T05:55:47.564Z

The ledger has all three required arrays. Let me check the `ControllerFamily` type and the `CONTROLLER_PROFILES` keys (to confirm `okuma_osp` is a valid family), the `macro_labels` array shape in the JSON, and then read the dispatcher case.

### Assistant | 2026-06-21T05:55:48.510Z

[tool_use: Read]

### Assistant | 2026-06-21T05:55:49.303Z

[tool_use: Bash]

### User | 2026-06-21T05:55:49.798Z

[tool_result] 27	export type ControllerFamily =
28	  | "okuma_osp"
29	  | "haas_ngc"
30	  | "hurco_winmax"
31	  | "fanuc"
32	  | "mazak_mazatrol"
33	  | "siemens_sinumerik"
34	  | "heidenhain_tnc"
35	  | "mitsubishi"
36	  | "roku_roku";
37	
38	export type ControllerCapability =
39	  | "conversational"
40	  | "iso_gcode"
41	  | "macro_b"
42	  | "custom_macro"
43	  | "cutter_comp"
44	  | "tool_life_mgmt"
45	  | "
... [+549 chars truncated]

### User | 2026-06-21T05:55:54.148Z

[tool_result]     "macro_labels": [
      {
        "controller": "okuma_osp",
        "label": "NAT1",
        "following_token": "G81",
        "source_files": [
          "BASE WAFER INSERT MACRO.min",
          "BASIC CASING WITH SINGLE COUNTERBORE.min",
          "BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min",
          "BASIC-CASING.MIN"
        ],
        "frequency": 6
      },
      {
        "cont
... [+886 chars truncated]

### Assistant | 2026-06-21T05:55:57.606Z

The ledger and engine align: `okuma_osp` is a valid `ControllerFamily`, the ledger has all three arrays with the expected keys. Now let me read the dispatcher case and trace consumers of `controller_ingest_learned`.

### Assistant | 2026-06-21T05:55:58.584Z

[tool_use: Read]

### User | 2026-06-21T05:55:59.617Z

[tool_result] 2630	        type TgtArg = Parameters<typeof cncControllerDeepLearning.translateGCode>[1];
2631	        const p = params as { sourceController: SrcArg; targetController: TgtArg; code: string };
2632	        const translation = cncControllerDeepLearning.translateGCode(
2633	          p.sourceController,
2634	          p.targetController,
2635	          p.code,
2636	        );
2637	        result = 
... [+6511 chars truncated]

### Assistant | 2026-06-21T05:56:04.034Z

Now let me trace the consumers and verify the claims. Let me: (1) grep for all consumers of `controller_ingest_learned` and the old `deepReason` stub it replaced, (2) verify the schema enum has the action, (3) check git history of the dispatcher case to see what the old shape was, (4) verify the `1 dispatcher failure is pre-existing`.

### Assistant | 2026-06-21T05:56:05.467Z

[tool_use: Grep]

### Assistant | 2026-06-21T05:56:06.270Z

[tool_use: Grep]

### User | 2026-06-21T05:56:08.661Z

[tool_result] src\__tests__\aiReasoningDispatcher.uwire28.test.ts:98:  it("recommendMacro returns either a MacroPattern or null (no exceptions)", () => {
src\__tests__\aiReasoningDispatcher.uwire28.test.ts:101:    const r = fresh.recommendMacro("probe wcs corner", "fanuc");
src\schemas\aiReasoningActionSchemas.ts:153:  "controller_recommend_macro", // recommend a macro for an operation (built-in → learned fallb
... [+3839 chars truncated]

### User | 2026-06-21T05:56:08.671Z

[tool_result] data\state\learned-cnc-controller-patterns.json:3:  "schemaNote": "Consumer landed (U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4): CNCControllerDeepLearningEngine.ingestLearnedPatterns() ingests this ledger; prism_ai:controller_ingest_learned / controller_recommend_macro round-trip it. Bumped from 1.0.0-DRAFT-no-consumer 2026-06-21.",
data\state\TEST_COVERAGE_INDEX.json:1:[Omitted long matching line]

... [+1166 chars truncated]

### Assistant | 2026-06-21T05:56:14.410Z

The consumers are clean: the only callers of `controller_ingest_learned` and `controller_recommend_macro` are the dispatcher case and the new test file. No external/legacy consumer depends on the old `deepReason` shape. Let me verify the old shape via git, confirm the existing `CONTROLLER-AI.test.ts` consumers of `recommendMacro` (the regression-risk question about built-in vs learned), check `executeAIReasoningAction` cross-test state-leak via the singleton, and confirm the `ai_route_mill_pipeline` failure is pre-existing.

### Assistant | 2026-06-21T05:56:17.011Z

[tool_use: Bash]

### Assistant | 2026-06-21T05:56:17.284Z

[tool_use: Read]

### User | 2026-06-21T05:56:20.996Z

[tool_result] === OLD dispatcher case (HEAD) ===
2670:      case "controller_ingest_learned": {
2671-        const { cncControllerDeepLearning } = await import("../../engines/CNCControllerDeepLearningEngine.js");
2672-        // CNCControllerDeepLearningEngine embeds its full knowledge base as
2673-        // compile-time constants (CONTROLLER_PROFILES, MACRO_PATTERNS, etc.) —
2674-        // it has no file-loa
... [+619 chars truncated]

### User | 2026-06-21T05:56:22.530Z

[tool_result] 150	      expect(result.changes.length).toBe(0);
151	      expect(result.confidence).toBeGreaterThan(0.9);
152	    });
153	  });
154	
155	  // ===========================================================================
156	  // MACRO INTELLIGENCE TESTS
157	  // ===========================================================================
158	  describe("Macro Intelligence", () => {
159	    it("shoul
... [+1020 chars truncated]

### Assistant | 2026-06-21T05:56:28.157Z

This is the key regression-risk check. `CONTROLLER-AI.test.ts:159-167` calls `engine.recommendMacro("probing setup", "okuma_osp")` and expects a non-null built-in pattern with `code_template` containing "V". The concern: the new code's built-in branch runs FIRST and only falls to learned synthesis when no built-in matches. Since this test uses a fresh `engine` (no ingest), `learnedLoaded` is false, so the built-in path is unchanged. Let me confirm `engine` here is fresh, and verify the built-in match still wins for "probing setup". Let me also confirm the singleton state-leak question and the pre-existing failure.

### Assistant | 2026-06-21T05:56:31.014Z

[tool_use: Bash]

### User | 2026-06-21T05:56:35.948Z

[tool_result] === how 'engine' is constructed in CONTROLLER-AI.test.ts ===
22:  const engine = new CNCControllerDeepLearningEngine();
=== MACRO_PATTERNS applications for okuma probing & haas ===
65:  source_controller: ControllerFamily;
66:  target_controller: ControllerFamily;
75:  controller: ControllerFamily;
84:  name: string;
85:  controller: ControllerFamily;
88:  variables: Array<{ name: string; descript
... [+2118 chars truncated]

### Assistant | 2026-06-21T05:56:42.579Z

`CONTROLLER-AI.test.ts:22` uses `const engine = new CNCControllerDeepLearningEngine()` — a fresh non-singleton instance, so `learnedLoaded=false` and the built-in path is untouched. The built-in `probing_cycle_okuma` has `applications: ["setup", "inspection"]`; the test passes `"probing setup"` which `.includes("setup")` → built-in match wins, unchanged behavior. No regression there.

Now let me verify the singleton state-leak risk in the learned test file (which uses the shared singleton via `executeAIReasoningAction`) and confirm the pre-existing `ai_route_mill_pipeline` failure is unrelated.

### Assistant | 2026-06-21T05:56:43.915Z

[tool_use: Read]

### User | 2026-06-21T05:56:45.003Z

[tool_result] 488	      rmSync(outDir, { recursive: true, force: true });
489	    }
490	  });
491	});
492	
493	// ---------------------------------------------------------------------------
494	// Dispatcher round-trip — through executeAIReasoningAction (not the singleton)
495	// ---------------------------------------------------------------------------
496	
497	describe("dispatcher round-trip — prism_ai contr
... [+2835 chars truncated]

### Assistant | 2026-06-21T05:56:50.950Z

The dispatcher round-trip tests use the shared singleton but each calls `controller_ingest_learned` first (idempotent — the ingest does atomic replace, not append), so cross-test ordering within this suite is safe. Now the cross-suite concern: the singleton's `learnedLoaded` state mutates persistently. Let me verify whether any OTHER test suite in the same vitest process relies on the singleton's `recommendMacro`/`generateMacro` returning the BUILT-IN-only (non-learned) shape, which could leak if the learned suite ran first. The `uwire28.test.ts` used `fresh.recommendMacro` (fresh instance — safe). Let me check that file and confirm the pre-existing failure attribution.

### Assistant | 2026-06-21T05:56:52.355Z

[tool_use: Read]

### User | 2026-06-21T05:56:53.215Z

[tool_result] 85	
86	  it("translateGCode mazatrol→fanuc emits the conversational-loss warning", () => {
87	    const fresh = new CNCControllerDeepLearningEngine();
88	    const t = fresh.translateGCode("mazak_mazatrol", "fanuc", "G0 X10");
89	    expect(t.warnings.some((w) => /mazatrol/i.test(w))).toBe(true);
90	  });
91	
92	  it("translateGCode → heidenhain converts G0 lines to L FMAX", () => {
93	    const f
... [+1629 chars truncated]

### Assistant | 2026-06-21T05:56:54.452Z

[tool_use: Bash]

### User | 2026-06-21T05:56:59.924Z

[tool_result] === does ai_route_mill_pipeline touch CNCController or learned? ===
mcp-server/src/schemas/aiReasoningActionSchemas.ts:47:  "ai_route_mill_pipeline",
mcp-server/src/schemas/aiReasoningActionSchemas.ts:756:const ai_route_mill_pipeline = z.object({
mcp-server/src/schemas/aiReasoningActionSchemas.ts:1415:  ai_route_mill_pipeline,
mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:7: *   ai_rou
... [+1863 chars truncated]

### Assistant | 2026-06-21T05:57:08.064Z

Important observation. The git status shows MANY modified files in `mcp-server/src` beyond the 3 files this unit claims to touch — but those are likely from other slots on this shared branch (`cad-fusion-live-ms0`). The review scope is the 3 named files. Let me confirm the actual diff content for the engine and dispatcher is limited to the learned-pattern feature (not entangled with unrelated changes), and verify the `uwire28` line 112 (`generateMacro("rough adaptive pocket", "okuma_osp")` expects code to match `/V/`) still holds under the new learned branch when the singleton... wait — `uwire28` uses `fresh` instances, so safe. 

Let me check one subtle cross-suite leak: `aiReasoningDispatcher.test.ts` (the 820/821 suite) — does any test there call `controller_macro` or `controller_recommend_macro` via the singleton and assert the BUILT-IN/stub shape that could now be polluted by a prior learned-ingest in the same process? Let me verify, plus confirm the diff is clean.

### Assistant | 2026-06-21T05:57:12.469Z

[tool_use: Bash]

### User | 2026-06-21T05:57:22.393Z

[tool_result] === ENGINE diff (this unit) ===
+import { readFileSync } from "node:fs";
+// ----------------------------------------------------------------------------
+// Learned-pattern corpus (AI-TRAINING-FIRST-MS0 / U-AITRAIN-POST-CNC-CONTROLLER-DL).
+// Mined from the JM-Die macro corpus by scripts/train-cnc-controller-from-corpus.mjs
+// and consumed here via ingestLearnedPatterns(). All rows carry their 
... [+595 chars truncated]

### Assistant | 2026-06-21T05:57:28.473Z

The diff is cleanly scoped to the 3 files (332 insertions in the engine, 20 lines changed in the dispatcher, 4 in the JSON). The `aiReasoningDispatcher.test.ts` (the 820/821 suite) does NOT call any `controller_macro`/`recommend`/`generateMacro`/`ingest` action — so the singleton-ingest in the learned test cannot pollute that suite's assertions.

Let me verify the two other singleton-touching test files import `cncControllerDeepLearning` only as a fresh-instance pattern, not the singleton, and check the JSON diff (only schemaVersion-related, no accidental data change).

### Assistant | 2026-06-21T05:57:30.663Z

[tool_use: Bash]

### User | 2026-06-21T05:57:34.414Z

[tool_result] === how the two files import (singleton vs class)? ===
mcp-server/src/__tests__/aiReasoningDispatcher.uwire28.test.ts:15:  cncControllerDeepLearning,
mcp-server/src/__tests__/aiReasoningDispatcher.uwire28.test.ts:26:    const fresh = new CNCControllerDeepLearningEngine();
mcp-server/src/__tests__/aiReasoningDispatcher.uwire28.test.ts:49:    const fresh = new CNCControllerDeepLearningEngine();
mcp-
... [+1428 chars truncated]

### Assistant | 2026-06-21T05:57:42.942Z

All verified. The JSON diff is ONLY the schemaVersion bump (1.0.0-DRAFT-no-consumer → 1.0.0) + schemaNote update — no ledger data changed. Both back-compat versions are in `SUPPORTED_LEARNED_SCHEMA_VERSIONS`. The `uwire28` import of the singleton (`cncControllerDeepLearning`) is only for the named export presence; all 9 method-exercising tests use `new` fresh instances.

Now let me do final due-diligence on the error-budget/throw-safety claim and the dispatcher fallback path. Let me re-examine one edge: if NEITHER candidate exists, `candidates.find()` returns `undefined`, and `?? candidates[0]` passes `candidates[0]` to ingest, which then throws "cannot read" — a clean fail-loud. Let me also confirm `executeAIReasoningAction` wraps engine throws into `{success:false}` (so a thrown ingest doesn't crash the dispatcher) and check the schema for `controller_recommend_macro` requires operation+controller.

### Assistant | 2026-06-21T05:57:43.882Z

[tool_use: Read]

### User | 2026-06-21T05:57:44.809Z

[tool_result] 1705	  controller_debug: z.object({
1706	    errorMessage: z.string().min(1).describe("Error / alarm message text"),
1707	    controller: z.string().min(1).describe("Controller family that produced the error"),
1708	  }).passthrough(),
1709	  // U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4 — learned-pattern consumer.
1710	  // controller_ingest_learned takes NO caller path: the dispatcher resolves the
... [+1077 chars truncated]

### Assistant | 2026-06-21T05:57:45.919Z

[tool_use: Bash]

### User | 2026-06-21T05:57:49.545Z

[tool_result] === does executeAIReasoningAction catch engine throws -> {success:false}? ===
508:// out-of-order trial_id / invalid sample -> outer try/catch -> dispatcherError.
1240:export async function executeAIReasoningAction(
1517:        } catch (routeErr: unknown) {
1525:              success: true,
4242:        result = { success: true, data: (mixerAgitatorEngine as any).calculate?.(params as any) ?? { e
... [+2827 chars truncated]

### Assistant | 2026-06-21T05:57:53.835Z

Let me confirm the outer try/catch in `executeAIReasoningAction` wraps engine throws into a `{success:false}` response (the test at line 552 expects `res.success === false` on schema rejection, but I need to confirm a THROWN ingest error -- e.g. missing file -- also becomes `{success:false}` not an unhandled rejection). Let me read the dispatch wrapper structure around the try/catch.

### Assistant | 2026-06-21T05:57:56.768Z

[tool_use: Bash]

### User | 2026-06-21T05:58:00.593Z

[tool_result] export async function executeAIReasoningAction(
  action: AIAction,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const startTime = Date.now();
  log.info(`[prism_ai] Executing action: ${action}`);

  // Validate params against schema (U-WIRE03: pass the schema MAP, not the per-action schema —
  // validateActionParams indexes the map by act
... [+3045 chars truncated]

### Assistant | 2026-06-21T05:58:10.859Z

Confirmed. The outer `try { switch... } catch (error) { return dispatcherError(...) }` (lines 1255 / 5319-5322) wraps every engine throw — including a thrown `ingestLearnedPatterns` (bad path / invalid JSON / unsupported schema) — into `{success:false, error}`. No unhandled rejection. The success path runs `result` through `slimmed` (the MCP slimResponse) and returns `{success:true, data:slimmed}` (line 5318), which is why the test at line 544-545 correctly anticipates `pattern:null` being elided to `undefined` in transport.

I have traced all blast-radius paths. Let me do one final confirmation on the error-budget "commit-after-all-throws" claim by checking there is no `this.learned*` mutation BEFORE the parse-loops (state is only written at lines 767-772, after all throw-able validation and the local-array parse loops). I already saw that the throws are at 644-689 and the local parse loops at 691-764, with the commit at 766-772 — all throws precede the commit. Confirmed.

Let me verify one last subtle issue: whether the `controller_macro` action's schema (the older `generateMacro` round-trip, which I changed indirectly via the okuma branch) still has a valid schema and whether any existing test asserted the OLD okuma stub `VC1=(PARAM 1)` output specifically — which would now differ if the singleton has learned V-vars loaded.

### Assistant | 2026-06-21T05:58:14.843Z

[tool_use: Bash]

### User | 2026-06-21T05:58:19.723Z

[tool_result] === any test asserting OLD okuma stub VC1=(PARAM 1) / 'VC1' / 'Secondary parameter'? ===
mcp-server/src/__tests__/AIDecisionExplanationEngine.test.ts:382:      // Primary parameters (speed, feed) should have more weight
mcp-server/src/__tests__/CNCControllerDeepLearningEngine.learned.test.ts:403:  it("uses the generic VC1/VC2 template before any corpus is ingested (back-compat)", () => {
mcp-serve
... [+1434 chars truncated]

### Assistant | 2026-06-21T05:58:48.465Z

All confirmed. `CONTROLLER-AI.test.ts:180` uses the fresh `engine` (line 22, `new CNCControllerDeepLearningEngine()`) — never the singleton — so its `generateMacro("Probe workpiece corner", "okuma_osp")` assertion (`code` contains "VC", `explanation` contains "Okuma") holds: with `learnedLoaded=false`, the new okuma branch falls back to the generic VC1/VC2 stub (back-compat preserved). The learned test at line 403/416 explicitly pins both behaviors: generic stub before ingest, learned-seeded after. The `MacroLibraryEngine.test.ts:86` is a different engine entirely.

I have completed an exhaustive trace of all blast-radius paths. Here is my verdict.

---

VERDICT: PASS

summary: The `controller_ingest_learned` rewrite (deepReason stub → real `ingestLearnedPatterns`) has zero un-updated consumers — the only callers of `controller_ingest_learned`/`controller_recommend_macro` are the dispatcher case itself and the new test suite, and no test pins the old `deepReason` response shape. The richer learned-aware `recommendMacro`/`generateMacro` paths are strictly additive (built-in patterns win first; learned synthesis only fires when `learnedLoaded` is true), and every existing consumer test uses a fresh non-singleton instance so the singleton's persistent learned state cannot leak across suites. Ingest is correctly parse-into-locals-then-commit (all throws at L644-689 precede the state commit at L767-772), and the dispatcher's outer try/catch (L1255/L5319) converts every ingest throw into a clean `{success:false}` with no path-traversal surface.

findings:
- [INFO] `aiReasoningDispatcher.ts:2682` — canonical-ledger resolution `candidates.find(existsSync) ?? candidates[0]` is sound under both cwds: vitest/server run from `mcp-server` (candidate[0] matches), ad-hoc repo-root runs hit candidate[1]; if NEITHER exists it passes candidate[0] to `ingestLearnedPatterns`, which fail-loud throws "cannot read learned-patterns file" → wrapped to `{success:false}` by the outer catch. A
... [+3136 chars truncated]
