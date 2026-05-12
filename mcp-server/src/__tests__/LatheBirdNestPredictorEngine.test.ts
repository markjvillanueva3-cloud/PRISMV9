/**
 * LatheBirdNestPredictorEngine Test Suite (LATHE-PRO-MS7)
 */
import { describe, it, expect } from "vitest";
import { latheBirdNestPredictorEngine } from "../engines/LatheBirdNestPredictorEngine.js";

describe("LatheBirdNestPredictorEngine", () => {
  describe("predict()", () => {
    it("returns low risk for cast iron with aggressive chipbreaker", () => {
      const r = latheBirdNestPredictorEngine.predict({
        material_iso_group: "K",
        vc_m_min: 150,
        feed_mm_rev: 0.25,
        doc_mm: 2,
        clearance_length_mm: 200,
        length_over_diameter: 3,
        chipbreaker: "aggressive",
        coolant: "flood",
      });
      expect(r.risk_level).toBe("low");
      expect(r.risk_score).toBeLessThan(0.35);
    });

    it("returns high or severe for stainless + flat insert + dry", () => {
      const r = latheBirdNestPredictorEngine.predict({
        material_iso_group: "M",
        vc_m_min: 150,
        feed_mm_rev: 0.1,
        doc_mm: 2,
        clearance_length_mm: 100,
        length_over_diameter: 8,
        chipbreaker: "flat",
        coolant: "dry",
      });
      expect(["high", "severe"]).toContain(r.risk_level);
      expect(r.risk_score).toBeGreaterThan(0.55);
    });

    it("coolant TSC reduces risk vs dry", () => {
      const base = {
        material_iso_group: "M" as const,
        vc_m_min: 150,
        feed_mm_rev: 0.12,
        doc_mm: 2,
        clearance_length_mm: 100,
        length_over_diameter: 6,
        chipbreaker: "light" as const,
      };
      const dry = latheBirdNestPredictorEngine.predict({ ...base, coolant: "dry" });
      const tsc = latheBirdNestPredictorEngine.predict({ ...base, coolant: "tsc" });
      expect(tsc.risk_score).toBeLessThan(dry.risk_score);
    });

    it("aggressive chipbreaker reduces risk vs flat", () => {
      const base = {
        material_iso_group: "P" as const,
        vc_m_min: 150,
        feed_mm_rev: 0.15,
        doc_mm: 2,
        clearance_length_mm: 100,
        length_over_diameter: 4,
        coolant: "flood" as const,
      };
      const flat = latheBirdNestPredictorEngine.predict({ ...base, chipbreaker: "flat" });
      const agg = latheBirdNestPredictorEngine.predict({ ...base, chipbreaker: "aggressive" });
      expect(agg.risk_score).toBeLessThan(flat.risk_score);
    });

    it("longer L/D increases wrap geometry factor", () => {
      const shortPart = latheBirdNestPredictorEngine.predict({
        material_iso_group: "N",
        vc_m_min: 250,
        feed_mm_rev: 0.15,
        doc_mm: 1,
        clearance_length_mm: 200,
        length_over_diameter: 2,
        chipbreaker: "light",
        coolant: "flood",
      });
      const longPart = latheBirdNestPredictorEngine.predict({
        material_iso_group: "N",
        vc_m_min: 250,
        feed_mm_rev: 0.15,
        doc_mm: 1,
        clearance_length_mm: 200,
        length_over_diameter: 10,
        chipbreaker: "light",
        coolant: "flood",
      });
      expect(longPart.factors.wrap_geom_factor).toBeGreaterThan(shortPart.factors.wrap_geom_factor);
    });

    it("predicted chip length scales inversely with feed", () => {
      const base = {
        material_iso_group: "M" as const,
        vc_m_min: 150,
        doc_mm: 2,
        clearance_length_mm: 100,
        length_over_diameter: 3,
        chipbreaker: "light" as const,
        coolant: "flood" as const,
      };
      const lowFeed = latheBirdNestPredictorEngine.predict({ ...base, feed_mm_rev: 0.08 });
      const highFeed = latheBirdNestPredictorEngine.predict({ ...base, feed_mm_rev: 0.3 });
      expect(highFeed.predicted_chip_length_mm).toBeLessThan(lowFeed.predicted_chip_length_mm);
    });

    it("mitigations include chipbreaker upgrade when flat insert used", () => {
      const r = latheBirdNestPredictorEngine.predict({
        material_iso_group: "P",
        vc_m_min: 150,
        feed_mm_rev: 0.2,
        doc_mm: 2,
        clearance_length_mm: 120,
        length_over_diameter: 4,
        chipbreaker: "flat",
        coolant: "flood",
      });
      expect(r.mitigations.some((m) => m.action.toLowerCase().includes("chipbreaker"))).toBe(true);
    });

    it("severe risk includes safety notes", () => {
      const r = latheBirdNestPredictorEngine.predict({
        material_iso_group: "M",
        vc_m_min: 200,
        feed_mm_rev: 0.05,
        doc_mm: 2,
        clearance_length_mm: 50,
        length_over_diameter: 12,
        chipbreaker: "flat",
        coolant: "dry",
      });
      if (r.risk_level === "severe") {
        expect(r.safety_notes.length).toBeGreaterThan(0);
      }
    });

    it("inverted mounting reduces risk", () => {
      const base = {
        material_iso_group: "N" as const,
        vc_m_min: 250,
        feed_mm_rev: 0.15,
        doc_mm: 2,
        clearance_length_mm: 100,
        length_over_diameter: 5,
        chipbreaker: "light" as const,
        coolant: "flood" as const,
      };
      const normal = latheBirdNestPredictorEngine.predict({ ...base, inverted_mounting: false });
      const inverted = latheBirdNestPredictorEngine.predict({ ...base, inverted_mounting: true });
      expect(inverted.risk_score).toBeLessThanOrEqual(normal.risk_score);
    });

    it("risk score in [0, 1]", () => {
      const r = latheBirdNestPredictorEngine.predict({
        material_iso_group: "M",
        vc_m_min: 150,
        feed_mm_rev: 0.1,
        doc_mm: 2,
        clearance_length_mm: 100,
        length_over_diameter: 5,
        chipbreaker: "light",
        coolant: "flood",
      });
      expect(r.risk_score).toBeGreaterThanOrEqual(0);
      expect(r.risk_score).toBeLessThanOrEqual(1);
    });

    it("explicit ductility override works", () => {
      const r = latheBirdNestPredictorEngine.predict({
        ductility: "very_high",
        vc_m_min: 150,
        feed_mm_rev: 0.1,
        doc_mm: 2,
        clearance_length_mm: 100,
        length_over_diameter: 5,
        chipbreaker: "flat",
        coolant: "dry",
      });
      expect(r.factors.ductility_factor).toBeCloseTo(1.0, 1);
    });
  });

  describe("getStats()", () => {
    it("reports model and risk levels", () => {
      const s = latheBirdNestPredictorEngine.getStats();
      expect(s.factors.length).toBeGreaterThan(4);
      expect(s.risk_levels).toContain("severe");
    });
  });
});
