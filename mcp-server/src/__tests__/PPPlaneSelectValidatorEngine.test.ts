/**
 * PPPlaneSelectValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPPlaneSelectValidatorEngine,
  ppPlaneSelectValidatorEngine,
} from "../engines/PPPlaneSelectValidatorEngine.js";

describe("PPPlaneSelectValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppPlaneSelectValidatorEngine).toBeInstanceOf(
      PPPlaneSelectValidatorEngine,
    );
  });

  describe("arc_without_plane_set", () => {
    it("flags G2 with no prior G17/G18/G19", () => {
      const code = `%
O1001
G0 X0. Y0. Z0.
G2 X10. Y10. I5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "arc_without_plane_set");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
    });

    it("does not flag arc after G17 set", () => {
      const code = `%
O1001
G17
G0 X0. Y0. Z0.
G2 X10. Y10. I5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "arc_without_plane_set");
      expect(m.length).toBe(0);
    });

    it("flags only once per program", () => {
      const code = `%
O1001
G0 X0. Y0.
G2 X10. Y0. I5. J0.
G3 X0. Y0. I-5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "arc_without_plane_set");
      expect(m.length).toBe(1);
    });

    it("check_arc_without_plane=false suppresses", () => {
      const code = `%
O1001
G2 X10. Y10. I5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code, {
        check_arc_without_plane: false,
      });
      const m = r.issues.filter((i) => i.kind === "arc_without_plane_set");
      expect(m.length).toBe(0);
    });
  });

  describe("plane_change_during_arc", () => {
    it("flags G17 with G2 in same block", () => {
      const code = `%
O1001
G17 G2 X10. Y10. I5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "plane_change_during_arc");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G18 combined with G3", () => {
      const code = `%
O1001
G18 G3 X10. Z10. I5. K0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "plane_change_during_arc");
      expect(m.length).toBe(1);
    });

    it("does not flag G17 on its own block", () => {
      const code = `%
O1001
G17
G2 X10. Y10. I5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "plane_change_during_arc");
      expect(m.length).toBe(0);
    });
  });

  describe("plane_change_with_cutter_comp", () => {
    it("flags G18 while G41 active", () => {
      const code = `%
O1001
G17
G41 D1
G1 X10. F100.
G18
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "plane_change_with_cutter_comp",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
      expect(m[0].details?.cutter_comp).toBe("G41");
    });

    it("does not flag G18 after G40 cancel", () => {
      const code = `%
O1001
G17
G41 D1
G1 X10. F100.
G40
G18
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "plane_change_with_cutter_comp",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("arc_with_wrong_ijk", () => {
    it("flags K word while G17 active", () => {
      const code = `%
O1001
G17
G2 X10. Y10. I5. J0. K3.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "arc_with_wrong_ijk");
      expect(m.length).toBe(1);
      expect(m[0].details?.ijk_words).toContain("K");
    });

    it("flags J word while G18 active", () => {
      const code = `%
O1001
G18
G2 X10. Z10. I5. J3. K0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "arc_with_wrong_ijk");
      expect(m.length).toBe(1);
      expect(m[0].details?.ijk_words).toContain("J");
    });

    it("flags I word while G19 active", () => {
      const code = `%
O1001
G19
G2 Y10. Z10. I3. J0. K5.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "arc_with_wrong_ijk");
      expect(m.length).toBe(1);
      expect(m[0].details?.ijk_words).toContain("I");
    });

    it("does not flag correct I/J in G17", () => {
      const code = `%
O1001
G17
G2 X10. Y10. I5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "arc_with_wrong_ijk");
      expect(m.length).toBe(0);
    });
  });

  describe("drill_plane_mismatch", () => {
    it("flags G81 without Z or R in G17", () => {
      const code = `%
O1001
G17
G81 X10. Y10. F100.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "drill_plane_mismatch");
      expect(m.length).toBe(1);
    });

    it("does not flag G81 with Z in G17", () => {
      const code = `%
O1001
G17
G81 X10. Y10. Z-10. R5. F100.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "drill_plane_mismatch");
      expect(m.length).toBe(0);
    });

    it("does not flag G81 with R only (R covers retract plane)", () => {
      const code = `%
O1001
G17
G81 X10. Y10. R5. F100.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "drill_plane_mismatch");
      expect(m.length).toBe(0);
    });
  });

  describe("plane_not_restored_at_end", () => {
    it("info flag opt-in when plane changes and is not restored", () => {
      const code = `%
O1001
G17
G0 X10.
G18
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code, {
        check_plane_restored: true,
      });
      const m = r.issues.filter((i) => i.kind === "plane_not_restored_at_end");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("off by default", () => {
      const code = `%
O1001
G17
G18
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "plane_not_restored_at_end");
      expect(m.length).toBe(0);
    });

    it("does not flag when restored", () => {
      const code = `%
O1001
G17
G0 X10.
G18
G0 Z10.
G17
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code, {
        check_plane_restored: true,
      });
      const m = r.issues.filter((i) => i.kind === "plane_not_restored_at_end");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts each plane select", () => {
      const code = `%
O1001
G17
G18
G19
G17
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      expect(r.summary.g17_count).toBe(2);
      expect(r.summary.g18_count).toBe(1);
      expect(r.summary.g19_count).toBe(1);
    });

    it("counts arcs", () => {
      const code = `%
O1001
G17
G2 X10. Y10. I5. J0.
G3 X0. Y0. I-5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      expect(r.summary.arc_count).toBe(2);
    });

    it("tracks initial and final plane", () => {
      const code = `%
O1001
G17
G1 X10.
G18
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      expect(r.summary.initial_plane).toBe("G17");
      expect(r.summary.final_plane).toBe("G18");
    });

    it("counts drill cycles", () => {
      const code = `%
O1001
G17
G81 X10. Y10. Z-5. R2. F100.
G83 X20. Y20. Z-10. Q2. R2. F100.
G80
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      expect(r.summary.drill_cycle_count).toBe(2);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean G17 program", () => {
      const code = `%
O1001
G17 G90 G54
G0 X0. Y0. Z5.
G2 X10. Y10. I5. J0. F100.
M30
%`;
      const q = ppPlaneSelectValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.final_plane).toBe("G17");
      expect(q.arc_count).toBe(1);
    });

    it("returns valid=false on plane-change during arc", () => {
      const code = `%
O1001
G17 G2 X10. Y10. I5. J0.
M30
%`;
      const q = ppPlaneSelectValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppPlaneSelectValidatorEngine.defaultOptions();
      expect(o.check_arc_without_plane).toBe(true);
      expect(o.check_plane_change_during_arc).toBe(true);
      expect(o.check_plane_change_with_comp).toBe(true);
      expect(o.check_drill_plane_mismatch).toBe(true);
      expect(o.check_arc_wrong_ijk).toBe(true);
      expect(o.check_plane_restored).toBe(false);
      expect(o.default_plane_assumption).toBe("G17");
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppPlaneSelectValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.final_plane).toBeNull();
      expect(r.summary.initial_plane).toBeNull();
    });

    it("handles program with no arcs or planes", () => {
      const code = `%
O1001
G0 X10. Y10.
G1 X20. F100.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      expect(r.total_issues).toBe(0);
      expect(r.summary.arc_count).toBe(0);
    });

    it("ignores G17/G18/G19 inside comments", () => {
      const code = `%
O1001
(G17 example in comment)
G2 X10. Y10. I5. J0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      expect(r.summary.g17_count).toBe(0);
    });

    it("respects default_plane_assumption=G18 for lathe", () => {
      const code = `%
O1001
G2 X10. Z10. I5. J3.
M30
%`;
      // With default G18 assumption, J is the unused center word — should flag J
      const r = ppPlaneSelectValidatorEngine.validate(code, {
        default_plane_assumption: "G18",
      });
      const m = r.issues.filter((i) => i.kind === "arc_with_wrong_ijk");
      expect(m.length).toBe(1);
      expect(m[0].details?.ijk_words).toContain("J");
    });

    it("accepts lathe-style G18 with I/K arc", () => {
      const code = `%
O1001
G18
G2 X10. Z-10. I5. K0.
M30
%`;
      const r = ppPlaneSelectValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "arc_with_wrong_ijk");
      expect(m.length).toBe(0);
    });
  });
});
