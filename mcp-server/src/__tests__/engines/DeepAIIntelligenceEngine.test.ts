/**
 * Tests for DeepAIIntelligenceEngine
 *
 * Verifies Claude Opus-level deep reasoning, learning, logic, and LLM CLI capabilities
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  deepAIIntelligenceEngine,
  DeepAIIntelligenceEngine,
  type IntelligenceContext,
  type ReasoningMode,
  type LearningMode,
  type LogicMode
} from "../../engines/DeepAIIntelligenceEngine.js";

describe("DeepAIIntelligenceEngine", () => {
  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(deepAIIntelligenceEngine).toBeInstanceOf(DeepAIIntelligenceEngine);
    });

    it("provides summary", () => {
      const summary = deepAIIntelligenceEngine.getSummary();
      expect(summary).toContain("DeepAIIntelligenceEngine");
      expect(summary).toContain("Claude Opus-level");
      expect(summary).toContain("Deep reasoning");
      expect(summary).toContain("LLM CLI");
    });
  });

  describe("deepReason", () => {
    it("performs chain-of-thought reasoning", async () => {
      const context: IntelligenceContext = {
        query: "What cutting speed should I use for D2 steel?",
        domain: "machining",
        constraints: ["tool life > 30 minutes", "surface finish Ra < 1.6"]
      };

      const result = await deepAIIntelligenceEngine.deepReason(context, "chain_of_thought");

      expect(result.query).toBe(context.query);
      expect(result.mode).toBe("chain_of_thought");
      expect(result.steps.length).toBeGreaterThanOrEqual(5);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.conclusion).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it("never returns zero suggestions — falls back to domain reasoning when the awareness index is cold", async () => {
      // A nonsense query produces no awareness-index match (proactiveReason returns
      // empty arrays), so suggestions must come from the engine's OWN domain reasoning
      // (the U-DEEPAI-SUGGEST-TIMING-FIX fallback) instead of []. Pins the fallback
      // path + its "Primary approach:" shape against regression.
      const result = await deepAIIntelligenceEngine.deepReason({
        query: "xyzzy plugh frobnicate qqq",
        domain: "uncategorized_nonexistent_domain"
      });
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.startsWith("Primary approach:"))).toBe(true);
    });

    it("applies domain-specific reasoning for manufacturing", async () => {
      const context: IntelligenceContext = {
        query: "Calculate cutting force for milling operation",
        domain: "cutting forces"
      };

      const result = await deepAIIntelligenceEngine.deepReason(context, "deductive");

      expect(result.steps.some(s =>
        s.thought.includes("physics") || s.observation?.includes("Kienzle")
      )).toBe(true);
    });

    it("applies business reasoning for quotes", async () => {
      const context: IntelligenceContext = {
        query: "Quote this part for ALCOA",
        domain: "quote pricing"
      };

      const result = await deepAIIntelligenceEngine.deepReason(context, "multi_path");

      expect(result.steps.some(s =>
        s.observation?.includes("cost") || s.observation?.includes("material")
      )).toBe(true);
    });

    it("applies quality reasoning for tolerances", async () => {
      const context: IntelligenceContext = {
        query: "Can we hold +/-0.001 on this bore?",
        domain: "quality tolerance"
      };

      const result = await deepAIIntelligenceEngine.deepReason(context);

      expect(result.steps.some(s =>
        s.observation?.includes("capability") || s.observation?.includes("Cpk")
      )).toBe(true);
    });

    it("applies safety reasoning for collision detection", async () => {
      const context: IntelligenceContext = {
        query: "Check if this toolpath has collision risk",
        domain: "safety collision"
      };

      const result = await deepAIIntelligenceEngine.deepReason(context);

      expect(result.steps.some(s =>
        s.action?.includes("safety") || s.observation?.includes("S(x)")
      )).toBe(true);
      expect(result.steps.some(s => s.confidence >= 0.9)).toBe(true);
    });

    it("respects maxReasoningDepth", async () => {
      const context: IntelligenceContext = {
        query: "Simple query",
        domain: "general",
        maxReasoningDepth: 3
      };

      const result = await deepAIIntelligenceEngine.deepReason(context);
      expect(result.steps.length).toBeLessThanOrEqual(10);
    });

    it("generates suggestions from PRISM capabilities", async () => {
      const context: IntelligenceContext = {
        query: "Calculate speed and feed for aluminum turning",
        domain: "speed_feed"
      };

      const result = await deepAIIntelligenceEngine.deepReason(context);

      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("identifies uncertainties", async () => {
      const context: IntelligenceContext = {
        query: "Exotic material with unknown properties",
        domain: "unknown",
        constraints: ["strict tolerance"]
      };

      const result = await deepAIIntelligenceEngine.deepReason(context);

      expect(result.uncertainties.length).toBeGreaterThan(0);
    });

    it("supports all reasoning modes", async () => {
      const modes: ReasoningMode[] = [
        "chain_of_thought", "tree_of_thought", "multi_path", "backtracking",
        "abductive", "deductive", "inductive", "analogical"
      ];

      const context: IntelligenceContext = {
        query: "Test reasoning mode",
        domain: "test"
      };

      for (const mode of modes) {
        const result = await deepAIIntelligenceEngine.deepReason(context, mode);
        expect(result.mode).toBe(mode);
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });
  });

  describe("deepLearn", () => {
    it("recognizes patterns in data", async () => {
      const data = [
        { operation: "turning", speed: 200, result: "good" },
        { operation: "turning", speed: 200, result: "good" },
        { operation: "turning", speed: 250, result: "poor" }
      ];

      const result = await deepAIIntelligenceEngine.deepLearn(data, "pattern_recognition");

      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("identifies transfer learning opportunities", async () => {
      const data = [
        { domain: "turning", technique: "roughing" },
        { domain: "milling", technique: "roughing" }
      ];

      const result = await deepAIIntelligenceEngine.deepLearn(data, "transfer_learning");

      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("generates actionable recommendations", async () => {
      const data = [{ pattern: "repeated_operation" }];

      const result = await deepAIIntelligenceEngine.deepLearn(data);

      const actionablePatterns = result.patterns.filter(p => p.actionable);
      expect(actionablePatterns.length).toBeGreaterThan(0);
      expect(actionablePatterns[0].suggestedAction).toBeDefined();
    });

    it("extracts transferable knowledge", async () => {
      const data = [{ type: "knowledge_item" }];

      const result = await deepAIIntelligenceEngine.deepLearn(data);

      expect(result.transferableKnowledge).toBeDefined();
      expect(Array.isArray(result.transferableKnowledge)).toBe(true);
    });

    it("supports all learning modes", async () => {
      const modes: LearningMode[] = [
        "pattern_recognition", "transfer_learning", "reinforcement",
        "few_shot", "zero_shot", "meta_learning", "continuous"
      ];

      for (const mode of modes) {
        const result = await deepAIIntelligenceEngine.deepLearn([{ test: true }], mode);
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("deepLogic", () => {
    it("performs logical inference from premises", async () => {
      const premises = [
        "The cutting speed is too high for this material",
        "The tolerance is tight at 0.0005"
      ];

      const result = await deepAIIntelligenceEngine.deepLogic(premises, "first_order");

      expect(result.premises).toEqual(premises);
      expect(result.inferences.length).toBeGreaterThan(0);
      expect(result.conclusion).toBeDefined();
    });

    it("infers tool life impact from high speed", async () => {
      const premises = ["cutting speed too high"];

      const result = await deepAIIntelligenceEngine.deepLogic(premises);

      expect(result.inferences.some(i =>
        i.includes("tool life") || i.includes("thermal")
      )).toBe(true);
    });

    it("infers finishing requirements from tight tolerance", async () => {
      const premises = ["tolerance is tight at 0.001"];

      const result = await deepAIIntelligenceEngine.deepLogic(premises);

      expect(result.inferences.some(i =>
        i.includes("finishing") || i.includes("thermal")
      )).toBe(true);
    });

    it("infers support needs for thin wall", async () => {
      const premises = ["thin wall feature 0.5mm"];

      const result = await deepAIIntelligenceEngine.deepLogic(premises);

      expect(result.inferences.some(i =>
        i.includes("support") || i.includes("cutting forces")
      )).toBe(true);
    });

    it("checks constraint satisfaction", async () => {
      const premises = ["Machine has 5000 RPM limit", "Required speed is 6000 RPM"];

      const result = await deepAIIntelligenceEngine.deepLogic(premises, "constraint");

      expect(result.constraints.length).toBeGreaterThan(0);
      expect(result.constraints[0]).toHaveProperty("satisfied");
    });

    it("calculates soundness", async () => {
      const premises = ["A implies B", "A is true"];

      const result = await deepAIIntelligenceEngine.deepLogic(premises);

      expect(result.soundness).toBeGreaterThanOrEqual(0);
      expect(result.soundness).toBeLessThanOrEqual(1);
    });

    it("handles empty premises", async () => {
      const result = await deepAIIntelligenceEngine.deepLogic([]);

      expect(result.soundness).toBe(0);
      expect(result.conclusion).toContain("No conclusions");
    });

    it("supports all logic modes", async () => {
      const modes: LogicMode[] = [
        "propositional", "first_order", "modal", "temporal",
        "fuzzy", "constraint", "probabilistic"
      ];

      for (const mode of modes) {
        const result = await deepAIIntelligenceEngine.deepLogic(["premise"], mode);
        expect(result).toBeDefined();
        expect(result.premises).toEqual(["premise"]);
      }
    });
  });

  describe("extendedThinking", () => {
    it("performs 7-phase extended thinking analysis", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "Should we use HSS or carbide for this job?"
      );

      expect(result.query).toBe("Should we use HSS or carbide for this job?");
      expect(result.thinkingProcess).toContain("PHASE 1");
      expect(result.thinkingProcess).toContain("PHASE 7");
    });

    it("analyzes multiple aspects", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "How should we machine this CNC part with tight tolerance?"
      );

      expect(result.analysis.aspects.length).toBeGreaterThan(0);
      expect(result.analysis.aspects.some(a =>
        a.includes("Technical") || a.includes("Quality")
      )).toBe(true);
    });

    it("evaluates trade-offs", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "Balance speed vs quality for this operation"
      );

      expect(result.analysis.tradeoffs.length).toBeGreaterThan(0);
      expect(result.analysis.tradeoffs.some(t => t.includes("vs"))).toBe(true);
    });

    it("assesses risks", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "What are the risks of this machining approach?"
      );

      expect(result.analysis.risks.length).toBeGreaterThan(0);
      expect(result.analysis.risks.some(r => r.includes("Risk"))).toBe(true);
    });

    it("identifies opportunities", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "How can we optimize this process?"
      );

      expect(result.analysis.opportunities.length).toBeGreaterThan(0);
    });

    it("synthesizes findings", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "Comprehensive analysis request"
      );

      expect(result.synthesis).toBeDefined();
      expect(result.synthesis.length).toBeGreaterThan(0);
    });

    it("provides recommendation with confidence", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "What approach should we take?"
      );

      expect(result.recommendation).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("generates alternative approaches", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "What are our options?"
      );

      expect(result.alternativeApproaches.length).toBeGreaterThan(0);
      expect(result.alternativeApproaches.some(a => a.includes("approach"))).toBe(true);
    });

    it("recognizes cost/quote queries", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "What should we quote for this job?"
      );

      expect(result.analysis.aspects.some(a =>
        a.includes("Economic") || a.includes("cost")
      )).toBe(true);
    });

    it("recognizes time/schedule queries", async () => {
      const result = await deepAIIntelligenceEngine.extendedThinking(
        "What is the delivery time for this order?"
      );

      expect(result.analysis.aspects.some(a =>
        a.includes("Temporal") || a.includes("Lead time")
      )).toBe(true);
    });
  });

  describe("processNaturalLanguage (LLM CLI)", () => {
    it("processes natural language input", async () => {
      const result = await deepAIIntelligenceEngine.processNaturalLanguage(
        "Calculate speed and feed for aluminum turning"
      );

      expect(result.naturalLanguageInput).toBe("Calculate speed and feed for aluminum turning");
      expect(result.interpretedIntent).toBeDefined();
      expect(result.mappedAction).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("extracts material parameters", async () => {
      const result = await deepAIIntelligenceEngine.processNaturalLanguage(
        "What cutting speed for steel?"
      );

      expect(result.parameters.material).toBe("steel");
    });

    it("extracts operation parameters", async () => {
      const result = await deepAIIntelligenceEngine.processNaturalLanguage(
        "Set up for drilling operation"
      );

      expect(result.parameters.operation).toBe("drilling");
    });

    it("extracts numeric values", async () => {
      const result = await deepAIIntelligenceEngine.processNaturalLanguage(
        "Cut at 200 RPM with 0.010 feed"
      );

      expect(result.parameters.numericValues).toBeDefined();
      expect(result.parameters.numericValues).toContain(200);
      expect(result.parameters.numericValues).toContain(0.010);
    });

    it("generates execution plan", async () => {
      const result = await deepAIIntelligenceEngine.processNaturalLanguage(
        "Analyze this part"
      );

      expect(result.executionPlan.length).toBeGreaterThan(0);
      expect(result.executionPlan[0]).toContain("1.");
    });

    it("provides alternative actions", async () => {
      const result = await deepAIIntelligenceEngine.processNaturalLanguage(
        "Help me with this machining task"
      );

      expect(result.alternatives).toBeDefined();
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it("handles various material types", async () => {
      const materials = ["titanium", "inconel", "brass", "copper", "carbide"];

      for (const material of materials) {
        const result = await deepAIIntelligenceEngine.processNaturalLanguage(
          `Cutting parameters for ${material}`
        );
        expect(result.parameters.material).toBe(material);
      }
    });

    it("handles various operation types", async () => {
      const operations = ["milling", "grinding", "edm", "threading"];

      for (const operation of operations) {
        const result = await deepAIIntelligenceEngine.processNaturalLanguage(
          `Set up for ${operation}`
        );
        expect(result.parameters.operation).toBe(operation);
      }
    });
  });

  describe("enhanceSkill", () => {
    it("enhances a skill with AI capabilities", async () => {
      const result = await deepAIIntelligenceEngine.enhanceSkill(
        "speed-feed",
        { material: "steel", operation: "turning" }
      );

      expect(result.skillId).toBe("speed-feed");
      expect(result.enhancementType).toBe("reasoning");
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.aiInsights.length).toBeGreaterThan(0);
      expect(result.riskAssessment).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("provides AI insights for skill enhancement", async () => {
      const result = await deepAIIntelligenceEngine.enhanceSkill(
        "quote",
        { customer: "ALCOA" }
      );

      expect(result.aiInsights.some(i => i.includes("reasoning") || i.includes("knowledge"))).toBe(true);
    });
  });

  describe("enhanceHook", () => {
    it("enhances a pre-phase hook", async () => {
      const result = await deepAIIntelligenceEngine.enhanceHook(
        "physics-validator",
        "pre",
        { force: 500, limit: 1000 }
      );

      expect(result.hookName).toBe("physics-validator");
      expect(result.phase).toBe("pre");
      expect(typeof result.aiValidation).toBe("boolean");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("enhances a post-phase hook", async () => {
      const result = await deepAIIntelligenceEngine.enhanceHook(
        "result-validator",
        "post",
        { result: "success" }
      );

      expect(result.phase).toBe("post");
      expect(Array.isArray(result.autoCorrections)).toBe(true);
    });

    it("provides block recommendation based on validation", async () => {
      const result = await deepAIIntelligenceEngine.enhanceHook(
        "safety-check",
        "pre",
        { unsafe: true }
      );

      expect(typeof result.blockRecommendation).toBe("boolean");
    });
  });

  describe("assistSlashCommand", () => {
    it("assists with slash command understanding", async () => {
      const result = await deepAIIntelligenceEngine.assistSlashCommand(
        "speed-feed",
        ["--material", "steel"]
      );

      expect(result.understanding).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.autoComplete.length).toBeGreaterThan(0);
      expect(result.relatedCommands.length).toBeGreaterThan(0);
    });

    it("provides auto-complete for speed-feed command", async () => {
      const result = await deepAIIntelligenceEngine.assistSlashCommand(
        "speed-feed",
        []
      );

      expect(result.autoComplete.some(c => c.includes("--material"))).toBe(true);
      expect(result.autoComplete.some(c => c.includes("--operation"))).toBe(true);
    });

    it("provides auto-complete for quote command", async () => {
      const result = await deepAIIntelligenceEngine.assistSlashCommand(
        "quote",
        []
      );

      expect(result.autoComplete.some(c => c.includes("--customer"))).toBe(true);
    });

    it("provides auto-complete for program command", async () => {
      const result = await deepAIIntelligenceEngine.assistSlashCommand(
        "program",
        []
      );

      expect(result.autoComplete.some(c => c.includes("--machine"))).toBe(true);
    });

    it("finds related commands for speed-feed", async () => {
      const result = await deepAIIntelligenceEngine.assistSlashCommand(
        "speed-feed",
        []
      );

      expect(result.relatedCommands).toContain("/tool-life");
      expect(result.relatedCommands).toContain("/cutting-force");
    });

    it("finds related commands for quote", async () => {
      const result = await deepAIIntelligenceEngine.assistSlashCommand(
        "quote",
        []
      );

      expect(result.relatedCommands).toContain("/lead-time");
      expect(result.relatedCommands).toContain("/cost-analysis");
    });

    it("finds related commands for analyze", async () => {
      const result = await deepAIIntelligenceEngine.assistSlashCommand(
        "analyze",
        []
      );

      expect(result.relatedCommands).toContain("/reason");
      expect(result.relatedCommands).toContain("/diagnose");
    });

    it("provides default related commands for unknown command", async () => {
      const result = await deepAIIntelligenceEngine.assistSlashCommand(
        "unknown-command",
        []
      );

      expect(result.relatedCommands).toContain("/help");
      expect(result.relatedCommands).toContain("/search");
    });
  });

  describe("integration scenarios", () => {
    it("full pipeline: natural language -> reasoning -> suggestions", async () => {
      // Step 1: Parse natural language
      const nlResult = await deepAIIntelligenceEngine.processNaturalLanguage(
        "How should I machine this D2 steel part with 0.001 tolerance?"
      );

      expect(nlResult.parameters.material).toBe("steel");

      // Step 2: Deep reasoning on the interpreted intent
      const reasoningResult = await deepAIIntelligenceEngine.deepReason({
        query: nlResult.interpretedIntent,
        domain: "machining"
      });

      expect(reasoningResult.suggestions.length).toBeGreaterThan(0);

      // Step 3: Extended thinking for complex decision
      const thinkingResult = await deepAIIntelligenceEngine.extendedThinking(
        nlResult.interpretedIntent
      );

      expect(thinkingResult.recommendation).toBeDefined();
    });

    it("learning from repeated operations", async () => {
      const operations = [
        { material: "D2", speed: 150, result: "good" },
        { material: "D2", speed: 150, result: "good" },
        { material: "D2", speed: 180, result: "tool_wear" },
        { material: "D2", speed: 120, result: "slow" }
      ];

      const learnResult = await deepAIIntelligenceEngine.deepLearn(
        operations,
        "pattern_recognition"
      );

      expect(learnResult.patterns.length).toBeGreaterThan(0);
      expect(learnResult.recommendations.length).toBeGreaterThan(0);
    });

    it("logical validation of machining parameters", async () => {
      const premises = [
        "Material is D2 hardened steel at 60 HRC",
        "Cutting speed exceeds 200 SFM",
        "Using uncoated carbide insert"
      ];

      const logicResult = await deepAIIntelligenceEngine.deepLogic(
        premises,
        "constraint"
      );

      expect(logicResult.constraints.length).toBeGreaterThan(0);
    });
  });
});
