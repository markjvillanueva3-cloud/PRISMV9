/**
 * Tests for PPGDialectRankerEngine — U-PPG-SFC-10
 *
 * Verifies:
 *   - Schema validation for input/output
 *   - Ranking by predicted alarm/override/first-article rates
 *   - Confidence intervals
 *   - Base-vs-adapted contest
 *   - RAG integration
 *   - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PPGDialectRankerEngine,
  DialectTranslationCandidateSchema,
  PPGDialectRankerInputSchema,
  PPGDialectRankerOutputSchema,
  PredictedRatesSchema,
  ConfidenceIntervalSchema,
  RankedDialectCandidateSchema,
} from "../../engines/PPGDialectRankerEngine.js";
import { PPGRAGDialectMatchEngine } from "../../engines/PPGRAGDialectMatchEngine.js";

// Mock PPGRAGDialectMatchEngine
vi.mock("../../engines/PPGRAGDialectMatchEngine.js", () => ({
  PPGRAGDialectMatchEngine: {
    match: vi.fn(() => ({
      ok: true,
      controller_normalized: "fanuc",
      dialect_info: {
        controller_family: "fanuc",
        dialect_found: true,
        arc_format: "ijk_incremental",
        comment_style: "parentheses",
        canned_cycles_supported: true,
        hsc_mode_available: true,
        tcpc_available: false,
      },
      program_priors: [
        {
          program_id: "JM_DIE/ALCOA/prog001.nc",
          program_number: "O0001",
          similarity: 0.85,
          raw_score: 12.5,
          controller_match: true,
          machine_match: true,
          material_match: true,
          customer: "ALCOA",
          operation_types: ["linear", "arc_cw"],
          tool_count: 5,
          excerpt: "G01 X10.0 Y20.0 F500",
        },
        {
          program_id: "JM_DIE/ITW/prog002.nc",
          program_number: "O0002",
          similarity: 0.72,
          raw_score: 10.2,
          controller_match: true,
          machine_match: false,
          material_match: true,
          customer: "ITW",
          operation_types: ["linear"],
          tool_count: 3,
          excerpt: "G01 Z-5.0 F200",
        },
      ],
      dialect_tips: [
        {
          tip_id: "tip_001",
          title: "Fanuc arc handling",
          body: "Use IJK incremental for best compatibility",
          severity: "info",
          similarity: 0.8,
          controller_specific: true,
          tags: ["fanuc", "arc"],
        },
      ],
      citations: [
        {
          source_type: "program",
          source_id: "JM_DIE/ALCOA/prog001.nc",
          corpus: "jm_die_programs",
          engine: "PPGRAGDialectMatchEngine",
          excerpt: "Similar Fanuc program",
          confidence: 0.85,
          retrieval_score: 12.5,
        },
      ],
      total_programs_searched: 1000,
      total_tips_searched: 50,
      search_time_ms: 25,
      warnings: [],
    })),
  },
}));

describe("PPGDialectRankerEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Schema Validation", () => {
    it("should validate DialectTranslationCandidateSchema with minimal fields", () => {
      const candidate = {
        candidate_id: "cand_001",
        translation_source: "base_post",
        gcode_block: "G01 X10.0 Y20.0 F500",
        controller_family: "fanuc",
        operation_type: "linear",
      };
      const result = DialectTranslationCandidateSchema.safeParse(candidate);
      expect(result.success).toBe(true);
    });

    it("should validate DialectTranslationCandidateSchema with all fields", () => {
      const candidate = {
        candidate_id: "cand_002",
        translation_source: "adapted",
        gcode_block: "G01 X10.0 Y20.0 F500",
        original_block: "MOVE X10 Y20 FEED500",
        controller_family: "fanuc",
        operation_type: "linear",
        source_confidence: 0.9,
        adapter_id: "adapter_fanuc_v2",
      };
      const result = DialectTranslationCandidateSchema.safeParse(candidate);
      expect(result.success).toBe(true);
    });

    it("should reject invalid translation_source", () => {
      const candidate = {
        candidate_id: "cand_003",
        translation_source: "unknown_source",
        gcode_block: "G01 X10.0",
        controller_family: "fanuc",
        operation_type: "linear",
      };
      const result = DialectTranslationCandidateSchema.safeParse(candidate);
      expect(result.success).toBe(false);
    });

    it("should reject invalid operation_type", () => {
      const candidate = {
        candidate_id: "cand_004",
        translation_source: "base_post",
        gcode_block: "G01 X10.0",
        controller_family: "fanuc",
        operation_type: "invalid_op",
      };
      const result = DialectTranslationCandidateSchema.safeParse(candidate);
      expect(result.success).toBe(false);
    });

    it("should validate PPGDialectRankerInputSchema", () => {
      const input = {
        candidates: [
          {
            candidate_id: "cand_001",
            translation_source: "base_post",
            gcode_block: "G01 X10.0",
            controller_family: "fanuc",
            operation_type: "linear",
          },
        ],
        material: "4140 Steel",
        top_k: 3,
      };
      const result = PPGDialectRankerInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty candidates array", () => {
      const input = {
        candidates: [],
      };
      const result = PPGDialectRankerInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should validate PredictedRatesSchema", () => {
      const rates = {
        alarm_rate: 0.1,
        override_rate: 0.2,
        first_article_pass_rate: 0.85,
        composite_score: 0.75,
      };
      const result = PredictedRatesSchema.safeParse(rates);
      expect(result.success).toBe(true);
    });

    it("should validate ConfidenceIntervalSchema", () => {
      const ci = {
        point_estimate: 0.1,
        lower_bound: 0.05,
        upper_bound: 0.15,
        sample_size: 10,
      };
      const result = ConfidenceIntervalSchema.safeParse(ci);
      expect(result.success).toBe(true);
    });
  });

  describe("rank() Basic Functionality", () => {
    it("should return ok=true for valid input", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          {
            candidate_id: "cand_001",
            translation_source: "base_post",
            gcode_block: "G01 X10.0 Y20.0 F500",
            controller_family: "fanuc",
            operation_type: "linear",
          },
        ],
      });
      expect(result.ok).toBe(true);
      expect(result.ranked_candidates.length).toBe(1);
    });

    it("should rank multiple candidates", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          {
            candidate_id: "cand_001",
            translation_source: "base_post",
            gcode_block: "G01 X10.0 Y20.0 F500",
            controller_family: "fanuc",
            operation_type: "linear",
            source_confidence: 0.5,
          },
          {
            candidate_id: "cand_002",
            translation_source: "adapted",
            gcode_block: "G01 X10.0 Y20.0 F500",
            controller_family: "fanuc",
            operation_type: "linear",
            source_confidence: 0.9,
          },
        ],
      });
      expect(result.ok).toBe(true);
      expect(result.ranked_candidates.length).toBe(2);
      expect(result.total_candidates).toBe(2);
    });

    it("should respect top_k parameter", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c2", translation_source: "adapted", gcode_block: "G01 X2", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c3", translation_source: "template", gcode_block: "G01 X3", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c4", translation_source: "hybrid", gcode_block: "G01 X4", controller_family: "fanuc", operation_type: "linear" },
        ],
        top_k: 2,
      });
      expect(result.ranked_candidates.length).toBe(2);
      expect(result.total_candidates).toBe(4);
    });

    it("should assign sequential ranks", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c2", translation_source: "adapted", gcode_block: "G01 X2", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c3", translation_source: "template", gcode_block: "G01 X3", controller_family: "fanuc", operation_type: "linear" },
        ],
        top_k: 3,
      });
      expect(result.ranked_candidates[0].rank).toBe(1);
      expect(result.ranked_candidates[1].rank).toBe(2);
      expect(result.ranked_candidates[2].rank).toBe(3);
    });
  });

  describe("Predicted Rates", () => {
    it("should compute predicted rates for each candidate", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          {
            candidate_id: "cand_001",
            translation_source: "base_post",
            gcode_block: "G01 X10.0 Y20.0 F500",
            controller_family: "fanuc",
            operation_type: "linear",
          },
        ],
      });
      const candidate = result.ranked_candidates[0];
      expect(candidate.predicted_rates.alarm_rate).toBeGreaterThanOrEqual(0);
      expect(candidate.predicted_rates.alarm_rate).toBeLessThanOrEqual(1);
      expect(candidate.predicted_rates.override_rate).toBeGreaterThanOrEqual(0);
      expect(candidate.predicted_rates.override_rate).toBeLessThanOrEqual(1);
      expect(candidate.predicted_rates.first_article_pass_rate).toBeGreaterThanOrEqual(0);
      expect(candidate.predicted_rates.first_article_pass_rate).toBeLessThanOrEqual(1);
      expect(candidate.predicted_rates.composite_score).toBeGreaterThanOrEqual(0);
      expect(candidate.predicted_rates.composite_score).toBeLessThanOrEqual(1);
    });

    it("should favor adapted sources with lower alarm rates", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          {
            candidate_id: "base",
            translation_source: "base_post",
            gcode_block: "G01 X10.0",
            controller_family: "fanuc",
            operation_type: "linear",
            source_confidence: 0.5,
          },
          {
            candidate_id: "adapted",
            translation_source: "adapted",
            gcode_block: "G01 X10.0",
            controller_family: "fanuc",
            operation_type: "linear",
            source_confidence: 0.5,
          },
        ],
      });
      const baseCandidate = result.ranked_candidates.find(c => c.candidate_id === "base");
      const adaptedCandidate = result.ranked_candidates.find(c => c.candidate_id === "adapted");
      expect(adaptedCandidate!.predicted_rates.alarm_rate).toBeLessThan(baseCandidate!.predicted_rates.alarm_rate);
    });

    it("should report best predicted rates in summary", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c2", translation_source: "adapted", gcode_block: "G01 X2", controller_family: "fanuc", operation_type: "linear" },
        ],
      });
      expect(result.best_predicted_alarm_rate).toBeGreaterThanOrEqual(0);
      expect(result.best_predicted_alarm_rate).toBeLessThanOrEqual(1);
      expect(result.best_predicted_first_article).toBeGreaterThanOrEqual(0);
      expect(result.best_predicted_first_article).toBeLessThanOrEqual(1);
    });
  });

  describe("Confidence Intervals", () => {
    it("should generate confidence intervals for all rates", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          {
            candidate_id: "cand_001",
            translation_source: "base_post",
            gcode_block: "G01 X10.0",
            controller_family: "fanuc",
            operation_type: "linear",
          },
        ],
      });
      const candidate = result.ranked_candidates[0];

      // Alarm rate CI
      expect(candidate.alarm_rate_ci.point_estimate).toBe(candidate.predicted_rates.alarm_rate);
      expect(candidate.alarm_rate_ci.lower_bound).toBeLessThanOrEqual(candidate.alarm_rate_ci.point_estimate);
      expect(candidate.alarm_rate_ci.upper_bound).toBeGreaterThanOrEqual(candidate.alarm_rate_ci.point_estimate);

      // Override rate CI
      expect(candidate.override_rate_ci.point_estimate).toBe(candidate.predicted_rates.override_rate);

      // First article CI
      expect(candidate.first_article_ci.point_estimate).toBe(candidate.predicted_rates.first_article_pass_rate);
    });

    it("should bound confidence intervals to [0, 1]", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          {
            candidate_id: "cand_001",
            translation_source: "base_post",
            gcode_block: "G01 X10.0",
            controller_family: "fanuc",
            operation_type: "linear",
          },
        ],
      });
      const candidate = result.ranked_candidates[0];

      expect(candidate.alarm_rate_ci.lower_bound).toBeGreaterThanOrEqual(0);
      expect(candidate.alarm_rate_ci.upper_bound).toBeLessThanOrEqual(1);
      expect(candidate.override_rate_ci.lower_bound).toBeGreaterThanOrEqual(0);
      expect(candidate.override_rate_ci.upper_bound).toBeLessThanOrEqual(1);
      expect(candidate.first_article_ci.lower_bound).toBeGreaterThanOrEqual(0);
      expect(candidate.first_article_ci.upper_bound).toBeLessThanOrEqual(1);
    });
  });

  describe("Base vs Adapted Contest", () => {
    it("should compute base vs adapted summary when both exist", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "base1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "adapted1", translation_source: "adapted", gcode_block: "G01 X2", controller_family: "fanuc", operation_type: "linear" },
        ],
        include_base_vs_adapted: true,
      });
      expect(result.base_vs_adapted_summary).not.toBeNull();
      expect(result.base_vs_adapted_summary!.base_count).toBe(1);
      expect(result.base_vs_adapted_summary!.adapted_count).toBe(1);
    });

    it("should return null summary when no base candidates", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "adapted1", translation_source: "adapted", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "template1", translation_source: "template", gcode_block: "G01 X2", controller_family: "fanuc", operation_type: "linear" },
        ],
        include_base_vs_adapted: true,
      });
      expect(result.base_vs_adapted_summary).toBeNull();
    });

    it("should include base_vs_adapted info in ranked candidates", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "base1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "adapted1", translation_source: "adapted", gcode_block: "G01 X2", controller_family: "fanuc", operation_type: "linear" },
        ],
      });
      const baseCandidate = result.ranked_candidates.find(c => c.candidate_id === "base1");
      const adaptedCandidate = result.ranked_candidates.find(c => c.candidate_id === "adapted1");

      expect(baseCandidate!.base_vs_adapted).not.toBeNull();
      expect(baseCandidate!.base_vs_adapted!.is_adapted).toBe(false);
      expect(adaptedCandidate!.base_vs_adapted).not.toBeNull();
      expect(adaptedCandidate!.base_vs_adapted!.is_adapted).toBe(true);
    });
  });

  describe("RAG Integration", () => {
    it("should call RAG engine when use_rag_priors=true", () => {
      PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
        ],
        use_rag_priors: true,
      });
      expect(PPGRAGDialectMatchEngine.match).toHaveBeenCalled();
    });

    it("should not call RAG engine when use_rag_priors=false", () => {
      vi.clearAllMocks();
      PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
        ],
        use_rag_priors: false,
      });
      expect(PPGRAGDialectMatchEngine.match).not.toHaveBeenCalled();
    });

    it("should report RAG usage in output", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
        ],
        use_rag_priors: true,
      });
      expect(result.rag_programs_used).toBeGreaterThanOrEqual(0);
      expect(result.rag_tips_used).toBeGreaterThanOrEqual(0);
      expect(result.rag_retrieval_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should track similar programs from RAG", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
        ],
        use_rag_priors: true,
      });
      const candidate = result.ranked_candidates[0];
      expect(Array.isArray(candidate.similar_programs)).toBe(true);
      expect(Array.isArray(candidate.dialect_tips_applied)).toBe(true);
    });
  });

  describe("Operation Type Effects", () => {
    it("should apply higher override rate for arc operations", () => {
      const linearResult = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "linear", translation_source: "base_post", gcode_block: "G01 X10", controller_family: "fanuc", operation_type: "linear", source_confidence: 0.5 },
        ],
        use_rag_priors: false,
      });
      const arcResult = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "arc", translation_source: "base_post", gcode_block: "G02 X10 I5", controller_family: "fanuc", operation_type: "arc_cw", source_confidence: 0.5 },
        ],
        use_rag_priors: false,
      });

      expect(arcResult.ranked_candidates[0].predicted_rates.override_rate)
        .toBeGreaterThan(linearResult.ranked_candidates[0].predicted_rates.override_rate);
    });

    it("should apply lower override rate for canned cycles", () => {
      const linearResult = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "linear", translation_source: "base_post", gcode_block: "G01 X10", controller_family: "fanuc", operation_type: "linear", source_confidence: 0.5 },
        ],
        use_rag_priors: false,
      });
      const cannedResult = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "canned", translation_source: "base_post", gcode_block: "G81 Z-10 R2 F100", controller_family: "fanuc", operation_type: "canned_cycle", source_confidence: 0.5 },
        ],
        use_rag_priors: false,
      });

      expect(cannedResult.ranked_candidates[0].predicted_rates.override_rate)
        .toBeLessThan(linearResult.ranked_candidates[0].predicted_rates.override_rate);
    });
  });

  describe("Error Handling", () => {
    it("should return ok=false for invalid input", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [],
      } as unknown as Parameters<typeof PPGDialectRankerEngine.rank>[0]);
      expect(result.ok).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle RAG failures gracefully", () => {
      vi.mocked(PPGRAGDialectMatchEngine.match).mockImplementationOnce(() => {
        throw new Error("RAG service unavailable");
      });

      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
        ],
        use_rag_priors: true,
      });

      expect(result.ok).toBe(true);
      expect(result.warnings.some(w => w.includes("RAG"))).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should complete ranking within reasonable time", () => {
      const start = performance.now();
      PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c2", translation_source: "adapted", gcode_block: "G01 X2", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c3", translation_source: "template", gcode_block: "G01 X3", controller_family: "fanuc", operation_type: "linear" },
        ],
      });
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500); // Should complete in <500ms
    });

    it("should include ranking_time_ms in output", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
        ],
      });
      expect(typeof result.ranking_time_ms).toBe("number");
      expect(result.ranking_time_ms).toBeGreaterThan(0);
    });
  });

  describe("Output Schema Conformance", () => {
    it("should produce output conforming to schema", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
          { candidate_id: "c2", translation_source: "adapted", gcode_block: "G01 X2", controller_family: "fanuc", operation_type: "linear" },
        ],
      });
      const validation = PPGDialectRankerOutputSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it("should produce ranked candidates conforming to schema", () => {
      const result = PPGDialectRankerEngine.rank({
        candidates: [
          { candidate_id: "c1", translation_source: "base_post", gcode_block: "G01 X1", controller_family: "fanuc", operation_type: "linear" },
        ],
      });
      const validation = RankedDialectCandidateSchema.safeParse(result.ranked_candidates[0]);
      expect(validation.success).toBe(true);
    });
  });

  describe("isReady()", () => {
    it("should return boolean readiness status", () => {
      const ready = PPGDialectRankerEngine.isReady();
      expect(typeof ready).toBe("boolean");
    });
  });

  describe("getSelfAwareness()", () => {
    it("should return valid self-awareness metadata", () => {
      const awareness = PPGDialectRankerEngine.getSelfAwareness();
      expect(awareness.name).toBe("PPGDialectRankerEngine");
      expect(awareness.version).toBe("1.0.0");
      expect(awareness.milestone).toBe("PSAU-PPG-SFC U-PPG-SFC-10");
      expect(Array.isArray(awareness.capabilities)).toBe(true);
      expect(awareness.capabilities).toContain("rank");
      expect(awareness.capabilities).toContain("isReady");
      expect(Array.isArray(awareness.integrations)).toBe(true);
      expect(awareness.integrations).toContain("PPGRAGDialectMatchEngine");
    });
  });
});
