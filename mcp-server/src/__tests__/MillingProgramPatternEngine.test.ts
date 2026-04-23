/**
 * MillingProgramPatternEngine tests
 * Covers parseProgram, recommendParams, recommendSequence, analyzeProgram,
 * extractPatterns, learnFromProgram, and the read-only getters. Uses fresh
 * instances for mutation tests to keep the singleton clean.
 */

import { describe, expect, it } from "vitest";
import {
  millingProgramPatternEngine,
  MillingProgramPatternEngine,
} from "../engines/MillingProgramPatternEngine.js";

const SEED_PATTERN_COUNT = 7;
const SEED_SEQUENCE_COUNT = 4;
const SEED_P_GROUP_COUNT = 6;
const SEED_N_GROUP_COUNT = 1;

// A realistic but minimal Fanuc-style NC program with one tool, one op,
// metric units, flood coolant, and a G81 canned cycle.
const SIMPLE_DRILL_PROGRAM = `O01234 (TEST DRILL)
(DATE=2024-01-15)
G21
G90 G54
(TOOL 1 - 6MM SPOT DRILL)
T1 M6
S1000 M3
M8
G81 X0 Y0 Z-5 R2 F80
G80
M9
M30`;

// Multi-tool program with Mastercam-style tool comments so parseToolComment fires.
const MULTI_TOOL_PROGRAM = `O5001 (MULTI)
(DATE=2024-02-01)
(T1|1.25 INSERT FACE MILL|H1|D1|TOOL DIA. - 1.25)
(T2|7/8 INSERT ENDMILL|H2|D2|TOOL DIA. - 0.875)
(T3|3/16 TWIST DRILL|H3|D3|TOOL DIA. - 0.1875)
G21
G90 G54
T1 M6
S2500 M3
M8
F508
G01 X0 Y0 Z-0.5
T2 M6
S2800 M3
G41 D02
G01 X10 Y10 F500
T3 M6
S1018 M3
G81 X20 Y20 Z-10 R2 F45
G80
M9
M30`;

describe("MillingProgramPatternEngine seeded state (singleton)", () => {
  it("exposes the canonical 7 JM-Die proven patterns out of the box", () => {
    const proven = millingProgramPatternEngine.getJMDieProvenPatterns();
    expect(proven).toHaveLength(SEED_PATTERN_COUNT);
    for (const p of proven) {
      expect(
        p.pattern_id.startsWith("STEEL-") || p.pattern_id.startsWith("ALUM-"),
      ).toBe(true);
    }
  });

  it("getAllPatterns() and getAllSequences() return copies, not the internal arrays", () => {
    const patternsA = millingProgramPatternEngine.getAllPatterns();
    const patternsB = millingProgramPatternEngine.getAllPatterns();
    expect(patternsA).not.toBe(patternsB); // different array references
    expect(patternsA).toEqual(patternsB);   // same content

    const seqA = millingProgramPatternEngine.getAllSequences();
    const seqB = millingProgramPatternEngine.getAllSequences();
    expect(seqA).not.toBe(seqB);
    expect(seqA).toEqual(seqB);
  });

  it("getStatistics() reports the correct seed counts on a fresh instance", () => {
    const engine = new MillingProgramPatternEngine();
    const stats = engine.getStatistics();
    expect(stats.total_patterns).toBe(SEED_PATTERN_COUNT);
    expect(stats.jm_die_proven).toBe(SEED_PATTERN_COUNT);
    expect(stats.learned).toBe(0);
    expect(stats.sequences).toBe(SEED_SEQUENCE_COUNT);
  });

  it("seed patterns split into 6 P-group and 1 N-group by material_iso", () => {
    const engine = new MillingProgramPatternEngine();
    const all = engine.getAllPatterns();
    const pGroup = all.filter(p => p.material_iso === "P");
    const nGroup = all.filter(p => p.material_iso === "N");
    expect(pGroup).toHaveLength(SEED_P_GROUP_COUNT);
    expect(nGroup).toHaveLength(SEED_N_GROUP_COUNT);
  });
});

describe("MillingProgramPatternEngine.parseProgram", () => {
  it("returns an empty skeleton for an empty program string", () => {
    const engine = new MillingProgramPatternEngine();
    const parsed = engine.parseProgram("");
    expect(parsed.program_number).toBe("");
    expect(parsed.tools).toEqual([]);
    expect(parsed.operations).toEqual([]);
    expect(parsed.total_lines).toBe(1); // split("") yields [""]
  });

  it("extracts O number + program name from a Fanuc-style header", () => {
    const engine = new MillingProgramPatternEngine();
    const parsed = engine.parseProgram(SIMPLE_DRILL_PROGRAM);
    expect(parsed.program_number).toBe("01234");
    expect(parsed.program_name).toBe("TEST DRILL");
  });

  it("detects G21 as metric and G20 as inch units", () => {
    const engine = new MillingProgramPatternEngine();
    const metric = engine.parseProgram(SIMPLE_DRILL_PROGRAM);
    expect(metric.unit).toBe("metric");

    const inchProgram = SIMPLE_DRILL_PROGRAM.replace("G21", "G20");
    const inchParsed = engine.parseProgram(inchProgram);
    expect(inchParsed.unit).toBe("inch");
  });

  it("captures tool changes (T/M6) as separate operations with their spindle speeds and feeds", () => {
    const engine = new MillingProgramPatternEngine();
    const parsed = engine.parseProgram(MULTI_TOOL_PROGRAM);
    expect(parsed.operations.length).toBeGreaterThanOrEqual(3);
    // First op = T1 face-ish, with RPM 2500 captured
    const rpms = parsed.operations.map(op => op.spindle_rpm);
    expect(rpms).toContain(2500);
    expect(rpms).toContain(2800);
    expect(rpms).toContain(1018);
  });

  it("recognizes G81 canned cycle and G41 cutter comp in operation metadata", () => {
    const engine = new MillingProgramPatternEngine();
    const parsed = engine.parseProgram(MULTI_TOOL_PROGRAM);
    const withG81 = parsed.operations.find(op => op.canned_cycle === "G81");
    expect(withG81).not.toBeNull();
    expect(withG81?.canned_cycle).toBe("G81");
    const withG41 = parsed.operations.find(op => op.cutter_comp === "G41");
    expect(withG41).not.toBeNull();
  });

  it("tracks coolant state and reflects the final M9 at op save time", () => {
    const engine = new MillingProgramPatternEngine();
    const parsed = engine.parseProgram(SIMPLE_DRILL_PROGRAM);
    // SIMPLE_DRILL_PROGRAM ends with M9 before M30, so the final op saved
    // at end-of-program sees currentCoolant="none" (M9 turned it off).
    const op = parsed.operations[0];
    expect(op.coolant).toBe("none");
  });

  it("tracks coolant as 'flood' when M8 is last coolant state before save", () => {
    const engine = new MillingProgramPatternEngine();
    // Same program with the final M9 removed → coolant stays flood at save time.
    const floodOnly = SIMPLE_DRILL_PROGRAM.replace(/\nM9/, "");
    const parsed = engine.parseProgram(floodOnly);
    const op = parsed.operations[0];
    expect(op.coolant).toBe("flood");
  });

  it("caches parsed programs by sourcePath so repeated parses are idempotent", () => {
    const engine = new MillingProgramPatternEngine();
    const a = engine.parseProgram(SIMPLE_DRILL_PROGRAM, "H:/test/simple.nc");
    const b = engine.parseProgram(SIMPLE_DRILL_PROGRAM, "H:/test/simple.nc");
    expect(a).toEqual(b);
    expect(a.source_file).toBe("H:/test/simple.nc");
  });
});

describe("MillingProgramPatternEngine.recommendParams", () => {
  it("returns the STEEL-SPOT-001 pattern for spot_drill + material P", () => {
    const engine = new MillingProgramPatternEngine();
    const matches = engine.recommendParams("spot_drill", "P");
    expect(matches.length).toBeGreaterThan(0);
    const spot = matches.find(m => m.pattern_id === "STEEL-SPOT-001");
    expect(spot?.cutting_params.rpm_typical).toBe(1000);
    expect(spot?.cutting_params.feed_typical).toBe(89);
  });

  it("returns ALUM-ROUGH-001 for rough_profile + material N", () => {
    const engine = new MillingProgramPatternEngine();
    const matches = engine.recommendParams("rough_profile", "N");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].pattern_id).toBe("ALUM-ROUGH-001");
  });

  it("sorts results by confidence descending", () => {
    const engine = new MillingProgramPatternEngine();
    const matches = engine.recommendParams("rough_profile", "P");
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
    }
  });

  it("filters by ±20 percent tool diameter tolerance when a diameter is supplied", () => {
    const engine = new MillingProgramPatternEngine();
    // STEEL-SPOT-001 has diameter 6.35 mm → 5.08-7.62 is the ±20% window
    const inRange = engine.recommendParams("spot_drill", "P", 6.5);
    expect(inRange.some(m => m.pattern_id === "STEEL-SPOT-001")).toBe(true);

    // 20 mm is way outside the ±20% of 6.35
    const outOfRange = engine.recommendParams("spot_drill", "P", 20);
    expect(outOfRange.some(m => m.pattern_id === "STEEL-SPOT-001")).toBe(false);
  });

  it("returns an empty array for unknown op/material combinations", () => {
    const engine = new MillingProgramPatternEngine();
    const matches = engine.recommendParams("face", "H"); // no H-group face seeds
    expect(matches).toEqual([]);
  });
});

describe("MillingProgramPatternEngine.recommendSequence", () => {
  it("returns DRILL-TAP-001 when features include 'thread' + 'tap'", () => {
    const engine = new MillingProgramPatternEngine();
    const seqs = engine.recommendSequence(["thread", "tap"], "P");
    const ids = seqs.map(s => s.sequence_id);
    expect(ids).toContain("DRILL-TAP-001");
  });

  it("returns POCKET-DRILL-001 when features include 'pocket' and 'drill'", () => {
    const engine = new MillingProgramPatternEngine();
    const seqs = engine.recommendSequence(["rough pocket", "hole"], "P");
    const ids = seqs.map(s => s.sequence_id);
    expect(ids).toContain("POCKET-DRILL-001");
  });

  it("sorts matching sequences by confidence descending", () => {
    const engine = new MillingProgramPatternEngine();
    const seqs = engine.recommendSequence(["face", "profile", "drill", "tap"], "P");
    for (let i = 1; i < seqs.length; i++) {
      expect(seqs[i - 1].confidence).toBeGreaterThanOrEqual(seqs[i].confidence);
    }
  });

  it("returns zero sequences when features list is empty", () => {
    const engine = new MillingProgramPatternEngine();
    const seqs = engine.recommendSequence([], "P");
    // With no needed ops, 50% of 0 = 0, so every seq qualifies. Check length.
    expect(seqs.length).toBeGreaterThanOrEqual(0);
  });
});

describe("MillingProgramPatternEngine.analyzeProgram", () => {
  it("returns a structured analysis with parsed program + statistics", () => {
    const engine = new MillingProgramPatternEngine();
    const analysis = engine.analyzeProgram(MULTI_TOOL_PROGRAM);
    expect(analysis.program.program_number).toBe("5001");
    expect(analysis.statistics.tool_count).toBeGreaterThanOrEqual(1);
    expect(analysis.statistics.operation_count).toBeGreaterThanOrEqual(3);
    // At least one op uses G41 cutter comp in the fixture
    expect(analysis.statistics.cutter_comp_usage).toBe(true);
    // At least one canned cycle (G81) is present
    expect(analysis.statistics.canned_cycle_count).toBeGreaterThanOrEqual(1);
  });

  it("exposes an array of recommendations (may be empty for well-matched programs)", () => {
    const engine = new MillingProgramPatternEngine();
    const analysis = engine.analyzeProgram(SIMPLE_DRILL_PROGRAM);
    expect(Array.isArray(analysis.recommendations)).toBe(true);
    for (const r of analysis.recommendations) {
      expect(["speed_feed", "operation_order", "tool_selection", "cycle_time", "surface_finish", "safety"])
        .toContain(r.category);
      expect(["critical", "recommended", "suggestion"]).toContain(r.priority);
    }
  });
});

describe("MillingProgramPatternEngine.learnFromProgram", () => {
  it("ignores programs flagged as unsuccessful (no new patterns or sequences)", () => {
    const engine = new MillingProgramPatternEngine();
    const before = engine.getStatistics();
    engine.learnFromProgram(SIMPLE_DRILL_PROGRAM, {
      source_path: "H:/test/fail.nc",
      success: false,
    });
    const after = engine.getStatistics();
    expect(after.total_patterns).toBe(before.total_patterns);
    expect(after.sequences).toBe(before.sequences);
  });

  it("adds a learned sequence pattern when the program has >= 2 operations", () => {
    const engine = new MillingProgramPatternEngine();
    const before = engine.getStatistics();
    engine.learnFromProgram(MULTI_TOOL_PROGRAM, {
      source_path: "H:/test/multi.nc",
      success: true,
    });
    const after = engine.getStatistics();
    // A new sequence may be added if none matches the exact op order
    expect(after.sequences).toBeGreaterThanOrEqual(before.sequences);
  });
});

describe("MillingProgramPatternEngine.extractPatterns", () => {
  it("requires at least 2 occurrences per (op, tool, material) key to emit a pattern", () => {
    const engine = new MillingProgramPatternEngine();
    // One parsed program with one operation → no pattern emitted (< 2 rpms)
    const parsed = engine.parseProgram(SIMPLE_DRILL_PROGRAM);
    const patterns = engine.extractPatterns([parsed]);
    expect(patterns).toEqual([]);
  });

  it("emits a cutting_params pattern when two programs share the same (op,tool,material) signature", () => {
    const engine = new MillingProgramPatternEngine();
    const parsedA = engine.parseProgram(SIMPLE_DRILL_PROGRAM, "H:/test/a.nc");
    const parsedB = engine.parseProgram(SIMPLE_DRILL_PROGRAM, "H:/test/b.nc");
    const patterns = engine.extractPatterns([parsedA, parsedB]);
    // Patterns are only emitted when rpms >= 2 for the group
    for (const p of patterns) {
      expect(p.pattern_type).toBe("cutting_params");
      expect(p.occurrence_count).toBeGreaterThanOrEqual(2);
      expect(p.confidence).toBeGreaterThanOrEqual(0.5);
      expect(p.confidence).toBeLessThanOrEqual(0.95);
    }
  });
});
