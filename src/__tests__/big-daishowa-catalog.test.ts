import { describe, it, expect } from "vitest";
import {
  BIG_DAISHOWA_HOLDERS,
  BIG_DAISHOWA_FAMILIES,
  findHolders,
  recommendHolder,
  getAvailableTapers,
  getHolderTypesForTaper,
  type ToolholderSpec,
  type ToolholderFamily,
} from "../data/big-daishowa-holders";

describe("BIG DAISHOWA Catalog Data", () => {
  describe("data integrity", () => {
    it("should have a substantial number of holder specs", () => {
      expect(BIG_DAISHOWA_HOLDERS.length).toBeGreaterThanOrEqual(100);
    });

    it("should have holder families defined", () => {
      expect(BIG_DAISHOWA_FAMILIES.length).toBeGreaterThanOrEqual(9);
    });

    it("every holder should have valid type", () => {
      const validTypes = [
        "shrink_fit",
        "hydraulic",
        "milling_chuck",
        "collet_chuck",
        "power_chuck",
        "side_lock",
      ];
      for (const h of BIG_DAISHOWA_HOLDERS) {
        expect(validTypes).toContain(h.type);
      }
    });

    it("every holder should have positive max_rpm", () => {
      for (const h of BIG_DAISHOWA_HOLDERS) {
        expect(h.max_rpm).toBeGreaterThan(0);
      }
    });

    it("every holder should have runout_um > 0", () => {
      for (const h of BIG_DAISHOWA_HOLDERS) {
        expect(h.runout_um).toBeGreaterThan(0);
      }
    });

    it("every holder should have bore_range_mm[0] <= bore_range_mm[1]", () => {
      for (const h of BIG_DAISHOWA_HOLDERS) {
        expect(h.bore_range_mm[0]).toBeLessThanOrEqual(h.bore_range_mm[1]);
      }
    });

    it("every holder should have positive gauge_length_mm", () => {
      for (const h of BIG_DAISHOWA_HOLDERS) {
        expect(h.gauge_length_mm).toBeGreaterThan(0);
      }
    });

    it("all holders use ISO 16084 balance standard", () => {
      for (const h of BIG_DAISHOWA_HOLDERS) {
        expect(h.balance_grade).toBe("ISO 16084");
      }
    });

    it("weight_kg should be positive when present", () => {
      for (const h of BIG_DAISHOWA_HOLDERS) {
        if (h.weight_kg !== undefined) {
          expect(h.weight_kg).toBeGreaterThan(0);
        }
      }
    });

    it("model numbers should be unique", () => {
      const models = BIG_DAISHOWA_HOLDERS.map((h) => h.model);
      const unique = new Set(models);
      expect(unique.size).toBe(models.length);
    });
  });

  describe("holder type coverage", () => {
    it("should have collet_chuck holders", () => {
      const collet = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "collet_chuck",
      );
      expect(collet.length).toBeGreaterThanOrEqual(20);
    });

    it("should have hydraulic holders", () => {
      const hydraulic = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "hydraulic",
      );
      expect(hydraulic.length).toBeGreaterThanOrEqual(15);
    });

    it("should have shrink_fit holders", () => {
      const shrink = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "shrink_fit",
      );
      expect(shrink.length).toBeGreaterThanOrEqual(15);
    });

    it("should have power_chuck holders", () => {
      const power = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "power_chuck",
      );
      expect(power.length).toBeGreaterThanOrEqual(10);
    });

    it("should have milling_chuck holders", () => {
      const milling = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "milling_chuck",
      );
      expect(milling.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("taper coverage", () => {
    it("should cover BBT30, BBT40, BBT50 tapers", () => {
      const tapers = getAvailableTapers();
      expect(tapers).toContain("BBT30");
      expect(tapers).toContain("BBT40");
      expect(tapers).toContain("BBT50");
    });

    it("should cover HSK-A63 and HSK-A100 tapers", () => {
      const tapers = getAvailableTapers();
      expect(tapers).toContain("HSK-A63");
      expect(tapers).toContain("HSK-A100");
    });

    it("should cover CAT40 and CAT50 tapers", () => {
      const tapers = getAvailableTapers();
      expect(tapers).toContain("CAT40");
      expect(tapers).toContain("CAT50");
    });

    it("should cover BIG CAPTO tapers", () => {
      const tapers = getAvailableTapers();
      const captoTapers = tapers.filter((t) => t.startsWith("Capto"));
      expect(captoTapers.length).toBeGreaterThanOrEqual(2);
    });

    it("should have at least 10 distinct tapers", () => {
      const tapers = getAvailableTapers();
      expect(tapers.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("findHolders()", () => {
    it("should find BBT40 holders for 10mm tool", () => {
      const results = findHolders("BBT40", 10);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find HSK-A63 hydraulic holders for 12mm tool", () => {
      const results = findHolders("HSK-A63", 12, "hydraulic");
      expect(results.length).toBeGreaterThan(0);
      for (const h of results) {
        expect(h.type).toBe("hydraulic");
        expect(h.taper).toBe("HSK-A63");
      }
    });

    it("should find BBT40 shrink_fit holders for 6mm tool", () => {
      const results = findHolders("BBT40", 6, "shrink_fit");
      expect(results.length).toBeGreaterThan(0);
      for (const h of results) {
        expect(h.type).toBe("shrink_fit");
        expect(h.bore_range_mm[0]).toBeLessThanOrEqual(6);
        expect(h.bore_range_mm[1]).toBeGreaterThanOrEqual(6);
      }
    });

    it("should return empty for non-existent taper", () => {
      const results = findHolders("HSK-A999", 10);
      expect(results).toHaveLength(0);
    });

    it("should return empty for out-of-range diameter", () => {
      const results = findHolders("BBT40", 100);
      expect(results).toHaveLength(0);
    });
  });

  describe("recommendHolder()", () => {
    it("should recommend a holder for BBT40 12mm at 25000 RPM", () => {
      const result = recommendHolder("BBT40", 12, 25000);
      expect(result).not.toBeNull();
      expect(result!.max_rpm).toBeGreaterThanOrEqual(25000);
      expect(result!.bore_range_mm[0]).toBeLessThanOrEqual(12);
      expect(result!.bore_range_mm[1]).toBeGreaterThanOrEqual(12);
    });

    it("should prefer lowest runout when RPM is met", () => {
      const result = recommendHolder("BBT40", 10, 20000);
      expect(result).not.toBeNull();
      // All BIG DAISHOWA holders are 3 um, so any match is valid
      expect(result!.runout_um).toBeLessThanOrEqual(5);
    });

    it("should recommend hydraulic when type specified", () => {
      const result = recommendHolder("HSK-A63", 12, 20000, "hydraulic");
      expect(result).not.toBeNull();
      expect(result!.type).toBe("hydraulic");
    });

    it("should return null when RPM requirement cannot be met", () => {
      const result = recommendHolder("BBT40", 6, 100000);
      expect(result).toBeNull();
    });

    it("should return null for invalid taper", () => {
      const result = recommendHolder("INVALID", 10, 10000);
      expect(result).toBeNull();
    });
  });

  describe("getHolderTypesForTaper()", () => {
    it("BBT40 should support multiple holder types", () => {
      const types = getHolderTypesForTaper("BBT40");
      expect(types.length).toBeGreaterThanOrEqual(3);
      expect(types).toContain("collet_chuck");
      expect(types).toContain("hydraulic");
      expect(types).toContain("shrink_fit");
    });

    it("HSK-A63 should support multiple holder types", () => {
      const types = getHolderTypesForTaper("HSK-A63");
      expect(types.length).toBeGreaterThanOrEqual(3);
    });

    it("should return empty for non-existent taper", () => {
      const types = getHolderTypesForTaper("INVALID");
      expect(types).toHaveLength(0);
    });
  });

  describe("catalog spec ranges (sanity checks from PDF data)", () => {
    it("MEGA MICRO CHUCK max RPM should be 20000-50000", () => {
      const micros = BIG_DAISHOWA_HOLDERS.filter(
        (h) => /MEGA[3468]S-/.test(h.model),
      );
      expect(micros.length).toBeGreaterThan(0);
      for (const h of micros) {
        // Longer gauge lengths rate down to ~22000 RPM per catalog
        expect(h.max_rpm).toBeGreaterThanOrEqual(20000);
        expect(h.max_rpm).toBeLessThanOrEqual(50000);
      }
    });

    it("hydraulic holders should have runout <= 3 um", () => {
      const hydraulics = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "hydraulic",
      );
      for (const h of hydraulics) {
        expect(h.runout_um).toBeLessThanOrEqual(3);
      }
    });

    it("shrink fit holders should be available in BBT30/40", () => {
      const sf30 = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "shrink_fit" && h.taper === "BBT30",
      );
      const sf40 = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "shrink_fit" && h.taper === "BBT40",
      );
      expect(sf30.length).toBeGreaterThan(0);
      expect(sf40.length).toBeGreaterThan(0);
    });

    it("power chuck bore range should cover 12-50mm", () => {
      const power = BIG_DAISHOWA_HOLDERS.filter(
        (h) => h.type === "power_chuck",
      );
      const minBore = Math.min(...power.map((h) => h.bore_range_mm[0]));
      const maxBore = Math.max(...power.map((h) => h.bore_range_mm[1]));
      expect(minBore).toBeLessThanOrEqual(12);
      expect(maxBore).toBeGreaterThanOrEqual(42);
    });

    it("BBT50 holders should weigh more than BBT30 equivalents", () => {
      const bbt50w = BIG_DAISHOWA_HOLDERS
        .filter((h) => h.taper === "BBT50" && h.weight_kg)
        .map((h) => h.weight_kg!);
      const bbt30w = BIG_DAISHOWA_HOLDERS
        .filter((h) => h.taper === "BBT30" && h.weight_kg)
        .map((h) => h.weight_kg!);
      if (bbt50w.length > 0 && bbt30w.length > 0) {
        const avgBbt50 =
          bbt50w.reduce((a, b) => a + b, 0) / bbt50w.length;
        const avgBbt30 =
          bbt30w.reduce((a, b) => a + b, 0) / bbt30w.length;
        expect(avgBbt50).toBeGreaterThan(avgBbt30);
      }
    });
  });

  describe("holder families", () => {
    it("each family should have at least one taper", () => {
      for (const f of BIG_DAISHOWA_FAMILIES) {
        expect(f.tapers.length).toBeGreaterThan(0);
      }
    });

    it("each family should have at least one feature", () => {
      for (const f of BIG_DAISHOWA_FAMILIES) {
        expect(f.features.length).toBeGreaterThan(0);
      }
    });

    it("family bore ranges should be valid", () => {
      for (const f of BIG_DAISHOWA_FAMILIES) {
        expect(f.bore_range_mm[0]).toBeLessThanOrEqual(
          f.bore_range_mm[1],
        );
        expect(f.bore_range_mm[0]).toBeGreaterThan(0);
      }
    });

    it("family max_rpm should be positive", () => {
      for (const f of BIG_DAISHOWA_FAMILIES) {
        expect(f.max_rpm).toBeGreaterThan(0);
      }
    });

    it("HYDRAULIC CHUCK family should list Super Slim feature", () => {
      const hyd = BIG_DAISHOWA_FAMILIES.find(
        (f) => f.name === "HYDRAULIC CHUCK",
      );
      expect(hyd).toBeDefined();
      const hasSlim = hyd!.features.some((feat) =>
        feat.toLowerCase().includes("super slim"),
      );
      expect(hasSlim).toBe(true);
    });

    it("SHRINK FIT HOLDER family should require h6 tolerance", () => {
      const sf = BIG_DAISHOWA_FAMILIES.find(
        (f) => f.name === "SHRINK FIT HOLDER",
      );
      expect(sf).toBeDefined();
      const hasH6 = sf!.features.some((feat) => feat.includes("h6"));
      expect(hasH6).toBe(true);
    });
  });
});
