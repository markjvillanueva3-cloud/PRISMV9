/**
 * OkumaOSPMillMasterPostEngine — JM Die preset + tribal expansion tests
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-OkumaMill-Tribal
 *
 * Validates the merge of two authoritative JM Die source posts:
 *   1. hyperMILL post `OSPM_MT_TabAC_MUx_R01w_E03.def` (2023, OPEN MIND
 *      hyperPOST 2021.2, Okuma Genos M460V-5AX, OSP-P300MA-H control)
 *   2. PRISM-modified Fusion 360 post
 *      `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps` (Autodesk HSM, v8.9.x,
 *      iMachining adaptive integration, currently in production)
 *
 * The merge produces:
 *   - 22 tribal tips (8 legacy + 14 new with .def/.cps citations)
 *   - 4 new optional config knobs (tool_length_comp_mode, n_number_pad_digits,
 *     super_nurbs_code, tcp_mode) — all default to current behavior so the
 *     existing 93 tests stay green
 *   - JM_DIE_PRESET exported constant that activates the shop's house style
 */
import { describe, it, expect } from "vitest";
import {
  okumaOSPMillMasterPostEngine,
  JM_DIE_PRESET,
  type MillOperation,
} from "../engines/OkumaOSPMillMasterPostEngine.js";

// ---------------------------------------------------------------------------
// Named constants (no magic numbers in assertions)
// ---------------------------------------------------------------------------

const TOOL_NUM_BASE = 5;
const TOOL_NUM_TAP = 12;
const TOOL_DIA_MM = 12;
const TOOL_FLUTES = 4;
const SPINDLE_RPM_POCKET = 4000;
const SPINDLE_RPM_TAP = 800;
const FEED_POCKET_MM_MIN = 800;
const FEED_TAP_MM_MIN = 1000;
const AXIAL_DOC_MM = 2;
const RADIAL_DOC_MM = 6;
const PROGRAM_BASE = 1500;
const TRIBAL_POOL_SIZE = 23; // 8 legacy + 14 .def/.cps + 1 OO88 fixture-macro tip
const JM_DIE_FIXTURE_WCS = 51;
const N_PAD_WIDTH = 4;
const N_LABEL_LEN = 1 + N_PAD_WIDTH; // "N" + 4 digits

// JM Die canonical preset values (cited from the two source posts)
const JM_DIE_WORK_OFFSET = 15;
const JM_DIE_FAMILY = "P300";
const JM_DIE_TLC_MODE = "G56_HA";
const JM_DIE_NURBS_CODE = "G131";
const JM_DIE_TCP_MODE = "G169_G170"; // Okuma-native TCP on/off (.cps:47/515 -- G169 on, G170 off)
const JM_DIE_N_PAD = 4;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseOp: MillOperation = {
  operation_type: "pocket",
  tool_number: TOOL_NUM_BASE,
  tool_diameter_mm: TOOL_DIA_MM,
  tool_flutes: TOOL_FLUTES,
  material_iso: "P",
  spindle_rpm: SPINDLE_RPM_POCKET,
  feed_mm_min: FEED_POCKET_MM_MIN,
  axial_depth_mm: AXIAL_DOC_MM,
  radial_depth_mm: RADIAL_DOC_MM,
  coordinates: [
    { x: 0, y: 0, z: 0, type: "rapid" },
    { x: 50, y: 0, z: -2, type: "linear" },
    { x: 50, y: 50, z: -2, type: "linear" },
  ],
};

const surfaceOp: MillOperation = {
  ...baseOp,
  operation_type: "3d_surface",
  tool_number: 7,
};

// ---------------------------------------------------------------------------
// JM_DIE_PRESET shape — assert exact field values via toEqual
// ---------------------------------------------------------------------------

describe("JM_DIE_PRESET — exported constant", () => {
  it("equals the JM Die canonical eight-field shape", () => {
    expect(JM_DIE_PRESET).toEqual({
      osp_family: JM_DIE_FAMILY,
      work_offset_index: JM_DIE_WORK_OFFSET,
      tool_length_comp_mode: JM_DIE_TLC_MODE,
      super_nurbs_code: JM_DIE_NURBS_CODE,
      tcp_mode: JM_DIE_TCP_MODE,
      n_number_pad_digits: JM_DIE_N_PAD,
      use_call_oo88: true,
      fixture_offset_wcs: JM_DIE_FIXTURE_WCS,
    });
  });

  it("contains exactly eight keys (Partial<> by contract — caller adds program_number)", () => {
    const keys = Object.keys(JM_DIE_PRESET).sort();
    expect(keys).toEqual([
      "fixture_offset_wcs",
      "n_number_pad_digits",
      "osp_family",
      "super_nurbs_code",
      "tcp_mode",
      "tool_length_comp_mode",
      "use_call_oo88",
      "work_offset_index",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Preset application — emission paths
// ---------------------------------------------------------------------------

describe("JM_DIE_PRESET — emission paths", () => {
  it("emits exact `G15 H15 (WORK OFFSET)` line and zero `G15 H1`-only lines", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([baseOp], {
      ...JM_DIE_PRESET,
      program_number: PROGRAM_BASE,
    });
    const offsetLines = out.gcode.filter((l) => /^G15 H15\b/.test(l));
    expect(offsetLines.length).toBe(1);
    expect(offsetLines[0]).toBe("G15 H15 (WORK OFFSET)");
    // Default H1 form must NOT appear under the preset
    const h1Only = out.gcode.filter((l) => /^G15 H1(?!\d)/.test(l));
    expect(h1Only.length).toBe(0);
  });

  it("emits exactly one `G56 HA (TOOL 5)` line and zero `G43 H` lines", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([baseOp], {
      ...JM_DIE_PRESET,
      program_number: PROGRAM_BASE + 1,
    });
    const tlcLines = out.gcode.filter((l) => l.startsWith("G56 HA "));
    expect(tlcLines.length).toBe(1);
    expect(tlcLines[0]).toBe("G56 HA (TOOL 5)");
    const g43Lines = out.gcode.filter((l) => l.startsWith("G43 H"));
    expect(g43Lines.length).toBe(0);
  });

  it("zero-pads N-line numbers to 4 digits and threads padded id into BlockAnnotations", () => {
    const ops: MillOperation[] = [
      baseOp,
      { ...baseOp, tool_number: 6 },
      { ...baseOp, tool_number: 7 },
    ];
    const out = okumaOSPMillMasterPostEngine.generateProgram(ops, {
      ...JM_DIE_PRESET,
      program_number: PROGRAM_BASE + 2,
    });
    const expectedLabels = ["N0100", "N0110", "N0120"];
    // Every spindle-start line must match `<padded-N> S<rpm> M3 F<feed> ...`
    for (const label of expectedLabels) {
      const matching = out.gcode.filter((l) => l.startsWith(label + " "));
      expect(matching.length).toBe(1);
      expect(matching[0]).toMatch(
        new RegExp(
          `^${label} S${SPINDLE_RPM_POCKET} M3 F${FEED_POCKET_MM_MIN} \\(SPINDLE CW`
        )
      );
    }
    // BlockAnnotations must thread the padded id verbatim
    expect(out.block_annotations.length).toBe(expectedLabels.length);
    expect(out.block_annotations.map((b) => b.block_id)).toEqual(expectedLabels);
    for (const ann of out.block_annotations) {
      expect(ann.block_id.length).toBe(N_LABEL_LEN);
    }
  });

  it("emits one `G131 P1` and one `G131 P0` Super-NURBS bracket on P500, zero `G05.1`", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([surfaceOp], {
      ...JM_DIE_PRESET,
      osp_family: "P500", // override preset for the 5-axis MU-V case
      use_super_nurbs: true,
      program_number: PROGRAM_BASE + 3,
    });
    expect(out.gcode.filter((l) => l.startsWith("G131 P1 ")).length).toBe(1);
    expect(out.gcode.filter((l) => l.startsWith("G131 P0 ")).length).toBe(1);
    // Generic G05.1 bracket must NOT be emitted when override is active
    expect(out.gcode.filter((l) => /^G05\.1\b/.test(l)).length).toBe(0);
  });

  it("surfaces the JM-Die tool-length and Super-NURBS markers; suppresses generic markers", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([surfaceOp], {
      ...JM_DIE_PRESET,
      osp_family: "P500",
      use_super_nurbs: true,
      program_number: PROGRAM_BASE + 4,
    });
    expect(out.tribal_tips_applied).toContain(
      "[jm_die_tool_length] G56 HA emitted (tool-length-comp via active register)"
    );
    expect(out.tribal_tips_applied).toContain(
      "[jm_die_super_nurbs] G131 P1 emitted (OSP-P300MA-H native nano-smoothing)"
    );
    expect(out.tribal_tips_applied).not.toContain(
      "[super_nurbs] P500 Super-NURBS enabled for high-speed contour"
    );
  });
});

// ---------------------------------------------------------------------------
// Defaults preserved (regression — protects the existing 93-test contract)
// ---------------------------------------------------------------------------

describe("Default behavior preserved when preset NOT applied", () => {
  it("emits exactly one `G43 H5 (TOOL 5)` line and zero `G56 HA` lines under defaults", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([baseOp], {
      program_number: PROGRAM_BASE + 100,
      osp_family: "P300",
    });
    const g43Lines = out.gcode.filter((l) => l.startsWith("G43 H5 "));
    expect(g43Lines.length).toBe(1);
    expect(g43Lines[0]).toBe("G43 H5 (TOOL 5)");
    expect(out.gcode.filter((l) => l.startsWith("G56 HA")).length).toBe(0);
  });

  it("emits exactly one `N100` and one `N110` (unpadded) under defaults", () => {
    const ops = [baseOp, { ...baseOp, tool_number: 6 }];
    const out = okumaOSPMillMasterPostEngine.generateProgram(ops, {
      program_number: PROGRAM_BASE + 101,
      osp_family: "P300",
    });
    expect(out.gcode.filter((l) => l.startsWith("N100 ")).length).toBe(1);
    expect(out.gcode.filter((l) => l.startsWith("N110 ")).length).toBe(1);
    // Padded labels must NOT be emitted
    expect(out.gcode.filter((l) => l.startsWith("N0100 ")).length).toBe(0);
    expect(out.block_annotations.map((b) => b.block_id)).toEqual([
      "N100",
      "N110",
    ]);
  });

  it("emits one `G05.1 Q1` and one `G05.1 Q0`, zero `G131`, when super_nurbs_code unset on P500", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([surfaceOp], {
      program_number: PROGRAM_BASE + 102,
      osp_family: "P500",
      use_super_nurbs: true,
      // intentionally omit super_nurbs_code to take dialect default
    });
    expect(out.gcode.filter((l) => /^G05\.1\s+Q1\b/.test(l)).length).toBe(1);
    expect(out.gcode.filter((l) => /^G05\.1\s+Q0\b/.test(l)).length).toBe(1);
    expect(out.gcode.filter((l) => l.startsWith("G131")).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tribal pool — 20-tip merge (assert exact pool size + JM Die provenance)
// ---------------------------------------------------------------------------

describe("Tribal pool — merged 20-tip catalog", () => {
  it("getStats reports exactly TRIBAL_POOL_SIZE tribal tips on P300", () => {
    const stats = okumaOSPMillMasterPostEngine.getStats("P300");
    expect(stats.tribal_tips).toBe(TRIBAL_POOL_SIZE);
  });

  it("getStats reports exactly TRIBAL_POOL_SIZE tribal tips on P500", () => {
    const stats = okumaOSPMillMasterPostEngine.getStats("P500");
    expect(stats.tribal_tips).toBe(TRIBAL_POOL_SIZE);
  });

  it("emits exactly one G74/G84 JM-Die tap-cycle tip when tap operation runs", () => {
    const tapOp: MillOperation = {
      ...baseOp,
      operation_type: "tap",
      tool_number: TOOL_NUM_TAP,
      spindle_rpm: SPINDLE_RPM_TAP,
      feed_mm_min: FEED_TAP_MM_MIN, // tap feed = pitch * RPM
    };
    const out = okumaOSPMillMasterPostEngine.generateProgram([tapOp], {
      program_number: PROGRAM_BASE + 200,
      osp_family: "P300",
    });
    const jmDieTapTips = out.tribal_tips_applied.filter((t) =>
      /G74.*G84|G84.*G74/.test(t)
    );
    expect(jmDieTapTips.length).toBe(1);
    expect(jmDieTapTips[0]).toMatch(/JM Die default/);
  });
});

// ---------------------------------------------------------------------------
// CALL OO88 fixture-offset macro emission (5-axis only on P500)
// ---------------------------------------------------------------------------

describe("CALL OO88 fixture-offset macro", () => {
  it("emits OO88 + G15 H51 preamble for 3d_surface op on P500 with default A=C=0", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([surfaceOp], {
      ...JM_DIE_PRESET,
      osp_family: "P500",
      program_number: PROGRAM_BASE + 300,
    });
    const oo88Lines = out.gcode.filter((l) => l.startsWith("CALL OO88 "));
    expect(oo88Lines.length).toBe(1);
    // Exact emission: PA=0.000 PC=0.000 PH=15 (from JM_DIE_PRESET work_offset) PP=51
    expect(oo88Lines[0]).toBe(
      "CALL OO88 PX=0.000 PY=0.000 PZ=0.000 PA=0.000 PC=0.000 PH=15 PP=51"
    );
    // The G15 H51 load must follow on a subsequent line
    expect(out.gcode).toContain("G15 H51 (OO88 RECALCULATED OFFSET)");
    // Two distinct entries with this category prefix:
    //  (1) pool tip from applyTribalKnowledge (static description)
    //  (2) dynamic emission marker pushed by the OO88 helper itself
    // Filter to the dynamic marker only ("OO88 macro emitted for ...").
    const dynamicMarkers = out.tribal_tips_applied.filter((t) =>
      /\[jm_die_call_oo88\] OO88 macro emitted for/.test(t)
    );
    expect(dynamicMarkers.length).toBe(1);
    expect(dynamicMarkers[0]).toMatch(/A=0\.0 C=0\.0 \(PP=51\)/);
    // The static pool tip should also be present (from applyTribalKnowledge)
    const staticTips = out.tribal_tips_applied.filter((t) =>
      t.startsWith("[jm_die_call_oo88] 5-axis fixture-offset macro")
    );
    expect(staticTips.length).toBe(1);
  });

  it("emits OO88 with custom rotary_a_deg / rotary_c_deg for adaptive op on P500", () => {
    const tiltedOp: MillOperation = {
      ...surfaceOp,
      operation_type: "adaptive",
      rotary_a_deg: -45.5,
      rotary_c_deg: 90.0,
    };
    const out = okumaOSPMillMasterPostEngine.generateProgram([tiltedOp], {
      ...JM_DIE_PRESET,
      osp_family: "P500",
      program_number: PROGRAM_BASE + 301,
    });
    const oo88Lines = out.gcode.filter((l) => l.startsWith("CALL OO88 "));
    expect(oo88Lines.length).toBe(1);
    expect(oo88Lines[0]).toContain("PA=-45.500");
    expect(oo88Lines[0]).toContain("PC=90.000");
  });

  it("does NOT emit OO88 for 3-axis ops (drill/tap/pocket) even on P500 with use_call_oo88", () => {
    const drillOp: MillOperation = {
      ...baseOp,
      operation_type: "drill",
      tool_number: 8,
    };
    const out = okumaOSPMillMasterPostEngine.generateProgram(
      [drillOp, baseOp /* pocket */],
      {
        ...JM_DIE_PRESET,
        osp_family: "P500",
        program_number: PROGRAM_BASE + 302,
      }
    );
    expect(out.gcode.filter((l) => l.startsWith("CALL OO88")).length).toBe(0);
  });

  it("does NOT emit OO88 on P300 even when use_call_oo88=true and op_type=3d_surface", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([surfaceOp], {
      ...JM_DIE_PRESET, // osp_family default P300 from preset itself
      program_number: PROGRAM_BASE + 303,
    });
    expect(out.gcode.filter((l) => l.startsWith("CALL OO88")).length).toBe(0);
  });

  it("does NOT emit OO88 by default (use_call_oo88 unset) on P500 surface op", () => {
    const out = okumaOSPMillMasterPostEngine.generateProgram([surfaceOp], {
      program_number: PROGRAM_BASE + 304,
      osp_family: "P500",
      use_super_nurbs: true,
      // intentionally no use_call_oo88 → default false → no macro
    });
    expect(out.gcode.filter((l) => l.startsWith("CALL OO88")).length).toBe(0);
  });

  it("throws when work_offset_index collides with fixture_offset_wcs (51 reserved)", () => {
    expect(() =>
      okumaOSPMillMasterPostEngine.generateProgram([surfaceOp], {
        ...JM_DIE_PRESET,
        osp_family: "P500",
        work_offset_index: 51, // collision with default fixture_offset_wcs
        program_number: PROGRAM_BASE + 305,
      })
    ).toThrow(/work_offset_index=51 collides with fixture_offset_wcs=51/);
  });

  it("does NOT throw when use_call_oo88 is false even if indices collide", () => {
    // Collision check is gated on use_call_oo88 — without the macro, WCS 51
    // is not reserved, so the operator can use it as a normal offset.
    expect(() =>
      okumaOSPMillMasterPostEngine.generateProgram([baseOp], {
        program_number: PROGRAM_BASE + 306,
        osp_family: "P300",
        work_offset_index: 51,
        // use_call_oo88 unset → false → no collision
      })
    ).not.toThrow();
  });
});
