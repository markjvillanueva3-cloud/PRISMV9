/**
 * PPHighSpeedMachiningValidatorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPHighSpeedMachiningValidatorEngine,
  ppHighSpeedMachiningValidatorEngine,
} from "../engines/PPHighSpeedMachiningValidatorEngine.js";

// Helper to build a surfacing sequence of N blocks with varying Z
function surfacingBlocks(n: number, startZ = 0): string {
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    const z = (startZ - i * 0.1).toFixed(3);
    lines.push(`G1 X${(i * 0.5).toFixed(3)} Y${(i * 0.3).toFixed(3)} Z${z} F1000.`);
  }
  return lines.join("\n");
}

describe("PPHighSpeedMachiningValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppHighSpeedMachiningValidatorEngine).toBeInstanceOf(
      PPHighSpeedMachiningValidatorEngine,
    );
  });

  describe("hsm_off_during_3d_surfacing", () => {
    it("flags 25-block surfacing run with no G05.1", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
M3 S10000
${surfacingBlocks(25)}
G0 Z10.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "hsm_off_during_3d_surfacing",
      );
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.surfacing_block_count).toBeGreaterThanOrEqual(20);
    });

    it("does not flag when G05.1 Q1 is active", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
M3 S10000
G05.1 Q1
${surfacingBlocks(25)}
G05.1 Q0
G0 Z10.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "hsm_off_during_3d_surfacing",
      );
      expect(m.length).toBe(0);
    });

    it("does not flag when below surfacing_threshold", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
M3 S10000
${surfacingBlocks(10)}
G0 Z10.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "hsm_off_during_3d_surfacing",
      );
      expect(m.length).toBe(0);
    });

    it("respects custom surfacing_threshold", () => {
      const code = `%
O1001
${surfacingBlocks(15)}
G0 Z10.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code, {
        surfacing_threshold: 10,
      });
      const m = r.issues.filter(
        (i) => i.kind === "hsm_off_during_3d_surfacing",
      );
      expect(m.length).toBe(1);
    });

    it("check_surfacing_without_hsm=false suppresses", () => {
      const code = `%
O1001
${surfacingBlocks(25)}
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code, {
        check_surfacing_without_hsm: false,
      });
      const m = r.issues.filter(
        (i) => i.kind === "hsm_off_during_3d_surfacing",
      );
      expect(m.length).toBe(0);
    });

    it("accepts Haas G05 P10000 high-speed variant", () => {
      const code = `%
O1001
G05 P10000
${surfacingBlocks(25)}
G05 P0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter(
        (i) => i.kind === "hsm_off_during_3d_surfacing",
      );
      expect(m.length).toBe(0);
    });
  });

  describe("hsm_on_during_threading", () => {
    it("flags G05.1 Q1 with G32 threading", () => {
      const code = `%
O1001
G05.1 Q1
G32 X10. Z-20. F1.5
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_threading");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G05.1 Q1 with G76", () => {
      const code = `%
O1001
G05.1 Q1
G76 P020060 Q50 R0.02
G76 X9.5 Z-20. P650 Q200 F1.5
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_threading");
      expect(m.length).toBeGreaterThanOrEqual(1);
    });

    it("does not flag threading when HSM is off", () => {
      const code = `%
O1001
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_threading");
      expect(m.length).toBe(0);
    });

    it("check_hsm_threading=false suppresses", () => {
      const code = `%
O1001
G05.1 Q1
G32 X10. Z-20. F1.5
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code, {
        check_hsm_threading: false,
      });
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_threading");
      expect(m.length).toBe(0);
    });
  });

  describe("hsm_on_during_rigid_tap", () => {
    it("flags G05.1 Q1 with M29 rigid tap", () => {
      const code = `%
O1001
G05.1 Q1
M29 S500
G84 X0. Y0. Z-10. R5. F1.25
G80
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_rigid_tap");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G05.1 Q1 with G84", () => {
      const code = `%
O1001
G05.1 Q1
G84 X0. Y0. Z-10. R5. F1.25
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_rigid_tap");
      expect(m.length).toBe(1);
    });

    it("does not flag rigid tap when HSM is off", () => {
      const code = `%
O1001
M29 S500
G84 X0. Y0. Z-10. R5. F1.25
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_rigid_tap");
      expect(m.length).toBe(0);
    });
  });

  describe("hsm_on_during_probing", () => {
    it("flags G05.1 Q1 with G65 P9811 probe", () => {
      const code = `%
O1001
G05.1 Q1
G65 P9810 X0. Y0.
G65 P9811 X10. F200.
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_probing");
      expect(m.length).toBeGreaterThanOrEqual(1);
      expect(m[0].severity).toBe("error");
    });

    it("flags G05.1 Q1 with G31 raw skip", () => {
      const code = `%
O1001
G05.1 Q1
G31 Z-50. F100.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_probing");
      expect(m.length).toBe(1);
    });

    it("does not flag probing when HSM is off", () => {
      const code = `%
O1001
G65 P9811 X10. F200.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_on_during_probing");
      expect(m.length).toBe(0);
    });
  });

  describe("g61_during_surfacing", () => {
    it("flags G61 active during 25-block surfacing", () => {
      const code = `%
O1001
G61
${surfacingBlocks(25)}
G0 Z10.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g61_during_surfacing");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("warning");
      expect(m[0].details?.corner_mode).toBe("G61");
    });

    it("does not flag G64 during surfacing", () => {
      const code = `%
O1001
G64
${surfacingBlocks(25)}
G0 Z10.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "g61_during_surfacing");
      expect(m.length).toBe(0);
    });

    it("check_g61_surfacing=false suppresses", () => {
      const code = `%
O1001
G61
${surfacingBlocks(25)}
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code, {
        check_g61_surfacing: false,
      });
      const m = r.issues.filter((i) => i.kind === "g61_during_surfacing");
      expect(m.length).toBe(0);
    });
  });

  describe("hsm_not_cancelled_at_end", () => {
    it("info flag opt-in when G05.1 Q1 left on at M30", () => {
      const code = `%
O1001
G05.1 Q1
G1 X10. F1000.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code, {
        check_cancel_at_end: true,
      });
      const m = r.issues.filter((i) => i.kind === "hsm_not_cancelled_at_end");
      expect(m.length).toBe(1);
      expect(m[0].severity).toBe("info");
    });

    it("off by default", () => {
      const code = `%
O1001
G05.1 Q1
G1 X10. F1000.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const m = r.issues.filter((i) => i.kind === "hsm_not_cancelled_at_end");
      expect(m.length).toBe(0);
    });

    it("does not flag when cancelled before end", () => {
      const code = `%
O1001
G05.1 Q1
G1 X10. F1000.
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code, {
        check_cancel_at_end: true,
      });
      const m = r.issues.filter((i) => i.kind === "hsm_not_cancelled_at_end");
      expect(m.length).toBe(0);
    });
  });

  describe("summary metrics", () => {
    it("counts G05.1 on/off", () => {
      const code = `%
O1001
G05.1 Q1
G1 X10.
G05.1 Q0
G05.1 Q1
G1 Y10.
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      expect(r.summary.g05_1_on_count).toBe(2);
      expect(r.summary.g05_1_off_count).toBe(2);
    });

    it("counts G61 and G64", () => {
      const code = `%
O1001
G61
G1 X10.
G64
G1 X20.
G61
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      expect(r.summary.g61_count).toBe(2);
      expect(r.summary.g64_count).toBe(1);
    });

    it("tracks aicc_active_at_end=true", () => {
      const code = `%
O1001
G05.1 Q1
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      expect(r.summary.aicc_active_at_end).toBe(true);
    });

    it("tracks aicc_active_at_end=false after cancel", () => {
      const code = `%
O1001
G05.1 Q1
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      expect(r.summary.aicc_active_at_end).toBe(false);
    });

    it("counts surfacing_blocks", () => {
      const code = `%
O1001
G05.1 Q1
${surfacingBlocks(25)}
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      expect(r.summary.surfacing_blocks).toBeGreaterThanOrEqual(20);
    });
  });

  describe("quickCheck", () => {
    it("returns valid=true for clean HSM program", () => {
      const code = `%
O1001
G05.1 Q1
${surfacingBlocks(25)}
G05.1 Q0
M30
%`;
      const q = ppHighSpeedMachiningValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(true);
      expect(q.aicc_active_at_end).toBe(false);
    });

    it("returns valid=false for HSM during threading", () => {
      const code = `%
O1001
G05.1 Q1
G32 X10. Z-20. F1.5
M30
%`;
      const q = ppHighSpeedMachiningValidatorEngine.quickCheck(code);
      expect(q.valid).toBe(false);
    });
  });

  describe("defaultOptions", () => {
    it("returns sensible defaults", () => {
      const o = ppHighSpeedMachiningValidatorEngine.defaultOptions();
      expect(o.check_surfacing_without_hsm).toBe(true);
      expect(o.check_hsm_threading).toBe(true);
      expect(o.check_hsm_rigid_tap).toBe(true);
      expect(o.check_hsm_probing).toBe(true);
      expect(o.check_g61_surfacing).toBe(true);
      expect(o.check_cancel_at_end).toBe(false);
      expect(o.surfacing_threshold).toBe(20);
    });
  });

  describe("edge cases", () => {
    it("handles empty program", () => {
      const r = ppHighSpeedMachiningValidatorEngine.validate("");
      expect(r.total_issues).toBe(0);
      expect(r.summary.surfacing_blocks).toBe(0);
      expect(r.summary.aicc_active_at_end).toBe(false);
    });

    it("handles program with no cutting", () => {
      const code = `%
O1001
T1 M6
G43 H1 Z10.
G0 X0. Y0.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      expect(r.total_issues).toBe(0);
      expect(r.summary.surfacing_blocks).toBe(0);
    });

    it("ignores G05.1 inside comment", () => {
      const code = `%
O1001
(G05.1 Q1 example in comment)
G1 X10. F100.
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      expect(r.summary.g05_1_on_count).toBe(0);
    });

    it("handles HSM toggling mid-program", () => {
      const code = `%
O1001
G05.1 Q1
${surfacingBlocks(5)}
G05.1 Q0
G32 X10. Z-20. F1.5
G05.1 Q1
${surfacingBlocks(25)}
G05.1 Q0
M30
%`;
      const r = ppHighSpeedMachiningValidatorEngine.validate(code);
      const thread = r.issues.filter(
        (i) => i.kind === "hsm_on_during_threading",
      );
      const surf = r.issues.filter(
        (i) => i.kind === "hsm_off_during_3d_surfacing",
      );
      expect(thread.length).toBe(0); // threading happens while HSM is off
      expect(surf.length).toBe(0); // both surfacing runs are covered by HSM
    });

    it("handles plain 2D pocketing without flagging surfacing", () => {
      const lines: string[] = ["%", "O1001"];
      for (let i = 0; i < 25; i++) {
        lines.push(`G1 X${i * 0.5} Y${i * 0.3} F1000.`);
      }
      lines.push("M30", "%");
      const r = ppHighSpeedMachiningValidatorEngine.validate(lines.join("\n"));
      // No Z variation => no surfacing flag
      const m = r.issues.filter(
        (i) => i.kind === "hsm_off_during_3d_surfacing",
      );
      expect(m.length).toBe(0);
    });
  });
});
