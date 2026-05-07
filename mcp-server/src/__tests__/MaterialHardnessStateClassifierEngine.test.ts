/**
 * MaterialHardnessStateClassifierEngine — LATHE-PROD-READY-MS0 U-LPR-HARDNESS
 *
 * Tests 5-band hardness classification and Sandvik-cited kc1.1 coefficients.
 */

import { describe, it, expect } from "vitest";
import {
  MaterialHardnessStateClassifierEngine,
} from "../engines/MaterialHardnessStateClassifierEngine.js";

describe("MaterialHardnessStateClassifierEngine", () => {
  describe("hbToHrc conversion", () => {
    it("converts 200 HB to approximately 14 HRC", () => {
      const hrc = MaterialHardnessStateClassifierEngine.hbToHrc(200);
      expect(hrc).toBeGreaterThan(10);
      expect(hrc).toBeLessThan(20);
    });

    it("converts 300 HB to approximately 32 HRC", () => {
      const hrc = MaterialHardnessStateClassifierEngine.hbToHrc(300);
      expect(hrc).toBeGreaterThan(28);
      expect(hrc).toBeLessThan(36);
    });

    it("returns 0 for very low HB", () => {
      const hrc = MaterialHardnessStateClassifierEngine.hbToHrc(50);
      expect(hrc).toBe(0);
    });

    it("caps at 68 for very high HB", () => {
      const hrc = MaterialHardnessStateClassifierEngine.hbToHrc(800);
      expect(hrc).toBe(68);
    });
  });

  describe("classifyBand", () => {
    it("classifies <20 HRC as soft", () => {
      expect(MaterialHardnessStateClassifierEngine.classifyBand(15)).toBe("soft");
    });

    it("classifies 20-35 HRC as medium", () => {
      expect(MaterialHardnessStateClassifierEngine.classifyBand(28)).toBe("medium");
    });

    it("classifies 35-45 HRC as pre_hard", () => {
      expect(MaterialHardnessStateClassifierEngine.classifyBand(40)).toBe("pre_hard");
    });

    it("classifies 45-58 HRC as hard", () => {
      expect(MaterialHardnessStateClassifierEngine.classifyBand(52)).toBe("hard");
    });

    it("classifies >58 HRC as ultra_hard", () => {
      expect(MaterialHardnessStateClassifierEngine.classifyBand(62)).toBe("ultra_hard");
    });
  });

  describe("findMaterial", () => {
    it("finds 4140 by exact name", () => {
      const mat = MaterialHardnessStateClassifierEngine.findMaterial("4140");
      expect(mat).not.toBeNull();
      expect(mat!.name).toBe("4140");
    });

    it("finds D2 by alias", () => {
      const mat = MaterialHardnessStateClassifierEngine.findMaterial("AISI D2");
      expect(mat).not.toBeNull();
      expect(mat!.name).toBe("D2");
    });

    it("finds M2 by partial match", () => {
      const mat = MaterialHardnessStateClassifierEngine.findMaterial("M2 HSS hardened");
      expect(mat).not.toBeNull();
      expect(mat!.name).toBe("M2");
    });

    it("returns null for unknown material", () => {
      const mat = MaterialHardnessStateClassifierEngine.findMaterial("unobtainium");
      expect(mat).toBeNull();
    });
  });

  describe("classify — Sandvik-cited coefficients", () => {
    it("classifies 4140 annealed with correct kc1.1", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
        hardness_hrc: 18,
      });
      expect(result.kc1_1_MPa).toBeCloseTo(1990, -1);
      expect(result.band).toBe("soft");
      expect(result.iso_group).toBe("P");
    });

    it("classifies 4140 Q&T 32HRC with correct kc1.1", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
        hardness_hrc: 32,
      });
      expect(result.kc1_1_MPa).toBeCloseTo(2260, -1);
      expect(result.band).toBe("medium");
    });

    it("classifies 4140 case-hard 57HRC with correct kc1.1", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
        hardness_hrc: 57,
      });
      expect(result.kc1_1_MPa).toBeGreaterThan(2700);
      expect(result.kc1_1_MPa).toBeLessThan(2850);
      expect(result.band).toBe("hard");
    });

    it("classifies D2 annealed with correct kc1.1", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "D2",
        hardness_hrc: 22,
      });
      expect(result.kc1_1_MPa).toBeCloseTo(2100, -1);
      expect(result.iso_group).toBe("H");
    });

    it("classifies D2 60HRC with correct kc1.1", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "D2",
        hardness_hrc: 60,
      });
      expect(result.kc1_1_MPa).toBeCloseTo(3400, -1);
      expect(result.band).toBe("ultra_hard");
    });

    it("interpolates kc1.1 for intermediate hardness", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
        hardness_hrc: 25,
      });
      expect(result.kc1_1_MPa).toBeGreaterThan(1990);
      expect(result.kc1_1_MPa).toBeLessThan(2260);
    });
  });

  describe("classify — JM Die materials", () => {
    const jmDieMaterials = ["M2", "D2", "S7", "A2", "H13", "4140", "4340", "8620"];

    for (const mat of jmDieMaterials) {
      it(`classifies ${mat} without errors`, () => {
        const result = MaterialHardnessStateClassifierEngine.classify({
          material_name: mat,
          hardness_hrc: 40,
        });
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.kc1_1_MPa).toBeGreaterThan(1000);
        expect(result.source).toContain("Sandvik");
      });
    }
  });

  describe("classify — recommendations", () => {
    it("recommends coated carbide for soft materials", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
        hardness_hrc: 18,
      });
      expect(result.recommended_insert_material).toContain("carbide");
    });

    it("recommends CBN for hard materials", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "D2",
        hardness_hrc: 58,
      });
      expect(result.recommended_insert_material).toContain("CBN");
    });

    it("recommends PCBN for ultra-hard materials", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "D2",
        hardness_hrc: 64,
      });
      expect(result.recommended_insert_material).toContain("CBN");
      expect(result.warnings.some(w => w.includes("Ultra-hard"))).toBe(true);
    });
  });

  describe("classify — edge cases", () => {
    it("handles missing hardness with warning", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
      });
      expect(result.warnings.some(w => w.includes("assuming"))).toBe(true);
      expect(result.hardness_hrc).toBe(25);
    });

    it("handles unknown material with generic fallback", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "mystery steel",
        hardness_hrc: 45,
      });
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.warnings.some(w => w.includes("not found"))).toBe(true);
      expect(result.kc1_1_MPa).toBeGreaterThan(0);
    });

    it("converts HB input to HRC", () => {
      const result = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
        hardness_hb: 300,
      });
      expect(result.hardness_hrc).toBeGreaterThan(25);
      expect(result.hardness_hrc).toBeLessThan(40);
    });
  });

  describe("getJMDieMaterials", () => {
    it("returns list of JM Die materials", () => {
      const materials = MaterialHardnessStateClassifierEngine.getJMDieMaterials();
      expect(materials).toContain("D2");
      expect(materials).toContain("M2");
      expect(materials).toContain("4140");
      expect(materials.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("cutting speed recommendations", () => {
    it("soft materials allow higher speeds", () => {
      const soft = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
        hardness_hrc: 18,
      });
      const hard = MaterialHardnessStateClassifierEngine.classify({
        material_name: "4140",
        hardness_hrc: 55,
      });
      expect(soft.max_cutting_speed_m_min).toBeGreaterThan(hard.max_cutting_speed_m_min);
    });
  });
});
