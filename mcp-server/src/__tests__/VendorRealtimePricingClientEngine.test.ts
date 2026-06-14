/**
 * Tests for VendorRealtimePricingClientEngine — QUOTING-PIPELINE-MS0 / U-QP06.
 * Adapter-shape + cache-fallback + R12 unconfigured-failure invariants.
 */
import { describe, it, expect } from "vitest";
import { VendorRealtimePricingClientEngine } from "../engines/VendorRealtimePricingClientEngine.js";

const eng = new VendorRealtimePricingClientEngine();
const CACHE = {
  mcmaster: {
    "VACTRA-2": { unit_price_usd: 28.50, lead_time_days: 1, source: "csv" as const },
    "COOL-SYN-5G": { unit_price_usd: 75.00, lead_time_days: 2, source: "csv" as const },
  },
  "haas-oem": {
    "DRAWBAR-VF2": { unit_price_usd: 540.00, lead_time_days: 14, source: "csv" as const },
  },
  "edm-supplies": {
    "WIRE-BRASS-025-10KG": { unit_price_usd: 215.00, lead_time_days: 3, source: "csv" as const },
  },
};

describe("VendorRealtimePricingClientEngine.lookupPrice — happy path (cached)", () => {
  it("McMaster Vactra-2: returns unit_price=28.50 with source=csv", () => {
    const r = eng.lookupPrice({ adapter: "mcmaster", sku: "VACTRA-2", cachedPrices: CACHE });
    expect(r.found).toBe(true);
    expect(r.unit_price_usd).toBe(28.50);
    expect(r.source).toBe("csv");
    expect(r.quantity).toBe(1);
    expect(r.total_price_usd).toBe(28.50);
  });

  it("quantity scaling: 4 × $75 = $300", () => {
    const r = eng.lookupPrice({ adapter: "mcmaster", sku: "COOL-SYN-5G", quantity: 4, cachedPrices: CACHE });
    expect(r.total_price_usd).toBe(300.00);
  });

  it("Haas OEM drawbar: lead_time_days=14 preserved", () => {
    const r = eng.lookupPrice({ adapter: "haas-oem", sku: "DRAWBAR-VF2", cachedPrices: CACHE });
    expect(r.lead_time_days).toBe(14);
  });

  it("edm-supplies brass wire: 2-spool batch = $430", () => {
    const r = eng.lookupPrice({ adapter: "edm-supplies", sku: "WIRE-BRASS-025-10KG", quantity: 2, cachedPrices: CACHE });
    expect(r.total_price_usd).toBe(430.00);
  });
});

describe("VendorRealtimePricingClientEngine.lookupPrice — failure modes (R12 fail-loud)", () => {
  it("empty SKU → found=false reason=empty-or-missing-sku, no fabricated price", () => {
    const r = eng.lookupPrice({ adapter: "mcmaster", sku: "", cachedPrices: CACHE });
    expect(r.found).toBe(false);
    expect(r.unit_price_usd).toBeNull();
    expect(r.reason).toBe("empty-or-missing-sku");
  });

  it("unknown SKU + no env-var → found=false source=unconfigured with explicit reason", () => {
    const r = eng.lookupPrice({ adapter: "misumi", sku: "MISUMI-XYZ-001", cachedPrices: CACHE });
    expect(r.found).toBe(false);
    expect(r.source).toBe("unconfigured");
    expect(r.reason).toMatch(/no-api-key:MISUMI_API_KEY/);
  });

  it("missing input → found=false (no crash)", () => {
    // @ts-expect-error testing runtime guard
    const r = eng.lookupPrice(null);
    expect(r.found).toBe(false);
    expect(r.reason).toBe("empty-or-missing-sku");
  });

  it("unknown SKU on adapter with cachedPrices empty → unconfigured (NOT fabricated)", () => {
    const r = eng.lookupPrice({ adapter: "mcmaster", sku: "MCMASTER-MISSING-9999", cachedPrices: CACHE });
    expect(r.found).toBe(false);
    expect(r.unit_price_usd).toBeNull();
  });
});

describe("VendorRealtimePricingClientEngine.lookupPrice — adversarial", () => {
  it("quantity=0 → defaults to 1", () => {
    const r = eng.lookupPrice({ adapter: "mcmaster", sku: "VACTRA-2", quantity: 0, cachedPrices: CACHE });
    expect(r.quantity).toBe(1);
  });

  it("quantity=-5 → defaults to 1 (no negative-cost magic)", () => {
    const r = eng.lookupPrice({ adapter: "mcmaster", sku: "VACTRA-2", quantity: -5, cachedPrices: CACHE });
    expect(r.quantity).toBe(1);
    expect(r.total_price_usd).toBe(28.50);
  });

  it("quantity=NaN → defaults to 1 (R12: non-finite never poisons output)", () => {
    const r = eng.lookupPrice({ adapter: "mcmaster", sku: "VACTRA-2", quantity: NaN, cachedPrices: CACHE });
    expect(r.quantity).toBe(1);
  });
});

describe("VendorRealtimePricingClientEngine.lookupBatch — batch lookup", () => {
  it("returns one result per request, preserves order", () => {
    const results = eng.lookupBatch([
      { adapter: "mcmaster", sku: "VACTRA-2", cachedPrices: CACHE },
      { adapter: "mcmaster", sku: "COOL-SYN-5G", cachedPrices: CACHE },
      { adapter: "edm-supplies", sku: "WIRE-BRASS-025-10KG", cachedPrices: CACHE },
    ]);
    expect(results.length).toBe(3);
    expect(results[0].sku).toBe("VACTRA-2");
    expect(results[2].sku).toBe("WIRE-BRASS-025-10KG");
  });

  it("mixed found / unconfigured batch is honest about each", () => {
    const results = eng.lookupBatch([
      { adapter: "mcmaster", sku: "VACTRA-2", cachedPrices: CACHE },
      { adapter: "misumi", sku: "UNKNOWN", cachedPrices: CACHE },
    ]);
    expect(results[0].found).toBe(true);
    expect(results[1].found).toBe(false);
  });
});

describe("VendorRealtimePricingClientEngine — vendor adapter coverage (3 spanning families)", () => {
  it("OEM family (haas-oem) routes to HAAS_OEM_API_KEY env-var", () => {
    const r = eng.lookupPrice({ adapter: "haas-oem", sku: "UNKNOWN-OEM" });
    expect(r.reason).toMatch(/HAAS_OEM_API_KEY/);
  });

  it("Commercial distributor (mcmaster) routes to MCMASTER_API_KEY", () => {
    const r = eng.lookupPrice({ adapter: "mcmaster", sku: "UNKNOWN-MCM" });
    expect(r.reason).toMatch(/MCMASTER_API_KEY/);
  });

  it("EDM specialty (edm-supplies) routes to EDM_SUPPLIES_API_KEY", () => {
    const r = eng.lookupPrice({ adapter: "edm-supplies", sku: "UNKNOWN-EDM" });
    expect(r.reason).toMatch(/EDM_SUPPLIES_API_KEY/);
  });
});
