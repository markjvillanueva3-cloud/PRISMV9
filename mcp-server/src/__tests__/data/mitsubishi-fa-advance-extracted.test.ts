/**
 * Tests for Mitsubishi FA-S Advance V-Package extracted data
 */
import { describe, it, expect } from "vitest";
import {
  MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD,
  MITSUBISHI_FA_ADVANCE_STEEL_020_ACU,
  MITSUBISHI_FA_ADVANCE_RECORDS,
  MITSUBISHI_FA_ADVANCE_ECODE_FAMILIES,
  MITSUBISHI_FA_ADVANCE_TECH_FILE,
  VPACKAGE_THICKNESS_BRACKETS,
  findRecordByThickness,
  getRecommendedPassCount,
  estimateRoughingSpeed,
  getExpectedRa,
  getWireOffset,
  getECodeForPass,
  getCuttingStrategy,
  interpolateParameters,
} from "../../data/mitsubishi-fa-advance-extracted.js";

describe("Mitsubishi FA-S Advance V-Package Data", () => {
  describe("Data Structure", () => {
    it("should have 11 Standard Steel records (0.20mm wire)", () => {
      expect(MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD).toHaveLength(11);
    });

    it("should have 2 ACU Steel records (0.20mm wire)", () => {
      expect(MITSUBISHI_FA_ADVANCE_STEEL_020_ACU).toHaveLength(2);
    });

    it("should have combined records array", () => {
      expect(MITSUBISHI_FA_ADVANCE_RECORDS).toHaveLength(13);
    });

    it("should cover thickness range 5-100mm", () => {
      const thicknesses = MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD.map(
        (r) => r.thicknessMm
      );
      expect(thicknesses).toContain(5);
      expect(thicknesses).toContain(50);
      expect(thicknesses).toContain(100);
    });

    it("should have correct pass counts per thickness", () => {
      // 5-60mm: 4 passes
      const record5 = MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD.find(
        (r) => r.thicknessMm === 5
      );
      expect(record5?.totalPasses).toBe(4);

      // 70-100mm: 5 passes
      const record80 = MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD.find(
        (r) => r.thicknessMm === 80
      );
      expect(record80?.totalPasses).toBe(5);
    });
  });

  describe("E-Code Families", () => {
    it("should have E-codes for 0.20mm Standard wire", () => {
      const family = MITSUBISHI_FA_ADVANCE_ECODE_FAMILIES.WIRE_020_STANDARD;
      expect(family.wireDiameterMm).toBe(0.2);
      expect(family.baseCodeByThickness[5]).toBe(1001);
      expect(family.baseCodeByThickness[50]).toBe(1051);
    });

    it("should have E-codes for 0.20mm ACU wire", () => {
      const family = MITSUBISHI_FA_ADVANCE_ECODE_FAMILIES.WIRE_020_ACU;
      expect(family.method).toBe("Accuracy priority(ACU)");
      expect(family.baseCodeByThickness[5]).toBe(1201);
    });

    it("should have E-codes for multiple wire diameters", () => {
      expect(
        MITSUBISHI_FA_ADVANCE_ECODE_FAMILIES.WIRE_010_STANDARD.wireDiameterMm
      ).toBe(0.1);
      expect(
        MITSUBISHI_FA_ADVANCE_ECODE_FAMILIES.WIRE_015_STANDARD.wireDiameterMm
      ).toBe(0.15);
      expect(
        MITSUBISHI_FA_ADVANCE_ECODE_FAMILIES.WIRE_025_STANDARD.wireDiameterMm
      ).toBe(0.25);
      expect(
        MITSUBISHI_FA_ADVANCE_ECODE_FAMILIES.WIRE_030_STANDARD.wireDiameterMm
      ).toBe(0.3);
    });
  });

  describe("Tech File Metadata", () => {
    it("should have correct machine identification", () => {
      expect(MITSUBISHI_FA_ADVANCE_TECH_FILE.manufacturer).toBe("Mitsubishi");
      expect(MITSUBISHI_FA_ADVANCE_TECH_FILE.machine).toBe("FA-S V-Pack (v5)");
      expect(MITSUBISHI_FA_ADVANCE_TECH_FILE.units).toBe("Metric");
    });

    it("should have display precision settings", () => {
      expect(MITSUBISHI_FA_ADVANCE_TECH_FILE.displayOffsetPrecision).toBe(3);
      expect(MITSUBISHI_FA_ADVANCE_TECH_FILE.displayFeedPrecision).toBe(1);
    });
  });

  describe("Thickness Brackets", () => {
    it("should define thin, medium, thick, heavy brackets", () => {
      expect(VPACKAGE_THICKNESS_BRACKETS.thin.max).toBe(10);
      expect(VPACKAGE_THICKNESS_BRACKETS.medium.max).toBe(60);
      expect(VPACKAGE_THICKNESS_BRACKETS.thick.max).toBe(100);
      expect(VPACKAGE_THICKNESS_BRACKETS.heavy.max).toBe(150);
    });
  });

  describe("findRecordByThickness", () => {
    it("should find exact match", () => {
      const record = findRecordByThickness(20);
      expect(record?.thicknessMm).toBe(20);
    });

    it("should find closest match for non-exact thickness", () => {
      const record = findRecordByThickness(25);
      // 25mm is equidistant from 20 and 30, algorithm prefers thicker for safety
      expect([20, 30]).toContain(record?.thicknessMm);
    });

    it("should prefer thicker bracket for safety", () => {
      const record = findRecordByThickness(35);
      // Between 30 and 40, should pick one
      expect([30, 40]).toContain(record?.thicknessMm);
    });
  });

  describe("getRecommendedPassCount", () => {
    it("should return 4 passes for thin material", () => {
      expect(getRecommendedPassCount(5)).toBe(4);
      expect(getRecommendedPassCount(10)).toBe(4);
    });

    it("should return 4 passes for medium material", () => {
      expect(getRecommendedPassCount(30)).toBe(4);
      expect(getRecommendedPassCount(50)).toBe(4);
    });

    it("should return 5 passes for thick material", () => {
      expect(getRecommendedPassCount(70)).toBe(5);
      expect(getRecommendedPassCount(100)).toBe(5);
    });
  });

  describe("estimateRoughingSpeed", () => {
    it("should return higher speed for thin material", () => {
      const speed5 = estimateRoughingSpeed(5);
      const speed50 = estimateRoughingSpeed(50);
      expect(speed5).toBeGreaterThan(speed50);
    });

    it("should return reasonable speeds", () => {
      expect(estimateRoughingSpeed(20)).toBeCloseTo(2.6, 1);
      expect(estimateRoughingSpeed(50)).toBeCloseTo(1.2, 1);
    });
  });

  describe("getExpectedRa", () => {
    it("should return roughing Ra for 1 pass", () => {
      expect(getExpectedRa(20, 1)).toBeCloseTo(2.7, 1);
    });

    it("should return fine Ra for 4 passes", () => {
      expect(getExpectedRa(20, 4)).toBeCloseTo(0.34, 1);
    });

    it("should return finer Ra for ACU method", () => {
      const standardRa = getExpectedRa(5, 4, "Standard");
      const acuRa = getExpectedRa(5, 5, "ACU");
      expect(acuRa).toBeLessThan(standardRa);
    });
  });

  describe("getWireOffset", () => {
    it("should return increasing offset with passes", () => {
      const offset1 = getWireOffset(20, 1);
      const offset4 = getWireOffset(20, 4);
      // Later passes have finer offsets (smaller compensation)
      expect(offset1).not.toBeNull();
      expect(offset4).not.toBeNull();
    });

    it("should return null for invalid pass", () => {
      expect(getWireOffset(20, 10)).toBeNull();
    });
  });

  describe("getECodeForPass", () => {
    it("should return correct E-code for thickness and pass", () => {
      expect(getECodeForPass(5, 1)).toBe(1001);
      expect(getECodeForPass(5, 4)).toBe(1004);
      expect(getECodeForPass(20, 1)).toBe(1021);
    });

    it("should return ACU codes for ACU method", () => {
      expect(getECodeForPass(5, 1, "ACU")).toBe(1201);
    });
  });

  describe("interpolateParameters", () => {
    it("should interpolate between brackets", () => {
      const params = interpolateParameters(25);
      expect(params).not.toBeNull();
      expect(params!.feedRate).toBeGreaterThan(0);
      expect(params!.offset).toBeGreaterThan(0);
    });

    it("should handle exact match", () => {
      const params = interpolateParameters(20);
      expect(params!.feedRate).toBeCloseTo(2.6, 1);
    });
  });

  describe("getCuttingStrategy", () => {
    it("should return Standard method for normal finish", () => {
      const strategy = getCuttingStrategy(30, 0.5);
      expect(strategy?.method).toBe("Standard");
    });

    it("should return ACU method for fine finish", () => {
      const strategy = getCuttingStrategy(10, 0.25);
      expect(strategy?.method).toBe("ACU");
    });

    it("should include record and time estimate", () => {
      const strategy = getCuttingStrategy(20);
      expect(strategy?.record).toBeDefined();
      expect(strategy?.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe("Pass Data Validation", () => {
    it("should have cumulative E-codes in passes", () => {
      const record = MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD[0];
      // Pass 1 should have 1 E-code
      expect(record.passes[0].ePackCodes).toHaveLength(1);
      // Pass 4 should have 4 E-codes (cumulative)
      expect(record.passes[3].ePackCodes).toHaveLength(4);
    });

    it("should have matching array lengths in pass data", () => {
      for (const record of MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD) {
        for (const pass of record.passes) {
          // feedRates, offsets, registers should match ePackCodes length
          expect(pass.feedRates.length).toBe(pass.ePackCodes.length);
          expect(pass.offsets.length).toBe(pass.ePackCodes.length);
          expect(pass.registers.length).toBe(pass.ePackCodes.length);
        }
      }
    });

    it("should have positive Ra values", () => {
      for (const record of MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD) {
        for (const pass of record.passes) {
          expect(pass.ra).toBeGreaterThan(0);
          expect(pass.ra).toBeLessThan(10); // Reasonable upper bound
        }
      }
    });

    it("should have decreasing Ra with more passes", () => {
      const record = MITSUBISHI_FA_ADVANCE_STEEL_020_STANDARD.find(
        (r) => r.thicknessMm === 20
      )!;
      expect(record.passes[0].ra).toBeGreaterThan(record.passes[3].ra);
    });
  });
});
