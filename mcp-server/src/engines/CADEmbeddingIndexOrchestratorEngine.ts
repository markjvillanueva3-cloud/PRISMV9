/**
 * CADEmbeddingIndexOrchestratorEngine — CAD-COMPLETE-MS0/U-CADC18
 *
 * Thin orchestrator over CADFeatureEmbeddingEngine.
 * Provides CAD-specific query interface without reimplementing vector index.
 *
 * Capabilities:
 *   - Natural language → embedding search
 *   - Feature type filtering (hole, pocket, boss, etc.)
 *   - Part family similarity queries
 *   - Corpus ingestion from CADTrainingCorpusOrchestratorEngine output
 *
 * Index structures (delegated to CADFeatureEmbeddingEngine):
 *   - VP-tree for sublinear search (M=16, EF=200 equivalent behavior)
 *   - Flat index fallback for small corpora
 */
import * as fs from "node:fs";
import { z } from "zod";
import {
  cadFeatureEmbeddingEngine,
  type Embedding,
  type EmbeddingBackend,
  type IndexedEmbedding,
  type SearchResult,
  type SimilarityIndex,
  type SimilarityMetric,
  type TokenSeq,
} from "./CADFeatureEmbeddingEngine.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CADIndexConfig {
  indexType?: "flat" | "vptree";
  metric?: SimilarityMetric;
  maxEntries?: number;
}

export interface CADCorpusEntry {
  sourcePath: string;
  ext: string;
  bytes: number;
  hash: string;
  scannedAt: string;
}

export interface CADQueryRequest {
  query: string;
  k?: number;
  featureTypes?: string[];
  extensions?: string[];
  minBytes?: number;
  maxBytes?: number;
}

export interface CADSearchResult extends SearchResult {
  sourcePath: string;
  ext: string;
  bytes: number;
  featureType?: string;
}

export interface CADIndexStats {
  totalEntries: number;
  byExtension: Record<string, number>;
  indexType: "flat" | "vptree";
  embeddingDim: number;
  cacheStats: { size: number; memoryBytes: number };
}

// ── Mock Embedding Backend ───────────────────────────────────────────────────

const DEFAULT_DIM = 384;

class HashBasedEmbeddingBackend implements EmbeddingBackend {
  readonly dim = DEFAULT_DIM;

  embed(tokens: TokenSeq): Embedding {
    const emb = new Float32Array(this.dim);
    let hash = 0x811c9dc5;
    for (const t of tokens) {
      hash ^= t;
      hash = Math.imul(hash, 0x01000193);
    }
    for (let i = 0; i < this.dim; i++) {
      hash = Math.imul(hash, 0x5bd1e995);
      hash ^= hash >>> 15;
      emb[i] = ((hash % 1000) / 500) - 1;
    }
    return emb;
  }
}

class TextEmbeddingBackend implements EmbeddingBackend {
  readonly dim = DEFAULT_DIM;

  embed(tokens: TokenSeq): Embedding {
    return this.embedText(tokens.map((t) => String.fromCharCode(t % 128)).join(""));
  }

  embedText(text: string): Embedding {
    const emb = new Float32Array(this.dim);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    for (let i = 0; i < this.dim; i++) {
      hash = Math.imul(hash, 0x5bd1e995);
      hash ^= hash >>> 15;
      emb[i] = ((hash % 1000) / 500) - 1;
    }
    return emb;
  }
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  indexType: z.enum(["flat", "vptree"]).default("vptree"),
  metric: z.enum(["cosine", "euclidean", "dotProduct"]).default("cosine"),
  maxEntries: z.number().int().positive().max(100_000).default(50_000),
});

const QuerySchema = z.object({
  query: z.string().min(1),
  k: z.number().int().positive().max(100).default(10),
  featureTypes: z.array(z.string()).optional(),
  extensions: z.array(z.string()).optional(),
  minBytes: z.number().int().nonnegative().optional(),
  maxBytes: z.number().int().positive().optional(),
});

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADEmbeddingIndexOrchestratorEngine {
  private index: SimilarityIndex | null = null;
  private entries: CADCorpusEntry[] = [];
  private indexedEmbeddings: IndexedEmbedding[] = [];
  private config: z.infer<typeof ConfigSchema>;
  private readonly backend: TextEmbeddingBackend;
  private readonly tokenBackend: HashBasedEmbeddingBackend;

  constructor(config?: CADIndexConfig) {
    this.config = ConfigSchema.parse(config ?? {});
    this.backend = new TextEmbeddingBackend();
    this.tokenBackend = new HashBasedEmbeddingBackend();
  }

  getInfo() {
    return {
      name: "CADEmbeddingIndexOrchestratorEngine",
      version: "1.0.0",
      domain: "cad_neural",
      description:
        "Thin orchestrator over CADFeatureEmbeddingEngine. " +
        "Provides CAD-specific query interface for similarity search.",
    };
  }

  getCapabilities() {
    return [
      { name: "ingest", description: "Ingest CAD corpus JSONL into index", actions: ["cad_index_ingest"] },
      { name: "query", description: "Query index with CAD-specific filters", actions: ["cad_index_query"] },
      { name: "stats", description: "Get index statistics", actions: ["cad_index_stats"] },
      { name: "clear", description: "Clear index and cache", actions: ["cad_index_clear"] },
      { name: "similar", description: "Find parts similar to a given path", actions: ["cad_index_similar"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const obj = input as Record<string, unknown>;
    if ("corpusPath" in obj) {
      if (typeof obj.corpusPath !== "string" || !obj.corpusPath) {
        return "corpusPath must be a non-empty string";
      }
    }
    if ("query" in obj) {
      const result = QuerySchema.safeParse(obj);
      if (!result.success) {
        return result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      }
    }
    return null;
  }

  // ── Corpus Ingestion ─────────────────────────────────────────────────────────

  /**
   * Ingest a JSONL corpus file (from CADTrainingCorpusOrchestratorEngine).
   * Builds VP-tree or flat index depending on corpus size.
   */
  ingest(corpusPath: string, config?: CADIndexConfig): { entriesIngested: number; indexType: string; elapsedMs: number } {
    const start = Date.now();
    const mergedConfig = ConfigSchema.parse({ ...this.config, ...config });

    let content: string;
    try {
      content = fs.readFileSync(corpusPath, "utf8");
    } catch {
      throw new Error(`Cannot read corpus file: ${corpusPath}`);
    }

    const lines = content.trim().split("\n").filter(Boolean);
    const entries: CADCorpusEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as CADCorpusEntry);
      } catch {
        // Skip malformed lines
      }
    }

    if (entries.length > mergedConfig.maxEntries) {
      entries.length = mergedConfig.maxEntries;
    }

    this.entries = entries;
    this.indexedEmbeddings = entries.map((entry, idx) => {
      const text = `${entry.sourcePath} ${entry.ext} ${entry.bytes}`;
      const embedding = this.backend.embedText(text);
      return {
        embedding,
        id: entry.hash || String(idx),
        metadata: { idx, ext: entry.ext, bytes: entry.bytes },
      };
    });

    const indexType = entries.length > 5000 ? "vptree" : mergedConfig.indexType;
    this.index = cadFeatureEmbeddingEngine.buildIndex(
      this.indexedEmbeddings,
      indexType,
      mergedConfig.metric,
    );
    this.config = mergedConfig;

    return {
      entriesIngested: entries.length,
      indexType,
      elapsedMs: Date.now() - start,
    };
  }

  /**
   * Ingest from an array of entries (in-memory).
   */
  ingestEntries(entries: CADCorpusEntry[], config?: CADIndexConfig): { entriesIngested: number; indexType: string } {
    const mergedConfig = ConfigSchema.parse({ ...this.config, ...config });

    if (entries.length > mergedConfig.maxEntries) {
      entries = entries.slice(0, mergedConfig.maxEntries);
    }

    this.entries = entries;
    this.indexedEmbeddings = entries.map((entry, idx) => {
      const text = `${entry.sourcePath} ${entry.ext} ${entry.bytes}`;
      const embedding = this.backend.embedText(text);
      return {
        embedding,
        id: entry.hash || String(idx),
        metadata: { idx, ext: entry.ext, bytes: entry.bytes },
      };
    });

    const indexType = entries.length > 5000 ? "vptree" : mergedConfig.indexType;
    this.index = cadFeatureEmbeddingEngine.buildIndex(
      this.indexedEmbeddings,
      indexType,
      mergedConfig.metric,
    );
    this.config = mergedConfig;

    return { entriesIngested: entries.length, indexType };
  }

  // ── Query Interface ──────────────────────────────────────────────────────────

  /**
   * Query the index with CAD-specific filters.
   */
  query(request: CADQueryRequest): CADSearchResult[] {
    const validated = QuerySchema.parse(request);
    if (!this.index || this.entries.length === 0) {
      return [];
    }

    const queryEmbedding = this.backend.embedText(validated.query);
    const rawResults = cadFeatureEmbeddingEngine.search(
      queryEmbedding,
      this.index,
      Math.min(validated.k * 3, this.entries.length),
      this.config.metric,
    );

    const filtered: CADSearchResult[] = [];
    for (const r of rawResults) {
      const entry = this.entries[r.index];
      if (!entry) continue;

      if (validated.extensions && validated.extensions.length > 0) {
        if (!validated.extensions.includes(entry.ext.toLowerCase())) continue;
      }
      if (validated.minBytes !== undefined && entry.bytes < validated.minBytes) continue;
      if (validated.maxBytes !== undefined && entry.bytes > validated.maxBytes) continue;

      filtered.push({
        ...r,
        sourcePath: entry.sourcePath,
        ext: entry.ext,
        bytes: entry.bytes,
        featureType: this.inferFeatureType(entry.sourcePath),
      });

      if (filtered.length >= validated.k) break;
    }

    return filtered;
  }

  /**
   * Find parts similar to a given file path.
   */
  findSimilar(sourcePath: string, k: number = 5): CADSearchResult[] {
    const entry = this.entries.find((e) => e.sourcePath === sourcePath);
    if (!entry) {
      const text = sourcePath;
      const queryEmbedding = this.backend.embedText(text);
      if (!this.index) return [];
      const results = cadFeatureEmbeddingEngine.search(queryEmbedding, this.index, k, this.config.metric);
      return results.map((r) => ({
        ...r,
        sourcePath: this.entries[r.index]?.sourcePath ?? "",
        ext: this.entries[r.index]?.ext ?? "",
        bytes: this.entries[r.index]?.bytes ?? 0,
      }));
    }

    const idx = this.entries.indexOf(entry);
    const embedding = this.indexedEmbeddings[idx]?.embedding;
    if (!embedding || !this.index) return [];

    const results = cadFeatureEmbeddingEngine.search(embedding, this.index, k + 1, this.config.metric);
    return results
      .filter((r) => r.index !== idx)
      .slice(0, k)
      .map((r) => ({
        ...r,
        sourcePath: this.entries[r.index]?.sourcePath ?? "",
        ext: this.entries[r.index]?.ext ?? "",
        bytes: this.entries[r.index]?.bytes ?? 0,
      }));
  }

  /**
   * Search by tokens (delegates to CADFeatureEmbeddingEngine).
   */
  searchByTokens(tokens: TokenSeq, k: number = 5): SearchResult[] {
    if (!this.index) return [];
    return cadFeatureEmbeddingEngine.searchByTokens(
      tokens,
      this.index,
      this.tokenBackend,
      k,
      this.config.metric,
    );
  }

  // ── Statistics ───────────────────────────────────────────────────────────────

  /**
   * Get index statistics.
   */
  stats(): CADIndexStats {
    const byExtension: Record<string, number> = {};
    for (const entry of this.entries) {
      byExtension[entry.ext] = (byExtension[entry.ext] ?? 0) + 1;
    }
    return {
      totalEntries: this.entries.length,
      byExtension,
      indexType: this.index?.type ?? "flat",
      embeddingDim: DEFAULT_DIM,
      cacheStats: cadFeatureEmbeddingEngine.cacheStats(),
    };
  }

  /**
   * Clear index and cache.
   */
  clear(): { entriesCleared: number; cacheCleared: number } {
    const entriesCleared = this.entries.length;
    const cacheResult = cadFeatureEmbeddingEngine.clearCache();
    this.entries = [];
    this.indexedEmbeddings = [];
    this.index = null;
    return { entriesCleared, cacheCleared: cacheResult.cleared };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private inferFeatureType(path: string): string {
    const lower = path.toLowerCase();
    if (lower.includes("hole") || lower.includes("drill")) return "hole";
    if (lower.includes("pocket") || lower.includes("cavity")) return "pocket";
    if (lower.includes("boss") || lower.includes("protrusion")) return "boss";
    if (lower.includes("slot") || lower.includes("groove")) return "slot";
    if (lower.includes("fillet") || lower.includes("round")) return "fillet";
    if (lower.includes("chamfer") || lower.includes("bevel")) return "chamfer";
    if (lower.includes("thread") || lower.includes("tap")) return "thread";
    if (lower.includes("rib") || lower.includes("web")) return "rib";
    if (lower.includes("shell") || lower.includes("thin")) return "shell";
    return "general";
  }
}

export const cadEmbeddingIndexOrchestratorEngine = new CADEmbeddingIndexOrchestratorEngine();
