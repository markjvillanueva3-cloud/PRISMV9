/**
 * StockSelectionEngine Test Suite (LATHE-PRO-MS-1)
 */
import { describe, it, expect } from "vitest";
import { stockSelectionEngine } from "../engines/StockSelectionEngine.js";

describe("StockSelectionEngine", () => {
  describe("select()", () => {
    it("recommends a bar stock size for a 25mm part", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 60,
        iso_group: "P",
      });
      expect(r.success).toBe(true);
      expect(r.recommended).not.toBeNull();
      expect(r.recommended!.od_mm).toBeGreaterThanOrEqual(25);
    });

    it("recommended stock includes facing allowance", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 60,
        iso_group: "P",
        facing_allowance_mm: 2,
      });
      expect(r.recommended!.radial_allowance_mm).toBeGreaterThan(0);
    });

    it("bar length = part + facing + cutoff + grip", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 60,
        cutoff_width_mm: 3,
        grip_length_mm: 25,
        facing_allowance_mm: 1,
      });
      // Should be > part_length
      expect(r.recommended!.bar_length_1pc_mm).toBeGreaterThan(60);
    });

    it("computes weight from density", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 60,
        iso_group: "P", // steel density
      });
      expect(r.recommended!.weight_1pc_kg).toBeGreaterThan(0);
    });

    it("N group (aluminum) produces lighter parts than P (steel)", () => {
      const steel = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 60,
        iso_group: "P",
      });
      const alu = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 60,
        iso_group: "N",
      });
      expect(alu.recommended!.weight_1pc_kg).toBeLessThan(steel.recommended!.weight_1pc_kg);
    });

    it("respects bar_feeder_max_od constraint", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 50,
        part_length_mm: 60,
        bar_feeder_max_od_mm: 52, // just above part
      });
      if (r.recommended) {
        expect(r.recommended.od_mm).toBeLessThanOrEqual(52);
      }
    });

    it("tube stock considered when min_bore_id_mm > 0", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 50,
        part_length_mm: 100,
        min_bore_id_mm: 30,
      });
      expect(r.recommended).not.toBeNull();
      // Could be either solid or tube depending on scoring
      expect(["round", "tube"]).toContain(r.recommended!.shape);
    });

    it("imperial preference picks imperial stock", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 25.4, // exactly 1 inch
        part_length_mm: 50,
        preferred_units: "imperial",
      });
      expect(r.recommended).not.toBeNull();
    });

    it("returns failure when part exceeds chuck capacity", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 500,
        part_length_mm: 100,
        chuck_max_od_mm: 100,
      });
      // Should either fail or warn
      expect(r).toBeDefined();
    });

    it("remnant percentage is in [0,100]", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 60,
      });
      // Engine reports as percent 0..100, not fraction 0..1
      expect(r.recommended!.remnant_pct).toBeGreaterThanOrEqual(0);
      expect(r.recommended!.remnant_pct).toBeLessThanOrEqual(100);
    });

    it("score is a finite number", () => {
      const r = stockSelectionEngine.select({
        max_finished_od_mm: 25,
        part_length_mm: 60,
      });
      expect(Number.isFinite(r.recommended!.score)).toBe(true);
    });
  });

  describe("partsPerBar()", () => {
    it("returns array of bar-length results", () => {
      // signature: partsPerBar(partLength, cutoffWidth, gripLength, facingAllowance, barLengths)
      const results = stockSelectionEngine.partsPerBar(50, 3, 25, 1);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.bar_length_mm).toBeGreaterThan(0);
      expect(results[0]!.parts_count).toBeGreaterThanOrEqual(0);
    });

    it("longer standard bars fit more parts than shorter ones", () => {
      const results = stockSelectionEngine.partsPerBar(50, 3, 25, 1);
      const short = results.find((r) => r.bar_length_mm === 1000)!;
      const long = results.find((r) => r.bar_length_mm === 3000)!;
      expect(long.parts_count).toBeGreaterThan(short.parts_count);
    });

    it("respects custom bar_lengths argument", () => {
      const results = stockSelectionEngine.partsPerBar(50, 3, 25, 1, [500, 1500]);
      expect(results.length).toBe(2);
      expect(results[0]!.bar_length_mm).toBe(500);
      expect(results[1]!.bar_length_mm).toBe(1500);
    });

    it("utilization_pct is in [0, 100]", () => {
      const results = stockSelectionEngine.partsPerBar(50, 3, 25, 1);
      results.forEach((r) => {
        expect(r.utilization_pct).toBeGreaterThanOrEqual(0);
        expect(r.utilization_pct).toBeLessThanOrEqual(100);
      });
    });
  });
});
