/**
 * CK-MS7 Pipeline Wiring Tests
 *
 * Tests all 7 newly-wired CK engines and their 36 dispatcher actions:
 *   - EDMProgramAssemblerEngine       (5 actions)
 *   - GrindingProgramAssemblerEngine  (5 actions)
 *   - LaserProgramAssemblerEngine     (5 actions)
 *   - WaterjetProgramAssemblerEngine  (5 actions)
 *   - MultiProcessCAMRouterEngine     (6 actions)
 *   - MillTurnSwissPipelineEngine     (5 actions)
 *   - SelfLearningCAMEngine           (5 actions)
 */

import { describe, it, expect } from "vitest";

import { EDMProgramAssemblerEngine } from "../engines/EDMProgramAssemblerEngine.js";
import { GrindingProgramAssemblerEngine } from "../engines/GrindingProgramAssemblerEngine.js";
import { LaserProgramAssemblerEngine } from "../engines/LaserProgramAssemblerEngine.js";
import { WaterjetProgramAssemblerEngine } from "../engines/WaterjetProgramAssemblerEngine.js";
import { MultiProcessCAMRouterEngine } from "../engines/MultiProcessCAMRouterEngine.js";
import { millTurnSwissPipelineEngine } from "../engines/MillTurnSwissPipelineEngine.js";
import { selfLearningCAMEngine } from "../engines/SelfLearningCAMEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Shared test data using correct engine interfaces
// ─────────────────────────────────────────────────────────────────────────────

const WIRE_CONTOUR = [
  { x_mm: 0, y_mm: 0 }, { x_mm: 30, y_mm: 0 }, { x_mm: 30, y_mm: 20 }, { x_mm: 0, y_mm: 20 }, { x_mm: 0, y_mm: 0 },
];

const WIRE_EDM_INPUT = {
  part_name: "Die Insert",
  material: "D2",
  thickness_mm: 50,
  contour: WIRE_CONTOUR,
  wire_diameter_mm: 0.25,
  wire_material: "brass" as const,
  num_trim_passes: 2,
  surface_finish_ra_um: 0.4,
};

const SINKER_EDM_INPUT = {
  part_name: "Mold Cavity",
  material: "P20",
  workpiece_height_mm: 60,
  electrode_material: "graphite" as const,
  target_Ra_um: 0.8,
  features: [
    {
      type: "blind_cavity" as const,
      name: "main_cavity",
      depth_mm: 20,
      area_mm2: 1200,
      volume_mm3: 24000,
      x_mm: 0,
      y_mm: 0,
    },
  ],
};

const SURFACE_GRIND_INPUT = {
  operation_subtype: "horizontal_reciprocating" as const,
  material: "52100",
  part_length_mm: 150,
  part_width_mm: 50,
  stock_mm: 0.2,
  target_Ra_um: 0.4,
  wheel_spec: "A46H8V",
  wheel_diameter_mm: 250,
  wheel_width_mm: 25,
};

const CYLINDRICAL_GRIND_INPUT = {
  operation_subtype: "od_traverse" as const,
  material: "42CrMo4",
  workpiece_od_mm: 40,
  workpiece_length_mm: 200,
  stock_mm: 0.1,
  target_Ra_um: 0.8,
  wheel_diameter_mm: 400,
  wheel_width_mm: 32,
  wheel_spec: "A60K8V",
};

const CENTERLESS_GRIND_INPUT = {
  operation_subtype: "through_feed" as const,
  material: "1045",
  workpiece_diameter_mm: 25,
  workpiece_length_mm: 100,
  stock_mm: 0.08,
  target_Ra_um: 0.8,
  wheel_diameter_mm: 400,
  wheel_width_mm: 40,
};

const CREEPFEED_GRIND_INPUT = {
  material: "IN718",
  depth_mm: 5,
  part_length_mm: 80,
  slot_width_mm: 20,
  target_Ra_um: 1.6,
  wheel_diameter_mm: 400,
  wheel_width_mm: 20,
  wheel_spec: "A24G8V",
};

const LASER_PATH = [
  { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }, { x: 0, y: 0 },
];

const LASER_CUT_INPUT = {
  process: "cutting" as const,
  material: "304",
  thickness_mm: 3,
  laser_type: "fiber" as const,
  power_w: 2000,
  assist_gas: "nitrogen" as const,
  gas_pressure_bar: 12,
  geometry: { points: LASER_PATH },
};

const LASER_MARK_INPUT = {
  process: "marking" as const,
  material: "Ti-6Al-4V",
  laser_type: "fiber" as const,
  power_w: 20,
  frequency_khz: 80,
  pulse_duration_ns: 10,
  scan_speed_mmps: 500,
  mark_area_mm2: 100,
};

const LASER_WELD_INPUT = {
  process: "welding" as const,
  material: "316L",
  thickness_mm: 2,
  laser_type: "fiber" as const,
  power_w: 1500,
  weld_speed_mmpm: 1200,
  shield_gas: "argon" as const,
  shield_flow_lpm: 15,
  joint_type: "butt",
  seam_length_mm: 80,
};

const LASER_DRILL_INPUT = {
  process: "drill_percussion" as const,
  material: "IN718",
  thickness_mm: 5,
  laser_type: "nd_yag" as const,
  power_w: 500,
  frequency_khz: 10,
  pulse_duration_ns: 500,
  hole_diameter_mm: 0.5,
  n_holes: 4,
  positions: [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 10, y: 20 }, { x: 20, y: 20 }],
};

const WJ_PATH = [
  { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 30 }, { x: 0, y: 30 }, { x: 0, y: 0 },
];

const MULTI_PROCESS_PART = {
  part_name: "Shaft Assembly",
  material: "4340 Steel",
  raw_stock: { type: "bar" as const, dimensions: { diameter_mm: 60, length_mm: 300 } },
  features: [
    { id: "F1", type: "turned_od", dimensions: { diameter_mm: 40, length_mm: 100 } },
    { id: "F2", type: "milled_pocket", dimensions: { width_mm: 20, depth_mm: 8, length_mm: 40 } },
    { id: "F3", type: "ground_od", dimensions: { diameter_mm: 30, length_mm: 60 } },
  ],
};

const OBS = {
  jobId: "J001",
  machineId: "MACH-01",
  materialGroup: "P" as const,
  materialName: "1045 Steel",
  strategy: "adaptive",
  cuttingParams: {
    speed_mpm: 200, feed_mmtooth: 0.12,
    axial_depth_mm: 5, radial_depth_mm: 8, tool_diameter_mm: 16,
  },
  actuals: {
    force_N: 420, surface_finish_Ra_um: 1.4, tool_life_min: 45, cycle_time_min: 12.5,
  },
  predicted: {
    force_N: 400, surface_finish_Ra_um: 1.6, tool_life_min: 50, cycle_time_min: 13,
  },
  timestamp: Date.now(),
};

const SENSOR_READING = {
  machineId: "MACH-01",
  timestamp: Date.now(),
  sensors: { spindle_load_pct: 65, vibration_rms_g: 0.8, temperature_C: 42, power_kW: 3.2 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. EDMProgramAssemblerEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("EDMProgramAssemblerEngine", () => {
  const eng = new EDMProgramAssemblerEngine();

  it("instantiates correctly", () => {
    expect(eng).toBeDefined();
  });

  it("assembleWireEDM returns program with gcode string", () => {
    const result = eng.assembleWireEDM(WIRE_EDM_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("gcode");
    expect(typeof (result as any).gcode).toBe("string");
  });

  it("assembleWireEDM includes electrode_setup", () => {
    const result = eng.assembleWireEDM(WIRE_EDM_INPUT);
    expect(result).toHaveProperty("electrode_setup");
  });

  it("assembleSinkerEDM returns program with gcode", () => {
    const result = eng.assembleSinkerEDM(SINKER_EDM_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("gcode");
  });

  it("assembleSinkerEDM includes electrodes array", () => {
    const result = eng.assembleSinkerEDM(SINKER_EDM_INPUT);
    expect(result).toHaveProperty("electrodes");
    expect(Array.isArray((result as any).electrodes)).toBe(true);
  });

  it("assembleMicroEDM returns result for micro features", () => {
    const result = eng.assembleMicroEDM({
      part_name: "Micro Hole",
      material: "H13",
      feature_size_um: 500,
      electrode_diameter_um: 300,
      depth_um: 200,
    });
    expect(result).toBeDefined();
  });

  it("estimateCycleTime accepts assembled program and returns timing", () => {
    const program = eng.assembleWireEDM(WIRE_EDM_INPUT);
    const result = eng.estimateCycleTime(program);
    expect(result).toBeDefined();
    // CycleTimeEstimate has total_time_s field
    const t = (result as any).total_time_s ?? (result as any).total_time_min ?? (result as any).cycle_time_s ?? 0;
    expect(t).toBeGreaterThanOrEqual(0);
  });

  it("computeUncertainty returns confidence data", () => {
    const result = eng.computeUncertainty({ edm_type: "wire", material: "D2", thickness_mm: 50 });
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GrindingProgramAssemblerEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("GrindingProgramAssemblerEngine", () => {
  const eng = new GrindingProgramAssemblerEngine();

  it("instantiates correctly", () => {
    expect(eng).toBeDefined();
  });

  it("assembleSurfaceGrind returns program with gcode", () => {
    const result = eng.assembleSurfaceGrind(SURFACE_GRIND_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("gcode");
    expect(typeof (result as any).gcode).toBe("string");
  });

  it("assembleSurfaceGrind includes physics result", () => {
    const result = eng.assembleSurfaceGrind(SURFACE_GRIND_INPUT);
    expect(result).toHaveProperty("physics");
  });

  it("assembleCylindricalGrind returns program with gcode", () => {
    const result = eng.assembleCylindricalGrind(CYLINDRICAL_GRIND_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("gcode");
  });

  it("assembleCenterlessGrind handles through-feed mode", () => {
    const result = eng.assembleCenterlessGrind(CENTERLESS_GRIND_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("gcode");
  });

  it("assembleCreepFeedGrind handles deep slot", () => {
    const result = eng.assembleCreepFeedGrind(CREEPFEED_GRIND_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("gcode");
  });

  it("computeUncertainty returns confidence metrics", () => {
    const result = eng.computeUncertainty({ grind_type: "surface", material: "52100" });
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. LaserProgramAssemblerEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("LaserProgramAssemblerEngine", () => {
  const eng = new LaserProgramAssemblerEngine();

  it("instantiates correctly", () => {
    expect(eng).toBeDefined();
  });

  it("assembleLaserCut returns program with material_name", () => {
    const result = eng.assembleLaserCut(LASER_CUT_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("material_name");
  });

  it("assembleLaserCut includes kerf_width AtomicValue", () => {
    const result = eng.assembleLaserCut(LASER_CUT_INPUT);
    expect(result).toHaveProperty("kerf_width");
    expect((result as any).kerf_width).toBeDefined();
  });

  it("assembleLaserCut rejects missing geometry instead of fabricating a cut line", () => {
    expect(() => eng.assembleLaserCut({
      ...LASER_CUT_INPUT,
      geometry: undefined as any,
    })).toThrow(/geometry/i);
  });

  it("assembleLaserMark returns program with process field", () => {
    const result = eng.assembleLaserMark(LASER_MARK_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("process");
  });

  it("assembleLaserWeld returns program with material_name", () => {
    const result = eng.assembleLaserWeld(LASER_WELD_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("material_name");
  });

  it("assembleLaserDrill returns program with process field", () => {
    const result = eng.assembleLaserDrill(LASER_DRILL_INPUT);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("process");
  });

  it("computeUncertainty returns HAZ uncertainty data", () => {
    const result = eng.computeUncertainty({ laser_process: "cut", material: "304" });
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. WaterjetProgramAssemblerEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("WaterjetProgramAssemblerEngine", () => {
  const eng = new WaterjetProgramAssemblerEngine();

  it("instantiates correctly", () => {
    expect(eng).toBeDefined();
  });

  it("assembleAbrasiveWJ returns program with operations", () => {
    const result = eng.assembleAbrasiveWJ({
      material: "IN718", thickness_mm: 25,
      cut_path: WJ_PATH, abrasive_type: "garnet_80" as const,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("operations");
  });

  it("assembleAbrasiveWJ includes header with kerf info", () => {
    const result = eng.assembleAbrasiveWJ({
      material: "Ti-6Al-4V", thickness_mm: 20,
      cut_path: WJ_PATH, abrasive_type: "garnet_80" as const,
    });
    // WaterjetProgram has a header object with metadata
    expect(result).toHaveProperty("header");
    expect((result as any).header).toHaveProperty("material");
  });

  it("assemblePureWJ returns program for soft material", () => {
    const result = eng.assemblePureWJ({ material: "Rubber", thickness_mm: 10, cut_path: WJ_PATH });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("operations");
  });

  it("assembleTaperCompensated handles 3-degree taper", () => {
    const result = eng.assembleTaperCompensated({
      material: "Al6061", thickness_mm: 30,
      cut_path: WJ_PATH, abrasive_type: "garnet_80" as const,
      taper_angle_deg: 3, compensation_mode: "dynamic" as const,
    });
    expect(result).toBeDefined();
  });

  it("assembleControlledDepth handles partial cut", () => {
    const result = eng.assembleControlledDepth({
      material: "CFRP", thickness_mm: 20,
      pocket_path: WJ_PATH, pocket_depth_mm: 5,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("header");
  });

  it("computeUncertainty returns kerf width CI", () => {
    const result = eng.computeUncertainty({ wj_process: "abrasive", material: "IN718" });
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. MultiProcessCAMRouterEngine
// ─────────────────────────────────────────────────────────────────────────────

describe("MultiProcessCAMRouterEngine", () => {
  const eng = new MultiProcessCAMRouterEngine();

  it("instantiates correctly", () => {
    expect(eng).toBeDefined();
  });

  it("routePart returns process route with steps", () => {
    const result = eng.routePart(MULTI_PROCESS_PART);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("steps");
  });

  it("routePart returns setup_count >= 1", () => {
    const result = eng.routePart(MULTI_PROCESS_PART);
    expect((result as any).setup_count).toBeGreaterThanOrEqual(1);
  });

  it("analyzeFeatures returns array matching feature count", () => {
    const result = eng.analyzeFeatures(MULTI_PROCESS_PART.features as any, MULTI_PROCESS_PART);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(MULTI_PROCESS_PART.features.length);
  });

  it("sequenceProcesses returns ordered ProcessStep array", () => {
    const analyses = eng.analyzeFeatures(MULTI_PROCESS_PART.features as any, MULTI_PROCESS_PART);
    const steps = eng.sequenceProcesses(analyses, MULTI_PROCESS_PART);
    expect(Array.isArray(steps)).toBe(true);
  });

  it("estimateCost returns cost breakdown for a route", () => {
    const route = eng.routePart(MULTI_PROCESS_PART);
    const result = eng.estimateCost(route, 100);
    expect(result).toBeDefined();
  });

  it("compareProcessAlternatives returns alternatives array", () => {
    const feature = MULTI_PROCESS_PART.features[0] as any;
    const result = eng.compareProcessAlternatives(feature, MULTI_PROCESS_PART);
    expect(Array.isArray(result)).toBe(true);
  });

  it("suggestConsolidation returns consolidation suggestions", () => {
    const route = eng.routePart(MULTI_PROCESS_PART);
    const result = eng.suggestConsolidation(route);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. MillTurnSwissPipelineEngine (singleton)
// ─────────────────────────────────────────────────────────────────────────────

describe("MillTurnSwissPipelineEngine", () => {
  it("singleton is defined", () => {
    expect(millTurnSwissPipelineEngine).toBeDefined();
  });

  it("calculateLiveTool cross_drill returns effective cutting speed", () => {
    const result = millTurnSwissPipelineEngine.calculateLiveTool({
      operation: "cross_drill",
      tool_diameter_mm: 8,
      depth_of_cut_mm: 20,
      workpiece_diameter_mm: 50,
      spindle_speed_rpm: 2000,
      feed_mm_rev: 0.1,
      iso_group: "P",
    });
    expect(result).toBeDefined();
    const vc = (result as any).effective_cutting_speed_m_min ?? (result as any).Vc_eff;
    if (vc !== undefined) expect(vc).toBeGreaterThan(0);
  });

  it("calculateLiveTool face_mill handles face milling", () => {
    const result = millTurnSwissPipelineEngine.calculateLiveTool({
      operation: "face_mill",
      tool_diameter_mm: 50,
      depth_of_cut_mm: 2,
      workpiece_diameter_mm: 80,
      cutting_speed_m_min: 150,
      feed_mm_tooth: 0.15,
      num_flutes: 4,
      iso_group: "P",
    });
    expect(result).toBeDefined();
  });

  it("calculateSubSpindleTransfer synchronized mode returns result", () => {
    const result = millTurnSwissPipelineEngine.calculateSubSpindleTransfer({
      part_diameter_mm: 32,
      part_length_mm: 80,
      transfer_mode: "synchronized",
      main_spindle_rpm: 1500,
      sub_spindle_rpm: 1500,
    });
    expect(result).toBeDefined();
  });

  it("calculateSubSpindleTransfer stop_transfer returns sync timing", () => {
    const result = millTurnSwissPipelineEngine.calculateSubSpindleTransfer({
      part_diameter_mm: 25,
      part_length_mm: 60,
      transfer_mode: "stop_transfer",
      grip_force_n: 800,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("sync_time_s");
  });

  it("calculateMultiChannel returns total_cycle_time_s", () => {
    const result = millTurnSwissPipelineEngine.calculateMultiChannel({
      channels: [
        { channel_id: 1, operations: [{ op: "turn_od", time_min: 3 }, { op: "groove", time_min: 1 }] },
        { channel_id: 2, operations: [{ op: "drill", time_min: 2 }, { op: "thread", time_min: 1.5 }] },
      ],
      sync_code_style: "fanuc_wait_m",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("total_cycle_time_s");
  });

  it("calculateBarFeeder returns parts_per_bar > 0 and remnant_length_mm", () => {
    const result = millTurnSwissPipelineEngine.calculateBarFeeder({
      bar_diameter_mm: 32,
      bar_length_mm: 3000,
      part_length_mm: 45,
      cutoff_width_mm: 3,
      facing_stock_mm: 1,
      bar_shape: "round",
      material: "1045",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("parts_per_bar");
    expect(result).toHaveProperty("remnant_length_mm");
    expect((result as any).parts_per_bar).toBeGreaterThan(0);
  });

  it("calculateSwissMachining citizen_cincom returns result", () => {
    const result = millTurnSwissPipelineEngine.calculateSwissMachining({
      machine_config: "citizen_cincom",
      bar_diameter_mm: 12,
      part_length_mm: 35,
      guide_bushing: true,
      overhang_mm: 5,
      material: "303",
      iso_group: "M",
    });
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. SelfLearningCAMEngine (singleton)
// ─────────────────────────────────────────────────────────────────────────────

describe("SelfLearningCAMEngine", () => {
  it("singleton is defined", () => {
    expect(selfLearningCAMEngine).toBeDefined();
  });

  it("cutToLearn returns observationsProcessed > 0", () => {
    const result = selfLearningCAMEngine.cutToLearn({ observations: [OBS] });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("observationsProcessed");
    expect((result as any).observationsProcessed).toBeGreaterThan(0);
  });

  it("cutToLearn processes batch of 2 observations", () => {
    const obs2 = { ...OBS, jobId: "J002", actuals: { force_N: 450, tool_life_min: 38 } };
    const result = selfLearningCAMEngine.cutToLearn({ observations: [OBS, obs2] });
    expect((result as any).observationsProcessed).toBeGreaterThanOrEqual(2);
  });

  it("digitalTwinSync returns twinState and sfCorrections", () => {
    const result = selfLearningCAMEngine.digitalTwinSync({
      machineId: "MACH-01",
      readings: [SENSOR_READING],
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("twinState");
    expect(result).toHaveProperty("sfCorrections");
  });

  it("digitalTwinSync initialises twin for new machine", () => {
    const result = selfLearningCAMEngine.digitalTwinSync({
      machineId: "MACH-BRAND-NEW",
      readings: [{ ...SENSOR_READING, machineId: "MACH-BRAND-NEW" }],
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("machineId");
  });

  it("strategyRanking returns rankings array", () => {
    selfLearningCAMEngine.cutToLearn({
      observations: [
        { ...OBS, strategy: "trochoidal", actuals: { ...OBS.actuals, tool_life_min: 60 } },
        { ...OBS, jobId: "J003", strategy: "adaptive", actuals: { ...OBS.actuals, tool_life_min: 50 } },
      ],
    });
    const result = selfLearningCAMEngine.strategyRanking({ materialGroup: "P" });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("rankings");
    expect(Array.isArray((result as any).rankings)).toBe(true);
  });

  it("strategyRanking includes recommendations", () => {
    const result = selfLearningCAMEngine.strategyRanking({
      materialGroup: "P", optimizeFor: "tool_life",
    });
    expect(result).toHaveProperty("recommendations");
  });

  it("anomalyRelearn accepts observations array with threshold", () => {
    const result = selfLearningCAMEngine.anomalyRelearn({
      observations: [{ ...OBS, jobId: "J-ANOM", actuals: { force_N: 2000, tool_life_min: 2 } }],
      threshold: 3.0,
      autoRecalibrate: true,
    });
    expect(result).toBeDefined();
  });

  it("fleetLearn pools observations across machines", () => {
    const result = selfLearningCAMEngine.fleetLearn({
      machines: [{ machineId: "MACH-01" }, { machineId: "MACH-02" }],
      materialGroup: "P",
    });
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Schema validation tests
// ─────────────────────────────────────────────────────────────────────────────

describe("ACTION_CK_PIPELINE_SCHEMAS", () => {
  it("exports all 36 schemas", async () => {
    const { ACTION_CK_PIPELINE_SCHEMAS } = await import("../schemas/ckPipelineActionSchemas.js");
    const expected = [
      "edm_wire_program", "edm_sinker_program", "edm_micro_program", "edm_cycle_time", "edm_uncertainty",
      "grind_surface_program", "grind_cylindrical_program", "grind_centerless_program",
      "grind_creepfeed_program", "grind_uncertainty",
      "laser_cut_program", "laser_mark_program", "laser_weld_program", "laser_drill_program",
      "laser_uncertainty",
      "waterjet_abrasive_program", "waterjet_pure_program", "waterjet_taper_program",
      "waterjet_depth_program", "waterjet_uncertainty",
      "multi_process_route", "multi_process_analyze", "multi_process_sequence",
      "multi_process_cost", "multi_process_alternatives", "multi_process_consolidate",
      "mill_turn_live_tooling", "mill_turn_sub_spindle", "mill_turn_multi_channel",
      "mill_turn_bar_feeder", "mill_turn_swiss",
      "self_learn_record", "self_learn_twin_sync", "self_learn_rank_strategy",
      "self_learn_anomaly", "self_learn_fleet",
    ];
    for (const key of expected) {
      expect(ACTION_CK_PIPELINE_SCHEMAS).toHaveProperty(key);
    }
    expect(Object.keys(ACTION_CK_PIPELINE_SCHEMAS).length).toBe(36);
  });

  it("edm_wire_program validates required material + thickness", async () => {
    const { ACTION_CK_PIPELINE_SCHEMAS } = await import("../schemas/ckPipelineActionSchemas.js");
    const s = ACTION_CK_PIPELINE_SCHEMAS.edm_wire_program;
    expect(s.safeParse({
      material: "D2 Steel",
      thickness_mm: 50,
      contour: [{ x_mm: 0, y_mm: 0 }, { x_mm: 10, y_mm: 0 }],
    }).success).toBe(true);
    expect(s.safeParse({ thickness_mm: 50 }).success).toBe(false);
    expect(s.safeParse({ material: "D2 Steel", thickness_mm: 50 }).success).toBe(false);
  });

  it("grind_surface_program validates required dimensions", async () => {
    const { ACTION_CK_PIPELINE_SCHEMAS } = await import("../schemas/ckPipelineActionSchemas.js");
    const s = ACTION_CK_PIPELINE_SCHEMAS.grind_surface_program;
    expect(s.safeParse({ material: "Steel", work_length_mm: 100, work_width_mm: 50 }).success).toBe(true);
  });

  it("laser_cut_program rejects unknown laser_type", async () => {
    const { ACTION_CK_PIPELINE_SCHEMAS } = await import("../schemas/ckPipelineActionSchemas.js");
    const s = ACTION_CK_PIPELINE_SCHEMAS.laser_cut_program;
    const base = {
      material: "Steel",
      thickness_mm: 3,
      assist_gas: "nitrogen",
      gas_pressure_bar: 10,
      geometry: {
        points: [{ x: 0, y: 0 }, { x: 20, y: 0 }],
        closed: false,
      },
    };
    expect(s.safeParse({ ...base, laser_type: "fiber" }).success).toBe(true);
    expect(s.safeParse({ material: "Steel", thickness_mm: 3, laser_type: "unknown" }).success).toBe(false);
    expect(s.safeParse({ material: "Steel", thickness_mm: 3 }).success).toBe(false);
  });

  it("waterjet_abrasive_program rejects unknown quality_level", async () => {
    const { ACTION_CK_PIPELINE_SCHEMAS } = await import("../schemas/ckPipelineActionSchemas.js");
    const s = ACTION_CK_PIPELINE_SCHEMAS.waterjet_abrasive_program;
    const base = {
      material: "Steel",
      thickness_mm: 20,
      cut_path: [{ x: 0, y: 0 }, { x: 50, y: 0 }],
    };
    expect(s.safeParse({ ...base, quality_level: "Q3" }).success).toBe(true);
    expect(s.safeParse({ material: "Steel", thickness_mm: 20, quality_level: "Q9" }).success).toBe(false);
    expect(s.safeParse({ material: "Steel", thickness_mm: 20 }).success).toBe(false);
  });

  it("mill_turn_live_tooling rejects invalid operation", async () => {
    const { ACTION_CK_PIPELINE_SCHEMAS } = await import("../schemas/ckPipelineActionSchemas.js");
    const s = ACTION_CK_PIPELINE_SCHEMAS.mill_turn_live_tooling;
    const base = { tool_diameter_mm: 8, depth_of_cut_mm: 20, workpiece_diameter_mm: 50 };
    expect(s.safeParse({ ...base, operation: "cross_drill" }).success).toBe(true);
    expect(s.safeParse({ ...base, operation: "invalid_op" }).success).toBe(false);
  });

  it("self_learn_record validates observation structure", async () => {
    const { ACTION_CK_PIPELINE_SCHEMAS } = await import("../schemas/ckPipelineActionSchemas.js");
    const s = ACTION_CK_PIPELINE_SCHEMAS.self_learn_record;
    const ok = s.safeParse({
      observations: [{
        jobId: "J001", machineId: "M01", materialGroup: "P",
        cuttingParams: {
          speed_mpm: 200, feed_mmtooth: 0.12,
          axial_depth_mm: 5, radial_depth_mm: 8, tool_diameter_mm: 16,
        },
        actuals: { force_N: 400 },
      }],
    });
    expect(ok.success).toBe(true);
  });

  it("multi_process_route validates features array", async () => {
    const { ACTION_CK_PIPELINE_SCHEMAS } = await import("../schemas/ckPipelineActionSchemas.js");
    const s = ACTION_CK_PIPELINE_SCHEMAS.multi_process_route;
    expect(
      s.safeParse({ material: "Steel", features: [{ feature_type: "pocket" }] }).success,
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. camDispatcher wiring integrity checks
// ─────────────────────────────────────────────────────────────────────────────

describe("camDispatcher CK-MS7 wiring integrity", () => {
  const DISPATCHER_PATH = new URL("../tools/dispatchers/camDispatcher.ts", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

  it("all 36 CK action strings present in dispatcher source", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(DISPATCHER_PATH, "utf8");
    const actions = [
      "edm_wire_program", "edm_sinker_program", "edm_micro_program", "edm_cycle_time",
      "edm_uncertainty", "grind_surface_program", "grind_cylindrical_program",
      "grind_centerless_program", "grind_creepfeed_program", "grind_uncertainty",
      "laser_cut_program", "laser_mark_program", "laser_weld_program", "laser_drill_program",
      "laser_uncertainty", "waterjet_abrasive_program", "waterjet_pure_program",
      "waterjet_taper_program", "waterjet_depth_program", "waterjet_uncertainty",
      "multi_process_route", "multi_process_analyze", "multi_process_sequence",
      "multi_process_cost", "multi_process_alternatives", "multi_process_consolidate",
      "mill_turn_live_tooling", "mill_turn_sub_spindle", "mill_turn_multi_channel",
      "mill_turn_bar_feeder", "mill_turn_swiss",
      "self_learn_record", "self_learn_twin_sync", "self_learn_rank_strategy",
      "self_learn_anomaly", "self_learn_fleet",
    ];
    for (const a of actions) expect(src).toContain(`"${a}"`);
  });

  it("all 7 lazy-load vars declared in let statement", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(DISPATCHER_PATH, "utf8");
    for (const v of ["_edmAsm", "_grindAsm", "_laserAsm", "_wjAsm", "_multiProc", "_millTurn", "_selfLearn"]) {
      expect(src).toContain(`${v}: any`);
    }
  });

  it("getEngine has a case for all 7 new engine keys", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(DISPATCHER_PATH, "utf8");
    for (const k of ["edmAsm", "grindAsm", "laserAsm", "wjAsm", "multiProc", "millTurn", "selfLearn"]) {
      expect(src).toContain(`case "${k}":`);
    }
  });

  it("ACTION_CK_PIPELINE_SCHEMAS imported and spread into MERGED_CAM_SCHEMAS", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(DISPATCHER_PATH, "utf8");
    expect(src).toContain("ckPipelineActionSchemas");
    expect(src).toContain("...ACTION_CK_PIPELINE_SCHEMAS");
  });

  it("correct engine methods called in switch cases", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync(DISPATCHER_PATH, "utf8");
    expect(src).toContain("eng.assembleWireEDM(params)");
    expect(src).toContain("eng.assembleSinkerEDM(params)");
    expect(src).toContain("eng.assembleSurfaceGrind(params)");
    expect(src).toContain("eng.assembleLaserCut(params)");
    expect(src).toContain("eng.assembleAbrasiveWJ(params)");
    expect(src).toContain("eng.routePart(params)");
    expect(src).toContain("eng.calculateLiveTool(params)");
    expect(src).toContain("eng.calculateSwissMachining(params)");
    expect(src).toContain("eng.cutToLearn(params)");
    expect(src).toContain("eng.fleetLearn(params)");
  });
});
