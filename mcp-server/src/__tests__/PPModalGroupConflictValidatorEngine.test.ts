/**
 * PPModalGroupConflictValidatorEngine tests.
 */
import { describe, it, expect } from "vitest";
import {
  PPModalGroupConflictValidatorEngine,
  ppModalGroupConflictValidatorEngine,
} from "../engines/PPModalGroupConflictValidatorEngine.js";

const e = new PPModalGroupConflictValidatorEngine();

// ----------------------------------------------------------------------------
// Clean program — no conflicts
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — clean programs", () => {
  it("single motion code per block passes", () => {
    const gcode = `G90 G21
G0 X0 Y0
G1 X10 F100
G2 X20 I5
M30`;
    const r = e.validate(gcode);
    expect(r.errors).toBe(0);
    expect(r.summary.valid).toBe(true);
  });

  it("empty program passes", () => {
    const r = e.validate("");
    expect(r.summary.valid).toBe(true);
    expect(r.total_issues).toBe(0);
  });

  it("comments and blank lines ignored", () => {
    const gcode = `(setup block)
G90
; incremental NOT enabled
G1 X10`;
    const r = e.validate(gcode);
    expect(r.errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Motion group (G-group 01)
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — motion group", () => {
  it("flags G0 + G1 in one block", () => {
    const r = e.validate("G0 G1 X10");
    expect(r.errors).toBe(1);
    expect(r.issues[0]!.kind).toBe("motion_group_conflict");
    expect(r.issues[0]!.codes).toEqual(["G0", "G1"]);
  });

  it("flags G1 + G2", () => {
    const r = e.validate("G1 G2 X10 I5");
    expect(r.errors).toBe(1);
    expect(r.issues[0]!.kind).toBe("motion_group_conflict");
  });

  it("flags canned cycle + linear move", () => {
    const r = e.validate("G81 G1 X10 Z-5 R1");
    expect(r.errors).toBe(1);
    expect(r.issues[0]!.codes).toContain("G81");
    expect(r.issues[0]!.codes).toContain("G1");
  });

  it("G0 and G1 across different blocks do NOT conflict", () => {
    const gcode = `G0 X0
G1 X10`;
    const r = e.validate(gcode);
    expect(r.errors).toBe(0);
  });

  it("leading-zero variants treated as same code", () => {
    // G01 and G1 are the same; two G1 codes don't trigger (no dup of same code)
    const r = e.validate("G01 X0");
    expect(r.errors).toBe(0);
  });

  it("G1 + G01 on one block is NOT a conflict (same code)", () => {
    const r = e.validate("G1 G01 X5"); // both parse as G1
    expect(r.errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Plane / abs-inc / units
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — plane & units & abs/inc", () => {
  it("flags G17 + G18", () => {
    const r = e.validate("G17 G18");
    expect(r.issues[0]!.kind).toBe("plane_group_conflict");
  });

  it("flags G90 + G91", () => {
    const r = e.validate("G90 G91 X10");
    expect(r.issues[0]!.kind).toBe("abs_incr_conflict");
  });

  it("flags G20 + G21", () => {
    const r = e.validate("G20 G21");
    expect(r.issues[0]!.kind).toBe("units_conflict");
  });

  it("G17 alone is fine", () => {
    expect(e.validate("G17 G0 X0 Y0").errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Feed mode / return mode
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — feed & return modes", () => {
  it("flags G93 + G94", () => {
    const r = e.validate("G93 G94 F100");
    expect(r.issues[0]!.kind).toBe("feed_mode_conflict");
  });

  it("flags G98 + G99", () => {
    const r = e.validate("G98 G99 X10 Z-5");
    expect(r.issues[0]!.kind).toBe("return_mode_conflict");
  });
});

// ----------------------------------------------------------------------------
// Cutter comp / tool length
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — comp & length offsets", () => {
  it("flags G41 + G42", () => {
    const r = e.validate("G41 G42 D1 X10");
    expect(r.issues[0]!.kind).toBe("cutter_comp_conflict");
  });

  it("flags G40 + G41 in the same block", () => {
    const r = e.validate("G40 G41 D1");
    expect(r.issues[0]!.kind).toBe("cutter_comp_conflict");
  });

  it("flags G43 + G49", () => {
    const r = e.validate("G43 G49 H1");
    expect(r.issues[0]!.kind).toBe("tool_length_conflict");
  });
});

// ----------------------------------------------------------------------------
// Work coord / rotation
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — work coord & rotation", () => {
  it("flags G54 + G55", () => {
    const r = e.validate("G54 G55 X0 Y0");
    expect(r.issues[0]!.kind).toBe("work_coord_conflict");
  });

  it("flags G68 + G69", () => {
    const r = e.validate("G68 G69 X0 Y0 R45");
    expect(r.issues[0]!.kind).toBe("rotation_conflict");
  });
});

// ----------------------------------------------------------------------------
// M-groups: stop/end, spindle, coolant
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — M-groups", () => {
  it("flags M02 + M30", () => {
    const r = e.validate("M02 M30");
    expect(r.issues[0]!.kind).toBe("stop_end_conflict");
  });

  it("flags M03 + M04", () => {
    const r = e.validate("M03 M04 S1000");
    expect(r.issues[0]!.kind).toBe("spindle_conflict");
  });

  it("flags M03 + M05", () => {
    const r = e.validate("M03 M05 S1000");
    expect(r.issues[0]!.kind).toBe("spindle_conflict");
  });

  it("M07 + M08 (flood + mist) is info by default", () => {
    const r = e.validate("M07 M08");
    expect(r.errors).toBe(0);
    expect(r.info).toBe(1);
    expect(r.issues[0]!.kind).toBe("coolant_conflict");
  });

  it("M07 + M08 is warning when flood+mist allowance disabled", () => {
    const r = e.validate("M07 M08", {
      coolant_allow_flood_plus_mist: false,
    });
    expect(r.warnings).toBe(1);
    expect(r.info).toBe(0);
  });

  it("M08 + M09 is warning (not flood+mist)", () => {
    const r = e.validate("M08 M09");
    expect(r.warnings).toBe(1);
  });
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — summary", () => {
  it("counts multiple issues across multiple lines", () => {
    const gcode = `G0 G1 X10
G17 G18
M03 M04`;
    const r = e.validate(gcode);
    expect(r.errors).toBe(3);
    expect(r.summary.lines_with_conflicts).toBe(3);
  });

  it("most_common_conflict identifies the dominant issue", () => {
    const gcode = `G0 G1 X10
G0 G1 X20
G17 G18`;
    const r = e.validate(gcode);
    expect(r.summary.most_common_conflict).toBe("motion_group_conflict");
  });

  it("quickCheck returns pass/fail digest", () => {
    const q = e.quickCheck("G0 G1 X10");
    expect(q.valid).toBe(false);
    expect(q.errors).toBe(1);
  });

  it("defaultOptions exposes coolant allowance default", () => {
    expect(e.defaultOptions().coolant_allow_flood_plus_mist).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Comment handling
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — comments", () => {
  it("codes inside parentheses are ignored", () => {
    const r = e.validate("G1 X10 (was G0 G1)");
    expect(r.errors).toBe(0);
  });

  it("codes after semicolon are ignored", () => {
    const r = e.validate("G1 X10 ; G0 G1 here");
    expect(r.errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Cross-group isolation
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — cross-group isolation", () => {
  it("codes from different groups do not conflict", () => {
    // G90 (group 3), G17 (group 2), G21 (group 6) — all different groups
    const r = e.validate("G90 G17 G21 G1 X10");
    expect(r.errors).toBe(0);
  });

  it("two different group conflicts in one block are both reported", () => {
    const r = e.validate("G0 G1 G17 G18");
    expect(r.errors).toBe(2);
    const kinds = r.issues.map((i) => i.kind).sort();
    expect(kinds).toEqual(["motion_group_conflict", "plane_group_conflict"]);
  });
});

// ----------------------------------------------------------------------------
// Singleton
// ----------------------------------------------------------------------------

describe("PPModalGroupConflictValidatorEngine — singleton", () => {
  it("ppModalGroupConflictValidatorEngine is usable", () => {
    const r = ppModalGroupConflictValidatorEngine.validate("G0 G1 X10");
    expect(r.errors).toBe(1);
  });
});
