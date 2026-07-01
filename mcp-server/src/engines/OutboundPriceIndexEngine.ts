/**
 * OutboundPriceIndexEngine — QUOTING-SYNERGY-MS0 / U-QP-OUTBOUND-PRICE-PRIOR (slot:charlie 2026-06-01)
 *
 * Reads the mined JM OUTBOUND sold-order index (`state/shared/quoting/jm-sold-orders.json`, mined by
 * VENDOR-NETWORK-MS0/U-VDN-JM-ORDERS from "JMD Orders Closed" — customer POs to J.M. Die) and exposes
 * the empirical distribution of REAL per-piece prices JM actually CHARGED customers, confidence-gated.
 *
 * WHY: this is the OUTBOUND / calibration-TARGET half of the quoting data ceiling — what JM charges.
 * Its sibling `VendorCostIndexEngine` covers the INBOUND / cost-basis half (what JM pays vendors).
 * Until this engine the sold-order data was a BUILT-BUT-UNWIRED artifact — zero consumers. A prior
 * attempt to overlay outbound revenue onto the training corpus got `match_pct=0` because it tried to
 * JOIN orders to synthetic baseline records by a key that does not exist (po_number is mostly null;
 * quote_ref is OCR garbage). A DISTRIBUTION prior sidesteps the join entirely: the training cycle can
 * calibrate its output price distribution against JM's REAL sold-price distribution (quantile anchoring
 * / distribution match) instead of against the synthetic bootstrap.
 *
 * UNITS NOTE (contrast with VendorCostIndexEngine — this side is CLEAN): each sold-order line-item is
 * `qty × unit_price = ext_price`, so `unit_price` is a genuine per-PIECE outbound price (spot-verified —
 * qty×unit≈ext holds for most high-confidence rows, with OCR drift on a minority). Unlike the AP
 * cost-ledger (which blends $/bar, $/foot, $/piece), the sold-order unit_price is unit-homogeneous
 * (per machined piece sold). The distribution across DIFFERENT parts is
 * still wide ($1–$575/piece) — so a single median is NOT a per-quote price for a specific part; it is a
 * sanity band + an aggregate calibration target. See `pricePrior()` JSDoc.
 *
 * CONFIDENCE GATING (load-bearing safety): the source data tags every order high/medium/low/none and
 * carries its own rule "Never feed low-confidence prices into a live quote." This engine defaults to
 * {high, medium} and NEVER includes low/none by default. (high = PO# + verified qty×unit=ext;
 * medium = price table + figures, line-item unverified; low = a PO#/stray figure only; none = nothing
 * recoverable from the text layer → needs the xray OCR pipeline.)
 *
 * BOUNDARY: this engine is READ-ONLY analysis — a price-distribution prior, NOT a quote emitter. It does
 * not apply (and does not need) the customer-quote margin-floor gate; a downstream quote emitter that
 * consumes this prior MUST still apply that gate itself.
 *
 * SAFETY: NO inline shop-rate / margin / price constants. Every number returned is computed from the
 * data file (derived from real customer POs), never hardcoded. The only literals are the confidence-rank
 * map, the quantile probe points, and the file-resolution walk-up depth.
 *
 * Fail-soft: a missing/unreadable/corrupt index returns an empty shape (ok:false), never throws — a
 * quote/training path that consumes a prior must degrade to its own default, not crash.
 *
 * HEADER-vs-PERSISTED (R12 honesty): the mined file persists a CURATED subset of records (top-value +
 * all high-confidence orders) while its header counts (`ordersProcessed`, `byConfidence`) describe the
 * FULL corpus that was processed. The distribution is computed over the PERSISTED records only, so the
 * result exposes `recordsAvailable` (persisted) alongside `ordersProcessed` (header) — never conflate
 * them. The high-confidence subset is persisted in full, so `minConfidence:"high"` is complete.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type OrderConfidence = "high" | "medium" | "low" | "none";

export interface PriceDistribution {
  n: number;
  min: number;
  /** Fraction of observations EQUAL to the minimum value (in [0,1]). A dominant
   *  mass here is the OCR "$1" floor-spike signature: it pins the median to the
   *  noise floor while the real upper tail keeps the IQR wide, so the IQR-collapse
   *  reliability guard misses it. Pure sample statistic (no price magnitude). */
  minMassFrac: number;
  p5: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  max: number;
  mean: number;
}

export interface SoldOrderLineItem {
  qty: number;
  unit_price: number;
  ext_price: number;
}

export interface SoldOrderRecord {
  file?: string;
  po_number: string | null;
  quote_ref: string | null;
  line_items: SoldOrderLineItem[];
  order_ext_total: number;
  confidence: OrderConfidence;
}

export interface SoldOrderLoadResult {
  ok: boolean;
  path: string | null;
  schemaVersion: string | null;
  source: string | null;
  advisoryOnly: boolean;
  mustHumanVerify: boolean;
  caveat: string | null;
  ordersProcessed: number;
  ordersWithVerifiedLineItems: number;
  confirmedExtRevenue: number;
  byConfidence: Record<OrderConfidence, number>;
  records: SoldOrderRecord[];
}

export interface PricePriorResult {
  ok: boolean;
  path: string | null;
  /** Confidence floor applied (orders at this rank or higher are included). */
  minConfidence: OrderConfidence;
  /** Full-corpus header count (orders PROCESSED during mining — NOT necessarily persisted; see recordsAvailable). */
  ordersProcessed: number;
  /** Records actually PERSISTED in the index file — the distribution is computed over THESE. May be a curated top-value subset << ordersProcessed. */
  recordsAvailable: number;
  /** Orders that passed the confidence gate AND are present in the persisted records. */
  includedOrders: number;
  /** Source self-flags it advisory / OCR-noisy (must-human-verify before any live use). */
  advisoryOnly: boolean;
  /** Source file's self-declared caveat, surfaced so the prior is never mistaken for ground truth. */
  caveat: string | null;
  byConfidence: Record<OrderConfidence, number>;
  confirmedExtRevenue: number;
  /** Distribution of per-PIECE outbound prices (one observation per line-item = one pricing decision). */
  unitPrice: PriceDistribution | null;
  /** Distribution of per-LINE ext_price (qty×unit_price = revenue for one part on one order) — the per-part-job grain. */
  extPrice: PriceDistribution | null;
  /** Distribution of per-ORDER ext totals (one observation per order). */
  orderTotal: PriceDistribution | null;
}

export interface PriceMatchResult {
  ok: boolean;
  minConfidence: OrderConfidence;
  /** Which real-outbound GRAIN the predicted set was compared against (must match the grain of `predicted`). */
  against: "unit" | "line" | "order";
  /** Diagnostic alignment band (dimensionless) — NOT a margin / quote-vs-actual reconciliation threshold. Overridable. */
  alignTolerance: number;
  /** Distribution of the caller's predicted per-piece prices. */
  predicted: PriceDistribution | null;
  /** Real outbound per-piece distribution (the reference prior). */
  reference: PriceDistribution | null;
  /** predicted.median / reference.median (>1 = predicted above JM's real prices, <1 = below). */
  medianRatio: number | null;
  /** Fraction of predicted prices within the reference [p5, p95] band. */
  withinBandPct: number | null;
  /** Two-sample Kolmogorov–Smirnov gap (max CDF distance) in [0,1]; 0 = identical, 1 = disjoint. */
  ksGap: number | null;
  /** Diagnostic verdict (ADVISORY) — aligned | predicted-high | predicted-low | insufficient-data. */
  verdict: "aligned" | "predicted-high" | "predicted-low" | "insufficient-data";
  /**
   * Whether the reference distribution is statistically usable to calibrate against (enough real
   * observations AND not a degenerate price-spike). When false, `medianRatio`/`verdict` are
   * DIRECTIONAL only — read `reliabilityVerdict`/`reliabilityCaveat` before trusting them.
   */
  referenceReliable: boolean;
  /** ok | insufficient-reference (n too low / none) | degenerate-reference (IQR collapsed — a price spike, e.g. OCR "$1" noise). */
  reliabilityVerdict: "ok" | "insufficient-reference" | "degenerate-reference";
  /** Human-readable reliability caveat (null when ok). */
  reliabilityCaveat: string | null;
  advisoryOnly: boolean;
  caveat: string | null;
}

const DEFAULT_REL = "state/shared/quoting/jm-sold-orders.json";
const WALK_UP_DEPTH = 8;

// Confidence ordering — higher rank = more trustworthy. Pure ordinal map (no price values).
const CONFIDENCE_RANK: Record<OrderConfidence, number> = { none: 0, low: 1, medium: 2, high: 3 };

function emptyByConfidence(): Record<OrderConfidence, number> {
  return { high: 0, medium: 0, low: 0, none: 0 };
}

function emptyResult(path: string | null): SoldOrderLoadResult {
  return {
    ok: false,
    path,
    schemaVersion: null,
    source: null,
    advisoryOnly: false,
    mustHumanVerify: false,
    caveat: null,
    ordersProcessed: 0,
    ordersWithVerifiedLineItems: 0,
    confirmedExtRevenue: 0,
    byConfidence: emptyByConfidence(),
    records: [],
  };
}

function normalizeConfidence(c: unknown): OrderConfidence {
  return c === "high" || c === "medium" || c === "low" || c === "none" ? c : "none";
}

/**
 * Quantile of a pre-sorted ascending numeric array via linear interpolation between order statistics.
 * `sorted` MUST be sorted ascending. `p` in [0,1]. Empty → 0 (caller gates n>0 before trusting).
 */
function quantileSorted(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (n === 1) return sorted[0];
  const idx = p * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/** Build a PriceDistribution from raw finite-positive observations, or null if none. */
function distributionOf(values: number[]): PriceDistribution | null {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0);
  if (clean.length === 0) return null;
  const sorted = clean.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  // Mass at the minimum value -- sorted ascending, so the minima are a contiguous
  // run at the front (stop at the first strictly-greater value). The OCR "$1"
  // floor-spike shows up here as a dominant minMassFrac (e.g. 0.51 in the real
  // high+medium ext_price corpus) even when the IQR stays wide.
  const minV = sorted[0];
  let minCount = 0;
  for (let i = 0; i < n && sorted[i] === minV; i++) minCount++;
  return {
    n,
    min: minV,
    minMassFrac: minCount / n,
    p5: quantileSorted(sorted, 0.05),
    p10: quantileSorted(sorted, 0.1),
    p25: quantileSorted(sorted, 0.25),
    median: quantileSorted(sorted, 0.5),
    p75: quantileSorted(sorted, 0.75),
    p90: quantileSorted(sorted, 0.9),
    p95: quantileSorted(sorted, 0.95),
    max: sorted[n - 1],
    mean: sum / n,
  };
}

/** Fraction of `sorted` (ascending) values ≤ x — empirical CDF via upper-bound binary search. */
function cdfAt(sorted: number[], x: number): number {
  if (sorted.length === 0) return 0;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo / sorted.length;
}

/** Two-sample Kolmogorov–Smirnov gap: max |F_a(x) − F_b(x)| over pooled support. 0 = identical, 1 = disjoint. */
function twoSampleKsGap(a: number[], b: number[]): number {
  const sa = a.filter((v) => Number.isFinite(v)).slice().sort((x, y) => x - y);
  const sb = b.filter((v) => Number.isFinite(v)).slice().sort((x, y) => x - y);
  if (sa.length === 0 || sb.length === 0) return 0;
  let maxGap = 0;
  for (const x of [...sa, ...sb]) {
    const g = Math.abs(cdfAt(sa, x) - cdfAt(sb, x));
    if (g > maxGap) maxGap = g;
  }
  return maxGap;
}

/** Raw per-piece unit-price observations passing the confidence floor (the reference sample for KS). */
function gatedUnitObs(records: SoldOrderRecord[], floor: number): number[] {
  const out: number[] = [];
  for (const rec of records) {
    if ((CONFIDENCE_RANK[rec.confidence] ?? 0) < floor) continue;
    for (const li of rec.line_items) {
      if (Number.isFinite(li.unit_price) && li.unit_price > 0) out.push(li.unit_price);
    }
  }
  return out;
}

/** Raw per-LINE ext_price observations (qty×unit_price) passing the confidence floor — the per-part-job grain. */
function gatedExtObs(records: SoldOrderRecord[], floor: number): number[] {
  const out: number[] = [];
  for (const rec of records) {
    if ((CONFIDENCE_RANK[rec.confidence] ?? 0) < floor) continue;
    for (const li of rec.line_items) {
      if (Number.isFinite(li.ext_price) && li.ext_price > 0) out.push(li.ext_price);
    }
  }
  return out;
}

/** Raw per-ORDER ext_total observations passing the confidence floor — the per-order grain. */
function gatedOrderObs(records: SoldOrderRecord[], floor: number): number[] {
  const out: number[] = [];
  for (const rec of records) {
    if ((CONFIDENCE_RANK[rec.confidence] ?? 0) < floor) continue;
    if (Number.isFinite(rec.order_ext_total) && rec.order_ext_total > 0) out.push(rec.order_ext_total);
  }
  return out;
}

/**
 * Reference-reliability assessment (ADVISORY honesty guard, U-QP-OUTBOUND-REF-RELIABILITY
 * + U-QP-OUTBOUND-FLOOR-SPIKE-GUARD). The outbound sold-order corpus is OCR-noisy, so a
 * confidence-gated reference can be (a) too SMALL to calibrate against, (b) a NARROW price
 * spike that collapses the inter-quartile span, or (c) a FLOOR-spike -- a dominant mass of
 * OCR "$1" rows pins the median to the noise floor while the real upper tail keeps the IQR
 * wide, so the (b) check misses it and `medianRatio`/`verdict` reflect noise, not a real
 * price distribution. This flags ALL THREE conditions; it NEVER drops observations
 * (conservative -- degeneracy is surfaced, not silently filtered, per the
 * non-conservative-filter refusal). `minReferenceN`, `maxConcentration`, and
 * `maxBottomSpikeFrac` are dimensionless SAMPLE-QUALITY bounds (NOT shop-rate / margin
 * constants), overridable by the caller.
 */
function assessReferenceReliability(
  reference: PriceDistribution | null,
  minReferenceN: number,
  maxConcentration: number,
  maxBottomSpikeFrac: number,
): {
  referenceReliable: boolean;
  reliabilityVerdict: "ok" | "insufficient-reference" | "degenerate-reference";
  reliabilityCaveat: string | null;
} {
  if (!reference) {
    return {
      referenceReliable: false,
      reliabilityVerdict: "insufficient-reference",
      reliabilityCaveat: "no real outbound observations at this confidence/grain",
    };
  }
  if (reference.n < minReferenceN) {
    return {
      referenceReliable: false,
      reliabilityVerdict: "insufficient-reference",
      reliabilityCaveat: `only ${reference.n} real observation(s) (< minReferenceN ${minReferenceN}); medianRatio/verdict are DIRECTIONAL, not calibrated`,
    };
  }
  if (!(reference.median > 0)) {
    return {
      referenceReliable: false,
      reliabilityVerdict: "degenerate-reference",
      reliabilityCaveat: "non-positive reference median; distribution unusable for ratio calibration",
    };
  }
  // A near-zero inter-quartile span relative to the median means the distribution is a spike at one
  // value (the OCR "$1" signature) — comparing a broad predicted set to it is unreliable.
  const iqrSpread = (reference.p75 - reference.p25) / reference.median;
  if (iqrSpread < maxConcentration) {
    return {
      referenceReliable: false,
      reliabilityVerdict: "degenerate-reference",
      reliabilityCaveat: `reference IQR collapsed (p25≈p75≈median≈${reference.median}); distribution is a price spike — medianRatio/verdict are DIRECTIONAL, not calibrated`,
    };
  }
  // Floor-spike guard (U-QP-OUTBOUND-FLOOR-SPIKE-GUARD) -- the IQR-collapse check
  // above only catches a NARROW distribution. A dominant mass at the MINIMUM value
  // (the OCR "$1" signature) pins the median to the noise floor while the real upper
  // tail keeps the IQR wide, so that check misses it and the reference reads falsely
  // reliable (the iter7 high+medium ext median ~1.005 with a 51% $1 mass). Pure sample
  // stats: mass fraction at the min + median-pinned-to-floor; NEITHER is a price
  // magnitude (charlie soul refuse: no shop-rate/margin constant). NEVER drops an
  // observation -- degeneracy is surfaced, not silently filtered.
  const medianPinnedToFloor = reference.median <= reference.min * (1 + maxConcentration);
  if (reference.minMassFrac >= maxBottomSpikeFrac && medianPinnedToFloor) {
    return {
      referenceReliable: false,
      reliabilityVerdict: "degenerate-reference",
      reliabilityCaveat:
        `reference floor-spike: ${(reference.minMassFrac * 100).toFixed(0)}% of observations at the minimum value ${reference.min} pin the median (${reference.median}) to the noise floor while the upper tail spreads to p95 ${reference.p95} (OCR "$1" mass the IQR-collapse guard misses); medianRatio/verdict are DIRECTIONAL, not calibrated`,
    };
  }
  return { referenceReliable: true, reliabilityVerdict: "ok", reliabilityCaveat: null };
}

/** Best-effort resolution of the index file: walk up from cwd, then from this module's dir. */
function autoResolveIndexPath(): string | null {
  const roots: string[] = [];
  let d = process.cwd();
  for (let i = 0; i < WALK_UP_DEPTH; i++) {
    roots.push(d);
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  try {
    let m = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < WALK_UP_DEPTH; i++) {
      roots.push(m);
      const up = dirname(m);
      if (up === m) break;
      m = up;
    }
  } catch {
    /* import.meta unavailable in this runtime — cwd candidates suffice */
  }
  for (const r of roots) {
    const candidate = join(r, DEFAULT_REL);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export class OutboundPriceIndexEngine {
  private cache: { path: string; result: SoldOrderLoadResult } | null = null;

  /**
   * Load + cache the sold-order index. `indexPath` overrides auto-resolution (tests pass the real
   * path explicitly so they never depend on cwd). Fail-soft on missing/corrupt file.
   */
  load(indexPath?: string): SoldOrderLoadResult {
    const path = indexPath ?? autoResolveIndexPath();
    if (path && this.cache && this.cache.path === path) return this.cache.result;
    if (!path || !existsSync(path)) return emptyResult(path ?? null);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      return emptyResult(path);
    }
    const j = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
    const bc = j.byConfidence && typeof j.byConfidence === "object" ? j.byConfidence : {};
    const byConfidence: Record<OrderConfidence, number> = {
      high: Number(bc.high) || 0,
      medium: Number(bc.medium) || 0,
      low: Number(bc.low) || 0,
      none: Number(bc.none) || 0,
    };
    const records: SoldOrderRecord[] = [];
    if (Array.isArray(j.records)) {
      for (const r of j.records as any[]) {
        if (!r || typeof r !== "object") continue;
        const items: SoldOrderLineItem[] = [];
        if (Array.isArray(r.line_items)) {
          for (const li of r.line_items as any[]) {
            if (!li || typeof li !== "object") continue;
            items.push({
              qty: Number(li.qty) || 0,
              unit_price: Number(li.unit_price) || 0,
              ext_price: Number(li.ext_price) || 0,
            });
          }
        }
        records.push({
          file: typeof r.file === "string" ? r.file : undefined,
          po_number: typeof r.po_number === "string" ? r.po_number : null,
          quote_ref: typeof r.quote_ref === "string" ? r.quote_ref : null,
          line_items: items,
          order_ext_total: Number(r.order_ext_total) || 0,
          confidence: normalizeConfidence(r.confidence),
        });
      }
    }
    const result: SoldOrderLoadResult = {
      ok: true,
      path,
      schemaVersion: typeof j.schemaVersion === "string" ? j.schemaVersion : null,
      source: typeof j.source === "string" ? j.source : null,
      advisoryOnly: j.advisoryOnly === true,
      mustHumanVerify: j.mustHumanVerify === true,
      caveat: typeof j.caveat === "string" ? j.caveat : null,
      ordersProcessed: Number(j.ordersProcessed) || 0,
      ordersWithVerifiedLineItems: Number(j.ordersWithVerifiedLineItems) || 0,
      confirmedExtRevenue: Number(j.confirmedExtRevenue) || 0,
      byConfidence,
      records,
    };
    this.cache = { path, result };
    return result;
  }

  /**
   * Empirical distribution of REAL outbound prices, confidence-gated.
   *
   * `minConfidence` (default "medium") is the confidence FLOOR — only orders at this rank or higher
   * contribute observations. Default {high, medium}; "high" gives the cleanest verified-only subset;
   * "low"/"none" are accepted but STRONGLY discouraged (the source explicitly says low-confidence prices
   * must never reach a live quote — use them only for the broadest exploratory band).
   *
   * Returns two distributions:
   *  - `unitPrice` — per-PIECE prices (one obs per line-item = one pricing decision). This is the
   *    cross-part price spread, NOT a per-quote price for one specific part. SAFE uses: a quote
   *    outlier/sanity band (a per-piece quote far outside p5..p95 is suspect), an aggregate calibration
   *    target (the model's output price distribution over a representative basket should match this).
   *  - `orderTotal` — per-ORDER ext totals (one obs per order).
   *
   * Fail-soft: an unloadable index → ok:false with null distributions.
   */
  pricePrior(params: { minConfidence?: OrderConfidence; indexPath?: string } = {}): PricePriorResult {
    const minConfidence: OrderConfidence = params.minConfidence ?? "medium";
    const floor = CONFIDENCE_RANK[minConfidence] ?? CONFIDENCE_RANK.medium;
    const loaded = this.load(params.indexPath);
    const unitObs: number[] = [];
    const extObs: number[] = [];
    const orderObs: number[] = [];
    let includedOrders = 0;
    for (const rec of loaded.records) {
      if ((CONFIDENCE_RANK[rec.confidence] ?? 0) < floor) continue;
      includedOrders++;
      if (Number.isFinite(rec.order_ext_total) && rec.order_ext_total > 0) orderObs.push(rec.order_ext_total);
      for (const li of rec.line_items) {
        if (Number.isFinite(li.unit_price) && li.unit_price > 0) unitObs.push(li.unit_price);
        if (Number.isFinite(li.ext_price) && li.ext_price > 0) extObs.push(li.ext_price);
      }
    }
    return {
      ok: loaded.ok,
      path: loaded.path,
      minConfidence,
      ordersProcessed: loaded.ordersProcessed,
      recordsAvailable: loaded.records.length,
      includedOrders,
      advisoryOnly: loaded.advisoryOnly,
      caveat: loaded.caveat,
      byConfidence: loaded.byConfidence,
      confirmedExtRevenue: loaded.confirmedExtRevenue,
      unitPrice: distributionOf(unitObs),
      extPrice: distributionOf(extObs),
      orderTotal: distributionOf(orderObs),
    };
  }

  /**
   * Convenience: a per-piece price sanity band {p5, p95, median, n} at the given confidence floor,
   * or null when no observations clear the gate. For flagging a quote whose per-piece price is an
   * outlier vs JM's real sold-price history. NOT a per-part price — see `pricePrior()`.
   */
  sanityBand(
    params: { minConfidence?: OrderConfidence; indexPath?: string } = {},
  ): { p5: number; median: number; p95: number; n: number } | null {
    const prior = this.pricePrior(params);
    if (!prior.unitPrice) return null;
    const { p5, median, p95, n } = prior.unitPrice;
    return { p5, median, p95, n };
  }

  /** Index totals (orders processed, verified-line-item count, confirmed revenue, per-confidence counts). */
  getTotals(indexPath?: string): {
    ordersProcessed: number;
    ordersWithVerifiedLineItems: number;
    confirmedExtRevenue: number;
    byConfidence: Record<OrderConfidence, number>;
    path: string | null;
  } {
    const loaded = this.load(indexPath);
    return {
      ordersProcessed: loaded.ordersProcessed,
      ordersWithVerifiedLineItems: loaded.ordersWithVerifiedLineItems,
      confirmedExtRevenue: loaded.confirmedExtRevenue,
      byConfidence: loaded.byConfidence,
      path: loaded.path,
    };
  }

  /**
   * Compare a set of PREDICTED per-piece prices (e.g. the quoting model's output over a basket) to
   * JM's REAL outbound distribution — the loop-closing diagnostic answering "does our training output
   * match what JM actually charges?". Read-only, ADVISORY: returns alignment metrics + a verdict,
   * NEVER a quote and NEVER a calibration factor (a downstream consumer that acts on this must still
   * apply its own margin-floor gate). `alignTolerance` is a dimensionless diagnostic band (default
   * 0.15) — NOT a shop-rate/margin constant and NOT a quote-vs-actual reconciliation threshold.
   *
   * `against` selects the real-outbound GRAIN compared to: "unit" (per-piece unitPrice, DEFAULT),
   * "line" (per-line ext_price = qty×unit_price = one part on one order — the per-PART-JOB grain, e.g.
   * QuotingTrainingLoopEngine FMV predictions), or "order" (per-order orderTotal). The grain of
   * `predicted` MUST match `against` or the comparison is meaningless (the U-QP-TRAIN-PREDICTED-EXPOSE
   * units-mismatch trap — per-part-job FMV vs per-piece price).
   *
   * Defaults `minConfidence:"high"` — calibration should reference the cleanest verified subset (all
   * high-confidence orders are persisted in full; see the header-vs-persisted note above).
   *
   * NOTE: `verdict` is MEDIAN-ANCHORED (medianRatio vs alignTolerance). `ksGap` (shape) and
   * `withinBandPct` (coverage) are reported but do NOT gate the verdict — a same-median, different-shape
   * prediction can read `aligned` with a high `ksGap`. A consumer judging full distribution match (not
   * just central tendency) must inspect `ksGap`/`withinBandPct` too, not `verdict` alone.
   */
  compareToPredicted(
    predicted: number[],
    params: { minConfidence?: OrderConfidence; against?: "unit" | "line" | "order"; alignTolerance?: number; minReferenceN?: number; maxConcentration?: number; maxBottomSpikeFrac?: number; indexPath?: string } = {},
  ): PriceMatchResult {
    const minConfidence: OrderConfidence = params.minConfidence ?? "high";
    const against: "unit" | "line" | "order" = params.against ?? "unit";
    const alignTolerance =
      typeof params.alignTolerance === "number" && params.alignTolerance > 0 ? params.alignTolerance : 0.15;
    const minReferenceN =
      typeof params.minReferenceN === "number" && params.minReferenceN > 0 ? Math.floor(params.minReferenceN) : 30;
    const maxConcentration =
      typeof params.maxConcentration === "number" && params.maxConcentration > 0 ? params.maxConcentration : 0.02;
    // Floor-spike bound: a reference where >= this fraction of observations sit at the
    // minimum value (and the median is pinned to that floor) is an OCR "$1" spike, not a
    // usable price distribution. Dimensionless sample-quality bound (default 0.25),
    // overridable -- NOT a price/margin constant.
    const maxBottomSpikeFrac =
      typeof params.maxBottomSpikeFrac === "number" && params.maxBottomSpikeFrac > 0 ? params.maxBottomSpikeFrac : 0.25;
    const floor = CONFIDENCE_RANK[minConfidence] ?? CONFIDENCE_RANK.high;
    const loaded = this.load(params.indexPath);
    const refObs =
      against === "line" ? gatedExtObs(loaded.records, floor)
      : against === "order" ? gatedOrderObs(loaded.records, floor)
      : gatedUnitObs(loaded.records, floor);
    const reference = distributionOf(refObs);
    const predClean = (Array.isArray(predicted) ? predicted : []).filter((v) => Number.isFinite(v) && v > 0);
    const predictedDist = distributionOf(predClean);
    const reliability = assessReferenceReliability(reference, minReferenceN, maxConcentration, maxBottomSpikeFrac);
    const base = {
      minConfidence,
      against,
      alignTolerance,
      predicted: predictedDist,
      reference,
      ...reliability,
      advisoryOnly: loaded.advisoryOnly,
      caveat: loaded.caveat,
    };
    if (!reference || !predictedDist) {
      return { ok: false, ...base, medianRatio: null, withinBandPct: null, ksGap: null, verdict: "insufficient-data" };
    }
    const medianRatio = reference.median > 0 ? predictedDist.median / reference.median : null;
    const within = predClean.filter((v) => v >= reference.p5 && v <= reference.p95).length;
    const withinBandPct = predClean.length > 0 ? within / predClean.length : null;
    const ksGap = twoSampleKsGap(predClean, refObs);
    let verdict: PriceMatchResult["verdict"] = "aligned";
    if (medianRatio === null) verdict = "insufficient-data";
    else if (medianRatio > 1 + alignTolerance) verdict = "predicted-high";
    else if (medianRatio < 1 - alignTolerance) verdict = "predicted-low";
    return { ok: true, ...base, medianRatio, withinBandPct, ksGap, verdict };
  }
}

export const outboundPriceIndexEngine = new OutboundPriceIndexEngine();
