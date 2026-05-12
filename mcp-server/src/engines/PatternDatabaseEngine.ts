/**
 * PatternDatabaseEngine — Unified Pattern Search for AI Learning
 * ================================================================
 * Combines all extracted patterns from:
 *   - hyperMILL Python scripts (om.cad.*, om.cam.*)
 *   - JM DIE production programs (G-code, material params)
 *   - Tribal knowledge (3,700+ tips)
 *   - Playbook rules (296 rules)
 *   - Code quality patterns
 *
 * Provides fuzzy search with relevance scoring for AI training.
 *
 * @module engines/PatternDatabaseEngine
 */

import { log } from "../utils/Logger.js";
import { aiResourceLearningEngine } from "./AIResourceLearningEngine.js";
import { jmDieProgramAnalyzerEngine } from "./JMDieProgramAnalyzerEngine.js";
import { tribalKnowledgeEngine } from "./TribalKnowledgeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedPattern {
  id: string;
  type: "gcode" | "python_api" | "material_param" | "tribal_tip" | "playbook_rule" | "code_quality" | "cam_automation";
  source: "hypermill" | "jm_die" | "tribal" | "playbook" | "internal";
  category: string;
  title: string;
  description: string;
  content: string;
  keywords: string[];
  confidence: number;
  usage_count: number;
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  pattern: UnifiedPattern;
  relevance_score: number;
  match_type: "exact" | "fuzzy" | "keyword" | "category";
  matched_terms: string[];
}

export interface SearchOptions {
  types?: UnifiedPattern["type"][];
  sources?: UnifiedPattern["source"][];
  categories?: string[];
  min_confidence?: number;
  limit?: number;
  fuzzy_threshold?: number;  // 0-1, lower = more lenient
}

export interface PatternStats {
  total_patterns: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  by_category: Record<string, number>;
  average_confidence: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PatternDatabaseEngine {
  private patterns: Map<string, UnifiedPattern> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();  // keyword -> pattern IDs
  private categoryIndex: Map<string, Set<string>> = new Map();  // category -> pattern IDs
  private initialized = false;

  constructor() {
    // Defer initialization to first use
  }

  /**
   * Initialize the pattern database with all sources.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    log.info("[PatternDB] Initializing pattern database...");

    // Load hyperMILL patterns
    this.loadHyperMillPatterns();

    // Load JM DIE material patterns
    this.loadJMDiePatterns();

    // Load tribal knowledge
    this.loadTribalPatterns();

    // Load code quality patterns
    this.loadCodeQualityPatterns();

    // Build indices
    this.buildIndices();

    this.initialized = true;
    log.info(`[PatternDB] Initialized with ${this.patterns.size} patterns`);
  }

  private loadHyperMillPatterns(): void {
    const apiPatterns = aiResourceLearningEngine.getHyperMillAPIPatterns();

    for (const api of apiPatterns) {
      const id = `hypermill_${api.module}_${api.function}`;
      this.patterns.set(id, {
        id,
        type: "python_api",
        source: "hypermill",
        category: api.module.split(".")[1] ?? "core",  // om.cad -> cad
        title: `${api.module}.${api.function}`,
        description: api.purpose,
        content: api.example_usage,
        keywords: this.extractKeywords(`${api.module} ${api.function} ${api.purpose}`),
        confidence: 0.9,
        usage_count: 1,
        metadata: { return_type: api.return_type, parameters: api.parameters },
      });
    }

    const gcodePatterns = aiResourceLearningEngine.getAllOkumaPatterns();

    for (const gcode of gcodePatterns) {
      const id = `gcode_okuma_${gcode.cycle}`;
      this.patterns.set(id, {
        id,
        type: "gcode",
        source: "jm_die",
        category: "okuma_lathe",
        title: gcode.cycle,
        description: gcode.description,
        content: `${gcode.syntax}\n${gcode.examples.join("\n")}`,
        keywords: this.extractKeywords(`${gcode.cycle} ${gcode.description} ${gcode.usage_context}`),
        confidence: 0.95,
        usage_count: 100,
        metadata: { controller: gcode.controller, parameters: gcode.parameters },
      });
    }
  }

  private loadJMDiePatterns(): void {
    const materials = jmDieProgramAnalyzerEngine.getAllMaterialPatterns();

    for (const mat of materials) {
      const id = `material_${mat.material.replace(/\s+/g, "_").toLowerCase()}`;
      this.patterns.set(id, {
        id,
        type: "material_param",
        source: "jm_die",
        category: `iso_${mat.iso_group.toLowerCase()}`,
        title: mat.material,
        description: `Cutting parameters for ${mat.material}`,
        content: `Roughing: ${mat.speed_ranges.roughing.typical} SFM, ${mat.feed_ranges.roughing.typical} IPR, ${mat.doc_ranges.roughing.typical}" DOC\n` +
                 `Finishing: ${mat.speed_ranges.finishing.typical} SFM, ${mat.feed_ranges.finishing.typical} IPR, ${mat.doc_ranges.finishing.typical}" DOC`,
        keywords: this.extractKeywords(`${mat.material} ${mat.iso_group} speed feed cutting machining`),
        confidence: mat.confidence,
        usage_count: mat.sample_count,
        metadata: {
          iso_group: mat.iso_group,
          speed_ranges: mat.speed_ranges,
          feed_ranges: mat.feed_ranges,
          doc_ranges: mat.doc_ranges,
        },
      });
    }
  }

  private loadTribalPatterns(): void {
    // Get tribal tips using search API
    const tips = tribalKnowledgeEngine.search({ limit: 500 });  // Get up to 500

    let tipCount = 0;
    for (const tip of tips) {  // Process all returned tips
      tipCount++;
      const id = `tribal_${tip.id || tipCount}`;
      this.patterns.set(id, {
        id,
        type: "tribal_tip",
        source: "tribal",
        category: tip.category || "general",
        title: tip.title || `Tribal Tip ${tipCount}`,
        description: tip.body || "",
        content: tip.body || "",
        keywords: this.extractKeywords(`${tip.title || ""} ${tip.body || ""} ${tip.tags?.join(" ") || ""}`),
        confidence: (tip.confidence ?? 80) / 100,  // Convert 0-100 to 0-1
        usage_count: tip.usage_count || 1,
        metadata: { category: tip.category, source_id: tip.id, tags: tip.tags },
      });
    }
  }

  private loadCodeQualityPatterns(): void {
    const tsPatterns = aiResourceLearningEngine.getCodeQualityRecommendations("typescript", "engine");

    // Structure patterns
    for (let i = 0; i < tsPatterns.structure.length; i++) {
      const id = `code_ts_structure_${i}`;
      this.patterns.set(id, {
        id,
        type: "code_quality",
        source: "internal",
        category: "typescript_engine",
        title: `Engine Structure Step ${i + 1}`,
        description: tsPatterns.structure[i],
        content: tsPatterns.structure[i],
        keywords: this.extractKeywords(tsPatterns.structure[i]),
        confidence: 0.95,
        usage_count: 100,
        metadata: { language: "typescript", context: "engine", order: i + 1 },
      });
    }

    // Mandatory patterns
    for (let i = 0; i < tsPatterns.mandatory.length; i++) {
      const id = `code_ts_mandatory_${i}`;
      this.patterns.set(id, {
        id,
        type: "code_quality",
        source: "internal",
        category: "typescript_mandatory",
        title: `Mandatory Pattern ${i + 1}`,
        description: tsPatterns.mandatory[i],
        content: tsPatterns.mandatory[i],
        keywords: this.extractKeywords(tsPatterns.mandatory[i]),
        confidence: 1.0,
        usage_count: 500,
        metadata: { language: "typescript", mandatory: true, order: i + 1 },
      });
    }

    // Anti-patterns
    for (let i = 0; i < tsPatterns.anti_patterns.length; i++) {
      const id = `code_ts_antipattern_${i}`;
      this.patterns.set(id, {
        id,
        type: "code_quality",
        source: "internal",
        category: "typescript_antipattern",
        title: `Anti-Pattern ${i + 1}`,
        description: tsPatterns.anti_patterns[i],
        content: tsPatterns.anti_patterns[i],
        keywords: this.extractKeywords(tsPatterns.anti_patterns[i]),
        confidence: 1.0,
        usage_count: 200,
        metadata: { language: "typescript", avoid: true, order: i + 1 },
      });
    }
  }

  private buildIndices(): void {
    this.keywordIndex.clear();
    this.categoryIndex.clear();

    for (const [id, pattern] of this.patterns) {
      // Keyword index
      for (const keyword of pattern.keywords) {
        if (!this.keywordIndex.has(keyword)) {
          this.keywordIndex.set(keyword, new Set());
        }
        this.keywordIndex.get(keyword)!.add(id);
      }

      // Category index
      if (!this.categoryIndex.has(pattern.category)) {
        this.categoryIndex.set(pattern.category, new Set());
      }
      this.categoryIndex.get(pattern.category)!.add(id);
    }
  }

  /**
   * Extract keywords from text for indexing.
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2);

    // Remove common stop words
    const stopWords = new Set(["the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out"]);
    return [...new Set(words.filter(w => !stopWords.has(w)))];
  }

  /**
   * Search patterns with fuzzy matching.
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      types,
      sources,
      categories,
      min_confidence = 0,
      limit = 20,
      fuzzy_threshold = 0.3,
    } = options;

    const queryKeywords = this.extractKeywords(query);
    const results: SearchResult[] = [];

    for (const [id, pattern] of this.patterns) {
      // Filter by type
      if (types && types.length > 0 && !types.includes(pattern.type)) continue;

      // Filter by source
      if (sources && sources.length > 0 && !sources.includes(pattern.source)) continue;

      // Filter by category
      if (categories && categories.length > 0 && !categories.includes(pattern.category)) continue;

      // Filter by confidence
      if (pattern.confidence < min_confidence) continue;

      // Calculate relevance
      const { score, matchType, matchedTerms } = this.calculateRelevance(
        queryKeywords,
        query.toLowerCase(),
        pattern,
        fuzzy_threshold
      );

      if (score > 0) {
        results.push({
          pattern,
          relevance_score: score,
          match_type: matchType,
          matched_terms: matchedTerms,
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance_score - a.relevance_score);

    return results.slice(0, limit);
  }

  /**
   * Calculate relevance score between query and pattern.
   */
  private calculateRelevance(
    queryKeywords: string[],
    queryLower: string,
    pattern: UnifiedPattern,
    fuzzyThreshold: number
  ): { score: number; matchType: SearchResult["match_type"]; matchedTerms: string[] } {
    let score = 0;
    const matchedTerms: string[] = [];
    let matchType: SearchResult["match_type"] = "keyword";

    const titleLower = pattern.title.toLowerCase();
    const descLower = pattern.description.toLowerCase();
    const contentLower = pattern.content.toLowerCase();

    // Exact title match (highest score)
    if (titleLower === queryLower) {
      score += 1.0;
      matchType = "exact";
      matchedTerms.push(pattern.title);
    } else if (titleLower.includes(queryLower)) {
      score += 0.8;
      matchType = "exact";
      matchedTerms.push(queryLower);
    }

    // Keyword matching
    for (const keyword of queryKeywords) {
      // Title contains keyword
      if (titleLower.includes(keyword)) {
        score += 0.3;
        matchedTerms.push(keyword);
      }

      // Description contains keyword
      if (descLower.includes(keyword)) {
        score += 0.2;
        if (!matchedTerms.includes(keyword)) matchedTerms.push(keyword);
      }

      // Content contains keyword
      if (contentLower.includes(keyword)) {
        score += 0.1;
        if (!matchedTerms.includes(keyword)) matchedTerms.push(keyword);
      }

      // Pattern keywords contain query keyword
      if (pattern.keywords.includes(keyword)) {
        score += 0.15;
        if (!matchedTerms.includes(keyword)) matchedTerms.push(keyword);
      }

      // Fuzzy match
      for (const patternKeyword of pattern.keywords) {
        const similarity = this.stringSimilarity(keyword, patternKeyword);
        if (similarity >= (1 - fuzzyThreshold) && similarity < 1) {
          score += 0.1 * similarity;
          matchType = "fuzzy";
          if (!matchedTerms.includes(patternKeyword)) matchedTerms.push(patternKeyword);
        }
      }
    }

    // Boost by confidence and usage
    score *= (0.5 + 0.5 * pattern.confidence);
    score *= (1 + Math.log10(pattern.usage_count + 1) * 0.1);

    return { score, matchType, matchedTerms };
  }

  /**
   * Simple string similarity (Jaccard index on character bigrams).
   */
  private stringSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return 0;

    const getBigrams = (s: string): Set<string> => {
      const bigrams = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) {
        bigrams.add(s.substring(i, i + 2));
      }
      return bigrams;
    };

    const bigrams1 = getBigrams(s1.toLowerCase());
    const bigrams2 = getBigrams(s2.toLowerCase());

    let intersection = 0;
    for (const bg of bigrams1) {
      if (bigrams2.has(bg)) intersection++;
    }

    return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
  }

  /**
   * Get patterns by type.
   */
  async getByType(type: UnifiedPattern["type"]): Promise<UnifiedPattern[]> {
    if (!this.initialized) await this.initialize();

    return Array.from(this.patterns.values()).filter(p => p.type === type);
  }

  /**
   * Get patterns by category.
   */
  async getByCategory(category: string): Promise<UnifiedPattern[]> {
    if (!this.initialized) await this.initialize();

    const ids = this.categoryIndex.get(category);
    if (!ids) return [];

    return Array.from(ids).map(id => this.patterns.get(id)!);
  }

  /**
   * Get pattern by ID.
   */
  async getById(id: string): Promise<UnifiedPattern | null> {
    if (!this.initialized) await this.initialize();

    return this.patterns.get(id) ?? null;
  }

  /**
   * Get statistics about the pattern database.
   */
  async getStats(): Promise<PatternStats> {
    if (!this.initialized) await this.initialize();

    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalConfidence = 0;

    for (const pattern of this.patterns.values()) {
      byType[pattern.type] = (byType[pattern.type] ?? 0) + 1;
      bySource[pattern.source] = (bySource[pattern.source] ?? 0) + 1;
      byCategory[pattern.category] = (byCategory[pattern.category] ?? 0) + 1;
      totalConfidence += pattern.confidence;
    }

    return {
      total_patterns: this.patterns.size,
      by_type: byType,
      by_source: bySource,
      by_category: byCategory,
      average_confidence: this.patterns.size > 0 ? totalConfidence / this.patterns.size : 0,
    };
  }

  /**
   * Get training context for AI integration.
   */
  getTrainingContext(): string {
    const stats = {
      total: this.patterns.size,
      hypermill: Array.from(this.patterns.values()).filter(p => p.source === "hypermill").length,
      jm_die: Array.from(this.patterns.values()).filter(p => p.source === "jm_die").length,
      tribal: Array.from(this.patterns.values()).filter(p => p.source === "tribal").length,
    };

    return `
PATTERN DATABASE ENGINE — UNIFIED KNOWLEDGE SEARCH
===================================================
Total Patterns: ${stats.total}
Sources:
  - hyperMILL API patterns: ${stats.hypermill}
  - JM DIE production patterns: ${stats.jm_die}
  - Tribal knowledge tips: ${stats.tribal}
  - Code quality patterns: ${this.patterns.size - stats.hypermill - stats.jm_die - stats.tribal}

Pattern Types:
  - gcode: Okuma/Fanuc G-code cycles and patterns
  - python_api: hyperMILL Python automation API
  - material_param: Material-specific cutting parameters
  - tribal_tip: Senior machinist knowledge
  - playbook_rule: Experiential rules
  - code_quality: TypeScript/Python code patterns

Search Features:
  - Fuzzy matching with configurable threshold
  - Keyword extraction and indexing
  - Category and type filtering
  - Relevance scoring with confidence boost

Usage:
  search("rough turning tool steel") → material + cycle patterns
  search("electrode automation") → hyperMILL API patterns
  search("thin wall chatter") → tribal tips + playbook rules
`.trim();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const patternDatabaseEngine = new PatternDatabaseEngine();
