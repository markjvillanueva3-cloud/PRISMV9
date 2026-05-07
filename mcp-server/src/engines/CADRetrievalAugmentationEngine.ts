/**
 * CADRetrievalAugmentationEngine — CADCAM-DAGI-MS0/U-DAGI06
 *
 * Retrieval-Augmented Generation (RAG) for CAD. Before generating a new CAD
 * model, retrieves similar JM Die parts as in-context examples. Improves
 * generation accuracy and enables customer-specific styling.
 *
 * Architecture:
 *   Uses CADFeatureEmbeddingEngine (U-DAGI05) for similarity search.
 *   Formats retrieved parts as few-shot examples for generation models.
 *   Supports filtering by customer, machine type, and feature constraints.
 *
 * Key methods:
 *   retrieve(query, corpus, backend, filters?, k?)  — find similar parts
 *   formatExamples(results, format?)                — format as prompt context
 *   augment(query, corpus, backend, generator)      — full RAG pipeline
 *   filterCorpus(corpus, filters)                   — pre-filter by metadata
 *   rankByRelevance(results, query)                 — re-rank with features
 *
 * Filters:
 *   - customer: exact match (e.g., "ALCOA", "ITW")
 *   - machineCategory: "lathe" | "mill" | "wire_edm" | "sinker_edm"
 *   - features: array of required features (e.g., ["hole", "pocket"])
 *   - minSimilarity: threshold for cosine distance (1 - cosine = 0 for exact)
 *
 * Performance:
 *   retrieve   O(filter cost + search cost) — typically < 200ms for 10k
 *   formatExamples  O(k) — negligible
 *   augment    O(retrieve + generate) — generation dominates
 *
 * References:
 *   - Lewis et al. 2020, "Retrieval-Augmented Generation for Knowledge-Intensive Tasks"
 *   - Guu et al. 2020, "REALM: Retrieval-Augmented Language Model Pre-Training"
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import {
  cadFeatureEmbeddingEngine,
  type EmbeddingBackend,
  type IndexedEmbedding,
  type SearchResult,
  type SimilarityIndex,
  type TokenSeq,
} from "./CADFeatureEmbeddingEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

/** Machine category for filtering. */
export type MachineCategory = "lathe" | "mill" | "wire_edm" | "sinker_edm" | "hurco" | "hypermill" | "unknown";

/** Corpus entry with metadata for RAG. */
export interface RAGCorpusEntry {
  id: string;
  tokens: TokenSeq;
  customer?: string;
  machineCategory?: MachineCategory;
  features?: string[];
  sourcePath?: string;
  metadata?: Record<string, unknown>;
}

/** Retrieval filters. */
export interface RetrievalFilters {
  customer?: string | string[];
  machineCategory?: MachineCategory | MachineCategory[];
  features?: string[];
  minSimilarity?: number; // 0 = exact match, 1 = anything
  excludeIds?: string[];
}

/** RAG retrieval result with metadata. */
export interface RAGResult {
  id: string;
  distance: number;
  similarity: number; // 1 - distance for cosine
  customer?: string;
  machineCategory?: MachineCategory;
  features?: string[];
  tokens: TokenSeq;
  metadata?: Record<string, unknown>;
}

/** Example format for generation context. */
export type ExampleFormat = "tokens" | "json" | "natural" | "code";

/** Formatted examples for prompt injection. */
export interface FormattedExamples {
  format: ExampleFormat;
  examples: string[];
  totalTokens: number;
  preamble: string;
}

/** Generator callback for augmented generation. */
export interface RAGGenerator {
  generate(context: string, query: RAGCorpusEntry): Promise<TokenSeq>;
}

/** Augmented generation result. */
export interface AugmentedResult {
  generated: TokenSeq;
  retrievedCount: number;
  retrievalTimeMs: number;
  generationTimeMs: number;
  examples: RAGResult[];
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * CADRetrievalAugmentationEngine — RAG for CAD generation using similarity
 * search over a corpus of JM Die parts.
 */
export class CADRetrievalAugmentationEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADRetrievalAugmentationEngine",
      version: "1.0.0",
      domain: "cad_neural",
      description:
        "Retrieval-Augmented Generation for CAD. Retrieves similar JM Die " +
        "parts as in-context examples to improve generation accuracy.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "retrieve", description: "Retrieve similar parts from corpus", actions: ["rag_retrieve"] },
      { name: "format_examples", description: "Format retrieved parts as context", actions: ["rag_format"] },
      { name: "augment", description: "Full RAG generation pipeline", actions: ["rag_generate"] },
      { name: "filter_corpus", description: "Pre-filter corpus by metadata", actions: ["rag_filter"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const obj = input as Record<string, unknown>;
    if ("query" in obj && "corpus" in obj && "backend" in obj) {
      return this.retrieve(
        obj.query as RAGCorpusEntry,
        obj.corpus as RAGCorpusEntry[],
        obj.backend as EmbeddingBackend,
        obj.filters as RetrievalFilters | undefined,
        (obj.k as number) ?? 5,
      );
    }
    throw new Error("CADRetrievalAugmentationEngine: unrecognized input shape");
  }

  // ── Corpus filtering ─────────────────────────────────────────────────────

  /**
   * Filter corpus by metadata before similarity search.
   * More efficient than post-filtering for large corpora.
   */
  filterCorpus(corpus: RAGCorpusEntry[], filters: RetrievalFilters): RAGCorpusEntry[] {
    return corpus.filter((entry) => {
      // Customer filter
      if (filters.customer) {
        const customers = Array.isArray(filters.customer) ? filters.customer : [filters.customer];
        if (!entry.customer || !customers.includes(entry.customer)) return false;
      }

      // Machine category filter
      if (filters.machineCategory) {
        const cats = Array.isArray(filters.machineCategory) ? filters.machineCategory : [filters.machineCategory];
        if (!entry.machineCategory || !cats.includes(entry.machineCategory)) return false;
      }

      // Features filter (all must be present)
      if (filters.features && filters.features.length > 0) {
        const entryFeatures = new Set(entry.features ?? []);
        if (!filters.features.every((f) => entryFeatures.has(f))) return false;
      }

      // Exclude IDs
      if (filters.excludeIds && filters.excludeIds.includes(entry.id)) return false;

      return true;
    });
  }

  // ── Retrieval ────────────────────────────────────────────────────────────

  /**
   * Retrieve top-k similar parts from corpus.
   * Applies filters, embeds, builds index, searches.
   */
  retrieve(
    query: RAGCorpusEntry,
    corpus: RAGCorpusEntry[],
    backend: EmbeddingBackend,
    filters?: RetrievalFilters,
    k: number = 5,
  ): RAGResult[] {
    if (corpus.length === 0) return [];

    // Apply pre-filters
    let filtered = corpus;
    if (filters) {
      filtered = this.filterCorpus(corpus, filters);
    }
    if (filtered.length === 0) return [];

    // Build embeddings and index
    const indexed: IndexedEmbedding[] = filtered.map((entry) => ({
      id: entry.id,
      embedding: cadFeatureEmbeddingEngine.embed(entry.tokens, backend),
      metadata: { ...entry.metadata, customer: entry.customer, machineCategory: entry.machineCategory },
    }));
    const index = cadFeatureEmbeddingEngine.buildIndex(indexed, "flat", "cosine");

    // Search
    const queryEmbed = cadFeatureEmbeddingEngine.embed(query.tokens, backend);
    const searchResults = cadFeatureEmbeddingEngine.search(queryEmbed, index, k, "cosine");

    // Map back to RAG results with full metadata
    const entryMap = new Map(filtered.map((e) => [e.id, e]));
    const results: RAGResult[] = [];
    for (const sr of searchResults) {
      const entry = entryMap.get(sr.id!);
      if (!entry) continue;

      // Apply minSimilarity filter
      const similarity = 1 - sr.distance;
      if (filters?.minSimilarity !== undefined && similarity < filters.minSimilarity) continue;

      results.push({
        id: entry.id,
        distance: sr.distance,
        similarity,
        customer: entry.customer,
        machineCategory: entry.machineCategory,
        features: entry.features,
        tokens: entry.tokens,
        metadata: entry.metadata,
      });
    }

    return results;
  }

  // ── Example formatting ───────────────────────────────────────────────────

  /**
   * Format retrieved results as in-context examples for generation.
   */
  formatExamples(results: RAGResult[], format: ExampleFormat = "json"): FormattedExamples {
    const examples: string[] = [];
    let totalTokens = 0;

    for (const r of results) {
      totalTokens += r.tokens.length;
      switch (format) {
        case "tokens":
          examples.push(`[${r.id}]: ${r.tokens.join(",")}`);
          break;
        case "json":
          examples.push(JSON.stringify({
            id: r.id,
            customer: r.customer,
            machineCategory: r.machineCategory,
            features: r.features,
            tokens: r.tokens,
          }));
          break;
        case "natural":
          examples.push(
            `Example ${r.id} (${r.customer ?? "unknown"}, ${r.machineCategory ?? "unknown"}): ` +
            `${r.tokens.length} tokens, features: ${r.features?.join(", ") ?? "none"}`
          );
          break;
        case "code":
          examples.push(`# ${r.id}\n# Customer: ${r.customer}\n# Machine: ${r.machineCategory}\ntokens = [${r.tokens.join(", ")}]`);
          break;
      }
    }

    const preamble = format === "natural"
      ? `Here are ${results.length} similar parts from the JM Die archive:\n\n`
      : format === "code"
      ? "# Retrieved similar parts from JM Die corpus:\n\n"
      : `// ${results.length} similar parts:\n`;

    return { format, examples, totalTokens, preamble };
  }

  // ── Relevance re-ranking ─────────────────────────────────────────────────

  /**
   * Re-rank results by feature overlap with query.
   * Combines embedding similarity with explicit feature matching.
   */
  rankByRelevance(
    results: RAGResult[],
    query: RAGCorpusEntry,
    featureWeight: number = 0.3,
  ): RAGResult[] {
    const queryFeatures = new Set(query.features ?? []);
    if (queryFeatures.size === 0) return results; // No features to match

    const scored = results.map((r) => {
      const resultFeatures = new Set(r.features ?? []);
      // Jaccard similarity for features
      const intersection = [...queryFeatures].filter((f) => resultFeatures.has(f)).length;
      const union = new Set([...queryFeatures, ...resultFeatures]).size;
      const featureScore = union > 0 ? intersection / union : 0;

      // Combined score (lower = better, so we subtract feature bonus)
      const combinedDistance = r.distance * (1 - featureWeight) - featureScore * featureWeight;
      return { ...r, distance: combinedDistance };
    });

    return scored.sort((a, b) => a.distance - b.distance);
  }

  // ── Full RAG pipeline ────────────────────────────────────────────────────

  /**
   * Full retrieval-augmented generation pipeline.
   * 1. Retrieve similar parts
   * 2. Format as context
   * 3. Call generator with augmented prompt
   */
  async augment(
    query: RAGCorpusEntry,
    corpus: RAGCorpusEntry[],
    backend: EmbeddingBackend,
    generator: RAGGenerator,
    filters?: RetrievalFilters,
    k: number = 5,
    format: ExampleFormat = "json",
  ): Promise<AugmentedResult> {
    const retrievalStart = performance.now();
    let results = this.retrieve(query, corpus, backend, filters, k);

    // Re-rank if query has features
    if (query.features && query.features.length > 0) {
      results = this.rankByRelevance(results, query);
    }
    const retrievalTimeMs = performance.now() - retrievalStart;

    // Format examples
    const formatted = this.formatExamples(results, format);
    const context = formatted.preamble + formatted.examples.join("\n\n");

    // Generate
    const generationStart = performance.now();
    const generated = await generator.generate(context, query);
    const generationTimeMs = performance.now() - generationStart;

    return {
      generated,
      retrievedCount: results.length,
      retrievalTimeMs,
      generationTimeMs,
      examples: results,
    };
  }

  // ── Utility ──────────────────────────────────────────────────────────────

  /**
   * Get unique customers in corpus.
   */
  getCustomers(corpus: RAGCorpusEntry[]): string[] {
    const customers = new Set<string>();
    for (const e of corpus) {
      if (e.customer) customers.add(e.customer);
    }
    return Array.from(customers).sort();
  }

  /**
   * Get corpus statistics.
   */
  getCorpusStats(corpus: RAGCorpusEntry[]): {
    total: number;
    byCustomer: Record<string, number>;
    byMachine: Record<string, number>;
  } {
    const byCustomer: Record<string, number> = {};
    const byMachine: Record<string, number> = {};

    for (const e of corpus) {
      const cust = e.customer ?? "unknown";
      const mach = e.machineCategory ?? "unknown";
      byCustomer[cust] = (byCustomer[cust] ?? 0) + 1;
      byMachine[mach] = (byMachine[mach] ?? 0) + 1;
    }

    return { total: corpus.length, byCustomer, byMachine };
  }
}

export const cadRetrievalAugmentationEngine = new CADRetrievalAugmentationEngine();
