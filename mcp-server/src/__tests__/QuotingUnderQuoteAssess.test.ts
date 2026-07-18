/**
 * QuotingTrainingLoopEngine — per-job under-quote assessment (U-QP-UNDERQUOTE-ASSESS, charlie 2026-06-02).
 *
 * Verifies `assessUnderQuotes` (the operator-goal deliverable: "determine if we under-quoted and what a
 * fair quote should have been per job") + the additive `AccuracyReport.all_records` exposure.
 *
 * All assertions are concrete-value (never presence-only): a wrong classification or count fails.
 */
import { describe, it, expect } from "vitest";
import {
  quotingTrainingLoopEngine,
  assessUnderQuotes,
  type PerRecordPrediction,
} from "../engines/QuotingTrainingLoopEngine.js";

// Build a PerRecordPrediction with pct_error computed the same way the loop does
// (((fair-actual)/actual)*100), so the classifier reads the real signed gap.
const mk = (customer: string, part_id: string, actual: number, fair: number): PerRecordPrediction => ({
  customer,
  part_id,
  actual_usd: actual,
  predicted_fmv_usd: fair,
  abs_error_usd: Math.abs(fair - actual),
  pct_error: actual !== 0 ? ((fair - actual) / actual) * 100 : Infinity,
});

// Canonical mixed set: 3 under-quoted (ACME P1 +50%, ACME P5 +60%, GAMMA P4 +30%),
// 1 fair (BETA P3 +5%), 1 over-quoted (BETA P2 -30%).
const MIXED: PerRecordPrediction[] = [
  mk("ACME", "P1", 100, 150), // gap +50 usd / +50% → under
  mk("ACME", "P5", 50, 80), //  gap +30 usd / +60% → under
  mk("BETA", "P2", 100, 70), //  gap -30 usd / -30% → over
  mk("BETA", "P3", 100, 105), // gap +5 usd / +5%  → fair
  mk("GAMMA", "P4", 200, 260), // gap +60 usd / +30% → under
];

describe("assessUnderQuotes — per-job under-quote classification", () => {
  it("classifies under/fair/over by signed gap_pct and sums dollars left on the table", () => {
    const a = assessUnderQuotes(MIXED); // default band 10%
    expect(a.ok).toBe(true);
    expect(a.total_jobs).toBe(5);
    expect(a.under_quoted_count).toBe(3);
    expect(a.fair_count).toBe(1);
    expect(a.over_quoted_count).toBe(1);
    // dollars left on the table = sum of positive gaps over under-quoted jobs: 50 + 30 + 60
    expect(a.total_dollars_left_on_table).toBe(140);
    expect(a.advisory).toBe(true);
  });

  it("worst_under_quotes is sorted by gap_usd descending (P4 60 > P1 50 > P5 30)", () => {
    const a = assessUnderQuotes(MIXED, { topN: 2 });
    expect(a.worst_under_quotes.length).toBe(2);
    expect(a.worst_under_quotes[0].part_id).toBe("P4");
    expect(a.worst_under_quotes[0].gap_usd).toBe(60);
    expect(a.worst_under_quotes[1].part_id).toBe("P1");
    expect(a.worst_under_quotes[1].gap_usd).toBe(50);
  });

  it("by_customer rolls up under-quotes only, sorted by total_gap_usd (ACME 80 > GAMMA 60; BETA absent)", () => {
    const a = assessUnderQuotes(MIXED);
    expect(a.by_customer.length).toBe(2); // BETA has no under-quotes → excluded
    expect(a.by_customer[0]).toEqual({ customer: "ACME", under_quoted_count: 2, total_gap_usd: 80 });
    expect(a.by_customer[1]).toEqual({ customer: "GAMMA", under_quoted_count: 1, total_gap_usd: 60 });
  });

  it("band_pct override widens the 'fair' band — band 100 reclassifies every job as fair", () => {
    const a = assessUnderQuotes(MIXED, { bandPct: 100 });
    expect(a.under_quoted_count).toBe(0);
    expect(a.over_quoted_count).toBe(0);
    expect(a.fair_count).toBe(5);
    expect(a.total_dollars_left_on_table).toBe(0);
    expect(a.band_pct).toBe(100);
  });

  it("empty input → ok:false, zero counts, no NaN (R12 — never fabricates an assessment)", () => {
    const a = assessUnderQuotes([]);
    expect(a.ok).toBe(false);
    expect(a.total_jobs).toBe(0);
    expect(a.under_quoted_count).toBe(0);
    expect(a.total_dollars_left_on_table).toBe(0);
    expect(a.by_customer).toEqual([]);
  });

  it("non-finite actual/predicted rows are skipped, not counted or classified", () => {
    const recs: PerRecordPrediction[] = [
      mk("ACME", "OK", 100, 150), // valid under-quote
      { customer: "X", part_id: "NAN", actual_usd: NaN, predicted_fmv_usd: 100, abs_error_usd: 0, pct_error: 0 },
      { customer: "Y", part_id: "INF", actual_usd: 100, predicted_fmv_usd: Infinity, abs_error_usd: 0, pct_error: 0 },
    ];
    const a = assessUnderQuotes(recs);
    expect(a.total_jobs).toBe(1); // only the valid row
    expect(a.under_quoted_count).toBe(1);
  });

  it("actual<=0 cannot be assessed by ratio → treated as fair, no fabricated gap / no div-by-zero", () => {
    const recs: PerRecordPrediction[] = [
      { customer: "Z", part_id: "ZERO", actual_usd: 0, predicted_fmv_usd: 50, abs_error_usd: 50, pct_error: Infinity },
    ];
    const a = assessUnderQuotes(recs);
    expect(a.total_jobs).toBe(1);
    expect(a.fair_count).toBe(1);
    expect(a.under_quoted_count).toBe(0); // Infinity pct_error must NOT become an under-quote
  });

  it("carries the advisory caveat (fair = model estimate, not a quote)", () => {
    const a = assessUnderQuotes(MIXED);
    expect(a.caveat).toContain("DIRECTIONAL");
    expect(a.caveat).toContain("margin-floor");
  });
});

describe("AccuracyReport.all_records — additive full per-record exposure", () => {
  it("run() exposes every prediction in all_records, consumable by assessUnderQuotes", () => {
    const records = [
      { customer: "ACME", part_id: "A1", doc_date: "2026-01-01", actual_revenue_usd: 120, estimated_time_in_cut_s: 600, estimated_material_spend_usd: 40, machine_rate_usd_per_hr: 95 },
      { customer: "BETA", part_id: "B1", doc_date: "2026-01-02", actual_revenue_usd: 80, estimated_time_in_cut_s: 1200, estimated_material_spend_usd: 60, machine_rate_usd_per_hr: 110 },
    ];
    const report = quotingTrainingLoopEngine.run(records, {});
    expect(report.ok).toBe(true);
    expect(report.all_records.length).toBe(report.total_predicted);
    expect(report.all_records.length).toBe(2);
    // every record carries the fields assessUnderQuotes needs
    for (const r of report.all_records) {
      expect(typeof r.actual_usd).toBe("number");
      expect(typeof r.predicted_fmv_usd).toBe("number");
    }
    // end-to-end: the full report feeds the assessment
    const a = assessUnderQuotes(report.all_records);
    expect(a.total_jobs).toBe(2);
    expect(a.ok).toBe(true);
  });

  it("empty-input run() returns all_records: [] (stable shape)", () => {
    const report = quotingTrainingLoopEngine.run([], {});
    expect(report.ok).toBe(false);
    expect(report.all_records).toEqual([]);
  });
});
