/**
 * LathePartClassifierEngine Test Suite (MS3 U-LPS01)
 */
import { describe, it, expect } from "vitest";
import { lathePartClassifierEngine } from "../engines/LathePartClassifierEngine.js";

describe("LathePartClassifierEngine", () => {
  describe("classify()", () => {
    it("classifies long/thin part as shaft (L/D > 3)", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 200,
        max_od_mm: 25, // L/D = 8
      });
      expect(r.family).toBe("shaft");
    });

    it("classifies large OD / short length as flange", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 15,
        max_od_mm: 100, // L/D = 0.15
        has_bolt_circle: true,
      });
      expect(["flange", "disc"]).toContain(r.family);
    });

    it("classifies thin flat plate as disc", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 5,
        max_od_mm: 100, // L/D = 0.05
      });
      expect(["disc", "flange"]).toContain(r.family);
    });

    it("classifies through-bore hollow cylinder as sleeve", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 80,
        max_od_mm: 50,
        bore_id_mm: 35,
      });
      expect(["sleeve", "bushing", "tube_hollow"]).toContain(r.family);
    });

    it("classifies forging stock → G73 roughing", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 100,
        max_od_mm: 60,
        stock_form: "forging",
      });
      expect(r.roughing_cycle).toBe("G73");
    });

    it("classifies casting → G73 roughing", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 80,
        max_od_mm: 70,
        stock_form: "casting",
      });
      expect(r.roughing_cycle).toBe("G73");
    });

    it("bar stock → G71 roughing", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 100,
        max_od_mm: 40,
        stock_form: "bar",
      });
      expect(["G71", "G71_G72"]).toContain(r.roughing_cycle);
    });

    it("thin wall (t < 2mm) flags thin_wall_risk", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 60,
        max_od_mm: 50,
        bore_id_mm: 48, // 1mm wall
        wall_thickness_mm: 1.0,
      });
      expect(r.thin_wall_risk).toBe(true);
    });

    it("selects workholding appropriate for stock", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 200,
        max_od_mm: 25,
        stock_form: "bar",
      });
      expect(["3_jaw_hard", "3_jaw_soft", "collet", "between_centers"]).toContain(r.workholding_default);
    });

    it("provides reasoning strings", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 200,
        max_od_mm: 25,
      });
      expect(r.reasoning.length).toBeGreaterThan(0);
    });

    it("confidence is in [0,1]", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 100,
        max_od_mm: 50,
      });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it("sequence template is a non-empty array", () => {
      const r = lathePartClassifierEngine.classify({
        length_mm: 200,
        max_od_mm: 25,
      });
      expect(Array.isArray(r.sequence_template)).toBe(true);
      expect(r.sequence_template.length).toBeGreaterThan(0);
    });
  });

  describe("classifyBatch()", () => {
    it("classifies multiple parts at once", () => {
      const parts = [
        { length_mm: 200, max_od_mm: 25 },
        { length_mm: 10, max_od_mm: 100 },
        { length_mm: 80, max_od_mm: 50, bore_id_mm: 35 },
      ];
      const results = lathePartClassifierEngine.classifyBatch(parts);
      expect(results.length).toBe(3);
    });
  });

  describe("listFamilies() / getFamilyProfile()", () => {
    it("lists at least 10 families", () => {
      const list = lathePartClassifierEngine.listFamilies();
      expect(list.length).toBeGreaterThanOrEqual(10);
    });

    it("every family has workholding + roughing defaults", () => {
      const list = lathePartClassifierEngine.listFamilies();
      list.forEach((f) => {
        expect(f.workholding).toBeDefined();
        expect(f.roughing).toBeDefined();
      });
    });

    it("getFamilyProfile returns detail", () => {
      const profile = lathePartClassifierEngine.getFamilyProfile("shaft");
      expect(profile).toBeDefined();
      expect(profile.family).toBe("shaft");
    });
  });
});
