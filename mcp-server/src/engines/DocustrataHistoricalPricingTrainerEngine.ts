/**
 * DocustrataHistoricalPricingTrainerEngine — JM Die historical-price + market-conditions trainer
 *
 * Operator directive: "utilize extracted data from docustrata files to train
 * and build the jm die database for existing jobs and prior prices relative
 * to market conditions for exact time frame of each order."
 *
 * Pure trainer engine. Takes a feed of Docustrata extracted records
 * {date, customer, part_id, predicted_quote_usd, actual_invoice_usd, material}
 * and joins each against a market-condition snapshot at the same date
 * (commodity spot prices, freight index, labor rate) to produce
 * MARKET-CONDITIONED TRAINING RECORDS that downstream
 * `QuotingTrainingLoopEngine.runAccuracyMeasurement` can ingest.
 *
 * Why this matters: U-QT01's training loop currently treats every record as
 * if it were at TODAY's market conditions. A 2-year-old aluminum quote that
 * looks "wrong" by today's standard might have been spot-on for 2024 LME
 * pricing. Adjusting for the market regime at the time of the quote is the
 * difference between a calibrated training signal and noise.
 *
 * Composes (lazy-imported):
 *   - HistoricalMaterialPriceEngine (existing) — material spot at date
 *   - JMDieDocustrataIngestEngine (existing) — record extraction
 *   - QuotingTrainingLoopEngine (existing) — output target
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-DOCUSTRATA-TRAINER (charlie /goal-20 close-out, 2026-05-25)
 */

export interface DocustrataExtractedRecord {
  date: string;                        // ISO-8601 yyyy-mm-dd of the order
  customer: string;
  part_id: string;
  material: string;
  predicted_quote_usd: number;
  actual_invoice_usd: number;
  quantity: number;
}

export interface MarketSnapshot {
  date: string;
  material: string;
  spot_usd_per_lb: number;
  freight_index_pct: number;        // 1.00 = base; > 1.0 = elevated
  labor_index_pct: number;          // 1.00 = base
  source: "historical" | "inferred" | "missing";
}

export interface MarketConditionedRecord {
  scenario_id: string;
  date: string;
  customer: string;
  part_id: string;
  material: string;
  /** Original quote/invoice from Docustrata. */
  predicted_quote_usd: number;
  actual_invoice_usd: number;
  quantity: number;
  /** Market-adjusted quote restated to today's conditions. */
  market_adjusted_quote_usd: number;
  market_adjusted_invoice_usd: number;
  /** The market deltas applied. */
  adjustments: {
    material_factor: number;       // today_spot / date_spot
    freight_factor: number;
    labor_factor: number;
  };
  market_snapshot: MarketSnapshot;
}

export interface TrainerInput {
  records: DocustrataExtractedRecord[];
  /** Today's reference market conditions for normalization. */
  today_market?: { material_spot_by_name: Record<string, number>; freight_index: number; labor_index: number };
  /** Optional caller-supplied market lookup function. */
  marketLookup?: (date: string, material: string) => MarketSnapshot;
}

export interface TrainerOutput {
  ok: boolean;
  reason?: string;
  n_records: number;
  n_market_adjusted: number;
  n_missing_market: number;
  records: MarketConditionedRecord[];
  /** Aggregate signal: how much did adjustments shift the bias? */
  pre_adjust_signed_pct: number;
  post_adjust_signed_pct: number;
}

/** Fallback market snapshot when no lookup found — flat 1.0 indices + 1.00 USD/lb. */
function fallbackMarket(date: string, material: string): MarketSnapshot {
  return {
    date, material,
    spot_usd_per_lb: 1.00,
    freight_index_pct: 1.00,
    labor_index_pct: 1.00,
    source: "missing",
  };
}

export class DocustrataHistoricalPricingTrainerEngine {
  /**
   * Build market-conditioned training records from a Docustrata feed.
   * Each record is adjusted to today's reference market so downstream
   * accuracy measurement compares apples-to-apples.
   */
  buildTrainingSet(input: TrainerInput): TrainerOutput {
    if (!Array.isArray(input.records)) {
      return this.empty("records must be an array");
    }
    if (input.records.length === 0) {
      return { ok: true, n_records: 0, n_market_adjusted: 0, n_missing_market: 0, records: [], pre_adjust_signed_pct: 0, post_adjust_signed_pct: 0 };
    }

    const todayMarket = input.today_market ?? {
      material_spot_by_name: {},
      freight_index: 1.0,
      labor_index: 1.0,
    };
    const lookup = input.marketLookup ?? fallbackMarket;

    const records: MarketConditionedRecord[] = [];
    let nAdjusted = 0;
    let nMissing = 0;
    let sumPreSignedPct = 0;
    let sumPostSignedPct = 0;

    for (let i = 0; i < input.records.length; i++) {
      const rec = input.records[i];
      if (!this.isValid(rec)) continue;

      const snap = lookup(rec.date, rec.material);
      if (snap.source === "missing") nMissing++; else nAdjusted++;

      const todaySpot = todayMarket.material_spot_by_name[rec.material] ?? snap.spot_usd_per_lb;
      const materialFactor = snap.spot_usd_per_lb > 0 ? todaySpot / snap.spot_usd_per_lb : 1.0;
      const freightFactor = snap.freight_index_pct > 0 ? todayMarket.freight_index / snap.freight_index_pct : 1.0;
      const laborFactor = snap.labor_index_pct > 0 ? todayMarket.labor_index / snap.labor_index_pct : 1.0;

      // Blended adjustment — material 50%, labor 30%, freight 20% (industry-typical split)
      const blended = (materialFactor * 0.5) + (laborFactor * 0.3) + (freightFactor * 0.2);

      const adjPred = round2(rec.predicted_quote_usd * blended);
      const adjActual = round2(rec.actual_invoice_usd * blended);

      const preSigned = rec.actual_invoice_usd > 0
        ? ((rec.predicted_quote_usd - rec.actual_invoice_usd) / rec.actual_invoice_usd) * 100
        : 0;
      const postSigned = adjActual > 0
        ? ((adjPred - adjActual) / adjActual) * 100
        : 0;

      sumPreSignedPct += preSigned;
      sumPostSignedPct += postSigned;

      records.push({
        scenario_id: `docustrata-${i.toString().padStart(6, "0")}`,
        date: rec.date,
        customer: rec.customer,
        part_id: rec.part_id,
        material: rec.material,
        predicted_quote_usd: rec.predicted_quote_usd,
        actual_invoice_usd: rec.actual_invoice_usd,
        quantity: rec.quantity,
        market_adjusted_quote_usd: adjPred,
        market_adjusted_invoice_usd: adjActual,
        adjustments: {
          material_factor: round4(materialFactor),
          freight_factor: round4(freightFactor),
          labor_factor: round4(laborFactor),
        },
        market_snapshot: snap,
      });
    }

    const n = records.length;
    return {
      ok: true,
      n_records: n,
      n_market_adjusted: nAdjusted,
      n_missing_market: nMissing,
      records,
      pre_adjust_signed_pct: n > 0 ? round2(sumPreSignedPct / n) : 0,
      post_adjust_signed_pct: n > 0 ? round2(sumPostSignedPct / n) : 0,
    };
  }

  /**
   * Convert market-conditioned records into the shape
   * QuotingTrainingLoopEngine.runAccuracyMeasurement expects.
   */
  toTrainingLoopRecords(output: TrainerOutput): Array<{ customer: string; part_id: string; actual_usd: number; predicted_fmv_usd: number }> {
    return output.records.map(r => ({
      customer: r.customer,
      part_id: r.part_id,
      actual_usd: r.market_adjusted_invoice_usd,
      predicted_fmv_usd: r.market_adjusted_quote_usd,
    }));
  }

  private isValid(r: DocustrataExtractedRecord): boolean {
    return Boolean(
      r &&
      typeof r.date === "string" && r.date.length >= 8 &&
      typeof r.customer === "string" && r.customer.length > 0 &&
      typeof r.part_id === "string" &&
      typeof r.material === "string" &&
      Number.isFinite(r.predicted_quote_usd) && r.predicted_quote_usd >= 0 &&
      Number.isFinite(r.actual_invoice_usd) && r.actual_invoice_usd > 0 &&
      Number.isFinite(r.quantity) && r.quantity > 0
    );
  }

  private empty(reason: string): TrainerOutput {
    return { ok: false, reason, n_records: 0, n_market_adjusted: 0, n_missing_market: 0, records: [], pre_adjust_signed_pct: 0, post_adjust_signed_pct: 0 };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const docustrataHistoricalPricingTrainerEngine = new DocustrataHistoricalPricingTrainerEngine();
export default docustrataHistoricalPricingTrainerEngine;
