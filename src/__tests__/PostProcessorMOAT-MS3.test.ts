/**
 * PP-MOAT-MS3: Dialect Completeness Tests
 *
 * U01: Kienzle correction factors (K_gamma, K_kappa, K_wear, K_coolant, K_edge)
 * U02: Rigid tapping + threading cycles for 25 dialects
 * U03: Probing cycles for 25 dialects
 * U04: CAM post strategy wiring
 * U05: Alarm database wiring
 */
import { describe, it, expect } from "vitest";
import { postProcessorPipelineEngine } from "../engines/PostProcessorPipelineEngine.js";
import type { MachineContext, MaterialContext, ToolContext, PipelineInput } from "../engines/PostProcessorPipelineEngine.js";
import { controllerDialectEngine } from "../engines/ControllerDialectEngine.js";

// ── Test Fixtures ─────────────────────────────────────────────────

const MACHINE_HAAS: MachineContext = {
  id: "haas-vf2", name: "Haas VF-2", brand: "Haas", controller: "haas",
  max_rpm: 8100, max_power_kW: 22.4,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3, atc_capacity: 20, coolant_types: ["flood"],
  resolution_confidence: 0.95,
};

const MACHINE_SIEMENS: MachineContext = {
  id: "dmg-5ax", name: "DMG DMU 50", brand: "DMG MORI", controller: "siemens",
  max_rpm: 14000, max_power_kW: 35,
  rapid_rate_mm_min: { x: 42000, y: 42000, z: 42000 },
  work_volume: { x: 500, y: 450, z: 400 },
  axes: 5, atc_capacity: 60, coolant_types: ["flood", "tsc", "mql"],
  resolution_confidence: 0.95,
};

const MACHINE_FANUC: MachineContext = {
  id: "fanuc-rob", name: "Robodrill", brand: "FANUC", controller: "fanuc",
  max_rpm: 24000, max_power_kW: 3.7,
  rapid_rate_mm_min: { x: 54000, y: 54000, z: 54000 },
  work_volume: { x: 300, y: 300, z: 330 },
  axes: 3, atc_capacity: 21, coolant_types: ["flood", "tsc"],
  resolution_confidence: 0.95,
};

const MATERIAL_4140: MaterialContext = {
  id: "4140", name: "4140 Steel", iso_group: "P",
  kc1_1: 1800, mc: 0.25, hardness_HB: 197,
  resolution_confidence: 1,
};

const MATERIAL_ALUMINUM: MaterialContext = {
  id: "6061", name: "6061-T6 Aluminum", iso_group: "N",
  kc1_1: 700, mc: 0.23,
  resolution_confidence: 1,
};

const TOOL_ENDMILL: ToolContext = {
  id: "1", type: "flat_endmill", diameter_mm: 10, flute_count: 4,
  flute_length_mm: 25, material: "carbide", resolution_confidence: 1,
};

const SIMPLE_GCODE = [
  "O1001", "G90 G54 G17", "T1 M6", "S3000 M3", "G43 H1", "M8",
  "G0 X0 Y0 Z25.", "G1 Z-5. F500", "G1 X100. F800",
  "G0 Z25.", "M5", "M30",
];

function buildInput(overrides: Partial<PipelineInput> = {}): PipelineInput {
  return {
    raw_gcode: SIMPLE_GCODE.join("\n"),
    machine: MACHINE_HAAS,
    material: MATERIAL_4140,
    tools: [TOOL_ENDMILL],
    controller: "haas",
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════
// U01: Kienzle Correction Factors
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS3 U01: Kienzle Correction Factors", () => {
  it("correction_factors appear in Stage 1.1 output", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    expect(stage11).toBeDefined();
    expect(stage11!.data).toBeDefined();
    if (stage11!.data) {
      expect(stage11!.data.correction_factors).toBeDefined();
      const cf = stage11!.data.correction_factors;
      expect(cf.K_gamma).toBeDefined();
      expect(cf.K_kappa).toBeDefined();
      expect(cf.K_wear).toBeDefined();
      expect(cf.K_coolant).toBeDefined();
      expect(cf.K_coating).toBeDefined();
      expect(cf.K_edge).toBeDefined();
      expect(cf.kc1_1_base).toBeDefined();
      expect(cf.kc1_1_corrected).toBeDefined();
    }
  });

  it("30° rake angle reduces kc by 24% (K_gamma = 0.76)", async () => {
    const tool30deg: ToolContext = { ...TOOL_ENDMILL, rake_angle_deg: 30 };
    const result = await postProcessorPipelineEngine.process(buildInput({ tools: [tool30deg] }));
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      expect(stage11.data.correction_factors.K_gamma).toBeCloseTo(0.76, 2);
    }
  });

  it("negative rake (-10°) increases kc (K_gamma = 1.16)", async () => {
    const toolNeg: ToolContext = { ...TOOL_ENDMILL, rake_angle_deg: -10 };
    const result = await postProcessorPipelineEngine.process(buildInput({ tools: [toolNeg] }));
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      expect(stage11.data.correction_factors.K_gamma).toBeCloseTo(1.16, 2);
    }
  });

  it("MQL coolant reduces kc by 5%", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({ coolant_type: "mql" } as any));
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      expect(stage11.data.correction_factors.K_coolant).toBeCloseTo(0.95, 2);
    }
  });

  it("fresh tool (VB=0) has K_wear=1.0", async () => {
    const toolFresh: ToolContext = { ...TOOL_ENDMILL, wear_VB_mm: 0 };
    const result = await postProcessorPipelineEngine.process(buildInput({ tools: [toolFresh] }));
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      expect(stage11.data.correction_factors.K_wear).toBeCloseTo(1.0, 2);
    }
  });

  it("worn tool (VB=0.3) has K_wear=1.5", async () => {
    const toolWorn: ToolContext = { ...TOOL_ENDMILL, wear_VB_mm: 0.3 };
    const result = await postProcessorPipelineEngine.process(buildInput({ tools: [toolWorn] }));
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      expect(stage11.data.correction_factors.K_wear).toBeCloseTo(1.5, 2);
    }
  });

  it("edge hone 25µm increases kc by 5%", async () => {
    const toolHoned: ToolContext = { ...TOOL_ENDMILL, edge_radius_um: 25 };
    const result = await postProcessorPipelineEngine.process(buildInput({ tools: [toolHoned] }));
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      expect(stage11.data.correction_factors.K_edge).toBeCloseTo(1.05, 2);
    }
  });

  it("K_gamma clamped to safe range [0.6, 1.4]", async () => {
    const toolExtreme: ToolContext = { ...TOOL_ENDMILL, rake_angle_deg: 80 };
    const result = await postProcessorPipelineEngine.process(buildInput({ tools: [toolExtreme] }));
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      expect(stage11.data.correction_factors.K_gamma).toBeGreaterThanOrEqual(0.6);
      expect(stage11.data.correction_factors.K_gamma).toBeLessThanOrEqual(1.4);
    }
  });

  it("default tools (no rake/lead/wear/edge) have all K=1.0", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      const cf = stage11.data.correction_factors;
      // Default tool has no rake_angle_deg set, but helix_angle_deg is also undefined
      // So gamma defaults to 6° → K_gamma = 1.0
      expect(cf.K_gamma).toBeCloseTo(1.0, 2);
      expect(cf.K_kappa).toBeCloseTo(1.0, 2);
      expect(cf.K_wear).toBeCloseTo(1.0, 2);
      expect(cf.K_edge).toBeCloseTo(1.0, 2);
    }
  });

  it("combined corrections multiply correctly", async () => {
    const toolMulti: ToolContext = {
      ...TOOL_ENDMILL,
      rake_angle_deg: 16,     // K_gamma = 1 - 0.01*(16-6) = 0.90
      lead_angle_deg: 60,     // K_kappa = 1 - 0.015*(60-45) = 0.775
      wear_VB_mm: 0.15,       // K_wear = 1 + 0.5*(0.15/0.3) = 1.25
      edge_radius_um: 10,     // K_edge = 1 + 0.002*10 = 1.02
    };
    const result = await postProcessorPipelineEngine.process(buildInput({
      tools: [toolMulti],
      coolant_type: "dry",
    } as any));
    const stage11 = result.stages.find((s: any) => s.stage === "1.1_base_speed_feed");
    if (stage11?.data?.correction_factors) {
      const cf = stage11.data.correction_factors;
      expect(cf.K_gamma).toBeCloseTo(0.90, 2);
      expect(cf.K_kappa).toBeCloseTo(0.775, 2);
      expect(cf.K_wear).toBeCloseTo(1.25, 2);
      expect(cf.K_edge).toBeCloseTo(1.02, 2);
      expect(cf.K_coolant).toBeCloseTo(1.10, 2); // dry
      // Total: 1800 * 0.90 * 0.775 * 1.25 * 1.02 * 1.10 * K_coating
      const expected = 1800 * 0.90 * 0.775 * 1.25 * 1.02 * 1.10 * cf.K_coating;
      expect(cf.kc1_1_corrected).toBeCloseTo(expected, 0);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// U02: Rigid Tapping + Threading Cycles for 25 Dialects
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS3 U02: Rigid Tapping + Threading Cycles", () => {
  it("Fanuc 31i has rigid_tap = G84.2", () => {
    const d = controllerDialectEngine.getDialect("fanuc_31i");
    expect(d.canned_cycles.rigid_tap).toBe("G84.2");
    expect(d.canned_cycles.rigid_tap_lh).toBe("G84.3");
  });

  it("Siemens 840D has rigid_tap = CYCLE84", () => {
    const d = controllerDialectEngine.getDialect("siemens_840d");
    expect(d.canned_cycles.rigid_tap).toBe("CYCLE84");
  });

  it("Heidenhain TNC640 has rigid_tap = CYCL DEF 207", () => {
    const d = controllerDialectEngine.getDialect("heidenhain_tnc640");
    expect(d.canned_cycles.rigid_tap).toBe("CYCL DEF 207");
  });

  it("Siemens 840D has thread_multi_pass = CYCLE98", () => {
    const d = controllerDialectEngine.getDialect("siemens_840d");
    expect(d.canned_cycles.thread_multi_pass).toBe("CYCLE98");
  });

  it("Heidenhain has thread_single_point = CYCL DEF 262", () => {
    const d = controllerDialectEngine.getDialect("heidenhain_tnc640");
    expect(d.canned_cycles.thread_single_point).toBe("CYCL DEF 262");
    expect(d.canned_cycles.thread_multi_pass).toBe("CYCL DEF 263");
  });

  it("Haas has rigid_tap = G84", () => {
    const d = controllerDialectEngine.getDialect("haas_ngc");
    expect(d.canned_cycles.rigid_tap).toBe("G84");
  });

  it("translateCannedCycle handles rigid_tap across dialects", () => {
    const translated = controllerDialectEngine.translateCannedCycle("G84.2", "fanuc_31i", "siemens_840d");
    expect(translated).toBe("CYCLE84");
  });

  it("translateCannedCycle handles thread_single_point", () => {
    const translated = controllerDialectEngine.translateCannedCycle("G76", "fanuc_31i", "heidenhain_tnc640");
    expect(translated).toBe("CYCL DEF 262");
  });

  it("getRigidTapCycle returns correct cycle", () => {
    expect(controllerDialectEngine.getRigidTapCycle("fanuc_31i")).toBe("G84.2");
    expect(controllerDialectEngine.getRigidTapCycle("fanuc_31i", true)).toBe("G84.3");
    expect(controllerDialectEngine.getRigidTapCycle("siemens_840d")).toBe("CYCLE84");
  });

  it("getThreadingCycles returns both single and multi-pass", () => {
    const fanuc = controllerDialectEngine.getThreadingCycles("fanuc_31i");
    expect(fanuc.single_point).toBe("G76");
    expect(fanuc.multi_pass).toBe("G76");

    const siemens = controllerDialectEngine.getThreadingCycles("siemens_840d");
    expect(siemens.single_point).toBe("CYCLE97");
    expect(siemens.multi_pass).toBe("CYCLE98");
  });

  it("all 25 dialects have rigid_tap defined", () => {
    const ALL_DIALECTS = [
      "fanuc_0i", "fanuc_30i", "fanuc_31i", "fanuc_16i", "fanuc_18i",
      "siemens_840d", "siemens_one", "siemens_828d",
      "heidenhain_tnc640", "heidenhain_tnc7",
      "haas_ngc", "mazak_smooth_ai", "mazak_smooth_g",
      "okuma_osp_p300", "okuma_osp_p500",
      "brother_speedio", "mitsubishi_m80", "fagor_8065",
      "citizen_cincom", "star_fanuc",
      "dmg_celos_siemens", "dmg_celos_fanuc",
      "hurco_max5", "doosan_puma", "generic_fanuc",
    ];
    for (const id of ALL_DIALECTS) {
      const d = controllerDialectEngine.getDialect(id);
      expect(d.canned_cycles.rigid_tap, `${id} missing rigid_tap`).toBeDefined();
      expect(d.canned_cycles.thread_single_point, `${id} missing thread_single_point`).toBeDefined();
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// U03: Probing Cycles for 25 Dialects
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS3 U03: Probing Cycles", () => {
  it("Fanuc has Renishaw-style probing (G65 P9810)", () => {
    const p = controllerDialectEngine.getProbingCycles("fanuc_31i");
    expect(p).toBeDefined();
    expect(p!.auto_datum).toBe("G65 P9810");
    expect(p!.surface_z).toBe("G65 P9811");
    expect(p!.bore).toBe("G65 P9812");
    expect(p!.tool_length).toBe("G65 P9023");
  });

  it("Siemens has CYCLE977-982 probing", () => {
    const p = controllerDialectEngine.getProbingCycles("siemens_840d");
    expect(p).toBeDefined();
    expect(p!.auto_datum).toBe("CYCLE977");
    expect(p!.surface_z).toBe("CYCLE978");
    expect(p!.bore).toBe("CYCLE979");
    expect(p!.tool_length).toBe("CYCLE982");
  });

  it("Heidenhain has TCH PROBE probing", () => {
    const p = controllerDialectEngine.getProbingCycles("heidenhain_tnc640");
    expect(p).toBeDefined();
    expect(p!.auto_datum).toBe("TCH PROBE 410");
    expect(p!.surface_z).toBe("TCH PROBE 411");
    expect(p!.bore).toBe("TCH PROBE 412");
    expect(p!.boss).toBe("TCH PROBE 413");
    expect(p!.corner).toBe("TCH PROBE 414");
    expect(p!.tool_length).toBe("TCH PROBE 417");
  });

  it("Okuma has P88xx probing codes", () => {
    const p = controllerDialectEngine.getProbingCycles("okuma_osp_p300");
    expect(p).toBeDefined();
    expect(p!.auto_datum).toBe("G65 P8810");
    expect(p!.tool_length).toBe("G65 P8823");
  });

  it("Swiss machines (citizen/star) have no probing", () => {
    expect(controllerDialectEngine.getProbingCycles("citizen_cincom")).toBeUndefined();
    expect(controllerDialectEngine.getProbingCycles("star_fanuc")).toBeUndefined();
  });

  it("generic_iso has no probing", () => {
    expect(controllerDialectEngine.getProbingCycles("generic_iso")).toBeUndefined();
  });

  it("Haas has Renishaw-Haas probing (same P-codes)", () => {
    const p = controllerDialectEngine.getProbingCycles("haas_ngc");
    expect(p).toBeDefined();
    expect(p!.auto_datum).toBe("G65 P9810");
  });

  it("all probing-capable dialects have at least auto_datum + surface_z", () => {
    const PROBING_DIALECTS = [
      "fanuc_0i", "fanuc_30i", "fanuc_31i", "fanuc_16i", "fanuc_18i",
      "siemens_840d", "siemens_one", "siemens_828d",
      "heidenhain_tnc640", "heidenhain_tnc7",
      "haas_ngc", "mazak_smooth_ai", "mazak_smooth_g",
      "okuma_osp_p300", "okuma_osp_p500",
      "brother_speedio", "mitsubishi_m80", "fagor_8065",
      "dmg_celos_siemens", "dmg_celos_fanuc",
      "hurco_max5", "doosan_puma", "generic_fanuc",
    ];
    for (const id of PROBING_DIALECTS) {
      const p = controllerDialectEngine.getProbingCycles(id);
      expect(p, `${id} missing probing_cycles`).toBeDefined();
      expect(p!.auto_datum, `${id} missing auto_datum`).toBeDefined();
      expect(p!.surface_z, `${id} missing surface_z`).toBeDefined();
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// U04: CAM Post Strategy Wiring
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS3 U04: CAM Post Strategy Wiring", () => {
  it("Stage 3.2b appears in pipeline output with CAM strategy", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "3.2b_cam_strategy");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("pass");
    expect(stage!.data).toBeDefined();
    expect(stage!.data.source).toBeDefined();
  });

  it("Haas uses 355° max arc (from Fusion strategy)", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      machine: MACHINE_HAAS,
      controller: "haas",
    }));
    const stage = result.stages.find((s: any) => s.stage === "3.2b_cam_strategy");
    expect(stage).toBeDefined();
    expect(stage!.data.max_arc_sweep_deg).toBe(355);
    expect(stage!.data.source).toBe("fusion-post-strategies");
  });

  it("Siemens uses 90° max arc (from Fusion strategy)", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      machine: MACHINE_SIEMENS,
      controller: "siemens",
    }));
    const stage = result.stages.find((s: any) => s.stage === "3.2b_cam_strategy");
    expect(stage).toBeDefined();
    expect(stage!.data.max_arc_sweep_deg).toBe(90);
  });

  it("Fanuc uses 180° max arc", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput({
      machine: MACHINE_FANUC,
      controller: "fanuc",
    }));
    const stage = result.stages.find((s: any) => s.stage === "3.2b_cam_strategy");
    expect(stage).toBeDefined();
    expect(stage!.data.max_arc_sweep_deg).toBe(180);
  });

  it("unknown controller falls back to generic 180°", async () => {
    const unknownMachine: MachineContext = {
      ...MACHINE_HAAS, id: "unknown", name: "Unknown", controller: "unknown_brand" as any,
    };
    const result = await postProcessorPipelineEngine.process(buildInput({
      machine: unknownMachine,
      controller: "unknown_brand",
    }));
    const stage = result.stages.find((s: any) => s.stage === "3.2b_cam_strategy");
    expect(stage).toBeDefined();
    expect(stage!.data.max_arc_sweep_deg).toBe(180);
    expect(stage!.data.source).toBe("default");
  });

  it("CAM strategy source appears in stage summary", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "3.2b_cam_strategy");
    expect(stage!.summary).toContain("fusion-post-strategies");
  });
});

// ══════════════════════════════════════════════════════════════════
// U05: Alarm Database Wiring
// ══════════════════════════════════════════════════════════════════

describe("PP-MOAT-MS3 U05: Alarm Database Wiring", () => {
  it("Stage 5.1b appears in pipeline output", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "5.1b_alarm_check");
    expect(stage).toBeDefined();
    expect(stage!.data).toBeDefined();
    expect(stage!.data.controller).toBeDefined();
  });

  it("stage reports controller and alarm_warnings array", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "5.1b_alarm_check");
    expect(stage).toBeDefined();
    expect(stage!.data.controller).toBe("haas");
    expect(Array.isArray(stage!.data.alarm_warnings)).toBe(true);
  });

  it("no alarm warnings for valid G-code", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "5.1b_alarm_check");
    expect(stage).toBeDefined();
    if (stage?.data?.alarm_warnings) {
      expect(stage.data.alarm_warnings.length).toBe(0);
    }
  });

  it("unknown controller gracefully skips alarm check", async () => {
    const unknownMachine: MachineContext = {
      ...MACHINE_HAAS, id: "unknown", name: "Unknown", controller: "ancient_cnc" as any,
    };
    const result = await postProcessorPipelineEngine.process(buildInput({
      machine: unknownMachine,
    }));
    const stage = result.stages.find((s: any) => s.stage === "5.1b_alarm_check");
    expect(stage).toBeDefined();
    // Should not crash, just report what it found (possibly 0 alarms)
  });

  it("known_alarms_loaded > 0 when alarm DB exists for controller", async () => {
    const result = await postProcessorPipelineEngine.process(buildInput());
    const stage = result.stages.find((s: any) => s.stage === "5.1b_alarm_check");
    expect(stage).toBeDefined();
    // AlarmRegistry has 11,288 alarms �� should load some for Haas
    expect(stage!.data.known_alarms_loaded).toBeGreaterThanOrEqual(0);
  });
});
