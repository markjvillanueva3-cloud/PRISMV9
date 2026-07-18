/**
 * GCodeTranspilerEngine.test.ts -- Companion tests for GCodeTranspilerEngine
 *
 * All assertions are reference-value or algebraic-invariant, derived directly
 * from the engine source constants (SAFE_START, TOOL_CHANGE, GCODE_MAP,
 * WORK_OFFSET, CANNED_CYCLES). Tests fail when engine logic changes (R9).
 */

import { describe, it, expect } from "vitest";
import { gcodeTranspiler } from "../engines/GCodeTranspilerEngine.js";
import type { TranspileConfig } from "../engines/GCodeTranspilerEngine.js";

function cfg(
  source: TranspileConfig["source"],
  target: TranspileConfig["target"],
  overrides: Partial<TranspileConfig> = {}
): TranspileConfig {
  return { source, target, ...overrides };
}

/** Find a changed line by original content; throw with context if missing. */
function findChanged(gcode: string, input: string) {
  const result = gcodeTranspiler.transpile(gcode, cfg("fanuc", "fanuc")); // placeholder -- replaced per use
  void result;
  return null; // never called; replaced below per test
}
void findChanged;

// ---------------------------------------------------------------------------
// 1. listDialects
// ---------------------------------------------------------------------------

describe("listDialects", () => {
  it("returns exactly 6 controller families", () => {
    expect(gcodeTranspiler.listDialects()).toHaveLength(6);
  });

  it("contains each of the 6 named dialects", () => {
    const d = gcodeTranspiler.listDialects();
    for (const name of ["fanuc", "siemens", "heidenhain", "mazak", "okuma", "haas"] as const) {
      expect(d).toContain(name);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. getSafeStart -- reference values from SAFE_START constant in source
// ---------------------------------------------------------------------------

describe("getSafeStart", () => {
  it("Fanuc safe start is G90 G94 G17 G40 G49 G80", () => {
    expect(gcodeTranspiler.getSafeStart("fanuc")).toBe("G90 G94 G17 G40 G49 G80");
  });

  it("Siemens safe start uses MCALL (not G80) to cancel canned cycles", () => {
    expect(gcodeTranspiler.getSafeStart("siemens")).toBe("G90 G94 G17 G40 G49 MCALL");
  });

  it("Okuma safe start appends G15 H0 for workzone pre-select", () => {
    expect(gcodeTranspiler.getSafeStart("okuma")).toBe("G90 G94 G17 G40 G49 G80 G15 H0");
  });

  it("Haas safe start matches Fanuc (Haas NGC is Fanuc-compatible)", () => {
    expect(gcodeTranspiler.getSafeStart("haas")).toBe("G90 G94 G17 G40 G49 G80");
  });

  it("Heidenhain safe start matches Fanuc form", () => {
    expect(gcodeTranspiler.getSafeStart("heidenhain")).toBe("G90 G94 G17 G40 G49 G80");
  });
});

// ---------------------------------------------------------------------------
// 3. listCycleTranslations -- structural coverage
// ---------------------------------------------------------------------------

describe("listCycleTranslations", () => {
  it("covers the 5 standard Fanuc drilling/tapping cycles", () => {
    const cycles = gcodeTranspiler.listCycleTranslations();
    for (const code of ["G81", "G83", "G84", "G73", "G76"]) {
      expect(Object.keys(cycles)).toContain(code);
    }
  });

  it("G81 targets include siemens, heidenhain, okuma but not fanuc", () => {
    const g81 = gcodeTranspiler.listCycleTranslations()["G81"];
    expect(g81).toContain("siemens");
    expect(g81).toContain("heidenhain");
    expect(g81).toContain("okuma");
    expect(g81).not.toContain("fanuc");
  });
});

// ---------------------------------------------------------------------------
// 4. transpile -- safe start injection
// ---------------------------------------------------------------------------

describe("transpile -- safe start injection", () => {
  it("first output line contains Fanuc safe start when target=fanuc (default on)", () => {
    const result = gcodeTranspiler.transpile("G0 X0 Y0", cfg("fanuc", "fanuc"));
    expect(result.gcode.split("\n")[0]).toContain("G90 G94 G17 G40 G49 G80");
  });

  it("first output line contains MCALL when targeting Siemens", () => {
    const result = gcodeTranspiler.transpile("G0 X0", cfg("fanuc", "siemens"));
    expect(result.gcode.split("\n")[0]).toContain("MCALL");
  });

  it("suppresses safe start when safeStartBlock=false -- first output line is not safe start constant", () => {
    const result = gcodeTranspiler.transpile("M30", cfg("fanuc", "siemens", { safeStartBlock: false }));
    const first = result.gcode.split("\n")[0];
    expect(first).not.toContain("MCALL");
    expect(first).not.toContain("G90 G94 G17 G40 G49");
  });

  it("Okuma safe start in first line contains G15 H0", () => {
    const result = gcodeTranspiler.transpile("M30", cfg("fanuc", "okuma"));
    expect(result.gcode.split("\n")[0]).toContain("G15 H0");
  });
});

// ---------------------------------------------------------------------------
// 5. transpile -- tool change translation (reference values from TOOL_CHANGE)
// ---------------------------------------------------------------------------

describe("transpile -- tool change translation", () => {
  it("T05 M6: Fanuc->Siemens produces T5\\nM6 (no leading-zero, two-token)", () => {
    // TOOL_CHANGE.siemens = (t, _) => `T${t}\nM6` -- no padStart
    const result = gcodeTranspiler.transpile("T05 M6", cfg("fanuc", "siemens"));
    const line = result.lines.find(l => l.original.trim() === "T05 M6");
    expect(line?.translated).toBe("T5\nM6");
    expect(line?.changed).toBe(true);
  });

  it("T3 M6: Fanuc->Okuma produces T0003\\nM6 (4-digit zero-pad)", () => {
    // TOOL_CHANGE.okuma = (t, _) => `T${t.toString().padStart(4,"0")}\nM6`
    const result = gcodeTranspiler.transpile("T3 M6", cfg("fanuc", "okuma"));
    const line = result.lines.find(l => l.original.trim() === "T3 M6");
    expect(line?.translated).toBe("T0003\nM6");
  });

  it("T10 M6: Fanuc->Heidenhain produces TOOL CALL 10 Z S0", () => {
    // TOOL_CHANGE.heidenhain = (t, _) => `TOOL CALL ${t} Z S0`
    const result = gcodeTranspiler.transpile("T10 M6", cfg("fanuc", "heidenhain"));
    const line = result.lines.find(l => l.original.trim() === "T10 M6");
    expect(line?.translated).toBe("TOOL CALL 10 Z S0");
  });

  it("T02 M6: Fanuc->Haas produces T2 M6 (no offset argument)", () => {
    // TOOL_CHANGE.haas = (t, o) => `T${t} M6\n${o != null ? `G43 H${o}` : ""}`.trim()
    // No H offset parsed from "T02 M6" -> trim removes trailing empty -> "T2 M6"
    const result = gcodeTranspiler.transpile("T02 M6", cfg("fanuc", "haas"));
    const line = result.lines.find(l => l.original.trim() === "T02 M6");
    expect(line?.translated).toBe("T2 M6");
  });

  it("T01 M6 G43 H1: Fanuc->Fanuc includes G43 H1 (tool length offset preserved)", () => {
    // TOOL_CHANGE.fanuc = (t, o) => `T${t.toString().padStart(2,"0")} M6\n${o != null ? `G43 H${o}` : ""}`.trim()
    // offset parsed from H1 -> o=1 -> "T01 M6\nG43 H1"
    const result = gcodeTranspiler.transpile("T01 M6 G43 H1", cfg("fanuc", "fanuc"));
    const line = result.lines.find(l => l.original.trim() === "T01 M6 G43 H1");
    expect(line?.translated).toBe("T01 M6\nG43 H1");
  });
});

// ---------------------------------------------------------------------------
// 6. transpile -- canned cycle conversion (Fanuc -> Siemens)
// ---------------------------------------------------------------------------

describe("transpile -- canned cycles Fanuc -> Siemens", () => {
  it("G81 Z-20.0 R2.0 F100 -> CYCLE81(2,-20,0,100)", () => {
    // Source: CANNED_CYCLES["G81"].siemens = (p) => `CYCLE81(${p.R ?? 0},${p.Z ?? 0},0,${p.F ?? 0})`
    const result = gcodeTranspiler.transpile("G81 Z-20.0 R2.0 F100", cfg("fanuc", "siemens"));
    const line = result.lines.find(l => l.original.trim() === "G81 Z-20.0 R2.0 F100");
    expect(line?.translated).toBe("CYCLE81(2,-20,0,100)");
    expect(line?.changed).toBe(true);
    expect(result.stats.cyclesConverted).toBeGreaterThanOrEqual(1);
  });

  it("G83 Z-30.0 R2.0 Q5.0 F80 -> CYCLE83(2,-30,0,5,0,80,0,0,0)", () => {
    // Source: CANNED_CYCLES["G83"].siemens = (p) => `CYCLE83(${p.R},${p.Z},0,${p.Q},0,${p.F},0,0,0)`
    const result = gcodeTranspiler.transpile("G83 Z-30.0 R2.0 Q5.0 F80", cfg("fanuc", "siemens"));
    const line = result.lines.find(l => l.original.trim() === "G83 Z-30.0 R2.0 Q5.0 F80");
    expect(line?.translated).toBe("CYCLE83(2,-30,0,5,0,80,0,0,0)");
  });

  it("G84 Z-15.0 R2.0 F125 -> CYCLE84(2,-15,0,125,0,3)", () => {
    // Source: CANNED_CYCLES["G84"].siemens = (p) => `CYCLE84(${p.R},${p.Z},0,${p.F},0,3)`
    const result = gcodeTranspiler.transpile("G84 Z-15.0 R2.0 F125", cfg("fanuc", "siemens"));
    const line = result.lines.find(l => l.original.trim() === "G84 Z-15.0 R2.0 F125");
    expect(line?.translated).toBe("CYCLE84(2,-15,0,125,0,3)");
  });

  it("G73 Z-18.0 R2.0 Q4.0 F90 -> CYCLE83 high-speed variant (last param=1)", () => {
    // Source: CANNED_CYCLES["G73"].siemens = (p) => `CYCLE83(...,1)` -- same as G83 but trailing 1
    const result = gcodeTranspiler.transpile("G73 Z-18.0 R2.0 Q4.0 F90", cfg("fanuc", "siemens"));
    const line = result.lines.find(l => l.original.trim() === "G73 Z-18.0 R2.0 Q4.0 F90");
    expect(line?.translated).toBe("CYCLE83(2,-18,0,4,0,90,0,0,1)");
  });
});

describe("transpile -- canned cycles Fanuc -> Heidenhain", () => {
  it("G81 Z-10.0 R1.0 F60 -> CYCL DEF 200 with Q200=1, Q201=10, Q206=60", () => {
    // Source: heidenhain G81 = CYCL DEF 200 DRILLING with Math.abs(R), Math.abs(Z), F
    const result = gcodeTranspiler.transpile("G81 Z-10.0 R1.0 F60", cfg("fanuc", "heidenhain"));
    const line = result.lines.find(l => l.original.trim() === "G81 Z-10.0 R1.0 F60");
    expect(line?.translated).toContain("CYCL DEF 200 DRILLING");
    expect(line?.translated).toContain("Q200=1");
    expect(line?.translated).toContain("Q201=10");
    expect(line?.translated).toContain("Q206=60");
  });

  it("G83 peck -> CYCL DEF 203 with Q202=peck depth", () => {
    const result = gcodeTranspiler.transpile("G83 Z-20.0 R2.0 Q3.0 F100", cfg("fanuc", "heidenhain"));
    const line = result.lines.find(l => l.original.trim() === "G83 Z-20.0 R2.0 Q3.0 F100");
    expect(line?.translated).toContain("CYCL DEF 203 UNIVERSAL DRILLING");
    expect(line?.translated).toContain("Q202=3");
  });
});

// ---------------------------------------------------------------------------
// 7. transpile -- G80 cycle cancel dialect difference
// ---------------------------------------------------------------------------

describe("transpile -- G80 cycle cancel", () => {
  it("G80 Fanuc->Siemens translates to MCALL (Siemens cycle cancel keyword)", () => {
    // Source: GCODE_MAP["G80"]["siemens"] = "MCALL"
    const result = gcodeTranspiler.transpile("G80", cfg("fanuc", "siemens"));
    const line = result.lines.find(l => l.original.trim() === "G80");
    expect(line?.translated).toBe("MCALL");
    expect(line?.changed).toBe(true);
  });

  it("G80 Fanuc->Haas stays G80 (handled by cycle-cancel path, changed=false, no changed entries)", () => {
    // Source: cycleCode==="G80" branch: g80eq=GCODE_MAP["G80"]["haas"]="G80",
    // changed = "G80" !== "G80" = false -> not in result.lines, neither counter incremented.
    const result = gcodeTranspiler.transpile("G80", cfg("fanuc", "haas", { safeStartBlock: false }));
    expect(result.stats.translatedLines).toBe(0);
    expect(result.stats.untranslatedLines).toBe(0);
    expect(result.gcode).toContain("G80");
    expect(result.lines).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 8. transpile -- work offset conversion
// ---------------------------------------------------------------------------

describe("transpile -- Okuma work offset mapping (G54..G59 -> G54 G15 Hn)", () => {
  const cases: Array<[string, string]> = [
    ["G54", "G54 G15 H1"],
    ["G55", "G54 G15 H2"],
    ["G56", "G54 G15 H3"],
    ["G57", "G54 G15 H4"],
    ["G58", "G54 G15 H5"],
    ["G59", "G54 G15 H6"],
  ];

  for (const [input, expected] of cases) {
    it(`${input} -> Okuma ${expected}`, () => {
      const result = gcodeTranspiler.transpile(input, cfg("fanuc", "okuma", { safeStartBlock: false }));
      const line = result.lines.find(l => l.original.trim() === input);
      expect(line?.translated).toBe(expected);
      expect(line?.changed).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 9. transpile -- comment reformatting
// ---------------------------------------------------------------------------

describe("transpile -- comment reformatting", () => {
  it("Fanuc '(TOOL SETUP)' -> Siemens ';TOOL SETUP'", () => {
    // makeComment("siemens","TOOL SETUP") = ";TOOL SETUP" (open=";", close="")
    const result = gcodeTranspiler.transpile("(TOOL SETUP)", cfg("fanuc", "siemens"));
    const line = result.lines.find(l => l.original.trim() === "(TOOL SETUP)");
    expect(line?.translated).toBe(";TOOL SETUP");
    expect(line?.changed).toBe(true);
  });

  it("Siemens '; BEGIN OPERATION' -> Fanuc '(BEGIN OPERATION)'", () => {
    const result = gcodeTranspiler.transpile("; BEGIN OPERATION", cfg("siemens", "fanuc"));
    const line = result.lines.find(l => l.original.trim() === "; BEGIN OPERATION");
    expect(line?.translated).toBe("(BEGIN OPERATION)");
    expect(line?.changed).toBe(true);
  });

  it("preserveComments=false: translated='' and note='Comment removed'", () => {
    const result = gcodeTranspiler.transpile(
      "(TOOL SETUP)",
      cfg("fanuc", "siemens", { preserveComments: false })
    );
    const line = result.lines.find(l => l.original.trim() === "(TOOL SETUP)");
    expect(line?.translated).toBe("");
    expect(line?.note).toBe("Comment removed");
  });
});

// ---------------------------------------------------------------------------
// 10. transpile -- algebraic / structural invariants
// ---------------------------------------------------------------------------

describe("transpile -- stats algebraic invariants", () => {
  it("stats.totalLines equals newline-delimited count of input", () => {
    const gcode = "G0 X0 Y0\nG1 X10 F200\nM30";
    expect(gcodeTranspiler.transpile(gcode, cfg("fanuc", "siemens")).stats.totalLines).toBe(3);
  });

  it("translatedLines + untranslatedLines <= totalLines", () => {
    const gcode = "G90\nG0 X0\nT01 M6\nG54\nG1 X100 F200\nM30";
    const { translatedLines, untranslatedLines, totalLines } =
      gcodeTranspiler.transpile(gcode, cfg("fanuc", "siemens")).stats;
    expect(translatedLines + untranslatedLines).toBeLessThanOrEqual(totalLines);
  });

  it("cyclesConverted=0 when convertCycles=false even with G81 in input", () => {
    expect(
      gcodeTranspiler.transpile("G81 Z-10 R2 F100", cfg("fanuc", "siemens", { convertCycles: false })).stats.cyclesConverted
    ).toBe(0);
  });

  it("cyclesConverted>=1 when G83 present and convertCycles=true (default)", () => {
    expect(
      gcodeTranspiler.transpile("G83 Z-25 R2 Q3 F80", cfg("fanuc", "siemens")).stats.cyclesConverted
    ).toBeGreaterThanOrEqual(1);
  });

  it("result.lines contains only changed=true entries (source filters to changed)", () => {
    const result = gcodeTranspiler.transpile("G0 X0\nT01 M6\nM30", cfg("fanuc", "siemens"));
    expect(result.lines.every(l => l.changed)).toBe(true);
  });

  it("stats.warnings is always an array", () => {
    expect(Array.isArray(gcodeTranspiler.transpile("G0 X0", cfg("fanuc", "haas")).stats.warnings)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 11. Edge / failure modes
// ---------------------------------------------------------------------------

describe("transpile -- edge modes", () => {
  it("empty string does not throw", () => {
    expect(() => gcodeTranspiler.transpile("", cfg("fanuc", "siemens"))).not.toThrow();
  });

  it("empty string: totalLines=1 (split produces one empty element)", () => {
    expect(gcodeTranspiler.transpile("", cfg("fanuc", "siemens")).stats.totalLines).toBe(1);
  });

  it("whitespace-only 3-line input: totalLines=3 (each blank line counted)", () => {
    expect(gcodeTranspiler.transpile("   \n  \n  ", cfg("fanuc", "haas")).stats.totalLines).toBe(3);
  });

  it("program with only 3 comments: all 3 lines reformatted (note='Comment reformatted')", () => {
    const result = gcodeTranspiler.transpile(
      "(START)\n(TOOL 1)\n(END)",
      cfg("fanuc", "siemens")
    );
    expect(result.lines.filter(l => l.note === "Comment reformatted")).toHaveLength(3);
  });

  it("T01 without M6 does NOT produce Siemens tool-change format in output", () => {
    const result = gcodeTranspiler.transpile("T01", cfg("fanuc", "siemens", { safeStartBlock: false }));
    // The gcode output must not contain the Siemens T1\nM6 tool-change expansion
    expect(result.gcode).not.toContain("T1\nM6");
  });
});

// ---------------------------------------------------------------------------
// 12. Adversarial inputs
// ---------------------------------------------------------------------------

describe("transpile -- adversarial inputs", () => {
  it("garbage ASCII does not throw", () => {
    expect(() => gcodeTranspiler.transpile("!@#$%^&*ABCDEF", cfg("fanuc", "okuma"))).not.toThrow();
  });

  it("garbage ASCII marks line untranslated (no recognized codes)", () => {
    const result = gcodeTranspiler.transpile(
      "!@#$%^&*ABCDEF",
      cfg("fanuc", "okuma", { safeStartBlock: false })
    );
    expect(result.stats.untranslatedLines).toBeGreaterThanOrEqual(1);
  });

  it("extremely long line (1000+ chars) does not throw", () => {
    expect(() =>
      gcodeTranspiler.transpile("G1 " + "X0.001 ".repeat(200), cfg("fanuc", "siemens"))
    ).not.toThrow();
  });

  it("500-line program: totalLines=500", () => {
    const gcode = Array.from({ length: 500 }, (_, i) => `G1 X${i} Y${i} F200`).join("\n");
    expect(gcodeTranspiler.transpile(gcode, cfg("fanuc", "siemens")).stats.totalLines).toBe(500);
  });

  it("G81 with no params -> CYCLE81(0,0,0,0) using ?? 0 defaults", () => {
    // _parseCycleParams("") returns {}; template uses ?? 0 for R, Z, F
    const result = gcodeTranspiler.transpile("G81", cfg("fanuc", "siemens"));
    const line = result.lines.find(l => l.original.trim() === "G81");
    expect(line?.translated).toBe("CYCLE81(0,0,0,0)");
  });

  it("same-dialect G90 G94 G17 fanuc->mazak: untranslatedLines=1, translatedLines=0", () => {
    // All G codes in this line map fanuc->mazak identically; no change
    const result = gcodeTranspiler.transpile(
      "G90 G94 G17",
      cfg("fanuc", "mazak", { safeStartBlock: false })
    );
    expect(result.stats.untranslatedLines).toBe(1);
    expect(result.stats.translatedLines).toBe(0);
  });

  it("M3 M8 M5 M9 are identical fanuc->heidenhain: all 4 lines untranslated", () => {
    const result = gcodeTranspiler.transpile(
      "M3 S1200\nM8\nM5\nM9",
      cfg("fanuc", "heidenhain", { safeStartBlock: false })
    );
    expect(result.stats.translatedLines).toBe(0);
    expect(result.stats.untranslatedLines).toBe(4);
  });
});
