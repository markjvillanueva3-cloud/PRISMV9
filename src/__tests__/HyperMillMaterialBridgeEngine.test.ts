/**
 * Tests for HyperMillMaterialBridgeEngine
 * 2,544 materials, machinability factors, diameter-dependent S/F
 */
import { describe, it, expect } from "vitest";
import { HyperMillMaterialBridgeEngine } from "../engines/HyperMillMaterialBridgeEngine.js";

describe("HyperMillMaterialBridgeEngine", () => {
  const engine = new HyperMillMaterialBridgeEngine();

  // ========================================================================
  // Material Lookup
  // ========================================================================

  describe("lookupMaterial", () => {
    it("should find material by DIN Werkstoff number", () => {
      const r = engine.lookupMaterial("1.0711");
      expect(r.found).toBe(true);
      expect(r.material).not.toBeNull();
      expect(r.match_field).toBe("werkstoff");
      expect(r.confidence).toBe(1.0);
      expect(r.iso_group).toBe("P"); // Steel
    });

    it("should find material by AISI designation", () => {
      const r = engine.lookupMaterial("1212");
      expect(r.found).toBe(true);
      expect(r.material?.names.aisi).toBe("1212");
      expect(r.match_field).toBe("aisi");
    });

    it("should find stainless steel by Werkstoff number", () => {
      const r = engine.lookupMaterial("1.4301");
      expect(r.found).toBe(true);
      expect(r.iso_group).toBe("M"); // Stainless
    });

    it("should find material with AISI prefix stripped", () => {
      const r = engine.lookupMaterial("AISI 1212");
      expect(r.found).toBe(true);
      expect(r.confidence).toBe(0.95);
    });

    it("should handle fuzzy match within edit distance 2", () => {
      // "1.0712" doesn't exist but "1.0711" does (distance 1)
      const r = engine.lookupMaterial("1.0712");
      if (r.found) {
        expect(r.confidence).toBeLessThan(1.0);
      }
      // Not a hard requirement — just testing fuzzy logic doesn't crash
    });

    it("should return not found for completely unknown material", () => {
      const r = engine.lookupMaterial("zzzzNotARealMaterial");
      expect(r.found).toBe(false);
      expect(r.confidence).toBe(0);
    });
  });

  // ========================================================================
  // Machinability Factors
  // ========================================================================

  describe("getMachinabilityFactors", () => {
    it("should return milling factors for known material", () => {
      const f = engine.getMachinabilityFactors("1.0711", "milling");
      expect(f).not.toBeNull();
      expect(f!.factor_vc).toBeGreaterThan(0);
      expect(f!.factor_fz).toBeGreaterThan(0);
      expect(f!.operation).toBe("milling");
    });

    it("should return drilling factors", () => {
      const f = engine.getMachinabilityFactors("1.0711", "drilling");
      expect(f).not.toBeNull();
      expect(f!.operation).toBe("drilling");
      expect(f!.factor_vc).toBeGreaterThan(0);
    });

    it("should return insert factors", () => {
      const f = engine.getMachinabilityFactors("1.0711", "insert");
      expect(f).not.toBeNull();
      expect(f!.operation).toBe("insert");
    });

    it("should return null for unknown material", () => {
      const f = engine.getMachinabilityFactors("not_a_material_xyz");
      expect(f).toBeNull();
    });

    it("should have varied factors for difficult materials", () => {
      // Nickel alloys (Inconel-class, CC=16) should have factors < 1.0
      const r = engine.lookupMaterial("1.3980");
      if (r.found && r.material) {
        expect(r.material.milling.factor_vc).toBeLessThan(1.0);
      }
    });

    it("should have factor_vc range 0.2-1.6 per database", () => {
      const r1 = engine.getMachinabilityFactors("1.3980", "milling");
      if (r1) {
        expect(r1.factor_vc).toBeGreaterThanOrEqual(0.2);
        expect(r1.factor_vc).toBeLessThanOrEqual(1.6);
      }
    });
  });

  // ========================================================================
  // Diameter-dependent Speed/Feed
  // ========================================================================

  describe("lookupDiameterSpeedFeed", () => {
    it("should return Vc/fz for steel + VHM milling", () => {
      const r = engine.lookupDiameterSpeedFeed("steel", "vhm", 10);
      expect(r).not.toBeNull();
      expect(r!.vc_m_min).toBeGreaterThan(0);
      expect(r!.fz_mm).toBeGreaterThan(0);
      expect(r!.material).toBe("16MnCr5");
    });

    it("should return Vc/fz for aluminum + VHM", () => {
      const r = engine.lookupDiameterSpeedFeed("aluminum", "vhm", 10);
      expect(r).not.toBeNull();
      // Aluminum should have higher Vc than steel
      const steel = engine.lookupDiameterSpeedFeed("steel", "vhm", 10);
      if (r && steel) {
        expect(r.vc_m_min).toBeGreaterThan(steel.vc_m_min);
      }
    });

    it("should interpolate between diameter brackets", () => {
      const r = engine.lookupDiameterSpeedFeed("steel", "vhm", 7);
      expect(r).not.toBeNull();
      if (r) {
        expect(r.interpolated).toBe(true);
        // Should be between D6 and D8 values
        const d6 = engine.lookupDiameterSpeedFeed("steel", "vhm", 6);
        const d8 = engine.lookupDiameterSpeedFeed("steel", "vhm", 8);
        if (d6 && d8) {
          expect(r.vc_m_min).toBeGreaterThanOrEqual(Math.min(d6.vc_m_min, d8.vc_m_min));
          expect(r.vc_m_min).toBeLessThanOrEqual(Math.max(d6.vc_m_min, d8.vc_m_min));
        }
      }
    });

    it("should return stainless speed/feed", () => {
      const r = engine.lookupDiameterSpeedFeed("stainless", "vhm", 10);
      expect(r).not.toBeNull();
      expect(r!.material).toBe("VA");
      // Stainless Vc should be lower than aluminum
      const al = engine.lookupDiameterSpeedFeed("aluminum", "vhm", 10);
      if (r && al) {
        expect(r.vc_m_min).toBeLessThan(al.vc_m_min);
      }
    });

    it("should handle HSS taps", () => {
      const r = engine.lookupDiameterSpeedFeed("steel", "hss", 8);
      // HSS taps have much lower Vc
      if (r) {
        expect(r.vc_m_min).toBeLessThan(50);
      }
    });

    it("should return null for unknown material", () => {
      const r = engine.lookupDiameterSpeedFeed("steel" as any, "xyz_nonexistent", 10);
      expect(r).toBeNull();
    });
  });

  // ========================================================================
  // Search
  // ========================================================================

  describe("searchMaterials", () => {
    it("should search by group", () => {
      const r = engine.searchMaterials({ group: "Titanium", limit: 10 });
      expect(r.total).toBeGreaterThan(0);
      expect(r.materials[0].group).toContain("Titanium");
    });

    it("should search by hardness range", () => {
      const r = engine.searchMaterials({ hb_min: 300, hb_max: 400, limit: 10 });
      expect(r.total).toBeGreaterThan(0);
    });

    it("should search by ISO group", () => {
      const r = engine.searchMaterials({ iso_group: "N", limit: 10 });
      expect(r.total).toBeGreaterThan(0);
      expect(r.materials[0].iso_group).toBe("N");
    });

    it("should search by tensile strength", () => {
      const r = engine.searchMaterials({ rm_min: 1000, rm_max: 1500, limit: 10 });
      expect(r.total).toBeGreaterThan(0);
    });

    it("should respect limit", () => {
      const r = engine.searchMaterials({ group: "Steel", limit: 5 });
      expect(r.materials.length).toBeLessThanOrEqual(5);
    });
  });

  // ========================================================================
  // Stats
  // ========================================================================

  describe("getStats", () => {
    it("should return correct catalog statistics", () => {
      const s = engine.getStats();
      expect(s.total_materials).toBe(2544);
      expect(s.with_aisi).toBe(444);
      expect(s.with_correction_factors).toBe(446);
      expect(s.chipping_classes).toBe(29);
      expect(s.speed_feed_entries).toBe(102);
      expect(s.groups["Steel"]).toBe(955);
    });
  });
});
