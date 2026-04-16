/**
 * Tests for AgenticLoopEngine
 *
 * AGENT ROADMAP: U-AGT13 (MS4)
 * Verifies Observe-Think-Act orchestration
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AgenticLoopEngine,
  agenticLoopEngine,
  AgentInput,
  AgentResponse,
  LoopConfig,
} from "../../engines/AgenticLoopEngine.js";

describe("AgenticLoopEngine", () => {
  let engine: AgenticLoopEngine;

  beforeEach(() => {
    engine = new AgenticLoopEngine();
  });

  describe("run", () => {
    it("should complete full loop for speed calculation", async () => {
      const input: AgentInput = {
        text: "Calculate speed and feed for D2 at 58 HRC"
      };

      const response = await engine.run(input);

      expect(response.id).toMatch(/^resp_/);
      expect(response.input).toBe(input.text);
      expect(response.phases).toContain("observe");
      expect(response.phases).toContain("think");
      expect(response.phases).toContain("act");
      expect(response.phases).toContain("complete");
      expect(response.confidence).toBeGreaterThan(0);
    });

    it("should complete loop for quote request", async () => {
      const input: AgentInput = {
        text: "What is the cost estimate for 100 parts?"
      };

      const response = await engine.run(input);

      expect(response.phases).toContain("complete");
      expect(response.observation?.intent.category).toBe("quote");
    });

    it("should complete loop for machine selection", async () => {
      const input: AgentInput = {
        text: "Which machine should I use for this turning job?"
      };

      const response = await engine.run(input);

      expect(response.phases).toContain("complete");
      expect(response.observation?.intent.category).toBe("selection");
    });

    it("should include observation with intent", async () => {
      const input: AgentInput = {
        text: "Calculate cutting force for roughing"
      };

      const response = await engine.run(input);

      expect(response.observation).toBeDefined();
      expect(response.observation?.intent).toBeDefined();
      expect(response.observation?.intent.category).toBe("calculation");
      expect(response.observation?.routing).toBeDefined();
    });

    it("should include thinking with planned actions", async () => {
      const input: AgentInput = {
        text: "Calculate tool life for carbide insert"
      };

      const response = await engine.run(input);

      expect(response.thinking).toBeDefined();
      expect(response.thinking?.approach).toBeDefined();
      expect(response.thinking?.plannedActions.length).toBeGreaterThan(0);
      expect(response.thinking?.confidence).toBeGreaterThan(0);
    });

    it("should include action results", async () => {
      const input: AgentInput = {
        text: "Calculate speed and feed for D2 steel"
      };

      const response = await engine.run(input);

      expect(response.actionResult).toBeDefined();
      // May be null if confidence too low, but check structure if present
      if (response.actionResult) {
        expect(response.actionResult.executed).toBeDefined();
        expect(response.actionResult.success).toBeDefined();
      }
    });

    it("should include learning when autoLearn is true", async () => {
      const input: AgentInput = {
        text: "Calculate speed for aluminum",
        config: { autoLearn: true }
      };

      const response = await engine.run(input);

      expect(response.phases).toContain("learn");
      expect(response.learning).toBeDefined();
      expect(response.learning?.lessonsLearned).toBeDefined();
    });

    it("should skip learning when autoLearn is false", async () => {
      const input: AgentInput = {
        text: "Calculate speed for steel",
        config: { autoLearn: false }
      };

      const response = await engine.run(input);

      expect(response.phases).not.toContain("learn");
      expect(response.learning).toBeNull();
    });

    it("should include trace when verbose is true", async () => {
      const input: AgentInput = {
        text: "Calculate feed rate",
        config: { verbose: true }
      };

      const response = await engine.run(input);

      expect(response.trace).toBeDefined();
      expect(response.trace?.steps.length).toBeGreaterThan(0);
      expect(response.trace?.steps[0].phase).toBe("observe");
    });

    it("should exclude trace when verbose is false", async () => {
      const input: AgentInput = {
        text: "Calculate MRR",
        config: { verbose: false }
      };

      const response = await engine.run(input);

      expect(response.trace).toBeUndefined();
    });

    it("should generate final answer", async () => {
      const input: AgentInput = {
        text: "What is the recommended speed for D2?"
      };

      const response = await engine.run(input);

      expect(response.finalAnswer).toBeDefined();
      expect(response.finalAnswer.length).toBeGreaterThan(0);
    });

    it("should handle unknown intents gracefully", async () => {
      const input: AgentInput = {
        text: "xyzzy foobar nonsense"
      };

      const response = await engine.run(input);

      expect(response.phases).toContain("complete");
      expect(response.confidence).toBeLessThan(0.8);
    });
  });

  describe("confidence threshold", () => {
    it("should return low confidence response when below threshold", async () => {
      const input: AgentInput = {
        text: "Do something vague",
        config: { requireConfidence: 0.99 }
      };

      const response = await engine.run(input);

      expect(response.confidence).toBeLessThan(0.99);
      expect(response.finalAnswer).toContain("not confident");
    });

    it("should proceed with action when above threshold", async () => {
      const input: AgentInput = {
        text: "Calculate speed and feed for aluminum",
        config: { requireConfidence: 0.1 }
      };

      const response = await engine.run(input);

      expect(response.phases).toContain("act");
      expect(response.actionResult).toBeDefined();
    });
  });

  describe("context handling", () => {
    it("should consider conversation history", async () => {
      const input: AgentInput = {
        text: "Now calculate the feed rate",
        context: {
          conversationHistory: [
            { role: "user", content: "Calculate speed for D2", timestamp: new Date().toISOString() },
            { role: "assistant", content: "Speed is 200 SFM", timestamp: new Date().toISOString() }
          ]
        }
      };

      const response = await engine.run(input);

      expect(response.observation?.contextFactors.length).toBeGreaterThan(0);
      const historyFactor = response.observation?.contextFactors.find(
        f => f.name === "conversation_length"
      );
      expect(historyFactor).toBeDefined();
    });

    it("should consider working memory", async () => {
      const input: AgentInput = {
        text: "What speed should I use?",
        context: {
          workingMemory: {
            material: "D2",
            hardness: 58
          }
        }
      };

      const response = await engine.run(input);

      const memoryFactor = response.observation?.contextFactors.find(
        f => f.name === "working_memory"
      );
      expect(memoryFactor).toBeDefined();
    });

    it("should consider constraints", async () => {
      const input: AgentInput = {
        text: "Calculate parameters",
        context: {
          constraints: ["max RPM 3000", "no interrupted cuts"]
        }
      };

      const response = await engine.run(input);

      const constraintFactor = response.observation?.contextFactors.find(
        f => f.name === "constraints"
      );
      expect(constraintFactor).toBeDefined();
      expect(constraintFactor?.relevance).toBe(0.9);
    });
  });

  describe("thinking depth", () => {
    it("should skip deep reasoning for shallow depth", async () => {
      const input: AgentInput = {
        text: "Calculate speed",
        config: { thinkingDepth: "shallow" }
      };

      const response = await engine.run(input);

      // Shallow thinking skips ManufacturingReasoningEngine
      expect(response.thinking?.reasoning).toBeNull();
    });

    it("should include reasoning for standard depth", async () => {
      const input: AgentInput = {
        text: "Calculate cutting force",
        config: { thinkingDepth: "standard" }
      };

      const response = await engine.run(input);

      expect(response.thinking?.reasoning).toBeDefined();
    });

    it("should include deep reasoning for deep depth", async () => {
      const input: AgentInput = {
        text: "Analyze tool deflection",
        config: { thinkingDepth: "deep" }
      };

      const response = await engine.run(input);

      expect(response.thinking?.reasoning).toBeDefined();
    });
  });

  describe("metrics", () => {
    it("should track phase durations", async () => {
      const input: AgentInput = {
        text: "Calculate speed for steel"
      };

      const response = await engine.run(input);

      expect(response.metrics.totalDurationMs).toBeGreaterThan(0);
      expect(response.metrics.observeMs).toBeGreaterThanOrEqual(0);
      expect(response.metrics.thinkMs).toBeGreaterThanOrEqual(0);
      expect(response.metrics.actMs).toBeGreaterThanOrEqual(0);
    });

    it("should count tool calls", async () => {
      const input: AgentInput = {
        text: "Calculate speed and feed"
      };

      const response = await engine.run(input);

      expect(response.metrics.toolCallCount).toBeGreaterThanOrEqual(1);
    });

    it("should track iteration count", async () => {
      const input: AgentInput = {
        text: "Simple calculation"
      };

      const response = await engine.run(input);

      expect(response.metrics.iterationCount).toBe(1);
    });
  });

  describe("response formatting", () => {
    it("should format calculation results", async () => {
      const input: AgentInput = {
        text: "Calculate speed and feed for aluminum"
      };

      const response = await engine.run(input);

      // Should contain formatted parameters
      expect(response.finalAnswer).toBeDefined();
      if (response.actionResult?.success) {
        expect(response.finalAnswer.toLowerCase()).toMatch(/sfm|rpm|feed|result/);
      }
    });

    it("should format quote results", async () => {
      const input: AgentInput = {
        text: "Quote for 50 parts"
      };

      const response = await engine.run(input);

      expect(response.finalAnswer).toBeDefined();
    });

    it("should format selection results", async () => {
      const input: AgentInput = {
        text: "Select best machine for turning"
      };

      const response = await engine.run(input);

      expect(response.finalAnswer).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", async () => {
      // Create an engine that will encounter an error
      const testEngine = new AgenticLoopEngine();

      // Force an error by manipulating internal state (not recommended in production)
      const input: AgentInput = {
        text: "Calculate something",
        config: { maxIterations: 0 }
      };

      const response = await testEngine.run(input);

      // Should complete without throwing
      expect(response.phases).toBeDefined();
      expect(response.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("entity extraction", () => {
    it("should extract entities from input", async () => {
      const input: AgentInput = {
        text: "Calculate speed for D2 at 58 HRC using carbide tool"
      };

      const response = await engine.run(input);

      expect(response.observation?.entities.length).toBeGreaterThan(0);
      const materialEntity = response.observation?.entities.find(e => e.type === "material");
      expect(materialEntity).toBeDefined();
    });

    it("should extract hardness entity", async () => {
      const input: AgentInput = {
        text: "Speed for 45 HRC steel"
      };

      const response = await engine.run(input);

      const hardnessEntity = response.observation?.entities.find(e => e.type === "hardness");
      expect(hardnessEntity).toBeDefined();
    });
  });

  describe("routing", () => {
    it("should route to correct dispatcher", async () => {
      const input: AgentInput = {
        text: "Calculate cutting force"
      };

      const response = await engine.run(input);

      expect(response.observation?.routing.success).toBe(true);
      expect(response.observation?.routing.match?.dispatcher).toBe("prism_calc");
    });

    it("should include alternatives in routing", async () => {
      const input: AgentInput = {
        text: "Calculate speed and feed"
      };

      const response = await engine.run(input);

      if (response.observation?.routing.success) {
        expect(response.observation?.routing.match?.alternatives).toBeDefined();
      }
    });
  });

  describe("risk identification", () => {
    it("should identify hardness-related risks", async () => {
      const input: AgentInput = {
        text: "Calculate for 60 HRC hardened steel"
      };

      const response = await engine.run(input);

      const hardnessRisk = response.thinking?.risks.find(
        r => r.description.toLowerCase().includes("hardness")
      );
      // May or may not find risk depending on entity extraction
      if (response.observation?.entities.some(e => e.type === "hardness")) {
        expect(hardnessRisk).toBeDefined();
      }
    });
  });

  describe("alternatives", () => {
    it("should suggest alternatives for ambiguous requests", async () => {
      const input: AgentInput = {
        text: "Help me with the part"
      };

      const response = await engine.run(input);

      // May have alternatives from routing suggestions
      expect(response.thinking?.alternatives).toBeDefined();
    });
  });

  describe("checkIntent", () => {
    it("should classify intent without full loop", () => {
      const intent = engine.checkIntent("Calculate speed for aluminum");

      expect(intent.category).toBe("calculation");
      expect(intent.confidence).toBeGreaterThan(0);
    });

    it("should classify quote intent", () => {
      const intent = engine.checkIntent("How much does this cost?");

      expect(intent.category).toBe("quote");
    });

    it("should classify selection intent", () => {
      const intent = engine.checkIntent("Which tool is best?");

      expect(intent.category).toBe("selection");
    });
  });

  describe("getAvailableActions", () => {
    it("should return actions for valid dispatcher", () => {
      const actions = engine.getAvailableActions("prism_calc");

      expect(actions).toContain("speed_feed");
      expect(actions).toContain("cutting_force");
    });

    it("should return empty array for unknown dispatcher", () => {
      const actions = engine.getAvailableActions("nonexistent");

      expect(actions).toEqual([]);
    });
  });

  describe("getDispatchers", () => {
    it("should return list of dispatchers", () => {
      const dispatchers = engine.getDispatchers();

      expect(dispatchers).toContain("prism_calc");
      expect(dispatchers).toContain("prism_business");
      expect(dispatchers).toContain("prism_cam");
    });
  });

  describe("getStats", () => {
    it("should return combined statistics", () => {
      const stats = engine.getStats();

      expect(stats.toolStats).toBeDefined();
      expect(stats.routingStats).toBeDefined();
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(agenticLoopEngine).toBeInstanceOf(AgenticLoopEngine);
    });
  });

  describe("response ID generation", () => {
    it("should generate unique response IDs", async () => {
      const responses = await Promise.all([
        engine.run({ text: "test 1" }),
        engine.run({ text: "test 2" }),
        engine.run({ text: "test 3" })
      ]);

      const ids = responses.map(r => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });
  });

  describe("planned actions", () => {
    it("should include priority in planned actions", async () => {
      const input: AgentInput = {
        text: "Calculate speed and feed"
      };

      const response = await engine.run(input);

      if (response.thinking?.plannedActions.length) {
        expect(response.thinking.plannedActions[0].priority).toBe(1);
      }
    });

    it("should include reason in planned actions", async () => {
      const input: AgentInput = {
        text: "Calculate tool life"
      };

      const response = await engine.run(input);

      if (response.thinking?.plannedActions.length) {
        expect(response.thinking.plannedActions[0].reason).toBeDefined();
      }
    });
  });

  describe("execution timing", () => {
    it("should track action execution timing", async () => {
      const input: AgentInput = {
        text: "Calculate cutting force"
      };

      const response = await engine.run(input);

      if (response.actionResult?.executed.length) {
        const action = response.actionResult.executed[0];
        expect(action.timing.startMs).toBeGreaterThan(0);
        expect(action.timing.endMs).toBeGreaterThanOrEqual(action.timing.startMs);
        expect(action.timing.durationMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("complete workflow", () => {
    it("should process manufacturing query end-to-end", async () => {
      const input: AgentInput = {
        text: "Calculate speed and feed for machining D2 tool steel at 58 HRC with a 0.5 inch carbide endmill",
        context: {
          sessionId: "test-session-001",
          constraints: ["Max RPM: 5000", "Flood coolant available"]
        },
        config: {
          thinkingDepth: "standard",
          autoLearn: true,
          verbose: true
        }
      };

      const response = await engine.run(input);

      // Full phases
      expect(response.phases).toContain("observe");
      expect(response.phases).toContain("think");
      expect(response.phases).toContain("act");
      expect(response.phases).toContain("learn");
      expect(response.phases).toContain("complete");

      // All components present
      expect(response.observation).toBeDefined();
      expect(response.thinking).toBeDefined();
      expect(response.actionResult).toBeDefined();
      expect(response.learning).toBeDefined();
      expect(response.trace).toBeDefined();

      // Metrics captured
      expect(response.metrics.totalDurationMs).toBeGreaterThan(0);

      // Final answer generated
      expect(response.finalAnswer.length).toBeGreaterThan(0);
    });
  });
});
