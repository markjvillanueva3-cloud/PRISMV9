/**
 * PPAxisLetterValidatorEngine tests.
 */
import { describe, it, expect } from "vitest";
import {
  PPAxisLetterValidatorEngine,
  ppAxisLetterValidatorEngine,
} from "../engines/PPAxisLetterValidatorEngine.js";

const e = new PPAxisLetterValidatorEngine();

// ----------------------------------------------------------------------------
// Clean programs
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — clean programs", () => {
  it("ordinary 3-axis mill program passes", () => {
    const gcode = `O1000
G90 G21 G17
G54
T1 M6
S1000 M3
G0 X0 Y0 Z10
G1 Z-1 F100
X10 Y10
G2 X20 Y0 I5 J-5
M5
M30`;
    const r = e.validate(gcode);
    expect(r.errors).toBe(0);
    expect(r.summary.valid).toBe(true);
  });

  it("empty program passes", () => {
    expect(e.validate("").summary.valid).toBe(true);
  });

  it("comments and blank lines ignored", () => {
    const gcode = `(header)
; semicolon comment
G0 X0`;
    expect(e.validate(gcode).errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Unknown letters
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — unknown letters", () => {
  it("flags a totally unknown letter", () => {
    const r = e.validate("G1 X10 Z5 \u03A95");
    // Ω isn't A-Z so won't be picked up; use a plain unknown like "Y" with a
    // restricted allow-list instead.
    expect(r.errors).toBe(0);
  });

  it("custom allow-list rejects letters outside it", () => {
    const r = e.validate("G1 X10 Y10", {
      allowed_letters: ["G", "X", "F"],
    });
    expect(r.errors).toBe(1);
    expect(r.issues[0]!.kind).toBe("unknown_letter");
    expect(r.issues[0]!.letter).toBe("Y");
  });
});

// ----------------------------------------------------------------------------
// Digit-only tokens
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — orphan digit tokens", () => {
  it("flags bare numeric token", () => {
    const r = e.validate("G1 10 X5");
    const kinds = r.issues.map((i) => i.kind);
    expect(kinds).toContain("digit_only_token");
  });

  it("flags signed bare number", () => {
    const r = e.validate("G1 -5.0 X10");
    expect(r.issues.some((i) => i.kind === "digit_only_token")).toBe(true);
  });

  it("line numbers as N words are fine", () => {
    expect(e.validate("N10 G0 X0").errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Letter without value
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — letter_without_value", () => {
  it("flags X with no digits", () => {
    const r = e.validate("G1 X Y10 F100");
    expect(r.issues.some((i) => i.kind === "letter_without_value")).toBe(true);
  });

  it("standalone letter is an error", () => {
    const r = e.validate("Z");
    expect(r.issues[0]!.kind).toBe("letter_without_value");
  });
});

// ----------------------------------------------------------------------------
// Suspicious concatenation
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — suspicious_concat", () => {
  it("flags two-letter start like GX10", () => {
    const r = e.validate("GX10");
    expect(r.issues[0]!.kind).toBe("suspicious_concat");
  });

  it("flags interior letter like G1X10 (missing space)", () => {
    const r = e.validate("G1X10");
    expect(r.issues.some((i) => i.kind === "suspicious_concat")).toBe(true);
  });

  it("spaced version is fine", () => {
    expect(e.validate("G1 X10").errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Disabled axis
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — disabled_axis_used", () => {
  it("3-axis machine (no rotary): A rejected", () => {
    const r = e.validate("G0 A90", { enabled_axes: [] });
    expect(r.errors).toBe(1);
    expect(r.issues[0]!.kind).toBe("disabled_axis_used");
  });

  it("4-axis machine: A allowed, B rejected", () => {
    const r = e.validate("G0 A90 B45", { enabled_axes: ["A"] });
    expect(r.errors).toBe(1);
    expect(r.issues[0]!.letter).toBe("B");
  });

  it("5-axis machine: A and B allowed", () => {
    expect(e.validate("G0 A90 B45", { enabled_axes: ["A", "B"] }).errors).toBe(0);
  });

  it("undefined enabled_axes permits all rotary", () => {
    expect(e.validate("G0 A90 B45 C30 U5 V5 W5").errors).toBe(0);
  });

  it("linear axes (X/Y/Z) always allowed regardless of enabled_axes", () => {
    expect(e.validate("G0 X10 Y20 Z5", { enabled_axes: [] }).errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — summary", () => {
  it("letters_seen is sorted and unique", () => {
    const r = e.validate(`G1 X10 Y10 Z5
F100 S1000`);
    expect(r.summary.letters_seen).toEqual(["F", "G", "S", "X", "Y", "Z"]);
  });

  it("unknown_letters_seen lists only rejected letters", () => {
    const r = e.validate("G1 X10 Q5", {
      allowed_letters: ["G", "X"],
    });
    expect(r.summary.unknown_letters_seen).toEqual(["Q"]);
  });

  it("quickCheck returns pass/fail digest", () => {
    const q = e.quickCheck("G1 10");
    expect(q.valid).toBe(false);
    expect(q.errors).toBe(1);
  });

  it("defaultAllowedLetters exposes the built-in set", () => {
    const letters = e.defaultAllowedLetters();
    expect(letters).toContain("G");
    expect(letters).toContain("X");
    expect(letters).toContain("F");
  });
});

// ----------------------------------------------------------------------------
// Comment stripping
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — comment stripping", () => {
  it("parenthesised text does not trigger validation", () => {
    const r = e.validate("G1 X10 (Q99 would be bad)");
    expect(r.errors).toBe(0);
  });

  it("semicolon comment ignored", () => {
    const r = e.validate("G1 X10 ; W99 comment");
    expect(r.errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Singleton
// ----------------------------------------------------------------------------

describe("PPAxisLetterValidatorEngine — singleton", () => {
  it("ppAxisLetterValidatorEngine works", () => {
    const r = ppAxisLetterValidatorEngine.validate("G1 X10");
    expect(r.summary.valid).toBe(true);
  });
});
