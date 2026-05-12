/**
 * PPToolNumberRangeValidatorEngine tests.
 */
import { describe, it, expect } from "vitest";
import {
  PPToolNumberRangeValidatorEngine,
  ppToolNumberRangeValidatorEngine,
} from "../engines/PPToolNumberRangeValidatorEngine.js";

const e = new PPToolNumberRangeValidatorEngine();

// ----------------------------------------------------------------------------
// Clean programs
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — clean programs", () => {
  it("single T + M6 on one line passes", () => {
    const r = e.validate("T5 M6");
    expect(r.errors).toBe(0);
    expect(r.summary.total_t_calls).toBe(1);
  });

  it("T on line, M6 on next line passes", () => {
    const r = e.validate("T5\nM6\nS1000 M3\nG0 X0 Y0");
    expect(r.errors).toBe(0);
    expect(r.warnings).toBe(0);
  });

  it("empty program passes", () => {
    expect(e.validate("").summary.valid).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// T0
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — T0 handling", () => {
  it("T0 rejected by default", () => {
    const r = e.validate("T0 M6");
    expect(r.errors).toBe(1);
    expect(r.issues[0]!.kind).toBe("tool_zero");
  });

  it("T0 allowed when option enabled", () => {
    const r = e.validate("T0 M6", { allow_tool_zero: true });
    expect(r.errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Range
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — range", () => {
  it("T above max_tool is error", () => {
    const r = e.validate("T50 M6", { max_tool: 20 });
    expect(r.errors).toBe(1);
    expect(r.issues[0]!.kind).toBe("tool_out_of_range");
  });

  it("T at max_tool is valid", () => {
    expect(e.validate("T20 M6", { max_tool: 20 }).errors).toBe(0);
  });

  it("negative T", () => {
    const r = e.validate("T-1 M6");
    expect(r.issues.some((i) => i.kind === "tool_negative")).toBe(true);
  });

  it("default max_tool is 99", () => {
    expect(e.validate("T100 M6").errors).toBe(1);
    expect(e.validate("T99 M6").errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Missing M6
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — missing M6", () => {
  it("T with no M6 anywhere", () => {
    const r = e.validate("T5\nG0 X0");
    expect(r.warnings).toBeGreaterThanOrEqual(1);
    expect(r.issues.some((i) => i.kind === "tool_without_m6")).toBe(true);
  });

  it("T with M6 beyond lookahead window is flagged", () => {
    const filler = Array.from({ length: 10 }, () => "G0 X0").join("\n");
    const gcode = `T5\n${filler}\nM6`;
    const r = e.validate(gcode, { m6_lookahead_lines: 5 });
    expect(r.issues.some((i) => i.kind === "tool_without_m6")).toBe(true);
  });

  it("T with M6 inside lookahead passes", () => {
    const gcode = `T5\nG0 X0\nG0 Y0\nM6`;
    const r = e.validate(gcode, { m6_lookahead_lines: 5 });
    expect(r.warnings).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Consecutive T without M6
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — consecutive_t_no_m6", () => {
  it("T1 then T2 without M6 in between", () => {
    const r = e.validate("T1\nT2 M6");
    expect(r.issues.some((i) => i.kind === "consecutive_t_no_m6")).toBe(true);
  });

  it("T1 M6 T2 M6 is clean (M6 between)", () => {
    const r = e.validate("T1 M6\nT2 M6");
    expect(r.warnings).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Duplicate load
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — duplicate_load", () => {
  it("same tool loaded twice in a row → info", () => {
    const r = e.validate("T5 M6\nT5 M6");
    expect(r.info).toBe(1);
    expect(r.issues[0]!.kind).toBe("duplicate_load");
  });

  it("different tools consecutively → no duplicate_load", () => {
    const r = e.validate("T5 M6\nT6 M6");
    expect(r.info).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — summary", () => {
  it("counts distinct tools", () => {
    const r = e.validate("T1 M6\nT2 M6\nT1 M6");
    expect(r.summary.distinct_tools).toEqual([1, 2]);
    expect(r.summary.total_t_calls).toBe(3);
  });

  it("max_tool_seen reflects highest call", () => {
    const r = e.validate("T1 M6\nT5 M6\nT3 M6");
    expect(r.summary.max_tool_seen).toBe(5);
  });

  it("quickCheck returns digest", () => {
    const q = e.quickCheck("T100 M6");
    expect(q.valid).toBe(false);
    expect(q.total_t_calls).toBe(1);
  });

  it("defaultOptions exposes defaults", () => {
    const d = e.defaultOptions();
    expect(d.max_tool).toBe(99);
    expect(d.allow_tool_zero).toBe(false);
    expect(d.m6_lookahead_lines).toBe(5);
  });
});

// ----------------------------------------------------------------------------
// Comment stripping
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — comment stripping", () => {
  it("T words inside parentheses ignored", () => {
    const r = e.validate("(T50 inside comment)\nT1 M6");
    expect(r.errors).toBe(0);
  });

  it("T words after semicolon ignored", () => {
    const r = e.validate("T1 M6 ; T50 here");
    expect(r.errors).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Singleton
// ----------------------------------------------------------------------------

describe("PPToolNumberRangeValidatorEngine — singleton", () => {
  it("ppToolNumberRangeValidatorEngine works", () => {
    const r = ppToolNumberRangeValidatorEngine.validate("T5 M6");
    expect(r.summary.valid).toBe(true);
  });
});
