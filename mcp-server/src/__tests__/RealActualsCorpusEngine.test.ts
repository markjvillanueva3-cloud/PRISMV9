/**
 * RealActualsCorpusEngine.test.ts -- QUOTING-OPTIMAL-MS0 / U1
 *
 * Reference values grounded in the measured orders-closed-actuals distribution
 * (quoting-actuals-outlier-probe): 217 below $5, 46 above $250k, realistic core
 * p25 $295 / p50 $624 / p75 $1,480. Tests assert the filter drops exactly the
 * artifact rows and keeps the realistic ones -- not a toBeDefined stub (R9).
 */
import { describe, it, expect } from "vitest";
import {
  realActualsCorpusEngine,
  RealActualsCorpusEngine,
  PRICE_FLOOR_USD,
  PRICE_CEIL_USD,
  MIN_EXTRACTION_CONFIDENCE,
  type RawActual,
} from "../engines/RealActualsCorpusEngine.js";

// A realistic mini-corpus mirroring the real OCR data's shape + noise classes.
function fixture(): RawActual[] {
  return [
    // -- realistic core (kept) --
    { customer: "FONTANA", part_id: "13644", date: "2025-08-05", actual_invoice_usd: 308.77, extraction_confidence: 0.95, actual_price_method: "labeled-total", order_number: "A1" },
    { customer: "AGRATI", part_id: "X-22", date: "2025-01-18", actual_invoice_usd: 975.13, extraction_confidence: 0.9, actual_price_method: "labeled-total", order_number: "A2" },
    { customer: "ELITE", part_id: "340-HWHPLG", date: "2017-09-27", actual_invoice_usd: 337.5, extraction_confidence: 0.98, actual_price_method: "labeled-total", order_number: "28568" },
    { customer: "AIR INDUSTRIES", part_id: "P-9", date: "2025-03-01", actual_invoice_usd: 1480, extraction_confidence: 0.8, actual_price_method: "labeled-total", order_number: "A3" },
    // -- OCR artifacts (rejected) --
    { customer: "OPTIMAS SOLUTIONS", part_id: "841-SM-11", actual_invoice_usd: 0.13, extraction_confidence: 0.9, actual_price_method: "max-dollar", order_number: "B1" }, // below floor
    { customer: "WRENTHAM TOOL", part_id: "630-6I6", actual_invoice_usd: 5_162_000, extraction_confidence: 0.85, actual_price_method: "max-dollar", order_number: "B2" }, // above ceil
    { customer: "LOWCONF", part_id: "Q-1", actual_invoice_usd: 500, extraction_confidence: 0.4, actual_price_method: "max-dollar", order_number: "B3" }, // low confidence
  ];
}

describe("RealActualsCorpusEngine.build -- happy path", () => {
  it("keeps the 4 realistic records and drops the 3 artifacts", () => {
    const r = realActualsCorpusEngine.build(fixture(), "test-src", { applyIqrFence: false });
    expect(r.ok).toBe(true);
    expect(r.total_input).toBe(7);
    expect(r.total_clean).toBe(4);
    expect(r.total_rejected).toBe(3);
    expect(r.reject_breakdown["price-below-floor"]).toBe(1);
    expect(r.reject_breakdown["price-above-ceil"]).toBe(1);
    expect(r.reject_breakdown["low-confidence"]).toBe(1);
    expect(r.distinct_customers).toBe(4);
  });

  it("computes correct price stats on the clean set", () => {
    const r = realActualsCorpusEngine.build(fixture(), "test-src", { applyIqrFence: false });
    // clean prices sorted: 308.77, 337.5, 975.13, 1480 -> median index 2 = 975.13
    expect(r.price_stats.min).toBe(308.77);
    expect(r.price_stats.max).toBe(1480);
    expect(r.price_stats.median).toBe(975.13);
    expect(r.price_stats.mean).toBeCloseTo((308.77 + 337.5 + 975.13 + 1480) / 4, 2);
  });

  it("emits records in the DocustrataExtractedRecord ACTUAL-side shape", () => {
    const r = realActualsCorpusEngine.build(fixture(), "test-src", { applyIqrFence: false });
    const rec = r.records.find((x) => x.part_id === "13644")!;
    expect(rec.actual_invoice_usd).toBe(308.77);
    expect(rec.predicted_quote_usd).toBe(0); // filled downstream by the real quote engine
    expect(rec.quantity).toBe(1);
    expect(rec.order_number).toBe("A1");
    expect(rec.price_method).toBe("labeled-total");
  });

  it("never stamps generated_iso in the pure core (Date.now banned)", () => {
    const r = realActualsCorpusEngine.build(fixture(), "test-src");
    expect(r.generated_iso).toBeNull();
    expect(r.schemaVersion).toBe("1.0.0");
  });
});

describe("RealActualsCorpusEngine.build -- failure modes", () => {
  it("returns ok:false on empty input (no fabrication, R12)", () => {
    const r = realActualsCorpusEngine.build([], "empty");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty-or-invalid-input");
    expect(r.records).toHaveLength(0);
  });

  it("returns ok:false on non-array input", () => {
    const r = realActualsCorpusEngine.build(null as unknown as RawActual[], "bad");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("empty-or-invalid-input");
  });

  it("returns ok:false when every record is rejected", () => {
    const allBad: RawActual[] = [
      { customer: "A", part_id: "1", actual_invoice_usd: 0.5, extraction_confidence: 0.9 },
      { customer: "B", part_id: "2", actual_invoice_usd: 1, extraction_confidence: 0.9 },
    ];
    const r = realActualsCorpusEngine.build(allBad, "allbad", { applyIqrFence: false });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("all-records-rejected");
    expect(r.reject_breakdown["price-below-floor"]).toBe(2);
  });

  it("rejects rows missing customer or part_id with the right reason", () => {
    const rows: RawActual[] = [
      { part_id: "1", actual_invoice_usd: 500, extraction_confidence: 0.9 }, // missing customer
      { customer: "C", actual_invoice_usd: 500, extraction_confidence: 0.9 }, // missing part
    ];
    const r = realActualsCorpusEngine.build(rows, "ids", { applyIqrFence: false });
    expect(r.reject_breakdown["missing-customer"]).toBe(1);
    expect(r.reject_breakdown["missing-part"]).toBe(1);
    expect(r.total_clean).toBe(0);
  });
});

describe("RealActualsCorpusEngine.build -- adversarial inputs", () => {
  it("rejects NaN / Infinity prices as non-numeric", () => {
    const rows: RawActual[] = [
      { customer: "A", part_id: "1", actual_invoice_usd: NaN, extraction_confidence: 0.9 },
      { customer: "B", part_id: "2", actual_invoice_usd: Infinity, extraction_confidence: 0.9 },
      { customer: "C", part_id: "3", actual_invoice_usd: undefined, extraction_confidence: 0.9 },
    ];
    const r = realActualsCorpusEngine.build(rows, "nan", { applyIqrFence: false });
    expect(r.reject_breakdown["non-numeric-price"]).toBe(3);
    expect(r.total_clean).toBe(0);
  });

  it("treats absent confidence as pass (real data has nullable confidence)", () => {
    const rows: RawActual[] = [
      { customer: "A", part_id: "1", actual_invoice_usd: 500 }, // no confidence field
    ];
    const r = realActualsCorpusEngine.build(rows, "noconf", { applyIqrFence: false });
    expect(r.total_clean).toBe(1);
    expect(r.records[0].extraction_confidence).toBe(1);
  });

  it("IQR fence drops an in-band outlier above the Tukey upper fence", () => {
    // 9 tight records around $500 + 1 in-band-but-extreme $200k (< $250k ceil, passes band)
    const rows: RawActual[] = [];
    for (let i = 0; i < 9; i++) rows.push({ customer: "T", part_id: `p${i}`, actual_invoice_usd: 500 + i, extraction_confidence: 0.9 });
    rows.push({ customer: "T", part_id: "spike", actual_invoice_usd: 200_000, extraction_confidence: 0.9 });
    const withFence = realActualsCorpusEngine.build(rows, "iqr", { applyIqrFence: true });
    const noFence = realActualsCorpusEngine.build(rows, "iqr", { applyIqrFence: false });
    expect(noFence.total_clean).toBe(10); // band alone keeps the $200k
    expect(withFence.reject_breakdown["iqr-outlier"]).toBe(1); // fence catches it
    expect(withFence.total_clean).toBe(9);
  });

  it("respects custom filter bounds via opts", () => {
    const rows: RawActual[] = [{ customer: "A", part_id: "1", actual_invoice_usd: 3, extraction_confidence: 0.9 }];
    const dropped = realActualsCorpusEngine.build(rows, "o", { applyIqrFence: false });
    const kept = realActualsCorpusEngine.build(rows, "o", { priceFloor: 1, applyIqrFence: false });
    expect(dropped.total_clean).toBe(0);
    expect(kept.total_clean).toBe(1);
  });
});

describe("RealActualsCorpusEngine -- exported constants are sane", () => {
  it("has the measured filter defaults", () => {
    expect(PRICE_FLOOR_USD).toBe(5);
    expect(PRICE_CEIL_USD).toBe(250_000);
    expect(MIN_EXTRACTION_CONFIDENCE).toBe(0.7);
  });
  it("is constructable as a fresh instance", () => {
    const e = new RealActualsCorpusEngine();
    const r = e.build(fixture(), "fresh", { applyIqrFence: false });
    expect(r.total_clean).toBe(4);
  });
});
