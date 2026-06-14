/**
 * QuotingTrainingLoopEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT01
 *
 * Closes the inner loop of the self-improving quoting system:
 *
 *   ground truth (financial-baseline records) → predicted (FMV engine)
 *      → accuracy metrics (MAE, RMSE, MAPE, per-customer bias)
 *      → psi_delta signals → PSNAutonomyLoopEngine for NN/GNN retraining
 *
 * This engine does NOT generate new training data — it MEASURES how well the
 * existing pricing pipeline predicts already-observed actuals. The accuracy
 * report exposes systematic biases (e.g. "we under-quote ACCURATE by 12%
 * on average") that the next training cycle uses to adjust priors.
 *
 * Per R5 (model-for-judgment): pure math + deterministic FMV calls. Per R12:
 * missing baseline → reason='no-baseline-records'; engine never fabricates
 * accuracy for empty input.
 *
 * @milestone JM-DIE-QUOTE-TRAINING-MS0/U-QT01-TRAINING-LOOP
 * @author slot:charlie /goal-17 iter1, 2026-05-24
 */

import { fairMarketValueEngine } from "./FairMarketValueEngine.js";

/** A single ground-truth quote record from the financial baseline. */
export interface QuoteBaselineRecord {
  customer: string;
  part_id: string;
  doc_date: string | null;
  actual_revenue_usd: number;
  estimated_time_in_cut_s?: number;
  estimated_material_spend_usd?: number;
  machine_rate_usd_per_hr?: number;
}

export interface PerRecordPrediction {
  customer: string;
  part_id: string;
  actual_usd: number;
  predicted_fmv_usd: number;
  abs_error_usd: number;
  pct_error: number;       // signed: positive = over-predicted, negative = under-predicted
}

export interface PerCustomerBias {
  customer: string;
  record_count: number;
  mean_pct_error: number;
  mean_abs_pct_error: number;
  systematic_direction: "over-predicting" | "under-predicting" | "balanced";
}

export interface AccuracyReport {
  ok: boolean;
  total_records: number;
  total_predicted: number;
  total_skipped: number;
  metrics: {
    mae_usd: number;             // mean absolute error
    rmse_usd: number;            // root mean squared error
    mape_pct: number;            // mean absolute percentage error
    mean_signed_pct_error: number; // signed — reveals systematic bias direction
  };
  per_customer_bias: PerCustomerBias[];
  worst_5_records: PerRecordPrediction[];
  best_5_records: PerRecordPrediction[];
  psi_delta_fed_count: number;   // how many psi_delta signals would be emitted
  /**
   * U-QP-TRAIN-PREDICTED-EXPOSE (charlie 2026-06-01): ALL per-record predicted FMVs ($), in prediction
   * order — the full predicted distribution, not just the best/worst 5. Exposed so a consumer can
   * inspect the whole output distribution. UNITS: these are per-PART-JOB FMV dollars (from time-in-cut
   * + machine-rate + material + setup, NO qty), NOT per-PIECE prices — do NOT feed directly to
   * OutboundPriceIndexEngine.compareToPredicted (which references the per-PIECE outbound distribution);
   * that is a SILENT units mismatch (both are dollars, magnitudes overlap → a plausible-but-meaningless
   * verdict). The unit-correct real-outbound reference for a per-part-job FMV is a per-LINE ext_price
   * distribution (qty×unit_price = revenue for one part on one order) — which OutboundPriceIndexEngine
   * does NOT yet expose (it has per-piece unitPrice + per-order orderTotal only); NOT orderTotal (an
   * order may bundle several part types) and NOT the per-piece compareToPredicted path.
   */
  predicted_fmv_usd_all: number[];
  /**
   * U-QP-UNDERQUOTE-ASSESS (charlie 2026-06-02): the FULL per-record prediction list (every job that
   * produced a prediction, in prediction order) — not just worst/best 5. Exposed so a consumer can do a
   * per-JOB under-quote assessment (JM actual_usd vs model predicted_fmv_usd). UNITS: both fields are
   * per-PART-JOB dollars (same grain the report's pct_error already compares), so actual-vs-fair gaps are
   * units-clean. The "fair" value is the model's FMV estimate (NOT ground truth — historical MAPE is
   * high), so any under-quote verdict derived from it is DIRECTIONAL/advisory, never a customer quote.
   */
  all_records: PerRecordPrediction[];
  reason?: string;
}

export interface RunOptions {
  /** Default machine rate when record lacks per-machine-rate ($/hr). */
  defaultMachineRate?: number;
  /** Default material spend when record lacks estimate ($). */
  defaultMaterialSpend?: number;
  /** Default time-in-cut when record lacks estimate (sec). Used as a fallback. */
  defaultTimeInCutS?: number;
  /** When true, also feed psi_delta to PSNAutonomyLoopEngine (default false — measurement only). */
  feedPsnAutonomy?: boolean;
}

const DEFAULT_MACHINE_RATE = 95;
const DEFAULT_MATERIAL_SPEND = 75;
const DEFAULT_TIME_IN_CUT_S = 600;     // 10 min — middle-of-the-road default
const BIAS_BALANCED_BAND = 5;          // ±5% mean_pct_error counts as "balanced"

export class QuotingTrainingLoopEngine {
  /**
   * Run the training-loop measurement pass against a set of ground-truth records.
   * Returns aggregate accuracy + per-customer bias + best/worst records for
   * focused improvement targets.
   */
  run(records: QuoteBaselineRecord[], opts: RunOptions = {}): AccuracyReport {
    const empty: AccuracyReport = {
      ok: false,
      total_records: 0,
      total_predicted: 0,
      total_skipped: 0,
      metrics: { mae_usd: 0, rmse_usd: 0, mape_pct: 0, mean_signed_pct_error: 0 },
      per_customer_bias: [],
      worst_5_records: [],
      best_5_records: [],
      psi_delta_fed_count: 0,
      predicted_fmv_usd_all: [],
      all_records: [],
    };
    if (!Array.isArray(records) || records.length === 0) {
      return { ...empty, reason: "no-baseline-records" };
    }

    const rate = typeof opts.defaultMachineRate === "number" ? opts.defaultMachineRate : DEFAULT_MACHINE_RATE;
    const material = typeof opts.defaultMaterialSpend === "number" ? opts.defaultMaterialSpend : DEFAULT_MATERIAL_SPEND;
    const time = typeof opts.defaultTimeInCutS === "number" ? opts.defaultTimeInCutS : DEFAULT_TIME_IN_CUT_S;

    const predictions: PerRecordPrediction[] = [];
    let skipped = 0;
    for (const rec of records) {
      if (!rec || typeof rec.actual_revenue_usd !== "number" || !isFinite(rec.actual_revenue_usd) || rec.actual_revenue_usd <= 0) {
        skipped++;
        continue;
      }
      const fmv = fairMarketValueEngine.estimate({
        time_in_cut_s: rec.estimated_time_in_cut_s ?? time,
        machine_rate_usd_per_hr: rec.machine_rate_usd_per_hr ?? rate,
        material_spend_usd: rec.estimated_material_spend_usd ?? material,
      });
      if (!fmv.ok || typeof fmv.fmv_usd !== "number" || fmv.fmv_usd <= 0) {
        skipped++;
        continue;
      }
      const absErr = Math.abs(fmv.fmv_usd - rec.actual_revenue_usd);
      const signedPct = ((fmv.fmv_usd - rec.actual_revenue_usd) / rec.actual_revenue_usd) * 100;
      predictions.push({
        customer: rec.customer,
        part_id: rec.part_id,
        actual_usd: rec.actual_revenue_usd,
        predicted_fmv_usd: fmv.fmv_usd,
        abs_error_usd: absErr,
        pct_error: signedPct,
      });
    }

    if (predictions.length === 0) {
      return { ...empty, total_records: records.length, total_skipped: skipped, reason: "all-records-skipped" };
    }

    const n = predictions.length;
    const sumAbsErr = predictions.reduce((s, p) => s + p.abs_error_usd, 0);
    const sumSqErr = predictions.reduce((s, p) => s + p.abs_error_usd * p.abs_error_usd, 0);
    const sumAbsPct = predictions.reduce((s, p) => s + Math.abs(p.pct_error), 0);
    const sumSignedPct = predictions.reduce((s, p) => s + p.pct_error, 0);

    const metrics = {
      mae_usd: sumAbsErr / n,
      rmse_usd: Math.sqrt(sumSqErr / n),
      mape_pct: sumAbsPct / n,
      mean_signed_pct_error: sumSignedPct / n,
    };

    const byCustomer = new Map<string, PerRecordPrediction[]>();
    for (const p of predictions) {
      const arr = byCustomer.get(p.customer) ?? [];
      arr.push(p);
      byCustomer.set(p.customer, arr);
    }
    const bias: PerCustomerBias[] = Array.from(byCustomer.entries())
      .map(([customer, list]) => {
        const meanSigned = list.reduce((s, x) => s + x.pct_error, 0) / list.length;
        const meanAbs = list.reduce((s, x) => s + Math.abs(x.pct_error), 0) / list.length;
        const direction: PerCustomerBias["systematic_direction"] =
          Math.abs(meanSigned) <= BIAS_BALANCED_BAND ? "balanced"
            : meanSigned > 0 ? "over-predicting" : "under-predicting";
        return { customer, record_count: list.length, mean_pct_error: meanSigned, mean_abs_pct_error: meanAbs, systematic_direction: direction };
      })
      .sort((a, b) => b.mean_abs_pct_error - a.mean_abs_pct_error);

    const sortedByErr = [...predictions].sort((a, b) => b.abs_error_usd - a.abs_error_usd);
    const worst5 = sortedByErr.slice(0, 5);
    const best5 = sortedByErr.slice(-5).reverse();

    return {
      ok: true,
      total_records: records.length,
      total_predicted: n,
      total_skipped: skipped,
      metrics,
      per_customer_bias: bias,
      worst_5_records: worst5,
      best_5_records: best5,
      psi_delta_fed_count: opts.feedPsnAutonomy ? n : 0,
      predicted_fmv_usd_all: predictions.map((p) => p.predicted_fmv_usd),
      all_records: predictions,
    };
  }

  /**
   * Compute the improvement targets from an accuracy report — which adjustments
   * would most reduce MAPE on the next cycle. Returns concrete advice strings
   * (customer-specific bias correction factors, default-rate suggestions).
   */
  recommendImprovements(report: AccuracyReport): string[] {
    if (!report.ok || report.total_predicted === 0) return ["no-data-to-recommend-from"];
    const out: string[] = [];
    if (Math.abs(report.metrics.mean_signed_pct_error) > BIAS_BALANCED_BAND) {
      const direction = report.metrics.mean_signed_pct_error > 0 ? "over-predicts" : "under-predicts";
      const magnitude = Math.abs(report.metrics.mean_signed_pct_error).toFixed(1);
      out.push(`global-bias: pipeline ${direction} by ${magnitude}% on average — adjust default machine rate or overhead`);
    }
    for (const b of report.per_customer_bias.slice(0, 3)) {
      if (b.systematic_direction !== "balanced") {
        out.push(`customer-bias[${b.customer}]: ${b.systematic_direction} by ${b.mean_pct_error.toFixed(1)}% across ${b.record_count} records`);
      }
    }
    if (report.metrics.mape_pct > 25) {
      out.push(`high-mape (${report.metrics.mape_pct.toFixed(1)}%) — consider per-part estimated_time_in_cut_s instead of single default`);
    }
    if (out.length === 0) out.push("accuracy-within-band — no high-priority adjustments");
    return out;
  }
}

export const quotingTrainingLoopEngine = new QuotingTrainingLoopEngine();

/** One job's under-quote verdict (model fair vs JM actual). All $ are per-PART-JOB. */
export interface UnderQuoteJob {
  customer: string;
  part_id: string;
  actual_usd: number; // what JM actually charged
  fair_usd: number; // model FMV estimate (NOT ground truth)
  gap_usd: number; // fair - actual (positive = JM under-quoted, money left on the table)
  gap_pct: number; // signed pct (positive = under-quoted); == PerRecordPrediction.pct_error
  verdict: "under-quoted" | "fair" | "over-quoted";
}

export interface UnderQuoteAssessment {
  ok: boolean;
  band_pct: number; // dimensionless classification tolerance (|gap_pct| <= band → "fair")
  total_jobs: number;
  under_quoted_count: number;
  fair_count: number;
  over_quoted_count: number;
  total_dollars_left_on_table: number; // sum of positive gap_usd over under-quoted jobs
  worst_under_quotes: UnderQuoteJob[]; // top-N by gap_usd
  by_customer: { customer: string; under_quoted_count: number; total_gap_usd: number }[];
  advisory: true;
  caveat: string;
}

/**
 * U-QP-UNDERQUOTE-ASSESS (charlie 2026-06-02): per-JOB under-quote assessment — for each job with a
 * prediction, compare what JM actually charged (`actual_usd`) to the model's fair value
 * (`predicted_fmv_usd`) and classify under/fair/over. Answers the operator goal "determine if we
 * under-quoted and what a fair quote should have been per job."
 *
 * Units: both inputs are per-PART-JOB dollars (the same grain the report's `pct_error` already
 * compares), so `gap_usd = fair - actual` is units-clean. Classification uses `gap_pct` (signed %),
 * which is scale-invariant; `gap_usd` measures dollar impact. `band_pct` is a dimensionless tolerance
 * (NOT a margin / shop-rate constant), overridable.
 *
 * ADVISORY (R12 + soul): `fair_usd` is the model's FMV estimate, NOT ground truth (historical MAPE is
 * high) — verdicts are DIRECTIONAL. NEVER emit `fair_usd` as a customer quote without the downstream
 * margin-floor gate. Pure + defensive: non-finite actual/predicted rows are skipped; actual<=0 cannot
 * be assessed by ratio → treated as "fair" (no fabricated gap).
 */
export function assessUnderQuotes(
  records: PerRecordPrediction[],
  opts: { bandPct?: number; topN?: number } = {},
): UnderQuoteAssessment {
  const bandPct = typeof opts.bandPct === "number" && opts.bandPct > 0 ? opts.bandPct : 10;
  const topN = typeof opts.topN === "number" && opts.topN > 0 ? Math.floor(opts.topN) : 10;
  const recs = Array.isArray(records) ? records : [];
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const jobs: UnderQuoteJob[] = [];
  for (const r of recs) {
    if (!r || typeof r.actual_usd !== "number" || typeof r.predicted_fmv_usd !== "number") continue;
    if (!Number.isFinite(r.actual_usd) || !Number.isFinite(r.predicted_fmv_usd)) continue;
    const actual = r.actual_usd;
    const fair = r.predicted_fmv_usd;
    const gapUsd = fair - actual;
    // pct_error is already ((fmv-actual)/actual)*100 from the loop; fall back only if absent/non-finite.
    const gapPct =
      typeof r.pct_error === "number" && Number.isFinite(r.pct_error)
        ? r.pct_error
        : actual > 0
          ? (gapUsd / actual) * 100
          : 0;
    const verdict: UnderQuoteJob["verdict"] =
      gapPct > bandPct ? "under-quoted" : gapPct < -bandPct ? "over-quoted" : "fair";
    jobs.push({
      customer: r.customer,
      part_id: r.part_id,
      actual_usd: actual,
      fair_usd: fair,
      gap_usd: round2(gapUsd),
      gap_pct: round2(gapPct),
      verdict,
    });
  }

  const under = jobs.filter((j) => j.verdict === "under-quoted");
  const overCount = jobs.filter((j) => j.verdict === "over-quoted").length;
  const fairCount = jobs.filter((j) => j.verdict === "fair").length;
  const dollarsLeft = round2(under.reduce((s, j) => s + (j.gap_usd > 0 ? j.gap_usd : 0), 0));
  const worst = [...under].sort((a, b) => b.gap_usd - a.gap_usd).slice(0, topN);

  const byCustMap = new Map<string, { under_quoted_count: number; total_gap_usd: number }>();
  for (const j of under) {
    const e = byCustMap.get(j.customer) ?? { under_quoted_count: 0, total_gap_usd: 0 };
    e.under_quoted_count++;
    e.total_gap_usd += j.gap_usd;
    byCustMap.set(j.customer, e);
  }
  const byCustomer = Array.from(byCustMap.entries())
    .map(([customer, v]) => ({ customer, under_quoted_count: v.under_quoted_count, total_gap_usd: round2(v.total_gap_usd) }))
    .sort((a, b) => b.total_gap_usd - a.total_gap_usd);

  return {
    ok: jobs.length > 0,
    band_pct: bandPct,
    total_jobs: jobs.length,
    under_quoted_count: under.length,
    fair_count: fairCount,
    over_quoted_count: overCount,
    total_dollars_left_on_table: dollarsLeft,
    worst_under_quotes: worst,
    by_customer: byCustomer,
    advisory: true,
    caveat:
      "ADVISORY: fair_usd is the model FMV estimate (per-part-job $), NOT ground truth — historical MAPE is high, so verdicts are DIRECTIONAL. Never emit fair_usd as a customer quote without the margin-floor gate.",
  };
}

/** A Docustrata invoice record — a quoted price paired with the actually-invoiced price for one part-line. */
export interface DocustrataInvoice {
  date?: string;
  customer: string;
  part_id: string;
  material?: string;
  predicted_quote_usd: number; // what was quoted
  actual_invoice_usd: number; // what JM actually invoiced
  quantity?: number;
}

/** Parsed Docustrata invoice file (subset of fields this module reads). */
export interface DocustrataDoc {
  source?: string;
  note?: string;
  invoices?: DocustrataInvoice[];
}

/**
 * Freshness preflight (the soul REFUSES consuming a stale bootstrap distribution without one): true
 * when the doc self-identifies as bootstrap / manual-curation / placeholder via its source or note.
 * Absent/unparseable docs are treated as placeholder (safe — never silently consumed as real).
 */
export function docustrataIsPlaceholder(doc: DocustrataDoc | null | undefined): boolean {
  if (!doc) return true;
  const hay = `${doc.source ?? ""} ${doc.note ?? ""}`.toLowerCase();
  return /bootstrap|manual-curation|placeholder/.test(hay);
}

export interface QuoteExecutionVariance {
  ok: boolean;
  band_pct: number; // |variance_pct| <= band counts as "within" (quote executed accurately)
  source_is_placeholder: boolean;
  total_lines: number;
  mean_abs_variance_pct: number; // mean |invoice-quote|/quote*100 — quote-execution accuracy
  invoiced_above_quote_count: number; // invoice > quote (billed above the quote)
  invoiced_below_quote_count: number; // invoice < quote (billed below the quote)
  within_band_count: number;
  worst_variances: { customer: string; part_id: string; quote_usd: number; invoice_usd: number; variance_pct: number }[];
  advisory: true;
  caveat: string;
}

/**
 * U-QP-DOCUSTRATA-VARIANCE (charlie 2026-06-03): consume the Docustrata invoice document by measuring
 * QUOTE-EXECUTION ACCURACY — how close JM's actual invoices were to the quoted prices. This is a
 * DISTINCT metric from the FMV under-quote assessment (which is fair-vs-actual): here both inputs are
 * the same per-invoice-line grain (`predicted_quote_usd` vs `actual_invoice_usd`), so the variance is
 * units-clean — but do NOT merge these results with the FMV-based `assessUnderQuotes` output (different
 * grain + different question).
 *
 * Soul-compliant: runs `docustrataIsPlaceholder` as a FRESHNESS PREFLIGHT. When the source is bootstrap/
 * placeholder, the result is flagged `source_is_placeholder:true` with a caveat — ADVISORY ONLY, MUST
 * NOT feed the live calibration factor (soul: no training on a stale bootstrap distribution). Pure:
 * the caller loads + parses the file. Defensive: non-finite / quote<=0 rows are skipped.
 *
 * UNITS: `quantity` is intentionally NOT applied — `predicted_quote_usd` and `actual_invoice_usd` are
 * already per-invoice-line extended prices, so re-multiplying by qty would be a grain (units) error.
 */
export function assessQuoteExecutionVariance(
  doc: DocustrataDoc | null | undefined,
  opts: { bandPct?: number; topN?: number } = {},
): QuoteExecutionVariance {
  const bandPct = typeof opts.bandPct === "number" && opts.bandPct > 0 ? opts.bandPct : 5;
  const topN = typeof opts.topN === "number" && opts.topN > 0 ? Math.floor(opts.topN) : 10;
  const placeholder = docustrataIsPlaceholder(doc);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const lines: { customer: string; part_id: string; quote_usd: number; invoice_usd: number; variance_pct: number }[] = [];
  const invoices: DocustrataInvoice[] = doc && Array.isArray(doc.invoices) ? doc.invoices : [];
  for (const inv of invoices) {
    if (!inv) continue;
    const quote = inv.predicted_quote_usd;
    const invoice = inv.actual_invoice_usd;
    if (typeof quote !== "number" || typeof invoice !== "number") continue;
    if (!Number.isFinite(quote) || !Number.isFinite(invoice) || quote <= 0) continue; // quote<=0 can't form a ratio
    const variancePct = ((invoice - quote) / quote) * 100; // +ve = invoiced ABOVE quote
    lines.push({
      customer: String(inv.customer ?? "unknown"),
      part_id: String(inv.part_id ?? "unknown"),
      quote_usd: quote,
      invoice_usd: invoice,
      variance_pct: round2(variancePct),
    });
  }

  const above = lines.filter((l) => l.variance_pct > 0).length;
  const below = lines.filter((l) => l.variance_pct < 0).length;
  const within = lines.filter((l) => Math.abs(l.variance_pct) <= bandPct).length;
  const meanAbs = lines.length > 0 ? round2(lines.reduce((s, l) => s + Math.abs(l.variance_pct), 0) / lines.length) : 0;
  const worst = [...lines].sort((a, b) => Math.abs(b.variance_pct) - Math.abs(a.variance_pct)).slice(0, topN);

  return {
    ok: lines.length > 0,
    band_pct: bandPct,
    source_is_placeholder: placeholder,
    total_lines: lines.length,
    mean_abs_variance_pct: meanAbs,
    invoiced_above_quote_count: above,
    invoiced_below_quote_count: below,
    within_band_count: within,
    worst_variances: worst,
    advisory: true,
    caveat: placeholder
      ? "PLACEHOLDER/BOOTSTRAP Docustrata data — ADVISORY ONLY, MUST NOT feed the live calibration factor until real PDF-extracted invoices land (freshness preflight: no training on a stale bootstrap distribution)."
      : "Quote-execution variance (invoice vs quote, same per-line grain). Advisory — distinct from the FMV under-quote assessment; do not merge the two.",
  };
}
