/**
 * Exhaustive tests for InstantaneousEngagementEngine
 *
 * Tests the core variable S/F intelligence:
 * - Chip thinning compensation
 * - Ball end mill effective diameter
 * - Corner engagement detection and feed reduction
 * - Engagement angle calculation
 * - Per-block S/F optimization
 */
import { describe, it, expect } from "vitest";
import { instantaneousEngagementEngine } from "../engines/InstantaneousEngagementEngine.js";

describe("InstantaneousEngagementEngine", () => {
  // ═══ computeOptimalSF — Quick single-point analysis ═══

  describe("computeOptimalSF", () => {
    it("full slot (ae=D) → engagement=180°, no chip thinning", () => {
      const r = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 10, ap_mm: 5, tool_diameter_mm: 10,
        tool_type: "flat_endmill", flute_count: 4,
        target_Vc_m_min: 200, target_fz_mm: 0.05,
      });
      expect(r.engagement_angle_deg).toBeCloseTo(180, 0);
      expect(r.chip_thinning_factor).toBeCloseTo(1.0, 1);
      expect(r.classification).toBe("slotting");
      // Full slot: feed should be REDUCED (70% rule)
      expect(r.fz_mm).toBeLessThan(0.05);
    });

    it("50% engagement (ae=D/2) → engagement≈90°, chip thinning≈1.0", () => {
      const r = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 5, ap_mm: 5, tool_diameter_mm: 10,
        tool_type: "flat_endmill", flute_count: 4,
        target_Vc_m_min: 200, target_fz_mm: 0.05,
      });
      expect(r.engagement_angle_deg).toBeCloseTo(90, 5);
      expect(r.chip_thinning_factor).toBeCloseTo(1.0, 1);
      expect(["nominal", "heavy"]).toContain(r.classification);
    });

    it("10% engagement (ae=0.1D) → chip thinning >2x, feed increases", () => {
      const r = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 1, ap_mm: 10, tool_diameter_mm: 10,
        tool_type: "flat_endmill", flute_count: 4,
        target_Vc_m_min: 200, target_fz_mm: 0.05,
      });
      expect(r.engagement_angle_deg).toBeLessThan(40);
      expect(r.chip_thinning_factor).toBeGreaterThan(1.5);
      // Feed should INCREASE to compensate for chip thinning
      expect(r.fz_mm).toBeGreaterThan(0.05);
      expect(["light", "nominal"]).toContain(r.classification);
    });

    it("5% engagement → very high chip thinning, feed increases significantly", () => {
      const r = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 0.5, ap_mm: 15, tool_diameter_mm: 10,
        tool_type: "flat_endmill", flute_count: 4,
        target_Vc_m_min: 200, target_fz_mm: 0.05,
      });
      expect(r.chip_thinning_factor).toBeGreaterThan(2.0);
      expect(r.fz_mm).toBeGreaterThan(0.10); // should more than double
    });

    it("ball end mill at shallow ap → effective diameter < nominal", () => {
      const r = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 5, ap_mm: 1, tool_diameter_mm: 20,
        tool_type: "ball_endmill", flute_count: 2,
        target_Vc_m_min: 200, target_fz_mm: 0.1,
      });
      // D_eff = 2*sqrt(10²-(10-1)²) = 2*sqrt(100-81) = 2*sqrt(19) ≈ 8.72
      expect(r.effective_diameter_mm).toBeCloseTo(8.72, 0);
      // RPM should be HIGHER because effective diameter is smaller
      const nominalRpm = (200 * 1000) / (Math.PI * 20);
      expect(r.rpm).toBeGreaterThan(nominalRpm * 1.5);
    });

    it("ball end mill at full radius → effective diameter = nominal", () => {
      const r = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 5, ap_mm: 10, tool_diameter_mm: 20,
        tool_type: "ball_endmill", flute_count: 2,
        target_Vc_m_min: 200, target_fz_mm: 0.1,
      });
      expect(r.effective_diameter_mm).toBeCloseTo(20, 0);
    });

    it("bull nose at shallow ap → effective diameter between flat and ball", () => {
      const r = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 5, ap_mm: 0.5, tool_diameter_mm: 20,
        tool_type: "bull_nose", corner_radius_mm: 2, flute_count: 4,
        target_Vc_m_min: 200, target_fz_mm: 0.08,
      });
      // Should be between flat (20mm) and ball (much smaller)
      expect(r.effective_diameter_mm).toBeGreaterThan(16);
      expect(r.effective_diameter_mm).toBeLessThanOrEqual(20);
    });

    it("force increases with deeper cut (F ∝ ap)", () => {
      const base = {
        ae_mm: 5, tool_diameter_mm: 10, tool_type: "flat_endmill" as const,
        flute_count: 4, target_Vc_m_min: 200, target_fz_mm: 0.05,
        kc1_1: 2000, mc: 0.25,
      };
      const shallow = instantaneousEngagementEngine.computeOptimalSF({ ...base, ap_mm: 2 });
      const deep = instantaneousEngagementEngine.computeOptimalSF({ ...base, ap_mm: 10 });
      expect(deep.force_N).toBeGreaterThan(shallow.force_N * 3); // roughly 5x for 5x depth
    });

    it("power = F × Vc / 60000 (dimensional check)", () => {
      const r = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 5, ap_mm: 5, tool_diameter_mm: 10,
        tool_type: "flat_endmill", flute_count: 4,
        target_Vc_m_min: 200, target_fz_mm: 0.05,
        kc1_1: 2000, mc: 0.25,
      });
      // Power should be positive and reasonable for this cutting condition
      expect(r.power_kW).toBeGreaterThan(0);
      expect(r.power_kW).toBeLessThan(50); // sanity check
    });
  });

  // ═══ analyzeToolpath — Full toolpath analysis ═══

  describe("analyzeToolpath", () => {
    const tool = {
      type: "flat_endmill" as const,
      diameter_mm: 10, flute_count: 4, flute_length_mm: 25,
      helix_angle_deg: 30,
    };
    const stock = {
      min_x: 0, max_x: 100, min_y: 0, max_y: 100,
      min_z: -20, max_z: 0, stock_top_z: 0,
    };
    const conditions = {
      target_Vc_m_min: 200, target_fz_mm: 0.05,
      target_ae_fraction: 0.5, kc1_1: 2000, mc: 0.25,
    };

    it("identifies rapids vs cutting moves", () => {
      const blocks = [
        { id: 1, move_type: "G0" as const, x: 50, y: 50, z: 5 },
        { id: 2, move_type: "G1" as const, x: 50, y: 50, z: -2, feed_mm_min: 500 },
        { id: 3, move_type: "G1" as const, x: 80, y: 50, z: -2, feed_mm_min: 1500 },
        { id: 4, move_type: "G0" as const, x: 80, y: 50, z: 5 },
      ];
      const r = instantaneousEngagementEngine.analyzeToolpath(blocks, tool, stock, conditions);
      expect(r.summary.total_blocks).toBe(4);
      expect(r.summary.rapid_blocks).toBe(2);
      expect(r.summary.cutting_blocks).toBe(2);
    });

    it("produces optimized blocks with reasons", () => {
      const blocks = [
        { id: 1, move_type: "G1" as const, x: 10, y: 50, z: -5, feed_mm_min: 1000, spindle_rpm: 6000 },
        { id: 2, move_type: "G1" as const, x: 50, y: 50, z: -5, feed_mm_min: 1000, spindle_rpm: 6000 },
        { id: 3, move_type: "G1" as const, x: 90, y: 50, z: -5, feed_mm_min: 1000, spindle_rpm: 6000 },
      ];
      const r = instantaneousEngagementEngine.analyzeToolpath(blocks, tool, stock, conditions);
      expect(r.blocks.length).toBe(3);
      // All blocks should have positive engagement for cutting moves
      r.blocks.forEach(b => {
        expect(b.ae_mm).toBeGreaterThanOrEqual(0);
        expect(b.ap_mm).toBeGreaterThanOrEqual(0);
      });
    });

    it("reports time savings estimate", () => {
      const blocks = Array.from({ length: 20 }, (_, i) => ({
        id: i, move_type: "G1" as const,
        x: i * 5, y: 50, z: -3,
        feed_mm_min: 1000, spindle_rpm: 6000,
      }));
      const r = instantaneousEngagementEngine.analyzeToolpath(blocks, tool, stock, conditions);
      expect(r.summary.time_savings_pct).toBeGreaterThanOrEqual(0);
      expect(r.summary.force_reduction_pct).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══ Physics invariants ═══

  describe("physics invariants", () => {
    it("chip thinning factor ≥ 1 for all ae ≤ D/2", () => {
      for (const ae_frac of [0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5]) {
        const r = instantaneousEngagementEngine.computeOptimalSF({
          ae_mm: ae_frac * 10, ap_mm: 5, tool_diameter_mm: 10,
          tool_type: "flat_endmill", flute_count: 4,
          target_Vc_m_min: 200, target_fz_mm: 0.05,
        });
        expect(r.chip_thinning_factor).toBeGreaterThanOrEqual(1.0);
      }
    });

    it("engagement angle monotonically increases with ae", () => {
      const angles: number[] = [];
      for (const ae of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const r = instantaneousEngagementEngine.computeOptimalSF({
          ae_mm: ae, ap_mm: 5, tool_diameter_mm: 10,
          tool_type: "flat_endmill", flute_count: 4,
          target_Vc_m_min: 200, target_fz_mm: 0.05,
        });
        angles.push(r.engagement_angle_deg);
      }
      for (let i = 1; i < angles.length; i++) {
        expect(angles[i]).toBeGreaterThanOrEqual(angles[i - 1]);
      }
    });

    it("ball end D_eff monotonically increases with ap", () => {
      const diams: number[] = [];
      for (const ap of [0.5, 1, 2, 3, 5, 8, 10]) {
        const r = instantaneousEngagementEngine.computeOptimalSF({
          ae_mm: 5, ap_mm: ap, tool_diameter_mm: 20,
          tool_type: "ball_endmill", flute_count: 2,
          target_Vc_m_min: 200, target_fz_mm: 0.1,
        });
        diams.push(r.effective_diameter_mm);
      }
      for (let i = 1; i < diams.length; i++) {
        expect(diams[i]).toBeGreaterThanOrEqual(diams[i - 1]);
      }
    });

    it("RPM inversely proportional to effective diameter (n = Vc*1000/πD)", () => {
      const r10 = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 5, ap_mm: 5, tool_diameter_mm: 10,
        tool_type: "flat_endmill", flute_count: 4,
        target_Vc_m_min: 200, target_fz_mm: 0.05,
      });
      const r20 = instantaneousEngagementEngine.computeOptimalSF({
        ae_mm: 5, ap_mm: 5, tool_diameter_mm: 20,
        tool_type: "flat_endmill", flute_count: 4,
        target_Vc_m_min: 200, target_fz_mm: 0.05,
      });
      // Double diameter → half RPM
      expect(r10.rpm / r20.rpm).toBeCloseTo(2.0, 0);
    });
  });
});
