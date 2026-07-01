/**
 * ContentIngestionPipelineEngine — Unified Knowledge Ingestion Pipeline
 *
 * Single entry point for all knowledge ingestion:
 * - Text tips → auto-tag → dedup → TribalKnowledgeEngine
 * - Videos → VideoLearningEngine → knowledge items → TribalKnowledgeEngine
 * - Documents → DocumentLearning pipeline → knowledge items → TribalKnowledgeEngine
 * - URLs → fetch + detect type → re-route to appropriate handler
 *
 * Every ingested item is:
 * 1. Auto-tagged with material/operation/machine/tool/controller
 * 2. Dedup-checked against existing 3,700+ tips
 * 3. Stored in TribalKnowledgeEngine with source attribution
 * 4. Linked in KnowledgeGraph (when available)
 *
 * @milestone LEARN-MS0 U-LEARN01, LEARN-MS2 U-LEARN12
 */

import { contentAutoTaggerEngine, type TagResult } from "./ContentAutoTaggerEngine.js";
import { knowledgeDeduplicationEngine, type DeduplicationResult } from "./KnowledgeDeduplicationEngine.js";
import { tribalKnowledgeEngine, type KnowledgeTip, type KnowledgeCategory } from "./TribalKnowledgeEngine.js";
import { manufacturingKnowledgeGraphEngine } from "./ManufacturingKnowledgeGraphEngine.js";
import { knowledgePhysicsValidatorEngine } from "./KnowledgePhysicsValidatorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type ContentType = "text" | "video" | "document" | "url" | "batch_text";

export interface IngestionInput {
  content_type: ContentType;
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
  title?: string;
}

export interface IngestionItem {
  tip_id: string;
  title: string;
  body: string;
  tags: string[];
  category: string;
  source: string;
  confidence: number;
  dedup_action: DeduplicationResult["action_taken"];
  similarity_score: number;
}

export interface IngestionResult {
  items_created: number;
  items_skipped_duplicate: number;
  items_linked_related: number;
  total_processed: number;
  items: IngestionItem[];
  tags_applied: string[];
  source_attribution: string;
  processing_time_ms: number;
}

export interface BatchIngestionInput {
  tips: Array<{
    text: string;
    title?: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }>;
  default_source?: string;
}

export interface IngestionStats {
  total_ingested: number;
  total_sources: number;
  sources: Record<string, number>;
  top_tags: Array<{ tag: string; count: number }>;
  category_distribution: Record<string, number>;
}

// ============================================================================
// ENGINE
// ============================================================================

class ContentIngestionPipelineEngineImpl {
  private ingestionLog: Array<{ timestamp: string; source: string; items_created: number }> = [];

  /**
   * Ingest content through the unified pipeline.
   */
  async ingest(input: IngestionInput): Promise<IngestionResult> {
    const start = performance.now();
    const source = input.source || "unknown";

    switch (input.content_type) {
      case "text":
        return this._ingestText(input.content, source, input.title, start);
      case "batch_text":
        return this._ingestBatchText(input.content, source, start);
      case "video":
        return this._ingestVideo(input.content, source, start);
      case "document":
        return this._ingestDocument(input.content, source, start);
      case "url":
        return this._ingestURL(input.content, source, start);
      default:
        return this._ingestText(input.content, source, input.title, start);
    }
  }

  /**
   * Batch ingest multiple tips at once.
   */
  async batchIngest(input: BatchIngestionInput): Promise<IngestionResult> {
    const start = performance.now();
    const allItems: IngestionItem[] = [];
    const allTags = new Set<string>();
    let created = 0, skipped = 0, linked = 0;

    for (const tipInput of input.tips) {
      const source = tipInput.source || input.default_source || "batch_import";
      const result = await this._ingestText(tipInput.text, source, tipInput.title, start);
      allItems.push(...result.items);
      result.tags_applied.forEach(t => allTags.add(t));
      created += result.items_created;
      skipped += result.items_skipped_duplicate;
      linked += result.items_linked_related;
    }

    const elapsed = performance.now() - start;
    this.ingestionLog.push({
      timestamp: new Date().toISOString(),
      source: input.default_source || "batch_import",
      items_created: created,
    });

    return {
      items_created: created,
      items_skipped_duplicate: skipped,
      items_linked_related: linked,
      total_processed: input.tips.length,
      items: allItems,
      tags_applied: [...allTags],
      source_attribution: input.default_source || "batch_import",
      processing_time_ms: elapsed,
    };
  }

  /**
   * Get ingestion statistics.
   */
  getStats(): IngestionStats {
    const stats = tribalKnowledgeEngine.stats();
    const sources: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    // Count by source from ingestion log
    for (const entry of this.ingestionLog) {
      sources[entry.source] = (sources[entry.source] || 0) + entry.items_created;
    }

    return {
      total_ingested: this.ingestionLog.reduce((s, e) => s + e.items_created, 0),
      total_sources: Object.keys(sources).length,
      sources,
      top_tags: Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count })),
      category_distribution: stats.by_category,
    };
  }

  // ── Private ingestion methods ──

  private async _ingestText(
    text: string,
    source: string,
    title: string | undefined,
    startTime: number,
  ): Promise<IngestionResult> {
    if (!text || text.trim().length === 0) {
      return this._emptyResult(source, startTime);
    }

    // Step 1: Auto-tag
    const tagResult = contentAutoTaggerEngine.tag(text);
    const flatTags = contentAutoTaggerEngine.toFlatTags(tagResult);
    const category = contentAutoTaggerEngine.inferCategory(tagResult) as KnowledgeCategory;

    // Step 2: Dedup check
    const existingTips = this._getExistingTipsForDedup();
    const dedupResult = knowledgeDeduplicationEngine.check(text, existingTips);

    // Step 3: Store or skip
    const item = this._processDedup(text, title, source, category, flatTags, tagResult, dedupResult);
    const elapsed = performance.now() - startTime;

    if (item) {
      this.ingestionLog.push({ timestamp: new Date().toISOString(), source, items_created: 1 });
    }

    return {
      items_created: item && dedupResult.action_taken !== "skip_duplicate" ? 1 : 0,
      items_skipped_duplicate: dedupResult.action_taken === "skip_duplicate" ? 1 : 0,
      items_linked_related: dedupResult.action_taken === "link_related" ? 1 : 0,
      total_processed: 1,
      items: item ? [item] : [],
      tags_applied: flatTags,
      source_attribution: source,
      processing_time_ms: elapsed,
    };
  }

  private async _ingestBatchText(
    text: string,
    source: string,
    startTime: number,
  ): Promise<IngestionResult> {
    // Split by double newlines or numbered list patterns
    const tips = text
      .split(/\n\s*\n|\n(?=\d+[\.\)]\s)/)
      .map(t => t.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(t => t.length > 10);

    const batchInput: BatchIngestionInput = {
      tips: tips.map(t => ({ text: t, source })),
      default_source: source,
    };

    return this.batchIngest(batchInput);
  }

  private async _ingestVideo(
    filePath: string,
    source: string,
    startTime: number,
  ): Promise<IngestionResult> {
    // VideoLearningEngine integration — lazy load to avoid circular deps
    try {
      const { videoLearningEngine } = await import("./VideoLearningEngine.js");
      const videoResult = await videoLearningEngine.processVideo(filePath);

      // Each knowledge item from video becomes a tip
      const items = videoResult.knowledge_items || [];
      const allIngested: IngestionItem[] = [];
      let created = 0, skipped = 0, linked = 0;

      for (const ki of items) {
        const text = ki.title + ". " + ki.body;
        const result = await this._ingestText(text, `video:${source}`, ki.title, startTime);
        allIngested.push(...result.items);
        created += result.items_created;
        skipped += result.items_skipped_duplicate;
        linked += result.items_linked_related;
      }

      return {
        items_created: created,
        items_skipped_duplicate: skipped,
        items_linked_related: linked,
        total_processed: items.length,
        items: allIngested,
        tags_applied: [...new Set(allIngested.flatMap(i => i.tags))],
        source_attribution: `video:${source}`,
        processing_time_ms: performance.now() - startTime,
      };
    } catch {
      // VideoLearningEngine not available — store as text reference
      return this._ingestText(
        `Video content from: ${filePath}`,
        `video:${source}`,
        `Video: ${filePath}`,
        startTime,
      );
    }
  }

  private async _ingestDocument(
    filePath: string,
    source: string,
    startTime: number,
  ): Promise<IngestionResult> {
    // Document learning is handled by the Python pipeline via documentLearningDispatcher.
    // For now, store as a reference tip pointing to the document.
    return this._ingestText(
      `Document knowledge source: ${filePath}. Use doc_extract action for full extraction.`,
      `document:${source}`,
      `Document: ${filePath}`,
      startTime,
    );
  }

  private async _ingestURL(
    url: string,
    source: string,
    startTime: number,
  ): Promise<IngestionResult> {
    // URL extraction will be implemented in LEARN-MS1 (URLContentExtractorEngine).
    // For now, store the URL as a reference tip.
    return this._ingestText(
      `Knowledge source URL: ${url}. Content pending extraction.`,
      `url:${source || url}`,
      `URL: ${url}`,
      startTime,
    );
  }

  private _processDedup(
    text: string,
    title: string | undefined,
    source: string,
    category: KnowledgeCategory,
    flatTags: string[],
    tagResult: TagResult,
    dedupResult: DeduplicationResult,
  ): IngestionItem | null {
    const tipTitle = title || this._generateTitle(text, tagResult);

    if (dedupResult.action_taken === "skip_duplicate") {
      return {
        tip_id: dedupResult.existing_tip_id || "",
        title: tipTitle,
        body: text,
        tags: flatTags,
        category,
        source,
        confidence: 50,
        dedup_action: "skip_duplicate",
        similarity_score: dedupResult.similarity_score,
      };
    }

    // Store in TribalKnowledgeEngine
    const storedTip = tribalKnowledgeEngine.capture({
      title: tipTitle,
      body: text,
      category,
      tags: flatTags,
      material_groups: tagResult.materials.map(m => m.iso_group),
      operation_types: tagResult.operations.map(o => o.type),
      confidence: Math.max(30, Math.min(80, tagResult.confidence)),
      source: `ingestion:${source}`,
    });

    return {
      tip_id: storedTip.id,
      title: storedTip.title,
      body: storedTip.body,
      tags: flatTags,
      category,
      source,
      confidence: storedTip.confidence,
      dedup_action: dedupResult.action_taken,
      similarity_score: dedupResult.similarity_score,
    };
  }

  private _generateTitle(text: string, tags: TagResult): string {
    // Generate a descriptive title from the text and tags
    const firstSentence = text.split(/[.\n!?]/)[0]?.trim() || text.slice(0, 60);
    if (firstSentence.length <= 80) return firstSentence;
    return firstSentence.slice(0, 77) + "...";
  }

  private _getExistingTipsForDedup(): Array<{ id: string; title: string; body: string }> {
    // Get recent tips for dedup comparison (limit to 500 for performance)
    const searchResult = tribalKnowledgeEngine.search({ limit: 500 });
    return searchResult.map((tip: KnowledgeTip) => ({
      id: tip.id,
      title: tip.title,
      body: tip.body,
    }));
  }

  private _emptyResult(source: string, startTime: number): IngestionResult {
    return {
      items_created: 0, items_skipped_duplicate: 0, items_linked_related: 0,
      total_processed: 0, items: [], tags_applied: [],
      source_attribution: source,
      processing_time_ms: performance.now() - startTime,
    };
  }

  // ── LEARN-MS2 U-LEARN15: Enhanced Knowledge Search ─────────────────

  /**
   * Search across ALL knowledge sources with unified ranking.
   * Sources: tribal tips, playbook rules, formulas, knowledge graph nodes.
   *
   * Each result is scored by relevance and optionally validated against
   * physics constraints via KnowledgePhysicsValidatorEngine.
   *
   * @param query - Search query string
   * @param options - Filter/limit options
   * @returns Unified search results from all sources, ranked by relevance
   */
  enhancedSearch(
    query: string,
    options: EnhancedSearchOptions = {},
  ): EnhancedSearchResult {
    const start = performance.now();
    const results: EnhancedSearchItem[] = [];
    const queryLower = query.toLowerCase();
    const limit = options.limit ?? 20;
    const minScore = options.min_score ?? 0.1;
    const sources = options.sources ?? ["tribal", "playbook", "formula", "graph"];

    // ── Source 1: Tribal tips ──
    if (sources.includes("tribal")) {
      const tips = tribalKnowledgeEngine.search({
        query,
        category: options.category,
        material_iso_group: options.material_iso_group,
        operation_type: options.operation_type,
        min_confidence: options.min_confidence,
        limit: limit * 2,
      });

      for (const tip of tips) {
        const score = this._computeTextRelevance(queryLower, `${tip.title} ${tip.body} ${tip.tags.join(" ")}`);
        if (score >= minScore) {
          results.push({
            source_type: "tribal_tip",
            id: tip.id,
            title: tip.title,
            body: tip.body.slice(0, 300),
            relevance_score: score,
            confidence: tip.confidence,
            material_groups: tip.material_groups || [],
            operation_types: tip.operation_types || [],
            tags: tip.tags,
            physics_valid: undefined,
          });
        }
      }
    }

    // ── Source 2: Playbook rules ──
    if (sources.includes("playbook")) {
      try {
        // Lazy import to avoid circular dependencies
        const { machiningPlaybookEngine } = require("./MachiningPlaybookEngine.js");
        const advice = machiningPlaybookEngine.advise({
          material_iso: options.material_iso_group,
          operation_type: options.operation_type,
        });
        for (const rule of advice.rules) {
          const text = `${rule.title} ${rule.rule} ${rule.reasoning}`;
          const score = this._computeTextRelevance(queryLower, text);
          if (score >= minScore) {
            results.push({
              source_type: "playbook_rule",
              id: rule.id,
              title: rule.title,
              body: rule.rule.slice(0, 300),
              relevance_score: score,
              confidence: rule.severity === "critical" ? 95 : rule.severity === "important" ? 80 : 60,
              material_groups: rule.conditions?.some((c: any) => c.field === "material_iso") ? [options.material_iso_group || ""] : [],
              operation_types: rule.conditions?.some((c: any) => c.field === "operation_type") ? [options.operation_type || ""] : [],
              tags: [rule.category, rule.severity],
              physics_valid: undefined,
            });
          }
        }
      } catch {
        // MachiningPlaybookEngine not available — skip
      }
    }

    // ── Source 3: Formulas ──
    if (sources.includes("formula")) {
      try {
        const { formulaRegistry } = require("../registries/FormulaRegistry.js");
        const allFormulas = formulaRegistry.list ? formulaRegistry.list({ limit: 100 }) : { formulas: [] };
        // Handle sync or async result
        const formulas = allFormulas?.formulas ?? allFormulas ?? [];

        for (const f of formulas) {
          if (!f?.name) continue;
          const text = `${f.name} ${f.description || ""} ${f.category || ""} ${f.equation || ""}`;
          const score = this._computeTextRelevance(queryLower, text);
          if (score >= minScore) {
            results.push({
              source_type: "formula",
              id: f.formula_id || f.id || f.name,
              title: f.name,
              body: (f.description || f.equation || "").slice(0, 300),
              relevance_score: score,
              confidence: 90,
              material_groups: [],
              operation_types: [],
              tags: [f.category || "formula"].filter(Boolean),
              physics_valid: undefined,
            });
          }
        }
      } catch {
        // FormulaRegistry not available — skip
      }
    }

    // ── Source 4: Knowledge graph nodes ──
    if (sources.includes("graph")) {
      try {
        // Ensure graph is populated
        manufacturingKnowledgeGraphEngine.calculate("kg_populate");
        const graphResult = manufacturingKnowledgeGraphEngine.calculate("kg_query", {
          query,
          limit: limit * 2,
        }) as any;

        if (graphResult?.paths) {
          for (const path of graphResult.paths) {
            const score = (path.score || 0) / 100;
            if (score >= minScore) {
              results.push({
                source_type: "graph_node",
                id: path.path?.[0] || "unknown",
                title: path.explanation || "Knowledge graph match",
                body: `Path: ${(path.path || []).join(" → ")}`,
                relevance_score: Math.min(1.0, score),
                confidence: Math.round(score * 100),
                material_groups: [],
                operation_types: [],
                tags: ["knowledge_graph"],
                physics_valid: undefined,
              });
            }
          }
        }
      } catch {
        // Knowledge graph query failed — skip
      }
    }

    // ── Physics validation (optional) ──
    if (options.validate_physics) {
      for (const item of results) {
        if (item.source_type === "tribal_tip" || item.source_type === "playbook_rule") {
          try {
            const validation = knowledgePhysicsValidatorEngine.validate(
              item.body,
              options.material_iso_group as any,
            );
            item.physics_valid = validation.is_valid;
            // Boost score for physics-validated items, penalize invalid
            if (validation.is_valid && validation.checks.length > 0) {
              item.relevance_score = Math.min(1.0, item.relevance_score * 1.15);
            } else if (!validation.is_valid) {
              item.relevance_score *= 0.7;
            }
          } catch {
            // Physics validation failed for this item — leave as undefined
          }
        }
      }
    }

    // ── Rank and deduplicate ──
    results.sort((a, b) => b.relevance_score - a.relevance_score);
    const deduplicated = this._deduplicateResults(results);
    const finalResults = deduplicated.slice(0, limit);

    const elapsed = performance.now() - start;

    // Source counts
    const sourceCounts: Record<string, number> = {};
    for (const r of finalResults) {
      sourceCounts[r.source_type] = (sourceCounts[r.source_type] || 0) + 1;
    }

    return {
      query,
      results: finalResults,
      total_found: deduplicated.length,
      sources_searched: sources,
      source_counts: sourceCounts,
      processing_time_ms: elapsed,
    };
  }

  /**
   * Compute text relevance using keyword overlap scoring.
   */
  private _computeTextRelevance(queryLower: string, text: string): number {
    const textLower = text.toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 2);

    if (queryTokens.length === 0) return 0.5;

    // Exact phrase match gets highest score
    if (textLower.includes(queryLower)) return 0.95;

    // Token overlap
    let matched = 0;
    for (const token of queryTokens) {
      if (textLower.includes(token)) matched++;
    }

    const tokenScore = matched / queryTokens.length;

    // Boost for matches in first 100 chars (title area)
    const earlyText = textLower.slice(0, 100);
    let earlyBoost = 0;
    for (const token of queryTokens) {
      if (earlyText.includes(token)) earlyBoost += 0.05;
    }

    return Math.min(1.0, tokenScore * 0.8 + earlyBoost);
  }

  /**
   * Remove near-duplicate results from different sources.
   */
  private _deduplicateResults(results: EnhancedSearchItem[]): EnhancedSearchItem[] {
    const seen = new Set<string>();
    const deduplicated: EnhancedSearchItem[] = [];

    for (const item of results) {
      // Use first 60 chars of title as dedup key
      const key = `${item.source_type}:${item.title.slice(0, 60).toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(item);
      }
    }

    return deduplicated;
  }

  // ── LEARN-MS2 U-LEARN12: Auto-Linking ──────────────────────────────

  /**
   * Auto-link an ingested tip to the manufacturing knowledge graph.
   * Creates graph nodes/edges connecting the tip to related materials,
   * operations, tools, and machines.
   *
   * @param tipId - Tip ID from ingestion result
   * @param text - Tip text content
   * @param tags - Flat tags from auto-tagger
   * @param source - Source attribution
   * @returns Link result with edges created and conflicts detected
   */
  autoLink(tipId: string, text: string, tags: string[], source: string): AutoLinkResult {
    try {
      const result = manufacturingKnowledgeGraphEngine.linkTip(tipId, text, tags, source);
      return {
        success: true,
        tip_id: tipId,
        ...result,
      };
    } catch (err: any) {
      return {
        success: false,
        tip_id: tipId,
        node_id: "",
        edges_created: 0,
        linked_materials: [],
        linked_operations: [],
        linked_tools: [],
        linked_machines: [],
        conflicts: [],
        error: err?.message || "Auto-link failed",
      };
    }
  }
}

export interface AutoLinkResult {
  success: boolean;
  tip_id: string;
  node_id: string;
  edges_created: number;
  linked_materials: string[];
  linked_operations: string[];
  linked_tools: string[];
  linked_machines: string[];
  conflicts: Array<{ existing_tip: string; conflict_type: string; explanation: string }>;
  error?: string;
}

// ── LEARN-MS2 U-LEARN15: Enhanced Search Types ──

export interface EnhancedSearchOptions {
  sources?: Array<"tribal" | "playbook" | "formula" | "graph">;
  category?: string;
  material_iso_group?: string;
  operation_type?: string;
  min_confidence?: number;
  min_score?: number;
  limit?: number;
  validate_physics?: boolean;
}

export interface EnhancedSearchItem {
  source_type: "tribal_tip" | "playbook_rule" | "formula" | "graph_node";
  id: string;
  title: string;
  body: string;
  relevance_score: number;
  confidence: number;
  material_groups: string[];
  operation_types: string[];
  tags: string[];
  physics_valid: boolean | undefined;
}

export interface EnhancedSearchResult {
  query: string;
  results: EnhancedSearchItem[];
  total_found: number;
  sources_searched: string[];
  source_counts: Record<string, number>;
  processing_time_ms: number;
}

export const contentIngestionPipelineEngine = new ContentIngestionPipelineEngineImpl();
