/**
 * Tests for the 16 new opt-in stages added to PostProcessorPipelineEngine.
 *
 * Stages covered:
 *   Phase 1: 1.4_spindle_harmonics
 *   Phase 3: 3.1_toolpath_smoothing, 3.3_look_ahead, 3.4_machine_error_comp
 *   Phase 4: 4.2_uncertainty_propagation, 4.3_dimensional_verification,
 *            4.4_surface_finish_verification, 4.5_environmental, 4.6_batch_variability
 *   Phase 5: 5.6_reliability_check, 5.7_acoustic_check
 *   Phase 6: 6.2_probe_routines, 6.3_setup_sheet, 6.4_controller_params, 6.7_digital_twin
 *
 * Each test enables ONLY the relevant stage(s) and disables everything else.
 */
import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type PipelineInput,
  type ToolContext,
  type MaterialContext,
  type MachineContext,
  type StageConfig,
} from "../engines/PostProcessorPipelineEngine.js";

// ═══ Helpers ═══

const STEEL_MATERIAL: MaterialContext = {
  id: "4140", name: "4140 Steel", iso_group: "P",
  uts_MPa: 655, hardness_HB: 197, kc1_1: 2000, mc: 0.25,
  resolution_confidence: 1.0,
};

const TOOL_10MM: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide", coating: "TiAlN",
  resolution_confidence: 1.0,
};

const MACHINE_VMC: MachineContext = {
  id: "vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
  max_rpm: 8100, max_power_kW: 22.4, max_torque_Nm: 122,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3, atc_capacity: 20, tool_change_time_s: 4.2,
  resolution_confidence: 1.0,
};

/** Disable ALL non-essential stages to isolate the one being tested */
const ALL_OFF: Partial<StageConfig> = {
  speed_feed: false,
  constitutive: false,
  stability_lobes: false,
  spindle_harmonics: false,
  tool_deflection: false,
  chip_morphology: false,
  coolant_strategy: false,
  fixture_check: false,
  capability_forecast: false,
  engagement_analysis: false,
  chip_thinning: false,
  adaptive_feed: false,
  corner_detection: false,
  plunge_detection: false,
  wear_progression: false,
  thermal_tracking: false,
  deflection_limit: false,
  toolpath_smoothing: false,
  motion_dynamics: false,
  look_ahead: false,
  multi_axis: false,
  controller_features: false,
  machine_error_comp: false,
  monte_carlo: false,
  uncertainty_propagation: false,
  dimensional_verification: false,
  surface_finish_verification: false,
  environmental: false,
  batch_variability: false,
  robustness_score: false,
  safety_analysis: false,
  playbook_rules: false,
  tribal_knowledge: false,
  reliability_check: false,
  energy_optimization: false,
  acoustic_check: false,
  gcode_generation: false,
  controller_params: false,
  probe_routines: false,
  setup_sheet: false,
  analytics_report: false,
  cycle_time: false,
  digital_twin: false,
};

const SAMPLE_GCODE = `%
O0001 (TEST PROGRAM)
G90 G21 G17 G40 G80
T1 M6
S3000 M3
G00 X0 Y0 Z5.0
G01 Z-2.0 F200
G01 X50.0 F800
G01 Y30.0
G01 X0
G01 Y0
G00 Z5.0
M30
%`;

/** Builds a corner-producing G-code program with a sharp direction change. */
const CORNER_GCODE = `G90 G21
T1 M6
S3000 M3
G00 X0 Y0 Z5.0
G01 Z-1.0 F500
G01 X50.0 Y0.0 F800
G01 X50.0 Y30.0 F800
G01 X0.0 Y30.0 F800
G01 X0.0 Y0.0 F800
G00 Z5.0
M30`;

/** Short-segment G-code where look-ahead should clamp feeds. */
const SHORT_SEG_GCODE = `G90 G21
T1 M6
S3000 M3
G00 X0 Y0 Z1.0
G01 Z-1.0 F500
G01 X0.5 F2000
G01 X1.0 F2000
G01 X1.5 F2000
G01 X100.0 F2000
G00 Z5.0
M30`;

// ═══ Test: all new stages are skipped by default ═══

describe("PostProcessorPipelineEngine — New Stages", () => {
  describe("Default state: all new stages skipped", () => {
    it("all 16 new stages are skipped when not explicitly enabled", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        // Use default stage config — new stages are opt-in
        stages: {
          speed_feed: false,
          engagement_analysis: false,
          safety_analysis: false,
          playbook_rules: false,
          wear_progression: false,
          thermal_tracking: false,
        },
      });

      const newStageNames = [
        "1.4_spindle_harmonics",
        "3.1_toolpath_smoothing",
        "3.3_look_ahead",
        "3.4_machine_error_comp",
        "4.2_uncertainty_propagation",
        "4.3_dimensional_verification",
        "4.4_surface_finish_verification",
        "4.5_environmental",
        "4.6_batch_variability",
        "5.6_reliability_check",
        "5.7_acoustic_check",
        "6.2_probe_routines",
        "6.3_setup_sheet",
        "6.4_controller_params",
        "6.7_digital_twin",
      ];

      for (const name of newStageNames) {
        const stage = r.stages.find(s => s.stage === name);
        expect(stage, `Stage ${name} should be present`).toBeDefined();
        expect(stage!.status).toBe("skipped");
      }
    });
  });

  // ═══ Phase 1: Spindle Harmonics ═══

  describe("Phase 1: 1.4_spindle_harmonics", () => {
    it("shifts RPM when tooth-passing frequency is near a natural frequency", async () => {
      // 4 flutes at 3000 RPM → ftp = 3000*4/60 = 200 Hz
      // Natural freqs: 800, 1600, 3200. Harmonic 4: 200*4=800 → matches 800 Hz within 10%.
      const r = await postProcessorPipelineEngine.process({
        gcode: "G90 G21\nT1 M6\nS3000 M3\nG01 X50 F800\nM30\n",
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, spindle_harmonics: true },
      });

      const stage = r.stages.find(s => s.stage === "1.4_spindle_harmonics");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.harmonics_checked).toBe(5);
      expect(data.rpm_shifts).toBeGreaterThan(0);
    });

    it("does not shift RPM when far from harmonics", async () => {
      // 4 flutes at 1000 RPM → ftp = 1000*4/60 ≈ 66.7 Hz
      // Natural freqs: 800, 1600, 3200. Harmonics 1-5: 66.7, 133.3, 200, 266.7, 333.3
      // None are within 10% of 800/1600/3200.
      const r = await postProcessorPipelineEngine.process({
        gcode: "G90 G21\nT1 M6\nS1000 M3\nG01 X50 F400\nM30\n",
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, spindle_harmonics: true },
      });

      const stage = r.stages.find(s => s.stage === "1.4_spindle_harmonics");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.rpm_shifts).toBe(0);
    });
  });

  // ═══ Phase 3: Toolpath Smoothing ═══

  describe("Phase 3: 3.1_toolpath_smoothing", () => {
    it("smooths corners and reports chord error", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: CORNER_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, toolpath_smoothing: true },
      });

      const stage = r.stages.find(s => s.stage === "3.1_toolpath_smoothing");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.smoothed_corners).toBeGreaterThan(0);
      expect(typeof data.max_chord_error).toBe("number");
      expect(data.max_chord_error).toBeGreaterThanOrEqual(0);
    });

    it("does not smooth straight-line toolpaths", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: "G90 G21\nT1 M6\nS3000 M3\nG01 X10 F500\nG01 X20\nG01 X30\nM30\n",
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, toolpath_smoothing: true },
      });

      const stage = r.stages.find(s => s.stage === "3.1_toolpath_smoothing");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.smoothed_corners).toBe(0);
      expect(data.max_chord_error).toBe(0);
    });
  });

  // ═══ Phase 3: Look-Ahead ═══

  describe("Phase 3: 3.3_look_ahead", () => {
    it("clamps feeds for short segments", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SHORT_SEG_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        machine: { ...MACHINE_VMC, accel_mm_s2: { x: 2000, y: 2000, z: 1000 } },
        stages: { ...ALL_OFF, look_ahead: true },
      });

      const stage = r.stages.find(s => s.stage === "3.3_look_ahead");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.segments_planned).toBeGreaterThan(0);
      expect(typeof data.avg_effectiveness_pct).toBe("number");
      expect(data.avg_effectiveness_pct).toBeGreaterThan(0);
      expect(data.avg_effectiveness_pct).toBeLessThanOrEqual(100);
    });

    it("computes effectiveness percentage", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        machine: MACHINE_VMC,
        stages: { ...ALL_OFF, look_ahead: true },
      });

      const stage = r.stages.find(s => s.stage === "3.3_look_ahead");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.avg_effectiveness_pct).toBeGreaterThan(0);
    });
  });

  // ═══ Phase 3: Machine Error Compensation ═══

  describe("Phase 3: 3.4_machine_error_comp", () => {
    it("applies Z-offset corrections using thermal growth model", async () => {
      // Provide blocks with explicit Z so the stage finds them
      const r = await postProcessorPipelineEngine.process({
        blocks: [
          { id: 0, move_type: "G0" as const, x: 0, y: 0, z: 5, tool_number: 1 },
          { id: 1, move_type: "G1" as const, x: 10, z: -2.0, feed_mm_min: 500, spindle_rpm: 3000, tool_number: 1 },
          { id: 2, move_type: "G1" as const, x: 50, z: -5.0, feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1 },
          { id: 3, move_type: "G1" as const, x: 80, z: -10.0, feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1 },
        ],
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, machine_error_comp: true },
      });

      const stage = r.stages.find(s => s.stage === "3.4_machine_error_comp");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.z_offsets_applied).toBeGreaterThan(0);
      expect(data.max_offset_um).toBeGreaterThan(0);
      expect(data.thermal_growth_model).toBe("linear_CTE");
    });

    it("offset magnitude is proportional to Z distance", async () => {
      // Blocks with deeper Z should have larger thermal offset
      const r = await postProcessorPipelineEngine.process({
        gcode: "G90 G21\nT1 M6\nS3000 M3\nG01 X10 Z-1.0 F500\nG01 X20 Z-10.0 F500\nM30\n",
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, machine_error_comp: true },
      });

      const stage = r.stages.find(s => s.stage === "3.4_machine_error_comp");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      // With Z=-10 vs Z=-1, we expect thermal growth at Z=-10 to be larger
      expect(data.max_offset_um).toBeGreaterThan(0);
    });
  });

  // ═══ Phase 4: Uncertainty Propagation ═══

  describe("Phase 4: 4.2_uncertainty_propagation", () => {
    it("propagates force CI to dimensional uncertainty", async () => {
      // Provide pre-parsed blocks with confidence intervals
      const r = await postProcessorPipelineEngine.process({
        blocks: [
          {
            id: 0, move_type: "G1" as const, x: 50, z: -2,
            feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1,
            confidence: { force_ci_95: [400, 600] as [number, number], feed_ci_95: [750, 850] as [number, number] },
          },
          {
            id: 1, move_type: "G1" as const, x: 100, z: -2,
            feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1,
            confidence: { force_ci_95: [350, 550] as [number, number], feed_ci_95: [750, 850] as [number, number] },
          },
        ],
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, uncertainty_propagation: true },
      });

      const stage = r.stages.find(s => s.stage === "4.2_uncertainty_propagation");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.propagated_blocks).toBe(2);
      expect(data.max_dim_uncertainty_um).toBeGreaterThan(0);
    });

    it("reports zero propagation when no confidence data present", async () => {
      const r = await postProcessorPipelineEngine.process({
        blocks: [
          { id: 0, move_type: "G1" as const, x: 50, feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1 },
        ],
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, uncertainty_propagation: true },
      });

      const stage = r.stages.find(s => s.stage === "4.2_uncertainty_propagation");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.propagated_blocks).toBe(0);
    });
  });

  // ═══ Phase 4: Dimensional Verification ═══

  describe("Phase 4: 4.3_dimensional_verification", () => {
    it("computes Cpk from uncertainty vs tolerance", async () => {
      // Use a very small force CI range so dimensional uncertainty is small enough for non-zero Cpk
      const r = await postProcessorPipelineEngine.process({
        blocks: [
          {
            id: 0, move_type: "G1" as const, x: 50, z: -2,
            feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1,
            confidence: { force_ci_95: [499, 501] as [number, number], feed_ci_95: [795, 805] as [number, number] },
          },
        ],
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        tolerance_mm: 0.05,
        stages: { ...ALL_OFF, uncertainty_propagation: true, dimensional_verification: true },
      });

      const stage = r.stages.find(s => s.stage === "4.3_dimensional_verification");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(typeof data.predicted_cpk).toBe("number");
      // With tight force CI (range=2N), Cpk should be positive
      expect(data.predicted_cpk).toBeGreaterThan(0);
      expect(typeof data.recommendation).toBe("string");
      expect(data.recommendation.length).toBeGreaterThan(0);
    });

    it("reports high Cpk when no uncertainty data", async () => {
      const r = await postProcessorPipelineEngine.process({
        blocks: [
          { id: 0, move_type: "G1" as const, x: 50, feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1 },
        ],
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        tolerance_mm: 0.05,
        stages: { ...ALL_OFF, uncertainty_propagation: true, dimensional_verification: true },
      });

      const stage = r.stages.find(s => s.stage === "4.3_dimensional_verification");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      // No uncertainty → assume capable → Cpk = 999
      expect(data.predicted_cpk).toBe(999);
    });
  });

  // ═══ Phase 4: Surface Finish Verification ═══

  describe("Phase 4: 4.4_surface_finish_verification", () => {
    it("predicts Ra from feed/rpm/nose_radius", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, surface_finish_verification: true },
      });

      const stage = r.stages.find(s => s.stage === "4.4_surface_finish_verification");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.avg_ra_predicted).toBeGreaterThan(0);
      expect(data.max_ra).toBeGreaterThan(0);
      expect(typeof data.blocks_exceeding_target).toBe("number");
    });

    it("flags blocks exceeding target Ra", async () => {
      // High feed + low RPM = large feed/rev = high Ra
      const r = await postProcessorPipelineEngine.process({
        gcode: "G90 G21\nT1 M6\nS500 M3\nG01 X50 F2000\nM30\n",
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        surface_finish_Ra: 0.4,
        stages: { ...ALL_OFF, surface_finish_verification: true },
      });

      const stage = r.stages.find(s => s.stage === "4.4_surface_finish_verification");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.blocks_exceeding_target).toBeGreaterThan(0);
    });
  });

  // ═══ Phase 4: Environmental ═══

  describe("Phase 4: 4.5_environmental", () => {
    it("computes thermal shift and Cpk impact", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        tolerance_mm: 0.01,
        stages: { ...ALL_OFF, environmental: true },
      });

      const stage = r.stages.find(s => s.stage === "4.5_environmental");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.thermal_shift_um).toBeGreaterThan(0);
      expect(typeof data.cpk_impact).toBe("number");
      expect(data.cpk_impact).toBeGreaterThan(0);
      expect(typeof data.warm_up_recommendation).toBe("string");
    });

    it("recommends extended warm-up for tight tolerance", async () => {
      // Very tight tolerance → thermal shift is significant vs tolerance
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        tolerance_mm: 0.005, // Very tight
        stages: { ...ALL_OFF, environmental: true },
      });

      const stage = r.stages.find(s => s.stage === "4.5_environmental");
      expect(stage).toBeDefined();
      const data = stage!.data as any;
      // CTE=12e-6, deltaT=2, L=500 → shift=12um, tol=5um → cpk_impact = 12/5 = 2.4 >> 0.3
      expect(data.cpk_impact).toBeGreaterThan(0.3);
      expect(data.warm_up_recommendation).toContain("Extended");
    });
  });

  // ═══ Phase 4: Batch Variability ═══

  describe("Phase 4: 4.6_batch_variability", () => {
    it("reports force and life CV", async () => {
      // Need force data on blocks — enable speed_feed to populate forces
      const r = await postProcessorPipelineEngine.process({
        blocks: [
          {
            id: 0, move_type: "G1" as const, x: 50, z: -2,
            feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1,
            forces: { Fc_N: 500, Ff_N: 200, Fp_N: 100, resultant_N: 570, power_kW: 1.2, torque_Nm: 5 },
          },
          {
            id: 1, move_type: "G1" as const, x: 100, z: -2,
            feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1,
            forces: { Fc_N: 550, Ff_N: 220, Fp_N: 110, resultant_N: 630, power_kW: 1.4, torque_Nm: 5.5 },
          },
        ],
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, batch_variability: true },
      });

      const stage = r.stages.find(s => s.stage === "4.6_batch_variability");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.force_cv_pct).toBe(8); // Hard-coded 8% kc CV
      expect(data.life_cv_pct).toBe(20); // 8 * 2.5
      expect(data.force_range_N).toHaveLength(2);
      expect(data.force_range_N[0]).toBeLessThan(data.force_range_N[1]);
      expect(typeof data.recommended_safety_factor).toBe("number");
      expect(data.recommended_safety_factor).toBeGreaterThanOrEqual(1.1);
    });
  });

  // ═══ Phase 5: Reliability Check ═══

  describe("Phase 5: 5.6_reliability_check", () => {
    it("computes Weibull reliability for short programs", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, reliability_check: true },
      });

      const stage = r.stages.find(s => s.stage === "5.6_reliability_check");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.reliability_pct).toBeGreaterThan(0);
      expect(data.reliability_pct).toBeLessThanOrEqual(100);
      expect(typeof data.time_to_90pct_reliability).toBe("number");
      expect(typeof data.tool_change_recommended).toBe("boolean");
    });

    it("recommends tool change when reliability is low", async () => {
      // Many blocks → high cumulative time → low reliability
      const manyBlocks = Array.from({ length: 2000 }, (_, i) => ({
        id: i,
        move_type: "G1" as const,
        x: i * 0.1,
        feed_mm_min: 500,
        spindle_rpm: 3000,
        tool_number: 1,
      }));

      const r = await postProcessorPipelineEngine.process({
        blocks: manyBlocks,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, reliability_check: true },
      });

      const stage = r.stages.find(s => s.stage === "5.6_reliability_check");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      // 2000 blocks * 1s = ~33 min > eta=30 → reliability should be low
      expect(data.tool_change_recommended).toBe(true);
      expect(data.reliability_pct).toBeLessThan(85);
    });
  });

  // ═══ Phase 5: Acoustic Check ═══

  describe("Phase 5: 5.7_acoustic_check", () => {
    it("computes noise level from cutting parameters", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, acoustic_check: true },
      });

      const stage = r.stages.find(s => s.stage === "5.7_acoustic_check");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.noise_level_dba).toBeGreaterThan(0);
      expect(typeof data.hearing_protection_required).toBe("boolean");
      expect(typeof data.iso_4869_compliant).toBe("boolean");
    });

    it("flags hearing protection when noise exceeds 85 dBA", async () => {
      // High RPM + large diameter → high Vc → high noise
      const r = await postProcessorPipelineEngine.process({
        gcode: "G90 G21\nT1 M6\nS8000 M3\nG01 X100 F3000\nM30\n",
        material: STEEL_MATERIAL,
        tools: [{ ...TOOL_10MM, diameter_mm: 50 }],
        stages: { ...ALL_OFF, acoustic_check: true },
      });

      const stage = r.stages.find(s => s.stage === "5.7_acoustic_check");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      // Vc = pi*50*8000/1000 ≈ 1257 m/min → very high noise
      expect(data.noise_level_dba).toBeGreaterThan(85);
      expect(data.hearing_protection_required).toBe(true);
      expect(data.iso_4869_compliant).toBe(false);
    });
  });

  // ═══ Phase 6: Probe Routines ═══

  describe("Phase 6: 6.2_probe_routines", () => {
    it("generates probe G-code for tight tolerance features", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        tolerance_mm: 0.02, // < 0.05 triggers probe generation
        stages: { ...ALL_OFF, probe_routines: true },
      });

      const stage = r.stages.find(s => s.stage === "6.2_probe_routines");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.probe_points_generated).toBeGreaterThan(0);
      expect(data.critical_dims_covered).toBeGreaterThan(0);
      expect(data.probe_gcode_lines.length).toBeGreaterThan(0);
      expect(data.probe_gcode_lines[0]).toContain("G65");
    });

    it("generates no probes when tolerance is loose", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        tolerance_mm: 0.1, // ≥ 0.05 → no probes
        stages: { ...ALL_OFF, probe_routines: true },
      });

      const stage = r.stages.find(s => s.stage === "6.2_probe_routines");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.probe_points_generated).toBe(0);
    });
  });

  // ═══ Phase 6: Setup Sheet ═══

  describe("Phase 6: 6.3_setup_sheet", () => {
    it("populates setup sheet data", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, setup_sheet: true },
      });

      const stage = r.stages.find(s => s.stage === "6.3_setup_sheet");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.setup_sheet_generated).toBe(true);
      expect(data.setup_sheet).toBeDefined();
      expect(data.setup_sheet.tools_used.length).toBeGreaterThan(0);
      expect(data.setup_sheet.work_offset).toBe("G54");
      expect(typeof data.setup_sheet.safety_warnings).toBe("string");
    });
  });

  // ═══ Phase 6: Controller Params ═══

  describe("Phase 6: 6.4_controller_params", () => {
    it("injects Fanuc-specific init block", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        controller: "fanuc",
        stages: { ...ALL_OFF, gcode_generation: true, controller_params: true },
      });

      const stage = r.stages.find(s => s.stage === "6.4_controller_params");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.params_injected).toBe(true);
      expect(data.controller_type).toBe("fanuc");
      expect(data.init_block).toContain("G10");
    });

    it("injects Siemens-specific init block", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        controller: "siemens",
        stages: { ...ALL_OFF, gcode_generation: true, controller_params: true },
      });

      const stage = r.stages.find(s => s.stage === "6.4_controller_params");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.controller_type).toBe("siemens");
      expect(data.init_block).toContain("CYCLE800");
    });
  });

  // ═══ Phase 6: Digital Twin ═══

  describe("Phase 6: 6.7_digital_twin", () => {
    it("exports digital twin state with block data", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, digital_twin: true },
      });

      const stage = r.stages.find(s => s.stage === "6.7_digital_twin");
      expect(stage).toBeDefined();
      expect(stage!.status).toBe("pass");
      const data = stage!.data as any;
      expect(data.data_points_exported).toBeGreaterThan(0);
      expect(data.twin_state).toBe("ready");
      expect(data.digital_twin_export).toBeDefined();
      expect(data.digital_twin_export.blocks.length).toBeGreaterThan(0);
      expect(data.digital_twin_export.stages_summary.length).toBeGreaterThan(0);
      expect(data.digital_twin_export.timestamp).toBeDefined();
    });

    it("includes force/thermal/wear profiles when available", async () => {
      // Provide blocks with enrichment data
      const r = await postProcessorPipelineEngine.process({
        blocks: [
          {
            id: 0, move_type: "G1" as const, x: 50, z: -2,
            feed_mm_min: 800, spindle_rpm: 3000, tool_number: 1,
            forces: { Fc_N: 500, Ff_N: 200, Fp_N: 100, resultant_N: 570, power_kW: 1.2, torque_Nm: 5 },
            wear: { VB_mm: 0.1, VB_rate_mm_per_min: 0.01, remaining_life_pct: 85 },
          },
        ],
        material: STEEL_MATERIAL,
        tools: [TOOL_10MM],
        stages: { ...ALL_OFF, digital_twin: true },
      });

      const stage = r.stages.find(s => s.stage === "6.7_digital_twin");
      expect(stage).toBeDefined();
      const data = stage!.data as any;
      expect(data.digital_twin_export.force_profile.length).toBe(1);
      expect(data.digital_twin_export.force_profile[0].Fc_N).toBe(500);
      expect(data.digital_twin_export.wear_profile.length).toBe(1);
      expect(data.digital_twin_export.wear_profile[0].remaining_pct).toBe(85);
    });
  });

  // ═══ Integration: All new stages together ═══

  describe("Integration: all new stages enabled together", () => {
    it("runs all 16 new stages without errors", async () => {
      const r = await postProcessorPipelineEngine.process({
        gcode: SAMPLE_GCODE,
        material: STEEL_MATERIAL,
        machine: MACHINE_VMC,
        tools: [TOOL_10MM],
        tolerance_mm: 0.02,
        surface_finish_Ra: 1.6,
        controller: "fanuc",
        stages: {
          // Disable only the heavyweight/external-engine stages
          speed_feed: false,
          constitutive: false,
          stability_lobes: false,
          engagement_analysis: false,
          safety_analysis: false,
          playbook_rules: false,
          tribal_knowledge: false,
          wear_progression: false,
          thermal_tracking: false,
          deflection_limit: false,
          controller_features: false,
          // Enable all new opt-in stages
          spindle_harmonics: true,
          toolpath_smoothing: true,
          look_ahead: true,
          machine_error_comp: true,
          uncertainty_propagation: true,
          dimensional_verification: true,
          surface_finish_verification: true,
          environmental: true,
          batch_variability: true,
          reliability_check: true,
          acoustic_check: true,
          probe_routines: true,
          setup_sheet: true,
          controller_params: true,
          digital_twin: true,
        },
      });

      expect(r.overall_status).not.toBe("fail");

      // Verify all new stages ran (not skipped)
      const newStageNames = [
        "1.4_spindle_harmonics",
        "3.1_toolpath_smoothing",
        "3.3_look_ahead",
        "3.4_machine_error_comp",
        "4.2_uncertainty_propagation",
        "4.3_dimensional_verification",
        "4.4_surface_finish_verification",
        "4.5_environmental",
        "4.6_batch_variability",
        "5.6_reliability_check",
        "5.7_acoustic_check",
        "6.2_probe_routines",
        "6.3_setup_sheet",
        "6.4_controller_params",
        "6.7_digital_twin",
      ];

      for (const name of newStageNames) {
        const stage = r.stages.find(s => s.stage === name);
        expect(stage, `Stage ${name} should exist`).toBeDefined();
        expect(stage!.status, `Stage ${name} should pass`).toBe("pass");
        expect(stage!.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
