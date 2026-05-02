/**
 * OkumaOSPMillMasterPostEngine — Advanced Pipeline (AutoSpeedFeed wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-AdvancedWiring
 *
 * Verifies the async `generateProgramAdvanced()` method that threads the
 * sync base output through `autoSpeedFeedEngine.optimize()` for chip-thinning,
 * corner deceleration, and machine-rigidity-aware S/F. Compounding context is
 * loaded from `MachineStrategyConstraintEngine` via `cfg.machine_id`.
 */
import { describe, it, expect } from "vitest";
import {
  okumaOSPMillMasterPostEngine,
  type MillOperation,
} from "../engines/OkumaOSPMillMasterPostEngine.js";

// Named constants — no magic numbers in assertions
const TOOL_NUM = 5;
const TOOL_DIA_MM = 12;
const TOOL_FLUTES = 4;
const SPINDLE_RPM = 4000;
const FEED_MM_MIN = 800;
const AXIAL_DOC_MM = 2;
const RADIAL_DOC_MM = 6;
const PROGRAM_NUMBER = 9000;
const GENOS_ATC = 48;
const HURCO_ATC = 24;
const ROKUROKU_ATC = 30;

const baseOp: MillOperation = {
  operation_type: "pocket",
  tool_number: TOOL_NUM,
  tool_diameter_mm: TOOL_DIA_MM,
  tool_flutes: TOOL_FLUTES,
  material_iso: "P",
  spindle_rpm: SPINDLE_RPM,
  feed_mm_min: FEED_MM_MIN,
  axial_depth_mm: AXIAL_DOC_MM,
  radial_depth_mm: RADIAL_DOC_MM,
  coordinates: [
    { x: 0, y: 0, z: 0, type: "rapid" },
    { x: 50, y: 0, z: -2, type: "linear" },
    { x: 50, y: 50, z: -2, type: "linear" },
    { x: 0, y: 50, z: -2, type: "linear" },
    { x: 0, y: 0, z: -2, type: "linear" },
  ],
};

// ---------------------------------------------------------------------------
// Default behavior (regression block) — sync semantics preserved
// ---------------------------------------------------------------------------

describe("generateProgramAdvanced — default (use_advanced_features unset)", () => {
  it("returns sync output unchanged with empty advanced fields", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER,
      osp_family: "P300",
      // intentionally NO use_advanced_features → defaults to false
    });
    expect(out.advanced_features_applied).toEqual([]);
    expect(out.optimized_gcode).toBeNull();
    expect(out.advanced_summary).toBeNull();
    // Base output preserved verbatim
    expect(out.gcode.length).toBeGreaterThan(0);
    expect(out.program_number).toBe(PROGRAM_NUMBER);
    expect(out.tools_used).toEqual([TOOL_NUM]);
  });
});

// ---------------------------------------------------------------------------
// Happy path — advanced pipeline runs end to end
// ---------------------------------------------------------------------------

describe("generateProgramAdvanced — use_advanced_features=true with Genos M460V machine context", () => {
  it("emits enhancement list including 'auto_speed_feed_optimization'", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 1,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.advanced_features_applied).toEqual(["auto_speed_feed_optimization"]);
  });

  it("populates optimized_gcode with at least as many lines as base gcode", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 2,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.optimized_gcode).not.toBeNull();
    expect(out.optimized_gcode!.length).toBeGreaterThanOrEqual(out.gcode.length);
  });

  it("populates advanced_summary.machine_used with the resolved Genos M460V record", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 3,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.advanced_summary).not.toBeNull();
    const mu = out.advanced_summary!.machine_used!;
    expect(mu.id).toBe("jmdie_okuma_genos_m460v_5ax");
    expect(mu.atc).toBe(GENOS_ATC);
    expect(mu.rigidity_class).toBe("high");
    expect(mu.ways_type).toBe("linear_rail");
    expect(mu.spindle_type).toBe("belt_driven");
  });

  it("populates auto_speed_feed stats with non-negative numeric counts", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 4,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    const sf = out.advanced_summary!.auto_speed_feed!;
    expect(sf.lines_modified).toBeGreaterThanOrEqual(0);
    expect(sf.tools_processed).toBe(1); // exactly one tool in fixture
    expect(sf.chip_thinning_adjustments).toBeGreaterThanOrEqual(0);
    expect(sf.corner_decelerations).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Machine-context resolution — different machines produce different summaries
// ---------------------------------------------------------------------------

describe("generateProgramAdvanced — machine_id resolution variants", () => {
  it("loads Hurco V11 (24 ATC, medium rigidity) when machine_id=jmdie_hurco_v11", async () => {
    // Note: Okuma engine accepting Hurco machine_id is supported because
    // the lookup is just for compounding capability context — the engine
    // still emits Okuma OSP G-code, but uses the Hurco-class S/F envelope.
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 10,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    const mu = out.advanced_summary!.machine_used!;
    expect(mu.id).toBe("jmdie_hurco_v11");
    expect(mu.atc).toBe(HURCO_ATC);
    expect(mu.rigidity_class).toBe("medium");
  });

  it("loads Roku-Roku HC-658 (30 ATC, ultra_high rigidity) when machine_id=jmdie_rokuroku_hc658", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 11,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_rokuroku_hc658",
    });
    const mu = out.advanced_summary!.machine_used!;
    expect(mu.id).toBe("jmdie_rokuroku_hc658");
    expect(mu.atc).toBe(ROKUROKU_ATC);
    expect(mu.rigidity_class).toBe("ultra_high");
    expect(mu.ways_type).toBe("hand_scraped");
    expect(mu.spindle_type).toBe("integral_motor");
  });

  it("returns advanced_summary.machine_used=null when machine_id is omitted", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 12,
      osp_family: "P300",
      use_advanced_features: true,
      // intentionally NO machine_id
    });
    expect(out.advanced_summary).not.toBeNull();
    expect(out.advanced_summary!.machine_used).toBeNull();
    // AutoSpeedFeed still ran without machine context
    expect(out.advanced_features_applied).toEqual(["auto_speed_feed_optimization"]);
  });

  it("returns advanced_summary.machine_used=null when machine_id is unknown", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 13,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "nonexistent_machine_xyz",
    });
    expect(out.advanced_summary!.machine_used).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Aggressiveness — knob is honored
// ---------------------------------------------------------------------------

describe("generateProgramAdvanced — advanced_aggressiveness boundary values", () => {
  it("aggressiveness=0 (conservative) produces a defined optimized_gcode", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 20,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
      advanced_aggressiveness: 0,
    });
    expect(out.optimized_gcode).not.toBeNull();
    expect(out.optimized_gcode!.length).toBeGreaterThan(0);
  });

  it("aggressiveness=1 (push limits) produces a defined optimized_gcode", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 21,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
      advanced_aggressiveness: 1,
    });
    expect(out.optimized_gcode).not.toBeNull();
    expect(out.optimized_gcode!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Adversarial / edge cases
// ---------------------------------------------------------------------------

describe("generateProgramAdvanced — adversarial inputs", () => {
  it("multi-op program (3 ops) produces tools_processed=3 and 3 block annotations", async () => {
    const ops: MillOperation[] = [
      baseOp,
      { ...baseOp, tool_number: 6 },
      { ...baseOp, tool_number: 7 },
    ];
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 30,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.advanced_summary!.auto_speed_feed!.tools_processed).toBe(3);
    expect(out.block_annotations.length).toBe(3);
  });

  it("3d_surface op on P500 family runs without throwing", async () => {
    const surfaceOp: MillOperation = {
      ...baseOp,
      operation_type: "3d_surface",
      tool_number: 8,
    };
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([surfaceOp], {
      program_number: PROGRAM_NUMBER + 31,
      osp_family: "P500",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.advanced_features_applied).toEqual(["auto_speed_feed_optimization"]);
  });
});
