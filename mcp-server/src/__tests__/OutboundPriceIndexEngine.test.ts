/**
 * OutboundPriceIndexEngine — QUOTING-SYNERGY-MS0 / U-QP-OUTBOUND-PRICE-PRIOR (slot:charlie 2026-06-01)
 *
 * Verifies the outbound (what-JM-charges) price-distribution prior:
 *  - hermetic synthetic fixture with EXACT-quantile assertions (we control the numbers)
 *  - confidence gating actually changes the observation set (high ⊂ medium ⊂ low ⊂ none)
 *  - non-positive / non-finite unit prices are excluded
 *  - fail-soft on missing/corrupt index
 *  - real-corpus oracle (skip-safe) pinning the stable index totals + distribution invariants
 *  - dispatcher contract: enum membership + safeParse (valid/invalid) + engine round-trip
 *
 * Assertions are concrete-value (never presence-only): a null/absent result fails the concrete check.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  OutboundPriceIndexEngine,
  outboundPriceIndexEngine,
} from "../engines/OutboundPriceIndexEngine.js";
import { quotingActionEnum, QUOTING_ACTION_SCHEMAS } from "../schemas/quotingActionSchemas.js";
import { gateOutboundAlignment } from "../engines/QuotingClosedLoopEngine.js";

// ── Hermetic synthetic fixture ───────────────────────────────────────────────
// high unit prices [10, (0 excluded), 20, 30]; medium [40, 50]; low [1000]; none [9999].
// Single-line orders so order_ext_total === the line ext for clean per-order assertions.
const FIXTURE = {
  schemaVersion: "1.0.0",
  source: "synthetic-test-fixture",
  advisoryOnly: true,
  mustHumanVerify: true,
  caveat: "synthetic fixture caveat — never feed low-confidence prices into a live quote",
  ordersProcessed: 7,
  ordersWithVerifiedLineItems: 3,
  confirmedExtRevenue: 60,
  byConfidence: { high: 3, medium: 2, low: 1, none: 1 },
  records: [
    {
      file: "h1.pdf",
      po_number: "P1",
      quote_ref: null,
      // second line price 0 must be EXCLUDED by the positive filter; "abc"→NaN excluded too
      line_items: [
        { qty: 1, unit_price: 10, ext_price: 10 },
        { qty: 1, unit_price: 0, ext_price: 0 },
        { qty: 1, unit_price: "abc", ext_price: 0 },
      ],
      order_ext_total: 10,
      confidence: "high",
    },
    { file: "h2.pdf", po_number: "P2", quote_ref: null, line_items: [{ qty: 1, unit_price: 20, ext_price: 20 }], order_ext_total: 20, confidence: "high" },
    { file: "h3.pdf", po_number: "P3", quote_ref: null, line_items: [{ qty: 1, unit_price: 30, ext_price: 30 }], order_ext_total: 30, confidence: "high" },
    { file: "m1.pdf", po_number: null, quote_ref: "Date", line_items: [{ qty: 1, unit_price: 40, ext_price: 40 }], order_ext_total: 40, confidence: "medium" },
    { file: "m2.pdf", po_number: null, quote_ref: "Lead", line_items: [{ qty: 1, unit_price: 50, ext_price: 50 }], order_ext_total: 50, confidence: "medium" },
    { file: "l1.pdf", po_number: null, quote_ref: "OMG", line_items: [{ qty: 1, unit_price: 1000, ext_price: 1000 }], order_ext_total: 1000, confidence: "low" },
    { file: "n1.pdf", po_number: null, quote_ref: null, line_items: [{ qty: 1, unit_price: 9999, ext_price: 9999 }], order_ext_total: 9999, confidence: "none" },
  ],
};

let dir: string;
let fixturePath: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "outbound-price-idx-"));
  fixturePath = join(dir, "jm-sold-orders.json");
  writeFileSync(fixturePath, JSON.stringify(FIXTURE), "utf-8");
});

afterAll(() => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

describe("OutboundPriceIndexEngine — hermetic fixture", () => {
  it("default minConfidence is medium → includes high+medium, excludes low/none", () => {
    const eng = new OutboundPriceIndexEngine();
    const p = eng.pricePrior({ indexPath: fixturePath });
    expect(p.ok).toBe(true);
    expect(p.minConfidence).toBe("medium");
    expect(p.includedOrders).toBe(5); // 3 high + 2 medium
    expect(p.recordsAvailable).toBe(7); // all fixture records persisted (header === persisted here)
    expect(p.advisoryOnly).toBe(true); // surfaced from the source self-flag (R12 honesty)
    expect(p.caveat).toBe("synthetic fixture caveat — never feed low-confidence prices into a live quote");
    // unit prices [10,20,30,40,50] (the 0 and "abc" rows excluded) → concrete stats
    expect(p.unitPrice?.n).toBe(5);
    expect(p.unitPrice?.min).toBe(10);
    expect(p.unitPrice?.max).toBe(50);
    expect(p.unitPrice?.median).toBe(30);
    expect(p.unitPrice?.mean).toBe(30);
  });

  it("computes interpolated p5/p95 exactly", () => {
    const eng = new OutboundPriceIndexEngine();
    const p = eng.pricePrior({ indexPath: fixturePath });
    // sorted [10,20,30,40,50]: p5 = idx 0.2 → 10*0.8+20*0.2 = 12 ; p95 = idx 3.8 → 40*0.2+50*0.8 = 48
    expect(p.unitPrice?.p5).toBeCloseTo(12, 6);
    expect(p.unitPrice?.p95).toBeCloseTo(48, 6);
  });

  it("minConfidence=high narrows to verified-only subset", () => {
    const eng = new OutboundPriceIndexEngine();
    const p = eng.pricePrior({ indexPath: fixturePath, minConfidence: "high" });
    expect(p.includedOrders).toBe(3);
    expect(p.unitPrice?.n).toBe(3); // [10,20,30]
    expect(p.unitPrice?.median).toBe(20);
    expect(p.unitPrice?.max).toBe(30);
  });

  it("confidence gate is monotone: high ⊂ medium ⊂ low ⊂ none", () => {
    const eng = new OutboundPriceIndexEngine();
    const nHigh = eng.pricePrior({ indexPath: fixturePath, minConfidence: "high" }).unitPrice?.n ?? -1;
    const nMed = eng.pricePrior({ indexPath: fixturePath, minConfidence: "medium" }).unitPrice?.n ?? -1;
    const nLow = eng.pricePrior({ indexPath: fixturePath, minConfidence: "low" }).unitPrice?.n ?? -1;
    const nNone = eng.pricePrior({ indexPath: fixturePath, minConfidence: "none" }).unitPrice?.n ?? -1;
    expect(nHigh).toBe(3);
    expect(nMed).toBe(5);
    expect(nLow).toBe(6); // + the 1000 low row
    expect(nNone).toBe(7); // + the 9999 none row
    expect(nHigh).toBeLessThan(nMed);
    expect(nMed).toBeLessThan(nLow);
    expect(nLow).toBeLessThan(nNone);
  });

  it("order-total distribution is per-order (one obs per order)", () => {
    const eng = new OutboundPriceIndexEngine();
    const p = eng.pricePrior({ indexPath: fixturePath, minConfidence: "high" });
    expect(p.orderTotal?.n).toBe(3); // 3 high orders
    expect(p.orderTotal?.min).toBe(10);
    expect(p.orderTotal?.max).toBe(30);
  });

  it("sanityBand returns ordered p5/median/p95/n at the confidence floor", () => {
    const eng = new OutboundPriceIndexEngine();
    const band = eng.sanityBand({ indexPath: fixturePath, minConfidence: "high" });
    expect(band?.n).toBe(3);
    expect(band?.median).toBe(20);
    expect((band?.p5 ?? 0) <= (band?.median ?? 0)).toBe(true);
    expect((band?.median ?? 0) <= (band?.p95 ?? 0)).toBe(true);
  });

  it("getTotals surfaces the index header counts", () => {
    const eng = new OutboundPriceIndexEngine();
    const t = eng.getTotals(fixturePath);
    expect(t.ordersProcessed).toBe(7);
    expect(t.ordersWithVerifiedLineItems).toBe(3);
    expect(t.confirmedExtRevenue).toBe(60);
    expect(t.byConfidence.high).toBe(3);
    expect(t.byConfidence.none).toBe(1);
  });

  it("fail-soft on missing index (never throws; null distributions)", () => {
    const eng = new OutboundPriceIndexEngine();
    const p = eng.pricePrior({ indexPath: join(dir, "does-not-exist.json") });
    expect(p.ok).toBe(false);
    expect(p.includedOrders).toBe(0);
    expect(p.unitPrice).toBe(null);
    expect(p.orderTotal).toBe(null);
  });

  it("fail-soft on corrupt JSON (never throws; empty records)", () => {
    const bad = join(dir, "corrupt.json");
    writeFileSync(bad, "{ this is not json ", "utf-8");
    const eng = new OutboundPriceIndexEngine();
    const r = eng.load(bad);
    expect(r.ok).toBe(false);
    expect(r.records.length).toBe(0);
  });

  it("caches by path (second load returns the same object reference)", () => {
    const eng = new OutboundPriceIndexEngine();
    const a = eng.load(fixturePath);
    const b = eng.load(fixturePath);
    expect(a === b).toBe(true);
  });

  it("surfaces the header-vs-persisted gap honestly (R12): ordersProcessed=header, recordsAvailable=persisted", () => {
    // The real mined file persists a curated subset; header counts describe the full corpus.
    // A consumer must be able to distinguish the two. Header says 1000 processed; only 2 persisted.
    const truncated = join(dir, "truncated.json");
    writeFileSync(
      truncated,
      JSON.stringify({
        schemaVersion: "1.0.0",
        ordersProcessed: 1000,
        byConfidence: { high: 1, medium: 1, low: 600, none: 398 },
        records: [
          { po_number: "H", quote_ref: null, line_items: [{ qty: 1, unit_price: 100, ext_price: 100 }], order_ext_total: 100, confidence: "high" },
          { po_number: null, quote_ref: null, line_items: [{ qty: 1, unit_price: 200, ext_price: 200 }], order_ext_total: 200, confidence: "medium" },
        ],
      }),
      "utf-8",
    );
    const p = new OutboundPriceIndexEngine().pricePrior({ indexPath: truncated });
    expect(p.ordersProcessed).toBe(1000); // header full-corpus count
    expect(p.recordsAvailable).toBe(2); // persisted records the distribution is actually built from
    expect(p.includedOrders).toBe(2); // both persisted rows clear the medium floor
    expect(p.recordsAvailable).toBeLessThan(p.ordersProcessed); // the gap exists and is surfaced
    expect(p.unitPrice?.n).toBe(2); // distribution n reflects persisted, NOT the 1000 header
  });
});

// ── Real-corpus oracle (skip-safe) ───────────────────────────────────────────
// Pins the STABLE index header + distribution invariants against the live mined file. Skips cleanly
// when the file is absent (e.g. a fresh checkout) so CI never flakes on a missing data artifact.
describe("OutboundPriceIndexEngine — real JM sold-orders oracle", () => {
  const real = (() => {
    const eng = new OutboundPriceIndexEngine();
    // let the engine auto-resolve; only run assertions if it actually found the file
    const t = eng.getTotals();
    return t.path && existsSync(t.path) ? { eng, t } : null;
  })();

  it.skipIf(!real)("pins the mined index header counts", () => {
    expect(real!.t.ordersProcessed).toBe(12761);
    expect(real!.t.byConfidence.high).toBe(40);
    expect(real!.t.byConfidence.medium).toBe(4141);
    expect(real!.t.byConfidence.low).toBe(7247);
    expect(real!.t.byConfidence.none).toBe(1333);
    expect(real!.t.ordersWithVerifiedLineItems).toBe(240);
    expect(real!.t.confirmedExtRevenue).toBeCloseTo(47142.12, 2);
  });

  it.skipIf(!real)("default prior yields an ordered, positive per-piece distribution", () => {
    const p = real!.eng.pricePrior();
    expect(p.ok).toBe(true);
    const d = p.unitPrice;
    expect(d?.n ?? 0).toBeGreaterThan(0);
    expect(d?.min ?? 0).toBeGreaterThan(0);
    expect((d?.min ?? 0) <= (d?.p5 ?? 0)).toBe(true);
    expect((d?.p5 ?? 0) <= (d?.median ?? 0)).toBe(true);
    expect((d?.median ?? 0) <= (d?.p95 ?? 0)).toBe(true);
    expect((d?.p95 ?? 0) <= (d?.max ?? 0)).toBe(true);
  });

  it.skipIf(!real)("high-confidence subset is a strict subset of the medium-default set", () => {
    const high = real!.eng.pricePrior({ minConfidence: "high" });
    const med = real!.eng.pricePrior({ minConfidence: "medium" });
    expect(high.includedOrders).toBeLessThan(med.includedOrders);
    expect(high.unitPrice?.n ?? 0).toBeLessThanOrEqual(med.unitPrice?.n ?? 0);
  });

  it.skipIf(!real)("fail-on-revert: all 40 high-confidence orders are persisted + the header gap is surfaced", () => {
    const p = real!.eng.pricePrior({ minConfidence: "high" });
    // The mined file persists ALL high-confidence orders (byConfidence.high === 40). A re-truncation
    // that dropped any of them would break this pin (R12 regression guard).
    expect(p.includedOrders).toBe(40);
    // The curated-subset honesty invariant: far fewer records persisted than the full corpus processed.
    expect(p.recordsAvailable).toBeLessThan(p.ordersProcessed);
    expect(p.advisoryOnly).toBe(true); // the source self-flags advisory/OCR-noisy
  });

  it.skipIf(!real)("FLOOR-SPIKE FIX (live corpus): the real against:'line' ext reference is a degenerate floor-spike, not falsely reliable", () => {
    // Live high+medium ext_price: median ~1.005 with ~51% mass at the $1 OCR floor while p75/p90
    // spread to $200-$900 -> the OLD IQR-collapse guard read referenceReliable:TRUE (the documented
    // bug that kept the closed-loop OODA wire-in gated). The floor-spike guard now marks it
    // degenerate-reference so it can no longer FALSE-veto a real provenance-validated promotion.
    const m = real!.eng.compareToPredicted([200, 400, 600], { against: "line", minConfidence: "medium" });
    expect(m.ok).toBe(true);
    expect(m.reference?.median ?? 99).toBeLessThanOrEqual(2); // pinned to the $1 OCR floor (~1.005)
    expect(m.reference?.minMassFrac ?? 0).toBeGreaterThanOrEqual(0.25); // dominant $1 mass
    expect(m.referenceReliable).toBe(false);
    expect(m.reliabilityVerdict).toBe("degenerate-reference");
    expect(m.reliabilityCaveat).toContain("floor-spike");
  });
});

// ── compareToPredicted — distribution-match calibration diagnostic ───────────
// fixture high subset unit prices = [10,20,30] → median 20, p5=11, p95=29 (band [11,29]).
describe("OutboundPriceIndexEngine.compareToPredicted — distribution-match diagnostic", () => {
  it("identical predicted set → aligned, ksGap 0, medianRatio 1", () => {
    const eng = new OutboundPriceIndexEngine();
    const m = eng.compareToPredicted([10, 20, 30], { minConfidence: "high", indexPath: fixturePath });
    expect(m.ok).toBe(true);
    expect(m.verdict).toBe("aligned");
    expect(m.medianRatio).toBe(1);
    expect(m.ksGap).toBe(0);
    expect(m.withinBandPct).toBeCloseTo(1 / 3, 6); // band [11,29]: only 20 is inside
    expect(m.advisoryOnly).toBe(true); // inherited from the source self-flag
  });

  it("predicted far above JM's real prices → predicted-high, ksGap 1, withinBand 0", () => {
    const eng = new OutboundPriceIndexEngine();
    const m = eng.compareToPredicted([100, 200, 300], { minConfidence: "high", indexPath: fixturePath });
    expect(m.medianRatio).toBe(10); // 200 / 20
    expect(m.verdict).toBe("predicted-high");
    expect(m.withinBandPct).toBe(0);
    expect(m.ksGap).toBe(1); // disjoint support
  });

  it("predicted far below → predicted-low, ksGap 1", () => {
    const eng = new OutboundPriceIndexEngine();
    const m = eng.compareToPredicted([1, 2, 3], { minConfidence: "high", indexPath: fixturePath });
    expect(m.medianRatio).toBeCloseTo(0.1, 6); // 2 / 20
    expect(m.verdict).toBe("predicted-low");
    expect(m.ksGap).toBe(1);
  });

  it("alignTolerance widens the aligned band (overridable diagnostic, not a margin gate)", () => {
    const eng = new OutboundPriceIndexEngine();
    // predicted median 24 / ref 20 = 1.2 → predicted-high at default tol 0.15, aligned at tol 0.5
    const tight = eng.compareToPredicted([22, 24, 26], { minConfidence: "high", indexPath: fixturePath });
    expect(tight.medianRatio).toBeCloseTo(1.2, 6);
    expect(tight.verdict).toBe("predicted-high");
    const loose = eng.compareToPredicted([22, 24, 26], { minConfidence: "high", indexPath: fixturePath, alignTolerance: 0.5 });
    expect(loose.verdict).toBe("aligned");
  });

  it("empty predicted → insufficient-data, ok false, null metrics", () => {
    const eng = new OutboundPriceIndexEngine();
    const m = eng.compareToPredicted([], { minConfidence: "high", indexPath: fixturePath });
    expect(m.ok).toBe(false);
    expect(m.verdict).toBe("insufficient-data");
    expect(m.predicted).toBe(null);
    expect(m.medianRatio).toBe(null);
  });

  it("non-positive predicted values are excluded before comparison", () => {
    const eng = new OutboundPriceIndexEngine();
    // [-5, 0, 20] → only 20 survives → predicted median 20 === ref median 20 → aligned
    const m = eng.compareToPredicted([-5, 0, 20], { minConfidence: "high", indexPath: fixturePath });
    expect(m.predicted?.n).toBe(1);
    expect(m.medianRatio).toBe(1);
    expect(m.verdict).toBe("aligned");
  });

  it("reference distribution matches pricePrior().unitPrice (drift guard)", () => {
    const eng = new OutboundPriceIndexEngine();
    const m = eng.compareToPredicted([10, 20, 30], { minConfidence: "high", indexPath: fixturePath });
    const prior = eng.pricePrior({ minConfidence: "high", indexPath: fixturePath });
    expect(m.reference).toEqual(prior.unitPrice);
  });

  it("fail-soft on missing index → insufficient-data, null reference", () => {
    const eng = new OutboundPriceIndexEngine();
    const m = eng.compareToPredicted([10, 20, 30], { indexPath: join(dir, "nope-calib.json") });
    expect(m.ok).toBe(false);
    expect(m.reference).toBe(null);
    expect(m.verdict).toBe("insufficient-data");
  });
});

// ── extPrice distribution + `against` grain selector (U-QP-EXTPRICE-CALIB) ───
// qty>1 so ext_price (qty×unit_price) ≠ unit_price → the grains are distinguishable.
describe("OutboundPriceIndexEngine — extPrice distribution + `against` grain", () => {
  const EXT_FIXTURE = {
    schemaVersion: "1.0.0",
    advisoryOnly: true,
    caveat: "ext fixture",
    ordersProcessed: 2,
    ordersWithVerifiedLineItems: 2,
    confirmedExtRevenue: 150,
    byConfidence: { high: 2, medium: 0, low: 0, none: 0 },
    records: [
      { po_number: "E1", quote_ref: null, line_items: [{ qty: 10, unit_price: 5, ext_price: 50 }], order_ext_total: 50, confidence: "high" },
      { po_number: "E2", quote_ref: null, line_items: [{ qty: 4, unit_price: 25, ext_price: 100 }], order_ext_total: 100, confidence: "high" },
    ],
  };
  let extPath: string;
  beforeAll(() => {
    extPath = join(dir, "ext-fixture.json");
    writeFileSync(extPath, JSON.stringify(EXT_FIXTURE), "utf-8");
  });

  it("pricePrior exposes extPrice distinct from unitPrice (per-line vs per-piece)", () => {
    const p = new OutboundPriceIndexEngine().pricePrior({ indexPath: extPath, minConfidence: "high" });
    expect(p.unitPrice?.median).toBe(15); // per-piece [5,25]
    expect(p.extPrice?.median).toBe(75); // per-line ext [50,100]
    expect(p.extPrice?.n).toBe(2);
    expect(p.extPrice?.min).toBe(50);
    expect(p.extPrice?.max).toBe(100);
  });

  it("against:'line' compares to the per-line ext_price grain", () => {
    const m = new OutboundPriceIndexEngine().compareToPredicted([50, 75, 100], { indexPath: extPath, minConfidence: "high", against: "line" });
    expect(m.against).toBe("line");
    expect(m.medianRatio).toBe(1); // predicted median 75 === ext ref median 75
    expect(m.verdict).toBe("aligned");
    expect(m.reference?.median).toBe(75);
  });

  it("SAME predicted set, different `against` → different verdict (proves grain selection)", () => {
    const eng = new OutboundPriceIndexEngine();
    const line = eng.compareToPredicted([50, 75, 100], { indexPath: extPath, minConfidence: "high", against: "line" });
    const unit = eng.compareToPredicted([50, 75, 100], { indexPath: extPath, minConfidence: "high", against: "unit" });
    expect(line.medianRatio).toBe(1); // vs ext median 75
    expect(unit.medianRatio).toBe(5); // vs unit median 15 → 75/15
    expect(line.verdict).toBe("aligned");
    expect(unit.verdict).toBe("predicted-high");
  });

  it("against:'order' compares to the per-order orderTotal grain", () => {
    const m = new OutboundPriceIndexEngine().compareToPredicted([50, 75, 100], { indexPath: extPath, minConfidence: "high", against: "order" });
    expect(m.against).toBe("order");
    expect(m.reference?.median).toBe(75); // orderTotal [50,100] median 75
  });

  it("default against is 'unit' (backward compatible) — reference === pricePrior().unitPrice", () => {
    const eng = new OutboundPriceIndexEngine();
    const m = eng.compareToPredicted([5, 25], { indexPath: extPath, minConfidence: "high" });
    expect(m.against).toBe("unit");
    expect(m.reference).toEqual(eng.pricePrior({ indexPath: extPath, minConfidence: "high" }).unitPrice);
  });

  it("against:'line' reference === pricePrior().extPrice (drift guard for the ext grain)", () => {
    const eng = new OutboundPriceIndexEngine();
    const m = eng.compareToPredicted([50, 100], { indexPath: extPath, minConfidence: "high", against: "line" });
    expect(m.reference).toEqual(eng.pricePrior({ indexPath: extPath, minConfidence: "high" }).extPrice);
  });
});

// ── Dispatcher contract ──────────────────────────────────────────────────────
describe("OutboundPriceIndexEngine — prism_quoting dispatcher contract", () => {
  it("outbound_price_prior is a member of the quoting action enum", () => {
    const parsed = quotingActionEnum.safeParse("outbound_price_prior");
    expect(parsed.success).toBe(true);
  });

  it("schema accepts a valid minConfidence and an empty (all-optional) payload", () => {
    const schema = QUOTING_ACTION_SCHEMAS["outbound_price_prior"];
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ minConfidence: "high" }).success).toBe(true);
  });

  it("schema rejects an out-of-enum minConfidence", () => {
    const schema = QUOTING_ACTION_SCHEMAS["outbound_price_prior"];
    const bad = schema.safeParse({ minConfidence: "garbage" });
    expect(bad.success).toBe(false);
  });

  it("round-trip: parsed payload drives the singleton and returns a real distribution shape", () => {
    const schema = QUOTING_ACTION_SCHEMAS["outbound_price_prior"];
    const parsed = schema.safeParse({ minConfidence: "high", indexPath: fixturePath });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const out = outboundPriceIndexEngine.pricePrior(parsed.data);
    expect(out.ok).toBe(true);
    expect(out.minConfidence).toBe("high");
    expect(out.unitPrice?.n).toBe(3);
  });

  it("outbound_price_calibration is a registered action with a required predicted-array schema", () => {
    expect(quotingActionEnum.safeParse("outbound_price_calibration").success).toBe(true);
    const schema = QUOTING_ACTION_SCHEMAS["outbound_price_calibration"];
    expect(schema.safeParse({ predicted: [10, 20, 30] }).success).toBe(true);
    expect(schema.safeParse({ predicted: [1], alignTolerance: 0.3 }).success).toBe(true);
    expect(schema.safeParse({ predicted: [1], against: "line" }).success).toBe(true);
    expect(schema.safeParse({ predicted: [1], against: "bogus" }).success).toBe(false);
    expect(schema.safeParse({ predicted: "not-an-array" }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false); // predicted is required
  });

  it("WIRE (U-QP-OUTBOUND-FLOOR-SPIKE-GUARD P1): both outbound actions accept AND preserve maxBottomSpikeFrac through the dispatcher schema (no longer Zod-stripped)", () => {
    const calib = QUOTING_ACTION_SCHEMAS["outbound_price_calibration"];
    const calibParsed = calib.safeParse({ predicted: [300, 400], maxBottomSpikeFrac: 0.9 });
    expect(calibParsed.success).toBe(true);
    if (calibParsed.success) expect((calibParsed.data as { maxBottomSpikeFrac?: number }).maxBottomSpikeFrac).toBe(0.9);
    expect(calib.safeParse({ predicted: [1], maxBottomSpikeFrac: -1 }).success).toBe(false); // positive-only
    const promote = QUOTING_ACTION_SCHEMAS["outbound_promote_check"];
    const promoteParsed = promote.safeParse({ predicted: [300, 400], maxBottomSpikeFrac: 0.4 });
    expect(promoteParsed.success).toBe(true);
    if (promoteParsed.success) expect((promoteParsed.data as { maxBottomSpikeFrac?: number }).maxBottomSpikeFrac).toBe(0.4);
  });

  it("round-trip: calibration payload drives compareToPredicted", () => {
    const schema = QUOTING_ACTION_SCHEMAS["outbound_price_calibration"];
    const parsed = schema.safeParse({ predicted: [10, 20, 30], minConfidence: "high", indexPath: fixturePath });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const out = outboundPriceIndexEngine.compareToPredicted(parsed.data.predicted, parsed.data);
    expect(out.ok).toBe(true);
    expect(out.verdict).toBe("aligned");
  });
});

// ── Reference-reliability guard (U-QP-OUTBOUND-REF-RELIABILITY) ───────────────
// The advisory is honest about WHEN its medianRatio/verdict are trustworthy. The guard
// flags two failure modes WITHOUT dropping any observation (conservative): too-few real
// samples (insufficient-reference) and an IQR-collapsed price spike (degenerate-reference —
// the OCR "$1" signature that made the iter7 high-conf ext median ~$1.005 misleading).
describe("OutboundPriceIndexEngine — reference reliability guard", () => {
  let rdir: string;
  let degenPath: string;
  let bottomSpikePath: string;
  // FLOOR-spike (U-QP-OUTBOUND-FLOOR-SPIKE-GUARD): a dominant $1 OCR mass pins the median to the
  // noise floor (median = min = $1) while a real upper tail ($200..$1200) keeps the IQR WIDE -- so
  // the IQR-collapse guard does NOT fire. This is the real high+medium ext_price pathology
  // (median ~1.005, 51% mass at $1). 20 floor orders + 15 real-priced orders = 35 (>= default
  // minReferenceN 30); minMassFrac = 20/35 = 0.571.
  const BOTTOM_SPIKE_FIXTURE = (() => {
    type Rec = {
      file: string; po_number: string | null; quote_ref: string | null;
      line_items: { qty: number; unit_price: number; ext_price: number }[];
      order_ext_total: number; confidence: string;
    };
    const records: Rec[] = [];
    for (let i = 0; i < 20; i++) {
      records.push({ file: `f${i}.pdf`, po_number: `F${i}`, quote_ref: null, line_items: [{ qty: 1, unit_price: 1, ext_price: 1 }], order_ext_total: 1, confidence: "high" });
    }
    const spread = [200, 225, 250, 275, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200];
    spread.forEach((p, i) => records.push({ file: `u${i}.pdf`, po_number: `U${i}`, quote_ref: null, line_items: [{ qty: 1, unit_price: p, ext_price: p }], order_ext_total: p, confidence: "high" }));
    return {
      schemaVersion: "1.0.0",
      source: "synthetic-floor-spike",
      advisoryOnly: true,
      mustHumanVerify: true,
      caveat: "synthetic floor-spike (57% $1 mass, wide upper tail) fixture",
      ordersProcessed: records.length,
      ordersWithVerifiedLineItems: records.length,
      confirmedExtRevenue: records.reduce((s, r) => s + r.order_ext_total, 0),
      byConfidence: { high: records.length, medium: 0, low: 0, none: 0 },
      records,
    };
  })();
  // 4 high-confidence orders ALL at $1 → the gated reference is a spike: p25 = p75 = median = 1,
  // so (p75-p25)/median = 0 → degenerate. Mirrors the OCR "$1" mass in the real corpus.
  const DEGEN_FIXTURE = {
    schemaVersion: "1.0.0",
    source: "synthetic-degenerate-spike",
    advisoryOnly: true,
    mustHumanVerify: true,
    caveat: "synthetic degenerate ($1 OCR spike) fixture",
    ordersProcessed: 4,
    ordersWithVerifiedLineItems: 4,
    confirmedExtRevenue: 4,
    byConfidence: { high: 4, medium: 0, low: 0, none: 0 },
    records: [
      { file: "d1.pdf", po_number: "D1", quote_ref: null, line_items: [{ qty: 1, unit_price: 1, ext_price: 1 }], order_ext_total: 1, confidence: "high" },
      { file: "d2.pdf", po_number: "D2", quote_ref: null, line_items: [{ qty: 1, unit_price: 1, ext_price: 1 }], order_ext_total: 1, confidence: "high" },
      { file: "d3.pdf", po_number: "D3", quote_ref: null, line_items: [{ qty: 1, unit_price: 1, ext_price: 1 }], order_ext_total: 1, confidence: "high" },
      { file: "d4.pdf", po_number: "D4", quote_ref: null, line_items: [{ qty: 1, unit_price: 1, ext_price: 1 }], order_ext_total: 1, confidence: "high" },
    ],
  };

  beforeAll(() => {
    rdir = mkdtempSync(join(tmpdir(), "outbound-reliability-"));
    degenPath = join(rdir, "jm-sold-orders.json");
    writeFileSync(degenPath, JSON.stringify(DEGEN_FIXTURE), "utf-8");
    bottomSpikePath = join(rdir, "bottom-spike.json");
    writeFileSync(bottomSpikePath, JSON.stringify(BOTTOM_SPIKE_FIXTURE), "utf-8");
  });
  afterAll(() => {
    try {
      rmSync(rdir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  });

  it("flags insufficient-reference when the gated reference has fewer than minReferenceN obs (default 30) — and the verdict is UNCHANGED by the guard", () => {
    // FIXTURE high-confidence unit obs = [10,20,30] → n=3 < default 30.
    const r = outboundPriceIndexEngine.compareToPredicted([15, 25], { against: "unit", minConfidence: "high", indexPath: fixturePath });
    expect(r.ok).toBe(true);
    expect(r.reference?.n).toBe(3);
    expect(r.referenceReliable).toBe(false);
    expect(r.reliabilityVerdict).toBe("insufficient-reference");
    expect(r.reliabilityCaveat).toContain("minReferenceN");
    // predicted median 20 vs ref median 20 → ratio 1.0 → aligned; the guard does NOT touch verdict.
    expect(r.verdict).toBe("aligned");
  });

  it("returns reliabilityVerdict=ok + referenceReliable=true for a sufficient, well-spread reference", () => {
    // Same well-spread [10,20,30] reference but with minReferenceN lowered to 1 → passes min-n;
    // IQR/median = (25-15)/20 = 0.5 ≫ 0.02 → not degenerate.
    const r = outboundPriceIndexEngine.compareToPredicted([15, 25], { against: "unit", minConfidence: "high", minReferenceN: 1, indexPath: fixturePath });
    expect(r.ok).toBe(true);
    expect(r.referenceReliable).toBe(true);
    expect(r.reliabilityVerdict).toBe("ok");
    expect(r.reliabilityCaveat).toBeNull();
  });

  it("flags degenerate-reference when the reference is an IQR-collapsed price spike (OCR $1 signature)", () => {
    const r = outboundPriceIndexEngine.compareToPredicted([1, 1, 1], { against: "unit", minConfidence: "high", minReferenceN: 1, indexPath: degenPath });
    expect(r.ok).toBe(true);
    expect(r.reference?.n).toBe(4);
    expect(r.reference?.median).toBe(1);
    expect(r.referenceReliable).toBe(false);
    expect(r.reliabilityVerdict).toBe("degenerate-reference");
    expect(r.reliabilityCaveat).toContain("spike");
  });

  it("carries the COMPUTED reliability fields on the ok:false (no-predicted) branch too — both return paths, not just success", () => {
    // Empty predicted → ok:false / verdict insufficient-data, BUT the reference [10,20,30] still
    // exists (n=3) → with minReferenceN:1 it assesses reliable/ok. Proves the ok:false branch inherits
    // the real computed reliability (not a default), guarding a future refactor that might move the
    // `...reliability` spread below the null check.
    const r = outboundPriceIndexEngine.compareToPredicted([], { against: "unit", minConfidence: "high", minReferenceN: 1, indexPath: fixturePath });
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe("insufficient-data");
    expect(r.referenceReliable).toBe(true);
    expect(r.reliabilityVerdict).toBe("ok");
  });

  it("FLOOR-SPIKE FIX: flags degenerate-reference for a $1 mass that pins the median while the IQR stays WIDE (the case the IQR-collapse guard misses)", () => {
    // Reference is the floor-spike fixture (20x $1 + 15 real-priced); predicted at real magnitude.
    const r = outboundPriceIndexEngine.compareToPredicted([300, 400, 500], { against: "unit", minConfidence: "high", indexPath: bottomSpikePath });
    expect(r.ok).toBe(true);
    expect(r.reference?.n).toBe(35);
    expect(r.reference?.min).toBe(1);
    expect(r.reference?.median).toBe(1); // median pinned to the $1 noise floor
    expect(r.reference?.minMassFrac ?? 0).toBeCloseTo(20 / 35, 6); // ~57% mass at the minimum
    // Prove the IQR-collapse guard ALONE would miss it -- the IQR is genuinely WIDE:
    const iqrSpread = (r.reference!.p75 - r.reference!.p25) / r.reference!.median;
    expect(iqrSpread).toBeGreaterThan(0.02);
    // The NEW floor-spike guard catches it where the IQR guard cannot:
    expect(r.referenceReliable).toBe(false);
    expect(r.reliabilityVerdict).toBe("degenerate-reference");
    expect(r.reliabilityCaveat).toContain("floor-spike");
  });

  it("does NOT false-flag a well-spread reference whose minimum is a minority -- median is not pinned to the floor (small-n high minMassFrac is benign)", () => {
    // FIXTURE high obs [10,20,30]: minMassFrac = 1/3 >= default 0.25, BUT median 20 > min 10 -> not a floor-spike.
    const r = outboundPriceIndexEngine.compareToPredicted([15, 25], { against: "unit", minConfidence: "high", minReferenceN: 1, indexPath: fixturePath });
    expect(r.reference?.minMassFrac ?? 0).toBeCloseTo(1 / 3, 6);
    expect(r.referenceReliable).toBe(true);
    expect(r.reliabilityVerdict).toBe("ok");
  });

  it("maxBottomSpikeFrac override raises the floor-spike bound above the spike mass -> guard disabled (dimensionless knob, not a price constant)", () => {
    const r = outboundPriceIndexEngine.compareToPredicted([300, 400, 500], { against: "unit", minConfidence: "high", indexPath: bottomSpikePath, maxBottomSpikeFrac: 0.99 });
    // 0.99 bound > 0.571 mass -> floor-spike guard does NOT fire; IQR is wide -> falls through to ok.
    expect(r.referenceReliable).toBe(true);
    expect(r.reliabilityVerdict).toBe("ok");
  });

  it("E2E closed-loop: gateOutboundAlignment treats the floor-spike reference as unverified -- the false predicted-high VETO is gone (unblocks the OODA wire-in)", () => {
    const match = outboundPriceIndexEngine.compareToPredicted([300, 400, 500], { against: "unit", minConfidence: "high", indexPath: bottomSpikePath });
    expect(match.referenceReliable).toBe(false);
    const gate = gateOutboundAlignment(match);
    expect(gate.verdict).toBe("unverified");
    expect(gate.block).toBe(false); // a directional-only OCR-noise reference must NEVER veto a real improvement
  });
});
