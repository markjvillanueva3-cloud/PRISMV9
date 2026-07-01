import { describe, it, expect } from "vitest";
import { quotingActionEnum, QUOTING_ACTION_SCHEMAS, locationVendorPricingSchema } from "../schemas/quotingActionSchemas.js";
import { LocationAwareVendorPricingEngine } from "../engines/LocationAwareVendorPricingEngine.js";

describe("location_vendor_pricing dispatcher round-trip", () => {
  it("action is in the enum + schema map (wiring complete)", () => {
    expect(quotingActionEnum.options).toContain("location_vendor_pricing");
    expect(QUOTING_ACTION_SCHEMAS["location_vendor_pricing"]).toBe(locationVendorPricingSchema);
  });
  it("schema validates params then engine produces a landed-cost result against the LIVE catalog", () => {
    // Uses the real 482-vendor catalog (default path) -> proves live-data wiring.
    const params = { part_value_usd: 5000, per_part_weight_kg: 1.5, quantity: 10, buyer_region: "US", category: "material" };
    const parsed = QUOTING_ACTION_SCHEMAS["location_vendor_pricing"].safeParse(params);
    expect(parsed.success).toBe(true);
    const result = LocationAwareVendorPricingEngine.price(parsed.data as any);
    expect(result.ok).toBe(true);
    // Live catalog has material vendors -> at least a current + some alternatives.
    expect(result.provenance.vendors_considered).toBeGreaterThan(0);
    expect(["current-competitive","switch-opportunity","no-alternatives"]).toContain(result.suggestion.verdict);
    if (result.current) expect(result.current.total_landed_usd).toBeGreaterThanOrEqual(5000);
  });
  it("schema rejects invalid payload (negative part value)", () => {
    const parsed = QUOTING_ACTION_SCHEMAS["location_vendor_pricing"].safeParse({ part_value_usd: -1, category: "material" });
    expect(parsed.success).toBe(false);
  });
});
