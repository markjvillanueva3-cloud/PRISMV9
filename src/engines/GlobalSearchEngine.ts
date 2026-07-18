/**
 * GlobalSearchEngine — Cross-Entity Fuzzy Search
 * ================================================
 *
 * Searches across parts, quotes, jobs, customers, tools, machines,
 * invoices, POs, employees, and quality records with fuzzy matching
 * and faceted results. In-memory implementation with PostgreSQL
 * pg_trgm support via DB migration 007.
 *
 * Features:
 * - Trigram-based fuzzy matching (Dice coefficient)
 * - Multi-entity search with ranked results
 * - Autocomplete suggestions with prefix matching
 * - Faceted result counts by entity type
 * - Configurable result limits and type filters
 *
 * @version 1.0.0 — Session 6-8 U-DESK2
 */

import { log } from "../utils/Logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchableEntityType =
  | "part" | "quote" | "job" | "customer" | "tool"
  | "machine" | "invoice" | "purchase_order" | "employee" | "quality_record";

export interface SearchableEntity {
  entity_type: SearchableEntityType;
  entity_id: string;
  title: string;
  subtitle?: string;
  searchable_text: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  entity_type: SearchableEntityType;
  entity_id: string;
  title: string;
  subtitle?: string;
  match_score: number;
  preview?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  facets: Record<SearchableEntityType, number>;
  total: number;
  limit: number;
  execution_ms: number;
}

export interface SuggestResult {
  text: string;
  entity_type: SearchableEntityType;
  entity_id: string;
  score: number;
}

export interface SuggestResponse {
  query: string;
  suggestions: SuggestResult[];
  execution_ms: number;
}

export interface SearchInput {
  query: string;
  types?: SearchableEntityType[];
  limit?: number;
  offset?: number;
  min_score?: number;
}

export interface SuggestInput {
  query: string;
  limit?: number;
  types?: SearchableEntityType[];
}

// ─── Trigram Utilities ────────────────────────────────────────────────────────

/**
 * Generate trigrams from a string (pg_trgm-compatible).
 * Pads with spaces for boundary trigrams.
 */
function trigrams(text: string): Set<string> {
  const padded = `  ${text.toLowerCase().trim()}  `;
  const tris = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    const tri = padded.slice(i, i + 3);
    if (tri.trim().length > 0) tris.add(tri);
  }
  return tris;
}

/**
 * Dice coefficient similarity between two trigram sets.
 * Range: 0 (no match) to 1 (identical).
 * pg_trgm uses this as its similarity metric.
 */
function trigramSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const tri of a) {
    if (b.has(tri)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}

/**
 * Check if text contains the query as a substring (case-insensitive).
 * Returns a bonus score for exact substring matches.
 */
function substringBonus(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 0.5;           // Exact match
  if (lower.startsWith(q)) return 0.3;   // Prefix match
  if (lower.includes(q)) return 0.15;    // Contains match
  return 0;
}

/**
 * Generate a preview snippet showing match context.
 */
function generatePreview(text: string, query: string, maxLen = 120): string {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text.slice(0, maxLen);

  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + q.length + 60);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_MIN_SCORE = 0.15;
const SUGGEST_LIMIT = 10;

export class GlobalSearchEngine {
  private entities: SearchableEntity[] = [];
  private trigramCache = new Map<string, Set<string>>();

  /**
   * Register searchable entities. Called by data loaders to populate the index.
   * @param entities - Array of searchable entities
   */
  indexEntities(entities: SearchableEntity[]): { indexed: number } {
    for (const entity of entities) {
      // Remove existing entry for same entity
      this.entities = this.entities.filter(
        (e) => !(e.entity_type === entity.entity_type && e.entity_id === entity.entity_id),
      );
      this.entities.push(entity);

      // Pre-compute trigrams
      const cacheKey = `${entity.entity_type}:${entity.entity_id}`;
      this.trigramCache.set(cacheKey, trigrams(entity.searchable_text));
    }

    log.info(`[GlobalSearchEngine] Indexed ${entities.length} entities (total: ${this.entities.length})`);
    return { indexed: entities.length };
  }

  /**
   * Remove entities from the index.
   * @param entityType - Type to remove
   * @param entityIds - Specific IDs (if omitted, removes all of that type)
   */
  removeEntities(entityType: SearchableEntityType, entityIds?: string[]): { removed: number } {
    const before = this.entities.length;
    if (entityIds) {
      const idSet = new Set(entityIds);
      this.entities = this.entities.filter(
        (e) => !(e.entity_type === entityType && idSet.has(e.entity_id)),
      );
      for (const id of entityIds) {
        this.trigramCache.delete(`${entityType}:${id}`);
      }
    } else {
      this.entities = this.entities.filter((e) => e.entity_type !== entityType);
      // Clean cache
      for (const key of this.trigramCache.keys()) {
        if (key.startsWith(`${entityType}:`)) this.trigramCache.delete(key);
      }
    }
    return { removed: before - this.entities.length };
  }

  /**
   * Search across all entity types with fuzzy matching and ranked results.
   * @param input - Search query and options
   */
  search(input: SearchInput): SearchResponse {
    const start = Date.now();
    const query = (input.query || "").trim();
    if (!query) {
      return {
        query: "",
        results: [],
        facets: {} as Record<SearchableEntityType, number>,
        total: 0,
        limit: input.limit || DEFAULT_LIMIT,
        execution_ms: 0,
      };
    }

    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(input.offset ?? 0, 0);
    const minScore = input.min_score ?? DEFAULT_MIN_SCORE;
    const typeFilter = input.types ? new Set(input.types) : null;

    const queryTrigrams = trigrams(query);

    // Score all entities
    const scored: Array<{ entity: SearchableEntity; score: number }> = [];

    for (const entity of this.entities) {
      if (typeFilter && !typeFilter.has(entity.entity_type)) continue;

      const cacheKey = `${entity.entity_type}:${entity.entity_id}`;
      let entityTrigrams = this.trigramCache.get(cacheKey);
      if (!entityTrigrams) {
        entityTrigrams = trigrams(entity.searchable_text);
        this.trigramCache.set(cacheKey, entityTrigrams);
      }

      // Trigram similarity
      let score = trigramSimilarity(queryTrigrams, entityTrigrams);

      // Bonus for substring matches on title
      score += substringBonus(entity.title, query);

      // Bonus for substring matches on searchable text
      score += substringBonus(entity.searchable_text, query) * 0.5;

      if (score >= minScore) {
        scored.push({ entity, score: Math.min(score, 1.0) });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Build facets (before pagination)
    const facets = {} as Record<SearchableEntityType, number>;
    for (const { entity } of scored) {
      facets[entity.entity_type] = (facets[entity.entity_type] || 0) + 1;
    }

    // Paginate
    const paginated = scored.slice(offset, offset + limit);

    const results: SearchResult[] = paginated.map(({ entity, score }) => ({
      entity_type: entity.entity_type,
      entity_id: entity.entity_id,
      title: entity.title,
      subtitle: entity.subtitle,
      match_score: +score.toFixed(4),
      preview: generatePreview(entity.searchable_text, query),
      metadata: entity.metadata,
    }));

    return {
      query,
      results,
      facets,
      total: scored.length,
      limit,
      execution_ms: Date.now() - start,
    };
  }

  /**
   * Autocomplete suggestions — prefix-biased search with fast results.
   * @param input - Suggestion query and options
   */
  suggest(input: SuggestInput): SuggestResponse {
    const start = Date.now();
    const query = (input.query || "").trim().toLowerCase();
    if (!query || query.length < 2) {
      return { query: input.query || "", suggestions: [], execution_ms: 0 };
    }

    const limit = Math.min(Math.max(input.limit ?? SUGGEST_LIMIT, 1), 20);
    const typeFilter = input.types ? new Set(input.types) : null;

    const suggestions: SuggestResult[] = [];

    for (const entity of this.entities) {
      if (typeFilter && !typeFilter.has(entity.entity_type)) continue;

      const titleLower = entity.title.toLowerCase();
      let score = 0;

      // Prefix match on title is highest priority
      if (titleLower.startsWith(query)) {
        score = 0.9 + (query.length / titleLower.length) * 0.1;
      } else if (titleLower.includes(query)) {
        score = 0.6 + (query.length / titleLower.length) * 0.1;
      } else if (entity.searchable_text.toLowerCase().includes(query)) {
        score = 0.3;
      }

      if (score > 0) {
        suggestions.push({
          text: entity.title,
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
          score: +score.toFixed(4),
        });
      }
    }

    suggestions.sort((a, b) => b.score - a.score);

    return {
      query: input.query || "",
      suggestions: suggestions.slice(0, limit),
      execution_ms: Date.now() - start,
    };
  }

  /**
   * Get the current index stats.
   */
  getStats(): { total_entities: number; by_type: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const entity of this.entities) {
      byType[entity.entity_type] = (byType[entity.entity_type] || 0) + 1;
    }
    return { total_entities: this.entities.length, by_type: byType };
  }

  /**
   * Clear the entire search index.
   */
  clearIndex(): { cleared: boolean } {
    this.entities = [];
    this.trigramCache.clear();
    return { cleared: true };
  }
}

export const globalSearchEngine = new GlobalSearchEngine();
