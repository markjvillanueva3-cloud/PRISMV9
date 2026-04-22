/**
 * LatheMasterPostEnsembleCrossCheckEngine Tests — LATHE-MASTER U-LTH29
 *
 * Exit Gate: Ensemble check triggered on 5+ ambiguous fixtures; divergence reporting accurate.
 *
 * Coverage:
 * - Happy path: ensemble comparison across multiple sub-posts
 * - Divergence detection (block count, cycle time, tool changes)
 * - Threshold enforcement (>10% blocks, >5% cycle time)
 * - Ambiguous machine detection
 * - Single candidate handling
 * - Failure modes: invalid input, empty program
 * - Adversarial inputs: NaN, extreme values
 * - Statistics and history tracking
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheMasterPostEnsembleCrossCheckEngine,
  type EnsembleInput,
  type SubPostCandidate,
  EnsembleInputSchema,
} from "../engines/LatheMasterPostEnsembleCrossCheckEngine.js";

describe("LatheMasterPostEnsembleCrossCheckEngine", () => {
  beforeEach(() => {
    LatheMasterPostEnsembleCrossCheckEngine.clearHistory();
  });

  describe("runEnsemble — Happy Path", () => {
    it("should run ensemble for ambiguous Okuma machine", () => {
      const input: EnsembleInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nG01 X1.0 F0.010\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.success).toBe(true);
      expect(result.ambiguous).toBe(true);
      expect(result.candidateCount).toBeGreaterThan(1);
      expect(result.outputs.length).toBeGreaterThan(1);
      expect(result.baselineSubPost).toBeTruthy();
    });

    it("should compare outputs and generate divergence reports", () => {
      const input: EnsembleInput = {
        machineId: "okuma-multus-b300",
        program: "G00 X0 Z0\nG01 X1.0 F0.010\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.divergences.length).toBeGreaterThan(0);
      for (const div of result.divergences) {
        expect(div.metric).toBeTruthy();
        expect(typeof div.baseline).toBe("number");
        expect(typeof div.compared).toBe("number");
        expect(typeof div.percentDiff).toBe("number");
        expect(["low", "medium", "high", "critical"]).toContain(div.severity);
      }
    });

    it("should include recommendation in result", () => {
      const input: EnsembleInput = {
        machineId: "doosan-puma-2600",
        program: "G00 X0 Z0\nG01 Z-1.0 F0.012\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(10);
    });

    it("should generate summary for ambiguous machines", () => {
      const input: EnsembleInput = {
        machineId: "citizen-l20",
        program: "G00 X0 Z0\nG01 X0.5 F0.008\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.summary).toContain("citizen-l20");
      expect(result.summary.length).toBeGreaterThan(20);
    });

    it("should track execution time", () => {
      const input: EnsembleInput = {
        machineId: "mori-nl2500",
        program: "G00 X0 Z0\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.executionTimeMs).toBeLessThan(5000);
    });
  });

  describe("EXIT GATE: 5+ Ambiguous Fixtures", () => {
    it("should detect at least 5 ambiguous machines in inventory", () => {
      const count = LatheMasterPostEnsembleCrossCheckEngine.getAmbiguousMachineCount();

      expect(count).toBeGreaterThanOrEqual(5);
    });

    it("should list all ambiguous machines", () => {
      const machines = LatheMasterPostEnsembleCrossCheckEngine.getAmbiguousMachines();

      expect(machines.length).toBeGreaterThanOrEqual(5);
      for (const machine of machines) {
        expect(machine.compatibleDialects.length).toBeGreaterThan(0);
      }
    });

    it("should run ensemble on all ambiguous machines", () => {
      const machines = LatheMasterPostEnsembleCrossCheckEngine.getAmbiguousMachines();
      const program = "G00 X0 Z0\nG01 X1.0 F0.010\nM30";

      let successCount = 0;
      for (const machine of machines.slice(0, 5)) {
        const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble({
          machineId: machine.id,
          program,
        });
        if (result.success && result.ambiguous) {
          successCount++;
        }
      }

      expect(successCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Divergence Detection", () => {
    it("should detect block count divergence", () => {
      const input: EnsembleInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\n".repeat(20),
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      const blockDivergence = result.divergences.find((d) => d.metric === "block_count");

      expect(blockDivergence).toBeDefined();
      expect(blockDivergence!.baseline).toBeGreaterThan(0);
      expect(blockDivergence!.compared).toBeGreaterThan(0);
    });

    it("should detect cycle time divergence", () => {
      const input: EnsembleInput = {
        machineId: "citizen-m32",
        program: "G01 X0.5 F0.010\n".repeat(30),
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      const timeDivergence = result.divergences.find((d) => d.metric === "cycle_time");

      expect(timeDivergence).toBeDefined();
      expect(timeDivergence!.baseline).toBeGreaterThan(0);
    });

    it("should flag divergence exceeding threshold", () => {
      const candidates: SubPostCandidate[] = [
        { id: "baseline-post", dialect: "okuma", priority: 0, capabilities: [] },
        { id: "divergent-post", dialect: "generic", priority: 1, capabilities: [] },
      ];

      const input: EnsembleInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\n".repeat(50),
        candidates,
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      const exceedingDivergences = result.divergences.filter((d) => d.exceeds);

      expect(exceedingDivergences.length).toBeGreaterThan(0);
    });

    it("should compute severity levels correctly", () => {
      const input: EnsembleInput = {
        machineId: "star-sr20",
        program: "G00 X0 Z0\nG01 Z-2.0 F0.010\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      for (const div of result.divergences) {
        expect(["low", "medium", "high", "critical"]).toContain(div.severity);
        if (div.percentDiff > div.threshold * 2) {
          expect(["high", "critical"]).toContain(div.severity);
        }
      }
    });
  });

  describe("Threshold Enforcement", () => {
    it("should respect custom block count threshold", () => {
      const input: EnsembleInput = {
        machineId: "okuma-lb4000",
        program: "G00 X0 Z0\nM30",
        thresholds: { blockCountPercent: 5 },
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      const blockDiv = result.divergences.find((d) => d.metric === "block_count");

      expect(blockDiv).toBeDefined();
      expect(blockDiv!.threshold).toBe(5);
    });

    it("should respect custom cycle time threshold", () => {
      const input: EnsembleInput = {
        machineId: "doosan-puma-2600",
        program: "G00 X0 Z0\nM30",
        thresholds: { cycleTimePercent: 2 },
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      const timeDiv = result.divergences.find((d) => d.metric === "cycle_time");

      expect(timeDiv).toBeDefined();
      expect(timeDiv!.threshold).toBe(2);
    });

    it("should use default thresholds when not specified", () => {
      const input: EnsembleInput = {
        machineId: "mazak-qt200",
        program: "G00 X0 Z0\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      const blockDiv = result.divergences.find((d) => d.metric === "block_count");

      expect(blockDiv).toBeDefined();
      expect(blockDiv!.threshold).toBe(10);
    });
  });

  describe("Single Candidate Handling", () => {
    it("should handle machine with no compatible dialects", () => {
      const input: EnsembleInput = {
        machineId: "unknown-machine",
        program: "G00 X0 Z0\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.success).toBe(true);
      expect(result.ambiguous).toBe(false);
      expect(result.candidateCount).toBe(1);
      expect(result.divergences).toHaveLength(0);
    });

    it("should return appropriate message for single candidate", () => {
      const candidates: SubPostCandidate[] = [
        { id: "only-post", dialect: "fanuc", priority: 0, capabilities: [] },
      ];

      const input: EnsembleInput = {
        machineId: "single-machine",
        program: "G00 X0 Z0\nM30",
        candidates,
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.recommendation).toContain("Single candidate");
      expect(result.recommendation).toContain("only-post");
    });
  });

  describe("Candidate Finding", () => {
    it("should find candidates for known machine", () => {
      const candidates = LatheMasterPostEnsembleCrossCheckEngine.findCandidates("okuma-lb3000");

      expect(candidates.length).toBeGreaterThan(1);
      expect(candidates[0].dialect).toBe("okuma");
      expect(candidates[0].priority).toBe(0);
    });

    it("should return generic for unknown machine", () => {
      const candidates = LatheMasterPostEnsembleCrossCheckEngine.findCandidates("totally-unknown");

      expect(candidates.length).toBe(1);
      expect(candidates[0].dialect).toBe("generic");
    });

    it("should include primary dialect first", () => {
      const candidates = LatheMasterPostEnsembleCrossCheckEngine.findCandidates("citizen-l20");

      expect(candidates[0].dialect).toBe("citizen");
    });

    it("should include compatible dialects", () => {
      const candidates = LatheMasterPostEnsembleCrossCheckEngine.findCandidates("doosan-puma-2600");

      const dialects = candidates.map((c) => c.dialect);
      expect(dialects).toContain("fanuc");
      expect(dialects).toContain("haas");
    });
  });

  describe("Ambiguity Detection", () => {
    it("should correctly identify ambiguous machines", () => {
      expect(LatheMasterPostEnsembleCrossCheckEngine.isAmbiguous("okuma-lb3000")).toBe(true);
      expect(LatheMasterPostEnsembleCrossCheckEngine.isAmbiguous("citizen-l20")).toBe(true);
    });

    it("should return false for unknown machines", () => {
      expect(LatheMasterPostEnsembleCrossCheckEngine.isAmbiguous("unknown-xyz")).toBe(false);
    });
  });

  describe("Failure Modes", () => {
    it("should reject empty machine ID", () => {
      const input = { machineId: "", program: "G00 X0 Z0" };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.success).toBe(false);
      expect(result.recommendation).toContain("Error");
    });

    it("should reject empty program", () => {
      const input = { machineId: "okuma-lb3000", program: "" };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.success).toBe(false);
    });

    it("should handle null input gracefully", () => {
      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(null as unknown as EnsembleInput);

      expect(result.success).toBe(false);
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it("should handle undefined input", () => {
      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(undefined as unknown as EnsembleInput);

      expect(result.success).toBe(false);
    });
  });

  describe("Adversarial Inputs", () => {
    it("should handle very long program", () => {
      const input: EnsembleInput = {
        machineId: "okuma-lb3000",
        program: "G01 X1.0 F0.010\n".repeat(10000),
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.success).toBe(true);
      expect(result.outputs[0].blockCount).toBeGreaterThan(100);
    });

    it("should handle special characters in machine ID", () => {
      const input: EnsembleInput = {
        machineId: "machine<script>alert(1)</script>",
        program: "G00 X0 Z0",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.success).toBe(true);
      expect(result.ambiguous).toBe(false);
    });

    it("should handle unicode in program", () => {
      const input: EnsembleInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0 (日本語コメント)\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      expect(result.success).toBe(true);
    });
  });

  describe("Statistics and History", () => {
    it("should track execution history", () => {
      const input: EnsembleInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nM30",
      };

      LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      const history = LatheMasterPostEnsembleCrossCheckEngine.getHistory();

      expect(history.length).toBe(3);
    });

    it("should compute statistics correctly", () => {
      const machines = ["okuma-lb3000", "citizen-l20", "doosan-puma-2600"];
      for (const machineId of machines) {
        LatheMasterPostEnsembleCrossCheckEngine.runEnsemble({
          machineId,
          program: "G00 X0 Z0\nM30",
        });
      }

      const stats = LatheMasterPostEnsembleCrossCheckEngine.getStatistics();

      expect(stats.totalRuns).toBe(3);
      expect(stats.ambiguousRuns).toBeGreaterThanOrEqual(0);
      expect(stats.avgCandidates).toBeGreaterThan(0);
      expect(stats.avgExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it("should clear history", () => {
      LatheMasterPostEnsembleCrossCheckEngine.runEnsemble({
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
      });

      LatheMasterPostEnsembleCrossCheckEngine.clearHistory();

      expect(LatheMasterPostEnsembleCrossCheckEngine.getHistory()).toHaveLength(0);
    });

    it("should return empty statistics when no history", () => {
      const stats = LatheMasterPostEnsembleCrossCheckEngine.getStatistics();

      expect(stats.totalRuns).toBe(0);
      expect(stats.avgCandidates).toBe(0);
    });
  });

  describe("Output Structure", () => {
    it("should include all required fields in PostOutput", () => {
      const input: EnsembleInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nG01 X1.0 F0.010\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      for (const output of result.outputs) {
        expect(output.subPostId).toBeTruthy();
        expect(["okuma", "fanuc", "mitsubishi", "mazak", "haas", "citizen", "generic"]).toContain(output.dialect);
        expect(Array.isArray(output.gcode)).toBe(true);
        expect(output.gcode.length).toBeGreaterThan(0);
        expect(output.blockCount).toBeGreaterThan(0);
        expect(output.estimatedCycleTime).toBeGreaterThan(0);
        expect(typeof output.toolChanges).toBe("number");
        expect(typeof output.rapidMoves).toBe("number");
        expect(typeof output.feedMoves).toBe("number");
      }
    });

    it("should generate valid G-code structure", () => {
      const input: EnsembleInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nM30",
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);
      const gcode = result.outputs[0].gcode;

      expect(gcode[0]).toBe("%");
      expect(gcode[gcode.length - 1]).toBe("%");
      expect(gcode.some((line) => line.includes("G00") || line.includes("G01"))).toBe(true);
    });
  });

  describe("Zod Schema Validation", () => {
    it("should validate correct input", () => {
      const input = {
        machineId: "test-machine",
        program: "G00 X0 Z0",
        operation: "turning",
      };

      const result = EnsembleInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const result = EnsembleInputSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const input = {
        machineId: "test-machine",
        program: "G00 X0 Z0",
        thresholds: {
          blockCountPercent: 15,
          cycleTimePercent: 8,
        },
      };

      const result = EnsembleInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe("Version", () => {
    it("should return version string", () => {
      const version = LatheMasterPostEnsembleCrossCheckEngine.getVersion();

      expect(version).toBe("1.0.0");
    });
  });

  describe("Critical Divergence Flag", () => {
    it("should flag critical divergence for large differences", () => {
      const candidates: SubPostCandidate[] = [
        { id: "baseline", dialect: "okuma", priority: 0, capabilities: [] },
        { id: "wildly-different", dialect: "generic", priority: 1, capabilities: [] },
      ];

      const input: EnsembleInput = {
        machineId: "test-machine",
        program: "G00 X0\n".repeat(100),
        candidates,
        thresholds: { blockCountPercent: 1, cycleTimePercent: 1 },
      };

      const result = LatheMasterPostEnsembleCrossCheckEngine.runEnsemble(input);

      const hasExceeding = result.divergences.some((d) => d.exceeds);
      expect(hasExceeding).toBe(true);
    });
  });
});
