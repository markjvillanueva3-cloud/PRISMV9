/**
 * GCodeVerificationEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * The engine is a PURE, deterministic G-code verifier: it parses a program, then
 * applies structure (SYNTAX-001..003), per-line syntax (SYNTAX-004..006), machine
 * limit (LIMIT-001..007), safety (SAFETY-001..004), and novel-algorithm
 * (NOVEL-001..003) rules, returning an AtomicValue<GCodeVerificationResult>. No I/O,
 * no state -- so every assertion below is a hand-traced REFERENCE VALUE (R9: each
 * test fails if the rule logic changes), not a presence-only stub.
 *
 * Coverage: happy path + >=3 failure modes (SAFETY-002 spindle-off, SAFETY-001
 * rapid-plunge, LIMIT-001/002/003 over-travel/over-speed, SAFETY-004 tool-change
 * below safe-Z, SYNTAX-004/005 malformed codes) + >=2 adversarial inputs (empty
 * program, unbalanced-paren placement) + dialect gating + the AtomicValue envelope.
 *
 * NOTE (R12, characterization): the `motion_continuity` block (engine lines
 * 185-189) measures each FEED move's LENGTH (distance from the prior endpoint to
 * this endpoint == the move vector itself) and reports any move >0.1mm as a "gap".
 * That flags every normal cutting move, so `continuous` is false for essentially
 * any real program -- almost certainly a defect (it should compare a feed-START to
 * the prior RAPID-positioned point to catch toolpath JUMPS). These tests LOCK the
 * current behavior as-is; the quirk is flagged for a deliberate future fix in
 * reference_echo_gcode_verification_continuity_quirk_2026_06_24. When that fix
 * lands, the explicitly-marked CHARACTERIZATION assertion below is expected to change.
 */

import { describe, it, expect } from "vitest";
import { gCodeVerificationEngine, GCodeVerificationEngine } from "../engines/GCodeVerificationEngine.js";
import type { MachineLimits } from "../engines/GCodeVerificationEngine.js";

describe("GCodeVerificationEngine", () => {
  describe("happy path -- a clean Fanuc program is valid", () => {
    // Spindle (M3) and coolant (M8) both on before any cut; no rapid Z plunge;
    // proper O-number + M30 end. Comment text deliberately free of X/Y/Z/A/B/C so
    // the bad-coordinate heuristic (SYNTAX-006) cannot false-fire on prose.
    const CLEAN = `%
O1000 (MILL TEST)
G21 G90 G54
M3 S1200
M8
G1 Z-1. F100
G1 X10. F250
G0 Z50.
M9
M5
M30
%`;

    it("returns valid:true with zero errors and confidence 1.0", () => {
      const r = gCodeVerificationEngine.verify({ gcode: CLEAN, controller: "fanuc" });
      expect(r.value.valid).toBe(true);
      expect(r.value.errors).toEqual([]);
      expect(r.confidence).toBe(1.0);
      expect(r.unit).toBe("verification_report");
      expect(r.formula).toBe("syntax + limits + safety + continuity + novel");
    });

    it("computes exact program statistics", () => {
      const r = gCodeVerificationEngine.verify({ gcode: CLEAN }).value;
      expect(r.statistics.line_count).toBe(12);
      expect(r.statistics.motion_lines).toBe(3); // 2 feed + 1 rapid
      expect(r.statistics.rapid_lines).toBe(1);
      expect(r.statistics.comment_lines).toBe(2); // the two '%' lines
      expect(r.statistics.max_feed_used).toBe(250);
      expect(r.statistics.max_rpm_used).toBe(1200);
    });

    it("computes the exact work envelope from programmed motion", () => {
      const r = gCodeVerificationEngine.verify({ gcode: CLEAN }).value;
      expect(r.statistics.work_envelope).toEqual({
        x_min: 0, x_max: 10,
        y_min: 0, y_max: 0,
        z_min: -1, z_max: 50,
      });
    });

    it("emits no SAFETY-003 coolant warning when M08 precedes the cut", () => {
      const r = gCodeVerificationEngine.verify({ gcode: CLEAN }).value;
      expect(r.warnings.filter((w) => w.rule === "SAFETY-003")).toEqual([]);
    });
  });

  describe("FAILURE MODE -- SAFETY-002: cutting move without spindle running", () => {
    const NO_SPINDLE = `%
O2
G21 G90
G1 Z-1. F100
M30
%`;

    it("flags a G1 cut issued before any M03/M04 as a blocking error", () => {
      const r = gCodeVerificationEngine.verify({ gcode: NO_SPINDLE }).value;
      const hits = r.errors.filter((x) => x.rule === "SAFETY-002");
      expect(hits).toHaveLength(1);
      expect(hits[0].severity).toBe("error");
      expect(hits[0].line).toBe(4); // the G1 Z-1. line
      expect(r.valid).toBe(false);
    });

    it("downgrades confidence to 0.5 when the program is invalid", () => {
      const r = gCodeVerificationEngine.verify({ gcode: NO_SPINDLE });
      expect(r.value.valid).toBe(false);
      expect(r.confidence).toBe(0.5);
    });
  });

  describe("FAILURE MODE -- SAFETY-001: rapid plunge in Z", () => {
    // G0 from Z50 down to Z2 is a >0.5mm rapid descent -> must be flagged.
    const RAPID_PLUNGE = `%
O3
G21 G90
M3 S1000
G0 Z50.
G0 Z2.
M30
%`;

    it("flags a G00 descent of >0.5mm below current Z with the plunge magnitude", () => {
      const r = gCodeVerificationEngine.verify({ gcode: RAPID_PLUNGE }).value;
      const hits = r.errors.filter((x) => x.rule === "SAFETY-001");
      expect(hits).toHaveLength(1);
      expect(hits[0].severity).toBe("error");
      expect(hits[0].line).toBe(6); // the G0 Z2. line
      expect(hits[0].message).toContain("48.00"); // 50 -> 2 == 48.00mm plunge
      expect(r.valid).toBe(false);
    });
  });

  describe("FAILURE MODE -- machine limit envelope (LIMIT-001/002/003)", () => {
    const LIMITS: MachineLimits = {
      max_rpm: 4000,
      max_feed_mmmin: 6000,
      x_travel_mm: [-300, 300],
      y_travel_mm: [-300, 300],
      z_travel_mm: [-300, 300],
    };
    const OVER = `%
O4
G21 G90
M3 S5000
M8
G1 X500. F8000
M30
%`;

    it("flags over-speed spindle, over-feed, and over-travel together", () => {
      const r = gCodeVerificationEngine.verify({ gcode: OVER, machine_limits: LIMITS }).value;
      const rules = new Set(r.errors.map((e) => e.rule));
      expect(rules.has("LIMIT-002")).toBe(true); // 5000 rpm > 4000
      expect(rules.has("LIMIT-001")).toBe(true); // 8000 mm/min > 6000
      expect(rules.has("LIMIT-003")).toBe(true); // X500 outside [-300, 300]
      expect(r.valid).toBe(false);
    });

    it("passes the same motion when limits are not supplied (limits are opt-in)", () => {
      const r = gCodeVerificationEngine.verify({ gcode: OVER }).value;
      expect(r.errors.filter((e) => e.rule.startsWith("LIMIT-"))).toEqual([]);
    });
  });

  describe("FAILURE MODE -- SAFETY-004: tool change below safe Z", () => {
    const TC_LOW = `%
O7
G21 G90
M3 S1000
G1 Z-5. F100
M6 T2
M30
%`;

    it("flags an M6 tool change while the tool is below the default 50mm safe height", () => {
      const r = gCodeVerificationEngine.verify({ gcode: TC_LOW }).value;
      const hits = r.errors.filter((x) => x.rule === "SAFETY-004");
      expect(hits).toHaveLength(1);
      expect(hits[0].line).toBe(6); // the M6 line, evaluated at Z=-5
      expect(r.valid).toBe(false);
    });

    it("does NOT flag the tool change once retracted above safe Z (positional gate)", () => {
      const TC_SAFE = `%
O7B
G21 G90
M3 S1000
G1 Z-5. F100
G0 Z100.
M6 T2
M30
%`;
      const r = gCodeVerificationEngine.verify({ gcode: TC_SAFE }).value;
      expect(r.errors.filter((e) => e.rule === "SAFETY-004")).toEqual([]);
    });

    it("honors a custom safe_z_mm override", () => {
      // With safe_z=0, a tool change at Z=-5 is still below 0 -> still flagged.
      const r0 = gCodeVerificationEngine.verify({ gcode: TC_LOW, safe_z_mm: 0 }).value;
      expect(r0.errors.filter((e) => e.rule === "SAFETY-004")).toHaveLength(1);
    });
  });

  describe("ADVERSARIAL -- malformed codes (SYNTAX-004 / SYNTAX-005)", () => {
    const BAD = `%
O5
G999
M3 S1000
G1 X5. (unterminated
M30
%`;

    it("flags an unrecognized G-code and an unbalanced parenthesis on a code line", () => {
      const r = gCodeVerificationEngine.verify({ gcode: BAD }).value;
      const rules = new Set(r.errors.map((e) => e.rule));
      expect(rules.has("SYNTAX-005")).toBe(true); // G999 not a real G-code
      expect(rules.has("SYNTAX-004")).toBe(true); // '(unterminated' has no ')'
      expect(r.valid).toBe(false);
    });
  });

  describe("ADVERSARIAL -- empty program", () => {
    it("flags SYNTAX-001 and returns a zeroed envelope (no NaN/Infinity leak)", () => {
      const r = gCodeVerificationEngine.verify({ gcode: "" }).value;
      expect(r.errors.filter((e) => e.rule === "SYNTAX-001")).toHaveLength(1);
      expect(r.valid).toBe(false);
      expect(r.statistics.motion_lines).toBe(0);
      // clampEnv() must collapse the Infinity seeds to 0, never leak NaN/Infinity.
      expect(r.statistics.work_envelope).toEqual({
        x_min: 0, x_max: 0, y_min: 0, y_max: 0, z_min: 0, z_max: 0,
      });
    });
  });

  describe("structure -- SYNTAX-002/003 are dialect-gated warnings", () => {
    const NO_HEADER = `G21 G90
M3 S1000
G1 X1. F100`;

    it("warns a Fanuc program that lacks a % / O-number start AND an M30 end", () => {
      const r = gCodeVerificationEngine.verify({ gcode: NO_HEADER, controller: "fanuc" }).value;
      expect(r.warnings.some((w) => w.rule === "SYNTAX-002")).toBe(true); // no %/O header
      expect(r.warnings.some((w) => w.rule === "SYNTAX-003")).toBe(true); // no M30/M02 end
    });

    it("does NOT emit the SYNTAX-002 header warning for a Siemens program", () => {
      // Only fanuc/haas/mazak require the %/O header; siemens/heidenhain do not.
      const r = gCodeVerificationEngine.verify({ gcode: NO_HEADER, controller: "siemens" }).value;
      expect(r.warnings.filter((w) => w.rule === "SYNTAX-002")).toEqual([]);
    });
  });

  describe("novel-algorithm checks are opt-in (NOVEL-003 / TGAR)", () => {
    // A 100 -> 500 mm/min feed step (5x) exceeds TGAR's 2x ramp ceiling.
    const STEP = `%
O8
G21 G90
M3 S1000
M8
G1 X1. F100
G1 X2. F500
M30`;

    it("emits NOVEL-003 only when the matching novel_algorithm is requested", () => {
      const withTgar = gCodeVerificationEngine.verify({ gcode: STEP, novel_algorithm: "TGAR" }).value;
      expect(withTgar.warnings.filter((w) => w.rule === "NOVEL-003")).toHaveLength(1);

      const without = gCodeVerificationEngine.verify({ gcode: STEP }).value;
      expect(without.warnings.filter((w) => w.rule.startsWith("NOVEL-"))).toEqual([]);
    });
  });

  describe("CHARACTERIZATION -- motion_continuity (flagged probable defect)", () => {
    // See the file header note: the engine reports each feed MOVE LENGTH as a
    // "gap". This LOCKS that current behavior so a future fix is a deliberate,
    // visible change (this assertion is expected to flip when the fix lands).
    const TWO_FEEDS = `%
O11
G21 G90
M3 S1000
M8
G1 X10. F200
G1 X20. F200
M30`;

    it("currently records every >0.1mm feed move as a discontinuity gap", () => {
      const r = gCodeVerificationEngine.verify({ gcode: TWO_FEEDS }).value;
      expect(r.motion_continuity.continuous).toBe(false);
      expect(r.motion_continuity.gaps).toEqual([{ from_line: 6, to_line: 7, gap_mm: 10 }]);
    });
  });

  describe("class + singleton parity", () => {
    it("exposes the same verify() on a fresh instance and the exported singleton", () => {
      const fresh = new GCodeVerificationEngine();
      const a = fresh.verify({ gcode: "%\nO1\nM30\n%" }).value;
      const b = gCodeVerificationEngine.verify({ gcode: "%\nO1\nM30\n%" }).value;
      expect(a.valid).toBe(b.valid);
      expect(a.statistics.line_count).toBe(b.statistics.line_count);
    });
  });
});
