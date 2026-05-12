/**
 * LatheOpTimeBreakdownEngine Test Suite (LATHE-PRO-MS5)
 */
import { describe, it, expect } from "vitest";
import { latheOpTimeBreakdownEngine } from "../engines/LatheOpTimeBreakdownEngine.js";

describe("LatheOpTimeBreakdownEngine", () => {
  describe("compute()", () => {
    it("produces all time buckets for a simple op", () => {
      const r = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 100,
        feed_mm_min: 300,
      });
      expect(r.cutting_sec).toBeGreaterThan(0);
      expect(r.total_sec).toBeGreaterThan(r.cutting_sec);
    });

    it("cutting time scales with pass count", () => {
      const r1 = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 100,
        feed_mm_min: 300,
        pass_count: 1,
      });
      const r3 = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 100,
        feed_mm_min: 300,
        pass_count: 3,
      });
      expect(r3.cutting_sec).toBeGreaterThan(r1.cutting_sec * 2.5);
    });

    it("tool change time accrues per count", () => {
      const r = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 100,
        feed_mm_min: 300,
        tool_changes: 5,
        tool_change_sec: 4,
      });
      expect(r.tool_change_sec).toBe(20);
    });

    it("thread time accrues per cycle", () => {
      const r = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 50,
        feed_mm_min: 200,
        thread_cycles: 3,
        thread_cycle_sec: 2,
      });
      expect(r.thread_sec).toBe(6);
    });

    it("probing time accrues per sequence", () => {
      const r = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 50,
        feed_mm_min: 200,
        probe_sequences: 2,
        probe_sec_each: 8,
      });
      expect(r.probe_sec).toBe(16);
    });

    it("chip conveyor pauses depend on cut time interval", () => {
      const r = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 10000,
        feed_mm_min: 500,
        chip_pause_interval_sec: 60,
        chip_pause_duration_sec: 3,
      });
      expect(r.chip_conveyor_pause_sec).toBeGreaterThan(0);
    });

    it("productive fraction is between 0 and 1", () => {
      const r = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 100,
        feed_mm_min: 300,
      });
      expect(r.productive_fraction).toBeGreaterThanOrEqual(0);
      expect(r.productive_fraction).toBeLessThanOrEqual(1);
    });

    it("breakdown percentages sum to ~100", () => {
      const r = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 100,
        feed_mm_min: 300,
        tool_changes: 2,
      });
      const sumPct = Object.values(r.breakdown_pct).reduce((a, b) => a + b, 0);
      expect(sumPct).toBeGreaterThan(98);
      expect(sumPct).toBeLessThan(102);
    });

    it("bottleneck identified correctly for cutting-heavy op", () => {
      const r = latheOpTimeBreakdownEngine.compute({
        cut_length_mm: 5000,
        feed_mm_min: 100,
      });
      expect(r.bottleneck).toBe("cutting");
    });

    it("throws on invalid inputs", () => {
      expect(() =>
        latheOpTimeBreakdownEngine.compute({ cut_length_mm: 0, feed_mm_min: 300 })
      ).toThrow();
      expect(() =>
        latheOpTimeBreakdownEngine.compute({ cut_length_mm: 100, feed_mm_min: 0 })
      ).toThrow();
    });
  });

  describe("aggregate()", () => {
    it("sums per-op time and multiplies by lot size", () => {
      const op1 = latheOpTimeBreakdownEngine.compute({ cut_length_mm: 100, feed_mm_min: 300 });
      const op2 = latheOpTimeBreakdownEngine.compute({ cut_length_mm: 50, feed_mm_min: 200 });
      const agg = latheOpTimeBreakdownEngine.aggregate([op1, op2], 10);
      expect(agg.per_piece_sec).toBeCloseTo(op1.total_sec + op2.total_sec, 1);
      expect(agg.lot_sec).toBeCloseTo(agg.per_piece_sec * 10, 1);
      expect(agg.lot_hours).toBeGreaterThan(0);
    });
  });

  describe("getStats()", () => {
    it("returns all bucket names + defaults", () => {
      const s = latheOpTimeBreakdownEngine.getStats();
      expect(s.buckets.length).toBe(9);
      expect(s.defaults.rapid_feed_mm_min).toBe(30000);
    });
  });
});
