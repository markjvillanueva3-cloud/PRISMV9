---
type: "chat-session"
source: "claude-code-cli"
session_id: "bce71f69-9857-47c3-9761-8a74e3366e3a"
title: "Arm A (analyst) of PRISM's per-file scrutiny gate. Grade PASS/FAIL + P0/P1/P2 + "
date: "2026-06-25"
first_ts: "2026-06-25T03:42:18.540Z"
last_ts: "2026-06-25T03:43:42.978Z"
cwd: "H:\\prism\\mcp-server"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/bce71f69-9857-47c3-9761-8a74e3366e3a/subagents/agent-a5a07b3851999cc9a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Arm A (analyst) of PRISM's per-file scrutiny gate. Grade PASS/FAIL + P0/P1/P2 + 

> **claude-code-cli** | 2026-06-25 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/bce71f69-9857-47c3-9761-8a74e3366e3a/subagents/agent-a5a07b3851999cc9a.jsonl`

## Transcript

### User | 2026-06-25T03:42:18.540Z

Arm A (analyst) of PRISM's per-file scrutiny gate. Grade PASS/FAIL + P0/P1/P2 + file:line. Read-only.

FILES:
1. H:\prism\mcp-server\src\schemas\BlueprintExtractionContract.ts  (the fix)
2. H:\prism\mcp-server\src\__tests__\BlueprintExtractionContract.test.ts  (tests)

THE FIX (U-XRAY-NEEDS-CONFIRM-HALLUCINATION): `normalizeFusedToContract` previously set `needs_confirm: confidence < floor` -- gating ONLY on the 0.70 confidence floor. A dimension/callout the ensemble flagged `hallucination_candidate:true` (seen by only 1 of >=2 models) has a DEFAULT single-model self-confidence (~0.9, NOT cross-model corroboration), so it passed as `needs_confirm:false` -- the ensemble's low-trust signal was collected but INERT (the router's operator-review count `n_needs_confirm` reads `needs_confirm` only, never `hallucination_candidate`). Surfaced by a LIVE JM electrode print: 38 of 40 dims were single-model and all passed as "confirmed". The fix: `needs_confirm = confidence < floor || hallucination_candidate` for BOTH the dimension map (line ~240) and the callout map (line ~253); schema .describe() docs updated; the geometry normalizer (normalizeDrawingExtractToContract) is unchanged (hallucination is VLM-only there).

VERIFY:
- CORRECTNESS: is the fix semantically right? A single-model dim's `agreement_confidence` is a self-score, not corroboration -- confirm that gating it is correct, and that a CORROBORATED dim (>=2 models, hallucination_candidate=false) above floor is NOT over-flagged (needs_confirm stays false). Read fuseEnsemble / fuseNonDimField if needed to confirm what agreement_confidence means for a singleton.
- SAFE DIRECTION: confirm the change is monotonic -- it only ADDS needs_confirm=true, never removes it (a trust gate must only tighten). No path where a previously-gated field becomes un-gated.
- COMPLETENESS: both dims AND callouts covered? Any OTHER needs_confirm assignment in the file that should also honor hallucination_candidate (grep the file for `needs_co
... [+825 chars truncated]

### Assistant | 2026-06-25T03:42:22.834Z

I'll review the fix and tests. Let me read both files and the supporting functions.

### Assistant | 2026-06-25T03:42:23.858Z

[tool_use: Read]

### Assistant | 2026-06-25T03:42:23.880Z

[tool_use: Read]

### User | 2026-06-25T03:42:25.086Z

[tool_result] 1	/**
2	 * BlueprintExtractionContract -- the VERSIONED, app-facing shape of a blueprint OCR extraction.
3	 *
4	 * WHY (the app-integration keystone, blueprint-vision-app-integration-plan-2026-06-23): the
5	 * blueprint-vision backend is mature (VLM-ensemble OCR -> fused dims/gd&t/notes), but the app stops
6	 * at "file uploaded" and every consumer (the upload->extract route, the quote autopopulat
... [+21353 chars truncated]

### User | 2026-06-25T03:42:25.168Z

[tool_result] 1	// BlueprintExtractionContract.test.ts -- U-XRAY-EXTRACTION-CONTRACT
2	// Verifies the versioned app-facing extraction contract: the fuse->contract normalizer (per-field
3	// confidence + the 0.70 operator-confirm floor), summary rollups, and Zod validation. Reference
4	// values are computed from the documented contract; each assertion is load-bearing (R9).
5	
6	import { describe, it, expect } 
... [+18691 chars truncated]

### Assistant | 2026-06-25T03:42:29.665Z

Now let me verify what `agreement_confidence` actually means for a singleton in the producer, to confirm the fix's premise (that a singleton's `agreement_confidence` is a self-score, not corroboration).

### Assistant | 2026-06-25T03:42:31.107Z

[tool_use: Grep]

### User | 2026-06-25T03:42:32.037Z

[tool_result] 38://   combineConfidenceNoisyOr · normalizeModelDim · clusterAcrossModels · fuseEnsemble
192:// corroboration / models / hallucination_candidate trust metadata the fused dimensions do, so
231: * representative's fields and adds corroboration / n_models / models / hallucination_candidate
237: * @param {number} nModels  ensemble size (drives hallucination_candidate = 1 of >=2)
241:function fuseNonD
... [+1808 chars truncated]

### Assistant | 2026-06-25T03:42:36.343Z

Let me read the key sections of `vision-ensemble-fuse.mjs` to confirm what `agreement_confidence` is for a singleton, and how `combineConfidenceNoisyOr` works.

### Assistant | 2026-06-25T03:42:36.858Z

[tool_use: Read]

### User | 2026-06-25T03:42:38.884Z

[tool_result] 240	 */
241	function fuseNonDimField(runs, field, keyFn, nModels) {
242	  const groups = new Map(); // key -> { rep, models:Set, maxConf }
243	  for (const r of runs) {
244	    const arr = r && r.extraction && Array.isArray(r.extraction[field]) ? r.extraction[field] : [];
245	    for (const item of arr) {
246	      if (!item || typeof item !== "object") continue;
247	      let key;
248	      try {
... [+5918 chars truncated]

### Assistant | 2026-06-25T03:42:42.908Z

Let me check `combineConfidenceNoisyOr` and `DEFAULT_DIM_CONF` to confirm the singleton's `agreement_confidence` is a self-score, not corroboration.

### Assistant | 2026-06-25T03:42:44.266Z

[tool_use: Grep]

### User | 2026-06-25T03:42:45.215Z

[tool_result] 38://   combineConfidenceNoisyOr · normalizeModelDim · clusterAcrossModels · fuseEnsemble
39-// IMPURE SHELL (fenced at bottom, dependency-injectable, NOT exercised by pure tests):
40-//   ocrImageWithModelAsync · runEnsembleOverImage
41-
42-import {
43-  dimMatches,
44-  typesCompatible,
45-  dimType,
46-  dimToMm,
47-} from "./dimension-set-score.mjs";
48-import {
49-  buildVisionPrompt,
50-  bu
... [+2064 chars truncated]

### Assistant | 2026-06-25T03:42:51.918Z

I now have everything I need to confirm the fix's premise. The producer math confirms it precisely:

- For a **singleton** dim (1 of N models), `confs` has exactly one member → `combineConfidenceNoisyOr([c])` returns `min(0.99, c)` — i.e. the single model's own self-reported confidence (or `DEFAULT_DIM_CONF=0.5` if the model emitted none). This is a **self-score, NOT corroboration** — exactly as the fix comment claims (line 237-239). A model that emits `confidence: 0.9` on a dim only it saw yields `agreement_confidence ≈ 0.9` and `hallucination_candidate: true`.
- For a **corroborated** dim (≥2 models), noisy-OR over multiple confidences lifts agreement_confidence and `hallucination_candidate: false`.

So gating on `hallucination_candidate` independent of the floor is semantically correct. Now let me verify the `n_needs_confirm` doc-string and confirm there are no other `needs_confirm:` assignments I missed.

### Assistant | 2026-06-25T03:42:53.192Z

[tool_use: Grep]

### User | 2026-06-25T03:42:54.276Z

[tool_result] 55:    needs_confirm: z.boolean().describe("true when confidence < confirm_floor OR hallucination_candidate (single-model) -> operator MUST confirm before downstream use"),
65:    needs_confirm: z.boolean().describe("true when confidence < confirm_floor OR hallucination_candidate (single-model)"),
84:    n_needs_confirm: z.number().int().nonnegative().describe("total fields (dims + callouts) below
... [+1433 chars truncated]

### Assistant | 2026-06-25T03:43:04.629Z

All `needs_confirm:` assignments accounted for. Let me complete the audit of the four assignment sites:

- **Line 245** (fuse dims): `confidence < floor || hallucination_candidate` — FIXED.
- **Line 261** (fuse callouts): `confidence < floor || hallucination_candidate` — FIXED.
- **Line 358** (drawing-extract dims): `needsConfirm || unitAmbiguous`, with `hallucination_candidate: false` (line 360). The geometry parser is deterministic — `hallucination_candidate` is hardwired `false` (line 322 doc, line 360 code). Since `false || X === X`, adding `|| hallucination_candidate` here is a no-op. Correctly unchanged.
- **Line 368** (drawing-extract notes): `needs_confirm: needsConfirm`, `hallucination_candidate: false`. Same — geometry parser cannot hallucinate. Correctly unchanged.

Now I'll trace one subtle correctness concern: the **doc-string stale risk at line 225**.

Line 225's JSDoc for `normalizeFusedToContract` still reads: `` `needs_confirm = confidence < confirmFloor` `` — this describes the OLD floor-only behavior and was NOT updated to reflect the `|| hallucination_candidate` addition. The schema `.describe()` strings (lines 55, 65, 84) were correctly updated; the in-body inline comments (lines 236-239, 259-260) document the new behavior; but the **function header JSDoc at line 225 contradicts the actual code at line 245**. This is an R12 doc-consistency miss — a maintainer reading the function's contract doc would believe needs_confirm gates on floor only.

Let me verify there are no other consumers reading these flags that could break, and confirm the `n_needs_confirm` router consumer mentioned in the fix description.

### Assistant | 2026-06-25T03:43:06.206Z

[tool_use: Grep]

### User | 2026-06-25T03:43:07.887Z

[tool_result] H:\prism\scripts\ocr-extract-one.mjs:148:    // The runner feeds `fused` straight to prism_cad:blueprint_extract_and_route (normalizeFusedToContract).
src\tools\dispatchers\cadDispatcher.ts:3610:              ? contractMod.normalizeFusedToContract(params.fused, cOpts)
src\tools\dispatchers\cadDispatcher.ts:3667:              ? contractMod.normalizeFusedToContract(params.fused, cOpts)
src\engines\b
... [+4629 chars truncated]

### Assistant | 2026-06-25T03:43:11.246Z

Let me check the router consumer (`blueprintExtractionRouter.ts`) to confirm it recomputes `n_needs_confirm` from the actual field flags — which means the fix's added gating propagates correctly through the router, AND there is no double-counting or contract drift.

### Assistant | 2026-06-25T03:43:12.369Z

[tool_use: Read]

### User | 2026-06-25T03:43:13.352Z

[tool_result] 560	      action: spec.action,
561	      kind: spec.kind,
562	      eligible: r.eligible,
563	      reason: r.reason,
564	      requires_confirmation,
565	      blocking_fields: blocking,
566	      payload: r.payload,
567	    };
568	  });
569	
570	  // n_needs_confirm is recomputed from the ACTUAL field flags (not mirrored from the upstream
571	  // summary) so the plan's displayed cause can never
... [+1446 chars truncated]

### Assistant | 2026-06-25T03:43:42.978Z

I have everything needed. The router (`blueprintExtractionRouter.ts:570-578`) recomputes `n_needs_confirm` from the actual array field flags via `nNeedsConfirm(dims(contract))` etc. — so the fix's added gating propagates correctly to the operator-review rollup the fix description names. No consumer drift. The fix is well-targeted.

Let me do a final completeness pass on the `confidence` clamp interaction with `NOISY_OR_CAP` to ensure the corroborated-above-floor case is genuinely not over-flagged, then deliver the verdict.

One subtle edge case worth noting: a **corroborated dim** could in principle still have `hallucination_candidate: false` but `agreement_confidence` below floor (e.g. 2 models each with very low conf). That correctly yields `needs_confirm: true` via the floor branch — no regression. And a singleton above floor now yields `true` via the hallucination branch — the fix. Both monotonic-tightening. Confirmed.

## Findings

**CORRECTNESS — CONFIRMED.** The fix's premise is verified against the producer (`vision-ensemble-fuse.mjs`):
- For a singleton (`corroboration===1`, line 317/326), `agreement_confidence = combineConfidenceNoisyOr([singleConf])` = `min(0.99, singleConf)` — i.e. the one model's **self-score** (or `DEFAULT_DIM_CONF=0.5` if absent), NOT cross-model corroboration. `hallucination_candidate = corroboration===1 && nModels>=2` (line 339). So a singleton with self-conf 0.9 yields `agreement_confidence≈0.9, hallucination_candidate:true` — exactly the inert-low-trust case the fix gates. Gating it on `|| hallucination_candidate` is semantically right.
- A corroborated dim (≥2 models, `hallucination_candidate:false`) above floor stays `needs_confirm:false` — no over-flagging. Confirmed by test at `:72`.

**SAFE DIRECTION — CONFIRMED MONOTONIC.** `needs_confirm = confidence < floor || hallucination_candidate` only ever ADDS `true`; the `confidence < floor` term is untouched. No path un-gates a previously-gated field.

**COMPLETENESS — CONFIRMED.**
... [+3466 chars truncated]
