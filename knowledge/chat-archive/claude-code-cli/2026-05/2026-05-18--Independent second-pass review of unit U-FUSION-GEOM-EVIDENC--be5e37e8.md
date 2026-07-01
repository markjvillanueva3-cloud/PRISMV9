---
type: "chat-session"
source: "claude-code-cli"
session_id: "be5e37e8-9aa8-4749-b02f-a97fde0830dd"
title: "Independent second-pass review of unit U-FUSION-GEOM-EVIDENCE on PRISM (slot mik"
date: "2026-05-18"
first_ts: "2026-05-18T14:55:41.824Z"
last_ts: "2026-05-18T14:58:06.354Z"
cwd: "H:\\prism\\mcp-server"
messages: 30
user_msgs: 14
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a6ee0464a3004bf26.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Independent second-pass review of unit U-FUSION-GEOM-EVIDENCE on PRISM (slot mik

> **claude-code-cli** | 2026-05-18 | 30 msgs (14 user / 16 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/be5e37e8-9aa8-4749-b02f-a97fde0830dd/subagents/agent-a6ee0464a3004bf26.jsonl`

## Transcript

### User | 2026-05-18T14:55:41.824Z

Independent second-pass review of unit U-FUSION-GEOM-EVIDENCE on PRISM (slot mike, claude-be5e37e8). Do NOT assume arm A caught everything — your weighting is integration with existing engines, hidden coupling, type-safety, security, and test-suite robustness.

**Unit goal:** Add corpus-evidence-driven build-sequence inference to `CADClassFeatureLibraryEngine` and expose via new dispatcher action `cad_class_build_sequence_evidence`. Closes the named gap "STEP geometry corpus not auto-wired into build-sequence inference" from yesterday's training run ([[reference_cad_fusion_training_2026_05_18]]).

**Files to review (read end-to-end):**

1. `H:/prism/mcp-server/src/engines/CADClassFeatureLibraryEngine.ts` — focus on the new `buildSequenceForEvidence` method + appended types at the bottom of the file.

2. `H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts` — new `case "cad_class_build_sequence_evidence"` block (search for that exact action name). Also check the z.enum addition.

3. `H:/prism/mcp-server/src/__tests__/CADClassFeatureLibraryEngine.test.ts` — 12 new test cases in the `describe("CADClassFeatureLibraryEngine.buildSequenceForEvidence")` block. All 34 tests pass.

**Your weighting (different from arm A):**
- Type integrity: does `as never` cast in dispatcher hide a real type mismatch? Is the `BuildSequenceEvidenceOpts.corpus_report: CADCorpusStepGeometryReport | null` accurately constrained?
- Backward compatibility: existing `cad_class_build_sequence` action behavior must be unchanged. Verify.
- Schema/dispatcher conventions: does the new action follow the snake_case naming + alphabetical-section + z.enum first pattern from `H:\.claude\rules\dispatchers.md`?
- Engine convention adherence (`H:\.claude\rules\engines.md`): JSDoc with @param @returns? No silentCatch? No inlined constants?
- Hidden coupling: the engine method takes the corpus as an opaque param — does any internal access leak through `(opts.corpus_report as never)` cast in dispatcher mis
... [+435 chars truncated]

### Assistant | 2026-05-18T14:55:48.249Z

I'll review this unit end-to-end with the specified weighting.

### Assistant | 2026-05-18T14:55:50.218Z

[tool_use: Bash]

### Assistant | 2026-05-18T14:55:51.670Z

[tool_use: Grep]

### Assistant | 2026-05-18T14:55:52.670Z

[tool_use: Grep]

### User | 2026-05-18T14:55:53.878Z

[tool_result] 685:  buildSequenceForEvidence(
687:    opts: BuildSequenceEvidenceOpts,
688:  ): BuildSequenceEvidenceResult {
776:export interface CADCorpusStepGeometryReport {
785:/** Opts for `buildSequenceForEvidence`. */
786:export interface BuildSequenceEvidenceOpts {
788:  corpus_report: CADCorpusStepGeometryReport | null;
795:/** Result of `buildSequenceForEvidence`. */
796:export interface BuildSequence
... [+16 chars truncated]

### User | 2026-05-18T14:55:54.813Z

[tool_result] 226:  "cad_class_template", "cad_class_predict_fidelity", "cad_class_build_sequence", "cad_class_build_sequence_evidence",
2041:          case "cad_class_build_sequence": {
2047:          case "cad_class_build_sequence_evidence": {

### User | 2026-05-18T14:55:58.210Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
804 engines/CADClassFeatureLibraryEngine.ts
4072 tools/dispatchers/cadDispatcher.ts
325 __tests__/CADClassFeatureLibraryEngine.test.ts
Σ 5201

### Assistant | 2026-05-18T14:56:03.846Z

[tool_use: Read]

### Assistant | 2026-05-18T14:56:04.529Z

[tool_use: Read]

### User | 2026-05-18T14:56:08.502Z

[tool_result] 2030	            break;
2031	          }
2032	          case "cad_class_predict_fidelity": {
2033	            const { cadClassFeatureLibraryEngine } = await import("../../engines/CADClassFeatureLibraryEngine.js");
2034	            const prediction = cadClassFeatureLibraryEngine.predictVisualFidelity(
2035	              params.part_class,
2036	              params.planned_feature_kinds ?? [],
2037	
... [+6907 chars truncated]

### User | 2026-05-18T14:56:08.967Z

[tool_result] 670	   * Pure (no I/O). Caller injects the corpus report via `opts.corpus_report`;
671	   * the dispatcher reads `state/cad-corpus-step-geometry-report.json` and
672	   * passes it through. When the corpus has no entry for `partClass`, falls
673	   * back to template prevalence with an explicit caveat (R12 fail-loud — never
674	   * silently substitutes).
675	   *
676	   * Feature ordering: descen
... [+6109 chars truncated]

### Assistant | 2026-05-18T14:56:13.546Z

I'll continue reviewing — read the test file and check the remaining engine context.

### Assistant | 2026-05-18T14:56:14.561Z

[tool_use: Read]

### Assistant | 2026-05-18T14:56:15.453Z

[tool_use: Read]

### User | 2026-05-18T14:56:16.115Z

[tool_result] 1	import { describe, it, expect } from "vitest";
2	import { CADClassFeatureLibraryEngine } from "../engines/CADClassFeatureLibraryEngine.js";
3	
4	const engine = new CADClassFeatureLibraryEngine();
5	
6	describe("CADClassFeatureLibraryEngine.templateFor", () => {
7	  it("returns extrude_punch template with 6 ordered features", () => {
8	    const t = engine.templateFor("extrude_punch");
9	    expe
... [+16160 chars truncated]

### User | 2026-05-18T14:56:17.202Z

[tool_result] 1	// WIRE-EXEMPT: training surface consumed by scripts/train-class-feature-library.ts
2	// and the print-to-CAD orchestrator (full-cad-ai-pipeline-*.ts). Dispatcher
3	// integration follows in CAD-FUSION-LIVE-MS1 alongside the visual-fidelity gate.
4	/**
5	 * CADClassFeatureLibraryEngine — Class-typical feature taxonomy for the
6	 * print-to-CAD pipeline.
7	 *
8	 * The 1st and 2nd attempts at JM D
... [+4350 chars truncated]

### Assistant | 2026-05-18T14:56:23.083Z

[tool_use: Read]

### User | 2026-05-18T14:56:24.059Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts' (same offset/limit) was already read 19s ago in this session and is unchanged (mtime 1779115484554). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (d
... [+27 chars truncated]

### Assistant | 2026-05-18T14:56:24.645Z

[tool_use: Grep]

### User | 2026-05-18T14:56:25.549Z

[tool_result] No files found

### Assistant | 2026-05-18T14:56:25.664Z

[tool_use: Grep]

### User | 2026-05-18T14:56:46.389Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-18T14:56:50.638Z

[tool_use: Grep]

### Assistant | 2026-05-18T14:56:51.660Z

[tool_use: Grep]

### User | 2026-05-18T14:56:53.110Z

[tool_result] src\tools\dispatchers\cadDispatcher.ts:226:  "cad_class_template", "cad_class_predict_fidelity", "cad_class_build_sequence", "cad_class_build_sequence_evidence",
src\tools\dispatchers\cadDispatcher.ts:2041:          case "cad_class_build_sequence": {
src\tools\dispatchers\cadDispatcher.ts:2047:          case "cad_class_build_sequence_evidence": {

### User | 2026-05-18T14:57:03.355Z

[tool_result] Found 4 files
src\__tests__\CADClassFeatureLibraryEngine.test.ts
src\engines\CADClassFeatureLibraryEngine.ts
src\tools\dispatchers\cadDispatcher.ts
scripts\mine-step-geometry-evidence.ts

### Assistant | 2026-05-18T14:57:09.265Z

[tool_use: Read]

### User | 2026-05-18T14:57:11.404Z

[tool_result] 1	/**
2	 * mine-step-geometry-evidence.ts — Walk the corpus STEP files, parse each
3	 * one with STEPGeometryParserEngine, and aggregate per-class feature
4	 * evidence from real geometry (not filenames).
5	 *
6	 * Run: npx tsx mcp-server/scripts/mine-step-geometry-evidence.ts
7	 */
8	import { cadCorpusIngestionEngine } from "../src/engines/CADCorpusIngestionEngine.js";
9	import { stepGeometryPars
... [+2802 chars truncated]

### Assistant | 2026-05-18T14:58:06.354Z

I have everything I need. Now I'll synthesize the independent review with my specified weighting.

```
VERDICT: PASS (with P1 findings — none are ship-blockers but should be addressed)

P0 findings: none

P1 findings:

1. UNVALIDATED INPUT REACHES PURE ENGINE (security/type-integrity).
   File: cadDispatcher.ts line 2071 — `corpus_report: corpusReport as never`.
   The `as never` cast hides that `corpusReport` is `unknown` from JSON.parse.
   The engine ONLY guards `!corpus || !Array.isArray(corpus.per_class)` —
   but if `corpus` is a string, number, or `null`, the `corpus.per_class`
   property access works (string/number have no own per_class → undefined →
   isArray=false → falls back cleanly). HOWEVER a hostile/corrupt JSON like
   `{"per_class":[{"part_class":"extrude_punch","files_examined":75,
   "feature_evidence_counts":{"__proto__":{"polluted":1}}}]}` reaches
   `counts[f.kind]` via `Number(counts[f.kind] ?? 0)` — Number coerces objects
   to NaN, then `NaN < 0.3` is false → that feature gets a NaN evidence_ratio
   AND a NaN ratio that *bypasses* the `f.evidence_ratio >= minRatio` filter
   (NaN >= n is false, so it filters OUT) — fine for filter, but the drift-
   caveat path at line 736 evaluates `ratio < minRatio` which is also false
   for NaN → silently drops a drift signal for any corrupted count. The
   `as never` cast also silences TypeScript's ability to flag this at
   compile time. Recommend: replace `as never` with a Zod parse against
   `CADCorpusStepGeometryReport` shape (the dispatcher already has Zod via
   the schema enum addition pattern), or at minimum cast as
   `CADCorpusStepGeometryReport | null` and validate `Number.isFinite` on
   every count read.

2. NaN PROPAGATION IN EVIDENCE_RATIO (type-safety/test gap).
   File: CADClassFeatureLibraryEngine.ts line 763.
   In the "ranked.length===0 fallback" branch, the code computes
   `Number(counts[f.kind] ?? 0) / examined` for the evidence_ratio. If
   `counts[f.kind]` is an object/array
... [+5967 chars truncated]
