/**
 * PostProcessorVerificationEngine -- companion tests
 *
 * All assertions are reference-value or algebraic-invariant: derived by
 * hand-tracing the engine's line-by-line parsing logic. No toBeDefined() stubs.
 * Covers: happy path, >=3 failure/edge modes, >=2 adversarial inputs.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorVerificationEngine,
  PostProcessorVerificationEngineImpl,
} from "../engines/PostProcessorVerificationEngine.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid milling program: triggers safe-start, one tool change, rapid + cut */
const MINIMAL_VALID = [
  "%",
  "O0001",
  "G90 G17 G21",       // safe-start (hasSafeStart = true)
  "G54",               // work offset
  "T1 M6",             // tool change
  "S3000 M3",          // spindle on
  "G0 X0 Y0 Z5",      // rapid
  "G1 Z-10 F200",     // cutting move with feed + spindle running
  "G0 Z100",           // rapid retract
  "M30",
  "%",
].join("\n");

// ---------------------------------------------------------------------------
// 1. Happy-path summary counts
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- happy path", () => {
  it("returns valid:true for a well-formed program", () => {
    const r = postProcessorVerificationEngine.verify({ gcode: MINIMAL_VALID });
    expect(r.valid).toBe(true);
    expect(r.grammar_ok).toBe(true);
    expect(r.travel_ok).toBe(true);
    expect(r.feed_speed_ok).toBe(true);
    expect(r.sequence_ok).toBe(true);
    expect(r.issues.filter((i) => i.severity === "critical")).toHaveLength(0);
  });

  it("counts tool changes and unique tools correctly", () => {
    const gcode = [
      "T1 M6",
      "S2000 M3",
      "G0 X0 Y0",
      "G1 Z-5 F100",
      "T2 M6",
      "S3000",
      "G1 X10 F150",
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({ gcode });
    // T1 -> T2 = 2 tool changes; T1 and T2 = 2 unique tools
    expect(r.summary.tool_changes).toBe(2);
    expect(r.summary.unique_tools).toBe(2);
  });

  it("tracks max_rpm_found and max_feed_found as the highest encountered values", () => {
    const gcode = [
      "S1500 M3",
      "G1 Z-1 F300",
      "S4500",       // higher RPM later
      "G1 X5 F500",  // higher feed later
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.summary.max_rpm_found).toBe(4500);
    expect(r.summary.max_feed_found).toBe(500);
  });

  it("counts rapid_lines and cutting_lines correctly", () => {
    const gcode = [
      "S2000 M3",
      "G0 X0 Y0 Z5",       // rapid #1
      "G0 X10",             // rapid #2
      "G1 Z-1 F100",        // cut #1
      "G2 X20 I5 J0 F100",  // cut #2 (arc)
      "G3 X0 I-10 J0 F100", // cut #3 (arc)
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.summary.rapid_lines).toBe(2);
    expect(r.summary.cutting_lines).toBe(3);
  });

  it("total_lines equals the raw split count (including blanks and comments)", () => {
    const gcode = "G90 G17\n\n; comment\nG0 X0";
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.summary.total_lines).toBe(4);
  });

  it("backplot has one entry per move (rapid + cut) with correct type tags", () => {
    const gcode = [
      "S2000 M3",
      "G0 X0 Y0 Z5",  // rapid -> backplot[0]
      "G1 X10 F100",  // linear cut -> backplot[1]
      "G2 X20 I5 J0", // arc cut -> backplot[2]
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.backplot).toHaveLength(3);
    expect(r.backplot![0].type).toBe("rapid");
    expect(r.backplot![1].type).toBe("linear");
    expect(r.backplot![2].type).toBe("arc");
  });

  it("backplot accumulates position incrementally across moves", () => {
    const gcode = [
      "G0 X10 Y20 Z5",
      "G1 X30 F200", // Y stays 20, Z stays 5
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.backplot).toHaveLength(2);
    expect(r.backplot![0]).toMatchObject({ x: 10, y: 20, z: 5, type: "rapid" });
    expect(r.backplot![1]).toMatchObject({ x: 30, y: 20, z: 5, type: "linear" });
  });

  it("emits no SEQ-010 when safe-start block (G90 G17) is present", () => {
    const r = postProcessorVerificationEngine.verify({ gcode: MINIMAL_VALID });
    const seq010 = r.issues.filter((i) => i.rule === "SEQ-010");
    expect(seq010).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Failure mode: spindle / feed limit violations (LIMIT-001, LIMIT-002, FEED-001)
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- machine limit violations", () => {
  it("emits LIMIT-001 critical with fix suggestion when RPM exceeds max_rpm", () => {
    const gcode = "S8000 M3\nG1 Z-1 F100";
    const r = postProcessorVerificationEngine.verify({
      gcode,
      machine_limits: { max_rpm: 6000 },
    });
    expect(r.valid).toBe(false);
    const limit001 = r.issues.filter((i) => i.rule === "LIMIT-001");
    expect(limit001).toHaveLength(1);
    expect(limit001[0].severity).toBe("critical");
    expect(limit001[0].fix).toBe("S6000");
    expect(limit001[0].message).toContain("8000");
    expect(r.feed_speed_ok).toBe(false);
  });

  it("does NOT emit LIMIT-001 when RPM exactly equals max_rpm (boundary: equal is OK)", () => {
    const gcode = "S6000 M3\nG1 Z-1 F100";
    const r = postProcessorVerificationEngine.verify({
      gcode,
      machine_limits: { max_rpm: 6000 },
    });
    expect(r.issues.filter((i) => i.rule === "LIMIT-001")).toHaveLength(0);
  });

  it("emits LIMIT-002 critical with fix suggestion when feed exceeds max_feed_mm_min", () => {
    const gcode = "S2000 M3\nG1 Z-1 F10000";
    const r = postProcessorVerificationEngine.verify({
      gcode,
      machine_limits: { max_feed_mm_min: 5000 },
    });
    expect(r.valid).toBe(false);
    const limit002 = r.issues.filter((i) => i.rule === "LIMIT-002");
    expect(limit002).toHaveLength(1);
    expect(limit002[0].severity).toBe("critical");
    expect(limit002[0].fix).toBe("F5000");
    expect(r.feed_speed_ok).toBe(false);
  });

  it("emits FEED-001 critical for F0 (zero feed rate)", () => {
    const gcode = "S2000 M3\nG1 Z-1 F0";
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.valid).toBe(false);
    const feed001 = r.issues.filter((i) => i.rule === "FEED-001");
    expect(feed001).toHaveLength(1);
    expect(feed001[0].severity).toBe("critical");
    expect(r.feed_speed_ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Failure mode: travel limit violations (TRAVEL-001/002/003)
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- travel limit violations", () => {
  // work_volume: x boundary = +/-250, y boundary = +/-200, z range = -200..+200
  const limits = { work_volume: { x: 500, y: 400, z: 200 } };

  it("emits TRAVEL-001 critical when |X| > x/2", () => {
    const gcode = "S1000 M3\nG0 X260 Y0 Z0";
    const r = postProcessorVerificationEngine.verify({ gcode, machine_limits: limits });
    expect(r.valid).toBe(false);
    const travel001 = r.issues.filter((i) => i.rule === "TRAVEL-001");
    expect(travel001).toHaveLength(1);
    expect(travel001[0].severity).toBe("critical");
    expect(travel001[0].message).toContain("260");
    expect(r.travel_ok).toBe(false);
  });

  it("emits TRAVEL-002 critical when |Y| > y/2", () => {
    const gcode = "S1000 M3\nG0 X0 Y-210 Z0";
    const r = postProcessorVerificationEngine.verify({ gcode, machine_limits: limits });
    const travel002 = r.issues.filter((i) => i.rule === "TRAVEL-002");
    expect(travel002).toHaveLength(1);
    expect(travel002[0].severity).toBe("critical");
    expect(r.travel_ok).toBe(false);
  });

  it("emits TRAVEL-003 critical when Z < -work_volume.z", () => {
    const gcode = "S1000 M3\nG0 X0 Y0 Z-250";
    const r = postProcessorVerificationEngine.verify({ gcode, machine_limits: limits });
    const travel003 = r.issues.filter((i) => i.rule === "TRAVEL-003");
    expect(travel003).toHaveLength(1);
    expect(travel003[0].severity).toBe("critical");
  });

  it("does NOT emit TRAVEL-001 when |X| exactly equals x/2 (250 > 250 is false)", () => {
    const gcode = "S1000 M3\nG0 X250 Y0 Z0";
    const r = postProcessorVerificationEngine.verify({ gcode, machine_limits: limits });
    expect(r.issues.filter((i) => i.rule === "TRAVEL-001")).toHaveLength(0);
  });

  it("travel_ok is true when all moves are within bounds", () => {
    const gcode = "S1000 M3\nG0 X100 Y50 Z-50";
    const r = postProcessorVerificationEngine.verify({ gcode, machine_limits: limits });
    expect(r.travel_ok).toBe(true);
    expect(r.issues.filter((i) => i.rule.startsWith("TRAVEL"))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Failure mode: sequence violations (SEQ-001, SEQ-002, SEQ-003, SEQ-010)
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- sequence validation", () => {
  it("emits SEQ-010 warning (not critical) when no safe-start block detected", () => {
    const gcode = "G0 X0 Y0\nG1 Z-1 F100";
    const r = postProcessorVerificationEngine.verify({ gcode });
    const seq010 = r.issues.filter((i) => i.rule === "SEQ-010");
    expect(seq010).toHaveLength(1);
    expect(seq010[0].severity).toBe("warning");
    expect(seq010[0].line).toBe(1);
    // SEQ is a warning -> sequence_ok remains true (no critical SEQ-*)
    expect(r.sequence_ok).toBe(true);
  });

  it("emits SEQ-002 warning when cutting move runs with no spindle active", () => {
    const gcode = [
      "G90 G17",      // safe start (avoids SEQ-010)
      "G1 Z-1 F100",  // cut while currentRpm = 0 -> SEQ-002
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({ gcode });
    const seq002 = r.issues.filter((i) => i.rule === "SEQ-002");
    expect(seq002).toHaveLength(1);
    expect(seq002[0].severity).toBe("warning");
  });

  it("emits SEQ-003 warning when cutting move has no feed defined", () => {
    const gcode = [
      "G90 G17",
      "S2000 M3",
      "G1 Z-1",  // no F word on this line AND no prior feed set -> SEQ-003
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({ gcode });
    const seq003 = r.issues.filter((i) => i.rule === "SEQ-003");
    expect(seq003).toHaveLength(1);
    expect(seq003[0].severity).toBe("warning");
  });

  it("emits SEQ-001 warning for M6 without a preceding T code (currentTool=0)", () => {
    // No T code at all -> currentTool stays 0 -> SEQ-001
    const gcode = "M6\nS2000 M3\nG0 X0";
    const r = postProcessorVerificationEngine.verify({ gcode });
    const seq001 = r.issues.filter((i) => i.rule === "SEQ-001");
    expect(seq001).toHaveLength(1);
    expect(seq001[0].severity).toBe("warning");
  });

  it("does NOT emit SEQ-001 when T code is present on the same M6 line", () => {
    const gcode = "T1 M6\nS2000 M3\nG0 X0";
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.issues.filter((i) => i.rule === "SEQ-001")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Failure mode: grammar checks (GRAM-001)
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- grammar checks", () => {
  it("emits GRAM-001 warning for G101 (>99, <200, not in whitelist [100,154,187])", () => {
    // G101 is >99 and <200 and NOT in the whitelisted set
    const gcode = "G90 G17\nG101 X10";
    const r = postProcessorVerificationEngine.verify({ gcode });
    const gram001 = r.issues.filter((i) => i.rule === "GRAM-001");
    expect(gram001).toHaveLength(1);
    expect(gram001[0].severity).toBe("warning");
    expect(gram001[0].message).toContain("G101");
  });

  it("does NOT emit GRAM-001 for whitelisted codes G100, G154, G187", () => {
    const gcode = "G90 G17\nG100 X0\nG154 P1\nG187 P3";
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.issues.filter((i) => i.rule === "GRAM-001")).toHaveLength(0);
  });

  it("grammar_ok is true when GRAM issues are only warnings (no critical grammar issue)", () => {
    const gcode = "G90 G17\nG101 X10";
    const r = postProcessorVerificationEngine.verify({ gcode });
    // grammarOk = !issues.some(i => i.rule.startsWith("GRAM") && i.severity === "critical")
    // GRAM-001 is warning -> grammarOk = true
    expect(r.grammar_ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Adversarial inputs
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- adversarial inputs", () => {
  it("handles empty string: 1 total_line, 0 moves, SEQ-010 fires", () => {
    const r = postProcessorVerificationEngine.verify({ gcode: "" });
    // "".split(/\r?\n/) yields [""] -> length 1
    expect(r.summary.total_lines).toBe(1);
    expect(r.summary.cutting_lines).toBe(0);
    expect(r.summary.rapid_lines).toBe(0);
    expect(r.backplot).toHaveLength(0);
    // SEQ-010 fires because no safe-start is detected
    expect(r.issues.filter((i) => i.rule === "SEQ-010")).toHaveLength(1);
  });

  it("handles program consisting entirely of comments and blanks: 0 moves, no crash", () => {
    const gcode = "; just a comment\n; another\n\n   \n";
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.summary.cutting_lines).toBe(0);
    expect(r.summary.rapid_lines).toBe(0);
    expect(r.backplot).toHaveLength(0);
    expect(r.summary.max_rpm_found).toBe(0);
    expect(r.summary.max_feed_found).toBe(0);
  });

  it("handles sole % delimiter: parser skips it, 0 moves, only SEQ-010 warning", () => {
    const gcode = "%";
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.summary.cutting_lines).toBe(0);
    // % is explicitly skipped -> only SEQ-010 (no safe-start found)
    const nonSeq = r.issues.filter((i) => i.rule !== "SEQ-010");
    expect(nonSeq).toHaveLength(0);
  });

  it("handles garbage non-G-code input without throwing", () => {
    const gcode = "NOT GCODE AT ALL 12345 @#!";
    expect(() => postProcessorVerificationEngine.verify({ gcode })).not.toThrow();
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.backplot).toHaveLength(0);
    expect(r.summary.cutting_lines).toBe(0);
  });

  it("handles a 1000-line program without throwing and counts lines correctly", () => {
    const lines: string[] = [];
    for (let i = 0; i < 500; i++) {
      lines.push(`G0 X${i} Y${i} Z${i}`);
      lines.push(`G1 X${i + 1} F200`);
    }
    const gcode = lines.join("\n");
    expect(() => postProcessorVerificationEngine.verify({ gcode })).not.toThrow();
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.summary.total_lines).toBe(1000);
    expect(r.summary.rapid_lines).toBe(500);
    expect(r.summary.cutting_lines).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// 7. backplotVerify -- algebraic invariants
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- backplotVerify", () => {
  it("returns match:true and max_deviation_mm:0 for round-trip identical points", () => {
    const gcode = [
      "S2000 M3",
      "G0 X10 Y0 Z5",
      "G1 X20 F100",
    ].join("\n");
    // Derive original from the engine itself (round-trip invariant)
    const vResult = postProcessorVerificationEngine.verify({ gcode });
    const original = vResult.backplot!.map(({ x, y, z }) => ({ x, y, z }));

    const bv = postProcessorVerificationEngine.backplotVerify(gcode, original, 0.001);
    expect(bv.match).toBe(true);
    expect(bv.max_deviation_mm).toBe(0);
    expect(bv.deviations).toHaveLength(0);
  });

  it("detects a 5mm X-shift deviation correctly (Euclidean distance)", () => {
    const gcode = [
      "S2000 M3",
      "G0 X0 Y0 Z5",
      "G1 X10 F100",
    ].join("\n");
    // backplot[0] = (0,0,5); shift by 5mm in X
    const shifted = [
      { x: 5, y: 0, z: 5 },  // dev = sqrt((0-5)^2) = 5.0
      { x: 10, y: 0, z: 5 }, // dev = 0
    ];
    const bv = postProcessorVerificationEngine.backplotVerify(gcode, shifted, 0.001);
    expect(bv.match).toBe(false);
    expect(bv.deviations).toHaveLength(1);
    expect(bv.deviations[0].index).toBe(0);
    expect(bv.max_deviation_mm).toBeCloseTo(5.0, 4);
  });

  it("returns match:true for empty original list (no comparisons -> no deviations)", () => {
    const gcode = "G0 X10 Y0 Z5";
    const bv = postProcessorVerificationEngine.backplotVerify(gcode, [], 0.001);
    expect(bv.match).toBe(true);
    expect(bv.max_deviation_mm).toBe(0);
    expect(bv.deviations).toHaveLength(0);
  });

  it("only compares min(backplot, original) points -- extra original points ignored", () => {
    const gcode = [
      "S2000 M3",
      "G0 X0 Y0 Z0", // backplot has 1 entry
    ].join("\n");
    const original = [
      { x: 0, y: 0, z: 0 },   // matches backplot[0]
      { x: 10, y: 10, z: 0 }, // no backplot[1] -> ignored
      { x: 20, y: 20, z: 0 },
    ];
    const bv = postProcessorVerificationEngine.backplotVerify(gcode, original, 0.001);
    // Only index 0 is compared; (0,0,0)==(0,0,0) -> match
    expect(bv.match).toBe(true);
    expect(bv.deviations).toHaveLength(0);
  });

  it("respects custom tolerance: deviation 0.0005mm < 0.001mm threshold -> match:true", () => {
    const gcode = [
      "S2000 M3",
      "G0 X0 Y0 Z0",
      "G1 X10 F100",
    ].join("\n");
    // Shift backplot[0] by 0.0005mm in X (below threshold)
    const nearlyEqual = [
      { x: 0.0005, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];
    const bv = postProcessorVerificationEngine.backplotVerify(gcode, nearlyEqual, 0.001);
    // 0.0005 < 0.001 -> no deviation logged
    expect(bv.match).toBe(true);
    expect(bv.deviations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Heidenhain dialect -- not flagged by ISO grammar rules
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- Heidenhain dialect", () => {
  it("parses a Heidenhain program and detects rapid (FMAX) and cut (L) moves", () => {
    const gcode = [
      "BEGIN PGM TEST MM",
      "TOOL CALL 1 Z S3000",
      "L X+0 Y+0 Z+50 FMAX",  // rapid (FMAX token)
      "L Z-10 F200",            // cutting move (L without FMAX)
      "END PGM TEST MM",
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({ gcode });
    // Heidenhain lines are not subject to ISO grammar checks -> no GRAM-001
    expect(r.issues.filter((i) => i.rule.startsWith("GRAM"))).toHaveLength(0);
    // "L ... FMAX" is a rapid -> rapid_lines >= 1
    expect(r.summary.rapid_lines).toBeGreaterThanOrEqual(1);
    // "L Z-10 F200" is a cut
    expect(r.summary.cutting_lines).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 9. Multiple simultaneous violations -- correct count and severity mix
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- multiple simultaneous violations", () => {
  it("collects all applicable issues in a single pass", () => {
    const gcode = [
      // No safe-start -> SEQ-010
      "S8000 M3",         // over RPM limit -> LIMIT-001
      "G0 X300 Y0",       // X out of bounds -> TRAVEL-001
      "G1 Z-250 F10000",  // Z out + feed over limit -> TRAVEL-003, LIMIT-002
    ].join("\n");
    const r = postProcessorVerificationEngine.verify({
      gcode,
      machine_limits: {
        max_rpm: 6000,
        max_feed_mm_min: 5000,
        work_volume: { x: 500, y: 400, z: 200 },
      },
    });
    expect(r.valid).toBe(false);
    const rules = r.issues.map((i) => i.rule);
    expect(rules).toContain("LIMIT-001");
    expect(rules).toContain("LIMIT-002");
    expect(rules).toContain("TRAVEL-001");
    expect(rules).toContain("TRAVEL-003");
    expect(rules).toContain("SEQ-010");
    expect(r.issues.length).toBeGreaterThanOrEqual(5);
  });

  it("valid:true when all issues are warnings only (no critical severity)", () => {
    // SEQ-010 (warning) + SEQ-002 (warning) -> no critical -> valid:true
    const gcode = "G0 X0 Y0\nG1 Z-1 F100";
    const r = postProcessorVerificationEngine.verify({ gcode });
    expect(r.valid).toBe(true);
    expect(r.issues.filter((i) => i.severity === "critical")).toHaveLength(0);
  });

  it("valid:false iff any issue has severity critical -- invariant holds", () => {
    const gcode = "S9999 M3\nG1 Z-1 F100";
    const r = postProcessorVerificationEngine.verify({
      gcode,
      machine_limits: { max_rpm: 6000 },
    });
    // Engine: valid = !issues.some(i => i.severity === "critical")
    // S9999 > max_rpm 6000 -> LIMIT-001 critical -> hasCritical=true -> valid=false
    const hasCritical = r.issues.some((i) => i.severity === "critical");
    expect(hasCritical).toBe(true);
    expect(r.valid).toBe(false);
    // Algebraic invariant: valid is always the negation of hasCritical
    expect(r.valid).toBe(!hasCritical);
  });
});

// ---------------------------------------------------------------------------
// 10. Singleton vs class instance -- export contract
// ---------------------------------------------------------------------------

describe("PostProcessorVerificationEngine -- export contract", () => {
  it("singleton and fresh instance produce identical results", () => {
    const fresh = new PostProcessorVerificationEngineImpl();
    const r1 = postProcessorVerificationEngine.verify({ gcode: MINIMAL_VALID });
    const r2 = fresh.verify({ gcode: MINIMAL_VALID });
    expect(r1.valid).toBe(r2.valid);
    expect(r1.summary).toEqual(r2.summary);
    expect(r1.issues).toEqual(r2.issues);
    expect(r1.grammar_ok).toBe(r2.grammar_ok);
    expect(r1.travel_ok).toBe(r2.travel_ok);
    expect(r1.feed_speed_ok).toBe(r2.feed_speed_ok);
    expect(r1.sequence_ok).toBe(r2.sequence_ok);
  });
});
