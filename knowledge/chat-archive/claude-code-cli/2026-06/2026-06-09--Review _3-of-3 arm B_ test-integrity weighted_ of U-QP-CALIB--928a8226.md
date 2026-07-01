---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "Review (3-of-3 arm B, test-integrity weighted) of U-QP-CALIBRATION-FRESHNESS-PRE"
date: "2026-06-09"
first_ts: "2026-06-09T23:37:02.617Z"
last_ts: "2026-06-09T23:39:24.521Z"
cwd: "H:\\prism\\mcp-server"
messages: 19
user_msgs: 7
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a3885aa9603f1affb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review (3-of-3 arm B, test-integrity weighted) of U-QP-CALIBRATION-FRESHNESS-PRE

> **claude-code-cli** | 2026-06-09 | 19 msgs (7 user / 12 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a3885aa9603f1affb.jsonl`

## Transcript

### User | 2026-06-09T23:37:02.617Z

Review (3-of-3 arm B, test-integrity weighted) of U-QP-CALIBRATION-FRESHNESS-PREFLIGHT in PRISM quoting. Grade PASS/FAIL with explicit P0/P1. Concise. 9/9 tests pass confirmed; do NOT just re-run -- audit test QUALITY.

CONTEXT: New behavior in `QuoteEstimatorEngine.estimateCalibrated()`: acts on the calibration loader's `isStale` flag. Soft path = apply factor + flag `calibration.is_stale=true` + push a /re-derive/ dfm_warning. Hard path (opts.maxFactorAgeHours) = REFUSE -> raw FMV, `calibration.applied=false`, reason `/factor-too-stale/`, /UNCALIBRATED/ warning. 4 new tests were added to mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts.

Read: `cd /h/prism && git diff -- mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts` + the engine method.

VERIFY (R9 fail-on-revert + hermeticity):
1. The aged-factor fixture (`writeFactorAgedHours(h)` writes generated_at = now - h hours) -- does a 48h factor actually drive the loader's isStale=true (loader threshold 24h, ageMinutes = (now-generated)/60000)? Is the test asserting REAL engine behavior, not a tautology?
2. FAIL-ON-REVERT for each of the 4 tests: (a) STALE-soft test fails if is_stale handling is reverted (is_stale undefined != true)? (b) FRESH no-regression test asserts is_stale===false? (c) HARD-CUTOFF test fails if the cutoff is reverted (factor would apply -> price halved -> unit_price != baseline -> applied!=false)? (d) cutoff-no-fire boundary test meaningful? Identify any test that PASSES both with and without the feature (tautological).
3. Hermeticity: tmpdir fixtures + setPath/refresh + afterEach restore originalPath -- CI-safe, no dependency on the gitignored real active-factors file? No cross-test state leak via the singleton loader cache?
4. Weak assertions? Any toBeDefined/toBeUndefined/not.toThrow used where a concrete value should be asserted? Are the regex asserts (/re-derive/, /UNCALIBRATED/, /factor-too-stale/) specific enough?
Report only real P0/P1. If the tests are g
... [+43 chars truncated]

### Assistant | 2026-06-09T23:37:07.014Z

I'll review the test quality for U-QP-CALIBRATION-FRESHNESS-PREFLIGHT. Let me read the diff and the engine method.

### Assistant | 2026-06-09T23:37:08.227Z

[tool_use: Bash]

### User | 2026-06-09T23:37:17.483Z

[tool_result] diff --git a/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts b/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
index c0c1a18c9c..2317c31291 100644
--- a/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
+++ b/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
@@ -136,3 +136,80 @@ describe("QuoteEstimatorEngine.estimateCalibrated — U-QP
... [+4099 chars truncated]

### Assistant | 2026-06-09T23:37:19.350Z

Now let me read the full test file header (imports, helpers) and the engine method.

### Assistant | 2026-06-09T23:37:20.285Z

[tool_use: Read]

### User | 2026-06-09T23:37:22.516Z

[tool_result] 1	/**
2	 * QuoteEstimatorEngine.estimateCalibrated — U-QP-CALIBRATION-WIRE tests
3	 *
4	 * Verifies the runtime calibration application is correct and backward-compat
5	 * preserved. NOT a full test of estimate() — only the calibrated wrapper.
6	 *
7	 * Coverage:
8	 *   - happy path: calibration applied + base+post fields populated
9	 *   - skipCalibration flag → no factor applied, marker present

... [+5900 chars truncated]

### Assistant | 2026-06-09T23:37:25.189Z

Now let me read the engine method and the loader to verify the test asserts real behavior.

### Assistant | 2026-06-09T23:37:26.321Z

[tool_use: Bash]

### User | 2026-06-09T23:38:32.102Z

[tool_result] 1075:  async estimateCalibrated(
1077:    opts: { skipCalibration?: boolean; customer?: string; maxFactorAgeHours?: number } = {},
1113:    // older than its 24h staleness threshold as isStale; estimateCalibrated must ACT on it.
1116:    // preflight). Soft path: apply but WARN. Hard path (opt-in maxFactorAgeHours): refuse +
1123:    const factorIsStale = factorMeta?.isStale === true;
1125:      t
... [+891 chars truncated]

### Assistant | 2026-06-09T23:38:34.600Z

[tool_use: Read]

### User | 2026-06-09T23:38:36.006Z

[tool_result] 1075	  async estimateCalibrated(
1076	    input: QuoteEstimateInput,
1077	    opts: { skipCalibration?: boolean; customer?: string; maxFactorAgeHours?: number } = {},
1078	  ): Promise<QuoteEstimateResult & { calibration: CalibrationResult }> {
1079	    const base = this.estimate(input);
1080	    if (opts.skipCalibration) {
1081	      return {
1082	        ...base,
1083	        calibration: {
1084
... [+7027 chars truncated]

### Assistant | 2026-06-09T23:38:39.167Z

Now let me verify the loader's `applyToQuote` returns `factor_metadata` with `isStale` and `ageMinutes`, and confirm the 24h threshold and age computation.

### Assistant | 2026-06-09T23:38:40.620Z

[tool_use: Bash]

### User | 2026-06-09T23:38:50.744Z

[tool_result] 18: *   - applyToQuote(predicted_usd, customer?) — convenience wrapper, calls into
20: *   - refresh() — force-clear cache + reload from disk
21: *   - getMetadata() — generated_at + ageMinutes + signature + isStale + hasFactors
28: *   - Stale (>24h) → still returns factors but flags isStale=true so the UI
51:/** Cache TTL — re-reads disk if older than this. Operator can force via refresh(). */
5
... [+1977 chars truncated]

### Assistant | 2026-06-09T23:38:53.810Z

The loader confirms: `STALENESS_THRESHOLD_HOURS = 24`, `ageMinutes = round((Date.now()-generatedMs)/60000)`, `isStale = ageMinutes > 24*60`. This validates the fixture math. Let me verify the `applyToQuote` path actually attaches `factor_metadata` from the disk read (not cached/stale), and check the cache TTL since `refresh()` is called in the fixture.

### Assistant | 2026-06-09T23:38:54.912Z

[tool_use: Read]

### User | 2026-06-09T23:38:55.917Z

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
... [+2953 chars truncated]

### Assistant | 2026-06-09T23:39:24.521Z

Both branches of `applyToQuote` attach `factor_metadata: read.metadata`, and `getActiveFactors()` builds that metadata via the disk-read path (lines 327-339). The fixture's `refresh()` after each write clears the cache, forcing a real disk re-read. The chain is verified. I have enough to render the verdict.

---

## VERDICT: PASS

Arm B (test-integrity / fail-on-revert weighted). 4 new tests in the `FRESHNESS-PREFLIGHT` block are genuine, real-behavior, fail-on-revert, and hermetic. No P0/P1.

### 1. Aged-factor fixture drives REAL `isStale` (not a tautology) — VERIFIED
`writeFactorAgedHours(48)` writes `generated_at = now - 48h`. The loader (`QuotingActiveFactorLoaderEngine.ts:332-334`) computes `ageMinutes = round((Date.now()-generatedMs)/60_000)` → ~2880, and `isStale = ageMinutes > 24*60` (2880 > 1440 = true). The engine reads `factorMeta.isStale` from `applied.factor_metadata`, which `applyToQuote` (line 190) attaches from the live disk read. The test asserts the engine's *consumption* of a real loader-computed flag, end to end — not a value it set itself. Genuine.

### 2. Fail-on-revert per test — ALL FOUR HOLD
- **(a) STALE-soft** (`is_stale).toBe(true)` + `factor_age_minutes > 24*60` + `/re-derive/i` warning): if the soft-path `is_stale: factorIsStale` / warning push (engine lines 1168-1173, 1189-1190) is reverted, `is_stale` becomes `undefined` (`!== true`) and `dfm_warnings` lacks `/re-derive/` → fails. Not tautological. Note it *also* still asserts `applied===true` + `factor_used===0.5` + halved price, so it pins the soft path applies the factor — distinguishing soft from hard.
- **(b) FRESH no-regression** (`is_stale).toBe(false)` + no `/re-derive/` warning): a 1h factor → loader `isStale=false`. If the feature mis-flagged fresh factors as stale, `is_stale` would be `true` (or `undefined` ≠ `false`) → fails. Asserts a concrete `false`, not absence. Solid no-regression pin.
- **(c) HARD-CUTOFF** (`applied).toBe(false)` + `reason).toMatch(/factor-too-stale
... [+2959 chars truncated]
