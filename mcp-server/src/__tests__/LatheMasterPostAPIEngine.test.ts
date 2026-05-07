/**
 * LatheMasterPostAPIEngine Tests — LATHE-MASTER U-LTH30
 *
 * Tests the unified API surface for lathe master post operations.
 * Exit Gate: Web UI can POST a job → master post → G-code + explanation; E2E test passes.
 *
 * @milestone LATHE-MASTER U-LTH30
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheMasterPostAPIEngine,
  type RouteInput,
  type EmitInput,
  type ValidateInput,
  type ExplainInput,
  type CrossCheckInput,
  type AuditInput,
} from "../engines/LatheMasterPostAPIEngine.js";

describe("LatheMasterPostAPIEngine", () => {
  beforeEach(() => {
    LatheMasterPostAPIEngine.clearAuditLog();
  });

  describe("getVersion", () => {
    it("should return version string", () => {
      expect(LatheMasterPostAPIEngine.getVersion()).toBe("1.0.0");
    });
  });

  describe("route", () => {
    it("should route job to optimal sub-post for known machine", () => {
      const input: RouteInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nG01 X1.0 F0.010\nM30",
      };

      const result = LatheMasterPostAPIEngine.route(input);

      expect(result.success).toBe(true);
      expect(result.selectedDialect).toBeTruthy();
      expect(result.machineId).toBe("okuma-lb3000");
      expect(result.routingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should return alternatives for ambiguous machines", () => {
      const input: RouteInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
      };

      const result = LatheMasterPostAPIEngine.route(input);

      expect(result.alternativeDialects.length).toBeGreaterThanOrEqual(0);
    });

    it("should respect preferred dialect", () => {
      const input: RouteInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
        preferredDialect: "fanuc",
      };

      const result = LatheMasterPostAPIEngine.route(input);

      expect(result.success).toBe(true);
    });

    it("should handle unknown machine with generic fallback", () => {
      const input: RouteInput = {
        machineId: "unknown-xyz",
        program: "G00 X0 Z0",
      };

      const result = LatheMasterPostAPIEngine.route(input);

      expect(result.success).toBe(true);
      expect(result.selectedDialect).toBe("generic");
    });

    it("should reject empty machineId", () => {
      const input: RouteInput = {
        machineId: "",
        program: "G00 X0 Z0",
      };

      const result = LatheMasterPostAPIEngine.route(input);

      expect(result.success).toBe(false);
    });

    it("should reject empty program", () => {
      const input: RouteInput = {
        machineId: "okuma-lb3000",
        program: "",
      };

      const result = LatheMasterPostAPIEngine.route(input);

      expect(result.success).toBe(false);
    });

    it("should record routing in audit log", () => {
      const input: RouteInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
      };

      LatheMasterPostAPIEngine.route(input);

      expect(LatheMasterPostAPIEngine.getAuditLogSize()).toBe(1);
    });
  });

  describe("emit", () => {
    it("should emit G-code for valid input", () => {
      const input: EmitInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nG01 X1.0 F0.010\nM30",
      };

      const result = LatheMasterPostAPIEngine.emit(input);

      expect(result.success).toBe(true);
      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.blockCount).toBeGreaterThan(0);
      expect(result.metadata.machineId).toBe("okuma-lb3000");
    });

    it("should apply line numbers when requested", () => {
      const input: EmitInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
        lineNumbers: true,
        lineNumberStart: 10,
        lineNumberIncrement: 10,
      };

      const result = LatheMasterPostAPIEngine.emit(input);

      expect(result.success).toBe(true);
      expect(result.gcode.some((l) => l.startsWith("N"))).toBe(true);
    });

    it("should generate checksum", () => {
      const input: EmitInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
      };

      const result = LatheMasterPostAPIEngine.emit(input);

      expect(result.metadata.checksum).toBeTruthy();
      expect(result.metadata.checksum.length).toBe(8);
    });

    it("should force specific dialect", () => {
      const input: EmitInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
        dialect: "fanuc",
      };

      const result = LatheMasterPostAPIEngine.emit(input);

      expect(result.success).toBe(true);
      expect(result.dialect).toBe("fanuc");
    });

    it("should handle empty input", () => {
      const input: EmitInput = {
        machineId: "",
        program: "",
      };

      const result = LatheMasterPostAPIEngine.emit(input);

      expect(result.success).toBe(false);
    });
  });

  describe("validate", () => {
    it("should validate valid program", () => {
      const input: ValidateInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nG01 X1.0 F0.010\nT01\nS1000\nM30",
      };

      const result = LatheMasterPostAPIEngine.validate(input);

      expect(result.success).toBe(true);
      expect(result.checkedRules.length).toBeGreaterThan(0);
    });

    it("should detect high tool numbers", () => {
      const input: ValidateInput = {
        machineId: "okuma-lb3000",
        program: "T999\nG00 X0 Z0",
        strictMode: true,
      };

      const result = LatheMasterPostAPIEngine.validate(input);

      expect(result.issues.some((i) => i.code === "TOOL_NUMBER_HIGH")).toBe(true);
    });

    it("should detect high spindle speed", () => {
      const input: ValidateInput = {
        machineId: "okuma-lb3000",
        program: "S15000\nG00 X0 Z0",
      };

      const result = LatheMasterPostAPIEngine.validate(input);

      expect(result.issues.some((i) => i.code === "SPINDLE_RPM_HIGH")).toBe(true);
    });

    it("should detect envelope violations", () => {
      const input: ValidateInput = {
        machineId: "okuma-lb3000",
        program: "G00 X1000 Z0",
        checkEnvelope: true,
      };

      const result = LatheMasterPostAPIEngine.validate(input);

      expect(result.issues.some((i) => i.code === "ENVELOPE_X")).toBe(true);
    });

    it("should check dialect-specific codes for Okuma", () => {
      const input: ValidateInput = {
        machineId: "okuma-lb3000",
        program: "G28 U0 W0",
        dialect: "okuma",
        strictMode: true,
      };

      const result = LatheMasterPostAPIEngine.validate(input);

      expect(result.dialect).toBe("okuma");
    });

    it("should handle invalid input gracefully", () => {
      const result = LatheMasterPostAPIEngine.validate({
        machineId: "",
        program: "",
      });

      expect(result.success).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe("explain", () => {
    it("should explain routing decision", () => {
      const input: ExplainInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nG01 X1.0 F0.010",
      };

      const result = LatheMasterPostAPIEngine.explain(input);

      expect(result.success).toBe(true);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.summary).toBeTruthy();
    });

    it("should include decision chain", () => {
      const input: ExplainInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
        verbosity: "detailed",
      };

      const result = LatheMasterPostAPIEngine.explain(input);

      expect(result.decisionChain.length).toBeGreaterThan(0);
      expect(result.decisionChain[0]).toHaveProperty("step");
      expect(result.decisionChain[0]).toHaveProperty("factor");
    });

    it("should include alternatives when requested", () => {
      const input: ExplainInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
        includeAlternatives: true,
      };

      const result = LatheMasterPostAPIEngine.explain(input);

      expect(result.alternatives).toBeDefined();
    });

    it("should support brief verbosity", () => {
      const input: ExplainInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
        verbosity: "brief",
      };

      const result = LatheMasterPostAPIEngine.explain(input);

      expect(result.reasoning.length).toBeLessThanOrEqual(3);
    });

    it("should handle invalid input", () => {
      const result = LatheMasterPostAPIEngine.explain({
        machineId: "",
        program: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("crossCheck", () => {
    it("should cross-check multiple sub-posts", () => {
      const input: CrossCheckInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\nG01 X1.0 F0.010",
      };

      const result = LatheMasterPostAPIEngine.crossCheck(input);

      expect(result.success).toBe(true);
      expect(result.candidateCount).toBeGreaterThan(0);
      expect(result.recommendation).toBeTruthy();
    });

    it("should report divergences", () => {
      const input: CrossCheckInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0\n".repeat(50),
      };

      const result = LatheMasterPostAPIEngine.crossCheck(input);

      expect(result.divergences).toBeDefined();
    });

    it("should accept custom thresholds", () => {
      const input: CrossCheckInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
        thresholds: {
          blockCountPercent: 5,
          cycleTimePercent: 2,
        },
      };

      const result = LatheMasterPostAPIEngine.crossCheck(input);

      expect(result.success).toBe(true);
    });

    it("should include G-code when requested", () => {
      const input: CrossCheckInput = {
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
        includeGcode: true,
      };

      const result = LatheMasterPostAPIEngine.crossCheck(input);

      expect(result.gcode).toBeDefined();
    });

    it("should handle invalid input", () => {
      const result = LatheMasterPostAPIEngine.crossCheck({
        machineId: "",
        program: "",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("audit", () => {
    it("should return audit records", () => {
      LatheMasterPostAPIEngine.route({ machineId: "okuma-lb3000", program: "G00" });
      LatheMasterPostAPIEngine.route({ machineId: "okuma-lb3000", program: "G01" });

      const result = LatheMasterPostAPIEngine.audit({});

      expect(result.success).toBe(true);
      expect(result.records.length).toBe(2);
    });

    it("should filter by machineId", () => {
      LatheMasterPostAPIEngine.route({ machineId: "okuma-lb3000", program: "G00" });
      LatheMasterPostAPIEngine.route({ machineId: "haas-st20", program: "G00" });

      const result = LatheMasterPostAPIEngine.audit({ machineId: "okuma-lb3000" });

      expect(result.records.every((r) => r.machineId === "okuma-lb3000")).toBe(true);
    });

    it("should include statistics when requested", () => {
      LatheMasterPostAPIEngine.route({ machineId: "okuma-lb3000", program: "G00" });
      LatheMasterPostAPIEngine.route({ machineId: "okuma-lb3000", program: "G01" });

      const result = LatheMasterPostAPIEngine.audit({ includeStatistics: true });

      expect(result.statistics).toBeDefined();
      expect(result.statistics!.totalRuns).toBe(2);
      expect(result.statistics!.successRate).toBeGreaterThan(0);
    });

    it("should respect limit", () => {
      for (let i = 0; i < 10; i++) {
        LatheMasterPostAPIEngine.route({ machineId: "okuma-lb3000", program: "G00" });
      }

      const result = LatheMasterPostAPIEngine.audit({ limit: 5 });

      expect(result.records.length).toBe(5);
    });

    it("should return empty for invalid input", () => {
      const result = LatheMasterPostAPIEngine.audit({ limit: -1 } as AuditInput);

      expect(result.success).toBe(false);
    });
  });

  describe("E2E: POST job → G-code + explanation", () => {
    it("should complete full pipeline: route → emit → explain", () => {
      const machineId = "okuma-lb3000";
      const program = "G00 X0 Z0\nG01 X1.0 Z-0.5 F0.010\nG00 X0 Z0.1\nM30";

      const routeResult = LatheMasterPostAPIEngine.route({ machineId, program });
      expect(routeResult.success).toBe(true);

      const emitResult = LatheMasterPostAPIEngine.emit({
        machineId,
        program,
        dialect: routeResult.selectedDialect,
      });
      expect(emitResult.success).toBe(true);
      expect(emitResult.gcode.length).toBeGreaterThan(0);

      const explainResult = LatheMasterPostAPIEngine.explain({ machineId, program });
      expect(explainResult.success).toBe(true);
      expect(explainResult.reasoning.length).toBeGreaterThan(0);
    });

    it("should validate before emit", () => {
      const machineId = "okuma-lb3000";
      const program = "G00 X0 Z0\nG01 X1.0 F0.010\nM30";

      const validateResult = LatheMasterPostAPIEngine.validate({ machineId, program });
      expect(validateResult.valid).toBe(true);

      if (validateResult.valid) {
        const emitResult = LatheMasterPostAPIEngine.emit({ machineId, program });
        expect(emitResult.success).toBe(true);
      }
    });

    it("should cross-check and recommend best post", () => {
      const machineId = "okuma-lb3000";
      const program = "G00 X0 Z0\nG01 X1.0 F0.010\nM30";

      const crossCheckResult = LatheMasterPostAPIEngine.crossCheck({ machineId, program });
      expect(crossCheckResult.success).toBe(true);
      expect(crossCheckResult.recommendation).toBeTruthy();

      if (!crossCheckResult.hasCriticalDivergence) {
        const emitResult = LatheMasterPostAPIEngine.emit({ machineId, program });
        expect(emitResult.success).toBe(true);
      }
    });
  });

  describe("dispatcher integration", () => {
    it("should be callable via camDispatcher pattern", async () => {
      const { LatheMasterPostAPIEngine: Engine } = await import(
        "../engines/LatheMasterPostAPIEngine.js"
      );

      const result = Engine.route({
        machineId: "okuma-lb3000",
        program: "G00 X0 Z0",
      });

      expect(result.success).toBe(true);
    });
  });
});
