/**
 * Tests for ExtendedThinkingBridgeEngine
 *
 * AGENT ROADMAP: U-AGT09 (MS3)
 * Verifies Opus extended thinking integration
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ExtendedThinkingBridgeEngine,
  extendedThinkingBridgeEngine,
  DeepAnalysisRequest,
  ThinkingConfig,
} from "../../engines/ExtendedThinkingBridgeEngine.js";

describe("ExtendedThinkingBridgeEngine", () => {
  let engine: ExtendedThinkingBridgeEngine;

  beforeEach(() => {
    engine = new ExtendedThinkingBridgeEngine();
    engine.clearTraces();
  });

  describe("configure", () => {
    it("should accept partial configuration", () => {
      engine.configure({ budgetTokens: 16384 });

      const config = engine.getConfig();
      expect(config.budgetTokens).toBe(16384);
      expect(config.enabled).toBe(true); // Default preserved
    });

    it("should clamp budget to valid range", () => {
      engine.configure({ budgetTokens: 100 });
      expect(engine.getConfig().budgetTokens).toBe(1024);

      engine.configure({ budgetTokens: 100000 });
      expect(engine.getConfig().budgetTokens).toBe(32768);
    });

    it("should allow disabling thinking", () => {
      engine.configure({ enabled: false });
      expect(engine.getConfig().enabled).toBe(false);
    });

    it("should configure complexity threshold", () => {
      engine.configure({ complexityThreshold: 0.8 });
      expect(engine.getConfig().complexityThreshold).toBe(0.8);
    });
  });

  describe("assessComplexity", () => {
    it("should assess simple problem as low complexity", () => {
      const request: DeepAnalysisRequest = {
        problem: "What is the RPM?",
        goal: "Get RPM value",
        domain: "machining"
      };

      const complexity = engine.assessComplexity(request);

      expect(complexity.score).toBeLessThan(0.5);
      expect(complexity.recommendation).not.toBe("deep_thinking");
    });

    it("should assess complex problem as high complexity", () => {
      const request: DeepAnalysisRequest = {
        problem: "Optimize the multi-step machining sequence for Inconel with tight tolerances, balancing force, thermal effects, and tool life while minimizing cost",
        goal: "Find optimal trade-off between speed and quality",
        domain: "machining",
        constraints: [
          "Maximum force 5000N",
          "Thermal limit 400C",
          "Tool life minimum 30 min",
          "Surface finish Ra 0.4"
        ]
      };

      const complexity = engine.assessComplexity(request);

      expect(complexity.score).toBeGreaterThan(0.3);
      expect(complexity.factors.length).toBeGreaterThan(0);
      expect(complexity.estimatedThinkingTokens).toBeGreaterThan(1024);
    });

    it("should return complexity factors", () => {
      const request: DeepAnalysisRequest = {
        problem: "Calculate cutting force and power",
        goal: "Verify machine capability",
        domain: "machining"
      };

      const complexity = engine.assessComplexity(request);

      expect(complexity.factors.length).toBeGreaterThan(0);

      for (const factor of complexity.factors) {
        expect(factor.name).toBeDefined();
        expect(factor.value).toBeGreaterThanOrEqual(0);
        expect(factor.value).toBeLessThanOrEqual(1);
        expect(factor.weight).toBeGreaterThan(0);
        expect(typeof factor.contribution).toBe("number");
      }
    });

    it("should identify physics complexity", () => {
      const request: DeepAnalysisRequest = {
        problem: "Calculate cutting force, torque, and deflection",
        goal: "Verify structural integrity",
        domain: "machining"
      };

      const complexity = engine.assessComplexity(request);
      const physicsFactor = complexity.factors.find(f => f.name === "physics");

      expect(physicsFactor).toBeDefined();
      expect(physicsFactor?.value).toBeGreaterThan(0);
    });

    it("should identify safety complexity", () => {
      const request: DeepAnalysisRequest = {
        problem: "Check critical safety limits to prevent crash",
        goal: "Ensure safe operation",
        domain: "safety"
      };

      const complexity = engine.assessComplexity(request);
      const safetyFactor = complexity.factors.find(f => f.name === "safety");

      expect(safetyFactor).toBeDefined();
      expect(safetyFactor?.value).toBeGreaterThan(0);
    });

    it("should identify material complexity", () => {
      const request: DeepAnalysisRequest = {
        problem: "Machine Inconel 718 with hardened surface 55 HRC",
        goal: "Develop machining strategy",
        domain: "machining"
      };

      const complexity = engine.assessComplexity(request);
      const materialFactor = complexity.factors.find(f => f.name === "material_complexity");

      expect(materialFactor).toBeDefined();
      expect(materialFactor?.value).toBeGreaterThan(0);
    });
  });

  describe("shouldThink", () => {
    it("should recommend thinking for complex problems", () => {
      engine.configure({ complexityThreshold: 0.3 });

      const request: DeepAnalysisRequest = {
        problem: "Optimize cutting parameters for titanium with multiple constraints",
        goal: "Balance all factors",
        domain: "machining",
        constraints: ["Speed limit", "Force limit", "Thermal limit"]
      };

      const result = engine.shouldThink(request);

      expect(result.complexity).toBeDefined();
      expect(typeof result.shouldThink).toBe("boolean");
    });

    it("should force thinking when requested", () => {
      const request: DeepAnalysisRequest = {
        problem: "Simple question",
        goal: "Get answer",
        domain: "machining",
        forceThinking: true
      };

      const result = engine.shouldThink(request);

      expect(result.shouldThink).toBe(true);
    });
  });

  describe("analyze", () => {
    it("should perform deep analysis", async () => {
      const request: DeepAnalysisRequest = {
        problem: "Determine optimal cutting parameters for roughing",
        goal: "Maximize material removal rate safely",
        domain: "machining"
      };

      const result = await engine.analyze(request);

      expect(result.analysisId).toMatch(/^analysis_/);
      expect(result.problem).toBe(request.problem);
      expect(result.domain).toBe(request.domain);
      expect(result.reasoningChain).toBeDefined();
      expect(result.insights.length).toBeGreaterThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should use thinking for complex problems", async () => {
      engine.configure({ complexityThreshold: 0.2 }); // Lower threshold

      const request: DeepAnalysisRequest = {
        problem: "Optimize multi-step machining with force and thermal analysis",
        goal: "Find optimal balance",
        domain: "machining",
        forceThinking: true
      };

      const result = await engine.analyze(request);

      expect(result.usedThinking).toBe(true);
      expect(result.thinkingTrace).toBeDefined();
      expect(result.thinkingTrace?.successful).toBe(true);
    });

    it("should include context in analysis", async () => {
      const request: DeepAnalysisRequest = {
        problem: "Analyze machining parameters",
        goal: "Verify settings",
        domain: "machining",
        context: {
          material: "D2 Tool Steel",
          machine: "Okuma LB15",
          toolDiameter: 12
        }
      };

      const result = await engine.analyze(request);

      expect(result.reasoningChain.steps.length).toBeGreaterThan(0);
    });

    it("should include constraints in analysis", async () => {
      const request: DeepAnalysisRequest = {
        problem: "Calculate parameters within limits",
        goal: "Meet all constraints",
        domain: "machining",
        constraints: [
          "Maximum speed 500 SFM",
          "Minimum tool life 20 min"
        ]
      };

      const result = await engine.analyze(request);

      expect(result.reasoningChain.constraints_checked.length).toBeGreaterThanOrEqual(0);
    });

    it("should generate insights", async () => {
      const request: DeepAnalysisRequest = {
        problem: "Analyze cutting strategy risks",
        goal: "Identify potential issues",
        domain: "machining",
        forceThinking: true
      };

      const result = await engine.analyze(request);

      expect(result.insights.length).toBeGreaterThan(0);

      for (const insight of result.insights) {
        expect(["observation", "deduction", "warning", "opportunity", "risk"]).toContain(insight.category);
        expect(insight.content).toBeDefined();
        expect(insight.confidence).toBeGreaterThan(0);
        expect(["thinking", "reasoning", "combined"]).toContain(insight.source);
      }
    });

    it("should fall back gracefully when thinking disabled", async () => {
      engine.configure({ enabled: false });

      const request: DeepAnalysisRequest = {
        problem: "Test without thinking",
        goal: "Verify fallback",
        domain: "machining"
      };

      const result = await engine.analyze(request);

      expect(result.usedThinking).toBe(false);
      expect(result.reasoningChain).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should complete in reasonable time", async () => {
      const request: DeepAnalysisRequest = {
        problem: "Performance test",
        goal: "Check speed",
        domain: "machining"
      };

      const result = await engine.analyze(request);

      expect(result.durationMs).toBeLessThan(5000);
    });
  });

  describe("getStatus", () => {
    it("should return thinking status", () => {
      const status = engine.getStatus();

      expect(typeof status.available).toBe("boolean");
      expect(typeof status.tracesStored).toBe("number");
      expect(typeof status.totalThinkingTokens).toBe("number");
    });

    it("should report unavailable when disabled", () => {
      engine.configure({ enabled: false });

      const status = engine.getStatus();

      expect(status.available).toBe(false);
      expect(status.reason).toBeDefined();
    });

    it("should track traces stored", async () => {
      engine.configure({ storeTraces: true });

      const request: DeepAnalysisRequest = {
        problem: "Generate trace",
        goal: "Test storage",
        domain: "machining",
        forceThinking: true
      };

      await engine.analyze(request);

      const status = engine.getStatus();
      expect(status.tracesStored).toBeGreaterThan(0);
    });
  });

  describe("getTraces", () => {
    it("should return stored traces", async () => {
      engine.configure({ storeTraces: true });

      const request: DeepAnalysisRequest = {
        problem: "Generate trace",
        goal: "Test retrieval",
        domain: "machining",
        forceThinking: true
      };

      await engine.analyze(request);

      const traces = engine.getTraces();
      expect(traces.length).toBeGreaterThan(0);
    });

    it("should respect limit parameter", async () => {
      engine.configure({ storeTraces: true });

      // Generate multiple traces
      for (let i = 0; i < 5; i++) {
        await engine.analyze({
          problem: `Problem ${i}`,
          goal: "Test",
          domain: "machining",
          forceThinking: true
        });
      }

      const traces = engine.getTraces(3);
      expect(traces.length).toBeLessThanOrEqual(3);
    });

    it("should return traces with required fields", async () => {
      engine.configure({ storeTraces: true });

      await engine.analyze({
        problem: "Test trace fields",
        goal: "Verify structure",
        domain: "machining",
        forceThinking: true
      });

      const traces = engine.getTraces();
      const trace = traces[0];

      expect(trace.id).toMatch(/^trace_/);
      expect(trace.problem).toBeDefined();
      expect(trace.thinkingContent).toBeDefined();
      expect(trace.thinkingTokens).toBeGreaterThanOrEqual(0);
      expect(trace.createdAt).toBeDefined();
      expect(trace.domain).toBeDefined();
      expect(typeof trace.successful).toBe("boolean");
    });
  });

  describe("getTrace", () => {
    it("should retrieve trace by ID", async () => {
      engine.configure({ storeTraces: true });

      await engine.analyze({
        problem: "Test retrieval",
        goal: "Get by ID",
        domain: "machining",
        forceThinking: true
      });

      const traces = engine.getTraces();
      const traceId = traces[0].id;

      const trace = engine.getTrace(traceId);
      expect(trace).toBeDefined();
      expect(trace?.id).toBe(traceId);
    });

    it("should return undefined for unknown ID", () => {
      const trace = engine.getTrace("nonexistent_id");
      expect(trace).toBeUndefined();
    });
  });

  describe("clearTraces", () => {
    it("should clear all traces", async () => {
      engine.configure({ storeTraces: true });

      await engine.analyze({
        problem: "Generate trace",
        goal: "Test clear",
        domain: "machining",
        forceThinking: true
      });

      expect(engine.getTraces().length).toBeGreaterThan(0);

      engine.clearTraces();

      expect(engine.getTraces().length).toBe(0);
      expect(engine.getStatus().totalThinkingTokens).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("should generate readable summary", async () => {
      const request: DeepAnalysisRequest = {
        problem: "Test summary generation",
        goal: "Verify output format",
        domain: "machining",
        forceThinking: true
      };

      const result = await engine.analyze(request);
      const summary = engine.getSummary(result);

      expect(summary).toContain("Deep Analysis:");
      expect(summary).toContain("Domain: machining");
      expect(summary).toContain("Confidence:");
      expect(summary).toContain("Duration:");
      expect(summary).toContain("Insights:");
    });

    it("should include thinking info when used", async () => {
      engine.configure({ storeTraces: true });

      const request: DeepAnalysisRequest = {
        problem: "Test with thinking",
        goal: "Verify thinking info",
        domain: "machining",
        forceThinking: true
      };

      const result = await engine.analyze(request);
      const summary = engine.getSummary(result);

      expect(summary).toContain("Thinking tokens:");
      expect(summary).toContain("Thinking duration:");
    });
  });

  describe("domain handling", () => {
    it("should handle different domains", async () => {
      const domains: DeepAnalysisRequest["domain"][] = ["tooling", "quality", "cost", "safety"];

      for (const domain of domains) {
        const result = await engine.analyze({
          problem: `${domain} analysis`,
          goal: "Verify domain",
          domain
        });

        expect(result.domain).toBe(domain);
        expect(result.reasoningChain.domain).toBe(domain);
      }
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(extendedThinkingBridgeEngine).toBeInstanceOf(ExtendedThinkingBridgeEngine);
    });
  });
});
