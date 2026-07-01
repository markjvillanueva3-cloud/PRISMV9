---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "Review (3-of-3 arm A, holistic/logic) of U-QP-CALIBRATION-FRESHNESS-PREFLIGHT in"
date: "2026-06-09"
first_ts: "2026-06-09T23:36:53.910Z"
last_ts: "2026-06-09T23:39:07.427Z"
cwd: "H:\\prism\\mcp-server"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a32148a32c7ddfcb6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review (3-of-3 arm A, holistic/logic) of U-QP-CALIBRATION-FRESHNESS-PREFLIGHT in

> **claude-code-cli** | 2026-06-09 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a32148a32c7ddfcb6.jsonl`

## Transcript

### User | 2026-06-09T23:36:53.910Z

Review (3-of-3 arm A, holistic/logic) of U-QP-CALIBRATION-FRESHNESS-PREFLIGHT in PRISM quoting. Grade PASS/FAIL with explicit P0/P1. Concise.

CONTEXT: The quoting closed-loop is PRICE-grain (predicted_quote_usd = FMV = cost x overhead x 0.20 margin). `QuotingActiveFactorLoaderEngine` exposes calibration factor metadata incl `isStale` (factor older than its 24h threshold) + `ageMinutes`. Before this change, `QuoteEstimatorEngine.estimateCalibrated()` applied the factor but IGNORED isStale -- a stale over-prediction correction was silently applied to a live customer quote (mis-prices once JM's costs shift; the quote-time analog of charlie soul-refuse #4 = no freshness preflight). This change makes estimateCalibrated ACT on staleness: soft path = apply + warn + flag is_stale; opt-in hard cutoff (opts.maxFactorAgeHours) = REFUSE the factor and emit raw FMV (uncalibrated is safer than a known-too-stale correction).

Read the diff + both files:
- `cd /h/prism && git diff -- mcp-server/src/engines/QuoteEstimatorEngine.ts mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts`
- Read mcp-server/src/engines/QuoteEstimatorEngine.ts around estimateCalibrated (the method ~line 1075) + the CalibrationResult interface.

VERIFY:
1. Logic soundness: soft path (isStale true, no cutoff) applies the factor AND flags is_stale + emits a re-derive warning. Hard path (maxFactorAgeHours set, factor exceeds it) returns base estimate uncalibrated (raw FMV, applied:false, reason factor-too-stale) with a warning. Are both branches correct?
2. Edge cases handled: ageMinutes undefined (unparseable generated_at) -> no false staleness, no cutoff misfire? maxFactorAgeHours non-positive/non-number -> ignored (no cutoff)? A factor exactly at the boundary?
3. Backward-compat: a FRESH factor (isStale false) with no maxFactorAgeHours -> identical pricing + no new warning vs the prior behavior (no regression to the existing 5 calibrated tests)?
4. Grain/soul: NO inlined margin/shop-rate/physic
... [+376 chars truncated]

### Assistant | 2026-06-09T23:36:59.817Z

I'll review this change. Let me read the diff and the relevant source files.

### Assistant | 2026-06-09T23:37:01.218Z

[tool_use: Bash]

### User | 2026-06-09T23:37:16.230Z

[tool_result] diff --git a/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts b/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
index c0c1a18c9c..2317c31291 100644
--- a/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
+++ b/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
@@ -136,3 +136,80 @@ describe("QuoteEstimatorEngine.estimateCalibrated — U-QP
... [+8313 chars truncated]

### Assistant | 2026-06-09T23:37:18.481Z

Now let me read the source file around `estimateCalibrated` and the surrounding context to verify the logic against the actual `applied` object and the loader contract.

### Assistant | 2026-06-09T23:37:19.426Z

[tool_use: Read]

### User | 2026-06-09T23:37:22.001Z

[tool_result] 1060	   * corrected automatically.
1061	   *
1062	   * Backward compat:
1063	   *   - Sync `.estimate(input)` is unchanged — callers who want raw FMV stay
1064	   *     on it (e.g., training-loop record generation must NOT calibrate or
1065	   *     it would deflate the bias signal that drives the calibration cycle).
1066	   *   - `opts.skipCalibration: true` forces raw FMV from the async path too
... [+7589 chars truncated]

### Assistant | 2026-06-09T23:37:25.890Z

Now let me verify the loader contract — what `factor_metadata` actually carries (`isStale`, `ageMinutes`), and confirm `applyToQuote`'s `corrected_usd`/`factor_used` semantics so the soft path's pricing claim holds.

### Assistant | 2026-06-09T23:37:27.786Z

[tool_use: Bash]

### User | 2026-06-09T23:38:33.058Z

[tool_result] 18: *   - applyToQuote(predicted_usd, customer?) — convenience wrapper, calls into
21: *   - getMetadata() — generated_at + ageMinutes + signature + isStale + hasFactors
28: *   - Stale (>24h) → still returns factors but flags isStale=true so the UI
55:const STALENESS_THRESHOLD_HOURS = 24;
57:export interface ActiveFactorMetadata {
63:  ageMinutes?: number;
64:  /** True when ageMinutes > STALENES
... [+1344 chars truncated]

### Assistant | 2026-06-09T23:38:37.143Z

The loader contract is confirmed: `ageMinutes` is `undefined` when `generated_at` is unparseable, `isStale` is computed strictly as `ageMinutes > threshold*60` (and `undefined`/falsey when ageMinutes is undefined). Let me verify the `applyToQuote` return shape — that `factor_used` and `corrected_usd` are populated on the success path the soft branch relies on.

### Assistant | 2026-06-09T23:38:38.015Z

[tool_use: Read]

### User | 2026-06-09T23:38:44.054Z

[tool_result] 160	  async applyToQuote(predicted_usd: number, customer?: string): Promise<ActiveFactorApplyResult> {
161	    if (!Number.isFinite(predicted_usd) || predicted_usd <= 0) {
162	      return {
163	        ok: false,
164	        predicted_usd,
165	        corrected_usd: predicted_usd,
166	        factor_used: 1,
167	        factor_source: "balanced-pass-through",
168	        fallback_used: true,
169	
... [+2289 chars truncated]

### Assistant | 2026-06-09T23:39:07.427Z

I have everything I need to render the verdict. Let me confirm the five review axes against the verified evidence.

## Review: U-QP-CALIBRATION-FRESHNESS-PREFLIGHT (3-of-3 arm A, holistic/logic)

**Verdict: PASS**

### Verification against the 5 axes

**1. Logic soundness — both branches correct.**
- Hard path: `maxAgeMinutes !== null && factorAgeMinutes !== undefined && factorAgeMinutes > maxAgeMinutes` → returns `{...base}` (raw FMV, pricing untouched), `applied:false`, `factor_used:1`, `factor_source:"balanced-pass-through"`, `reason:"factor-too-stale-Nh"`, `is_stale:true`, plus an UNCALIBRATED dfm_warning. Correct — it short-circuits *before* `corrected_usd` is read, so the stale factor never touches price.
- Soft path: factor still applied (`applied.corrected_usd`), and when `factorIsStale` it appends a re-derive warning + sets `is_stale:true`/`factor_age_minutes`. Correct. Note the hard cutoff is evaluated first, so a too-stale factor with a cutoff set can never fall through to the soft apply — proper precedence.

**2. Edge cases — all handled correctly (verified against loader contract `QuotingActiveFactorLoaderEngine.ts:249-250`).**
- `ageMinutes` undefined (unparseable `generated_at`): loader sets `ageMinutes=undefined` and `isStale` falsey. Here `factorAgeMinutes` resolves to `undefined` → hard-cutoff guard fails on `factorAgeMinutes !== undefined` (no misfire), and `factorIsStale` is `=== true` strict so it's false (no false staleness warning). Correct on both — no false positive.
- `maxFactorAgeHours` non-positive / non-number: `typeof === "number" && > 0` → `maxAgeMinutes=null` → cutoff disabled. Correct (0, negative, NaN all excluded since `NaN > 0` is false).
- Boundary: comparison is strict `>`, and the loader itself flags stale strictly `> staleHours*60` (line 250). A factor *exactly* at the cutoff is applied, not refused — internally consistent with the loader's own `isStale` definition. Reasonable and consistent.

**3. Backward-compat — no regress
... [+2233 chars truncated]
