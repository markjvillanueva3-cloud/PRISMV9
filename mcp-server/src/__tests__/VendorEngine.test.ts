/**
 * VendorEngine + DistributionNetworkEngine tests — INGEST-MS2
 *
 * Tests vendor CRUD, scorecards, spend analysis, distribution network
 * mapping, brand preferences, supply chain risk, and reorder recommendations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { vendorEngine } from "../engines/VendorEngine.js";
import { distributionNetworkEngine } from "../engines/DistributionNetworkEngine.js";

describe("VendorEngine", () => {

  // ── CREATE ───────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a vendor with minimal input", () => {
      const v = vendorEngine.create({ name: "MSC Industrial" });
      expect(v.id).toMatch(/^VND-/);
      expect(v.name).toBe("MSC Industrial");
      expect(v.status).toBe("active");
      expect(v.terms).toBe("net30");
    });

    it("creates a vendor with full input", () => {
      const v = vendorEngine.create({
        name: "Kennametal",
        short_name: "KMET",
        categories: ["tooling", "carbide_blanks" as any],
        terms: "net45",
        preferred: true,
        brands_carried: ["Kennametal", "Widia"],
        certifications: ["ISO 9001"],
        notes: "Direct manufacturer",
      });
      expect(v.short_name).toBe("KMET");
      expect(v.categories).toContain("tooling");
      expect(v.preferred).toBe(true);
      expect(v.brands_carried).toContain("Widia");
    });

    it("assigns unique IDs", () => {
      const v1 = vendorEngine.create({ name: "Vendor A" });
      const v2 = vendorEngine.create({ name: "Vendor B" });
      expect(v1.id).not.toBe(v2.id);
    });
  });

  // ── GET / UPDATE ─────────────────────────────────────────────────────

  describe("get / update", () => {
    it("gets a vendor by ID", () => {
      const created = vendorEngine.create({ name: "Get Test" });
      const found = vendorEngine.get(created.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe("Get Test");
    });

    it("returns null for unknown ID", () => {
      expect(vendorEngine.get("VND-9999")).toBeNull();
    });

    it("updates vendor fields", () => {
      const v = vendorEngine.create({ name: "Update Test" });
      const updated = vendorEngine.update(v.id, { preferred: true, terms: "net45" });
      expect(updated.preferred).toBe(true);
      expect(updated.terms).toBe("net45");
      expect(updated.name).toBe("Update Test"); // unchanged
    });

    it("throws for unknown vendor update", () => {
      expect(() => vendorEngine.update("VND-9999", {})).toThrow(/not found/);
    });
  });

  // ── SEARCH ───────────────────────────────────────────────────────────

  describe("search", () => {
    it("searches by name", () => {
      vendorEngine.create({ name: "Searchable Vendor ABC" });
      const results = vendorEngine.search({ query: "searchable" });
      expect(results.some(v => v.name.includes("Searchable"))).toBe(true);
    });

    it("searches by brand", () => {
      vendorEngine.create({ name: "Brand Carrier", brands_carried: ["Sandvik", "Seco"] });
      const results = vendorEngine.search({ brand: "sandvik" });
      expect(results.some(v => v.name === "Brand Carrier")).toBe(true);
    });

    it("filters by preferred", () => {
      vendorEngine.create({ name: "Pref Vendor", preferred: true });
      vendorEngine.create({ name: "Normal Vendor", preferred: false });
      const results = vendorEngine.search({ preferred_only: true });
      expect(results.every(v => v.preferred)).toBe(true);
    });

    it("filters by category", () => {
      vendorEngine.create({ name: "Tooling Co", categories: ["tooling"] });
      vendorEngine.create({ name: "Office Co", categories: ["office"] });
      const results = vendorEngine.search({ category: "tooling" });
      expect(results.every(v => v.categories.includes("tooling"))).toBe(true);
    });
  });

  // ── SCORECARD ────────────────────────────────────────────────────────

  describe("scorecard", () => {
    it("generates scorecard with composite score", () => {
      const v = vendorEngine.create({ name: "Scored Vendor", preferred: true });
      vendorEngine.update(v.id, { on_time_pct: 95, quality_pct: 98 });
      const sc = vendorEngine.scorecard(v.id);
      expect(sc.vendor_name).toBe("Scored Vendor");
      expect(sc.composite_score).toBeGreaterThan(0);
      expect(sc.composite_score).toBeLessThanOrEqual(100);
      expect(sc.on_time_pct).toBe(95);
    });

    it("flags risk for low on-time delivery", () => {
      const v = vendorEngine.create({ name: "Late Vendor" });
      vendorEngine.update(v.id, { on_time_pct: 60 });
      const sc = vendorEngine.scorecard(v.id);
      expect(sc.risk_flags).toContain("low_on_time_delivery");
    });

    it("flags risk for low quality", () => {
      const v = vendorEngine.create({ name: "Quality Issue" });
      vendorEngine.update(v.id, { quality_pct: 80 });
      const sc = vendorEngine.scorecard(v.id);
      expect(sc.risk_flags).toContain("quality_concern");
    });
  });

  // ── SPEND ────────────────────────────────────────────────────────────

  describe("spend", () => {
    it("records spend against a vendor", () => {
      const v = vendorEngine.create({ name: "Spend Target" });
      vendorEngine.recordSpend(v.id, 5000);
      vendorEngine.recordSpend(v.id, 3000);
      const updated = vendorEngine.get(v.id);
      expect(updated!.spend_ytd).toBe(8000);
    });

    it("generates spend analysis", () => {
      const v = vendorEngine.create({ name: "Analyzed Vendor", categories: ["tooling", "material"] });
      vendorEngine.recordSpend(v.id, 10000);
      const analysis = vendorEngine.spendAnalysis(v.id);
      expect(analysis.total_spend).toBe(10000);
      expect(analysis.by_category["tooling"]).toBe(5000);
    });
  });

  // ── STATS ────────────────────────────────────────────────────────────

  describe("getStats", () => {
    it("returns aggregate vendor stats", () => {
      const stats = vendorEngine.getStats();
      expect(stats.total_vendors).toBeGreaterThan(0);
      expect(stats.active).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// DISTRIBUTION NETWORK
// ============================================================================

describe("DistributionNetworkEngine", () => {

  beforeEach(() => {
    distributionNetworkEngine.reset();
  });

  describe("addLink", () => {
    it("creates a vendor-product link", () => {
      const link = distributionNetworkEngine.addLink({
        vendor_id: "VND-0001", vendor_name: "MSC Industrial",
        product_category: "carbide_inserts",
        brands: ["Sandvik", "Kennametal"],
        preferred: true, lead_time_days: 3,
      });
      expect(link.id).toMatch(/^LINK-/);
      expect(link.product_category).toBe("carbide_inserts");
      expect(link.brands).toContain("Sandvik");
    });
  });

  describe("getVendorsForCategory", () => {
    it("returns vendors for a category sorted by preference", () => {
      distributionNetworkEngine.addLink({
        vendor_id: "VND-A", vendor_name: "Backup",
        product_category: "end_mills", preferred: false,
      });
      distributionNetworkEngine.addLink({
        vendor_id: "VND-B", vendor_name: "Preferred",
        product_category: "end_mills", preferred: true,
      });

      const vendors = distributionNetworkEngine.getVendorsForCategory("end_mills");
      expect(vendors.length).toBe(2);
      expect(vendors[0].vendor_name).toBe("Preferred");
    });
  });

  describe("getBrandPreferences", () => {
    it("tracks brand usage across vendors", () => {
      distributionNetworkEngine.addLink({
        vendor_id: "VND-A", vendor_name: "A",
        product_category: "carbide_inserts", brands: ["Sandvik"],
      });
      distributionNetworkEngine.addLink({
        vendor_id: "VND-B", vendor_name: "B",
        product_category: "carbide_inserts", brands: ["Sandvik"],
      });

      const prefs = distributionNetworkEngine.getBrandPreferences("carbide_inserts");
      const sandvik = prefs.find(p => p.brand === "Sandvik");
      expect(sandvik).toBeDefined();
      expect(sandvik!.usage_count).toBe(2);
    });

    it("sorts by usage count descending", () => {
      distributionNetworkEngine.addLink({
        vendor_id: "V1", vendor_name: "V1",
        product_category: "drills", brands: ["Guhring"],
      });
      distributionNetworkEngine.addLink({
        vendor_id: "V2", vendor_name: "V2",
        product_category: "drills", brands: ["Guhring", "OSG"],
      });
      distributionNetworkEngine.addLink({
        vendor_id: "V3", vendor_name: "V3",
        product_category: "drills", brands: ["OSG"],
      });

      const prefs = distributionNetworkEngine.getBrandPreferences("drills");
      expect(prefs[0].brand).toBe("Guhring"); // 2 uses
      expect(prefs[1].brand).toBe("OSG");     // 2 uses
    });
  });

  describe("assessRisk", () => {
    it("flags categories with no vendor as high risk", () => {
      const risks = distributionNetworkEngine.assessRisk();
      const highRisk = risks.filter(r => r.risk_level === "high");
      expect(highRisk.length).toBeGreaterThan(0);
    });

    it("flags single-source as medium risk", () => {
      distributionNetworkEngine.addLink({
        vendor_id: "V1", vendor_name: "Only Supplier",
        product_category: "wire_edm_wire",
      });

      const risks = distributionNetworkEngine.assessRisk();
      const wireRisk = risks.find(r => r.product_category === "wire_edm_wire");
      expect(wireRisk!.risk_level).toBe("medium");
      expect(wireRisk!.reason).toContain("Single-source");
    });

    it("reports low risk for multi-vendor categories", () => {
      distributionNetworkEngine.addLink({
        vendor_id: "V1", vendor_name: "A", product_category: "coolant",
      });
      distributionNetworkEngine.addLink({
        vendor_id: "V2", vendor_name: "B", product_category: "coolant",
      });

      const risks = distributionNetworkEngine.assessRisk();
      const coolantRisk = risks.find(r => r.product_category === "coolant");
      expect(coolantRisk!.risk_level).toBe("low");
    });
  });

  describe("getNetworkMap", () => {
    it("returns complete network overview", () => {
      distributionNetworkEngine.addLink({
        vendor_id: "V1", vendor_name: "MSC",
        product_category: "carbide_inserts", brands: ["Sandvik"],
      });

      const map = distributionNetworkEngine.getNetworkMap();
      expect(map.total_links).toBe(1);
      expect(map.categories_covered).toBe(1);
      expect(map.categories_uncovered.length).toBeGreaterThan(0);
      expect(map.risks.length).toBeGreaterThan(0);
    });
  });

  describe("recommendReorder", () => {
    it("recommends preferred vendor first", () => {
      distributionNetworkEngine.addLink({
        vendor_id: "V1", vendor_name: "Cheap", product_category: "end_mills",
        preferred: false, lead_time_days: 1,
      });
      distributionNetworkEngine.addLink({
        vendor_id: "V2", vendor_name: "Trusted", product_category: "end_mills",
        preferred: true, lead_time_days: 5,
      });

      const rec = distributionNetworkEngine.recommendReorder("end_mills");
      expect(rec).not.toBeNull();
      expect(rec!.recommended_vendor_name).toBe("Trusted");
      expect(rec!.alternative_vendors.length).toBe(1);
    });

    it("returns null for uncovered category", () => {
      const rec = distributionNetworkEngine.recommendReorder("edm_graphite");
      expect(rec).toBeNull();
    });
  });

  describe("getStats", () => {
    it("returns aggregate network stats", () => {
      distributionNetworkEngine.addLink({
        vendor_id: "V1", vendor_name: "A",
        product_category: "coolant", brands: ["Brand1"],
      });

      const stats = distributionNetworkEngine.getStats();
      expect(stats.total_links).toBe(1);
      expect(stats.total_brands).toBe(1);
      expect(stats.categories_covered).toBe(1);
    });
  });
});
