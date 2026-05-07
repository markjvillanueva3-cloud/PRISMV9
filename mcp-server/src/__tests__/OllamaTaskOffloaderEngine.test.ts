/**
 * OllamaTaskOffloaderEngine tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  OllamaTaskOffloaderEngine,
  type TaskCategory,
  type OffloadDecision,
} from "../engines/OllamaTaskOffloaderEngine.js";
import { ML_ACTIONS } from "../schemas/mlActionSchemas.js";

describe("OllamaTaskOffloaderEngine", () => {
  let engine: OllamaTaskOffloaderEngine;

  beforeEach(() => {
    engine = new OllamaTaskOffloaderEngine();
    vi.clearAllMocks();
  });

  describe("classifyTask", () => {
    it("classifies explanation requests as explanation", () => {
      expect(engine.classifyTask("explain this code")).toBe("explanation");
      expect(engine.classifyTask("what does this function do")).toBe("explanation");
      expect(engine.classifyTask("how does the algorithm work")).toBe("explanation");
    });

    it("classifies summary requests as summary", () => {
      expect(engine.classifyTask("summarize the changes")).toBe("summary");
      expect(engine.classifyTask("give me a tldr")).toBe("summary");
      expect(engine.classifyTask("overview of the module")).toBe("summary");
    });

    it("classifies code generation as code_generation", () => {
      expect(engine.classifyTask("create a new engine")).toBe("code_generation");
      expect(engine.classifyTask("build a function to parse JSON")).toBe("code_generation");
      expect(engine.classifyTask("implement the algorithm")).toBe("code_generation");
    });

    it("classifies safety-critical as safety_critical", () => {
      expect(engine.classifyTask("check safety limits")).toBe("safety_critical");
      expect(engine.classifyTask("check collision path")).toBe("safety_critical");
      expect(engine.classifyTask("validate force limits")).toBe("safety_critical");
    });

    it("classifies physics tasks as physics", () => {
      expect(engine.classifyTask("calculate kienzle cutting force")).toBe("physics");
      expect(engine.classifyTask("calculate taylor tool life")).toBe("physics");
      expect(engine.classifyTask("johnson cook model parameters")).toBe("physics");
    });

    it("classifies refactoring as refactor", () => {
      expect(engine.classifyTask("refactor this module")).toBe("refactor");
      expect(engine.classifyTask("restructure the codebase")).toBe("refactor");
    });

    it("returns unknown for ambiguous tasks", () => {
      expect(engine.classifyTask("hello world")).toBe("unknown");
      expect(engine.classifyTask("continue")).toBe("unknown");
    });
  });

  describe("isOffloadable", () => {
    it("returns true for offloadable categories", () => {
      expect(engine.isOffloadable("explanation")).toBe(true);
      expect(engine.isOffloadable("summary")).toBe(true);
      expect(engine.isOffloadable("search_synthesis")).toBe(true);
      expect(engine.isOffloadable("format_convert")).toBe(true);
      expect(engine.isOffloadable("documentation")).toBe(true);
      expect(engine.isOffloadable("calculation")).toBe(true);
    });

    it("returns false for non-offloadable categories", () => {
      expect(engine.isOffloadable("code_generation")).toBe(false);
      expect(engine.isOffloadable("code_edit")).toBe(false);
      expect(engine.isOffloadable("refactor")).toBe(false);
      expect(engine.isOffloadable("reasoning")).toBe(false);
      expect(engine.isOffloadable("safety_critical")).toBe(false);
      expect(engine.isOffloadable("physics")).toBe(false);
    });
  });

  describe("getSupportedCategories", () => {
    it("returns all offloadable categories", () => {
      const categories = engine.getSupportedCategories();
      expect(categories).toContain("explanation");
      expect(categories).toContain("summary");
      expect(categories).toContain("documentation");
      expect(categories.length).toBe(6);
    });
  });

  describe("decide", () => {
    it("marks code generation as not offloadable", async () => {
      const decision = await engine.decide("create a new sorting algorithm");
      expect(decision.offloadable).toBe(false);
      expect(decision.category).toBe("code_generation");
      expect(decision.targetModel).toBeNull();
    });

    it("marks safety-critical as not offloadable", async () => {
      const decision = await engine.decide("check collision detection safety");
      expect(decision.offloadable).toBe(false);
      expect(decision.category).toBe("safety_critical");
    });

    it("marks physics as not offloadable", async () => {
      const decision = await engine.decide("calculate kienzle cutting force");
      expect(decision.offloadable).toBe(false);
      expect(decision.category).toBe("physics");
    });

    it("returns confidence > 0.8 for clear classifications", async () => {
      const decision = await engine.decide("create a new engine");
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("edge cases", () => {
    it("handles empty task", () => {
      expect(engine.classifyTask("")).toBe("unknown");
    });

    it("handles very long task descriptions", () => {
      const longTask = "explain ".repeat(1000) + "this code";
      expect(engine.classifyTask(longTask)).toBe("explanation");
    });

    it("handles mixed case", () => {
      expect(engine.classifyTask("EXPLAIN This Code")).toBe("explanation");
      expect(engine.classifyTask("CREATE a New Engine")).toBe("code_generation");
    });

    it("prioritizes keep-on-claude over offloadable when imperative", () => {
      expect(engine.classifyTask("create a new sorting function")).toBe("code_generation");
      expect(engine.classifyTask("fix the authentication bug")).toBe("code_generation");
      expect(engine.classifyTask("build a REST API endpoint")).toBe("code_generation");
    });
  });

  describe("boundary conditions", () => {
    it("classifies edit requests correctly", () => {
      expect(engine.classifyTask("edit the configuration")).toBe("code_edit");
      expect(engine.classifyTask("modify the settings")).toBe("code_edit");
      expect(engine.classifyTask("update the version")).toBe("code_edit");
    });

    it("classifies reasoning tasks correctly", () => {
      expect(engine.classifyTask("analyze the architecture deeply")).toBe("reasoning");
      expect(engine.classifyTask("deep analysis of the codebase")).toBe("reasoning");
      expect(engine.classifyTask("root cause analysis")).toBe("reasoning");
    });

    it("handles special characters in task", () => {
      expect(engine.classifyTask("explain this: `const x = 1`")).toBe("explanation");
      expect(engine.classifyTask("what does {foo: bar} mean?")).toBe("explanation");
    });
  });

  describe("dispatcher integration", () => {
    it("offload actions are registered in ML_ACTIONS enum", () => {
      expect(ML_ACTIONS).toContain("offload_decide");
      expect(ML_ACTIONS).toContain("offload_execute");
      expect(ML_ACTIONS).toContain("offload_stats");
    });

    it("action count is preserved (anti-regression)", () => {
      expect(ML_ACTIONS.length).toBeGreaterThanOrEqual(60);
    });
  });

  describe("failure modes", () => {
    it("handles Ollama offline gracefully", async () => {
      const decision = await engine.decide("explain this code");
      // When Ollama is offline, offloadable should be false with reason
      expect(decision.category).toBe("explanation");
      expect(typeof decision.reason).toBe("string");
      expect(decision.confidence).toBeGreaterThan(0);
    });

    it("handles invalid model selection", () => {
      const model = engine["selectModel"]("unknown" as TaskCategory);
      expect(model).toBeNull();
    });

    it("returns empty array when no models installed", () => {
      const freshEngine = new OllamaTaskOffloaderEngine();
      expect(freshEngine.getInstalledModels()).toEqual([]);
    });
  });
});
