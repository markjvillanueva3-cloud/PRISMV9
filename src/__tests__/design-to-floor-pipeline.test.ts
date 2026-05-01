/**
 * Tests for DesignToFloorPipelineEngine
 * Closed-loop manufacturing pipeline: Design -> Simulate -> Execute -> Measure -> Calibrate -> Improve
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  DesignToFloorPipelineEngine,
  type PreFlightInput,
  type FloorExecutionInput,
  type MeasurementInput,
} from "../engines/DesignToFloorPipelineEngine.js";

// ─── Test Fixtures ───────────────────────────────────────────────────

const SAMPLE_GCODE = `
O1000
G90 G21
T1 M6
S8000 M3
M8
G0 X0 Y0 Z10
G1 Z-5 F200
G1 X50 F500
G1 Y50
G1 X0
G1 Y0
G0 Z10
M5
M9
M30
`.trim();

const MINIMAL_GCODE = "G90 G21\nG0 X0 Y0 Z5\nM30";

const UNSAFE_GCODE = `
G90 G21
G1 X50 F500
G0 Z-100
S30000 M3
M30
`.trim();

function makeMeasurements(count: number, deviationScale = 0.005) {
  return Array.from({ length: count }, (_, i) => ({
    feature: `DIM-${String(i + 1).padStart(3, "0")}`,
    nominal: 25.0 + i * 0.1,
    actual: 25.0 + i * 0.1 + (i % 2 === 0 ? deviationScale : -deviationScale),
    tolerance: 0.05,
    unit: "mm",
  }));
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("DesignToFloorPipelineEngine", () => {
  let engine: DesignToFloorPipelineEngine;

  beforeEach(() => {
    engine = new DesignToFloorPipelineEngine();
  });

  // ─── Pre-Flight (Stages 1-4) ────────────────────────────────────

  describe("runPreFlightAnalysis", () => {
    it("should complete all 4 stages with valid G-code", () => {
      const result = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "steel_1045" });

      expect(result.job_id).toMatch(/^D2F-\d{4}$/);
      expect(result.stages_completed).toEqual(["PRE-PROCESS", "SIMULATE", "SAFETY-CHECK", "RISK-ASSESS"]);
      expect(result.block_count).toBeGreaterThan(0);
      expect(result.context.material).toBe("steel_1045");
      expect(result.simulation.cutting_force_N).toBeGreaterThan(0);
      expect(result.simulation.cycle_time_sec).toBeGreaterThan(0);
      expect(result.simulation.tool_life_min).toBeGreaterThan(0);
      expect(result.risk.overall_risk).toBeDefined();
      expect(result.timestamp).toBeTruthy();
    });

    it("should generate unique job IDs", () => {
      const r1 = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      const r2 = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      expect(r1.job_id).not.toBe(r2.job_id);
    });

    it("should detect safety violations in unsafe G-code", () => {
      const result = engine.runPreFlightAnalysis({ gcode: UNSAFE_GCODE });

      expect(result.safety.violations.length).toBeGreaterThan(0);
      expect(result.safety.pass).toBe(false);
      // Should flag cutting without spindle and/or deep rapid
      const ruleIds = result.safety.violations.map(v => v.rule_id);
      expect(ruleIds.some(id => id === "SAF-001" || id === "SAF-003")).toBe(true);
    });

    it("should handle minimal G-code", () => {
      const result = engine.runPreFlightAnalysis({ gcode: MINIMAL_GCODE });

      expect(result.stages_completed.length).toBe(4);
      expect(result.block_count).toBeGreaterThan(0);
      expect(result.safety.pass).toBe(true);
    });

    it("should handle empty G-code gracefully", () => {
      const result = engine.runPreFlightAnalysis({ gcode: "" });

      expect(result.stages_completed.length).toBe(4);
      expect(result.block_count).toBe(0);
      expect(result.safety.violations.length).toBe(0);
    });

    it("should use default material when unknown material is specified", () => {
      const result = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "unobtanium_9999" });

      expect(result.simulation.cutting_force_N).toBeGreaterThan(0);
      expect(result.stages_completed.length).toBe(4);
    });

    it("should compute Monte Carlo risk assessment", () => {
      const result = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "steel_1045", mc_samples: 200 });

      expect(result.risk.force_mean_N).toBeGreaterThan(0);
      expect(result.risk.force_ci95_low_N).toBeLessThan(result.risk.force_ci95_high_N);
      expect(result.risk.deflection_mean_um).toBeGreaterThanOrEqual(0);
      expect(result.risk.p_chatter).toBeGreaterThanOrEqual(0);
      expect(result.risk.p_chatter).toBeLessThanOrEqual(1);
      expect(result.risk.p_tool_break).toBeGreaterThanOrEqual(0);
      expect(["low", "medium", "high", "critical"]).toContain(result.risk.overall_risk);
    });

    it("should provide recommendations", () => {
      const result = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should accept custom tool parameters", () => {
      const result = engine.runPreFlightAnalysis({
        gcode: SAMPLE_GCODE,
        tool_diameter_mm: 20,
        tool_length_mm: 100,
        tool_flutes: 6,
        ap_mm: 3,
        ae_mm: 10,
      });

      expect(result.context.tool_diameter_mm).toBe(20);
      expect(result.context.tool_flutes).toBe(6);
    });
  });

  // ─── Floor Execution (Stage 5) ──────────────────────────────────

  describe("recordFloorExecution", () => {
    it("should record execution data and compute deltas", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      const result = engine.recordFloorExecution({
        job_id: pf.job_id,
        actual_cycle_time_sec: pf.simulation.cycle_time_sec * 1.1,
        actual_tool_changes: 1,
      });

      expect(result.recorded).toBe(true);
      expect(result.cycle_time_delta_pct).toBeCloseTo(10, 0);
      expect(result.event_count).toBe(0);
    });

    it("should track events (tool break, chatter, alarm)", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      const result = engine.recordFloorExecution({
        job_id: pf.job_id,
        actual_cycle_time_sec: 120,
        actual_tool_changes: 2,
        events: [
          { type: "chatter", time_sec: 30, detail: "Chatter detected at slot entry" },
          { type: "tool_break", time_sec: 60, detail: "T1 broke at full engagement" },
          { type: "alarm", time_sec: 61, detail: "E-stop activated" },
        ],
      });

      expect(result.event_count).toBe(3);
      expect(result.severity_summary.tool_breaks).toBe(1);
      expect(result.severity_summary.chatter_events).toBe(1);
      expect(result.severity_summary.alarms).toBe(1);
    });

    it("should throw for unknown job_id", () => {
      expect(() => engine.recordFloorExecution({
        job_id: "D2F-9999",
        actual_cycle_time_sec: 100,
        actual_tool_changes: 1,
      })).toThrow("Job D2F-9999 not found");
    });
  });

  // ─── Measurements (Stage 6) ─────────────────────────────────────

  describe("submitMeasurements", () => {
    it("should analyze feature deviations and report pass/fail", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      engine.recordFloorExecution({
        job_id: pf.job_id,
        actual_cycle_time_sec: 100,
        actual_tool_changes: 1,
      });

      const result = engine.submitMeasurements({
        job_id: pf.job_id,
        measurements: makeMeasurements(5, 0.01), // Within tolerance
      });

      expect(result.total_features).toBe(5);
      expect(result.in_tolerance_count).toBe(5);
      expect(result.pass_rate_pct).toBe(100);
      expect(result.overall_quality).toBeDefined();
    });

    it("should detect out-of-tolerance features", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      engine.recordFloorExecution({
        job_id: pf.job_id,
        actual_cycle_time_sec: 100,
        actual_tool_changes: 1,
      });

      const measurements = [
        { feature: "BORE-001", nominal: 25.0, actual: 25.08, tolerance: 0.05 },
        { feature: "BORE-002", nominal: 30.0, actual: 30.01, tolerance: 0.05 },
      ];

      const result = engine.submitMeasurements({
        job_id: pf.job_id,
        measurements,
      });

      expect(result.out_of_tolerance_count).toBe(1);
      expect(result.overall_quality).toBe("fail");
      expect(result.feature_deviations[0].in_tolerance).toBe(false);
      expect(result.feature_deviations[1].in_tolerance).toBe(true);
    });

    it("should compare surface roughness predicted vs actual", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      engine.recordFloorExecution({
        job_id: pf.job_id,
        actual_cycle_time_sec: 100,
        actual_tool_changes: 1,
      });

      const result = engine.submitMeasurements({
        job_id: pf.job_id,
        measurements: makeMeasurements(3),
        surface_roughness_ra: 1.6,
      });

      expect(result.surface_roughness).toBeDefined();
      expect(result.surface_roughness!.actual_ra).toBe(1.6);
      expect(result.surface_roughness!.predicted_ra).toBeGreaterThan(0);
    });

    it("should assess tool wear rate", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      engine.recordFloorExecution({
        job_id: pf.job_id,
        actual_cycle_time_sec: 600,
        actual_tool_changes: 1,
      });

      const result = engine.submitMeasurements({
        job_id: pf.job_id,
        measurements: makeMeasurements(2),
        tool_wear_flank_mm: 0.15,
      });

      expect(result.tool_wear).toBeDefined();
      expect(result.tool_wear!.flank_wear_mm).toBe(0.15);
      expect(["normal", "accelerated", "slow"]).toContain(result.tool_wear!.wear_rate_assessment);
    });

    it("should throw for unknown job_id", () => {
      expect(() => engine.submitMeasurements({
        job_id: "D2F-9999",
        measurements: makeMeasurements(1),
      })).toThrow("Job D2F-9999 not found");
    });
  });

  // ─── Calibration (Stage 7) ──────────────────────────────────────

  describe("runCalibrationUpdate", () => {
    it("should Bayesian-update kc1.1 based on measurement deviations", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "steel_1045" });
      engine.recordFloorExecution({
        job_id: pf.job_id,
        actual_cycle_time_sec: 100,
        actual_tool_changes: 1,
      });
      engine.submitMeasurements({
        job_id: pf.job_id,
        measurements: makeMeasurements(5, 0.02),
      });

      const result = engine.runCalibrationUpdate({ job_id: pf.job_id });

      expect(result.updates_applied).toBe(true);
      expect(result.material).toBe("steel_1045");
      expect(result.kc1_1_shift).toBeDefined();
      expect(result.kc1_1_shift!.old).toBeGreaterThan(0);
      expect(result.observation_count).toBe(1);
      expect(result.confidence_improvement_pct).toBeGreaterThan(0);
    });

    it("should update Taylor constants when tool wear data available", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "steel_1045" });
      engine.recordFloorExecution({
        job_id: pf.job_id,
        actual_cycle_time_sec: 600,
        actual_tool_changes: 1,
      });
      engine.submitMeasurements({
        job_id: pf.job_id,
        measurements: makeMeasurements(3),
        tool_wear_flank_mm: 0.12,
      });

      const result = engine.runCalibrationUpdate({ job_id: pf.job_id });

      expect(result.taylor_C_shift).toBeDefined();
      expect(result.taylor_C_shift!.old).toBeGreaterThan(0);
    });

    it("should throw without measurements", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      expect(() => engine.runCalibrationUpdate({ job_id: pf.job_id }))
        .toThrow("no measurements");
    });

    it("should accumulate observations across multiple jobs", () => {
      // Job 1
      const pf1 = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "steel_1045" });
      engine.recordFloorExecution({ job_id: pf1.job_id, actual_cycle_time_sec: 100, actual_tool_changes: 1 });
      engine.submitMeasurements({ job_id: pf1.job_id, measurements: makeMeasurements(3) });
      const r1 = engine.runCalibrationUpdate({ job_id: pf1.job_id });

      // Job 2
      const pf2 = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "steel_1045" });
      engine.recordFloorExecution({ job_id: pf2.job_id, actual_cycle_time_sec: 105, actual_tool_changes: 1 });
      engine.submitMeasurements({ job_id: pf2.job_id, measurements: makeMeasurements(3) });
      const r2 = engine.runCalibrationUpdate({ job_id: pf2.job_id });

      expect(r2.observation_count).toBe(2);
      expect(r2.confidence_improvement_pct).toBeGreaterThan(r1.confidence_improvement_pct);
    });
  });

  // ─── SPC Dashboard (Stage 8) ────────────────────────────────────

  describe("getSPCDashboard", () => {
    it("should return empty dashboard when no data", () => {
      const result = engine.getSPCDashboard({});

      expect(result.job_count).toBe(0);
      expect(result.overall_status).toBe("in_control");
      expect(result.control_chart.length).toBe(0);
    });

    it("should build control chart from multiple jobs", () => {
      // Create 5 jobs with measurements
      for (let i = 0; i < 5; i++) {
        const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "steel_1045" });
        engine.recordFloorExecution({ job_id: pf.job_id, actual_cycle_time_sec: 100 + i, actual_tool_changes: 1 });
        engine.submitMeasurements({
          job_id: pf.job_id,
          measurements: [{ feature: "BORE-001", nominal: 25.0, actual: 25.0 + (i - 2) * 0.005, tolerance: 0.05 }],
        });
      }

      const result = engine.getSPCDashboard({});

      expect(result.job_count).toBe(5);
      expect(result.feature_count).toBeGreaterThanOrEqual(1);
      expect(result.cpk_trend.length).toBe(5);
      expect(result.control_chart.length).toBe(5);
      expect(result.control_chart[0].ucl).toBeGreaterThan(result.control_chart[0].lcl);
    });

    it("should filter by feature name", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      engine.recordFloorExecution({ job_id: pf.job_id, actual_cycle_time_sec: 100, actual_tool_changes: 1 });
      engine.submitMeasurements({
        job_id: pf.job_id,
        measurements: [
          { feature: "BORE-001", nominal: 25.0, actual: 25.01, tolerance: 0.05 },
          { feature: "SLOT-001", nominal: 10.0, actual: 10.02, tolerance: 0.05 },
        ],
      });

      const result = engine.getSPCDashboard({ feature_name: "BORE-001" });
      expect(result.feature_count).toBe(1);
    });

    it("should detect drift across jobs", () => {
      // Create 10 jobs with steadily increasing deviation (drift)
      for (let i = 0; i < 10; i++) {
        const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
        engine.recordFloorExecution({ job_id: pf.job_id, actual_cycle_time_sec: 100, actual_tool_changes: 1 });
        engine.submitMeasurements({
          job_id: pf.job_id,
          measurements: [{ feature: "DIM-001", nominal: 25.0, actual: 25.0 + i * 0.005, tolerance: 0.05 }],
        });
      }

      const result = engine.getSPCDashboard({});
      // Should detect positive drift
      expect(result.drift_alerts.length).toBeGreaterThan(0);
      expect(result.drift_alerts[0].direction).toBe("positive");
    });
  });

  // ─── Job History ────────────────────────────────────────────────

  describe("getJobHistory", () => {
    it("should return empty array when no jobs", () => {
      expect(engine.getJobHistory({})).toEqual([]);
    });

    it("should return job summary with stages completed", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      engine.recordFloorExecution({ job_id: pf.job_id, actual_cycle_time_sec: 100, actual_tool_changes: 1 });

      const history = engine.getJobHistory({ job_id: pf.job_id });
      expect(history.length).toBe(1);
      expect(history[0].stages).toContain("preflight");
      expect(history[0].stages).toContain("execution");
      expect(history[0].calibrated).toBe(false);
    });

    it("should limit results with last_n", () => {
      for (let i = 0; i < 10; i++) {
        engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      }
      const history = engine.getJobHistory({ last_n: 3 });
      expect(history.length).toBe(3);
    });

    it("should return empty for unknown job_id", () => {
      expect(engine.getJobHistory({ job_id: "D2F-9999" })).toEqual([]);
    });
  });

  // ─── Full Pipeline Integration ──────────────────────────────────

  describe("runFullPipeline", () => {
    it("should execute all 8 stages end-to-end", () => {
      const result = engine.runFullPipeline({
        gcode: SAMPLE_GCODE,
        material: "steel_1045",
        tool_diameter_mm: 12,
        tool_length_mm: 80,
        tool_flutes: 4,
        actual_cycle_time_sec: 120,
        actual_tool_changes: 1,
        measurements: makeMeasurements(4, 0.01),
        tool_wear_flank_mm: 0.08,
        surface_roughness_ra: 1.2,
        operator_notes: "Smooth cut, no issues",
      });

      expect(result.preflight.stages_completed.length).toBe(4);
      expect(result.execution.recorded).toBe(true);
      expect(result.measurement.total_features).toBe(4);
      expect(result.calibration.updates_applied).toBe(true);
      expect(result.spc.job_count).toBe(1);
    });

    it("should improve calibration confidence over multiple full pipeline runs", () => {
      const results: any[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(engine.runFullPipeline({
          gcode: SAMPLE_GCODE,
          material: "steel_1045",
          actual_cycle_time_sec: 100 + i * 2,
          actual_tool_changes: 1,
          measurements: makeMeasurements(3, 0.008 + i * 0.001),
          tool_wear_flank_mm: 0.05 + i * 0.01,
        }));
      }

      // Confidence should generally increase
      expect(results[4].calibration.observation_count).toBe(5);
      expect(results[4].calibration.confidence_improvement_pct)
        .toBeGreaterThan(results[0].calibration.confidence_improvement_pct);
      // SPC should have all 5 jobs
      expect(results[4].spc.job_count).toBe(5);
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle reset correctly", () => {
      engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      expect(engine.getJobCount()).toBe(1);

      engine.reset();
      expect(engine.getJobCount()).toBe(0);
      expect(engine.getJobHistory({})).toEqual([]);
    });

    it("should handle measurements without prior execution", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE });
      // Skip execution, go straight to measurement
      const result = engine.submitMeasurements({
        job_id: pf.job_id,
        measurements: makeMeasurements(2),
      });

      expect(result.total_features).toBe(2);
      // Tool wear assessment not available without execution
      expect(result.tool_wear).toBeUndefined();
    });

    it("should return calibration state", () => {
      const pf = engine.runPreFlightAnalysis({ gcode: SAMPLE_GCODE, material: "steel_1045" });
      engine.recordFloorExecution({ job_id: pf.job_id, actual_cycle_time_sec: 100, actual_tool_changes: 1 });
      engine.submitMeasurements({ job_id: pf.job_id, measurements: makeMeasurements(2) });
      engine.runCalibrationUpdate({ job_id: pf.job_id });

      const state = engine.getCalibrationState("steel_1045");
      expect(state).not.toBeNull();
      expect(state.observations).toBe(1);
      expect(state.kc1_1_mean).toBeGreaterThan(0);
    });
  });
});
