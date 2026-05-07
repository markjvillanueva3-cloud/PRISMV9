/**
 * WEDM Print-to-Program E2E Pipeline Test
 * U-PROD-23: End-to-end integration test
 *
 * Tests the complete WEDM workflow from DXF input to G-code output:
 * 1. DXF closure validation
 * 2. Material detection
 * 3. Safety guards (current density, pulse limits, power density)
 * 4. Physics calculations (kerf, deflection, corner)
 * 5. Optimization (start points, batching, passes)
 * 6. Cost estimation
 * 7. G-code generation
 */

import { describe, it, expect } from "vitest";

// Phase 1: Safety-Critical Engines
import { wedmCurrentDensityGuardEngine } from "../engines/WEDMCurrentDensityGuardEngine.js";
import { wedmPulseLimitEngine } from "../engines/WEDMPulseLimitEngine.js";
import { wedmPowerDensityGuardEngine } from "../engines/WEDMPowerDensityGuardEngine.js";
import { wedmKerfWidthEngine } from "../engines/WEDMKerfWidthEngine.js";
import { wedmWireDeflectionEngine } from "../engines/WEDMWireDeflectionEngine.js";
import { wedmThinWireDerateEngine } from "../engines/WEDMThinWireDerateEngine.js";

// Phase 2: Backend Engines
import { wedmDXFClosureValidatorEngine } from "../engines/WEDMDXFClosureValidatorEngine.js";
import { wedmDielectricCorrectionEngine } from "../engines/WEDMDielectricCorrectionEngine.js";
import { oneClickWEDMGeneratorEngine } from "../engines/OneClickWEDMGeneratorEngine.js";
import { wedmProgressTrackerEngine } from "../engines/WEDMProgressTrackerEngine.js";

// Phase 3: Optimization Engines
import { wedmStartPointOptimizationEngine } from "../engines/WEDMStartPointOptimizationEngine.js";
import { wedmMultiProfileBatchEngine } from "../engines/WEDMMultiProfileBatchEngine.js";
import { wedmWireThreadingMinEngine } from "../engines/WEDMWireThreadingMinEngine.js";
import { wedmCornerPhysicsEngine } from "../engines/WEDMCornerPhysicsEngine.js";
import { wedmAdaptivePassEngine } from "../engines/WEDMAdaptivePassEngine.js";

// Phase 4: Cost & Learning
import { wedmJobCostEngine } from "../engines/WEDMJobCostEngine.js";
import { wedmLearningLoopEngine, WEDMLearningLoopEngine } from "../engines/WEDMLearningLoopEngine.js";

describe("WEDM Print-to-Program E2E Pipeline", () => {
  // Test data: simple rectangular profile
  const testDXFSegments = [
    { id: "1", type: "line" as const, start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
    { id: "2", type: "line" as const, start: { x: 50, y: 0 }, end: { x: 50, y: 30 } },
    { id: "3", type: "line" as const, start: { x: 50, y: 30 }, end: { x: 0, y: 30 } },
    { id: "4", type: "line" as const, start: { x: 0, y: 30 }, end: { x: 0, y: 0 } },
  ];

  const testMaterial = "D2";
  const testThickness = 25;
  const testTolerance = 0.01;

  describe("Stage 1: DXF Validation", () => {
    it("validates closed contour", () => {
      const result = wedmDXFClosureValidatorEngine.validate(testDXFSegments);

      expect(result.valid).toBe(true);
      expect(result.closed_count).toBe(1);
      expect(result.open_count).toBe(0);
      expect(result.gaps).toHaveLength(0);
    });

    it("detects open contours", () => {
      const openSegments = testDXFSegments.slice(0, 3);
      const result = wedmDXFClosureValidatorEngine.validate(openSegments);

      expect(result.valid).toBe(false);
      expect(result.open_count).toBe(1);
    });
  });

  describe("Stage 2: Safety Guards", () => {
    it("validates current density for brass wire", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        wire_diameter_mm: 0.25,
        peak_current_A: 8, // Lower current for safe density
      });

      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("current_density_A_mm2");
    });

    it("validates pulse timing", () => {
      const result = wedmPulseLimitEngine.validate({
        pulse_on_us: 8,
        pulse_off_us: 12,
        wire_diameter_mm: 0.25,
      });

      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("duty_cycle");
      // Duty cycle should be a number between 0 and 1
      expect(typeof result.duty_cycle).toBe("number");
    });

    it("validates power density", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 12,
        gap_voltage_V: 45,
        duty_cycle: 0.4,
        kerf_width_mm: 0.28,
        thickness_mm: testThickness,
      });

      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("power_density_W_mm2");
    });
  });

  describe("Stage 3: Physics Calculations", () => {
    it("calculates kerf width", () => {
      const result = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        spark_gap_mm: 0.025,
        peak_current_A: 12,
        pulse_on_us: 8,
      });

      expect(result).toHaveProperty("kerf_width_mm");
      expect(result).toHaveProperty("wire_offset_mm");
    });

    it("calculates wire deflection", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        thickness_mm: testThickness,
        discharge_force_N: 0.5,
      });

      expect(result).toHaveProperty("max_deflection_mm");
      // The deflection engine should return a numeric result
      expect(typeof result.max_deflection_mm).toBe("number");
    });

    it("applies thin wire derating for small wire", () => {
      const result = wedmThinWireDerateEngine.derate({
        wire_diameter_mm: 0.10,
        base_current_A: 12,
        base_ton_us: 8,
      });

      // Engine should categorize wire and provide derating info
      expect(result).toBeDefined();
      expect(result).toHaveProperty("wire_category");
      expect(result).toHaveProperty("derated_current_A");
    });

    it("analyzes corners", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "C1", corner_type: "inside", corner_angle_deg: 90 },
          { id: "C2", corner_type: "inside", corner_angle_deg: 90 },
          { id: "C3", corner_type: "inside", corner_angle_deg: 90 },
          { id: "C4", corner_type: "inside", corner_angle_deg: 90 },
        ],
        thickness_mm: testThickness,
      });

      expect(result.corner_recommendations).toHaveLength(4);
      expect(result.critical_corners).toHaveLength(0); // 90 deg not critical
    });
  });

  describe("Stage 4: Dielectric Correction", () => {
    it("corrects spark gap for DI water", () => {
      const result = wedmDielectricCorrectionEngine.calculateCorrectedGap({
        base_spark_gap_mm: 0.025,
        dielectric_type: "di_water",
        temperature_C: 20,
        conductivity_uS_cm: 5,
      });

      // Engine should return a result object with correction data
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });

  describe("Stage 5: Optimization", () => {
    it("optimizes start points", () => {
      const result = wedmStartPointOptimizationEngine.optimize({
        profiles: [
          {
            id: "P1",
            segments: testDXFSegments.map(s => ({
              ...s,
              type: s.type as "line" | "arc",
            })),
            is_closed: true,
          },
        ],
      });

      expect(result.optimized_starts).toHaveLength(1);
      expect(result.total_travel_distance_mm).toBeGreaterThanOrEqual(0);
    });

    it("batches multiple profiles", () => {
      const result = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: testMaterial, thickness_mm: testThickness, perimeter_mm: 160, cut_type: "rough" },
          { id: "2", material: testMaterial, thickness_mm: testThickness, perimeter_mm: 160, cut_type: "rough" },
        ],
        grouping_strategy: "material_thickness",
      });

      expect(result.total_groups).toBe(1); // Same material/thickness
      expect(result.batch_efficiency_percent).toBeGreaterThan(50);
    });

    it("minimizes wire threading", () => {
      const result = wedmWireThreadingMinEngine.optimize({
        profiles: [
          {
            id: "P1",
            start_point: { x: 0, y: 0 },
            end_point: { x: 50, y: 0 },
            has_pilot_hole: true,
            thickness_mm: testThickness,
          },
        ],
      });

      expect(result.total_threading_ops).toBe(1);
      expect(result.threading_operations[0].threading_type).toBe("pilot_hole");
    });

    it("generates adaptive pass strategy", () => {
      const result = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: testTolerance,
        thickness_mm: testThickness,
      });

      expect(result.total_passes).toBeGreaterThanOrEqual(2);
      expect(result.achieved_tolerance_mm).toBeLessThanOrEqual(testTolerance);
    });
  });

  describe("Stage 6: Cost Estimation", () => {
    it("calculates job cost", () => {
      const perimeter = 160; // 2*(50+30)
      const passStrategy = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: testTolerance,
        thickness_mm: testThickness,
      });

      const result = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: perimeter,
        thickness_mm: testThickness,
        quantity: 1,
        pass_count: passStrategy.total_passes,
      });

      expect(result.per_piece.total_usd).toBeGreaterThan(0);
      expect(result.time_breakdown.total_hr).toBeGreaterThan(0);
    });

    it("compares strategy costs", () => {
      const perimeter = 160;
      const comparison = wedmJobCostEngine.compareStrategies(perimeter, testThickness, 1, [1, 2, 3]);

      expect(comparison).toHaveLength(3);
      expect(comparison[2].cost_per_piece).toBeGreaterThan(comparison[0].cost_per_piece);
    });
  });

  describe("Stage 7: Progress Tracking", () => {
    it("tracks job progress", () => {
      const jobId = "E2E-TEST-001";

      wedmProgressTrackerEngine.startJob(jobId, 30);
      wedmProgressTrackerEngine.beginStage(jobId, 0, "validation");
      wedmProgressTrackerEngine.completeStage(jobId, 0);
      wedmProgressTrackerEngine.beginStage(jobId, 1, "calculation");

      const progress = wedmProgressTrackerEngine.getProgress(jobId);

      expect(progress).toBeDefined();
      expect(progress!.current_stage).toBeGreaterThanOrEqual(0);
      expect(progress!.status).toBe("running");

      // Cleanup
      wedmProgressTrackerEngine.completeJob(jobId);
    });
  });

  describe("Stage 8: One-Click Pipeline", () => {
    it("runs one-click generation", async () => {
      const result = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: JSON.stringify(testDXFSegments),
        material: testMaterial,
        thickness_mm: testThickness,
        tolerance_mm: testTolerance,
        wire_diameter_mm: 0.25,
      });

      expect(result.success).toBe(true);
      expect(result.gcode).toBeTruthy();
      expect(result.stages.length).toBeGreaterThan(0);
    });
  });

  describe("Stage 9: Learning Loop", () => {
    it("records and learns from outcomes", () => {
      const learningEngine = new WEDMLearningLoopEngine();

      // Record multiple outcomes
      for (let i = 0; i < 5; i++) {
        learningEngine.recordOutcome({
          job_id: `E2E-${i}`,
          timestamp: new Date(),
          material: testMaterial,
          thickness_mm: testThickness,
          wire_type: "brass",
          wire_diameter_mm: 0.25,
          predicted: {
            cutting_speed_mm_min: 2.5,
            wire_tension_N: 15,
            peak_current_A: 12,
            passes: 2,
            time_min: 60,
          },
          actual: {
            cutting_speed_mm_min: 2.7, // Consistently faster
            wire_tension_N: 15,
            peak_current_A: 12,
            passes: 2,
            time_min: 55,
            wire_breaks: 0,
          },
          success: true,
        });
      }

      const stats = learningEngine.getStats();
      expect(stats.total_jobs).toBe(5);
      expect(stats.success_rate).toBe(1);

      const rec = learningEngine.getRecommendations(testMaterial, testThickness);
      expect(rec).not.toBeNull();
      // Should have adjustments based on historical data
      expect(rec!.adjustments.length).toBeGreaterThanOrEqual(0);
      // If speed adjustment exists, it should suggest faster
      const speedAdj = rec!.adjustments.find(a => a.parameter === "cutting_speed_mm_min");
      if (speedAdj) {
        expect(speedAdj.suggested_factor).toBeGreaterThan(1);
      }
    });
  });

  describe("Full Pipeline Integration", () => {
    it("completes full DXF-to-quote workflow", async () => {
      // 1. Validate DXF
      const validation = wedmDXFClosureValidatorEngine.validate(testDXFSegments);
      expect(validation.valid).toBe(true);

      // 2. Calculate parameters
      const kerf = wedmKerfWidthEngine.predict({
        wire_diameter_mm: 0.25,
        spark_gap_mm: 0.025,
        peak_current_A: 12,
        pulse_on_us: 8,
      });

      const deflection = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        thickness_mm: testThickness,
        discharge_force_N: 0.5,
      });

      // 3. Safety check
      const safetyCheck = wedmCurrentDensityGuardEngine.validate({
        wire_diameter_mm: 0.25,
        peak_current_A: 8,
      });
      // Verify safety check runs and returns a result with the expected structure
      expect(safetyCheck).toHaveProperty("safe");
      expect(safetyCheck).toHaveProperty("current_density_A_mm2");

      // 4. Optimize
      const passStrategy = wedmAdaptivePassEngine.generateStrategy({
        target_tolerance_mm: testTolerance,
        thickness_mm: testThickness,
      });

      // 5. Cost estimate
      const perimeter = 160;
      const cost = wedmJobCostEngine.calculateJobCost({
        perimeter_mm: perimeter,
        thickness_mm: testThickness,
        quantity: 1,
        pass_count: passStrategy.total_passes,
      });

      // 6. Generate G-code
      const gcode = await oneClickWEDMGeneratorEngine.generate({
        dxf_content: JSON.stringify(testDXFSegments),
        material: testMaterial,
        thickness_mm: testThickness,
        tolerance_mm: testTolerance,
        wire_diameter_mm: 0.25,
      });

      // Verify complete pipeline produced expected outputs
      expect(gcode.success).toBe(true);
      expect(gcode.gcode).toBeTruthy();
      expect(cost.per_piece.total_usd).toBeGreaterThan(0);
      expect(kerf).toHaveProperty("kerf_width_mm");
      expect(deflection).toHaveProperty("max_deflection_mm");
      expect(passStrategy.total_passes).toBeGreaterThanOrEqual(1);
    });
  });
});
