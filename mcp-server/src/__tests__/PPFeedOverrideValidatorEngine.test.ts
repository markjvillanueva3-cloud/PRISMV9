/**
 * PPFeedOverrideValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPFeedOverrideValidatorEngine,
  ppFeedOverrideValidatorEngine,
} from "../engines/PPFeedOverrideValidatorEngine.js";

describe("PPFeedOverrideValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppFeedOverrideValidatorEngine).toBeInstanceOf(PPFeedOverrideValidatorEngine);
  });

  describe("first_motion_without_feed", () => {
    it("flags G1 with no prior F", () => {
      const code = `%
O1001
G90 G21
G0 X10. Y10.
G1 X20. Y20.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "first_motion_without_feed");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag when F set on same line", () => {
      const code = `%
O1001
G90 G21
G0 X10.
G1 X20. F100.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "first_motion_without_feed");
      expect(m.length).toBe(0);
    });

    it("does not flag when F set on prior line", () => {
      const code = `%
O1001
G90 G21
F150.
G0 X10.
G1 X20.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "first_motion_without_feed");
      expect(m.length).toBe(0);
    });

    it("flags G2 without prior feed", () => {
      const code = `%
O1001
G0 X10. Y10.
G2 X20. Y20. I5. J0.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "first_motion_without_feed");
      expect(m.length).toBe(1);
    });
  });

  describe("feed_is_zero", () => {
    it("flags F0 on G1", () => {
      const code = `%
O1001
G0 X10.
G1 X20. F0.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "feed_is_zero");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag F0 without motion (modal only)", () => {
      const code = `%
O1001
F0
G0 X10.
G1 X20. F100.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "feed_is_zero");
      expect(m.length).toBe(0);
    });
  });

  describe("rapid_with_feed_word", () => {
    it("flags G0 with F", () => {
      const code = `%
O1001
G0 X10. F200.
G1 X20.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_with_feed_word");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("does not flag G0 without F", () => {
      const code = `%
O1001
F200.
G0 X10.
G1 X20.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rapid_with_feed_word");
      expect(m.length).toBe(0);
    });

    it("flag_rapid_with_feed=false suppresses", () => {
      const code = `%
O1001
G0 X10. F200.
G1 X20.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code, {
        flag_rapid_with_feed: false,
      });
      const m = r.issues.filter((i) => i.kind === "rapid_with_feed_word");
      expect(m.length).toBe(0);
    });
  });

  describe("feed_after_tool_change_missing", () => {
    it("flags G1 after Txx M6 without F", () => {
      const code = `%
O1001
F100.
G1 X10.
T02 M6
G1 X20.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "feed_after_tool_change_missing",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag when F set after tool change", () => {
      const code = `%
O1001
F100.
G1 X10.
T02 M6
G1 X20. F150.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "feed_after_tool_change_missing",
      );
      expect(m.length).toBe(0);
    });

    it("tracks tool change line number", () => {
      const code = `%
O1001
F100.
G1 X10.
T02 M6
G0 X30.
G1 X40.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "feed_after_tool_change_missing",
      );
      expect(m.length).toBe(1);
      expect(m[0].details?.tool_change_line).toBe(5);
    });
  });

  describe("excessive_feed_jump", () => {
    it("flags F100 → F5000 jump", () => {
      const code = `%
O1001
G0 X0
G1 X10. F100.
G1 X20. F5000.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "excessive_feed_jump");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.ratio).toBeCloseTo(50, 0);
    });

    it("flags F5000 → F100 jump", () => {
      const code = `%
O1001
G0 X0
G1 X10. F5000.
G1 X20. F100.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "excessive_feed_jump");
      expect(m.length).toBe(1);
    });

    it("does not flag moderate feed change", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F300.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "excessive_feed_jump");
      expect(m.length).toBe(0);
    });

    it("custom ratio threshold respected", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F600.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code, {
        excessive_feed_jump_ratio: 5,
      });
      const m = r.issues.filter((i) => i.kind === "excessive_feed_jump");
      expect(m.length).toBe(1);
    });

    it("flag_excessive_jump=false suppresses", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F5000.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code, {
        flag_excessive_jump: false,
      });
      const m = r.issues.filter((i) => i.kind === "excessive_feed_jump");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("captures first_feed and last_feed", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F200.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      expect(r.summary.first_feed).toBeCloseTo(100);
      expect(r.summary.last_feed).toBeCloseTo(200);
    });

    it("tracks peak_feed and min_nonzero_feed", () => {
      const code = `%
O1001
G1 X10. F50.
G1 X20. F500.
G1 X30. F150.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      expect(r.summary.peak_feed).toBeCloseTo(500);
      expect(r.summary.min_nonzero_feed).toBeCloseTo(50);
    });

    it("counts cutting_moves and rapid_moves", () => {
      const code = `%
O1001
G0 X10. Y10.
G1 X20. F100.
G1 X30.
G0 X40.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      expect(r.summary.cutting_moves).toBe(2);
      expect(r.summary.rapid_moves).toBe(2);
    });

    it("counts feed_change_count", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X20. F100.
G1 X30. F200.
G1 X40. F300.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      expect(r.summary.feed_change_count).toBe(3); // 100, 200, 300 transitions
    });

    it("counts tool_changes", () => {
      const code = `%
O1001
T01 M6
F100.
G1 X10.
T02 M6
F200.
G1 X20.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      expect(r.summary.tool_changes).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
F100.
G1 X10.
M30
%`;
      const q = ppFeedOverrideValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.first_feed).toBeCloseTo(100);
    });

    it("returns valid=false for feed errors", () => {
      const code = `%
O1001
G1 X10. F0.
M30
%`;
      const q = ppFeedOverrideValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
      expect(q.errors).toBeGreaterThan(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppFeedOverrideValidatorEngine.defaultOptions();
      expect(o.excessive_feed_jump_ratio).toBe(10);
      expect(o.tool_change_feed_window).toBe(5);
      expect(o.flag_rapid_with_feed).toBe(true);
      expect(o.flag_excessive_jump).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppFeedOverrideValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.first_feed).toBeNull();
      expect(r.summary.cutting_moves).toBe(0);
    });

    it("handles program without motion", () => {
      const code = `%
O1001
F100.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      expect(r.summary.cutting_moves).toBe(0);
      expect(r.summary.first_feed).toBeCloseTo(100);
    });

    it("ignores F inside comments", () => {
      const code = `%
O1001
(F100 mentioned in comment)
G1 X10. F200.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      expect(r.summary.first_feed).toBeCloseTo(200);
    });

    it("handles rapid-only program", () => {
      const code = `%
O1001
G0 X10. Y10.
G0 X20. Y20.
M30
%`;
      const r = ppFeedOverrideValidatorEngine.validate(code);
      expect(r.summary.cutting_moves).toBe(0);
      expect(r.summary.rapid_moves).toBe(2);
      expect(r.total_issues).toBe(0);
    });
  });
});
