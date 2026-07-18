/**
 * ToolNoseRadiusCompensationEngine — TNR reference + LAP-rule validation tests.
 *
 * Ported from PRISM_TOOL_NOSE_RADIUS_COMPENSATION_ENGINE.js (monolith R2.3.1).
 *
 * Reference values come straight from the Fanuc lathe TNR manual:
 *   - G40/G41/G42 semantics
 *   - P-code orientation table (P1=45° quadrant I, P3=225° quadrant III, etc.)
 *   - Max compensation ±999.999 mm
 *   - LAP rule: TNR must be cancelled (G40) before G80
 */

import { describe, it, expect } from "vitest";
import {
  ToolNoseRadiusCompensationEngine,
  TNR_MAX_COMP_MM,
  PCodeLookupInputSchema,
} from "../engines/ToolNoseRadiusCompensationEngine";

const eng = ToolNoseRadiusCompensationEngine;

describe("ToolNoseRadiusCompensationEngine — G-codes", () => {
  it("G40 is the cancel code", () => {
    expect(eng.getGCode("G40").name).toBe("Cancel TNR");
  });
  it("G41 is tool-nose-LEFT", () => {
    expect(eng.getGCode("G41").name).toBe("TNR Left");
    expect(eng.getGCode("G41").description).toContain("LEFT");
  });
  it("G42 is tool-nose-RIGHT", () => {
    expect(eng.getGCode("G42").name).toBe("TNR Right");
    expect(eng.getGCode("G42").description).toContain("RIGHT");
  });
});

describe("ToolNoseRadiusCompensationEngine — P-code orientation", () => {
  it("P1 = 45° quadrant I (back boring)", () => {
    const p = eng.lookupPCode(1);
    expect(p.angle).toBe(45);
    expect(p.quadrant).toBe("I");
    expect(p.typical).toBe("Back boring");
  });

  it("P3 = 225° quadrant III (OD turning right)", () => {
    const p = eng.lookupPCode(3);
    expect(p.angle).toBe(225);
    expect(p.quadrant).toBe("III");
  });

  it("P0 angle is NaN (sign-based, not a fixed quadrant)", () => {
    const p = eng.lookupPCode(0);
    expect(Number.isNaN(p.angle)).toBe(true);
    expect(p.quadrant).toBe("sign-based");
  });

  it("P5..P8 cover the four axis directions", () => {
    expect(eng.lookupPCode(5).angle).toBe(0);    // +X
    expect(eng.lookupPCode(6).angle).toBe(90);   // +Z
    expect(eng.lookupPCode(7).angle).toBe(180);  // -X
    expect(eng.lookupPCode(8).angle).toBe(270);  // -Z
  });

  it("listPCodes returns all 9 in P0..P8 order", () => {
    const list = eng.listPCodes();
    expect(list).toHaveLength(9);
    expect(list[1].angle).toBe(45);   // P1
    expect(list[3].angle).toBe(225);  // P3
  });

  it("lookupPCode throws on out-of-range index", () => {
    expect(() => eng.lookupPCode(9)).toThrow();
    expect(() => eng.lookupPCode(-1)).toThrow();
  });

  it("Zod schema enforces 0..8 integer", () => {
    expect(() => PCodeLookupInputSchema.parse({ pCode: 4 })).not.toThrow();
    expect(() => PCodeLookupInputSchema.parse({ pCode: 4.5 })).toThrow();
    expect(() => PCodeLookupInputSchema.parse({ pCode: 99 })).toThrow();
  });
});

describe("ToolNoseRadiusCompensationEngine — cancellation methods", () => {
  it("basic cancel has the X/Z form", () => {
    expect(eng.getCancellationMethod("basic").example).toBe("G40 X__ Z__");
  });
  it("withK uses the K word for exit control", () => {
    const m = eng.getCancellationMethod("withK");
    expect(m.example).toContain("K-1");
    expect(m.note).toContain("controlled linear exit");
  });
  it("withI uses the I word", () => {
    expect(eng.getCancellationMethod("withI").example).toContain("I1");
  });
});

describe("ToolNoseRadiusCompensationEngine — compensation range", () => {
  it("accepts values within ±999.999 mm", () => {
    expect(eng.isCompensationInRange(0)).toBe(true);
    expect(eng.isCompensationInRange(500)).toBe(true);
    expect(eng.isCompensationInRange(-999.999)).toBe(true);
    expect(eng.isCompensationInRange(TNR_MAX_COMP_MM)).toBe(true);
  });

  it("rejects values beyond the max", () => {
    expect(eng.isCompensationInRange(1000)).toBe(false);
    expect(eng.isCompensationInRange(-1000)).toBe(false);
  });

  it("rejects NaN / Infinity (adversarial)", () => {
    expect(eng.isCompensationInRange(NaN)).toBe(false);
    expect(eng.isCompensationInRange(Infinity)).toBe(false);
    expect(eng.isCompensationInRange(-Infinity)).toBe(false);
  });
});

describe("ToolNoseRadiusCompensationEngine — parseProgram", () => {
  it("detects G41/G42/G40 per line, 1-based line numbers", () => {
    const prog = "G0 G41 X10 Z2\nG1 Z-5\nG40 X12 K1";
    const parsed = eng.parseProgram(prog);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].tnr).toBe("G41");
    expect(parsed[0].lineNumber).toBe(1);
    expect(parsed[1].tnr).toBe("none");
    expect(parsed[2].tnr).toBe("G40");
  });

  it("detects G80 as the LAP-end block", () => {
    const parsed = eng.parseProgram("NLAP1 G82\nG80");
    expect(parsed[1].isG80).toBe(true);
    expect(parsed[0].isG80).toBe(false);
  });

  it("does not false-match G410 / G420 (word boundary)", () => {
    const parsed = eng.parseProgram("G410 X1\nG4 X2");
    expect(parsed[0].tnr).toBe("none");
    expect(parsed[1].tnr).toBe("none");
  });

  it("is case-insensitive", () => {
    const parsed = eng.parseProgram("g41 x1");
    expect(parsed[0].tnr).toBe("G41");
  });
});

describe("ToolNoseRadiusCompensationEngine — validateProgram (LAP rule)", () => {
  it("PASSES a correctly-balanced LAP (G41 ... G40 before G80)", () => {
    const prog = [
      "NLAP1 G82",
      "G0 G41 X10 Z2",
      "G1 Z-20",
      "G40 X12 K1",
      "G80",
    ].join("\n");
    const r = eng.validateProgram(prog);
    expect(r.ok).toBe(true);
    expect(r.issues.filter(i => i.severity === "error")).toHaveLength(0);
  });

  it("FAILS when G80 reached with TNR still active (the canonical bug)", () => {
    const prog = [
      "NLAP1 G82",
      "G0 G41 X10 Z2",
      "G1 Z-20",
      "G80", // <-- missing G40 cancel before G80
    ].join("\n");
    const r = eng.validateProgram(prog);
    expect(r.ok).toBe(false);
    const errs = r.issues.filter(i => i.severity === "error");
    expect(errs).toHaveLength(1);
    expect(errs[0].rule).toBe("tnr.unbalanced_lap");
    expect(errs[0].lineNumber).toBe(4);
    expect(errs[0].message).toContain("G41");
  });

  it("G42 path also flags the unbalanced-LAP error", () => {
    const r = eng.validateProgram("G42 X1\nG80");
    expect(r.ok).toBe(false);
    expect(r.issues[0].message).toContain("G42");
  });

  it("a program with no TNR codes is trivially OK", () => {
    const r = eng.validateProgram("G0 X10\nG1 Z-5\nG80");
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("re-cancel after G40 then new G41 before next G80 is OK", () => {
    const prog = [
      "G41 X1",
      "G40 X2",
      "G80",       // OK — TNR inactive here
      "G42 X3",
      "G40 X4",
      "G80",       // OK — cancelled again
    ].join("\n");
    const r = eng.validateProgram(prog);
    expect(r.ok).toBe(true);
  });

  it("empty program is OK (no lines, no issues)", () => {
    const r = eng.validateProgram("");
    expect(r.ok).toBe(true);
    expect(r.parsed).toHaveLength(1); // single empty line
  });
});

describe("ToolNoseRadiusCompensationEngine — setup procedure", () => {
  it("returns the 7-step Fanuc procedure with the max-setting line", () => {
    const steps = eng.getSetupProcedure();
    expect(steps).toHaveLength(7);
    expect(steps[0]).toContain("Tool Data Setting");
    expect(steps[steps.length - 1]).toContain("999.999");
  });

  it("setup procedure is immutable (frozen)", () => {
    const steps = eng.getSetupProcedure();
    expect(Object.isFrozen(steps)).toBe(true);
  });
});
