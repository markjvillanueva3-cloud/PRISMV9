---
name: reference_charlie_underquote_assess_2026_06_02
description: U-QP-UNDERQUOTE-ASSESS — per-job under-quote assessment (assessUnderQuotes + AccuracyReport.all_records); classifies under/fair/over by signed gap_pct, sums dollars-left-on-table, per-customer rollup; advisory (fair=model FMV est, not a quote); units-safe per-part-job grain
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.514Z
aliases: reference_charlie_underquote_assess_2026_06_02
---


QUOTING-SYNERGY-MS0/U-QP-UNDERQUOTE-ASSESS (slot:charlie, 2026-06-02→03, /loop /goal /yolo iter13, commit `aefaeaea99`). The operator-goal deliverable: "determine if we under-quoted and what a fair quote should have been per job."

**SHIPPED:** (1) additive `AccuracyReport.all_records: PerRecordPrediction[]` — the FULL per-record prediction list (was only worst_5/best_5 + predicted_fmv_usd_all). (2) pure exported `assessUnderQuotes(records, {bandPct=10, topN=10})` in QuotingTrainingLoopEngine.ts → per-job verdict (under/fair/over by signed `gap_pct` vs ±bandPct), `total_dollars_left_on_table` (sum of positive gap_usd over under-quoted), `worst_under_quotes` (top-N by gap_usd), `by_customer` rollup (under-quotes only, sorted by total_gap_usd).

**UNITS (the load-bearing safety, 2-reviewer traced):** `gap_usd = predicted_fmv_usd - actual_usd`, BOTH per-PART-JOB dollars (FMV has NO qty term — reviewer-A traced FairMarketValueEngine; same grain the report's `pct_error` already compares). Units-clean; the classifier NEVER touches per-piece outbound prices / unitPrice / orderTotal (the cross-grain trap charlie guarded all session).

**DEFENSIVE (R12):** non-finite actual/predicted → skipped; `actual<=0` → gapPct falls back to 0 → "fair" (an Infinity pct_error must NEVER fabricate an under-quote — double-guard `Number.isFinite(pct_error)` + `actual>0` fallback; BOTH reviewers flagged this as the dangerous mode + confirmed the test is a genuine fail-on-revert oracle); empty → ok:false/zeros/no-NaN. ADVISORY: `advisory:true` + caveat — fair_usd is the model FMV ESTIMATE (high MAPE → DIRECTIONAL), NOT ground truth; never emit as a customer quote without the margin-floor gate (soul). `bandPct` = dimensionless classification tolerance, NOT a margin/shop-rate constant.

**TESTS:** 10 vitest — MIXED set (3 under/1 fair/1 over, $140 left = 50+30+60) · worst-sort (P4 60>P1 50) · by_customer rollup (ACME 80 > GAMMA 60, BETA excluded) · band-100-reclassifies-all · empty · non-finite-skip · actual<=0→fair · advisory caveat · all_records E2E. 2-reviewer PASS 0 P0/P1/P2, scoped tsc clean.

**NEXT (iter14):** wire `assessUnderQuotes` to prism_quoting as an action (`under_quote_assess`) so it's MCP-invokable + a frontend consumer (the operator wants per-job assessments surfaced). Then raise training-data coverage (40%→) by wiring the unconsumed sources (cost-index units-careful, tool-purchases, docustrata). Wiki: [[quoting-outbound-price-prior]]. Sibling: [[reference_charlie_train_data_coverage_2026_06_02]] · [[reference_charlie_drift_ref_reliability_2026_06_02]].
