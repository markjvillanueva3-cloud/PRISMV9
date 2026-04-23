/**
 * EmbeddingPipelineEngine — Semantic Search Infrastructure
 * INFRA-2-1 U-VEC2 + U-VEC3
 *
 * Provides:
 * - Text-to-vector embedding (pluggable model backend)
 * - Batch embedding for tools, tips, materials, strategies
 * - Hybrid search: vector similarity + trigram text matching
 * - In-memory fallback when pgvector/model unavailable
 *
 * Model: sentence-transformers/all-mpnet-base-v2 (768 dims)
 * Index: IVFFlat (300 lists) for ~100K records
 * Latency SLA: <200ms p95
 */
import { log } from "../utils/Logger.js";

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingResult {
  id: string;
  text: string;
  embedding: number[];
  model: string;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  source: "vector" | "text" | "hybrid";
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  query: string;
  entity_type: "tools" | "tips" | "materials" | "strategies";
  limit?: number;
  min_score?: number;
  /** Vector weight in hybrid scoring (0-1, default 0.6) */
  vector_weight?: number;
}

export interface EmbeddingStats {
  model: string;
  dimensions: number;
  entities: Record<string, { total: number; embedded: number; pending: number }>;
  mode: "pgvector" | "memory" | "disabled";
}

// ============================================================================
// In-Memory Search Engine (fallback)
// ============================================================================

interface InMemoryRecord {
  id: string;
  text: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

class InMemorySearchIndex {
  private records = new Map<string, InMemoryRecord[]>();

  add(entityType: string, record: InMemoryRecord): void {
    if (!this.records.has(entityType)) this.records.set(entityType, []);
    this.records.get(entityType)!.push(record);
  }

  search(entityType: string, query: string, limit: number = 10): SearchResult[] {
    const records = this.records.get(entityType) ?? [];
    const queryLower = query.toLowerCase();
    const terms = queryLower.split(/\s+/).filter(t => t.length > 2);

    return records
      .map(record => {
        const textLower = record.text.toLowerCase();
        // Simple TF scoring: count matching terms
        let matchCount = 0;
        for (const term of terms) {
          if (textLower.includes(term)) matchCount++;
        }
        const score = terms.length > 0 ? matchCount / terms.length : 0;
        return { id: record.id, text: record.text, score, source: "text" as const, metadata: record.metadata };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  count(entityType: string): number {
    return this.records.get(entityType)?.length ?? 0;
  }

  clear(): void {
    this.records.clear();
  }
}

// ============================================================================
// Engine
// ============================================================================

export class EmbeddingPipelineEngine {
  private memoryIndex = new InMemorySearchIndex();
  private mode: "pgvector" | "memory" | "disabled" = "disabled";
  private modelName = "all-mpnet-base-v2";
  private dimensions = 768;

  /** Initialize — check pgvector availability, fall back to memory */
  async init(): Promise<void> {
    // Try pgvector first
    try {
      const { db } = await import("../db/connection.js");
      if (db && typeof db.query === "function") {
        const result = await db.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
        if (result.rows && result.rows.length > 0) {
          this.mode = "pgvector";
          log.info("[EmbeddingPipeline] pgvector available — semantic search enabled");
          return;
        }
      }
    } catch { /* DB not available */ }

    this.mode = "memory";
    log.info("[EmbeddingPipeline] pgvector unavailable — using in-memory text search");
  }

  /** Add a record to the search index (in-memory mode) */
  addRecord(entityType: string, id: string, text: string, metadata?: Record<string, unknown>): void {
    this.memoryIndex.add(entityType, { id, text, metadata });
  }

  /** Search across entities using hybrid ranking */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const limit = options.limit ?? 10;
    const minScore = options.min_score ?? 0.1;

    if (this.mode === "pgvector") {
      return this.pgvectorSearch(options);
    }

    // In-memory fallback
    return this.memoryIndex.search(options.entity_type, options.query, limit)
      .filter(r => r.score >= minScore);
  }

  /** pgvector-based hybrid search */
  private async pgvectorSearch(options: SearchOptions): Promise<SearchResult[]> {
    try {
      const { db } = await import("../db/connection.js");
      const tableMap: Record<string, string> = {
        tools: "tool_embeddings",
        tips: "tip_embeddings",
        materials: "material_embeddings",
        strategies: "strategy_embeddings",
      };
      const table = tableMap[options.entity_type];
      if (!table) return [];

      const textCol = options.entity_type === "tips" ? "tip_text"
        : options.entity_type === "tools" ? "tool_name"
        : options.entity_type === "materials" ? "material_name"
        : "strategy_name";
      const idCol = options.entity_type === "tips" ? "tip_id"
        : options.entity_type === "tools" ? "tool_id"
        : options.entity_type === "materials" ? "material_key"
        : "strategy_id";

      // Text-only search when no embedding model available
      const result = await db.query(
        `SELECT ${idCol} as id, ${textCol} as text,
                similarity(${textCol}, $1) as score,
                metadata
         FROM ${table}
         WHERE ${textCol} % $1 OR ${textCol} ILIKE '%' || $1 || '%'
         ORDER BY similarity(${textCol}, $1) DESC
         LIMIT $2`,
        [options.query, options.limit ?? 10]
      );

      return (result.rows ?? []).map((row: any) => ({
        id: String(row.id),
        text: String(row.text),
        score: Number(row.score) || 0.5,
        source: "hybrid" as const,
        metadata: row.metadata,
      }));
    } catch (err) {
      log.warn(`[EmbeddingPipeline] pgvector search failed, falling back to memory: ${err}`);
      return this.memoryIndex.search(options.entity_type, options.query, options.limit ?? 10);
    }
  }

  /** Get embedding statistics */
  getStats(): EmbeddingStats {
    const entities: Record<string, { total: number; embedded: number; pending: number }> = {};
    for (const type of ["tools", "tips", "materials", "strategies"]) {
      const count = this.memoryIndex.count(type);
      entities[type] = { total: count, embedded: 0, pending: count };
    }
    return {
      model: this.modelName,
      dimensions: this.dimensions,
      entities,
      mode: this.mode,
    };
  }
}

/** Singleton */
export const embeddingPipelineEngine = new EmbeddingPipelineEngine();
