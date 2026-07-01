/**
 * Tests for JMDieFinancialBaselineEngine — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM03.
 */
import { describe, it, expect } from "vitest";
import { JMDieFinancialBaselineEngine, type BaselineRecord } from "../engines/JMDieFinancialBaselineEngine.js";

const eng = new JMDieFinancialBaselineEngine();

const SAMPLE: BaselineRecord[] = [
  { customer: "AAFAS", part_id: "1490", doc_date: "2020-11-04", size_bytes: 50_000, estimated_revenue_usd: 1200, material: "steel_a36", material_spend_usd: 350 },
  { customer: "AAFAS", part_id: "1491", doc_date: "2021-03-12", size_bytes: 75_000, estimated_revenue_usd: 1800, material: "steel_a36", material_spend_usd: 480 },
  { customer: "ALCOA", part_id: "9000", doc_date: "2022-03-15", size_bytes: 120_000, estimated_revenue_usd: 4500, material: "aluminum_6061", material_spend_usd: 1100 },
  { customer: "ITW", part_id: "778", doc_date: "2020-06-22", size_bytes: 32_000, estimated_revenue_usd: 850, material: "stainless_304", material_spend_usd: 290 },
  { customer: "ITW", part_id: "778", doc_date: "2023-08-09", size_bytes: 41_000, estimated_revenue_usd: 1050, material: "stainless_304", material_spend_usd: 360 },
];

describe("JMDieFinancialBaselineEngine.aggregate — happy path", () => {
  it("aggregates 5 records → total_records=5, total_revenue summed", () => {
    const r = eng.aggregate(SAMPLE);
    expect(r.ok).toBe(true);
    expect(r.total_records).toBe(5);
    expect(r.total_revenue_usd).toBeCloseTo(1200 + 1800 + 4500 + 850 + 1050, 2);
  });

  it("by_customer sorted by revenue descending", () => {
    const r = eng.aggregate(SAMPLE);
    expect(r.by_customer[0].customer).toBe("ALCOA"); // $4500
    expect(r.by_customer[1].customer).toBe("AAFAS"); // $3000
    expect(r.by_customer[2].customer).toBe("ITW");   // $1900
  });

  it("by_customer per-customer first_date and last_date span", () => {
    const r = eng.aggregate(SAMPLE);
    const itw = r.by_customer.find((c) => c.customer === "ITW");
    expect(itw?.first_date).toBe("2020-06-22");
    expect(itw?.last_date).toBe("2023-08-09");
  });

  it("by_material sorted by spend descending", () => {
    const r = eng.aggregate(SAMPLE);
    expect(r.by_material[0].material).toBe("aluminum_6061"); // $1100
    expect(r.by_material[1].material).toBe("steel_a36");     // $830
    expect(r.by_material[2].material).toBe("stainless_304"); // $650
  });

  it("by_year rolled up + sorted ascending", () => {
    const r = eng.aggregate(SAMPLE);
    expect(r.by_year.map((y) => y.year)).toEqual(["2020", "2021", "2022", "2023"]);
    expect(r.by_year[0].doc_count).toBe(2); // AAFAS + ITW in 2020
  });

  it("time_span spans first and last dates correctly", () => {
    const r = eng.aggregate(SAMPLE);
    expect(r.time_span.first_date).toBe("2020-06-22");
    expect(r.time_span.last_date).toBe("2023-08-09");
    expect(r.time_span.span_days).toBeGreaterThan(1100); // ~3 years
  });
});

describe("JMDieFinancialBaselineEngine.aggregate — failure modes (R12 fail-loud)", () => {
  it("empty records → ok=false reason=no-records", () => {
    const r = eng.aggregate([]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-records");
    expect(r.total_records).toBe(0);
  });

  it("non-array input → ok=false (R12)", () => {
    // @ts-expect-error testing runtime guard
    const r = eng.aggregate(null);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-records");
  });

  it("records with missing customer are silently skipped (warning surfaced via doc count)", () => {
    const r = eng.aggregate([
      ...SAMPLE,
      { customer: "", part_id: "X", doc_date: "2024-01-01", size_bytes: 1000 },
    ]);
    expect(r.total_records).toBe(6);          // counts the bad record in input total
    expect(r.by_customer.length).toBe(3);      // but only 3 valid customers aggregated
  });
});

describe("JMDieFinancialBaselineEngine.aggregate — fallback heuristics", () => {
  it("missing estimated_revenue_usd → uses size_bytes × DEFAULT_REVENUE_PER_BYTE heuristic", () => {
    const r = eng.aggregate([
      { customer: "X", part_id: "1", doc_date: "2022-01-01", size_bytes: 100_000 },
    ]);
    expect(r.total_revenue_usd).toBe(10); // 100K bytes × $0.0001 = $10
  });

  it("missing material_spend_usd → defaults to 30% of revenue", () => {
    const r = eng.aggregate([
      { customer: "X", part_id: "1", doc_date: "2022-01-01", size_bytes: 100_000, estimated_revenue_usd: 1000, material: "steel_a36" },
    ]);
    expect(r.by_material[0].total_spend_usd).toBe(300); // 30% of $1000
  });

  it("records with null doc_date excluded from time_span + by_year", () => {
    const r = eng.aggregate([
      { customer: "X", part_id: "1", doc_date: null, size_bytes: 1000, estimated_revenue_usd: 100 },
    ]);
    expect(r.by_year.length).toBe(0);
    expect(r.time_span.first_date).toBeNull();
  });
});

describe("JMDieFinancialBaselineEngine.aggregate — adversarial inputs", () => {
  it("100 records of mixed customers/dates aggregate correctly", () => {
    const big: BaselineRecord[] = [];
    for (let i = 0; i < 100; i++) {
      big.push({
        customer: `C${i % 10}`,
        part_id: `P${i}`,
        doc_date: `202${i % 5}-0${(i % 9) + 1}-15`,
        size_bytes: 10_000 + i * 100,
        estimated_revenue_usd: 100 + i,
      });
    }
    const r = eng.aggregate(big);
    expect(r.total_records).toBe(100);
    expect(r.by_customer.length).toBe(10);   // 10 unique customers
    expect(r.by_year.length).toBe(5);        // 5 unique years
  });
});
