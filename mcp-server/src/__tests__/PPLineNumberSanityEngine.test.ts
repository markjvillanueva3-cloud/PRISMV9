/**
 * PPLineNumberSanityEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPLineNumberSanityEngine,
  ppLineNumberSanityEngine,
} from "../engines/PPLineNumberSanityEngine.js";

const CLEAN = `%
O1001
N10 G90 G21
N20 G54
N30 S2000 M3
N40 G0 X10. Y10.
N50 G1 Z-1. F100.
N60 M30
%`;

describe("PPLineNumberSanityEngine", () => {
  it("exports singleton", () => {
    expect(ppLineNumberSanityEngine).toBeInstanceOf(PPLineNumberSanityEngine);
  });

  describe("nonmonotonic_n", () => {
    it("flags N30 after N50", () => {
      const code = `%
O1001
N10 G90
N50 G0 X10.
N30 G1 X20. F100.
N60 M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const n = r.issues.filter((i) => i.kind === "nonmonotonic_n");
      expect(n.length).toBe(1);
      expect(n[0].severity).toBe("error");
    });

    it("does not flag monotonic sequence", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      const n = r.issues.filter((i) => i.kind === "nonmonotonic_n");
      expect(n.length).toBe(0);
    });
  });

  describe("duplicate_n", () => {
    it("flags repeated N-number", () => {
      const code = `%
O1001
N10 G90
N20 G0 X10.
N20 G1 X20. F100.
N30 M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const d = r.issues.filter((i) => i.kind === "duplicate_n");
      expect(d.length).toBe(1);
      expect(d[0].severity).toBe("error");
    });

    it("does not flag unique N-numbers", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      const d = r.issues.filter((i) => i.kind === "duplicate_n");
      expect(d.length).toBe(0);
    });
  });

  describe("large_n_gap", () => {
    it("flags gap > 1000", () => {
      const code = `%
O1001
N10 G90
N2000 G0 X10.
N2010 M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const g = r.issues.filter((i) => i.kind === "large_n_gap");
      expect(g.length).toBe(1);
      expect(g[0].severity).toBe("warning");
    });

    it("does not flag normal gap", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      const g = r.issues.filter((i) => i.kind === "large_n_gap");
      expect(g.length).toBe(0);
    });

    it("custom max_n_gap respected", () => {
      const code = `%
O1001
N10 G90
N30 G0 X10.
N40 M30
%`;
      const r = ppLineNumberSanityEngine.validate(code, { max_n_gap: 10 });
      const g = r.issues.filter((i) => i.kind === "large_n_gap");
      expect(g.length).toBe(1);
    });

    it("warn_large_n_gap=false suppresses", () => {
      const code = `%
O1001
N10 G90
N2000 G0 X10.
N2010 M30
%`;
      const r = ppLineNumberSanityEngine.validate(code, {
        warn_large_n_gap: false,
      });
      const g = r.issues.filter((i) => i.kind === "large_n_gap");
      expect(g.length).toBe(0);
    });
  });

  describe("missing_program_start_percent", () => {
    it("flags program without leading %", () => {
      const code = `O1001
N10 G90
N20 M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_start_percent",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag when % present", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_start_percent",
      );
      expect(m.length).toBe(0);
    });

    it("require_percent=false suppresses", () => {
      const code = `O1001
N10 M30`;
      const r = ppLineNumberSanityEngine.validate(code, {
        require_percent: false,
      });
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_start_percent",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("missing_program_end_percent", () => {
    it("flags program without trailing %", () => {
      const code = `%
O1001
N10 G90
N20 M30`;
      const r = ppLineNumberSanityEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_end_percent",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag when trailing % present", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_end_percent",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("missing_o_number", () => {
    it("flags program without O-number", () => {
      const code = `%
N10 G90
N20 M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "missing_o_number");
      expect(m.length).toBe(1);
    });

    it("does not flag when O-number present", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      const m = r.issues.filter((i) => i.kind === "missing_o_number");
      expect(m.length).toBe(0);
    });
  });

  describe("missing_program_end_m_code", () => {
    it("flags program without M30/M2/M99", () => {
      const code = `%
O1001
N10 G90
N20 G0 X10.
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_end_m_code",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag when M30 present", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_end_m_code",
      );
      expect(m.length).toBe(0);
    });

    it("accepts M2", () => {
      const code = `%
O1001
G0 X10.
M2
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_end_m_code",
      );
      expect(m.length).toBe(0);
    });

    it("accepts M99 (subprogram return)", () => {
      const code = `%
O8000
G0 X10.
M99
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "missing_program_end_m_code",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("code_after_program_end", () => {
    it("flags G-code after M30", () => {
      const code = `%
O1001
G0 X10.
M30
G0 X20.
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const c = r.issues.filter((i) => i.kind === "code_after_program_end");
      expect(c.length).toBe(1);
      expect(c[0].severity).toBe("warning");
    });

    it("does not flag trailing %", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      const c = r.issues.filter((i) => i.kind === "code_after_program_end");
      expect(c.length).toBe(0);
    });
  });

  describe("duplicate_o_number", () => {
    it("flags two O1001 programs", () => {
      const code = `%
O1001
G0 X10.
M30
%
O1001
G0 X20.
M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const d = r.issues.filter((i) => i.kind === "duplicate_o_number");
      expect(d.length).toBe(1);
      expect(d[0].severity).toBe("error");
    });

    it("does not flag distinct O-numbers", () => {
      const code = `%
O1001
G0 X10.
M30
O2000
G0 X20.
M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      const d = r.issues.filter((i) => i.kind === "duplicate_o_number");
      expect(d.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("tracks total_lines, n_numbered_lines", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      expect(r.summary.n_numbered_lines).toBe(6); // N10..N60
    });

    it("min_n and max_n", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      expect(r.summary.min_n).toBe(10);
      expect(r.summary.max_n).toBe(60);
    });

    it("o_numbers collected", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      expect(r.summary.o_numbers).toEqual([1001]);
    });

    it("has_percent_start / has_percent_end", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      expect(r.summary.has_percent_start).toBe(true);
      expect(r.summary.has_percent_end).toBe(true);
    });

    it("has_program_end_m_code true for clean", () => {
      const r = ppLineNumberSanityEngine.validate(CLEAN);
      expect(r.summary.has_program_end_m_code).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const q = ppLineNumberSanityEngine.quickCheck(CLEAN);
      expect(q.valid).toBe(true);
      expect(q.has_end).toBe(true);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppLineNumberSanityEngine.defaultOptions();
      expect(o.require_percent).toBe(true);
      expect(o.require_o_number).toBe(true);
      expect(o.max_n_gap).toBe(1000);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppLineNumberSanityEngine.validate("");
      expect(r.summary.total_lines).toBe(1);
      expect(r.summary.n_numbered_lines).toBe(0);
    });

    it("handles program without N-words", () => {
      const code = `%
O1001
G90 G21
G0 X10.
M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      expect(r.summary.n_numbered_lines).toBe(0);
      expect(r.summary.min_n).toBeNull();
    });

    it("ignores N inside comments", () => {
      const code = `%
O1001
(N50 comment mention)
G0 X10.
M30
%`;
      const r = ppLineNumberSanityEngine.validate(code);
      expect(r.summary.n_numbered_lines).toBe(0);
    });
  });
});
