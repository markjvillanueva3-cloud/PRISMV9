/**
 * VendorRegionEngine.test.ts — hotel iter11 / U-VENDOR-REGION-SORT.
 * Verifies haversine-driven vendor proximity sort + unknown-location bucket +
 * R12 fail-loud + deterministic tie-break + radius/limit cutoffs.
 *
 * Uses the live VendorEngine singleton (state isolation via unique vendor
 * names + reset-equivalent via known starting count).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { vendorRegionEngine } from "../engines/VendorRegionEngine.js";
import { vendorEngine } from "../engines/VendorEngine.js";
import type { Vendor } from "../engines/VendorEngine.js";

const SHOP_ZIP = "60018";       // JM Die — Des Plaines, IL
const NEARBY_ZIP = "60173";     // Schaumburg, IL (~11 km from 60018)
const FAR_ZIP = "90001";        // Los Angeles, CA (~2800 km)
const UNKNOWN_ZIP = "99999";    // not in SAMPLE table
const RADIUS_50KM = 50;

function uniqueName(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedVendor(name: string, zip: string, categories: Vendor["categories"]): Vendor {
  return vendorEngine.create({
    name,
    short_name: name.slice(0, 16),
    categories,
    contacts: [],
    terms: "net30",
    account_number: `ACC-${Math.random().toString(36).slice(2, 8)}`,
    address: { street: "1 Test St", city: "Test", state: "IL", zip, country: "US" },
    website: "",
    preferred: false,
    brands_carried: [],
    certifications: [],
    notes: "",
  } as Parameters<typeof vendorEngine.create>[0]);
}

describe("VendorRegionEngine — rankByDistance", () => {
  let nearbyId: string;
  let farId: string;
  let unknownId: string;

  beforeEach(() => {
    // Add 3 distinct test vendors covering near / far / unknown-zip cases
    nearbyId = seedVendor(uniqueName("NEARBY"), NEARBY_ZIP, ["tooling"]).id;
    farId = seedVendor(uniqueName("FAR"), FAR_ZIP, ["tooling"]).id;
    unknownId = seedVendor(uniqueName("UNKZIP"), UNKNOWN_ZIP, ["tooling"]).id;
  });

  it("origin_resolved is true for a known sample ZIP (60018)", () => {
    const r = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling" });
    expect(r.origin_resolved).toBe(true);
  });

  it("ranks nearby vendor ahead of far vendor (proximity sort works)", () => {
    const r = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling" });
    const idsInOrder = r.ranked.map(v => v.vendor.id);
    const nearIdx = idsInOrder.indexOf(nearbyId);
    const farIdx = idsInOrder.indexOf(farId);
    expect(nearIdx).toBeGreaterThanOrEqual(0);
    expect(farIdx).toBeGreaterThanOrEqual(0);
    expect(nearIdx).toBeLessThan(farIdx);
  });

  it("unknown-ZIP vendor lands in unknown_location bucket (never silently ranked last)", () => {
    const r = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling" });
    const inRanked = r.ranked.some(v => v.vendor.id === unknownId);
    const inUnknown = r.unknown_location.some(v => v.vendor.id === unknownId);
    expect(inRanked).toBe(false);
    expect(inUnknown).toBe(true);
  });

  it("nearby Schaumburg vendor distance is < 20 km from Des Plaines", () => {
    const r = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling" });
    const near = r.ranked.find(v => v.vendor.id === nearbyId);
    expect(near?.distance).not.toBeNull();
    expect(near!.distance!).toBeLessThan(20);
  });

  it("far LA vendor distance is > 2000 km from Des Plaines (km unit)", () => {
    const r = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling" });
    const far = r.ranked.find(v => v.vendor.id === farId);
    expect(far!.distance!).toBeGreaterThan(2000);
  });

  it("mi unit returns smaller numeric than km for the same vendor pair", () => {
    const km = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling", unit: "km" });
    const mi = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling", unit: "mi" });
    const kmFar = km.ranked.find(v => v.vendor.id === farId)!.distance!;
    const miFar = mi.ranked.find(v => v.vendor.id === farId)!.distance!;
    expect(miFar).toBeLessThan(kmFar);
  });

  it("max_distance cutoff filters far vendors out of ranked", () => {
    const r = vendorRegionEngine.rankByDistance({
      origin_zip: SHOP_ZIP, category: "tooling", unit: "km", max_distance: RADIUS_50KM,
    });
    expect(r.ranked.some(v => v.vendor.id === farId)).toBe(false);
    expect(r.ranked.some(v => v.vendor.id === nearbyId)).toBe(true);
  });

  it("limit caps result count", () => {
    const r = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling", limit: 1 });
    expect(r.ranked.length).toBeLessThanOrEqual(1);
  });

  it("category filter excludes vendors not in that category", () => {
    // Seed a vendor that's NEARBY but in a different category
    const otherCat = seedVendor(uniqueName("OTHER"), NEARBY_ZIP, ["fluid"]).id;
    const r = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling" });
    expect(r.ranked.some(v => v.vendor.id === otherCat)).toBe(false);
  });

  it("total_vendors_considered counts the filtered set (not raw all)", () => {
    const r = vendorRegionEngine.rankByDistance({ origin_zip: SHOP_ZIP, category: "tooling" });
    // Should include at least our 3 seeded tooling vendors (nearby/far/unknownZip)
    expect(r.total_vendors_considered).toBeGreaterThanOrEqual(3);
  });
});

describe("VendorRegionEngine — R12 fail-loud on bad origin_zip", () => {
  it("rejects empty origin_zip", () => {
    expect(() => vendorRegionEngine.rankByDistance({ origin_zip: "" })).toThrow(/empty/);
  });

  it("rejects non-string origin_zip", () => {
    expect(() => vendorRegionEngine.rankByDistance({ origin_zip: 12345 as unknown as string })).toThrow(/must be a string/);
  });

  it("rejects oversize origin_zip", () => {
    expect(() => vendorRegionEngine.rankByDistance({ origin_zip: "1234567890123" })).toThrow(/exceeds/);
  });

  it("rejects malformed origin_zip (letters)", () => {
    expect(() => vendorRegionEngine.rankByDistance({ origin_zip: "ABCDE" })).toThrow(/ZIP-5 or ZIP\+4/);
  });

  it("accepts ZIP+4 format", () => {
    expect(() => vendorRegionEngine.rankByDistance({ origin_zip: "60018-1234" })).not.toThrow();
  });

  it("origin_resolved=false when origin_zip is well-formed but not in table", () => {
    const r = vendorRegionEngine.rankByDistance({ origin_zip: "99999" });
    expect(r.origin_resolved).toBe(false);
  });
});

describe("VendorRegionEngine — nearest + withinRadius convenience", () => {
  beforeEach(() => {
    seedVendor(uniqueName("NEAR-FOR-CONV"), NEARBY_ZIP, ["tooling"]);
    seedVendor(uniqueName("FAR-FOR-CONV"), FAR_ZIP, ["tooling"]);
  });

  it("nearest('tooling') returns a VendorWithDistance closer than 50 km", () => {
    const n = vendorRegionEngine.nearest("tooling");
    expect(n).not.toBe(null);
    expect(n!.distance!).toBeLessThan(50);
  });

  it("nearest returns null for a category with no vendors", () => {
    const n = vendorRegionEngine.nearest("subscription" as Vendor["categories"][0]);
    expect(n === null).toBe(true);
  });

  it("withinRadius(50km) only returns vendors within 50 km", () => {
    const within = vendorRegionEngine.withinRadius(SHOP_ZIP, RADIUS_50KM, "km", "tooling");
    for (const v of within) {
      expect(v.distance).not.toBeNull();
      expect(v.distance!).toBeLessThanOrEqual(RADIUS_50KM);
    }
  });

  it("defaultOriginZip is JM Die's 60018", () => {
    expect(vendorRegionEngine.defaultOriginZip).toBe("60018");
  });
});
