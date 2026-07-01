---
type: "chat-session"
source: "claude-code-cli"
session_id: "8dd04bd9-222f-490f-aef6-8e4e2308de01"
title: "Review a NEW pure adapter lib + its test + a small wire, for correctness + silen"
date: "2026-06-23"
first_ts: "2026-06-23T23:40:08.361Z"
last_ts: "2026-06-23T23:41:22.431Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-a1903961033476701.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Review a NEW pure adapter lib + its test + a small wire, for correctness + silen

> **claude-code-cli** | 2026-06-23 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/8dd04bd9-222f-490f-aef6-8e4e2308de01/subagents/agent-a1903961033476701.jsonl`

## Transcript

### User | 2026-06-23T23:40:08.361Z

Review a NEW pure adapter lib + its test + a small wire, for correctness + silent breakage. Read fully:
- H:/prism/scripts/lib/reconcile-candidate-adapters.mjs
- H:/prism/scripts/lib/reconcile-candidate-adapters.test.mjs
- the wire: run `git -C H:/prism diff -- scripts/validate-perfect-parts.mjs` (a new import + a `buildPartCandidates({cadGT, programGT})` call in the --cad-triangulate mode + a counter + a console line)

Contract (U-XRAY-RECONCILE-CANDIDATES): source-adapters that turn program GT + OCR dims into `DimCandidate[]` ({value_mm, type, source:'print'|'cad'|'cnc', confidence?, label?}) for CrossSourceDimensionReconciliationEngine. `cadGtToCandidates` (the (b) cad adapter) lives in cad-dimension-gt-lib and is re-exported here. `buildPartCandidates` merges available sources.

Verify, citing file:line:
1. programGtToCandidates: clusteredDiametersIn (INCH) -> mm `diameter` candidates (prefer clusteredDiametersIn, fall back featureDiametersIn); lengthIn -> `linear` labeled overall_length; non-positive/NaN inputs REJECTED (not abs'd into a fake dim -- this was a fixed bug); confidence OMITTED by default (engine applies cnc prior) unless opts.confidence.
2. printOcrToCandidates: contract dims keep per-field confidence + type; bare numbers -> unknown type, no confidence; non-positive/NaN dropped.
3. buildPartCandidates: merges only provided sources; every output is a valid DimCandidate (value_mm finite>0, valid source).
4. The DimType tokens emitted ('diameter','linear','unknown') and DimSource ('cad','cnc','print') are valid per the engine's union (mcp-server/src/engines/CrossSourceDimensionReconciliationEngine.ts ~line 39-42).
5. The wire is additive + correct (cadGtToCandidates now a live consumer; counter correct; no regression to other branches).
6. Tests are real reference-value assertions; each load-bearing.

Report P0/P1/P2 with file:line, then a single verdict: PASS or FAIL. Review only.

### Assistant | 2026-06-23T23:40:12.228Z

I'll review the new adapter lib, its test, and the wire. Let me read all the files in parallel.

### Assistant | 2026-06-23T23:40:12.703Z

[tool_use: Read]

### Assistant | 2026-06-23T23:40:13.175Z

[tool_use: Read]

### User | 2026-06-23T23:40:13.529Z

[tool_result] 1	/**
2	 * reconcile-candidate-adapters.mjs -- the SOURCE-ADAPTER trio feeding `DimCandidate[]` to
3	 * `CrossSourceDimensionReconciliationEngine` (`prism_cad:cad_dimension_reconcile`, commit a57ef19c2d).
4	 *
5	 * WHY: that engine fuses print+cad+cnc dimension candidates into consensus dims + flagged conflicts,
6	 * but it takes candidates IN -- its documented NEXT-ITER is "build 3 thin source-ad
... [+5500 chars truncated]

### Assistant | 2026-06-23T23:40:13.982Z

[tool_use: Bash]

### User | 2026-06-23T23:40:14.102Z

[tool_result] 1	// reconcile-candidate-adapters.test.mjs -- U-XRAY-RECONCILE-CANDIDATES
2	// The cnc + print source-adapters feeding DimCandidate[] to CrossSourceDimensionReconciliationEngine,
3	// plus buildPartCandidates. Reference values computed from the documented contract (mm-vs-inch, source
4	// tags, optional-confidence). Each assertion is load-bearing (R9).
5	
6	import { describe, it } from "node:test"
... [+3886 chars truncated]

### User | 2026-06-23T23:40:17.451Z

[tool_result] diff --git a/scripts/validate-perfect-parts.mjs b/scripts/validate-perfect-parts.mjs
index d6c220ed53..328ef192d0 100644
--- a/scripts/validate-perfect-parts.mjs
+++ b/scripts/validate-perfect-parts.mjs
@@ -33,6 +33,7 @@ import { extractProgramGT, extractMillProgramGT, scorePartAgainstProgram, isPars
 import { printCursorKey, parseCursorDoneSet, partitionByResumeCursor } from "./lib/ocr-training-l
... [+2756 chars truncated]

### Assistant | 2026-06-23T23:40:20.842Z

Now let me verify the engine's DimType/DimSource union, the re-exported `cadGtToCandidates`, the wire context around the changed lines, and that the candidate shape matches the engine's actual contract.

### Assistant | 2026-06-23T23:40:21.791Z

[tool_use: Read]

### Assistant | 2026-06-23T23:40:22.317Z

[tool_use: Read]

### User | 2026-06-23T23:40:22.790Z

[tool_result] 1	/**
2	 * CrossSourceDimensionReconciliationEngine — determine a part's TRUE dimensions by
3	 * reconciling candidates from the THREE independent JM data sources (xray cross-source
4	 * dimension determination, 2026-06-02):
5	 *
6	 *   - print : OCR'd dimension from the engineering drawing      (what the engineer SPECIFIED) — DIMENSIONAL
7	 *   - cad   : measured from the STEP / solid-model geome
... [+4807 chars truncated]

### User | 2026-06-23T23:40:23.849Z

[tool_result] 1	/**
2	 * cad-dimension-gt-lib.mjs -- pure: derive CALLOUT-CLASS dimensional ground truth from a part's
3	 * neutral STEP model + score/triangulate OCR dims against it (U-XRAY-CAD-GT-SCORE, slot:xray).
4	 *
5	 * WHY (the P2.7 measurement-backbone gap): `validate-perfect-parts.mjs` scores OCR recall against the
6	 * posted CNC PROGRAM only (`cnc-program-gt-lib.mjs`). On the 91-part `perfect-print-
... [+16476 chars truncated]

### Assistant | 2026-06-23T23:40:27.633Z

I have everything I need. Let me verify the wire context more fully — specifically that `cadGT` and `programGT` are in scope at the insertion point, and check the surrounding branches for regression risk.

### Assistant | 2026-06-23T23:40:28.424Z

[tool_use: Read]

### User | 2026-06-23T23:40:29.599Z

[tool_result] 180	  // CAD-model dim GT (cad-dimension-gt-lib) + the posted-program GT (where present) and triangulate the
181	  // two into the corroborated (high-confidence) dim set. This is the reconcile-engine's "(b) cad adapter"
182	  // applied as a measurement -- it establishes which dims BOTH the CAD model and the program agree on,
183	  // the strongest GT derivable without an operator label. Bounded t
... [+4727 chars truncated]

### Assistant | 2026-06-23T23:40:34.872Z

I now have full context. Let me run the test file and quickly verify the key contract claims against the engine's actual key field names — particularly whether the cnc adapter's `featureDiametersIn` fallback claim matches what the producer actually emits.

### Assistant | 2026-06-23T23:40:35.831Z

[tool_use: Bash]

### Assistant | 2026-06-23T23:40:37.148Z

[tool_use: Grep]

### User | 2026-06-23T23:40:39.284Z

[tool_result]   ---
  duration_ms: 0.6058
  type: 'suite'
  ...
# Subtest: re-export
    # Subtest: cadGtToCandidates (the (b) cad adapter) is re-exported so all 3 sources import from one module
    ok 1 - cadGtToCandidates (the (b) cad adapter) is re-exported so all 3 sources import from one module
      ---
      duration_ms: 0.0332
      ...
    1..1
ok 4 - re-export
  ---
  duration_ms: 0.0609
  type: 'suit
... [+110 chars truncated]

### User | 2026-06-23T23:40:40.743Z

[tool_result] 216: * Returns: featureDiametersIn (distinct feed X, the OD/ID steps a print calls out) + envelope
217: * (maxDiameterIn, lengthIn) + the raw feed X/Z (for precision scoring) + nToolpathPoints (ALL coords,
218: * for context — NOT the recall denominator). The caller's recall uses featureDiametersIn + envelope.
221: * @returns {{axis, featureDiametersIn:number[], maxDiameterIn:(number|null), length
... [+2504 chars truncated]

### Assistant | 2026-06-23T23:40:48.361Z

All 12 tests pass. The producer (`extractProgramGT` / `extractMillProgramGT`) confirms the field contract: both emit `clusteredDiametersIn`, `featureDiametersIn`, and `lengthIn`. The lib's preference (`clusteredDiametersIn` → fall back `featureDiametersIn`) and the producer's guarantees (feedX abs'd to positive, filtered `>0`) are accurate.

Let me verify two remaining things: the cnc adapter's `featureDiametersIn` fallback is genuinely reachable (it is — the producer always emits it), and check the mill program path where `lengthIn: null` — confirming the adapter handles a null `lengthIn` (it does, `Number.isFinite(null)` is false). Now let me confirm there is no double-counting/contract concern: the mill GT sets `clusteredDiametersIn === featureDiametersIn === calloutDimsIn` — so the adapter prefers `clusteredDiametersIn` and won't double-add. Confirmed by reading.

Let me do a final cross-check on one subtle point — whether the engine clusters by EXACT type string (so the emitted `'unknown'` token for bare OCR numbers behaves correctly and doesn't poison co-clustering).

### Assistant | 2026-06-23T23:40:49.637Z

[tool_use: Read]

### User | 2026-06-23T23:40:50.448Z

[tool_result] 90	
91	export interface ReconciliationReport {
92	  dimensions: ReconciledDimension[];
93	  conflicts: DimConflict[];
94	  coverage: {
95	    total: number;
96	    confirmed: number;          // ≥2 distinct DIMENSIONAL sources agree within tolerance
97	    single_source: number;      // exactly 1 dimensional source (CNC presence may still corroborate)
98	    presence_only: number;      // CNC-only
... [+4402 chars truncated]

### Assistant | 2026-06-23T23:40:55.540Z

I have full verification. Let me confirm the engine's sanitization to close the loop on the contract — note line 177: the engine drops on `!Number.isFinite(v) || !VALID_SOURCES.has(src)` but does NOT itself reject `v <= 0`. That makes the adapters' own `>0` rejection the load-bearing guard (the engine would otherwise accept a negative as a finite value). The adapters correctly enforce `>0`. Let me check how the engine groups by type to confirm the `'unknown'`/`'linear'`/`'diameter'` token choices are correct.

### Assistant | 2026-06-23T23:40:56.577Z

[tool_use: Read]

### User | 2026-06-23T23:40:57.728Z

[tool_result] 180	      clean.push({ value_mm: v, type, source: src, confidence: conf, label: typeof c.label === "string" && c.label.trim() ? c.label.trim() : undefined });
181	      sourcesPresent.add(src);
182	    }
183	
184	    // 2. Cluster within (type) by value-within-tolerance, closest-first single linkage. Each cluster
185	    //    is one reconciled dimension. CNC values participate in clustering ASSOC
... [+2477 chars truncated]

### Assistant | 2026-06-23T23:41:22.431Z

Confirmed line 188-193: the engine clusters by EXACT `type` string (`byType` keyed on the type token). This validates the cad-lib's documented reasoning that `'linear'` (not a non-existent `'length'`) must be emitted so envelope extents co-cluster with print's overall-length dims, and confirms `'diameter'`/`'unknown'` are correct co-clustering keys. All review points are now fully verified.

---

VERDICT: PASS

summary: The pure adapter trio (`programGtToCandidates`, `printOcrToCandidates`, `buildPartCandidates`) plus the re-export and the additive wire are correct. Every emitted DimCandidate matches the engine's contract (finite `value_mm > 0`, valid `source` ∈ {cad,cnc,print}, type tokens ∈ the engine's `DimType` union), non-positive/NaN inputs are rejected rather than abs'd into fake dims, confidence is correctly omitted by default, and the wire is purely additive with `cadGT`/`programGT` in scope and the counter computed correctly. 12/12 tests pass and are real reference-value assertions. No silent breakage found.

findings:
- [P2] `scripts/lib/reconcile-candidate-adapters.mjs:39` -- `programGtToCandidates`'s inner `mk` calls `value_mm.toFixed(3)`, which would throw `TypeError` if a non-number reached it; this is currently unreachable (the only callers pass `dn * MM_PER_INCH` after `Number.isFinite(dn)` at line 54, and `programGT.lengthIn * MM_PER_INCH` after `Number.isFinite(programGT.lengthIn)` at line 57), so it is safe today. Note only -- if a future caller routes a raw value through `mk`, the guard lives in the callers, not `mk` itself. No fix required.

Verification trace (auditable consumers / edge-paths checked):
1. Contract item 1 -- cnc adapter: verified `clusteredDiametersIn` preference with `featureDiametersIn` fallback (`reconcile-candidate-adapters.mjs:46-48`) against the actual producer `cnc-program-gt-lib.mjs:264-267` (both fields always emitted; mill path `:583-589` sets `clusteredDiametersIn === featureDiametersIn === calloutDimsIn`, so the ada
... [+1983 chars truncated]
