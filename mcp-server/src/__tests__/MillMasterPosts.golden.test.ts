/**
 * Mill MasterPost engines -- GOLDEN PROGRAM SNAPSHOTS (U-PP-MILL-GOLDEN-SNAPSHOT)
 *
 * Applies the golden-NC regression backstop (sibling of U-PP-LATHE-GOLDEN-SNAPSHOT) to the
 * JM mill master posts: RokuRoku Fanuc-31i (VMC-05) and HaasNGC (VMC-03/04). Each test
 * byte-locks the ENTIRE emitted program against a committed .snap -- a drift in ANY emit
 * logic (block format, safe-start, canned cycles, coolant codes, comments) fails the run;
 * an intentional change is reviewed + re-blessed via `vitest -u`. The existing nightly CI
 * run IS the cron. Both engines are fully deterministic (no volatile timestamp -- verified:
 * 0 `new Date` in either engine), so no volatile-line masking is needed (unlike the lathe).
 *
 * Fixtures mirror each engine's companion reference-value test (the same ops the engine is
 * already proven against), so the golden adds full-body lock on top of the invariant tests.
 */
import { describe, it, expect } from "vitest";
import {
  rokuRokuFanuc31iMillMasterPostEngine,
  type FanucMillOperation,
} from "../engines/RokuRokuFanuc31iMillMasterPostEngine.js";
import {
  haasNGCMillMasterPostEngine,
  type HaasMillOperation,
} from "../engines/HaasNGCMillMasterPostEngine.js";
import {
  okumaOSPMillMasterPostEngine,
  type MillOperation as OkumaMillOp,
} from "../engines/OkumaOSPMillMasterPostEngine.js";
import {
  hurcoV11MillMasterPostEngine,
  type MillOperation as HurcoMillOp,
} from "../engines/HurcoV11MillMasterPostEngine.js";

/** RokuRoku Fanuc-31i: a minimal valid rough op (mm-native corpus contract). */
const rokuOps = (): FanucMillOperation[] => [
  {
    operation_type: "rough", tool_number: 1, tool_diameter_mm: 10, tool_flutes: 4,
    material_iso: "P", spindle_rpm: 3000, feed_mm_min: 600, axial_depth_mm: 2,
    coordinates: [
      { x: 0, y: 0, type: "rapid" },
      { x: 25.4, y: 0, z: -2, type: "linear" },
    ],
  },
];

/** HaasNGC: the corpus face+pocket steel job (same ops the engine's test feeds the post). */
const haasOps = (): HaasMillOperation[] => [
  {
    operation_type: "face", tool_number: 1, tool_diameter_mm: 50.8, tool_flutes: 5,
    material_iso: "P", spindle_rpm: 877, feed_mm_min: 200, axial_depth_mm: 0.5, coolant: "flood",
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 0, y: 0, z: -0.5, type: "linear" },
      { x: 150, y: 0, z: -0.5, type: "linear" },
    ],
  },
  {
    operation_type: "pocket", tool_number: 2, tool_diameter_mm: 12.7, tool_flutes: 4,
    material_iso: "P", spindle_rpm: 3509, feed_mm_min: 600, axial_depth_mm: 3.0, radial_depth_mm: 6.0, coolant: "flood",
    coordinates: [
      { x: 10, y: 10, z: 5, type: "rapid" },
      { x: 10, y: 10, z: -3, type: "linear" },
      { x: 60, y: 10, z: -3, type: "linear" },
    ],
  },
];

/**
 * Shared soundness invariants every emitted program must satisfy.
 * `success` is asserted only when the engine reports it (RokuRoku/HaasNGC return
 * `{ success, gcode }`; OkumaOSP/HurcoV11 return `{ gcode, warnings }` and signal
 * failure via empty gcode) -- so we always assert a NON-EMPTY program, which is the
 * universal success signal across both output shapes. This STRENGTHENS, never weakens.
 */
function assertSound(out: { success?: boolean; gcode: string[] }): string {
  if (out.success !== undefined) expect(out.success).toBe(true);
  expect(Array.isArray(out.gcode) && out.gcode.length > 0).toBe(true);
  const text = out.gcode.join("\n");
  expect(text).not.toMatch(/NaN|Infinity/);
  // Structural sanity: the program is terminated (M30 program end or M02).
  expect(out.gcode.some((l) => /\bM30\b|\bM02\b/.test(l))).toBe(true);
  return text;
}

/**
 * Mask the ONLY volatile line -- the ISO-timestamp program header
 * `(GENERATED: <iso>)` (OkumaOSP engine:743, HurcoV11 engine:761) -- so the
 * snapshot byte-locks the deterministic emit logic, not the wall clock.
 * Mirrors the OkumaB250 lathe golden's timestamp mask (engine:343).
 */
function maskVolatile(text: string): string {
  return text.replace(/\(GENERATED: [^)]*\)/g, "(GENERATED: <MASKED>)");
}

/** OkumaOSP (VMC-02 Genos M460V) + HurcoV11 (VMC-01): a steel face job (corpus-shape). */
const okumaMillOps = (): OkumaMillOp[] => [
  {
    operation_type: "face", tool_number: 1, tool_diameter_mm: 50.8, tool_flutes: 5,
    material_iso: "P", spindle_rpm: 877, feed_mm_min: 200, axial_depth_mm: 0.5, coolant: "flood",
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 0, y: 0, z: -0.5, type: "linear" },
      { x: 150, y: 0, z: -0.5, type: "linear" },
    ],
  },
];
const hurcoMillOps = (): HurcoMillOp[] => [
  {
    operation_type: "face", tool_number: 1, tool_diameter_mm: 50.8, tool_flutes: 5,
    material_iso: "P", spindle_rpm: 877, feed_mm_min: 200, axial_depth_mm: 0.5, coolant: "flood",
    coordinates: [
      { x: 0, y: 0, z: 5, type: "rapid" },
      { x: 0, y: 0, z: -0.5, type: "linear" },
      { x: 150, y: 0, z: -0.5, type: "linear" },
    ],
  },
];

describe("Mill MasterPost engines -- golden program snapshots (U-PP-MILL-GOLDEN-SNAPSHOT)", () => {
  it("RokuRoku Fanuc-31i (VMC-05) emits a deterministic, byte-locked golden program", () => {
    const out = rokuRokuFanuc31iMillMasterPostEngine.generateProgram(rokuOps(), {
      program_number: 100,
      units: "metric",
    });
    expect(assertSound(out)).toMatchSnapshot();
  });

  it("HaasNGC (VMC-03/04) emits a deterministic, byte-locked golden program", () => {
    const out = haasNGCMillMasterPostEngine.generateProgram(haasOps(), {
      units: "metric",
      work_offset: 54,
      program_number: 1002,
    });
    expect(assertSound(out)).toMatchSnapshot();
  });

  it("OkumaOSP (VMC-02 Genos M460V) emits a deterministic, byte-locked golden program", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram(okumaMillOps(), {
      program_number: 2003,
      osp_family: "P300",
      units: "metric",
    } as never);
    // Mask the volatile (GENERATED: <iso>) header so the snapshot locks emit logic, not the clock.
    expect(maskVolatile(assertSound(out as { success: boolean; gcode: string[] }))).toMatchSnapshot();
  });

  it("HurcoV11 (VMC-01 VM30i WinMAX) emits a deterministic, byte-locked golden program", () => {
    const out = hurcoV11MillMasterPostEngine.generateProgram(hurcoMillOps(), {
      program_number: 1103,
      units: "metric",
      work_offset: 54,
    } as never);
    expect(maskVolatile(assertSound(out as { success: boolean; gcode: string[] }))).toMatchSnapshot();
  });
});
