/**
 * RealActualsCorpusEngine -- QUOTING-OPTIMAL-MS0 / U1
 *
 * Builds a CLEAN, real-ground-truth training corpus from the 6,718 OCR-extracted
 * settled-order records in state/shared/quoting/orders-closed-actuals.jsonl
 * (source: docustrata-text-extracted-v3-ocr-pass). This replaces the synthetic
 * bootstrap baseline (actual_revenue_usd = size_bytes x $ stub) that starved the
 * quoting calibration loop -- every record here is a REAL invoiced price tied to a
 * real (customer, part_id, order_number).
 *
 * WHY a filter is mandatory (measured, not assumed -- quoting-actuals-outlier-probe):
 *   - 217 records price < $5 (OCR decimal-point misreads / unit-vs-total confusion;
 *     e.g. OPTIMAS SOLUTIONS 841-SM-11 = $0.13).
 *   - 46 records price > $250k (concatenated totals / digit misreads; e.g.
 *     WRENTHAM TOOL "630-6I6" = $5,162,000 -- the "I" is a misread "1").
 *   - 1,523 records extraction_confidence < 0.7.
 *   - 1,748 use the heuristic "max-dollar" method vs 4,970 trustworthy "labeled-total".
 * Conservative band [PRICE_FLOOR_USD, PRICE_CEIL_USD] + confidence gate + an IQR
 * fence backstop yields ~5,039 clean records (388 customers, median $624) -- the
 * realistic CNC die-shop part-price distribution (p25 $295 / p50 $624 / p75 $1,480).
 *
 * Per R12 (fail-loud): an empty/unreadable source returns ok:false with reason --
 * never fabricates records. Pure transform: takes the raw actuals array, returns the
 * clean corpus + a rejection ledger (every dropped row carries a reason) so the
 * filter is auditable, never silent. I/O lives in the companion builder script.
 *
 * Emits the DocustrataExtractedRecord shape consumed by
 * DocustrataHistoricalPricingTrainerEngine (predicted_quote_usd is filled downstream
 * by the real quote engine; this engine owns the ACTUAL side only).
 *
 * @milestone QUOTING-OPTIMAL-MS0/U1-REAL-ACTUALS-CORPUS
 * @author slot:juliett (build-it-all-here), 2026-06-30
 */

// ---- Tunable filter constants (grounded in quoting-actuals-outlier-probe) ----

/** Below this, a price is an OCR artifact (decimal misread / unit-vs-total). */
export const PRICE_FLOOR_USD = 5;
/** Above this, a price is a concatenated total / digit misread for a single part. */
export const PRICE_CEIL_USD = 250_000;
/** Minimum OCR extraction confidence to trust a record. */
export const MIN_EXTRACTION_CONFIDENCE = 0.7;
/** IQR fence multiplier (Tukey) -- backstop against in-band outliers. */
export const IQR_FENCE_K = 3.0;

export type RejectReason =
  | "non-numeric-price"
  | "price-below-floor"
  | "price-above-ceil"
  | "low-confidence"
  | "missing-customer"
  | "missing-part"
  | "iqr-outlier";

/** Raw OCR-extracted actual (orders-closed-actuals.jsonl `actuals[]` shape). */
export interface RawActual {
  customer?: string;
  part_id?: string;
  date?: string;
  actual_invoice_usd?: number;
  actual_source?: string;
  actual_price_method?: string;
  order_number?: string;
  extraction_confidence?: number;
  join_key?: string;
}

/** Clean record in the DocustrataExtractedRecord ACTUAL-side shape. */
export interface CleanActualRecord {
  date: string;
  customer: string;
  part_id: string;
  material: string; // unknown at OCR time; downstream resolver fills it
  predicted_quote_usd: number; // 0 -- filled downstream by the real quote engine
  actual_invoice_usd: number;
  quantity: number; // 1 default -- the invoice is a per-order total
  order_number: string;
  extraction_confidence: number;
  price_method: string;
}

export interface RejectedActual {
  customer: string;
  part_id: string;
  price: number;
  reason: RejectReason;
}

export interface CorpusBuildResult {
  ok: boolean;
  reason?: string;
  schemaVersion: string;
  generated_iso: string | null; // null until the builder stamps it (Date.now banned in pure core)
  source: string;
  total_input: number;
  total_clean: number;
  total_rejected: number;
  reject_breakdown: Record<RejectReason, number>;
  distinct_customers: number;
  price_stats: { min: number; median: number; mean: number; max: number };
  records: CleanActualRecord[];
  rejected: RejectedActual[];
}

const SCHEMA_VERSION = "1.0.0";

function num(x: unknown): number {
  return typeof x === "number" && Number.isFinite(x) ? x : NaN;
}
function norm(s: unknown): string {
  return String(s ?? "").trim();
}
function emptyBreakdown(): Record<RejectReason, number> {
  return {
    "non-numeric-price": 0,
    "price-below-floor": 0,
    "price-above-ceil": 0,
    "low-confidence": 0,
    "missing-customer": 0,
    "missing-part": 0,
    "iqr-outlier": 0,
  };
}

export interface BuildOptions {
  priceFloor?: number;
  priceCeil?: number;
  minConfidence?: number;
  iqrFenceK?: number;
  /** Apply the Tukey IQR fence as a second-pass backstop. Default true. */
  applyIqrFence?: boolean;
}

export class RealActualsCorpusEngine {
  /**
   * Build the clean corpus from a raw actuals array.
   * @param raw the `actuals[]` array from orders-closed-actuals.jsonl
   * @param source provenance string (e.g. the source field of the json)
   * @param opts filter overrides
   * @returns CorpusBuildResult -- clean records + an auditable rejection ledger
   */
  build(raw: RawActual[], source = "unknown", opts: BuildOptions = {}): CorpusBuildResult {
    const priceFloor = opts.priceFloor ?? PRICE_FLOOR_USD;
    const priceCeil = opts.priceCeil ?? PRICE_CEIL_USD;
    const minConf = opts.minConfidence ?? MIN_EXTRACTION_CONFIDENCE;
    const iqrK = opts.iqrFenceK ?? IQR_FENCE_K;
    const applyIqr = opts.applyIqrFence ?? true;

    const breakdown = emptyBreakdown();
    const rejected: RejectedActual[] = [];

    const base: CorpusBuildResult = {
      ok: false,
      schemaVersion: SCHEMA_VERSION,
      generated_iso: null,
      source,
      total_input: Array.isArray(raw) ? raw.length : 0,
      total_clean: 0,
      total_rejected: 0,
      reject_breakdown: breakdown,
      distinct_customers: 0,
      price_stats: { min: 0, median: 0, mean: 0, max: 0 },
      records: [],
      rejected,
    };

    if (!Array.isArray(raw) || raw.length === 0) {
      return { ...base, reason: "empty-or-invalid-input" };
    }

    // ---- Pass 1: hard filters (band + confidence + identity) ----
    const pass1: CleanActualRecord[] = [];
    for (const r of raw) {
      const customer = norm(r?.customer);
      const part = norm(r?.part_id);
      const price = num(r?.actual_invoice_usd);
      const conf = num(r?.extraction_confidence);
      const reject = (reason: RejectReason) => {
        breakdown[reason]++;
        rejected.push({ customer, part_id: part, price: Number.isFinite(price) ? price : NaN, reason });
      };

      if (!Number.isFinite(price)) { reject("non-numeric-price"); continue; }
      if (!customer) { reject("missing-customer"); continue; }
      if (!part) { reject("missing-part"); continue; }
      if (price < priceFloor) { reject("price-below-floor"); continue; }
      if (price > priceCeil) { reject("price-above-ceil"); continue; }
      // confidence may legitimately be absent (NaN) -- treat absent as pass; only reject when present and low
      if (Number.isFinite(conf) && conf < minConf) { reject("low-confidence"); continue; }

      pass1.push({
        date: norm(r?.date) || "",
        customer,
        part_id: part,
        material: "",
        predicted_quote_usd: 0,
        actual_invoice_usd: price,
        quantity: 1,
        order_number: norm(r?.order_number),
        extraction_confidence: Number.isFinite(conf) ? conf : 1,
        price_method: norm(r?.actual_price_method) || "unknown",
      });
    }

    // ---- Pass 2: Tukey IQR fence backstop (in-band outliers) ----
    let clean = pass1;
    if (applyIqr && pass1.length >= 4) {
      const sorted = pass1.map((r) => r.actual_invoice_usd).sort((a, b) => a - b);
      const quartile = (frac: number) => {
        const idx = frac * (sorted.length - 1);
        const lo = Math.floor(idx), hi = Math.ceil(idx);
        return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
      };
      const q1 = quartile(0.25), q3 = quartile(0.75);
      const iqr = q3 - q1;
      const lo = q1 - iqrK * iqr, hi = q3 + iqrK * iqr;
      clean = [];
      for (const r of pass1) {
        if (r.actual_invoice_usd < lo || r.actual_invoice_usd > hi) {
          breakdown["iqr-outlier"]++;
          rejected.push({ customer: r.customer, part_id: r.part_id, price: r.actual_invoice_usd, reason: "iqr-outlier" });
        } else {
          clean.push(r);
        }
      }
    }

    // ---- Stats ----
    const prices = clean.map((r) => r.actual_invoice_usd).sort((a, b) => a - b);
    const sum = prices.reduce((s, v) => s + v, 0);
    const stats = prices.length
      ? {
          min: prices[0],
          median: prices[Math.floor(prices.length / 2)],
          mean: Math.round((sum / prices.length) * 100) / 100,
          max: prices[prices.length - 1],
        }
      : { min: 0, median: 0, mean: 0, max: 0 };

    return {
      ok: clean.length > 0,
      reason: clean.length > 0 ? undefined : "all-records-rejected",
      schemaVersion: SCHEMA_VERSION,
      generated_iso: null,
      source,
      total_input: raw.length,
      total_clean: clean.length,
      total_rejected: rejected.length,
      reject_breakdown: breakdown,
      distinct_customers: new Set(clean.map((r) => r.customer)).size,
      price_stats: stats,
      records: clean,
      rejected,
    };
  }
}

export const realActualsCorpusEngine = new RealActualsCorpusEngine();
