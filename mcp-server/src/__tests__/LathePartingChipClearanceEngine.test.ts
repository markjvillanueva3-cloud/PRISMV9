/**
 * LathePartingChipClearanceEngine Test Suite (LATHE-PRO-MS7)
 */
import { describe, it, expect } from "vitest";
import { lathePartingChipClearanceEngine } from "../engines/LathePartingChipClearanceEngine.js";

describe("LathePartingChipClearanceEngine", () => {
  describe("evaluate()", () => {
    it("returns safe for shallow slot with adequate coolant", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 3,
        slot_depth_mm: 5,
        bar_od_mm: 50,
        feed_mm_rev: 0.05,
        vc_m_min: 120,
        coolant_pressure_bar: 40,
        coolant_targeted: true,
      });
      expect(r.verdict).toBe("safe");
    });

    it("high_risk or unsafe for very deep slot", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 2,
        slot_depth_mm: 30,
        bar_od_mm: 60,
        feed_mm_rev: 0.05,
        vc_m_min: 80,
        coolant_pressure_bar: 10,
      });
      expect(["high_risk", "unsafe"]).toContain(r.verdict);
    });

    it("computes aspect ratio correctly", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 4,
        slot_depth_mm: 20,
        bar_od_mm: 50,
        feed_mm_rev: 0.05,
        vc_m_min: 100,
        coolant_pressure_bar: 30,
      });
      expect(r.aspect_ratio).toBeCloseTo(5.0, 1);
    });

    it("higher coolant pressure increases jet reach", () => {
      const base = {
        blade_width_mm: 3,
        slot_depth_mm: 20,
        bar_od_mm: 60,
        feed_mm_rev: 0.05,
        vc_m_min: 100,
      };
      const lowP = lathePartingChipClearanceEngine.evaluate({ ...base, coolant_pressure_bar: 10 });
      const highP = lathePartingChipClearanceEngine.evaluate({ ...base, coolant_pressure_bar: 70 });
      expect(highP.coolant_reach_mm).toBeGreaterThan(lowP.coolant_reach_mm);
    });

    it("recommends peck cycle when aspect ratio high", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 2,
        slot_depth_mm: 20,
        bar_od_mm: 50,
        feed_mm_rev: 0.05,
        vc_m_min: 100,
        coolant_pressure_bar: 30,
      });
      expect(r.recommendations.some((rec) => rec.toLowerCase().includes("peck"))).toBe(true);
      expect(r.recommended_peck_count).toBeGreaterThan(1);
    });

    it("flags austenitic stainless as sticky", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 3,
        slot_depth_mm: 15,
        bar_od_mm: 40,
        feed_mm_rev: 0.05,
        vc_m_min: 80,
        coolant_pressure_bar: 20,
        material_iso_group: "M",
      });
      expect(r.risk_factors.some((rf) => rf.toLowerCase().includes("stainless"))).toBe(true);
    });

    it("aluminum flagged for long ductile chips", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 3,
        slot_depth_mm: 15,
        bar_od_mm: 40,
        feed_mm_rev: 0.05,
        vc_m_min: 300,
        coolant_pressure_bar: 20,
        material_iso_group: "N",
      });
      expect(r.risk_factors.some((rf) => rf.toLowerCase().includes("aluminum"))).toBe(true);
    });

    it("coolant_adequate true when reach >= depth", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 3,
        slot_depth_mm: 10,
        bar_od_mm: 40,
        feed_mm_rev: 0.05,
        vc_m_min: 100,
        coolant_pressure_bar: 50,
        nozzle_diameter_mm: 3,
        coolant_targeted: true,
      });
      expect(r.coolant_adequate).toBe(true);
    });

    it("suggests stepped blade or plunge-turn for extreme aspect", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 1.5,
        slot_depth_mm: 20,
        bar_od_mm: 40,
        feed_mm_rev: 0.04,
        vc_m_min: 80,
        coolant_pressure_bar: 20,
      });
      expect(
        r.recommendations.some(
          (rec) => rec.toLowerCase().includes("stepped") || rec.toLowerCase().includes("plunge")
        )
      ).toBe(true);
    });

    it("chip volume scales with mean diameter", () => {
      const small = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 3,
        slot_depth_mm: 10,
        bar_od_mm: 30,
        feed_mm_rev: 0.05,
        vc_m_min: 100,
        coolant_pressure_bar: 30,
      });
      const large = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 3,
        slot_depth_mm: 10,
        bar_od_mm: 80,
        feed_mm_rev: 0.05,
        vc_m_min: 100,
        coolant_pressure_bar: 30,
      });
      expect(large.chip_volume_per_peck_mm3).toBeGreaterThan(small.chip_volume_per_peck_mm3);
    });

    it("peck count >= ceil(depth / peck_depth)", () => {
      const r = lathePartingChipClearanceEngine.evaluate({
        blade_width_mm: 4,
        slot_depth_mm: 10,
        bar_od_mm: 40,
        feed_mm_rev: 0.05,
        vc_m_min: 100,
        coolant_pressure_bar: 30,
      });
      expect(r.recommended_peck_count).toBeGreaterThanOrEqual(
        Math.ceil(10 / r.recommended_peck_depth_mm)
      );
    });
  });

  describe("getStats()", () => {
    it("reports supported ISO groups and formulas", () => {
      const s = lathePartingChipClearanceEngine.getStats();
      expect(s.iso_groups_supported).toEqual(["P", "M", "K", "N", "S", "H"]);
      expect(s.formulas.length).toBeGreaterThan(2);
    });
  });
});
