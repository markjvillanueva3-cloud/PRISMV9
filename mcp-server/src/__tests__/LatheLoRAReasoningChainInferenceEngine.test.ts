/**
 * LatheLoRAReasoningChainInferenceEngine Tests
 * LATHE-LORA-MS0 U-LLR26: Chain-of-thought reasoning
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAReasoningChainInferenceEngine, type ChainTemplate } from "../engines/LatheLoRAReasoningChainInferenceEngine.js";

describe("LatheLoRAReasoningChainInferenceEngine", () => {
  beforeEach(() => {
    latheLoRAReasoningChainInferenceEngine.reset();
  });

  describe("setConfig / getConfig", () => {
    it("has sensible defaults", () => {
      const config = latheLoRAReasoningChainInferenceEngine.getConfig();

      expect(config.max_steps).toBe(6);
      expect(config.confidence_threshold).toBe(0.7);
      expect(config.enable_validation).toBe(true);
    });

    it("allows config updates", () => {
      latheLoRAReasoningChainInferenceEngine.setConfig({
        max_steps: 10,
        confidence_threshold: 0.8,
      });

      const config = latheLoRAReasoningChainInferenceEngine.getConfig();
      expect(config.max_steps).toBe(10);
      expect(config.confidence_threshold).toBe(0.8);
    });
  });

  describe("getTemplates", () => {
    it("returns standard templates", () => {
      const templates = latheLoRAReasoningChainInferenceEngine.getTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.id === "speed-feed")).toBe(true);
      expect(templates.some(t => t.id === "gcode-generation")).toBe(true);
    });
  });

  describe("addTemplate", () => {
    it("adds custom template", () => {
      const custom: ChainTemplate = {
        id: "custom-template",
        name: "Custom",
        description: "Custom reasoning chain",
        steps: [
          { type: "understand", prompt_template: "Step 1: {query}" },
          { type: "conclude", prompt_template: "Step 2: conclude" },
        ],
        applicable_queries: ["custom"],
      };

      latheLoRAReasoningChainInferenceEngine.addTemplate(custom);

      const templates = latheLoRAReasoningChainInferenceEngine.getTemplates();
      expect(templates.find(t => t.id === "custom-template")).toBeDefined();
    });
  });

  describe("matchTemplate", () => {
    it("matches speed-feed template", () => {
      const template = latheLoRAReasoningChainInferenceEngine.matchTemplate(
        "What speed and feed should I use?"
      );
      expect(template?.id).toBe("speed-feed");
    });

    it("matches gcode-generation template", () => {
      const template = latheLoRAReasoningChainInferenceEngine.matchTemplate(
        "Generate G-code for facing operation"
      );
      expect(template?.id).toBe("gcode-generation");
    });

    it("matches troubleshoot template", () => {
      const template = latheLoRAReasoningChainInferenceEngine.matchTemplate(
        "Why am I getting chatter?"
      );
      expect(template?.id).toBe("troubleshoot");
    });

    it("returns null for no match", () => {
      const template = latheLoRAReasoningChainInferenceEngine.matchTemplate(
        "Hello world"
      );
      expect(template).toBeNull();
    });
  });

  describe("createChain", () => {
    it("creates chain from matched template", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain(
        "What SFM for 4140 steel?"
      );

      expect(chain.id).toBeDefined();
      expect(chain.original_query).toBe("What SFM for 4140 steel?");
      expect(chain.steps.length).toBeGreaterThan(0);
      expect(chain.status).toBe("pending");
    });

    it("creates generic chain when no template matches", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain(
        "Random question"
      );

      expect(chain.steps.length).toBe(4); // Generic 4-step chain
      expect(chain.steps[0].type).toBe("understand");
      expect(chain.steps[3].type).toBe("conclude");
    });

    it("uses provided template", () => {
      const template = latheLoRAReasoningChainInferenceEngine.getTemplates()[0];
      const chain = latheLoRAReasoningChainInferenceEngine.createChain(
        "Test query",
        template
      );

      expect(chain.steps.length).toBe(template.steps.length);
    });
  });

  describe("recordStepResponse", () => {
    it("records step response", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test query");

      const result = latheLoRAReasoningChainInferenceEngine.recordStepResponse(
        chain.id,
        1,
        "This is about machining parameters.",
        0.85,
        150
      );

      expect(result).toBe(true);

      const updated = latheLoRAReasoningChainInferenceEngine.getChain(chain.id);
      expect(updated?.steps[0].response).toBe("This is about machining parameters.");
      expect(updated?.steps[0].confidence).toBe(0.85);
      expect(updated?.status).toBe("running");
    });

    it("marks chain complete when all steps done", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test");

      for (let i = 0; i < chain.steps.length; i++) {
        latheLoRAReasoningChainInferenceEngine.recordStepResponse(
          chain.id,
          chain.steps[i].id,
          `Response ${i}`,
          0.8,
          100
        );
      }

      const updated = latheLoRAReasoningChainInferenceEngine.getChain(chain.id);
      expect(updated?.status).toBe("complete");
      expect(updated?.final_answer).toBeDefined();
    });

    it("returns false for unknown chain", () => {
      const result = latheLoRAReasoningChainInferenceEngine.recordStepResponse(
        "unknown",
        1,
        "Response",
        0.8,
        100
      );
      expect(result).toBe(false);
    });
  });

  describe("getChain / getAllChains", () => {
    it("retrieves chain by ID", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test");
      const retrieved = latheLoRAReasoningChainInferenceEngine.getChain(chain.id);

      expect(retrieved?.id).toBe(chain.id);
    });

    it("returns undefined for unknown ID", () => {
      expect(latheLoRAReasoningChainInferenceEngine.getChain("unknown")).toBeUndefined();
    });

    it("gets all chains", () => {
      latheLoRAReasoningChainInferenceEngine.createChain("Query 1");
      latheLoRAReasoningChainInferenceEngine.createChain("Query 2");

      const chains = latheLoRAReasoningChainInferenceEngine.getAllChains();
      expect(chains.length).toBe(2);
    });
  });

  describe("generatePrompts", () => {
    it("generates prompts for pending steps", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test query");
      const prompts = latheLoRAReasoningChainInferenceEngine.generatePrompts(chain.id);

      expect(prompts.length).toBe(chain.steps.length);
      expect(prompts[0].stepId).toBe(1);
    });

    it("excludes completed steps", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test");

      latheLoRAReasoningChainInferenceEngine.recordStepResponse(
        chain.id,
        1,
        "Done",
        0.9,
        100
      );

      const prompts = latheLoRAReasoningChainInferenceEngine.generatePrompts(chain.id);
      expect(prompts.find(p => p.stepId === 1)).toBeUndefined();
    });

    it("includes previous responses in context", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test");

      latheLoRAReasoningChainInferenceEngine.recordStepResponse(
        chain.id,
        1,
        "First step result",
        0.9,
        100
      );

      const prompts = latheLoRAReasoningChainInferenceEngine.generatePrompts(chain.id);
      expect(prompts[0].prompt).toContain("First step result");
    });
  });

  describe("validateChain", () => {
    it("validates chain with good confidence", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test");

      for (const step of chain.steps) {
        latheLoRAReasoningChainInferenceEngine.recordStepResponse(
          chain.id,
          step.id,
          "Good response",
          0.9,
          100
        );
      }

      const validation = latheLoRAReasoningChainInferenceEngine.validateChain(chain.id);
      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    it("reports low confidence steps", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test");

      latheLoRAReasoningChainInferenceEngine.recordStepResponse(
        chain.id,
        1,
        "Weak response",
        0.3,
        100
      );

      const validation = latheLoRAReasoningChainInferenceEngine.validateChain(chain.id);
      expect(validation.issues.some(i => i.includes("low confidence"))).toBe(true);
    });

    it("returns error for unknown chain", () => {
      const validation = latheLoRAReasoningChainInferenceEngine.validateChain("unknown");
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Chain not found");
    });
  });

  describe("getTrace", () => {
    it("generates trace for chain", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("What SFM for steel?");

      latheLoRAReasoningChainInferenceEngine.recordStepResponse(
        chain.id,
        1,
        "Understanding the material question.",
        0.85,
        120
      );

      const trace = latheLoRAReasoningChainInferenceEngine.getTrace(chain.id);

      expect(trace).toContain("Reasoning Trace");
      expect(trace).toContain("What SFM for steel?");
      expect(trace).toContain("Understanding the material question");
      expect(trace).toContain("85%");
    });

    it("returns error for unknown chain", () => {
      const trace = latheLoRAReasoningChainInferenceEngine.getTrace("unknown");
      expect(trace).toBe("Chain not found");
    });
  });

  describe("markFailed", () => {
    it("marks chain as failed", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test");

      latheLoRAReasoningChainInferenceEngine.markFailed(chain.id, 1, "Timeout error");

      const updated = latheLoRAReasoningChainInferenceEngine.getChain(chain.id);
      expect(updated?.status).toBe("failed");
      expect(updated?.steps[0].error).toBe("Timeout error");
    });
  });

  describe("deleteChain", () => {
    it("deletes chain", () => {
      const chain = latheLoRAReasoningChainInferenceEngine.createChain("Test");

      expect(latheLoRAReasoningChainInferenceEngine.deleteChain(chain.id)).toBe(true);
      expect(latheLoRAReasoningChainInferenceEngine.getChain(chain.id)).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      latheLoRAReasoningChainInferenceEngine.createChain("Test 1");
      latheLoRAReasoningChainInferenceEngine.createChain("Test 2");

      latheLoRAReasoningChainInferenceEngine.reset();

      expect(latheLoRAReasoningChainInferenceEngine.getAllChains().length).toBe(0);
    });
  });
});
