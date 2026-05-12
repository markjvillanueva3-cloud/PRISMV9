/**
 * Tests for IntentRouterEngine
 *
 * AGENT ROADMAP: U-AGT11 (MS4)
 * Verifies NL to action routing
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  IntentRouterEngine,
  intentRouterEngine,
  RoutingResult,
} from "../../engines/IntentRouterEngine.js";

describe("IntentRouterEngine", () => {
  let engine: IntentRouterEngine;

  beforeEach(() => {
    engine = new IntentRouterEngine();
  });

  describe("route", () => {
    it("should route speed and feed calculation", () => {
      const result = engine.route("Calculate speed and feed for D2 at 40 HRC");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_calc");
      expect(result.match?.action).toBe("speed_feed");
      expect(result.match?.confidence).toBeGreaterThan(0.3);
    });

    it("should route quote request", () => {
      const result = engine.route("Quote this part for 100 pieces");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_business");
      expect(result.match?.action).toBe("quote_estimate");
    });

    it("should route machine selection", () => {
      const result = engine.route("What machine should I use for this job?");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_cam");
      expect(result.match?.action).toBe("machine_selection");
    });

    it("should route tool selection", () => {
      const result = engine.route("Which tool should I use for finishing aluminum?");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_cam");
      expect(result.match?.action).toBe("tool_selection");
    });

    it("should route cutting force calculation", () => {
      const result = engine.route("Calculate cutting force for 0.100 DOC");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_calc");
      expect(result.match?.action).toBe("cutting_force");
    });

    it("should route tool life query", () => {
      const result = engine.route("How long will this tool last?");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_calc");
      expect(result.match?.action).toBe("tool_life");
    });

    it("should route deflection calculation", () => {
      const result = engine.route("What is the deflection of this tool?");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_calc");
      expect(result.match?.action).toBe("deflection");
    });

    it("should route safety check", () => {
      const result = engine.route("Is this safe to run?");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_safety");
      expect(result.match?.action).toBe("safety_check");
    });

    it("should route material lookup", () => {
      const result = engine.route("What are the material properties of D2?");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_data");
      expect(result.match?.action).toBe("material_lookup");
    });

    it("should route program validation", () => {
      const result = engine.route("Validate and check the NC code for errors");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_validate");
      expect(result.match?.action).toBe("program_check");
    });

    it("should route surface finish query", () => {
      const result = engine.route("What surface finish can I achieve?");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_quality");
      expect(result.match?.action).toBe("surface_finish");
    });

    it("should provide alternatives", () => {
      const result = engine.route("Calculate speed and feed for machining");

      expect(result.success).toBe(true);
      expect(result.match?.alternatives).toBeDefined();
      expect(Array.isArray(result.match?.alternatives)).toBe(true);
    });

    it("should handle ambiguous queries", () => {
      const result = engine.route("Help me with this part");

      // May or may not find a match, but should not throw
      expect(result).toBeDefined();
      expect(result.intent).toBeDefined();
    });

    it("should extract parameters from input", () => {
      const result = engine.route("Calculate speed and feed for D2 at 58 HRC");

      expect(result.success).toBe(true);
      expect(result.match?.parameters).toBeDefined();
      expect(result.match?.parameters.material).toBe("D2");
      expect(result.match?.parameters.hardness).toBeDefined();
    });

    it("should complete quickly", () => {
      const result = engine.route("Calculate speed and feed for aluminum");

      expect(result.routingTimeMs).toBeLessThan(200);
    });

    it("should provide suggestions for failed routing", () => {
      const result = engine.route("xyzzy");

      if (!result.success) {
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("classifyIntent", () => {
    it("should classify calculation intents", () => {
      const intent = engine.classifyIntent("Calculate the cutting force");

      expect(intent.category).toBe("calculation");
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it("should classify quote intents", () => {
      const intent = engine.classifyIntent("What is the cost estimate for this job?");

      expect(intent.category).toBe("quote");
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it("should classify selection intents", () => {
      const intent = engine.classifyIntent("Which machine is best?");

      expect(intent.category).toBe("selection");
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it("should classify query intents", () => {
      const intent = engine.classifyIntent("Tell me about the properties of D2 steel");

      expect(intent.category).toBe("query");
      expect(intent.confidence).toBeGreaterThan(0.5);
    });

    it("should classify validation intents", () => {
      const intent = engine.classifyIntent("Check if this is safe");

      expect(intent.category).toBe("validation");
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it("should classify generation intents", () => {
      const intent = engine.classifyIntent("Generate a toolpath");

      expect(intent.category).toBe("generation");
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it("should classify comparison intents", () => {
      const intent = engine.classifyIntent("Compare D2 versus S7");

      expect(intent.category).toBe("comparison");
      expect(intent.confidence).toBeGreaterThan(0.7);
    });

    it("should detect subcategory from entities", () => {
      const intent = engine.classifyIntent("Calculate for D2 steel");

      expect(intent.subcategory).toBe("material-related");
    });
  });

  describe("extractEntities", () => {
    it("should extract material entities", () => {
      const entities = engine.extractEntities("D2 tool steel at 58 HRC");

      const material = entities.find(e => e.type === "material");
      expect(material).toBeDefined();
      expect(material?.value).toContain("D2");
    });

    it("should extract hardness entities", () => {
      const entities = engine.extractEntities("Material hardness is 58 HRC");

      const hardness = entities.find(e => e.type === "hardness");
      expect(hardness).toBeDefined();
      expect(hardness?.value).toContain("58");
    });

    it("should extract machine entities", () => {
      const entities = engine.extractEntities("Use the Okuma lathe");

      const machine = entities.find(e => e.type === "machine");
      expect(machine).toBeDefined();
      expect(machine?.value.toLowerCase()).toContain("okuma");
    });

    it("should extract tool entities", () => {
      const entities = engine.extractEntities("0.5 inch endmill carbide");

      const tool = entities.find(e => e.type === "tool");
      expect(tool).toBeDefined();
    });

    it("should extract operation entities", () => {
      const entities = engine.extractEntities("Roughing operation on OD");

      const operation = entities.find(e => e.type === "operation");
      expect(operation).toBeDefined();
    });

    it("should extract dimension entities", () => {
      const entities = engine.extractEntities("2.5 inch diameter");

      const dimension = entities.find(e => e.type === "dimension");
      expect(dimension).toBeDefined();
    });

    it("should extract speed entities", () => {
      const entities = engine.extractEntities("Run at 500 SFM");

      const speed = entities.find(e => e.type === "speed");
      expect(speed).toBeDefined();
      expect(speed?.value).toContain("500");
    });

    it("should extract feed entities", () => {
      const entities = engine.extractEntities("Feed rate 0.004 IPR");

      const feed = entities.find(e => e.type === "feed");
      expect(feed).toBeDefined();
    });

    it("should extract quantity entities", () => {
      const entities = engine.extractEntities("Make 100 parts");

      const quantity = entities.find(e => e.type === "quantity");
      expect(quantity).toBeDefined();
    });

    it("should deduplicate entities", () => {
      const entities = engine.extractEntities("D2 D2 D2 steel");

      const materials = entities.filter(e => e.type === "material" && e.value.includes("D2"));
      expect(materials.length).toBe(1);
    });

    it("should normalize entity values", () => {
      const entities = engine.extractEntities("d2 tool steel");

      const material = entities.find(e => e.type === "material" && e.value.toLowerCase() === "d2");
      expect(material?.normalized).toBe("D2");
    });
  });

  describe("getAvailableRoutes", () => {
    it("should return all available routes", () => {
      const routes = engine.getAvailableRoutes();

      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0]).toHaveProperty("dispatcher");
      expect(routes[0]).toHaveProperty("action");
      expect(routes[0]).toHaveProperty("keywords");
    });

    it("should include prism_calc routes", () => {
      const routes = engine.getAvailableRoutes();
      const calcRoutes = routes.filter(r => r.dispatcher === "prism_calc");

      expect(calcRoutes.length).toBeGreaterThan(0);
    });
  });

  describe("addRule", () => {
    it("should add custom routing rule", () => {
      engine.addRule({
        patterns: ["custom\\s*action"],
        keywords: ["custom", "special"],
        dispatcher: "prism_custom",
        action: "special_action",
        priority: 10
      });

      const result = engine.route("Do the custom action");

      expect(result.success).toBe(true);
      expect(result.match?.dispatcher).toBe("prism_custom");
      expect(result.match?.action).toBe("special_action");
    });
  });

  describe("getStats", () => {
    it("should return routing statistics", () => {
      const stats = engine.getStats();

      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.dispatchers.length).toBeGreaterThan(0);
      expect(stats.topKeywords.length).toBeGreaterThan(0);
    });

    it("should include common dispatchers", () => {
      const stats = engine.getStats();

      expect(stats.dispatchers).toContain("prism_calc");
      expect(stats.dispatchers).toContain("prism_business");
      expect(stats.dispatchers).toContain("prism_cam");
    });
  });

  describe("routing accuracy", () => {
    it("should route accurately for common queries", () => {
      const testCases = [
        { input: "What SFM for aluminum?", expected: "prism_calc:speed_feed" },
        { input: "How much to make this?", expected: "prism_business:quote_estimate" },
        { input: "Select the best machine", expected: "prism_cam:machine_selection" },
        { input: "Check tool life", expected: "prism_calc:tool_life" },
        { input: "Validate the program", expected: "prism_validate:program_check" }
      ];

      let correct = 0;
      for (const tc of testCases) {
        const result = engine.route(tc.input);
        if (result.success && result.match?.fullAction === tc.expected) {
          correct++;
        }
      }

      const accuracy = correct / testCases.length;
      expect(accuracy).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(intentRouterEngine).toBeInstanceOf(IntentRouterEngine);
    });
  });
});
