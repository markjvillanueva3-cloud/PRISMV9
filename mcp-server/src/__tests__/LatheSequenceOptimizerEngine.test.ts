/**
 * LatheSequenceOptimizerEngine Test Suite (MS3 U-LPS02)
 */
import { describe, it, expect } from "vitest";
import {
  latheSequenceOptimizerEngine,
  type SequenceOperation,
} from "../engines/LatheSequenceOptimizerEngine.js";

function ops(...types: SequenceOperation["type"][]): SequenceOperation[] {
  return types.map((t, i) => ({
    id: `op_${i}`,
    type: t,
    tool_number: i + 1,
    estimated_time_sec: 60,
  }));
}

describe("LatheSequenceOptimizerEngine", () => {
  describe("optimize() — hard constraints", () => {
    it("face comes first", () => {
      const result = latheSequenceOptimizerEngine.optimize(
        ops("rough_od", "drill", "face")
      );
      expect(result.operations[0]!.type).toBe("face");
    });

    it("part_off comes last", () => {
      const result = latheSequenceOptimizerEngine.optimize(
        ops("face", "rough_od", "part_off", "finish_od")
      );
      expect(result.operations[result.operations.length - 1]!.type).toBe("part_off");
    });

    it("center_drill precedes drill", () => {
      const result = latheSequenceOptimizerEngine.optimize(
        ops("drill", "center_drill", "face")
      );
      const centerIdx = result.operations.findIndex((o) => o.type === "center_drill");
      const drillIdx = result.operations.findIndex((o) => o.type === "drill");
      expect(centerIdx).toBeLessThan(drillIdx);
    });

    it("rough before finish on same feature (both OD)", () => {
      const result = latheSequenceOptimizerEngine.optimize(
        ops("finish_od", "rough_od", "face")
      );
      const roughIdx = result.operations.findIndex((o) => o.type === "rough_od");
      const finishIdx = result.operations.findIndex((o) => o.type === "finish_od");
      expect(roughIdx).toBeLessThan(finishIdx);
    });

    it("thread follows finish_od", () => {
      const result = latheSequenceOptimizerEngine.optimize(
        ops("thread_od", "rough_od", "finish_od", "face")
      );
      const finIdx = result.operations.findIndex((o) => o.type === "finish_od");
      const thrIdx = result.operations.findIndex((o) => o.type === "thread_od");
      expect(thrIdx).toBeGreaterThan(finIdx);
    });
  });

  describe("spindle mode selection", () => {
    it("assigns G97 (RPM) to drilling", () => {
      const result = latheSequenceOptimizerEngine.optimize(
        ops("face", "center_drill", "drill")
      );
      const drillOp = result.operations.find((o) => o.type === "drill")!;
      expect(result.spindle_modes.get(drillOp.id)).toBe("G97");
    });

    it("assigns G96 (CSS) to turning ops", () => {
      const result = latheSequenceOptimizerEngine.optimize(ops("face", "rough_od", "finish_od"));
      const turnOp = result.operations.find((o) => o.type === "rough_od")!;
      expect(result.spindle_modes.get(turnOp.id)).toBe("G96");
    });

    it("assigns G97 (RPM) to tapping", () => {
      const result = latheSequenceOptimizerEngine.optimize(
        ops("face", "drill", "tap")
      );
      const tapOp = result.operations.find((o) => o.type === "tap")!;
      expect(result.spindle_modes.get(tapOp.id)).toBe("G97");
    });
  });

  describe("optimization metadata", () => {
    it("reports tool_changes count", () => {
      const result = latheSequenceOptimizerEngine.optimize(ops("face", "rough_od", "drill"));
      expect(typeof result.tool_changes).toBe("number");
      expect(result.tool_changes).toBeGreaterThanOrEqual(0);
    });

    it("reports reasoning steps", () => {
      const result = latheSequenceOptimizerEngine.optimize(ops("face", "rough_od", "finish_od"));
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("optimization_score is a number", () => {
      const result = latheSequenceOptimizerEngine.optimize(ops("face", "rough_od", "finish_od"));
      expect(typeof result.optimization_score).toBe("number");
    });
  });

  describe("thermal sequencing", () => {
    it("activates thermal sequencing for tight tolerances", () => {
      const tightOps: SequenceOperation[] = [
        { id: "op1", type: "face", tolerance_mm: 0.005 },
        { id: "op2", type: "rough_od" },
        { id: "op3", type: "finish_od", tolerance_mm: 0.005 },
      ];
      const result = latheSequenceOptimizerEngine.optimize(tightOps, {
        thermal_tolerance_threshold_mm: 0.01,
        force_thermal_sequencing: true,
      });
      expect(result.thermal_sequencing_active).toBe(true);
    });
  });

  describe("validateSequence()", () => {
    it("returns empty violations for valid sequence", () => {
      const valid = ops("face", "rough_od", "finish_od");
      const violations = latheSequenceOptimizerEngine.validateSequence(valid);
      expect(violations.length).toBe(0);
    });

    it("flags violations when face is 3+ positions deep", () => {
      // Engine flags face only when faceIdx > 1 (position 3+).
      const bad = ops("rough_od", "drill", "face");
      const violations = latheSequenceOptimizerEngine.validateSequence(bad);
      expect(violations.length).toBeGreaterThan(0);
    });

    it("flags violations when part_off is not last", () => {
      const bad = ops("face", "part_off", "rough_od");
      const violations = latheSequenceOptimizerEngine.validateSequence(bad);
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe("weight configuration", () => {
    it("custom weights produce valid output", () => {
      const result = latheSequenceOptimizerEngine.optimize(ops("face", "rough_od"), {
        weight_cycle_time: 0.5,
        weight_tool_life: 0.3,
        weight_tool_changes: 0.1,
        weight_thermal: 0.1,
      });
      expect(result).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("handles single operation", () => {
      const result = latheSequenceOptimizerEngine.optimize(ops("face"));
      expect(result.operations.length).toBe(1);
    });

    it("handles empty operation list", () => {
      const result = latheSequenceOptimizerEngine.optimize([]);
      expect(result.operations.length).toBe(0);
    });
  });
});
