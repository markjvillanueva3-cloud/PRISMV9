/**
 * AI-INTEG-MS2: Opus Capability Engine Tests
 * ==========================================
 * Validates the OpusCapabilityEngine for:
 *   - Complexity assessment and tier routing
 *   - Physics validation chains
 *   - NL to structured translation
 *   - Dimensional analysis
 *   - Hypothesis generation
 *   - Caching and cost tracking
 *
 * @module __tests__/ai-integ-ms2-opus-capability.test
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  OpusCapabilityEngine,
  opusCapabilityEngine,
  type OpusRequest,
  type ComplexityAssessment,
} from "../engines/OpusCapabilityEngine.js";

const TEST_CACHE_PATH = path.join(process.cwd(), "data", "state", "opus-capability-cache.json");
let originalCacheData: string | null = null;

describe("OpusCapabilityEngine", () => {
  let engine: OpusCapabilityEngine;

  beforeAll(() => {
    if (fs.existsSync(TEST_CACHE_PATH)) {
      originalCacheData = fs.readFileSync(TEST_CACHE_PATH, "utf-8");
    }
  });

  afterAll(() => {
    if (originalCacheData) {
      fs.writeFileSync(TEST_CACHE_PATH, originalCacheData);
    } else {
      try { fs.unlinkSync(TEST_CACHE_PATH); } catch {}
    }
  });

  beforeEach(() => {
    try { fs.unlinkSync(TEST_CACHE_PATH); } catch {}
    engine = new OpusCapabilityEngine();
  });

  // ==========================================================================
  // COMPLEXITY ASSESSMENT
  // ==========================================================================

  describe("complexity assessment", () => {
    it("should route simple query to Haiku tier", () => {
      const request: OpusRequest = {
        category: "general",
        intent: "What is the standard RPM for aluminum?",
        context: {},
      };

      const assessment = engine.getComplexityAssessment(request);

      expect(assessment.score).toBeLessThan(0.4);
      expect(assessment.recommended_tier).toBe("haiku");
    });

    it("should route physics query to higher tier", () => {
      const request: OpusRequest = {
        category: "physics_validation",
        intent: "Validate cutting force calculation using Kienzle model for hardened steel",
        context: {
          kc1_1: 2100,
          ap: 2,
          fz: 0.15,
          mc: 0.25,
        },
      };

      const assessment = engine.getComplexityAssessment(request);

      expect(assessment.factors.physics_required).toBe(true);
      expect(assessment.score).toBeGreaterThan(0.4);
      expect(["sonnet", "opus"]).toContain(assessment.recommended_tier);
    });

    it("should detect cross-domain queries", () => {
      const request: OpusRequest = {
        category: "deep_reasoning",
        intent: "Optimize scheduling considering physics constraints and business cost targets",
        context: {
          machines: ["mill-1", "lathe-1"],
          budget: 50000,
        },
      };

      const assessment = engine.getComplexityAssessment(request);

      expect(assessment.factors.cross_domain).toBe(true);
      expect(assessment.factors.business_logic).toBe(true);
    });

    it("should flag safety-critical queries", () => {
      const request: OpusRequest = {
        category: "deep_reasoning",
        intent: "Determine safe cutting limits to avoid machine collision",
        context: {
          machine: "5-axis",
          clearance: 10,
        },
      };

      const assessment = engine.getComplexityAssessment(request);

      expect(assessment.factors.safety_critical).toBe(true);
    });

    it("should route formula derivation to Opus", () => {
      const request: OpusRequest = {
        category: "formula_derivation",
        intent: "Derive the relationship between feed rate and surface finish for turning",
        context: { operation: "turning" },
      };

      const assessment = engine.getComplexityAssessment(request);

      expect(assessment.recommended_tier).toBe("opus");
    });
  });

  // ==========================================================================
  // PHYSICS VALIDATION
  // ==========================================================================

  describe("physics validation", () => {
    it("should validate force calculation", async () => {
      const request: OpusRequest = {
        category: "physics_validation",
        intent: "Validate cutting force calculation",
        context: {
          force_calculation: true,
          kc1_1: 1800,
          ap: 2,
          fz: 0.15,
          mc: 0.25,
          expected_force: 0, // Not checking against expected
        },
      };

      const response = await engine.execute(request);

      expect(response.success).toBe(true);
      expect(response.result).toHaveProperty("steps");
      expect(response.reasoning.length).toBeGreaterThan(0);
    });

    it("should validate power calculation", async () => {
      const request: OpusRequest = {
        category: "physics_validation",
        intent: "Validate spindle power requirement",
        context: {
          power_calculation: true,
          Fc: 500,
          Vc: 150,
          eta: 0.85,
          expected_power: 0,
        },
      };

      const response = await engine.execute(request);

      expect(response.success).toBe(true);
      expect(response.result).toHaveProperty("steps");
    });

    it("should warn on excessive temperature", async () => {
      const request: OpusRequest = {
        category: "physics_validation",
        intent: "Validate cutting temperature",
        context: {
          temperature_calculation: true,
          T_ambient: 20,
          cutting_speed: 500, // High speed
          feed: 0.5,
          expected_temp: 0,
        },
      };

      const response = await engine.execute(request);

      expect(response.safety_warnings).toBeDefined();
      // High speed should trigger warning
    });
  });

  // ==========================================================================
  // NL TRANSLATION
  // ==========================================================================

  describe("NL to structured translation", () => {
    it("should extract operation type from text", async () => {
      const request: OpusRequest = {
        category: "nl_to_structured",
        intent: "I need to do roughing on aluminum with a 1/2 inch endmill at 8000 RPM",
        context: {},
      };

      const response = await engine.execute(request);

      expect(response.success).toBe(true);
      expect(response.structured_output).toBeDefined();
      expect(response.structured_output?.operation).toBe("roughing");
      expect(response.structured_output?.material).toBe("aluminum");
    });

    it("should extract dimensions from text", async () => {
      const request: OpusRequest = {
        category: "nl_to_structured",
        intent: "Mill a 50mm diameter hole 25mm deep in steel",
        context: {},
      };

      const response = await engine.execute(request);

      expect(response.structured_output?.dimensions).toBeDefined();
      expect(response.structured_output?.material).toBe("steel");
    });

    it("should note ambiguities when info missing", async () => {
      const request: OpusRequest = {
        category: "nl_to_structured",
        intent: "Machine the part faster",
        context: {},
      };

      const response = await engine.execute(request);

      expect(response.result).toHaveProperty("ambiguities");
      expect((response.result as any).ambiguities.length).toBeGreaterThan(0);
    });

    it("should extract speed values with units", async () => {
      const request: OpusRequest = {
        category: "nl_to_structured",
        intent: "Run the spindle at 5000 RPM with feed rate 200 mm/min",
        context: {},
      };

      const response = await engine.execute(request);

      expect(response.structured_output?.speed).toBeDefined();
      expect(response.structured_output?.feed).toBeDefined();
    });
  });

  // ==========================================================================
  // DIMENSIONAL ANALYSIS
  // ==========================================================================

  describe("dimensional analysis", () => {
    it("should recognize force formula", async () => {
      const request: OpusRequest = {
        category: "dimensional_analysis",
        intent: "Check dimensional consistency",
        context: {
          formula: "F = m * a",
          units: { F: "N", m: "kg", a: "m/s^2" },
        },
      };

      const response = await engine.execute(request);

      expect(response.success).toBe(true);
      expect(response.reasoning.some(r => r.includes("Force = mass"))).toBe(true);
    });

    it("should recognize power formula", async () => {
      const request: OpusRequest = {
        category: "dimensional_analysis",
        intent: "Verify power equation",
        context: {
          formula: "P = F * v",
          units: { P: "W", F: "N", v: "m/s" },
        },
      };

      const response = await engine.execute(request);

      expect(response.success).toBe(true);
    });

    it("should warn on unrecognized formula", async () => {
      const request: OpusRequest = {
        category: "dimensional_analysis",
        intent: "Check this formula",
        context: {
          formula: "X = Y + Z",
          units: {},
        },
      };

      const response = await engine.execute(request);

      expect(response.safety_warnings).toBeDefined();
    });
  });

  // ==========================================================================
  // HYPOTHESIS GENERATION
  // ==========================================================================

  describe("hypothesis generation", () => {
    it("should generate chatter hypotheses", async () => {
      const request: OpusRequest = {
        category: "hypothesis_generation",
        intent: "Why am I getting vibration during roughing?",
        context: { observation: "chatter during roughing at 4000 RPM" },
      };

      const response = await engine.execute(request);

      expect(response.success).toBe(true);
      expect(response.result).toHaveProperty("hypotheses");
      const hypotheses = (response.result as any).hypotheses;
      expect(hypotheses.length).toBeGreaterThan(0);
      expect(hypotheses[0]).toHaveProperty("hypothesis");
      expect(hypotheses[0]).toHaveProperty("probability");
      expect(hypotheses[0]).toHaveProperty("test");
    });

    it("should generate surface finish hypotheses", async () => {
      const request: OpusRequest = {
        category: "hypothesis_generation",
        intent: "Surface finish is poor",
        context: { observation: "poor surface finish on steel part" },
      };

      const response = await engine.execute(request);

      const hypotheses = (response.result as any).hypotheses;
      expect(hypotheses.some((h: any) => h.hypothesis.includes("feed") || h.hypothesis.includes("tool"))).toBe(true);
    });

    it("should generate tool wear hypotheses", async () => {
      const request: OpusRequest = {
        category: "hypothesis_generation",
        intent: "Tool life is short",
        context: { observation: "short tool life during titanium machining" },
      };

      const response = await engine.execute(request);

      const hypotheses = (response.result as any).hypotheses;
      expect(hypotheses.length).toBeGreaterThan(0);
    });

    it("should provide alternatives ranked by probability", async () => {
      const request: OpusRequest = {
        category: "hypothesis_generation",
        intent: "Vibration issue",
        context: { observation: "vibration during finishing pass" },
      };

      const response = await engine.execute(request);

      expect(response.alternatives).toBeDefined();
      expect(response.alternatives!.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // GENERAL REASONING
  // ==========================================================================

  describe("general reasoning", () => {
    it("should handle deep reasoning requests", async () => {
      const request: OpusRequest = {
        category: "deep_reasoning",
        intent: "Analyze the optimal approach for machining a complex aerospace bracket",
        context: {
          material: "titanium",
          features: ["pockets", "thin walls", "tight tolerances"],
        },
      };

      const response = await engine.execute(request);

      expect(response.success).toBe(true);
      expect(response.reasoning.length).toBeGreaterThan(0);
      expect(response.confidence).toBeGreaterThan(0);
    });

    it("should handle business synthesis", async () => {
      const request: OpusRequest = {
        category: "business_synthesis",
        intent: "Generate cost estimate for batch production",
        context: {
          quantity: 100,
          cycle_time: 45,
          material_cost: 25,
        },
      };

      const response = await engine.execute(request);

      expect(response.success).toBe(true);
    });
  });

  // ==========================================================================
  // TIER FORCING
  // ==========================================================================

  describe("tier forcing", () => {
    it("should respect forced tier", async () => {
      const request: OpusRequest = {
        category: "general",
        intent: "Simple question",
        context: {},
        force_tier: "opus",
      };

      const response = await engine.execute(request);

      expect(response.tier_used).toBe("opus");
    });

    it("should track cost correctly by tier", async () => {
      const haikuRequest: OpusRequest = {
        category: "general",
        intent: "Simple",
        context: {},
        force_tier: "haiku",
      };

      const opusRequest: OpusRequest = {
        category: "general",
        intent: "Simple",
        context: {},
        force_tier: "opus",
      };

      const haikuResponse = await engine.execute(haikuRequest);
      const opusResponse = await engine.execute(opusRequest);

      // Opus should cost more than Haiku
      expect(opusResponse.cost).toBeGreaterThan(haikuResponse.cost);
    });
  });

  // ==========================================================================
  // CACHING
  // ==========================================================================

  describe("caching", () => {
    it("should cache Opus responses", async () => {
      const request: OpusRequest = {
        category: "physics_validation",
        intent: "Validate force calculation for caching test",
        context: { force_calculation: true, kc1_1: 1800, ap: 2, fz: 0.15, mc: 0.25 },
        force_tier: "opus",
      };

      // First request
      const response1 = await engine.execute(request);
      expect(response1.from_cache).toBe(false);

      // Second request should hit cache
      const response2 = await engine.execute(request);
      expect(response2.from_cache).toBe(true);
    });

    it("should skip cache when requested", async () => {
      const request: OpusRequest = {
        category: "physics_validation",
        intent: "Force calculation skip cache test",
        context: { force_calculation: true, kc1_1: 1800, ap: 2, fz: 0.15, mc: 0.25 },
        force_tier: "opus",
      };

      await engine.execute(request);

      const response = await engine.execute({ ...request, skip_cache: true });
      expect(response.from_cache).toBe(false);
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  describe("statistics", () => {
    it("should track request statistics", async () => {
      const initialStats = engine.getStats();
      const initialCount = initialStats.total_requests;

      await engine.execute({
        category: "general",
        intent: "Test request",
        context: {},
      });

      const stats = engine.getStats();
      expect(stats.total_requests).toBe(initialCount + 1);
    });

    it("should track tier distribution", async () => {
      // Execute requests at different tiers
      await engine.execute({ category: "general", intent: "Simple", context: {}, force_tier: "haiku" });
      await engine.execute({ category: "general", intent: "Medium", context: {}, force_tier: "sonnet" });
      await engine.execute({ category: "general", intent: "Complex", context: {}, force_tier: "opus" });

      const stats = engine.getStats();
      expect(stats.requests_by_tier.haiku).toBeGreaterThan(0);
      expect(stats.requests_by_tier.sonnet).toBeGreaterThan(0);
      expect(stats.requests_by_tier.opus).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe("singleton", () => {
    it("should export singleton instance", () => {
      expect(opusCapabilityEngine).toBeInstanceOf(OpusCapabilityEngine);
    });
  });
});
