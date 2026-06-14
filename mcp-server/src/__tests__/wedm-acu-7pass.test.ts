/**
 * WEDM ACU 7-Pass Families Tests
 *
 * Tests for Mastercam FA-S ACU (Accuracy Priority) 7-pass E-code families
 * extracted from H:/prism/resources/MasterCam/MASTERCAM/mcamX8/compressed/common/SharedDefaults/wire/Power/Mitsubishi (FA-S).tech
 *
 * @module __tests__/wedm-acu-7pass
 */

import { describe, it, expect } from "vitest";
import {
  JM_DIE_ECODE_FAMILIES,
  selectECodeFamily,
  getECodeForPass,
  getShopFeedForPass,
  getShopOffsetForPass,
  type ECodeFamily,
} from "../data/jm-die-wedm-tech-tables.js";

describe("WEDM ACU 7-Pass Families (Mastercam FA-S)", () => {
  describe("Family Registration", () => {
    it("should have 5 E-code families registered", () => {
      expect(JM_DIE_ECODE_FAMILIES.length).toBe(5);
    });

    it("should include E952_acu_7pass_thin family", () => {
      const family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E952_acu_7pass_thin");
      expect(family).toBeDefined();
      expect(family!.num_passes).toBe(7);
      expect(family!.description).toContain("ACU");
      expect(family!.description).toContain("0.50");
    });

    it("should include E56xx_acu_7pass_thick family", () => {
      const family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E56xx_acu_7pass_thick");
      expect(family).toBeDefined();
      expect(family!.num_passes).toBe(7);
      expect(family!.description).toContain("ACU");
      expect(family!.description).toContain("1.00");
    });
  });

  describe("ACU 7-Pass Thin (0.50\" steel)", () => {
    let family: ECodeFamily;

    it("should find the thin ACU family", () => {
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E952_acu_7pass_thin")!;
      expect(family).toBeDefined();
    });

    it("should have correct CUT-pass E-codes E5601-E5607 (952 is the lead-in approach, NOT pass 1 — per raw FA-S .tech record 1)", () => {
      // CORRECTED 2026-06-02: the raw Mitsubishi (FA-S).tech XML shows the 0.50" 7-pass config as
      // epac "952, 5601..5607" with 7 offsets/registers for the 7 CUT passes. 952 is <approach>,
      // so the 7 cut passes are E5601..E5607 — the prior expectation (E952 pass1, dropping E5607)
      // emitted the approach as a cut pass and lost the finest skim.
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E952_acu_7pass_thin")!;
      expect(getECodeForPass(family, 1)).toBe("E5601");
      expect(getECodeForPass(family, 2)).toBe("E5602");
      expect(getECodeForPass(family, 3)).toBe("E5603");
      expect(getECodeForPass(family, 4)).toBe("E5604");
      expect(getECodeForPass(family, 5)).toBe("E5605");
      expect(getECodeForPass(family, 6)).toBe("E5606");
      expect(getECodeForPass(family, 7)).toBe("E5607");
      // offset/E-code alignment: rough cut E5601 carries the largest offset (0.00935"), finest E5607 the smallest (0.00520")
      expect(getShopOffsetForPass(family, 1)).toBeCloseTo(0.00935 * 25.4, 3);
      expect(getShopOffsetForPass(family, 7)).toBeCloseTo(0.00520 * 25.4, 3);
    });

    it("should have increasing feed rates across skim passes", () => {
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E952_acu_7pass_thin")!;
      const pass1Feed = getShopFeedForPass(family, 1);
      const pass2Feed = getShopFeedForPass(family, 2);
      expect(pass1Feed).toBeLessThan(pass2Feed!); // Rough is slower than first skim
    });

    it("should have decreasing offsets across passes", () => {
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E952_acu_7pass_thin")!;
      const offset1 = getShopOffsetForPass(family, 1);
      const offset7 = getShopOffsetForPass(family, 7);
      expect(offset1).toBeGreaterThan(offset7); // Rough has larger offset than final skim
    });

    it("should apply to D2 tool steel", () => {
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E952_acu_7pass_thin")!;
      expect(family.materials).toContain("D2");
      expect(family.materials).toContain("A2");
      expect(family.materials).toContain("S7");
    });
  });

  describe("ACU 7-Pass Thick (1.00\" steel)", () => {
    let family: ECodeFamily;

    it("should find the thick ACU family", () => {
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E56xx_acu_7pass_thick")!;
      expect(family).toBeDefined();
    });

    it("should have E56xx series E-codes", () => {
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E56xx_acu_7pass_thick")!;
      expect(getECodeForPass(family, 1)).toBe("E5611");
      expect(getECodeForPass(family, 2)).toBe("E5612");
      expect(getECodeForPass(family, 7)).toBe("E5617");
    });

    it("should have 7 passes", () => {
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E56xx_acu_7pass_thick")!;
      expect(family.passes.length).toBe(7);
    });

    it("should be 2-axis (no UV taper)", () => {
      family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E56xx_acu_7pass_thick")!;
      expect(family.axes).toBe(2);
    });
  });

  describe("Family Selection Logic", () => {
    it("should select ACU thin for ultra-fine finish on thin material", () => {
      const family = selectECodeFamily({
        material: "D2",
        target_ra_um: 0.18, // < 0.2 µm triggers ACU
        thickness_mm: 12.7, // 0.50"
      });
      expect(family).toBeDefined();
      expect(family!.id).toBe("E952_acu_7pass_thin");
    });

    it("should select ACU thick for ultra-fine finish on thick material", () => {
      const family = selectECodeFamily({
        material: "D2",
        target_ra_um: 0.15, // < 0.2 µm triggers ACU
        thickness_mm: 25.4, // 1.00" - thick
      });
      expect(family).toBeDefined();
      expect(family!.id).toBe("E56xx_acu_7pass_thick");
    });

    it("should select ACU for extremely tight tolerance", () => {
      const family = selectECodeFamily({
        material: "A2",
        tolerance_mm: 0.002, // < 0.003mm triggers ACU
        thickness_mm: 20,
      });
      expect(family).toBeDefined();
      expect(family!.id).toContain("acu");
    });

    it("should select heavy 5-pass for tight but not ultra-tight tolerance", () => {
      const family = selectECodeFamily({
        material: "D2",
        tolerance_mm: 0.004, // < 0.005mm but >= 0.003mm
        target_ra_um: 0.4,  // Not ultra-fine
      });
      expect(family).toBeDefined();
      expect(family!.id).toBe("E12xx_heavy_5pass");
    });

    it("should select standard 4-pass for normal work", () => {
      const family = selectECodeFamily({
        material: "D2",
        tolerance_mm: 0.01,
        target_ra_um: 0.8,
      });
      expect(family).toBeDefined();
      expect(family!.id).toBe("E12xx_standard_4pass");
    });

    it("should select taper family for taper angle > 0", () => {
      const family = selectECodeFamily({
        material: "D2",
        taper_angle_deg: 2.5,
      });
      expect(family).toBeDefined();
      expect(family!.id).toBe("E28xx_taper_5pass");
    });
  });

  describe("Ra Surface Finish Progression", () => {
    it("ACU thin achieves Ra 7 µin (0.18 µm) by pass 7", () => {
      // Based on Mastercam FA-S tech file: Ra 50 → 38 → 36 → 34 → 12 → 9 → 7 µin
      const family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E952_acu_7pass_thin")!;
      expect(family.description).toContain("Ra 7");
    });

    it("ACU thick achieves Ra 7 µin (0.18 µm) by pass 7", () => {
      // Based on Mastercam FA-S tech file: Ra 60 → 46 → 42 → 38 → 12 → 9 → 7 µin
      const family = JM_DIE_ECODE_FAMILIES.find(f => f.id === "E56xx_acu_7pass_thick")!;
      expect(family.description).toContain("Ra 7");
    });
  });
});
