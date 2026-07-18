/**
 * LocationAwareVendorPricingEngine.test.ts -- QUOTING-VENDOR-LOC-MS0 / U-LVP01
 *
 * Reference-value tests (R9). Every expected landed cost is hand-computed from the LIVE
 * geo-logistics zone rate card (src/data/geo-logistics-rates.ts), verified 2026-06-23:
 *   local        base $25 + $1.5/kg, 1d, no customs
 *   domestic     base $60 + $3.0/kg, 3d, no customs
 *   international base $180 + $8.0/kg, 9d, customs (3% ad-valorem)
 *   default weight 0.5 kg/part
 * If the rate card changes, THESE NUMBERS SHOULD CHANGE -- that is the point (R9): a
 * hardcoded-return regression fails here.
 *
 * U-LVP02 update: the part value is now DIFFERENTIATED per vendor via VendorUnitPriceEngine.
 * The test vendors carry no pricing_access/has_api -> "unknown" tier (band WIDTH 0.30, midpoint
 * shift 0), so the lot value = anchor_unit (part_value_usd/quantity) x REGION SUPPLY FACTOR x qty:
 *   US factor 1.0  -> lot value unchanged (1000); EU factor 1.08 -> lot value 1080.
 * The EU vendor is therefore MORE expensive than under U-LVP01's shared-value model -- that
 * higher supply-region cost is exactly the differentiation this milestone adds.
 *
 * Coverage: happy path + 4 failure modes + 2 adversarial + suggestion-logic invariants.
 * Vendor data is supplied via a temp JSONL catalog so the test is deterministic + offline.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocationAwareVendorPricingEngine, _clearCatalogCache } from "../engines/LocationAwareVendorPricingEngine.js";

// --- temp catalog with deterministic vendors across regions ---
const tmpDir = mkdtempSync(join(tmpdir(), "lvp-test-"));
const CATALOG = join(tmpDir, "vendors.jsonl");

function writeCatalog(vendors: unknown[]): void {
  writeFileSync(CATALOG, vendors.map((v) => JSON.stringify(v)).join("\n") + "\n");
  _clearCatalogCache();
}

// A current US vendor (jm != null), a cheaper US vendor, and a pricey EU vendor -- all "material".
const MATERIAL_VENDORS = [
  { vendor_id: "jm-steel-co", name: "JM Steel Co", categories: ["material"], primary_category: "material", regions: ["US"], jm: { spend: 12000 } },
  { vendor_id: "midwest-metals", name: "Midwest Metals", categories: ["material"], primary_category: "material", regions: ["US"], jm: null },
  { vendor_id: "euro-alloys", name: "Euro Alloys", categories: ["material"], primary_category: "material", regions: ["EU"], jm: null },
  { vendor_id: "tooling-x", name: "Tooling X", categories: ["tooling-consumable"], primary_category: "tooling-consumable", regions: ["US"], jm: null },
];

beforeEach(() => writeCatalog(MATERIAL_VENDORS));
afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

describe("LocationAwareVendorPricingEngine", () => {
  // -------- HAPPY PATH: domestic + international landed costs hand-verified --------
  it("prices current + alternative vendors on landed cost with hand-verified reference values", () => {
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 1000,
      per_part_weight_kg: 2,
      quantity: 5,
      buyer_region: "US",
      category: "material",
      catalog_path: CATALOG,
    });
    expect(res.ok).toBe(true);

    // Current = jm-steel-co (US, factor 1.0 -> lot value 1000): US -> US domestic:
    // ship 60 + 3*10 = 90; customs 0; landed 1090 (US factor 1.0 leaves it unchanged).
    expect(res.current).not.toBeNull();
    expect(res.current!.vendor_id).toBe("jm-steel-co");
    expect(res.current!.is_current).toBe(true);
    expect(res.current!.total_landed_usd).toBeCloseTo(1090, 2);
    expect(res.current!.zone).toBe("domestic");
    expect(res.current!.transit_days).toBe(3);
    // U-LVP02: every option now carries its advisory band; the US vendor's lot mid == 1000.
    expect(res.current!.unit_price_band.tier).toBe("unknown"); // no pricing_access in fixture
    expect(res.current!.unit_price_band.region_supply_factor).toBe(1.0);
    expect(res.current!.unit_price_band.lot_mid_usd).toBeCloseTo(1000, 2);

    // Alternatives ranked asc: midwest-metals (US domestic, 1090) then euro-alloys (EU intl).
    expect(res.alternatives.length).toBe(2);
    const altById = Object.fromEntries(res.alternatives.map((a) => [a.vendor_id, a]));
    // EU vendor (factor 1.08 -> lot value 1000*1.08 = 1080): EU -> US international:
    // ship 180 + 8*10 = 260; customs 1080*0.03 = 32.40; landed 1080+260+32.40 = 1372.40.
    expect(altById["euro-alloys"].unit_price_band.region_supply_factor).toBeCloseTo(1.08, 5);
    expect(altById["euro-alloys"].unit_price_band.lot_mid_usd).toBeCloseTo(1080, 2);
    expect(altById["euro-alloys"].total_landed_usd).toBeCloseTo(1372.4, 2);
    expect(altById["euro-alloys"].zone).toBe("international");
    expect(altById["euro-alloys"].landed.customsDutyUsd).toBeCloseTo(32.4, 2);
    // domestic US alt (lot 1000) is cheaper than the EU intl alt (lot 1080) -> ranked first.
    expect(res.alternatives[0].total_landed_usd).toBeLessThanOrEqual(res.alternatives[1].total_landed_usd);

    // Provenance cites the real engines.
    expect(res.provenance.landed_cost_source).toContain("GeoLogisticsRoutingEngine");
    expect(res.provenance.vendors_considered).toBe(3); // 3 material vendors (tooling-x excluded)
  });

  // -------- INTENT: a cheaper-delivered alternative triggers a switch suggestion --------
  it("suggests switching when an alternative is materially cheaper on landed cost", () => {
    // Make the current vendor INTERNATIONAL (EU) and an alternative DOMESTIC (US) so the
    // alternative wins on landed cost by more than the 5% surface threshold.
    writeCatalog([
      { vendor_id: "eu-current", name: "EU Current", categories: ["material"], primary_category: "material", regions: ["EU"], jm: { spend: 1 } },
      { vendor_id: "us-alt", name: "US Alt", categories: ["material"], primary_category: "material", regions: ["US"], jm: null },
    ]);
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 1000, per_part_weight_kg: 2, quantity: 5, buyer_region: "US", category: "material", catalog_path: CATALOG,
    });
    expect(res.current!.vendor_id).toBe("eu-current");
    // EU (factor 1.08 -> lot 1080) intl: ship 260 + customs 32.40 -> landed 1372.40.
    expect(res.current!.total_landed_usd).toBeCloseTo(1372.4, 2);
    expect(res.suggestion.verdict).toBe("switch-opportunity");
    expect(res.suggestion.best_alternative_vendor_id).toBe("us-alt");
    // us-alt (US factor 1.0 -> lot 1000) domestic landed 1090; savings = 1372.40 - 1090 = 282.40/lot.
    expect(res.suggestion.savings_usd_per_lot).toBeCloseTo(282.4, 2);
    expect(res.suggestion.headline).toContain("US Alt");
    // U-LVP02: the headline carries the advisory-band qualifier (never a firm-quote claim, R12).
    expect(res.suggestion.headline).toContain("advisory band");
  });

  // -------- INTENT: current vendor competitive -> no switch --------
  it("reports current-competitive when no alternative beats it on landed cost", () => {
    // Current US (domestic) + only a pricier EU alternative -> current wins.
    writeCatalog([
      { vendor_id: "us-current", name: "US Current", categories: ["material"], primary_category: "material", regions: ["US"], jm: { spend: 1 } },
      { vendor_id: "eu-pricey", name: "EU Pricey", categories: ["material"], primary_category: "material", regions: ["EU"], jm: null },
    ]);
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 1000, per_part_weight_kg: 2, quantity: 5, buyer_region: "US", category: "material", catalog_path: CATALOG,
    });
    expect(res.suggestion.verdict).toBe("current-competitive");
    expect(res.suggestion.savings_usd_per_lot).toBe(0);
  });

  // -------- FAILURE MODE 1: negative part value --------
  it("rejects a negative part value", () => {
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: -100, quantity: 1, buyer_region: "US", category: "material", catalog_path: CATALOG,
    } as any);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("part_value_usd");
  });

  // -------- FAILURE MODE 2: zero quantity --------
  it("rejects quantity=0", () => {
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 1000, quantity: 0, buyer_region: "US", category: "material", catalog_path: CATALOG,
    } as any);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("quantity");
  });

  // -------- FAILURE MODE 3: empty category --------
  it("rejects an empty category", () => {
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 1000, quantity: 1, buyer_region: "US", category: "", catalog_path: CATALOG,
    } as any);
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("category");
  });

  // -------- FAILURE MODE 4: category with no vendors --------
  it("returns no-alternatives + null current for an unknown category", () => {
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 1000, quantity: 1, buyer_region: "US", category: "no-such-category", catalog_path: CATALOG,
    });
    expect(res.ok).toBe(true);
    expect(res.current).toBeNull();
    expect(res.alternatives).toHaveLength(0);
    expect(res.suggestion.verdict).toBe("no-alternatives");
  });

  // -------- ADVERSARIAL 1: vendor with no region -> assumed same-as-buyer, flagged --------
  it("treats a region-less vendor as same-region as the buyer and flags it", () => {
    writeCatalog([
      { vendor_id: "no-region", name: "No Region Vendor", categories: ["material"], primary_category: "material", jm: { spend: 1 } },
    ]);
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 1000, per_part_weight_kg: 2, quantity: 5, buyer_region: "US", category: "material", catalog_path: CATALOG,
    });
    expect(res.current!.region_assumed).toBe(true);
    expect(res.current!.vendor_region).toBe("US"); // assumed = buyer region
    expect(res.current!.zone).toBe("domestic"); // same region -> domestic, not dropped
    // U-LVP02: a minimal-signal vendor (no pricing_access, no region) still gets a well-formed,
    // always-present band -- unknown tier, buyer-baseline factor 1.0, internally consistent.
    const b = res.current!.unit_price_band;
    expect(b.tier).toBe("unknown");
    expect(b.region_supply_factor).toBe(1.0); // assumed-US -> baseline
    expect(b.lot_mid_usd).toBeCloseTo(1000, 2); // anchor (1000/5) x 1.0 x 5
    expect(b.unit_low_usd).toBeLessThanOrEqual(b.unit_mid_usd);
    expect(b.unit_mid_usd).toBeLessThanOrEqual(b.unit_high_usd);
    expect(b.basis.source).toContain("advisory");
  });

  // -------- ADVERSARIAL 2: huge lot stays finite + landed > part value --------
  it("handles a very large lot without NaN/Infinity", () => {
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 1_000_000, per_part_weight_kg: 0.1, quantity: 1_000_000, buyer_region: "US", category: "material", catalog_path: CATALOG,
    });
    expect(res.ok).toBe(true);
    expect(Number.isFinite(res.current!.total_landed_usd)).toBe(true);
    // Landed >= part value (freight only adds cost).
    expect(res.current!.total_landed_usd).toBeGreaterThanOrEqual(1_000_000);
    // U-LVP02: the per-vendor band also stays finite on a huge lot (no overflow to Infinity/NaN).
    expect(Number.isFinite(res.current!.unit_price_band.lot_mid_usd)).toBe(true);
    expect(Number.isNaN(res.current!.unit_price_band.unit_mid_usd)).toBe(false);
  });

  // -------- ADVERSARIAL 3: malformed catalog line is skipped, not crashed --------
  it("skips a malformed catalog line without crashing", () => {
    writeFileSync(CATALOG, '{"vendor_id":"ok","name":"OK","categories":["material"],"primary_category":"material","regions":["US"],"jm":{"x":1}}\nNOT JSON\n{bad\n');
    _clearCatalogCache();
    const res = LocationAwareVendorPricingEngine.price({
      part_value_usd: 500, quantity: 1, buyer_region: "US", category: "material", catalog_path: CATALOG,
    });
    expect(res.ok).toBe(true);
    expect(res.current!.vendor_id).toBe("ok");
  });

  it("exports a static-method class deterministically", () => {
    const a = LocationAwareVendorPricingEngine.price({ part_value_usd: 1000, quantity: 1, buyer_region: "US", category: "material", catalog_path: CATALOG });
    const b = LocationAwareVendorPricingEngine.price({ part_value_usd: 1000, quantity: 1, buyer_region: "US", category: "material", catalog_path: CATALOG });
    expect(a.current!.total_landed_usd).toBe(b.current!.total_landed_usd);
  });
});
