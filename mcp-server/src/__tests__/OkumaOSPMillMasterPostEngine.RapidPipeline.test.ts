/**
 * OkumaOSPMillMasterPostEngine — Rapid-Reposition Pipeline (RapidRepositionOptEngine wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring
 *
 * Mirror of HurcoV11MillMasterPostEngine.RapidPipeline.test.ts. Verifies
 * `generateProgramAdvanced()` threads structured rapid moves and synthesized
 * air-cut samples through `rapidRepositionOptEngine` and reports savings in
 * `advanced_summary.rapid_reposition` while keeping sync `output.gcode`
 * byte-identical and the AutoSpeedFeed pass undisturbed. Adds a P500 case
 * to assert the 5-axis machine still passes the linear-only optimizer subset.
 */
import { describe, it, expect } from "vitest";
import {
  okumaOSPMillMasterPostEngine,
  type MillOperation,
} from "../engines/OkumaOSPMillMasterPostEngine.js";

const TOOL_NUM = 5;
const TOOL_DIA_MM = 12;
const TOOL_FLUTES = 4;
const SPINDLE_RPM = 4000;
const FEED_MM_MIN = 800;
const AXIAL_DOC_MM = 2;
const RADIAL_DOC_MM = 6;
const PROGRAM_NUMBER = 9500;

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
    { x: 0, y: 0, z: 25, type: "rapid" },
    { x: 100, y: 0, z: 25, type: "rapid" },
    { x: 100, y: 0, z: -2, type: "linear" },
    { x: 100, y: 80, z: -2, type: "linear" },
    { x: 0, y: 80, z: -2, type: "linear" },
    { x: 0, y: 0, z: -2, type: "linear" },
  ],
};

describe("OkumaOSPMill.generateProgramAdvanced — rapid pass gating", () => {
  it("returns advanced_summary=null when use_advanced_features unset", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER,
      osp_family: "P300",
    });
    expect(out.advanced_summary).toBeNull();
    expect(out.advanced_features_applied).toEqual([]);
  });

  it("emits rapid_reposition_optimization in enhancement list when advanced enabled", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 1,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.advanced_features_applied).toContain("rapid_reposition_optimization");
    expect(out.advanced_features_applied).toContain("auto_speed_feed_optimization");
  });

  it("populates advanced_summary.rapid_reposition with non-null counts and savings", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 2,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    const rr = out.advanced_summary!.rapid_reposition!;
    expect(rr).not.toBeNull();
    expect(rr.rapids_count).toBeGreaterThanOrEqual(1);
    expect(rr.total_saved_sec).toBeGreaterThanOrEqual(0);
    expect(rr.optimizations_count).toBe(
      rr.rapids_count + rr.retracts_count + rr.air_cuts_count,
    );
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — machine context handling", () => {
  it("falls back to engine default axes when machine_id is omitted (no throw)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 10,
      osp_family: "P300",
      use_advanced_features: true,
    });
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.machine_used).toBeNull();
  });

  it("falls back when machine_id is unknown (no throw)", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 11,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "nonexistent_machine_xyz",
    });
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.machine_used).toBeNull();
  });

  it("P500 (5-axis) machine context still passes the linear-only optimizer subset", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 12,
      osp_family: "P500",
      use_advanced_features: true,
      use_super_nurbs: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition!.total_saved_sec).toBeGreaterThanOrEqual(0);
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — sync byte-identical regression", () => {
  // Mask the GENERATED ISO-ms timestamp line — only diff between two calls in same tick.
  const stripGenerated = (lines: string[]) =>
    lines.filter((l) => !/GENERATED:/.test(l));

  it("output.gcode is byte-identical (modulo timestamp line) with vs without advanced pass", async () => {
    const sync = okumaOSPMillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_NUMBER + 20,
      osp_family: "P300",
    });
    const adv = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 20,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(stripGenerated(adv.gcode).join("\n")).toBe(stripGenerated(sync.gcode).join("\n"));
  });

  it("optimized_gcode (AutoSpeedFeed) coexists with rapid_reposition summary", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 21,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.optimized_gcode).not.toBeNull();
    expect(out.advanced_summary!.auto_speed_feed).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — rapid extraction edge cases", () => {
  it("zero-rapid program (single linear-only segment) yields rapids_count=0", async () => {
    const linearOnlyOp: MillOperation = {
      ...baseOp,
      coordinates: [
        { x: 0, y: 0, z: -2, type: "linear" },
        { x: 50, y: 0, z: -2, type: "linear" },
      ],
    };
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([linearOnlyOp], {
      program_number: PROGRAM_NUMBER + 30,
      osp_family: "P300",
      use_advanced_features: true,
    });
    expect(out.advanced_summary!.rapid_reposition!.rapids_count).toBe(0);
  });

  it("multi-op (3 ops) accumulates rapids across all operations", async () => {
    const ops: MillOperation[] = [
      baseOp,
      { ...baseOp, tool_number: 6 },
      { ...baseOp, tool_number: 7 },
    ];
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 31,
      osp_family: "P300",
      use_advanced_features: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.advanced_summary!.rapid_reposition!.rapids_count).toBeGreaterThanOrEqual(2);
  });

  it("duplicate adjacent rapid points are skipped", async () => {
    const dupOp: MillOperation = {
      ...baseOp,
      coordinates: [
        { x: 0, y: 0, z: 25, type: "rapid" },
        { x: 0, y: 0, z: 25, type: "rapid" },
        { x: 50, y: 50, z: 25, type: "rapid" },
        { x: 50, y: 50, z: -2, type: "linear" },
      ],
    };
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([dupOp], {
      program_number: PROGRAM_NUMBER + 32,
      osp_family: "P300",
      use_advanced_features: true,
    });
    expect(out.advanced_summary!.rapid_reposition!.rapids_count).toBeLessThanOrEqual(1);
  });

  it("NaN coordinate throws structured error rather than silently returning", async () => {
    const bad: MillOperation = {
      ...baseOp,
      coordinates: [
        { x: NaN, y: 0, z: 25, type: "rapid" },
        { x: 50, y: 0, z: -2, type: "linear" },
      ],
    };
    await expect(
      okumaOSPMillMasterPostEngine.generateProgramAdvanced([bad], {
        program_number: PROGRAM_NUMBER + 33,
        osp_family: "P300",
        use_advanced_features: true,
      }),
    ).rejects.toThrow(/Invalid coordinate/);
  });
});

describe("OkumaOSPMill.generateProgramAdvanced — output invariants", () => {
  it("aggressiveness 0 vs 1 leaves rapid_reposition counts deterministic", async () => {
    const lo = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 40,
      osp_family: "P300",
      use_advanced_features: true,
      advanced_aggressiveness: 0,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    const hi = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 41,
      osp_family: "P300",
      use_advanced_features: true,
      advanced_aggressiveness: 1,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(lo.advanced_summary!.rapid_reposition!.rapids_count).toBe(
      hi.advanced_summary!.rapid_reposition!.rapids_count,
    );
  });

  it("physics_checks array length unchanged when rapid pass runs", async () => {
    const sync = okumaOSPMillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_NUMBER + 50,
      osp_family: "P300",
    });
    const adv = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 50,
      osp_family: "P300",
      use_advanced_features: true,
    });
    expect(adv.physics_checks.length).toBe(sync.physics_checks.length);
  });

  it("super_nurbs=true selects independent diagonal mode, output stays valid", async () => {
    const out = await okumaOSPMillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 60,
      osp_family: "P500",
      use_advanced_features: true,
      use_super_nurbs: true,
      machine_id: "jmdie_okuma_genos_m460v_5ax",
    });
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition!.total_saved_sec).toBeGreaterThanOrEqual(0);
  });
});
