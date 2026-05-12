/**
 * AI-INTEG-MS1: Reasoning Chain Sharing Tests
 * ============================================
 * Validates the ReasoningChainSharingEngine for:
 *   - Chain registration and deduplication
 *   - Cross-agent sharing
 *   - Chain validation with confidence aggregation
 *   - Query functionality
 *   - Statistics tracking
 *
 * @module __tests__/ai-integ-ms1-chain-sharing.test
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  ReasoningChainSharingEngine,
  reasoningChainSharingEngine,
  type SharedReasoningChain,
  type ChainValidation,
} from "../engines/ReasoningChainSharingEngine.js";
import type { ReasoningChain, FinalAnswer } from "../engines/ChainOfThoughtEngine.js";

const TEST_CHAIN_PATH = path.join(process.cwd(), "data", "state", "reasoning-chains.json");
let originalChainData: string | null = null;

describe("ReasoningChainSharingEngine", () => {
  let engine: ReasoningChainSharingEngine;

  beforeAll(() => {
    // Backup existing chain data if present
    if (fs.existsSync(TEST_CHAIN_PATH)) {
      originalChainData = fs.readFileSync(TEST_CHAIN_PATH, "utf-8");
    }
  });

  afterAll(() => {
    // Restore original data if it existed
    if (originalChainData) {
      fs.writeFileSync(TEST_CHAIN_PATH, originalChainData);
    } else {
      try { fs.unlinkSync(TEST_CHAIN_PATH); } catch {}
    }
  });

  // Helper to create a mock reasoning chain
  function createMockChain(overrides: Partial<ReasoningChain> = {}): ReasoningChain {
    return {
      chain_id: `chain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      problem: "Calculate optimal cutting speed for M2 tool steel with carbide insert",
      goal: "Determine SFM for roughing operation",
      steps: [
        {
          step_id: "step-1",
          step_number: 1,
          type: "observation",
          content: "M2 tool steel has hardness of 62-65 HRC",
          premises: [],
          confidence: 0.95,
          timestamp: new Date().toISOString(),
        },
        {
          step_id: "step-2",
          step_number: 2,
          type: "deduction",
          content: "Hardened steel requires lower cutting speeds",
          premises: ["step-1"],
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
        {
          step_id: "step-3",
          step_number: 3,
          type: "conclusion",
          content: "Recommended SFM: 150-200 for roughing",
          premises: ["step-1", "step-2"],
          confidence: 0.85,
          timestamp: new Date().toISOString(),
        },
      ],
      current_confidence: 0.85,
      dead_ends: [],
      final_answer: {
        answer: { sfm: 175, reason: "Mid-range for hardened M2" },
        confidence: 0.85,
        justification: [
          "M2 at 62-65 HRC requires conservative speeds",
          "Carbide insert allows moderate speeds",
          "Roughing tolerates lower surface quality",
        ],
        assumptions: ["Tool in good condition", "Machine rigid"],
        caveats: ["Reduce by 20% if chatter observed"],
        evidence_strength: "moderate",
      },
      total_time_ms: 1500,
      meta: {
        strategy: "linear",
        max_depth: 3,
        backtrack_count: 0,
        branch_count: 1,
        pruned_branches: 0,
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    // Clear persisted chains before each test for isolation
    try { fs.unlinkSync(TEST_CHAIN_PATH); } catch {}
    // Create fresh instance for each test
    engine = new ReasoningChainSharingEngine();
  });

  // ==========================================================================
  // CHAIN REGISTRATION
  // ==========================================================================

  describe("chain registration", () => {
    it("should register a new reasoning chain", () => {
      const chain = createMockChain();
      const result = engine.registerChain(chain, "claude-1", "speed_feed", ["steel", "roughing"]);

      expect(result.chain_id).toBe(chain.chain_id);
      expect(result.created_by).toBe("claude-1");
      expect(result.domain).toBe("speed_feed");
      expect(result.tags).toContain("steel");
      expect(result.confidence).toBe(chain.current_confidence);
      expect(result.usage_count).toBe(1);
    });

    it("should deduplicate chains with same problem", () => {
      const chain1 = createMockChain({ chain_id: "chain-1" });
      const chain2 = createMockChain({ chain_id: "chain-2" });

      const result1 = engine.registerChain(chain1, "claude-1");
      const result2 = engine.registerChain(chain2, "claude-2");

      // Should return the same chain (deduplicated by problem hash)
      expect(result2.chain_id).toBe(result1.chain_id);
      expect(result2.usage_count).toBe(2);
    });

    it("should update existing chain if new has higher confidence", () => {
      const chain1 = createMockChain({ chain_id: "chain-1", current_confidence: 0.7 });
      const chain2 = createMockChain({ chain_id: "chain-2", current_confidence: 0.95 });

      engine.registerChain(chain1, "claude-1");
      const result = engine.registerChain(chain2, "claude-2");

      expect(result.confidence).toBe(0.95);
    });

    it("should auto-tag chains based on content", () => {
      const chain = createMockChain({
        problem: "Optimize speed and feed for aluminum roughing with carbide endmill",
        goal: "Calculate optimal parameters",
      });

      const result = engine.registerChain(chain, "claude-1");

      expect(result.tags).toContain("speed_feed");
      expect(result.tags).toContain("material");
    });
  });

  // ==========================================================================
  // CHAIN SHARING
  // ==========================================================================

  describe("chain sharing", () => {
    it("should share chain with specific agents", () => {
      const chain = createMockChain();
      const registered = engine.registerChain(chain, "claude-1");

      const event = engine.shareChain(registered.chain_id, "claude-1", ["claude-2", "claude-3"]);

      expect(event).not.toBeNull();
      expect(event!.from_agent).toBe("claude-1");
      expect(event!.to_agents).toEqual(["claude-2", "claude-3"]);

      const updated = engine.getChain(registered.chain_id);
      expect(updated!.shared_with).toContain("claude-2");
      expect(updated!.shared_with).toContain("claude-3");
    });

    it("should broadcast chain to all agents", () => {
      const chain = createMockChain();
      const registered = engine.registerChain(chain, "claude-1");

      const event = engine.shareChainWithAll(registered.chain_id, "claude-1");

      expect(event).not.toBeNull();
      expect(event!.to_agents).toEqual(["*"]);
    });

    it("should return null for non-existent chain", () => {
      const event = engine.shareChain("non-existent", "claude-1", ["claude-2"]);
      expect(event).toBeNull();
    });
  });

  // ==========================================================================
  // CHAIN RETRIEVAL
  // ==========================================================================

  describe("chain retrieval", () => {
    it("should find similar chain by problem hash", () => {
      const chain = createMockChain();
      engine.registerChain(chain, "claude-1");

      const found = engine.findSimilarChain(chain.problem);

      expect(found).not.toBeNull();
      expect(found!.problem).toBe(chain.problem);
    });

    it("should return null if confidence below threshold", () => {
      const chain = createMockChain({ current_confidence: 0.5 });
      engine.registerChain(chain, "claude-1");

      const found = engine.findSimilarChain(chain.problem, 0.8);

      expect(found).toBeNull();
    });

    it("should get chain by ID", () => {
      const chain = createMockChain();
      const registered = engine.registerChain(chain, "claude-1");

      const retrieved = engine.getChain(registered.chain_id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.chain_id).toBe(registered.chain_id);
    });

    it("should return null for non-existent chain ID", () => {
      const retrieved = engine.getChain("non-existent");
      expect(retrieved).toBeNull();
    });
  });

  // ==========================================================================
  // CHAIN QUERY
  // ==========================================================================

  describe("chain query", () => {
    beforeEach(() => {
      // Register multiple chains
      const chain1 = createMockChain({
        chain_id: "chain-speed",
        problem: "Calculate speed for steel",
        current_confidence: 0.9,
      });
      const chain2 = createMockChain({
        chain_id: "chain-tool",
        problem: "Select tool for aluminum drilling",
        current_confidence: 0.7,
      });
      const chain3 = createMockChain({
        chain_id: "chain-temp",
        problem: "Estimate cutting temperature",
        current_confidence: 0.85,
      });

      engine.registerChain(chain1, "claude-1", "speed_feed", ["steel"]);
      engine.registerChain(chain2, "claude-2", "tooling", ["aluminum"]);
      engine.registerChain(chain3, "claude-1", "thermal", ["temperature"]);
    });

    it("should query chains by problem pattern", () => {
      const results = engine.queryChains({ problem_pattern: "steel" });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].problem).toContain("steel");
    });

    it("should query chains by domain", () => {
      const results = engine.queryChains({ domain: "tooling" });
      expect(results.length).toBe(1);
      expect(results[0].domain).toBe("tooling");
    });

    it("should query chains by minimum confidence", () => {
      const results = engine.queryChains({ min_confidence: 0.8 });
      expect(results.every((c) => c.confidence >= 0.8)).toBe(true);
    });

    it("should query chains by tags", () => {
      const results = engine.queryChains({ tags: ["aluminum"] });
      expect(results.length).toBe(1);
    });

    it("should limit results", () => {
      const results = engine.queryChains({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  // ==========================================================================
  // CHAIN VALIDATION
  // ==========================================================================

  describe("chain validation", () => {
    it("should accept validation and update confidence", () => {
      const chain = createMockChain({ current_confidence: 0.8 });
      const registered = engine.registerChain(chain, "claude-1");

      const validation: ChainValidation = {
        chain_id: registered.chain_id,
        validator_agent: "claude-2",
        timestamp: new Date().toISOString(),
        confidence_assessment: 0.9,
        agrees_with_conclusion: true,
        additional_insights: ["Could also consider coolant type"],
      };

      const success = engine.validateChain(validation);
      expect(success).toBe(true);

      const updated = engine.getChain(registered.chain_id);
      expect(updated!.validation_count).toBe(2); // original + validation
      expect(updated!.aggregated_confidence).toBeGreaterThan(0.8);
      expect(updated!.key_insights).toContain("Could also consider coolant type");
    });

    it("should return false for non-existent chain", () => {
      const validation: ChainValidation = {
        chain_id: "non-existent",
        validator_agent: "claude-2",
        timestamp: new Date().toISOString(),
        confidence_assessment: 0.9,
        agrees_with_conclusion: true,
      };

      const success = engine.validateChain(validation);
      expect(success).toBe(false);
    });

    it("should retrieve validations for a chain", () => {
      const chain = createMockChain();
      const registered = engine.registerChain(chain, "claude-1");

      engine.validateChain({
        chain_id: registered.chain_id,
        validator_agent: "claude-2",
        timestamp: new Date().toISOString(),
        confidence_assessment: 0.85,
        agrees_with_conclusion: true,
      });

      const validations = engine.getValidations(registered.chain_id);
      expect(validations.length).toBe(1);
      expect(validations[0].validator_agent).toBe("claude-2");
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  describe("statistics", () => {
    it("should return accurate statistics", () => {
      const chain1 = createMockChain({ chain_id: "chain-1" });
      const chain2 = createMockChain({
        chain_id: "chain-2",
        problem: "Different problem for drilling",
      });

      engine.registerChain(chain1, "claude-1", "speed_feed");
      engine.registerChain(chain2, "claude-2", "tooling");

      // Share one chain
      engine.shareChain(chain1.chain_id, "claude-1", ["claude-3"]);

      const stats = engine.getStats();

      expect(stats.total_chains).toBe(2);
      expect(stats.chains_shared).toBe(1);
      expect(stats.total_usages).toBe(2);
      expect(stats.chains_by_domain.speed_feed).toBe(1);
      expect(stats.chains_by_domain.tooling).toBe(1);
    });

    it("should track top agents", () => {
      for (let i = 0; i < 5; i++) {
        const chain = createMockChain({
          chain_id: `chain-${i}`,
          problem: `Problem ${i}`,
        });
        engine.registerChain(chain, "claude-1");
      }

      for (let i = 5; i < 7; i++) {
        const chain = createMockChain({
          chain_id: `chain-${i}`,
          problem: `Problem ${i}`,
        });
        engine.registerChain(chain, "claude-2");
      }

      const stats = engine.getStats();

      expect(stats.top_agents[0].agent).toBe("claude-1");
      expect(stats.top_agents[0].chains_created).toBe(5);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(reasoningChainSharingEngine).toBeInstanceOf(ReasoningChainSharingEngine);
    });
  });
});
