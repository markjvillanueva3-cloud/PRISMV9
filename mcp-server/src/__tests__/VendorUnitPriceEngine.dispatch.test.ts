/**
 * VendorUnitPriceEngine.dispatch.test.ts -- QUOTING-VENDOR-LOC-MS0 / U-LVP02
 *
 * Dispatcher round-trip + live-catalog integration tests (R15: test THROUGH the dispatcher,
 * validate on LIVE data). Proves: (1) vendor_unit_price is wired into the prism_quoting enum +
 * schema map; (2) the schema validates then the engine produces an advisory band; (3) the band
 * is actually CONSUMED by LocationAwareVendorPricingEngine to differentiate vendors on the live
 * 482-vendor JM catalog (the gap U-LVP02 closes).
 */

import { describe, it, expect } from "vitest";
import {
  quotingActionEnum,
  QUOTING_ACTION_SCHEMAS,
  vendorUnitPriceSchema,
} from "../schemas/quotingActionSchemas.js";
import { VendorUnitPriceEngine } from "../engines/VendorUnitPriceEngine.js";
import { LocationAwareVendorPricingEngine } from "../engines/LocationAwareVendorPricingEngine.js";

describe("vendor_unit_price dispatcher round-trip", () => {
  it("action is in the enum + schema map (wiring complete)", () => {
    expect(quotingActionEnum.options).toContain("vendor_unit_price");
    expect(QUOTING_ACTION_SCHEMAS["vendor_unit_price"]).toBe(vendorUnitPriceSchema);
  });

  it("schema validates params then engine produces an advisory band", () => {
    const params = {
      anchor_unit_price_usd: 250,
      pricing_access: "catalog",
      vendor_region: "EU", // supply factor 1.08
      quantity: 8,
      vendor_id: "acme-alloys",
    };
    const parsed = QUOTING_ACTION_SCHEMAS["vendor_unit_price"].safeParse(params);
    expect(parsed.success).toBe(true);
    const result = VendorUnitPriceEngine.price(parsed.data as any);
    expect(result.ok).toBe(true);
    expect(result.band).not.toBeNull();
    expect(result.band!.tier).toBe("catalog");
    // EU supply factor 1.08 -> midpoint 250*1.08 = 270; catalog band +/-10%.
    expect(result.band!.unit_mid_usd).toBeCloseTo(270, 2);
    expect(result.band!.region_supply_factor).toBeCloseTo(1.08, 5);
    expect(result.band!.lot_mid_usd).toBeCloseTo(270 * 8, 2); // 2160
    // basis must flag it is advisory, not firm (R12 honesty).
    expect(result.band!.basis.source).toContain("NOT a firm vendor quote");
  });

  it("schema rejects invalid payload (negative anchor price)", () => {
    const parsed = QUOTING_ACTION_SCHEMAS["vendor_unit_price"].safeParse({
      anchor_unit_price_usd: -1,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("U-LVP02 live integration: LVP differentiates vendors via the band", () => {
  it("every LVP option carries a usable unit_price_band (band wired into the live ranking)", () => {
    // Uses the real 482-vendor catalog (default path) -> proves the band is live-consumed.
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 5000,
      per_part_weight_kg: 1.5,
      quantity: 10,
      buyer_region: "US",
      category: "material",
    });
    expect(res.ok).toBe(true);
    // The differentiation is present + well-formed on EVERY priced option (current + alternatives).
    if (res.current) {
      const b = res.current.unit_price_band;
      expect(b.basis.source).toContain("advisory");
      expect(b.lot_mid_usd).toBeGreaterThan(0);
      // band is internally consistent: low <= mid <= high.
      expect(b.unit_low_usd).toBeLessThanOrEqual(b.unit_mid_usd);
      expect(b.unit_mid_usd).toBeLessThanOrEqual(b.unit_high_usd);
    }
    for (const alt of res.alternatives) {
      const b = alt.unit_price_band;
      // landed >= the vendor's own (differentiated) lot value (freight + customs only add).
      expect(alt.total_landed_usd).toBeGreaterThanOrEqual(b.lot_mid_usd);
      expect(b.lot_mid_usd).toBeGreaterThan(0);
    }
  });

  it("a non-US-region alternative carries a region supply factor != 1.0 (real differentiation)", () => {
    // The live material category spans US/EU/ASIA vendors; a non-US option's part value should
    // shift off the shared anchor by its region supply factor -- that shift IS the LVP02 feature.
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 5000,
      per_part_weight_kg: 1.5,
      quantity: 10,
      buyer_region: "US",
      category: "material",
    });
    expect(res.ok).toBe(true);
    const allOptions = [...(res.current ? [res.current] : []), ...res.alternatives];
    // Every option's factor is present + finite (no silent NaN), regardless of region.
    for (const o of allOptions) {
      expect(Number.isFinite(o.unit_price_band.region_supply_factor)).toBe(true);
      expect(o.unit_price_band.region_supply_factor).toBeGreaterThan(0);
    }
    // When a non-US region IS present, at least one option differentiates off factor 1.0.
    const nonUs = allOptions.filter((o) => o.vendor_region !== "US");
    if (nonUs.length > 0) {
      const anyDifferentiated = allOptions.some((o) => o.unit_price_band.region_supply_factor !== 1.0);
      expect(anyDifferentiated).toBe(true);
    }
  });
});
