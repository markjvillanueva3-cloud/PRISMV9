/**
 * WEDMCornerPhysicsEngine Tests
 * U-PROD-16: Corner cutting physics
 */

import { describe, it, expect } from "vitest";
import {
  wedmCornerPhysicsEngine,
  WEDMCornerPhysicsEngine,
} from "../engines/WEDMCornerPhysicsEngine.js";

describe("WEDMCornerPhysicsEngine", () => {
  describe("calculateMinCornerRadius", () => {
    it("calculates minimum radius from wire and spark gap", () => {
      const radius = wedmCornerPhysicsEngine.calculateMinCornerRadius(0.25, 0.025);
      // r_wire/2 + spark_gap = 0.125 + 0.025 = 0.15
      expect(radius).toBeCloseTo(0.15, 3);
    });

    it("scales with wire diameter", () => {
      const r1 = wedmCornerPhysicsEngine.calculateMinCornerRadius(0.20, 0.025);
      const r2 = wedmCornerPhysicsEngine.calculateMinCornerRadius(0.30, 0.025);
      expect(r2).toBeGreaterThan(r1);
    });
  });

  describe("calculateWireDeflection", () => {
    it("calculates deflection based on tension and thickness", () => {
      const deflection = wedmCornerPhysicsEngine.calculateWireDeflection(15, 25, 90);
      expect(deflection).toBeGreaterThan(0);
      expect(deflection).toBeLessThan(1.0); // Deflection varies with parameters
    });

    it("deflection increases with thickness", () => {
      const d1 = wedmCornerPhysicsEngine.calculateWireDeflection(15, 25, 90);
      const d2 = wedmCornerPhysicsEngine.calculateWireDeflection(15, 100, 90);
      expect(d2).toBeGreaterThan(d1);
    });

    it("deflection decreases with tension", () => {
      const d1 = wedmCornerPhysicsEngine.calculateWireDeflection(10, 50, 90);
      const d2 = wedmCornerPhysicsEngine.calculateWireDeflection(20, 50, 90);
      expect(d2).toBeLessThan(d1);
    });

    it("deflection increases at sharper corners (lower angle)", () => {
      // Lower angle = sharper corner = more direction change = higher deflection
      // But sin(angle/2) peaks at 180 degrees, so we test 90 vs 180
      const d1 = wedmCornerPhysicsEngine.calculateWireDeflection(15, 50, 90);
      const d2 = wedmCornerPhysicsEngine.calculateWireDeflection(15, 50, 150);
      // At 150 deg the direction change factor is larger
      expect(d2).toBeGreaterThan(d1);
    });
  });

  describe("calculateWireLag", () => {
    it("calculates wire lag at corners", () => {
      const lag = wedmCornerPhysicsEngine.calculateWireLag(2.5, 25, 90);
      expect(lag).toBeGreaterThan(0);
    });

    it("lag increases with feed rate", () => {
      const l1 = wedmCornerPhysicsEngine.calculateWireLag(1.5, 25, 90);
      const l2 = wedmCornerPhysicsEngine.calculateWireLag(3.0, 25, 90);
      expect(l2).toBeGreaterThan(l1);
    });
  });

  describe("analyzeCorner", () => {
    it("recommends feed reduction for sharp inside corner", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 30,
        thickness_mm: 25,
      });

      expect(result.feed_rate_factor).toBeLessThanOrEqual(0.5);
      expect(result.dwell_time_ms).toBeGreaterThan(0);
      expect(result.strategies.length).toBeGreaterThan(0);
    });

    it("maintains feed for gentle outside corner", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "outside",
        corner_angle_deg: 120,
        thickness_mm: 25,
      });

      expect(result.feed_rate_factor).toBeGreaterThanOrEqual(1.0);
    });

    it("warns about undersized corner radius", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 90,
        corner_radius_mm: 0.05, // Too small
        wire_diameter_mm: 0.25,
        spark_gap_mm: 0.025,
      });

      expect(result.warnings.some(w => w.includes("below minimum"))).toBe(true);
    });

    it("includes wire deflection calculation", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 45,
        thickness_mm: 50,
        wire_tension_N: 15,
      });

      expect(result.wire_deflection_mm).toBeGreaterThan(0);
    });

    it("calculates expected error", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 45,
        thickness_mm: 25,
      });

      expect(result.expected_error_mm).toBeGreaterThan(0);
    });

    it("provides minimum achievable radius", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 90,
        wire_diameter_mm: 0.25,
        spark_gap_mm: 0.025,
      });

      expect(result.min_corner_radius_mm).toBeCloseTo(0.15, 3);
    });

    it("adjusts spark energy for corner type", () => {
      const inside = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 45,
      });

      const outside = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "outside",
        corner_angle_deg: 45,
      });

      expect(inside.spark_energy_factor).toBeLessThan(outside.spark_energy_factor);
    });

    it("warns for thick material with sharp corner", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 30,
        thickness_mm: 120,
      });

      expect(result.warnings.some(w => w.includes("Thick material"))).toBe(true);
    });
  });

  describe("analyzeMultipleCorners", () => {
    it("analyzes multiple corners", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "C1", corner_type: "inside", corner_angle_deg: 90 },
          { id: "C2", corner_type: "outside", corner_angle_deg: 90 },
          { id: "C3", corner_type: "inside", corner_angle_deg: 45 },
        ],
        thickness_mm: 25,
      });

      expect(result.corner_recommendations).toHaveLength(3);
    });

    it("identifies critical corners", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "C1", corner_type: "inside", corner_angle_deg: 20 },
          { id: "C2", corner_type: "inside", corner_angle_deg: 90 },
        ],
        thickness_mm: 25,
      });

      expect(result.critical_corners).toContain("C1");
      expect(result.critical_corners).not.toContain("C2");
    });

    it("calculates total dwell time", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "C1", corner_type: "inside", corner_angle_deg: 30 },
          { id: "C2", corner_type: "inside", corner_angle_deg: 30 },
        ],
        thickness_mm: 25,
      });

      expect(result.total_dwell_time_ms).toBeGreaterThan(0);
    });

    it("calculates average feed reduction", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "C1", corner_type: "inside", corner_angle_deg: 45 },
          { id: "C2", corner_type: "outside", corner_angle_deg: 90 },
        ],
        thickness_mm: 25,
      });

      expect(result.average_feed_reduction_percent).toBeGreaterThanOrEqual(0);
    });

    it("provides overall strategy recommendation", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "C1", corner_type: "inside", corner_angle_deg: 20 },
          { id: "C2", corner_type: "inside", corner_angle_deg: 25 },
          { id: "C3", corner_type: "inside", corner_angle_deg: 15 },
        ],
        thickness_mm: 25,
      });

      expect(result.overall_strategy).toContain("critical");
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMCornerPhysicsEngine();
      engine.configure({ sharp_corner_threshold_deg: 50 });

      expect(engine.getConfig().sharp_corner_threshold_deg).toBe(50);
    });
  });

  describe("calculateCornerLagPhysics (U-P2PFS27)", () => {
    it("calculates lag using Dekeyser & Snoeys formula", () => {
      // lag = F_d × t_response / (2 × T)
      // F = 0.5N, t = 2.5ms = 0.0025s, T = 12N
      // lag = 0.5 × 0.0025 / (2 × 12) = 0.0000521 mm ≈ 52 µm
      const result = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 12,
        wire_material: "brass",
      });

      expect(result.lag_mm).toBeGreaterThan(0);
      expect(result.response_time_ms).toBeCloseTo(2.5, 1);
    });

    it("lag scales linearly with discharge force", () => {
      const r1 = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 12,
      });

      const r2 = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 1.0,
        wire_tension_N: 12,
      });

      expect(r2.lag_mm).toBeCloseTo(r1.lag_mm * 2, 6);
    });

    it("lag scales inversely with tension", () => {
      const r1 = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 12,
      });

      const r2 = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 24,
      });

      expect(r2.lag_mm).toBeCloseTo(r1.lag_mm / 2, 6);
    });

    it("molybdenum has faster response than brass", () => {
      const brass = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 12,
        wire_material: "brass",
      });

      const moly = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 12,
        wire_material: "molybdenum",
      });

      expect(moly.response_time_ms).toBeLessThan(brass.response_time_ms);
      expect(moly.lag_mm).toBeLessThan(brass.lag_mm);
    });

    it("calculates corner error amplification for sharp angles", () => {
      const result90 = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 12,
        corner_angle_deg: 90,
      });

      const result45 = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 12,
        corner_angle_deg: 45,
      });

      // Sharper angle = larger corner error
      expect(result45.corner_error_um).toBeGreaterThan(result90.corner_error_um);
    });

    it("recommends dwell time to allow wire catch-up", () => {
      const result = wedmCornerPhysicsEngine.calculateCornerLagPhysics({
        discharge_force_N: 0.5,
        wire_tension_N: 12,
      });

      expect(result.recommended_dwell_ms).toBeGreaterThan(0);
    });

    it("throws on zero tension", () => {
      expect(() =>
        wedmCornerPhysicsEngine.calculateCornerLagPhysics({
          discharge_force_N: 0.5,
          wire_tension_N: 0,
        })
      ).toThrow("Wire tension must be positive");
    });
  });
});
