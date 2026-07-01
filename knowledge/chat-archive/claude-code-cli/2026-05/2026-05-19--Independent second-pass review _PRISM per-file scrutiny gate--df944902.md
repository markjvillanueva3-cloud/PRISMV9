---
type: "chat-session"
source: "claude-code-cli"
session_id: "df944902-c90f-484b-86ea-6b35b3c9143f"
title: "Independent second-pass review (PRISM per-file scrutiny gate, arm B) of U-FGE03."
date: "2026-05-19"
first_ts: "2026-05-19T00:11:29.636Z"
last_ts: "2026-05-19T00:15:27.315Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 19
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a7f8b78de65ef756b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Independent second-pass review (PRISM per-file scrutiny gate, arm B) of U-FGE03.

> **claude-code-cli** | 2026-05-19 | 50 msgs (19 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/df944902-c90f-484b-86ea-6b35b3c9143f/subagents/agent-a7f8b78de65ef756b.jsonl`

## Transcript

### User | 2026-05-19T00:11:29.636Z

Independent second-pass review (PRISM per-file scrutiny gate, arm B) of U-FGE03. Do NOT assume arm A caught anything. Weighted toward: hidden coupling, integration with already-shipped U-FGE01/U-FGE02 surfaces, security/DoS, error budgets, naming/convention conformance, inlined constants, backward-compat regressions, stub/weak assertions.

CONTEXT: U-FGE03 closes the memory gap (reference_cad_fusion_training_2026_05_18, R12): cad_corpus_apply_learned blended prevalences in-memory only, never persisted, so the DEFAULT build-sequence path (CADClassFeatureLibraryEngine.templateFor → buildSequenceFor) never saw trained corpus evidence. Fix = persist a durable overlay + auto-apply in templateFor(). MUST be byte-identical when no overlay file exists (preserve ~35 FGE01/02 tests + every existing templateFor caller across the codebase).

READ END-TO-END:
- H:\prism\mcp-server\src\engines\CADCorpusFeaturePrevalenceLearnerEngine.ts (persistLearned + new types)
- H:\prism\mcp-server\src\engines\CADClassFeatureLibraryEngine.ts (overlay loader + templateFor rewrite + overlayStatus + clearOverlayCache)

Also grep the codebase for OTHER callers of cadClassFeatureLibraryEngine.templateFor() / .buildSequenceFor() / .predictVisualFidelity() / .classesCovered() — does the overlay change silently alter any of THEM in a way the unit didn't intend? (e.g. a scrutiny/training script that asserts static prevalence). classesCovered() uses Object.keys(LIBRARY) directly — confirm it is NOT overlay-affected (correct — overlay only reshapes prevalence, not class set). Check buildSequenceForEvidence: it calls templateFor() then uses tmpl.features + f.prevalence for drift caveats + fallback — does an overlay-modified template silently change FGE01's drift-detection semantics (template_prevalence now = blended, so the drift caveat "template_prevalence=X vs corpus_evidence_ratio=Y" compares blended-vs-corpus instead of static-vs-corpus)? Is that a correctness regression of FGE01's drift signal or ac
... [+1206 chars truncated]

### Assistant | 2026-05-19T00:11:38.053Z

I'll perform an independent second-pass review of U-FGE03. Let me read the implementation files end-to-end and investigate the integration surface.

### Assistant | 2026-05-19T00:11:38.486Z

[tool_use: Read]

### Assistant | 2026-05-19T00:11:38.767Z

[tool_use: Read]

### User | 2026-05-19T00:11:39.028Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADCorpusFeaturePrevalenceLearnerEngine.ts' was already read 20s ago in this session and is unchanged (mtime 1779149138236). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disab
... [+23 chars truncated]

### User | 2026-05-19T00:11:39.884Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADClassFeatureLibraryEngine.ts' was already read 20s ago in this session and is unchanged (mtime 1779149432043). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### Assistant | 2026-05-19T00:11:43.023Z

The read-once guard says these files are already in my context, but I don't see them in my context (this is a fresh review task). Let me disable the cache and read them properly.

### Assistant | 2026-05-19T00:11:43.916Z

[tool_use: Bash]

### User | 2026-05-19T00:11:49.592Z

[tool_result] 401 H:\prism\mcp-server\src\engines\CADCorpusFeaturePrevalenceLearnerEngine.ts
1014 H:\prism\mcp-server\src\engines\CADClassFeatureLibraryEngine.ts
Σ 1415

### Assistant | 2026-05-19T00:11:53.806Z

[tool_use: Read]

### User | 2026-05-19T00:11:55.710Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/learn-class-feature-prevalence.ts
2	// to refresh the CADClassFeatureLibraryEngine prevalence weights from corpus
3	// evidence. Dispatcher integration follows in CAD-FUSION-LIVE-MS1 once the
4	// learning loop is closed (corpus → weights → live build → outcome → corpus).
5	/**
6	 * CADCorpusFeaturePrevalenceLearnerEngine — Learn class-feature
... [+18640 chars truncated]

### Assistant | 2026-05-19T00:11:58.361Z

Now let me read the CADClassFeatureLibraryEngine.ts file.

### Assistant | 2026-05-19T00:11:59.066Z

[tool_use: Read]

### User | 2026-05-19T00:12:00.804Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/train-class-feature-library.ts
2	// and the print-to-CAD orchestrator (full-cad-ai-pipeline-*.ts). Dispatcher
3	// integration follows in CAD-FUSION-LIVE-MS1 alongside the visual-fidelity gate.
4	/**
5	 * CADClassFeatureLibraryEngine — Class-typical feature taxonomy for the
6	 * print-to-CAD pipeline.
7	 *
8	 * The 1st and 2nd attempts at JM D
... [+42670 chars truncated]

### Assistant | 2026-05-19T00:12:03.870Z

Now let me investigate the integration surface — other callers of the affected methods, the persistLearned path resolution vs library overlay path, and the dispatcher wiring.

### Assistant | 2026-05-19T00:12:05.572Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:12:06.467Z

[tool_use: Grep]

### User | 2026-05-19T00:12:27.299Z

[tool_result] Found 14 files
mcp-server\src\engines\CADClassFeatureLibraryEngine.ts
mcp-server\src\engines\CADCorpusFeaturePrevalenceLearnerEngine.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts
mcp-server\src\__tests__\CADClassFeatureLibraryEngine.test.ts
prism-test-6d0595\mcp-server\src\tools\dispatchers\cadDispatcher.ts
prism-test-6d0595\mcp-server\src\__tests__\CADClassFeatureLibraryEngine.test.ts
pris
... [+485 chars truncated]

### User | 2026-05-19T00:12:27.655Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-19T00:12:30.861Z

Let me examine the callers in production code (excluding the `prism-test-6d0595` worktree which is a separate test copy).

### Assistant | 2026-05-19T00:12:32.564Z

[tool_use: Grep]

### Assistant | 2026-05-19T00:12:33.557Z

[tool_use: Grep]

### User | 2026-05-19T00:12:34.058Z

[tool_result] 8- *   1. Geometry      — STEPGeometryParserEngine.parseFile (PHASE8)
9- *   2. Features      — STEPGeometryParserEngine.evidenceForFeatureKinds +
10- *                      FeatureRecognitionEngine (PHASE17 type set)
11: *   3. Class         — CADClassFeatureLibraryEngine.templateFor (PHASE6/7)
12: *   4. Plan          — buildSequenceFor + predictVisualFidelity (PHASE9/15)
13- *   5. Route       
... [+1289 chars truncated]

### User | 2026-05-19T00:12:34.603Z

[tool_result] 585-   * can refuse builds whose predicted fidelity is below threshold.
586-   *
587-   * Wires the master brain to the corpus → library → live-bridge pipeline:
588:   *   CADClassFeatureLibraryEngine.templateFor(class) →
589:   *   CADClassFeatureLibraryEngine.predictVisualFidelity(class, plan) →
590:   *   CADClassFeatureLibraryEngine.buildSequenceFor(class, threshold)
591-   *
592-   * @param p
... [+1021 chars truncated]

### Assistant | 2026-05-19T00:12:38.802Z

Both production callers use `templateFor` → `buildSequenceFor`/`predictVisualFidelity` as a chain. Now let me check the dispatcher wiring and the test file to verify the persist↔load path contract and backward-compat.

### Assistant | 2026-05-19T00:12:41.098Z

[tool_use: Grep]

### User | 2026-05-19T00:12:43.376Z

[tool_result] 224-  "cad_corpus_ingest", "cad_corpus_load_manifest", "cad_corpus_find_by_class", "cad_corpus_summarize",
225-  "cad_corpus_mine_patterns", "cad_corpus_recover_unclassified",
226-  "cad_class_template", "cad_class_predict_fidelity", "cad_class_build_sequence", "cad_class_build_sequence_evidence",
227-  "cad_class_drive_build",
228:  "cad_corpus_learn_prevalence", "cad_corpus_apply_learned",
229- 
... [+1129 chars truncated]

### Assistant | 2026-05-19T00:12:46.929Z

Now I see a key gap. The dispatcher's `cad_corpus_apply_learned` action computes the blend but does NOT call `persistLearned()`. Let me look at the full dispatcher context around this and check whether U-FGE03 added a persist/status action.

### Assistant | 2026-05-19T00:12:47.832Z

[tool_use: Read]

### User | 2026-05-19T00:12:51.816Z

[tool_result] 2300	                // U-FGE02: evidence-ranked-build telemetry. When use_corpus_evidence=false
2301	                // (default), every field below is the zero-state — preserves pre-2026-05-18
2302	                // result shape additively (callers reading other fields see unchanged data).
2303	                use_corpus_evidence: useCorpusEvidence,
2304	                evidence_ordered_missing
... [+7296 chars truncated]

### Assistant | 2026-05-19T00:12:56.189Z

This is a critical finding. The dispatcher's `cad_corpus_apply_learned` action does NOT call `persistLearned()`, and there is no `cad_corpus_overlay_status` action in the enum (line 228 shows only `cad_corpus_learn_prevalence` and `cad_corpus_apply_learned`). Let me confirm by searching the full enum and dispatcher for any persist/status wiring.

### Assistant | 2026-05-19T00:12:57.925Z

[tool_use: Grep]

### User | 2026-05-19T00:12:58.951Z

[tool_result] No matches found

### Assistant | 2026-05-19T00:12:59.825Z

[tool_use: Grep]

### User | 2026-05-19T00:13:00.786Z

[tool_result] No matches found

### Assistant | 2026-05-19T00:13:05.856Z

Confirmed two major findings:

1. **`persistLearned()` is never called by any dispatcher** — it is dead code from the production path's perspective. `cad_corpus_apply_learned` (line 2327-2335) computes the blend and returns it but never persists. No `cad_corpus_overlay_status` action exists.
2. **No test file references `persistLearned`, `overlayStatus`, `clearOverlayCache`, or the overlay loader** in `CADCorpusFeaturePrevalenceLearnerEngine.test.ts`.

Let me verify the test coverage in both test files and check the orchestrator's static-prevalence assumptions.

### Assistant | 2026-05-19T00:13:08.676Z

[tool_use: Bash]

### User | 2026-05-19T00:13:19.739Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'persistLearned\|overlayStatus\|clearOverlayCache\|overlay\|Overlay\|PRISM_CAD_PREVALENCE'
---LEARNER-TEST-LINES---
362 H:\prism\mcp-server\src\__tests__\CADClassFeatureLibraryEngine.test.ts
228 H:\prism\mcp-server\src\__tests__\CADCorpusFeaturePrevalenceLearnerEngine.test.ts
Σ 590

### Assistant | 2026-05-19T00:13:24.558Z

Critical confirmation: **Zero overlay/persist test coverage exists in EITHER test file.** U-FGE03 shipped `persistLearned()`, the overlay loader, `applyOverlay()`, `templateFor()` rewrite, `overlayStatus()`, and `clearOverlayCache()` with **no tests at all**. This violates the PRISM per-file scrutiny gate and Karpathy R9/R12.

Let me verify the no-overlay byte-identical claim by examining the test file's existing assertions and check the orchestrator/scripts for static-prevalence assumptions.

### Assistant | 2026-05-19T00:13:25.348Z

[tool_use: Read]

### User | 2026-05-19T00:13:26.416Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import { CADClassFeatureLibraryEngine } from "../engines/CADClassFeatureLibraryEngine.js";
3	
4	const engine = new CADClassFeatureLibraryEngine();
5	
6	describe("CADClassFeatureLibraryEngine.templateFor", () => {
7	  it("returns extrude_punch template with 6 ordered features", () => {
8	    const t = engine.templateFor("extrude_punch");
9	    expe
... [+2439 chars truncated]

### Assistant | 2026-05-19T00:13:33.264Z

The existing ~35 tests assert exact static prevalences (e.g. `taper?.prevalence).toBe(0.85)`). These pass only because no overlay file exists during test runs (ENOENT path → static template). This is the byte-identical guarantee — but it is **environment-dependent, not structurally enforced**: if a `data/state/cad-learned-prevalence-overlay.json` ever exists when tests run (e.g. a developer ran `persistLearned` locally, or CI persists state), every one of these 35 assertions silently breaks. There is no test that pins ENOENT→static behavior.

Let me check the dispatcher schema file and whether `cad_corpus_apply_learned` was supposed to be modified by U-FGE03 to persist, then verify the static-analysis "unreachable" question.

### Assistant | 2026-05-19T00:13:34.937Z

[tool_use: Grep]

### User | 2026-05-19T00:13:36.977Z

[tool_result] H:\prism\mcp-server\src\schemas\aiReasoningActionSchemas.ts-2179-    ),
mcp-server\src\schemas\aiReasoningActionSchemas.ts-2180-    taskType: z.string().min(1).max(64).optional().describe(
mcp-server\src\schemas\aiReasoningActionSchemas.ts:2181:      "Task-type tag forwarded to persistence + performance-weighted vendor " +
mcp-server\src\schemas\aiReasoningActionSchemas.ts-2182-      "selection. E
... [+16263 chars truncated]

### Assistant | 2026-05-19T00:13:37.403Z

[tool_use: Bash]

### User | 2026-05-19T00:13:43.776Z

[tool_result] 62b5794101 [MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE01: wire STEP geometry corpus into build-sequence inference
77998d918c [CAD-FUSION-LIVE-MS0]/U-CAD-CORPUS-PHASE7: extend feature library to 12 classes + add corpus-driven preval...
8373cf7eda [CAD-FUSION-LIVE-MS0]/U-CAD-CORPUS-PHASE6: CADClassFeatureLibraryEngine — class-typical feature templates ...
---DIFF STAT vs HEAD---
mcp-server/src/__tests
... [+382 chars truncated]

### Assistant | 2026-05-19T00:13:50.776Z

This confirms the most severe finding. The `git diff --stat HEAD` shows U-FGE03's uncommitted changes are **only**:

- `CADClassFeatureLibraryEngine.ts` (+184)
- `CADCorpusFeaturePrevalenceLearnerEngine.ts` (+157)

**There are NO changes to:**
- `cadDispatcher.ts` — so `persistLearned()` is never invoked anywhere; no `cad_corpus_overlay_status` action
- Any test file (`CADClassFeatureLibraryEngine.test.ts` / `CADCorpusFeaturePrevalenceLearnerEngine.test.ts` are untouched — the `__tests__/` diffs are unrelated: ActionTrace, MultiModelConsensus, speed-feed)

So U-FGE03 ships a write path (`persistLearned`) and a read path (`templateFor` overlay) but the **two halves are never connected by any caller**, and there is **zero test coverage**. Let me do one final check on the static-analysis question and the FGE01 drift-semantics interaction by re-reading the relevant lines.

### Assistant | 2026-05-19T00:13:51.689Z

[tool_use: Read]

### User | 2026-05-19T00:13:52.722Z

[tool_result] 300	        {
301	          part_class: "extrude_punch",
302	          files_examined: 100,
303	          feature_evidence_counts: {
304	            central_oil_hole: 50,      // template prevalence 0.9
305	            bevel_face_chamfer: 50,    // template prevalence 0.8
306	          },
307	        },
308	      ],
309	    };
310	    const r = engine.buildSequenceForEvidence("extrude_punch", { co
... [+2800 chars truncated]

### Assistant | 2026-05-19T00:15:27.315Z

I now have a complete picture. The existing FGE01 test at line 304-312 asserts `// template prevalence 0.9` for `central_oil_hole` — this comment documents the **static** prevalence used in the drift comparison. Under an overlay, `templateFor()` inside `buildSequenceForEvidence` (line 885) would return blended prevalences, changing the drift-detection baseline. I have enough to render verdicts.

---

# ARM B — INDEPENDENT SECOND-PASS REVIEW: U-FGE03

**Verdict: FAIL (both files) — ship-blocking P0s.**

I did not assume arm A found anything. The following are independently derived.

---

## P0 FINDINGS (ship-blocking)

### P0-1 — The write path is wired to NOTHING. `persistLearned()` is unreachable dead code; the unit's stated goal is unmet.
`git diff --stat HEAD` proves U-FGE03's entire change is +184/+157 in the two engine files. **`cadDispatcher.ts` is untouched.** `cad_corpus_apply_learned` (cadDispatcher.ts:2327-2335) still does the in-memory blend and returns it — exactly the pre-U-FGE03 behavior the memory R12 entry calls out as the bug. `persistLearned()` has **zero callers** anywhere in the codebase (grep-confirmed: only def site + the test-less engine). No `cad_corpus_overlay_status` action exists in the enum (cadDispatcher.ts:228 — only `cad_corpus_learn_prevalence`, `cad_corpus_apply_learned`).

**Consequence:** The unit's own docstring (`CADCorpusFeaturePrevalenceLearnerEngine.ts:279-290`) claims it "makes the blend persistent + auto-applied on the default path." It does not. No overlay file is ever produced by any production surface, so `templateFor()`'s overlay branch is permanently dead in production. **The R12 memory gap this unit exists to close is still open.** This is a silent no-op wiring — the exact `persistLearned path vs library-engine overlayPathResolved path divergence → silent-no-op` class the review brief flagged as P0, except worse: there is no persist path at all, not merely a divergent one.

*Note on path-divergence (the brief's specifi
... [+14156 chars truncated]
