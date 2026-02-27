/**
 * L2-P4-MS1: 52 PASS2 Specialty Engine Tests
 * Covers all 12 batches — instantiation + core method smoke test
 */
import { describe, it, expect } from "vitest";

// Batch 1: Surface Integrity & Metallurgy
import { whiteLayerDetectionEngine } from "../engines/WhiteLayerDetectionEngine.js";
import { recastLayerEngine } from "../engines/RecastLayerEngine.js";
import { microstructureEffectEngine } from "../engines/MicrostructureEffectEngine.js";
import { heatTreatmentResponseEngine } from "../engines/HeatTreatmentResponseEngine.js";
import { cryogenicTreatmentEngine } from "../engines/CryogenicTreatmentEngine.js";
import { platingAllowanceEngine } from "../engines/PlatingAllowanceEngine.js";

// Batch 2: Vibration & Dynamics
import { harmonicAnalysisEngine } from "../engines/HarmonicAnalysisEngine.js";
import { thinFloorVibrationEngine } from "../engines/ThinFloorVibrationEngine.js";
import { toolholderDynamicsEngine } from "../engines/ToolholderDynamicsEngine.js";
import { regenerativeChatterPredictor } from "../engines/RegenerativeChatterPredictor.js";
import { dampingOptimizationEngine } from "../engines/DampingOptimizationEngine.js";

// Batch 3: Thread & Gear
import { threadMillingEngine } from "../engines/ThreadMillingEngine.js";
import { singlePointThreadEngine } from "../engines/SinglePointThreadEngine.js";
import { gearHobbingEngine } from "../engines/GearHobbingEngine.js";
import { splineMillingEngine } from "../engines/SplineMillingEngine.js";

// Batch 4: Sheet Metal & Fabrication
import { bendAllowanceEngine } from "../engines/BendAllowanceEngine.js";
import { weldPrepEngine } from "../engines/WeldPrepEngine.js";
import { laserCutInterfaceEngine } from "../engines/LaserCutInterfaceEngine.js";

// Batch 5: Multi-Axis & Complex Kinematics
import { rtcpCompensationEngine } from "../engines/RTCP_CompensationEngine.js";
import { singularityAvoidanceEngine } from "../engines/SingularityAvoidanceEngine.js";
import { tiltAngleOptimizationEngine } from "../engines/TiltAngleOptimizationEngine.js";
import { workEnvelopeValidatorEngine } from "../engines/WorkEnvelopeValidatorEngine.js";
import { inverseKinematicsSolverEngine } from "../engines/InverseKinematicsSolverEngine.js";

// Batch 6: Turning-Specific
import { chuckJawForceEngine } from "../engines/ChuckJawForceEngine.js";
import { tailstockForceEngine } from "../engines/TailstockForceEngine.js";
import { barPullerTimingEngine } from "../engines/BarPullerTimingEngine.js";
import { liveToolingEngine } from "../engines/LiveToolingEngine.js";
import { steadyRestPlacementEngine } from "../engines/SteadyRestPlacementEngine.js";

// Batch 7: EDM-Specific
import { electrodeDesignEngine } from "../engines/ElectrodeDesignEngine.js";
import { wireEDMSettingsEngine } from "../engines/WireEDMSettingsEngine.js";
import { edmSurfaceIntegrityEngine } from "../engines/EDMSurfaceIntegrityEngine.js";
import { microEDMEngine } from "../engines/MicroEDMEngine.js";

// Batch 8: Laser & Waterjet
import { waterjetTaperEngine } from "../engines/WaterjetTaperEngine.js";
import { laserMarkingEngine } from "../engines/LaserMarkingEngine.js";
import { hybridLaserMachineEngine } from "../engines/HybridLaserMachineEngine.js";

// Batch 9: Automation & Industry 4.0
import { digitalThreadEngine } from "../engines/DigitalThreadEngine.js";
import { oeeCalculatorEngine } from "../engines/OEECalculatorEngine.js";
import { bottleneckIdentificationEngine } from "../engines/BottleneckIdentificationEngine.js";
import { digitalWorkInstructionEngine } from "../engines/DigitalWorkInstructionEngine.js";
import { shiftHandoffEngine } from "../engines/ShiftHandoffEngine.js";

// Batch 10: Coating & Surface Treatment
import { maskingCalculatorEngine } from "../engines/MaskingCalculatorEngine.js";
import { shotPeeningEngine } from "../engines/ShotPeeningEngine.js";
import { passivationEngine } from "../engines/PassivationEngine.js";
import { anodizeAllowanceEngine } from "../engines/AnodizeAllowanceEngine.js";

// Batch 11: Material Testing Interface
import { hardnessConversionEngine } from "../engines/HardnessConversionEngine.js";
import { tensileToMachinabilityEngine } from "../engines/TensileToMachinabilityEngine.js";
import { materialEquivalenceEngine } from "../engines/MaterialEquivalenceEngine.js";

// Batch 12: Jig & Fixture Specific
import { modularFixtureLayoutEngine } from "../engines/ModularFixtureLayoutEngine.js";
import { softJawProfileEngine } from "../engines/SoftJawProfileEngine.js";
import { threeDPrintedFixtureEngine } from "../engines/ThreeDPrintedFixtureEngine.js";
import { magneticChuckEngine } from "../engines/MagneticChuckEngine.js";
import { tombstoneLayoutEngine } from "../engines/TombstoneLayoutEngine.js";

// ============================================================================
// BATCH 1: Surface Integrity & Metallurgy
// ============================================================================

describe("Batch 1: Surface Integrity & Metallurgy", () => {
  it("WhiteLayerDetectionEngine — detects white layer risk", () => {
    const r = whiteLayerDetectionEngine.predict({
      cutting_speed_mmin: 200, feed_per_rev_mm: 0.1,
      depth_of_cut_mm: 0.15, workpiece_hardness_HRC: 62,
      tool_wear_VB_mm: 0.1, tool_material: "CBN",
      coolant: "dry", operation: "hard_turning",
    });
    expect(r.risk_level).toBeDefined();
    expect(r.estimated_layer_depth_um).toBeGreaterThanOrEqual(0);
  });

  it("RecastLayerEngine — predicts recast from EDM", () => {
    const r = recastLayerEngine.predict({
      process: "wire_edm", discharge_energy_mJ: 5,
      pulse_on_us: 10, pulse_off_us: 20,
      peak_current_A: 15, voltage_V: 80,
      workpiece_material: "4140 steel", workpiece_carbon_pct: 0.4,
      flushing: "submerged", num_skim_passes: 2,
    });
    expect(r.estimated_depth_um).toBeGreaterThan(0);
    expect(r.risk_level).toBeDefined();
  });

  it("MicrostructureEffectEngine — analyzes grain and phase effects", () => {
    const r = microstructureEffectEngine.analyze({
      material_class: "steel", grain_size_ASTM: 8,
      hardness_HRC: 25,
      phases: [{ phase: "ferrite", fraction_pct: 70 }, { phase: "pearlite", fraction_pct: 30 }],
      prior_processing: "normalized",
    });
    expect(r.machinability_index).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("HeatTreatmentResponseEngine — predicts hardening", () => {
    const r = heatTreatmentResponseEngine.predict({
      process: "quench_and_temper", material: "4140",
      carbon_pct: 0.40, austenitize_temp_C: 845,
      hold_time_min: 60, quench_medium: "oil",
      temper_temp_C: 400, temper_time_min: 120,
      section_thickness_mm: 50,
    });
    expect(r.predicted_surface_hardness_HRC).toBeGreaterThan(0);
    expect(r.predicted_core_hardness_HRC).toBeGreaterThan(0);
  });

  it("CryogenicTreatmentEngine — predicts cryogenic effects", () => {
    const r = cryogenicTreatmentEngine.predict({
      material_type: "HSS", material_grade: "M2",
      carbon_pct: 0.85, retained_austenite_pct: 15,
      prior_hardness_HRC: 64, cryo_level: "deep",
      soak_time_hr: 24, post_temper_temp_C: 150,
    });
    expect(r.wear_improvement_pct).toBeGreaterThan(0);
    expect(r.retained_austenite_after_pct).toBeLessThan(15);
  });

  it("PlatingAllowanceEngine — calculates plating buildup", () => {
    const r = platingAllowanceEngine.calculateAllowance({
      process: "hard_chrome", target_thickness_um: 25,
      dimension_type: "od", nominal_dimension_mm: 50.000,
      dimension_tolerance_mm: 0.025, substrate_material: "4140 steel",
      surface_finish_Ra_before_um: 0.8, is_masking_required: false,
    });
    expect(r.machine_to_mm).toBeLessThan(50);
    expect(r.buildup_per_side_um).toBeGreaterThan(0);
  });
});

// ============================================================================
// BATCH 2: Vibration & Dynamics
// ============================================================================

describe("Batch 2: Vibration & Dynamics", () => {
  it("HarmonicAnalysisEngine — identifies vibration sources", () => {
    const r = harmonicAnalysisEngine.analyze({
      spindle_rpm: 10000, num_flutes: 4,
      vibration_spectrum: [
        { freq_Hz: 666, amplitude_um: 5 },
        { freq_Hz: 1332, amplitude_um: 2 },
        { freq_Hz: 150, amplitude_um: 8 },
      ],
      bearing_params: { num_balls: 9, pitch_diameter_mm: 40, ball_diameter_mm: 8, contact_angle_deg: 15 },
    });
    expect(r.dominant_frequency_Hz).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("ThinFloorVibrationEngine — predicts thin feature vibration", () => {
    const r = thinFloorVibrationEngine.analyze({
      geometry: "plate", thickness_mm: 2,
      unsupported_length_mm: 100, unsupported_width_mm: 50,
      material_E_GPa: 200, material_density_kgm3: 7850,
      material_poisson: 0.3,
      cutting_force_N: 100, spindle_rpm: 8000,
      num_flutes: 3, tool_diameter_mm: 10,
    });
    expect(r.natural_freq_Hz).toBeGreaterThan(0);
    expect(r.max_deflection_um).toBeGreaterThan(0);
  });

  it("ToolholderDynamicsEngine — analyzes FRF", () => {
    const r = toolholderDynamicsEngine.analyzeFRF({
      holder_type: "shrink_fit", taper: "HSK-A63",
      gauge_length_mm: 80, holder_diameter_mm: 40,
      tool_diameter_mm: 12, tool_stickout_mm: 60,
      tool_material: "carbide",
    });
    expect(r.static_stiffness_N_per_um).toBeGreaterThan(0);
    expect(r.natural_freq_Hz).toBeGreaterThan(0);
  });

  it("RegenerativeChatterPredictor — predicts stability", () => {
    const r = regenerativeChatterPredictor.predict({
      cut_type: "half_immersion_up",
      spindle_rpm: 10000, depth_of_cut_mm: 0.5,
      num_flutes: 4, tool_diameter_mm: 12,
      natural_freq_Hz: 800, stiffness_N_per_m: 5e8,
      damping_ratio: 0.05, specific_cutting_force_N_mm2: 800,
      radial_depth_mm: 6,
    });
    expect(r.is_stable).toBeDefined();
    expect(r.critical_depth_mm).toBeGreaterThan(0);
  });

  it("DampingOptimizationEngine — evaluates strategies", () => {
    const r = dampingOptimizationEngine.optimize({
      target_freq_Hz: 800, structure_mass_kg: 2,
      structure_stiffness_N_per_m: 2e7, structure_damping_ratio: 0.02,
    });
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.best_strategy).toBeDefined();
  });
});

// ============================================================================
// BATCH 3: Thread & Gear Manufacturing
// ============================================================================

describe("Batch 3: Thread & Gear Manufacturing", () => {
  it("ThreadMillingEngine — calculates helical interpolation", () => {
    const r = threadMillingEngine.calculate({
      thread_form: "metric", nominal_diameter_mm: 20, pitch_mm: 2.5,
      internal: true, direction: "right",
      thread_depth_mm: 1.624, thread_length_mm: 30,
      mill_approach: "single_point",
      tool_diameter_mm: 14, num_flutes: 3,
      num_radial_passes: 2, spindle_rpm: 3000,
      material_specific_force_N_mm2: 2000,
    });
    expect(r.helical_diameter_mm).toBeGreaterThan(0);
    expect(r.cutting_time_sec).toBeGreaterThan(0);
  });

  it("SinglePointThreadEngine — plans threading passes", () => {
    const r = singlePointThreadEngine.calculatePassPlan({
      thread_form: "metric", pitch_mm: 3.5,
      major_diameter_mm: 30, internal: false,
      infeed_method: "modified_flank",
      total_depth_mm: 2.147, spindle_rpm: 500,
      num_passes: 6, spring_passes: 1,
      lead_in_mm: 5, lead_out_mm: 5,
      thread_length_mm: 30, material_tensile_MPa: 700,
    });
    expect(r.passes.length).toBeGreaterThan(0);
    expect(r.total_passes).toBeGreaterThan(0);
  });

  it("GearHobbingEngine — calculates hobbing parameters", () => {
    const r = gearHobbingEngine.calculate({
      num_teeth: 40, module_mm: 3,
      pressure_angle_deg: 20, helix_angle_deg: 0,
      face_width_mm: 30, hob_diameter_mm: 70,
      hob_num_starts: 1, hob_num_gashes: 12,
      hobbing_method: "climb", axial_feed_mm_per_rev: 2,
      hob_rpm: 200, num_cuts: 1,
    });
    expect(r.workpiece_rpm).toBeGreaterThan(0);
    expect(r.cycle_time_sec).toBeGreaterThan(0);
  });

  it("SplineMillingEngine — calculates spline parameters", () => {
    const r = splineMillingEngine.calculate({
      spline_type: "involute", num_teeth: 16,
      module_mm: 2.5, pressure_angle_deg: 30,
      major_diameter_mm: 44, minor_diameter_mm: 36,
      face_width_mm: 25, internal: false,
      index_method: "CNC_rotary", tool_diameter_mm: 80,
      tool_num_flutes: 6, spindle_rpm: 200,
      feed_per_tooth_mm: 0.05, num_depth_passes: 2,
    });
    expect(r.index_angle_deg).toBeGreaterThan(0);
    expect(r.total_cycle_time_sec).toBeGreaterThan(0);
  });
});

// ============================================================================
// BATCH 4: Sheet Metal & Fabrication
// ============================================================================

describe("Batch 4: Sheet Metal & Fabrication", () => {
  it("BendAllowanceEngine — calculates bend parameters", () => {
    const r = bendAllowanceEngine.calculate({
      material: "mild_steel", thickness_mm: 2,
      bend_angle_deg: 90, inside_radius_mm: 3,
      bend_method: "air_bend", tensile_strength_MPa: 400,
    });
    expect(r.bend_allowance_mm).toBeGreaterThan(0);
    expect(r.k_factor_used).toBeGreaterThan(0);
    expect(r.tonnage_per_meter_kN).toBeGreaterThan(0);
  });

  it("WeldPrepEngine — calculates joint geometry", () => {
    const r = weldPrepEngine.calculate({
      joint_type: "butt", groove_type: "single_V",
      plate_thickness_mm: 12, material: "carbon_steel",
      weld_process: "GMAW",
      bevel_angle_deg: 30, root_gap_mm: 2, root_face_mm: 2,
    });
    expect(r.cross_section_area_mm2).toBeGreaterThan(0);
    expect(r.filler_metal_kg_per_m).toBeGreaterThan(0);
  });

  it("LaserCutInterfaceEngine — calculates laser parameters", () => {
    const r = laserCutInterfaceEngine.calculate({
      laser_type: "fiber", power_W: 4000,
      material: "mild_steel", thickness_mm: 6,
      assist_gas: "O2", gas_pressure_bar: 5,
      focus_position_mm: -1, nozzle_diameter_mm: 1.5,
    });
    expect(r.recommended_speed_mm_per_min).toBeGreaterThan(0);
    expect(r.kerf_width_mm).toBeGreaterThan(0);
  });
});

// ============================================================================
// BATCH 5: Multi-Axis & Complex Kinematics
// ============================================================================

describe("Batch 5: Multi-Axis & Complex Kinematics", () => {
  it("RTCP_CompensationEngine — compensates tool center point", () => {
    const r = rtcpCompensationEngine.compensate({
      kinematic_type: "BC_head",
      pivot_to_gauge_mm: 300, pivot_to_table_mm: 500,
      tool_length_mm: 150, tool_gauge_length_mm: 150,
      A_deg: 0, B_deg: 15, C_deg: 30,
      X_mm: 100, Y_mm: 50, Z_mm: 0,
    });
    expect(r.compensated_X_mm).toBeDefined();
    expect(r.compensated_Y_mm).toBeDefined();
  });

  it("SingularityAvoidanceEngine — detects gimbal lock", () => {
    const r = singularityAvoidanceEngine.detect({
      kinematic_type: "BC_head",
      toolpath_points: [
        { x: 0, y: 0, z: 0, i: 0, j: 0, k: 1 },
        { x: 10, y: 0, z: 0, i: 0.01, j: 0, k: 0.99 },
        { x: 20, y: 0, z: 0, i: 0.5, j: 0, k: 0.866 },
      ],
      rotary_axis_1: "B", rotary_axis_2: "C",
      angular_velocity_limit_deg_per_sec: 100,
      feed_rate_mm_per_min: 5000,
    });
    expect(r.singular_points).toBeDefined();
    expect(r.max_angular_velocity_deg_per_sec).toBeGreaterThan(0);
  });

  it("TiltAngleOptimizationEngine — optimizes tool tilt", () => {
    const r = tiltAngleOptimizationEngine.optimize({
      tool_type: "ball_end",
      tool_diameter_mm: 10, corner_radius_mm: 5,
      surface_normal: { i: 0, j: 0.5, k: 0.866 },
      step_over_mm: 1, scallop_target_um: 10,
      strategy: "constant_lead",
    });
    expect(r.effective_radius_mm).toBeGreaterThan(0);
    expect(r.scallop_height_um).toBeGreaterThan(0);
  });

  it("WorkEnvelopeValidatorEngine — validates axis limits", () => {
    const r = workEnvelopeValidatorEngine.validate({
      axis_limits: {
        X_min_mm: -500, X_max_mm: 500,
        Y_min_mm: -400, Y_max_mm: 400,
        Z_min_mm: -300, Z_max_mm: 0,
      },
      toolpath_points: [
        { X: 100, Y: 200, Z: -50 },
        { X: 510, Y: 0, Z: -100 },
      ],
      tool_length_mm: 150, workpiece_height_mm: 50,
      fixture_height_mm: 100, safety_margin_mm: 10,
    });
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.is_valid).toBe(false);
  });

  it("InverseKinematicsSolverEngine — solves 5-axis IK", () => {
    const r = inverseKinematicsSolverEngine.solve({
      kinematic_type: "BC_head",
      tip_x_mm: 100, tip_y_mm: 50, tip_z_mm: -20,
      axis_i: 0, axis_j: 0.258, axis_k: 0.966,
      pivot_length_mm: 300, tool_gauge_length_mm: 150,
      prev_B_deg: 0, prev_C_deg: 0,
    });
    expect(r.solutions.length).toBeGreaterThan(0);
    expect(r.selected).toBeDefined();
  });
});

// ============================================================================
// BATCH 6: Turning-Specific
// ============================================================================

describe("Batch 6: Turning-Specific", () => {
  it("ChuckJawForceEngine — validates gripping safety", () => {
    const r = chuckJawForceEngine.calculate({
      chuck_type: "3_jaw_power", jaw_type: "hard",
      num_jaws: 3, workpiece_mass_kg: 10,
      workpiece_od_mm: 80, workpiece_length_mm: 100,
      gripping_diameter_mm: 80, gripping_length_mm: 30,
      spindle_rpm: 3000, max_spindle_rpm: 4500,
      cutting_force_tangential_N: 500,
      cutting_force_radial_N: 300, cutting_force_axial_N: 100,
    });
    expect(r.required_gripping_force_N).toBeGreaterThan(0);
    expect(typeof r.is_safe).toBe("boolean");
  });

  it("TailstockForceEngine — calculates support force", () => {
    const r = tailstockForceEngine.calculate({
      center_type: "live", center_point_angle_deg: 60,
      workpiece_mass_kg: 12, workpiece_length_mm: 400,
      workpiece_diameter_mm: 50,
      chuck_to_tailstock_mm: 350, spindle_rpm: 2000,
      cutting_force_axial_N: 200, cutting_force_radial_N: 400,
      cutting_position_from_chuck_mm: 200,
      center_hole_diameter_mm: 4,
    });
    expect(r.required_force_N).toBeGreaterThan(0);
    expect(r.center_contact_pressure_MPa).toBeGreaterThan(0);
  });

  it("BarPullerTimingEngine — optimizes bar feed cycle", () => {
    const r = barPullerTimingEngine.calculate({
      bar_diameter_mm: 32, bar_length_mm: 3000,
      part_length_mm: 45, cutoff_width_mm: 3,
      facing_allowance_mm: 0.5, bar_feeder_type: "hydrodynamic",
      collet_open_time_sec: 0.5, collet_close_time_sec: 1,
      bar_pull_speed_mm_per_sec: 100,
      bar_pull_retract_speed_mm_per_sec: 200,
      sub_spindle_available: false, remnant_min_mm: 50,
    });
    expect(r.parts_per_bar).toBeGreaterThan(0);
    expect(r.bar_pull_cycle_time_sec).toBeGreaterThan(0);
  });

  it("LiveToolingEngine — calculates driven tool params", () => {
    const r = liveToolingEngine.calculate({
      operation: "cross_drilling", tool_diameter_mm: 8,
      num_flutes: 2, live_tool_rpm: 3000,
      workpiece_diameter_mm: 50, depth_of_cut_mm: 4,
      feed_per_tooth_mm: 0.05, c_axis_interpolation: false,
      y_axis_available: false,
      max_live_tool_rpm: 6000, live_tool_power_kW: 3.5,
    });
    expect(r.feed_rate_mm_per_min).toBeGreaterThan(0);
    expect(r.required_power_kW).toBeGreaterThan(0);
  });

  it("SteadyRestPlacementEngine — optimizes support location", () => {
    const r = steadyRestPlacementEngine.place({
      workpiece_length_mm: 600, workpiece_diameter_mm: 30,
      workpiece_mass_kg: 3, material_E_GPa: 200,
      chuck_to_tailstock_mm: 550, cutting_force_radial_N: 300,
      cutting_position_mm: 300, spindle_rpm: 2000,
      length_to_diameter_ratio: 20, max_deflection_um: 20,
      steady_rest_type: "self_centering",
    });
    expect(r.num_supports_needed).toBeGreaterThan(0);
    expect(r.support_positions_mm.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// BATCH 7: EDM-Specific
// ============================================================================

describe("Batch 7: EDM-Specific", () => {
  it("ElectrodeDesignEngine — plans electrode stages", () => {
    const r = electrodeDesignEngine.design({
      cavity_depth_mm: 15, cavity_width_mm: 20,
      cavity_length_mm: 30, workpiece_material: "H13 tool steel",
      workpiece_hardness_HRC: 50,
      surface_finish_target_Ra_um: 0.8, tolerance_mm: 0.02,
      num_cavities: 1, electrode_material: "copper",
    });
    expect(r.electrode_stages.length).toBeGreaterThan(0);
    expect(r.estimated_burn_time_min).toBeGreaterThan(0);
  });

  it("WireEDMSettingsEngine — calculates wire parameters", () => {
    const r = wireEDMSettingsEngine.calculate({
      wire_type: "brass_0.25",
      workpiece_material: "D2 tool steel",
      workpiece_thickness_mm: 30, workpiece_hardness_HRC: 60,
      target_surface_finish_Ra_um: 0.8,
      target_accuracy_mm: 0.005, taper_angle_deg: 0,
      is_submerged: true,
    });
    expect(r.num_skim_cuts).toBeGreaterThan(0);
    expect(r.estimated_time_per_100mm_min).toBeGreaterThan(0);
  });

  it("EDMSurfaceIntegrityEngine — assesses surface damage", () => {
    const r = edmSurfaceIntegrityEngine.assess({
      edm_type: "wire", discharge_energy_mJ: 5,
      num_skim_passes: 2, workpiece_material: "Inconel 718",
      workpiece_hardness_HRC: 42,
      is_fatigue_critical: true, application: "aerospace",
    });
    expect(r.recast_layer_depth_um).toBeGreaterThan(0);
    expect(typeof r.meets_specification).toBe("boolean");
  });

  it("MicroEDMEngine — calculates micro-scale parameters", () => {
    const r = microEDMEngine.calculate({
      process: "micro_hole_drilling",
      feature_size_um: 200, depth_um: 500,
      workpiece_material: "stainless_steel",
      electrode_diameter_um: 180,
      target_accuracy_um: 5, target_surface_finish_Ra_um: 0.4,
    });
    expect(r.recommended_electrode_um).toBeGreaterThan(0);
    expect(r.estimated_time_min).toBeGreaterThan(0);
  });
});

// ============================================================================
// BATCH 8: Laser & Waterjet
// ============================================================================

describe("Batch 8: Laser & Waterjet", () => {
  it("WaterjetTaperEngine — compensates kerf taper", () => {
    const r = waterjetTaperEngine.calculate({
      material: "aluminum", thickness_mm: 20,
      cutting_speed_mm_per_min: 200, pump_pressure_MPa: 380,
      orifice_diameter_mm: 0.33, mixing_tube_diameter_mm: 1.02,
      abrasive_flow_g_per_min: 300, standoff_mm: 2,
      target_quality: "Q3_medium", has_tilt_head: false,
    });
    expect(r.predicted_taper_deg).toBeGreaterThan(0);
    expect(r.recommended_speed_mm_per_min).toBeGreaterThan(0);
  });

  it("LaserMarkingEngine — calculates marking parameters", () => {
    const r = laserMarkingEngine.calculate({
      laser_source: "fiber", power_W: 30,
      mark_type: "engrave", content_type: "text",
      material: "stainless_steel", mark_area_mm2: 100,
      character_height_mm: 3,
    });
    expect(r.recommended_speed_mm_per_sec).toBeGreaterThan(0);
    expect(r.mark_time_sec).toBeGreaterThan(0);
  });

  it("HybridLaserMachineEngine — models hybrid process", () => {
    const r = hybridLaserMachineEngine.calculate({
      process: "laser_assisted_machining",
      laser_power_W: 500, spot_diameter_mm: 3,
      workpiece_material: "Inconel 718",
      preheat_target_C: 600,
      cutting_speed_m_per_min: 80, feed_mm_per_rev: 0.15,
      depth_of_cut_mm: 1.0,
    });
    expect(r.force_reduction_pct).toBeGreaterThan(0);
    expect(r.tool_life_improvement_pct).toBeGreaterThan(0);
  });
});

// ============================================================================
// BATCH 9: Automation & Industry 4.0
// ============================================================================

describe("Batch 9: Automation & Industry 4.0", () => {
  it("DigitalThreadEngine — traces data lineage", () => {
    const r = digitalThreadEngine.trace({
      part_number: "PN-12345",
      nodes: [
        { id: "D1", phase: "design", system: "CAD", data_type: "3D Model", timestamp: "2024-01-10" },
        { id: "M1", phase: "manufacturing", system: "CAM", data_type: "Toolpath", timestamp: "2024-01-15" },
      ],
      links: [{ from: "D1", to: "M1", relationship: "generates" }],
    });
    expect(r.coverage_pct).toBeGreaterThan(0);
    expect(r.traceability_score).toBeGreaterThan(0);
  });

  it("OEECalculatorEngine — computes OEE", () => {
    const r = oeeCalculatorEngine.calculate({
      planned_production_time_min: 480,
      actual_run_time_min: 400,
      planned_downtime_min: 30,
      unplanned_downtime_min: 50,
      ideal_cycle_time_sec: 30,
      actual_cycle_time_sec: 35,
      total_parts_produced: 700,
      good_parts: 680,
    });
    expect(r.oee_pct).toBeGreaterThan(0);
    expect(r.oee_pct).toBeLessThanOrEqual(100);
    expect(r.availability_pct).toBeGreaterThan(0);
  });

  it("BottleneckIdentificationEngine — finds constraints", () => {
    const r = bottleneckIdentificationEngine.identify({
      work_centers: [
        { id: "S1", name: "Lathe", capacity_parts_per_hr: 12, actual_throughput_per_hr: 11.4, utilization_pct: 95, wip_queue_parts: 8, avg_wait_time_min: 5, num_machines: 1, num_operators: 1, downtime_pct: 3 },
        { id: "S2", name: "Mill", capacity_parts_per_hr: 7.5, actual_throughput_per_hr: 7.3, utilization_pct: 98, wip_queue_parts: 15, avg_wait_time_min: 12, num_machines: 1, num_operators: 1, downtime_pct: 2 },
        { id: "S3", name: "Grind", capacity_parts_per_hr: 15, actual_throughput_per_hr: 9, utilization_pct: 60, wip_queue_parts: 2, avg_wait_time_min: 1, num_machines: 1, num_operators: 1, downtime_pct: 1 },
      ],
      demand_parts_per_hr: 8, shift_hours: 8,
    });
    expect(r.bottleneck_id).toBeDefined();
    expect(r.system_throughput_per_hr).toBeGreaterThan(0);
  });

  it("DigitalWorkInstructionEngine — generates instructions", () => {
    const r = digitalWorkInstructionEngine.generate({
      part_number: "PN-5000", operation_number: "20",
      machine_id: "VF-2", material: "6061-T6",
      raw_stock_description: "4x4x2 aluminum block",
      operations: [
        { type: "setup", description: "Load part in fixture", tools: [], time_min: 3, critical: false },
        { type: "operation", description: "Rough bore to 49.8mm", tools: ["T-100"], time_min: 5, critical: true },
      ],
    });
    expect(r.steps.length).toBeGreaterThan(0);
    expect(r.total_estimated_time_min).toBeGreaterThan(0);
  });

  it("ShiftHandoffEngine — generates handoff report", () => {
    const r = shiftHandoffEngine.generate({
      outgoing_shift: "Day", incoming_shift: "Swing",
      date: "2024-06-15",
      machines: [{
        machine_id: "M1", machine_name: "Haas VF-2", status: "running",
        current_job: "J-100", pct_complete: 75,
        tool_changes_needed: [], alerts: [],
      }],
      quality_issues: [], safety_incidents: [],
      pending_actions: [], notes: "Normal shift",
    });
    expect(r.summary).toBeDefined();
    expect(r.critical_items).toBeDefined();
  });
});

// ============================================================================
// BATCH 10: Coating & Surface Treatment
// ============================================================================

describe("Batch 10: Coating & Surface Treatment", () => {
  it("MaskingCalculatorEngine — selects masking methods", () => {
    const r = maskingCalculatorEngine.calculate({
      process: "anodize", process_temp_C: 20,
      areas_to_mask: [
        { id: "A1", description: "Bore 25H7", area_mm2: 1000, geometry: "bore", critical_tolerance: true },
      ],
      part_material: "6061-T6",
      tolerance_at_mask_edge_mm: 0.5, batch_size: 50,
    });
    expect(r.mask_assignments.length).toBe(1);
    expect(r.mask_application_time_min).toBeGreaterThan(0);
  });

  it("ShotPeeningEngine — calculates peening parameters", () => {
    const r = shotPeeningEngine.calculate({
      almen_strip: "A", target_intensity_mm: 0.25,
      coverage_pct: 200, shot_media: "steel_shot",
      shot_size_mm: 0.6, workpiece_material: "4340 steel",
      workpiece_hardness_HRC: 45, surface_area_mm2: 5000,
      is_fatigue_critical: true,
    });
    expect(r.residual_stress_depth_mm).toBeGreaterThan(0);
    expect(r.fatigue_life_improvement_pct).toBeGreaterThan(0);
  });

  it("PassivationEngine — calculates passivation parameters", () => {
    const r = passivationEngine.calculate({
      alloy: "316L", family: "austenitic",
      method: "citric_acid", surface_condition: "machined",
      contamination_level: "light",
      part_surface_area_cm2: 500, tank_volume_liters: 200,
    });
    expect(r.acid_concentration_pct).toBe(4);
    expect(r.immersion_time_min).toBeGreaterThan(0);
    expect(r.meets_spec).toBe(true);
  });

  it("AnodizeAllowanceEngine — calculates dimensional allowance", () => {
    const r = anodizeAllowanceEngine.calculate({
      anodize_type: "type_III_hard",
      target_thickness_um: 50, alloy: "6061-T6",
      dimension_type: "od", nominal_dimension_mm: 25.000,
      tolerance_mm: 0.025, is_dyed: false,
      seal_type: "hot_water",
    });
    expect(r.machine_to_mm).toBeLessThan(25);
    expect(r.buildup_per_side_um).toBeGreaterThan(0);
  });
});

// ============================================================================
// BATCH 11: Material Testing Interface
// ============================================================================

describe("Batch 11: Material Testing Interface", () => {
  it("HardnessConversionEngine — converts HRC to HV", () => {
    const r = hardnessConversionEngine.convert({
      value: 45, from_scale: "HRC", to_scale: "HV",
    });
    expect(r.converted_value).toBeGreaterThan(400);
    expect(r.tensile_strength_MPa).toBeGreaterThan(0);
  });

  it("HardnessConversionEngine — batch conversion", () => {
    const results = hardnessConversionEngine.batchConvert([30, 40, 50], "HRC", "HBW");
    expect(results.length).toBe(3);
    results.forEach(r => expect(r.converted_value).toBeGreaterThan(0));
  });

  it("TensileToMachinabilityEngine — converts tensile to rating", () => {
    const r = tensileToMachinabilityEngine.convert({
      ultimate_tensile_MPa: 700, yield_strength_MPa: 500,
      elongation_pct: 15, hardness_HBW: 200,
      material_class: "alloy_steel",
    });
    expect(r.machinability_rating_pct).toBeGreaterThan(0);
    expect(r.chip_type).toBeDefined();
    expect(r.tool_recommendation).toBeDefined();
  });

  it("MaterialEquivalenceEngine — finds equivalents for 4140", () => {
    const r = materialEquivalenceEngine.findEquivalent({
      designation: "4140", standard: "AISI",
    });
    expect(r.equivalents.length).toBeGreaterThan(0);
    const dinMatch = r.equivalents.find(e => e.standard === "DIN");
    expect(dinMatch?.designation).toBe("42CrMo4");
    expect(r.properties.tensile_MPa).toBe(900);
  });

  it("MaterialEquivalenceEngine — compares two materials", () => {
    const r = materialEquivalenceEngine.compare("4140", "4340");
    expect(r.match_pct).toBeGreaterThan(0);
    expect(r.match_pct).toBeLessThan(100);
  });
});

// ============================================================================
// BATCH 12: Jig & Fixture Specific
// ============================================================================

describe("Batch 12: Jig & Fixture Specific", () => {
  it("ModularFixtureLayoutEngine — plans 3-2-1 layout", () => {
    const r = modularFixtureLayoutEngine.layout({
      workpiece_length_mm: 200, workpiece_width_mm: 100,
      workpiece_height_mm: 50, material: "6061-T6",
      grid_system: "M16_75mm", cutting_force_N: 3000,
      cutting_torque_Nm: 50, operation: "milling",
      is_thin_wall: false, datum_face: "bottom", batch_size: 20,
    });
    expect(r.locators.length).toBe(6);
    expect(r.total_locating_dof).toBe(6);
    expect(r.clamps.length).toBeGreaterThan(0);
  });

  it("SoftJawProfileEngine — designs jaws for round part", () => {
    const r = softJawProfileEngine.design({
      workpiece_shape: "round", workpiece_dimension_mm: 50,
      workpiece_height_mm: 40, workpiece_material: "4140 steel",
      jaw_material: "6061_aluminum", num_jaws: 3,
      chuck_or_vise: "chuck", clamping_force_N: 15000,
      grip_depth_mm: 15, surface_finish_critical: true,
    });
    expect(r.profile).toBe("contour");
    expect(r.bore_diameter_mm).toBeCloseTo(49.95, 1);
    expect(r.contact_area_mm2).toBeGreaterThan(0);
  });

  it("ThreeDPrintedFixtureEngine — evaluates FDM fixture", () => {
    const r = threeDPrintedFixtureEngine.evaluate({
      process: "FDM", material: "PETG",
      fixture_volume_cm3: 200, max_cutting_force_N: 500,
      max_temperature_C: 60, coolant_exposure: true,
      required_accuracy_mm: 0.1, batch_size: 30,
      conventional_cost_USD: 500, conventional_lead_days: 10,
    });
    expect(typeof r.feasible).toBe("boolean");
    expect(r.print_time_hours).toBeGreaterThan(0);
    expect(r.total_cost_USD).toBeGreaterThan(0);
  });

  it("MagneticChuckEngine — validates holding force", () => {
    const r = magneticChuckEngine.calculate({
      chuck_type: "permanent",
      chuck_pull_force_N_per_cm2: 120,
      workpiece_length_mm: 200, workpiece_width_mm: 100,
      workpiece_thickness_mm: 15, workpiece_material: "1045 carbon steel",
      workpiece_weight_N: 23, contact_area_pct: 90,
      cutting_force_tangential_N: 200, cutting_force_normal_N: 50,
      operation: "surface_grinding", surface_roughness_Ra_um: 1.6,
    });
    expect(r.holding_force_N).toBeGreaterThan(0);
    expect(typeof r.is_safe).toBe("boolean");
    expect(r.permeability_factor).toBe(1.0);
  });

  it("MagneticChuckEngine — rejects non-magnetic material", () => {
    const r = magneticChuckEngine.calculate({
      chuck_type: "permanent",
      chuck_pull_force_N_per_cm2: 120,
      workpiece_length_mm: 200, workpiece_width_mm: 100,
      workpiece_thickness_mm: 15, workpiece_material: "6061 aluminum",
      workpiece_weight_N: 8, contact_area_pct: 100,
      cutting_force_tangential_N: 100, cutting_force_normal_N: 50,
      operation: "surface_grinding", surface_roughness_Ra_um: 1.6,
    });
    expect(r.permeability_factor).toBe(0);
    expect(r.is_safe).toBe(false);
  });

  it("TombstoneLayoutEngine — optimizes HMC production", () => {
    const r = tombstoneLayoutEngine.layout({
      tombstone_faces: 4,
      face_width_mm: 400, face_height_mm: 400,
      part_width_mm: 80, part_height_mm: 80,
      part_depth_mm: 60, part_weight_kg: 2,
      machining_time_per_part_min: 5,
      tool_change_time_sec: 4, index_time_sec: 3,
      load_unload_time_per_part_sec: 15,
      pallet_change_time_sec: 12,
      clearance_mm: 10, max_table_load_kg: 500,
      spindle_reach_mm: 200,
    });
    expect(r.parts_per_face).toBeGreaterThan(1);
    expect(r.total_parts).toBe(r.parts_per_face * 4);
    expect(r.throughput_improvement_pct).toBeGreaterThan(0);
  });
});
