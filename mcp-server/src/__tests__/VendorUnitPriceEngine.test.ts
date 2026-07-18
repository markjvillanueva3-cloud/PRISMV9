/**
 * VendorUnitPriceEngine.test.ts -- QUOTING-VENDOR-LOC-MS0 / U-LVP02 (galaxy:quoting, slot:charlie)
 *
 * Reference-value tests (R9: pin intent, not a snapshot). Expected band bounds are derived
 * arithmetically from the policy constants in vendor-price-discovery-tiers.ts so a change to the
 * BUSINESS LOGIC (band width, region factor, tier mapping) breaks a test, while a benign refactor
 * does not. Covers happy path + 4 failure modes + 3 adversarial inputs + the LVP convenience method.
 */

import { describe, it, expect } from "vitest";
import { VendorUnitPriceEngine } from "../engines/VendorUnitPriceEngine.js";
import {
  PRICE_DISCOVERY_TIERS,
  REGION_SUPPLY_COST_FACTOR,
  resolveDiscoveryTier,
} from "../data/vendor-price-discovery-tiers.js";

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

describe("VendorUnitPriceEngine -- discovery tier resolution", () => {
  it("has_api:true resolves to the api tier regardless of pricing_access label", () => {
    expect(resolveDiscoveryTier("quote", true)).toBe("api");
    expect(resolveDiscoveryTier("unknown", true)).toBe("api");
    expect(resolveDiscoveryTier(undefined, true)).toBe("api");
  });

  it("pricing_access maps to its tier when has_api is false/absent", () => {
    expect(resolveDiscoveryTier("api", false)).toBe("api");
    expect(resolveDiscoveryTier("catalog", false)).toBe("catalog");
    expect(resolveDiscoveryTier("quote", false)).toBe("quote");
    expect(resolveDiscoveryTier("unknown", false)).toBe("unknown");
  });

  it("an unrecognized pricing_access falls CONSERVATIVELY to unknown (widest band), never tighter", () => {
    // soul: non-conservative filter forbidden -- a label we do not recognize must not get a tight band.
    expect(resolveDiscoveryTier("wholesale-net-30", false)).toBe("unknown");
    expect(resolveDiscoveryTier("", false)).toBe("unknown");
    const widest = PRICE_DISCOVERY_TIERS.unknown.bandHalfWidthFraction;
    for (const t of ["api", "catalog", "quote"] as const) {
      expect(PRICE_DISCOVERY_TIERS[t].bandHalfWidthFraction).toBeLessThanOrEqual(widest);
    }
  });
});

describe("VendorUnitPriceEngine.price -- happy path (reference values)", () => {
  it("catalog tier, US vendor (factor 1.0): +/-10% band around a $100 anchor", () => {
    const anchor = 100;
    const r = VendorUnitPriceEngine.price({
      anchor_unit_price_usd: anchor,
      pricing_access: "catalog",
      has_api: false,
      vendor_region: "US",
      quantity: 5,
    });
    expect(r.ok).toBe(true);
    const b = r.band!;
    expect(b.tier).toBe("catalog");
    expect(b.region_supply_factor).toBe(1.0);
    const half = PRICE_DISCOVERY_TIERS.catalog.bandHalfWidthFraction; // 0.10
    expect(b.unit_mid_usd).toBe(100); // anchor x 1.0 x (1+0)
    expect(b.unit_low_usd).toBe(r2(100 * (1 - half))); // 90
    expect(b.unit_high_usd).toBe(r2(100 * (1 + half))); // 110
    expect(b.lot_mid_usd).toBe(500); // 100 x 5
    expect(b.confidence).toBe(PRICE_DISCOVERY_TIERS.catalog.confidence); // 0.65
    expect(b.programmatic).toBe(false);
  });

  it("api tier shifts a CN vendor's midpoint down by the supply factor + tightest band", () => {
    const anchor = 200;
    const cnFactor = REGION_SUPPLY_COST_FACTOR.CN; // 0.75
    const r = VendorUnitPriceEngine.price({
      anchor_unit_price_usd: anchor,
      pricing_access: "api",
      has_api: true,
      vendor_region: "CN",
      quantity: 10,
    });
    const b = r.band!;
    expect(b.tier).toBe("api");
    expect(b.programmatic).toBe(true);
    expect(b.region_supply_factor).toBe(cnFactor);
    const expectedMid = r2(anchor * cnFactor); // 200 x 0.75 = 150
    expect(b.unit_mid_usd).toBe(expectedMid);
    const half = PRICE_DISCOVERY_TIERS.api.bandHalfWidthFraction; // 0.05
    expect(b.unit_low_usd).toBe(r2(anchor * cnFactor * (1 - half))); // 142.5
    expect(b.unit_high_usd).toBe(r2(anchor * cnFactor * (1 + half))); // 157.5
    expect(b.lot_mid_usd).toBe(r2(anchor * cnFactor * 10)); // 1500
  });

  it("quote tier returns a deliberately WIDE band (RFQ-only, low confidence)", () => {
    const r = VendorUnitPriceEngine.price({
      anchor_unit_price_usd: 100,
      pricing_access: "quote",
      vendor_region: "US",
    });
    const b = r.band!;
    expect(b.tier).toBe("quote");
    const half = PRICE_DISCOVERY_TIERS.quote.bandHalfWidthFraction; // 0.20
    expect(b.unit_low_usd).toBe(r2(100 * (1 - half))); // 80
    expect(b.unit_high_usd).toBe(r2(100 * (1 + half))); // 120
    expect(b.confidence).toBe(PRICE_DISCOVERY_TIERS.quote.confidence); // 0.40
    // wider than catalog, narrower than unknown -- monotonic in knowability.
    expect(half).toBeGreaterThan(PRICE_DISCOVERY_TIERS.catalog.bandHalfWidthFraction);
    expect(half).toBeLessThan(PRICE_DISCOVERY_TIERS.unknown.bandHalfWidthFraction);
  });

  it("ALGEBRAIC INVARIANT: low <= mid <= high and confidence falls as the band widens", () => {
    const tiers: Array<"api" | "catalog" | "quote" | "unknown"> = [
      "api",
      "catalog",
      "quote",
      "unknown",
    ];
    let prevHalf = -1;
    let prevConf = 2;
    for (const t of tiers) {
      const r = VendorUnitPriceEngine.price({
        anchor_unit_price_usd: 250,
        pricing_access: t,
        vendor_region: "US",
        quantity: 3,
      });
      const b = r.band!;
      expect(b.unit_low_usd).toBeLessThanOrEqual(b.unit_mid_usd);
      expect(b.unit_mid_usd).toBeLessThanOrEqual(b.unit_high_usd);
      // band widens monotonically across the tier order; confidence falls.
      const half = PRICE_DISCOVERY_TIERS[t].bandHalfWidthFraction;
      expect(half).toBeGreaterThan(prevHalf);
      expect(b.confidence).toBeLessThan(prevConf);
      prevHalf = half;
      prevConf = b.confidence;
    }
  });
});

describe("VendorUnitPriceEngine.price -- failure modes", () => {
  it("rejects a negative anchor price (invalid input -> ok:false, never a band)", () => {
    const r = VendorUnitPriceEngine.price({ anchor_unit_price_usd: -5 } as any);
    expect(r.ok).toBe(false);
    expect(r.band).toBeNull();
    expect(r.reason).toContain("anchor_unit_price_usd");
  });

  it("rejects a non-numeric anchor price", () => {
    const r = VendorUnitPriceEngine.price({ anchor_unit_price_usd: "free" } as any);
    expect(r.ok).toBe(false);
    expect(r.band).toBeNull();
  });

  it("rejects a zero/negative quantity", () => {
    const r = VendorUnitPriceEngine.price({
      anchor_unit_price_usd: 100,
      quantity: 0,
    } as any);
    expect(r.ok).toBe(false);
    expect(r.band).toBeNull();
  });

  it("rejects a fractional quantity (units are integer lots)", () => {
    const r = VendorUnitPriceEngine.price({
      anchor_unit_price_usd: 100,
      quantity: 2.5,
    } as any);
    expect(r.ok).toBe(false);
    expect(r.band).toBeNull();
  });
});

describe("VendorUnitPriceEngine.price -- adversarial inputs", () => {
  it("anchor 0 -> a degenerate but valid band (all bounds 0), never NaN", () => {
    const r = VendorUnitPriceEngine.price({
      anchor_unit_price_usd: 0,
      pricing_access: "unknown",
      vendor_region: "US",
    });
    const b = r.band!;
    expect(b.unit_low_usd).toBe(0);
    expect(b.unit_mid_usd).toBe(0);
    expect(b.unit_high_usd).toBe(0);
    expect(b.lot_mid_usd).toBe(0);
    expect(Number.isNaN(b.unit_mid_usd)).toBe(false);
  });

  it("unknown region -> falls to buyer baseline factor 1.0 (never NaN, never dropped)", () => {
    const r = VendorUnitPriceEngine.price({
      anchor_unit_price_usd: 100,
      pricing_access: "catalog",
      vendor_region: "ATLANTIS",
    });
    const b = r.band!;
    expect(b.region_supply_factor).toBe(1.0);
    expect(b.unit_mid_usd).toBe(100);
  });

  it("a huge anchor + huge quantity stays finite and cent-rounded (no overflow to Infinity)", () => {
    const r = VendorUnitPriceEngine.price({
      anchor_unit_price_usd: 1_000_000,
      pricing_access: "api",
      has_api: true,
      vendor_region: "US",
      quantity: 100_000,
    });
    const b = r.band!;
    expect(Number.isFinite(b.lot_mid_usd)).toBe(true);
    expect(b.lot_mid_usd).toBe(1_000_000 * 100_000); // 1.0e11, finite
  });
});

describe("VendorUnitPriceEngine.lotMidForVendor -- LVP convenience (fail-soft)", () => {
  it("returns the band lot mid for a valid vendor", () => {
    const lot = VendorUnitPriceEngine.lotMidForVendor({
      anchor_unit_price_usd: 100,
      pricing_access: "catalog",
      vendor_region: "MX", // factor 0.85
      quantity: 4,
    });
    expect(lot).toBe(r2(100 * REGION_SUPPLY_COST_FACTOR.MX * 4)); // 340
  });

  it("FAIL-SOFT: a bad input returns anchor x quantity un-differentiated, never breaks the ranking", () => {
    // quantity invalid -> price() returns ok:false -> lotMidForVendor falls back to anchor x 1.
    const lot = VendorUnitPriceEngine.lotMidForVendor({
      anchor_unit_price_usd: 100,
      quantity: -3,
    } as any);
    expect(lot).toBe(100); // anchor x 1 (quantity sanitized), still usable
    expect(Number.isFinite(lot)).toBe(true);
  });

  it("FAIL-SOFT on a negative anchor -> 0, never NaN", () => {
    const lot = VendorUnitPriceEngine.lotMidForVendor({
      anchor_unit_price_usd: -50,
      quantity: 5,
    } as any);
    expect(lot).toBe(0);
    expect(Number.isNaN(lot)).toBe(false);
  });
});
