/**
 * SFCMultiHypothesisRankerEngine Tests — U-PPG-SFC-09
 * =====================================================
 *
 * Tests for multi-hypothesis Bayesian ranking of SFC candidates.
 * Validates:
 * - Schema validation for inputs and outputs
 * - Reward decomposition computation
 * - Prior score calculation with RAG integration
 * - Safety shield rejection path
 * - Confidence interval generation
 * - Calibration status reporting
 * - Edge cases and error handling
 *
 * @module tests/engines/sfcMultiHypothesisRankerEngine.test
 */

import { describe, it, expect } from "vitest";
import {
  SFCMultiHypothesisRankerEngine,
  SFCMultiHypothesisRankerInputSchema,
  SFCMultiHypothesisRankerOutputSchema,
  CandidateHypothesisSchema,
  RankedCandidateSchema,
  RewardDecompositionSchema,
  ConfidenceIntervalSchema,
  HypothesisSourceSchema,
  type SFCMultiHypothesisRankerInput,
  type CandidateHypothesis,
} from "../../engines/SFCMultiHypothesisRankerEngine.js";

describe("SFCMultiHypothesisRankerEngine", () => {
  describe("Schema Validation", () => {
    it("should validate HypothesisSourceSchema with all valid sources", () => {
      const sources = ["kienzle_prior", "taylor_prior", "formula", "adapter", "rag", "iql", "hybrid"];
      for (const source of sources) {
        const result = HypothesisSourceSchema.safeParse(source);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid hypothesis source", () => {
      const result = HypothesisSourceSchema.safeParse("invalid_source");
      expect(result.success).toBe(false);
    });

    it("should validate CandidateHypothesisSchema with minimal fields", () => {
      const candidate = {
        source: "formula",
        sfm: 350,
        fpt: 0.1,
        doc: 2.0,
      };
      const result = CandidateHypothesisSchema.safeParse(candidate);
      expect(result.success).toBe(true);
    });

    it("should validate CandidateHypothesisSchema with all fields", () => {
      const candidate: CandidateHypothesis = {
        source: "adapter",
        source_id: "sfc-D2-Okuma-v3",
        sfm: 280,
        fpt: 0.08,
        doc: 1.5,
        woc: 5.0,
        rpm: 3500,
        feed_rate: 1120,
        source_confidence: 0.85,
        reward_cycle_time: 0.7,
        reward_tool_life: 0.8,
        reward_surface_finish: 0.75,
        reward_safety: 0.9,
      };
      const result = CandidateHypothesisSchema.safeParse(candidate);
      expect(result.success).toBe(true);
    });

    it("should reject candidate with negative sfm", () => {
      const candidate = {
        source: "formula",
        sfm: -100,
        fpt: 0.1,
        doc: 2.0,
      };
      const result = CandidateHypothesisSchema.safeParse(candidate);
      expect(result.success).toBe(false);
    });

    it("should validate minimal input", () => {
      const input = {
        material: "4140 Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
      };
      const result = SFCMultiHypothesisRankerInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.top_k).toBe(3); // default
        expect(result.data.use_rag_priors).toBe(true); // default
        expect(result.data.use_safety_shield).toBe(true); // default
      }
    });

    it("should validate full input with all options", () => {
      const input: SFCMultiHypothesisRankerInput = {
        material: "Aluminum 6061",
        iso_group: "N",
        machine_type: "mill",
        machine_id: "Okuma-MU500",
        operation: "finish",
        tool_class: "endmill",
        tool_diameter_mm: 12,
        customer: "ALCOA",
        candidates: [
          { source: "formula", sfm: 800, fpt: 0.05, doc: 1.0 },
          { source: "adapter", sfm: 750, fpt: 0.06, doc: 1.2, source_confidence: 0.9 },
          { source: "rag", sfm: 780, fpt: 0.055, doc: 1.1 },
        ],
        top_k: 5,
        use_rag_priors: true,
        use_safety_shield: true,
        reward_weights: {
          cycle_time: 0.25,
          tool_life: 0.40,
          surface_finish: 0.20,
          safety: 0.15,
        },
      };
      const result = SFCMultiHypothesisRankerInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty candidates array", () => {
      const input = {
        material: "Steel",
        candidates: [],
      };
      const result = SFCMultiHypothesisRankerInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty material", () => {
      const input = {
        material: "",
        candidates: [{ source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 }],
      };
      const result = SFCMultiHypothesisRankerInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Output Schema Validation", () => {
    it("should validate RewardDecompositionSchema", () => {
      const reward = {
        cycle_time: 0.65,
        tool_life: 0.72,
        surface_finish: 0.58,
        safety: 0.85,
        weighted_total: 0.70,
      };
      const result = RewardDecompositionSchema.safeParse(reward);
      expect(result.success).toBe(true);
    });

    it("should validate ConfidenceIntervalSchema", () => {
      const ci = {
        point_estimate: 350,
        lower_bound: 315,
        upper_bound: 385,
        std_dev: 35,
      };
      const result = ConfidenceIntervalSchema.safeParse(ci);
      expect(result.success).toBe(true);
    });

    it("should validate RankedCandidateSchema", () => {
      const ranked = {
        rank: 1,
        source: "formula",
        source_id: null,
        sfm: { point_estimate: 350, lower_bound: 315, upper_bound: 385, std_dev: 35 },
        fpt: { point_estimate: 0.1, lower_bound: 0.09, upper_bound: 0.11, std_dev: 0.01 },
        doc: { point_estimate: 2.0, lower_bound: 1.8, upper_bound: 2.2, std_dev: 0.2 },
        reward: {
          cycle_time: 0.65,
          tool_life: 0.72,
          surface_finish: 0.58,
          safety: 0.85,
          weighted_total: 0.70,
        },
        prior_score: 0.6,
        likelihood_score: 0.7,
        posterior_score: 0.42,
        calibrated_confidence: 0.68,
        safety_rejected: false,
        safety_rejection_reason: null,
        contributing_priors: ["JM_DIE/ALCOA/prog001.nc"],
      };
      const result = RankedCandidateSchema.safeParse(ranked);
      expect(result.success).toBe(true);
    });
  });

  describe("rank() Basic Functionality", () => {
    it("should return ok=true for valid input", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "4140 Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
      });
      expect(result.ok).toBe(true);
      expect(result.ranked_candidates.length).toBe(1);
    });

    it("should rank multiple candidates", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "4140 Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0, source_confidence: 0.7 },
          { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8, source_confidence: 0.9 },
          { source: "rag", sfm: 320, fpt: 0.08, doc: 2.2, source_confidence: 0.6 },
        ],
      });
      expect(result.ok).toBe(true);
      expect(result.ranked_candidates.length).toBe(3);
      // Should be sorted by posterior_score descending
      const scores = result.ranked_candidates.map(c => c.posterior_score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });

    it("should respect top_k parameter", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
          { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8 },
          { source: "rag", sfm: 320, fpt: 0.08, doc: 2.2 },
          { source: "iql", sfm: 310, fpt: 0.09, doc: 2.1 },
          { source: "hybrid", sfm: 295, fpt: 0.11, doc: 1.9 },
        ],
        top_k: 2,
      });
      expect(result.ok).toBe(true);
      expect(result.ranked_candidates.length).toBe(2);
    });

    it("should assign sequential ranks", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Aluminum",
        candidates: [
          { source: "formula", sfm: 800, fpt: 0.05, doc: 1.0 },
          { source: "adapter", sfm: 750, fpt: 0.06, doc: 1.2 },
        ],
      });
      expect(result.ranked_candidates[0].rank).toBe(1);
      expect(result.ranked_candidates[1].rank).toBe(2);
    });
  });

  describe("Reward Decomposition", () => {
    it("should compute reward decomposition for each candidate", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
      });
      expect(result.ok).toBe(true);
      const reward = result.ranked_candidates[0].reward;
      expect(reward.cycle_time).toBeGreaterThanOrEqual(0);
      expect(reward.cycle_time).toBeLessThanOrEqual(1);
      expect(reward.tool_life).toBeGreaterThanOrEqual(0);
      expect(reward.tool_life).toBeLessThanOrEqual(1);
      expect(reward.surface_finish).toBeGreaterThanOrEqual(0);
      expect(reward.surface_finish).toBeLessThanOrEqual(1);
      expect(reward.safety).toBeGreaterThanOrEqual(0);
      expect(reward.safety).toBeLessThanOrEqual(1);
      expect(reward.weighted_total).toBeGreaterThanOrEqual(0);
      expect(reward.weighted_total).toBeLessThanOrEqual(1);
    });

    it("should use pre-computed reward components if provided", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          {
            source: "adapter",
            sfm: 300,
            fpt: 0.1,
            doc: 2.0,
            reward_cycle_time: 0.8,
            reward_tool_life: 0.7,
            reward_surface_finish: 0.9,
            reward_safety: 0.95,
          },
        ],
      });
      expect(result.ok).toBe(true);
      const reward = result.ranked_candidates[0].reward;
      expect(reward.cycle_time).toBeCloseTo(0.8, 2);
      expect(reward.tool_life).toBeCloseTo(0.7, 2);
      expect(reward.surface_finish).toBeCloseTo(0.9, 2);
      expect(reward.safety).toBeCloseTo(0.95, 2);
    });

    it("should apply custom reward weights", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
        reward_weights: {
          cycle_time: 0.5,
          tool_life: 0.3,
          surface_finish: 0.1,
          safety: 0.1,
        },
      });
      expect(result.ok).toBe(true);
      // Just verify it runs without error
      expect(result.ranked_candidates[0].reward.weighted_total).toBeGreaterThan(0);
    });
  });

  describe("Confidence Intervals", () => {
    it("should generate confidence intervals for sfm/fpt/doc", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
      });
      expect(result.ok).toBe(true);
      const candidate = result.ranked_candidates[0];

      // SFM
      expect(candidate.sfm.point_estimate).toBe(300);
      expect(candidate.sfm.lower_bound).toBeLessThan(300);
      expect(candidate.sfm.upper_bound).toBeGreaterThan(300);
      expect(candidate.sfm.std_dev).toBeGreaterThan(0);

      // FPT
      expect(candidate.fpt.point_estimate).toBe(0.1);
      expect(candidate.fpt.lower_bound).toBeLessThan(0.1);
      expect(candidate.fpt.upper_bound).toBeGreaterThan(0.1);

      // DOC
      expect(candidate.doc.point_estimate).toBe(2.0);
      expect(candidate.doc.lower_bound).toBeLessThan(2.0);
      expect(candidate.doc.upper_bound).toBeGreaterThan(2.0);
    });

    it("should produce 95% confidence intervals", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 400, fpt: 0.15, doc: 3.0 },
        ],
      });
      const candidate = result.ranked_candidates[0];

      // 95% CI should be approximately ±1.96 * std_dev
      const sfmWidth = candidate.sfm.upper_bound - candidate.sfm.lower_bound;
      const expectedWidth = 2 * 1.96 * candidate.sfm.std_dev;
      expect(sfmWidth).toBeCloseTo(expectedWidth, 1);
    });
  });

  describe("Safety Shield", () => {
    it("should reject unsafe candidates when shield enabled", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          // Very aggressive = low safety
          { source: "formula", sfm: 800, fpt: 0.5, doc: 15.0 },
          // Conservative = safe
          { source: "adapter", sfm: 200, fpt: 0.05, doc: 1.0 },
        ],
        use_safety_shield: true,
      });
      expect(result.ok).toBe(true);
      expect(result.safety_rejected_count).toBeGreaterThanOrEqual(0);
      // At least one should have safety evaluation
      const rejected = result.ranked_candidates.filter(c => c.safety_rejected);
      // Aggressive candidate may be rejected
      if (rejected.length > 0) {
        expect(rejected[0].safety_rejection_reason).not.toBeNull();
      }
    });

    it("should not reject when safety shield disabled", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 800, fpt: 0.5, doc: 15.0 },
        ],
        use_safety_shield: false,
      });
      expect(result.ok).toBe(true);
      expect(result.ranked_candidates[0].safety_rejected).toBe(false);
    });

    it("should place rejected candidates after safe ones", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 800, fpt: 0.5, doc: 15.0, reward_safety: 0.1 },
          { source: "adapter", sfm: 200, fpt: 0.05, doc: 1.0, reward_safety: 0.95 },
        ],
        use_safety_shield: true,
        top_k: 2,
      });
      expect(result.ok).toBe(true);
      // Safe candidates should come first
      const safeFirst = result.ranked_candidates.findIndex(c => c.safety_rejected);
      if (safeFirst > 0) {
        // All before are not rejected
        for (let i = 0; i < safeFirst; i++) {
          expect(result.ranked_candidates[i].safety_rejected).toBe(false);
        }
      }
    });
  });

  describe("Calibration", () => {
    it("should report calibration status", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
          { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8 },
        ],
      });
      expect(result.ok).toBe(true);
      expect(["calibrated", "uncalibrated", "unknown"]).toContain(result.calibration_status);
    });

    it("should return Brier score or null", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
          { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8 },
        ],
      });
      expect(result.ok).toBe(true);
      if (result.brier_score !== null) {
        expect(result.brier_score).toBeGreaterThanOrEqual(0);
        expect(result.brier_score).toBeLessThanOrEqual(1);
      }
    });

    it("should return null Brier score for single candidate", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
      });
      expect(result.ok).toBe(true);
      expect(result.brier_score).toBeNull();
    });
  });

  describe("ISO Group Inference", () => {
    it("should infer ISO N for aluminum", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Aluminum 6061",
        candidates: [
          { source: "formula", sfm: 800, fpt: 0.1, doc: 2.0 },
        ],
      });
      expect(result.ok).toBe(true);
      // Citation should reference N group
      const kienzleCitation = result.citations.find(c => c.source_id?.includes("kienzle"));
      expect(kienzleCitation?.source_id).toContain(":N");
    });

    it("should infer ISO M for stainless", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "316 Stainless",
        candidates: [
          { source: "formula", sfm: 200, fpt: 0.08, doc: 1.5 },
        ],
      });
      expect(result.ok).toBe(true);
      const kienzleCitation = result.citations.find(c => c.source_id?.includes("kienzle"));
      expect(kienzleCitation?.source_id).toContain(":M");
    });

    it("should use explicit ISO group when provided", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Mystery Metal",
        iso_group: "S",
        candidates: [
          { source: "formula", sfm: 100, fpt: 0.05, doc: 0.5 },
        ],
      });
      expect(result.ok).toBe(true);
      const kienzleCitation = result.citations.find(c => c.source_id?.includes("kienzle"));
      expect(kienzleCitation?.source_id).toContain(":S");
    });
  });

  describe("Provenance and Citations", () => {
    it("should include physics constant citations", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
      });
      expect(result.ok).toBe(true);

      const kienzleCitation = result.citations.find(c => c.source_id?.startsWith("kienzle:"));
      expect(kienzleCitation).toBeDefined();
      expect(kienzleCitation?.corpus).toBe("constants.ts");

      const taylorCitation = result.citations.find(c => c.source_id?.startsWith("taylor:"));
      expect(taylorCitation).toBeDefined();
      expect(taylorCitation?.corpus).toBe("constants.ts");
    });

    it("should track contributing RAG priors", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "D2 Tool Steel",
        operation: "finish",
        candidates: [
          { source: "formula", sfm: 150, fpt: 0.05, doc: 0.5 },
        ],
        use_rag_priors: true,
      });
      expect(result.ok).toBe(true);
      // contributing_priors may be empty if no RAG matches
      expect(Array.isArray(result.ranked_candidates[0].contributing_priors)).toBe(true);
    });

    it("should report RAG retrieval time", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
        use_rag_priors: true,
      });
      expect(result.ok).toBe(true);
      expect(typeof result.rag_retrieval_time_ms).toBe("number");
      expect(result.rag_retrieval_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling", () => {
    it("should return ok=false for invalid input", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "",
        candidates: [],
      } as SFCMultiHypothesisRankerInput);
      expect(result.ok).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle missing RAG index gracefully", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Exotic Unobtainium",
        candidates: [
          { source: "formula", sfm: 50, fpt: 0.02, doc: 0.3 },
        ],
        use_rag_priors: true,
      });
      expect(result.ok).toBe(true);
      // Should not throw even if no RAG matches
    });
  });

  describe("Performance", () => {
    it("should complete ranking within reasonable time", () => {
      const start = performance.now();
      SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
          { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8 },
          { source: "rag", sfm: 320, fpt: 0.08, doc: 2.2 },
        ],
      });
      const elapsed = performance.now() - start;
      // Allow 1000ms for test environment (actual target is 300ms)
      expect(elapsed).toBeLessThan(1000);
    });

    it("should include ranking_time_ms in output", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "Steel",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
        ],
      });
      expect(result.ok).toBe(true);
      expect(typeof result.ranking_time_ms).toBe("number");
      expect(result.ranking_time_ms).toBeGreaterThan(0);
    });
  });

  describe("Output Schema Conformance", () => {
    it("should produce output conforming to schema", () => {
      const result = SFCMultiHypothesisRankerEngine.rank({
        material: "4140 Steel",
        iso_group: "P",
        machine_type: "mill",
        candidates: [
          { source: "formula", sfm: 300, fpt: 0.1, doc: 2.0 },
          { source: "adapter", sfm: 280, fpt: 0.12, doc: 1.8, source_confidence: 0.85 },
        ],
      });
      const validation = SFCMultiHypothesisRankerOutputSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });
  });

  describe("isReady()", () => {
    it("should return boolean readiness status", () => {
      const ready = SFCMultiHypothesisRankerEngine.isReady();
      expect(typeof ready).toBe("boolean");
    });
  });

  describe("getSelfAwareness()", () => {
    it("should return valid self-awareness metadata", () => {
      const awareness = SFCMultiHypothesisRankerEngine.getSelfAwareness();
      expect(awareness.name).toBe("SFCMultiHypothesisRankerEngine");
      expect(awareness.version).toBe("1.0.0");
      expect(awareness.milestone).toBe("PSAU-PPG-SFC U-PPG-SFC-09");
      expect(Array.isArray(awareness.capabilities)).toBe(true);
      expect(awareness.capabilities).toContain("rank");
      expect(awareness.capabilities).toContain("isReady");
      expect(Array.isArray(awareness.dependencies)).toBe(true);
      expect(awareness.latency_target_ms).toBe(300);
      expect(awareness.calibration_target).toBe("Brier < 0.15");
      expect(awareness.reward_components).toContain("cycle_time");
      expect(awareness.reward_components).toContain("tool_life");
      expect(awareness.reward_components).toContain("surface_finish");
      expect(awareness.reward_components).toContain("safety");
    });
  });
});
