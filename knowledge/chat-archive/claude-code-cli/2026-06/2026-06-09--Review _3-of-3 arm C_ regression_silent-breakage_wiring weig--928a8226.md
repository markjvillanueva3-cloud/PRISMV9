---
type: "chat-session"
source: "claude-code-cli"
session_id: "928a8226-c5d3-489a-a7f0-3c0167726623"
title: "Review (3-of-3 arm C, regression/silent-breakage/wiring weighted) of U-QP-CALIBR"
date: "2026-06-09"
first_ts: "2026-06-09T23:37:11.008Z"
last_ts: "2026-06-09T23:41:10.246Z"
cwd: "H:\\prism\\mcp-server"
messages: 30
user_msgs: 11
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a61eb1df91742fdf7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review (3-of-3 arm C, regression/silent-breakage/wiring weighted) of U-QP-CALIBR

> **claude-code-cli** | 2026-06-09 | 30 msgs (11 user / 19 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/928a8226-c5d3-489a-a7f0-3c0167726623/subagents/agent-a61eb1df91742fdf7.jsonl`

## Transcript

### User | 2026-06-09T23:37:11.008Z

Review (3-of-3 arm C, regression/silent-breakage/wiring weighted) of U-QP-CALIBRATION-FRESHNESS-PREFLIGHT in PRISM quoting. Grade PASS/FAIL with explicit P0/P1. Concise.

CHANGE: mcp-server/src/engines/QuoteEstimatorEngine.ts -- (a) added optional fields `is_stale?: boolean` + `factor_age_minutes?: number` to the exported `CalibrationResult` interface; (b) added optional `maxFactorAgeHours?: number` to estimateCalibrated's opts; (c) a new early-return branch in estimateCalibrated that refuses a too-stale factor and emits raw FMV; (d) a conditional staleness warning + is_stale/factor_age_minutes in the apply-path return. Plus 4 tests.

Read: `cd /h/prism && git diff -- mcp-server/src/engines/QuoteEstimatorEngine.ts`

VERIFY (regression + integration):
1. ADDITIVE-SAFETY: are the CalibrationResult changes purely additive (optional fields only)? Can ANY existing consumer of CalibrationResult / estimateCalibrated break? Grep consumers: `grep -rn "estimateCalibrated\|CalibrationResult\|\.calibration\." mcp-server/src --include=*.ts | grep -v test` -- does any destructure or exhaustively type-check the calibration block in a way the new fields or new applied:false branch would break?
2. The new hard-cutoff early-return spreads `...base` -- does it preserve ALL fields a caller expects (dfm_warnings, pricing, costs)? Is the returned shape identical to the existing fallback return (which also returns base + calibration.applied=false)?
3. Does the new branch ordering interact badly with the existing margin-floor re-evaluation (calBelowFloor) on the apply path? Is the margin-floor gate still reached for applied (non-refused) calibrations?
4. SILENT-BREAKAGE: any path where a quote is emitted with stale calibration but NO signal (the exact bug this closes)? Any double-warning or lost-warning?
5. NOTE (do not flag): the mcp-server has a large PRE-EXISTING full-heap tsc baseline (WEDMSetup/cad-validation/shop/speedfeed etc.) unrelated to this change; the 2 changed files have 0 ts
... [+219 chars truncated]

### Assistant | 2026-06-09T23:37:13.497Z

I'll review the change. Let me read the diff and check consumers.

### Assistant | 2026-06-09T23:37:14.737Z

[tool_use: Bash]

### User | 2026-06-09T23:37:23.060Z

[tool_result] diff --git a/mcp-server/src/engines/QuoteEstimatorEngine.ts b/mcp-server/src/engines/QuoteEstimatorEngine.ts
index 22111b3401..31b3413d95 100644
--- a/mcp-server/src/engines/QuoteEstimatorEngine.ts
+++ b/mcp-server/src/engines/QuoteEstimatorEngine.ts
@@ -1074,7 +1074,7 @@ class QuoteEstimatorEngine {
    */
   async estimateCalibrated(
     input: QuoteEstimateInput,
-    opts: { skipCalibration?:
... [+3813 chars truncated]

### Assistant | 2026-06-09T23:37:25.798Z

Now let me see the full context of the function and the existing fallback return to compare shapes.

### Assistant | 2026-06-09T23:37:26.528Z

[tool_use: Read]

### User | 2026-06-09T23:37:33.573Z

[tool_result] 1070	   *     `calibration.applied = false` + reason. Pricing unchanged.
1071	   *
1072	   * @milestone DEEP-REASONING-BRIDGE-MS0/U-QP-CALIBRATION-WIRE
1073	   * @author slot:charlie /goal-20 iter2, 2026-05-25
1074	   */
1075	  async estimateCalibrated(
1076	    input: QuoteEstimateInput,
1077	    opts: { skipCalibration?: boolean; customer?: string; maxFactorAgeHours?: number } = {},
1078	  ): Pr
... [+7084 chars truncated]

### Assistant | 2026-06-09T23:37:36.033Z

Now let me verify the `factor_metadata` shape (does it actually carry `ageMinutes` and `isStale`?) and grep consumers.

### Assistant | 2026-06-09T23:37:37.932Z

[tool_use: Bash]

### Assistant | 2026-06-09T23:37:38.844Z

[tool_use: Bash]

### User | 2026-06-09T23:38:35.191Z

[tool_result] 21: *   - getMetadata() — generated_at + ageMinutes + signature + isStale + hasFactors
28: *   - Stale (>24h) → still returns factors but flags isStale=true so the UI
61:  generated_at?: string;
62:  /** Minutes since generated_at; undefined when not loaded. */
63:  ageMinutes?: number;
64:  /** True when ageMinutes > STALENESS_THRESHOLD_HOURS*60. */
65:  isStale?: boolean;
93:  generated_at?: str
... [+1383 chars truncated]

### User | 2026-06-09T23:38:48.228Z

[tool_result] mcp-server/src/engines/BayesianSafetyEngine.ts:68:export interface CalibrationResult {
mcp-server/src/engines/BayesianSafetyEngine.ts:267:  computeCalibration(): CalibrationResult {
mcp-server/src/engines/CalibrationEngine.ts:38:export interface CalibrationResult {
mcp-server/src/engines/CalibrationEngine.ts:63:  calibrate(input: CalibrationInput): CalibrationResult {
mcp-server/src/engines/Calibr
... [+2370 chars truncated]

### Assistant | 2026-06-09T23:38:52.379Z

The loader's `factor_metadata` (`ActiveFactorMetadata`) genuinely carries `ageMinutes?: number` and `isStale?: boolean`, matching how the new code reads them. No external consumer of `QuoteEstimatorEngine`'s `CalibrationResult` interface exists (all those grep hits are unrelated, independently-declared `CalibrationResult` interfaces in other engines). Let me confirm the `factor_metadata` typing on the `applied` object and that `applyToQuote`'s return type's `factor_metadata` is typed (not `unknown`) so the `?.ageMinutes` access type-checks.

### Assistant | 2026-06-09T23:38:53.241Z

[tool_use: Read]

### User | 2026-06-09T23:38:54.810Z

[tool_result] 85	  ok: boolean;
86	  /** Failure reason when ok=false (file-missing / parse-failed / not-an-object). */
87	  reason?: string;
88	  /** Full latest-training-status.json snapshot (schemaVersion, ts_iso, mape_pct, data_source_coverage, baseline_fallback, skip_reason, ...). */
89	  snapshot?: Record<string, unknown>;
90	  /** schemaVersion carried by the snapshot (informational). */
91	  schemaVersi
... [+980 chars truncated]

### Assistant | 2026-06-09T23:38:57.480Z

`factor_metadata?: ActiveFactorMetadata` is strongly typed with `ageMinutes?: number` and `isStale?: boolean`, so the `factorMeta?.ageMinutes` / `factorMeta?.isStale` accesses type-check cleanly. Now let me check the tests and confirm tsc on the two changed files plus run the test.

### Assistant | 2026-06-09T23:38:59.356Z

[tool_use: Bash]

### User | 2026-06-09T23:39:07.936Z

[tool_result]  .../QuoteEstimatorEngine.calibrated.test.ts        |  77 +++++++++++++++
---
mcp-server/src/__tests__/CAMLoRAEngine.test.ts
mcp-server/src/__tests__/DynamicShopRate.test.ts
mcp-server/src/__tests__/hypermill-ms8-extraction.test.ts
mcp-server/src/__tests__/HyperMillDataExtractionOrchestrator.test.ts
mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
mcp-server/src/__tests__/wedm-gnn-
... [+18 chars truncated]

### Assistant | 2026-06-09T23:39:10.898Z

[tool_use: Bash]

### User | 2026-06-09T23:39:21.695Z

[tool_result] diff --git a/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts b/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
index c0c1a18c9c..2317c31291 100644
--- a/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
+++ b/mcp-server/src/__tests__/QuoteEstimatorEngine.calibrated.test.ts
@@ -136,3 +136,80 @@ describe("QuoteEstimatorEngine.estimateCalibrated — U-QP
... [+4099 chars truncated]

### Assistant | 2026-06-09T23:39:24.355Z

Tests cover all 4 paths (soft-stale-applied, fresh-no-flag, hard-refuse-raw-FMV, hard-within-range). Now let me run them and a focused tsc-check on the changed file.

### Assistant | 2026-06-09T23:39:25.347Z

[tool_use: Bash]

### User | 2026-06-09T23:39:46.119Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 RUN  v4.1.5 H:/PRISM/mcp-server
 ✓ src/__tests__/QuoteEstimatorEngine.calibrated.test.ts (9 tests) 30ms
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  18:39:44
   Duration  577ms (transform 92ms, setup 0ms, import 126ms, tests 30ms, environment 0ms)

### Assistant | 2026-06-09T23:39:48.214Z

All 9 tests pass (5 pre-existing + 4 new). Now verify the changed file introduces no NEW tsc error by isolating the diagnostics to this file.

### Assistant | 2026-06-09T23:39:49.837Z

[tool_use: Bash]

### User | 2026-06-09T23:40:34.289Z

[tool_result] EXIT_GREP_DONE

### Assistant | 2026-06-09T23:40:37.586Z

Zero tsc errors attributable to either changed file (baseline noise excluded per instructions). Let me do a final confirmation on the `dfm_warnings` field's existence on `base` (the spread shape) to rule out the hard-cutoff branch producing a malformed object, and confirm `estimate()` returns `dfm_warnings`.

### Assistant | 2026-06-09T23:40:38.811Z

[tool_use: Bash]

### User | 2026-06-09T23:40:45.066Z

[tool_result] 191:  dfm_warnings: string[];
487:      dfm_warnings: dfmWarnings,
502:  ): Array<{ material: string; unit_price: number; total: number; lead_days: number; dfm_warnings: string[] }> {
510:        dfm_warnings: est.dfm_warnings,
1132:        dfm_warnings: [
1133:          ...base.dfm_warnings,
1161:      ? [...base.dfm_warnings,
1164:      : base.dfm_warnings;
1168:      dfm_warnings: factorIsStale

### Assistant | 2026-06-09T23:41:10.246Z

`dfm_warnings: string[]` is a declared field on the result type (line 191), populated by `estimate()` (line 487). The hard-cutoff branch spreads `...base` then overrides `dfm_warnings` and `calibration` — shape-identical to the existing fallback returns. Confirmed analysis complete.

## Code Quality Analysis Report — U-QP-CALIBRATION-FRESHNESS-PREFLIGHT (3-of-3 arm C)

### GRADE: PASS

No P0/P1 regressions. Additive-safe, integration-clean, all 9 tests pass, zero new tsc errors on the two changed files.

### Verification against each checkpoint

**1. ADDITIVE-SAFETY — SAFE.** The `CalibrationResult` changes are purely additive: two new *optional* fields (`is_stale?`, `factor_age_minutes?`) and one new optional opt (`maxFactorAgeHours?`). I grepped all `CalibrationResult` / `estimateCalibrated` references across `mcp-server/src` (non-test): **no external consumer of this engine's `CalibrationResult` exists** — every other hit is an *independently-declared, unrelated* `CalibrationResult` interface in a different engine (BayesianSafetyEngine, CalibrationEngine, QuoteAutopilotEngine, etc.; no shared import, no name collision at module scope). The new `applied:false` branch returns the same `{...base, calibration:{applied:false,...}}` shape the two pre-existing fallback branches already return, so any caller that switches on `calibration.applied` already handles it. No exhaustive type-narrowing consumer can break on the new optionals.

**2. HARD-CUTOFF SPREAD SHAPE — CORRECT.** The new early-return spreads `...base` (preserving `pricing`, `costs`, `dfm_warnings`, and every other `QuoteEstimateResult` field), appends one warning to `base.dfm_warnings`, and attaches a `calibration` block. It is structurally identical to the existing `fallback_used`/`skipCalibration` returns (both `{...base, calibration:{applied:false}}`) — the only delta is the appended `dfm_warnings` and the two new optional fields. `dfm_warnings: string[]` is a real declared field (L191), populated by `e
... [+2867 chars truncated]
