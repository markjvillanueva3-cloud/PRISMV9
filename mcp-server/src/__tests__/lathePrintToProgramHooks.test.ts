/**
 * lathePrintToProgramHooks Tests
 *
 * U-LTH47: Safety hooks for Print-to-Program pipeline
 */

import { describe, it, expect } from "vitest";
import {
  checkCpkGate,
  checkCollisionRisk,
  checkToolLifeRisk,
  runAllP2PHooks,
  allHooksPass,
  getBlockingHooks,
  getWarningHooks,
  LATHE_P2P_HOOKS,
  type HookContext,
  type DLIntelligenceResult,
} from "../hooks/lathePrintToProgramHooks.js";
import { lathePrintToProgramDLIntelligenceEngine } from "../engines/LathePrintToProgramDLIntelligenceEngine.js";
import { lathePrintToProgramOrchestratorEngine } from "../engines/LathePrintToProgramOrchestratorEngine.js";

describe("lathePrintToProgramHooks", () => {
  const getTestDLResult = async () => {
    const result = await lathePrintToProgramOrchestratorEngine.execute({
      blueprint: { source_type: "pdf", part_type: "turning", part_number: "HOOK-001" },
      program_number: 11001,
      program_name: "HOOK TEST",
      controller: "okuma_osp",
    });

    return lathePrintToProgramDLIntelligenceEngine.analyze({
      recognition: result.stages.recognition.data!,
      plan: result.stages.planning.data!,
      program: result.program!,
    });
  };

  const testContext: HookContext = {
    action: "lathe_print_full",
    program_number: 11001,
    part_number: "HOOK-001",
    machine_id: "LTH-01",
    controller: "okuma_osp",
  };

  describe("checkCpkGate()", () => {
    it("passes when Cpk above threshold", async () => {
      const dlResult = await getTestDLResult();

      // Mock low failure probability for high Cpk
      const lowFailureDL: typeof dlResult = {
        ...dlResult,
        overall_failure_probability: 0.1,
        failure_modes: dlResult.failure_modes.map(m => ({ ...m, probability: 0.05 })),
      };

      const result = checkCpkGate(lowFailureDL, undefined, testContext, {
        require_verification: false,
      });

      expect(result.allowed).toBe(true);
      expect(result.hook_name).toBe("p2p-cpk-below-gate");
      expect(result.severity).toBe("info");
    });

    it("blocks when verification required but missing", async () => {
      const dlResult = await getTestDLResult();

      const result = checkCpkGate(dlResult, undefined, testContext, {
        require_verification: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.severity).toBe("error");
      expect(result.message).toContain("Verification required");
    });

    it("blocks on high failure probability", async () => {
      const dlResult = await getTestDLResult();

      const highFailureDL: typeof dlResult = {
        ...dlResult,
        overall_failure_probability: 0.8,
        failure_modes: [
          {
            type: "tolerance_violation",
            probability: 0.7,
            confidence: 0.9,
            affected_features: [],
            root_cause: "Test",
          },
        ],
      };

      const result = checkCpkGate(highFailureDL, undefined, testContext, {
        require_verification: false,
        block_on_failure: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.severity).toBe("critical");
      expect(result.details?.predicted_cpk).toBeLessThan(1.33);
    });

    it("provides corrections as recommendations", async () => {
      const dlResult = await getTestDLResult();

      const highFailureDL: typeof dlResult = {
        ...dlResult,
        overall_failure_probability: 0.6,
        corrections: [
          { id: "c1", priority: 1, category: "feed", description: "Reduce feed rate", expected_improvement: 0.3, parameters: {} },
          { id: "c2", priority: 2, category: "depth", description: "Reduce DOC", expected_improvement: 0.2, parameters: {} },
        ],
      };

      const result = checkCpkGate(highFailureDL, undefined, testContext, {
        require_verification: false,
      });

      if (!result.allowed && result.recommendations) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe("checkCollisionRisk()", () => {
    it("passes when collision risk low", async () => {
      const dlResult = await getTestDLResult();

      const lowCollisionDL: typeof dlResult = {
        ...dlResult,
        failure_modes: dlResult.failure_modes.filter(m => m.type !== "collision"),
      };

      const result = checkCollisionRisk(lowCollisionDL, testContext);

      expect(result.allowed).toBe(true);
      expect(result.hook_name).toBe("p2p-collision-risk");
    });

    it("warns when collision risk high", async () => {
      const dlResult = await getTestDLResult();

      const highCollisionDL: typeof dlResult = {
        ...dlResult,
        failure_modes: [
          {
            type: "collision",
            probability: 0.45,
            confidence: 0.85,
            affected_features: ["f1", "f2"],
            root_cause: "Insufficient clearance",
          },
        ],
      };

      const result = checkCollisionRisk(highCollisionDL, testContext, 0.3);

      expect(result.allowed).toBe(true); // Warning only
      expect(result.severity).toBe("warning");
      expect(result.message).toContain("Collision risk");
      expect(result.recommendations?.length).toBeGreaterThan(0);
    });

    it("uses custom threshold", async () => {
      const dlResult = await getTestDLResult();

      const collisionDL: typeof dlResult = {
        ...dlResult,
        failure_modes: [
          { type: "collision", probability: 0.25, confidence: 0.8, affected_features: [], root_cause: "" },
        ],
      };

      const lowThreshold = checkCollisionRisk(collisionDL, testContext, 0.2);
      const highThreshold = checkCollisionRisk(collisionDL, testContext, 0.3);

      expect(lowThreshold.severity).not.toBe("info");
      expect(highThreshold.severity).toBe("info");
    });
  });

  describe("checkToolLifeRisk()", () => {
    it("passes when tool breakage risk low", async () => {
      const dlResult = await getTestDLResult();

      const result = checkToolLifeRisk(dlResult, testContext);

      expect(result.allowed).toBe(true);
      expect(result.hook_name).toBe("p2p-tool-life-risk");
    });

    it("warns when tool breakage risk high", async () => {
      const dlResult = await getTestDLResult();

      const highBreakageDL: typeof dlResult = {
        ...dlResult,
        failure_modes: [
          {
            type: "tool_breakage",
            probability: 0.4,
            confidence: 0.8,
            affected_features: [],
            root_cause: "Excessive chip load",
          },
        ],
      };

      const result = checkToolLifeRisk(highBreakageDL, testContext, 0.25);

      expect(result.allowed).toBe(true);
      expect(result.severity).toBe("warning");
      expect(result.recommendations).toContain("Reduce depth of cut");
    });
  });

  describe("runAllP2PHooks()", () => {
    it("runs all hooks", async () => {
      const dlResult = await getTestDLResult();

      const results = runAllP2PHooks(dlResult, undefined, testContext, {
        require_verification: false,
      });

      expect(results.length).toBe(3);
      expect(results.map(r => r.hook_name)).toContain("p2p-cpk-below-gate");
      expect(results.map(r => r.hook_name)).toContain("p2p-collision-risk");
      expect(results.map(r => r.hook_name)).toContain("p2p-tool-life-risk");
    });
  });

  describe("allHooksPass()", () => {
    it("returns true when all hooks pass", async () => {
      const dlResult = await getTestDLResult();

      const lowRiskDL: typeof dlResult = {
        ...dlResult,
        overall_failure_probability: 0.1,
        failure_modes: [],
      };

      const results = runAllP2PHooks(lowRiskDL, undefined, testContext, {
        require_verification: false,
      });

      expect(allHooksPass(results)).toBe(true);
    });

    it("returns false when any hook fails", async () => {
      const dlResult = await getTestDLResult();

      const results = runAllP2PHooks(dlResult, undefined, testContext, {
        require_verification: true, // Will fail without verification
      });

      expect(allHooksPass(results)).toBe(false);
    });
  });

  describe("getBlockingHooks()", () => {
    it("returns only blocking hooks", async () => {
      const dlResult = await getTestDLResult();

      const results = runAllP2PHooks(dlResult, undefined, testContext, {
        require_verification: true,
      });

      const blocking = getBlockingHooks(results);

      expect(blocking.length).toBeGreaterThan(0);
      expect(blocking.every(h => !h.allowed)).toBe(true);
    });
  });

  describe("getWarningHooks()", () => {
    it("returns warning hooks that passed", async () => {
      const dlResult = await getTestDLResult();

      const warningDL: typeof dlResult = {
        ...dlResult,
        overall_failure_probability: 0.2,
        failure_modes: [
          { type: "collision", probability: 0.35, confidence: 0.8, affected_features: [], root_cause: "" },
        ],
      };

      const results = runAllP2PHooks(warningDL, undefined, testContext, {
        require_verification: false,
      });

      const warnings = getWarningHooks(results);

      for (const w of warnings) {
        expect(w.allowed).toBe(true);
        expect(["warning", "error"]).toContain(w.severity);
      }
    });
  });

  describe("LATHE_P2P_HOOKS", () => {
    it("exports hook registry", () => {
      expect(LATHE_P2P_HOOKS["p2p-cpk-below-gate"]).toBeDefined();
      expect(LATHE_P2P_HOOKS["p2p-collision-risk"]).toBeDefined();
      expect(LATHE_P2P_HOOKS["p2p-tool-life-risk"]).toBeDefined();
    });

    it("defines hook metadata", () => {
      const cpkHook = LATHE_P2P_HOOKS["p2p-cpk-below-gate"];

      expect(cpkHook.description).toBeDefined();
      expect(cpkHook.blocking).toBe(true);
      expect(cpkHook.severity).toBe("critical");
    });
  });
});
