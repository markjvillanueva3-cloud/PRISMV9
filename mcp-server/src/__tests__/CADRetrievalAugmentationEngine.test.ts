/**
 * CADRetrievalAugmentationEngine Tests — CADCAM-DAGI-MS0/U-DAGI06
 *
 * Exit gate: 15+ tests covering retrieve, filter, format, augment.
 * Uses MockEmbeddingBackend from U-DAGI05 tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  CADRetrievalAugmentationEngine,
  cadRetrievalAugmentationEngine,
  type RAGCorpusEntry,
  type RAGGenerator,
  type RetrievalFilters,
  type MachineCategory,
} from "../engines/CADRetrievalAugmentationEngine.js";
import type { EmbeddingBackend, TokenSeq, Embedding } from "../engines/CADFeatureEmbeddingEngine.js";

// ── Mock Backend ─────────────────────────────────────────────────────────────

class MockEmbeddingBackend implements EmbeddingBackend {
  readonly dim = 64;

  embed(tokens: TokenSeq): Embedding {
    const emb = new Float32Array(this.dim);
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      for (let j = 0; j < 4; j++) {
        const idx = (t * 31 + j * 7 + i * 13) % this.dim;
        emb[idx] += Math.sin(t * (j + 1) * 0.1) / (i + 1);
      }
    }
    return emb;
  }
}

// ── Mock Generator ───────────────────────────────────────────────────────────

class MockGenerator implements RAGGenerator {
  lastContext = "";
  async generate(context: string, _query: RAGCorpusEntry): Promise<TokenSeq> {
    this.lastContext = context;
    // Return some tokens based on context length
    return [100, 200, 300, context.length % 100];
  }
}

// ── Test Corpus ──────────────────────────────────────────────────────────────

function createTestCorpus(): RAGCorpusEntry[] {
  return [
    { id: "alcoa-1", tokens: [1, 2, 3], customer: "ALCOA", machineCategory: "lathe", features: ["shaft", "bore"] },
    { id: "alcoa-2", tokens: [1, 2, 4], customer: "ALCOA", machineCategory: "lathe", features: ["shaft", "thread"] },
    { id: "alcoa-3", tokens: [5, 6, 7], customer: "ALCOA", machineCategory: "mill", features: ["pocket", "hole"] },
    { id: "itw-1", tokens: [1, 2, 5], customer: "ITW", machineCategory: "lathe", features: ["shaft"] },
    { id: "itw-2", tokens: [8, 9, 10], customer: "ITW", machineCategory: "wire_edm", features: ["cavity", "profile"] },
    { id: "fastenal-1", tokens: [11, 12, 13], customer: "FASTENAL", machineCategory: "mill", features: ["pocket", "thread"] },
    { id: "sfs-1", tokens: [1, 2, 3, 4], customer: "SFS", machineCategory: "sinker_edm", features: ["electrode"] },
  ];
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CADRetrievalAugmentationEngine", () => {
  let engine: CADRetrievalAugmentationEngine;
  let backend: MockEmbeddingBackend;
  let corpus: RAGCorpusEntry[];

  beforeEach(() => {
    engine = new CADRetrievalAugmentationEngine();
    backend = new MockEmbeddingBackend();
    corpus = createTestCorpus();
  });

  // ── Corpus filtering ─────────────────────────────────────────────────────

  describe("filterCorpus", () => {
    it("filters by single customer", () => {
      const filtered = engine.filterCorpus(corpus, { customer: "ALCOA" });
      expect(filtered.length).toBe(3);
      expect(filtered.every((e) => e.customer === "ALCOA")).toBe(true);
    });

    it("filters by multiple customers", () => {
      const filtered = engine.filterCorpus(corpus, { customer: ["ALCOA", "ITW"] });
      expect(filtered.length).toBe(5);
    });

    it("filters by machine category", () => {
      const filtered = engine.filterCorpus(corpus, { machineCategory: "lathe" });
      expect(filtered.length).toBe(3);
      expect(filtered.every((e) => e.machineCategory === "lathe")).toBe(true);
    });

    it("filters by multiple machine categories", () => {
      const filtered = engine.filterCorpus(corpus, { machineCategory: ["lathe", "mill"] });
      expect(filtered.length).toBe(5);
    });

    it("filters by required features", () => {
      const filtered = engine.filterCorpus(corpus, { features: ["shaft"] });
      expect(filtered.length).toBe(3);
    });

    it("requires all features to match", () => {
      const filtered = engine.filterCorpus(corpus, { features: ["shaft", "bore"] });
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("alcoa-1");
    });

    it("filters by excludeIds", () => {
      const filtered = engine.filterCorpus(corpus, { excludeIds: ["alcoa-1", "alcoa-2"] });
      expect(filtered.length).toBe(5);
      expect(filtered.some((e) => e.id === "alcoa-1")).toBe(false);
    });

    it("combines multiple filters", () => {
      const filtered = engine.filterCorpus(corpus, {
        customer: "ALCOA",
        machineCategory: "lathe",
        features: ["shaft"],
      });
      expect(filtered.length).toBe(2);
    });

    it("returns empty for non-matching filters", () => {
      const filtered = engine.filterCorpus(corpus, { customer: "NONEXISTENT" });
      expect(filtered.length).toBe(0);
    });
  });

  // ── Retrieval ────────────────────────────────────────────────────────────

  describe("retrieve", () => {
    it("retrieves similar parts", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 3);
      expect(results.length).toBe(3);
      expect(results[0].similarity).toBeGreaterThan(0);
    });

    it("returns exact match first", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 1);
      expect(results[0].id).toBe("alcoa-1"); // Same tokens
      expect(results[0].similarity).toBeCloseTo(1, 3);
    });

    it("respects customer filter", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, { customer: "ITW" }, 5);
      expect(results.every((r) => r.customer === "ITW")).toBe(true);
    });

    it("respects machineCategory filter", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [5, 6, 7] };
      const results = engine.retrieve(query, corpus, backend, { machineCategory: "mill" }, 5);
      expect(results.every((r) => r.machineCategory === "mill")).toBe(true);
    });

    it("respects minSimilarity filter", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, { minSimilarity: 0.99 }, 10);
      expect(results.every((r) => r.similarity >= 0.99)).toBe(true);
    });

    it("returns empty for empty corpus", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, [], backend);
      expect(results.length).toBe(0);
    });

    it("includes metadata in results", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 1);
      expect(results[0].customer).toBe("ALCOA");
      expect(results[0].machineCategory).toBe("lathe");
      expect(results[0].features).toContain("shaft");
    });
  });

  // ── Example formatting ───────────────────────────────────────────────────

  describe("formatExamples", () => {
    it("formats as JSON", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 2);
      const formatted = engine.formatExamples(results, "json");
      expect(formatted.format).toBe("json");
      expect(formatted.examples.length).toBe(2);
      expect(JSON.parse(formatted.examples[0]).id).toBeDefined();
    });

    it("formats as tokens", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 2);
      const formatted = engine.formatExamples(results, "tokens");
      expect(formatted.examples[0]).toMatch(/\[.*\]:/);
    });

    it("formats as natural language", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 1);
      const formatted = engine.formatExamples(results, "natural");
      expect(formatted.examples[0]).toContain("Example");
      expect(formatted.preamble).toContain("similar parts");
    });

    it("formats as code", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 1);
      const formatted = engine.formatExamples(results, "code");
      expect(formatted.examples[0]).toContain("tokens = [");
    });

    it("tracks total tokens", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 2);
      const formatted = engine.formatExamples(results, "json");
      expect(formatted.totalTokens).toBeGreaterThan(0);
    });
  });

  // ── Relevance re-ranking ─────────────────────────────────────────────────

  describe("rankByRelevance", () => {
    it("re-ranks by feature overlap", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3], features: ["pocket", "hole"] };
      const results = engine.retrieve(query, corpus, backend, undefined, 5);
      const ranked = engine.rankByRelevance(results, query);
      // alcoa-3 has both "pocket" and "hole"
      const alcoa3Idx = ranked.findIndex((r) => r.id === "alcoa-3");
      expect(alcoa3Idx).toBeLessThan(3); // Should be near top
    });

    it("returns unchanged if query has no features", () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const results = engine.retrieve(query, corpus, backend, undefined, 3);
      const ranked = engine.rankByRelevance(results, query);
      expect(ranked.map((r) => r.id)).toEqual(results.map((r) => r.id));
    });
  });

  // ── Full RAG pipeline ────────────────────────────────────────────────────

  describe("augment", () => {
    it("runs full RAG pipeline", async () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const generator = new MockGenerator();
      const result = await engine.augment(query, corpus, backend, generator, undefined, 3);

      expect(result.generated.length).toBeGreaterThan(0);
      expect(result.retrievedCount).toBe(3);
      expect(result.retrievalTimeMs).toBeGreaterThan(0);
      expect(result.generationTimeMs).toBeGreaterThan(0);
      expect(result.examples.length).toBe(3);
    });

    it("passes context to generator", async () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const generator = new MockGenerator();
      await engine.augment(query, corpus, backend, generator, undefined, 2, "json");

      expect(generator.lastContext).toContain("similar parts");
      expect(generator.lastContext).toContain("alcoa");
    });

    it("applies filters in augment", async () => {
      const query: RAGCorpusEntry = { id: "query", tokens: [1, 2, 3] };
      const generator = new MockGenerator();
      const result = await engine.augment(
        query, corpus, backend, generator,
        { customer: "ITW" }, 5
      );

      expect(result.examples.every((e) => e.customer === "ITW")).toBe(true);
    });
  });

  // ── Utility methods ──────────────────────────────────────────────────────

  describe("utility", () => {
    it("getCustomers returns unique customers", () => {
      const customers = engine.getCustomers(corpus);
      expect(customers).toContain("ALCOA");
      expect(customers).toContain("ITW");
      expect(customers).toContain("FASTENAL");
      expect(customers.length).toBe(4);
    });

    it("getCorpusStats returns counts", () => {
      const stats = engine.getCorpusStats(corpus);
      expect(stats.total).toBe(7);
      expect(stats.byCustomer["ALCOA"]).toBe(3);
      expect(stats.byMachine["lathe"]).toBe(3);
    });
  });

  // ── BaseEngine contract ──────────────────────────────────────────────────

  describe("BaseEngine contract", () => {
    it("has correct engine info", () => {
      const info = cadRetrievalAugmentationEngine.info;
      expect(info.name).toBe("CADRetrievalAugmentationEngine");
      expect(info.version).toBe("1.0.0");
      expect(info.domain).toBe("cad_neural");
    });

    it("has capabilities with actions", () => {
      const caps = cadRetrievalAugmentationEngine.getCapabilities();
      expect(caps.length).toBeGreaterThan(0);
      expect(caps.some((c) => c.name === "retrieve")).toBe(true);
      expect(caps.some((c) => c.name === "augment")).toBe(true);
    });

    it("validates input", () => {
      expect(cadRetrievalAugmentationEngine.validate(null)).not.toBeNull();
      expect(cadRetrievalAugmentationEngine.validate({})).toBeNull();
    });
  });

  // ── Performance ──────────────────────────────────────────────────────────

  describe("performance", () => {
    it("retrieval completes under 200ms for 1000 entries", () => {
      // Create larger corpus
      const largCorpus: RAGCorpusEntry[] = [];
      for (let i = 0; i < 1000; i++) {
        largCorpus.push({
          id: `part-${i}`,
          tokens: [i, i + 1, i + 2],
          customer: i % 3 === 0 ? "ALCOA" : i % 3 === 1 ? "ITW" : "FASTENAL",
          machineCategory: i % 2 === 0 ? "lathe" : "mill",
        });
      }

      const query: RAGCorpusEntry = { id: "query", tokens: [500, 501, 502] };
      const start = performance.now();
      const results = engine.retrieve(query, largCorpus, backend, undefined, 10);
      const elapsed = performance.now() - start;

      expect(results.length).toBe(10);
      expect(elapsed).toBeLessThan(200);
    });
  });
});
