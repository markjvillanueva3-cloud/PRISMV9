/**
 * LatheLoRATribalExtractorEngine — LATHE-LORA-MS0 U-LLR38
 * ========================================================
 *
 * Extracts tribal knowledge from operator-provided text.
 * Converts shop floor wisdom into structured training data.
 *
 * Features:
 *   - Natural language tribal tip extraction
 *   - Keyword/condition/recommendation parsing
 *   - Confidence scoring
 *   - Category tagging
 *
 * @module engines/LatheLoRATribalExtractorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Tribal knowledge category */
export type TribalCategory =
  | "tool_selection"
  | "parameters"
  | "material"
  | "workholding"
  | "surface_finish"
  | "safety"
  | "troubleshooting"
  | "setup"
  | "general";

/** Extracted tribal tip */
export interface TribalTip {
  id: string;
  raw_text: string;
  condition: string;
  recommendation: string;
  category: TribalCategory;
  keywords: string[];
  confidence: number;
  author?: string;
  source?: string;
  created_at: number;
}

/** Extractor configuration */
export interface TribalConfig {
  min_confidence: number;
  max_keyword_count: number;
  max_tips_in_memory: number;
  enable_auto_categorization: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: TribalConfig = {
  min_confidence: 0.3,
  max_keyword_count: 10,
  max_tips_in_memory: 1000,
  enable_auto_categorization: true,
};

/** Category keyword map */
const CATEGORY_KEYWORDS: Record<TribalCategory, string[]> = {
  tool_selection: ["insert", "grade", "tool", "carbide", "ceramic", "cbn"],
  parameters: ["sfm", "feed", "rpm", "depth", "doc", "speed"],
  material: ["steel", "stainless", "aluminum", "titanium", "inconel", "hardened"],
  workholding: ["chuck", "collet", "vise", "fixture", "clamp", "jaw"],
  surface_finish: ["finish", "ra", "surface", "polish", "roughness"],
  safety: ["safety", "crash", "collision", "emergency", "guard"],
  troubleshooting: ["chatter", "vibration", "broken", "scrap", "reject", "bad"],
  setup: ["setup", "probe", "offset", "touch", "zero", "align"],
  general: [],
};

/** Condition signal patterns */
const CONDITION_PATTERNS = [
  /when\s+(.+?)[,.]/i,
  /if\s+(.+?)[,.]/i,
  /for\s+(.+?)[,.]/i,
  /during\s+(.+?)[,.]/i,
];

/** Recommendation signal patterns */
const RECOMMENDATION_PATTERNS = [
  /(?:use|try|reduce|increase|set|apply)\s+(.+?)[.!]/i,
  /(?:should|need\s+to|must)\s+(.+?)[.!]/i,
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRATribalExtractorEngine {
  private config: TribalConfig = DEFAULT_CONFIG;
  private tips: TribalTip[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<TribalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): TribalConfig {
    return { ...this.config };
  }

  /**
   * Categorize text
   */
  categorizeText(text: string): TribalCategory {
    const lower = text.toLowerCase();
    let bestCategory: TribalCategory = "general";
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category as TribalCategory;
      }
    }

    return bestCategory;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text: string): string[] {
    // Remove common words, extract significant terms
    const STOP_WORDS = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "to", "of", "for",
      "in", "on", "at", "by", "with", "from", "and", "or", "but", "if", "then",
      "when", "while", "that", "this", "these", "those", "it", "as", "not",
    ]);

    const words = text.toLowerCase().match(/\b[a-z][a-z0-9]+\b/g) || [];
    const freq: Record<string, number> = {};
    for (const w of words) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.max_keyword_count)
      .map(([w]) => w);
  }

  /**
   * Extract condition from text
   */
  extractCondition(text: string): string {
    for (const pattern of CONDITION_PATTERNS) {
      const m = text.match(pattern);
      if (m) return m[1].trim();
    }
    // Fallback: first clause
    const firstPart = text.split(/[,.]/)[0];
    return firstPart ? firstPart.trim() : "";
  }

  /**
   * Extract recommendation from text
   */
  extractRecommendation(text: string): string {
    for (const pattern of RECOMMENDATION_PATTERNS) {
      const m = text.match(pattern);
      if (m) return m[1].trim();
    }
    // Fallback: last clause
    const parts = text.split(/[,.]/);
    const last = parts[parts.length - 1] || parts[parts.length - 2] || "";
    return last.trim();
  }

  /**
   * Compute confidence score for extracted tip
   */
  computeConfidence(condition: string, recommendation: string, keywords: string[]): number {
    let score = 0;
    if (condition && condition.length > 3) score += 0.3;
    if (recommendation && recommendation.length > 3) score += 0.4;
    if (keywords.length > 0) score += Math.min(0.3, keywords.length * 0.05);
    return Math.min(1.0, score);
  }

  /**
   * Extract a tribal tip from raw text
   */
  extractTip(
    rawText: string,
    metadata?: { author?: string; source?: string },
  ): TribalTip | null {
    const condition = this.extractCondition(rawText);
    const recommendation = this.extractRecommendation(rawText);
    const keywords = this.extractKeywords(rawText);
    const confidence = this.computeConfidence(condition, recommendation, keywords);

    if (confidence < this.config.min_confidence) {
      return null;
    }

    const category = this.config.enable_auto_categorization
      ? this.categorizeText(rawText)
      : "general";

    const tip: TribalTip = {
      id: `tribal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      raw_text: rawText,
      condition,
      recommendation,
      category,
      keywords,
      confidence,
      author: metadata?.author,
      source: metadata?.source,
      created_at: Date.now(),
    };

    this.tips.push(tip);

    // Trim
    if (this.tips.length > this.config.max_tips_in_memory) {
      this.tips = this.tips.slice(-this.config.max_tips_in_memory);
    }

    return tip;
  }

  /**
   * Batch extract tips from multiple texts
   */
  extractBatch(texts: string[]): TribalTip[] {
    const tips: TribalTip[] = [];
    for (const text of texts) {
      const tip = this.extractTip(text);
      if (tip) tips.push(tip);
    }
    return tips;
  }

  /**
   * Find tips by category
   */
  findByCategory(category: TribalCategory): TribalTip[] {
    return this.tips.filter(t => t.category === category);
  }

  /**
   * Find tips by keyword
   */
  findByKeyword(keyword: string): TribalTip[] {
    const lower = keyword.toLowerCase();
    return this.tips.filter(t =>
      t.keywords.some(k => k.includes(lower)) ||
      t.raw_text.toLowerCase().includes(lower)
    );
  }

  /**
   * Convert tip to training example
   */
  toTrainingExample(tip: TribalTip): { prompt: string; completion: string } {
    return {
      prompt: `In lathe operations, ${tip.condition ? `when ${tip.condition}` : "for best practice"}, what do you recommend?`,
      completion: tip.recommendation || tip.raw_text,
    };
  }

  /**
   * Get tips
   */
  getTips(limit?: number): TribalTip[] {
    const list = [...this.tips];
    return limit ? list.slice(-limit) : list;
  }

  /**
   * Get stats
   */
  getStats(): {
    total_tips: number;
    avg_confidence: number;
    high_confidence_count: number;
    category_distribution: Record<string, number>;
  } {
    const total = this.tips.length;
    if (total === 0) {
      return {
        total_tips: 0,
        avg_confidence: 0,
        high_confidence_count: 0,
        category_distribution: {},
      };
    }

    const sumConf = this.tips.reduce((s, t) => s + t.confidence, 0);
    const highConf = this.tips.filter(t => t.confidence >= 0.7).length;

    const categoryDist: Record<string, number> = {};
    for (const t of this.tips) {
      categoryDist[t.category] = (categoryDist[t.category] || 0) + 1;
    }

    return {
      total_tips: total,
      avg_confidence: sumConf / total,
      high_confidence_count: highConf,
      category_distribution: categoryDist,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    const lines = [
      "Tribal Extractor Summary",
      "========================",
      `Total Tips: ${stats.total_tips}`,
      `Avg Confidence: ${stats.avg_confidence.toFixed(3)}`,
      `High Confidence (>=0.7): ${stats.high_confidence_count}`,
      "",
      "Categories:",
    ];
    for (const [cat, count] of Object.entries(stats.category_distribution)) {
      lines.push(`  ${cat}: ${count}`);
    }
    return lines.join("\n");
  }

  /**
   * Clear tips
   */
  clear(): void {
    this.tips = [];
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.tips = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRATribalExtractorEngine = new LatheLoRATribalExtractorEngine();
