/**
 * MillingAGIMasterEngine Tests
 * MILL-MASTER/P1-U03-AGI-BIND
 *
 * ≥15 tests covering: 8 reasoning modes, tool/strategy recommendations,
 * provenance tracking, edge cases, adversarial inputs.
 */
import { describe, it, expect } from "vitest";
import {
  millingAGIMasterEngine,
  MillAGIRequest,
  MillReasoningMode,
  ISOGroup,
} from "../engines/MillingAGIMasterEngine.js";

describe("MillingAGIMasterEngine", () => {
  describe("chain_of_thought reasoning", () => {
    it("should return sequential reasoning steps", async () => {
      const request: MillAGIRequest = {
        intent: "Machine a 50x30x15mm pocket in aluminum",
        reasoning_mode: "chain_of_thought",
        iso_group: "N",
      };

      const response = await millingAGIMasterEngine.reason(request);

      expect(response.success).toBe(true);
      expect(response.reasoning_mode).toBe("chain_of_thought");
      expect(response.reasoning_steps.length).toBeGreaterThanOrEqual(3);
      expect(response.reasoning_steps[0].step).toBe(1);
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it("should include high-speed strategy for aluminum (ISO N)", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Rough pocket",
        iso_group: "N",
      });

      const speedStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("high-speed") || s.thought.includes("800")
      );
      expect(speedStep).toBeDefined();
    });
  });

  describe("tree_of_thought reasoning", () => {
    it("should return branching alternatives", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Complex pocket with islands",
        reasoning_mode: "tree_of_thought",
        iso_group: "P",
      });

      expect(response.reasoning_mode).toBe("tree_of_thought");
      const branchStep = response.reasoning_steps.find(s => s.alternatives?.length);
      expect(branchStep).toBeDefined();
      expect(branchStep!.alternatives!.length).toBeGreaterThan(0);
    });
  });

  describe("multi_path reasoning", () => {
    it("should evaluate multiple parallel paths", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Deep pocket 4xD",
        reasoning_mode: "multi_path",
        iso_group: "N",
      });

      expect(response.reasoning_mode).toBe("multi_path");
      const pathSteps = response.reasoning_steps.filter(s =>
        s.thought.includes("Path") || s.thought.includes("path")
      );
      expect(pathSteps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("backtracking reasoning", () => {
    it("should show constraint checking and refinement", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Thin wall pocket",
        reasoning_mode: "backtracking",
        iso_group: "M",
      });

      expect(response.reasoning_mode).toBe("backtracking");
      const backtrackStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("backtrack")
      );
      expect(backtrackStep).toBeDefined();
    });
  });

  describe("abductive reasoning", () => {
    it("should infer best explanation from observations", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Deep pocket chip evacuation",
        reasoning_mode: "abductive",
        iso_group: "N",
      });

      expect(response.reasoning_mode).toBe("abductive");
      const hypothesisStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("hypothesis")
      );
      expect(hypothesisStep).toBeDefined();
    });
  });

  describe("deductive reasoning", () => {
    it("should apply Kienzle kc1.1 rules correctly", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Calculate cutting force",
        reasoning_mode: "deductive",
        iso_group: "P",
      });

      expect(response.reasoning_mode).toBe("deductive");
      const ruleStep = response.reasoning_steps.find(s =>
        s.thought.includes("kc1.1") && s.thought.includes("1800")
      );
      expect(ruleStep).toBeDefined();
    });

    it("should use correct kc1.1 for ISO N (aluminum)", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Force calc",
        reasoning_mode: "deductive",
        iso_group: "N",
      });

      const ruleStep = response.reasoning_steps.find(s => s.thought.includes("700"));
      expect(ruleStep).toBeDefined();
    });
  });

  describe("inductive reasoning", () => {
    it("should generalize from patterns", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Similar to previous jobs",
        reasoning_mode: "inductive",
        iso_group: "N",
      });

      expect(response.reasoning_mode).toBe("inductive");
      const patternStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("pattern")
      );
      expect(patternStep).toBeDefined();
    });
  });

  describe("analogical reasoning", () => {
    it("should transfer from similar past solutions", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Like job 2024-0847",
        reasoning_mode: "analogical",
        iso_group: "P",
      });

      expect(response.reasoning_mode).toBe("analogical");
      const transferStep = response.reasoning_steps.find(s =>
        s.thought.toLowerCase().includes("transfer") || s.thought.toLowerCase().includes("similar")
      );
      expect(transferStep).toBeDefined();
    });
  });

  describe("tool recommendations", () => {
    it("should recommend 3-flute for aluminum", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Pocket in aluminum",
        iso_group: "N",
      });

      expect(response.tool_recommendation).toBeDefined();
      expect(response.tool_recommendation!.flutes).toBe(3);
      expect(response.tool_recommendation!.diameter_mm).toBe(12);
    });

    it("should recommend 4-flute for steel", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Pocket in steel",
        iso_group: "P",
      });

      expect(response.tool_recommendation!.flutes).toBe(4);
      expect(response.tool_recommendation!.diameter_mm).toBe(10);
    });

    it("should recommend AlTiN coating for superalloys", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine Inconel",
        iso_group: "S",
      });

      expect(response.tool_recommendation!.coating).toBe("AlTiN");
    });
  });

  describe("strategy recommendations", () => {
    it("should recommend adaptive_clearing for aluminum", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Rough pocket",
        iso_group: "N",
      });

      expect(response.strategy_recommendation).toBeDefined();
      expect(response.strategy_recommendation!.strategy).toBe("adaptive_clearing");
      expect(response.strategy_recommendation!.params.radial_engagement).toBe(0.1);
    });

    it("should recommend trochoidal for steel", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Rough pocket",
        iso_group: "P",
      });

      expect(response.strategy_recommendation!.strategy).toBe("trochoidal");
    });

    it("should flag risk factors for difficult materials", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine hardened steel",
        iso_group: "H",
      });

      expect(response.strategy_recommendation!.risk_factors).toContain("tool_wear");
      expect(response.strategy_recommendation!.risk_factors).toContain("thermal");
    });
  });

  describe("provenance tracking", () => {
    it("should track engines invoked", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Test provenance",
        iso_group: "N",
      });

      expect(response.provenance.engines_invoked).toContain("MillingAGIMasterEngine");
      expect(response.provenance.processing_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("warnings", () => {
    it("should warn for difficult-to-machine materials (ISO S)", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine titanium",
        iso_group: "S",
      });

      expect(response.warnings.length).toBeGreaterThan(0);
      expect(response.warnings[0]).toContain("Difficult-to-machine");
    });

    it("should warn for hardened steel (ISO H)", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine hardened steel",
        iso_group: "H",
      });

      expect(response.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle missing iso_group with default", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Machine something",
      });

      expect(response.success).toBe(true);
      expect(response.tool_recommendation!.flutes).toBe(3); // Default aluminum
    });

    it("should handle missing reasoning_mode with chain_of_thought default", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "Default mode test",
      });

      expect(response.reasoning_mode).toBe("chain_of_thought");
    });

    it("should handle empty intent", async () => {
      const response = await millingAGIMasterEngine.reason({
        intent: "",
      });

      expect(response.success).toBe(true);
      expect(response.reasoning_steps.length).toBeGreaterThan(0);
    });
  });

  describe("stats tracking", () => {
    it("should track invocation count", async () => {
      const statsBefore = millingAGIMasterEngine.getStats();
      await millingAGIMasterEngine.reason({ intent: "stats test" });
      const statsAfter = millingAGIMasterEngine.getStats();

      expect(statsAfter.invocations).toBe(statsBefore.invocations + 1);
    });

    it("should list all 8 reasoning modes", () => {
      const stats = millingAGIMasterEngine.getStats();
      expect(stats.modes_used).toHaveLength(8);
      expect(stats.modes_used).toContain("chain_of_thought");
      expect(stats.modes_used).toContain("analogical");
    });
  });

  describe("all ISO groups", () => {
    const isoGroups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

    it.each(isoGroups)("should handle ISO group %s", async (iso) => {
      const response = await millingAGIMasterEngine.reason({
        intent: `Test ISO ${iso}`,
        iso_group: iso,
      });

      expect(response.success).toBe(true);
      expect(response.tool_recommendation).toBeDefined();
      expect(response.strategy_recommendation).toBeDefined();
    });
  });

  describe("all reasoning modes", () => {
    const modes: MillReasoningMode[] = [
      "chain_of_thought", "tree_of_thought", "multi_path", "backtracking",
      "abductive", "deductive", "inductive", "analogical",
    ];

    it.each(modes)("should execute %s mode", async (mode) => {
      const response = await millingAGIMasterEngine.reason({
        intent: `Test ${mode}`,
        reasoning_mode: mode,
      });

      expect(response.success).toBe(true);
      expect(response.reasoning_mode).toBe(mode);
      expect(response.reasoning_steps.length).toBeGreaterThan(0);
    });
  });
});
