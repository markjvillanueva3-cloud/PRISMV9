/**
 * Tests for CNC Programming Engines:
 *   - CNCProgramAssemblerEngine
 *   - MotionDynamicsProfileEngine
 *   - EngagementAdaptiveFeedEngine
 *
 * Direct engine imports, no mocking, realistic manufacturing values.
 */
import { describe, it, expect } from "vitest";
import { cncProgramAssemblerEngine } from "../engines/CNCProgramAssemblerEngine.js";
import { motionDynamicsProfileEngine } from "../engines/MotionDynamicsProfileEngine.js";
import { engagementAdaptiveFeedEngine } from "../engines/EngagementAdaptiveFeedEngine.js";

// ============================================================================
// CNCProgramAssemblerEngine
// ============================================================================

describe("CNC Programming Engines", () => {
  describe("CNCProgramAssemblerEngine", () => {
    it("assembleProgram — generates program with auto S/F for aluminum facing", async () => {
      const result = await cncProgramAssemblerEngine.assembleProgram({
        material: "6061",
        controller: "fanuc",
        operations: [
          {
            operation: "facing",
            tool_number: 1,
            tool_diameter_mm: 50,
            flutes: 4,
            z_depth: -2,
            cut_type: "roughing",
          },
        ],
      });

      expect(result.gcode).toBeTruthy();
      expect(result.gcode.length).toBeGreaterThan(20);
      expect(result.controller).toBe("fanuc");
      expect(result.material).toBe("6061");
      expect(result.total_operations).toBe(1);
      expect(result.total_tools).toBe(1);
      expect(result.operations_sf).toHaveLength(1);

      const sf = result.operations_sf[0];
      expect(sf.calculated_rpm).toBeGreaterThan(100);
      expect(sf.calculated_rpm).toBeLessThan(50000);
      expect(sf.calculated_feed_mmmin).toBeGreaterThan(10);
      expect(sf.calculated_feed_mmmin).toBeLessThan(50000);
      expect(sf.confidence).toBeGreaterThan(0);
      expect(sf.formulas_used.length).toBeGreaterThan(0);
      expect(result.stats.auto_calculated_ops).toBe(1);
      expect(result.stats.override_ops).toBe(0);
    });

    it("assembleProgram — handles multiple operations", async () => {
      const result = await cncProgramAssemblerEngine.assembleProgram({
        material: "4140",
        controller: "haas",
        operations: [
          { operation: "facing", tool_number: 1, tool_diameter_mm: 50, flutes: 4, z_depth: -2, cut_type: "roughing" },
          { operation: "drilling", tool_number: 2, tool_diameter_mm: 10, flutes: 2, z_depth: -25 },
          { operation: "profile", tool_number: 3, tool_diameter_mm: 12, flutes: 3, z_depth: -15, cut_type: "finishing" },
        ],
      });

      expect(result.total_operations).toBe(3);
      expect(result.total_tools).toBe(3);
      expect(result.operations_sf).toHaveLength(3);
      expect(result.estimated_cycle_time_sec).toBeGreaterThan(0);
      // Each operation should have distinct S/F
      const rpms = result.operations_sf.map((s) => s.calculated_rpm);
      expect(new Set(rpms).size).toBeGreaterThanOrEqual(2); // at least 2 distinct RPMs
    });

    it("assembleProgram — respects override_rpm/override_feed", async () => {
      const result = await cncProgramAssemblerEngine.assembleProgram({
        material: "aluminum",
        controller: "fanuc",
        operations: [
          {
            operation: "facing",
            tool_number: 1,
            tool_diameter_mm: 50,
            flutes: 4,
            z_depth: -2,
            override_rpm: 3000,
            override_feed_mmmin: 1200,
          },
        ],
      });

      const sf = result.operations_sf[0];
      expect(sf.calculated_rpm).toBe(3000);
      expect(sf.calculated_feed_mmmin).toBe(1200);
      expect(sf.formulas_used).toContain("User override — S/F not auto-calculated");
      expect(result.stats.override_ops).toBe(1);
      expect(result.stats.auto_calculated_ops).toBe(0);
    });

    it("calculateBatchSpeedFeed — returns S/F for batch of ops", async () => {
      const result = await cncProgramAssemblerEngine.calculateBatchSpeedFeed({
        material: "6061",
        operations: [
          { tool_diameter_mm: 12, flutes: 3, operation: "milling" },
          { tool_diameter_mm: 10, flutes: 2, operation: "drilling" },
          { tool_diameter_mm: 20, flutes: 4, operation: "milling", cut_type: "finishing" },
        ],
      });

      expect(result.material).toBe("6061");
      expect(result.iso_group).toBe("N"); // aluminum
      expect(result.entries).toHaveLength(3);
      for (const entry of result.entries) {
        expect(entry.rpm).toBeGreaterThan(0);
        expect(entry.feed_mmmin).toBeGreaterThan(0);
        expect(entry.cutting_speed_mmin).toBeGreaterThan(0);
        expect(entry.feed_per_tooth_mm).toBeGreaterThan(0);
      }
    });

    it("estimateCycleTime — returns time estimate", async () => {
      const result = await cncProgramAssemblerEngine.estimateCycleTime({
        material: "4140",
        controller: "haas",
        operations: [
          { operation: "facing", tool_number: 1, tool_diameter_mm: 50, flutes: 4, z_depth: -2, cut_type: "roughing" },
          { operation: "drilling", tool_number: 2, tool_diameter_mm: 10, flutes: 2, z_depth: -25 },
        ],
      });

      expect(result.total_sec).toBeGreaterThan(0);
      expect(result.per_operation).toHaveLength(2);
      expect(result.total_cutting_sec).toBeGreaterThan(0);
      expect(result.total_rapid_sec).toBeGreaterThan(0);
      expect(result.total_tool_change_sec).toBeGreaterThan(0);
      // Haas tool change ~2.8s per tool
      expect(result.total_tool_change_sec).toBeGreaterThanOrEqual(5);
      for (const op of result.per_operation) {
        expect(op.cutting_time_sec).toBeGreaterThanOrEqual(0);
        expect(op.rapid_time_sec).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // MotionDynamicsProfileEngine
  // ============================================================================

  describe("MotionDynamicsProfileEngine", () => {
    it("trapezoidalProfile — computes accel/cruise/decel phases", () => {
      // 100mm move, 6000mm/min commanded, start/end from 0, 5000mm/s² accel
      const r = motionDynamicsProfileEngine.trapezoidalProfile(100, 6000, 0, 0, 5000);

      expect(r.time_sec).toBeGreaterThan(0);
      expect(r.max_achieved_velocity).toBeGreaterThan(0);
      expect(r.max_achieved_velocity).toBeLessThanOrEqual(6000 + 1); // should not exceed commanded
      expect(r.phases.length).toBeGreaterThanOrEqual(2); // at least accel + decel
      // Verify phases sum to total
      const phaseTimeSum = r.phases.reduce((s, p) => s + p.duration_sec, 0);
      expect(Math.abs(phaseTimeSum - r.time_sec)).toBeLessThan(0.0001);
    });

    it("trapezoidalProfile — handles short move (triangular)", () => {
      // Very short move: 2mm at high speed with low accel — can't reach full speed
      const r = motionDynamicsProfileEngine.trapezoidalProfile(2, 10000, 0, 0, 2000);

      expect(r.time_sec).toBeGreaterThan(0);
      expect(r.max_achieved_velocity).toBeLessThan(10000); // cannot reach commanded
      // Triangular: no cruise phase
      const cruisePhases = r.phases.filter((p) => p.name === "cruise");
      expect(cruisePhases).toHaveLength(0);
      expect(r.phases.length).toBe(2); // accel + decel only
    });

    it("sCurveProfile — jerk-limited profile", () => {
      // 50mm move, 6000mm/min, jerk-limited
      const r = motionDynamicsProfileEngine.sCurveProfile(50, 6000, 0, 0, 5000, 50000);

      expect(r.time_sec).toBeGreaterThan(0);
      expect(r.max_achieved_velocity).toBeGreaterThan(0);
      expect(r.max_achieved_velocity).toBeLessThanOrEqual(6000 + 1);
      // S-curve should be >= trapezoidal time (jerk limits add overhead)
      const trap = motionDynamicsProfileEngine.trapezoidalProfile(50, 6000, 0, 0, 5000);
      expect(r.time_sec).toBeGreaterThanOrEqual(trap.time_sec * 0.99);
    });

    it("cornerVelocity — 90° corner limits speed", () => {
      // 90° corner: moving in X then turning to Y
      const r = motionDynamicsProfileEngine.cornerVelocity(
        { dx: 1, dy: 0, dz: 0 },
        { dx: 0, dy: 1, dz: 0 },
        5000,
        0.01,
      );

      expect(r.turn_angle_deg).toBeCloseTo(90, 0);
      expect(r.max_corner_vel).toBeGreaterThan(0);
      expect(r.max_corner_vel).toBeLessThan(Infinity);
      expect(r.effective_radius).toBeGreaterThan(0);
    });

    it("cornerVelocity — straight line = max speed (infinite)", () => {
      // Same direction = 0° turn → no speed limit
      const r = motionDynamicsProfileEngine.cornerVelocity(
        { dx: 1, dy: 0, dz: 0 },
        { dx: 1, dy: 0, dz: 0 },
        5000,
        0.01,
      );

      expect(r.turn_angle_deg).toBeCloseTo(0, 1);
      expect(r.max_corner_vel).toBe(Infinity);
    });

    it("axisDecomposition — identifies limiting axis", () => {
      // Move at 45° in XY. If Y axis is slower, it should limit.
      const r = motionDynamicsProfileEngine.axisDecomposition(
        10000, // commanded feed
        { dx: 1, dy: 1, dz: 0 },
        { x: 30000, y: 5000, z: 10000 }, // Y much slower
      );

      expect(r.limiting_axis).toBe("y");
      expect(r.achievable_feed).toBeLessThan(10000);
      expect(r.achievable_feed).toBeGreaterThan(0);
    });

    it("simulateLookAhead — plans velocity across segments", () => {
      const segments = [
        { x: 50, y: 0, z: 0, commanded_feed_mmmin: 5000, type: "linear" as const },
        { x: 50, y: 30, z: 0, commanded_feed_mmmin: 5000, type: "linear" as const },
        { x: 100, y: 30, z: 0, commanded_feed_mmmin: 5000, type: "linear" as const },
      ];
      const kinematics = {
        max_feed_mmmin: 20000,
        max_accel_mm_s2: 5000,
        axis_max_vel: { x: 30000, y: 30000, z: 10000 },
        axis_max_accel: { x: 5000, y: 5000, z: 3000 },
      };

      const r = motionDynamicsProfileEngine.simulateLookAhead(segments, kinematics);

      expect(r.segments).toHaveLength(3);
      expect(r.total_time_sec).toBeGreaterThan(0);
      expect(r.feed_effectiveness_pct).toBeGreaterThanOrEqual(0);
      expect(r.feed_effectiveness_pct).toBeLessThanOrEqual(100);
      // Middle segment has a 90° corner entry — should have lower entry velocity
      const seg1 = r.segments[1];
      expect(seg1.entry_velocity_mmmin).toBeLessThan(5000);
    });

    it("feedEffectiveness — reports time breakdown", () => {
      const segments = [
        { x: 80, y: 0, z: 0, commanded_feed_mmmin: 5000, type: "linear" as const },
        { x: 80, y: 50, z: 0, commanded_feed_mmmin: 5000, type: "linear" as const },
      ];
      const kinematics = {
        max_feed_mmmin: 20000,
        max_accel_mm_s2: 5000,
        axis_max_vel: { x: 30000, y: 30000, z: 10000 },
        axis_max_accel: { x: 5000, y: 5000, z: 3000 },
      };

      const r = motionDynamicsProfileEngine.feedEffectiveness(segments, kinematics);

      expect(r.effectiveness_pct).toBeGreaterThanOrEqual(0);
      expect(r.effectiveness_pct).toBeLessThanOrEqual(100);
      expect(r.time_breakdown.total_sec).toBeGreaterThan(0);
      expect(r.time_breakdown.at_commanded_sec).toBeGreaterThanOrEqual(0);
      expect(r.time_breakdown.accelerating_sec).toBeGreaterThanOrEqual(0);
      expect(r.time_breakdown.decelerating_sec).toBeGreaterThanOrEqual(0);
      // Sum of parts should equal total
      const sumParts =
        r.time_breakdown.at_commanded_sec +
        r.time_breakdown.accelerating_sec +
        r.time_breakdown.decelerating_sec;
      expect(Math.abs(sumParts - r.time_breakdown.total_sec)).toBeLessThan(0.01);
    });

    it("optimizeFeedProfile — adjusts feeds", () => {
      const segments = [
        { x: 10, y: 0, z: 0, commanded_feed_mmmin: 15000, type: "linear" as const },
        { x: 10, y: 5, z: 0, commanded_feed_mmmin: 15000, type: "linear" as const },
        { x: 20, y: 5, z: 0, commanded_feed_mmmin: 15000, type: "linear" as const },
        { x: 20, y: 10, z: 0, commanded_feed_mmmin: 15000, type: "linear" as const },
      ];
      const kinematics = {
        max_feed_mmmin: 20000,
        max_accel_mm_s2: 3000,
        axis_max_vel: { x: 20000, y: 20000, z: 10000 },
        axis_max_accel: { x: 3000, y: 3000, z: 2000 },
      };

      const optimized = motionDynamicsProfileEngine.optimizeFeedProfile(segments, kinematics);

      expect(optimized).toHaveLength(segments.length);
      // Optimized feeds should generally be <= original (reduced unreachable feeds)
      for (const seg of optimized) {
        expect(seg.commanded_feed_mmmin).toBeGreaterThan(0);
        expect(seg.commanded_feed_mmmin).toBeLessThanOrEqual(15000 + 1);
      }
    });
  });

  // ============================================================================
  // EngagementAdaptiveFeedEngine
  // ============================================================================

  describe("EngagementAdaptiveFeedEngine", () => {
    it("calculateEngagement — full slot = 180°", () => {
      // ae = D → full slot → 180°
      const eng = engagementAdaptiveFeedEngine.calculateEngagement(12, 12, "linear");
      expect(eng).toBeCloseTo(180, 0);
    });

    it("calculateEngagement — half immersion ≈ 90°", () => {
      // ae = D/2 → half immersion → ~90° (actually acos(1 - 2*0.5) = acos(0) = 90°)
      const eng = engagementAdaptiveFeedEngine.calculateEngagement(12, 6, "linear");
      expect(eng).toBeCloseTo(90, 0);
    });

    it("chipThinningFactor — full slot = 1.0 (no thinning)", () => {
      // At ae = D (full slot, 180°), no chip thinning
      const factor = engagementAdaptiveFeedEngine.chipThinningFactor(180, 12, 12, "exact");
      expect(factor).toBe(1.0);
    });

    it("chipThinningFactor — 25% radial = factor > 1", () => {
      // ae = 25% of D → engagement < 90° → chip thinning → factor > 1
      const D = 12;
      const ae = D * 0.25; // 3mm
      const eng = engagementAdaptiveFeedEngine.calculateEngagement(D, ae, "linear");
      const factor = engagementAdaptiveFeedEngine.chipThinningFactor(eng, D, ae, "exact");
      expect(factor).toBeGreaterThan(1.0);
      expect(factor).toBeLessThan(10); // reasonable range
    });

    it("chipThinningFactor — all 3 models produce reasonable values", () => {
      const D = 12;
      const ae = D * 0.2; // 20% radial
      const eng = engagementAdaptiveFeedEngine.calculateEngagement(D, ae, "linear");

      const simplified = engagementAdaptiveFeedEngine.chipThinningFactor(eng, D, ae, "simplified");
      const martellotti = engagementAdaptiveFeedEngine.chipThinningFactor(eng, D, ae, "martellotti");
      const exact = engagementAdaptiveFeedEngine.chipThinningFactor(eng, D, ae, "exact");

      // All should be > 1 for 20% radial (chip thinning compensation)
      expect(simplified).toBeGreaterThan(1.0);
      expect(martellotti).toBeGreaterThan(1.0);
      expect(exact).toBeGreaterThan(1.0);

      // All should be < 10 (reasonable range)
      expect(simplified).toBeLessThan(10);
      expect(martellotti).toBeLessThan(10);
      expect(exact).toBeLessThan(10);

      // Martellotti and exact should be somewhat close
      expect(Math.abs(martellotti - exact)).toBeLessThan(2);
    });

    it("constantForceFeed — adjusts feed for engagement change", () => {
      // When engagement decreases (less ae), feed should increase to maintain force
      const fz_nom = 0.1; // mm/tooth
      const eng_nom = 90; // degrees
      const eng_low = 45; // less engagement

      const adjusted = engagementAdaptiveFeedEngine.constantForceFeed(fz_nom, eng_nom, eng_low, 1800, 0.25);

      // Lower engagement → higher feed needed for constant force
      expect(adjusted).toBeGreaterThan(fz_nom);
      // sin(45°) / sin(22.5°) ≈ 1.85 → factor ~1.85
      expect(adjusted).toBeLessThan(fz_nom * 3);
    });

    it("constantMRRFeed — inverse ratio scaling", () => {
      // MRR = ae * ap * feed → if ae halves, feed should double
      const fz_nom = 0.1;
      const ae_nom = 6; // mm
      const ae_new = 3; // halved

      const adjusted = engagementAdaptiveFeedEngine.constantMRRFeed(fz_nom, ae_nom, ae_new);

      // Should be exactly double (inverse ratio)
      expect(adjusted).toBeCloseTo(0.2, 4);
    });

    it("thermalBalanceFeed — adjusts with thermal correction", () => {
      const fz_nom = 0.1;
      const ae_nom = 6;
      const ae_new = 3;
      const Vc = 200; // m/min
      const ap = 5;
      const kc = 1800;

      const adjusted = engagementAdaptiveFeedEngine.thermalBalanceFeed(fz_nom, ae_nom, ae_new, Vc, ap, kc, {});

      // Similar to MRR scaling but with thermal correction
      // aeRatio = 6/3 = 2, thermalCorrection = 1 + 0.1*(1-0.5) = 1.05
      // adjusted ≈ 0.1 * 2 * 1.05 = 0.21
      expect(adjusted).toBeGreaterThan(fz_nom);
      expect(adjusted).toBeCloseTo(0.21, 2);
    });

    it("rampFeedTransition — smooth S-curve profile", () => {
      const points = engagementAdaptiveFeedEngine.rampFeedTransition(1000, 3000, 10, 10);

      expect(points).toHaveLength(11); // 0..10 inclusive
      // First point at position 0, feed = 1000
      expect(points[0].position_mm).toBe(0);
      expect(points[0].feed_mmmin).toBeCloseTo(1000, 0);
      // Last point at position 10, feed = 3000
      expect(points[10].position_mm).toBeCloseTo(10, 1);
      expect(points[10].feed_mmmin).toBeCloseTo(3000, 0);
      // Middle point should be approximately halfway (S-curve midpoint = average)
      expect(points[5].feed_mmmin).toBeCloseTo(2000, 50);
      // Monotonically increasing
      for (let i = 1; i < points.length; i++) {
        expect(points[i].feed_mmmin).toBeGreaterThanOrEqual(points[i - 1].feed_mmmin - 0.1);
      }
    });

    it("adaptFeed — constant_chip_load mode", () => {
      const result = engagementAdaptiveFeedEngine.adaptFeed({
        tool_diameter_mm: 12,
        flutes: 3,
        nominal_feed_mmmin: 1500,
        nominal_rpm: 8000,
        nominal_radial_depth_mm: 6, // 50% radial = ~90° engagement
        axial_depth_mm: 5,
        material_iso_group: "N", // aluminum
        mode: "constant_chip_load",
        segments: [
          { x: 0, y: 0, type: "linear", radial_depth_mm: 6 },
          { x: 50, y: 0, type: "linear", radial_depth_mm: 3 }, // 25% → chip thinning
          { x: 100, y: 0, type: "linear", radial_depth_mm: 6 }, // back to 50%
          { x: 100, y: 50, type: "linear", radial_depth_mm: 12 }, // full slot
        ],
      });

      expect(result.segments).toHaveLength(4);
      expect(result.mode).toBe("constant_chip_load");
      expect(result.nominal_feed_mmmin).toBe(1500);

      // Segment with 25% radial (index 1) should have higher feed (chip thinning comp)
      const seg25pct = result.segments[1];
      expect(seg25pct.feed_multiplier).toBeGreaterThan(1.0);

      // Segment with full slot (index 3) should have feed multiplier ≈ 1.0
      const segFull = result.segments[3];
      expect(segFull.engagement_deg).toBeCloseTo(180, 0);
      expect(segFull.feed_multiplier).toBeCloseTo(1.0, 1);

      // Engagement range should span from ~60° to 180°
      expect(result.engagement_range.max_deg).toBeCloseTo(180, 0);
      expect(result.engagement_range.min_deg).toBeLessThan(100);

      // All feeds should be positive
      for (const seg of result.segments) {
        expect(seg.adjusted_feed_mmmin).toBeGreaterThan(0);
        expect(seg.force_n).toBeGreaterThan(0);
        expect(seg.mrr_cm3min).toBeGreaterThan(0);
      }
    });
  });
});
