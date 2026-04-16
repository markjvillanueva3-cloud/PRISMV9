/**
 * PPWorkOffsetValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPWorkOffsetValidatorEngine,
  ppWorkOffsetValidatorEngine,
} from "../engines/PPWorkOffsetValidatorEngine.js";

describe("PPWorkOffsetValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppWorkOffsetValidatorEngine).toBeInstanceOf(PPWorkOffsetValidatorEngine);
  });

  describe("missing_initial_offset", () => {
    it("flags program with motion but no G54-G59", () => {
      const code = `%
O1001
G90 G21
G0 X10. Y10.
G1 Z-1. F100.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const miss = r.issues.filter((i) => i.kind === "missing_initial_offset");
      expect(miss.length).toBe(1);
      expect(miss[0].severity).toBe("error");
    });

    it("does not flag when G54 set before motion", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const miss = r.issues.filter((i) => i.kind === "missing_initial_offset");
      expect(miss.length).toBe(0);
    });

    it("does not flag when require_initial_offset=false", () => {
      const code = `%
O1001
G90 G21
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code, {
        require_initial_offset: false,
      });
      const miss = r.issues.filter((i) => i.kind === "missing_initial_offset");
      expect(miss.length).toBe(0);
    });

    it("does not flag if program has no motion", () => {
      const code = `%
O1001
G90 G21
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const miss = r.issues.filter((i) => i.kind === "missing_initial_offset");
      expect(miss.length).toBe(0);
    });
  });

  describe("mid_operation_switch", () => {
    it("flags offset switch while spindle running", () => {
      const code = `%
O1001
G90 G21
G54
S2000 M3
G0 X10. Y10.
G1 Z-1. F100.
G55
G1 X20.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const mid = r.issues.filter((i) => i.kind === "mid_operation_switch");
      expect(mid.length).toBeGreaterThanOrEqual(1);
      expect(mid[0].severity).toBe("error");
    });

    it("does not flag switch when M5 precedes", () => {
      const code = `%
O1001
G90 G21
G54
S2000 M3
G0 X10. Y10.
G1 Z-1. F100.
M5
G0 Z25.
G55
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const mid = r.issues.filter((i) => i.kind === "mid_operation_switch");
      expect(mid.length).toBe(0);
    });

    it("allows mid-op switch when option enabled", () => {
      const code = `%
O1001
G90 G21
G54
S2000 M3
G0 X10. Y10.
G1 Z-1. F100.
G55
G1 X20.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code, {
        allow_mid_op_switch_with_m_code: true,
      });
      const mid = r.issues.filter((i) => i.kind === "mid_operation_switch");
      expect(mid.length).toBe(0);
    });
  });

  describe("switch_without_retract", () => {
    it("flags offset switch below safe Z when spindle stopped", () => {
      const code = `%
O1001
G90 G21
G54
S2000 M3
G0 X10. Y10.
G1 Z-1. F100.
M5
G55
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const warn = r.issues.filter((i) => i.kind === "switch_without_retract");
      expect(warn.length).toBeGreaterThanOrEqual(1);
      expect(warn[0].severity).toBe("warning");
    });

    it("does not flag when retracted above safe_z_mm", () => {
      const code = `%
O1001
G90 G21
G54
S2000 M3
G0 X10. Y10.
G1 Z-1. F100.
M5
G0 Z50.
G55
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const warn = r.issues.filter((i) => i.kind === "switch_without_retract");
      expect(warn.length).toBe(0);
    });

    it("custom safe_z_mm respected", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10. Y10.
G1 Z-1. F100.
M5
G0 Z5.
G55
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code, { safe_z_mm: 3 });
      const warn = r.issues.filter((i) => i.kind === "switch_without_retract");
      expect(warn.length).toBe(0);
    });
  });

  describe("extended_offset_parse (G54.1 P<n>)", () => {
    it("flags valid G54.1 P5 as info", () => {
      const code = `%
O1001
G90 G21
G54.1 P5
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const info = r.issues.filter((i) => i.kind === "extended_offset_parse");
      expect(info.length).toBe(1);
      expect(info[0].severity).toBe("info");
      expect(info[0].details?.p_value).toBe(5);
    });

    it("errors on P out of range (> extended_offset_max_p)", () => {
      const code = `%
O1001
G54.1 P99
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const err = r.issues.filter(
        (i) => i.kind === "extended_offset_parse" && i.severity === "error",
      );
      expect(err.length).toBe(1);
    });

    it("errors on G54.1 without P", () => {
      const code = `%
O1001
G54.1
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const err = r.issues.filter(
        (i) => i.kind === "extended_offset_parse" && i.severity === "error",
      );
      expect(err.length).toBe(1);
    });

    it("custom extended_offset_max_p accepts larger P", () => {
      const code = `%
O1001
G54.1 P100
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code, {
        extended_offset_max_p: 300,
      });
      const err = r.issues.filter(
        (i) => i.kind === "extended_offset_parse" && i.severity === "error",
      );
      expect(err.length).toBe(0);
    });
  });

  describe("conflicting_offsets_same_line", () => {
    it("flags G54 G55 on same line", () => {
      const code = `%
O1001
G90 G21
G54 G55
G0 X10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const conf = r.issues.filter(
        (i) => i.kind === "conflicting_offsets_same_line",
      );
      expect(conf.length).toBe(1);
      expect(conf[0].severity).toBe("error");
    });

    it("does not flag single offset per line", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10.
G55
G1 X20.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      const conf = r.issues.filter(
        (i) => i.kind === "conflicting_offsets_same_line",
      );
      expect(conf.length).toBe(0);
    });
  });

  describe("summary tracking", () => {
    it("tracks distinct offsets used", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10.
G0 Z25.
G55
G1 X20.
G0 Z25.
G56
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      expect(r.summary.offsets_used).toEqual(["G54", "G55", "G56"]);
    });

    it("counts total switches", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10.
G0 Z25.
G55
G0 Z25.
G56
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      expect(r.summary.total_switches).toBe(2);
    });

    it("records first offset and first motion line", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      expect(r.summary.first_offset_line).toBe(4);
      expect(r.summary.first_motion_line).toBe(5);
    });

    it("valid=true when no errors", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
      expect(r.errors).toBe(0);
    });

    it("valid=false when errors present", () => {
      const code = `%
O1001
G54 G55
G0 X10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(false);
      expect(r.errors).toBeGreaterThan(0);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10. Y10.
M30
%`;
      const q = ppWorkOffsetValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.offsets).toContain("G54");
    });

    it("returns valid=false when errors", () => {
      const code = `%
O1001
G54 G55
G0 X10.
M30
%`;
      const q = ppWorkOffsetValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppWorkOffsetValidatorEngine.defaultOptions();
      expect(o.safe_z_mm).toBe(10);
      expect(o.require_initial_offset).toBe(true);
      expect(o.allow_mid_op_switch_with_m_code).toBe(false);
      expect(o.extended_offset_max_p).toBe(48);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppWorkOffsetValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.offsets_used).toEqual([]);
    });

    it("handles program with only comments", () => {
      const code = `(HEADER ONLY)\n(NOTHING ELSE)`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      expect(r.summary.first_motion_line).toBeNull();
    });

    it("ignores offsets inside comments", () => {
      const code = `%
O1001
G90 G21
G54
(G55 mentioned in comment)
G0 X10. Y10.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      expect(r.summary.offsets_used).toEqual(["G54"]);
    });

    it("does not count G54 stay (same offset repeated) as switch", () => {
      const code = `%
O1001
G90 G21
G54
G0 X10. Y10.
G0 Z25.
G54
G1 X20.
M30
%`;
      const r = ppWorkOffsetValidatorEngine.validate(code);
      expect(r.summary.total_switches).toBe(0);
    });
  });
});
