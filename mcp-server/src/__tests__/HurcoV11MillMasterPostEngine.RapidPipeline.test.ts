/**
 * HurcoV11MillMasterPostEngine — Rapid-Reposition Pipeline (RapidRepositionOptEngine wiring)
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring
 *
 * Mirrors HurcoV11MillMasterPostEngine.AdvancedPipeline.test.ts. Verifies
 * `generateProgramAdvanced()` threads rapid moves and air-cut samples
 * through `rapidRepositionOptEngine` and reports savings in
 * `advanced_summary.rapid_reposition` while keeping sync `output.gcode`
 * byte-identical and the AutoSpeedFeed pass undisturbed.
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
const PROGRAM_NUMBER = 9000;

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

describe("HurcoV11.generateProgramAdvanced — rapid pass gating", () => {
  it("returns rapid_reposition=null in advanced_summary when use_advanced_features unset", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER,
    });
    expect(out.advanced_summary).toBeNull();
    expect(out.advanced_features_applied).toEqual([]);
  });

  it("emits rapid_reposition_optimization in enhancement list when advanced enabled", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 1,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.advanced_features_applied).toContain("rapid_reposition_optimization");
    expect(out.advanced_features_applied).toContain("auto_speed_feed_optimization");
  });

  it("populates advanced_summary.rapid_reposition with non-null counts and savings", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 2,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
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

describe("HurcoV11.generateProgramAdvanced — machine context handling", () => {
  it("falls back to engine default axes when machine_id is omitted (no throw)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 10,
      use_advanced_features: true,
    });
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.machine_used).toBeNull();
  });

  it("falls back when machine_id is unknown (no throw)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 11,
      use_advanced_features: true,
      machine_id: "nonexistent_machine_xyz",
    });
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.machine_used).toBeNull();
  });
});

describe("HurcoV11.generateProgramAdvanced — sync byte-identical regression", () => {
  // Mask the only line that varies between two calls in the same tick — the
  // ISO-millisecond GENERATED stamp. Everything else must match byte-for-byte.
  const stripGenerated = (lines: string[]) =>
    lines.filter((l) => !l.startsWith("(GENERATED:"));

  it("output.gcode is byte-identical (modulo timestamp line) with vs without advanced pass", async () => {
    const sync = hurcoV11MillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_NUMBER + 20,
    });
    const adv = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 20,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(stripGenerated(adv.gcode).join("\n")).toBe(stripGenerated(sync.gcode).join("\n"));
  });

  it("optimized_gcode (AutoSpeedFeed) coexists with rapid_reposition summary", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 21,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.optimized_gcode).not.toBeNull();
    expect(out.advanced_summary!.auto_speed_feed).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
  });
});

describe("HurcoV11.generateProgramAdvanced — rapid extraction edge cases", () => {
  it("zero-rapid program (single linear-only segment) yields rapids_count=0", async () => {
    const linearOnlyOp: MillOperation = {
      ...baseOp,
      coordinates: [
        { x: 0, y: 0, z: -2, type: "linear" },
        { x: 50, y: 0, z: -2, type: "linear" },
      ],
    };
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([linearOnlyOp], {
      program_number: PROGRAM_NUMBER + 30,
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
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced(ops, {
      program_number: PROGRAM_NUMBER + 31,
      use_advanced_features: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.advanced_summary!.rapid_reposition!.rapids_count).toBeGreaterThanOrEqual(2);
  });

  it("duplicate adjacent rapid points are skipped (not counted as a move)", async () => {
    const dupOp: MillOperation = {
      ...baseOp,
      coordinates: [
        { x: 0, y: 0, z: 25, type: "rapid" },
        { x: 0, y: 0, z: 25, type: "rapid" },
        { x: 50, y: 50, z: 25, type: "rapid" },
        { x: 50, y: 50, z: -2, type: "linear" },
      ],
    };
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([dupOp], {
      program_number: PROGRAM_NUMBER + 32,
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
      hurcoV11MillMasterPostEngine.generateProgramAdvanced([bad], {
        program_number: PROGRAM_NUMBER + 33,
        use_advanced_features: true,
      }),
    ).rejects.toThrow(/Invalid coordinate/);
  });

  it("negative-Z work coordinates are accepted (operation depth is below stock surface)", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 34,
      use_advanced_features: true,
    });
    expect(out.advanced_summary!.rapid_reposition!.total_saved_sec).toBeGreaterThanOrEqual(0);
  });
});

describe("HurcoV11.generateProgramAdvanced — output invariants", () => {
  it("aggressiveness 0 vs 1 leaves rapid_reposition counts deterministic", async () => {
    const lo = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 40,
      use_advanced_features: true,
      advanced_aggressiveness: 0,
      machine_id: "jmdie_hurco_v11",
    });
    const hi = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 41,
      use_advanced_features: true,
      advanced_aggressiveness: 1,
      machine_id: "jmdie_hurco_v11",
    });
    expect(lo.advanced_summary!.rapid_reposition!.rapids_count).toBe(
      hi.advanced_summary!.rapid_reposition!.rapids_count,
    );
  });

  it("physics_checks array is unchanged in length when rapid pass runs", async () => {
    const sync = hurcoV11MillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_NUMBER + 50,
    });
    const adv = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 50,
      use_advanced_features: true,
    });
    expect(adv.physics_checks.length).toBe(sync.physics_checks.length);
  });

  it("ultimotion=true selects independent diagonal mode, output stays valid", async () => {
    const out = await hurcoV11MillMasterPostEngine.generateProgramAdvanced([baseOp], {
      program_number: PROGRAM_NUMBER + 60,
      use_advanced_features: true,
      use_ultimotion: true,
      machine_id: "jmdie_hurco_v11",
    });
    expect(out.advanced_summary!.rapid_reposition).not.toBeNull();
    expect(out.advanced_summary!.rapid_reposition!.total_saved_sec).toBeGreaterThanOrEqual(0);
  });
});
