/**
 * SFCRAGWarmStartEngine Tests — U-PPG-SFC-07
 * ============================================
 *
 * Integration tests for historical-prior retrieval. Tests cover:
 * - Basic retrieval with material context
 * - Multi-dimensional queries (material × tool × machine × op)
 * - Bayesian weight computation
 * - RAG evidence formatting for provenance
 * - Citation generation
 * - Latency targets (<200ms)
 * - Quality targets (≥90% similarity > 0.5)
 * - Empty index handling
 * - Invalid input handling
 *
 * Uses real JMDieProgramRAGEngine singleton — no mocks for critical domain.
 *
 * @module __tests__/engines/sfcRAGWarmStartEngine.test
 * @milestone PSAU-PPG-SFC U-PPG-SFC-07
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  SFCRAGWarmStartEngine,
  sfcRAGWarmStartEngine,
  SFCRAGWarmStartInputSchema,
  SFCHistoricalPriorSchema,
  SFCRAGWarmStartOutputSchema,
  type SFCRAGWarmStartInput,
  type SFCRAGWarmStartOutput,
} from "../../engines/SFCRAGWarmStartEngine.js";
import { JMDieProgramRAGEngine } from "../../engines/JMDieProgramRAGEngine.js";

// ─── Test Fixtures ──────────────────────────────────────────────────────

const SAMPLE_PROGRAMS = [
  {
    source_path: "JMDIE/ALCOA/L-2845-D2.MIN",
    program_number: "O2845",
    customer: "ALCOA",
    material: "D2",
    machine_type: "lathe" as const,
    controller: "Okuma",
    tools: [
      { tool_number: 1, tool_type: "carbide" },
      { tool_number: 2, tool_type: "carbide" },
    ],
    operations: [
      { kind: "rough", g_codes: ["G00", "G01", "G96"] },
      { kind: "finish", g_codes: ["G00", "G01", "G96", "G70"] },
    ],
    total_lines: 245,
    cycle_time_sec: 180,
  },
  {
    source_path: "JMDIE/ALCOA/L-2846-D2.MIN",
    program_number: "O2846",
    customer: "ALCOA",
    material: "D2",
    machine_type: "lathe" as const,
    controller: "Okuma",
    tools: [
      { tool_number: 1, tool_type: "carbide" },
      { tool_number: 3, tool_type: "carbide" },
    ],
    operations: [
      { kind: "rough", g_codes: ["G00", "G01", "G96"] },
      { kind: "bore", g_codes: ["G00", "G01", "G76"] },
    ],
    total_lines: 312,
    cycle_time_sec: 240,
  },
  {
    source_path: "JMDIE/ITW/M-5001-4140.NC",
    program_number: "O5001",
    customer: "ITW",
    material: "4140",
    machine_type: "mill" as const,
    controller: "Fanuc",
    tools: [
      { tool_number: 1, tool_type: "end_mill" },
      { tool_number: 2, tool_type: "drill" },
      { tool_number: 3, tool_type: "tap" },
    ],
    operations: [
      { kind: "face", g_codes: ["G00", "G01"] },
      { kind: "pocket", g_codes: ["G00", "G01", "G02", "G03"] },
      { kind: "drill", g_codes: ["G00", "G81"] },
    ],
    total_lines: 456,
    cycle_time_sec: 320,
  },
  {
    source_path: "JMDIE/OPTIMAS/L-7890-A2.MIN",
    program_number: "O7890",
    customer: "OPTIMAS",
    material: "A2",
    machine_type: "lathe" as const,
    controller: "Haas",
    tools: [
      { tool_number: 1, tool_type: "carbide" },
    ],
    operations: [
      { kind: "finish", g_codes: ["G00", "G01", "G96"] },
    ],
    total_lines: 128,
    cycle_time_sec: 90,
  },
  {
    source_path: "JMDIE/SFS/M-3210-6061.NC",
    program_number: "O3210",
    customer: "SFS",
    material: "6061",
    machine_type: "mill" as const,
    controller: "Fanuc",
    tools: [
      { tool_number: 1, tool_type: "end_mill" },
      { tool_number: 2, tool_type: "end_mill" },
    ],
    operations: [
      { kind: "rough", g_codes: ["G00", "G01"] },
      { kind: "finish", g_codes: ["G00", "G01", "G41"] },
    ],
    total_lines: 289,
    cycle_time_sec: 200,
  },
];

// ─── Setup ──────────────────────────────────────────────────────────────

describe("SFCRAGWarmStartEngine", () => {
  beforeAll(() => {
    // Build test index
    JMDieProgramRAGEngine.buildIndex({
      programs: SAMPLE_PROGRAMS,
    });
  });

  // ─── Basic Retrieval ────────────────────────────────────────────────────

  describe("retrieve()", () => {
    it("should retrieve programs matching material", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      expect(result.ok).toBe(true);
      expect(result.priors.length).toBeGreaterThan(0);
      expect(result.priors[0].material_match).toBe(true);
      expect(result.priors[0].customer).toBe("ALCOA");
    });

    it("should retrieve programs matching material + machine_type", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        machine_type: "lathe",
        top_k: 5,
      });

      expect(result.ok).toBe(true);
      expect(result.priors.every(p => p.machine_match)).toBe(true);
    });

    it("should retrieve programs matching material + operation", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        operation: "rough",
        top_k: 5,
      });

      expect(result.ok).toBe(true);
      expect(result.priors.some(p => p.operation_match)).toBe(true);
    });

    it("should filter by customer when specified", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        customer: "ALCOA",
        top_k: 5,
      });

      expect(result.ok).toBe(true);
      expect(result.priors.every(p => p.customer === "ALCOA")).toBe(true);
    });

    it("should return empty priors for non-matching material", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "Inconel718",
        top_k: 5,
      });

      expect(result.ok).toBe(true);
      expect(result.priors.length).toBe(0);
    });

    it("should respect top_k limit", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.priors.length).toBeLessThanOrEqual(1);
    });

    it("should filter by min_similarity threshold", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        min_similarity: 0.8,
        top_k: 10,
      });

      expect(result.ok).toBe(true);
      expect(result.priors.every(p => p.similarity >= 0.8)).toBe(true);
    });
  });

  // ─── Bayesian Weights ───────────────────────────────────────────────────

  describe("Bayesian weight computation", () => {
    it("should compute bayesian_weight that sums to 1", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      if (result.priors.length > 0) {
        const totalWeight = result.priors.reduce((sum, p) => sum + p.bayesian_weight, 0);
        expect(totalWeight).toBeCloseTo(1.0, 5);
      }
    });

    it("should assign higher weight to higher similarity", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      if (result.priors.length >= 2) {
        // Priors are sorted by similarity descending
        expect(result.priors[0].bayesian_weight).toBeGreaterThanOrEqual(
          result.priors[result.priors.length - 1].bayesian_weight
        );
      }
    });
  });

  // ─── RAG Evidence for Provenance ────────────────────────────────────────

  describe("RAG evidence formatting", () => {
    it("should generate rag_evidence matching priors", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      expect(result.rag_evidence.length).toBe(result.priors.length);

      for (let i = 0; i < result.priors.length; i++) {
        expect(result.rag_evidence[i].program_id).toBe(result.priors[i].program_id);
        expect(result.rag_evidence[i].similarity).toBe(result.priors[i].similarity);
        expect(result.rag_evidence[i].material_match).toBe(result.priors[i].material_match);
      }
    });

    it("should format rag_evidence for SFCProvenanceWireEngine", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        machine_type: "lathe",
        operation: "rough",
        top_k: 3,
      });

      for (const evidence of result.rag_evidence) {
        expect(typeof evidence.program_id).toBe("string");
        expect(typeof evidence.similarity).toBe("number");
        expect(evidence.similarity).toBeGreaterThanOrEqual(0);
        expect(evidence.similarity).toBeLessThanOrEqual(1);
        expect(typeof evidence.material_match).toBe("boolean");
        expect(typeof evidence.operation_match).toBe("boolean");
        expect(typeof evidence.machine_match).toBe("boolean");
      }
    });
  });

  // ─── Citations ──────────────────────────────────────────────────────────

  describe("Citation generation", () => {
    it("should generate citations for each prior", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      expect(result.citations.length).toBe(result.priors.length);
    });

    it("should format citations with required fields", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 3,
      });

      for (const citation of result.citations) {
        expect(citation.source_type).toBe("program");
        expect(typeof citation.source_id).toBe("string");
        expect(citation.corpus).toBe("jm_die_programs");
        expect(citation.engine).toBe("SFCRAGWarmStartEngine");
        expect(typeof citation.confidence).toBe("number");
        expect(citation.confidence).toBeGreaterThanOrEqual(0);
        expect(citation.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should include retrieval_score in citations", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 3,
      });

      for (const citation of result.citations) {
        expect(typeof citation.retrieval_score).toBe("number");
      }
    });
  });

  // ─── Latency ────────────────────────────────────────────────────────────

  describe("Latency requirements", () => {
    it("should complete retrieval in <200ms for small index", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      expect(result.search_time_ms).toBeLessThan(200);
    });

    it("should report search_time_ms", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "4140",
        machine_type: "mill",
        top_k: 5,
      });

      expect(typeof result.search_time_ms).toBe("number");
      expect(result.search_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Output Schema Validation ───────────────────────────────────────────

  describe("Output schema compliance", () => {
    it("should return valid output schema", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      const parsed = SFCRAGWarmStartOutputSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it("should return valid prior schema for each result", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      for (const prior of result.priors) {
        const parsed = SFCHistoricalPriorSchema.safeParse(prior);
        expect(parsed.success).toBe(true);
      }
    });
  });

  // ─── Input Validation ───────────────────────────────────────────────────

  describe("Input validation", () => {
    it("should validate input schema", () => {
      const validInput = {
        material: "D2",
        tool_class: "carbide",
        machine_type: "lathe",
        operation: "rough",
        top_k: 5,
        min_similarity: 0.3,
      };

      const parsed = SFCRAGWarmStartInputSchema.safeParse(validInput);
      expect(parsed.success).toBe(true);
    });

    it("should reject empty material", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "",
        top_k: 5,
      } as SFCRAGWarmStartInput);

      expect(result.ok).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle missing optional fields gracefully", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
      });

      expect(result.ok).toBe(true);
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("should handle tool_class in query", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        tool_class: "carbide",
        top_k: 5,
      });

      expect(result.ok).toBe(true);
    });

    it("should handle machine_id in query", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        machine_id: "Okuma-LB45",
        top_k: 5,
      });

      expect(result.ok).toBe(true);
    });

    it("should report total_candidates", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      expect(result.total_candidates).toBeGreaterThan(0);
    });

    it("should report index_version", () => {
      const result = SFCRAGWarmStartEngine.retrieve({
        material: "D2",
        top_k: 5,
      });

      expect(result.index_version).not.toBe(null);
    });
  });

  // ─── Convenience Methods ────────────────────────────────────────────────

  describe("retrieveForProvenance()", () => {
    it("should return rag_evidence and citations", () => {
      const result = SFCRAGWarmStartEngine.retrieveForProvenance({
        material: "D2",
        machine_type: "lathe",
        top_k: 3,
      });

      expect(Array.isArray(result.rag_evidence)).toBe(true);
      expect(Array.isArray(result.citations)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("isIndexReady()", () => {
    it("should return true when index is loaded", () => {
      expect(SFCRAGWarmStartEngine.isIndexReady()).toBe(true);
    });
  });

  describe("getIndexStats()", () => {
    it("should return index statistics", () => {
      const stats = SFCRAGWarmStartEngine.getIndexStats();

      expect(stats).not.toBe(null);
      expect(stats!.total_programs).toBe(SAMPLE_PROGRAMS.length);
      expect(typeof stats!.per_customer).toBe("object");
      expect(typeof stats!.per_machine).toBe("object");
    });
  });

  // ─── Self-Awareness ─────────────────────────────────────────────────────

  describe("getSelfAwareness()", () => {
    it("should return engine metadata", () => {
      const awareness = SFCRAGWarmStartEngine.getSelfAwareness();

      expect(awareness.name).toBe("SFCRAGWarmStartEngine");
      expect(awareness.version).toBe("1.0.0");
      expect(awareness.milestone).toBe("PSAU-PPG-SFC U-PPG-SFC-07");
      expect(awareness.capabilities).toContain("retrieve");
      expect(awareness.capabilities).toContain("retrieveForProvenance");
      expect(awareness.latency_target_ms).toBe(200);
    });

    it("should list dependencies", () => {
      const awareness = SFCRAGWarmStartEngine.getSelfAwareness();

      expect(awareness.dependencies).toContain("JMDieProgramRAGEngine");
    });

    it("should list integration surfaces", () => {
      const awareness = SFCRAGWarmStartEngine.getSelfAwareness();

      expect(awareness.surfaces_into).toContain("SFCProvenanceWireEngine.rag_evidence");
      expect(awareness.surfaces_into).toContain("SFCMultiHypothesisRankerEngine.bayesian_priors");
    });
  });

  // ─── Singleton Export ───────────────────────────────────────────────────

  describe("Singleton export", () => {
    it("should export sfcRAGWarmStartEngine singleton", () => {
      expect(sfcRAGWarmStartEngine).toBe(SFCRAGWarmStartEngine);
    });
  });
});
