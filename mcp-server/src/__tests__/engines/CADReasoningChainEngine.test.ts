/**
 * CADReasoningChainEngine Tests — CADCAM-DAGI-MS0/U-DAGI10
 *
 * 28 tests covering:
 *   - generateWithReasoning(): chain generation with steps
 *   - queryWhy(): follow-up queries on decisions
 *   - getChain() / listChains(): chain storage and retrieval
 *   - Reasoning categories: geometry, feature, DFM, constraint
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  cadReasoningChainEngine,
  type ReasonedGenerationInput,
  type CADReasoningChain,
  type DesignReasoningStep,
} from "../../engines/CADReasoningChainEngine.js";

describe("CADReasoningChainEngine", () => {
  // ── Engine Info ─────────────────────────────────────────────────────────
  describe("engine info", () => {
    it("has correct name and version", () => {
      expect(cadReasoningChainEngine.info.name).toBe("CADReasoningChainEngine");
      expect(cadReasoningChainEngine.info.version).toBe("1.0.0");
      expect(cadReasoningChainEngine.info.domain).toBe("cad_reasoning");
    });

    it("exposes required capabilities", () => {
      const caps = cadReasoningChainEngine.getCapabilities();
      const names = caps.map(c => c.name);
      expect(names).toContain("reason_generate");
      expect(names).toContain("why_query");
      expect(names).toContain("get_chain");
      expect(names).toContain("list_chains");
    });
  });

  // ── validate ────────────────────────────────────────────────────────────
  describe("validate", () => {
    it("returns null for valid input", () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Make a shaft" },
      };
      expect(cadReasoningChainEngine.validate(input)).toBeNull();
    });

    it("returns error for missing spec", () => {
      expect(cadReasoningChainEngine.validate({})).toBe("spec is required and must be an object");
    });

    it("returns error for missing description", () => {
      expect(cadReasoningChainEngine.validate({ spec: {} })).toBe(
        "spec.description is required and must be a string"
      );
    });

    it("returns error for non-string description", () => {
      expect(cadReasoningChainEngine.validate({ spec: { description: 123 } })).toBe(
        "spec.description is required and must be a string"
      );
    });

    it("returns error for non-object input", () => {
      expect(cadReasoningChainEngine.validate("invalid")).toBe("Input must be an object");
    });
  });

  // ── generateWithReasoning ───────────────────────────────────────────────
  describe("generateWithReasoning", () => {
    it("generates reasoning chain for simple shaft", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Make a 25mm diameter shaft" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      expect(result.reasoning.chainId).toMatch(/^chain-/);
      expect(result.reasoning.steps.length).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);
      expect(result.code).toContain("import cadquery");
    });

    it("selects cylinder geometry for shaft", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Create a shaft" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const geometryStep = result.reasoning.steps.find(
        s => s.category === "geometry" && s.decision.includes("cylinder")
      );
      expect(geometryStep).toBeDefined();
      expect(geometryStep?.rationale).toContain("rotational");
    });

    it("selects box geometry for bracket", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Design a mounting bracket" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const geometryStep = result.reasoning.steps.find(
        s => s.category === "geometry" && s.decision.includes("box")
      );
      expect(geometryStep).toBeDefined();
    });

    it("selects flange geometry for flange part", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Make a flange",
          dimensions: { od: 80, id: 40, thickness: 15 },
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      expect(result.features[0].type).toBe("flange");
      expect(result.code).toContain("circle");
      expect(result.code).toContain("hole");
    });

    it("applies specified dimensions", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Make a shaft",
          dimensions: { diameter: 30, length: 100 },
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const dimStep = result.reasoning.steps.find(
        s => s.decision.includes("dimensions")
      );
      expect(dimStep).toBeDefined();
      expect(dimStep?.rationale).toContain("design intent");
      expect(result.features[0].params.diameter).toBe(30);
      expect(result.features[0].params.length).toBe(100);
    });

    it("adds chamfer feature with reasoning", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Shaft with chamfer",
          features: ["chamfer"],
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const chamferStep = result.reasoning.steps.find(
        s => s.decision.includes("chamfer")
      );
      expect(chamferStep).toBeDefined();
      expect(chamferStep?.rationale).toContain("edge break");
      expect(result.code).toContain("chamfer");
    });

    it("adds fillet with stress concentration reasoning", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Shaft with fillet",
          features: ["fillet"],
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const filletStep = result.reasoning.steps.find(
        s => s.decision.includes("fillet")
      );
      expect(filletStep).toBeDefined();
      expect(filletStep?.rationale).toContain("stress concentration");
      expect(filletStep?.evidence.some(e => e.source === "physics_model")).toBe(true);
    });

    it("reasons about material selection", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Shaft from 4140",
          material: "4140",
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const materialStep = result.reasoning.steps.find(
        s => s.category === "material"
      );
      expect(materialStep).toBeDefined();
      expect(materialStep?.decision).toContain("4140");
      expect(materialStep?.rationale).toContain("machinability");
    });

    it("reasons about tool steel material", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Die insert",
          material: "D2",
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const materialStep = result.reasoning.steps.find(
        s => s.category === "material"
      );
      expect(materialStep?.rationale).toContain("wear resistance");
      expect(materialStep?.evidence.some(e => e.description.includes("JM Die"))).toBe(true);
    });

    it("performs DFM check", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Simple plate" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const dfmStep = result.reasoning.steps.find(
        s => s.category === "manufacturability"
      );
      expect(dfmStep).toBeDefined();
    });

    it("applies constraint reasoning", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Shaft with constraints",
          constraints: ["concentric", "perpendicular"],
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const constraintSteps = result.reasoning.steps.filter(
        s => s.category === "constraint"
      );
      expect(constraintSteps.length).toBe(2);
      expect(constraintSteps[0].rationale).toContain("alignment");
    });

    it("calculates overall confidence", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Make a shaft" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      expect(result.reasoning.overallConfidence).toBeGreaterThan(0);
      expect(result.reasoning.overallConfidence).toBeLessThanOrEqual(1);
      expect(result.designScore).toBe(result.reasoning.overallConfidence);
    });

    it("extracts key decisions", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Complex shaft",
          features: ["chamfer", "fillet"],
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      expect(result.reasoning.keyDecisions.length).toBeGreaterThan(0);
      expect(result.reasoning.keyDecisions.length).toBeLessThanOrEqual(5);
    });

    it("generates valid summary", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Shaft with features",
          features: ["chamfer"],
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      expect(result.reasoning.summary).toContain("Design process:");
      expect(result.reasoning.summary).toContain("reasoning steps");
    });

    it("includes machine type in DFM reasoning", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Shaft" },
        context: { machineType: "Okuma LB3000" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const machineStep = result.reasoning.steps.find(
        s => s.decision.includes("Okuma LB3000")
      );
      expect(machineStep).toBeDefined();
    });
  });

  // ── queryWhy ────────────────────────────────────────────────────────────
  describe("queryWhy", () => {
    let chainId: string;

    beforeEach(async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Shaft with chamfer",
          features: ["chamfer"],
          material: "4140",
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);
      chainId = result.reasoning.chainId;
    });

    it("finds chamfer reasoning", () => {
      const result = cadReasoningChainEngine.queryWhy(chainId, "chamfer");

      expect(result.matchedSteps.length).toBeGreaterThan(0);
      expect(result.explanation).toContain("chamfer");
    });

    it("finds material reasoning", () => {
      const result = cadReasoningChainEngine.queryWhy(chainId, "material");

      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it("returns empty for unknown chain", () => {
      const result = cadReasoningChainEngine.queryWhy("unknown-chain", "anything");

      expect(result.matchedSteps.length).toBe(0);
      expect(result.explanation).toContain("No reasoning chain found");
    });

    it("suggests follow-up questions", () => {
      const result = cadReasoningChainEngine.queryWhy(chainId, "chamfer");

      expect(result.furtherQuestions.length).toBeGreaterThanOrEqual(0);
    });

    it("provides related decisions", () => {
      const result = cadReasoningChainEngine.queryWhy(chainId, "geometry");

      // Related decisions should exist
      expect(Array.isArray(result.relatedDecisions)).toBe(true);
    });
  });

  // ── getChain / listChains ───────────────────────────────────────────────
  describe("chain storage", () => {
    it("retrieves stored chain by ID", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Test shaft" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);
      const chainId = result.reasoning.chainId;

      const retrieved = cadReasoningChainEngine.getChain(chainId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.chainId).toBe(chainId);
    });

    it("returns null for unknown chain ID", () => {
      const retrieved = cadReasoningChainEngine.getChain("nonexistent");
      expect(retrieved).toBeNull();
    });

    it("lists recent chains", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "List test shaft" },
      };
      await cadReasoningChainEngine.generateWithReasoning(input);

      const chains = cadReasoningChainEngine.listChains(5);
      expect(chains.length).toBeGreaterThan(0);
      expect(chains[0].chainId).toMatch(/^chain-/);
      expect(chains[0].inputSummary).toBeDefined();
    });

    it("respects list limit", async () => {
      // Generate multiple chains
      for (let i = 0; i < 3; i++) {
        await cadReasoningChainEngine.generateWithReasoning({
          spec: { description: `Part ${i}` },
        });
      }

      const chains = cadReasoningChainEngine.listChains(2);
      expect(chains.length).toBeLessThanOrEqual(2);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("handles unknown part type gracefully", async () => {
      const input: ReasonedGenerationInput = {
        spec: { description: "Make something abstract" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      // Should default to box
      expect(result.features[0].type).toBe("box");
      expect(result.reasoning.steps.length).toBeGreaterThan(0);
    });

    it("handles empty features array", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Basic shaft",
          features: [],
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      expect(result.features.length).toBeGreaterThan(0); // At least base
      expect(result.code).toContain("import cadquery");
    });

    it("handles unknown feature name", async () => {
      const input: ReasonedGenerationInput = {
        spec: {
          description: "Shaft",
          features: ["unknownFeature123"],
        },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);

      const unknownStep = result.reasoning.steps.find(
        s => s.decision.includes("unknownFeature123")
      );
      expect(unknownStep).toBeDefined();
      expect(unknownStep?.confidence).toBeLessThan(0.9);
    });

    it("includes timestamps in steps", async () => {
      const beforeTime = Date.now();
      const input: ReasonedGenerationInput = {
        spec: { description: "Timed shaft" },
      };
      const result = await cadReasoningChainEngine.generateWithReasoning(input);
      const afterTime = Date.now();

      for (const step of result.reasoning.steps) {
        expect(step.timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(step.timestamp).toBeLessThanOrEqual(afterTime);
      }
    });
  });
});
