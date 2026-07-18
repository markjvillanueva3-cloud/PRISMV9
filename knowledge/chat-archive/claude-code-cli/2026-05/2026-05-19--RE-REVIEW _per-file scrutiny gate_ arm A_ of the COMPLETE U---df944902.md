---
type: "chat-session"
source: "claude-code-cli"
session_id: "df944902-c90f-484b-86ea-6b35b3c9143f"
title: "RE-REVIEW (per-file scrutiny gate, arm A) of the COMPLETE U-FGE03 changeset. The"
date: "2026-05-19"
first_ts: "2026-05-19T00:40:08.345Z"
last_ts: "2026-05-19T00:44:51.880Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a16d757e2675c86f6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# RE-REVIEW (per-file scrutiny gate, arm A) of the COMPLETE U-FGE03 changeset. The

> **claude-code-cli** | 2026-05-19 | 35 msgs (14 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a16d757e2675c86f6.jsonl`

## Transcript

### User | 2026-05-19T00:40:08.345Z

RE-REVIEW (per-file scrutiny gate, arm A) of the COMPLETE U-FGE03 changeset. The prior round reviewed only the 2 engine files before the dispatcher+tests existed; arm B correctly FAILED it on P0-1 (persistLearned unreachable) + P0-2 (zero tests) + P1-1 (FGE01 drift-semantics regression). Those are now addressed — verify the fixes are correct and complete.

UNIT: U-FGE03 (scope FUSION-TRAIN-GEOM-EVIDENCE). Closes memory reference_cad_fusion_training_2026_05_18 R12 gap: cad_corpus_apply_learned blended prevalences in-memory only, never persisted → DEFAULT build-sequence path (templateFor→buildSequenceFor) never saw trained corpus evidence.

READ END-TO-END (all 4):
1. H:\prism\mcp-server\src\engines\CADCorpusFeaturePrevalenceLearnerEngine.ts — persistLearned() + overlay types + PRISM_CAD_PREVALENCE_OVERLAY_PATH env honored (P0-1 latent divergence fix, KEEP-IN-SYNC marker)
2. H:\prism\mcp-server\src\engines\CADClassFeatureLibraryEngine.ts — overlay loader + templateFor() auto-apply + NEW templateForStatic() + buildSequenceForEvidence rerouted to templateForStatic (P1-1 fix) + overlayStatus + clearOverlayCache
3. H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts — enum + cad_corpus_apply_learned `persist` flag + cad_corpus_overlay_status case (P0-1 wiring)
4. H:\prism\mcp-server\src\__tests__\CADCorpusFeaturePrevalenceLearnerEngine.test.ts (8 new U-FGE03 tests) + H:\prism\mcp-server\src\__tests__\CADClassFeatureLibraryEngine.test.ts (11 new: overlay suite + dispatcher round-trip)

EVIDENCE: 68/68 tests pass (full suites, incl. all pre-existing FGE01/02). Isolated tsc: 0 new errors in the 3 source files (the only match, cadDispatcher.ts:3078, is pre-existing BlueprintLoRABridge TS2344 shifted down by my insertions). No crash.

VERIFY THE FIX QUALITY (P0/P1/P2/P3 + PASS/FAIL per file):
- P1-1 fix correctness: buildSequenceForEvidence now calls this.templateForStatic() (raw LIBRARY, NO overlay) for its drift baseline + fallback filters, while buildSequenceFor/pred
... [+1472 chars truncated]

### Assistant | 2026-05-19T00:40:17.956Z

I'll review the complete U-FGE03 changeset end-to-end. Let me read all 4 files.

### Assistant | 2026-05-19T00:40:18.364Z

[tool_use: Read]

### Assistant | 2026-05-19T00:40:18.874Z

[tool_use: Read]

### User | 2026-05-19T00:40:32.251Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/learn-class-feature-prevalence.ts
2	// to refresh the CADClassFeatureLibraryEngine prevalence weights from corpus
3	// evidence. Dispatcher integration follows in CAD-FUSION-LIVE-MS1 once the
4	// learning loop is closed (corpus → weights → live build → outcome → corpus).
5	/**
6	 * CADCorpusFeaturePrevalenceLearnerEngine — Learn class-feature
... [+19281 chars truncated]

### User | 2026-05-19T00:40:32.772Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/train-class-feature-library.ts
2	// and the print-to-CAD orchestrator (full-cad-ai-pipeline-*.ts). Dispatcher
3	// integration follows in CAD-FUSION-LIVE-MS1 alongside the visual-fidelity gate.
4	/**
5	 * CADClassFeatureLibraryEngine — Class-typical feature taxonomy for the
6	 * print-to-CAD pipeline.
7	 *
8	 * The 1st and 2nd attempts at JM D
... [+45561 chars truncated]

### Assistant | 2026-05-19T00:40:35.293Z

Now the dispatcher and tests.

### Assistant | 2026-05-19T00:40:37.194Z

[tool_use: Bash]

### User | 2026-05-19T00:41:03.053Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
24 matches in 5 files:

2319:0:string) => {
2327:0:{
2353:0:{
2358:0:true, data: cadClassFeatureLibraryEngine.overlayStatus() };
H:/.../dispatchers/cadDispatcher.ts:228:"cad_corpus_learn_prevalence", "cad_corpus_apply_learned", "cad_corpus_overla...
H:/.../dispatchers/cadDispatcher.ts:2027:const { cadC
... [+2190 chars truncated]

### Assistant | 2026-05-19T00:41:05.901Z

[tool_use: Read]

### User | 2026-05-19T00:41:13.341Z

[tool_result] 2300	                // U-FGE02: evidence-ranked-build telemetry. When use_corpus_evidence=false
2301	                // (default), every field below is the zero-state — preserves pre-2026-05-18
2302	                // result shape additively (callers reading other fields see unchanged data).
2303	                use_corpus_evidence: useCorpusEvidence,
2304	                evidence_ordered_missing
... [+4725 chars truncated]

### Assistant | 2026-05-19T00:41:15.934Z

Now the enum line and the test files.

### Assistant | 2026-05-19T00:41:16.786Z

[tool_use: Read]

### Assistant | 2026-05-19T00:41:18.778Z

[tool_use: Bash]

### User | 2026-05-19T00:41:21.939Z

[tool_result] 226	  "cad_class_template", "cad_class_predict_fidelity", "cad_class_build_sequence", "cad_class_build_sequence_evidence",
227	  "cad_class_drive_build",
228	  "cad_corpus_learn_prevalence", "cad_corpus_apply_learned", "cad_corpus_overlay_status",
229	  "cad_step_parse_file", "cad_step_parse_string", "cad_step_evidence_for_kinds",
230	  "cad_blueprint_infer_class", "cad_blueprint_flag_features",

### User | 2026-05-19T00:41:32.287Z

[tool_result] H:/prism/mcp-server/src/__tests__/CADCorpusFeaturePrevalenceLearnerEngine.test.ts:230:// ── U-FGE03: persistLearned — durable overlay (closes the memory R12
H:/prism/mcp-server/src/__tests__/CADCorpusFeaturePrevalenceLearnerEngine.test.ts:232:describe("U-FGE03 persistLearned", () => {
H:/prism/mcp-server/src/__tests__/CADCorpusFeaturePrevalenceLearnerEngine.test.ts:252:    const res = await engine
... [+7053 chars truncated]

### Assistant | 2026-05-19T00:41:34.964Z

Now let me read the full U-FGE03 test blocks in both test files.

### Assistant | 2026-05-19T00:41:35.818Z

[tool_use: Read]

### User | 2026-05-19T00:41:39.939Z

[tool_result] 228	});
229	
230	// ── U-FGE03: persistLearned — durable overlay (closes the memory R12
231	//    "in-memory blend with no persistence path" gap) ──────────────────
232	describe("U-FGE03 persistLearned", () => {
233	  async function mkTmp() {
234	    const os = await import("node:os");
235	    const path = await import("node:path");
236	    const fs = await import("node:fs/promises");
237	    cons
... [+6601 chars truncated]

### Assistant | 2026-05-19T00:41:43.547Z

[tool_use: Read]

### User | 2026-05-19T00:42:04.278Z

[tool_result] 372	    const payload = JSON.parse(written);
373	    expect(payload.schemaVersion).toBe("1.0.0");
374	    expect(payload.smoothing_alpha).toBe(0.55);
375	    expect(payload.prevalence.die.central_oil_hole).toBe(1);
376	    expect(payload.prevalence.die.stepped_revolved_axis).toBeCloseTo(0.47, 6);
377	    expect(Object.keys(payload.prevalence.die).sort()).toEqual(["central_oil_hole", "stepped_revol
... [+35 chars truncated]

### Assistant | 2026-05-19T00:42:10.809Z

Now the CADClassFeatureLibraryEngine test U-FGE03 blocks (overlay auto-apply + dispatcher round-trip).

### Assistant | 2026-05-19T00:42:11.393Z

[tool_use: Read]

### User | 2026-05-19T00:42:41.400Z

[tool_result] 360	    }
361	  });
362	});
363	
364	// ── U-FGE03: learned-prevalence overlay auto-applied on the DEFAULT
365	//    build-sequence path (closes memory R12 "not auto-blended into the
366	//    live build-sequence templates" gap) ──────────────────────────────
367	describe("U-FGE03 overlay auto-apply", () => {
368	  let tmpDir = "";
369	  let overlayFile = "";
370	
371	  async function writeOverlay
... [+12483 chars truncated]

### Assistant | 2026-05-19T00:42:45.090Z

I have read all four files end-to-end. Let me verify a couple of integration points before grading: how `engine` is bound in the lib test, and the dispatcher's `persist`/`smoothing_alpha` schema/param typing.

### Assistant | 2026-05-19T00:42:47.283Z

[tool_use: Bash]

### Assistant | 2026-05-19T00:42:48.629Z

[tool_use: Bash]

### User | 2026-05-19T00:42:59.802Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'persist\|smoothing_alpha\|hand_tuned_templates\|\.passthrough()\|cadParamsSchema\|z.object'

### User | 2026-05-19T00:42:59.844Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
3 matches in 1 files:

H:/.../__tests__/CADClassFeatureLibraryEngine.test.ts:1:import { describe, it, expect, afterEach, beforeAll } from "vitest";
H:/.../__tests__/CADClassFeatureLibraryEngine.test.ts:2:import { CADClassFeatureLibraryEngine } from "../engines/CADClassFeatureLibra...
H:/.../__tests__/C
... [+88 chars truncated]

### Assistant | 2026-05-19T00:43:02.509Z

The grep had escaping issues. Let me check the dispatcher param schema directly.

### Assistant | 2026-05-19T00:43:04.501Z

[tool_use: Bash]

### Assistant | 2026-05-19T00:43:05.404Z

[tool_use: Bash]

### User | 2026-05-19T00:44:00.524Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 4 files:

2335:0:opt-in persistence. params.persist === true durably
2343:0:unknown = null;
2350:0:true, data: { templates: blended, count: blended.length, persisted } };
H:/.../dispatchers/cadDispatcher.ts:2341:// (persist absent/false) is unchanged — additive, preserves the
H:/.../dispat
... [+342 chars truncated]

### User | 2026-05-19T00:44:04.660Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
4 matches in 3 files:

2347:0:smoothingAlpha },
383:0:z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
H:/.../dispatchers/cadDispatcher.ts:2329:const smoothingAlpha = params.smoothing_alpha ?? 0.7;
H:/.../dispatchers/cadDispatcher.ts:2331:params.hand_tuned_templates,

### Assistant | 2026-05-19T00:44:51.880Z

I have everything I need. The dispatcher input schema is `params: z.record(z.string(), z.any()).optional()` (line 383) — so `persist`, `smoothing_alpha`, `hand_tuned_templates` pass through untyped (consistent with the existing `cad_corpus_apply_learned` contract; not a regression). Review complete.

---

# Code Quality Analysis Report — U-FGE03 RE-REVIEW (arm A)

## Summary
- Overall Quality Score: 9/10
- Files Analyzed: 4
- Prior P0/P1 (P0-1 unreachable persist, P0-2 zero tests, P1-1 FGE01 drift regression): **all genuinely fixed**
- New defects introduced by the fixes: **0 P0, 0 P1**
- Verdict: **SHIP**

---

## P1-1 fix correctness (FGE01 drift-semantics regression) — VERIFIED CORRECT

`buildSequenceForEvidence` line 929 calls `this.templateForStatic(partClass)` (raw `LIBRARY`, overlay NEVER applied). The static template feeds **all four** consumption sites in that method: the early-out (931), the drift loop baseline `f.prevalence` (984–993), the ranked map (995–1005), and every fallback filter (938–940, 947–949, 956–958, 1012–1017). `buildSequenceFor`/`predictVisualFidelity` correctly retain overlay-aware `templateFor` (lines 889, 860). The semantic split is exactly FGE01's defined contract: drift = *static-vs-corpus*, never corpus-vs-corpus.

**The oracle is real.** Test "P1-1 REGRESSION" (483–503): overlay pushes blended `central_oil_hole` to 0.1; static is 0.9; `DRIFT_TEMPLATE_PREVALENCE_THRESHOLD = 0.7`. Corpus ratio = 3/100 = 0.03 < `minRatio` 0.3. The drift caveat fires **only if** `f.prevalence (0.9) ≥ 0.7`. If someone reverted line 929 `templateForStatic→templateFor`, the loop would read the overlaid 0.1 < 0.7, the `if` at line 987 goes false, `driftFired` becomes false, `expect(driftFired).toBe(true)` **fails**. This is a true fail-on-revert oracle, not a tautology. **PASS.**

## P0-1 fix (persistLearned reachable in production) — VERIFIED

Dispatcher line 2344 `if (params.persist === true)` → 2345 `persistLearned(blended, { smoothing_alpha })`; `cad_c
... [+5417 chars truncated]
