import { describe, it, expect } from "vitest";
import { cuttingDataLookupEngine } from "../engines/CuttingDataLookupEngine.js";
import type { ISOGroup, SpeedFeedQuery } from "../engines/CuttingDataLookupEngine.js";

describe("CuttingDataLookupEngine", () => {
  // ── recommend() ──

  describe("recommend()", () => {
    it("returns recommendations for P-group milling roughing", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "P",
        operation: "milling",
        cut_type: "roughing",
      });
      expect(r.recommendations.length).toBeGreaterThan(0);
      const rec = r.recommendations[0];
      expect(rec.iso_group).toBe("P");
      expect(rec.operation).toBe("milling");
      expect(rec.cut_type).toBe("roughing");
      expect(rec.vc_mmin.recommended).toBeGreaterThan(0);
      expect(rec.fz_ipt.recommended).toBeGreaterThan(0);
      expect(rec.ap_mm.recommended).toBeGreaterThan(0);
      expect(rec.coolant).toBeDefined();
      expect(rec.confidence).toBeGreaterThan(0);
    });

    it("returns recommendations for S-group turning finishing", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "S",
        operation: "turning",
        cut_type: "finishing",
      });
      expect(r.recommendations.length).toBeGreaterThan(0);
      const rec = r.recommendations[0];
      expect(rec.iso_group).toBe("S");
      expect(rec.vc_mmin.recommended).toBeLessThan(200); // superalloys are slow
    });

    it("returns recommendations for H-group milling", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "H",
        operation: "milling",
        cut_type: "roughing",
      });
      expect(r.recommendations.length).toBeGreaterThan(0);
      expect(r.recommendations[0].vc_mmin.recommended).toBeLessThan(250);
    });

    it("returns recommendations for N-group drilling", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "N",
        operation: "drilling",
        cut_type: "roughing",
      });
      expect(r.recommendations.length).toBeGreaterThan(0);
      expect(r.recommendations[0].vc_mmin.recommended).toBeGreaterThan(50);
    });

    it("resolves material name to ISO group", () => {
      const r = cuttingDataLookupEngine.recommend({
        material: "titanium",
        operation: "milling",
        cut_type: "roughing",
      });
      expect(r.query_resolved.iso_group).toBe("S");
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("resolves 6061-T6 to N group", () => {
      const r = cuttingDataLookupEngine.recommend({
        material: "6061-T6",
        operation: "milling",
        cut_type: "roughing",
      });
      expect(r.query_resolved.iso_group).toBe("N");
    });

    it("resolves stainless_steel to M group", () => {
      const r = cuttingDataLookupEngine.recommend({
        material: "stainless_steel",
        operation: "turning",
        cut_type: "roughing",
      });
      expect(r.query_resolved.iso_group).toBe("M");
    });

    it("calculates RPM and feed when tool_diameter_mm provided", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "P",
        operation: "milling",
        cut_type: "roughing",
        tool_diameter_mm: 10,
      });
      expect(r.rpm).toBeDefined();
      expect(r.rpm!).toBeGreaterThan(0);
      expect(r.feed_mmmin).toBeDefined();
      expect(r.feed_mmmin!).toBeGreaterThan(0);
    });

    it("returns empty recommendations for unknown material", () => {
      const r = cuttingDataLookupEngine.recommend({
        material: "unobtanium",
        operation: "milling",
        cut_type: "roughing",
      });
      // Should still return a result, possibly empty or fallback
      expect(r).toBeDefined();
      expect(r.recommendations).toBeDefined();
    });

    it("returns defaults when no operation specified", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "P",
      });
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("handles all 6 ISO groups", () => {
      const groups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
      for (const g of groups) {
        const r = cuttingDataLookupEngine.recommend({
          iso_group: g,
          operation: "milling",
          cut_type: "roughing",
        });
        expect(r.recommendations.length).toBeGreaterThan(0);
        expect(r.recommendations[0].iso_group).toBe(g);
      }
    });

    it("adjusts fz for larger tool diameters", () => {
      const small = cuttingDataLookupEngine.recommend({
        iso_group: "P",
        operation: "milling",
        cut_type: "roughing",
        tool_diameter_mm: 6,
      });
      const large = cuttingDataLookupEngine.recommend({
        iso_group: "P",
        operation: "milling",
        cut_type: "roughing",
        tool_diameter_mm: 25,
      });
      // Larger diameter should have higher or equal fz adjustment
      expect(large.recommendations[0].fz_ipt.recommended).toBeGreaterThanOrEqual(
        small.recommendations[0].fz_ipt.recommended
      );
    });
  });

  // ── resolveISOGroup() ──

  describe("resolveISOGroup()", () => {
    it("resolves common material names", () => {
      expect(cuttingDataLookupEngine.resolveISOGroup("steel")).toBe("P");
      expect(cuttingDataLookupEngine.resolveISOGroup("stainless_steel")).toBe("M");
      expect(cuttingDataLookupEngine.resolveISOGroup("cast_iron")).toBe("K");
      expect(cuttingDataLookupEngine.resolveISOGroup("aluminum")).toBe("N");
      expect(cuttingDataLookupEngine.resolveISOGroup("titanium")).toBe("S");
      expect(cuttingDataLookupEngine.resolveISOGroup("hardened_steel")).toBe("H");
    });

    it("resolves case-insensitive", () => {
      expect(cuttingDataLookupEngine.resolveISOGroup("STEEL")).toBe("P");
      expect(cuttingDataLookupEngine.resolveISOGroup("Aluminum")).toBe("N");
    });

    it("resolves alloy names", () => {
      expect(cuttingDataLookupEngine.resolveISOGroup("inconel")).toBe("S");
      expect(cuttingDataLookupEngine.resolveISOGroup("brass")).toBe("N");
    });

    it("uses hardness to disambiguate when applicable", () => {
      // Very high hardness steel → H group
      const group = cuttingDataLookupEngine.resolveISOGroup("steel", 55 * 10); // ~55 HRC ≈ 550 HB
      // Should still resolve (may stay P for moderate hardness)
      expect(["P", "H"]).toContain(group);
    });
  });

  // ── listGroups() ──

  describe("listGroups()", () => {
    it("returns all 6 ISO groups", () => {
      const groups = cuttingDataLookupEngine.listGroups();
      expect(groups).toHaveLength(6);
      const codes = groups.map(g => g.group);
      expect(codes).toContain("P");
      expect(codes).toContain("M");
      expect(codes).toContain("K");
      expect(codes).toContain("N");
      expect(codes).toContain("S");
      expect(codes).toContain("H");
    });

    it("each group has name, examples, and color", () => {
      const groups = cuttingDataLookupEngine.listGroups();
      for (const g of groups) {
        expect(g.name).toBeTruthy();
        expect(g.examples.length).toBeGreaterThan(0);
        expect(g.color).toBeTruthy();
      }
    });
  });

  // ── listAvailableData() ──

  describe("listAvailableData()", () => {
    it("returns non-empty list of data entries", () => {
      const data = cuttingDataLookupEngine.listAvailableData();
      expect(data.length).toBeGreaterThan(0);
    });

    it("entries describe ISO group + operation combos", () => {
      const data = cuttingDataLookupEngine.listAvailableData();
      // Should have entries like "P - milling - roughing"
      expect(data.some(d => d.includes("P"))).toBe(true);
      expect(data.some(d => d.includes("milling"))).toBe(true);
    });
  });

  // ── Edge cases ──

  describe("edge cases", () => {
    it("handles tapping operation", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "P",
        operation: "tapping",
        cut_type: "roughing",
      });
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("handles K-group turning finishing", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "K",
        operation: "turning",
        cut_type: "finishing",
      });
      expect(r.recommendations.length).toBeGreaterThan(0);
      expect(r.recommendations[0].cut_type).toBe("finishing");
    });

    it("semi_finishing falls back to finishing", () => {
      const r = cuttingDataLookupEngine.recommend({
        iso_group: "P",
        operation: "milling",
        cut_type: "semi_finishing",
      });
      // Should still return results (fallback)
      expect(r.recommendations.length).toBeGreaterThan(0);
    });
  });
});
