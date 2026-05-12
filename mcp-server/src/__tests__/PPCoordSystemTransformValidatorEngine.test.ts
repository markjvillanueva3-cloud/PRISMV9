/**
 * PPCoordSystemTransformValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPCoordSystemTransformValidatorEngine,
  ppCoordSystemTransformValidatorEngine,
} from "../engines/PPCoordSystemTransformValidatorEngine.js";

describe("PPCoordSystemTransformValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppCoordSystemTransformValidatorEngine).toBeInstanceOf(
      PPCoordSystemTransformValidatorEngine,
    );
  });

  describe("g68_without_g69", () => {
    it("flags G68 not cancelled by G69", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G0 X10.
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g68_without_g69");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag G68 cancelled by G69", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G0 X10.
G69
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g68_without_g69");
      expect(m.length).toBe(0);
    });

    it("check_g68_cancel=false suppresses", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code, {
        check_g68_cancel: false,
      });
      const m = r.issues.filter((i) => i.kind === "g68_without_g69");
      expect(m.length).toBe(0);
    });
  });

  describe("g51_without_g50", () => {
    it("flags G51 not cancelled", () => {
      const code = `%
O1001
G51 P1000
G0 X10.
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g51_without_g50");
      expect(m.length).toBe(1);
    });

    it("does not flag G51 cancelled by G50", () => {
      const code = `%
O1001
G51 P1000
G0 X10.
G50
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g51_without_g50");
      expect(m.length).toBe(0);
    });
  });

  describe("mirror_without_cancel", () => {
    it("flags M70 without cancel", () => {
      const code = `%
O1001
M70
G0 X10.
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mirror_without_cancel");
      expect(m.length).toBe(1);
    });

    it("does not flag G51.1 cancelled by G50.1", () => {
      const code = `%
O1001
G51.1 X0.
G0 X10.
G50.1
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "mirror_without_cancel");
      expect(m.length).toBe(0);
    });
  });

  describe("nested_g68", () => {
    it("flags nested G68 without intervening G69", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G68 X10. Y10. R30.
G69
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "nested_g68");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag sequential G68/G69/G68", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G0 X10.
G69
G68 X0. Y0. R30.
G0 X20.
G69
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "nested_g68");
      expect(m.length).toBe(0);
    });
  });

  describe("rotation_in_cutter_comp", () => {
    it("flags G68 while G41 active", () => {
      const code = `%
O1001
G41 D1
G1 X10. F100.
G68 X0. Y0. R45.
G69
G40
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rotation_in_cutter_comp");
      expect(m.length).toBe(1);
      expect(m[0].details?.cutter_comp).toBe("G41");
    });

    it("does not flag G68 outside cutter comp", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G41 D1
G1 X10. F100.
G40
G69
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "rotation_in_cutter_comp");
      expect(m.length).toBe(0);
    });
  });

  describe("scaling_on_threading", () => {
    it("flags G32 while G51 scaling active", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G51 P1000
G0 X12. Z1.
G32 X10. Z-20. F1.5
G50
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "scaling_on_threading");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("does not flag G32 with G51 cancelled before", () => {
      const code = `%
O1001
G95 G97 S1000 M3
G51 P1000
G0 X20. Z1.
G50
G0 X12. Z1.
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "scaling_on_threading");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts G68/G69/G51/G50", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G69
G51 P1000
G50
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      expect(r.summary.g68_count).toBe(1);
      expect(r.summary.g69_count).toBe(1);
      expect(r.summary.g51_count).toBe(1);
      expect(r.summary.g50_count).toBe(1);
    });

    it("counts mirror_on_count for M70/M71/M72/G51.1", () => {
      const code = `%
O1001
M70
G50.1
M71
G50.1
G51.1 X0.
G50.1
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      expect(r.summary.mirror_on_count).toBe(3);
      expect(r.summary.mirror_off_count).toBe(3);
    });

    it("tracks *_active_at_end flags", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G51 P1000
M70
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      expect(r.summary.rotation_active_at_end).toBe(true);
      expect(r.summary.scaling_active_at_end).toBe(true);
      expect(r.summary.mirror_active_at_end).toBe(true);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean program", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G0 X10.
G69
M30
%`;
      const q = ppCoordSystemTransformValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.rotation_active_at_end).toBe(false);
    });

    it("returns valid=false on nested rotation", () => {
      const code = `%
O1001
G68 X0. Y0. R45.
G68 X10. Y10. R30.
G69
M30
%`;
      const q = ppCoordSystemTransformValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppCoordSystemTransformValidatorEngine.defaultOptions();
      expect(o.check_g68_cancel).toBe(true);
      expect(o.check_g51_cancel).toBe(true);
      expect(o.check_mirror_cancel).toBe(true);
      expect(o.check_nested_g68).toBe(true);
      expect(o.check_rotation_in_comp).toBe(true);
      expect(o.check_scaling_threading).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppCoordSystemTransformValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.rotation_active_at_end).toBe(false);
    });

    it("handles program with no transforms", () => {
      const code = `%
O1001
G90 G54
G0 X10. Y10. Z5.
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      expect(r.total_issues).toBe(0);
      expect(r.summary.g68_count).toBe(0);
    });

    it("ignores G68 inside comment", () => {
      const code = `%
O1001
(G68 example in comment)
G0 X10.
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      expect(r.summary.g68_count).toBe(0);
    });

    it("handles G68.1 3D rotation variant", () => {
      const code = `%
O1001
G68.1 X0. Y0. Z0. I1. J0. K0. R30.
G0 X10.
G69
M30
%`;
      const r = ppCoordSystemTransformValidatorEngine.validate(code);
      expect(r.summary.g68_count).toBe(1);
    });
  });
});
