/**
 * PPZeroMotionValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPZeroMotionValidatorEngine,
  ppZeroMotionValidatorEngine,
} from "../engines/PPZeroMotionValidatorEngine.js";

describe("PPZeroMotionValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppZeroMotionValidatorEngine).toBeInstanceOf(
      PPZeroMotionValidatorEngine,
    );
  });

  describe("zero_length_linear", () => {
    it("flags G1 to current position", () => {
      const code = `%
O1001
G1 X10. Y20. F100.
G1 X10. Y20. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "zero_length_linear");
      expect(m.length).toBe(1);
    });

    it("does not flag G1 that moves", () => {
      const code = `%
O1001
G1 X10. Y20. F100.
G1 X20. Y20. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "zero_length_linear");
      expect(m.length).toBe(0);
    });

    it("does not flag G1 on first use of axis", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "zero_length_linear");
      expect(m.length).toBe(0);
    });
  });

  describe("redundant_rapid", () => {
    it("flags G0 to current position", () => {
      const code = `%
O1001
G0 X0. Y0. Z50.
G0 X0. Y0. Z50.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_rapid");
      expect(m.length).toBe(1);
    });

    it("does not flag G0 that moves", () => {
      const code = `%
O1001
G0 X0. Y0.
G0 X10. Y10.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "redundant_rapid");
      expect(m.length).toBe(0);
    });
  });

  describe("motion_without_axis", () => {
    it("flags G1 F100. (feed-only block)", () => {
      const code = `%
O1001
G0 X10.
G1 F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "motion_without_axis");
      expect(m.length).toBe(1);
    });

    it("does not flag G1 with motion", () => {
      const code = `%
O1001
G1 X10. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "motion_without_axis");
      expect(m.length).toBe(0);
    });
  });

  describe("duplicate_coord_sequence", () => {
    it("flags 3+ identical consecutive moves", () => {
      const code = `%
O1001
G1 X10. Y5. F100.
G1 X10. Y5. F100.
G1 X10. Y5. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "duplicate_coord_sequence",
      );
      expect(m.length).toBe(1);
    });

    it("does not flag non-consecutive identical moves", () => {
      const code = `%
O1001
G1 X10. Y5. F100.
G1 X20. Y15. F100.
G1 X10. Y5. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "duplicate_coord_sequence",
      );
      expect(m.length).toBe(0);
    });

    it("respects custom duplicate_run_threshold", () => {
      const code = `%
O1001
G1 X10. Y5. F100.
G1 X10. Y5. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code, {
        duplicate_run_threshold: 2,
      });
      const m = r.issues.filter(
        (i) => i.kind === "duplicate_coord_sequence",
      );
      expect(m.length).toBe(1);
    });
  });

  describe("zero_length_arc_ijk", () => {
    it("flags G2 with I=J=K=0 and endpoint matching", () => {
      const code = `%
O1001
G0 X10. Y20.
G2 X10. Y20. I0. J0.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "zero_length_arc_ijk");
      expect(m.length).toBe(1);
    });

    it("flags G3 with I=J=0 at current position", () => {
      const code = `%
O1001
G0 X5. Y5.
G3 X5. Y5. I0. J0.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "zero_length_arc_ijk");
      expect(m.length).toBe(1);
    });

    it("does not flag G2 with nonzero I/J", () => {
      const code = `%
O1001
G0 X10. Y0.
G2 X10. Y0. I-5. J0.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "zero_length_arc_ijk");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("reports motion_block_count", () => {
      const code = `%
O1001
G0 X10.
G1 X20. F100.
G1 X30. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      expect(r.summary.motion_block_count).toBe(3);
    });

    it("reports zero_length_count", () => {
      const code = `%
O1001
G1 X10. Y5. F100.
G1 X10. Y5. F100.
G1 X10. Y5. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      expect(r.summary.zero_length_count).toBe(2);
    });

    it("reports valid=true when no errors", () => {
      const code = `%
O1001
G1 X10. Y5. F100.
G1 X10. Y5. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      expect(r.summary.valid).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns summary", () => {
      const code = `%
O1001
G1 X10. Y5. F100.
G1 X10. Y5. F100.
M30
%`;
      const q = ppZeroMotionValidatorEngine.quickCheck(code);
      expect(q.motion_blocks).toBe(2);
      expect(q.zero_length_moves).toBe(1);
    });

    it("handles empty code", () => {
      const q = ppZeroMotionValidatorEngine.quickCheck("");
      expect(q.motion_blocks).toBe(0);
      expect(q.zero_length_moves).toBe(0);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppZeroMotionValidatorEngine.defaultOptions();
      expect(o.check_zero_length_linear).toBe(true);
      expect(o.check_redundant_rapid).toBe(true);
      expect(o.check_motion_without_axis).toBe(true);
      expect(o.check_duplicate_coord_sequence).toBe(true);
      expect(o.check_zero_length_arc_ijk).toBe(true);
      expect(o.duplicate_run_threshold).toBe(3);
      expect(o.position_tolerance).toBe(1e-6);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppZeroMotionValidatorEngine.validate("");
      expect(r.summary.motion_block_count).toBe(0);
      expect(r.summary.valid).toBe(true);
    });

    it("handles program with no motion", () => {
      const code = `%
O1001
M3 S1000
M5
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      expect(r.summary.motion_block_count).toBe(0);
    });

    it("strips comments before detection", () => {
      const code = `%
O1001
(G1 X10. F100. was here)
G1 X10. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      expect(r.summary.motion_block_count).toBe(1);
    });

    it("resets duplicate run on non-motion block", () => {
      const code = `%
O1001
G1 X10. Y5. F100.
G1 X10. Y5. F100.
M3 S1000
G1 X10. Y5. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "duplicate_coord_sequence",
      );
      expect(m.length).toBe(0);
    });

    it("tolerates small float differences via position_tolerance", () => {
      const code = `%
O1001
G1 X10.0000001 Y5. F100.
G1 X10.0 Y5. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "zero_length_linear");
      expect(m.length).toBe(1);
    });

    it("does not flag motion with new axis not previously set", () => {
      const code = `%
O1001
G1 X10. F100.
G1 X10. Y5. F100.
M30
%`;
      const r = ppZeroMotionValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "zero_length_linear");
      expect(m.length).toBe(0);
    });
  });
});
