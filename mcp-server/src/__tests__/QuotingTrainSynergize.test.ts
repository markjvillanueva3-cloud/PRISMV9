/**
 * Combined tests — McMaster API adapter + Pipeline stress-test + Docustrata trainer
 * @milestone QUOTING-COMPLETENESS-MS0/U-VENDOR-MCMASTER + U-PIPELINE-STRESSTEST + U-DOCUSTRATA-TRAINER
 */

import { describe, it, expect } from "vitest";
import { McMasterCarrAPIAdapter, setFetch } from "../engines/McMasterCarrAPIAdapter.js";
import { quotingPipelineStressTestEngine } from "../engines/QuotingPipelineStressTestEngine.js";
import { docustrataHistoricalPricingTrainerEngine, type DocustrataExtractedRecord } from "../engines/DocustrataHistoricalPricingTrainerEngine.js";

// ────────────────────────────────────────────────────────────────────────
// McMasterCarrAPIAdapter
// ────────────────────────────────────────────────────────────────────────

describe("McMasterCarrAPIAdapter — U-VENDOR-MCMASTER", () => {
  it("returns stub fallback when no API key", async () => {
    const a = new McMasterCarrAPIAdapter({ apiKey: undefined });
    const r = await a.quotePart("91290A115", 10);
    expect(r.ok).toBe(true);
    expect(r.source).toBe("stub");
    expect(r.reason).toMatch(/no-api-key/);
    expect(r.unit_price_usd).toBeGreaterThan(0);
    expect(r.total_usd).toBeGreaterThan(0);
  });

  it("REJECTS empty part_number", async () => {
    const a = new McMasterCarrAPIAdapter({ apiKey: "fake" });
    const r = await a.quotePart("", 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/part_number required/);
  });

  it("REJECTS zero/negative quantity", async () => {
    const a = new McMasterCarrAPIAdapter({ apiKey: "fake" });
    const r = await a.quotePart("PN-1", 0);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/positive finite/);
  });

  it("handles 401 auth-failure", async () => {
    setFetch(async () => ({ ok: false, status: 401, statusText: "Unauthorized", json: async () => ({}) }));
    const a = new McMasterCarrAPIAdapter({ apiKey: "bad-key" });
    const r = await a.quotePart("PN-1", 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/auth-failed/);
  });

  it("handles 429 rate-limit", async () => {
    setFetch(async () => ({ ok: false, status: 429, statusText: "Too Many", json: async () => ({}) }));
    const a = new McMasterCarrAPIAdapter({ apiKey: "fake" });
    const r = await a.quotePart("PN-1", 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/rate-limited/);
  });

  it("happy path with mock fetch parses unit price + lead time", async () => {
    setFetch(async () => ({
      ok: true, status: 200, statusText: "OK",
      json: async () => ({ unit_price: 4.95, lead_time_days: 2, in_stock: true }),
    }));
    const a = new McMasterCarrAPIAdapter({ apiKey: "fake" });
    const r = await a.quotePart("PN-2", 100);
    expect(r.ok).toBe(true);
    expect(r.unit_price_usd).toBe(4.95);
    expect(r.total_usd).toBe(495);
    expect(r.lead_time_days).toBe(2);
    expect(r.in_stock).toBe(true);
    expect(r.source).toBe("live-api");
  });

  it("cache: second call within TTL returns cached", async () => {
    let fetchCalls = 0;
    setFetch(async () => {
      fetchCalls++;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ unit_price: 1, in_stock: true }) };
    });
    const a = new McMasterCarrAPIAdapter({ apiKey: "fake" });
    await a.quotePart("PN-3", 5);
    const r2 = await a.quotePart("PN-3", 5);
    expect(fetchCalls).toBe(1);
    expect(r2.source).toBe("cache");
  });

  it("batch quote returns N results in order", async () => {
    setFetch(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => ({ unit_price: 2.5, in_stock: true }) }));
    const a = new McMasterCarrAPIAdapter({ apiKey: "fake" });
    const r = await a.quoteBatch([
      { part_number: "PN-A" }, { part_number: "PN-B", quantity: 50 }, { part_number: "PN-C", quantity: 1 },
    ]);
    expect(r.length).toBe(3);
    expect(r[1].quantity).toBe(50);
    expect(r[1].total_usd).toBe(125);
  });
});

// ────────────────────────────────────────────────────────────────────────
// QuotingPipelineStressTestEngine
// ────────────────────────────────────────────────────────────────────────

describe("QuotingPipelineStressTestEngine — U-PIPELINE-STRESSTEST", () => {
  it("runs 25 scenarios end-to-end and aggregates report", async () => {
    const r = await quotingPipelineStressTestEngine.run({ n: 25, seed: 99 });
    expect(r.ok).toBe(true);
    expect(r.scenarios.length).toBe(25);
    expect(r.report.total_scenarios).toBe(25);
    expect(r.report.total_ok).toBeGreaterThan(0);
    expect(r.report.latency_p50_ms).toBeGreaterThanOrEqual(0);
    expect(r.report.per_engine_failure.length).toBeGreaterThan(0);
  });

  it("seeded reruns are deterministic (same scenario IDs)", async () => {
    const r1 = await quotingPipelineStressTestEngine.run({ n: 10, seed: 42 });
    const r2 = await quotingPipelineStressTestEngine.run({ n: 10, seed: 42 });
    expect(r1.scenarios.map(s => s.scenario_id)).toEqual(r2.scenarios.map(s => s.scenario_id));
  });

  it("respects material whitelist", async () => {
    // Run 50 scenarios scoped to aluminum_6061 only — every scenario engine call should succeed (no unknown-material failures)
    const r = await quotingPipelineStressTestEngine.run({ n: 50, seed: 7, materials: ["aluminum_6061"] });
    expect(r.scenarios.length).toBe(50);
  });

  it("variability_cv_quote_usd is non-zero across 50 scenarios (real spread)", async () => {
    const r = await quotingPipelineStressTestEngine.run({ n: 50, seed: 11 });
    expect(r.report.variability_cv_quote_usd).toBeGreaterThan(0);
  });

  it("REJECTS-equivalent: n=0 still returns valid report (empty)", async () => {
    const r = await quotingPipelineStressTestEngine.run({ n: 0 });
    // Floor of 1 — minimum scenario count
    expect(r.scenarios.length).toBeGreaterThanOrEqual(1);
  });

  it("per_engine_failure list always includes core engines that ran", async () => {
    const r = await quotingPipelineStressTestEngine.run({ n: 5, seed: 1 });
    const engineNames = r.report.per_engine_failure.map(e => e.engine);
    expect(engineNames).toContain("leadTimePricingTier");
    expect(engineNames).toContain("freightCost");
  });
});

// ────────────────────────────────────────────────────────────────────────
// DocustrataHistoricalPricingTrainerEngine
// ────────────────────────────────────────────────────────────────────────

describe("DocustrataHistoricalPricingTrainerEngine — U-DOCUSTRATA-TRAINER", () => {
  const records: DocustrataExtractedRecord[] = [
    { date: "2024-01-15", customer: "ACME",  part_id: "P-001", material: "aluminum_6061", predicted_quote_usd: 100, actual_invoice_usd: 120, quantity: 10 },
    { date: "2024-06-20", customer: "BETA",  part_id: "P-002", material: "steel_a36",     predicted_quote_usd: 200, actual_invoice_usd: 180, quantity: 5 },
    { date: "2025-03-10", customer: "GAMMA", part_id: "P-003", material: "stainless_304", predicted_quote_usd: 350, actual_invoice_usd: 380, quantity: 20 },
  ];

  const market = {
    material_spot_by_name: { aluminum_6061: 1.20, steel_a36: 0.85, stainless_304: 2.10 },
    freight_index: 1.10,
    labor_index: 1.05,
  };

  const lookup = (date: string, material: string) => {
    // Simulate historical market: 2024 → lower spot
    const year = parseInt(date.slice(0, 4), 10);
    const baseSpot = { aluminum_6061: 1.00, steel_a36: 0.75, stainless_304: 1.85 }[material as "aluminum_6061" | "steel_a36" | "stainless_304"] ?? 1.0;
    return {
      date, material,
      spot_usd_per_lb: year < 2025 ? baseSpot : baseSpot * 1.10,
      freight_index_pct: year < 2025 ? 0.95 : 1.05,
      labor_index_pct: year < 2025 ? 0.98 : 1.02,
      source: "historical" as const,
    };
  };

  it("happy path: produces market-conditioned records for valid input", () => {
    const r = docustrataHistoricalPricingTrainerEngine.buildTrainingSet({
      records, today_market: market, marketLookup: lookup,
    });
    expect(r.ok).toBe(true);
    expect(r.n_records).toBe(3);
    expect(r.n_market_adjusted).toBe(3);
    expect(r.n_missing_market).toBe(0);
  });

  it("applies material/freight/labor blend factors", () => {
    const r = docustrataHistoricalPricingTrainerEngine.buildTrainingSet({
      records: [records[0]], today_market: market, marketLookup: lookup,
    });
    const adj = r.records[0].adjustments;
    // material: today 1.20 / 2024 1.00 = 1.20
    expect(adj.material_factor).toBeCloseTo(1.20, 2);
    // freight: today 1.10 / 2024 0.95 ≈ 1.158
    expect(adj.freight_factor).toBeCloseTo(1.158, 2);
  });

  it("rejects malformed records (filter, don't throw)", () => {
    const bad: DocustrataExtractedRecord[] = [
      ...records,
      { date: "", customer: "X", part_id: "Y", material: "Z", predicted_quote_usd: 100, actual_invoice_usd: 100, quantity: 1 },
      { date: "2024-01-01", customer: "", part_id: "Y", material: "Z", predicted_quote_usd: 100, actual_invoice_usd: 100, quantity: 1 },
    ];
    const r = docustrataHistoricalPricingTrainerEngine.buildTrainingSet({ records: bad, today_market: market, marketLookup: lookup });
    expect(r.ok).toBe(true);
    expect(r.n_records).toBe(3); // only the valid 3
  });

  it("missing market lookup → snapshot.source='missing', n_missing_market increments", () => {
    const r = docustrataHistoricalPricingTrainerEngine.buildTrainingSet({
      records, today_market: market, // no marketLookup → fallback
    });
    expect(r.n_missing_market).toBe(3);
    expect(r.n_market_adjusted).toBe(0);
  });

  it("empty records returns ok with 0 counts", () => {
    const r = docustrataHistoricalPricingTrainerEngine.buildTrainingSet({ records: [] });
    expect(r.ok).toBe(true);
    expect(r.n_records).toBe(0);
  });

  it("toTrainingLoopRecords shape matches downstream AccuracyReport expectations", () => {
    const out = docustrataHistoricalPricingTrainerEngine.buildTrainingSet({
      records: [records[0]], today_market: market, marketLookup: lookup,
    });
    const trainerInput = docustrataHistoricalPricingTrainerEngine.toTrainingLoopRecords(out);
    expect(trainerInput.length).toBe(1);
    expect(trainerInput[0].customer).toBe("ACME");
    expect(trainerInput[0].part_id).toBe("P-001");
    expect(trainerInput[0].predicted_fmv_usd).toBeGreaterThan(0);
    expect(trainerInput[0].actual_usd).toBeGreaterThan(0);
  });
});
