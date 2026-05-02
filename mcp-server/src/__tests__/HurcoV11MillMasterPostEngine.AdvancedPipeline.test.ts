/**
 * HurcoV11MillMasterPostEngine — Advanced Pipeline (AutoSpeedFeed wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-AdvancedWiring
 *
 * Mirrors the OkumaOSPMillMasterPostEngine advanced-pipeline test surface
 * for the Hurco V11 master post. Verifies async `generateProgramAdvanced()`
 * threads sync output through `autoSpeedFeedEngine.optimize()` with
 * compounding capability context loaded from `MachineStrategyConstraintEngine`.
 */
import { describe, it, expect } from "vitest";
import {
  hurcoV11MillMasterPostEngine,
  type MillOperation,
} from "../engines/HurcoV11MillMasterPostEngine.js";

const TOOL_NUM = 5;
const TOOL_DIA_MM = 12;
const TOOL_FLUTES = 4;
const SPINDLE_RPM = 4000;
const FEED_MM_MIN = 800;
const AXIAL_DOC_MM = 2;
const RADIAL_DOC_MM = 6;
const PROGRAM_NUMBER = 8000;
const HURCO_ATC = 24;

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
  ],
};

describe("HurcoV11.generateProgramAdvanced — default (use_advanced_features unset)", () => {
  it("returns sync output unchanged with empty advanced fields", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER,
    });
    expect(out.advanced_features_applied).toEqual([]);
    expect(out.optimized_gcode).toBeNull();
    expect(out.advanced_summary).toBeNull();
    expect(out.gcode.length).toBeGreaterThan(0);
    expect(out.program_number).toBe(PROGRAM_NUMBER);
    expect(out.tools_used).toEqual([TOOL_NUM]);
  });
});

describe("HurcoV11.generateProgramAdvanced — happy path with jmdie_hurco_v11", () => {
  it("emits enhancement list with auto_speed_feed_optimization", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 1,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.advanced_features_applied).toEqual(["auto_speed_feed_optimization"]);
  });

  it("populates optimized_gcode (non-null array of length >= base)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 2,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.optimized_gcode).not.toBeNull();
    expect(out.optimized_gcode!.length).toBeGreaterThanOrEqual(out.gcode.length);
  });

  it("loads Hurco V11 machine context (24 ATC, medium rigidity, linear_rail, belt_driven)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 3,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    const mu = out.advanced_summary!.machine_used!;
    expect(mu.id).toBe("jmdie_hurco_v11");
    expect(mu.atc).toBe(HURCO_ATC);
    expect(mu.rigidity_class).toBe("medium");
    expect(mu.ways_type).toBe("linear_rail");
    expect(mu.spindle_type).toBe("belt_driven");
  });
});

describe("HurcoV11.generateProgramAdvanced — UltiMotion strategy gating", () => {
  it("use_ultimotion=true selects 'hsm' strategy on the AutoSpeedFeed call (verified via no throw + non-null output)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 4,
      use_advanced_features: true,
      use_ultimotion: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.advanced_features_applied).toEqual(["auto_speed_feed_optimization"]);
    expect(out.optimized_gcode).not.toBeNull();
  });

  it("use_ultimotion=false selects 'conventional' strategy and still produces optimized_gcode", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 5,
      use_advanced_features: true,
      use_ultimotion: false,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.advanced_features_applied).toEqual(["auto_speed_feed_optimization"]);
    expect(out.optimized_gcode).not.toBeNull();
  });
});

describe("HurcoV11.generateProgramAdvanced — failure / edge modes", () => {
  it("returns advanced_summary.machine_used=null when machine_id omitted", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 10,
      use_advanced_features: true,
    });
    expect(out.advanced_summary!.machine_used).toBeNull();
    expect(out.advanced_features_applied).toEqual(["auto_speed_feed_optimization"]);
  });

  it("returns advanced_summary.machine_used=null when machine_id is unknown", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 11,
      use_advanced_features: true,
      machine_id: "unknown_machine_xyz",
    });
    expect(out.advanced_summary!.machine_used).toBeNull();
  });

  it("multi-op program (3 ops) produces tools_processed=3", async () => {
    const ops: MillOperation[] = [
      baseOp,
      { ...baseOp, tool_number: 6 },
      { ...baseOp, tool_number: 7 },
    ];
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 12,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.advanced_summary!.auto_speed_feed!.tools_processed).toBe(3);
  });
});
